"""
fetch_historico_g2.py — Histórico Grupo 2/5 (101 a 200 de 403 ações)
"""
import json, time, datetime, os, requests

ATIVOS = ["GFSA3", "JFEN3", "OIBR3", "PDGR3", "GSHP3", "OSXB3", "AUAU3", "BAUH4", "AGXY3", "ESTR4", "LIGT3", "RSID3", "MNPR3", "TRAD3", "IGBR3", "MGEL4", "RVEE3", "ALLD3", "VTRU3", "AZUL3", "BSLI3", "BSLI4", "RIAA3", "BMKS3", "HETA4", "BNBR3", "CTKA4", "HBTS5", "BRSR6", "HOOT4", "NUTR3", "VULC3", "JHSF3", "AHEB3", "CYRE4", "AZZA3", "CALI3", "BRSR3", "BRSR5", "BAZA3", "BGIP4", "CYRE3", "EALT4", "SUZB3", "CTKA3", "ETER3", "PETR4", "EVEN3", "PLPL3", "CSED3", "TRIS3", "BEEF3", "EALT3", "LAVV3", "MELK3", "LPSB3", "MDNE3", "GRND3", "GMAT3", "COCE5", "BMGB4", "PETR3", "EQMA3B", "SOND5", "POMO4", "POMO3", "COCE3", "SEER3", "EUCA4", "SOND6", "VLID3", "CAMB3", "RECV3", "MTRE3", "EUCA3", "CEAB3", "DEXP3", "CEEB5", "DEXP4", "RSUL4", "TEND3", "PINE3", "ABCB4", "EZTC3", "SHUL4", "WIZC3", "SANB3", "PINE4", "RPAD6", "LUXM4", "CMIG4", "SANB11", "LEVE3", "CEEB3", "BEES3", "OFSA3", "SMTO3", "BEES4", "LOGG3", "RPAD5"]

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
    print(f"\nGrupo 2 concluído! {ok}/{len(ATIVOS)} ativos")

if __name__ == "__main__":
    main()
