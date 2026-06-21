"""
fetch_bcb.py — Busca CDI, SELIC e IPCA via API do Banco Central
API pública, gratuita, sem token
Salva em data/bcb.json
"""
import json, datetime, os, time, requests

# Alguns servidores do BCB recusam requisições sem User-Agent; mandamos um e tentamos algumas vezes.
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; maisvalor-bot/1.0)"}

def fetch_serie(codigo, n=252):
    """Busca série histórica do BCB. n=252 = 1 ano de dias úteis"""
    url = f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados/ultimos/{n}?formato=json"
    for tentativa in range(3):
        try:
            r = requests.get(url, headers=HEADERS, timeout=20)
            r.raise_for_status()
            data = r.json()
            return [{"date": d["data"], "value": float(d["valor"].replace(",","."))} for d in data]
        except Exception as e:
            print(f"  Erro série {codigo} (tentativa {tentativa+1}/3): {e}")
            time.sleep(2)
    return []

def fetch_ultimo(codigo):
    # Reaproveita a série (mais robusto que um endpoint separado)
    serie = fetch_serie(codigo, 1)
    return serie[-1]["value"] if serie else None

def main():
    os.makedirs("data", exist_ok=True)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
    now_str = now.strftime("%d/%m/%Y %H:%M")

    # lastValid: se uma série falhar, reaproveitamos o último valor bom do bcb.json anterior
    # (marcado como "stale"), em vez de gravar vazio/zero e quebrar a correção da Renda Fixa.
    last_bcb = {}
    bcb_path = "data/bcb.json"
    if os.path.exists(bcb_path):
        try:
            with open(bcb_path, encoding="utf-8") as f:
                last_bcb = json.load(f)
        except Exception:
            pass

    print("Buscando CDI diário (12)...")
    cdi_hist = fetch_serie(12, 252)  # CDI diário 1 ano
    cdi_atual = fetch_ultimo(12)
    print(f"  CDI atual: {cdi_atual}% ao dia")

    print("Buscando SELIC diária (11)...")
    selic_hist = fetch_serie(11, 252)   # série 11 = Selic diária (% ao dia). 1178 é anualizada — não usar como diária.
    selic_atual = fetch_ultimo(11)
    print(f"  SELIC atual: {selic_atual}% ao dia")

    print("Buscando IPCA mensal (433)...")
    ipca_hist = fetch_serie(433, 24)  # IPCA mensal 2 anos (usado no histórico/gráfico)
    ipca_12m = fetch_ultimo(13522)    # IPCA acumulado 12 meses, pronto (série 13522)
    if ipca_12m is None and len(ipca_hist) >= 12:  # reserva: soma os 12 meses da série 433
        ipca_12m = sum(d["value"] for d in ipca_hist[-12:])
    print(f"  IPCA 12m: {ipca_12m:.2f}%" if ipca_12m else "  IPCA: sem dados")

    print("Buscando Poupança (195)...")
    poup_atual = fetch_ultimo(195)

    # Calcula CDI acumulado para comparação com ações
    # Converte CDI diário em curva acumulada (base 100)
    cdi_acumulado = []
    if cdi_hist:
        base = 100.0
        for d in cdi_hist:
            base *= (1 + d["value"]/100)
            cdi_acumulado.append({"date": d["date"], "value": round(base, 4)})

    # CDI anualizado = produto dos diários * 252
    cdi_anual = None
    if cdi_atual:
        cdi_anual = round(((1 + cdi_atual/100)**252 - 1)*100, 2)
    
    selic_anual = None
    if selic_atual:
        selic_anual = round(((1 + selic_atual/100)**252 - 1)*100, 2)

    # Se alguma série falhou (None), reaproveita o último valor válido e marca como stale.
    cdi_stale = selic_stale = ipca_stale = poup_stale = False
    if cdi_anual is None:
        cdi_anual = (last_bcb.get("cdi") or {}).get("anual"); cdi_stale = cdi_anual is not None
        if cdi_atual is None: cdi_atual = (last_bcb.get("cdi") or {}).get("diario")
    if selic_anual is None:
        selic_anual = (last_bcb.get("selic") or {}).get("anual"); selic_stale = selic_anual is not None
        if selic_atual is None: selic_atual = (last_bcb.get("selic") or {}).get("diario")
    if ipca_12m is None:
        ipca_12m = (last_bcb.get("ipca") or {}).get("acumulado_12m"); ipca_stale = ipca_12m is not None
    if poup_atual is None:
        poup_atual = (last_bcb.get("poupanca") or {}).get("mensal"); poup_stale = poup_atual is not None

    poup_anual = round(((1 + poup_atual/100)**12 - 1)*100, 2) if poup_atual else None

    output = {
        "updated_at": now_str,
        "cdi": {
            "diario": cdi_atual,
            "anual": cdi_anual,
            "historico": cdi_hist[-60:],      # últimos 60 dias úteis
            "acumulado": cdi_acumulado[-252:], # curva acumulada 1 ano
            "stale": bool(cdi_stale),
        },
        "selic": {
            "diario": selic_atual,
            "anual": selic_anual,
            "historico": selic_hist[-60:],
            "stale": bool(selic_stale),
        },
        "ipca": {
            "historico": ipca_hist,
            "acumulado_12m": round(ipca_12m, 2) if ipca_12m else None,
            "stale": bool(ipca_stale),
        },
        "poupanca": {
            "mensal": poup_atual,
            "anual": poup_anual,
            "stale": bool(poup_stale),
        }
    }

    with open("data/bcb.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n✅ bcb.json salvo!")
    print(f"   CDI: {cdi_anual:.2f}% a.a." if cdi_anual else "   CDI: sem dados")
    print(f"   SELIC: {selic_anual:.2f}% a.a." if selic_anual else "   SELIC: sem dados")
    print(f"   IPCA 12m: {ipca_12m:.2f}%" if ipca_12m else "   IPCA: sem dados")
    print(f"   Horário: {now_str}")
    stale_list = [k for k in ["cdi","selic","ipca","poupanca"] if output[k].get("stale")]
    if stale_list:
        print(f"   ⚠ Usando lastValid (stale): {', '.join(stale_list)}")

if __name__ == "__main__":
    main()
