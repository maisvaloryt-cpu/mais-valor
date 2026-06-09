"""
fetch_historico_indices.py — Busca histórico mensal de índices via API do BCB e Brapi
Salva em data/historico/CDI.json, IPCA.json, IMAB.json, etc.
no mesmo formato que os outros arquivos de histórico.

APIs utilizadas:
  - BCB SGS: api.bcb.gov.br/dados/serie/bcdata.sgs.{cod}/dados?formato=json
    CDI diário  → série 12
    IPCA mensal → série 433
    IMA-B total → série 12466
    IMA-B5      → série 12467
    IMA Geral   → série 12469
    SELIC diária→ série 11
  - Brapi:     brapi.dev/api/quote/^BVSP,IFIX11 (para IBOV e IFIX mensal)
"""
import json, datetime, os, time, requests

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"}
BRAPI_TOKEN = os.environ.get("BRAPI_TOKEN", "")

BCB_SERIES = {
    "CDI":   {"cod": 12,    "desc": "CDI diário acumulado mensal"},
    "IPCA":  {"cod": 433,   "desc": "IPCA mensal"},
    "IMAB":  {"cod": 12466, "desc": "IMA-B total"},
    "IMAB5": {"cod": 12467, "desc": "IMA-B5"},
    "IMA":   {"cod": 12469, "desc": "IMA Geral"},
}

def fetch_bcb_serie(cod, nome):
    """
    Busca série histórica mensal via API SGS do Banco Central.
    Retorna lista de {'date': 'YYYY-MM-DD', 'close': valor}
    Para CDI (série 12 = taxa diária %), acumula mensalmente.
    Para IPCA e IMA-B (variação %), acumula em índice base 100.
    """
    try:
        url = f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{cod}/dados?formato=json"
        r = requests.get(url, headers=HEADERS, timeout=30)
        r.raise_for_status()
        dados = r.json()

        # Agrupa por mês
        por_mes = {}
        for d in dados:
            # Data no formato dd/MM/yyyy
            partes = d.get("data", "").split("/")
            if len(partes) != 3:
                continue
            dia, mes, ano = partes
            chave = f"{ano}-{mes}"
            valor = float(d.get("valor", 0) or 0)
            if chave not in por_mes:
                por_mes[chave] = []
            por_mes[chave].append(valor)

        # Converte para índice de preço acumulado (base: primeiro mês = 100)
        meses_ordenados = sorted(por_mes.keys())
        pontos = []
        indice = 100.0

        for mes in meses_ordenados:
            valores = por_mes[mes]
            if nome == "CDI":
                # CDI: taxa diária em %, acumular para taxa mensal
                # (1 + r1/100) * (1 + r2/100) * ... - 1
                fator_mensal = 1.0
                for v in valores:
                    fator_mensal *= (1 + v / 100)
                retorno_mensal = fator_mensal - 1
            else:
                # IPCA, IMA-B: variação mensal única (primeiro valor do mês)
                retorno_mensal = valores[0] / 100 if valores else 0

            indice *= (1 + retorno_mensal)
            data_str = f"{mes}-01"
            pontos.append({"date": data_str, "close": round(indice, 4)})

        print(f"  {nome}: {len(pontos)} pontos mensais (base 100)")
        return pontos

    except Exception as e:
        print(f"  Erro {nome} (BCB série {cod}): {e}")
        return []


def fetch_brapi_historico(symbol, nome):
    """
    Busca histórico mensal via Yahoo Finance (através da Brapi).
    IBOV = ^BVSP, IFIX = IFIX11.
    """
    try:
        end = int(datetime.datetime.now().timestamp())
        start = end - (12 * 365 * 24 * 3600)  # 12 anos
        token_param = f"&token={BRAPI_TOKEN}" if BRAPI_TOKEN else ""
        url = f"https://brapi.dev/api/quote/{symbol}?range=10y&interval=1mo{token_param}"
        r = requests.get(url, headers=HEADERS, timeout=20)
        r.raise_for_status()
        data = r.json()
        results = data.get("results", [])
        if not results:
            raise ValueError("sem resultados")

        hist = results[0].get("historicalDataPrice", [])
        pontos = []
        for h in hist:
            ts = h.get("date")
            close = h.get("close") or h.get("adjclose")
            if ts and close:
                dt = datetime.datetime.fromtimestamp(ts).strftime("%Y-%m-%d")
                pontos.append({"date": dt, "close": round(float(close), 2)})

        pontos.sort(key=lambda x: x["date"])
        print(f"  {nome}: {len(pontos)} pontos mensais")
        return pontos

    except Exception as e:
        print(f"  Erro {nome} (Brapi {symbol}): {e}")
        return []


def fetch_yahoo_direto(symbol_sa, nome):
    """
    Fallback: Yahoo Finance direto (sem Brapi).
    """
    try:
        end = int(datetime.datetime.now().timestamp())
        start = end - (12 * 365 * 24 * 3600)
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol_sa}?period1={start}&period2={end}&interval=1mo"
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=20)
        r.raise_for_status()
        data = r.json()
        result = data.get("chart", {}).get("result", [])
        if not result:
            raise ValueError("sem result")
        res = result[0]
        ts_list = res.get("timestamp", [])
        closes = res.get("indicators", {}).get("adjclose", [{}])[0].get("adjclose", [])
        pontos = []
        for ts, c in zip(ts_list, closes):
            if c:
                dt = datetime.datetime.fromtimestamp(ts).strftime("%Y-%m-%d")
                pontos.append({"date": dt, "close": round(float(c), 2)})
        print(f"  {nome} (Yahoo fallback): {len(pontos)} pontos")
        return pontos
    except Exception as e:
        print(f"  Erro {nome} (Yahoo fallback): {e}")
        return []


def salvar(nome, pontos):
    if not pontos:
        print(f"  {nome}: sem dados para salvar")
        return False
    path = f"data/historico/{nome}.json"
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3))).strftime("%d/%m/%Y %H:%M")
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"ticker": nome, "history": pontos, "updated_at": now}, f)
    print(f"  ✅ {nome} salvo em {path} ({len(pontos)} pontos)")
    return True


def main():
    os.makedirs("data/historico", exist_ok=True)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
    print(f"=== fetch_historico_indices.py — {now.strftime('%d/%m/%Y %H:%M')} ===\n")
    ok = 0

    # 1. BCB: CDI, IPCA, IMA-B
    print("── BCB SGS (CDI, IPCA, IMA-B) ──")
    for nome, info in BCB_SERIES.items():
        print(f"[{nome}] {info['desc']}...")
        pontos = fetch_bcb_serie(info["cod"], nome)
        if salvar(nome, pontos):
            ok += 1
        time.sleep(1)

    # 2. Brapi/Yahoo: IBOV e IFIX
    print("\n── IBOV e IFIX ──")
    for nome, symbol in [("IBOV", "^BVSP"), ("IFIX", "IFIX11")]:
        print(f"[{nome}] buscando via Brapi...")
        pontos = fetch_brapi_historico(symbol, nome)
        if not pontos:
            print(f"  Brapi falhou para {nome}, tentando Yahoo direto...")
            pontos = fetch_yahoo_direto(symbol if nome == "IFIX" else "^BVSP", nome)
        if salvar(nome, pontos):
            ok += 1
        time.sleep(1.5)

    total = len(BCB_SERIES) + 2
    print(f"\n✅ {ok}/{total} índices salvos com histórico")
    print("   Arquivos gerados em data/historico/:")
    for nome in list(BCB_SERIES.keys()) + ["IBOV", "IFIX"]:
        path = f"data/historico/{nome}.json"
        if os.path.exists(path):
            print(f"   ✓ {path}")
        else:
            print(f"   ✗ {path} — falhou")


if __name__ == "__main__":
    main()
