"""
fetch_historico_fii_g1.py — Histórico FIIs Grupo 1/4
"""
import json, time, datetime, os, requests

ATIVOS = ["AAZQ11", "ABCP11", "ADSH11", "AFHF11", "AFHI11", "AGRX11", "AIEC11", "AJFI11", "ALMI11", "ALZC11", "ALZR11", "ANCR11", "APTO11", "APXM11", "AROA11", "ARRI11", "ARTE11", "ARXD11", "ASMT11", "ATSA11", "AURB11", "AZPL11", "BBFO11", "BBGO11", "BBIG11", "BBRC11", "BCIA11", "BCRI11", "BFCC11", "BGRB11", "BICE11", "BIME11", "BLCA11", "BLMG11", "BLMO11", "BLOG11", "BMLC11", "BNFS11", "BPML11", "BRCO11", "BRCR11", "BRIM11", "BRIP11", "BROF11", "BTAL11", "BTCI11", "BTHF11", "BTHI11", "BTLG11", "BTRA11", "BTSI11", "BTWR11", "BTYU11", "CACR11", "CARE11", "CBOP11", "CCME11", "CEOC11", "CFII11", "CJCT11", "CLIN11", "CNES11", "CPLG11", "CPOF11", "CPSH11", "CPTR11", "CPTS11", "CPUR11", "CRAA11", "CRFF11", "CTXT11", "CVBI11", "CXAG11", "CXCE11", "CXCI11", "CXCO11", "CXRI11", "CXTL11", "CYLD11", "DAMA11", "DAMT11", "DAYM11", "DCRA11", "DEVA11", "DOVL11", "DPRO11", "DVFF11", "EDFO11", "EDGA11", "EDGE11", "EGAF11", "EIRA11", "EMET11", "EQIR11", "ERPA11", "EURO11", "EXES11", "FAED11", "FAMB11", "FATN11"]

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
    print(f"\nFII Grupo 1 concluído! {ok}/{len(ATIVOS)} em {now}")

if __name__ == "__main__":
    main()
