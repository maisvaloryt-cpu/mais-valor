"""
fetch_dividendos_historico.py — Histórico de dividendos (merge incremental)

Fontes em CASCATA (primeira que retornar dados vence, por ticker):
  1. Brapi      (rodízio dos 5 tokens) — data-com + pagamento + tipo (recentes e ANUNCIADOS/futuros)
  2. StatusInvest (scraping)           — data-com + pagamento + tipo
  3. Yahoo                             — só data-ex (reserva, sem data-com)

Guarda por provento: {"com": data-com, "pag": data-pagamento, "value": valor, "tipo": tipo}
A data de pagamento futura permite mostrar pagamentos previstos. Nunca apaga dados existentes.
"""
import json, datetime, os, sys, time, requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "pt-BR,pt;q=0.9",
}

# ── Brapi tokens (rodízio) ────────────────────────────────────────────────────
BRAPI_TOKENS = [k for k in [os.environ.get(f"BRAPI_TOKEN_{i}", "") for i in range(1, 6)] if k]
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


def get_tickers():
    tickers = []
    for fname in ["data/fundamentus.json", "data/fiis_fundamentus.json"]:
        try:
            with open(fname) as f:
                d = json.load(f)
            key = "acoes" if "acoes" in d else "fiis"
            tickers.extend(list(d[key].keys()))
        except Exception:
            pass
    return list(dict.fromkeys(tickers))


def _carregar_tickers_fii():
    """[2026-07-26] A classificacao real de FII vem do PROPRIO
    fiis_fundamentus.json (a mesma fonte que o resto do site usa pra saber
    se um ticker e FII ou acao) -- NUNCA do sufixo "11" do ticker.

    Antes, fetch_statusinvest/fetch_fundamentus_prov decidiam "e FII?" so
    olhando se o ticker termina em "11". Isso quebra as Units (TAEE11,
    KLBN11, SANB11, ENGI11, ALUP11, SAPR11, BPAC11, BRBI11, IGTI11, BRGE11
    etc.) -- elas SAO ACOES (1 ON + N PN empacotadas), so tem o sufixo "11"
    por serem "units", e o Fundamentus nao tem essas cadastradas na pagina
    de FII (fii_proventos.php retorna vazio pra elas) -- ai a cascata caia
    pro Yahoo, que nunca preenche o campo 'tipo', e o pagamento nunca era
    confirmado (ver aplicar_reconstrucao_units() mais abaixo, que e o
    contorno pros dados JA salvos; esta funcao aqui corrige a fonte, pra
    nao acontecer de novo nas proximas buscas)."""
    try:
        with open("data/fiis_fundamentus.json") as f:
            return set(json.load(f).get("fiis", {}).keys())
    except Exception:
        return set()


TICKERS_FII = _carregar_tickers_fii()


def _norm_date(s):
    """Aceita 'YYYY-MM-DD' ou 'DD/MM/YYYY' (com hora opcional) → 'YYYY-MM-DD' ou ''."""
    if not s:
        return ""
    s = str(s).strip().replace("T", " ").split(" ")[0]
    for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.datetime.strptime(s[:10], fmt).strftime("%Y-%m-%d")
        except Exception:
            pass
    return ""


def _num(v):
    try:
        return round(float(str(v).replace(",", ".")), 6)
    except Exception:
        return None


# ── Fonte 1: Brapi (data-com = lastDatePrior, pagamento = paymentDate) ────────
def fetch_brapi(ticker):
    token = next_brapi_token()
    if not token:
        return []
    url = f"https://brapi.dev/api/quote/{ticker}?token={token}&dividends=true"
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        if r.status_code != 200:
            return []
        results = r.json().get("results", [])
        if not results:
            return []
        cash = (results[0].get("dividendsData") or {}).get("cashDividends") or []
        out = []
        for c in cash:
            com = _norm_date(c.get("lastDatePrior"))
            pag = _norm_date(c.get("paymentDate"))
            val = _num(c.get("rate"))
            tipo = (c.get("label") or c.get("relatedTo") or "").strip()
            if (com or pag) and val:
                out.append({"com": com, "pag": pag or com, "value": val, "tipo": tipo})
        return out
    except Exception:
        return []


# ── Fonte 2: StatusInvest (ed = data-com, pd = pagamento) ─────────────────────
def fetch_statusinvest(ticker):
    base = "fii" if ticker in TICKERS_FII else "acao"
    url = f"https://statusinvest.com.br/{base}/companytickerprovents?ticker={ticker}&chartProventsType=2"
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        if r.status_code != 200:
            return []
        data = r.json()
        arr = data.get("assetEarningsModels") or data.get("earningsModels") or []
        out = []
        for e in arr:
            com = _norm_date(e.get("ed"))
            pag = _norm_date(e.get("pd") or e.get("paymentDate"))
            val = _num(e.get("v") or e.get("value"))
            tipo = str(e.get("etd") or e.get("et") or "").strip()
            if (com or pag) and val:
                out.append({"com": com, "pag": pag or com, "value": val, "tipo": tipo})
        return out
    except Exception:
        return []


# ── Fonte 3: Yahoo (só data-ex, sem data-com) — reserva ───────────────────────
def fetch_yahoo(ticker):
    symbol = ticker + ".SA"
    end = int(datetime.datetime.now().timestamp())
    start = end - (10 * 365 * 24 * 3600)
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?period1={start}&period2={end}&interval=1d&events=dividends"
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        if r.status_code != 200:
            return []
        result = r.json().get("chart", {}).get("result", [])
        if not result:
            return []
        events = result[0].get("events", {}).get("dividends", {})
        out = []
        for ts, info in sorted(events.items()):
            dt = datetime.datetime.fromtimestamp(int(ts)).strftime("%Y-%m-%d")
            val = _num(info.get("amount", 0))
            if val:
                out.append({"com": "", "pag": dt, "value": val, "tipo": ""})
        return out
    except Exception:
        return []


def fetch_fundamentus_prov(ticker):
    """Fundamentus — proventos: data-com, valor, tipo, data de pagamento (inclui anunciados/futuros). Grátis."""
    base = "fii_proventos" if ticker in TICKERS_FII else "proventos"
    url = f"https://www.fundamentus.com.br/{base}.php?papel={ticker}&tipo=2"
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        if r.status_code != 200:
            return []
        r.encoding = "latin-1"
        import lxml.html
        tree = lxml.html.fromstring(r.text)
        out = []
        for tr in tree.xpath("//tr"):
            cells = [c.text_content().strip() for c in tr.xpath("./td")]
            if len(cells) < 3:
                continue
            datas = [d for d in (_norm_date(c) for c in cells) if d]
            nums = [n for n in (_num(c) for c in cells) if n]
            tipos = [c for c in cells if c and _num(c) is None and not _norm_date(c)]
            if not datas or not nums:
                continue
            com = datas[0]
            pag = datas[1] if len(datas) > 1 else datas[0]
            out.append({"com": com, "pag": pag, "value": nums[0], "tipo": (tipos[0] if tipos else "")})
        return out
    except Exception:
        return []


def get_dividendos(ticker):
    """[2026-07-26] Cascata completa: Fundamentus -> Brapi -> StatusInvest ->
    Yahoo (antes so tentava Fundamentus e Yahoo -- Brapi/StatusInvest ja
    existiam prontas no arquivo mas nunca eram chamadas). Isso ajuda tickers
    como AGCX11, onde o Fundamentus simplesmente nao tem a pagina de
    proventos cadastrada ("Nenhum provento encontrado") e a busca caia
    direto pro Yahoo (que nunca traz o campo 'tipo')."""
    for nome, fn in (("Fundamentus", fetch_fundamentus_prov), ("Brapi", fetch_brapi),
                     ("StatusInvest", fetch_statusinvest), ("Yahoo", fetch_yahoo)):
        try:
            divs = fn(ticker)
        except Exception:
            divs = []
        if divs:
            return divs, nome
    return [], "-"


def _normalize(d):
    """Converte qualquer entrada (formato antigo {date,value} ou novo) p/ o padrão."""
    if "pag" in d or "com" in d:
        return {"com": d.get("com", ""), "pag": d.get("pag", "") or d.get("date", ""),
                "value": d.get("value"), "tipo": d.get("tipo", "")}
    return {"com": "", "pag": d.get("date", ""), "value": d.get("value"), "tipo": ""}


def _key(d):
    return f"{d.get('com','')}|{d.get('pag','')}|{d.get('value','')}"


def _dedup_data_igual(lista):
    """[dedup na origem] O mesmo pagamento chega de fontes diferentes com pequenas
    variacoes de arredondamento (0.0845 vs 0.084538) ou com 'com' vazio numa fonte.
    Agrupa por data de pagamento e funde valores que diferem menos de 0,5%
    (ou R$0,001), mantendo a entrada mais completa (com data-com)."""
    out = []
    for d in sorted(lista, key=lambda x: (x.get("pag") or "", float(x.get("value") or 0))):
        try:
            v = float(d.get("value") or 0)
        except Exception:
            v = 0.0
        ant = out[-1] if out else None
        if ant is not None and ant.get("pag") == d.get("pag"):
            va = float(ant.get("value") or 0)
            if va > 0 and abs(v - va) <= max(0.001, va * 0.005):
                if d.get("com") and not ant.get("com"):
                    out[-1] = d  # mantem a versao mais completa
                continue
        out.append(d)
    return out


def _limpar_estimativas_superadas(lista):
    """[2026-07-26, revisado] O Fundamentus mostra, ANTES de um pagamento ser
    confirmado, uma previsao do valor que vai sendo revisada dia a dia (cada
    revisao chega com um 'pag' levemente diferente da anterior -- e pode ser
    MESES antes do pagamento real para tickers que pagam com pouca frequencia,
    tipo BBSE3 -- entao o _dedup_data_igual acima, que so funde MESMA data ou
    o agrupamento por MES, nao pega essas). Quando o pagamento e enfim
    confirmado, ele vem com 'tipo' preenchido (DIVIDENDO/JCP/RENDIMENTO/etc);
    as previsoes antigas (tipo='' e com='') NUNCA sao apagadas sozinhas, e
    ficam acumulando pra sempre (isso inflava o calendario de proventos, o DY
    e o div12m.json -- ex: MXRF11 mostrando 7 pagamentos em vez de 1 so em
    Junho/2026, BBSE3 mostrando 10 registros em vez de 4 reais).

    Regra (ticker inteiro, nao so o mes): um registro sem 'tipo' e a previsao
    de um pagamento que ainda sera confirmado. Se ja existe QUALQUER registro
    com tipo confirmado, com data de pagamento POSTERIOR a essa previsao, ela
    foi superada -> descarta. NUNCA descarta um registro COM tipo -- isso
    preserva pagamentos reais multiplos (ex: Dividendo + JCP juntos, ou 2
    parcelas de JCP). A previsao mais recente que ainda NAO foi superada por
    nenhum confirmado (ou seja, o proximo pagamento anunciado, ainda sem
    confirmacao) e sempre preservada -- ela alimenta a tela de "Proximos
    Pagamentos" do site (gerar_dividendos.py / dividendos.html), que precisa
    dela; so nao pode duplicar quando o pagamento real chegar, e e isso que
    esta regra garante.

    Trava de seguranca: se o ticker NUNCA tem 'tipo' preenchido em nenhum
    registro da sua historia toda (a fonte simplesmente nao traz esse campo
    pra alguns tickers, ex: TAEE11 -- 107 pagamentos reais, nenhum com tipo),
    nao mexe em nada. Sem 'tipo' nao ha como distinguir com seguranca
    estimativa de pagamento real, e o risco de apagar pagamentos reais e
    grande demais."""
    tipados = [d for d in lista if str(d.get("tipo") or "").strip()]
    if not tipados:
        return lista
    sem_tipo = [d for d in lista if not str(d.get("tipo") or "").strip()]
    ultima_confirmada = max((d.get("pag") or "") for d in tipados)
    sobras = [d for d in sem_tipo if (d.get("pag") or "") > ultima_confirmada]
    out = list(tipados)
    if sobras:
        out.append(max(sobras, key=lambda d: (d.get("pag") or "")))
    out.sort(key=lambda d: (d.get("pag") or d.get("com") or ""))
    return out


def _dedup(lista):
    """Limpeza completa: primeiro funde duplicatas de mesma data (fontes
    diferentes), depois remove previsoes ja superadas por um pagamento
    confirmado no mesmo mes. Ver _limpar_estimativas_superadas."""
    return _limpar_estimativas_superadas(_dedup_data_igual(lista))


def merge_dividendos(path, ticker, novos):
    """Merge incremental (chave = com|pag|valor). Nunca apaga; normaliza o formato antigo."""
    existente = []
    if os.path.exists(path):
        try:
            with open(path) as f:
                existente = json.load(f).get("dividendos", [])
        except Exception:
            existente = []
    existente = [_normalize(d) for d in existente]
    seen = {_key(d) for d in existente}
    adicionados = [d for d in novos if _key(d) not in seen]
    merged = _dedup(sorted(existente + adicionados, key=lambda x: (x.get("pag") or x.get("com") or "")))
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3))).strftime("%d/%m/%Y %H:%M")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump({"ticker": ticker, "dividendos": merged, "updated_at": now}, f)
    return len(adicionados)


def main():
    os.makedirs("data/dividendos", exist_ok=True)
    tickers = get_tickers()
    print(f"Buscando dividendos de {len(tickers)} ativos...")
    print(f"Brapi tokens disponiveis: {len(BRAPI_TOKENS)}\n")
    ok = novos_total = 0
    por_fonte = {"Brapi": 0, "StatusInvest": 0, "Yahoo": 0, "-": 0}
    for i, ticker in enumerate(tickers):
        path = f"data/dividendos/{ticker}.json"
        print(f"[{i+1}/{len(tickers)}] {ticker}...", end=" ", flush=True)
        divs, fonte = get_dividendos(ticker)
        por_fonte[fonte] = por_fonte.get(fonte, 0) + 1
        if not divs:
            print("sem dados")
            time.sleep(0.25)
            continue
        adicionados = merge_dividendos(path, ticker, divs)
        if adicionados > 0:
            print(f"{fonte}: +{adicionados} pagamentos")
            novos_total += adicionados
        else:
            print(f"{fonte}: ja atualizado")
        ok += 1
        time.sleep(0.25)
    print(f"\nConcluido! {ok}/{len(tickers)} ativos, {novos_total} pagamentos novos")
    print(f"Fontes usadas: {por_fonte}")

    # Units (TAEE11, KLBN11 etc.): reconstroi o historico a partir das acoes
    # ON+PN (que tem 'tipo' confirmado), porque a fonte do Fundamentus pra
    # ticker terminado em "11" trata como FII e nunca confirma essas.
    aplicar_reconstrucao_units()

    # div12m.json: soma REAL dos proventos por acao nos ultimos 12 meses (base do
    # preco-teto de Bazin no site — substitui a estimativa DY x preco).
    gerar_div12m()


# Units cuja fonte do Fundamentus nunca confirma 'tipo' (ticker terminado em
# "11" tratado como FII, mesmo sendo uma Unit de acao ON+PN). Composicao
# verificada em fontes oficiais/B3 em 2026-07-26. Faltam confirmar: BRBI11,
# IGTI11, BRGE11, MRSA3B -- nao mexer nelas ainda.
COMPOSICAO_UNITS = {
    "TAEE11": ("TAEE3", 1, "TAEE4", 2),
    "KLBN11": ("KLBN3", 1, "KLBN4", 4),
    "SANB11": ("SANB3", 1, "SANB4", 1),
    "ENGI11": ("ENGI3", 1, "ENGI4", 4),
    "ALUP11": ("ALUP3", 1, "ALUP4", 2),
    "SAPR11": ("SAPR3", 1, "SAPR4", 4),
    "BPAC11": ("BPAC3", 1, "BPAC5", 2),
}


def _carregar_divs_ticker(ticker):
    path = f"data/dividendos/{ticker}.json"
    if not os.path.exists(path):
        return []
    try:
        with open(path) as f:
            divs = json.load(f).get("dividendos", [])
    except Exception:
        return []
    return _dedup([_normalize(d) for d in divs])


def reconstruir_unit(on_ticker, on_ratio, pn_ticker, pn_ratio):
    """Monta o historico da Unit = on_ratio x acao ON + pn_ratio x acao PN,
    casando pela data de pagamento (as duas classes normalmente pagam no
    mesmo evento societario, so que com valor por acao diferente)."""
    on_divs = {d.get("pag"): d for d in _carregar_divs_ticker(on_ticker) if d.get("pag")}
    pn_divs = {d.get("pag"): d for d in _carregar_divs_ticker(pn_ticker) if d.get("pag")}
    datas = sorted(set(on_divs) | set(pn_divs))
    out = []
    for pag in datas:
        do = on_divs.get(pag)
        dp = pn_divs.get(pag)
        vo = float(do.get("value") or 0) if do else 0.0
        vp = float(dp.get("value") or 0) if dp else 0.0
        valor = on_ratio * vo + pn_ratio * vp
        if valor <= 0:
            continue
        tipo_o = str(do.get("tipo") or "").strip() if do else ""
        tipo_p = str(dp.get("tipo") or "").strip() if dp else ""
        tipos = [t for t in (tipo_o, tipo_p) if t]
        tipo = "/".join(dict.fromkeys(tipos))
        com = (do or {}).get("com") or (dp or {}).get("com") or ""
        out.append({"com": com, "pag": pag, "value": round(valor, 6), "tipo": tipo})
    return out


def aplicar_reconstrucao_units():
    """[2026-07-26] BACKUP, nao a fonte principal. Desde que TICKERS_FII
    corrigiu a classificacao (ver acima), a busca direta dessas Units ja
    deve trazer pagamento confirmado de verdade direto do Fundamentus. Essa
    funcao SO reconstroi (e so sobrescreve o arquivo) se, apos a busca
    normal deste ciclo, o ticker da Unit AINDA nao tiver nenhum registro
    confirmado (tipo preenchido) -- ou seja, so entra em acao se a busca
    direta falhar por algum motivo (Fundamentus fora do ar, mudou o layout
    da pagina, etc.). Quando a busca direta volta a funcionar, essa funcao
    para de mexer no arquivo sozinha -- confia no dado real, que e mais
    completo e preciso que a reconstrucao ON+PN."""
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3))).strftime("%d/%m/%Y %H:%M")
    for unit, (on_t, on_r, pn_t, pn_r) in COMPOSICAO_UNITS.items():
        atual = _carregar_divs_ticker(unit)
        ja_confirmado = any(str(d.get("tipo") or "").strip() for d in atual)
        if ja_confirmado:
            print(f"{unit}: busca direta ja confirmou pagamento real -- reconstrucao NAO usada")
            continue
        reconstruido = reconstruir_unit(on_t, on_r, pn_t, pn_r)
        if not reconstruido:
            continue
        path = f"data/dividendos/{unit}.json"
        with open(path, "w") as f:
            json.dump({"ticker": unit, "dividendos": reconstruido, "updated_at": now,
                       "fonte": f"calculado ({on_r}x{on_t} + {pn_r}x{pn_t}) -- backup, busca direta falhou"}, f, ensure_ascii=False)
        print(f"{unit}: SEM confirmacao direta -- usando backup reconstruido de {on_t}+{pn_t} ({len(reconstruido)} pagamentos)")


def gerar_div12m():
    """[2026-07-26, revisado] Antes somava TODO registro (confirmado ou nao)
    com 'pag' nos ultimos 365 dias -- uma estimativa nao-confirmada errada
    (ex: XPHT11 com R$127,70 de estimativa quando o normal dele e ~R$1,37)
    inflava o DY/preco-teto igual se fosse pagamento real.

    Regra nova: conta pro total dos 12 meses SO pagamento CONFIRMADO (tipo
    preenchido) -- estimativa nunca conta pro DY, porque e um valor que ainda
    nao foi de fato pago.

    Trava de seguranca: se o ticker NUNCA tem nenhum registro confirmado em
    toda sua historia (normalmente Units ainda sem reconstrucao -- ver
    aplicar_reconstrucao_units, que roda antes desta funcao no main()),
    mantem o comportamento antigo pra esse ticker (soma tudo) -- e melhor
    mostrar uma estimativa do que zerar o DY dele de repente."""
    hoje = datetime.date.today()
    corte = (hoje - datetime.timedelta(days=365)).isoformat()
    out = {}
    for arq in os.listdir("data/dividendos"):
        if not arq.endswith(".json"):
            continue
        try:
            with open(f"data/dividendos/{arq}") as fh:
                divs = json.load(fh).get("dividendos", [])
        except Exception:
            continue
        tk = arq[:-5]
        limpo = _dedup([_normalize(x) for x in divs])
        tipados = [d for d in limpo if str(d.get("tipo") or "").strip()]
        fonte = tipados if tipados else limpo  # trava de seguranca
        total = 0.0
        for d in fonte:
            pag = d.get("pag") or d.get("com") or ""
            try:
                v = float(d.get("value") or 0)
            except Exception:
                v = 0.0
            if pag >= corte and v > 0:
                total += v
        if total > 0:
            out[tk] = round(total, 6)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3))).strftime("%d/%m/%Y %H:%M")
    with open("data/div12m.json", "w") as fh:
        json.dump({"updated_at": now, "div12m": out}, fh)
    print(f"div12m.json: {len(out)} tickers com proventos em 12m")


if __name__ == "__main__":
    main()
