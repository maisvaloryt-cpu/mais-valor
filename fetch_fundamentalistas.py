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
GRUPO_SIZE   = 180   # req/dia com margem de segurança
DELAY        = 0.4   # segundos entre requests

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

ALL_TICKERS = ACOES + FIIS
FII_SET     = set(FIIS)

OUT_DIR.mkdir(parents=True, exist_ok=True)


# ── Helpers ───────────────────────────────────────────────────────────────────
def get_bolsai(path: str) -> dict | None:
    if not BOLSAI_KEY:
        return None
    try:
        r = requests.get(f"{BOLSAI_BASE}{path}", headers=HEADERS_BOLSAI, timeout=15)
        if r.status_code == 429:
            log.warning("BolsaI: limite diário atingido (429)")
            return None
        if r.status_code == 404:
            return None
        r.raise_for_status()
        return r.json()
    except Exception as e:
        log.warning(f"BolsaI {path}: {e}")
        return None


def get_fundamentus_acao(ticker: str) -> dict:
    """Scraping leve do Fundamentus para complementar dados de ação."""
    try:
        r = requests.get(
            f"https://fundamentus.com.br/detalhes.php?papel={ticker}",
            headers=HEADERS_FUND, timeout=15
        )
        if not r.ok:
            return {}
        # Extrai campos básicos via parsing simples de texto
        text = r.text
        out  = {}
        import re
        def extract(label):
            pat = rf'{re.escape(label)}.*?<td[^>]*>([\d.,%-]+)</td>'
            m   = re.search(pat, text, re.DOTALL)
            return m.group(1).strip() if m else None

        # Campos que o BolsaI free pode não ter
        for field, label in [
            ("liq_corr",    "Liq. Corr."),
            ("div_yield_12","Div. Yield"),
            ("cresc_rec_5a","Cresc. Rec.5a"),
        ]:
            v = extract(label)
            if v:
                out[field] = v
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
def processar_acao(ticker: str) -> bool:
    log.info(f"  {ticker} (ação)...")
    data = {"ticker": ticker, "tipo": "acao"}

    # 1. BolsaI — empresa (CNPJ, setor, cidade)
    company = get_bolsai(f"/companies/{ticker}")
    if company:
        data.update({
            "razao_social": company.get("corporate_name"),
            "nome":         company.get("trade_name"),
            "cnpj":         company.get("cnpj"),
            "setor":        company.get("sector"),
            "estado":       company.get("state"),
            "cidade":       company.get("city"),
            "website":      company.get("website"),
            "cvm_code":     company.get("cvm_code"),
        })
    time.sleep(DELAY)

    # 2. BolsaI — fundamentals (27 indicadores)
    fund = get_bolsai(f"/fundamentals/{ticker}")
    if fund:
        data.update({
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
    time.sleep(DELAY)

    # 3. BolsaI — stats (52 semanas, YTD)
    stats = get_bolsai(f"/stocks/{ticker}/stats")
    if stats:
        data.update({
            "max_52s":      stats.get("week_52_high"),
            "min_52s":      stats.get("week_52_low"),
            "ytd_ret":      stats.get("ytd_return_pct"),
            "vol_med_52s":  stats.get("avg_volume_52w"),
        })
    time.sleep(DELAY)

    merge_json(OUT_DIR / f"{ticker}.json", data)
    return True


def processar_fii(ticker: str) -> bool:
    log.info(f"  {ticker} (FII)...")
    data = {"ticker": ticker, "tipo": "fii"}

    # 1. BolsaI — fundamentals de FII
    fund = get_bolsai(f"/fiis/{ticker}/fundamentals")
    if fund:
        data.update({
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
    time.sleep(DELAY)

    # 2. BolsaI — empresa (CNPJ, razão social)
    company = get_bolsai(f"/companies/{ticker}")
    if company:
        data.update({
            "razao_social": company.get("corporate_name"),
            "cnpj":         company.get("cnpj"),
            "cvm_code":     company.get("cvm_code"),
        })
    time.sleep(DELAY)

    # 3. Stats de preço
    stats = get_bolsai(f"/stocks/{ticker}/stats")
    if stats:
        data.update({
            "max_52s": stats.get("week_52_high"),
            "min_52s": stats.get("week_52_low"),
            "ytd_ret": stats.get("ytd_return_pct"),
        })
    time.sleep(DELAY)

    merge_json(OUT_DIR / f"{ticker}.json", data)
    return True


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ticker", help="Forçar ticker específico")
    parser.add_argument("--reset",  action="store_true", help="Reiniciar do grupo 0")
    args = parser.parse_args()

    if not BOLSAI_KEY:
        log.error("BOLSAI_KEY não definida — configure como secret no GitHub Actions")
        sys.exit(1)

    # Modo ticker único
    if args.ticker:
        t = args.ticker.upper()
        if t in FII_SET:
            processar_fii(t)
        else:
            processar_acao(t)
        return

    # Modo rotativo
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
