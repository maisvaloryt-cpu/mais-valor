#!/usr/bin/env python3
"""
gerar_historico_cripto.py
=========================
Busca histórico mensal das top 30 criptos e salva em
data/historico/{TICKER}BRL.json — formato compatível com o Simulador.

Fontes (em ordem de prioridade):
  1. CoinGecko  — sem chave, sem geo-block, até 365 dias no plano free
  2. Mercado Bitcoin — API brasileira, sem chave, histórico completo,
                       zero chance de geo-block no GitHub Actions

O merge é incremental: dados existentes nunca são apagados. Na prática
o Mercado Bitcoin preenche o histórico antigo (>365 dias) e o CoinGecko
mantém os dados recentes atualizados a cada execução.
"""

import json, time, logging
from datetime import datetime, date, timedelta, timezone
from pathlib import Path

try:
    import requests
except ImportError:
    raise SystemExit("pip install requests")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ── Mapa: ticker → (coingecko_id, mercadobitcoin_ticker) ─────────────────────
CRIPTO_MAP = {
    "BTCBRL":   ("bitcoin",            "BTC"),
    "ETHBRL":   ("ethereum",           "ETH"),
    "BNBBRL":   ("binancecoin",        None),
    "SOLBRL":   ("solana",             "SOL"),
    "XRPBRL":   ("ripple",             "XRP"),
    "ADABRL":   ("cardano",            "ADA"),
    "DOGEBRL":  ("dogecoin",           "DOGE"),
    "AVAXBRL":  ("avalanche-2",        "AVAX"),
    "LINKBRL":  ("chainlink",          "LINK"),
    "DOTBRL":   ("polkadot",           "DOT"),
    "LTCBRL":   ("litecoin",           "LTC"),
    "XLMBRL":   ("stellar",            "XLM"),
    "ATOMBRL":  ("cosmos",             "ATOM"),
    "NEARBRL":  ("near",               "NEAR"),
    "UNIBRL":   ("uniswap",            "UNI"),
    "BCHBRL":   ("bitcoin-cash",       "BCH"),
    "MATICBRL": ("matic-network",      "MATIC"),
    "ETCBRL":   ("ethereum-classic",   "ETC"),
    "TRXBRL":   ("tron",               "TRX"),
    "FILBRL":   ("filecoin",           "FIL"),
    "SHIBABRL": ("shiba-inu",          "SHIB"),
    "USDTBRL":  ("tether",             "USDT"),
    "TONBRL":   ("the-open-network",   None),
    "ICPBRL":   ("internet-computer",  None),
    "APTBRL":   ("aptos",              None),
    "PEPEBRL":  ("pepe",               None),
}

COINGECKO_BASE   = "https://api.coingecko.com/api/v3"
MB_BASE          = "https://www.mercadobitcoin.net/api"
OUT_DIR          = Path("data/historico")
OUT_DIR.mkdir(parents=True, exist_ok=True)
DELAY            = 1.5   # segundos entre requests


# ── CoinGecko ─────────────────────────────────────────────────────────────────

def fetch_coingecko(coin_id: str, dias: int = 3650) -> list:
    """
    Busca histórico diário do CoinGecko em BRL e agrupa por mês.
    Plano free suporta até 365 dias; para janelas maiores retorna 401
    e o chamador deve cair no fallback do Mercado Bitcoin.
    Retorna [] em caso de qualquer erro.
    """
    try:
        r = requests.get(
            f"{COINGECKO_BASE}/coins/{coin_id}/market_chart",
            params={"vs_currency": "brl", "days": dias, "interval": "daily"},
            timeout=30,
        )
        if r.status_code == 429:
            log.warning("    CoinGecko rate limit — aguardando 60s...")
            time.sleep(60)
            return fetch_coingecko(coin_id, dias)
        if r.status_code in (401, 403):
            log.warning(f"    CoinGecko {coin_id}: {r.status_code} — sem acesso a {dias} dias")
            return []
        if r.status_code == 404:
            log.warning(f"    CoinGecko: '{coin_id}' não encontrado")
            return []
        r.raise_for_status()

        prices = r.json().get("prices", [])
        if not prices:
            return []

        por_mes: dict = {}
        for ts_ms, preco in prices:
            dt    = datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc)
            chave = dt.strftime("%Y-%m")
            por_mes[chave] = (dt.strftime("%Y-%m-%d"), round(float(preco), 8))

        return [{"date": v[0], "close": v[1]} for v in sorted(por_mes.values())]

    except Exception as e:
        log.warning(f"    CoinGecko {coin_id}: {e}")
        return []


# ── Mercado Bitcoin ───────────────────────────────────────────────────────────

def fetch_mercadobitcoin(mb_ticker: str, anos: int = 10) -> list:
    """
    Busca candles diários do Mercado Bitcoin e agrupa por mês.
    Endpoint: GET /api/{ticker}/day-summary/{ano}/{mes}/{dia}/
    Itera mês a mês dos últimos `anos` anos.
    Retorna [] se falhar em todos os meses.
    """
    hoje  = date.today()
    pts   = {}
    erros = 0

    # Itera do mês mais antigo até o mês atual
    inicio = date(hoje.year - anos, hoje.month, 1)
    cursor = inicio

    while cursor <= hoje:
        ano, mes = cursor.year, cursor.month
        # Pega o último dia do mês
        if mes == 12:
            ultimo = date(ano + 1, 1, 1) - timedelta(days=1)
        else:
            ultimo = date(ano, mes + 1, 1) - timedelta(days=1)
        ultimo = min(ultimo, hoje)

        url = f"{MB_BASE}/{mb_ticker}/day-summary/{ano}/{mes:02d}/{ultimo.day:02d}/"
        try:
            r = requests.get(url, timeout=15)
            if r.ok:
                d = r.json()
                closing = d.get("closing")
                if closing:
                    chave = f"{ano}-{mes:02d}"
                    pts[chave] = {
                        "date":  ultimo.strftime("%Y-%m-%d"),
                        "close": round(float(closing), 8),
                    }
            else:
                erros += 1
        except Exception:
            erros += 1

        # Avança para o próximo mês
        if mes == 12:
            cursor = date(ano + 1, 1, 1)
        else:
            cursor = date(ano, mes + 1, 1)

        time.sleep(0.2)  # gentil com a API

    resultado = [pts[k] for k in sorted(pts)]
    return resultado if len(resultado) >= 3 else []


# ── Merge incremental ─────────────────────────────────────────────────────────

def merge_historico(path: Path, ticker: str, novos: list) -> int:
    existente = []
    if path.exists():
        try:
            existente = json.loads(path.read_text()).get("history", [])
        except Exception:
            existente = []

    datas_existentes = {p["date"] for p in existente}
    to_add  = [p for p in novos if p["date"] not in datas_existentes]
    merged  = sorted(existente + to_add, key=lambda x: x["date"])

    path.write_text(json.dumps(
        {
            "ticker":     ticker,
            "updated_at": datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC"),
            "history":    merged,
        },
        ensure_ascii=False, separators=(",", ":"),
    ))
    return len(to_add)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    log.info(f"Iniciando: {len(CRIPTO_MAP)} criptos")
    ok = fail = 0

    for ticker, (coin_id, mb_ticker) in CRIPTO_MAP.items():
        path = OUT_DIR / f"{ticker}.json"
        log.info(f"  {ticker}...")
        pts  = []

        # 1. CoinGecko (365 dias grátis — preenche dados recentes)
        if coin_id:
            pts = fetch_coingecko(coin_id, dias=365)
            if pts:
                log.info(f"    CoinGecko: {len(pts)} pontos")

        # 2. Mercado Bitcoin (histórico completo — preenche dados antigos)
        if mb_ticker:
            mb_pts = fetch_mercadobitcoin(mb_ticker, anos=10)
            if mb_pts:
                log.info(f"    Mercado Bitcoin: {len(mb_pts)} pontos")
                # Merge local antes de salvar: MB cobre passado, CG cobre recente
                datas_cg = {p["date"] for p in pts}
                pts = mb_pts + [p for p in pts if p["date"] not in {q["date"] for q in mb_pts}]
                pts = sorted(pts, key=lambda x: x["date"])

        if not pts:
            log.warning(f"    sem dados em nenhuma fonte")
            fail += 1
            time.sleep(DELAY)
            continue

        adicionados = merge_historico(path, ticker, pts)
        log.info(f"    {len(pts)} pontos totais, +{adicionados} novos salvos")
        ok += 1
        time.sleep(DELAY)

    log.info(f"\nConcluído: {ok} ok, {fail} sem dados")
    log.info(f"Arquivos em {OUT_DIR}/")


if __name__ == "__main__":
    main()
