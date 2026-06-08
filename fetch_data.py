"""
fetch_data.py — Cotações diárias via Brapi
- Salva cotacoes.json com preços atuais
- Adiciona cada fechamento em data/diario/TICKER.json (histórico diário crescente)
- Fallback: se Brapi falhar, usa último preço do histórico diário
"""
import json, time, datetime, os, requests

BRAPI_TOKEN = os.environ.get("BRAPI_TOKEN", "")

ACOES = [
    "PETR4","VALE3","ITUB4","BBDC4","WEGE3","ABEV3","BBAS3","MGLU3",
    "RENT3","SUZB3","ITSA4","BPAC11","PRIO3","GGBR4","VIVT3","EQTL3",
    "RADL3","LREN3","HAPV3","BRFS3","TOTS3","MULT3","CYRE3","MRVE3","BBSE3",
]

FIIS = [
    "MXRF11","HGLG11","XPML11","KNRI11","CPTS11","VISC11","BTLG11",
    "BCFF11","RBRF11","KNCR11","HGRE11","LVBI11","BRCO11",
]

def fetch_one(ticker):
    """Busca cotação atual na Brapi"""
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

def salvar_historico_diario(ticker, price, date_str):
    """Adiciona o fechamento de hoje no histórico diário"""
    os.makedirs("data/diario", exist_ok=True)
    path = f"data/diario/{ticker}.json"
    
    # Carrega histórico existente
    history = []
    if os.path.exists(path):
        try:
            with open(path) as f:
                history = json.load(f).get("history", [])
        except:
            history = []
    
    # Evita duplicar o mesmo dia
    if history and history[-1]["date"] == date_str:
        history[-1]["close"] = price  # atualiza se rodar mais de uma vez no dia
    else:
        history.append({"date": date_str, "close": price})
    
    # Mantém só os últimos 2 anos de dados diários (evita arquivo gigante)
    if len(history) > 500:
        history = history[-500:]
    
    with open(path, "w") as f:
        json.dump({"ticker": ticker, "history": history}, f)

def fallback_from_diario(ticker):
    """Pega último preço do histórico diário (muito mais recente que o mensal)"""
    path = f"data/diario/{ticker}.json"
    try:
        if not os.path.exists(path): return None
        with open(path) as f:
            data = json.load(f)
        history = data.get("history", [])
        if not history: return None
        last = history[-1]
        dias_atras = (datetime.date.today() - datetime.date.fromisoformat(last["date"])).days
        return {
            "ticker": ticker,
            "name": ticker,
            "price": last["close"],
            "change": 0.0,
            "volume": 0,
            "marketCap": 0,
            "pe": None, "pb": None,
            "dividendYield": 0,
            "fallback": True,
            "fallback_date": last["date"],
            "fallback_days": dias_atras,
        }
    except:
        return None

def fetch_all(tickers, label):
    results = []
    today = datetime.date.today().isoformat()
    
    for i, ticker in enumerate(tickers):
        print(f"  {label} {i+1}/{len(tickers)}: {ticker}", end=" ")
        data = fetch_one(ticker)
        
        if data:
            # Salva no histórico diário
            salvar_historico_diario(ticker, data["price"], today)
            print(f"✓ R${data['price']} ({data['change']:+.2f}%)")
            results.append(data)
        else:
            # Fallback: último preço diário
            fb = fallback_from_diario(ticker)
            if fb:
                print(f"⚠ fallback {fb['fallback_days']}d atrás R${fb['price']}")
                results.append(fb)
            else:
                print("✗ sem dados")
        
        time.sleep(0.5)
    return results

def main():
    os.makedirs("data", exist_ok=True)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
    now_str = now.strftime("%d/%m/%Y %H:%M")

    print("Buscando ações...")
    acoes = fetch_all(ACOES, "Ação")

    print("\nBuscando FIIs...")
    fiis = fetch_all(FIIS, "FII")

    output = {"updated_at": now_str, "acoes": acoes, "fiis": fiis}
    with open("data/cotacoes.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    total_fallback = sum(1 for a in acoes+fiis if a.get("fallback"))
    print(f"\nConcluído! {len(acoes)} ações + {len(fiis)} FIIs")
    print(f"Brapi OK: {len(acoes)+len(fiis)-total_fallback} | Fallback: {total_fallback}")
    print(f"Horário: {now_str}")

if __name__ == "__main__":
    main()
