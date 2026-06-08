"""
fetch_indices.py — Busca índices em tempo real via Yahoo Finance
Salva em data/indices.json
"""
import json, datetime, os, requests

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"}

INDICES = {
    "ibov":  "^BVSP",
    "ifix":  "IFIX11.SA",
    "dolar": "BRL=X",
    "euro":  "EURBRL=X",
    "ouro":  "GC=F",
    "btc":   "BTC-USD",
}

def fetch_quote(symbol):
    url = f"https://query1.finance.yahoo.com/v7/finance/quote?symbols={symbol}"
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        r.raise_for_status()
        results = r.json().get("quoteResponse", {}).get("result", [])
        if not results: return None
        q = results[0]
        return {
            "val": round(q.get("regularMarketPrice", 0), 2),
            "chg": round(q.get("regularMarketChangePercent", 0), 2),
            "chg_pts": round(q.get("regularMarketChange", 0), 2),
        }
    except Exception as e:
        print(f"  Erro {symbol}: {e}")
        return None

def main():
    os.makedirs("data", exist_ok=True)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
    now_str = now.strftime("%d/%m/%Y %H:%M")

    output = {"updated_at": now_str}
    for name, symbol in INDICES.items():
        print(f"  Buscando {name} ({symbol})...", end=" ")
        data = fetch_quote(symbol)
        if data:
            output[name] = data
            print(f"OK: {data['val']} ({data['chg']:+.2f}%)")
        else:
            print("falhou")

    with open("data/indices.json", "w") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"✅ indices.json salvo em {now_str}")

if __name__ == "__main__":
    main()
