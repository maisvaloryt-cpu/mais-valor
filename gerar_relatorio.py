"""
gerar_relatorio.py — Gera relatório do status de todos os dados
Salva em data/relatorio.json e exibe no console
"""
import json, os, datetime, glob

def main():
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
    now_str = now.strftime("%d/%m/%Y %H:%M")

    relatorio = {
        "gerado_em": now_str,
        "historico_mensal": {},
        "historico_diario": {},
        "cotacoes": {},
        "fundamentus": {},
        "resumo": {}
    }

    # 1. Histórico mensal (data/historico/)
    arq_mensal = glob.glob("data/historico/*.json")
    total_mensal = len(arq_mensal)
    mensal_ok = []
    mensal_poucos = []
    for arq in sorted(arq_mensal):
        ticker = os.path.basename(arq).replace('.json','')
        try:
            with open(arq) as f:
                d = json.load(f)
            pts = len(d.get('history', []))
            if pts >= 10:
                mensal_ok.append({'ticker': ticker, 'pontos': pts})
            else:
                mensal_poucos.append({'ticker': ticker, 'pontos': pts})
        except:
            mensal_poucos.append({'ticker': ticker, 'pontos': 0})

    relatorio['historico_mensal'] = {
        'total': total_mensal,
        'ok': len(mensal_ok),
        'poucos_dados': len(mensal_poucos),
        'lista_poucos': mensal_poucos
    }

    # 2. Histórico diário (data/diario/)
    arq_diario = glob.glob("data/diario/*.json")
    total_diario = len(arq_diario)
    diario_ok = []
    diario_desatualizado = []
    hoje = now.date()
    for arq in sorted(arq_diario):
        ticker = os.path.basename(arq).replace('.json','')
        try:
            with open(arq) as f:
                d = json.load(f)
            hist = d.get('history', [])
            if not hist:
                diario_desatualizado.append({'ticker': ticker, 'ultimo': 'sem dados'})
                continue
            ultimo = hist[-1]['date']
            dias = (hoje - datetime.date.fromisoformat(ultimo)).days
            if dias <= 3:
                diario_ok.append({'ticker': ticker, 'ultimo': ultimo, 'dias_atras': dias})
            else:
                diario_desatualizado.append({'ticker': ticker, 'ultimo': ultimo, 'dias_atras': dias})
        except:
            diario_desatualizado.append({'ticker': ticker, 'ultimo': 'erro'})

    relatorio['historico_diario'] = {
        'total': total_diario,
        'atualizados': len(diario_ok),
        'desatualizados': len(diario_desatualizado),
        'lista_desatualizados': diario_desatualizado[:20]
    }

    # 3. Cotações (data/cotacoes.json)
    try:
        with open('data/cotacoes.json') as f:
            cot = json.load(f)
        acoes = cot.get('acoes', [])
        fiis = cot.get('fiis', [])
        fallbacks = [a for a in acoes+fiis if a.get('fallback')]
        relatorio['cotacoes'] = {
            'atualizado_em': cot.get('updated_at'),
            'total_acoes': len(acoes),
            'total_fiis': len(fiis),
            'fallbacks': len(fallbacks),
            'tickers_fallback': [a['ticker'] for a in fallbacks]
        }
    except:
        relatorio['cotacoes'] = {'erro': 'cotacoes.json não encontrado'}

    # 4. Fundamentus
    try:
        with open('data/fundamentus.json') as f:
            fund = json.load(f)
        relatorio['fundamentus'] = {
            'atualizado_em': fund.get('updated_at'),
            'total_acoes': len(fund.get('acoes', {}))
        }
    except:
        relatorio['fundamentus'] = {'erro': 'fundamentus.json não encontrado'}

    try:
        with open('data/fiis_fundamentus.json') as f:
            ffund = json.load(f)
        relatorio['fundamentus']['total_fiis'] = len(ffund.get('fiis', {}))
        relatorio['fundamentus']['atualizado_fiis'] = ffund.get('updated_at')
    except:
        relatorio['fundamentus']['total_fiis'] = 0

    # 5. Resumo executivo
    relatorio['resumo'] = {
        'acoes_com_historico': len(mensal_ok),
        'fiis_com_historico': len([t for t in mensal_ok if t['ticker'].endswith('11')]),
        'cotacoes_atuais': relatorio['cotacoes'].get('total_acoes',0) + relatorio['cotacoes'].get('total_fiis',0),
        'indicadores_fundamentus': relatorio['fundamentus'].get('total_acoes',0) + relatorio['fundamentus'].get('total_fiis',0),
        'status_geral': '✅ OK' if total_mensal >= 700 else '⚠️ Histórico incompleto' if total_mensal >= 400 else '❌ Histórico muito incompleto'
    }

    # Salva JSON
    os.makedirs('data', exist_ok=True)
    with open('data/relatorio.json', 'w', encoding='utf-8') as f:
        json.dump(relatorio, f, ensure_ascii=False, indent=2)

    # Exibe no console
    print("=" * 60)
    print(f"  RELATÓRIO MAIS VALOR — {now_str}")
    print("=" * 60)
    print(f"\n📊 HISTÓRICO MENSAL (10 anos)")
    print(f"  Total de arquivos: {total_mensal}")
    print(f"  Com dados OK (≥10 pts): {len(mensal_ok)}")
    print(f"  Com poucos dados: {len(mensal_poucos)}")
    if mensal_poucos:
        print(f"  Problemas: {[t['ticker'] for t in mensal_poucos[:10]]}")

    print(f"\n📅 HISTÓRICO DIÁRIO (cotações recentes)")
    print(f"  Total de arquivos: {total_diario}")
    print(f"  Atualizados (≤3 dias): {len(diario_ok)}")
    print(f"  Desatualizados: {len(diario_desatualizado)}")

    print(f"\n💹 COTAÇÕES DIÁRIAS")
    cot_info = relatorio['cotacoes']
    if 'erro' not in cot_info:
        print(f"  Atualizado em: {cot_info.get('updated_at')}")
        print(f"  Ações: {cot_info.get('total_acoes')} | FIIs: {cot_info.get('total_fiis')}")
        print(f"  Fallbacks (preço do histórico): {cot_info.get('fallbacks')}")
        if cot_info.get('tickers_fallback'):
            print(f"  Tickers fallback: {cot_info['tickers_fallback'][:5]}")
    else:
        print(f"  ❌ {cot_info['erro']}")

    print(f"\n📈 FUNDAMENTUS")
    f_info = relatorio['fundamentus']
    if 'erro' not in f_info:
        print(f"  Ações: {f_info.get('total_acoes')} | FIIs: {f_info.get('total_fiis')}")
        print(f"  Atualizado: {f_info.get('atualizado_em')}")
    else:
        print(f"  ❌ {f_info['erro']}")

    print(f"\n🎯 RESUMO GERAL")
    r = relatorio['resumo']
    print(f"  Ativos com histórico mensal: {r['acoes_com_historico']}")
    print(f"  FIIs com histórico: {r['fiis_com_historico']}")
    print(f"  Cotações atuais: {r['cotacoes_atuais']}")
    print(f"  Indicadores fundamentalistas: {r['indicadores_fundamentus']}")
    print(f"  Status geral: {r['status_geral']}")
    print("\n" + "=" * 60)
    print("  Relatório salvo em data/relatorio.json")
    print("=" * 60)

if __name__ == "__main__":
    main()
