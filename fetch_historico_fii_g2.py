"""
Historico FIIs Grupo 2/4 - merge incremental
"""
import json, time, datetime, os, sys, requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_utils import fetch_ativo_cascata, merge_historico

ATIVOS = ["FCFL11", "FGAA11", "FIGS11", "FIIB11", "FIIP11", "FISC11", "FIXX11", "FLCR11", "FLMA11", "FLRP11", "FMOF11", "FPAB11", "FPNG11", "FTCA11", "FTCE11", "FVPQ11", "FYTO11", "FZDA11", "FZDB11", "GAME11", "GARE11", "GCOI11", "GCRA11", "GCRI11", "GFDL11", "GGRC11", "GLCR11", "GLOG11", "GLPF11", "GRUL11", "GRWA11", "GSFI11", "GTWR11", "GZIT11", "HAAA11", "HABT11", "HBCR11", "HCHG11", "HCRI11", "HCTR11", "HDEL11", "HFOF11", "HGAG11", "HGBL11", "HGBS11", "HGCR11", "HGIC11", "HGLG11", "HGPO11", "HGRE11", "HGRU11", "HIRE11", "HJCT11", "HLOG11", "HOFC11", "HOSI11", "HPDP11", "HRDF11", "HREC11", "HSAF11", "HSLG11", "HSML11", "HSRE11", "HTMX11", "HUCG11", "HUSI11", "IAAG11", "IAGR11", "IBBP11", "IBCR11", "ICNE11", "ICRI11", "INLG11", "INRD11", "IRIM11", "ITIP11", "ITIT11", "ITRI11", "JASC11", "JCCJ11", "JFLL11", "JGPX11", "JPPA11", "JSAF11", "JSCR11", "JSRE11", "KCRE11", "KDOL11", "KEVE11", "KFOF11", "KISU11", "KIVO11", "KNCA11", "KNCR11", "KNHF11", "KNHY11", "KNIP11", "KNRE11", "KNRI11", "KNSC11"]

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
    print(f"\nFIIs G2 concluido! {ok}/{total} ativos, {novos_pts} pontos novos")

if __name__ == "__main__":
    main()
