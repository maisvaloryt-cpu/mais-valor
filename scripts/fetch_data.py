"""
fetch_data.py — Cotações diárias via Brapi para TODOS os ativos
Lê a lista completa do fundamentus.json e fiis_fundamentus.json
Salva cotação diária em data/diario/TICKER.json (fallback)
"""
import json, time, datetime, os, requests

BRAPI_TOKEN = os.environ.get("BRAPI_TOKEN", "")

def get_tickers_acoes():
    """Lê lista de ações do fundamentus.json"""
    try:
        with open("data/fundamentus.json") as f:
            d = json.load(f)
        tickers = list(d.get("acoes", {}).keys())
        print(f"  {len(tickers)} ações carregadas do fundamentus.json")
        return tickers
    except:
        # Fallback se fundamentus ainda não existir
        print("  fundamentus.json não encontrado, usando lista padrão")
        return [
            "PETR4","VALE3","ITUB4","BBDC4","WEGE3","ABEV3","BBAS3","MGLU3",
            "RENT3","SUZB3","ITSA4","BPAC11","PRIO3","GGBR4","VIVT3","EQTL3",
            "RADL3","LREN3","HAPV3","BRFS3","TOTS3","MULT3","CYRE3","MRVE3","BBSE3",
        ]

def get_tickers_fiis():
    """Lê lista de FIIs do fiis_fundamentus.json"""
    try:
        with open("data/fiis_fundamentus.json") as f:
            d = json.load(f)
        tickers = list(d.get("fiis", {}).keys())
        print(f"  {len(tickers)} FIIs carregados do fiis_fundamentus.json")
        return tickers
    except:
        print("  fiis_fundamentus.json não encontrado, usando lista padrão")
        return [
            "MXRF11","HGLG11","XPML11","KNRI11","CPTS11","VISC11","BTLG11",
            "BCFF11","RBRF11","KNCR11","HGRE11","LVBI11","BRCO11",
        ]

def fetch_one(ticker):
    url = f"https://brapi.dev/api/quote/{ticker}?token={BRAPI_TOKEN}"
    try:
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results", [])
        if not results: return None
        q = results[0]
        price = q.get("regularMarketPrice") or 0
        if price == 0: return None
        return {
            "ticker": ticker,
            "name": q.get("longName") or q.get("shortName") or ticker,
            "price": round(price, 2),
            "change": round(q.get("regularMarketChangePercent") or 0, 2),
            "volume": q.get("regularMarketVolume") or 0,
            "marketCap": q.get("marketCap") or 0,
            "pe": None, "pb": None,
            "dividendYield": round(float(q.get("dividendYield") or 0), 2),
            "fallback": False,
        }
    except:
        return None

def salvar_diario(ticker, price, date_str):
    os.makedirs("data/diario", exist_ok=True)
    path = f"data/diario/{ticker}.json"
    history = []
    if os.path.exists(path):
        try:
            with open(path) as f:
                history = json.load(f).get("history", [])
        except:
            history = []
    if history and history[-1]["date"] == date_str:
        history[-1]["close"] = price
    else:
        history.append({"date": date_str, "close": price})
    if len(history) > 500:
        history = history[-500:]
    with open(path, "w") as f:
        json.dump({"ticker": ticker, "history": history}, f)

def fallback_diario(ticker):
    path = f"data/diario/{ticker}.json"
    try:
        if not os.path.exists(path): return None
        with open(path) as f:
            data = json.load(f)
        hist = data.get("history", [])
        if not hist: return None
        last = hist[-1]
        dias = (datetime.date.today() - datetime.date.fromisoformat(last["date"])).days
        return {
            "ticker": ticker, "name": ticker,
            "price": last["close"], "change": 0.0,
            "volume": 0, "marketCap": 0,
            "pe": None, "pb": None, "dividendYield": 0,
            "fallback": True, "fallback_date": last["date"], "fallback_days": dias,
        }
    except:
        return None

def fetch_all(tickers, label):
    results = []
    today = datetime.date.today().isoformat()
    ok = fb = sem = 0
    for i, ticker in enumerate(tickers):
        print(f"  {label} {i+1}/{len(tickers)}: {ticker}", end=" ")
        data = fetch_one(ticker)
        if data:
            salvar_diario(ticker, data["price"], today)
            print(f"✓ R${data['price']} ({data['change']:+.2f}%)")
            results.append(data); ok += 1
        else:
            fb_data = fallback_diario(ticker)
            if fb_data:
                print(f"⚠ fallback {fb_data.get('fallback_days','?')}d R${fb_data['price']}")
                results.append(fb_data); fb += 1
            else:
                print("✗ sem dados"); sem += 1
        time.sleep(0.4)
    print(f"  → {label}: {ok} OK | {fb} fallback | {sem} sem dados")
    return results

def main():
    os.makedirs("data", exist_ok=True)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
    now_str = now.strftime("%d/%m/%Y %H:%M")

    # Primeiro roda o Fundamentus para ter a lista atualizada
    print("Carregando listas de ativos...")
    acoes_tickers = get_tickers_acoes()
    fiis_tickers = get_tickers_fiis()

    print(f"\nBuscando {len(acoes_tickers)} ações...")
    acoes = fetch_all(acoes_tickers, "Ação")

    print(f"\nBuscando {len(fiis_tickers)} FIIs...")
    fiis = fetch_all(fiis_tickers, "FII")

    output = {"updated_at": now_str, "acoes": acoes, "fiis": fiis}
    with open("data/cotacoes.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    total_fb = sum(1 for a in acoes+fiis if a.get("fallback"))
    print(f"\n✅ Concluído! {len(acoes)} ações + {len(fiis)} FIIs")
    print(f"   Brapi OK: {len(acoes)+len(fiis)-total_fb} | Fallback: {total_fb}")
    print(f"   Horário: {now_str}")

if __name__ == "__main__":
    main()
