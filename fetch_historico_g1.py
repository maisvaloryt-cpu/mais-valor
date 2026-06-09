"""
Historico Acoes Grupo 1/5 - merge incremental
"""
import json, time, datetime, os, sys, requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_utils import fetch_ativo_cascata, merge_historico

ATIVOS = ["AGRO3", "GPAR3", "IRBR3", "SIMH3", "WEST3", "DTCY3", "NGRD3", "MAPT4", "MAPT3", "HBSA3", "TASA3", "JSLG3", "TASA4", "HAPV3", "ENJU3", "ATED3", "EMAE4", "AURE3", "LWSA3", "AMER3", "AZTE3", "MSPA3", "CVCB3", "UCAS3", "CRPG3", "CASH3", "RAPT3", "RAPT4", "CRPG6", "NATU3", "AALR3", "BLUT3", "USIM5", "CRPG5", "MNDL3", "BIED3", "USIM3", "MRVE3", "USIM6", "ADHM3", "CSNA3", "RCSL4", "FIEI3", "DASA3", "RCSL3", "RNEW3", "RNEW4", "TUPY3", "SEQL3", "OBTC3", "AMAR3", "CEDO3", "BLUT4", "AMOB3", "CSAN3", "MEAL3", "LJQQ3", "AMBP3", "NORD3", "TPIS3", "FHER3", "VIVR3", "AVLL3", "SHOW3", "MWET4", "CEDO4", "WDCN3", "PTBL3", "CTAX3", "BRKM5", "TXRX3", "TCSA3", "BDLL3", "BRKM6", "BRKM3", "FICT3", "TOKY3", "PCAR3", "ONCO3", "BHIA3", "BDLL4", "LUPA3", "IFCM3", "INEP3", "NEXP3", "ARND3", "INEP4", "OIBR4", "BOBR4", "RAIZ4", "PLAS3", "AZEV3", "AERI3", "TXRX4", "AZEV4", "CTSA3", "PMAM3", "RPMG3", "CTSA4", "SNSY5"]

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
    print(f"\nAcoes G1 concluido! {ok}/{total} ativos, {novos_pts} pontos novos")

if __name__ == "__main__":
    main()
