"""
fetch_historico_bdrs.py — Histórico mensal de BDRs (B3) para o Mais Valor

Estratégia complementar (busca TODAS as fontes e mergeia):
  BDRs (.SA): Yahoo(.SA) + Brapi com rodízio

Salva em data/historico/{TICKER}.json  (ex: AAPL34.json)

IMPORTANTE — sobre os tickers desta lista:
Os códigos de BDR na B3 quase nunca são "sigla da empresa nos EUA + 34"
(ex: McDonald's NÃO é MCD34 — é MCDC34; Bristol-Myers Squibb NÃO é BMY34 —
é BMYB34). Cada BDR tem um código específico atribuído pelo banco
depositário, muitas vezes com prefixo numérico (ex: A1MD34 pra AMD).
Esta lista foi corrigida em 28/07/2026 cruzando a lista antiga (que tinha
~98 tickers errados/inexistentes, causando "SEM DADOS" no histórico) com a
planilha oficial "BDRs Listados B3" (Empresa / Ticker EUA / Ticker BDR).
Removidos desta lista (não confirmados na planilha oficial, evitar chutar
ticker errado): PANW (Palo Alto), CRWD (CrowdStrike), LYFT (Lyft), TTE
(TotalEnergies), SHEL (Shell — trocou de código após unificação em 2022),
005930.KS (Samsung), NIO, LVMH, BMW, VOW (Volkswagen), BAYRY (Bayer).
Se algum desses BDRs for confirmado, adicionar de volta com o ticker certo.
"""
import datetime, os, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_utils import fetch_yahoo_mensal, fetch_brapi_mensal, merge_historico

# ── Lista de BDRs (tickers reais da B3, confirmados na planilha oficial) ──────
BDR_LIST = [
    "AAPL34","MSFT34","AMZO34","GOGL34","NVDC34","TSLA34","FBOK34",
    "ITLC34","CSCO34","IBMB34","ORCL34","ADBE34","QCOM34","TEXA34",
    "A1MT34","MUTC34","A1MD34","AVGO34","INTU34","S2NW34","D1DG34",
    "K1LA34","L1RC34","VISA34","MSCD34","PYPL34","AXPB34","C2OI34",
    "S2QU34","JPMC34","BOAC34","GSGI34","MSBR34","CTGP34","WFCO34",
    "BLAK34","SCHW34","CHME34","JNJB34","PFIZ34","M1RN34","ABBV34",
    "MRCK34","UNHH34","AMGN34","GILD34","BMYB34","LILY34","ABTT34",
    "MDTC34","BIIB34","VRTX34","REGN34","I1SR34","Z1TS34","TMOS34",
    "DHER34","I1LM34","MCDC34","COCA34","NIKE34","WALM34","COWC34",
    "TGTB34","HOME34","LOWC34","SBUB34","PEPB34","PHMO34","MDLZ34",
    "YUMR34","C1MG34","KHCB34","COLG34","PGCO34","EBAY34","NFLX34",
    "DISB34","ATVI34","EAIN34","R2BL34","S1PO34","U1BE34","AIRB34",
    "S2HO34","D1OC34","Z1OM34","R1KU34","D2AS34","ATTB34","VERZ34",
    "CMCS34","BOEI34","CATP34","MMMC34","GEOO34","UPSS34","FDXB34",
    "LMTB34","RYTT34","HONB34","DEEC34","E1MR34","NOCG34","CHVX34",
    "EXXO34","B1PP34","BERK34","M1SC34","SPGI34","MCOR34","ADPR34",
    "F1IS34","ROST34","TJXC34","DLTR34","ULEV34","NETE34","TMCO34",
    "HOND34","TSMC34","BABA34","SNEC34","SAPP34","ASML34","N1VS34",
    "A1ZN34","N1VO34","H1SB34","G1SK34","UBSG34","B1NT34",
]


def processar_bdr(ticker: str):
    """Busca histórico complementar para um BDR via Yahoo(.SA) + Brapi."""
    all_pts = []
    fontes  = []

    # Fonte 1: Yahoo Finance (.SA)
    pts = fetch_yahoo_mensal(ticker + ".SA", anos=15)
    if pts:
        all_pts.extend(pts)
        fontes.append(f"Yahoo:{len(pts)}")

    # Fonte 2: Brapi — sempre, mesmo que Yahoo tenha funcionado
    pts = fetch_brapi_mensal(ticker)
    if pts:
        all_pts.extend(pts)
        fontes.append(f"Brapi:{len(pts)}")

    time.sleep(0.8)

    if not all_pts:
        print(f"  {ticker:<10} SEM DADOS")
        return

    # Deduplica por date
    por_data = {p["date"]: p for p in all_pts}
    merged   = sorted(por_data.values(), key=lambda x: x["date"])

    path  = os.path.join("data", "historico", f"{ticker}.json")
    novos = merge_historico(path, ticker, merged)
    print(f"  {ticker:<10} {len(merged)} pts ({'+'.join(fontes)}) +{novos} novos")


def main():
    os.makedirs(os.path.join("data", "historico"), exist_ok=True)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
    print(f"=== fetch_historico_bdrs.py — {now.strftime('%d/%m/%Y %H:%M')} ===")
    print(f"Total: {len(BDR_LIST)} BDRs\n")

    for ticker in BDR_LIST:
        processar_bdr(ticker)

    print(f"\n✅ Histórico de BDRs concluído.")


if __name__ == "__main__":
    main()
