"""
fetch_dividendos_historico.py — Historico de dividendos (merge incremental)
Busca via Yahoo Finance. Nunca apaga dados existentes.
"""
import json, datetime, os, sys, time, requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_utils import merge_historico

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}

def get_tickers():
    tickers = []
    for fname in ["data/fundamentus.json", "data/fiis_fundamentus.json"]:
        try:
            with open(fname) as f:
                d = json.load(f)
            key = "acoes" if "acoes" in d else "fiis"
            tickers.extend(list(d[key].keys()))
        except:
            pass
    return tickers

def fetch_dividendos_yahoo(ticker):
    symbol = ticker + ".SA"
    end = int(datetime.datetime.now().timestamp())
    start = end - (10 * 365 * 24 * 3600)
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?period1={start}&period2={end}&interval=3mo&events=dividends"
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
        data = r.json()
        result = data.get("chart", {}).get("result", [])
        if not result:
            return []
        events = result[0].get("events", {}).get("dividends", {})
        divs = []
        for ts, info in sorted(events.items()):
            dt = datetime.datetime.fromtimestamp(int(ts)).strftime("%Y-%m-%d")
            val = round(info.get("amount", 0), 4)
            if val > 0:
                divs.append({"date": dt, "value": val})
        return divs
    except:
        return []

def merge_dividendos(path, ticker, novos):
    """Merge incremental para dividendos (chave = date)."""
    existente = []
    if os.path.exists(path):
        try:
            with open(path) as f:
                existente = json.load(f).get("dividendos", [])
        except:
            existente = []
    datas = {d["date"] for d in existente}
    adicionados = [d for d in novos if d["date"] not in datas]
    merged = sorted(existente + adicionados, key=lambda x: x["date"])
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3))).strftime("%d/%m/%Y %H:%M")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump({"ticker": ticker, "dividendos": merged, "updated_at": now}, f)
    return len(adicionados)

def main():
    os.makedirs("data/dividendos", exist_ok=True)
    tickers = get_tickers()
    print(f"Buscando dividendos de {len(tickers)} ativos...")
    ok = novos_total = 0
    for i, ticker in enumerate(tickers):
        path = f"data/dividendos/{ticker}.json"
        print(f"[{i+1}/{len(tickers)}] {ticker}...", end=" ", flush=True)
        divs = fetch_dividendos_yahoo(ticker)
        if not divs:
            print("sem dados")
            time.sleep(0.5)
            continue
        adicionados = merge_dividendos(path, ticker, divs)
        if adicionados > 0:
            print(f"+{adicionados} pagamentos")
            novos_total += adicionados
        else:
            print("ja atualizado")
        ok += 1
        time.sleep(0.5)
    print(f"\nConcluido! {ok}/{len(tickers)} ativos, {novos_total} pagamentos novos")

if __name__ == "__main__":
    main()
