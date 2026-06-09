"""
Historico FIIs Grupo 1/4 - merge incremental
"""
import json, time, datetime, os, sys, requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_utils import fetch_ativo_cascata, merge_historico

ATIVOS = ["AAZQ11", "ABCP11", "ADSH11", "AFHF11", "AFHI11", "AGRX11", "AIEC11", "AJFI11", "ALMI11", "ALZC11", "ALZR11", "ANCR11", "APTO11", "APXM11", "AROA11", "ARRI11", "ARTE11", "ARXD11", "ASMT11", "ATSA11", "AURB11", "AZPL11", "BBFO11", "BBGO11", "BBIG11", "BBRC11", "BCIA11", "BCRI11", "BFCC11", "BGRB11", "BICE11", "BIME11", "BLCA11", "BLMG11", "BLMO11", "BLOG11", "BMLC11", "BNFS11", "BPML11", "BRCO11", "BRCR11", "BRIM11", "BRIP11", "BROF11", "BTAL11", "BTCI11", "BTHF11", "BTHI11", "BTLG11", "BTRA11", "BTSI11", "BTWR11", "BTYU11", "CACR11", "CARE11", "CBOP11", "CCME11", "CEOC11", "CFII11", "CJCT11", "CLIN11", "CNES11", "CPLG11", "CPOF11", "CPSH11", "CPTR11", "CPTS11", "CPUR11", "CRAA11", "CRFF11", "CTXT11", "CVBI11", "CXAG11", "CXCE11", "CXCI11", "CXCO11", "CXRI11", "CXTL11", "CYLD11", "DAMA11", "DAMT11", "DAYM11", "DCRA11", "DEVA11", "DOVL11", "DPRO11", "DVFF11", "EDFO11", "EDGA11", "EDGE11", "EGAF11", "EIRA11", "EMET11", "EQIR11", "ERPA11", "EURO11", "EXES11", "FAED11", "FAMB11", "FATN11"]

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
    print(f"\nFIIs G1 concluido! {ok}/{total} ativos, {novos_pts} pontos novos")

if __name__ == "__main__":
    main()
