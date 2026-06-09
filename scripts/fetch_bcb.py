"""
fetch_bcb.py — Busca CDI, SELIC e IPCA via API do Banco Central
API pública, gratuita, sem token
Salva em data/bcb.json
"""
import json, datetime, os, requests

def fetch_serie(codigo, n=252):
    """Busca série histórica do BCB. n=252 = 1 ano de dias úteis"""
    url = f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados/ultimos/{n}?formato=json"
    try:
        r = requests.get(url, timeout=15)
        r.raise_for_status()
        data = r.json()
        return [{"date": d["data"], "value": float(d["valor"].replace(",","."))} for d in data]
    except Exception as e:
        print(f"  Erro série {codigo}: {e}")
        return []

def fetch_ultimo(codigo):
    url = f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados/ultimos/1?formato=json"
    try:
        r = requests.get(url, timeout=15)
        r.raise_for_status()
        data = r.json()
        if data:
            return float(data[-1]["valor"].replace(",","."))
    except:
        pass
    return None

def main():
    os.makedirs("data", exist_ok=True)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
    now_str = now.strftime("%d/%m/%Y %H:%M")

    # Carregar lastValid do arquivo anterior
    last_bcb = {}
    bcb_path = "data/bcb.json"
    if os.path.exists(bcb_path):
        try:
            with open(bcb_path) as f:
                last_bcb = json.load(f)
        except:
            pass

    def with_fallback_bcb(key, new_val, fmt_val):
        """Se new_val é None/0, usa last_bcb[key] com stale=True."""
        if new_val is not None and new_val != 0:
            return new_val, False
        prev = last_bcb.get(key, {})
        if isinstance(prev, dict):
            v = prev.get("anual") or prev.get("mensal") or prev.get("acumulado_12m") or prev.get("diario")
        else:
            v = prev
        return v, (v is not None)

    print("Buscando CDI diário (12)...")
    cdi_hist = fetch_serie(12, 252)  # CDI diário 1 ano
    cdi_atual = fetch_ultimo(12)
    print(f"  CDI atual: {cdi_atual}% ao dia")

    print("Buscando SELIC (1178)...")
    selic_hist = fetch_serie(1178, 252)
    selic_atual = fetch_ultimo(1178)
    print(f"  SELIC atual: {selic_atual}% ao dia")

    print("Buscando IPCA mensal (433)...")
    ipca_hist = fetch_serie(433, 24)  # IPCA mensal 2 anos
    ipca_12m = sum(d["value"] for d in ipca_hist[-12:]) if len(ipca_hist) >= 12 else None
    print(f"  IPCA 12m: {ipca_12m:.2f}%" if ipca_12m else "  IPCA: sem dados")

    print("Buscando Poupança (195)...")
    poup_atual = fetch_ultimo(195)

    # Calcula CDI acumulado para comparação com ações
    cdi_acumulado = []
    if cdi_hist:
        base = 100.0
        for d in cdi_hist:
            base *= (1 + d["value"]/100)
            cdi_acumulado.append({"date": d["date"], "value": round(base, 4)})

    cdi_anual = None
    if cdi_atual:
        cdi_anual = round(((1 + cdi_atual/100)**252 - 1)*100, 2)

    selic_anual = None
    if selic_atual:
        selic_anual = round(((1 + selic_atual/100)**252 - 1)*100, 2)

    # Fallbacks para cada série
    _, cdi_stale   = with_fallback_bcb("cdi",      cdi_anual,   cdi_anual)
    _, selic_stale = with_fallback_bcb("selic",    selic_anual, selic_anual)
    _, ipca_stale  = with_fallback_bcb("ipca",     ipca_12m,    ipca_12m)
    _, poup_stale  = with_fallback_bcb("poupanca", poup_atual,  poup_atual)

    # Se série falhou, tenta recuperar o valor anterior
    if cdi_anual is None:
        prev_cdi = last_bcb.get("cdi", {})
        cdi_anual = prev_cdi.get("anual"); cdi_stale = cdi_anual is not None
    if selic_anual is None:
        prev_sel = last_bcb.get("selic", {})
        selic_anual = prev_sel.get("anual"); selic_stale = selic_anual is not None
    if ipca_12m is None:
        prev_ipca = last_bcb.get("ipca", {})
        ipca_12m = prev_ipca.get("acumulado_12m"); ipca_stale = ipca_12m is not None
    if poup_atual is None:
        prev_poup = last_bcb.get("poupanca", {})
        poup_atual = prev_poup.get("mensal"); poup_stale = poup_atual is not None

    poup_anual = round(((1 + poup_atual/100)**12 - 1)*100, 2) if poup_atual else None

    output = {
        "updated_at": now_str,
        "cdi": {
            "diario": cdi_atual,
            "anual": cdi_anual,
            "historico": cdi_hist[-60:],
            "acumulado": cdi_acumulado[-252:],
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

    stale_list = [k for k in ["cdi","selic","ipca","poupanca"] if output[k].get("stale")]
    print(f"\n✅ bcb.json salvo!")
    print(f"   CDI: {cdi_anual:.2f}% a.a." if cdi_anual else "   CDI: sem dados")
    print(f"   SELIC: {selic_anual:.2f}% a.a." if selic_anual else "   SELIC: sem dados")
    print(f"   IPCA 12m: {ipca_12m:.2f}%" if ipca_12m else "   IPCA: sem dados")
    print(f"   Horário: {now_str}")
    if stale_list:
        print(f"   ⚠ Usando lastValid (stale): {', '.join(stale_list)}")

if __name__ == "__main__":
    main()
