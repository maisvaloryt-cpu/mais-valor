"""
fetch_historico_g3.py — Histórico Grupo 3/5 (201 a 300 de 403 ações)
"""
import json, time, datetime, os, requests

ATIVOS = ["BBDC3", "SANB4", "CLSC3", "CGRA3", "ECOR3", "CSUD3", "HAGA4", "CGRA4", "MLAS3", "DOTZ3", "CLSC4", "SBFG3", "RPAD3", "TECN3", "COGN3", "BBSE3", "BGIP3", "ISAE4", "BMIN4", "BBAS3", "ROMI3", "DIRR3", "KEPL3", "INTB3", "NEOE3", "BBDC4", "PFRM3", "EKTR4", "TGMA3", "VIVA3", "ITSA4", "CURY3", "SYNE3", "MILS3", "MOTV3", "PSSA3", "ITSA3", "EQPA3", "TAEE3", "TAEE11", "WLMM4", "CPFE3", "TAEE4", "HYPE3", "SAPR4", "HBRE3", "RANI3", "ALUP4", "VITT3", "SAPR11", "MRSA6B", "BMIN3", "BMEB3", "BPAR3", "MDIA3", "ANIM3", "ITUB4", "PGMN3", "UGPA3", "CMIG3", "BRBI11", "ALUP11", "ISAE3", "WLMM3", "MRSA5B", "BRAP3", "BLAU3", "ITUB3", "BALM4", "VSTE3", "SAPR3", "TTEN3", "MTSA4", "LREN3", "MOVI3", "IGTI3", "IGTI11", "CGAS5", "MRSA3B", "CMIN3", "ALUP3", "CGAS3", "ALPA3", "CEBR5", "HAGA3", "BRAP4", "SBSP3", "EKTR3", "FIQE3", "BPAC11", "ENGI4", "VBBR3", "BPAC5", "CAML3", "ENMT3", "VAMO3", "CEBR3", "MULT3", "CXSE3", "PNVL3"]

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
    print(f"\nGrupo 3 concluído! {ok}/{len(ATIVOS)} ativos")

if __name__ == "__main__":
    main()
