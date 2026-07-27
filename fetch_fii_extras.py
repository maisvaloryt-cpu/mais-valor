#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fetch_fii_extras.py — Coleta dados "extras" de FIIs no fundsexplorer.com.br
que NÃO vêm do Fundamentus: nº de cotistas, taxa de administração, taxa de
gestão, taxa de performance, DY em 3/6/12 meses, patrimônio líquido, VPA,
P/VPA, data de constituição, gestora, administrador, CNPJ, tipo de gestão,
prazo de duração, público-alvo e mínima/máxima de 52 semanas.

Esses dados (taxa de administração, cotistas, gestora etc.) mudam muito
pouco, então este script roda TODOS os fundos de uma vez só — não precisa
de rodízio diário. A ideia é agendar ele pra rodar a cada 15 dias (ver
.github/workflows/fii_extras.yml).

Uso:
  python fetch_fii_extras.py                 # roda todos os fundos
  python fetch_fii_extras.py --ticker XPML11  # força só 1 ticker (teste)
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
log = logging.getLogger("fii_extras")

BASE_DIR   = Path(__file__).resolve().parent
DATA_DIR   = BASE_DIR / "data"
OUT_FILE   = DATA_DIR / "fiis_extras.json"

URL_TPL = "https://www.fundsexplorer.com.br/funds/{ticker}"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "pt-BR,pt;q=0.9",
}

DELAY        = 2.0     # segundos entre requisições, pra não sobrecarregar o site
TIMEOUT      = 15

# ── Normalização de rótulos (robusto a variação de texto/acentuação) ──────────
def _norm(s: str) -> str:
    s = s or ""
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    s = re.sub(r"\s+", " ", s).strip().lower()
    s = s.rstrip(":")
    return s

# Cada campo pode ter vários jeitos de aparecer escrito na página.
LABEL_MAP = {
    "cotistas":            ["numero de cotistas", "n de cotistas", "cotistas"],
    "taxa_administracao":  ["taxa de administracao"],
    "taxa_gestao":         ["taxa de gestao"],
    "taxa_performance":    ["taxa de performance"],
    "dy_3m_acum":          ["dy (3m) acumulado", "dividend yield (3m) acumulado"],
    "dy_6m_acum":          ["dy (6m) acumulado", "dividend yield (6m) acumulado"],
    "dy_12m_acum":         ["dy (12m) acumulado", "dividend yield (12m) acumulado", "dividend yield ultimos 12 meses"],
    "dy_3m_media":         ["dy (3m) media"],
    "dy_6m_media":         ["dy (6m) media"],
    "dy_12m_media":        ["dy (12m) media"],
    "patrimonio_liquido":  ["patrimonio liquido"],
    "vpa":                 ["valor patrimonial por cota", "vpa", "valor patrimonial (vp) por cota"],
    "p_vpa":               ["p/vpa", "p/vp"],
    "data_constituicao":   ["data de constituicao", "constituicao do fundo"],
    "gestora":             ["gestora", "gestao"],
    "administrador":       ["administrador"],
    "cnpj":                ["cnpj"],
    "tipo_gestao":         ["tipo de gestao"],
    "prazo_duracao":       ["prazo de duracao"],
    "publico_alvo":        ["publico-alvo", "publico alvo"],
    "min_52_semanas":      ["minimo 52 semanas", "min. 52 semanas"],
    "max_52_semanas":      ["maximo 52 semanas", "max. 52 semanas"],
    "cotas_emitidas":      ["cotas emitidas"],
    "liquidez_media":      ["liquidez media diaria", "liquidez diaria"],
    "segmento":            ["segmento"],
}
# Inverte pra busca rápida: rótulo normalizado -> nome do campo
LABEL_LOOKUP = {}
for campo, variantes in LABEL_MAP.items():
    for v in variantes:
        LABEL_LOOKUP[_norm(v)] = campo


def _clean_valor(txt: str):
    """Tenta converter '0,75 % a.a' / 'R$ 7,1 bilhões' / '733.101' em número
    quando fizer sentido; senão devolve o texto original limpo."""
    if txt is None:
        return None
    t = txt.strip()
    if not t or t in ("-", "—", "N/A", "n/a"):
        return None

    # Percentual: "10,54%" ou "0,75 % a.a"
    m = re.match(r"^(-?\d+(?:[.,]\d+)?)\s*%", t)
    if m:
        return float(m.group(1).replace(".", "").replace(",", "."))

    # Número puro com separador de milhar: "733.101"
    if re.match(r"^\d{1,3}(\.\d{3})+$", t):
        return int(t.replace(".", ""))

    # R$ com sufixo (bilhões/milhões/mil)
    m = re.match(r"^R\$\s*([\d.,]+)\s*(bilh|milh|mil)?", t, re.IGNORECASE)
    if m:
        val = float(m.group(1).replace(".", "").replace(",", "."))
        mult = {"bilh": 1e9, "milh": 1e6, "mil": 1e3}.get((m.group(2) or "").lower()[:5], 1)
        # heurística simples pro prefixo (bilh.../milh...)
        suf = (m.group(2) or "").lower()
        if suf.startswith("bilh"):
            mult = 1e9
        elif suf.startswith("milh"):
            mult = 1e6
        elif suf.startswith("mil"):
            mult = 1e3
        else:
            mult = 1
        return val * mult

    return t  # mantém como texto (datas, nomes, CNPJ etc.)


def parse_fundo(html: str) -> dict:
    """Varre TODAS as tabelas/linhas rótulo→valor da página e extrai só os
    campos que reconhecemos no LABEL_LOOKUP. Não depende de classe/id CSS
    (a página não expõe identificadores estáveis), só do texto do rótulo —
    resistente a mudanças de layout, igual ao fetch_fundamentus.py."""
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
    # (fallback pra quando o site usa <div>/<span> soltos em vez de tabela/dl)
    if len(dados) < 4:  # só tenta se os padrões acima acharam pouca coisa
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

    dados = parse_fundo(r.text)
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
    """Reaproveita a mesma lista de FIIs que o site já usa (data/fiis_fundamentus.json)."""
    fp = DATA_DIR / "fiis_fundamentus.json"
    j = _load_json(fp, {})
    fiis = j.get("fiis", {})
    return sorted(fiis.keys())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ticker", help="Testar só 1 ticker específico (não mexe no arquivo final)")
    args = ap.parse_args()

    resultado = _load_json(OUT_FILE, {"fundos": {}})
    resultado.setdefault("fundos", {})

    # Modo teste: 1 ticker só, não mexe no arquivo final
    if args.ticker:
        t = args.ticker.upper()
        log.info(f"Teste com 1 fundo: {t}")
        dados = processar_ticker(t)
        if dados:
            print(json.dumps({t: dados}, ensure_ascii=False, indent=2))
        else:
            print(f"Falhou ao coletar dados de {t}")
        return

    tickers = _load_lista_tickers()
    if not tickers:
        log.error("Não achei data/fiis_fundamentus.json com a lista de FIIs. Rode fetch_fiis_fundamentus.py antes.")
        return

    total = len(tickers)
    log.info(f"Processando todos os {total} fundos (roda a cada 15 dias, não precisa de rodízio)")

    ok = fail = 0
    for i, ticker in enumerate(tickers):
        dados = processar_ticker(ticker)
        if dados:
            resultado["fundos"][ticker] = dados
            ok += 1
        else:
            fail += 1
        if i < len(tickers) - 1:
            time.sleep(DELAY)

    resultado["atualizado_em"] = datetime.now(timezone.utc).isoformat()
    resultado["total_fundos"]  = len(resultado["fundos"])
    _save_json(OUT_FILE, resultado)

    log.info(f"Concluído: {ok} ok, {fail} falharam de {total} fundos.")


if __name__ == "__main__":
    main()
