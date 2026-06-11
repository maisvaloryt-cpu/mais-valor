"""
fetch_utils.py — Utilitários compartilhados por todos os scripts de fetch
Inclui:
  - merge_historico(): merge incremental sem apagar dados antigos
  - fetch_yahoo_mensal(): busca histórico mensal via Yahoo Finance
  - fetch_brapi_mensal(): busca via Brapi (requer BRAPI_TOKEN)
  - fetch_statusinvest_ativo(): busca via Status Invest
  - fetch_ativo_cascata(): tenta todas as fontes em ordem até conseguir
"""
import json, datetime, os, time, requests

YAHOO_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
}
SI_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://statusinvest.com.br/",
    "x-requested-with": "XMLHttpRequest",
}
BRAPI_TOKENS = [
    os.environ.get("BRAPI_TOKEN_2", ""),
    os.environ.get("BRAPI_TOKEN_3", ""),
    os.environ.get("BRAPI_TOKEN_4", ""),
    os.environ.get("BRAPI_TOKEN_5", ""),
]
BRAPI_TOKENS = [t for t in BRAPI_TOKENS if t]
# Fallback para token 1 se nenhum dos outros estiver disponível
if not BRAPI_TOKENS:
    BRAPI_TOKENS = [os.environ.get("BRAPI_TOKEN_1", os.environ.get("BRAPI_TOKEN", ""))]
BRAPI_TOKEN = BRAPI_TOKENS[0] if BRAPI_TOKENS else ""


def merge_historico(path: str, ticker: str, novos_pts: list) -> int:
    """
    Carrega JSON existente, adiciona apenas pontos novos (por date),
    ordena e salva. Nunca apaga dados existentes.
    Retorna número de pontos adicionados.
    """
    existente = []
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            existente = data.get("history", [])
        except Exception:
            existente = []

    datas_existentes = {p["date"] for p in existente}
    novos = [p for p in novos_pts if p["date"] not in datas_existentes]

    if not novos and existente:
        return 0  # nada novo

    merged = sorted(existente + novos, key=lambda x: x["date"])
    now = datetime.datetime.now(
        datetime.timezone(datetime.timedelta(hours=-3))
    ).strftime("%d/%m/%Y %H:%M")

    os.makedirs(os.path.dirname(path) if os.path.dirname(path) else ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"ticker": ticker, "history": merged, "updated_at": now}, f)

    return len(novos)


def parse_yahoo_response(data: dict) -> list:
    """Extrai lista de {date, close} de uma resposta da API do Yahoo."""
    result = data.get("chart", {}).get("result", [])
    if not result:
        return []
    r = result[0]
    ts_list = r.get("timestamp", [])
    closes = r.get("indicators", {}).get("adjclose", [{}])[0].get("adjclose", [])
    if not closes:
        closes = r.get("indicators", {}).get("quote", [{}])[0].get("close", [])
    pts = []
    for ts, c in zip(ts_list, closes):
        if c:
            d = datetime.datetime.fromtimestamp(ts).strftime("%Y-%m-%d")
            pts.append({"date": d, "close": round(float(c), 2)})
    return pts


def fetch_yahoo_mensal(symbol: str, anos: int = 12) -> list:
    """Busca histórico mensal via Yahoo Finance. symbol ex: 'PETR4.SA'"""
    end = int(datetime.datetime.now().timestamp())
    start = end - (anos * 365 * 24 * 3600)
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?period1={start}&period2={end}&interval=1mo"
    try:
        r = requests.get(url, headers=YAHOO_HEADERS, timeout=20)
        if r.status_code != 200:
            return []
        pts = parse_yahoo_response(r.json())
        return pts if len(pts) >= 3 else []
    except Exception:
        return []


def fetch_brapi_mensal(ticker: str) -> list:
    """Busca histórico mensal via Brapi. ticker ex: 'PETR4'"""
    if not BRAPI_TOKEN:
        return []
    token_param = f"?token={BRAPI_TOKEN}"
    url = f"https://brapi.dev/api/quote/{ticker}{token_param}&range=10y&interval=1mo"
    try:
        r = requests.get(url, headers=YAHOO_HEADERS, timeout=20)
        if r.status_code != 200:
            return []
        data = r.json()
        results = data.get("results", [])
        if not results:
            return []
        hist = results[0].get("historicalDataPrice", [])
        pts = []
        for h in hist:
            ts = h.get("date")
            close = h.get("close") or h.get("adjclose")
            if ts and close:
                dt = datetime.datetime.fromtimestamp(ts).strftime("%Y-%m-%d")
                pts.append({"date": dt, "close": round(float(close), 2)})
        pts.sort(key=lambda x: x["date"])
        return pts if len(pts) >= 3 else []
    except Exception:
        return []


def fetch_statusinvest_ativo(ticker: str) -> list:
    """
    Busca histórico mensal via Status Invest API interna.
    Funciona para ações e FIIs listados na B3.
    """
    # Status Invest usa o ticker sem sufixo para ações, com 11 para FIIs
    is_fii = ticker.endswith("11")
    category = "fiis" if is_fii else "acoes"
    url = f"https://statusinvest.com.br/{category}/tickerprice?ticker={ticker}&type=0&currences[]=1"
    try:
        r = requests.get(url, headers=SI_HEADERS, timeout=20)
        if r.status_code != 200:
            return []
        data = r.json()
        # Resposta: [{"date": "dd/MM/yyyy HH:mm", "price": X}, ...]
        if not isinstance(data, list) or not data:
            return []
        # Agrega por mês — pega o último valor de cada mês
        por_mes = {}
        for p in data:
            raw_date = str(p.get("date", "")).strip()
            raw_price = p.get("price") or p.get("close") or 0
            if not raw_date or not raw_price:
                continue
            try:
                if "/" in raw_date:
                    partes = raw_date.split("/")
                    dia = partes[0].zfill(2)
                    mes = partes[1].zfill(2)
                    ano = partes[2].split(" ")[0]
                    if len(ano) == 2:
                        ano = "20" + ano
                    chave = f"{ano}-{mes}"
                    por_mes[chave] = {"date": f"{ano}-{mes}-01", "close": round(float(raw_price), 2)}
            except Exception:
                continue
        pts = [por_mes[k] for k in sorted(por_mes.keys())]
        return pts if len(pts) >= 3 else []
    except Exception:
        return []


def fetch_ativo_cascata(ticker: str, verbose: bool = True) -> tuple:
    """
    Tenta buscar histórico mensal em cascata:
      1. Brapi (se tiver token)
      2. Yahoo Finance
      3. Status Invest

    Retorna (pontos, fonte) onde fonte é 'brapi'|'yahoo'|'statusinvest'|None
    Para de buscar assim que encontra dados válidos.
    """
    # 1. Brapi
    if BRAPI_TOKEN:
        pts = fetch_brapi_mensal(ticker)
        if pts:
            if verbose: print(f"  {ticker}: {len(pts)} pts via Brapi")
            return pts, "brapi"

    # 2. Yahoo Finance
    pts = fetch_yahoo_mensal(ticker + ".SA")
    if pts:
        if verbose: print(f"  {ticker}: {len(pts)} pts via Yahoo")
        return pts, "yahoo"

    # 3. Status Invest
    pts = fetch_statusinvest_ativo(ticker)
    if pts:
        if verbose: print(f"  {ticker}: {len(pts)} pts via StatusInvest")
        return pts, "statusinvest"

    if verbose: print(f"  {ticker}: sem dados em nenhuma fonte")
    return [], None
