"""
fetch_historico_g1.py — Histórico Grupo 1/5 (1 a 100 de 403 ações)
"""
import json, time, datetime, os, requests

ATIVOS = ["AGRO3", "GPAR3", "IRBR3", "SIMH3", "WEST3", "DTCY3", "NGRD3", "MAPT4", "MAPT3", "HBSA3", "TASA3", "JSLG3", "TASA4", "HAPV3", "ENJU3", "ATED3", "EMAE4", "AURE3", "LWSA3", "AMER3", "AZTE3", "MSPA3", "CVCB3", "UCAS3", "CRPG3", "CASH3", "RAPT3", "RAPT4", "CRPG6", "NATU3", "AALR3", "BLUT3", "USIM5", "CRPG5", "MNDL3", "BIED3", "USIM3", "MRVE3", "USIM6", "ADHM3", "CSNA3", "RCSL4", "FIEI3", "DASA3", "RCSL3", "RNEW3", "RNEW4", "TUPY3", "SEQL3", "OBTC3", "AMAR3", "CEDO3", "BLUT4", "AMOB3", "CSAN3", "MEAL3", "LJQQ3", "AMBP3", "NORD3", "TPIS3", "FHER3", "VIVR3", "AVLL3", "SHOW3", "MWET4", "CEDO4", "WDCN3", "PTBL3", "CTAX3", "BRKM5", "TXRX3", "TCSA3", "BDLL3", "BRKM6", "BRKM3", "FICT3", "TOKY3", "PCAR3", "ONCO3", "BHIA3", "BDLL4", "LUPA3", "IFCM3", "INEP3", "NEXP3", "ARND3", "INEP4", "OIBR4", "BOBR4", "RAIZ4", "PLAS3", "AZEV3", "AERI3", "TXRX4", "AZEV4", "CTSA3", "PMAM3", "RPMG3", "CTSA4", "SNSY5"]

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
    print(f"\nGrupo 1 concluído! {ok}/{len(ATIVOS)} ativos")

if __name__ == "__main__":
    main()
