"""
fetch_indices.py — Busca índices com estratégia em cascata:
  1. yfinance (Yahoo Finance direto, sem token)
  2. AwesomeAPI (câmbio, cripto, commodities)
  3. Brapi (fallback final, alterna tokens, tenta lote e depois individual)
  4. stale (último valor salvo)
Salva em data/indices.json
"""
import json, datetime, os, requests, time

# ── Tokens Brapi (rodízio) ────────────────────────────────────────────────────
BRAPI_TOKENS = [
    t for t in [
        os.environ.get("BRAPI_TOKEN_1", ""),
        os.environ.get("BRAPI_TOKEN_2", ""),
        os.environ.get("BRAPI_TOKEN_3", ""),
        os.environ.get("BRAPI_TOKEN_4", ""),
        os.environ.get("BRAPI_TOKEN_5", ""),
        os.environ.get("BRAPI_TOKEN", ""),
    ] if t
]
# Remove duplicatas mantendo ordem
seen = set()
BRAPI_TOKENS = [t for t in BRAPI_TOKENS if not (t in seen or seen.add(t))]

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"}

# ── Mapeamento yfinance → chave do JSON ──────────────────────────────────────
YFINANCE_MAP = {
    "^BVSP":  "ibov",
    "BCFF11.SA": "ifix",
    "SMAL11.SA": "small",
    "DIVO11.SA": "idiv",
    "BOVA11.SA": "ibra",
    "FIND11.SA": "ifnc",
    "^GSPC":  "sp500",
    "^IXIC":  "nasdaq",
    "^DJI":   "dow",
    "^RUT":   "russell",
}

# ── Mapeamento Brapi → chave do JSON ─────────────────────────────────────────
BRAPI_BR_MAP = {
    "^BVSP":  "ibov",
    "BCFF11": "ifix",
    "SMAL11": "small",
    "DIVO11": "idiv",
    "BOVA11": "ibra",
    "FIND11": "ifnc",
}
BRAPI_US_MAP = {
    "^GSPC": "sp500",
    "^IXIC": "nasdaq",
    "^DJI":  "dow",
    "^RUT":  "russell",
}

# ── 1. yfinance ───────────────────────────────────────────────────────────────
def fetch_yfinance(symbols):
    """Busca via yfinance (Yahoo Finance). Retorna {key: {val, chg, chg_pts}}"""
    try:
        import yfinance as yf
    except ImportError:
        print("  yfinance não instalado, pulando...")
        return {}

    out = {}
    try:
        tickers = yf.Tickers(" ".join(symbols))
        for sym in symbols:
            key = YFINANCE_MAP.get(sym)
            if not key:
                continue
            try:
                info = tickers.tickers[sym].fast_info
                price = getattr(info, "last_price", None) or getattr(info, "regularMarketPrice", None)
                prev  = getattr(info, "previous_close", None)
                if price and price > 0:
                    chg_pts = round(price - prev, 2) if prev else 0
                    chg_pct = round((chg_pts / prev) * 100, 2) if prev else 0
                    out[key] = {"val": round(price, 2), "chg": chg_pct, "chg_pts": chg_pts}
                    print(f"  [yf] {key.upper()}: {price} ({chg_pct:+.2f}%)")
                else:
                    print(f"  [yf] {key.upper()}: sem preço")
            except Exception as e:
                print(f"  [yf] {key.upper()}: erro — {e}")
    except Exception as e:
        print(f"  yfinance erro geral: {e}")
    return out

# ── 2. AwesomeAPI ─────────────────────────────────────────────────────────────
def fetch_awesomeapi(pairs, label=""):
    try:
        url = f"https://economia.awesomeapi.com.br/json/last/{','.join(pairs)}"
        r = requests.get(url, headers=HEADERS, timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print(f"  Erro AwesomeAPI {label}: {e}")
        return {}

def parse_awesomeapi(data, code, decimals=4):
    if code not in data:
        return None
    d = data[code]
    val = float(d.get("bid", 0))
    pct = float(d.get("pctChange", 0))
    if not val:
        return None
    return {"val": round(val, decimals), "chg": round(pct, 2), "chg_pts": 0}

# ── 3. Brapi (fallback) ───────────────────────────────────────────────────────
_token_index = 0

def next_token():
    global _token_index
    if not BRAPI_TOKENS:
        return ""
    token = BRAPI_TOKENS[_token_index % len(BRAPI_TOKENS)]
    _token_index += 1
    return token

def fetch_brapi_lote(symbols):
    """Tenta buscar em lote alternando tokens."""
    joined = ",".join(symbols)
    for attempt in range(len(BRAPI_TOKENS) or 1):
        token = next_token()
        token_param = f"&token={token}" if token else ""
        url = f"https://brapi.dev/api/quote/{joined}?fundamental=false{token_param}"
        try:
            r = requests.get(url, headers=HEADERS, timeout=15)
            if r.status_code in (400, 401, 429):
                print(f"  [brapi lote] token {attempt+1} falhou ({r.status_code})")
                time.sleep(0.5)
                continue
            r.raise_for_status()
            results = r.json().get("results", [])
            out = {}
            for q in results:
                sym = q.get("symbol", "")
                price = q.get("regularMarketPrice") or 0
                if price:
                    out[sym] = {
                        "val": round(price, 2),
                        "chg": round(q.get("regularMarketChangePercent") or 0, 2),
                        "chg_pts": round(q.get("regularMarketChange") or 0, 2),
                    }
            print(f"  [brapi lote] token {attempt+1} OK — {len(out)}/{len(symbols)} símbolos")
            return out
        except Exception as e:
            print(f"  [brapi lote] token {attempt+1} erro: {e}")
            time.sleep(0.5)
    return None  # None = lote falhou, tentar individual

def fetch_brapi_individual(symbols):
    """Busca símbolo por símbolo alternando tokens."""
    out = {}
    for sym in symbols:
        token = next_token()
        token_param = f"&token={token}" if token else ""
        url = f"https://brapi.dev/api/quote/{sym}?fundamental=false{token_param}"
        try:
            r = requests.get(url, headers=HEADERS, timeout=15)
            r.raise_for_status()
            results = r.json().get("results", [])
            if results:
                q = results[0]
                price = q.get("regularMarketPrice") or 0
                if price:
                    out[sym] = {
                        "val": round(price, 2),
                        "chg": round(q.get("regularMarketChangePercent") or 0, 2),
                        "chg_pts": round(q.get("regularMarketChange") or 0, 2),
                    }
                    print(f"  [brapi ind] {sym}: {price}")
                else:
                    print(f"  [brapi ind] {sym}: preço zero")
            else:
                print(f"  [brapi ind] {sym}: sem resultado")
        except Exception as e:
            print(f"  [brapi ind] {sym}: erro — {e}")
        time.sleep(0.3)
    return out

def fetch_brapi(sym_map):
    """Tenta lote, se falhar tenta individual. Retorna {key: data}"""
    symbols = list(sym_map.keys())
    print(f"  Tentando lote ({len(symbols)} símbolos)...")
    raw = fetch_brapi_lote(symbols)
    if raw is None:
        print(f"  Lote falhou, tentando individual...")
        raw = fetch_brapi_individual(symbols)
    out = {}
    for sym, key in sym_map.items():
        if sym in raw:
            out[key] = raw[sym]
    return out

# ── main ──────────────────────────────────────────────────────────────────────
def main():
    os.makedirs("data", exist_ok=True)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
    now_str = now.strftime("%d/%m/%Y %H:%M")

    print(f"Tokens Brapi disponíveis: {len(BRAPI_TOKENS)}")

    # Carregar lastValid para fallback stale
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
        if new_data and new_data.get("val"):
            return {**new_data, "stale": False}
        if key in last_valid:
            print(f"  ⚠ {key.upper()}: usando lastValid (stale)")
            return {**last_valid[key], "stale": True}
        return None

    output = {"updated_at": now_str}
    # Rastreia quais chaves já foram preenchidas com dado fresco
    fresh = set()

    def fill(key, data):
        """Preenche output[key] apenas se ainda não tem dado fresco."""
        if key in fresh:
            return
        if data and data.get("val"):
            output[key] = {**data, "stale": False}
            fresh.add(key)

    # ── 1. yfinance ──────────────────────────────────────────────────────────
    print("\n── 1. yfinance (Yahoo Finance) ──")
    yf_data = fetch_yfinance(list(YFINANCE_MAP.keys()))
    for key, data in yf_data.items():
        fill(key, data)

    # ── 2. AwesomeAPI: câmbio ────────────────────────────────────────────────
    print("\n── 2. AwesomeAPI: câmbio ──")
    cambio = fetch_awesomeapi(["USD-BRL","EUR-BRL","GBP-BRL","JPY-BRL","ARS-BRL"], "câmbio")
    for code, (key, dec) in {"USDBRL":("dolar",4),"EURBRL":("euro",4),"GBPBRL":("gbp",4),"JPYBRL":("jpy",4),"ARSBRL":("ars",4)}.items():
        fill(key, parse_awesomeapi(cambio, code, dec))
        if key in fresh: print(f"  [awesome] {key.upper()}: {output[key]['val']}")

    # ── 2b. AwesomeAPI: cripto ───────────────────────────────────────────────
    print("\n── 2b. AwesomeAPI: cripto ──")
    cripto = fetch_awesomeapi(["BTC-USD","ETH-USD","SOL-USD","BNB-USD"], "cripto")
    for code, key in {"BTCUSD":"btc","ETHUSD":"eth","SOLUSD":"sol","BNBUSD":"bnb"}.items():
        fill(key, parse_awesomeapi(cripto, code, 2))
        if key in fresh: print(f"  [awesome] {key.upper()}: {output[key]['val']}")

    # ── 2c. AwesomeAPI: commodities ──────────────────────────────────────────
    print("\n── 2c. AwesomeAPI: commodities ──")
    comms = fetch_awesomeapi(["XAU-USD","XAG-USD","WTI-USD"], "commodities")
    for code, key in {"XAUUSD":"ouro","XAGUSD":"prata","WTIUSD":"petroleo"}.items():
        fill(key, parse_awesomeapi(comms, code, 2))
        if key in fresh: print(f"  [awesome] {key.upper()}: {output[key]['val']}")

    # ── 3. Brapi: apenas o que ainda não tem dado fresco ─────────────────────
    all_brapi_map = {**BRAPI_BR_MAP, **BRAPI_US_MAP}
    missing = {sym: key for sym, key in all_brapi_map.items() if key not in fresh}

    if missing:
        print(f"\n── 3. Brapi: buscando {len(missing)} índices ainda sem dados ──")
        brapi_data = fetch_brapi(missing)
        for key, data in brapi_data.items():
            fill(key, data)
    else:
        print("\n── 3. Brapi: todos os índices já têm dados, pulando ──")

    # ── 4. stale: preenche o que ainda sobrou ────────────────────────────────
    all_keys = list(YFINANCE_MAP.values()) + ["dolar","euro","gbp","jpy","ars","btc","eth","sol","bnb","ouro","prata","petroleo"]
    for key in all_keys:
        if key not in output:
            d = with_fallback(key, None)
            if d:
                output[key] = d

    # ── Salvar ────────────────────────────────────────────────────────────────
    with open("data/indices.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    total = sum(1 for k in output if k != "updated_at")
    stale_count = sum(1 for k, v in output.items() if isinstance(v, dict) and v.get("stale"))
    print(f"\n✅ indices.json salvo em {now_str}")
    print(f"   {len(fresh)} frescos | {stale_count} stale | {total} total")

if __name__ == "__main__":
    main()
