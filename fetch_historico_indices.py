"""
fetch_historico_indices.py — Historico mensal de indices para o Simulador
Merge incremental: nunca apaga dados existentes, so adiciona o que falta.

Indices salvos em data/historico/:
  Renda Fixa BR:  CDI, IPCA, IMAB, IMAB5, IMAB5P, IMAS, IMA, IRFM
  Acoes BR:       IBOV, SMLL, IDIV, IBRA, IBXL
  FIIs:           IFIX
  Exterior:       SPXBRL (S&P500 em BRL), USDBRL, EURBRL
  Commodities:    OURO (XAU em BRL)
  Cripto:         BTCBRL

Cascata por tipo:
  Indices B3/RF:  BCB SGS -> Status Invest -> Yahoo
  Cambio/Externo: Yahoo -> AwesomeAPI -> BCB
  Cripto:         CoinGecko -> Yahoo
"""
import json, datetime, os, sys, time, requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_utils import merge_historico

BCB_HEADERS = {
    "Accept": "application/json",
    "Accept-Language": "pt-BR,pt;q=0.9",
    "User-Agent": "python-requests/2.31.0",
}
YAHOO_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
}
SI_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://statusinvest.com.br/",
    "x-requested-with": "XMLHttpRequest",
}

# Series BCB SGS — todas retornam variacao % mensal, convertemos para indice base 100
BCB_SERIES = {
    "CDI":    4391,   # CDI acumulado mensal
    "IPCA":   433,    # IPCA variacao mensal
    "IMAB":   12466,  # IMA-B total
    "IMAB5":  12467,  # IMA-B 5 anos
    "IMAB5P": 12468,  # IMA-B 5+ anos
    "IMAS":   12265,  # IMA-S (pos-fixado Selic)
    "IMA":    12469,  # IMA Geral
    "IRFM":   12462,  # IRF-M (prefixados)
}


# ── BCB SGS ──────────────────────────────────────────────────────────────────
def fetch_bcb(cod, nome):
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
                print(f"  {nome}: {len(pontos)} pts via BCB")
                return pontos
        except Exception as e:
            print(f"  BCB {cod} erro: {e}")
        time.sleep(1.5)
    return []


# ── Status Invest — indices ───────────────────────────────────────────────────
def fetch_si_indice(slug, nome):
    """Busca historico de indice via Status Invest (IFIX, IBOV, etc)."""
    url = f"https://statusinvest.com.br/indices/indicestyle?slug={slug.lower()}&period=2"
    try:
        r = requests.get(url, headers=SI_HEADERS, timeout=30)
        if r.status_code != 200:
            return []
        data = r.json()
        prices = data.get("prices") or data.get("data") or (data if isinstance(data, list) else [])
        if not prices:
            return []
        por_mes = {}
        for p in prices:
            raw_date = str(p.get("date") or p.get("d") or "").strip()
            raw_price = p.get("price") or p.get("p") or p.get("close") or 0
            if not raw_date or not raw_price:
                continue
            try:
                if "/" in raw_date:
                    partes = raw_date.split("/")
                    mes = partes[1].zfill(2)
                    ano = partes[2].split(" ")[0]
                    if len(ano) == 2:
                        ano = "20" + ano
                    chave = f"{ano}-{mes}"
                    por_mes[chave] = {"date": f"{ano}-{mes}-01", "close": round(float(raw_price), 2)}
                elif "-" in raw_date:
                    partes = raw_date.split("-")
                    chave = f"{partes[0]}-{partes[1]}"
                    por_mes[chave] = {"date": f"{partes[0]}-{partes[1]}-01", "close": round(float(raw_price), 2)}
            except:
                continue
        pts = [por_mes[k] for k in sorted(por_mes.keys())]
        if pts:
            print(f"  {nome}: {len(pts)} pts via StatusInvest")
        return pts
    except Exception as e:
        print(f"  SI {slug} erro: {e}")
        return []


# ── Yahoo Finance ─────────────────────────────────────────────────────────────
def fetch_yahoo(symbol, nome, anos=15):
    end = int(datetime.datetime.now().timestamp())
    start = end - (anos * 365 * 24 * 3600)
    for sym in ([symbol] if isinstance(symbol, str) else symbol):
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}?period1={start}&period2={end}&interval=1mo"
        try:
            r = requests.get(url, headers=YAHOO_HEADERS, timeout=20)
            if r.status_code != 200:
                continue
            data = r.json()
            result = data.get("chart", {}).get("result", [])
            if not result:
                continue
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
            if pts:
                print(f"  {nome}: {len(pts)} pts via Yahoo ({sym})")
                return pts
        except Exception as e:
            print(f"  Yahoo {sym} erro: {e}")
        time.sleep(1)
    return []


# ── AwesomeAPI — cambio ───────────────────────────────────────────────────────
def fetch_awesome_cambio(pair, nome):
    """Busca historico mensal de cambio via AwesomeAPI."""
    # AwesomeAPI tem endpoint de historico diario — agrega por mes
    try:
        # Busca ultimos 1500 dias (~4 anos) — limite da API gratuita
        url = f"https://economia.awesomeapi.com.br/json/daily/{pair}/1500"
        r = requests.get(url, headers=YAHOO_HEADERS, timeout=20)
        if r.status_code != 200:
            return []
        data = r.json()
        if not isinstance(data, list):
            return []
        por_mes = {}
        for d in data:
            ts = d.get("timestamp")
            bid = d.get("bid") or d.get("ask")
            if not ts or not bid:
                continue
            dt = datetime.datetime.fromtimestamp(int(ts)).strftime("%Y-%m")
            por_mes[dt] = {"date": dt + "-01", "close": round(float(bid), 4)}
        pts = [por_mes[k] for k in sorted(por_mes.keys())]
        if pts:
            print(f"  {nome}: {len(pts)} pts via AwesomeAPI")
        return pts
    except Exception as e:
        print(f"  AwesomeAPI {pair} erro: {e}")
        return []


# ── CoinGecko — cripto ────────────────────────────────────────────────────────
def fetch_coingecko_brl(coin_id, nome):
    """Busca historico mensal de cripto em BRL via CoinGecko (gratuito)."""
    try:
        url = f"https://api.coingecko.com/api/v3/coins/{coin_id}/market_chart"
        params = {"vs_currency": "brl", "days": "max", "interval": "monthly"}
        r = requests.get(url, params=params, headers={"Accept": "application/json"}, timeout=30)
        if r.status_code == 429:
            print(f"  CoinGecko rate limit, aguardando 60s...")
            time.sleep(60)
            r = requests.get(url, params=params, headers={"Accept": "application/json"}, timeout=30)
        if r.status_code != 200:
            return []
        data = r.json()
        prices = data.get("prices", [])
        por_mes = {}
        for ts, price in prices:
            dt = datetime.datetime.fromtimestamp(ts / 1000, tz=datetime.timezone.utc)
            chave = dt.strftime("%Y-%m")
            por_mes[chave] = {"date": chave + "-01", "close": round(float(price), 2)}
        pts = [por_mes[k] for k in sorted(por_mes.keys())]
        if pts:
            print(f"  {nome}: {len(pts)} pts via CoinGecko")
        return pts
    except Exception as e:
        print(f"  CoinGecko {coin_id} erro: {e}")
        return []


# ── Cascatas por categoria ────────────────────────────────────────────────────
def buscar_bcb_ou_si(nome, bcb_cod=None, si_slug=None, yahoo_symbol=None):
    """Cascata para indices de renda fixa e acoes BR: BCB -> SI -> Yahoo"""
    if bcb_cod:
        pts = fetch_bcb(bcb_cod, nome)
        if pts:
            return pts
    if si_slug:
        pts = fetch_si_indice(si_slug, nome)
        if pts:
            return pts
    if yahoo_symbol:
        pts = fetch_yahoo(yahoo_symbol, nome)
        if pts:
            return pts
    print(f"  {nome}: sem dados em nenhuma fonte")
    return []


def buscar_cambio(nome, yahoo_symbol, awesome_pair=None, bcb_cod=None):
    """Cascata para cambio e ativos internacionais: Yahoo -> AwesomeAPI -> BCB"""
    pts = fetch_yahoo(yahoo_symbol, nome)
    if pts:
        return pts
    if awesome_pair:
        pts = fetch_awesome_cambio(awesome_pair, nome)
        if pts:
            return pts
    if bcb_cod:
        pts = fetch_bcb(bcb_cod, nome)
        if pts:
            return pts
    print(f"  {nome}: sem dados em nenhuma fonte")
    return []


def buscar_cripto(nome, coingecko_id, yahoo_symbol=None):
    """Cascata para cripto em BRL: CoinGecko -> Yahoo"""
    pts = fetch_coingecko_brl(coingecko_id, nome)
    if pts:
        return pts
    if yahoo_symbol:
        pts = fetch_yahoo(yahoo_symbol, nome)
        if pts:
            return pts
    print(f"  {nome}: sem dados em nenhuma fonte")
    return []


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    os.makedirs("data/historico", exist_ok=True)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
    print(f"=== fetch_historico_indices.py — {now.strftime('%d/%m/%Y %H:%M')} ===\n")
    ok = 0

    # ── Renda Fixa BR (BCB SGS) ───────────────────────────────────────────────
    print("── Renda Fixa BR ──")
    rf = {
        "CDI":    {"bcb": 4391},
        "IPCA":   {"bcb": 433},
        "IMAB":   {"bcb": 12466},
        "IMAB5":  {"bcb": 12467},
        "IMAB5P": {"bcb": 12468},
        "IMAS":   {"bcb": 12265},
        "IMA":    {"bcb": 12469},
        "IRFM":   {"bcb": 12462},
    }
    for nome, cfg in rf.items():
        print(f"[{nome}]", end=" ")
        pts = buscar_bcb_ou_si(nome, bcb_cod=cfg["bcb"])
        if merge_historico(f"data/historico/{nome}.json", nome, pts) >= 0 and pts:
            ok += 1
        time.sleep(2)

    # ── Acoes BR ──────────────────────────────────────────────────────────────
    print("\n── Acoes BR ──")
    acoes_br = {
        "IBOV":  {"yahoo": ["^BVSP", "%5EBVSP"],   "si": "ibovespa"},
        "SMLL":  {"yahoo": "SMAL11.SA",             "si": None},
        "IDIV":  {"yahoo": "DIVO11.SA",             "si": None},
        "IBRA":  {"yahoo": None,                    "si": "ibra"},
        "IBXL":  {"yahoo": None,                    "si": "ibxl"},
    }
    for nome, cfg in acoes_br.items():
        print(f"[{nome}]", end=" ")
        pts = buscar_bcb_ou_si(nome, si_slug=cfg.get("si"), yahoo_symbol=cfg.get("yahoo"))
        if merge_historico(f"data/historico/{nome}.json", nome, pts) >= 0 and pts:
            ok += 1
        time.sleep(2)

    # ── FIIs ──────────────────────────────────────────────────────────────────
    print("\n── FIIs ──")
    print("[IFIX]", end=" ")
    pts = fetch_si_indice("ifix", "IFIX")
    if not pts:
        pts = fetch_yahoo("IFIX11.SA", "IFIX")
    if merge_historico("data/historico/IFIX.json", "IFIX", pts) >= 0 and pts:
        ok += 1
    time.sleep(2)

    # ── Cambio e Exterior ─────────────────────────────────────────────────────
    print("\n── Cambio e Exterior ──")
    cambio = {
        "USDBRL": {"yahoo": ["BRL=X", "USDBRL=X"],  "awesome": "USD-BRL", "bcb": 1},
        "EURBRL": {"yahoo": ["EURBRL=X", "EURUSD=X"],"awesome": "EUR-BRL"},
    }
    for nome, cfg in cambio.items():
        print(f"[{nome}]", end=" ")
        pts = buscar_cambio(nome, cfg["yahoo"],
                            awesome_pair=cfg.get("awesome"),
                            bcb_cod=cfg.get("bcb"))
        if merge_historico(f"data/historico/{nome}.json", nome, pts) >= 0 and pts:
            ok += 1
        time.sleep(2)

    # S&P 500 em BRL: busca SPY em USD e USDBRL, multiplica
    print("[SPXBRL]", end=" ")
    spx_pts = fetch_yahoo(["^GSPC", "SPY"], "SPX_USD")
    usd_pts = []
    usd_path = "data/historico/USDBRL.json"
    if os.path.exists(usd_path):
        with open(usd_path) as f:
            usd_pts = json.load(f).get("history", [])
    if spx_pts and usd_pts:
        usd_map = {p["date"][:7]: p["close"] for p in usd_pts}
        spx_brl = []
        for p in spx_pts:
            mes = p["date"][:7]
            usd = usd_map.get(mes)
            if usd:
                spx_brl.append({"date": p["date"][:7] + "-01", "close": round(p["close"] * usd, 2)})
        if spx_brl:
            print(f"  SPXBRL: {len(spx_brl)} pts (SPX x USDBRL)")
            merge_historico("data/historico/SPXBRL.json", "SPXBRL", spx_brl)
            ok += 1
        else:
            print("  SPXBRL: sem sobreposicao de datas")
    else:
        print("  SPXBRL: faltam dados de SPX ou USDBRL")
    time.sleep(2)

    # ── Commodities ───────────────────────────────────────────────────────────
    print("\n── Commodities ──")
    print("[OURO]", end=" ")
    # Ouro em USD (GC=F) convertido para BRL
    ouro_usd = fetch_yahoo(["GC=F", "GOLD"], "OURO_USD")
    usd_pts = []
    if os.path.exists("data/historico/USDBRL.json"):
        with open("data/historico/USDBRL.json") as f:
            usd_pts = json.load(f).get("history", [])
    if ouro_usd and usd_pts:
        usd_map = {p["date"][:7]: p["close"] for p in usd_pts}
        ouro_brl = []
        for p in ouro_usd:
            mes = p["date"][:7]
            usd = usd_map.get(mes)
            if usd:
                ouro_brl.append({"date": mes + "-01", "close": round(p["close"] * usd, 2)})
        if ouro_brl:
            print(f"  OURO: {len(ouro_brl)} pts (XAU x USDBRL)")
            merge_historico("data/historico/OURO.json", "OURO", ouro_brl)
            ok += 1
        else:
            # Salva em USD se nao tiver cambio
            print(f"  OURO: {len(ouro_usd)} pts em USD (sem cambio para converter)")
            merge_historico("data/historico/OURO.json", "OURO", ouro_usd)
            ok += 1
    elif ouro_usd:
        print(f"  OURO: {len(ouro_usd)} pts em USD")
        merge_historico("data/historico/OURO.json", "OURO", ouro_usd)
        ok += 1
    time.sleep(2)

    # ── Cripto ────────────────────────────────────────────────────────────────
    print("\n── Cripto ──")
    print("[BTCBRL]", end=" ")
    pts = buscar_cripto("BTCBRL", "bitcoin", yahoo_symbol="BTC-BRL")
    if merge_historico("data/historico/BTCBRL.json", "BTCBRL", pts) >= 0 and pts:
        ok += 1
    time.sleep(3)

    # Resumo
    todos = list(rf.keys()) + list(acoes_br.keys()) + ["IFIX"] + list(cambio.keys()) + ["SPXBRL", "OURO", "BTCBRL"]
    print(f"\n{'='*50}")
    print(f"Resultado: {ok}/{len(todos)} indices atualizados")
    for nome in todos:
        path = f"data/historico/{nome}.json"
        if os.path.exists(path):
            with open(path) as f:
                h = json.load(f)
            pts = len(h.get("history", []))
            print(f"  OK  {nome}: {pts} pontos")
        else:
            print(f"  --  {nome}: sem arquivo")

if __name__ == "__main__":
    main()
