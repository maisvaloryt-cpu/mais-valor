"""
gerar_dividendos.py — Consolida data/dividendos/TICKER.json em data/dividendos.json
Lê todos os arquivos individuais e gera uma lista dos próximos pagamentos.
"""
import json, os, datetime

DIAS_FUTUROS = 90  # pega dividendos dos próximos 90 dias

def main():
    pasta = "data/dividendos"
    if not os.path.exists(pasta):
        print("Pasta data/dividendos não encontrada")
        return

    # Carrega nomes dos ativos do cotacoes.json para ter nome e setor
    nomes = {}
    try:
        with open("data/cotacoes.json") as f:
            cot = json.load(f)
        for a in cot.get("acoes", []) + cot.get("fiis", []):
            nomes[a["ticker"]] = {"n": a.get("name", a["ticker"]), "p": a.get("price", 0)}
    except:
        pass

    hoje = datetime.date.today()
    limite = hoje + datetime.timedelta(days=DIAS_FUTUROS)

    proximos = []
    total_ativos = 0       # quantos tickers têm histórico guardado
    total_registros = 0    # quantos pagamentos no banco inteiro

    for fname in sorted(os.listdir(pasta)):
        if not fname.endswith(".json"):
            continue
        ticker = fname.replace(".json", "")
        try:
            with open(f"{pasta}/{fname}") as f:
                data = json.load(f)
            divs = data.get("dividendos", [])
            if divs:
                total_ativos += 1
                total_registros += len(divs)
            preco = nomes.get(ticker, {}).get("p", 0)
            nome  = nomes.get(ticker, {}).get("n", ticker)

            for d in divs:
                # data pode ser YYYY-MM-DD
                try:
                    dt = datetime.date.fromisoformat(d["date"])
                except:
                    continue
                # Mostra dividendos futuros e recentes (últimos 5 dias)
                if dt < hoje - datetime.timedelta(days=5):
                    continue
                if dt > limite:
                    continue

                val = d.get("value", 0)
                dy_est = ""
                if preco and val:
                    dy_anual = (val / preco) * 12 * 100
                    dy_est = f"{dy_anual:.2f}%"

                isFii = ticker.endswith("11")
                proximos.append({
                    "t":    ticker,
                    "n":    nome,
                    "tipo": "Rendimento" if isFii else "Dividendo",
                    "com":  d["date"],   # data com (Yahoo retorna a data ex)
                    "pag":  d["date"],   # data pagamento (aproximada, mesmo campo)
                    "val":  round(val, 4),
                    "dy":   dy_est,
                })
        except Exception as e:
            print(f"  Erro {ticker}: {e}")
            continue

    # Ordena por data
    proximos.sort(key=lambda x: x["pag"])

    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
    output = {
        "updated_at": now.strftime("%d/%m/%Y %H:%M"),
        "total": len(proximos),          # pagamentos previstos nos próximos 90 dias
        "total_registros": total_registros,  # tamanho real do banco (histórico completo)
        "total_ativos": total_ativos,        # quantos ativos têm histórico guardado
        "dividendos": proximos,
    }

    with open("data/dividendos.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"✅ dividendos.json gerado com {len(proximos)} pagamentos nos próximos {DIAS_FUTUROS} dias")

if __name__ == "__main__":
    main()
