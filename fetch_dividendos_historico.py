"""
fetch_dividendos_historico.py — Histórico de dividendos (merge incremental)

Fontes em CASCATA (primeira que retornar dados vence, por ticker):
  1. Brapi      (rodízio dos 5 tokens) — proventos recentes + ANUNCIADOS/futuros (data de pagamento)
  2. StatusInvest (scraping)           — proventos recentes + anunciados (data de pagamento)
  3. Yahoo                             — histórico (data-ex), reserva

Captura a DATA DE PAGAMENTO quando disponível (Brapi/StatusInvest), o que permite
mostrar pagamentos futuros previstos. Nunca apaga dados existentes.
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
    # remove duplicados preservando ordem
    return list(dict.fromkeys(tickers))


def _norm_date(s):
    """Aceita 'YYYY-MM-DD' ou 'DD/MM/YYYY' (com hora opcional) → 'YYYY-MM-DD' ou None."""
    if not s:
        return None
    s = str(s).strip()
    s = s.replace("T", " ").split(" ")[0]
    for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.datetime.strptime(s[:10], fmt).strftime("%Y-%m-%d")
        except Exception:
            pass
    return None


# ── Fonte 1: Brapi (data de pagamento, inclui anunciados) ─────────────────────
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
            dt = _norm_date(c.get("paymentDate") or c.get("lastDatePrior"))
            val = c.get("rate")
            if dt and val:
                try:
                    out.append({"date": dt, "value": round(float(val), 4)})
                except Exception:
                    pass
        return out
    except Exception:
        return []


# ── Fonte 2: StatusInvest (scraping, data de pagamento) ───────────────────────
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
            # pd = data de pagamento | ed = data-com (ex)
            dt = _norm_date(e.get("pd") or e.get("paymentDate") or e.get("ed"))
            val = e.get("v") or e.get("value")
            if dt and val:
                try:
                    out.append({"date": dt, "value": round(float(str(val).replace(",", ".")), 4)})
                except Exception:
                    pass
        return out
    except Exception:
        return []


# ── Fonte 3: Yahoo (histórico, data-ex) — reserva ─────────────────────────────
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
        divs = []
        for ts, info in sorted(events.items()):
            dt = datetime.datetime.fromtimestamp(int(ts)).strftime("%Y-%m-%d")
            val = round(info.get("amount", 0), 4)
            if val > 0:
                divs.append({"date": dt, "value": val})
        return divs
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


def merge_dividendos(path, ticker, novos):
    """Merge incremental para dividendos (chave = date). Nunca apaga."""
    existente = []
    if os.path.exists(path):
        try:
            with open(path) as f:
                existente = json.load(f).get("dividendos", [])
        except Exception:
            existente = []
    datas = {d["date"] for d in existente}
    adicionados = [d for d in novos if d["date"] not in datas]
    merged = sorted(existente + adicionados, key=lambda x: x["date"])
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
