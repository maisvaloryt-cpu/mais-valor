"""
fetch_dividendos_historico.py — Histórico de dividendos (merge incremental)

Fontes em CASCATA (primeira que retornar dados vence, por ticker):
  1. Brapi      (rodízio dos 5 tokens) — data-com + pagamento + tipo (recentes e ANUNCIADOS/futuros)
  2. StatusInvest (scraping)           — data-com + pagamento + tipo
  3. Yahoo                             — só data-ex (reserva, sem data-com)

Guarda por provento: {"com": data-com, "pag": data-pagamento, "value": valor, "tipo": tipo}
A data de pagamento futura permite mostrar pagamentos previstos. Nunca apaga dados existentes.
"""
import json, datetime, os, sys, time, requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "pt-BR,pt;q=0.9",
}

# ── Brapi tokens (rodízio) ────────────────────────────────────────────────────
BRAPI_TOKENS = [k for k in [os.environ.get(f"BRAPI_TOKEN_{i}", "") for i in range(1, 6)] if k]
if not BRAPI_TOKENS:
    BRAPI_TOKENS = [k for k in [os.environ.get("BRAPI_TOKEN", "")] if k]
_brapi_idx = 0

def next_brapi_token():
    global _brapi_idx
    if not BRAPI_TOKENS:
        return ""
    k = BRAPI_TOKENS[_brapi_idx % len(BRAPI_TOKENS)]
    _brapi_idx += 1
    return k


def get_tickers():
    tickers = []
    for fname in ["data/fundamentus.json", "data/fiis_fundamentus.json"]:
        try:
            with open(fname) as f:
                d = json.load(f)
            key = "acoes" if "acoes" in d else "fiis"
            tickers.extend(list(d[key].keys()))
        except Exception:
            pass
    return list(dict.fromkeys(tickers))


def _norm_date(s):
    """Aceita 'YYYY-MM-DD' ou 'DD/MM/YYYY' (com hora opcional) → 'YYYY-MM-DD' ou ''."""
    if not s:
        return ""
    s = str(s).strip().replace("T", " ").split(" ")[0]
    for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.datetime.strptime(s[:10], fmt).strftime("%Y-%m-%d")
        except Exception:
            pass
    return ""


def _num(v):
    try:
        return round(float(str(v).replace(",", ".")), 6)
    except Exception:
        return None


# ── Fonte 1: Brapi (data-com = lastDatePrior, pagamento = paymentDate) ────────
def fetch_brapi(ticker):
    token = next_brapi_token()
    if not token:
        return []
    url = f"https://brapi.dev/api/quote/{ticker}?token={token}&dividends=true"
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        if r.status_code != 200:
            return []
        results = r.json().get("results", [])
        if not results:
            return []
        cash = (results[0].get("dividendsData") or {}).get("cashDividends") or []
        out = []
        for c in cash:
            com = _norm_date(c.get("lastDatePrior"))
            pag = _norm_date(c.get("paymentDate"))
            val = _num(c.get("rate"))
            tipo = (c.get("label") or c.get("relatedTo") or "").strip()
            if (com or pag) and val:
                out.append({"com": com, "pag": pag or com, "value": val, "tipo": tipo})
        return out
    except Exception:
        return []


# ── Fonte 2: StatusInvest (ed = data-com, pd = pagamento) ─────────────────────
def fetch_statusinvest(ticker):
    base = "fii" if ticker.endswith("11") else "acao"
    url = f"https://statusinvest.com.br/{base}/companytickerprovents?ticker={ticker}&chartProventsType=2"
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        if r.status_code != 200:
            return []
        data = r.json()
        arr = data.get("assetEarningsModels") or data.get("earningsModels") or []
        out = []
        for e in arr:
            com = _norm_date(e.get("ed"))
            pag = _norm_date(e.get("pd") or e.get("paymentDate"))
            val = _num(e.get("v") or e.get("value"))
            tipo = str(e.get("etd") or e.get("et") or "").strip()
            if (com or pag) and val:
                out.append({"com": com, "pag": pag or com, "value": val, "tipo": tipo})
        return out
    except Exception:
        return []


# ── Fonte 3: Yahoo (só data-ex, sem data-com) — reserva ───────────────────────
def fetch_yahoo(ticker):
    symbol = ticker + ".SA"
    end = int(datetime.datetime.now().timestamp())
    start = end - (10 * 365 * 24 * 3600)
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?period1={start}&period2={end}&interval=3mo&events=dividends"
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        if r.status_code != 200:
            return []
        result = r.json().get("chart", {}).get("result", [])
        if not result:
            return []
        events = result[0].get("events", {}).get("dividends", {})
        out = []
        for ts, info in sorted(events.items()):
            dt = datetime.datetime.fromtimestamp(int(ts)).strftime("%Y-%m-%d")
            val = _num(info.get("amount", 0))
            if val:
                out.append({"com": "", "pag": dt, "value": val, "tipo": ""})
        return out
    except Exception:
        return []


def get_dividendos(ticker):
    """Cascata: tenta as fontes na ordem; a primeira com dados vence."""
    for nome, fn in (("Brapi", fetch_brapi), ("StatusInvest", fetch_statusinvest), ("Yahoo", fetch_yahoo)):
        try:
            divs = fn(ticker)
        except Exception:
            divs = []
        if divs:
            return divs, nome
    return [], "-"


def _normalize(d):
    """Converte qualquer entrada (formato antigo {date,value} ou novo) p/ o padrão."""
    if "pag" in d or "com" in d:
        return {"com": d.get("com", ""), "pag": d.get("pag", "") or d.get("date", ""),
                "value": d.get("value"), "tipo": d.get("tipo", "")}
    return {"com": "", "pag": d.get("date", ""), "value": d.get("value"), "tipo": ""}


def _key(d):
    return f"{d.get('com','')}|{d.get('pag','')}|{d.get('value','')}"


def merge_dividendos(path, ticker, novos):
    """Merge incremental (chave = com|pag|valor). Nunca apaga; normaliza o formato antigo."""
    existente = []
    if os.path.exists(path):
        try:
            with open(path) as f:
                existente = json.load(f).get("dividendos", [])
        except Exception:
            existente = []
    existente = [_normalize(d) for d in existente]
    seen = {_key(d) for d in existente}
    adicionados = [d for d in novos if _key(d) not in seen]
    merged = sorted(existente + adicionados, key=lambda x: (x.get("pag") or x.get("com") or ""))
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3))).strftime("%d/%m/%Y %H:%M")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump({"ticker": ticker, "dividendos": merged, "updated_at": now}, f)
    return len(adicionados)


def main():
    os.makedirs("data/dividendos", exist_ok=True)
    tickers = get_tickers()
    print(f"Buscando dividendos de {len(tickers)} ativos...")
    print(f"Brapi tokens disponiveis: {len(BRAPI_TOKENS)}\n")
    ok = novos_total = 0
    por_fonte = {"Brapi": 0, "StatusInvest": 0, "Yahoo": 0, "-": 0}
    for i, ticker in enumerate(tickers):
        path = f"data/dividendos/{ticker}.json"
        print(f"[{i+1}/{len(tickers)}] {ticker}...", end=" ", flush=True)
        divs, fonte = get_dividendos(ticker)
        por_fonte[fonte] = por_fonte.get(fonte, 0) + 1
        if not divs:
            print("sem dados")
            time.sleep(0.25)
            continue
        adicionados = merge_dividendos(path, ticker, divs)
        if adicionados > 0:
            print(f"{fonte}: +{adicionados} pagamentos")
            novos_total += adicionados
        else:
            print(f"{fonte}: ja atualizado")
        ok += 1
        time.sleep(0.25)
    print(f"\nConcluido! {ok}/{len(tickers)} ativos, {novos_total} pagamentos novos")
    print(f"Fontes usadas: {por_fonte}")


if __name__ == "__main__":
    main()
