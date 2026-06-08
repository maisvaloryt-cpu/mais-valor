"""
fetch_historico.py — Busca histórico de 10 anos via Yahoo Finance (gratuito)
RODE APENAS UMA VEZ! Depois o fetch_data.py cuida do dia a dia.
"""
import json, time, datetime, os, requests

ATIVOS = [
    "PETR4","VALE3","ITUB4","BBDC4","WEGE3","ABEV3","BBAS3","MGLU3",
    "RENT3","SUZB3","ITSA4","BPAC11","PRIO3","GGBR4","VIVT3",
    "RADL3","LREN3","HAPV3","BRFS3","TOTS3","MULT3","CYRE3","MRVE3","BBSE3",
    "MXRF11","HGLG11","XPML11","KNRI11","CPTS11","VISC11","BTLG11",
    "RBRF11","KNCR11","HGRE11","LVBI11","BRCO11",
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
}

def fetch_historico_yahoo(ticker):
    symbol = ticker + ".SA"
    # 10 anos em segundos
    end = int(datetime.datetime.now().timestamp())
    start = end - (10 * 365 * 24 * 3600)
    # interval=1mo = mensal
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?period1={start}&period2={end}&interval=1mo"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        result = data.get("chart", {}).get("result", [])
        if not result:
            return None
        r = result[0]
        timestamps = r.get("timestamp", [])
        closes = r.get("indicators", {}).get("adjclose", [{}])[0].get("adjclose", [])
        if not timestamps or not closes:
            return None
        pontos = []
        for ts, close in zip(timestamps, closes):
            if close:
                dt = datetime.datetime.fromtimestamp(ts).strftime("%Y-%m-%d")
                pontos.append({"date": dt, "close": round(close, 2)})
        return pontos
    except Exception as e:
        print(f"  Erro {ticker}: {e}")
        return None

def main():
    os.makedirs("data/historico", exist_ok=True)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
    now_str = now.strftime("%d/%m/%Y %H:%M")
    ok = 0

    for i, ticker in enumerate(ATIVOS):
        print(f"[{i+1}/{len(ATIVOS)}] {ticker}...")
        pontos = fetch_historico_yahoo(ticker)
        if pontos:
            path = f"data/historico/{ticker}.json"
            with open(path, "w", encoding="utf-8") as f:
                json.dump({"ticker": ticker, "history": pontos}, f)
            print(f"  OK — {len(pontos)} pontos mensais salvos")
            ok += 1
        else:
            print(f"  Sem dados para {ticker}")
        time.sleep(1)

    print(f"\nConcluido! {ok}/{len(ATIVOS)} ativos com historico em {now_str}")

if __name__ == "__main__":
    main()
