"""
Historico Acoes Grupo 4/5 - merge incremental
"""
import json, time, datetime, os, sys, requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_utils import fetch_ativo_cascata, merge_historico

ATIVOS = ["BMEB4", "ENGI11", "CEBR6", "BMOB3", "ENMT4", "FLRY3", "MATD3", "ALPA4", "BALM3", "TELB4", "REDE3", "GGPS3", "FESA4", "PDTC3", "JOPA3", "JOPA4", "PTNT3", "PTNT4", "DMVF3", "AFLT3", "PASS3", "PATI4", "BPAC3", "EGIE3", "MYPK3", "CEGR3", "AXIA3", "TFCO4", "PATI3", "PEAB4", "B3SA3", "ENGI3", "JALL3", "CPLE3", "CSMG3", "PEAB3", "RDOR3", "SCAR3", "ABEV3", "ALOS3", "SMFT3", "OPCT3", "ASAI3", "VIVT3", "AXIA6", "UNIP3", "ESPA3", "WHRL3", "UNIP6", "WHRL4", "UNIP5", "TELB3", "RENT3", "YDUQ3", "PRIO3", "VVEO3", "GOAU3", "TKNO4", "TOTS3", "FRIO3", "VALE3", "ARML3", "SLCE3", "PRNR3", "GOAU4", "EQPA5", "RADL3", "FRAS3", "GGBR3", "FESA3", "RAIL3", "WEGE3", "GGBR4", "KLBN11", "KLBN4", "QUAL3", "KLBN3", "BRST3", "MGLU3", "EMBJ3", "EQTL3", "DESK3", "SOJA3", "ENEV3", "BIOM3", "BRAV3", "AURA33", "HBOR3", "POSI3", "CBAV3", "EPAR3", "MBRF3", "SAUD3", "ALPK3", "ORVR3", "LOGN3", "CBEE3", "GEPA3", "GEPA4", "LAND3"]

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
    print(f"\nAcoes G4 concluido! {ok}/{total} ativos, {novos_pts} pontos novos")

if __name__ == "__main__":
    main()
