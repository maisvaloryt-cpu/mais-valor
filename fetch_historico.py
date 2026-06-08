"""
fetch_historico.py — Busca histórico de 10 anos de todos os ativos
RODE APENAS UMA VEZ! Depois o fetch_data.py cuida do dia a dia.
"""
import json, time, datetime, os, requests

BRAPI_TOKEN = os.environ.get("BRAPI_TOKEN", "")

ATIVOS = [
    # Ações
    "PETR4","VALE3","ITUB4","BBDC4","WEGE3","ABEV3","BBAS3","MGLU3",
    "RENT3","SUZB3","ITSA4","BPAC11","PRIO3","GGBR4","VIVT3",
    "RADL3","LREN3","HAPV3","BRFS3","TOTS3","MULT3","CYRE3","MRVE3","BBSE3",
    # FIIs
    "MXRF11","HGLG11","XPML11","KNRI11","CPTS11","VISC11","BTLG11",
    "RBRF11","KNCR11","HGRE11","LVBI11","BRCO11",
]

def fetch_historico(ticker):
    # range=10y = 10 anos, interval=1mo = fechamento mensal
    url = f"https://brapi.dev/api/quote/{ticker}?range=10y&interval=1mo&token={BRAPI_TOKEN}"
    try:
        resp = requests.get(url, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results", [])
        if not results:
            return None
        q = results[0]
        hist = q.get("historicalDataPrice", [])
        # Formata: lista de {date, close}
        pontos = []
        for p in hist:
            if p.get("close"):
                pontos.append({
                    "date": p.get("date", ""),
                    "close": round(p.get("close", 0), 2)
                })
        return {
            "ticker": ticker,
            "name": q.get("longName") or q.get("shortName") or ticker,
            "history": pontos
        }
    except Exception as e:
        print(f"  Erro {ticker}: {e}")
        return None

def main():
    os.makedirs("data/historico", exist_ok=True)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
    now_str = now.strftime("%d/%m/%Y %H:%M")
    ok = 0

    for i, ticker in enumerate(ATIVOS):
        print(f"[{i+1}/{len(ATIVOS)}] Buscando histórico: {ticker}...")
        data = fetch_historico(ticker)
        if data and data["history"]:
            path = f"data/historico/{ticker}.json"
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False)
            print(f"  OK — {len(data['history'])} pontos salvos")
            ok += 1
        else:
            print(f"  Sem dados para {ticker}")
        time.sleep(0.8)

    print(f"\nConcluido! {ok}/{len(ATIVOS)} ativos com histórico salvo em {now_str}")

if __name__ == "__main__":
    main()
