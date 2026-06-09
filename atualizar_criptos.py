#!/usr/bin/env python3
"""
atualizar_criptos.py
====================
Busca dados da CoinGecko e salva JSONs locais para fallback offline.

Estrutura gerada (mesmo padrão de ações/FIIs do site):
  data/cripto_market.json              ← preços/métricas das top N criptos
  data/cripto_historico/{id}.json      ← histórico diário de preços (365 dias)

Uso:
  python atualizar_criptos.py              # top 250, salva em ./data/
  python atualizar_criptos.py --top 500    # top 500
  python atualizar_criptos.py --top 100 --data-dir /caminho/data

Agendamento sugerido (cron — roda todo dia às 6h e 18h):
  0 6,18 * * * cd /caminho/do/site && python atualizar_criptos.py >> logs/criptos.log 2>&1

Ou no Netlify, via GitHub Actions (ver README abaixo).
"""

import os
import json
import time
import argparse
import logging
from datetime import datetime, timezone
from pathlib import Path

try:
    import requests
except ImportError:
    raise SystemExit("❌ Instale o requests: pip install requests")

# ─── Config ──────────────────────────────────────────────────────────────────
BASE_URL   = "https://api.coingecko.com/api/v3"
PER_PAGE   = 100          # máx por request na tier gratuita
DELAY_PAGE = 6.0          # segundos entre páginas (respeita rate limit free)
DELAY_HIST = 2.0          # segundos entre requests de histórico
HIST_DAYS  = 365          # dias de histórico a salvar

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ─── Helpers ─────────────────────────────────────────────────────────────────
def get(url: str, params: dict = None, retries: int = 3) -> dict | list:
    """GET com retry automático e backoff."""
    for attempt in range(1, retries + 1):
        try:
            r = requests.get(url, params=params, timeout=20,
                             headers={"Accept": "application/json"})
            if r.status_code == 429:
                wait = int(r.headers.get("Retry-After", 60))
                log.warning(f"Rate limit. Aguardando {wait}s...")
                time.sleep(wait)
                continue
            r.raise_for_status()
            return r.json()
        except requests.RequestException as e:
            log.warning(f"Tentativa {attempt}/{retries} falhou: {e}")
            if attempt < retries:
                time.sleep(10 * attempt)
    raise RuntimeError(f"Falha após {retries} tentativas: {url}")


def save_json(path: Path, data: dict | list):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    log.info(f"  💾 {path}  ({path.stat().st_size // 1024}KB)")


# ─── Etapa 1: Mercado (preços, market cap, variações) ────────────────────────
def fetch_market(top: int) -> list:
    """Busca dados de mercado das top N criptos."""
    coins = []
    pages = -(-top // PER_PAGE)   # ceil division

    for page in range(1, pages + 1):
        log.info(f"  📄 Mercado — página {page}/{pages}")
        data = get(f"{BASE_URL}/coins/markets", params={
            "vs_currency":            "usd",
            "order":                  "market_cap_desc",
            "per_page":               PER_PAGE,
            "page":                   page,
            "sparkline":              "false",
            "price_change_percentage": "24h,7d,30d,1y",
            "locale":                 "pt",
        })
        # Deduplica por id
        existing_ids = {c["id"] for c in coins}
        coins += [c for c in data if c["id"] not in existing_ids]

        if page < pages:
            time.sleep(DELAY_PAGE)

    return coins[:top]


# ─── Etapa 2: Histórico diário por moeda ─────────────────────────────────────
def fetch_history(coin_id: str, days: int = HIST_DAYS) -> list:
    """
    Retorna lista de dicts:
      {"date": "2024-01-15", "open": 42000, "high": 43000, "low": 41000, "close": 42500}
    Usa o endpoint market_chart que é gratuito e sem API key.
    """
    data = get(f"{BASE_URL}/coins/{coin_id}/market_chart", params={
        "vs_currency": "usd",
        "days":        days,
        "interval":    "daily",
    })

    prices  = data.get("prices", [])       # [[ts_ms, price], ...]
    volumes = data.get("total_volumes", []) # [[ts_ms, vol], ...]

    # Agrupa por dia (CoinGecko retorna 1 ponto por dia no modo daily)
    vol_map = {
        datetime.fromtimestamp(ts / 1000, tz=timezone.utc).strftime("%Y-%m-%d"): v
        for ts, v in volumes
    }

    history = []
    prev_close = None
    for ts, price in prices:
        date = datetime.fromtimestamp(ts / 1000, tz=timezone.utc).strftime("%Y-%m-%d")
        vol  = vol_map.get(date)
        entry = {
            "date":  date,
            "close": round(price, 8),
        }
        if vol is not None:
            entry["volume"] = round(vol, 0)
        if prev_close is not None:
            entry["open"] = prev_close      # open ≈ close do dia anterior
        history.append(entry)
        prev_close = round(price, 8)

    return history


# ─── Etapa 3: Detalhes (descrição, links, ATH, supply) ───────────────────────
def fetch_details_batch(coin_ids: list) -> dict:
    """
    Busca detalhes completos de cada moeda (1 request por moeda).
    Só faz isso para as top 50 para não demorar demais.
    """
    details = {}
    total = len(coin_ids)
    for i, cid in enumerate(coin_ids, 1):
        log.info(f"  🔍 Detalhes {i}/{total}: {cid}")
        try:
            d = get(f"{BASE_URL}/coins/{cid}", params={
                "localization":    "false",
                "tickers":         "false",
                "market_data":     "true",
                "community_data":  "false",
                "developer_data":  "false",
            })
            md = d.get("market_data", {})
            details[cid] = {
                "id":          d["id"],
                "symbol":      d["symbol"],
                "name":        d["name"],
                "image":       d.get("image", {}).get("large", ""),
                "description": d.get("description", {}).get("en", "")[:800],
                "categories":  (d.get("categories") or [])[:3],
                "links": {
                    "homepage":  (d.get("links", {}).get("homepage") or [""])[0],
                    "twitter":   d.get("links", {}).get("twitter_screen_name", ""),
                    "github":    ((d.get("links", {}).get("repos_url") or {}).get("github") or [""])[0],
                    "whitepaper": d.get("links", {}).get("whitepaper", ""),
                },
                "ath":               md.get("ath", {}).get("usd"),
                "ath_date":          (md.get("ath_date") or {}).get("usd", ""),
                "atl":               md.get("atl", {}).get("usd"),
                "atl_date":          (md.get("atl_date") or {}).get("usd", ""),
                "circulating_supply": md.get("circulating_supply"),
                "total_supply":       md.get("total_supply"),
                "max_supply":         md.get("max_supply"),
                "sentiment_up":       d.get("sentiment_votes_up_percentage"),
                "coingecko_score":    d.get("coingecko_score"),
            }
        except Exception as e:
            log.warning(f"    ⚠️ Pulando {cid}: {e}")
        time.sleep(DELAY_HIST)

    return details


# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Atualiza dados offline de criptos")
    parser.add_argument("--top",      type=int, default=250,    help="Quantas criptos (padrão: 250)")
    parser.add_argument("--data-dir", type=str, default="data", help="Pasta de dados (padrão: ./data)")
    parser.add_argument("--skip-history", action="store_true",  help="Pula download de histórico (mais rápido)")
    parser.add_argument("--details-top",  type=int, default=50, help="Detalhes completos das top N (padrão: 50)")
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    hist_dir = data_dir / "cripto_historico"
    hist_dir.mkdir(parents=True, exist_ok=True)

    now_str = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC")
    log.info(f"🚀 Iniciando atualização — top {args.top} criptos")

    # ── 1. Mercado ────────────────────────────────────────────────────────────
    log.info("📊 Buscando dados de mercado...")
    coins = fetch_market(args.top)
    log.info(f"  ✅ {len(coins)} moedas carregadas")

    # ── 2. Detalhes das top N ─────────────────────────────────────────────────
    details = {}
    if args.details_top > 0:
        log.info(f"🔍 Buscando detalhes das top {args.details_top}...")
        top_ids = [c["id"] for c in coins[:args.details_top]]
        details = fetch_details_batch(top_ids)
        log.info(f"  ✅ {len(details)} detalhes salvos")

    # ── 3. Salva cripto_market.json ───────────────────────────────────────────
    market_out = []
    for c in coins:
        entry = {
            "id":           c["id"],
            "symbol":       c["symbol"],
            "name":         c["name"],
            "image":        c.get("image", ""),
            "rank":         c.get("market_cap_rank"),
            "price":        c.get("current_price"),
            "market_cap":   c.get("market_cap"),
            "volume_24h":   c.get("total_volume"),
            "high_24h":     c.get("high_24h"),
            "low_24h":      c.get("low_24h"),
            "chg_24h":      c.get("price_change_percentage_24h"),
            "chg_7d":       c.get("price_change_percentage_7d_in_currency"),
            "chg_30d":      c.get("price_change_percentage_30d_in_currency"),
            "chg_1y":       c.get("price_change_percentage_1y_in_currency"),
            "supply":       c.get("circulating_supply"),
        }
        # Enriquece com detalhes se disponível
        if c["id"] in details:
            d = details[c["id"]]
            entry.update({
                "ath":         d.get("ath"),
                "ath_date":    d.get("ath_date"),
                "atl":         d.get("atl"),
                "atl_date":    d.get("atl_date"),
                "total_supply": d.get("total_supply"),
                "description": d.get("description", ""),
                "categories":  d.get("categories", []),
                "links":       d.get("links", {}),
                "sentiment_up": d.get("sentiment_up"),
                "score":       d.get("coingecko_score"),
            })
        market_out.append(entry)

    save_json(data_dir / "cripto_market.json", {
        "updated_at": now_str,
        "total":      len(market_out),
        "coins":      market_out,
    })

    # ── 4. Histórico por moeda ────────────────────────────────────────────────
    if not args.skip_history:
        log.info(f"📈 Buscando histórico de {len(coins)} moedas ({HIST_DAYS} dias cada)...")
        ok, fail = 0, 0
        for i, c in enumerate(coins, 1):
            cid   = c["id"]
            fpath = hist_dir / f"{cid}.json"

            # Verifica se já existe e foi atualizado hoje
            if fpath.exists():
                try:
                    existing = json.loads(fpath.read_text())
                    updated  = existing.get("updated_at", "")
                    if updated.startswith(datetime.now(timezone.utc).strftime("%d/%m/%Y")):
                        log.info(f"  ⏭️  [{i}/{len(coins)}] {cid} — já atualizado hoje, pulando")
                        ok += 1
                        continue
                except Exception:
                    pass

            log.info(f"  📉 [{i}/{len(coins)}] {cid}")
            try:
                history = fetch_history(cid, HIST_DAYS)
                save_json(fpath, {
                    "id":         cid,
                    "updated_at": now_str,
                    "days":       HIST_DAYS,
                    "history":    history,
                })
                ok += 1
            except Exception as e:
                log.warning(f"    ⚠️ Falha no histórico de {cid}: {e}")
                fail += 1

            time.sleep(DELAY_HIST)

        log.info(f"  ✅ Histórico: {ok} ok, {fail} falhas")
    else:
        log.info("⏭️  Histórico pulado (--skip-history)")

    log.info(f"🏁 Concluído! Dados em ./{data_dir}/")
    log.info(f"   cripto_market.json         → {len(market_out)} moedas")
    log.info(f"   cripto_historico/{{id}}.json → histórico diário")


if __name__ == "__main__":
    main()
