"""
fetch_historico_fii_g2.py — Histórico FIIs Grupo 2/4
"""
import json, time, datetime, os, requests

ATIVOS = ["FCFL11", "FGAA11", "FIGS11", "FIIB11", "FIIP11", "FISC11", "FIXX11", "FLCR11", "FLMA11", "FLRP11", "FMOF11", "FPAB11", "FPNG11", "FTCA11", "FTCE11", "FVPQ11", "FYTO11", "FZDA11", "FZDB11", "GAME11", "GARE11", "GCOI11", "GCRA11", "GCRI11", "GFDL11", "GGRC11", "GLCR11", "GLOG11", "GLPF11", "GRUL11", "GRWA11", "GSFI11", "GTWR11", "GZIT11", "HAAA11", "HABT11", "HBCR11", "HCHG11", "HCRI11", "HCTR11", "HDEL11", "HFOF11", "HGAG11", "HGBL11", "HGBS11", "HGCR11", "HGIC11", "HGLG11", "HGPO11", "HGRE11", "HGRU11", "HIRE11", "HJCT11", "HLOG11", "HOFC11", "HOSI11", "HPDP11", "HRDF11", "HREC11", "HSAF11", "HSLG11", "HSML11", "HSRE11", "HTMX11", "HUCG11", "HUSI11", "IAAG11", "IAGR11", "IBBP11", "IBCR11", "ICNE11", "ICRI11", "INLG11", "INRD11", "IRIM11", "ITIP11", "ITIT11", "ITRI11", "JASC11", "JCCJ11", "JFLL11", "JGPX11", "JPPA11", "JSAF11", "JSCR11", "JSRE11", "KCRE11", "KDOL11", "KEVE11", "KFOF11", "KISU11", "KIVO11", "KNCA11", "KNCR11", "KNHF11", "KNHY11", "KNIP11", "KNRE11", "KNRI11", "KNSC11"]

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
    print(f"\nFII Grupo 2 concluído! {ok}/{len(ATIVOS)} em {now}")

if __name__ == "__main__":
    main()
