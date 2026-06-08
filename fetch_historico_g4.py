"""
fetch_historico_g4.py — Histórico Grupo 4/5 (301 a 400 de 403 ações)
"""
import json, time, datetime, os, requests

ATIVOS = ["BMEB4", "ENGI11", "CEBR6", "BMOB3", "ENMT4", "FLRY3", "MATD3", "ALPA4", "BALM3", "TELB4", "REDE3", "GGPS3", "FESA4", "PDTC3", "JOPA3", "JOPA4", "PTNT3", "PTNT4", "DMVF3", "AFLT3", "PASS3", "PATI4", "BPAC3", "EGIE3", "MYPK3", "CEGR3", "AXIA3", "TFCO4", "PATI3", "PEAB4", "B3SA3", "ENGI3", "JALL3", "CPLE3", "CSMG3", "PEAB3", "RDOR3", "SCAR3", "ABEV3", "ALOS3", "SMFT3", "OPCT3", "ASAI3", "VIVT3", "AXIA6", "UNIP3", "ESPA3", "WHRL3", "UNIP6", "WHRL4", "UNIP5", "TELB3", "RENT3", "YDUQ3", "PRIO3", "VVEO3", "GOAU3", "TKNO4", "TOTS3", "FRIO3", "VALE3", "ARML3", "SLCE3", "PRNR3", "GOAU4", "EQPA5", "RADL3", "FRAS3", "GGBR3", "FESA3", "RAIL3", "WEGE3", "GGBR4", "KLBN11", "KLBN4", "QUAL3", "KLBN3", "BRST3", "MGLU3", "EMBJ3", "EQTL3", "DESK3", "SOJA3", "ENEV3", "BIOM3", "BRAV3", "AURA33", "HBOR3", "POSI3", "CBAV3", "EPAR3", "MBRF3", "SAUD3", "ALPK3", "ORVR3", "LOGN3", "CBEE3", "GEPA3", "GEPA4", "LAND3"]

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
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
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
    print(f"\nGrupo 4 concluído! {ok}/{len(ATIVOS)} ativos")

if __name__ == "__main__":
    main()
