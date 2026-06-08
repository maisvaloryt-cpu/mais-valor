"""
fetch_dividendos_historico.py — Busca histórico de dividendos via Yahoo Finance
Salva em data/dividendos/TICKER.json
RODE UMA VEZ — depois atualiza automaticamente
"""
import json, datetime, os, time, requests

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"}

def get_tickers():
    tickers = []
    for fname in ["data/fundamentus.json", "data/fiis_fundamentus.json"]:
        try:
            with open(fname) as f:
                d = json.load(f)
            key = "acoes" if "acoes" in d else "fiis"
            tickers.extend(list(d[key].keys()))
        except: pass
    return tickers

def fetch_dividendos(ticker):
    symbol = ticker + ".SA"
    end = int(datetime.datetime.now().timestamp())
    start = end - (10 * 365 * 24 * 3600)
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?period1={start}&period2={end}&interval=3mo&events=dividends"
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
        data = r.json()
        result = data.get("chart", {}).get("result", [])
        if not result: return []
        events = result[0].get("events", {}).get("dividends", {})
        divs = []
        for ts, info in sorted(events.items()):
            dt = datetime.datetime.fromtimestamp(int(ts)).strftime("%Y-%m-%d")
            divs.append({"date": dt, "value": round(info.get("amount", 0), 4)})
        return divs
    except:
        return []

def main():
    os.makedirs("data/dividendos", exist_ok=True)
    tickers = get_tickers()
    print(f"Buscando dividendos de {len(tickers)} ativos...")
    ok = 0
    for i, ticker in enumerate(tickers):
        path = f"data/dividendos/{ticker}.json"
        if os.path.exists(path):
            print(f"[{i+1}/{len(tickers)}] {ticker} — já existe")
            ok += 1
            continue
        print(f"[{i+1}/{len(tickers)}] {ticker}...", end=" ")
        divs = fetch_dividendos(ticker)
        if divs:
            with open(path, "w") as f:
                json.dump({"ticker": ticker, "dividendos": divs}, f)
            print(f"OK ({len(divs)} pagamentos)")
            ok += 1
        else:
            print("sem dados")
        time.sleep(0.5)
    print(f"\n✅ {ok}/{len(tickers)} ativos com histórico de dividendos")

if __name__ == "__main__":
    main()
