"""
fetch_historico_us.py — Histórico mensal de ações americanas para o Simulador

Uso: python fetch_historico_us.py [us1|us2|us3|us4|us5]
     ou via variável de ambiente: GRUPO=us1 python fetch_historico_us.py

Modos:
  us1-us5: cada grupo processa ~1/5 dos tickers do stocks_us.json

Estratégia por ticker (NÃO é cascata — busca AMBAS as fontes e mergeia):
  1. Yahoo Finance (15 anos mensais) — busca sempre
  2. Massive API (2 anos mensais)   — busca sempre se tiver chave
  Ambos são mergeados com merge_historico() (nunca apaga dados existentes)

Massive endpoint:
  GET /v2/aggs/ticker/{ticker}/range/1/month/{from}/{to}?apiKey={key}
  Resposta: {"results": [{"t": timestamp_ms, "c": close, ...}]}

Tempo estimado por grupo de ~100 tickers:
  Yahoo: ~5 min | Massive: ~8 min (com 1 chave) ou ~2 min (com 5 chaves)
"""
import json, datetime, os, sys, time, requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_utils import merge_historico, fetch_yahoo_mensal

# ── Massive API Keys (rodízio) ────────────────────────────────────────────────
MASSIVE_KEYS = [k for k in [
    os.environ.get("MASSIVE_TOKEN_1", ""),
    os.environ.get("MASSIVE_TOKEN_2", ""),
    os.environ.get("MASSIVE_TOKEN_3", ""),
    os.environ.get("MASSIVE_TOKEN_4", ""),
    os.environ.get("MASSIVE_TOKEN_5", ""),
] if k]
_key_idx = 0

def next_key():
    global _key_idx
    if not MASSIVE_KEYS:
        return ""
    k = MASSIVE_KEYS[_key_idx % len(MASSIVE_KEYS)]
    _key_idx += 1
    return k

MASSIVE_BASE = "https://api.massive.com"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"}

# ── Tickers mínimos de fallback (caso stocks_us.json não exista ainda) ────────
FALLBACK_TICKERS = [
    "AAPL","MSFT","NVDA","GOOGL","META","AMZN","TSLA","AVGO","JPM","JNJ",
    "V","MA","XOM","WMT","UNH","LLY","PG","HD","CVX","MRK",
    "KO","PEP","ABBV","BAC","GS","MS","WFC","GE","CAT","BA",
    # REITs
    "PLD","AMT","EQIX","WELL","SPG","DLR","O","VTR","ARE","EQR","AVB","BXP",
]


def get_tickers():
    """
    Lê lista de tickers do stocks_us.json (gerado por fetch_stocks_us.py).
    Inclui apenas tickers que já têm preço (p > 0).
    """
    try:
        with open("data/stocks_us.json", encoding="utf-8") as f:
            data = json.load(f)
        tickers = [s["t"] for s in data.get("stocks", []) if (s.get("p") or 0) > 0]
        if tickers:
            print(f"  Lido {len(tickers)} tickers de data/stocks_us.json")
            return tickers
    except Exception as e:
        print(f"  Aviso: stocks_us.json não encontrado ({e})")
    print(f"  Usando fallback com {len(FALLBACK_TICKERS)} tickers")
    return FALLBACK_TICKERS


def fetch_massive_monthly(ticker, key, anos=2):
    """
    Busca histórico mensal via Massive API.
    Retorna lista de {date: 'YYYY-MM-DD', close: float}.
    """
    if not key:
        return []
    today = datetime.date.today()
    end_dt = today.strftime("%Y-%m-%d")
    start_dt = today.replace(year=today.year - anos).strftime("%Y-%m-%d")
    url = (f"{MASSIVE_BASE}/v2/aggs/ticker/{ticker}/range/1/month/"
           f"{start_dt}/{end_dt}?apiKey={key}")
    try:
        r = requests.get(url, headers=HEADERS, timeout=20)
        if r.status_code == 429:
            print(f" [massive rate-limit, aguardando 15s]", end="")
            time.sleep(15)
            return []
        if r.status_code not in (200, 206):
            return []
        results = r.json().get("results", [])
        pts = []
        for res in results:
            t_ms = res.get("t") or res.get("timestamp", 0)
            c = res.get("c") or res.get("close", 0)
            if t_ms and c:
                dt = datetime.datetime.fromtimestamp(
                    t_ms / 1000, tz=datetime.timezone.utc
                )
                pts.append({"date": dt.strftime("%Y-%m-%d"), "close": round(float(c), 2)})
        pts.sort(key=lambda x: x["date"])
        return pts
    except Exception as e:
        print(f" [massive erro: {e}]", end="")
        return []


def main():
    os.makedirs("data/historico", exist_ok=True)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
    print(f"=== fetch_historico_us.py — {now.strftime('%d/%m/%Y %H:%M')} ===")
    print(f"Chaves Massive: {len(MASSIVE_KEYS)}\n")

    # Determinar grupo: argumento CLI ou env var
    grupo = os.environ.get("GRUPO", "")
    if not grupo and len(sys.argv) > 1:
        grupo = sys.argv[1]
    if not grupo:
        grupo = "us1"
    grupo = grupo.lower().strip()

    if grupo not in ("us1", "us2", "us3", "us4", "us5"):
        print(f"Grupo inválido: '{grupo}'. Use us1, us2, us3, us4 ou us5.")
        sys.exit(1)

    # Obter lista completa e dividir em 5 grupos
    todos = get_tickers()
    n = len(todos)
    chunk = (n + 4) // 5  # teto da divisão
    grupos = {
        "us1": todos[0:chunk],
        "us2": todos[chunk:chunk * 2],
        "us3": todos[chunk * 2:chunk * 3],
        "us4": todos[chunk * 3:chunk * 4],
        "us5": todos[chunk * 4:],
    }
    tickers = grupos[grupo]
    print(f"Grupo {grupo}: {len(tickers)} tickers (de {n} totais)\n")

    if not tickers:
        print("Grupo vazio — nada a fazer.")
        return

    # Rate limiting Massive: 5 req/min por chave × N chaves
    massive_interval = max(0.2, 60.0 / (5 * max(1, len(MASSIVE_KEYS))))

    ok = 0
    for i, ticker in enumerate(tickers, 1):
        path = f"data/historico/{ticker}.json"
        print(f"[{i:3}/{len(tickers)}] {ticker:<8}", end=" ", flush=True)

        all_pts = []

        # ── 1. Yahoo Finance (15 anos mensais) ───────────────────────────────
        # Nota: yfinance aceita "BRK-B" diretamente (já convertido de BRK.B)
        yahoo_pts = fetch_yahoo_mensal(ticker, anos=15)
        if yahoo_pts:
            all_pts.extend(yahoo_pts)
            print(f"Yahoo:{len(yahoo_pts):3}pts", end=" ")
        else:
            print("Yahoo:  0pts", end=" ")

        # ── 2. Massive (2 anos mensais) — complementar, não cascata ─────────
        if MASSIVE_KEYS:
            key = next_key()
            massive_pts = fetch_massive_monthly(ticker, key, anos=2)
            if massive_pts:
                all_pts.extend(massive_pts)  # merge_historico deduplica por date
                print(f"Massive:{len(massive_pts):3}pts", end=" ")
            else:
                print("Massive:  0pts", end=" ")
            time.sleep(massive_interval)
        else:
            time.sleep(1.0)  # pausa mínima para não sobrecarregar Yahoo

        # ── 3. Merge incremental (nunca apaga dados existentes) ──────────────
        if all_pts:
            adicionados = merge_historico(path, ticker, all_pts)
            # Contar total de pontos no arquivo
            try:
                with open(path, encoding="utf-8") as f:
                    total_pts = len(json.load(f).get("history", []))
            except Exception:
                total_pts = len(all_pts)
            print(f"→ +{adicionados:3} novos (total: {total_pts})")
            ok += 1
        else:
            print("→ sem dados em nenhuma fonte")

    print(f"\n{'='*50}")
    print(f"✅ {grupo} concluído: {ok}/{len(tickers)} tickers com dados")


if __name__ == "__main__":
    main()
