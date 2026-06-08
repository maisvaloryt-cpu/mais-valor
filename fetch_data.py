"""
fetch_data.py — Busca cotações da B3 via Yahoo Finance
Roda automaticamente pelo GitHub Actions todo dia útil às 18h
"""
import json, time, datetime, os, requests

ACOES = [
    "PETR4","VALE3","ITUB4","BBDC4","WEGE3","ABEV3","BBAS3","MGLU3",
    "RENT3","SUZB3","ITSA4","BPAC11","PRIO3","GGBR4","VIVT3","EQTL3",
    "RADL3","LREN3","JBSS3","BEEF3","HAPV3","RAIL3","BRFS3","TOTS3",
    "MULT3","AMER3","CYRE3","MRVE3","GGBR4","CSAN3",
]

FIIS = [
    "MXRF11","HGLG11","XPML11","KNRI11","CPTS11","VISC11","BTLG11",
    "BCFF11","RBRF11","HFOF11","KNCR11","HGRE11","RBRR11","LVBI11","BRCO11",
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
}

def fetch_batch(tickers):
    """Busca um lote de tickers no Yahoo Finance"""
    symbols = ",".join([t + ".SA" for t in tickers])
    url = f"https://query2.finance.yahoo.com/v7/finance/quote?symbols={symbols}&fields=regularMarketPrice,regularMarketChangePercent,regularMarketVolume,marketCap,trailingPE,priceToBook,trailingAnnualDividendYield,shortName"
    
    try:
        resp = requests.get(url, headers=HEADERS, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        quotes = data.get("quoteResponse", {}).get("result", [])
        results = []
        for q in quotes:
            ticker = q.get("symbol", "").replace(".SA", "")
            dy = q.get("trailingAnnualDividendYield") or 0
            results.append({
                "ticker": ticker,
                "name": q.get("shortName", ticker),
                "price": round(q.get("regularMarketPrice", 0), 2),
                "change": round(q.get("regularMarketChangePercent", 0), 2),
                "volume": q.get("regularMarketVolume", 0),
                "marketCap": q.get("marketCap", 0),
                "pe": round(q.get("trailingPE", 0), 2) if q.get("trailingPE") else None,
                "pb": round(q.get("priceToBook", 0), 2) if q.get("priceToBook") else None,
                "dividendYield": round(dy * 100, 2),
            })
        print(f"  ✅ {len(results)} ativos buscados")
        return results
    except Exception as e:
        print(f"  ❌ Erro: {e}")
        return []

def fetch_all(tickers, label):
    """Busca em lotes de 10 para não sobrecarregar"""
    all_results = []
    batch_size = 10
    for i in range(0, len(tickers), batch_size):
        batch = tickers[i:i+batch_size]
        print(f"  Buscando {label} {i+1}-{min(i+batch_size, len(tickers))}...")
        results = fetch_batch(batch)
        all_results.extend(results)
        time.sleep(2)  # pausa entre lotes
    return all_results

def main():
    os.makedirs("data", exist_ok=True)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
    now_str = now.strftime("%d/%m/%Y %H:%M")

    print("📊 Buscando ações...")
    acoes = fetch_all(ACOES, "ações")

    print("🏢 Buscando FIIs...")
    fiis = fetch_all(FIIS, "FIIs")

    output = {
        "updated_at": now_str,
        "acoes": acoes,
        "fiis": fiis,
    }

    with open("data/cotacoes.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Concluído!")
    print(f"   {len(acoes)} ações + {len(fiis)} FIIs")
    print(f"   Salvo em data/cotacoes.json")
    print(f"   Horário: {now_str}")

if __name__ == "__main__":
    main()
