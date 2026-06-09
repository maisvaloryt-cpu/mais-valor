"""
Historico FIIs Grupo 4/4 - merge incremental
"""
import json, time, datetime, os, sys, requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_utils import fetch_ativo_cascata, merge_historico

ATIVOS = ["RZAT11", "RZLC11", "RZTR11", "RZZR11", "SAPI11", "SCPF11", "SEQR11", "SHOP11", "SHPH11", "SHPP11", "SJAU11", "SMRE11", "SNAG11", "SNCI11", "SNEL11", "SNFF11", "SNFZ11", "SNME11", "SOFF11", "SPG211", "SPMO11", "SPTW11", "SPXS11", "TELM11", "TEPP11", "TGAR11", "TJKB11", "TMPS11", "TOPP11", "TORD11", "TRBL11", "TRNT11", "TRXB11", "TRXF11", "TRXY11", "TSER11", "TSNC11", "TVRI11", "URHF11", "URPR11", "VCJR11", "VCRA11", "VCRI11", "VCRR11", "VGHF11", "VGIA11", "VGII11", "VGIP11", "VGIR11", "VGRI11", "VHFA11", "VILG11", "VINO11", "VISC11", "VIUR11", "VJFD11", "VOTS11", "VRTA11", "VRTM11", "VSHO11", "VSLH11", "VVCR11", "VVMR11", "VVRI11", "VXXV11", "WHGR11", "WPLZ11", "WTSP11", "XLPR11", "XPCA11", "XPCI11", "XPCM11", "XPIN11", "XPLG11", "XPML11", "XPSF11", "ZAGH11", "ZAVC11", "ZAVI11", "ZIFI11"]

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
    print(f"\nFIIs G4 concluido! {ok}/{total} ativos, {novos_pts} pontos novos")

if __name__ == "__main__":
    main()
