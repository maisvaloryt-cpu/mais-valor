#!/usr/bin/env python3
"""
fetch_fundamentalistas.py
=========================
Busca dados fundamentalistas de ações e FIIs em modo rotativo.
Combina BolsaI (27 indicadores) + Fundamentus (complemento) + CVM (FIIs).

Lógica rotativa:
  - Lista todos os tickers do site (data.js ou lista hardcoded)
  - Divide em grupos de 180 (deixa 20 req de margem do limite de 200)
  - Cada dia processa o grupo seguinte (grupo salvo em data/fundamentalistas/_estado.json)
  - Salva em data/fundamentalistas/TICKER.json (nunca apaga dados antigos)

Uso:
  python fetch_fundamentalistas.py              # processa grupo do dia
  python fetch_fundamentalistas.py --ticker PETR4  # força ticker específico
  python fetch_fundamentalistas.py --reset     # reinicia do grupo 0
"""

import json, time, argparse, logging, os, sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import requests
except ImportError:
    raise SystemExit("pip install requests")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
BOLSAI_KEY   = os.environ.get("BOLSAI_KEY", "")
BOLSAI_BASE  = "https://api.usebolsai.com/api/v1"
FUND_BASE    = "https://fundamentus.com.br/resultado.php"
OUT_DIR      = Path("data/fundamentalistas")
ESTADO_FILE  = OUT_DIR / "_estado.json"
GRUPO_SIZE   = 130   # detalhe.php por dia (rodízio) — evita bloqueio do Fundamentus
DELAY        = 0.4   # segundos entre requests do BolsaI
FUND_DELAY   = 1.5   # pausa educada entre requests do detalhe.php do Fundamentus

HEADERS_BOLSAI = {"X-API-Key": BOLSAI_KEY, "Accept": "application/json"}
HEADERS_FUND   = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    "Referer": "https://fundamentus.com.br/",
}

# ── Lista de todos os tickers do site ─────────────────────────────────────────
# Ações + FIIs — mesma lista do fetch_fundamentus.py e fetch_fiis_fundamentus.py
ACOES = [
    "ABEV3","AERI3","AESB3","AGRO3","ALPA4","ALUP11","AMAR3","AMBP3","AMER3",
    "ANIM3","ARML3","ARZZ3","ASAI3","AZUL4","B3SA3","BBAS3","BBDC3","BBDC4",
    "BBSE3","BEEF3","BFIN3","BHIA3","BMGB4","BPAC11","BPAN4","BRAP4","BRFS3",
    "BRKM5","BRML3","BRSR6","BTOW3","CAML3","CASH3","CBAV3","CCRO3","CEAB3",
    "CIEL3","CLSA3","CMIG4","CMIN3","COGN3","CPFE3","CPLE6","CRFB3","CSAN3",
    "CSMG3","CSNA3","CVCB3","CXSE3","CYRE3","DEXP3","DIRR3","DXCO3","ECOR3",
    "EGIE3","ELET3","ELET6","EMBR3","ENAT3","ENEV3","ENGI11","EQTL3","ESPA3",
    "EVEN3","EZTC3","FESA4","FLRY3","FRAS3","GBIO33","GGBR4","GOAU4","GOLL4",
    "GRND3","GUAR3","HAPV3","HBSA3","HYPE3","IFCM3","IGTI11","INTB3","IRBR3",
    "ITSA4","ITUB4","JBSS3","JHSF3","JSLG3","KEPL3","KLBN11","LCAM3","LEVE3",
    "LIGT3","LINX3","LJQQ3","LREN3","LWSA3","MATD3","MBLY3","MDIA3","MEGA3",
    "MGLU3","MILS3","MLAS3","MOVI3","MRFG3","MRVE3","MULT3","MYPK3","NATU3",
    "NEOE3","NGRD3","ODPV3","OGXP3","OMGE3","ONCO3","ORVR3","PCAR3","PETR3",
    "PETR4","PETZ3","PLPL3","POMO4","PORT3","POSI3","PPLA11","PRIO3","PSSA3",
    "PTBL3","QUAL3","RADL3","RAIL3","RAIZ4","RAPT4","RCSL4","RDOR3","RECV3",
    "RENT3","RRRP3","SANB11","SAPR11","SBFG3","SEER3","SEQL3","SIMH3","SLCE3",
    "SMFT3","SMTO3","SOMA3","SQIA3","STBP3","SUZB3","TAEE11","TEND3","TGMA3",
    "TIMS3","TOTS3","TRPL4","TUPY3","UGPA3","UNIP6","USIM5","VALE3","VAMO3",
    "VBBR3","VIVT3","VLID3","VLIT3","VULC3","WEGE3","WIZC3","YDUQ3","ZAMP3",
]

FIIS = [
    "AFHI11","AIEC11","ALZR11","ARCT11","ARRI11","BCFF11","BCRI11","BCIA11",
    "BPFF11","BRCO11","BRCR11","BRIP11","BTCI11","BTCR11","BTLG11","BTRA11",
    "CACR11","CPTS11","CVBI11","DEVA11","DRII11","DUDE11","EDGA11","ELDO11",
    "EURO11","FEXC11","FGAA11","FIIB11","FIIP11","FINF11","FIVN11","FLCR11",
    "FLMA11","FMOF11","FNOR11","FOFT11","FVPQ11","GALG11","GCRA11","GLOG11",
    "GZIT11","HABT11","HCRI11","HFOF11","HGBS11","HGCR11","HGLG11","HGPO11",
    "HGRE11","HGRU11","HGSG11","HGSS11","HINV11","HSLG11","HTMX11","HUSI11",
    "IRDM11","ITIP11","ITRI11","IVVB11","JFLL11","JSAF11","JSRE11","KISU11",
    "KNHF11","KNIP11","KNRE11","KNRI11","KORE11","LASC11","LGCP11","LOFT11",
    "LSPA11","LVBI11","MALL11","MAXR11","MBRF11","MGFF11","MGHT11","MXRF11",
    "NEWL11","NPAR11","NSLU11","OUFF11","PATC11","PATL11","PCES11","PDMV11",
    "PLOG11","PLRI11","PORD11","PVBI11","QAGR11","QIFF11","RBCO11","RBHG11",
    "RBHY11","RBLC11","RBRD11","RBRF11","RBRL11","RBRP11","RBRR11","RBRS11",
    "RBVA11","RBVO11","RCFA11","RCRB11","RECR11","REIT11","RELG11","RFOF11",
    "RNDP11","RNGO11","RZAG11","RZAK11","RZAT11","RZTR11","SARE11","SDIL11",
    "SMC11","SNAG11","SNCI11","SPAF11","SPTW11","STRX11","TGAR11","TFOF11",
    "TORD11","TOUR11","TRBL11","TRXF11","TSX11","UBSR11","VCJR11","VCRA11",
    "VGIP11","VGIR11","VISC11","VOTS11","VPSI11","VRTA11","VSHO11","VTLT11",
    "VVAR11","VVPR11","XPCA11","XPCI11","XPCO11","XPIN11","XPLG11","XPML11",
    "XPPR11","XPSF11","XPVG11","YVRA11",
]

def _load_site_tickers():
    """Lê ações e FIIs direto do cotacoes.json (fonte do site).
    Assim cobre TODOS os ativos e nunca desatualiza. Fallback: listas fixas."""
    try:
        with open("data/cotacoes.json", encoding="utf-8") as f:
            cot = json.load(f)
        ac = [a["ticker"] for a in cot.get("acoes", []) if a.get("ticker")]
        fi = [a["ticker"] for a in cot.get("fiis", []) if a.get("ticker")]
        if ac or fi:
            return ac, fi
    except Exception:
        pass
    return ACOES, FIIS


ACOES_SITE, FIIS_SITE = _load_site_tickers()
ALL_TICKERS = ACOES_SITE + FIIS_SITE
FII_SET     = set(FIIS_SITE)

OUT_DIR.mkdir(parents=True, exist_ok=True)


# ── Helpers ───────────────────────────────────────────────────────────────────
_BOLSAI_OFF = False   # vira True no 1º 429 → não insiste mais no BolsaI nesta rodada

def get_bolsai(path: str) -> dict | None:
    global _BOLSAI_OFF
    if not BOLSAI_KEY or _BOLSAI_OFF:
        return None
    try:
        r = requests.get(f"{BOLSAI_BASE}{path}", headers=HEADERS_BOLSAI, timeout=15)
        if r.status_code == 429:
            if not _BOLSAI_OFF:
                log.warning("BolsaI: limite diário atingido (429) — desligando BolsaI nesta rodada")
            _BOLSAI_OFF = True
            return None
        if r.status_code == 404:
            return None
        r.raise_for_status()
        return r.json()
    except Exception as e:
        log.warning(f"BolsaI {path}: {e}")
        return None


def _fundamentus_tree(ticker: str):
    """Baixa o detalhes.php do Fundamentus (ISO-8859-1) e devolve (arvore, pares)."""
    r = requests.get(
        f"https://fundamentus.com.br/detalhes.php?papel={ticker}",
        headers=HEADERS_FUND, timeout=8
    )
    if not r.ok:
        return None, {}
    r.encoding = "latin-1"   # Fundamentus é ISO-8859-1 (acentos)
    import lxml.html, re
    tree = lxml.html.fromstring(r.text)

    def norm(s):
        return re.sub(r"\s+", " ", s.replace("?", "").strip())

    pares = {}
    for tr in tree.xpath("//tr"):
        cels = [norm(c.text_content()) for c in tr.xpath("./td")]
        for i in range(0, len(cels) - 1, 2):
            lab, val = cels[i], cels[i + 1]
            if lab and val:
                pares.setdefault(lab, val)   # 1a ocorrência (ex.: Receita 12m antes de 3m)
    return tree, pares


def _map_pares(pares: dict, mapa) -> dict:
    """Aplica um mapa [(rótulo, chave)] ignorando vazios e traços."""
    out = {}
    for lab, key in mapa:
        v = pares.get(lab)
        if v and v not in ("-", "--"):
            out[key] = v
    return out


def _oscilacoes(pares: dict) -> dict:
    osc = {}
    for lab in ["Dia", "Mês", "30 dias", "12 meses",
                "2026", "2025", "2024", "2023", "2022", "2021", "2020"]:
        v = pares.get(lab)
        if v and v not in ("-", "--"):
            osc[lab] = v
    return osc


# Rótulos exatos do Fundamentus (detalhes.php) → chave usada no site (AÇÃO)
_MAP_ACAO = [
    ("Setor", "setor"), ("Subsetor", "subsetor"),
    ("Valor de mercado", "market_cap"), ("Valor da firma", "valor_firma"),
    ("Nro. Ações", "nro_acoes"), ("Últ balanço processado", "ult_balanco"),
    ("P/L", "pl"), ("P/VP", "pvp"), ("P/EBIT", "p_ebit"), ("PSR", "psr"),
    ("P/Ativos", "p_ativos"), ("P/Cap. Giro", "p_cap_giro"), ("P/Ativ Circ Liq", "p_ativ_circ_liq"),
    ("Div. Yield", "dy"), ("EV / EBITDA", "ev_ebitda"), ("EV / EBIT", "ev_ebit"),
    ("Cres. Rec (5a)", "cagr_rec_5a"), ("LPA", "lpa"), ("VPA", "vpa"),
    ("Marg. Bruta", "mrg_bruta"), ("Marg. EBIT", "mrg_ebit"), ("Marg. Líquida", "mrg_liq"),
    ("EBIT / Ativo", "ebit_ativo"), ("ROIC", "roic"), ("ROE", "roe"),
    ("Liquidez Corr", "liq_corrente"), ("Dív Líq / Patrim", "div_liq_patrim"),
    ("Giro Ativos", "giro_ativos"),
    ("Ativo", "ativo"), ("Disponibilidades", "disponibilidades"), ("Ativo Circulante", "ativo_circ"),
    ("Dív. Bruta", "div_bruta"), ("Dív. Líquida", "div_liquida"), ("Patrim. Líq", "patrim_liq"),
    ("Receita Líquida", "receita_liq"), ("EBIT", "ebit"), ("Lucro Líquido", "lucro_liq"),
]

# Rótulos exatos do Fundamentus (detalhes.php) → chave usada no site (FII)
_MAP_FII = [
    ("Segmento", "segmento"), ("Gestão", "tipo_gestao"), ("Mandato", "mandato"),
    ("Valor de mercado", "market_cap"), ("Nro. Cotas", "cotas_emitidas"),
    ("Últ Info Trimestral", "ult_balanco"),
    ("FFO Yield", "ffo_yield"), ("Div. Yield", "dy"), ("P/VP", "pvp"),
    ("FFO/Cota", "ffo_cota"), ("Dividendo/cota", "ultimo_rend"), ("VP/Cota", "patrimonio_cota"),
    ("Receita", "receita"), ("Venda de ativos", "venda_ativos"), ("FFO", "ffo"),
    ("Rend. Distribuído", "rend_distribuido"),
    ("Ativos", "ativo"), ("Patrim Líquido", "patrim_liq"),
    ("Qtd imóveis", "qtd_imoveis"), ("Cap Rate", "cap_rate"),
    ("Vacância Média", "vacancia"), ("Imóveis/PL do FII", "imoveis_pl"),
]


def get_fundamentus_acao(ticker: str) -> dict:
    """Fundamentus (AÇÃO): indicadores, balanço, resultados e oscilações.
    Fonte principal — não depende do limite diário do BolsaI."""
    try:
        _, pares = _fundamentus_tree(ticker)
        if not pares:
            return {}
        out = _map_pares(pares, _MAP_ACAO)
        osc = _oscilacoes(pares)
        if osc:
            out["oscilacoes"] = osc
        return out
    except Exception:
        return {}


def get_fundamentus_fii(ticker: str) -> dict:
    """Fundamentus (FII): P/VP, DY, VP/Cota, patrimônio, resultados, imóveis e oscilações."""
    try:
        _, pares = _fundamentus_tree(ticker)
        if not pares:
            return {}
        out = _map_pares(pares, _MAP_FII)
        osc = _oscilacoes(pares)
        if osc:
            out["oscilacoes"] = osc
        return out
    except Exception:
        return {}


def merge_json(path: Path, new_data: dict):
    """Carrega JSON existente, mescla campos novos e salva."""
    existing = {}
    if path.exists():
        try:
            existing = json.loads(path.read_text())
        except Exception:
            existing = {}
    # Campos novos sobrescrevem os antigos; campos antigos são preservados se não vieram agora
    existing.update(new_data)
    existing["_updated_at"] = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC")
    path.write_text(json.dumps(existing, ensure_ascii=False, separators=(",", ":")))


def load_estado() -> dict:
    if ESTADO_FILE.exists():
        try:
            return json.loads(ESTADO_FILE.read_text())
        except Exception:
            pass
    return {"grupo": 0}


def save_estado(estado: dict):
    ESTADO_FILE.write_text(json.dumps(estado))


# ── Processamento de um ticker ────────────────────────────────────────────────
def _upd(data: dict, novos: dict):
    """Atualiza só com valores reais (ignora None/''), pra não apagar o Fundamentus."""
    data.update({k: v for k, v in novos.items() if v not in (None, "")})


def _pace_bolsai():
    """Só espera entre chamadas do BolsaI enquanto ele estiver ativo (não perde tempo depois do 429)."""
    if not _BOLSAI_OFF:
        time.sleep(DELAY)


def processar_acao(ticker: str) -> bool:
    log.info(f"  {ticker} (ação)...")
    data = {"ticker": ticker, "tipo": "acao"}

    # 0. Fundamentus — fonte principal (não depende do limite diário do BolsaI)
    data.update(get_fundamentus_acao(ticker))
    time.sleep(FUND_DELAY)

    # 1. BolsaI — empresa (CNPJ, setor, cidade)
    company = get_bolsai(f"/companies/{ticker}")
    if company:
        _upd(data, {
            "razao_social": company.get("corporate_name"),
            "nome":         company.get("trade_name"),
            "cnpj":         company.get("cnpj"),
            "setor":        company.get("sector"),
            "estado":       company.get("state"),
            "cidade":       company.get("city"),
            "website":      company.get("website"),
            "cvm_code":     company.get("cvm_code"),
        })
    _pace_bolsai()

    # 2. BolsaI — fundamentals (27 indicadores) — só sobrescreve com valor real
    fund = get_bolsai(f"/fundamentals/{ticker}")
    if fund:
        _upd(data, {
            "pl":              fund.get("pe_ratio"),
            "pvp":             fund.get("pb_ratio"),
            "psr":             fund.get("ps_ratio"),
            "ev_ebitda":       fund.get("ev_ebitda"),
            "ev_ebit":         fund.get("ev_ebit"),
            "p_ebitda":        fund.get("p_ebitda"),
            "p_ebit":          fund.get("p_ebit"),
            "roe":             fund.get("roe"),
            "roa":             fund.get("roa"),
            "roic":            fund.get("roic"),
            "lpa":             fund.get("eps"),
            "vpa":             fund.get("bvps"),
            "dy":              fund.get("dividend_yield"),
            "mrg_liq":         fund.get("net_margin"),
            "mrg_ebit":        fund.get("ebit_margin"),
            "mrg_ebitda":      fund.get("ebitda_margin"),
            "mrg_bruta":       fund.get("gross_margin"),
            "div_liq_patrim":  fund.get("debt_equity"),
            "div_liq_ebitda":  fund.get("net_debt_ebitda"),
            "div_liq_ebit":    fund.get("net_debt_ebit"),
            "cagr_rec_5a":     fund.get("revenue_cagr_5y"),
            "cagr_luc_5a":     fund.get("earnings_cagr_5y"),
            "market_cap":      fund.get("market_cap"),
            "giro_ativos":     fund.get("asset_turnover"),
            "liq_corrente":    fund.get("current_ratio"),
            "patrim_ativos":   fund.get("equity_to_assets"),
            "passiv_ativos":   fund.get("liabilities_to_assets"),
        })
    _pace_bolsai()

    # 3. BolsaI — stats (52 semanas, YTD)
    stats = get_bolsai(f"/stocks/{ticker}/stats")
    if stats:
        _upd(data, {
            "max_52s":      stats.get("week_52_high"),
            "min_52s":      stats.get("week_52_low"),
            "ytd_ret":      stats.get("ytd_return_pct"),
            "vol_med_52s":  stats.get("avg_volume_52w"),
        })
    _pace_bolsai()

    merge_json(OUT_DIR / f"{ticker}.json", data)
    return True


def _detalhes_pares(ticker: str) -> dict:
    """Lê o detalhes.php e devolve todos os pares rótulo→valor (ação ou FII)."""
    try:
        r = requests.get(f"https://fundamentus.com.br/detalhes.php?papel={ticker}",
                         headers=HEADERS_FUND, timeout=15)
        if not r.ok:
            return {}
        r.encoding = "latin-1"
        import lxml.html
        tree = lxml.html.fromstring(r.text)
        pares = {}
        for tr in tree.xpath("//tr"):
            cels = [c.text_content().strip().lstrip("?").strip() for c in tr.xpath("./td")]
            for i in range(0, len(cels) - 1, 2):
                lab, val = cels[i], cels[i + 1]
                if lab and val:
                    pares.setdefault(lab, val)
        return pares
    except Exception:
        return {}


def processar_fii(ticker: str) -> bool:
    log.info(f"  {ticker} (FII)...")
    data = {"ticker": ticker, "tipo": "fii"}

    # 0. Fundamentus — fonte principal (P/VP, DY, VP/Cota, patrimônio, resultados, imóveis, oscilações)
    data.update(get_fundamentus_fii(ticker))
    time.sleep(FUND_DELAY)

    # 1. BolsaI — fundamentals de FII (reforço; só sobrescreve com valor real)
    fund = get_bolsai(f"/fiis/{ticker}/fundamentals")
    if fund:
        _upd(data, {
            "pvp":             fund.get("pb_ratio"),
            "dy":              fund.get("dividend_yield"),
            "market_cap":      fund.get("market_cap"),
            "ultimo_rend":     fund.get("last_dividend"),
            "patrimonio_cota": fund.get("nav_per_share"),
            "patrimonio_total":fund.get("nav"),
            "vacancia":        fund.get("vacancy_rate"),
            "num_cotistas":    fund.get("num_shareholders"),
            "cotas_emitidas":  fund.get("shares_outstanding"),
            "taxa_adm":        fund.get("admin_fee"),
            "segmento":        fund.get("segment"),
            "mandato":         fund.get("mandate"),
            "tipo_gestao":     fund.get("management_type"),
            "tipo_fundo":      fund.get("fund_type"),
        })
    _pace_bolsai()

    # 2. BolsaI — empresa (CNPJ, razão social)
    company = get_bolsai(f"/companies/{ticker}")
    if company:
        _upd(data, {
            "razao_social": company.get("corporate_name"),
            "cnpj":         company.get("cnpj"),
            "cvm_code":     company.get("cvm_code"),
        })
    _pace_bolsai()

    # 3. Stats de preço
    stats = get_bolsai(f"/stocks/{ticker}/stats")
    if stats:
        _upd(data, {
            "max_52s": stats.get("week_52_high"),
            "min_52s": stats.get("week_52_low"),
            "ytd_ret": stats.get("ytd_return_pct"),
        })
    _pace_bolsai()

    merge_json(OUT_DIR / f"{ticker}.json", data)
    return True


# ── Dados em massa (resultado.php já baixado) — básico de TODOS os ativos ──────
def _nz(v):
    """Devolve v se for número útil (não None e não zero); senão None."""
    try:
        if v is None:
            return None
        return v if float(v) != 0 else None
    except Exception:
        return v or None


def _bulk_acao(ticker: str, bulk: dict) -> dict:
    d = bulk.get(ticker)
    if not d:
        return {}
    m = {"pl": _nz(d.get("pl")), "pvp": _nz(d.get("pvp")), "psr": _nz(d.get("psr")),
         "dy": _nz(d.get("dy")), "roic": _nz(d.get("roic")), "roe": _nz(d.get("roe")),
         "mrg_liq": _nz(d.get("mrg_liq")), "cagr_rec_5a": _nz(d.get("cresc5a")),
         "patrim_liq": _nz(d.get("patrim"))}
    return {k: v for k, v in m.items() if v is not None}


def _bulk_fii(ticker: str, bulk: dict) -> dict:
    d = bulk.get(ticker)
    if not d:
        return {}
    m = {"ffo_yield": _nz(d.get("ffo_yield")), "dy": _nz(d.get("dy")), "pvp": _nz(d.get("pvp")),
         "qtd_imoveis": _nz(d.get("qtd_imoveis")), "cap_rate": _nz(d.get("cap_rate")),
         "vacancia": _nz(d.get("vacancia"))}
    return {k: v for k, v in m.items() if v is not None}


def merge_fill(path: Path, new_data: dict):
    """Preenche SÓ os campos que faltam (não sobrescreve o detalhe já obtido)."""
    existing = {}
    if path.exists():
        try:
            existing = json.loads(path.read_text())
        except Exception:
            existing = {}
    for k, v in new_data.items():
        if existing.get(k) in (None, "", 0, 0.0) and v not in (None, "", 0, 0.0):
            existing[k] = v
    existing.setdefault("ticker", new_data.get("ticker"))
    existing.setdefault("tipo", new_data.get("tipo"))
    existing["_updated_at"] = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC")
    path.write_text(json.dumps(existing, ensure_ascii=False, separators=(",", ":")))


def preencher_basico_todos():
    """Lê os 2 arquivos em massa e preenche o básico de TODOS os ativos (sem HTTP)."""
    try:
        acb = json.loads(Path("data/fundamentus.json").read_text()).get("acoes", {})
    except Exception:
        acb = {}
    try:
        fib = json.loads(Path("data/fiis_fundamentus.json").read_text()).get("fiis", {})
    except Exception:
        fib = {}
    n = 0
    for t in ACOES_SITE:
        m = _bulk_acao(t, acb)
        if m:
            m["ticker"], m["tipo"] = t, "acao"
            merge_fill(OUT_DIR / f"{t}.json", m)
            n += 1
    for t in FIIS_SITE:
        m = _bulk_fii(t, fib)
        if m:
            m["ticker"], m["tipo"] = t, "fii"
            merge_fill(OUT_DIR / f"{t}.json", m)
            n += 1
    log.info(f"Básico (dados em massa) preenchido em {n} ativos")


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ticker", help="Forçar ticker específico")
    parser.add_argument("--reset",  action="store_true", help="Reiniciar do grupo 0")
    args = parser.parse_args()

    if not BOLSAI_KEY:
        log.warning("BOLSAI_KEY não definida — seguindo só com Fundamentus (fonte principal)")

    # Modo ticker único
    if args.ticker:
        t = args.ticker.upper()
        if t in FII_SET:
            processar_fii(t)
        else:
            processar_acao(t)
        return

    # 1. Básico de TODOS os ativos (dados em massa, sem HTTP) — roda todo dia
    preencher_basico_todos()

    # 2. Detalhe pesado (balanço, resultados, oscilações) em rodízio diário
    estado = load_estado()
    if args.reset:
        estado = {"grupo": 0}

    total  = len(ALL_TICKERS)
    grupos = (total + GRUPO_SIZE - 1) // GRUPO_SIZE
    grupo  = estado.get("grupo", 0) % grupos

    inicio = grupo * GRUPO_SIZE
    fim    = min(inicio + GRUPO_SIZE, total)
    batch  = ALL_TICKERS[inicio:fim]

    log.info(f"Grupo {grupo+1}/{grupos} — tickers {inicio+1} a {fim} de {total}")

    ok = fail = 0
    for ticker in batch:
        try:
            if ticker in FII_SET:
                processar_fii(ticker)
            else:
                processar_acao(ticker)
            ok += 1
        except Exception as e:
            log.warning(f"  {ticker}: erro — {e}")
            fail += 1

    # Avança para o próximo grupo
    estado["grupo"] = (grupo + 1) % grupos
    estado["ultimo_run"] = datetime.now(timezone.utc).isoformat()
    save_estado(estado)

    log.info(f"Concluído: {ok} ok, {fail} erros. Próximo grupo: {estado['grupo']+1}/{grupos}")


if __name__ == "__main__":
    main()
