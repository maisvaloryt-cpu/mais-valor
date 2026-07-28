"""
fetch_dividendos_bdr_etf_stock_reit.py — Histórico de dividendos pra BDRs,
ETFs, Stocks (ações EUA) e REITs (merge incremental, mesmo formato usado
pelas ações/FIIs em data/dividendos/{TICKER}.json).

Por que um script separado do fetch_dividendos_historico.py:
  - Esse script original só pega tickers de data/fundamentus.json (ações BR)
    e data/fiis_fundamentus.json (FIIs BR) — nunca incluía BDR/ETF/Stock/REIT,
    então a página do ativo desses tipos sempre caía em "sem dados" na aba
    Dividendos.
  - BDRs e ETFs são negociados na B3 (mesmas fontes de ação: Fundamentus,
    Brapi, StatusInvest, Yahoo com sufixo .SA) — cascata igual ação.
  - Stocks e REITs são tickers americanos negociados direto na NYSE/NASDAQ
    (AAPL, ADC etc.) — não existem no Fundamentus/StatusInvest (são sites
    só de ativos B3), e no Yahoo/Brapi usam o ticker SEM sufixo .SA.
    Os valores desses dividendos vêm em DÓLAR (sem conversão pra real por
    enquanto — ver decisão registrada em 2026-07-28).

Salva em data/dividendos/{TICKER}.json — mesmo arquivo que ativo.html já lê
pra qualquer tipo de ativo (loadDivData() não filtra por tipo), então essas
páginas passam a funcionar sem precisar mexer no ativo.html.

Uso:
  python fetch_dividendos_bdr_etf_stock_reit.py
"""
import json, datetime, os, sys, time, requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "pt-BR,pt;q=0.9",
}

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


def _norm_date(s):
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


def get_tickers():
    """Junta os tickers dos 4 tipos que ainda não tinham dividendos:
    BDR e ETF (data/bdrs.json, data/etfs.json — tickers B3) e Stock/REIT
    (data/stocks_us.json — tickers EUA, os dois tipos juntos no mesmo arquivo,
    diferenciados pelo campo 'tipo')."""
    tickers_b3 = []  # BDR + ETF -> cascata Fundamentus/Brapi/StatusInvest/Yahoo(.SA)
    tickers_us = []  # Stock + REIT -> só Yahoo, sem sufixo .SA, valor em US$

    try:
        with open("data/bdrs.json") as f:
            d = json.load(f)
        tickers_b3.extend([b["t"] for b in d.get("bdrs", []) if b.get("t")])
    except Exception:
        pass

    try:
        with open("data/etfs.json") as f:
            d = json.load(f)
        tickers_b3.extend([e["t"] for e in d.get("etfs", []) if e.get("t")])
    except Exception:
        pass

    try:
        with open("data/stocks_us.json") as f:
            d = json.load(f)
        tickers_us.extend([s["t"] for s in d.get("stocks", []) if s.get("t")])
    except Exception:
        pass

    return list(dict.fromkeys(tickers_b3)), list(dict.fromkeys(tickers_us))


# ── Fontes B3 (BDR/ETF) — mesma cascata usada pras ações ──────────────────────
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


def fetch_statusinvest_b3(ticker, is_etf):
    # StatusInvest só tem seção própria pra "acao" e "fii" — ETF não tem
    # endpoint dedicado conhecido, então só tentamos pra BDR (como "acao").
    if is_etf:
        return []
    url = f"https://statusinvest.com.br/acao/companytickerprovents?ticker={ticker}&chartProventsType=2"
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


def fetch_yahoo_dividends(symbol):
    """symbol já deve vir com sufixo se precisar (ex: 'AAPL34.SA' ou 'AAPL')."""
    end = int(datetime.datetime.now().timestamp())
    start = end - (10 * 365 * 24 * 3600)
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?period1={start}&period2={end}&interval=1d&events=dividends"
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


def get_dividendos_b3(ticker, is_etf):
    """BDR/ETF: cascata Brapi -> StatusInvest (só BDR) -> Yahoo(.SA)."""
    for nome, fn in (
        ("Brapi", lambda t: fetch_brapi(t)),
        ("StatusInvest", lambda t: fetch_statusinvest_b3(t, is_etf)),
        ("Yahoo", lambda t: fetch_yahoo_dividends(t + ".SA")),
    ):
        try:
            divs = fn(ticker)
        except Exception:
            divs = []
        if divs:
            return divs, nome
    return [], "-"


def get_dividendos_us(ticker):
    """Stock/REIT: só Yahoo, ticker sem sufixo — valor em dólar."""
    try:
        divs = fetch_yahoo_dividends(ticker)
    except Exception:
        divs = []
    return (divs, "Yahoo") if divs else ([], "-")


# ── Merge incremental (idêntico ao fetch_dividendos_historico.py) ─────────────
def _normalize(d):
    if "pag" in d or "com" in d:
        return {"com": d.get("com", ""), "pag": d.get("pag", "") or d.get("date", ""),
                "value": d.get("value"), "tipo": d.get("tipo", "")}
    return {"com": "", "pag": d.get("date", ""), "value": d.get("value"), "tipo": ""}


def _key(d):
    return f"{d.get('com','')}|{d.get('pag','')}|{d.get('value','')}"


def _dedup_data_igual(lista):
    out = []
    for d in sorted(lista, key=lambda x: (x.get("pag") or "", float(x.get("value") or 0))):
        try:
            v = float(d.get("value") or 0)
        except Exception:
            v = 0.0
        ant = out[-1] if out else None
        if ant is not None and ant.get("pag") == d.get("pag"):
            va = float(ant.get("value") or 0)
            if va > 0 and abs(v - va) <= max(0.001, va * 0.005):
                if d.get("com") and not ant.get("com"):
                    out[-1] = d
                continue
        out.append(d)
    return out


def merge_dividendos(path, ticker, novos, moeda=None):
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
    merged = _dedup_data_igual(sorted(existente + adicionados, key=lambda x: (x.get("pag") or x.get("com") or "")))
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3))).strftime("%d/%m/%Y %H:%M")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    payload = {"ticker": ticker, "dividendos": merged, "updated_at": now}
    if moeda:
        payload["moeda"] = moeda  # marca USD nos arquivos de stock/reit, pra UI poder avisar se quiser
    with open(path, "w") as f:
        json.dump(payload, f)
    return len(adicionados)


def main():
    os.makedirs("data/dividendos", exist_ok=True)
    tickers_b3, tickers_us = get_tickers()
    print(f"BDR+ETF (B3): {len(tickers_b3)} tickers")
    print(f"Stock+REIT (EUA): {len(tickers_us)} tickers")
    print(f"Brapi tokens disponiveis: {len(BRAPI_TOKENS)}\n")

    ok = novos_total = 0
    por_fonte = {}

    # BDR/ETF — carrega o set de ETFs pra saber qual ticker é ETF (não tem
    # endpoint dedicado no StatusInvest, então pula essa fonte pra eles)
    etf_set = set()
    try:
        with open("data/etfs.json") as f:
            etf_set = {e["t"] for e in json.load(f).get("etfs", [])}
    except Exception:
        pass

    for i, ticker in enumerate(tickers_b3):
        path = f"data/dividendos/{ticker}.json"
        print(f"[B3 {i+1}/{len(tickers_b3)}] {ticker}...", end=" ", flush=True)
        divs, fonte = get_dividendos_b3(ticker, ticker in etf_set)
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

    for i, ticker in enumerate(tickers_us):
        path = f"data/dividendos/{ticker}.json"
        print(f"[EUA {i+1}/{len(tickers_us)}] {ticker}...", end=" ", flush=True)
        divs, fonte = get_dividendos_us(ticker)
        por_fonte[fonte] = por_fonte.get(fonte, 0) + 1
        if not divs:
            print("sem dados")
            time.sleep(0.25)
            continue
        adicionados = merge_dividendos(path, ticker, divs, moeda="USD")
        if adicionados > 0:
            print(f"{fonte}: +{adicionados} pagamentos (US$)")
            novos_total += adicionados
        else:
            print(f"{fonte}: ja atualizado")
        ok += 1
        time.sleep(0.25)

    total = len(tickers_b3) + len(tickers_us)
    print(f"\nConcluido! {ok}/{total} ativos, {novos_total} pagamentos novos")
    print(f"Fontes usadas: {por_fonte}")


if __name__ == "__main__":
    main()
