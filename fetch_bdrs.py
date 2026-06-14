"""
fetch_bdrs.py — Cotações diárias de BDRs (B3) para o Mais Valor

Estratégia complementar (NÃO cascata — busca TODAS as fontes):
  BDRs (AAPL34, MSFT34...): Brapi + Yahoo (.SA) — ambos sempre

Salva em data/bdrs.json
"""
import json, datetime, os, sys, time, requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# ── Brapi tokens (rodízio) ────────────────────────────────────────────────────
BRAPI_TOKENS = [k for k in [
    os.environ.get("BRAPI_TOKEN_1", ""),
    os.environ.get("BRAPI_TOKEN_2", ""),
    os.environ.get("BRAPI_TOKEN_3", ""),
    os.environ.get("BRAPI_TOKEN_4", ""),
    os.environ.get("BRAPI_TOKEN_5", ""),
] if k]
# Fallback: usa BRAPI_TOKEN genérico se nenhum numerado estiver disponível
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

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"}

# ── Lista de BDRs ─────────────────────────────────────────────────────────────
# setor: setor da empresa original | origem: país de origem
BDR_LIST = [
    # ── Mega-cap Tech EUA ─────────────────────────────────────────────────────────
    {"t":"AAPL34", "n":"Apple Inc.",               "setor":"Tecnologia",      "origem":"EUA"},
    {"t":"MSFT34", "n":"Microsoft Corp.",           "setor":"Tecnologia",      "origem":"EUA"},
    {"t":"AMZO34", "n":"Amazon.com Inc.",           "setor":"Consumo/Tech",    "origem":"EUA"},
    {"t":"GOGL34", "n":"Alphabet (Google)",         "setor":"Tecnologia",      "origem":"EUA"},
    {"t":"NVDC34", "n":"NVIDIA Corp.",              "setor":"Semicondutores",  "origem":"EUA"},
    {"t":"TSLA34", "n":"Tesla Inc.",                "setor":"Automotivo",      "origem":"EUA"},
    {"t":"META34", "n":"Meta Platforms Inc.",       "setor":"Tecnologia",      "origem":"EUA"},
    {"t":"INTC34", "n":"Intel Corp.",               "setor":"Semicondutores",  "origem":"EUA"},
    {"t":"CSCO34", "n":"Cisco Systems Inc.",        "setor":"Tecnologia",      "origem":"EUA"},
    {"t":"IBM34",  "n":"IBM Corp.",                 "setor":"Tecnologia",      "origem":"EUA"},
    {"t":"ORCL34", "n":"Oracle Corp.",              "setor":"Tecnologia",      "origem":"EUA"},
    {"t":"ADBE34", "n":"Adobe Inc.",                "setor":"Tecnologia",      "origem":"EUA"},
    {"t":"QCOM34", "n":"Qualcomm Inc.",             "setor":"Semicondutores",  "origem":"EUA"},
    {"t":"TXN34",  "n":"Texas Instruments",         "setor":"Semicondutores",  "origem":"EUA"},
    {"t":"AMAT34", "n":"Applied Materials Inc.",    "setor":"Semicondutores",  "origem":"EUA"},
    {"t":"MU34",   "n":"Micron Technology",         "setor":"Semicondutores",  "origem":"EUA"},
    {"t":"AMD34",  "n":"Advanced Micro Devices",    "setor":"Semicondutores",  "origem":"EUA"},
    {"t":"AVGO34", "n":"Broadcom Inc.",             "setor":"Semicondutores",  "origem":"EUA"},
    {"t":"PANW34", "n":"Palo Alto Networks",        "setor":"Cibersegurança",  "origem":"EUA"},
    {"t":"CRWD34", "n":"CrowdStrike Holdings",      "setor":"Cibersegurança",  "origem":"EUA"},
    {"t":"INTU34", "n":"Intuit Inc.",               "setor":"Tecnologia",      "origem":"EUA"},
    {"t":"SNOW34", "n":"Snowflake Inc.",            "setor":"Tecnologia",      "origem":"EUA"},
    {"t":"DDOG34", "n":"Datadog Inc.",              "setor":"Tecnologia",      "origem":"EUA"},
    {"t":"KLAC34", "n":"KLA Corp.",                 "setor":"Semicondutores",  "origem":"EUA"},
    {"t":"LRCX34", "n":"Lam Research Corp.",        "setor":"Semicondutores",  "origem":"EUA"},
    # ── Pagamentos / Fintech ─────────────────────────────────────────────────────
    {"t":"VISA34", "n":"Visa Inc.",                 "setor":"Pagamentos",      "origem":"EUA"},
    {"t":"MAST34", "n":"Mastercard Inc.",           "setor":"Pagamentos",      "origem":"EUA"},
    {"t":"PYPL34", "n":"PayPal Holdings Inc.",      "setor":"Fintech",         "origem":"EUA"},
    {"t":"AMEX34", "n":"American Express Co.",      "setor":"Pagamentos",      "origem":"EUA"},
    {"t":"COIN34", "n":"Coinbase Global Inc.",      "setor":"Cripto",          "origem":"EUA"},
    {"t":"SQ34",   "n":"Block Inc. (Square)",       "setor":"Fintech",         "origem":"EUA"},
    # ── Bancos / Financeiras EUA ─────────────────────────────────────────────────
    {"t":"JPMC34", "n":"JPMorgan Chase & Co.",      "setor":"Bancos",          "origem":"EUA"},
    {"t":"BACR34", "n":"Bank of America Corp.",     "setor":"Bancos",          "origem":"EUA"},
    {"t":"GSGI34", "n":"Goldman Sachs Group",       "setor":"Bancos",          "origem":"EUA"},
    {"t":"MSBR34", "n":"Morgan Stanley",            "setor":"Bancos",          "origem":"EUA"},
    {"t":"CITI34", "n":"Citigroup Inc.",            "setor":"Bancos",          "origem":"EUA"},
    {"t":"WFC34",  "n":"Wells Fargo & Co.",         "setor":"Bancos",          "origem":"EUA"},
    {"t":"BLK34",  "n":"BlackRock Inc.",            "setor":"Gestão de Ativos","origem":"EUA"},
    {"t":"SCHW34", "n":"Charles Schwab Corp.",      "setor":"Corretoras",      "origem":"EUA"},
    {"t":"CME34",  "n":"CME Group Inc.",            "setor":"Bolsas",          "origem":"EUA"},
    # ── Saúde / Farmacêutica ─────────────────────────────────────────────────────
    {"t":"JNJB34", "n":"Johnson & Johnson",         "setor":"Saúde",           "origem":"EUA"},
    {"t":"PFIZ34", "n":"Pfizer Inc.",               "setor":"Farmacêutica",    "origem":"EUA"},
    {"t":"MRNA34", "n":"Moderna Inc.",              "setor":"Farmacêutica",    "origem":"EUA"},
    {"t":"ABBV34", "n":"AbbVie Inc.",               "setor":"Farmacêutica",    "origem":"EUA"},
    {"t":"MRK34",  "n":"Merck & Co. Inc.",          "setor":"Farmacêutica",    "origem":"EUA"},
    {"t":"UNH34",  "n":"UnitedHealth Group",        "setor":"Saúde",           "origem":"EUA"},
    {"t":"AMGN34", "n":"Amgen Inc.",                "setor":"Biotecnologia",   "origem":"EUA"},
    {"t":"GILD34", "n":"Gilead Sciences Inc.",      "setor":"Biotecnologia",   "origem":"EUA"},
    {"t":"BMY34",  "n":"Bristol-Myers Squibb",      "setor":"Farmacêutica",    "origem":"EUA"},
    {"t":"LLY34",  "n":"Eli Lilly and Co.",         "setor":"Farmacêutica",    "origem":"EUA"},
    {"t":"ABT34",  "n":"Abbott Laboratories",       "setor":"Eq. Médicos",     "origem":"EUA"},
    {"t":"MDT34",  "n":"Medtronic plc",             "setor":"Eq. Médicos",     "origem":"EUA"},
    {"t":"BIIB34", "n":"Biogen Inc.",               "setor":"Biotecnologia",   "origem":"EUA"},
    {"t":"VRTX34", "n":"Vertex Pharmaceuticals",    "setor":"Biotecnologia",   "origem":"EUA"},
    {"t":"REGN34", "n":"Regeneron Pharmaceuticals", "setor":"Biotecnologia",   "origem":"EUA"},
    {"t":"ISRG34", "n":"Intuitive Surgical Inc.",   "setor":"Saúde",           "origem":"EUA"},
    {"t":"ZTS34",  "n":"Zoetis Inc.",               "setor":"Saúde Animal",    "origem":"EUA"},
    {"t":"TMO34",  "n":"Thermo Fisher Scientific",  "setor":"Ciências da Vida","origem":"EUA"},
    {"t":"DHR34",  "n":"Danaher Corp.",             "setor":"Ciências da Vida","origem":"EUA"},
    {"t":"ILMN34", "n":"Illumina Inc.",             "setor":"Biotecnologia",   "origem":"EUA"},
    # ── Consumo EUA ──────────────────────────────────────────────────────────────
    {"t":"MCD34",  "n":"McDonald's Corp.",          "setor":"Alimentação",     "origem":"EUA"},
    {"t":"COCA34", "n":"Coca-Cola Co.",             "setor":"Bebidas",         "origem":"EUA"},
    {"t":"NIKE34", "n":"Nike Inc.",                 "setor":"Vestuário",       "origem":"EUA"},
    {"t":"WMT34",  "n":"Walmart Inc.",              "setor":"Varejo",          "origem":"EUA"},
    {"t":"COST34", "n":"Costco Wholesale Corp.",    "setor":"Varejo",          "origem":"EUA"},
    {"t":"TGT34",  "n":"Target Corp.",              "setor":"Varejo",          "origem":"EUA"},
    {"t":"HD34",   "n":"Home Depot Inc.",           "setor":"Varejo",          "origem":"EUA"},
    {"t":"LOW34",  "n":"Lowe's Companies Inc.",     "setor":"Varejo",          "origem":"EUA"},
    {"t":"SBUX34", "n":"Starbucks Corp.",           "setor":"Alimentação",     "origem":"EUA"},
    {"t":"PEP34",  "n":"PepsiCo Inc.",              "setor":"Bebidas",         "origem":"EUA"},
    {"t":"PM34",   "n":"Philip Morris International","setor":"Tabaco",         "origem":"EUA"},
    {"t":"MDLZ34", "n":"Mondelez International",    "setor":"Alimentos",       "origem":"EUA"},
    {"t":"YUM34",  "n":"Yum! Brands Inc.",          "setor":"Alimentação",     "origem":"EUA"},
    {"t":"CMG34",  "n":"Chipotle Mexican Grill",    "setor":"Alimentação",     "origem":"EUA"},
    {"t":"KHC34",  "n":"Kraft Heinz Co.",           "setor":"Alimentos",       "origem":"EUA"},
    {"t":"COLG34", "n":"Colgate-Palmolive Co.",     "setor":"Produtos Dom.",   "origem":"EUA"},
    {"t":"PG34",   "n":"Procter & Gamble Co.",      "setor":"Produtos Dom.",   "origem":"EUA"},
    {"t":"EBAY34", "n":"eBay Inc.",                 "setor":"E-commerce",      "origem":"EUA"},
    # ── Digital / Plataformas ────────────────────────────────────────────────────
    {"t":"NFLX34", "n":"Netflix Inc.",              "setor":"Entretenimento",  "origem":"EUA"},
    {"t":"DISB34", "n":"The Walt Disney Co.",       "setor":"Entretenimento",  "origem":"EUA"},
    {"t":"ATVI34", "n":"Activision Blizzard",       "setor":"Games",           "origem":"EUA"},
    {"t":"EA34",   "n":"Electronic Arts Inc.",      "setor":"Games",           "origem":"EUA"},
    {"t":"RBLX34", "n":"Roblox Corp.",              "setor":"Games/Metaverso", "origem":"EUA"},
    {"t":"SPOT34", "n":"Spotify Technology SA",     "setor":"Streaming",       "origem":"EUA"},
    {"t":"UBER34", "n":"Uber Technologies Inc.",    "setor":"Mobilidade",      "origem":"EUA"},
    {"t":"ABNB34", "n":"Airbnb Inc.",               "setor":"Hospitalidade",   "origem":"EUA"},
    {"t":"SHOP34", "n":"Shopify Inc.",              "setor":"E-commerce",      "origem":"EUA"},
    {"t":"DOCU34", "n":"DocuSign Inc.",             "setor":"Tecnologia",      "origem":"EUA"},
    {"t":"ZM34",   "n":"Zoom Video Communications", "setor":"Tecnologia",      "origem":"EUA"},
    {"t":"ROKU34", "n":"Roku Inc.",                 "setor":"Streaming",       "origem":"EUA"},
    {"t":"DASH34", "n":"DoorDash Inc.",             "setor":"Delivery",        "origem":"EUA"},
    {"t":"LYFT34", "n":"Lyft Inc.",                 "setor":"Mobilidade",      "origem":"EUA"},
    # ── Telecom / Mídia EUA ──────────────────────────────────────────────────────
    {"t":"T34",    "n":"AT&T Inc.",                 "setor":"Telecom",         "origem":"EUA"},
    {"t":"VZ34",   "n":"Verizon Communications",    "setor":"Telecom",         "origem":"EUA"},
    {"t":"CMCS34", "n":"Comcast Corp.",             "setor":"Mídia",           "origem":"EUA"},
    # ── Industrial / Aeroespacial EUA ────────────────────────────────────────────
    {"t":"BOEI34", "n":"The Boeing Co.",            "setor":"Aeroespacial",    "origem":"EUA"},
    {"t":"CAT34",  "n":"Caterpillar Inc.",          "setor":"Maquinário",      "origem":"EUA"},
    {"t":"MMM34",  "n":"3M Company",                "setor":"Industrial",      "origem":"EUA"},
    {"t":"GE34",   "n":"General Electric Co.",      "setor":"Industrial",      "origem":"EUA"},
    {"t":"UPS34",  "n":"United Parcel Service",     "setor":"Logística",       "origem":"EUA"},
    {"t":"FDX34",  "n":"FedEx Corp.",               "setor":"Logística",       "origem":"EUA"},
    {"t":"LMT34",  "n":"Lockheed Martin Corp.",     "setor":"Defesa",          "origem":"EUA"},
    {"t":"RTX34",  "n":"RTX Corp.",                 "setor":"Defesa",          "origem":"EUA"},
    {"t":"HON34",  "n":"Honeywell International",   "setor":"Industrial",      "origem":"EUA"},
    {"t":"DE34",   "n":"Deere & Company",           "setor":"Agronegócio",     "origem":"EUA"},
    {"t":"EMR34",  "n":"Emerson Electric Co.",      "setor":"Industrial",      "origem":"EUA"},
    {"t":"NOC34",  "n":"Northrop Grumman Corp.",    "setor":"Defesa",          "origem":"EUA"},
    # ── Energia ──────────────────────────────────────────────────────────────────
    {"t":"CVX34",  "n":"Chevron Corp.",             "setor":"Petróleo & Gás",  "origem":"EUA"},
    {"t":"EXXO34", "n":"Exxon Mobil Corp.",         "setor":"Petróleo & Gás",  "origem":"EUA"},
    {"t":"TOTF34", "n":"TotalEnergies SE",          "setor":"Petróleo & Gás",  "origem":"França"},
    {"t":"SHEL34", "n":"Shell plc",                 "setor":"Petróleo & Gás",  "origem":"Reino Unido"},
    {"t":"BP34",   "n":"BP plc",                    "setor":"Petróleo & Gás",  "origem":"Reino Unido"},
    # ── Diversificados / Outros EUA ───────────────────────────────────────────────
    {"t":"BERK34", "n":"Berkshire Hathaway Inc.",   "setor":"Diversificado",   "origem":"EUA"},
    {"t":"MSCI34", "n":"MSCI Inc.",                 "setor":"Serv. Financeiros","origem":"EUA"},
    {"t":"SPGI34", "n":"S&P Global Inc.",           "setor":"Serv. Financeiros","origem":"EUA"},
    {"t":"MCO34",  "n":"Moody's Corp.",             "setor":"Serv. Financeiros","origem":"EUA"},
    {"t":"ADP34",  "n":"Automatic Data Processing", "setor":"Tecnologia",      "origem":"EUA"},
    {"t":"FISV34", "n":"Fiserv Inc.",               "setor":"Fintech",         "origem":"EUA"},
    {"t":"ROST34", "n":"Ross Stores Inc.",          "setor":"Varejo",          "origem":"EUA"},
    {"t":"TJX34",  "n":"TJX Companies Inc.",        "setor":"Varejo",          "origem":"EUA"},
    {"t":"DLTR34", "n":"Dollar Tree Inc.",          "setor":"Varejo",          "origem":"EUA"},
    {"t":"UL34",   "n":"Unilever plc",              "setor":"Produtos Dom.",   "origem":"Reino Unido"},
    {"t":"NTES34", "n":"NetEase Inc.",              "setor":"Tecnologia",      "origem":"China"},
    # ── Ásia ─────────────────────────────────────────────────────────────────────
    {"t":"SAMS34", "n":"Samsung Electronics",       "setor":"Semicondutores",  "origem":"Coreia"},
    {"t":"TOYT34", "n":"Toyota Motor Corp.",        "setor":"Automotivo",      "origem":"Japão"},
    {"t":"HOND34", "n":"Honda Motor Co.",           "setor":"Automotivo",      "origem":"Japão"},
    {"t":"TSMC34", "n":"Taiwan Semiconductor",      "setor":"Semicondutores",  "origem":"Taiwan"},
    {"t":"BABA34", "n":"Alibaba Group",             "setor":"Consumo/Tech",    "origem":"China"},
    {"t":"NIO34",  "n":"NIO Inc.",                  "setor":"Automotivo",      "origem":"China"},
    {"t":"SONY34", "n":"Sony Group Corp.",          "setor":"Eletrônicos",     "origem":"Japão"},
    # ── Europa ───────────────────────────────────────────────────────────────────
    {"t":"LVMH34", "n":"LVMH Moet Hennessy",        "setor":"Luxo",            "origem":"França"},
    {"t":"SAP34",  "n":"SAP SE",                    "setor":"Tecnologia",      "origem":"Alemanha"},
    {"t":"ASML34", "n":"ASML Holding NV",           "setor":"Semicondutores",  "origem":"Holanda"},
    {"t":"NOVN34", "n":"Novartis AG",               "setor":"Farmacêutica",    "origem":"Suíça"},
    {"t":"AZN34",  "n":"AstraZeneca plc",           "setor":"Farmacêutica",    "origem":"Reino Unido"},
    {"t":"NVO34",  "n":"Novo Nordisk A/S",          "setor":"Farmacêutica",    "origem":"Dinamarca"},
    {"t":"BMW34",  "n":"BMW AG",                    "setor":"Automotivo",      "origem":"Alemanha"},
    {"t":"VOW34",  "n":"Volkswagen AG",             "setor":"Automotivo",      "origem":"Alemanha"},
    {"t":"BAYB34", "n":"Bayer AG",                  "setor":"Farmacêutica",    "origem":"Alemanha"},
    {"t":"HSBC34", "n":"HSBC Holdings plc",         "setor":"Bancos",          "origem":"Reino Unido"},
    {"t":"GSK34",  "n":"GSK plc",                   "setor":"Farmacêutica",    "origem":"Reino Unido"},
    {"t":"UBS34",  "n":"UBS Group AG",              "setor":"Bancos",          "origem":"Suíça"},
    {"t":"AIRB34", "n":"Airbus SE",                 "setor":"Aeroespacial",    "origem":"França"},
    {"t":"BNTX34", "n":"BioNTech SE",               "setor":"Biotecnologia",   "origem":"Alemanha"},
]


def fetch_brapi_preco(ticker):
    """Busca preço atual via Brapi."""
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
        dy = res.get("dividendYield") or None
        pl = res.get("priceEarnings") or None
        return {
            "p":  round(float(p), 2),
            "v":  v,
            "dy": round(float(dy), 2) if dy else None,
            "pl": round(float(pl), 2) if pl else None,
        }
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
        return {"p": round(float(p), 2), "v": v, "dy": None, "pl": None}
    except Exception:
        return None


def main():
    os.makedirs("data", exist_ok=True)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
    now_str = now.strftime("%d/%m/%Y %H:%M")
    print(f"=== fetch_bdrs.py — {now_str} ===")
    print(f"Brapi tokens: {len(BRAPI_TOKENS)}\n")

    bdrs_out = []
    sem_preco = 0

    for bdr in BDR_LIST:
        t = bdr["t"]
        print(f"  {t:<8}", end=" ", flush=True)

        preco = None
        fontes = []

        # ── Fonte 1: Brapi ───────────────────────────────────────────────────
        r = fetch_brapi_preco(t)
        if r:
            preco = r
            fontes.append(f"Brapi:{r['p']}")

        # ── Fonte 2: Yahoo (.SA) — sempre busca mesmo se Brapi OK ────────────
        r2 = fetch_yahoo_preco(t + ".SA")
        if r2:
            if not preco:
                preco = r2
            else:
                # Enriquece com dados do Yahoo se Brapi não trouxe alguns campos
                if not preco.get("dy") and r2.get("dy"):
                    preco["dy"] = r2["dy"]
                if not preco.get("pl") and r2.get("pl"):
                    preco["pl"] = r2["pl"]
            fontes.append(f"Yahoo:{r2['p']}")

        time.sleep(0.4)

        p  = (preco or {}).get("p",  0)
        v  = (preco or {}).get("v",  0.0)
        dy = (preco or {}).get("dy", None)
        pl = (preco or {}).get("pl", None)

        if not p:
            sem_preco += 1

        print(f"{'|'.join(fontes) if fontes else 'sem dados'} → R${p}")

        bdrs_out.append({
            "t":      t,
            "n":      bdr["n"],
            "p":      p,
            "v":      v,
            "dy":     dy,
            "pl":     pl,
            "v12":    None,
            "setor":  bdr["setor"],
            "origem": bdr["origem"],
        })

    output = {
        "updated_at": now_str,
        "total":      len(bdrs_out),
        "com_preco":  len(bdrs_out) - sem_preco,
        "sem_preco":  sem_preco,
        "bdrs":       bdrs_out,
    }

    with open("data/bdrs.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False)

    print(f"\n✅ data/bdrs.json salvo: {len(bdrs_out)} BDRs ({len(bdrs_out)-sem_preco} com preço)")


if __name__ == "__main__":
    main()
