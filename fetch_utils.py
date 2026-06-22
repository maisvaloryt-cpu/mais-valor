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
# Todas as chaves Brapi disponíveis (BRAPI_TOKEN_1..5; a "sem número" = _1).
# Usamos RODÍZIO: cada ticker consome a próxima chave, distribuindo o gasto
# entre todas em vez de queimar só uma.
_BRAPI_RAW = [
    os.environ.get("BRAPI_TOKEN_1", "") or os.environ.get("BRAPI_TOKEN", ""),
    os.environ.get("BRAPI_TOKEN_2", ""),
    os.environ.get("BRAPI_TOKEN_3", ""),
    os.environ.get("BRAPI_TOKEN_4", ""),
    os.environ.get("BRAPI_TOKEN_5", ""),
]
BRAPI_TOKENS = []
for _t in _BRAPI_RAW:
    if _t and _t not in BRAPI_TOKENS:   # remove vazios e duplicados
        BRAPI_TOKENS.append(_t)
BRAPI_TOKEN = BRAPI_TOKENS[0] if BRAPI_TOKENS else ""  # compat (1ª chave)
_brapi_idx = 0

def _next_brapi_token() -> str:
    """Retorna a próxima chave Brapi em rodízio (round-robin)."""
    global _brapi_idx
    if not BRAPI_TOKENS:
        return ""
    tok = BRAPI_TOKENS[_brapi_idx % len(BRAPI_TOKENS)]
    _brapi_idx += 1
    return tok


def merge_historico(path: str, ticker: str, novos_pts: list) -> int:
    """
    Carrega JSON existente e mescla por date. Adiciona pontos novos E atualiza
    os existentes quando o valor muda ou quando falta a base ajustada ('adj') —
    isso migra os arquivos antigos (que tinham só 'close' ajustado) para o novo
    formato {close: nominal, adj: ajustado}. Datas que a fonte não retornou são
    preservadas (nunca apaga dados antigos).
    Retorna o número de pontos adicionados ou atualizados.
    """
    existente = []
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            existente = data.get("history", [])
        except Exception:
            existente = []

    por_data = {p["date"]: p for p in existente}
    mudou = 0
    for p in novos_pts:
        if "adj" not in p:
            p["adj"] = p["close"]
        old = por_data.get(p["date"])
        if old is None:
            por_data[p["date"]] = p
            mudou += 1
        elif old.get("close") != p["close"] or "adj" not in old or old.get("adj") != p["adj"]:
            por_data[p["date"]] = p   # atualiza/migra ponto existente
            mudou += 1

    if mudou == 0 and existente:
        return 0  # nada mudou

    merged = sorted(por_data.values(), key=lambda x: x["date"])
    now = datetime.datetime.now(
        datetime.timezone(datetime.timedelta(hours=-3))
    ).strftime("%d/%m/%Y %H:%M")

    os.makedirs(os.path.dirname(path) if os.path.dirname(path) else ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"ticker": ticker, "history": merged, "updated_at": now}, f)

    return mudou


def parse_yahoo_response(data: dict) -> list:
    """Extrai lista de {date, close, adj} de uma resposta da API do Yahoo.
    close = preço SEM dividendos (nominal, ajustado só por desdobramento).
    adj   = preço COM dividendos reinvestidos (total return)."""
    result = data.get("chart", {}).get("result", [])
    if not result:
        return []
    r = result[0]
    ts_list = r.get("timestamp", [])
    nominais = r.get("indicators", {}).get("quote", [{}])[0].get("close", [])
    ajustados = r.get("indicators", {}).get("adjclose", [{}])[0].get("adjclose", [])
    pts = []
    for i, ts in enumerate(ts_list):
        nom = nominais[i] if i < len(nominais) else None
        aj = ajustados[i] if i < len(ajustados) else None
        base = nom if nom else aj          # close = nominal (cai pro ajustado se faltar)
        if not base:
            continue
        d = datetime.datetime.fromtimestamp(ts).strftime("%Y-%m-%d")
        pts.append({
            "date": d,
            "close": round(float(base), 2),
            "adj": round(float(aj if aj else base), 2),
        })
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
    token = _next_brapi_token()   # rodízio entre as chaves
    if not token:
        return []
    token_param = f"?token={token}"
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
            nom = h.get("close")                                    # nominal (sem dividendos)
            aj = h.get("adjustedClose") or h.get("adjclose") or nom  # com dividendos
            base = nom or aj
            if ts and base:
                dt = datetime.datetime.fromtimestamp(ts).strftime("%Y-%m-%d")
                pts.append({"date": dt, "close": round(float(base), 2), "adj": round(float(aj or base), 2)})
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
                    # Status Invest só fornece o preço nominal — sem base ajustada.
                    val = round(float(raw_price), 2)
                    por_mes[chave] = {"date": f"{ano}-{mes}-01", "close": val, "adj": val}
            except Exception:
                continue
        pts = [por_mes[k] for k in sorted(por_mes.keys())]
        return pts if len(pts) >= 3 else []
    except Exception:
        return []


def fetch_ativo_complementar(ticker: str, verbose: bool = True) -> tuple:
    """
    Busca histórico mensal em TODAS as fontes e mergeia (complementar, não cascata):
      1. Brapi (se tiver token)
      2. Yahoo Finance
      3. Status Invest

    Retorna (pontos_merged, fontes_str) — nunca para no primeiro sucesso.
    Pontos duplicados por date são deduplicados automaticamente.
    """
    all_pts = []
    fontes = []

    # 1. Brapi
    if BRAPI_TOKEN:
        pts = fetch_brapi_mensal(ticker)
        if pts:
            all_pts.extend(pts)
            fontes.append(f"Brapi:{len(pts)}")

    # 2. Yahoo Finance
    pts = fetch_yahoo_mensal(ticker + ".SA")
    if pts:
        all_pts.extend(pts)
        fontes.append(f"Yahoo:{len(pts)}")

    # 3. Status Invest
    pts = fetch_statusinvest_ativo(ticker)
    if pts:
        all_pts.extend(pts)
        fontes.append(f"SI:{len(pts)}")

    if not all_pts:
        if verbose: print(f"  {ticker}: sem dados em nenhuma fonte")
        return [], None

    # Deduplica por date. Quando há mais de uma fonte para a mesma data, prefere
    # a que tem base AJUSTADA real (adj != close) — ex.: Yahoo/Brapi vencem o
    # Status Invest, que só traz o preço nominal.
    def _tem_adj(p):
        return abs(p.get("adj", p["close"]) - p["close"]) > 0.001
    por_data = {}
    for p in all_pts:
        prev = por_data.get(p["date"])
        if prev is None or (_tem_adj(p) and not _tem_adj(prev)):
            por_data[p["date"]] = p
        elif _tem_adj(p) == _tem_adj(prev):
            por_data[p["date"]] = p  # empate: mantém o último (comportamento anterior)
    merged = sorted(por_data.values(), key=lambda x: x["date"])

    fonte_str = "+".join(fontes)
    if verbose: print(f"  {ticker}: {len(merged)} pts ({fonte_str})")
    return merged, fonte_str


def fetch_ativo_cascata(ticker: str, verbose: bool = True) -> tuple:
    """
    Alias de fetch_ativo_complementar — mantido para compatibilidade.
    Agora busca TODAS as fontes e mergeia em vez de parar no primeiro sucesso.
    """
    return fetch_ativo_complementar(ticker, verbose)
