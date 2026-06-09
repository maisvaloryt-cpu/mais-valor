"""
fetch_historico_indices.py — Historico mensal de indices para o Simulador
Merge incremental: nunca apaga dados existentes, so adiciona o que falta.

ESTRATEGIA DE FONTES:
  - BCB SGS: so funciona em IPs brasileiros (GitHub Actions = IP EUA = bloqueado)
             Usado apenas como fallback manual quando rodado localmente.
  - Status Invest: idem, geoblock Brasil.
  - Yahoo Finance: funciona no GitHub Actions para a maioria dos ativos.
  - ETFs como proxy: para indices sem ticker no Yahoo, usamos o ETF que replica
    o indice na B3 (IMAB11 replica IMA-B, IRFM11 replica IRF-M, etc.)
  - CoinGecko: gratuito, funciona no Actions para cripto.
  - AwesomeAPI: funciona no Actions para cambio.

Indices salvos em data/historico/:
  Renda Fixa:  CDI (4391), IPCA (433), IMAB (via IMAB11), IMAB5 (via IB5M11),
               IMAS (via TEQS11), IRFM (via IRFM11), IMA (via IMA-B proxy)
  Acoes BR:    IBOV (^BVSP), SMLL (via SMAL11), IDIV (via DIVO11), IBXL, IBRA
  FIIs:        IFIX (via XFIX11 ou proxy de FIIs)
  Exterior:    SPXBRL (^GSPC x USDBRL), USDBRL (BRL=X), EURBRL (EURBRL=X)
  Commodities: OURO (GC=F x USDBRL)
  Cripto:      BTCBRL (CoinGecko)
"""
import json, datetime, os, sys, time, requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_utils import merge_historico

YAHOO_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    "Accept": "application/json",
}
BCB_HEADERS = {
    "Accept": "application/json",
    "Accept-Language": "pt-BR,pt;q=0.9",
    "User-Agent": "python-requests/2.31.0",
}

# Mapeamento de cada indice para sua fonte preferida
# Para indices sem ticker direto no Yahoo, usamos o ETF que replica o indice
INDICES_CONFIG = {
    # ── Renda Fixa ────────────────────────────────────────────────────────────
    # CDI e IPCA: BCB SGS funciona (series de variacao %)
    "CDI":    {"tipo": "bcb_variacao",  "cod": 4391,  "desc": "CDI acumulado mensal"},
    "IPCA":   {"tipo": "bcb_variacao",  "cod": 433,   "desc": "IPCA variacao mensal"},
    # IMA-B e similares: BCB tem geoblock -> usar ETFs B3 como proxy
    "IMAB":   {"tipo": "yahoo_sa",  "symbol": "IMAB11",  "desc": "IMA-B via ETF IMAB11"},
    "IMAB5":  {"tipo": "yahoo_sa",  "symbol": "IB5M11",  "desc": "IMA-B5 via ETF IB5M11"},
    "IMAB5P": {"tipo": "yahoo_sa",  "symbol": "IMAB11",  "desc": "IMA-B5+ proxy via IMAB11"},
    "IMAS":   {"tipo": "yahoo_sa",  "symbol": "TEQS11",  "desc": "IMA-S via ETF Selic TEQS11"},
    "IRFM":   {"tipo": "yahoo_sa",  "symbol": "IRFM11",  "desc": "IRF-M via ETF IRFM11"},
    "IMA":    {"tipo": "yahoo_sa",  "symbol": "IMAB11",  "desc": "IMA Geral proxy via IMAB11"},

    # ── Acoes BR ──────────────────────────────────────────────────────────────
    "IBOV":   {"tipo": "yahoo_raw", "symbol": "^BVSP",   "desc": "Ibovespa"},
    "SMLL":   {"tipo": "yahoo_sa",  "symbol": "SMAL11",  "desc": "Small Cap via SMAL11"},
    "IDIV":   {"tipo": "yahoo_sa",  "symbol": "DIVO11",  "desc": "Dividendos via DIVO11"},
    "IBRA":   {"tipo": "yahoo_sa",  "symbol": "BOVA11",  "desc": "IBRA proxy via BOVA11"},
    "IBXL":   {"tipo": "yahoo_sa",  "symbol": "BOVA11",  "desc": "IBrX50 proxy via BOVA11"},

    # ── FIIs ──────────────────────────────────────────────────────────────────
    # IFIX nao tem ETF 1:1 no Brasil - melhor proxy e um fundo de fundos
    "IFIX":   {"tipo": "yahoo_sa",  "symbol": "BCFF11",  "desc": "IFIX proxy via BCFF11 (fundo de fundos)"},

    # ── Cambio e Exterior ─────────────────────────────────────────────────────
    "USDBRL": {"tipo": "yahoo_raw", "symbol": "BRL=X",   "desc": "USD/BRL"},
    "EURBRL": {"tipo": "yahoo_raw", "symbol": "EURBRL=X","desc": "EUR/BRL"},
    # SPXBRL e OURO: calculados a partir de outros dois (ver logica especial)
    "SPXBRL": {"tipo": "calculado", "desc": "S&P 500 em BRL (SPX x USDBRL)"},
    "OURO":   {"tipo": "calculado", "desc": "Ouro em BRL (XAU x USDBRL)"},

    # ── Cripto ────────────────────────────────────────────────────────────────
    "BTCBRL": {"tipo": "coingecko", "id": "bitcoin",    "desc": "Bitcoin em BRL"},
}


def fetch_yahoo(symbol, anos=15):
    """Busca historico mensal via Yahoo. symbol ja deve ter sufixo correto."""
    end = int(datetime.datetime.now().timestamp())
    start = end - (anos * 365 * 24 * 3600)
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?period1={start}&period2={end}&interval=1mo"
    try:
        r = requests.get(url, headers=YAHOO_HEADERS, timeout=20)
        if r.status_code != 200:
            return []
        data = r.json()
        result = data.get("chart", {}).get("result", [])
        if not result:
            return []
        res = result[0]
        ts_list = res.get("timestamp", [])
        closes = res.get("indicators", {}).get("adjclose", [{}])[0].get("adjclose", [])
        if not closes:
            closes = res.get("indicators", {}).get("quote", [{}])[0].get("close", [])
        pts = []
        for ts, c in zip(ts_list, closes):
            if c:
                dt = datetime.datetime.fromtimestamp(ts).strftime("%Y-%m-%d")
                pts.append({"date": dt, "close": round(float(c), 2)})
        return pts
    except Exception as e:
        return []


def fetch_bcb_variacao(cod):
    """Busca serie de variacao % mensal do BCB e converte para indice base 100."""
    urls = [
        f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{cod}/dados/ultimos/1200?formato=json",
        f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{cod}/dados?formato=json",
    ]
    for url in urls:
        try:
            r = requests.get(url, headers=BCB_HEADERS, timeout=30)
            if r.status_code != 200:
                time.sleep(1)
                continue
            dados = r.json()
            pontos, indice = [], 100.0
            for d in dados:
                partes = d.get("data", "").split("/")
                if len(partes) != 3:
                    continue
                _, mes, ano = partes
                try:
                    variacao = float(d.get("valor", 0) or 0)
                except:
                    continue
                indice *= (1 + variacao / 100)
                pontos.append({"date": f"{ano}-{mes}-01", "close": round(indice, 6)})
            if pontos:
                return pontos
        except Exception:
            pass
        time.sleep(1.5)
    return []


def fetch_coingecko(coin_id):
    """Busca historico mensal de cripto em BRL via CoinGecko."""
    url = f"https://api.coingecko.com/api/v3/coins/{coin_id}/market_chart"
    params = {"vs_currency": "brl", "days": "max", "interval": "monthly"}
    for tentativa in range(3):
        try:
            r = requests.get(url, params=params, headers={"Accept": "application/json"}, timeout=30)
            if r.status_code == 429:
                wait = int(r.headers.get("Retry-After", 60))
                print(f"  CoinGecko rate limit, aguardando {wait}s...")
                time.sleep(wait)
                continue
            if r.status_code != 200:
                return []
            data = r.json()
            prices = data.get("prices", [])
            por_mes = {}
            for ts, price in prices:
                dt = datetime.datetime.fromtimestamp(ts / 1000, tz=datetime.timezone.utc)
                chave = dt.strftime("%Y-%m")
                por_mes[chave] = {"date": chave + "-01", "close": round(float(price), 2)}
            return [por_mes[k] for k in sorted(por_mes.keys())]
        except Exception as e:
            time.sleep(5)
    return []


def load_hist(nome):
    """Carrega historico existente de data/historico/NOME.json"""
    path = f"data/historico/{nome}.json"
    if not os.path.exists(path):
        return {}
    try:
        with open(path) as f:
            hist = json.load(f).get("history", [])
        return {p["date"][:7]: p["close"] for p in hist}
    except:
        return {}


def calcular_produto(nome_a, nome_b, nome_out):
    """Calcula indice_out = indice_a * indice_b / 100 (ex: SPX_USD x USDBRL)"""
    map_a = load_hist(nome_a)
    map_b = load_hist(nome_b)
    if not map_a or not map_b:
        return []
    meses = sorted(set(map_a.keys()) & set(map_b.keys()))
    pts = []
    for m in meses:
        val = round(map_a[m] * map_b[m], 2)
        pts.append({"date": m + "-01", "close": val})
    return pts


def main():
    os.makedirs("data/historico", exist_ok=True)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
    print(f"=== fetch_historico_indices.py — {now.strftime('%d/%m/%Y %H:%M')} ===\n")

    ok = 0
    # Guarda mapa dos que precisam de calculo posterior
    calcular_depois = []

    for nome, cfg in INDICES_CONFIG.items():
        tipo = cfg["tipo"]
        desc = cfg["desc"]
        path = f"data/historico/{nome}.json"
        print(f"[{nome}] {desc}...", end=" ", flush=True)

        if tipo == "calculado":
            calcular_depois.append(nome)
            print("(calculado depois)")
            continue

        pts = []

        if tipo == "bcb_variacao":
            pts = fetch_bcb_variacao(cfg["cod"])
            if pts: fonte = "BCB"

        elif tipo == "yahoo_sa":
            # Ticker B3: adiciona .SA
            pts = fetch_yahoo(cfg["symbol"] + ".SA")
            if pts: fonte = f"Yahoo ({cfg['symbol']})"

        elif tipo == "yahoo_raw":
            # Ticker sem sufixo (indices, cambio)
            pts = fetch_yahoo(cfg["symbol"])
            if pts: fonte = f"Yahoo ({cfg['symbol']})"

        elif tipo == "coingecko":
            pts = fetch_coingecko(cfg["id"])
            if pts: fonte = "CoinGecko"

        if pts:
            adicionados = merge_historico(path, nome, pts)
            print(f"{len(pts)} pts via {fonte} (+{adicionados} novos)")
            ok += 1
        else:
            print("sem dados")

        time.sleep(1.5)

    # Calculos derivados (dependem de outros indices ja salvos)
    print("\n── Indices calculados ──")

    # SPX em USD: salvar como intermediario
    print("[SPX_USD] S&P 500 em USD...", end=" ", flush=True)
    pts_spx = fetch_yahoo("^GSPC")
    if not pts_spx:
        pts_spx = fetch_yahoo("SPY")
    if pts_spx:
        merge_historico("data/historico/SPX_USD.json", "SPX_USD", pts_spx)
        print(f"{len(pts_spx)} pts via Yahoo")
    else:
        print("sem dados")
    time.sleep(1.5)

    # SPXBRL = S&P500 USD * USDBRL
    print("[SPXBRL] S&P 500 em BRL...", end=" ", flush=True)
    pts = calcular_produto("SPX_USD", "USDBRL", "SPXBRL")
    if pts:
        merge_historico("data/historico/SPXBRL.json", "SPXBRL", pts)
        print(f"{len(pts)} pts (SPX_USD x USDBRL)")
        ok += 1
    else:
        print("sem sobreposicao de datas (rode apos USDBRL estar salvo)")

    # OURO USD: salvar como intermediario
    print("[OURO_USD] Ouro em USD...", end=" ", flush=True)
    pts_ouro = fetch_yahoo("GC=F")
    if pts_ouro:
        merge_historico("data/historico/OURO_USD.json", "OURO_USD", pts_ouro)
        print(f"{len(pts_ouro)} pts via Yahoo")
    else:
        print("sem dados")
    time.sleep(1.5)

    # OURO BRL = Ouro USD * USDBRL
    print("[OURO] Ouro em BRL...", end=" ", flush=True)
    pts = calcular_produto("OURO_USD", "USDBRL", "OURO")
    if pts:
        merge_historico("data/historico/OURO.json", "OURO", pts)
        print(f"{len(pts)} pts (OURO_USD x USDBRL)")
        ok += 1
    else:
        print("sem sobreposicao de datas")

    # Resumo
    print(f"\n{'='*50}")
    print(f"Resultado: {ok}/{len(INDICES_CONFIG)} indices atualizados\n")
    for nome in INDICES_CONFIG:
        path = f"data/historico/{nome}.json"
        if os.path.exists(path):
            with open(path) as f:
                h = json.load(f)
            pts = len(h.get("history", []))
            updated = h.get("updated_at", "")
            print(f"  OK  {nome:10} {pts:4} pontos  {updated}")
        else:
            print(f"  --  {nome:10} sem arquivo")


if __name__ == "__main__":
    main()
