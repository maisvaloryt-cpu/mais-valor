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

def fetch_dolar_bcb():
    """Busca dólar comercial via API pública do Banco Central"""
    try:
        url = "https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL"
        r = requests.get(url, headers=HEADERS, timeout=10)
        r.raise_for_status()
        data = r.json()
        out = {}
        if "USDBRL" in data:
            d = data["USDBRL"]
            val = float(d.get("bid", 0))
            pct = float(d.get("pctChange", 0))
            out["dolar"] = {"val": round(val, 4), "chg": round(pct, 2), "chg_pts": 0}
        if "EURBRL" in data:
            d = data["EURBRL"]
            val = float(d.get("bid", 0))
            pct = float(d.get("pctChange", 0))
            out["euro"] = {"val": round(val, 4), "chg": round(pct, 2), "chg_pts": 0}
        return out
    except Exception as e:
        print(f"  Erro câmbio: {e}")
        return {}

def fetch_crypto_and_gold():
    """Busca BTC e Ouro via AwesomeAPI"""
    try:
        url = "https://economia.awesomeapi.com.br/json/last/BTC-USD,XAU-USD"
        r = requests.get(url, headers=HEADERS, timeout=10)
        r.raise_for_status()
        data = r.json()
        out = {}
        if "BTCUSD" in data:
            d = data["BTCUSD"]
            val = float(d.get("bid", 0))
            pct = float(d.get("pctChange", 0))
            out["btc"] = {"val": round(val, 0), "chg": round(pct, 2), "chg_pts": 0}
        if "XAUUSD" in data:
            d = data["XAUUSD"]
            val = float(d.get("bid", 0))
            pct = float(d.get("pctChange", 0))
            out["ouro"] = {"val": round(val, 0), "chg": round(pct, 2), "chg_pts": 0}
        return out
    except Exception as e:
        print(f"  Erro cripto/ouro: {e}")
        return {}

def main():
    os.makedirs("data", exist_ok=True)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
    now_str = now.strftime("%d/%m/%Y %H:%M")

    # Carregar lastValid do arquivo anterior para usar como fallback
    last_valid = {}
    indices_path = "data/indices.json"
    if os.path.exists(indices_path):
        try:
            with open(indices_path) as f:
                prev = json.load(f)
            for k, v in prev.items():
                if k != "updated_at" and isinstance(v, dict) and v.get("val"):
                    last_valid[k] = {**v, "stale": False}  # snapshot do último válido
        except:
            pass

    def with_fallback(key, new_data):
        """Retorna new_data se válido, ou last_valid com stale=True se falhou."""
        if new_data and new_data.get("val"):
            return {**new_data, "stale": False}
        if key in last_valid:
            return {**last_valid[key], "stale": True}
        return None

    output = {"updated_at": now_str}

    # 1. Brapi: IBOV e IFIX
    print("Buscando IBOV e IFIX via Brapi...")
    brapi_data = fetch_brapi(["^BVSP", "IFIX11"])
    ibov = with_fallback("ibov", brapi_data.get("^BVSP"))
    ifix = with_fallback("ifix", brapi_data.get("IFIX11"))
    if ibov: output["ibov"] = ibov; print(f"  IBOV: {ibov['val']} ({ibov['chg']:+.2f}%){' [stale]' if ibov.get('stale') else ''}")
    else: print("  IBOV: sem dados")
    if ifix: output["ifix"] = ifix; print(f"  IFIX: {ifix['val']} ({ifix['chg']:+.2f}%){' [stale]' if ifix.get('stale') else ''}")
    else: print("  IFIX: sem dados")

    # 2. AwesomeAPI: Câmbio
    print("Buscando câmbio (USD/EUR) via AwesomeAPI...")
    cambio = fetch_dolar_bcb()
    dolar = with_fallback("dolar", cambio.get("dolar"))
    euro  = with_fallback("euro",  cambio.get("euro"))
    if dolar: output["dolar"] = dolar; print(f"  USD/BRL: {dolar['val']}{' [stale]' if dolar.get('stale') else ''}")
    else: print("  USD/BRL: sem dados")
    if euro:  output["euro"]  = euro;  print(f"  EUR/BRL: {euro['val']}{' [stale]' if euro.get('stale') else ''}")
    else: print("  EUR/BRL: sem dados")

    # 3. AwesomeAPI: Crypto + Ouro
    print("Buscando BTC e Ouro...")
    extra = fetch_crypto_and_gold()
    btc  = with_fallback("btc",  extra.get("btc"))
    ouro = with_fallback("ouro", extra.get("ouro"))
    if btc:  output["btc"]  = btc;  print(f"  BTC: ${btc['val']:,.0f}{' [stale]' if btc.get('stale') else ''}")
    else: print("  BTC: sem dados")
    if ouro: output["ouro"] = ouro; print(f"  Ouro: ${ouro['val']:,.0f}{' [stale]' if ouro.get('stale') else ''}")
    else: print("  Ouro: sem dados")

    with open("data/indices.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    stale_count = sum(1 for k, v in output.items() if isinstance(v, dict) and v.get("stale"))
    print(f"\n✅ indices.json salvo em {now_str}")
    total = sum(1 for k in output if k != "updated_at" and output[k])
    print(f"   {total}/6 índices com dados | {stale_count} usando lastValid (stale)")

if __name__ == "__main__":
    main()
