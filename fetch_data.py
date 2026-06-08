"""
fetch_data.py — Busca cotações da B3 via Brapi.dev (API brasileira gratuita)
Roda automaticamente pelo GitHub Actions todo dia útil às 18h
"""
import json, time, datetime, os, requests

ACOES = [
    "PETR4","VALE3","ITUB4","BBDC4","WEGE3","ABEV3","BBAS3","MGLU3",
    "RENT3","SUZB3","ITSA4","BPAC11","PRIO3","GGBR4","VIVT3","EQTL3",
    "RADL3","LREN3","JBSS3","BEEF3","HAPV3","RAIL3","BRFS3","TOTS3",
    "MULT3","AMER3","CYRE3","MRVE3","CSAN3","BBSE3",
]

FIIS = [
    "MXRF11","HGLG11","XPML11","KNRI11","CPTS11","VISC11","BTLG11",
    "BCFF11","RBRF11","HFOF11","KNCR11","HGRE11","RBRR11","LVBI11","BRCO11",
]

def fetch_brapi(tickers):
    """Busca cotações via Brapi.dev — API brasileira gratuita, sem token"""
    results = []
    # Brapi aceita até 10 tickers por requisição
    batch_size = 10
    for i in range(0, len(tickers), batch_size):
        batch = tickers[i:i+batch_size]
        symbols = ",".join(batch)
        url = f"https://brapi.dev/api/quote/{symbols}?fundamental=true"
        try:
            resp = requests.get(url, timeout=20)
            resp.raise_for_status()
            data = resp.json()
            quotes = data.get("results", [])
            for q in quotes:
                dy = q.get("dividendYield") or 0
                results.append({
                    "ticker": q.get("symbol", ""),
                    "name": q.get("longName") or q.get("shortName") or q.get("symbol",""),
                    "price": round(q.get("regularMarketPrice") or 0, 2),
                    "change": round(q.get("regularMarketChangePercent") or 0, 2),
                    "volume": q.get("regularMarketVolume") or 0,
                    "marketCap": q.get("marketCap") or 0,
                    "pe": round(q.get("priceEarnings") or 0, 2) or None,
                    "pb": round(q.get("priceToBook") or 0, 2) or None,
                    "dividendYield": round(float(dy), 2) if dy else 0,
                })
            print(f"  ✅ Lote {i//batch_size+1}: {len(quotes)} ativos")
        except Exception as e:
            print(f"  ❌ Erro no lote {i//batch_size+1}: {e}")
        time.sleep(1)
    return results

def main():
    os.makedirs("data", exist_ok=True)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
    now_str = now.strftime("%d/%m/%Y %H:%M")

    print("📊 Buscando ações via Brapi...")
    acoes = fetch_brapi(ACOES)

    print("🏢 Buscando FIIs via Brapi...")
    fiis = fetch_brapi(FIIS)

    output = {
        "updated_at": now_str,
        "acoes": acoes,
        "fiis": fiis,
    }

    with open("data/cotacoes.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Concluído!")
    print(f"   {len(acoes)} ações + {len(fiis)} FIIs salvos")
    print(f"   Horário de Brasília: {now_str}")

if __name__ == "__main__":
    main()
