"""
fetch_data.py — Busca cotações da B3 via Brapi.dev (1 ticker por vez — plano free)
"""
import json, time, datetime, os, requests

BRAPI_TOKEN = os.environ.get("BRAPI_TOKEN", "")

ACOES = [
    "PETR4","VALE3","ITUB4","BBDC4","WEGE3","ABEV3","BBAS3","MGLU3",
    "RENT3","SUZB3","ITSA4","BPAC11","PRIO3","GGBR4","VIVT3",
    "RADL3","LREN3","HAPV3","BRFS3","TOTS3","MULT3","CYRE3","MRVE3","BBSE3",
]

FIIS = [
    "MXRF11","HGLG11","XPML11","KNRI11","CPTS11","VISC11","BTLG11",
    "BCFF11","RBRF11","KNCR11","HGRE11","LVBI11","BRCO11",
]

def fetch_one(ticker):
    url = f"https://brapi.dev/api/quote/{ticker}?token={BRAPI_TOKEN}"
    try:
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results", [])
        if not results:
            return None
        q = results[0]
        return {
            "ticker": q.get("symbol", ticker),
            "name": q.get("longName") or q.get("shortName") or ticker,
            "price": round(q.get("regularMarketPrice") or 0, 2),
            "change": round(q.get("regularMarketChangePercent") or 0, 2),
            "volume": q.get("regularMarketVolume") or 0,
            "marketCap": q.get("marketCap") or 0,
            "pe": None,
            "pb": None,
            "dividendYield": round(float(q.get("dividendYield") or 0), 2),
        }
    except Exception as e:
        print(f"  Erro {ticker}: {e}")
        return None

def fetch_all(tickers, label):
    results = []
    for i, ticker in enumerate(tickers):
        print(f"  {label} {i+1}/{len(tickers)}: {ticker}")
        data = fetch_one(ticker)
        if data:
            results.append(data)
        time.sleep(0.5)
    return results

def main():
    os.makedirs("data", exist_ok=True)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
    now_str = now.strftime("%d/%m/%Y %H:%M")

    print("Buscando acoes...")
    acoes = fetch_all(ACOES, "Acao")

    print("Buscando FIIs...")
    fiis = fetch_all(FIIS, "FII")

    output = {
        "updated_at": now_str,
        "acoes": acoes,
        "fiis": fiis,
    }

    with open("data/cotacoes.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"Concluido! {len(acoes)} acoes + {len(fiis)} FIIs salvos em {now_str}")

if __name__ == "__main__":
    main()
