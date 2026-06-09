"""
Historico Acoes Grupo 3/5 - merge incremental
"""
import json, time, datetime, os, sys, requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_utils import fetch_ativo_cascata, merge_historico

ATIVOS = ["BBDC3", "SANB4", "CLSC3", "CGRA3", "ECOR3", "CSUD3", "HAGA4", "CGRA4", "MLAS3", "DOTZ3", "CLSC4", "SBFG3", "RPAD3", "TECN3", "COGN3", "BBSE3", "BGIP3", "ISAE4", "BMIN4", "BBAS3", "ROMI3", "DIRR3", "KEPL3", "INTB3", "NEOE3", "BBDC4", "PFRM3", "EKTR4", "TGMA3", "VIVA3", "ITSA4", "CURY3", "SYNE3", "MILS3", "MOTV3", "PSSA3", "ITSA3", "EQPA3", "TAEE3", "TAEE11", "WLMM4", "CPFE3", "TAEE4", "HYPE3", "SAPR4", "HBRE3", "RANI3", "ALUP4", "VITT3", "SAPR11", "MRSA6B", "BMIN3", "BMEB3", "BPAR3", "MDIA3", "ANIM3", "ITUB4", "PGMN3", "UGPA3", "CMIG3", "BRBI11", "ALUP11", "ISAE3", "WLMM3", "MRSA5B", "BRAP3", "BLAU3", "ITUB3", "BALM4", "VSTE3", "SAPR3", "TTEN3", "MTSA4", "LREN3", "MOVI3", "IGTI3", "IGTI11", "CGAS5", "MRSA3B", "CMIN3", "ALUP3", "CGAS3", "ALPA3", "CEBR5", "HAGA3", "BRAP4", "SBSP3", "EKTR3", "FIQE3", "BPAC11", "ENGI4", "VBBR3", "BPAC5", "CAML3", "ENMT3", "VAMO3", "CEBR3", "MULT3", "CXSE3", "PNVL3"]

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
    print(f"\nAcoes G3 concluido! {ok}/{total} ativos, {novos_pts} pontos novos")

if __name__ == "__main__":
    main()
