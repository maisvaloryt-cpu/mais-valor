"""
fetch_data.py — Busca cotações da B3 via Yahoo Finance e salva em data/
Roda automaticamente pelo GitHub Actions todo dia útil às 18h
"""
import json, time, datetime, os, requests

# Lista de todas as ações e FIIs que queremos monitorar
# Formato Yahoo Finance: ticker + ".SA" para ativos brasileiros
ACOES = [
    "PETR4","VALE3","ITUB4","BBDC4","WEGE3","ABEV3","BBAS3","MGLU3",
    "RENT3","SUZB3","ITSA4","BPAC11","PRIO3","GGBR4","VIVT3","EQTL3",
    "RADL3","LREN3","JBSS3","BEEF3","CSAN3","UGPA3","HAPV3","RAIL3",
    "BRFS3","SOMA3","NTCO3","PCAR3","IRBR3","QUAL3","LWSA3","TOTS3",
    "MULT3","CASH3","MELI34","AMER3","CYRE3","MRVE3","EVEN3","DIRR3",
]

FIIS = [
    "MXRF11","HGLG11","XPML11","KNRI11","CPTS11","VISC11","BTLG11",
    "BCFF11","RBRF11","HFOF11","KNCR11","HGRE11","RBRR11","LVBI11",
    "BRCO11","XPCA11","HGBS11","HSML11","MALL11","PVBI11","IRDM11",
    "TRXF11","RZTR11","RCRB11","BPFF11","SDIL11","GARE11","TGAR11",
]

def fetch_yahoo(tickers, suffix=".SA"):
    """Busca dados do Yahoo Finance via query v8"""
    results = []
    batch = [t + suffix for t in tickers]
    symbols = "%2C".join(batch)
    
    url = f"https://query1.finance.yahoo.com/v8/finance/spark?symbols={symbols}&range=1d&interval=1d"
    headers = {"User-Agent": "Mozilla/5.0"}
    
    # Tenta buscar preços atuais
    url2 = f"https://query1.finance.yahoo.com/v7/finance/quote?symbols={symbols}"
    try:
        resp = requests.get(url2, headers=headers, timeout=15)
        data = resp.json()
        quotes = data.get("quoteResponse", {}).get("result", [])
        for q in quotes:
            ticker = q.get("symbol","").replace(".SA","")
            results.append({
                "ticker": ticker,
                "price": round(q.get("regularMarketPrice", 0), 2),
                "change": round(q.get("regularMarketChangePercent", 0), 2),
                "volume": q.get("regularMarketVolume", 0),
                "marketCap": q.get("marketCap", 0),
                "name": q.get("shortName", ticker),
                "pe": round(q.get("trailingPE", 0), 2) if q.get("trailingPE") else None,
                "pb": round(q.get("priceToBook", 0), 2) if q.get("priceToBook") else None,
                "dividendYield": round((q.get("trailingAnnualDividendYield") or 0) * 100, 2),
            })
        time.sleep(1)  # respeita rate limit
    except Exception as e:
        print(f"Erro ao buscar {suffix}: {e}")
    
    return results

def main():
    os.makedirs("data", exist_ok=True)
    now = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
    
    print("Buscando ações...")
    acoes = fetch_yahoo(ACOES, ".SA")
    
    print("Buscando FIIs...")
    fiis = fetch_yahoo(FIIS, ".SA")
    
    output = {
        "updated_at": now,
        "acoes": acoes,
        "fiis": fiis,
    }
    
    with open("data/cotacoes.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Salvo: {len(acoes)} ações + {len(fiis)} FIIs em data/cotacoes.json")
    print(f"⏱  Atualizado em: {now}")

if __name__ == "__main__":
    main()
