"""
fetch_historico_etfs.py — Histórico mensal de ETFs (BR + EUA) para o Mais Valor

Estratégia complementar (busca TODAS as fontes e mergeia):
  ETFs BR  (.SA): Yahoo(.SA) + Brapi com rodízio
  ETFs EUA:       Yahoo + Massive com rodízio

Salva em data/historico/{TICKER}.json
"""
import json, datetime, os, sys, time, requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_utils import fetch_yahoo_mensal, fetch_brapi_mensal, merge_historico

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

MASSIVE_BASE = "https://api.massive.com"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"}

# ── Listas ────────────────────────────────────────────────────────────────────
ETF_BR = [
    # Ações BR
    "BOVA11","BOVV11","PIBB11","BRAX11","SMAL11","DIVO11","MATB11","FIND11",
    "ISUS11","ECOO11","GOVE11","JUST11","XFIX11","MOBI11","TRIG11","LIFE11",
    "KLEV11","LOTE11","RURA11","DRAW11","BBVO11","NDEX11",
    # Internacional BR
    "IVVB11","SPXI11","NASD11","EURP11","ASIA11","XINA11","WRLD11","BBSD11",
    "SEMI11","TECK11","HCST11","RENT11","FLMA11","PACB11",
    # Cripto BR
    "HASH11","DEFI11","WEB311","QBTC11","BITH11","ETHE11",
    # Renda Fixa BR
    "FIXA11","LFTS11","IRFM11","IMAB11","INFL11","USDB11","TECP11",
    # Commodities BR
    "GOLD11","AGRI11","NAMO11","GCOT11","URUT11",
]
ETF_EUA = [
    # Mercado Amplo
    "SPY","IVV","VOO","VTI","SPLG","RSP","SCHB","IWM","QQQ","QQQM",
    "IWB","IWD","IWF","VB","VO","VV","VXF",
    # Internacional
    "VEA","VWO","IEFA","EEM","EWJ","EWZ","FXI","KWEB","EWG","EWU",
    "EWC","EWA","EWT","EWY","ASHR","EWH","EWI","EWP","EWS","BNDX",
    # Renda Fixa
    "AGG","BND","TLT","IEF","SHY","LQD","HYG","MUB","VCIT","VCSH",
    "GOVT","TIP",
    # Setoriais
    "XLK","XLF","XLE","XLV","XLY","XLP","XLI","XLU","XLB","XLRE",
    "VNQ","VHT","VFH","VDE","GDX","GDXJ",
    # Dividendos / Fator
    "VIG","VYM","SCHD","DVY","SDY","HDV","SPYD","DGRO","NOBL","MOAT","QUAL",
    # Commodities
    "GLD","IAU","SLV","DBA","DJP","PDBC",
    # Temáticos
    "ARKK","ARKG","ARKF","ARKW","ARKQ","BOTZ","HACK","CIBR","LIT","TAN",
    "ICLN","SOXL","TQQQ","SQQQ",
]


def fetch_massive_mensal(ticker: str, key: str) -> list:
    """Histórico mensal via Massive API (2 anos)."""
    if not key:
        return []
    hoje = datetime.date.today()
    de   = (hoje.replace(year=hoje.year - 2)).strftime("%Y-%m-%d")
    ate  = hoje.strftime("%Y-%m-%d")
    url  = f"{MASSIVE_BASE}/v2/aggs/ticker/{ticker}/range/1/month/{de}/{ate}?apiKey={key}"
    try:
        r = requests.get(url, headers=HEADERS, timeout=20)
        if r.status_code == 429:
            time.sleep(15)
            return []
        if r.status_code != 200:
            return []
        results = r.json().get("results", [])
        pts = []
        for res in results:
            ts = res.get("t")
            c  = res.get("c") or res.get("close")
            if ts and c:
                d = datetime.datetime.fromtimestamp(ts / 1000).strftime("%Y-%m-%d")
                pts.append({"date": d, "close": round(float(c), 2)})
        pts.sort(key=lambda x: x["date"])
        return pts if len(pts) >= 3 else []
    except Exception:
        return []


def processar_etf_br(ticker: str, interval: float):
    """Busca histórico complementar para ETF da B3."""
    all_pts = []
    fontes  = []

    # Fonte 1: Yahoo (.SA)
    pts = fetch_yahoo_mensal(ticker + ".SA", anos=15)
    if pts:
        all_pts.extend(pts)
        fontes.append(f"Yahoo:{len(pts)}")

    # Fonte 2: Brapi — sempre, mesmo que Yahoo tenha funcionado
    pts = fetch_brapi_mensal(ticker)
    if pts:
        all_pts.extend(pts)
        fontes.append(f"Brapi:{len(pts)}")

    time.sleep(interval)

    if not all_pts:
        print(f"  {ticker:<10} SEM DADOS")
        return

    # Deduplica por date
    por_data = {p["date"]: p for p in all_pts}
    merged   = sorted(por_data.values(), key=lambda x: x["date"])

    path  = os.path.join("data", "historico", f"{ticker}.json")
    novos = merge_historico(path, ticker, merged)
    print(f"  {ticker:<10} {len(merged)} pts ({'+'.join(fontes)}) +{novos} novos")


def processar_etf_eua(ticker: str, interval: float):
    """Busca histórico complementar para ETF dos EUA."""
    all_pts = []
    fontes  = []

    # Fonte 1: Yahoo Finance (15 anos)
    pts = fetch_yahoo_mensal(ticker, anos=15)
    if pts:
        all_pts.extend(pts)
        fontes.append(f"Yahoo:{len(pts)}")

    # Fonte 2: Massive (2 anos) — sempre
    key = next_massive_key()
    pts = fetch_massive_mensal(ticker, key)
    if pts:
        all_pts.extend(pts)
        fontes.append(f"Massive:{len(pts)}")

    time.sleep(interval)

    if not all_pts:
        print(f"  {ticker:<10} SEM DADOS")
        return

    por_data = {p["date"]: p for p in all_pts}
    merged   = sorted(por_data.values(), key=lambda x: x["date"])

    path  = os.path.join("data", "historico", f"{ticker}.json")
    novos = merge_historico(path, ticker, merged)
    print(f"  {ticker:<10} {len(merged)} pts ({'+'.join(fontes)}) +{novos} novos")


def main():
    os.makedirs(os.path.join("data", "historico"), exist_ok=True)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
    print(f"=== fetch_historico_etfs.py — {now.strftime('%d/%m/%Y %H:%M')} ===")
    print(f"Massive tokens: {len(MASSIVE_TOKENS)}\n")

    massive_interval = max(0.3, 60.0 / (5 * max(1, len(MASSIVE_TOKENS))))

    print(f"── ETFs BR ({len(ETF_BR)} tickers) ────────────────────")
    for t in ETF_BR:
        processar_etf_br(t, interval=0.8)

    print(f"\n── ETFs EUA ({len(ETF_EUA)} tickers) ───────────────────")
    for t in ETF_EUA:
        processar_etf_eua(t, interval=massive_interval)

    print(f"\n✅ Histórico de ETFs concluído.")


if __name__ == "__main__":
    main()
