#!/usr/bin/env python3
"""
gerar_historico_cripto.py
=========================
Converte cripto_historico/{id}.json (preços em USD) para
data/historico/{TICKER}BRL.json (preços em BRL) — formato
compatível com o Simulador de Carteiras.

Conversão USD→BRL:
  Usa a série histórica do USDBRL salva em data/historico/USDBRL.json
  (gerada pelo fetch_historico_indices.py).
  Se o arquivo não existir, busca da AwesomeAPI como fallback.
"""

import json, logging
from datetime import datetime, timezone, timedelta
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger(__name__)

# Mapa: id CoinGecko → ticker do simulador (top 30 por market cap)
COIN_MAP = {
    "bitcoin":           "BTCBRL",
    "ethereum":          "ETHBRL",
    "tether":            "USDTBRL",
    "binancecoin":       "BNBBRL",
    "solana":            "SOLBRL",
    "ripple":            "XRPBRL",
    "usd-coin":          "USDCBRL",
    "staked-ether":      "STETHBRL",
    "dogecoin":          "DOGEBRL",
    "tron":              "TRXBRL",
    "cardano":           "ADABRL",
    "wrapped-bitcoin":   "WBTCBRL",
    "avalanche-2":       "AVAXBRL",
    "shiba-inu":         "SHIBABRL",
    "chainlink":         "LINKBRL",
    "toncoin":           "TONBRL",
    "polkadot":          "DOTBRL",
    "bitcoin-cash":      "BCHBRL",
    "near":              "NEARBRL",
    "uniswap":           "UNIBRL",
    "litecoin":          "LTCBRL",
    "internet-computer": "ICPBRL",
    "dai":               "DAIBRL",
    "polygon":           "MATICBRL",
    "aptos":             "APTBRL",
    "pepe":              "PEPEBRL",
    "ethereum-classic":  "ETCBRL",
    "stellar":           "XLMBRL",
    "filecoin":          "FILBRL",
    "cosmos":            "ATOMBRL",
}

DATA_DIR = Path("data")
HIST_DIR = DATA_DIR / "cripto_historico"
OUT_DIR  = DATA_DIR / "historico"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def load_usdbrl() -> dict:
    """Carrega mapa {YYYY-MM-DD: taxa} do USDBRL local ou busca online."""
    local = DATA_DIR / "historico" / "USDBRL.json"
    if local.exists():
        try:
            j = json.loads(local.read_text())
            m = {}
            for entry in j.get("history", []):
                if entry.get("date") and entry.get("close"):
                    m[entry["date"][:10]] = entry["close"]
            if m:
                log.info(f"  USDBRL: {len(m)} pontos do arquivo local")
                return m
        except Exception as e:
            log.warning(f"  Erro ao ler USDBRL local: {e}")

    # Fallback: AwesomeAPI
    log.info("  Buscando USDBRL da AwesomeAPI...")
    try:
        import requests
        r = requests.get("https://economia.awesomeapi.com.br/json/daily/USD-BRL/3650", timeout=30)
        r.raise_for_status()
        data = r.json()
        m = {}
        for d in data:
            ts  = int(d.get("timestamp", 0))
            bid = float(d.get("bid") or d.get("ask") or 0)
            if not ts or not bid:
                continue
            dt  = datetime.fromtimestamp(ts, tz=timezone.utc)
            key = dt.strftime("%Y-%m-%d")
            m[key] = round(bid, 4)
        log.info(f"  USDBRL: {len(m)} pontos da AwesomeAPI")
        return m
    except Exception as e:
        log.warning(f"  Falha ao buscar USDBRL online: {e}")
        return {}


def closest_rate(usdbrl: dict, date_str: str) -> float:
    """Retorna taxa mais próxima para uma data (busca +/-7 dias)."""
    if date_str in usdbrl:
        return usdbrl[date_str]
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    for delta in range(1, 8):
        for sign in (-1, 1):
            candidate = (dt + timedelta(days=delta * sign)).strftime("%Y-%m-%d")
            if candidate in usdbrl:
                return usdbrl[candidate]
    return 5.5  # fallback genérico


def convert_coin(coin_id: str, ticker: str, usdbrl: dict) -> bool:
    """Lê cripto_historico/{coin_id}.json e gera historico/{ticker}.json em BRL."""
    src = HIST_DIR / f"{coin_id}.json"
    if not src.exists():
        log.warning(f"  {coin_id}: arquivo nao encontrado em {src} — pulando")
        return False

    try:
        j = json.loads(src.read_text())
    except Exception as e:
        log.warning(f"  {coin_id}: erro ao ler JSON: {e}")
        return False

    history_usd = j.get("history", [])
    if not history_usd:
        log.warning(f"  {coin_id}: historico vazio")
        return False

    history_brl = []
    for entry in history_usd:
        date      = entry.get("date", "")
        close_usd = entry.get("close")
        if not date or close_usd is None:
            continue
        rate      = closest_rate(usdbrl, date[:10])
        close_brl = round(close_usd * rate, 8)
        row = {"date": date[:10], "close": close_brl}
        if "volume" in entry:
            row["volume"] = entry["volume"]
        history_brl.append(row)

    if not history_brl:
        log.warning(f"  {coin_id}: nenhum ponto convertido")
        return False

    out = {
        "ticker":     ticker,
        "updated_at": datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC"),
        "history":    history_brl,
    }
    dst = OUT_DIR / f"{ticker}.json"
    dst.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    log.info(f"  OK {ticker}: {len(history_brl)} dias -> {dst}  ({dst.stat().st_size // 1024}KB)")
    return True


def main():
    log.info(f"Iniciando conversao de {len(COIN_MAP)} criptos USD -> BRL para o Simulador...")

    usdbrl = load_usdbrl()
    if not usdbrl:
        log.error("Nao foi possivel carregar taxa USDBRL — abortando")
        return

    ok, fail = 0, 0
    for coin_id, ticker in COIN_MAP.items():
        log.info(f"  {coin_id} -> {ticker}")
        if convert_coin(coin_id, ticker, usdbrl):
            ok += 1
        else:
            fail += 1

    log.info(f"Concluido: {ok} gerados, {fail} nao encontrados (ainda nao baixados pelo atualizar_criptos.py)")


if __name__ == "__main__":
    main()
