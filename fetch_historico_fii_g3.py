"""
fetch_historico_fii_g3.py — Histórico FIIs Grupo 3/4
"""
import json, time, datetime, os, requests

ATIVOS = ["KNUQ11", "KOPA11", "KORE11", "LAFI11", "LASC11", "LIFE11", "LMAI11", "LPLP11", "LRDI11", "LSAG11", "LVBI11", "MALL11", "MANA11", "MAXR11", "MCCI11", "MCEM11", "MCLO11", "MCRE11", "MFII11", "MGHT11", "MIDW11", "MXRF11", "NAUI11", "NAVT11", "NCHB11B", "NCRA11", "NCRI11", "NEWL11", "NEWU11", "NEXG11", "NSLU11", "NVHO11", "OCRE11", "OIAG11", "ONDA11", "ONDV11", "OUJP11", "OXRL11", "PATA11", "PATC11", "PATL11", "PCIP11", "PEMA11", "PLAG11", "PLCA11", "PLRI11", "PMFO11", "PMIS11", "PMLL11", "PMRL11", "PNDL11", "PORD11", "PQAG11", "PQDP11", "PRSV11", "PSEC11", "PVBI11", "QAGR11", "RBCO11", "RBDS11", "RBFM11", "RBFY11", "RBHG11", "RBHY11", "RBIR11", "RBLG11", "RBOP11", "RBRD11", "RBRI11", "RBRL11", "RBRP11", "RBRR11", "RBRS11", "RBRX11", "RBRY11", "RBTS11", "RBVA11", "RCFF11", "RCRB11", "RCRI11", "RDLI11", "RECD11", "RECM11", "RECR11", "RECT11", "REIT11", "RELG11", "REME11", "RENV11", "RINV11", "RMAI11", "RMBS11", "RNGO11", "RPRI11", "RRCI11", "RSPD11", "RURA11", "RVBI11", "RZAG11", "RZAK11"]

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"}

def fetch_yahoo(ticker):
    symbol = ticker + ".SA"
    end = int(datetime.datetime.now().timestamp())
    start = end - (10 * 365 * 24 * 3600)
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?period1={start}&period2={end}&interval=1mo"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        result = data.get("chart", {}).get("result", [])
        if not result: return None
        r = result[0]
        ts = r.get("timestamp", [])
        closes = r.get("indicators", {}).get("adjclose", [{}])[0].get("adjclose", [])
        if not ts or not closes: return None
        pts = []
        for t, c in zip(ts, closes):
            if c:
                d = datetime.datetime.fromtimestamp(t).strftime("%Y-%m-%d")
                pts.append({"date": d, "close": round(c, 2)})
        return pts if len(pts) >= 3 else None
    except Exception as e:
        print(f"  Erro {ticker}: {e}")
        return None

def main():
    os.makedirs("data/historico", exist_ok=True)
    ok = 0
    for i, ticker in enumerate(ATIVOS):
        path = f"data/historico/{ticker}.json"
        if os.path.exists(path):
            print(f"[{i+1}/{len(ATIVOS)}] {ticker} — já existe")
            ok += 1
            continue
        print(f"[{i+1}/{len(ATIVOS)}] {ticker}...", end=" ")
        pts = fetch_yahoo(ticker)
        if pts:
            with open(path, "w") as f:
                json.dump({"ticker": ticker, "history": pts}, f)
            print(f"OK ({len(pts)} pts)")
            ok += 1
        else:
            print("sem dados")
        time.sleep(0.8)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3))).strftime("%d/%m/%Y %H:%M")
    print(f"\nFII Grupo 3 concluído! {ok}/{len(ATIVOS)} em {now}")

if __name__ == "__main__":
    main()
