"""
fetch_indices.py — Busca índices via Brapi (já usado no projeto) + BCB para câmbio
Salva em data/indices.json
"""
import json, datetime, os, requests

BRAPI_TOKEN = os.environ.get("BRAPI_TOKEN", "")
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"}

def fetch_brapi(symbols):
    """Busca múltiplos símbolos via Brapi de uma vez"""
    joined = ",".join(symbols)
    token_param = f"&token={BRAPI_TOKEN}" if BRAPI_TOKEN else ""
    url = f"https://brapi.dev/api/quote/{joined}?fundamental=false{token_param}"
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
        results = r.json().get("results", [])
        out = {}
        for q in results:
            ticker = q.get("symbol", "")
            price = q.get("regularMarketPrice") or 0
            chg_pct = q.get("regularMarketChangePercent") or 0
            chg_pts = q.get("regularMarketChange") or 0
            if price:
                out[ticker] = {
                    "val": round(price, 2),
                    "chg": round(chg_pct, 2),
                    "chg_pts": round(chg_pts, 2),
                }
        return out
    except Exception as e:
        print(f"  Erro Brapi: {e}")
        return {}

def fetch_awesomeapi(pairs):
    """Busca pares de câmbio/cripto/commodities via AwesomeAPI"""
    try:
        url = f"https://economia.awesomeapi.com.br/json/last/{','.join(pairs)}"
        r = requests.get(url, headers=HEADERS, timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print(f"  Erro AwesomeAPI: {e}")
        return {}

def main():
    os.makedirs("data", exist_ok=True)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
    now_str = now.strftime("%d/%m/%Y %H:%M")

    output = {"updated_at": now_str}

    # 1. Brapi: índices BR + EUA
    # IFIX11 e SMLL11 não existem na B3 — usar ETFs corretos como proxy
    print("Buscando índices via Brapi...")
    brapi_symbols = [
        "^BVSP",   # Ibovespa
        "BCFF11",  # IFIX proxy (fundo de fundos FIIs)
        "SMAL11",  # Small Caps
        "DIVO11",  # IDIV
        "BOVA11",  # IBrA proxy
        "FIND11",  # Setor Financeiro
        "^GSPC",   # S&P 500
        "^IXIC",   # Nasdaq
        "^DJI",    # Dow Jones
        "^RUT",    # Russell 2000
    ]
    brapi_data = fetch_brapi(brapi_symbols)

    BRAPI_MAP = {
        "^BVSP":  "ibov",
        "BCFF11": "ifix",
        "SMAL11": "small",
        "DIVO11": "idiv",
        "BOVA11": "ibra",
        "FIND11": "ifnc",
        "^GSPC":  "sp500",
        "^IXIC":  "nasdaq",
        "^DJI":   "dow",
        "^RUT":   "russell",
    }
    for sym, key in BRAPI_MAP.items():
        if sym in brapi_data:
            output[key] = brapi_data[sym]
            print(f"  {key.upper()}: {brapi_data[sym]['val']} ({brapi_data[sym]['chg']:+.2f}%)")
        else:
            print(f"  {key.upper()}: falhou")

    # 2. AwesomeAPI: câmbio
    print("Buscando câmbio via AwesomeAPI...")
    cambio = fetch_awesomeapi(["USD-BRL","EUR-BRL","GBP-BRL","JPY-BRL","ARS-BRL"])
    CAMBIO_MAP = {
        "USDBRL": ("dolar", 4),
        "EURBRL": ("euro",  4),
        "GBPBRL": ("gbp",   4),
        "JPYBRL": ("jpy",   4),
        "ARSBRL": ("ars",   4),
    }
    for code, (key, dec) in CAMBIO_MAP.items():
        if code in cambio:
            d = cambio[code]
            val = float(d.get("bid", 0))
            pct = float(d.get("pctChange", 0))
            output[key] = {"val": round(val, dec), "chg": round(pct, 2), "chg_pts": 0}
            print(f"  {key.upper()}: {output[key]['val']} ({pct:+.2f}%)")

    # 3. AwesomeAPI: cripto
    print("Buscando cripto via AwesomeAPI...")
    cripto = fetch_awesomeapi(["BTC-USD","ETH-USD","SOL-USD","BNB-USD"])
    CRIPTO_MAP = {
        "BTCUSD": "btc",
        "ETHUSD": "eth",
        "SOLUSD": "sol",
        "BNBUSD": "bnb",
    }
    for code, key in CRIPTO_MAP.items():
        if code in cripto:
            d = cripto[code]
            val = float(d.get("bid", 0))
            pct = float(d.get("pctChange", 0))
            output[key] = {"val": round(val, 2), "chg": round(pct, 2), "chg_pts": 0}
            print(f"  {key.upper()}: ${output[key]['val']:,.2f} ({pct:+.2f}%)")

    # 4. AwesomeAPI: commodities
    print("Buscando commodities via AwesomeAPI...")
    comms = fetch_awesomeapi(["XAU-USD","XAG-USD","WTI-USD"])
    COMM_MAP = {
        "XAUUSD": "ouro",
        "XAGUSD": "prata",
        "WTIUSD": "petroleo",
    }
    for code, key in COMM_MAP.items():
        if code in comms:
            d = comms[code]
            val = float(d.get("bid", 0))
            pct = float(d.get("pctChange", 0))
            output[key] = {"val": round(val, 2), "chg": round(pct, 2), "chg_pts": 0}
            print(f"  {key.upper()}: ${output[key]['val']:,.2f} ({pct:+.2f}%)")

    with open("data/indices.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n✅ indices.json salvo em {now_str}")
    total = sum(1 for k in output if k != "updated_at" and output[k])
    print(f"   {total} índices com dados")

if __name__ == "__main__":
    main()
