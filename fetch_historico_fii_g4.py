"""
fetch_historico_fii_g4.py — Histórico FIIs Grupo 4/4
"""
import json, time, datetime, os, requests

ATIVOS = ["RZAT11", "RZLC11", "RZTR11", "RZZR11", "SAPI11", "SCPF11", "SEQR11", "SHOP11", "SHPH11", "SHPP11", "SJAU11", "SMRE11", "SNAG11", "SNCI11", "SNEL11", "SNFF11", "SNFZ11", "SNME11", "SOFF11", "SPG211", "SPMO11", "SPTW11", "SPXS11", "TELM11", "TEPP11", "TGAR11", "TJKB11", "TMPS11", "TOPP11", "TORD11", "TRBL11", "TRNT11", "TRXB11", "TRXF11", "TRXY11", "TSER11", "TSNC11", "TVRI11", "URHF11", "URPR11", "VCJR11", "VCRA11", "VCRI11", "VCRR11", "VGHF11", "VGIA11", "VGII11", "VGIP11", "VGIR11", "VGRI11", "VHFA11", "VILG11", "VINO11", "VISC11", "VIUR11", "VJFD11", "VOTS11", "VRTA11", "VRTM11", "VSHO11", "VSLH11", "VVCR11", "VVMR11", "VVRI11", "VXXV11", "WHGR11", "WPLZ11", "WTSP11", "XLPR11", "XPCA11", "XPCI11", "XPCM11", "XPIN11", "XPLG11", "XPML11", "XPSF11", "ZAGH11", "ZAVC11", "ZAVI11", "ZIFI11"]

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
    print(f"\nFII Grupo 4 concluído! {ok}/{len(ATIVOS)} em {now}")

if __name__ == "__main__":
    main()
