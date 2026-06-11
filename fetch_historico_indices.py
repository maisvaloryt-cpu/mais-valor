"""
fetch_historico_indices.py — Historico mensal de indices para o Simulador
Merge incremental: nunca apaga dados existentes, so adiciona o que falta.

ESTRATEGIA EM CASCATA por categoria:
  ETFs B3 (IMAB11, SMAL11, etc): Yahoo (.SA) → Brapi (rodizio de tokens)
  Indices raw (^BVSP, BRL=X):    Yahoo → Brapi (rodizio de tokens)
  CDI/IPCA:                       BCB → (sem alternativa, unico dado oficial)
  Cambio:                         Yahoo → AwesomeAPI
  Cripto:                         CoinGecko → Yahoo
  Calculados (SPXBRL, OURO):      derivados dos acima
"""
import json, datetime, os, sys, time, requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_utils import merge_historico

# ── Tokens Brapi (rodizio) ────────────────────────────────────────────────────
BRAPI_TOKENS = [
    t for t in [
        os.environ.get("BRAPI_TOKEN_1", ""),
        os.environ.get("BRAPI_TOKEN_2", ""),
        os.environ.get("BRAPI_TOKEN_3", ""),
        os.environ.get("BRAPI_TOKEN_4", ""),
        os.environ.get("BRAPI_TOKEN_5", ""),
        os.environ.get("BRAPI_TOKEN", ""),
    ] if t
]
seen = set()
BRAPI_TOKENS = [t for t in BRAPI_TOKENS if not (t in seen or seen.add(t))]
_token_idx = 0

def next_token():
    global _token_idx
    if not BRAPI_TOKENS:
        return ""
    t = BRAPI_TOKENS[_token_idx % len(BRAPI_TOKENS)]
    _token_idx += 1
    return t

YAHOO_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    "Accept": "application/json",
}
BCB_HEADERS = {
    "Accept": "application/json",
    "Accept-Language": "pt-BR,pt;q=0.9",
    "User-Agent": "python-requests/2.31.0",
}

# ── Config de indices com fontes em ordem de prioridade ──────────────────────
INDICES_CONFIG = {
    # Renda Fixa
    "CDI":    {"fontes": ["bcb"],        "bcb_cod": 4391,   "desc": "CDI acumulado mensal"},
    "IPCA":   {"fontes": ["bcb"],        "bcb_cod": 433,    "desc": "IPCA variacao mensal"},
    "IMAB":   {"fontes": ["yahoo_sa", "brapi_sa"], "symbol": "IMAB11", "desc": "IMA-B via IMAB11"},
    "IMAB5":  {"fontes": ["yahoo_sa", "brapi_sa"], "symbol": "IB5M11", "desc": "IMA-B5 via IB5M11"},
    "IMAB5P": {"fontes": ["yahoo_sa", "brapi_sa"], "symbol": "IMAB11", "desc": "IMA-B5+ proxy via IMAB11"},
    "IMAS":   {"fontes": ["yahoo_sa", "brapi_sa"], "symbol": "TEQS11", "desc": "IMA-S via TEQS11"},
    "IRFM":   {"fontes": ["yahoo_sa", "brapi_sa"], "symbol": "IRFM11", "desc": "IRF-M via IRFM11"},
    "IMA":    {"fontes": ["yahoo_sa", "brapi_sa"], "symbol": "IMAB11", "desc": "IMA Geral proxy via IMAB11"},
    # Acoes BR
    "IBOV":   {"fontes": ["yahoo_raw", "brapi_raw"], "symbol": "^BVSP",  "desc": "Ibovespa"},
    "SMLL":   {"fontes": ["yahoo_sa",  "brapi_sa"],  "symbol": "SMAL11", "desc": "Small Cap via SMAL11"},
    "IDIV":   {"fontes": ["yahoo_sa",  "brapi_sa"],  "symbol": "DIVO11", "desc": "Dividendos via DIVO11"},
    "IBRA":   {"fontes": ["yahoo_sa",  "brapi_sa"],  "symbol": "BOVA11", "desc": "IBRA proxy via BOVA11"},
    "IBXL":   {"fontes": ["yahoo_sa",  "brapi_sa"],  "symbol": "BOVA11", "desc": "IBrX50 proxy via BOVA11"},
    # FIIs
    "IFIX":   {"fontes": ["yahoo_sa",  "brapi_sa"],  "symbol": "XFIX11", "desc": "IFIX proxy via XFIX11"},
    # Cambio
    "USDBRL": {"fontes": ["yahoo_raw", "awesomeapi"], "symbol": "BRL=X",    "awesome_code": "USDBRL", "desc": "USD/BRL"},
    "EURBRL": {"fontes": ["yahoo_raw", "awesomeapi"], "symbol": "EURBRL=X", "awesome_code": "EURBRL", "desc": "EUR/BRL"},
    # Calculados
    "SPXBRL": {"fontes": ["calculado"], "desc": "S&P 500 em BRL (SPX x USDBRL)"},
    "OURO":   {"fontes": ["calculado"], "desc": "Ouro em BRL (XAU x USDBRL)"},
    # Cripto
    "BTCBRL": {"fontes": ["coingecko", "yahoo_raw"], "symbol": "BTC-BRL", "coingecko_id": "bitcoin", "desc": "Bitcoin em BRL"},
}

# ── Funções de fetch ──────────────────────────────────────────────────────────

def fetch_yahoo(symbol, anos=15):
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
    except:
        return []

def fetch_brapi_hist(symbol, anos=15):
    """Busca historico mensal via Brapi, alternando tokens."""
    end_dt = datetime.date.today()
    start_dt = end_dt.replace(year=end_dt.year - anos)
    for attempt in range(len(BRAPI_TOKENS) or 1):
        token = next_token()
        token_param = f"&token={token}" if token else ""
        url = f"https://brapi.dev/api/quote/{symbol}?range=5y&interval=1mo&fundamental=false{token_param}"
        try:
            r = requests.get(url, headers=YAHOO_HEADERS, timeout=20)
            if r.status_code in (400, 401, 404, 429):
                print(f"    [brapi] token {attempt+1} falhou ({r.status_code})", end=" ")
                time.sleep(0.5)
                continue
            r.raise_for_status()
            results = r.json().get("results", [])
            if not results:
                continue
            hist = results[0].get("historicalDataPrice", [])
            pts = []
            for h in hist:
                ts = h.get("date")
                c = h.get("close") or h.get("adjustedClose")
                if ts and c:
                    dt = datetime.datetime.fromtimestamp(ts).strftime("%Y-%m-%d")
                    pts.append({"date": dt, "close": round(float(c), 2)})
            if pts:
                print(f"    [brapi] token {attempt+1} OK", end=" ")
                return pts
        except Exception as e:
            print(f"    [brapi] token {attempt+1} erro: {e}", end=" ")
            time.sleep(0.5)
    return []

def fetch_bcb_variacao(cod):
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
        except:
            pass
        time.sleep(1.5)
    return []

def fetch_coingecko(coin_id):
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
        except:
            time.sleep(5)
    return []

def fetch_awesomeapi_hist(code):
    """Busca historico de cambio via AwesomeAPI (ultimos 30 dias como fallback)."""
    try:
        pair = code[:3] + "-" + code[3:]
        url = f"https://economia.awesomeapi.com.br/json/daily/{pair}/360"
        r = requests.get(url, timeout=15)
        r.raise_for_status()
        data = r.json()
        por_mes = {}
        for d in data:
            ts = int(d.get("timestamp", 0))
            val = float(d.get("bid", 0))
            if ts and val:
                dt = datetime.datetime.fromtimestamp(ts)
                chave = dt.strftime("%Y-%m")
                if chave not in por_mes:
                    por_mes[chave] = {"date": chave + "-01", "close": round(val, 4)}
        return [por_mes[k] for k in sorted(por_mes.keys())]
    except Exception as e:
        print(f"    [awesome] erro: {e}", end=" ")
        return []

def load_hist(nome):
    path = f"data/historico/{nome}.json"
    if not os.path.exists(path):
        return {}
    try:
        with open(path) as f:
            hist = json.load(f).get("history", [])
        return {p["date"][:7]: p["close"] for p in hist}
    except:
        return {}

def calcular_produto(nome_a, nome_b):
    map_a = load_hist(nome_a)
    map_b = load_hist(nome_b)
    if not map_a or not map_b:
        return []
    meses = sorted(set(map_a.keys()) & set(map_b.keys()))
    return [{"date": m + "-01", "close": round(map_a[m] * map_b[m], 2)} for m in meses]

# ── Busca com cascata ─────────────────────────────────────────────────────────

def buscar_com_cascata(nome, cfg):
    """Tenta cada fonte na ordem até conseguir dados."""
    symbol = cfg.get("symbol", "")

    for fonte in cfg["fontes"]:
        pts = []

        if fonte == "bcb":
            pts = fetch_bcb_variacao(cfg["bcb_cod"])
            if pts: return pts, "BCB"

        elif fonte == "yahoo_sa":
            pts = fetch_yahoo(symbol + ".SA")
            if pts: return pts, f"Yahoo ({symbol}.SA)"

        elif fonte == "yahoo_raw":
            pts = fetch_yahoo(symbol)
            if pts: return pts, f"Yahoo ({symbol})"

        elif fonte == "brapi_sa":
            pts = fetch_brapi_hist(symbol)
            if pts: return pts, f"Brapi ({symbol})"

        elif fonte == "brapi_raw":
            pts = fetch_brapi_hist(symbol)
            if pts: return pts, f"Brapi ({symbol})"

        elif fonte == "coingecko":
            pts = fetch_coingecko(cfg["coingecko_id"])
            if pts: return pts, "CoinGecko"

        elif fonte == "awesomeapi":
            pts = fetch_awesomeapi_hist(cfg.get("awesome_code", ""))
            if pts: return pts, "AwesomeAPI"

    return [], None

# ── main ──────────────────────────────────────────────────────────────────────

def main():
    os.makedirs("data/historico", exist_ok=True)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
    print(f"=== fetch_historico_indices.py — {now.strftime('%d/%m/%Y %H:%M')} ===")
    print(f"Tokens Brapi: {len(BRAPI_TOKENS)}\n")

    ok = 0

    for nome, cfg in INDICES_CONFIG.items():
        path = f"data/historico/{nome}.json"
        print(f"[{nome}] {cfg['desc']}...", end=" ", flush=True)

        if cfg["fontes"] == ["calculado"]:
            print("(calculado depois)")
            continue

        pts, fonte = buscar_com_cascata(nome, cfg)

        if pts:
            adicionados = merge_historico(path, nome, pts)
            print(f"{len(pts)} pts via {fonte} (+{adicionados} novos)")
            ok += 1
        else:
            print("sem dados em nenhuma fonte")

        time.sleep(1.2)

    # ── Indices calculados ────────────────────────────────────────────────────
    print("\n── Indices calculados ──")

    print("[SPX_USD] S&P 500 em USD...", end=" ", flush=True)
    pts = fetch_yahoo("^GSPC") or fetch_yahoo("SPY")
    if pts:
        merge_historico("data/historico/SPX_USD.json", "SPX_USD", pts)
        print(f"{len(pts)} pts via Yahoo")
    else:
        print("sem dados")
    time.sleep(1.2)

    print("[SPXBRL] S&P 500 em BRL...", end=" ", flush=True)
    pts = calcular_produto("SPX_USD", "USDBRL")
    if pts:
        merge_historico("data/historico/SPXBRL.json", "SPXBRL", pts)
        print(f"{len(pts)} pts (SPX_USD x USDBRL)")
        ok += 1
    else:
        print("sem sobreposicao de datas")

    print("[OURO_USD] Ouro em USD...", end=" ", flush=True)
    pts = fetch_yahoo("GC=F")
    if pts:
        merge_historico("data/historico/OURO_USD.json", "OURO_USD", pts)
        print(f"{len(pts)} pts via Yahoo")
    else:
        print("sem dados")
    time.sleep(1.2)

    print("[OURO] Ouro em BRL...", end=" ", flush=True)
    pts = calcular_produto("OURO_USD", "USDBRL")
    if pts:
        merge_historico("data/historico/OURO.json", "OURO", pts)
        print(f"{len(pts)} pts (OURO_USD x USDBRL)")
        ok += 1
    else:
        print("sem sobreposicao de datas")

    # ── Resumo ────────────────────────────────────────────────────────────────
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
