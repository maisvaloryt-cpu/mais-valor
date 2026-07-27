#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fetch_acoes_extras.py — Coleta dados "extras" de AÇÕES no statusinvest.com.br
que NÃO vêm do Fundamentus: número de acionistas (investidores), composição
acionária (% pessoa física / pessoa jurídica / institucional), total de
papéis, free float, tag along, segmento de listagem (governança — Novo
Mercado, Nível 1, Nível 2, Tradicional), setor, subsetor, segmento de
atuação, liquidez média diária e participação no Ibovespa.

Esses dados (governança, composição acionária, free float etc.) mudam muito
pouco, então este script roda TODAS as ações de uma vez só — não precisa
de rodízio diário. A ideia é agendar ele pra rodar a cada 15 dias (ver
.github/workflows/acoes_extras.yml), no mesmo padrão do fetch_fii_extras.py.

Uso:
  python fetch_acoes_extras.py                # roda todas as ações
  python fetch_acoes_extras.py --ticker PETR4  # força só 1 ticker (teste)
"""

import argparse
import json
import logging
import re
import time
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("acoes_extras")

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
OUT_FILE = DATA_DIR / "acoes_extras.json"

URL_TPL = "https://statusinvest.com.br/acoes/{ticker}"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "pt-BR,pt;q=0.9",
}

DELAY   = 2.0   # segundos entre requisições, pra não sobrecarregar o site
TIMEOUT = 15


# ── Normalização de rótulos (robusto a variação de texto/acentuação) ──────────
def _norm(s: str) -> str:
    s = s or ""
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    s = re.sub(r"\s+", " ", s).strip().lower()
    s = s.rstrip(":")
    return s


# Cada campo pode ter vários jeitos de aparecer escrito na página.
LABEL_MAP = {
    "numero_acionistas":    ["numero de investidores", "n de investidores", "numero de acionistas", "investidores"],
    "pct_pessoa_fisica":    ["pessoa fisica"],
    "pct_pessoa_juridica":  ["pessoa juridica"],
    "pct_institucional":    ["institucional"],
    "total_papeis":         ["n total de papeis", "numero total de papeis", "total de acoes", "quantidade de acoes"],
    "free_float":           ["free float"],
    "tag_along":            ["tag along"],
    "segmento_listagem":    ["segmento de listagem", "segmento b3", "governanca corporativa"],
    "setor":                ["setor"],
    "subsetor":             ["subsetor"],
    "segmento_atuacao":     ["segmento de atuacao"],
    "liquidez_media":       ["liquidez media diaria", "liquidez diaria"],
    "participacao_ibov":    ["participacao no ibovespa", "part. no ibovespa", "participacao ibov"],
    "valor_mercado":        ["valor de mercado"],
    "valor_firma":          ["valor de firma", "valor da firma", "enterprise value"],
    "cnpj":                 ["cnpj"],
    "controle_acionario":   ["controle acionario", "acionista controlador"],
}
# Inverte pra busca rápida: rótulo normalizado -> nome do campo
LABEL_LOOKUP = {}
for campo, variantes in LABEL_MAP.items():
    for v in variantes:
        LABEL_LOOKUP[_norm(v)] = campo


def _clean_valor(txt: str):
    """Tenta converter '61,21 %' / '1.183.775' / 'R$ 1.136.715.427,29' em
    número quando fizer sentido; senão devolve o texto original limpo."""
    if txt is None:
        return None
    t = txt.strip()
    if not t or t in ("-", "—", "N/A", "n/a"):
        return None

    # Percentual: "61,21%" ou "0,75 % a.a"
    m = re.match(r"^(-?\d+(?:[.,]\d+)?)\s*%", t)
    if m:
        return float(m.group(1).replace(".", "").replace(",", "."))

    # Número puro com separador de milhar: "1.183.775"
    if re.match(r"^\d{1,3}(\.\d{3})+$", t):
        return int(t.replace(".", ""))

    # R$ com valor: "R$ 1.136.715.427,29"
    m = re.match(r"^R\$\s*([\d.,]+)", t)
    if m:
        val = m.group(1).replace(".", "").replace(",", ".")
        try:
            return float(val)
        except ValueError:
            return t

    return t  # mantém como texto (segmento, setor, CNPJ, controlador etc.)


def parse_acao(html: str) -> dict:
    """Varre TODAS as tabelas/linhas rótulo→valor da página e extrai só os
    campos que reconhecemos no LABEL_LOOKUP. Não depende de classe/id CSS
    (o statusinvest muda o CSS com frequência), só do texto do rótulo —
    resistente a mudanças de layout, igual ao fetch_fii_extras.py."""
    soup = BeautifulSoup(html, "html.parser")
    dados = {}

    # Padrão 1: linhas de tabela <tr><td>Rótulo</td><td>Valor</td></tr>
    for tr in soup.find_all("tr"):
        cels = tr.find_all(["td", "th"])
        if len(cels) >= 2:
            rotulo = _norm(cels[0].get_text(" ", strip=True))
            campo = LABEL_LOOKUP.get(rotulo)
            if campo and campo not in dados:
                valor = cels[1].get_text(" ", strip=True)
                dados[campo] = _clean_valor(valor)

    # Padrão 2: listas de definição <dt>Rótulo</dt><dd>Valor</dd>
    for dt in soup.find_all("dt"):
        rotulo = _norm(dt.get_text(" ", strip=True))
        campo = LABEL_LOOKUP.get(rotulo)
        if campo and campo not in dados:
            dd = dt.find_next_sibling("dd")
            if dd:
                dados[campo] = _clean_valor(dd.get_text(" ", strip=True))

    # Padrão 3: blocos genéricos "Rótulo" seguido de "Valor" em elementos irmãos
    # (o statusinvest usa muito isso — cards/divs soltos em vez de tabela/dl)
    texto_bruto = soup.get_text("\n", strip=True).split("\n")
    for i, linha in enumerate(texto_bruto[:-1]):
        rotulo = _norm(linha)
        campo = LABEL_LOOKUP.get(rotulo)
        if campo and campo not in dados:
            dados[campo] = _clean_valor(texto_bruto[i + 1])

    return dados


def processar_ticker(ticker: str) -> dict | None:
    url = URL_TPL.format(ticker=ticker.lower())
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
    except Exception as e:
        log.warning(f"  {ticker}: erro de conexão — {e}")
        return None

    if r.status_code != 200:
        log.warning(f"  {ticker}: HTTP {r.status_code}")
        return None

    dados = parse_acao(r.text)
    if not dados:
        log.warning(f"  {ticker}: nenhum campo reconhecido (site pode ter mudado o layout)")
        return None

    dados["_fonte"] = url
    dados["_atualizado_em"] = datetime.now(timezone.utc).isoformat()
    log.info(f"  {ticker}: {len(dados)} campos coletados")
    return dados


def _load_json(path: Path, default):
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            pass
    return default


def _save_json(path: Path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")


def _load_lista_tickers() -> list:
    """Reaproveita a mesma lista de ações que o site já usa (data/fundamentus.json)."""
    fp = DATA_DIR / "fundamentus.json"
    j = _load_json(fp, {})
    acoes = j.get("acoes", {})
    return sorted(acoes.keys())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ticker", help="Testar só 1 ticker específico (não mexe no arquivo final)")
    args = ap.parse_args()

    resultado = _load_json(OUT_FILE, {"acoes": {}})
    resultado.setdefault("acoes", {})

    # Modo teste: 1 ticker só, não mexe no arquivo final
    if args.ticker:
        t = args.ticker.upper()
        log.info(f"Teste com 1 ação: {t}")
        dados = processar_ticker(t)
        if dados:
            print(json.dumps({t: dados}, ensure_ascii=False, indent=2))
        else:
            print(f"Falhou ao coletar dados de {t}")
        return

    tickers = _load_lista_tickers()
    if not tickers:
        log.error("Não achei data/fundamentus.json com a lista de ações. Rode fetch_fundamentus.py antes.")
        return

    total = len(tickers)
    log.info(f"Processando todas as {total} ações (roda a cada 15 dias, não precisa de rodízio)")

    ok = fail = 0
    for i, ticker in enumerate(tickers):
        dados = processar_ticker(ticker)
        if dados:
            resultado["acoes"][ticker] = dados
            ok += 1
        else:
            fail += 1
        if i < len(tickers) - 1:
            time.sleep(DELAY)

    resultado["atualizado_em"] = datetime.now(timezone.utc).isoformat()
    resultado["total_acoes"]   = len(resultado["acoes"])
    _save_json(OUT_FILE, resultado)

    log.info(f"Concluído: {ok} ok, {fail} falharam de {total} ações.")


if __name__ == "__main__":
    main()
