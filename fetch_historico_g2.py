"""
Historico Acoes Grupo 2/5 - merge incremental
"""
import json, time, datetime, os, sys, requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_utils import fetch_ativo_cascata, merge_historico

ATIVOS = ["GFSA3", "JFEN3", "OIBR3", "PDGR3", "GSHP3", "OSXB3", "AUAU3", "BAUH4", "AGXY3", "ESTR4", "LIGT3", "RSID3", "MNPR3", "TRAD3", "IGBR3", "MGEL4", "RVEE3", "ALLD3", "VTRU3", "AZUL3", "BSLI3", "BSLI4", "RIAA3", "BMKS3", "HETA4", "BNBR3", "CTKA4", "HBTS5", "BRSR6", "HOOT4", "NUTR3", "VULC3", "JHSF3", "AHEB3", "CYRE4", "AZZA3", "CALI3", "BRSR3", "BRSR5", "BAZA3", "BGIP4", "CYRE3", "EALT4", "SUZB3", "CTKA3", "ETER3", "PETR4", "EVEN3", "PLPL3", "CSED3", "TRIS3", "BEEF3", "EALT3", "LAVV3", "MELK3", "LPSB3", "MDNE3", "GRND3", "GMAT3", "COCE5", "BMGB4", "PETR3", "EQMA3B", "SOND5", "POMO4", "POMO3", "COCE3", "SEER3", "EUCA4", "SOND6", "VLID3", "CAMB3", "RECV3", "MTRE3", "EUCA3", "CEAB3", "DEXP3", "CEEB5", "DEXP4", "RSUL4", "TEND3", "PINE3", "ABCB4", "EZTC3", "SHUL4", "WIZC3", "SANB3", "PINE4", "RPAD6", "LUXM4", "CMIG4", "SANB11", "LEVE3", "CEEB3", "BEES3", "OFSA3", "SMTO3", "BEES4", "LOGG3", "RPAD5"]

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
    print(f"\nAcoes G2 concluido! {ok}/{total} ativos, {novos_pts} pontos novos")

if __name__ == "__main__":
    main()
