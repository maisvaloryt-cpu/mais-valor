#!/usr/bin/env python3
"""
gerar_historico_cripto.py
=========================
Busca histórico mensal das top 30 criptos via Binance API (gratuita,
sem chave, sem bloqueio no GitHub Actions) e salva em
data/historico/{TICKER}BRL.json — formato compatível com o Simulador.

Binance tem pares diretos em BRL (ex: BTCBRL, ETHBRL) então não
precisa converter USD→BRL. Histórico desde o lançamento de cada par.
"""

import json, time, logging
from datetime import datetime, timezone
from pathlib import Path

try:
    import requests
except ImportError:
    raise SystemExit("pip install requests")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger(__name__)

# Mapa: ticker do simulador → símbolo Binance
# Binance usa formato "BTCBRL", "ETHBRL" etc. diretamente
CRIPTO_MAP = {
    "BTCBRL":   "BTCBRL",
    "ETHBRL":   "ETHBRL",
    "BNBBRL":   "BNBBRL",
    "SOLBRL":   "SOLBRL",
    "XRPBRL":   "XRPBRL",
    "ADABRL":   "ADABRL",
    "DOGEBRL":  "DOGEBRL",
    "AVAXBRL":  "AVAXBRL",
    "LINKBRL":  "LINKBRL",
    "DOTBRL":   "DOTBRL",
    "LTCBRL":   "LTCBRL",
    "XLMBRL":   "XLMBRL",
    "ATOMBRL":  "ATOMBRL",
    "NEARBRL":  "NEARBRL",
    "UNIBRL":   "UNIBNB",   # UNI não tem par BRL direto, usa via BNB como proxy
    "BCHBRL":   "BCHBRL",
    "MATICBRL": "MATICBRL",
    "ETCBRL":   "ETCBRL",
    "TRXBRL":   "TRXBRL",
    "FILBRL":   "FILBRL",
    "SHIBABRL": "SHIBABRL",
    "USDTBRL":  "USDTBRL",
}

# Pares que não existem na Binance em BRL — fallback Yahoo Finance
YAHOO_FALLBACK = {
    "TONBRL":   "TON11419-BRL",
    "ICPBRL":   "ICP-BRL",
    "APTBRL":   "APT21794-BRL",
    "PEPEBRL":  "PEPE24478-BRL",
    "XLMBRL":   "XLM-BRL",
    "UNIBRL":   "UNI7083-BRL",
    "BNBBRL":   "BNB-BRL",     # fallback se Binance falhar
}

BINANCE_BASE = "https://api.binance.com/api/v3"
YAHOO_BASE   = "https://query1.finance.yahoo.com/v8/finance/chart"
OUT_DIR      = Path("data/historico")
OUT_DIR.mkdir(parents=True, exist_ok=True)

HEADERS_YAHOO = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    "Accept": "application/json",
}


def fetch_binance(symbol: str) -> list:
    """
    Busca klines mensais da Binance.
    Retorna lista de {date, close} ou [] se falhar.
    Binance retorna até 1000 candles por request — mensal cobre ~83 anos.
    """
    try:
        r = requests.get(
            f"{BINANCE_BASE}/klines",
            params={"symbol": symbol, "interval": "1M", "limit": 1000},
            timeout=20
        )
        if r.status_code == 400:
            # Par não existe na Binance
            return []
        r.raise_for_status()
        data = r.json()
        pts = []
        for candle in data:
            # candle: [open_time, open, high, low, close, volume, ...]
            ts    = candle[0] / 1000
            close = float(candle[4])
            date  = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d")
            if close > 0:
                pts.append({"date": date, "close": round(close, 8)})
        return pts
    except Exception as e:
        log.warning(f"    Binance {symbol}: {e}")
        return []


def fetch_yahoo(yahoo_symbol: str, anos: int = 10) -> list:
    """Fallback: busca histórico mensal do Yahoo Finance."""
    import datetime as dt
    end   = int(dt.datetime.now().timestamp())
    start = end - (anos * 365 * 24 * 3600)
    try:
        r = requests.get(
            f"{YAHOO_BASE}/{yahoo_symbol}",
            params={"period1": start, "period2": end, "interval": "1mo"},
            headers=HEADERS_YAHOO, timeout=20
        )
        if not r.ok:
            return []
        data   = r.json()
        result = data.get("chart", {}).get("result", [])
        if not result:
            return []
        r0      = result[0]
        ts_list = r0.get("timestamp", [])
        closes  = (r0.get("indicators", {})
                     .get("adjclose", [{}])[0]
                     .get("adjclose", []))
        if not closes:
            closes = (r0.get("indicators", {})
                        .get("quote", [{}])[0]
                        .get("close", []))
        pts = []
        for ts, c in zip(ts_list, closes):
            if c:
                d = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d")
                pts.append({"date": d, "close": round(float(c), 8)})
        return pts if len(pts) >= 3 else []
    except Exception as e:
        log.warning(f"    Yahoo {yahoo_symbol}: {e}")
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
    path.write_text(json.dumps({
        "ticker":     ticker,
        "updated_at": datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC"),
        "history":    merged,
    }, ensure_ascii=False, separators=(",", ":")))
    return len(to_add)


def main():
    # Todos os tickers para processar
    todos = dict(CRIPTO_MAP)
    todos.update({k: None for k in YAHOO_FALLBACK if k not in todos})

    log.info(f"Iniciando: {len(todos)} criptos")
    ok = fail = 0

    for ticker in todos:
        binance_sym = CRIPTO_MAP.get(ticker)
        yahoo_sym   = YAHOO_FALLBACK.get(ticker)
        path        = OUT_DIR / f"{ticker}.json"

        log.info(f"  {ticker}...")
        pts = []

        # 1. Tenta Binance
        if binance_sym:
            pts = fetch_binance(binance_sym)
            if pts:
                log.info(f"    Binance: {len(pts)} candles")

        # 2. Fallback Yahoo se Binance não tiver
        if not pts and yahoo_sym:
            pts = fetch_yahoo(yahoo_sym)
            if pts:
                log.info(f"    Yahoo fallback: {len(pts)} pontos")

        if not pts:
            log.warning(f"    sem dados em nenhuma fonte")
            fail += 1
            time.sleep(0.3)
            continue

        adicionados = merge_historico(path, ticker, pts)
        log.info(f"    +{adicionados} novos pontos salvos")
        ok += 1
        time.sleep(0.3)  # gentil com a API

    log.info(f"\nConcluido: {ok} ok, {fail} sem dados")
    log.info(f"Arquivos em {OUT_DIR}/")


if __name__ == "__main__":
    main()
