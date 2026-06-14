"""
fetch_stocks_us.py — Cotações diárias S&P 500 + REITs para o Mais Valor

Estratégia:
  1. Lista S&P 500 via Wikipedia (symbol, nome, setor GICS)
  2. Preços em lote via yfinance.download() — rápido, sem token
  3. Para preços faltando: Massive API com rodízio de até 5 chaves
  4. Salva em data/stocks_us.json

Massive endpoint usado:
  GET https://api.massive.com/v2/aggs/ticker/{TICKER}/prev?apiKey={KEY}

Execução estimada: 2–5 min
"""
import json, datetime, os, sys, time, requests

# ── Massive API Keys (rodízio) ────────────────────────────────────────────────
MASSIVE_KEYS = [k for k in [
    os.environ.get("MASSIVE_TOKEN_1", ""),
    os.environ.get("MASSIVE_TOKEN_2", ""),
    os.environ.get("MASSIVE_TOKEN_3", ""),
    os.environ.get("MASSIVE_TOKEN_4", ""),
    os.environ.get("MASSIVE_TOKEN_5", ""),
] if k]
_key_idx = 0

def next_key():
    global _key_idx
    if not MASSIVE_KEYS:
        return ""
    k = MASSIVE_KEYS[_key_idx % len(MASSIVE_KEYS)]
    _key_idx += 1
    return k

MASSIVE_BASE = "https://api.massive.com"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"}

# ── Mapa GICS Sector → Português ──────────────────────────────────────────────
SECTOR_MAP = {
    "Information Technology": "Tecnologia",
    "Health Care":            "Saúde",
    "Financials":             "Financeiro",
    "Consumer Discretionary": "Consumo",
    "Consumer Staples":       "Consumo Básico",
    "Communication Services": "Comunicação",
    "Industrials":            "Industrial",
    "Energy":                 "Energia",
    "Materials":              "Materiais",
    "Real Estate":            "Imóveis",
    "Utilities":              "Utilidades",
}

# ── Tickers NASDAQ no S&P 500 (heurística para campo 'bolsa') ─────────────────
NASDAQ_SET = {
    "AAPL","MSFT","NVDA","GOOGL","GOOG","META","AMZN","TSLA","AVGO","AMD",
    "QCOM","ADBE","COST","CSCO","INTC","CMCSA","NFLX","PEP","INTU","AMAT",
    "MU","ISRG","LRCX","ADI","KLAC","MRVL","PANW","SNPS","CDNS","FTNT",
    "REGN","BIIB","GILD","VRTX","IDXX","ILMN","MRNA","DXCM","WDAY","CRWD",
    "DDOG","SNOW","ORCL","NXPI","MCHP","LULU","SBUX","MDLZ","MNST","PAYX",
    "FAST","ROST","PCAR","EQIX","ODFL","VRSK","ANSS","CTSH","CDW","NTAP",
    "STX","VRSN","TSCO","DLTR","EBAY","AMGN","EXPE","FISV","PYPL","BKNG",
    "ADP","ZS","TEAM","DOCU","OKTA","VEEV","MELI","ENPH","ALGN","SWKS",
    "SPLK","ROP","CTAS","CPRT","TMUS","CHTR","EA","TTWO","ULTA","SIRI",
    "WBA","KHC","CERN","NOW","CRM","ZM","SGEN","BMRN","NTRS","MPWR",
}

# ── Fallback metadata (caso Wikipedia falhe) ──────────────────────────────────
FALLBACK_META = {
    "AAPL":  ("Apple Inc.",             "Tecnologia",    "NASDAQ"),
    "MSFT":  ("Microsoft Corp.",        "Tecnologia",    "NASDAQ"),
    "NVDA":  ("NVIDIA Corp.",           "Tecnologia",    "NASDAQ"),
    "GOOGL": ("Alphabet Inc. Cl A",     "Tecnologia",    "NASDAQ"),
    "GOOG":  ("Alphabet Inc. Cl C",     "Tecnologia",    "NASDAQ"),
    "META":  ("Meta Platforms Inc.",    "Comunicação",   "NASDAQ"),
    "AMZN":  ("Amazon.com Inc.",        "Consumo",       "NASDAQ"),
    "TSLA":  ("Tesla Inc.",             "Consumo",       "NASDAQ"),
    "AVGO":  ("Broadcom Inc.",          "Tecnologia",    "NASDAQ"),
    "BRK-B": ("Berkshire Hathaway B",   "Financeiro",    "NYSE"),
    "JPM":   ("JPMorgan Chase & Co.",   "Financeiro",    "NYSE"),
    "JNJ":   ("Johnson & Johnson",      "Saúde",         "NYSE"),
    "V":     ("Visa Inc.",              "Financeiro",    "NYSE"),
    "MA":    ("Mastercard Inc.",        "Financeiro",    "NYSE"),
    "XOM":   ("Exxon Mobil Corp.",      "Energia",       "NYSE"),
    "WMT":   ("Walmart Inc.",           "Consumo Básico","NYSE"),
    "UNH":   ("UnitedHealth Group",     "Saúde",         "NYSE"),
    "LLY":   ("Eli Lilly and Co.",      "Saúde",         "NYSE"),
    "PG":    ("Procter & Gamble Co.",   "Consumo Básico","NYSE"),
    "HD":    ("Home Depot Inc.",        "Consumo",       "NYSE"),
    "CVX":   ("Chevron Corp.",          "Energia",       "NYSE"),
    "MRK":   ("Merck & Co. Inc.",       "Saúde",         "NYSE"),
    "KO":    ("Coca-Cola Co.",          "Consumo Básico","NYSE"),
    "PEP":   ("PepsiCo Inc.",           "Consumo Básico","NASDAQ"),
    "ABBV":  ("AbbVie Inc.",            "Saúde",         "NYSE"),
    "BAC":   ("Bank of America Corp.",  "Financeiro",    "NYSE"),
    "GS":    ("Goldman Sachs Group",    "Financeiro",    "NYSE"),
    "MS":    ("Morgan Stanley",         "Financeiro",    "NYSE"),
    "WFC":   ("Wells Fargo & Co.",      "Financeiro",    "NYSE"),
    "GE":    ("GE Aerospace",           "Industrial",    "NYSE"),
    "CAT":   ("Caterpillar Inc.",       "Industrial",    "NYSE"),
    "BA":    ("Boeing Co.",             "Industrial",    "NYSE"),
    "MMM":   ("3M Co.",                 "Industrial",    "NYSE"),
    # REITs
    "PLD":   ("Prologis Inc.",          "Imóveis",       "NYSE"),
    "AMT":   ("American Tower Corp.",   "Imóveis",       "NYSE"),
    "EQIX":  ("Equinix Inc.",           "Imóveis",       "NASDAQ"),
    "WELL":  ("Welltower Inc.",         "Imóveis",       "NYSE"),
    "SPG":   ("Simon Property Group",   "Imóveis",       "NYSE"),
    "DLR":   ("Digital Realty Trust",   "Imóveis",       "NYSE"),
    "O":     ("Realty Income Corp.",    "Imóveis",       "NYSE"),
    "VTR":   ("Ventas Inc.",            "Imóveis",       "NYSE"),
    "ARE":   ("Alexandria Real Estate", "Imóveis",       "NYSE"),
    "EQR":   ("Equity Residential",     "Imóveis",       "NYSE"),
    "AVB":   ("AvalonBay Communities",  "Imóveis",       "NYSE"),
    "BXP":   ("Boston Properties",      "Imóveis",       "NYSE"),
    "CCI":   ("Crown Castle Inc.",      "Imóveis",       "NYSE"),
    "SBAC":  ("SBA Communications",     "Imóveis",       "NASDAQ"),
}

# ── REITs extras (fora do S&P 500 mas relevantes para a página de REITs) ──────
EXTRA_REITS = {
    "NNN":  "NNN REIT Inc.",
    "ADC":  "Agree Realty Corp.",
    "STAG": "STAG Industrial",
    "VICI": "VICI Properties",
    "GLPI": "Gaming & Leisure Properties",
    "WPC":  "W. P. Carey Inc.",
    "KIM":  "Kimco Realty Corp.",
    "REG":  "Regency Centers Corp.",
    "FRT":  "Federal Realty Investment Trust",
    "UDR":  "UDR Inc.",
    "ESS":  "Essex Property Trust",
    "MAA":  "Mid-America Apartment",
    "CPT":  "Camden Property Trust",
    "IRM":  "Iron Mountain Inc.",
}


def get_sp500_list():
    """Busca lista S&P 500 via Wikipedia. Retorna lista de dicts com t/n/setor/bolsa/tipo."""
    try:
        import pandas as pd
        url = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
        # User-Agent necessário para evitar bloqueio 403 no GitHub Actions
        df = pd.read_html(
            url,
            storage_options={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        )[0]
        companies = []
        for _, row in df.iterrows():
            raw_sym = str(row.iloc[0]).strip()
            sym = raw_sym.replace(".", "-")   # BRK.B → BRK-B (formato yfinance)
            name = str(row.iloc[1]).strip()
            gics = str(row.iloc[2]).strip()
            setor = SECTOR_MAP.get(gics, gics)
            tipo = "reit" if gics == "Real Estate" else "stock"
            bolsa = "NASDAQ" if sym in NASDAQ_SET else "NYSE"
            companies.append({"t": sym, "n": name, "setor": setor, "bolsa": bolsa, "tipo": tipo})
        print(f"  [wiki] {len(companies)} empresas S&P 500 carregadas")
        return companies
    except Exception as e:
        print(f"  [wiki] Erro: {e} — usando fallback")
        return []


def fetch_yfinance_batch(tickers_list):
    """
    Busca cotações em lote via yfinance.download().
    Retorna {ticker: {p, v}} onde p=preço, v=variação% do dia.
    """
    try:
        import yfinance as yf
        import pandas as pd
    except ImportError:
        print("  yfinance/pandas não instalado")
        return {}

    CHUNK = 200  # yfinance processa bem em chunks de 200
    out = {}

    for i in range(0, len(tickers_list), CHUNK):
        chunk = tickers_list[i:i + CHUNK]
        print(f"  [yf] chunk {i // CHUNK + 1}/{(len(tickers_list) + CHUNK - 1) // CHUNK}: "
              f"{len(chunk)} tickers...", end=" ", flush=True)
        try:
            raw = yf.download(
                tickers=chunk,
                period="5d",
                interval="1d",
                group_by="ticker",
                auto_adjust=True,
                threads=True,
                progress=False,
            )
            if raw.empty:
                print("sem dados")
                continue

            count = 0
            is_multi = isinstance(raw.columns, pd.MultiIndex)

            for t in chunk:
                try:
                    if is_multi:
                        if t not in raw.columns.get_level_values(0):
                            continue
                        closes = raw[t]["Close"].dropna()
                    else:
                        # Um único ticker retorna DataFrame direto
                        closes = raw["Close"].dropna()

                    if closes.empty:
                        continue

                    p = float(closes.iloc[-1])
                    pc = float(closes.iloc[-2]) if len(closes) >= 2 else p
                    v = round(((p - pc) / pc) * 100, 2) if pc else 0.0
                    out[t] = {"p": round(p, 2), "v": v}
                    count += 1
                except Exception:
                    pass

            print(f"{count}/{len(chunk)} OK")
        except Exception as e:
            print(f"erro: {e}")

        time.sleep(2)  # pausa entre chunks para não sobrecarregar

    return out


def fetch_massive_prev(ticker, key):
    """Busca cotação do dia anterior via Massive API /prev."""
    if not key:
        return None
    url = f"{MASSIVE_BASE}/v2/aggs/ticker/{ticker}/prev?apiKey={key}"
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        if r.status_code == 429:
            print(f" [rate limit, aguardando 15s]", end="")
            time.sleep(15)
            return None
        if r.status_code != 200:
            return None
        results = r.json().get("results", [])
        if not results:
            return None
        res = results[0]
        c = res.get("c") or res.get("close", 0)
        o = res.get("o") or res.get("open", 0)
        if not c:
            return None
        v = round(((c - o) / o) * 100, 2) if o else 0.0
        return {"p": round(float(c), 2), "v": v}
    except Exception as e:
        return None


def main():
    os.makedirs("data", exist_ok=True)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
    now_str = now.strftime("%d/%m/%Y %H:%M")
    print(f"=== fetch_stocks_us.py — {now_str} ===")
    print(f"Chaves Massive disponíveis: {len(MASSIVE_KEYS)}\n")

    # 1. Obter lista de empresas
    companies = get_sp500_list()

    if not companies:
        # Fallback com metadados estáticos
        companies = [
            {"t": t, "n": m[0], "setor": m[1], "bolsa": m[2],
             "tipo": "reit" if m[1] == "Imóveis" else "stock"}
            for t, m in FALLBACK_META.items()
        ]
        print(f"  Fallback: {len(companies)} empresas")

    # Adicionar REITs extras (que não estão no S&P 500)
    existing = {c["t"] for c in companies}
    for t, name in EXTRA_REITS.items():
        if t not in existing:
            m = FALLBACK_META.get(t, (name, "Imóveis", "NYSE"))
            companies.append({"t": t, "n": m[0], "setor": "Imóveis",
                               "bolsa": m[2] if len(m) > 2 else "NYSE",
                               "tipo": "reit"})

    tickers = [c["t"] for c in companies]
    print(f"\nTotal de ativos: {len(tickers)} ({len([c for c in companies if c['tipo']=='stock'])} stocks + "
          f"{len([c for c in companies if c['tipo']=='reit'])} REITs)\n")

    # 2. Preços em lote via yfinance
    prices = fetch_yfinance_batch(tickers)

    # 3. Massive para os que ainda faltam
    missing = [t for t in tickers if t not in prices]
    if missing:
        print(f"\n  {len(missing)} tickers sem preço via yfinance")
        if MASSIVE_KEYS:
            print(f"  Tentando Massive para {len(missing)} tickers...")
            # Rate limit: 5 req/min por chave × N chaves
            interval = max(0.1, 60 / (5 * len(MASSIVE_KEYS)))
            for t in missing:
                key = next_key()
                r = fetch_massive_prev(t, key)
                if r:
                    prices[t] = r
                    print(f"    [massive] {t}: US${r['p']} ({r['v']:+.2f}%)")
                time.sleep(interval)
        else:
            print("  Sem chaves Massive configuradas — preços faltando ficam zerados")

    # 4. Montar JSON final
    stocks_out = []
    sem_preco = 0
    for c in companies:
        pr = prices.get(c["t"], {})
        p = pr.get("p", 0) or 0
        v = pr.get("v", 0.0) or 0.0
        if p == 0:
            sem_preco += 1

        stocks_out.append({
            "t":      c["t"],
            "n":      c["n"],
            "p":      p,
            "v":      v,
            "mktcap": None,  # Preenchido futuramente ou via dados fundamentalistas
            "dy":     None,
            "pl":     None,
            "v12":    None,
            "setor":  c["setor"],
            "bolsa":  c["bolsa"],
            "tipo":   c["tipo"],
        })

    stocks_out.sort(key=lambda x: x["t"])

    output = {
        "updated_at":  now_str,
        "total":       len(stocks_out),
        "com_preco":   len(stocks_out) - sem_preco,
        "sem_preco":   sem_preco,
        "stocks":      stocks_out,
    }

    with open("data/stocks_us.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False)

    print(f"\n✅ data/stocks_us.json salvo: {len(stocks_out)} ativos "
          f"({len(stocks_out) - sem_preco} com preço, {sem_preco} sem preço)")


if __name__ == "__main__":
    main()
