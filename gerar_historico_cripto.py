#!/usr/bin/env python3
"""
gerar_historico_cripto.py
=========================
Busca histórico das top 30 criptos em BRL direto do Yahoo Finance
e salva em data/historico/{TICKER}BRL.json — formato compatível
com o Simulador de Carteiras.

Vantagem: Yahoo Finance funciona no GitHub Actions sem API key,
sem rate limit agressivo e sem bloqueio geográfico.
"""

import json, time, datetime, os, sys, requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_utils import merge_historico

YAHOO_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
}

# Mapa: ticker do simulador → símbolo Yahoo Finance
# Yahoo usa o formato "BTC-BRL", "ETH-BRL" etc.
CRIPTO_MAP = {
    "BTCBRL":   "BTC-BRL",
    "ETHBRL":   "ETH-BRL",
    "BNBBRL":   "BNB-BRL",
    "SOLBRL":   "SOL-BRL",
    "XRPBRL":   "XRP-BRL",
    "ADABRL":   "ADA-BRL",
    "DOGEBRL":  "DOGE-BRL",
    "AVAXBRL":  "AVAX-BRL",
    "LINKBRL":  "LINK-BRL",
    "DOTBRL":   "DOT-BRL",
    "LTCBRL":   "LTC-BRL",
    "XLMBRL":   "XLM-BRL",
    "ATOMBRL":  "ATOM-BRL",
    "TONBRL":   "TON11419-BRL",
    "NEARBRL":  "NEAR-BRL",
    "UNIBRL":   "UNI7083-BRL",
    "BCHBRL":   "BCH-BRL",
    "MATICBRL": "MATIC-BRL",
    "ETCBRL":   "ETC-BRL",
    "TRXBRL":   "TRX-BRL",
    "ICPBRL":   "ICP-BRL",
    "APTBRL":   "APT21794-BRL",
    "PEPEBRL":  "PEPE24478-BRL",
    "SHIBABRL": "SHIB-BRL",
    "FILBRL":   "FIL-BRL",
    "USDTBRL":  "USDT-BRL",
    "USDCBRL":  "USDC-BRL",
    "WBTCBRL":  "WBTC-BRL",
    "XLMBRL":   "XLM-BRL",
    "BNBBRL":   "BNB-BRL",
}

OUT_DIR = "data/historico"
os.makedirs(OUT_DIR, exist_ok=True)


def fetch_yahoo_cripto(yahoo_symbol: str, anos: int = 10) -> list:
    """Busca histórico mensal de uma cripto no Yahoo Finance."""
    end   = int(datetime.datetime.now().timestamp())
    start = end - (anos * 365 * 24 * 3600)
    url   = (f"https://query1.finance.yahoo.com/v8/finance/chart/{yahoo_symbol}"
             f"?period1={start}&period2={end}&interval=1mo")
    try:
        r = requests.get(url, headers=YAHOO_HEADERS, timeout=20)
        if r.status_code != 200:
            return []
        data   = r.json()
        result = data.get("chart", {}).get("result", [])
        if not result:
            return []
        r0     = result[0]
        ts_list = r0.get("timestamp", [])
        closes  = (r0.get("indicators", {})
                     .get("adjclose", [{}])[0]
                     .get("adjclose", []))
        if not closes:
            closes = (r0.get("indicators", {})
                        .get("quote", [{}])[0]
                        .get("close", []))
        pts = []
        for ts, c in zip(ts_list, closes):
            if c:
                d = datetime.datetime.fromtimestamp(ts).strftime("%Y-%m-%d")
                pts.append({"date": d, "close": round(float(c), 2)})
        return pts if len(pts) >= 3 else []
    except Exception as e:
        print(f"    Erro: {e}")
        return []


def main():
    total = len(CRIPTO_MAP)
    ok = fail = 0
    print(f"Buscando historico de {total} criptos via Yahoo Finance...")

    for ticker, yahoo_sym in CRIPTO_MAP.items():
        print(f"  {ticker} ({yahoo_sym})...", end=" ", flush=True)
        pts = fetch_yahoo_cripto(yahoo_sym)

        if not pts:
            print("sem dados")
            fail += 1
            time.sleep(0.5)
            continue

        path      = f"{OUT_DIR}/{ticker}.json"
        adicionados = merge_historico(path, ticker, pts)
        print(f"+{adicionados} pts ({len(pts)} total)")
        ok += 1
        time.sleep(0.4)  # respeita rate limit do Yahoo

    print(f"\nConcluido: {ok} ok, {fail} sem dados")
    print(f"Arquivos em {OUT_DIR}/")


if __name__ == "__main__":
    main()
