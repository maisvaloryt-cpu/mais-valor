"""
fetch_etfs.py — Cotações diárias de ETFs (BR + EUA) para o Mais Valor

Estratégia complementar (NÃO cascata — busca TODAS as fontes):
  ETFs BR  (BOVA11, IVVB11...): Brapi + Yahoo (.SA) — ambos sempre
  ETFs EUA (SPY, QQQ...):       Yahoo + Massive fallback

Salva em data/etfs.json
"""
import json, datetime, os, sys, time, requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_utils import fetch_yahoo_mensal, merge_historico

# ── Massive API Keys (rodízio) ────────────────────────────────────────────────
MASSIVE_TOKENS = [k for k in [
    os.environ.get("MASSIVE_TOKEN_1", ""),
    os.environ.get("MASSIVE_TOKEN_2", ""),
    os.environ.get("MASSIVE_TOKEN_3", ""),
    os.environ.get("MASSIVE_TOKEN_4", ""),
    os.environ.get("MASSIVE_TOKEN_5", ""),
] if k]
_key_idx = 0

def next_massive_key():
    global _key_idx
    if not MASSIVE_TOKENS:
        return ""
    k = MASSIVE_TOKENS[_key_idx % len(MASSIVE_TOKENS)]
    _key_idx += 1
    return k

# ── Brapi tokens (rodízio) ────────────────────────────────────────────────────
BRAPI_TOKENS = [k for k in [
    os.environ.get("BRAPI_TOKEN_1", ""),
    os.environ.get("BRAPI_TOKEN_2", ""),
    os.environ.get("BRAPI_TOKEN_3", ""),
    os.environ.get("BRAPI_TOKEN_4", ""),
    os.environ.get("BRAPI_TOKEN_5", ""),
] if k]
_brapi_idx = 0

def next_brapi_token():
    global _brapi_idx
    if not BRAPI_TOKENS:
        return ""
    k = BRAPI_TOKENS[_brapi_idx % len(BRAPI_TOKENS)]
    _brapi_idx += 1
    return k

MASSIVE_BASE = "https://api.massive.com"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"}

# ── Lista de ETFs ─────────────────────────────────────────────────────────────
# mercado: 'BR' ou 'EUA' | tipo: categoria do ETF | ter: taxa de adm (%)
ETF_LIST = [
    # ── Brasil B3 — Ações BR ─────────────────────────────────────────────────
    {"t":"BOVA11","n":"iShares Ibovespa",           "ter":0.10,"tipo":"Ações BR",          "mercado":"BR"},
    {"t":"BOVV11","n":"It Now Ibovespa",             "ter":0.10,"tipo":"Ações BR",          "mercado":"BR"},
    {"t":"PIBB11","n":"iShares IBrX-50",             "ter":0.10,"tipo":"Ações BR",          "mercado":"BR"},
    {"t":"BRAX11","n":"It Now IBrX-100",             "ter":0.30,"tipo":"Ações BR",          "mercado":"BR"},
    {"t":"SMAL11","n":"iShares Small Cap",           "ter":0.50,"tipo":"Ações BR",          "mercado":"BR"},
    {"t":"DIVO11","n":"It Now IDIV",                 "ter":0.30,"tipo":"Ações BR",          "mercado":"BR"},
    {"t":"MATB11","n":"It Now IMAT",                 "ter":0.30,"tipo":"Ações BR",          "mercado":"BR"},
    {"t":"FIND11","n":"It Now IFNC",                 "ter":0.30,"tipo":"Ações BR",          "mercado":"BR"},
    {"t":"ISUS11","n":"It Now ISE",                  "ter":0.30,"tipo":"Ações BR",          "mercado":"BR"},
    {"t":"ECOO11","n":"It Now ICO2",                 "ter":0.30,"tipo":"Ações BR",          "mercado":"BR"},
    {"t":"GOVE11","n":"It Now IGOV",                 "ter":0.30,"tipo":"Ações BR",          "mercado":"BR"},
    {"t":"JUST11","n":"It Now S&P ESG",              "ter":0.30,"tipo":"Ações BR",          "mercado":"BR"},
    {"t":"XFIX11","n":"XP ETF IFIX",                "ter":0.30,"tipo":"Ações BR",          "mercado":"BR"},
    {"t":"TRIG11","n":"It Now Clean Energy",         "ter":0.30,"tipo":"Ações BR",          "mercado":"BR"},
    {"t":"LIFE11","n":"Trend Qualidade",             "ter":0.49,"tipo":"Ações BR",          "mercado":"BR"},
    {"t":"KLEV11","n":"Trend ETF Elevação",          "ter":0.49,"tipo":"Ações BR",          "mercado":"BR"},
    {"t":"LOTE11","n":"Trend Loteria",               "ter":0.49,"tipo":"Ações BR",          "mercado":"BR"},
    {"t":"RURA11","n":"Trend Agropecuário",          "ter":0.49,"tipo":"Ações BR",          "mercado":"BR"},
    {"t":"DRAW11","n":"It Now Renda Var.",           "ter":0.30,"tipo":"Ações BR",          "mercado":"BR"},
    {"t":"BBVO11","n":"Xtrackers Ibovespa Swap",    "ter":0.30,"tipo":"Ações BR",          "mercado":"BR"},
    {"t":"NDEX11","n":"Trend ETF Diversificado",    "ter":0.49,"tipo":"Ações BR",          "mercado":"BR"},
    # ── Brasil B3 — Internacional ────────────────────────────────────────────
    {"t":"IVVB11","n":"iShares S&P 500 (BRL)",      "ter":0.23,"tipo":"Internacional BR",  "mercado":"BR"},
    {"t":"SPXI11","n":"iShares S&P 500 (USD)",      "ter":0.23,"tipo":"Internacional BR",  "mercado":"BR"},
    {"t":"NASD11","n":"Trend Nasdaq 100",            "ter":0.50,"tipo":"Internacional BR",  "mercado":"BR"},
    {"t":"EURP11","n":"Trend Europa",                "ter":0.50,"tipo":"Internacional BR",  "mercado":"BR"},
    {"t":"ASIA11","n":"Trend Ásia-Pacífico",         "ter":0.50,"tipo":"Internacional BR",  "mercado":"BR"},
    {"t":"XINA11","n":"Trend ETF China",             "ter":0.50,"tipo":"Internacional BR",  "mercado":"BR"},
    {"t":"WRLD11","n":"Trend Global",                "ter":0.50,"tipo":"Internacional BR",  "mercado":"BR"},
    {"t":"BBSD11","n":"Xtrackers S&P 500 Swap",     "ter":0.20,"tipo":"Internacional BR",  "mercado":"BR"},
    {"t":"SEMI11","n":"Trend Semicondutores",        "ter":0.49,"tipo":"Internacional BR",  "mercado":"BR"},
    {"t":"TECK11","n":"It Now NYSE FANG+",            "ter":0.49,"tipo":"Internacional BR",  "mercado":"BR"},
    {"t":"HCST11","n":"Trend Saúde",                 "ter":0.49,"tipo":"Internacional BR",  "mercado":"BR"},
    {"t":"RENT11","n":"Trend Real Estate",           "ter":0.49,"tipo":"Internacional BR",  "mercado":"BR"},
    {"t":"FLMA11","n":"Franklin Temp. ETF",          "ter":0.40,"tipo":"Internacional BR",  "mercado":"BR"},
    {"t":"PACB11","n":"Pacific ETF",                 "ter":0.49,"tipo":"Internacional BR",  "mercado":"BR"},
    # ── Brasil B3 — Cripto ───────────────────────────────────────────────────
    {"t":"HASH11","n":"Hashdex Cripto Index",        "ter":1.30,"tipo":"Cripto BR",         "mercado":"BR"},
    {"t":"DEFI11","n":"Hashdex DeFi",                "ter":1.30,"tipo":"Cripto BR",         "mercado":"BR"},
    {"t":"WEB311","n":"Hashdex Web3",                "ter":1.30,"tipo":"Cripto BR",         "mercado":"BR"},
    {"t":"QBTC11","n":"QR Bitcoin ETF",              "ter":0.75,"tipo":"Cripto BR",         "mercado":"BR"},
    {"t":"BITH11","n":"iShares Bitcoin ETF BR",      "ter":0.50,"tipo":"Cripto BR",         "mercado":"BR"},
    {"t":"ETHE11","n":"iShares Ethereum ETF BR",     "ter":0.50,"tipo":"Cripto BR",         "mercado":"BR"},
    # ── Brasil B3 — Renda Fixa ───────────────────────────────────────────────
    {"t":"FIXA11","n":"Trend DI Simples",            "ter":0.19,"tipo":"Renda Fixa BR",     "mercado":"BR"},
    {"t":"LFTS11","n":"Trend Selic Simples",         "ter":0.20,"tipo":"Renda Fixa BR",     "mercado":"BR"},
    {"t":"IRFM11","n":"It Now IRF-M1+",              "ter":0.25,"tipo":"Renda Fixa BR",     "mercado":"BR"},
    {"t":"IMAB11","n":"It Now IMAB",                 "ter":0.25,"tipo":"Renda Fixa BR",     "mercado":"BR"},
    {"t":"INFL11","n":"Trend Inflação",              "ter":0.25,"tipo":"Renda Fixa BR",     "mercado":"BR"},
    {"t":"USDB11","n":"Trend CDI Longo",             "ter":0.20,"tipo":"Renda Fixa BR",     "mercado":"BR"},
    {"t":"TECP11","n":"Trend ETF CRA/CRI",           "ter":0.30,"tipo":"Renda Fixa BR",     "mercado":"BR"},
    # ── Brasil B3 — Commodities ──────────────────────────────────────────────
    {"t":"GOLD11","n":"Trend Ouro",                  "ter":0.30,"tipo":"Commodities BR",    "mercado":"BR"},
    {"t":"AGRI11","n":"Trend Agrícola",              "ter":0.49,"tipo":"Commodities BR",    "mercado":"BR"},
    {"t":"NAMO11","n":"Trend Commodities",           "ter":0.49,"tipo":"Commodities BR",    "mercado":"BR"},
    {"t":"GCOT11","n":"Trend Gold Miners",           "ter":0.49,"tipo":"Commodities BR",    "mercado":"BR"},
    {"t":"URUT11","n":"Trend Urânio",                "ter":0.49,"tipo":"Commodities BR",    "mercado":"BR"},
    # ── EUA — Mercado Amplo ──────────────────────────────────────────────────
    {"t":"SPY",  "n":"SPDR S&P 500 ETF",            "ter":0.09,"tipo":"Ações EUA",         "mercado":"EUA"},
    {"t":"IVV",  "n":"iShares Core S&P 500",         "ter":0.03,"tipo":"Ações EUA",         "mercado":"EUA"},
    {"t":"VOO",  "n":"Vanguard S&P 500 ETF",         "ter":0.03,"tipo":"Ações EUA",         "mercado":"EUA"},
    {"t":"VTI",  "n":"Vanguard Total Stock Mkt",     "ter":0.03,"tipo":"Ações EUA",         "mercado":"EUA"},
    {"t":"SPLG", "n":"SPDR Portfolio S&P 500",       "ter":0.02,"tipo":"Ações EUA",         "mercado":"EUA"},
    {"t":"RSP",  "n":"Invesco S&P 500 Equal Wt",    "ter":0.20,"tipo":"Ações EUA",         "mercado":"EUA"},
    {"t":"SCHB", "n":"Schwab US Broad Mkt",          "ter":0.03,"tipo":"Ações EUA",         "mercado":"EUA"},
    {"t":"IWM",  "n":"iShares Russell 2000",         "ter":0.19,"tipo":"Ações EUA",         "mercado":"EUA"},
    {"t":"QQQ",  "n":"Invesco QQQ Trust",            "ter":0.20,"tipo":"Ações EUA",         "mercado":"EUA"},
    {"t":"QQQM", "n":"Invesco Nasdaq 100 (mini)",    "ter":0.15,"tipo":"Ações EUA",         "mercado":"EUA"},
    {"t":"IWB",  "n":"iShares Russell 1000",         "ter":0.15,"tipo":"Ações EUA",         "mercado":"EUA"},
    {"t":"IWD",  "n":"iShares Russell 1000 Value",   "ter":0.19,"tipo":"Ações EUA",         "mercado":"EUA"},
    {"t":"IWF",  "n":"iShares Russell 1000 Growth",  "ter":0.19,"tipo":"Ações EUA",         "mercado":"EUA"},
    {"t":"VB",   "n":"Vanguard Small-Cap ETF",       "ter":0.05,"tipo":"Ações EUA",         "mercado":"EUA"},
    {"t":"VO",   "n":"Vanguard Mid-Cap ETF",         "ter":0.04,"tipo":"Ações EUA",         "mercado":"EUA"},
    {"t":"VV",   "n":"Vanguard Large-Cap ETF",       "ter":0.04,"tipo":"Ações EUA",         "mercado":"EUA"},
    {"t":"VXF",  "n":"Vanguard Extended Mkt",        "ter":0.06,"tipo":"Ações EUA",         "mercado":"EUA"},
    # ── EUA — Internacional ──────────────────────────────────────────────────
    {"t":"VEA",  "n":"Vanguard Dev Markets",         "ter":0.05,"tipo":"Internacional EUA", "mercado":"EUA"},
    {"t":"VWO",  "n":"Vanguard Emerging Mkts",       "ter":0.08,"tipo":"Internacional EUA", "mercado":"EUA"},
    {"t":"IEFA", "n":"iShares Core MSCI EAFE",       "ter":0.07,"tipo":"Internacional EUA", "mercado":"EUA"},
    {"t":"EEM",  "n":"iShares MSCI Emerg Mkts",      "ter":0.70,"tipo":"Internacional EUA", "mercado":"EUA"},
    {"t":"EWJ",  "n":"iShares MSCI Japan",           "ter":0.50,"tipo":"Internacional EUA", "mercado":"EUA"},
    {"t":"EWZ",  "n":"iShares MSCI Brazil",          "ter":0.59,"tipo":"Internacional EUA", "mercado":"EUA"},
    {"t":"FXI",  "n":"iShares China Large-Cap",      "ter":0.74,"tipo":"Internacional EUA", "mercado":"EUA"},
    {"t":"KWEB", "n":"KraneShares CSI China Internet","ter":0.69,"tipo":"Internacional EUA", "mercado":"EUA"},
    {"t":"EWG",  "n":"iShares MSCI Germany",         "ter":0.50,"tipo":"Internacional EUA", "mercado":"EUA"},
    {"t":"EWU",  "n":"iShares MSCI UK",              "ter":0.50,"tipo":"Internacional EUA", "mercado":"EUA"},
    {"t":"EWC",  "n":"iShares MSCI Canada",          "ter":0.50,"tipo":"Internacional EUA", "mercado":"EUA"},
    {"t":"EWA",  "n":"iShares MSCI Australia",       "ter":0.50,"tipo":"Internacional EUA", "mercado":"EUA"},
    {"t":"EWT",  "n":"iShares MSCI Taiwan",          "ter":0.57,"tipo":"Internacional EUA", "mercado":"EUA"},
    {"t":"EWY",  "n":"iShares MSCI South Korea",     "ter":0.57,"tipo":"Internacional EUA", "mercado":"EUA"},
    {"t":"ASHR", "n":"Xtrackers Harvest CSI 300",    "ter":0.65,"tipo":"Internacional EUA", "mercado":"EUA"},
    {"t":"EWH",  "n":"iShares MSCI Hong Kong",       "ter":0.50,"tipo":"Internacional EUA", "mercado":"EUA"},
    {"t":"EWI",  "n":"iShares MSCI Italy",           "ter":0.50,"tipo":"Internacional EUA", "mercado":"EUA"},
    {"t":"EWP",  "n":"iShares MSCI Spain",           "ter":0.50,"tipo":"Internacional EUA", "mercado":"EUA"},
    {"t":"EWS",  "n":"iShares MSCI Singapore",       "ter":0.50,"tipo":"Internacional EUA", "mercado":"EUA"},
    {"t":"BNDX", "n":"Vanguard Total Intl Bond",     "ter":0.07,"tipo":"Internacional EUA", "mercado":"EUA"},
    # ── EUA — Renda Fixa ─────────────────────────────────────────────────────
    {"t":"AGG",  "n":"iShares Core US Aggregate",    "ter":0.03,"tipo":"Bonds EUA",         "mercado":"EUA"},
    {"t":"BND",  "n":"Vanguard Total Bond Mkt",      "ter":0.03,"tipo":"Bonds EUA",         "mercado":"EUA"},
    {"t":"TLT",  "n":"iShares 20+ Year Treasury",    "ter":0.15,"tipo":"Bonds EUA",         "mercado":"EUA"},
    {"t":"IEF",  "n":"iShares 7-10 Year Treasury",   "ter":0.15,"tipo":"Bonds EUA",         "mercado":"EUA"},
    {"t":"SHY",  "n":"iShares 1-3 Year Treasury",    "ter":0.15,"tipo":"Bonds EUA",         "mercado":"EUA"},
    {"t":"LQD",  "n":"iShares iBoxx IG Corp",        "ter":0.14,"tipo":"Bonds EUA",         "mercado":"EUA"},
    {"t":"HYG",  "n":"iShares iBoxx High Yield",     "ter":0.48,"tipo":"Bonds EUA",         "mercado":"EUA"},
    {"t":"MUB",  "n":"iShares National Muni",        "ter":0.07,"tipo":"Bonds EUA",         "mercado":"EUA"},
    {"t":"VCIT", "n":"Vanguard Corp Bond Mid",       "ter":0.04,"tipo":"Bonds EUA",         "mercado":"EUA"},
    {"t":"VCSH", "n":"Vanguard Short-Term Corp",     "ter":0.04,"tipo":"Bonds EUA",         "mercado":"EUA"},
    {"t":"GOVT", "n":"iShares US Treasury",          "ter":0.05,"tipo":"Bonds EUA",         "mercado":"EUA"},
    {"t":"TIP",  "n":"iShares TIPS Bond",            "ter":0.19,"tipo":"Bonds EUA",         "mercado":"EUA"},
    # ── EUA — Setoriais ──────────────────────────────────────────────────────
    {"t":"XLK",  "n":"Tech Select Sector SPDR",      "ter":0.09,"tipo":"Setorial EUA",      "mercado":"EUA"},
    {"t":"XLF",  "n":"Financial Select Sector",      "ter":0.09,"tipo":"Setorial EUA",      "mercado":"EUA"},
    {"t":"XLE",  "n":"Energy Select Sector",         "ter":0.09,"tipo":"Setorial EUA",      "mercado":"EUA"},
    {"t":"XLV",  "n":"Health Care Select Sector",    "ter":0.09,"tipo":"Setorial EUA",      "mercado":"EUA"},
    {"t":"XLY",  "n":"Consumer Disc Select Sector",  "ter":0.09,"tipo":"Setorial EUA",      "mercado":"EUA"},
    {"t":"XLP",  "n":"Consumer Staples Select",      "ter":0.09,"tipo":"Setorial EUA",      "mercado":"EUA"},
    {"t":"XLI",  "n":"Industrial Select Sector",     "ter":0.09,"tipo":"Setorial EUA",      "mercado":"EUA"},
    {"t":"XLU",  "n":"Utilities Select Sector",      "ter":0.09,"tipo":"Setorial EUA",      "mercado":"EUA"},
    {"t":"XLB",  "n":"Materials Select Sector",      "ter":0.09,"tipo":"Setorial EUA",      "mercado":"EUA"},
    {"t":"XLRE", "n":"Real Estate Select Sector",    "ter":0.09,"tipo":"Setorial EUA",      "mercado":"EUA"},
    {"t":"VNQ",  "n":"Vanguard Real Estate ETF",     "ter":0.13,"tipo":"Setorial EUA",      "mercado":"EUA"},
    {"t":"VHT",  "n":"Vanguard Health Care ETF",     "ter":0.10,"tipo":"Setorial EUA",      "mercado":"EUA"},
    {"t":"VFH",  "n":"Vanguard Financials ETF",      "ter":0.10,"tipo":"Setorial EUA",      "mercado":"EUA"},
    {"t":"VDE",  "n":"Vanguard Energy ETF",          "ter":0.10,"tipo":"Setorial EUA",      "mercado":"EUA"},
    {"t":"GDX",  "n":"VanEck Gold Miners ETF",       "ter":0.51,"tipo":"Setorial EUA",      "mercado":"EUA"},
    {"t":"GDXJ", "n":"VanEck Jr Gold Miners",        "ter":0.52,"tipo":"Setorial EUA",      "mercado":"EUA"},
    # ── EUA — Dividendos / Fator ─────────────────────────────────────────────
    {"t":"VIG",  "n":"Vanguard Dividend Apprec.",    "ter":0.06,"tipo":"Dividendos EUA",    "mercado":"EUA"},
    {"t":"VYM",  "n":"Vanguard High Dividend Yld",   "ter":0.06,"tipo":"Dividendos EUA",    "mercado":"EUA"},
    {"t":"SCHD", "n":"Schwab US Dividend Equity",    "ter":0.06,"tipo":"Dividendos EUA",    "mercado":"EUA"},
    {"t":"DVY",  "n":"iShares Select Dividend",      "ter":0.38,"tipo":"Dividendos EUA",    "mercado":"EUA"},
    {"t":"SDY",  "n":"SPDR S&P Dividend ETF",        "ter":0.35,"tipo":"Dividendos EUA",    "mercado":"EUA"},
    {"t":"HDV",  "n":"iShares Core High Dividend",   "ter":0.08,"tipo":"Dividendos EUA",    "mercado":"EUA"},
    {"t":"SPYD", "n":"SPDR Portfolio S&P 500 Hi Div","ter":0.07,"tipo":"Dividendos EUA",    "mercado":"EUA"},
    {"t":"DGRO", "n":"iShares Core Dividend Growth", "ter":0.08,"tipo":"Dividendos EUA",    "mercado":"EUA"},
    {"t":"NOBL", "n":"ProShares S&P 500 Dividend",   "ter":0.35,"tipo":"Dividendos EUA",    "mercado":"EUA"},
    {"t":"MOAT", "n":"VanEck Morningstar Wide Moat",  "ter":0.47,"tipo":"Dividendos EUA",   "mercado":"EUA"},
    {"t":"QUAL", "n":"iShares MSCI USA Quality",     "ter":0.15,"tipo":"Dividendos EUA",    "mercado":"EUA"},
    # ── EUA — Commodities ────────────────────────────────────────────────────
    {"t":"GLD",  "n":"SPDR Gold Shares",             "ter":0.40,"tipo":"Commodities EUA",   "mercado":"EUA"},
    {"t":"IAU",  "n":"iShares Gold Trust",           "ter":0.25,"tipo":"Commodities EUA",   "mercado":"EUA"},
    {"t":"SLV",  "n":"iShares Silver Trust",         "ter":0.50,"tipo":"Commodities EUA",   "mercado":"EUA"},
    {"t":"DBA",  "n":"Invesco DB Agriculture",       "ter":0.93,"tipo":"Commodities EUA",   "mercado":"EUA"},
    {"t":"DJP",  "n":"iPath Bloomberg Commodity",    "ter":0.70,"tipo":"Commodities EUA",   "mercado":"EUA"},
    {"t":"PDBC", "n":"Invesco Optimum Yield Commod","ter":0.59,"tipo":"Commodities EUA",   "mercado":"EUA"},
    # ── EUA — Temáticos ──────────────────────────────────────────────────────
    {"t":"ARKK", "n":"ARK Innovation ETF",           "ter":0.75,"tipo":"Temático EUA",      "mercado":"EUA"},
    {"t":"ARKG", "n":"ARK Genomic Revolution",       "ter":0.75,"tipo":"Temático EUA",      "mercado":"EUA"},
    {"t":"ARKF", "n":"ARK Fintech Innovation",       "ter":0.75,"tipo":"Temático EUA",      "mercado":"EUA"},
    {"t":"ARKW", "n":"ARK Next Gen Internet",        "ter":0.75,"tipo":"Temático EUA",      "mercado":"EUA"},
    {"t":"ARKQ", "n":"ARK Autonomous Tech",          "ter":0.75,"tipo":"Temático EUA",      "mercado":"EUA"},
    {"t":"BOTZ", "n":"Global X Robotics & AI",       "ter":0.68,"tipo":"Temático EUA",      "mercado":"EUA"},
    {"t":"HACK", "n":"ETFMG Prime Cyber Security",   "ter":0.60,"tipo":"Temático EUA",      "mercado":"EUA"},
    {"t":"CIBR", "n":"First Trust NASDAQ Cybersec",  "ter":0.60,"tipo":"Temático EUA",      "mercado":"EUA"},
    {"t":"LIT",  "n":"Global X Lithium & Battery",   "ter":0.75,"tipo":"Temático EUA",      "mercado":"EUA"},
    {"t":"TAN",  "n":"Invesco Solar ETF",             "ter":0.69,"tipo":"Temático EUA",      "mercado":"EUA"},
    {"t":"ICLN", "n":"iShares Global Clean Energy",  "ter":0.40,"tipo":"Temático EUA",      "mercado":"EUA"},
    {"t":"SOXL", "n":"Direxion Semicon 3x Bull",     "ter":0.87,"tipo":"Temático EUA",      "mercado":"EUA"},
    {"t":"TQQQ", "n":"ProShares UltraPro QQQ 3x",   "ter":0.88,"tipo":"Temático EUA",      "mercado":"EUA"},
    {"t":"SQQQ", "n":"ProShares UltraPro Sh QQQ",   "ter":0.90,"tipo":"Temático EUA",      "mercado":"EUA"},
]


def fetch_brapi_preco(ticker):
    """Busca preço atual via Brapi (ETFs BR)."""
    token = next_brapi_token()
    if not token:
        return None
    url = f"https://brapi.dev/api/quote/{ticker}?token={token}&range=5d&interval=1d"
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        if r.status_code != 200:
            return None
        results = r.json().get("results", [])
        if not results:
            return None
        res = results[0]
        p = res.get("regularMarketPrice") or res.get("currentPrice", 0)
        pc = res.get("regularMarketPreviousClose") or p
        if not p:
            return None
        v = round(((p - pc) / pc) * 100, 2) if pc else 0.0
        return {"p": round(float(p), 2), "v": v}
    except Exception:
        return None


def fetch_yahoo_preco(symbol):
    """Busca preço atual via Yahoo Finance."""
    end = int(datetime.datetime.now().timestamp())
    start = end - (7 * 24 * 3600)
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?period1={start}&period2={end}&interval=1d"
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        if r.status_code != 200:
            return None
        result = r.json().get("chart", {}).get("result", [])
        if not result:
            return None
        closes = result[0].get("indicators", {}).get("adjclose", [{}])[0].get("adjclose", [])
        closes = [c for c in closes if c]
        if not closes:
            return None
        p = closes[-1]
        pc = closes[-2] if len(closes) >= 2 else p
        v = round(((p - pc) / pc) * 100, 2) if pc else 0.0
        return {"p": round(float(p), 2), "v": v}
    except Exception:
        return None


def fetch_massive_preco(ticker, key):
    """Busca preço via Massive API /prev."""
    if not key:
        return None
    url = f"{MASSIVE_BASE}/v2/aggs/ticker/{ticker}/prev?apiKey={key}"
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        if r.status_code == 429:
            time.sleep(15)
            return None
        if r.status_code != 200:
            return None
        results = r.json().get("results", [])
        if not results:
            return None
        res = results[0]
        c = res.get("c") or res.get("close", 0)
        o = res.get("o") or res.get("open", c)
        if not c:
            return None
        v = round(((c - o) / o) * 100, 2) if o else 0.0
        return {"p": round(float(c), 2), "v": v}
    except Exception:
        return None


def main():
    os.makedirs("data", exist_ok=True)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
    now_str = now.strftime("%d/%m/%Y %H:%M")
    print(f"=== fetch_etfs.py — {now_str} ===")
    print(f"Brapi tokens: {len(BRAPI_TOKENS)} | Massive tokens: {len(MASSIVE_TOKENS)}\n")

    massive_interval = max(0.2, 60.0 / (5 * max(1, len(MASSIVE_TOKENS))))
    etfs_out = []
    sem_preco = 0

    for etf in ETF_LIST:
        t = etf["t"]
        mercado = etf["mercado"]
        print(f"  {t:<8}", end=" ", flush=True)

        preco = None
        fontes = []

        if mercado == "BR":
            # ── Fonte 1: Brapi ──────────────────────────────────────────────
            r = fetch_brapi_preco(t)
            if r:
                preco = r
                fontes.append(f"Brapi:{r['p']}")

            # ── Fonte 2: Yahoo (.SA) — sempre busca mesmo se Brapi OK ───────
            r2 = fetch_yahoo_preco(t + ".SA")
            if r2:
                if not preco:
                    preco = r2
                fontes.append(f"Yahoo:{r2['p']}")
            time.sleep(0.5)

        else:  # EUA
            # ── Fonte 1: Yahoo ───────────────────────────────────────────────
            r = fetch_yahoo_preco(t)
            if r:
                preco = r
                fontes.append(f"Yahoo:{r['p']}")

            # ── Fonte 2: Massive — sempre busca mesmo se Yahoo OK ────────────
            key = next_massive_key()
            r2 = fetch_massive_preco(t, key)
            if r2:
                if not preco:
                    preco = r2
                fontes.append(f"Massive:{r2['p']}")
            time.sleep(massive_interval)

        p = (preco or {}).get("p", 0)
        v = (preco or {}).get("v", 0.0)
        if not p:
            sem_preco += 1

        print(f"{'|'.join(fontes) if fontes else 'sem dados'} → R${p}" if mercado == "BR" else f"{'|'.join(fontes) if fontes else 'sem dados'} → US${p}")

        etfs_out.append({
            "t":       t,
            "n":       etf["n"],
            "p":       p,
            "v":       v,
            "ter":     etf["ter"],
            "dy":      None,
            "v12":     None,
            "aum":     None,
            "tipo":    etf["tipo"],
            "mercado": mercado,
        })

    output = {
        "updated_at": now_str,
        "total":      len(etfs_out),
        "com_preco":  len(etfs_out) - sem_preco,
        "sem_preco":  sem_preco,
        "etfs":       etfs_out,
    }

    with open("data/etfs.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False)

    print(f"\n✅ data/etfs.json salvo: {len(etfs_out)} ETFs ({len(etfs_out)-sem_preco} com preço)")


if __name__ == "__main__":
    main()
