#!/usr/bin/env python3
"""
gerar_historico_cripto.py
=========================
Busca histórico mensal das top 30 criptos via CoinGecko (gratuita,
sem chave, sem bloqueio no GitHub Actions) e salva em
data/historico/{TICKER}BRL.json — formato compatível com o Simulador.

Migrado da Binance para CoinGecko pois a Binance retorna HTTP 451
(bloqueio geográfico) nos servidores do GitHub Actions para pares BRL.
CoinGecko retorna preços já em BRL nativamente via ?vs_currency=brl.
"""

import json, time, logging
from datetime import datetime, timezone
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

# Mapa: ticker do simulador → ID do CoinGecko
# IDs em: https://api.coingecko.com/api/v3/coins/list
CRIPTO_MAP = {
    "BTCBRL":   "bitcoin",
    "ETHBRL":   "ethereum",
    "BNBBRL":   "binancecoin",
    "SOLBRL":   "solana",
    "XRPBRL":   "ripple",
    "ADABRL":   "cardano",
    "DOGEBRL":  "dogecoin",
    "AVAXBRL":  "avalanche-2",
    "LINKBRL":  "chainlink",
    "DOTBRL":   "polkadot",
    "LTCBRL":   "litecoin",
    "XLMBRL":   "stellar",
    "ATOMBRL":  "cosmos",
    "NEARBRL":  "near",
    "UNIBRL":   "uniswap",
    "BCHBRL":   "bitcoin-cash",
    "MATICBRL": "matic-network",
    "ETCBRL":   "ethereum-classic",
    "TRXBRL":   "tron",
    "FILBRL":   "filecoin",
    "SHIBABRL": "shiba-inu",
    "USDTBRL":  "tether",
    "TONBRL":   "the-open-network",
    "ICPBRL":   "internet-computer",
    "APTBRL":   "aptos",
    "PEPEBRL":  "pepe",
}

COINGECKO_BASE = "https://api.coingecko.com/api/v3"
OUT_DIR        = Path("data/historico")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# CoinGecko free tier: ~10-30 req/min — 1.5s entre chamadas é seguro
DELAY_ENTRE_REQUESTS = 1.5


def fetch_coingecko(coin_id: str, dias: int = 3650) -> list:
    """
    Busca histórico de preços diários do CoinGecko em BRL.
    Retorna lista de {date, close} agrupada por mês (último dia do mês)
    ou [] se falhar.

    CoinGecko /market_chart retorna dados diários para janelas > 90 dias.
    Agrupamos por mês pegando o último ponto de cada mês — compatível
    com o formato que o Simulador espera.
    """
    try:
        r = requests.get(
            f"{COINGECKO_BASE}/coins/{coin_id}/market_chart",
            params={
                "vs_currency": "brl",
                "days": dias,
                "interval": "daily",
            },
            timeout=30,
        )
        if r.status_code == 429:
            log.warning(f"    CoinGecko rate limit — aguardando 60s...")
            time.sleep(60)
            return fetch_coingecko(coin_id, dias)  # retry uma vez
        if r.status_code == 404:
            log.warning(f"    CoinGecko: coin_id '{coin_id}' não encontrado")
            return []
        r.raise_for_status()
        data = r.json()

        prices = data.get("prices", [])
        if not prices:
            return []

        # Agrupa por mês — mantém o último ponto de cada mês
        por_mes: dict[str, float] = {}
        for ts_ms, preco in prices:
            dt   = datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc)
            chave = dt.strftime("%Y-%m")  # "2024-03"
            # sobrescreve sempre → fica com o último dia do mês
            por_mes[chave] = (dt.strftime("%Y-%m-%d"), round(float(preco), 8))

        pts = [{"date": v[0], "close": v[1]} for v in sorted(por_mes.values())]
        return pts

    except Exception as e:
        log.warning(f"    CoinGecko {coin_id}: {e}")
        return []


def merge_historico(path: Path, ticker: str, novos: list) -> int:
    """Merge incremental — nunca apaga dados existentes."""
    existente = []
    if path.exists():
        try:
            j = json.loads(path.read_text())
            existente = j.get("history", [])
        except Exception:
            existente = []

    datas_existentes = {p["date"] for p in existente}
    to_add = [p for p in novos if p["date"] not in datas_existentes]

    merged = sorted(existente + to_add, key=lambda x: x["date"])
    path.write_text(
        json.dumps(
            {
                "ticker":     ticker,
                "updated_at": datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC"),
                "history":    merged,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        )
    )
    return len(to_add)


def main():
    log.info(f"Iniciando: {len(CRIPTO_MAP)} criptos via CoinGecko (BRL)")
    ok = fail = 0

    for ticker, coin_id in CRIPTO_MAP.items():
        path = OUT_DIR / f"{ticker}.json"
        log.info(f"  {ticker} ({coin_id})...")

        pts = fetch_coingecko(coin_id)

        if not pts:
            log.warning(f"    sem dados — pulando {ticker}")
            fail += 1
            time.sleep(DELAY_ENTRE_REQUESTS)
            continue

        adicionados = merge_historico(path, ticker, pts)
        log.info(f"    {len(pts)} pontos totais, +{adicionados} novos salvos")
        ok += 1
        time.sleep(DELAY_ENTRE_REQUESTS)

    log.info(f"\nConcluído: {ok} ok, {fail} sem dados")
    log.info(f"Arquivos em {OUT_DIR}/")


if __name__ == "__main__":
    main()
