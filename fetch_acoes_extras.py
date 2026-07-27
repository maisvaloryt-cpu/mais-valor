#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fetch_acoes_extras.py — Coleta dados "extras" de AÇÕES no dadosdemercado.com.br
que NÃO vêm do Fundamentus: razão social, CNPJ, código ISIN, quantidade de
ações emitidas e classificação setorial B3 (setor/subsetor/segmento).

IMPORTANTE — histórico: a primeira versão deste script usava o
statusinvest.com.br, que tem MUITO mais dados (nº de acionistas, free float,
tag along, segmento de listagem/governança). Só que o statusinvest bloqueia
com HTTP 403 qualquer requisição vinda de IP de datacenter (Cloudflare
detecta os runners do GitHub Actions e barra, mesmo com User-Agent de
navegador). Não existe hoje uma fonte gratuita, sem cadastro e sem proteção
anti-bot que tenha nº de acionistas/free float/tag along — a B3 oficial só
libera essa API pra clientes B2B cadastrados. Por isso migramos pro
dadosdemercado.com.br, que não tem Cloudflare/anti-bot e cobre pelo menos
CNPJ, ISIN, quantidade de ações e setor/subsetor.

Esses dados mudam muito pouco, então este script roda TODAS as ações de uma
vez só — não precisa de rodízio diário. Agendado a cada 15 dias (ver
.github/workflows/acoes_extras.yml).

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

URL_TPL = "https://www.dadosdemercado.com.br/acoes/{ticker}"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "pt-BR,pt;q=0.9",
}

DELAY   = 1.5   # segundos entre requisições, pra não sobrecarregar o site
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
    "razao_social":      ["razao social"],
    "cnpj":              ["cnpj"],
    "isin":              ["codigo isin", "isin"],
    "qtd_acoes":         ["quantidade de acoes", "n de acoes", "numero de acoes", "total de acoes"],
    "classificacao_b3":  ["classificacao setorial b3", "classificacao setorial", "setor b3"],
    "setor":             ["setor"],
    "subsetor":          ["subsetor"],
    "segmento":          ["segmento"],
    "site_ri":           ["site de ri", "relacoes com investidores", "site ri"],
}
# Inverte pra busca rápida: rótulo normalizado -> nome do campo
LABEL_LOOKUP = {}
for campo, variantes in LABEL_MAP.items():
    for v in variantes:
        LABEL_LOOKUP[_norm(v)] = campo


def _clean_valor(txt: str):
    """Tenta converter número puro tipo '12.888.732.761' pra int; senão
    devolve o texto original limpo (CNPJ, ISIN, setor etc. ficam como texto)."""
    if txt is None:
        return None
    t = txt.strip()
    if not t or t in ("-", "—", "N/A", "n/a"):
        return None

    # Número puro com separador de milhar: "12.888.732.761"
    if re.match(r"^\d{1,3}(\.\d{3})+$", t):
        return int(t.replace(".", ""))

    return t  # mantém como texto


def parse_acao(html: str) -> dict:
    """Varre TODOS os padrões rótulo→valor da página e extrai só os campos
    que reconhecemos no LABEL_LOOKUP. Não depende de classe/id CSS, só do
    texto do rótulo — resistente a mudanças de layout, igual ao
    fetch_fii_extras.py."""
    soup = BeautifulSoup(html, "html.parser")
    dados = {}

    # Padrão 1: listas de definição <dt>Rótulo</dt><dd>Valor</dd> — é o
    # formato principal do dadosdemercado.com.br pra dados cadastrais.
    for dt in soup.find_all("dt"):
        rotulo = _norm(dt.get_text(" ", strip=True))
        campo = LABEL_LOOKUP.get(rotulo)
        if campo and campo not in dados:
            dd = dt.find_next_sibling("dd")
            if dd:
                dados[campo] = _clean_valor(dd.get_text(" ", strip=True))

    # Padrão 2: linhas de tabela <tr><td>Rótulo</td><td>Valor</td></tr> (fallback)
    for tr in soup.find_all("tr"):
        cels = tr.find_all(["td", "th"])
        if len(cels) >= 2:
            rotulo = _norm(cels[0].get_text(" ", strip=True))
            campo = LABEL_LOOKUP.get(rotulo)
            if campo and campo not in dados:
                valor = cels[1].get_text(" ", strip=True)
                dados[campo] = _clean_valor(valor)

    # Padrão 3: blocos genéricos "Rótulo" seguido de "Valor" em elementos irmãos
    # (só tenta se os padrões acima acharam pouca coisa)
    if len(dados) < 3:
        texto_bruto = soup.get_text("\n", strip=True).split("\n")
        for i, linha in enumerate(texto_bruto[:-1]):
            rotulo = _norm(linha)
            campo = LABEL_LOOKUP.get(rotulo)
            if campo and campo not in dados:
                dados[campo] = _clean_valor(texto_bruto[i + 1])

    # A "Classificação setorial B3" costuma vir como "Setor / Subsetor / Segmento"
    # numa string só — se veio assim e ainda não temos os campos separados,
    # tenta quebrar em 3 partes.
    if dados.get("classificacao_b3") and not dados.get("setor"):
        partes = [p.strip() for p in re.split(r"/", str(dados["classificacao_b3"])) if p.strip()]
        if len(partes) >= 1: dados.setdefault("setor", partes[0])
        if len(partes) >= 2: dados.setdefault("subsetor", partes[1])
        if len(partes) >= 3: dados.setdefault("segmento", partes[2])

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
