"""
fetch_historico_bdrs.py — Histórico mensal de BDRs (B3) para o Mais Valor

Estratégia complementar (busca TODAS as fontes e mergeia):
  BDRs (.SA): Yahoo(.SA) + Brapi com rodízio

Salva em data/historico/{TICKER}.json  (ex: AAPL34.json)
"""
import datetime, os, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_utils import fetch_yahoo_mensal, fetch_brapi_mensal, merge_historico

# ── Lista de BDRs ─────────────────────────────────────────────────────────────
BDR_LIST = [
    # Tech EUA
    "AAPL34","MSFT34","AMZO34","GOGL34","NVDC34","TSLA34","META34",
    "INTC34","CSCO34","IBM34","ORCL34","ADBE34","QCOM34","TXN34",
    "AMAT34","MU34","AMD34","AVGO34","PANW34","CRWD34","INTU34",
    "SNOW34","DDOG34","KLAC34","LRCX34",
    # Pagamentos / Fintech
    "VISA34","MAST34","PYPL34","AMEX34","COIN34","SQ34",
    # Bancos EUA
    "JPMC34","BACR34","GSGI34","MSBR34","CITI34","WFC34",
    "BLK34","SCHW34","CME34",
    # Saúde / Farmacêutica
    "JNJB34","PFIZ34","MRNA34","ABBV34","MRK34","UNH34","AMGN34",
    "GILD34","BMY34","LLY34","ABT34","MDT34","BIIB34","VRTX34",
    "REGN34","ISRG34","ZTS34","TMO34","DHR34","ILMN34",
    # Consumo EUA
    "MCD34","COCA34","NIKE34","WMT34","COST34","TGT34","HD34","LOW34",
    "SBUX34","PEP34","PM34","MDLZ34","YUM34","CMG34","KHC34","COLG34",
    "PG34","EBAY34",
    # Digital / Plataformas
    "NFLX34","DISB34","ATVI34","EA34","RBLX34","SPOT34","UBER34",
    "ABNB34","SHOP34","DOCU34","ZM34","ROKU34","DASH34","LYFT34",
    # Telecom / Mídia
    "T34","VZ34","CMCS34",
    # Industrial / Aeroespacial
    "BOEI34","CAT34","MMM34","GE34","UPS34","FDX34","LMT34","RTX34",
    "HON34","DE34","EMR34","NOC34",
    # Energia
    "CVX34","EXXO34","TOTF34","SHEL34","BP34",
    # Diversificados / Outros EUA
    "BERK34","MSCI34","SPGI34","MCO34","ADP34","FISV34","ROST34",
    "TJX34","DLTR34","UL34","NTES34",
    # Ásia
    "SAMS34","TOYT34","HOND34","TSMC34","BABA34","NIO34","SONY34",
    # Europa
    "LVMH34","SAP34","ASML34","NOVN34","AZN34","NVO34","BMW34","VOW34",
    "BAYB34","HSBC34","GSK34","UBS34","AIRB34","BNTX34",
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
