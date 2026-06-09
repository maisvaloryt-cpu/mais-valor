"""
Historico FIIs Grupo 3/4 - merge incremental
"""
import json, time, datetime, os, sys, requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_utils import fetch_ativo_cascata, merge_historico

ATIVOS = ["KNUQ11", "KOPA11", "KORE11", "LAFI11", "LASC11", "LIFE11", "LMAI11", "LPLP11", "LRDI11", "LSAG11", "LVBI11", "MALL11", "MANA11", "MAXR11", "MCCI11", "MCEM11", "MCLO11", "MCRE11", "MFII11", "MGHT11", "MIDW11", "MXRF11", "NAUI11", "NAVT11", "NCHB11B", "NCRA11", "NCRI11", "NEWL11", "NEWU11", "NEXG11", "NSLU11", "NVHO11", "OCRE11", "OIAG11", "ONDA11", "ONDV11", "OUJP11", "OXRL11", "PATA11", "PATC11", "PATL11", "PCIP11", "PEMA11", "PLAG11", "PLCA11", "PLRI11", "PMFO11", "PMIS11", "PMLL11", "PMRL11", "PNDL11", "PORD11", "PQAG11", "PQDP11", "PRSV11", "PSEC11", "PVBI11", "QAGR11", "RBCO11", "RBDS11", "RBFM11", "RBFY11", "RBHG11", "RBHY11", "RBIR11", "RBLG11", "RBOP11", "RBRD11", "RBRI11", "RBRL11", "RBRP11", "RBRR11", "RBRS11", "RBRX11", "RBRY11", "RBTS11", "RBVA11", "RCFF11", "RCRB11", "RCRI11", "RDLI11", "RECD11", "RECM11", "RECR11", "RECT11", "REIT11", "RELG11", "REME11", "RENV11", "RINV11", "RMAI11", "RMBS11", "RNGO11", "RPRI11", "RRCI11", "RSPD11", "RURA11", "RVBI11", "RZAG11", "RZAK11"]

def main():
    os.makedirs("data/historico", exist_ok=True)
    total = len(ATIVOS)
    ok = novos_pts = 0
    for i, ticker in enumerate(ATIVOS):
        path = f"data/historico/{ticker}.json"
        print(f"[{i+1}/{total}] {ticker}...", end=" ", flush=True)
        pts, fonte = fetch_ativo_cascata(ticker, verbose=False)
        if not pts:
            print("sem dados")
            time.sleep(0.5)
            continue
        adicionados = merge_historico(path, ticker, pts)
        if adicionados > 0:
            print(f"+{adicionados} pts via {fonte}")
            novos_pts += adicionados
        else:
            print("ja atualizado")
        ok += 1
        time.sleep(0.8)
    print(f"\nFIIs G3 concluido! {ok}/{total} ativos, {novos_pts} pontos novos")

if __name__ == "__main__":
    main()
