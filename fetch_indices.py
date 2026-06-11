"""
fetch_indices.py — Busca índices via Brapi + AwesomeAPI
- Rodízio de 5 tokens Brapi (BRAPI_TOKEN_1 ... BRAPI_TOKEN_5)
- Fallback/stale: se API falhar, usa último valor salvo
Salva em data/indices.json
"""
import json, datetime, os, requests, time

# Coleta os 5 tokens disponíveis (ignora os vazios)
BRAPI_TOKENS = [
    t for t in [
        os.environ.get("BRAPI_TOKEN_1", ""),
        os.environ.get("BRAPI_TOKEN_2", ""),
        os.environ.get("BRAPI_TOKEN_3", ""),
        os.environ.get("BRAPI_TOKEN_4", ""),
        os.environ.get("BRAPI_TOKEN_5", ""),
    ] if t
]
# Fallback para token genérico se nenhum numerado existir
if not BRAPI_TOKENS:
    t = os.environ.get("BRAPI_TOKEN", "")
    if t:
        BRAPI_TOKENS = [t]

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"}

def fetch_brapi_with_rotation(symbols):
    """
    Tenta buscar os símbolos com cada token disponível.
    Se um token falhar (400, 401, 429), tenta o próximo.
    Retorna o resultado do primeiro token que funcionar.
    """
    joined = ",".join(symbols)
    for i, token in enumerate(BRAPI_TOKENS):
        token_param = f"&token={token}" if token else ""
        url = f"https://brapi.dev/api/quote/{joined}?fundamental=false{token_param}"
        try:
            r = requests.get(url, headers=HEADERS, timeout=15)
            if r.status_code in (400, 401, 429):
                print(f"  Token {i+1} falhou ({r.status_code}), tentando próximo...")
                time.sleep(1)
                continue
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
            print(f"  Token {i+1} OK — {len(out)}/{len(symbols)} símbolos retornados")
            return out
        except Exception as e:
            print(f"  Token {i+1} erro: {e}, tentando próximo...")
            time.sleep(1)
    print("  Todos os tokens Brapi falharam!")
    return {}

def fetch_awesomeapi(pairs, label=""):
    """Busca pares via AwesomeAPI com retry simples"""
    try:
        url = f"https://economia.awesomeapi.com.br/json/last/{','.join(pairs)}"
        r = requests.get(url, headers=HEADERS, timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print(f"  Erro AwesomeAPI{' ' + label if label else ''}: {e}")
        return {}

def main():
    os.makedirs("data", exist_ok=True)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
    now_str = now.strftime("%d/%m/%Y %H:%M")

    print(f"Tokens Brapi disponíveis: {len(BRAPI_TOKENS)}")

    # Carregar lastValid do arquivo anterior para usar como fallback
    last_valid = {}
    indices_path = "data/indices.json"
    if os.path.exists(indices_path):
        try:
            with open(indices_path) as f:
                prev = json.load(f)
            for k, v in prev.items():
                if k != "updated_at" and isinstance(v, dict) and v.get("val"):
                    last_valid[k] = {**v, "stale": False}
        except:
            pass

    def with_fallback(key, new_data):
        """Retorna new_data se válido, ou last_valid com stale=True se falhou."""
        if new_data and new_data.get("val"):
            return {**new_data, "stale": False}
        if key in last_valid:
            print(f"  ⚠ {key.upper()}: usando lastValid (stale)")
            return {**last_valid[key], "stale": True}
        return None

    output = {"updated_at": now_str}

    # ── 1. Brapi: índices BR ──────────────────────────────────────────
    print("\nBuscando índices BR via Brapi...")
    BR_SYMBOLS = [
        "^BVSP",   # Ibovespa
        "BCFF11",  # IFIX proxy
        "SMAL11",  # Small Caps
        "DIVO11",  # IDIV
        "BOVA11",  # IBrA proxy
        "FIND11",  # IFNC
    ]
    brapi_br = fetch_brapi_with_rotation(BR_SYMBOLS)

    BR_MAP = {
        "^BVSP":  "ibov",
        "BCFF11": "ifix",
        "SMAL11": "small",
        "DIVO11": "idiv",
        "BOVA11": "ibra",
        "FIND11": "ifnc",
    }
    for sym, key in BR_MAP.items():
        d = with_fallback(key, brapi_br.get(sym))
        if d:
            output[key] = d
            stale_tag = " [stale]" if d.get("stale") else ""
            print(f"  {key.upper()}: {d['val']} ({d['chg']:+.2f}%){stale_tag}")
        else:
            print(f"  {key.upper()}: sem dados")

    # ── 2. Brapi: índices EUA ─────────────────────────────────────────
    print("\nBuscando índices EUA via Brapi...")
    US_SYMBOLS = ["^GSPC", "^IXIC", "^DJI", "^RUT"]
    brapi_us = fetch_brapi_with_rotation(US_SYMBOLS)

    US_MAP = {
        "^GSPC": "sp500",
        "^IXIC": "nasdaq",
        "^DJI":  "dow",
        "^RUT":  "russell",
    }
    for sym, key in US_MAP.items():
        d = with_fallback(key, brapi_us.get(sym))
        if d:
            output[key] = d
            stale_tag = " [stale]" if d.get("stale") else ""
            print(f"  {key.upper()}: {d['val']} ({d['chg']:+.2f}%){stale_tag}")
        else:
            print(f"  {key.upper()}: sem dados")

    # ── 3. AwesomeAPI: câmbio ─────────────────────────────────────────
    print("\nBuscando câmbio via AwesomeAPI...")
    cambio = fetch_awesomeapi(["USD-BRL", "EUR-BRL", "GBP-BRL", "JPY-BRL", "ARS-BRL"], "câmbio")
    CAMBIO_MAP = {
        "USDBRL": ("dolar", 4),
        "EURBRL": ("euro",  4),
        "GBPBRL": ("gbp",   4),
        "JPYBRL": ("jpy",   4),
        "ARSBRL": ("ars",   4),
    }
    for code, (key, dec) in CAMBIO_MAP.items():
        raw = None
        if code in cambio:
            d = cambio[code]
            val = float(d.get("bid", 0))
            pct = float(d.get("pctChange", 0))
            if val:
                raw = {"val": round(val, dec), "chg": round(pct, 2), "chg_pts": 0}
        result = with_fallback(key, raw)
        if result:
            output[key] = result
            stale_tag = " [stale]" if result.get("stale") else ""
            print(f"  {key.upper()}: {result['val']} ({result['chg']:+.2f}%){stale_tag}")
        else:
            print(f"  {key.upper()}: sem dados")

    # ── 4. AwesomeAPI: cripto ─────────────────────────────────────────
    print("\nBuscando cripto via AwesomeAPI...")
    cripto = fetch_awesomeapi(["BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD"], "cripto")
    CRIPTO_MAP = {
        "BTCUSD": "btc",
        "ETHUSD": "eth",
        "SOLUSD": "sol",
        "BNBUSD": "bnb",
    }
    for code, key in CRIPTO_MAP.items():
        raw = None
        if code in cripto:
            d = cripto[code]
            val = float(d.get("bid", 0))
            pct = float(d.get("pctChange", 0))
            if val:
                raw = {"val": round(val, 2), "chg": round(pct, 2), "chg_pts": 0}
        result = with_fallback(key, raw)
        if result:
            output[key] = result
            stale_tag = " [stale]" if result.get("stale") else ""
            print(f"  {key.upper()}: ${result['val']:,.2f} ({result['chg']:+.2f}%){stale_tag}")
        else:
            print(f"  {key.upper()}: sem dados")

    # ── 5. AwesomeAPI: commodities ────────────────────────────────────
    print("\nBuscando commodities via AwesomeAPI...")
    comms = fetch_awesomeapi(["XAU-USD", "XAG-USD", "WTI-USD"], "commodities")
    COMM_MAP = {
        "XAUUSD": "ouro",
        "XAGUSD": "prata",
        "WTIUSD": "petroleo",
    }
    for code, key in COMM_MAP.items():
        raw = None
        if code in comms:
            d = comms[code]
            val = float(d.get("bid", 0))
            pct = float(d.get("pctChange", 0))
            if val:
                raw = {"val": round(val, 2), "chg": round(pct, 2), "chg_pts": 0}
        result = with_fallback(key, raw)
        if result:
            output[key] = result
            stale_tag = " [stale]" if result.get("stale") else ""
            print(f"  {key.upper()}: ${result['val']:,.2f} ({result['chg']:+.2f}%){stale_tag}")
        else:
            print(f"  {key.upper()}: sem dados")

    # ── Salvar ────────────────────────────────────────────────────────
    with open("data/indices.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    total = sum(1 for k in output if k != "updated_at" and output[k])
    stale = sum(1 for k, v in output.items() if isinstance(v, dict) and v.get("stale"))
    fresh = total - stale
    print(f"\n✅ indices.json salvo em {now_str}")
    print(f"   {fresh} frescos | {stale} stale | {total} total")

if __name__ == "__main__":
    main()
