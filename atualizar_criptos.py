#!/usr/bin/env python3
"""
atualizar_criptos.py
====================
Busca dados da CoinGecko e salva JSONs locais para fallback offline.

Estrutura gerada:
  data/cripto_market.json              ← preços/métricas das top N criptos
  data/cripto_historico/{id}.json      ← histórico diário de preços (acumulado)

Lógica de histórico (INCREMENTAL):
  • Arquivo não existe → baixa histórico COMPLETO desde o início da moeda (max)
  • Arquivo já existe  → baixa apenas os dias que faltam desde o último dado
                         e ANEXA ao histórico existente (dados antigos preservados)

Uso:
  python atualizar_criptos.py              # top 250, salva em ./data/
  python atualizar_criptos.py --top 50     # top 50
  python atualizar_criptos.py --skip-history   # só atualiza preços, sem histórico

Agendamento sugerido (GitHub Actions — roda todo dia):
  - Primeira execução: baixa histórico completo (pode demorar bastante)
  - Execuções seguintes: apenas appenda os dias novos (muito rápido)
"""

import json
import time
import argparse
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path

try:
    import requests
except ImportError:
    raise SystemExit("❌ Instale o requests: pip install requests")

# ─── Config ──────────────────────────────────────────────────────────────────
BASE_URL   = "https://api.coingecko.com/api/v3"
PER_PAGE   = 100    # máx por request na tier gratuita
DELAY_PAGE = 6.0    # segundos entre páginas de mercado
DELAY_HIST = 3.0    # segundos entre requests de histórico
HIST_MAX   = "max"  # histórico completo na primeira vez

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
            r = requests.get(url, params=params, timeout=30,
                             headers={"Accept": "application/json"})
            if r.status_code == 429:
                wait = int(r.headers.get("Retry-After", 60))
                log.warning(f"Rate limit! Aguardando {wait}s...")
                time.sleep(wait)
                continue
            r.raise_for_status()
            return r.json()
        except requests.RequestException as e:
            log.warning(f"Tentativa {attempt}/{retries} falhou: {e}")
            if attempt < retries:
                time.sleep(15 * attempt)
    raise RuntimeError(f"Falha após {retries} tentativas: {url}")


def save_json(path: Path, data: dict | list):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    log.info(f"  💾 {path}  ({path.stat().st_size // 1024}KB)")


def parse_api_history(data: dict) -> list:
    """
    Converte resposta do endpoint market_chart em lista de dicts por dia.
    Retorna: [{"date": "2020-01-01", "close": 7200.0, "volume": 12345678}, ...]
    """
    prices  = data.get("prices", [])
    volumes = data.get("total_volumes", [])

    vol_map = {
        datetime.fromtimestamp(ts / 1000, tz=timezone.utc).strftime("%Y-%m-%d"): v
        for ts, v in volumes
    }

    history = []
    prev_close = None
    for ts, price in prices:
        date = datetime.fromtimestamp(ts / 1000, tz=timezone.utc).strftime("%Y-%m-%d")
        entry = {"date": date, "close": round(price, 8)}
        vol = vol_map.get(date)
        if vol is not None:
            entry["volume"] = round(vol, 0)
        if prev_close is not None:
            entry["open"] = prev_close  # open ≈ close do dia anterior
        history.append(entry)
        prev_close = round(price, 8)

    return history


# ─── Etapa 1: Mercado ────────────────────────────────────────────────────────
def fetch_market(top: int) -> list:
    """Busca dados de mercado das top N criptos."""
    coins = []
    pages = -(-top // PER_PAGE)  # ceil division

    for page in range(1, pages + 1):
        log.info(f"  📄 Mercado — página {page}/{pages}")
        data = get(f"{BASE_URL}/coins/markets", params={
            "vs_currency":             "usd",
            "order":                   "market_cap_desc",
            "per_page":                PER_PAGE,
            "page":                    page,
            "sparkline":               "false",
            "price_change_percentage": "24h,7d,30d,1y",
            "locale":                  "pt",
        })
        existing_ids = {c["id"] for c in coins}
        coins += [c for c in data if c["id"] not in existing_ids]
        if page < pages:
            time.sleep(DELAY_PAGE)

    return coins[:top]


# ─── Etapa 2: Detalhes ───────────────────────────────────────────────────────
def fetch_details_batch(coin_ids: list) -> dict:
    """Busca detalhes completos de cada moeda (1 request por moeda)."""
    details = {}
    total = len(coin_ids)
    for i, cid in enumerate(coin_ids, 1):
        log.info(f"  🔍 Detalhes {i}/{total}: {cid}")
        try:
            d = get(f"{BASE_URL}/coins/{cid}", params={
                "localization":   "false",
                "tickers":        "false",
                "market_data":    "true",
                "community_data": "false",
                "developer_data": "false",
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
                    "homepage":   (d.get("links", {}).get("homepage") or [""])[0],
                    "twitter":    d.get("links", {}).get("twitter_screen_name", ""),
                    "github":     ((d.get("links", {}).get("repos_url") or {}).get("github") or [""])[0],
                    "whitepaper": d.get("links", {}).get("whitepaper", ""),
                },
                "ath":                md.get("ath", {}).get("usd"),
                "ath_date":           (md.get("ath_date") or {}).get("usd", ""),
                "atl":                md.get("atl", {}).get("usd"),
                "atl_date":           (md.get("atl_date") or {}).get("usd", ""),
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


# ─── Etapa 3: Histórico incremental ──────────────────────────────────────────
def update_history(coin_id: str, fpath: Path, now_str: str) -> bool:
    """
    Lógica incremental:
      - Arquivo não existe → baixa histórico COMPLETO (max) e salva
      - Arquivo existe     → verifica último dia salvo, baixa só o que falta
                             e ANEXA ao histórico existente

    Retorna True se sucesso, False se falhou.
    """
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # ── Caso 1: arquivo não existe → histórico completo ──────────────────────
    if not fpath.exists():
        log.info(f"    🆕 Novo arquivo — baixando histórico completo (max)...")
        try:
            data = get(f"{BASE_URL}/coins/{coin_id}/market_chart", params={
                "vs_currency": "usd",
                "days":        HIST_MAX,
                "interval":    "daily",
            })
            history = parse_api_history(data)
            save_json(fpath, {
                "id":         coin_id,
                "updated_at": now_str,
                "history":    history,
            })
            log.info(f"    ✅ {len(history)} dias salvos (histórico completo)")
            return True
        except Exception as e:
            log.warning(f"    ⚠️ Falha ao baixar histórico completo de {coin_id}: {e}")
            return False

    # ── Caso 2: arquivo existe → verifica o que falta ────────────────────────
    try:
        existing = json.loads(fpath.read_text())
        old_history = existing.get("history", [])
    except Exception as e:
        log.warning(f"    ⚠️ Erro ao ler arquivo existente de {coin_id}: {e}")
        old_history = []

    # Descobre o último dia que já temos
    if old_history:
        last_date = old_history[-1]["date"]
    else:
        last_date = None

    # Se já está atualizado hoje, pula
    if last_date == today:
        log.info(f"    ⏭️  Já atualizado hoje ({today}), pulando")
        return True

    # Calcula quantos dias faltam desde o último dado
    if last_date:
        last_dt   = datetime.strptime(last_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        today_dt  = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        days_missing = (today_dt - last_dt).days
    else:
        days_missing = 365  # fallback se histórico vazio

    if days_missing <= 0:
        log.info(f"    ⏭️  Nenhum dia novo para baixar")
        return True

    log.info(f"    📅 Último dado: {last_date} — baixando {days_missing} dias novos...")

    try:
        data = get(f"{BASE_URL}/coins/{coin_id}/market_chart", params={
            "vs_currency": "usd",
            "days":        days_missing + 1,  # +1 para garantir sobreposição
            "interval":    "daily",
        })
        new_history = parse_api_history(data)
    except Exception as e:
        log.warning(f"    ⚠️ Falha ao baixar dias novos de {coin_id}: {e}")
        return False

    # Mescla: mantém dados antigos e appenda apenas dias realmente novos
    existing_dates = {entry["date"] for entry in old_history}
    to_append = [e for e in new_history if e["date"] not in existing_dates]

    if not to_append:
        log.info(f"    ⏭️  Nenhum dia novo para adicionar")
        # Atualiza updated_at mesmo assim
        existing["updated_at"] = now_str
        save_json(fpath, existing)
        return True

    merged = old_history + to_append
    # Garante ordenação por data (segurança)
    merged.sort(key=lambda x: x["date"])

    save_json(fpath, {
        "id":         coin_id,
        "updated_at": now_str,
        "history":    merged,
    })
    log.info(f"    ✅ +{len(to_append)} dias adicionados → total: {len(merged)} dias")
    return True


# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Atualiza dados offline de criptos (histórico incremental)")
    parser.add_argument("--top",          type=int, default=250,    help="Quantas criptos (padrão: 250)")
    parser.add_argument("--data-dir",     type=str, default="data", help="Pasta de dados (padrão: ./data)")
    parser.add_argument("--skip-history", action="store_true",      help="Pula histórico (só atualiza mercado)")
    parser.add_argument("--details-top",  type=int, default=50,     help="Detalhes completos das top N (padrão: 50)")
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
            "id":         c["id"],
            "symbol":     c["symbol"],
            "name":       c["name"],
            "image":      c.get("image", ""),
            "rank":       c.get("market_cap_rank"),
            "price":      c.get("current_price"),
            "market_cap": c.get("market_cap"),
            "volume_24h": c.get("total_volume"),
            "high_24h":   c.get("high_24h"),
            "low_24h":    c.get("low_24h"),
            "chg_24h":    c.get("price_change_percentage_24h"),
            "chg_7d":     c.get("price_change_percentage_7d_in_currency"),
            "chg_30d":    c.get("price_change_percentage_30d_in_currency"),
            "chg_1y":     c.get("price_change_percentage_1y_in_currency"),
            "supply":     c.get("circulating_supply"),
        }
        if c["id"] in details:
            d = details[c["id"]]
            entry.update({
                "ath":          d.get("ath"),
                "ath_date":     d.get("ath_date"),
                "atl":          d.get("atl"),
                "atl_date":     d.get("atl_date"),
                "total_supply": d.get("total_supply"),
                "description":  d.get("description", ""),
                "categories":   d.get("categories", []),
                "links":        d.get("links", {}),
                "sentiment_up": d.get("sentiment_up"),
                "score":        d.get("coingecko_score"),
            })
        market_out.append(entry)

    save_json(data_dir / "cripto_market.json", {
        "updated_at": now_str,
        "total":      len(market_out),
        "coins":      market_out,
    })

    # ── 4. Histórico incremental por moeda ────────────────────────────────────
    if not args.skip_history:
        log.info(f"📈 Atualizando histórico de {len(coins)} moedas (modo incremental)...")
        ok, skip, fail = 0, 0, 0

        for i, c in enumerate(coins, 1):
            cid   = c["id"]
            fpath = hist_dir / f"{cid}.json"
            is_new = not fpath.exists()

            log.info(f"  {'🆕' if is_new else '🔄'} [{i}/{len(coins)}] {cid}")

            success = update_history(cid, fpath, now_str)
            if success:
                ok += 1
            else:
                fail += 1

            # Delay maior para histórico completo (primeira vez) pois é request pesado
            if is_new:
                time.sleep(DELAY_HIST * 2)
            else:
                time.sleep(DELAY_HIST)

        log.info(f"  ✅ Histórico: {ok} ok, {fail} falhas")
    else:
        log.info("⏭️  Histórico pulado (--skip-history)")

    log.info(f"🏁 Concluído! Dados em ./{data_dir}/")
    log.info(f"   cripto_market.json         → {len(market_out)} moedas")
    log.info(f"   cripto_historico/{{id}}.json → histórico acumulado por moeda")


if __name__ == "__main__":
    main()
