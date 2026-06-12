"""
Gera data/historico/NASDAQ.json e data/historico/ETH.json
Execute com: python gerar_historico_nasdaq_eth.py
"""
import yfinance as yf
import json
from datetime import datetime
from pathlib import Path

BASE = Path(__file__).parent / "data" / "historico"

def gerar(symbol_yf, ticker_nome, arquivo):
    print(f"Baixando {symbol_yf}...")
    df = yf.download(symbol_yf, start="2011-01-01", progress=False)
    if df.empty:
        print(f"  ERRO: sem dados para {symbol_yf}")
        return

    # Mensal
    df_m = df['Close'].resample('ME').last().dropna()
    history = [{"date": dt.strftime("%Y-%m-%d"), "close": round(float(v), 2)}
               for dt, v in df_m.items()]

    # Últimos 90 dias diários
    df_d = df['Close'].last('90D').dropna()
    datas_mensais = {h['date'][:7] for h in history}
    for dt, v in df_d.items():
        d = dt.strftime("%Y-%m-%d")
        if d[:7] not in datas_mensais:
            history.append({"date": d, "close": round(float(v), 2)})

    history = sorted({h['date']: h for h in history}.values(), key=lambda x: x['date'])

    out = {"ticker": ticker_nome, "history": history,
           "updated_at": datetime.now().strftime("%d/%m/%Y %H:%M")}

    with open(BASE / arquivo, 'w') as f:
        json.dump(out, f, separators=(',', ':'))

    print(f"  OK: {len(history)} pontos -> data/historico/{arquivo}")

gerar("^IXIC",   "NASDAQ", "NASDAQ.json")
gerar("ETH-USD", "ETH",    "ETH.json")
print("\nPronto! Faça commit e deploy.")
