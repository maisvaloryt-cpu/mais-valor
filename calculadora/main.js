    
    let myChart = null;
    let modoAtual = "simples";
    let zoomLevel = 0;
    const MAX_ZOOM = 3;
    let tipoTaxa = "anual";
    let tipoPeriodo = "anual";

    // === Parâmetros de referência — revisar periodicamente ===
    const SALARIO_MINIMO = 1621;        // R$ — vigente desde 01/01/2026 (Decreto 12.797/2025)
    const SALARIO_MINIMO_ANO = 2026;
    // Poupança: regra do BC. Selic > 8,5% a.a. → 0,5% a.m. + TR (~6,17% a.a.).
    // Selic ≤ 8,5% → 70% da Selic + TR. Por isso o campo é editável pelo usuário.
    const POUPANCA_TAXA_PADRAO = 6.17;  // % a.a. — default; ajustável no input
    // Restauração do período digitado antes de ligar "Vida Real" (usado em vários escopos)
    let _periodoAntesDaVidaReal = null;
    let temporalAtivo = false;
    let datasetVisibility = [true, true, true, true];

    let baseDadosCalculados = { final: { total: 0, renda: 0 }, anos: {} };
    let _liberdadePoint = null;
    let _ultimoAportePoint = null;

    // Cenários comparativos
    let cenarios = []; // [{label, color, dataTotal, labels}]
    let cenariosAtivo = false; // Modo cenários ligado/desligado
    let cenarioCounter = 0; // Contador para nomear cenários salvos
    let cenarioBaseSnapshot = null; // snapshot dos params da primeira vez que ativou (para restaurar ao desativar)
    const CENARIO_COLORS = ['#a78bfa','#f472b6','#34d399','#fb923c','#38bdf8'];
    let selectedCenarioId = null; // id do cenário selecionado para edição

    // Meta patrimônio — agora suporta múltiplas metas
    let _metaPoint = null;
    let _metaPoints = [];
    let metaList = []; // [{id, valor, label}]

    function formatCurrency(v) {
        return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    function parseCurrencyValue(v) {
        if (!v) return 0;
        return parseFloat(v.replace(/\./g,'').replace(',','.')) || 0;
    }

    function setupCurrencyMask(id, onChange) {
        const input = document.getElementById(id);
        if (!input) return;

        // Display integer reais value as "1.234,00"
        function reaisToDisplay(reais) {
            if (isNaN(reais) || reais < 0) reais = 0;
            return reais.toLocaleString('pt-BR') + ',00';
        }

        // Parse display value back to integer reais (ignore decimals — always ,00)
        function displayToReais(str) {
            // Remove everything that's not a digit
            const digits = str.replace(/\D/g, '');
            if (!digits) return 0;
            // The last two digits are always the ,00 suffix — drop them
            const withoutCents = digits.length > 2 ? digits.slice(0, -2) : '0';
            return parseInt(withoutCents || '0', 10);
        }

        function updateColor(reais) {
            if (input.style !== undefined) input.style.color = reais > 0 ? '#ffffff' : '#6b7280';
        }

        function setCursorBeforeComma() {
            const commaPos = input.value.indexOf(',');
            const pos = commaPos >= 0 ? commaPos : input.value.length;
            input.setSelectionRange(pos, pos);
        }

        // On focus: move cursor before comma
        input.addEventListener('focus', function() {
            setTimeout(() => setCursorBeforeComma(), 0);
        });

        // Intercept ALL key presses — fully controlled input
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Tab' || e.key === 'Enter') return;
            if (e.ctrlKey || e.metaKey) return;
            if (e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End') return;

            e.preventDefault();

            let reais = displayToReais(input.value);

            if (/^\d$/.test(e.key)) {
                // Append digit to integer part (like a calculator — works in reais, not centavos)
                reais = reais * 10 + parseInt(e.key, 10);
                if (reais > 99999999999) return; // limit ~99 billion reais
            } else if (e.key === 'Backspace') {
                // Remove last digit (rightmost)
                reais = Math.floor(reais / 10);
            } else if (e.key === 'Delete') {
                // Remove first digit (leftmost) — e.g. 12345 → 2345
                if (reais > 0) {
                    const str = String(reais);
                    reais = str.length > 1 ? parseInt(str.slice(1), 10) : 0;
                }
            } else {
                return;
            }

            input.value = reaisToDisplay(reais);
            setCursorBeforeComma();
            updateColor(reais);
            if (onChange) onChange(input.value, reais);
            executarPipelineCore();
        });

        input.addEventListener('paste', function(e) {
            e.preventDefault();
            let t = (e.clipboardData || window.clipboardData).getData('text');
            t = t.trim().replace(/[^\d,\.]/g, '');
            // Strip decimal part — we only care about integer reais
            if (t.includes(',')) t = t.split(',')[0];
            if (t.includes('.')) {
                // Could be thousand separators or decimal dot
                const parts = t.split('.');
                if (parts[parts.length - 1].length <= 2 && parts.length === 2) {
                    // Decimal dot — ignore decimal part
                    t = parts[0];
                } else {
                    t = t.replace(/\./g, ''); // thousand separators
                }
            }
            const reais = parseInt(t || '0', 10) || 0;
            input.value = reaisToDisplay(reais);
            setCursorBeforeComma();
            updateColor(reais);
            if (onChange) onChange(input.value, reais);
            executarPipelineDebounced();
        });

        // Ignore native input event — all handled by keydown/paste
        input.addEventListener('input', function(e) {
            executarPipelineDebounced();
        });

        input.addEventListener('blur', function() {
            if (!input.value || input.value.trim() === '') { input.value = '0,00'; }
            else if (!input.value.includes(',')) { input.value += ',00'; }
            else {
                let parts = input.value.split(',');
                if (parts[1].length === 0) input.value += '00';
                else if (parts[1].length === 1) input.value += '0';
            }
            clearTimeout(_pipelineDebounceTimer); _pipelineDebounceTimer = null;
            executarPipelineCore();
        });
    }

    let _libTooltipEl = null;
    function showLiberdadeTooltip(event, text) {
        const isAporte = text.startsWith('▲');
        if (!_libTooltipEl) {
            _libTooltipEl = document.createElement('div');
            document.body.appendChild(_libTooltipEl);
        }
        _libTooltipEl.style.cssText = isAporte
            ? 'position:fixed;z-index:9999;background:#1a1a24;border:1px solid rgba(255,204,0,0.5);border-radius:8px;padding:6px 11px;font-size:11px;font-weight:bold;color:#FFCC00;pointer-events:none;transition:opacity 0.15s;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,0.5);'
            : 'position:fixed;z-index:9999;background:#1a1a24;border:1px solid rgba(239,68,68,0.5);border-radius:8px;padding:6px 11px;font-size:11px;font-weight:bold;color:#ef4444;pointer-events:none;transition:opacity 0.15s;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,0.5);';
        _libTooltipEl.textContent = text;
        _libTooltipEl.style.opacity = '1';
        _libTooltipEl.style.left = (event.x + 14) + 'px';
        _libTooltipEl.style.top = (event.y - 8) + 'px';
    }
    function hideLiberdadeTooltip() {
        if (_libTooltipEl) _libTooltipEl.style.opacity = '0';
    }

    let poupancaAtivaPoupanca = true;
    let poupancaAtivaCorrente = false;

    function togglePoupancaTipo(tipo) {
        if (tipo === 'poupanca') {
            poupancaAtivaPoupanca = !poupancaAtivaPoupanca;
            const dot = document.getElementById('radioPoupancaDot');
            if (poupancaAtivaPoupanca) {
                dot.style.background = '#FF8C00';
                dot.style.borderColor = '#FF8C00';
                dot.style.boxShadow = '0 0 5px rgba(255,140,0,0.5)';
                document.getElementById('lblTaxaPoupanca').style.color = '#FF8C00';
            } else {
                dot.style.background = 'transparent';
                dot.style.borderColor = '#3a3a48';
                dot.style.boxShadow = 'none';
                document.getElementById('lblTaxaPoupanca').style.color = '#6b7280';
            }
        } else {
            poupancaAtivaCorrente = !poupancaAtivaCorrente;
            const dot = document.getElementById('radioCorrenteDot');
            if (poupancaAtivaCorrente) {
                dot.style.background = '#ef4444';
                dot.style.borderColor = '#ef4444';
                dot.style.boxShadow = '0 0 5px rgba(239,68,68,0.5)';
            } else {
                dot.style.background = 'transparent';
                dot.style.borderColor = '#3a3a48';
                dot.style.boxShadow = 'none';
            }
        }
        executarPipelineCore();
    }

    function ativarEdicaoTaxaPoupanca() {
        document.getElementById('lblTaxaPoupanca').classList.add('hidden');
        const inp = document.getElementById('inputTaxaPoupanca');
        inp.classList.remove('hidden');
        inp.focus();
        inp.select();
    }

    function finalizarEdicaoTaxaPoupanca() {
        const inp = document.getElementById('inputTaxaPoupanca');
        const lbl = document.getElementById('lblTaxaPoupanca');
        let val = parseFloat(inp.value.replace(',', '.')) || POUPANCA_TAXA_PADRAO;
        if (val < 0) val = 0;
        if (val > 50) val = 50;
        inp.value = val.toFixed(2);
        lbl.textContent = val.toFixed(2).replace('.', ',') + '%';
        inp.classList.add('hidden');
        lbl.classList.remove('hidden');
        executarPipelineCore();
    }

    function calcularDadosPoupanca(labels, vInicial, aporteMensal, isCorrente) {
        const taxaAnual = isCorrente ? 0 : (parseFloat(document.getElementById('inputTaxaPoupanca')?.value) || POUPANCA_TAXA_PADRAO) / 100;
        const taxaMensal = isCorrente ? 0 : Math.pow(1 + taxaAnual, 1/12) - 1;
        // [1.1 FIX] Comparação JUSTA: usa o MESMO cronograma de aportes do
        // pipeline (com IPCA no aporte, aporte inteligente e suspensão na
        // retirada) e o mesmo plano de retiradas. Antes a poupança aportava o
        // valor base fixo — com IPCA/retirada ativos, cada linha recebia um
        // dinheiro diferente. Fallback: aporte base (mês 1 sem aporte).
        const aportes = baseDadosCalculados.aportesMensais || null;
        const retiradas = baseDadosCalculados.retiradasMensais || null;
        const apDoMes = (m) => aportes ? (aportes[m-1] ?? 0) : (m === 1 ? 0 : aporteMensal);
        const retDoMes = (m) => retiradas ? (retiradas[m-1] ?? 0) : 0;
        const data = [];
        let saldo = vInicial;
        for (let i = 0; i < labels.length; i++) {
            if (i === 0) { data.push(Math.round(vInicial)); continue; }
            const prevMeses = tipoPeriodo === 'anual' ? parseInt(labels[i-1]) * 12 : parseInt(labels[i-1]);
            const curMeses = tipoPeriodo === 'anual' ? parseInt(labels[i]) * 12 : parseInt(labels[i]);
            const steps = curMeses - prevMeses;
            for (let s = 0; s < steps; s++) {
                const mesAbs = prevMeses + s + 1;
                saldo = saldo * (1 + taxaMensal) + apDoMes(mesAbs);
                const ret = retDoMes(mesAbs);
                if (ret > 0) saldo = Math.max(0, saldo - ret);
            }
            data.push(Math.round(saldo));
        }
        return data;
    }

    const neonGlowPlugin = {
        id: 'neonGlow',
        beforeDatasetDraw: (chart, args) => {
            const ctx = chart.ctx;
            const borderColor = args.meta.dataset.options.borderColor;
            ctx.save();
            ctx.shadowBlur = 10;
            ctx.shadowColor = borderColor;
        },
        afterDatasetDraw: (chart) => { chart.ctx.restore(); },
        afterDraw: (chart) => {
            const ctx = chart.ctx;
            // Dataset index 2 = Patrimônio Total (green)
            const totalMeta = chart.getDatasetMeta(2);
            if (!totalMeta || !totalMeta.data) return;

            // --- Meta de Patrimônio: linha vertical + losango no cruzamento ---
            const metaPointsToRender = _metaPoints && _metaPoints.length > 0 ? _metaPoints : (_metaPoint ? [_metaPoint] : []);
            metaPointsToRender.forEach(mp => {
                const yScale = chart.scales.y;
                const xScale = chart.scales.x;
                const metaVal = mp.valor;
                // Y position: interpolate patrimônio value at exact crossing point
                let yInterp = metaVal;
                if (mp.fracIdx !== undefined && mp.idx >= 1 && mp.idx < totalMeta.data.length) {
                    const frac = mp.fracIdx - (mp.idx - 1);
                    const yPrevPx = totalMeta.data[mp.idx - 1]?.y;
                    const yCurrPx = totalMeta.data[mp.idx]?.y;
                    if (yPrevPx !== undefined && yCurrPx !== undefined) {
                        // interpolate pixel Y directly
                        var yPos = yPrevPx + (yCurrPx - yPrevPx) * frac;
                    } else {
                        var yPos = yScale.getPixelForValue(metaVal);
                    }
                } else {
                    var yPos = yScale.getPixelForValue(metaVal);
                }

                // Use interpolated fracIdx for exact X position between two chart points
                let xMark = null;
                if (mp.fracIdx !== undefined && mp.idx < totalMeta.data.length && mp.idx >= 1) {
                    const xPrev = totalMeta.data[mp.idx - 1]?.x;
                    const xCurr = totalMeta.data[mp.idx]?.x;
                    if (xPrev !== undefined && xCurr !== undefined) {
                        const frac = mp.fracIdx - (mp.idx - 1);
                        xMark = xPrev + (xCurr - xPrev) * frac;
                    }
                }
                if (!xMark && mp.idx < totalMeta.data.length) {
                    xMark = totalMeta.data[mp.idx]?.x;
                }
                if (!xMark) return;

                // vertical dashed line at crossing X
                ctx.save();
                ctx.setLineDash([5, 4]);
                ctx.strokeStyle = 'rgba(167,139,250,0.5)';
                ctx.lineWidth = 1.3;
                ctx.beginPath();
                ctx.moveTo(xMark, yScale.top);
                ctx.lineTo(xMark, yScale.bottom);
                ctx.stroke();
                ctx.restore();

                // diamond marker at intersection point
                ctx.save();
                ctx.shadowBlur = 14;
                ctx.shadowColor = '#a78bfa';
                ctx.fillStyle = '#a78bfa';
                ctx.beginPath();
                const ds = 7;
                ctx.moveTo(xMark, yPos - ds);
                ctx.lineTo(xMark + ds, yPos);
                ctx.lineTo(xMark, yPos + ds);
                ctx.lineTo(xMark - ds, yPos);
                ctx.closePath();
                ctx.fill();
                // value label in short format
                ctx.shadowBlur = 0;
                ctx.font = 'bold 9px sans-serif';
                ctx.fillStyle = '#a78bfa';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                const shortVal = metaVal >= 1e6 ? (metaVal/1e6).toFixed(metaVal%1e6===0?0:1)+'M' : metaVal >= 1e3 ? (metaVal/1e3).toFixed(metaVal%1e3===0?0:1)+'k' : String(Math.round(metaVal));
                ctx.fillText(shortVal, xMark + 10, yPos);
                ctx.restore();
            });

            // --- Bandeira de Liberdade fincada na bolinha do Patrimônio Total ---
            if (_liberdadePoint && _liberdadePoint.idx < totalMeta.data.length) {
                const ptPrev = _liberdadePoint.fracIdx !== undefined && _liberdadePoint.idx > 0 ? totalMeta.data[_liberdadePoint.idx - 1] : null;
                const ptCurr = totalMeta.data[_liberdadePoint.idx];
                let x, y;
                if (ptPrev && ptCurr && _liberdadePoint.fracIdx !== undefined) {
                    const frac = _liberdadePoint.fracIdx - (_liberdadePoint.idx - 1);
                    x = ptPrev.x + (ptCurr.x - ptPrev.x) * frac;
                    y = ptPrev.y + (ptCurr.y - ptPrev.y) * frac;
                } else if (ptCurr) {
                    x = ptCurr.x;
                    y = ptCurr.y;
                } else {
                    x = null;
                }
                if (x !== null) {
                    ctx.save();
                    ctx.font = '17px serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText('🚩', x, y - 4);
                    ctx.restore();
                }
            }

            // --- Triângulo amarelo: Último Aporte Eficaz ---
            if (_ultimoAportePoint && _ultimoAportePoint.idx < totalMeta.data.length) {
                const uaPtPrev = _ultimoAportePoint.fracIdx !== undefined && _ultimoAportePoint.idx > 0 ? totalMeta.data[_ultimoAportePoint.idx - 1] : null;
                const uaPtCurr = totalMeta.data[_ultimoAportePoint.idx];
                let uaX = null;
                if (uaPtPrev && uaPtCurr && _ultimoAportePoint.fracIdx !== undefined) {
                    const frac = _ultimoAportePoint.fracIdx - (_ultimoAportePoint.idx - 1);
                    uaX = uaPtPrev.x + (uaPtCurr.x - uaPtPrev.x) * frac;
                } else if (uaPtCurr) {
                    uaX = uaPtCurr.x;
                }
                if (uaX !== null) {
                    const x = uaX;
                    const yScale = chart.scales.y;
                    const bottom = yScale.bottom;
                    const triW = 9;
                    const triH = 12;
                    const triY = bottom + 6;

                    ctx.save();
                    // Draw glowing triangle pointing up on X axis
                    ctx.shadowBlur = 12;
                    ctx.shadowColor = '#FFCC00';
                    ctx.beginPath();
                    ctx.moveTo(x, triY - triH);
                    ctx.lineTo(x - triW, triY);
                    ctx.lineTo(x + triW, triY);
                    ctx.closePath();
                    ctx.fillStyle = '#FFCC00';
                    ctx.fill();
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                    ctx.restore();

                    // Vertical dashed line from triangle tip to chart top
                    ctx.save();
                    ctx.setLineDash([3, 4]);
                    ctx.strokeStyle = 'rgba(255,204,0,0.45)';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(x, triY - triH);
                    ctx.lineTo(x, yScale.top);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }
    };

    function alternarModoExibicao(modo) {
        modoAtual = modo;
        document.body.classList.toggle('modo-simples', modo === 'simples');
        document.body.classList.toggle('modo-completo', modo === 'completo');
        const btnS = document.getElementById('btnModoSimples');
        const btnC = document.getElementById('btnModoCompleto');

        if (modo === 'simples') {
            btnS.className = "text-xs font-bold px-3 py-1.5 rounded-lg transition-all duration-200 text-toggle-active";
            btnS.style.background = 'var(--gold)';
            btnC.className = "text-xs font-bold px-3 py-1.5 rounded-lg text-gray-400 hover:text-white transition-all duration-200";
            btnC.style.background = '';
            document.getElementById('containerAporteInteligente').classList.add('hidden');
            document.getElementById('inflacaoSection').classList.add('hidden');
            document.getElementById('ipcaInlineBox').classList.add('hidden');
            document.getElementById('ipcaInlineBox').classList.remove('flex');
            document.getElementById('divReiniciarAvancado').classList.add('hidden');
            document.getElementById('vidaRealRow').style.visibility = 'hidden';
            document.getElementById('idadeSection').classList.add('hidden');
            document.getElementById('periodoSection').classList.remove('opacity-30','pointer-events-none');
            const vidaRealEstaAtivo = document.getElementById('chkVidaReal').checked;
            if (vidaRealEstaAtivo && typeof _periodoAntesDaVidaReal !== 'undefined' && _periodoAntesDaVidaReal !== null) {
                document.getElementById('inputAnos').value = _periodoAntesDaVidaReal;
            }
            document.getElementById('ipcaCalculadoraRow').classList.remove('hidden');
            document.getElementById('ipcaCalculadoraRow').style.display = 'flex';
            document.getElementById('modoReversoSection')?.classList.remove('hidden');
            // Não reseta inspeção temporal ao trocar de modo — preserva estado
            cardNeonMap.forEach(m => {
                document.getElementById(m.cardId)?.classList.remove('card-selected-purple');
            });
            activeCardId = null;
            document.getElementById('cardInfoPanel')?.classList.add('hidden');
            if (typeof fecharPainelCard === 'function') fecharPainelCard(); // v1.doido
        } else {
            btnC.className = "text-xs font-bold px-3 py-1.5 rounded-lg transition-all duration-200 text-toggle-active";
            btnC.style.background = 'var(--gold)';
            btnS.className = "text-xs font-bold px-3 py-1.5 rounded-lg text-gray-400 hover:text-white transition-all duration-200";
            btnS.style.background = '';
            document.getElementById('containerAporteInteligente').classList.remove('hidden');
            document.getElementById('inflacaoSection').classList.remove('hidden');
            document.getElementById('ipcaInlineBox').classList.remove('hidden');
            document.getElementById('ipcaInlineBox').classList.add('flex');
            document.getElementById('divReiniciarAvancado').classList.remove('hidden');
            document.getElementById('vidaRealRow').style.visibility = 'visible';
            document.getElementById('ipcaCalculadoraRow').classList.add('hidden');
            document.getElementById('ipcaCalculadoraRow').style.display = 'none';
            document.getElementById('modoReversoSection')?.classList.add('hidden');
            if (document.getElementById('chkVidaReal').checked) {
                document.getElementById('idadeSection').classList.remove('hidden');
                document.getElementById('periodoSection').classList.add('opacity-30', 'pointer-events-none');
            }
            // Restaura visual da inspeção temporal se estava ativa
            if (temporalAtivo) {
                document.getElementById('chkTemporalAtivo').checked = true;
                document.getElementById('boxTemporalInput').classList.remove('opacity-30','pointer-events-none');
            }
        }
        executarPipelineCore();
    }

    // Debounce: só atualiza o gráfico 2s após parar de digitar, ou ao trocar de campo
    let _pipelineDebounceTimer = null;
    function executarPipelineDebounced() {
        clearTimeout(_pipelineDebounceTimer);
        _pipelineDebounceTimer = setTimeout(() => executarPipelineCore(), 2000);
    }
    // Ao sair de qualquer input (blur = trocou de campo), atualiza imediatamente
    document.addEventListener('focusout', function(e) {
        if (e.target.tagName === 'INPUT' && _pipelineDebounceTimer) {
            clearTimeout(_pipelineDebounceTimer);
            _pipelineDebounceTimer = null;
            executarPipelineCore();
        }
    }, true);

    function executarPipelineCore() {
        const vInicial = parseCurrencyValue(document.getElementById('inputInicial').value);
        const aporteMensalBase = parseCurrencyValue(document.getElementById('inputMensal').value);
        const taxaInput = (parseFloat(document.getElementById('inputTaxa').value) || 0) / 100;
        
        const vidaRealAtivo = document.getElementById('chkVidaReal')?.checked;
        let tempoInput;
        if (vidaRealAtivo) {
            const idadeAtual = parseInt(document.getElementById('inputIdade').value) || 30;
            const expectativa = parseInt(document.getElementById('inputExpectativaVida').value) || 76;
            tempoInput = Math.max(1, expectativa - idadeAtual);
            document.getElementById('inputAnos').value = tempoInput;
            const anos = tempoInput;
            document.getElementById('txtVidaRealCalc').textContent = `Simulação: ${anos} anos restantes`;
        } else {
            tempoInput = parseInt(document.getElementById('inputAnos').value) || 1;
        }

        const avancadoAtivo = document.getElementById('chkAtivarAvancado').checked;

        const anoInicioInteligenteRaw = parseInt(document.getElementById('inputAnoInicioInteligente').value) || 0;
        const aporteInteligenteAtivo = document.getElementById('chkAporteInteligente').checked && anoInicioInteligenteRaw > 0;
        const anoInicioInteligente = anoInicioInteligenteRaw > 0 ? anoInicioInteligenteRaw : 9999;
        const novoAporte = parseCurrencyValue(document.getElementById('inputNovoAporte').value);

        const anoInicioRetiradaRaw = parseInt(document.getElementById('inputAnoInicioRetirada').value) || 0;
        const retiradaAtiva = document.getElementById('chkRetirada')?.checked && anoInicioRetiradaRaw > 0;
        const anoInicioRetirada = anoInicioRetiradaRaw > 0 ? anoInicioRetiradaRaw : 9999;
        const valorRetiradaPretendida = parseCurrencyValue(document.getElementById('inputValorRetirada').value);
        
        const inflacaoAporteAtiva = modoAtual === 'completo'
            ? (document.getElementById('chkInflacaoAporte')?.checked || false)
            : (document.getElementById('chkIpcaCalc')?.checked || false);
        const taxaInflacaoAporte = modoAtual === 'completo'
            ? ((parseFloat(document.getElementById('inputInflacao')?.value) || 4.5) / 100)
            : ((parseFloat(document.getElementById('inputIpcaCalcValor')?.value) || 4.5) / 100);

        let taxaMensal = tipoTaxa === 'anual' ? Math.pow(1 + taxaInput, 1/12) - 1 : taxaInput;
        let taxaAnualEquivalente = tipoTaxa === 'anual' ? taxaInput : Math.pow(1 + taxaInput, 12) - 1;

        let totalMeses = tipoPeriodo === 'anual' ? tempoInput * 12 : tempoInput;
        let totalCiclosGrafico = tipoPeriodo === 'anual' ? tempoInput : totalMeses;

        const anoFiltroInput = document.getElementById('inputAnoFiltro');
        anoFiltroInput.max = totalCiclosGrafico;
        if (parseInt(anoFiltroInput.value) > totalCiclosGrafico) anoFiltroInput.value = totalCiclosGrafico;
        if (!temporalAtivo) anoFiltroInput.value = totalCiclosGrafico;

        document.getElementById('labelTemporalSufixo').textContent = tipoPeriodo === 'anual' ? 'Ano' : 'Mês';

        let labels = ['0'];
        let dataInvestido = [vInicial];
        let dataJuros = [0];
        let dataTotal = [vInicial];
        // renda do ponto 0: mesma base dos demais pontos (anual usa taxa anual equivalente)
        const rendaZero = tipoPeriodo === 'anual' ? vInicial * taxaAnualEquivalente : vInicial * taxaMensal;
        let dataRenda = [Math.round(rendaZero)];
        let aporteVigentePerAno = {};

        baseDadosCalculados.anos = {};
        baseDadosCalculados.anos[0] = { investido: vInicial, juros: 0, total: vInicial, renda: rendaZero, aporteVigente: 0 };

        let saldoTotal = vInicial;
        let saldoInvestido = vInicial;
        let aporteVigente = aporteMensalBase;
        let anoAnterior = 0;
        let mesRuina = null; // primeiro mês em que o patrimônio zera durante a retirada
        // [2.6] Cronograma REAL de aporte de cada mês (já com IPCA, aporte inteligente
        // e retiradas). Consumido por Monte Carlo e Custo do Atraso para que as
        // simulações usem exatamente os mesmos aportes do pipeline.
        const aportesEfetivos = [];
        // [1.1] Plano de retiradas de cada mês (retirada mensal pretendida +
        // retiradas pontuais). Espelhado na comparação com Poupança/Corrente
        // para a comparação usar o MESMO dinheiro entrando e saindo.
        const retiradasPlanejadas = [];

        for (let m = 1; m <= totalMeses; m++) {
            let anoAtual = Math.ceil(m / 12);
            
            if (inflacaoAporteAtiva && anoAtual > anoAnterior) {
                if (anoAnterior > 0) {
                    const aiAtivo = (modoAtual === 'completo' && avancadoAtivo && aporteInteligenteAtivo);
                    if (!aiAtivo || anoAtual < anoInicioInteligente) {
                        aporteVigente = aporteVigente * (1 + taxaInflacaoAporte);
                    }
                }
                anoAnterior = anoAtual;
            }

            let aporteEsteMes = (m === 1) ? 0 : aporteVigente;

            if (modoAtual === 'completo' && avancadoAtivo) {
                if (aporteInteligenteAtivo && anoAtual >= anoInicioInteligente) {
                    if (aporteVigente !== novoAporte || anoAtual === anoInicioInteligente) {
                        aporteVigente = novoAporte;
                    }
                    aporteEsteMes = (m === 1) ? 0 : novoAporte;
                }
                if (retiradaAtiva && anoAtual >= anoInicioRetirada) {
                    saldoTotal = saldoTotal * (1 + taxaMensal);
                    // saque consome juros primeiro, depois principal (abate o investido)
                    const jurosDisp = Math.max(0, saldoTotal - saldoInvestido);
                    const saque = Math.min(valorRetiradaPretendida, saldoTotal);
                    if (saque > jurosDisp) {
                        saldoInvestido -= (saque - jurosDisp);
                        if (saldoInvestido < 0) saldoInvestido = 0;
                    }
                    saldoTotal -= saque;
                    if (saldoTotal <= 0 && mesRuina === null) mesRuina = m;
                } else {
                    saldoTotal = (saldoTotal * (1 + taxaMensal)) + aporteEsteMes;
                    saldoInvestido += aporteEsteMes;
                }
            } else {
                saldoTotal = (saldoTotal * (1 + taxaMensal)) + aporteEsteMes;
                saldoInvestido += aporteEsteMes;
            }
            const _emRetirada = (modoAtual === 'completo' && avancadoAtivo && retiradaAtiva && anoAtual >= anoInicioRetirada);
            aportesEfetivos.push(_emRetirada ? 0 : aporteEsteMes);

            // [2.4] Retirada única: consome os JUROS primeiro; o que passar disso
            // abate o investido — assim a linha azul (aportado) nunca fica acima
            // da verde (total) e os juros não "zeram" artificialmente.
            const _aplicarRetiradaUnica = (valUnica) => {
                if (!(valUnica > 0)) return;
                const saque = Math.min(valUnica, saldoTotal);
                const jurosDisp = Math.max(0, saldoTotal - saldoInvestido);
                if (saque > jurosDisp) saldoInvestido = Math.max(0, saldoInvestido - (saque - jurosDisp));
                saldoTotal -= saque;
            };
            let retiradaUnicaMes = 0; // [1.1] soma p/ espelhar na poupança
            if (tipoPeriodo === 'anual' && m % 12 === 0) {
                const anoParaCheck = m / 12;
                retiradaUnicaList.forEach(r => {
                    if (r.ano === anoParaCheck) { const v = parseCurrencyValue(r.valorRaw || ''); retiradaUnicaMes += Math.max(0, v); _aplicarRetiradaUnica(v); }
                });
            } else if (tipoPeriodo === 'mensal') {
                retiradaUnicaList.forEach(r => {
                    if (r.ano === m) { const v = parseCurrencyValue(r.valorRaw || ''); retiradaUnicaMes += Math.max(0, v); _aplicarRetiradaUnica(v); }
                });
            }
            // [1.1] Registra o plano de saída do mês (valor pretendido, não o
            // efetivamente sacado — a poupança aplica o mesmo plano ao saldo dela)
            retiradasPlanejadas.push((_emRetirada ? valorRetiradaPretendida : 0) + retiradaUnicaMes);
            // [2.3] Durante a retirada os aportes ficam suspensos — o card do ano
            // mostra "sem aportes mensais" em vez de um aporte que não acontece.
            aporteVigentePerAno[anoAtual] = (modoAtual === 'completo' && avancadoAtivo && retiradaAtiva && anoAtual >= anoInicioRetirada) ? 0 : aporteVigente;

            if (saldoTotal < 0) saldoTotal = 0;
            let jurosAcumulados = Math.max(0, saldoTotal - saldoInvestido);
            let yieldMomento = tipoPeriodo === 'anual' ? saldoTotal * taxaAnualEquivalente : saldoTotal * taxaMensal;

            if (tipoPeriodo === 'anual') {
                if (m % 12 === 0) {
                    let anoIndice = m / 12;
                    labels.push(anoIndice.toString());
                    dataInvestido.push(Math.round(saldoInvestido));
                    dataJuros.push(Math.round(jurosAcumulados));
                    dataTotal.push(Math.round(saldoTotal));
                    dataRenda.push(Math.round(yieldMomento));
                    baseDadosCalculados.anos[anoIndice] = { investido: saldoInvestido, juros: jurosAcumulados, total: saldoTotal, renda: yieldMomento, aporteVigente: aporteVigentePerAno[anoIndice] || 0 };
                }
            } else {
                labels.push(m.toString());
                dataInvestido.push(Math.round(saldoInvestido));
                dataJuros.push(Math.round(jurosAcumulados));
                dataTotal.push(Math.round(saldoTotal));
                dataRenda.push(Math.round(yieldMomento));
                baseDadosCalculados.anos[m] = { investido: saldoInvestido, juros: jurosAcumulados, total: saldoTotal, renda: yieldMomento, aporteVigente: aporteVigente };
            }
        }

        baseDadosCalculados.final.total = saldoTotal;
        baseDadosCalculados.final.renda = baseDadosCalculados.anos[totalCiclosGrafico]?.renda || 0;
        baseDadosCalculados.aportesMensais = aportesEfetivos; // [2.6] cronograma real
        baseDadosCalculados.retiradasMensais = retiradasPlanejadas; // [1.1] plano de saídas

        // Alerta de sustentabilidade: patrimônio esgotado durante a retirada
        const ruinaEl = document.getElementById('alertaRuina');
        if (ruinaEl) {
            if (mesRuina !== null && retiradaAtiva) {
                const cicloRuina = tipoPeriodo === 'anual' ? Math.ceil(mesRuina / 12) : mesRuina;
                const sufRuina = tipoPeriodo === 'anual' ? 'Ano' : 'Mês';
                ruinaEl.textContent = `⚠️ Patrimônio se esgota no ${sufRuina} ${cicloRuina} com esse nível de retirada.`;
                ruinaEl.classList.remove('hidden');
            } else {
                ruinaEl.classList.add('hidden');
            }
        }

        const exportBtns = document.getElementById('exportBtns');
        if (exportBtns) exportBtns.classList.toggle('hidden', !dataTotal.some(v => v > 0));

        if (!window._cardClickTriggered) {
            if (activeCardDataset >= 0) {
                cardNeonMap.forEach(m => document.getElementById(m.cardId)?.classList.remove(m.neonClass));
                activeCardDataset = -1;
            }
        }
        window._cardClickTriggered = false;
        atualizarMetricasExibidas();

        // Funcoes Malucas: modificar dados antes do grafico
        // modo doido: usa simularHibrido; modo normal: logica original
        let dataTotalFinal = [...dataTotal];
        let monteCarloData = null;
        let sabaticoDataGrafico = null;

        if (cisneNegroAtivo) {
            dataTotalFinal = (typeof _doidoMode !== 'undefined' && _doidoMode)
                ? aplicarCisneNegroHibrido(dataTotal, labels)
                : aplicarCisneNegro(dataTotal, labels);
            if (_doidoMode) calcularCisneResultadoDoido(dataTotal, dataTotalFinal);
        }

        if (monteCarloAtivo) {
            const taxaAnualBase = tipoTaxa === 'anual'
                ? (parseFloat(document.getElementById('inputTaxa').value) || 0) / 100
                : Math.pow(1 + (parseFloat(document.getElementById('inputTaxa').value) || 0) / 100, 12) - 1;
            // volatilidade modifica a linha verde diretamente; original vira fantasma cinza
            const mcResult = (typeof _doidoMode !== 'undefined' && _doidoMode)
                ? calcularMonteCarloHibrido(labels, parseCurrencyValue(document.getElementById('inputInicial').value), parseCurrencyValue(document.getElementById('inputMensal').value), taxaAnualBase)
                : aplicarMonteCarlo(labels, parseCurrencyValue(document.getElementById('inputInicial').value), parseCurrencyValue(document.getElementById('inputMensal').value), taxaAnualBase);
            if (mcResult) {
                // garantir que ano 0 é idêntico ao original (não afetado por volatilidade)
                if (labels[0] === '0' && mcResult.length === dataTotal.length) {
                    mcResult[0] = dataTotal[0];
                }
                monteCarloData = dataTotal; // original vira fantasma
                dataTotalFinal = mcResult;  // linha verde fica serrilhada
            }
        }

        if (sabaticoAtivo) {
            const vInicialSab    = parseCurrencyValue(document.getElementById('inputInicial').value);
            const aporteMensalSab = parseCurrencyValue(document.getElementById('inputMensal').value);
            const taxaAnualSab   = (parseFloat(document.getElementById('inputTaxa').value) || 0) / 100;
            const taxaMensalSab  = tipoTaxa === 'anual' ? Math.pow(1 + taxaAnualSab, 1/12) - 1 : taxaAnualSab;
            const anoSabG = parseInt(document.getElementById('inputSabaticoAno')?.value) || 6;

            // gerar array com sabático: idêntico ao original até anoSabG-1, diverge a partir daí
            let sabArray;
            if (typeof _doidoMode !== 'undefined' && _doidoMode) {
                const sabResult = calcularSabaticoHibrido(labels, vInicialSab, aporteMensalSab, taxaMensalSab);
                sabArray = sabResult.dataTotal;
            } else {
                const durMesesG   = parseInt(document.getElementById('inputSabaticoDuracao')?.value) || 12;
                const saqueMensalG = parseCurrencyValue(document.getElementById('inputSabaticoSaque')?.value) || 0;
                const mesSabInicioG = anoSabG * 12;
                const mesSabFimG    = mesSabInicioG + durMesesG;
                sabArray = [];
                let saldoSab = vInicialSab;
                const isPeriodoAnual = tipoPeriodo === 'anual';
                for (let ciclo = 1; ciclo <= totalCiclosGrafico; ciclo++) {
                    const stepsPerCiclo = isPeriodoAnual ? 12 : 1;
                    const baseM = (ciclo - 1) * stepsPerCiclo;
                    for (let s = 0; s < stepsPerCiclo; s++) {
                        const m = baseM + s + 1;
                        if (m > mesSabInicioG && m <= mesSabFimG) { saldoSab = saldoSab * (1 + taxaMensalSab) - saqueMensalG; }
                        // Convenção do site: mês 1 sem aporte (o 1º aporte já está no valor inicial)
                        else { saldoSab = saldoSab * (1 + taxaMensalSab) + (m === 1 ? 0 : aporteMensalSab); }
                        if (saldoSab < 0) saldoSab = 0;
                    }
                    sabArray.push(Math.round(saldoSab));
                }
            }
            // forçar anos antes do sabático a serem idênticos ao pipeline original
            for (let i = 0; i < Math.min(anoSabG - 1, sabArray.length); i++) {
                sabArray[i] = dataTotal[i];
            }
            // sabático modifica linha verde; original vira fantasma cinza
            sabaticoDataGrafico = [...dataTotal]; // fantasma = original
            dataTotalFinal = sabArray;             // linha verde com impacto do sabático
        }

        // modo doido + atraso: calcular dados para o gráfico de atraso
        let atrasoDataGrafico = null;
        if (typeof _doidoMode !== 'undefined' && _doidoMode && atrasoAtivo) {
            atrasoDataGrafico = calcularAtrasoParaGrafico();
        }
        renderizarGrafico(labels, dataInvestido, dataJuros, dataTotalFinal, dataRenda, totalCiclosGrafico, { monteCarloData, dataTotalOriginal: cisneNegroAtivo ? dataTotal : null, sabaticoData: sabaticoDataGrafico, atrasoData: atrasoDataGrafico });
        refreshActivePopups();
        atualizarStatusLed();
        atualizarIpcaCalcInfo();

        const usarInflacao = document.getElementById('chkInflacao')?.checked;
        if (usarInflacao && modoAtual === 'completo') {
            const inflacao = (parseFloat(document.getElementById('inputInflacao')?.value) || 0) / 100;
            // tempoInput é ANOS no período anual e MESES no mensal — o deflator é sempre por anos
            const anosDeflacao = tipoPeriodo === 'anual' ? tempoInput : tempoInput / 12;
            const fator = Math.pow(1 + inflacao, anosDeflacao);
            const totalEl = document.getElementById('kpiTotal');
            const rendaEl = document.getElementById('kpiRendaAnual');
            const totalNum = (_kpiState['kpiTotal']?.current) ?? parseCurrencyValue(totalEl.innerText.replace('R$','').trim());
            const rendaNum = (_kpiState['kpiRendaAnual']?.current) ?? parseCurrencyValue(rendaEl.innerText.replace('R$','').trim());
            totalEl.innerHTML = formatCurrency(totalNum) + '<div class="text-[10px] text-gray-400 mt-1">Real: ' + (totalNum/fator).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) + '</div>';
            rendaEl.innerHTML = formatCurrency(rendaNum) + '<div class="text-[10px] text-gray-400 mt-1">Real: ' + (rendaNum/fator).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) + '</div>';
        }

        // Modo reverso: recalcula sempre que pipeline rodar (sincroniza com todos os parâmetros)
        calcularModoReverso();
        // Hook Funções Malucas
        hookFuncoesMalucas();
    }

    function atualizarMetricasExibidas() {
        const tempoInput = parseInt(document.getElementById('inputAnos').value) || 1;
        let totalCiclosGrafico = tempoInput;

        let cicloFinal = totalCiclosGrafico;

        let cicloInspecao = cicloFinal;
        if (modoAtual === 'completo' && temporalAtivo) {
            cicloInspecao = parseInt(document.getElementById('inputAnoFiltro').value) || cicloFinal;
        }

        const badgeStatus = document.getElementById('badgeStatusAno');
        if (modoAtual === 'completo' && temporalAtivo) {
            badgeStatus.classList.remove('hidden');
            document.getElementById('txtAnoSelecionadoBadge').innerText = `${tipoPeriodo === 'anual' ? 'Ano' : 'Mês'} ${cicloInspecao}`;
        } else {
            badgeStatus.classList.add('hidden');
        }

        const cicloParaCards = modoAtual === 'simples' ? cicloFinal : cicloInspecao;
        const d = baseDadosCalculados.anos[cicloParaCards] || { investido: 0, juros: 0, total: 0, renda: 0 };
        const finalTotal = baseDadosCalculados.final.total || 1;
        const finalRenda = baseDadosCalculados.final.renda || 1;

        animarKPI('kpiInvestido', d.investido);
        animarKPI('kpiJuros',     d.juros);
        animarKPI('kpiTotal',     d.total);

        const somaCard = d.total || 1;
        const pctJurosNoPat = d.total > 0 ? Math.round((d.juros/d.total)*100) : 0;
        const pctAporteNoPat = d.total > 0 ? Math.round((d.investido/d.total)*100) : 0;

        const comentTotalEl = document.getElementById('comentarioTotal');
        if (comentTotalEl) {
            if (d.total > 0) {
                // Patrimônio real (poder de compra hoje) se IPCA ativo
                const ipcaAtivo = modoAtual === 'completo'
                    ? document.getElementById('chkInflacaoAporte')?.checked
                    : document.getElementById('chkIpcaCalc')?.checked;
                if (ipcaAtivo && cicloParaCards > 0) {
                    const taxaIpca = modoAtual === 'completo'
                        ? (parseFloat(document.getElementById('inputInflacao')?.value) || 4.5) / 100
                        : (parseFloat(document.getElementById('inputIpcaCalcValor')?.value) || 4.5) / 100;
                    const anosParaDeflacionar = tipoPeriodo === 'anual' ? cicloParaCards : cicloParaCards / 12;
                    const fatorInflacao = Math.pow(1 + taxaIpca, anosParaDeflacionar);
                    const patrimonioReal = d.total / fatorInflacao;
                    comentTotalEl.textContent = `${pctJurosNoPat}% juros · ${pctAporteNoPat}% aportes · Real: ${formatCurrency(patrimonioReal)}`;
                } else {
                    comentTotalEl.textContent = `${pctJurosNoPat}% gerado por juros, ${pctAporteNoPat}% por aportes`;
                }
            } else {
                comentTotalEl.textContent = 'Preencha os parâmetros para simular';
            }
        }

        const comentJurosEl = document.getElementById('comentarioJuros');
        if (comentJurosEl) {
            if (d.juros > 0 && d.investido > 0) {
                if (d.juros >= d.investido) {
                    comentJurosEl.textContent = '🎯 Juros já superam o total aportado!';
                } else {
                    const falta = formatCurrency(d.investido - d.juros);
                    comentJurosEl.textContent = `Falta ${falta} para superar o aportado`;
                }
            } else {
                comentJurosEl.textContent = 'Rendimento acumulado no período';
            }
        }

        const comentarioEl = document.getElementById('comentarioAporteMensal');
        if (comentarioEl) {
            if (modoAtual === 'completo') {
                if (temporalAtivo) {
                    const aporteAno = d.aporteVigente !== undefined ? d.aporteVigente : 0;
                    const anoLabel = `${tipoPeriodo === 'anual' ? 'Ano' : 'Mês'} ${cicloParaCards}`;
                    comentarioEl.textContent = aporteAno === 0
                        ? `${anoLabel}: sem aportes mensais`
                        : `${anoLabel}: ${formatCurrency(aporteAno)}/mês`;
                } else {
                    const ultimoAno = baseDadosCalculados.anos[cicloFinal];
                    const aporteUltimo = ultimoAno?.aporteVigente ?? 0;
                    comentarioEl.textContent = aporteUltimo === 0
                        ? `Aportes mensais: nenhum`
                        : `Aporte mensal final: ${formatCurrency(aporteUltimo)}/mês`;
                }
            } else {
                const aporteBase = parseCurrencyValue(document.getElementById('inputMensal').value);
                comentarioEl.textContent = aporteBase > 0
                    ? `Aporte mensal: ${formatCurrency(aporteBase)}/mês`
                    : 'Total investido ao longo do período';
            }
        }

        const ipcaAporteMedioEl = document.getElementById('ipcaAporteMedioCard');
        if (ipcaAporteMedioEl) {
            const ipcaAtivoNesteModo = modoAtual === 'completo'
                ? document.getElementById('chkInflacaoAporte')?.checked
                : document.getElementById('chkIpcaCalc')?.checked;
            if (ipcaAtivoNesteModo) {
                const cicloAlvo = cicloParaCards;
                const cicloData = baseDadosCalculados.anos[cicloAlvo];
                const vInicialVal = parseCurrencyValue(document.getElementById('inputInicial').value);
                const aporteBase = parseCurrencyValue(document.getElementById('inputMensal').value);
                const anosCalc = tipoPeriodo === 'anual' ? cicloAlvo : Math.ceil(cicloAlvo / 12);
                const totalMesesCalc = tipoPeriodo === 'anual' ? cicloAlvo * 12 : cicloAlvo;
                const totalInvestidoAlvo = cicloData ? cicloData.investido : 0;
                if (aporteBase > 0 && cicloAlvo > 0 && totalInvestidoAlvo > 0) {
                    const totalAportes = totalInvestidoAlvo - vInicialVal;
                    const aportesMedio = totalMesesCalc > 0 ? totalAportes / totalMesesCalc : aporteBase;
                    ipcaAporteMedioEl.textContent = `↗ Aporte médio: ${formatCurrency(Math.max(aporteBase, aportesMedio))}/mês`;
                    ipcaAporteMedioEl.classList.remove('hidden');
                } else {
                    ipcaAporteMedioEl.classList.add('hidden');
                }
            } else {
                ipcaAporteMedioEl.classList.add('hidden');
            }
        }

        document.getElementById('pctInvestido').innerText = Math.round((d.investido/somaCard)*100) + '%';
        document.getElementById('pctJuros').innerText = Math.round((d.juros/somaCard)*100) + '%';

        const pctTotalFinal = ((d.total/finalTotal)*100).toFixed(1);
        const showPctTotal = (modoAtual === 'completo' && temporalAtivo && cicloInspecao !== cicloFinal);
        const pctTotalRow = document.getElementById('pctTotalRow');
        if (pctTotalRow) pctTotalRow.classList.toggle('hidden', !showPctTotal);
        if (showPctTotal) document.getElementById('pctTotal').innerText = pctTotalFinal + '%';

        const taxaInputVal = (parseFloat(document.getElementById('inputTaxa').value) || 0);
        let taxaAnualExib = tipoTaxa === 'anual' ? taxaInputVal : (Math.pow(1 + taxaInputVal/100, 12) - 1)*100;
        const pctRendaEl = document.getElementById('pctRenda');
        const pctRendaFinal = ((d.renda/finalRenda)*100).toFixed(1);
        const showPctRenda = (modoAtual === 'completo' && temporalAtivo && cicloInspecao !== cicloFinal);
        pctRendaEl.classList.toggle('hidden', !showPctRenda);
        if (showPctRenda) {
            pctRendaEl.innerText = pctRendaFinal + '%';
        }

        if (tipoPeriodo === 'anual') {
            document.getElementById('labelRendaKpi').innerText = "Renda Anual";
            animarKPI('kpiRendaAnual', d.renda);
            document.getElementById('subKpiRendaMensal').innerText = formatCurrency(d.renda / 12) + '/mês';
        } else {
            document.getElementById('labelRendaKpi').innerText = "Renda Mensal";
            animarKPI('kpiRendaAnual', d.renda);
            document.getElementById('subKpiRendaMensal').innerText = 'Anual: ' + formatCurrency(d.renda * 12);
        }

        const comentRendaEl = document.getElementById('comentarioRenda');
        if (comentRendaEl) {
            const rendaMensal = d.renda / (tipoPeriodo === 'anual' ? 12 : 1);
            if (rendaMensal > 0) {
                const salarioMin = SALARIO_MINIMO;
                const multiplos = (rendaMensal / salarioMin).toFixed(1);
                const retiradaSegura = d.total > 0 ? (d.total * 0.04) / 12 : 0;
                const retiradaTxt = retiradaSegura > 0 ? ` · Regra 4%: ${formatCurrency(retiradaSegura)}/mês` : '';
                comentRendaEl.textContent = `≈ ${multiplos}× salário mínimo${retiradaTxt}`;
            } else {
                comentRendaEl.textContent = 'Rendimento mensal projetado do patrimônio';
            }
        }

        const showDetails = (modoAtual === 'completo' && temporalAtivo);
        const pctInvestidoFinal = ((d.investido/finalTotal)*100).toFixed(1);
        const pctJurosFinalStr = ((d.juros/(baseDadosCalculados.anos[Object.keys(baseDadosCalculados.anos).pop()]?.juros||1))*100).toFixed(1);
        document.getElementById('detailTotalTxt').innerText = `Este patrimônio representa ${pctTotalFinal}% do total projetado no final da simulação.`;
        if (d.juros > d.investido) {
            document.getElementById('detailJurosTxt').innerText = `🎯 Os juros já superaram o total aportado! O seu dinheiro trabalha mais do que você. Você atingiu o ponto de aceleração dos juros compostos.`;
        } else {
            document.getElementById('detailJurosTxt').innerText = `Os juros representam ${pctJurosFinalStr}% dos juros finais. Falta ${formatCurrency(d.investido - d.juros)} para os juros superarem o total aportado — essa é a virada mágica dos juros compostos!`;
        }
        document.getElementById('detailInvestidoTxt').innerText = `O total aportado representa ${pctInvestidoFinal}% do patrimônio final projetado.`;
        document.getElementById('detailRendaTxt').innerText = `A renda neste momento representa ${pctRendaFinal}% da renda projetada no final da simulação.`;

        ['detailTotal','detailJuros','detailInvestido','detailRenda'].forEach(id => {
            const panel = document.getElementById(id);
            if (!panel) return;
            if (showDetails) {
                panel.classList.add('expanded');
            } else {
                panel.classList.remove('expanded');
            }
        });

        const poupSecAtiva = document.getElementById('chkPoupanca')?.checked && modoAtual === 'completo' && document.getElementById('chkAtivarAvancado')?.checked;
        const anyPoupLine = poupSecAtiva && (poupancaAtivaPoupanca || poupancaAtivaCorrente);
        // Cards visibility: cenários mode takes priority, then poupança, else normal
        document.getElementById('cardsGrid').classList.toggle('hidden', anyPoupLine || (cenariosAtivo && cenarios.length > 0 && modoAtual === 'completo'));
        const gridPoup = document.getElementById('cardsGridPoupanca');
        gridPoup.classList.toggle('hidden', !anyPoupLine || (cenariosAtivo && cenarios.length > 0 && modoAtual === 'completo'));
        const gridCenarios = document.getElementById('cardsGridCenarios');
        if (gridCenarios) gridCenarios.classList.toggle('hidden', !cenariosAtivo || cenarios.length === 0 || modoAtual !== 'completo');

        if (anyPoupLine) {
            const mesesPeriodo = tipoPeriodo === 'anual' ? cicloParaCards * 12 : cicloParaCards;
            const aporte = parseCurrencyValue(document.getElementById('inputMensal').value);
            const vIni = parseCurrencyValue(document.getElementById('inputInicial').value);

            document.getElementById('kpiPoupInvest').textContent = formatCurrency(d.total);
            // [1.1 FIX] Cards usam o MESMO cronograma de aportes/retiradas do
            // pipeline (igual às linhas do gráfico) — comparação justa.
            const _apArr = baseDadosCalculados.aportesMensais || null;
            const _retArr = baseDadosCalculados.retiradasMensais || null;
            const _apM = (m) => _apArr ? (_apArr[m-1] ?? 0) : (m === 1 ? 0 : aporte);
            const _retM = (m) => _retArr ? (_retArr[m-1] ?? 0) : 0;
            const diffP = poupancaAtivaPoupanca ? (() => {
                const taxaP = (parseFloat(document.getElementById('inputTaxaPoupanca')?.value) || POUPANCA_TAXA_PADRAO) / 100;
                const taxaMP = Math.pow(1 + taxaP, 1/12) - 1;
                let sP = vIni;
                for (let m = 1; m <= mesesPeriodo; m++) { sP = sP * (1 + taxaMP) + _apM(m); const rt = _retM(m); if (rt > 0) sP = Math.max(0, sP - rt); }
                return Math.round(sP);
            })() : null;

            const diffC = poupancaAtivaCorrente ? (() => {
                let sC = vIni;
                for (let m = 1; m <= mesesPeriodo; m++) { sC += _apM(m); const rt = _retM(m); if (rt > 0) sC = Math.max(0, sC - rt); }
                return Math.round(sC);
            })() : null;

            const cardP = document.getElementById('cardPoupPoupanca');
            const cardC = document.getElementById('cardPoupCorrente');
            cardP.classList.toggle('hidden', !poupancaAtivaPoupanca);
            cardC.classList.toggle('hidden', !poupancaAtivaCorrente);

            if (diffP !== null) {
                document.getElementById('kpiPoupPoupanca').textContent = formatCurrency(diffP);
                const ganhoP = d.total - diffP;
                document.getElementById('kpiPoupPoupancaSub').textContent = ganhoP >= 0
                    ? `Seu inv. rende +${formatCurrency(ganhoP)} a mais`
                    : `Poupança rende +${formatCurrency(-ganhoP)} a mais`;
                document.getElementById('kpiPoupPoupancaSub').style.color = ganhoP >= 0 ? '#32CD32' : '#ef4444';
            }
            if (diffC !== null) {
                document.getElementById('kpiPoupCorrente').textContent = formatCurrency(diffC);
                const ganhoC = d.total - diffC;
                document.getElementById('kpiPoupCorrenteSub').textContent = ganhoC >= 0
                    ? `Seu inv. rende +${formatCurrency(ganhoC)} a mais`
                    : `Corrente rende +${formatCurrency(-ganhoC)} a mais`;
                document.getElementById('kpiPoupCorrenteSub').style.color = ganhoC >= 0 ? '#32CD32' : '#ef4444';
            }

            const sufixo = tipoPeriodo === 'anual' ? 'Ano' : 'Mês';
            const periodoLabel = (modoAtual === 'completo' && temporalAtivo) ? `${sufixo} ${cicloParaCards}` : `Final (${sufixo} ${cicloParaCards})`;
            document.getElementById('kpiPoupInvestSub').textContent = periodoLabel;
        }

        // Atualiza cards de cenários se modo cenários ativo
        if (cenariosAtivo) renderizarCenarioCards();
    }

    let activePopups = {};
    const _popupFixed = {}; // true = fixo (2 cliques), false = transiente (1 clique)
    let _transientKey = null; // chave do popup transiente atual

    function _fecharTransiente() {
        if (_transientKey && !_popupFixed[_transientKey]) {
            fecharPopupAno(_transientKey);
        }
        _transientKey = null;
    }

    document.addEventListener('click', function(e) {
        // Ignora cliques dentro de um popup ou no canvas do gráfico
        if (e.target.closest('[id^="popup_"]') || e.target.id === 'chartPatrimonio') return;
        _fecharTransiente();
    }, true);

    function criarPopupEl(ano, x, y) {
        const d = baseDadosCalculados.anos[parseInt(ano)];
        if (!d) return null;
        const id = 'popup_' + ano;
        const suffix = tipoPeriodo === 'anual' ? 'Ano' : 'Mês';

        const poupancaSecAtiva = document.getElementById('chkPoupanca')?.checked && modoAtual === 'completo' && document.getElementById('chkAtivarAvancado')?.checked;
        const showPoup = poupancaSecAtiva && poupancaAtivaPoupanca;
        const showCorr = poupancaSecAtiva && poupancaAtivaCorrente;

        let bodyRows = '';
        if (poupancaSecAtiva && (showPoup || showCorr)) {
            bodyRows += `<div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:${window._coresChart.green};font-weight:700;">Seu investimento</span><span style="color:var(--text-hi);font-weight:700;">${formatCurrency(d.total)}</span></div>`;
            if (showPoup) {
                const taxaP = (parseFloat(document.getElementById('inputTaxaPoupanca')?.value) || POUPANCA_TAXA_PADRAO) / 100;
                const taxaMP = Math.pow(1 + taxaP, 1/12) - 1;
                const mesesAno = tipoPeriodo === 'anual' ? parseInt(ano) * 12 : parseInt(ano);
                const aporte = parseCurrencyValue(document.getElementById('inputMensal').value);
                const vIni = parseCurrencyValue(document.getElementById('inputInicial').value);
                let sP = vIni;
                for (let m = 1; m <= mesesAno; m++) sP = sP * (1 + taxaMP) + (m === 1 ? 0 : aporte);
                bodyRows += `<div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:${window._coresChart.orange};font-weight:700;">Poupança</span><span style="color:var(--text-hi);">${formatCurrency(Math.round(sP))}</span></div>`;
            }
            if (showCorr) {
                const aporte = parseCurrencyValue(document.getElementById('inputMensal').value);
                const vIni = parseCurrencyValue(document.getElementById('inputInicial').value);
                const mesesAno = tipoPeriodo === 'anual' ? parseInt(ano) * 12 : parseInt(ano);
                const sC = vIni + aporte * Math.max(0, mesesAno - 1);
                bodyRows += `<div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:#ef4444;font-weight:700;">Conta Corrente</span><span style="color:var(--text-hi);">${formatCurrency(Math.round(sC))}</span></div>`;
            }
        } else {
            let aporteRow = '';
            if (modoAtual === 'completo' && d.aporteVigente !== undefined) {
                const aporteLabel = d.aporteVigente === 0 ? 'Sem aportes' : formatCurrency(d.aporteVigente) + '/mês';
                aporteRow = `<div style="display:flex;justify-content:space-between;gap:12px;border-top:1px solid var(--border-mid);margin-top:4px;padding-top:4px;"><span style="color:#00BFFF;font-weight:700;opacity:0.7;">Aporte/mês</span><span style="color:var(--text-mid);">${aporteLabel}</span></div>`;
            }
            bodyRows = `
                <div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:${window._coresChart.green};font-weight:700;">Patrimônio</span><span style="color:var(--text-hi);font-weight:700;">${formatCurrency(d.total)}</span></div>
                <div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:${window._coresChart.orange};font-weight:700;">Juros</span><span style="color:var(--text-hi);">${formatCurrency(d.juros)}</span></div>
                <div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:${window._coresChart.blue};font-weight:700;">Aportado</span><span style="color:var(--text-hi);">${formatCurrency(d.investido)}</span></div>
                <div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:${window._coresChart.yellow};font-weight:700;">Renda ${tipoPeriodo==='anual'?'Anual':'Mensal'}</span><span style="color:var(--text-hi);">${formatCurrency(d.renda)}</span></div>
                ${tipoPeriodo==='anual'?`<div style="text-align:right;margin-top:-3px;"><span style="color:var(--text-dim);font-size:9px;">${formatCurrency(d.renda/12)}/mês</span></div>`:''}
                ${aporteRow}`;
        }

        const popup = document.createElement('div');
        popup.id = id;
        popup.dataset.ano = String(ano);
        popup.style.cssText = `position:fixed;z-index:9999;background:var(--popup-bg,#1a1a24);border:1px solid var(--popup-border,#6366f1);border-radius:14px;padding:12px 14px;min-width:190px;box-shadow:0 8px 32px rgba(0,0,0,0.7);pointer-events:auto;cursor:move;user-select:none;`;
        popup.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-size:12px;font-weight:900;color:var(--text-hi);text-transform:uppercase;letter-spacing:.08em;">${suffix} ${ano}</span>
                <button onclick="fecharPopupAno('${ano}')" style="color:#666;font-size:13px;line-height:1;background:none;border:none;cursor:pointer;padding:2px 4px;">✕</button>
            </div>
            <div style="display:flex;flex-direction:column;gap:5px;font-size:11px;">${bodyRows}</div>
        `;

        const chartEl = document.getElementById('chartPatrimonio');
        const rect = chartEl.getBoundingClientRect();
        const offset = Object.keys(activePopups).length * 12;
        let px = rect.left + x - 95 + offset;
        let py = rect.top + y - 220 + offset;
        if (px < 8) px = 8;
        if (py < 8) py = 8;
        if (px + 210 > window.innerWidth - 8) px = window.innerWidth - 218;
        popup.style.left = px + 'px';
        popup.style.top = py + 'px';

        let isDragging = false, dragStartX = 0, dragStartY = 0, elStartX = 0, elStartY = 0;
        popup.addEventListener('mousedown', function(e) {
            if (e.target.tagName === 'BUTTON') return;
            isDragging = true;
            dragStartX = e.clientX; dragStartY = e.clientY;
            elStartX = parseInt(popup.style.left); elStartY = parseInt(popup.style.top);
            e.preventDefault();
        });
        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            popup.style.left = (elStartX + e.clientX - dragStartX) + 'px';
            popup.style.top = (elStartY + e.clientY - dragStartY) + 'px';
        });
        document.addEventListener('mouseup', function() { isDragging = false; });

        return popup;
    }

    function fecharPopupAno(ano) {
        const p = document.getElementById('popup_' + ano);
        if (p) p.remove();
        const key = String(ano);
        delete activePopups[key];
        delete _popupFixed[key];
        if (_transientKey === key) _transientKey = null;
        atualizarBotaoReset();
    }

    function refreshActivePopups() {
        Object.keys(activePopups).forEach(ano => {
            const existing = document.getElementById('popup_' + ano);
            if (!existing) return;
            const d = baseDadosCalculados.anos[parseInt(ano)];
            if (!d) { fecharPopupAno(ano); return; }
            const suffix = tipoPeriodo === 'anual' ? 'Ano' : 'Mês';
            let aporteRow = '';
            if (modoAtual === 'completo' && d.aporteVigente !== undefined) {
                const aporteLabel = d.aporteVigente === 0 ? 'Sem aportes' : formatCurrency(d.aporteVigente) + '/mês';
                aporteRow = `<div style="display:flex;justify-content:space-between;gap:12px;border-top:1px solid var(--border-mid);margin-top:4px;padding-top:4px;"><span style="color:#00BFFF;font-weight:700;opacity:0.7;">Aporte/mês</span><span style="color:var(--text-mid);">${aporteLabel}</span></div>`;
            }
            const body = existing.querySelector('div:last-child');
            if (body) body.innerHTML = `
                <div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:${window._coresChart.green};font-weight:700;">Patrimônio</span><span style="color:var(--text-hi);font-weight:700;">${formatCurrency(d.total)}</span></div>
                <div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:${window._coresChart.orange};font-weight:700;">Juros</span><span style="color:var(--text-hi);">${formatCurrency(d.juros)}</span></div>
                <div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:${window._coresChart.blue};font-weight:700;">Aportado</span><span style="color:var(--text-hi);">${formatCurrency(d.investido)}</span></div>
                <div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:${window._coresChart.yellow};font-weight:700;">Renda ${tipoPeriodo==='anual'?'Anual':'Mensal'}</span><span style="color:var(--text-hi);">${formatCurrency(d.renda)}</span></div>
                ${tipoPeriodo==='anual'?`<div style="text-align:right;margin-top:-3px;"><span style="color:var(--text-dim);font-size:9px;">${formatCurrency(d.renda/12)}/mês</span></div>`:''}
                ${aporteRow}
            `;
        });
    }

    function fecharTodosPopups() {
        Object.keys(activePopups).forEach(ano => {
            const p = document.getElementById('popup_' + ano);
            if (p) p.remove();
        });
        activePopups = {};
        atualizarBotaoReset();
    }

    function atualizarBotaoReset() {
        const btn = document.getElementById('btnResetPopups');
        if (!btn) return;
        const hasPopups = Object.keys(activePopups).length > 0;
        btn.style.opacity = hasPopups ? '1' : '0';
        btn.style.pointerEvents = hasPopups ? 'auto' : 'none';
    }

    function mostrarPopupAno(label, x, y, fixar) {
        const key = String(label);

        if (activePopups[key]) {
            if (fixar) {
                // 2º clique no mesmo ponto: fixa o popup
                _popupFixed[key] = true;
                _transientKey = null;
                // Adiciona indicador visual de fixado (borda mais intensa)
                activePopups[key].style.outline = '2px solid var(--popup-border)';
            } else {
                // 1 clique no mesmo ponto já aberto e transiente: fecha
                if (!_popupFixed[key]) fecharPopupAno(label);
            }
            return;
        }

        // Fecha transiente anterior antes de abrir novo
        _fecharTransiente();

        const popup = criarPopupEl(label, x, y);
        if (!popup) return;
        document.body.appendChild(popup);
        activePopups[key] = popup;
        _popupFixed[key] = !!fixar;
        if (!fixar) _transientKey = key;
        atualizarBotaoReset();
    }

    function renderizarGrafico(labels, dataInvestido, dataJuros, dataTotal, dataRenda, totalCiclos, extras) {
        _renderizarGraficoInterno(labels, dataInvestido, dataJuros, dataTotal, dataRenda, totalCiclos, extras || {});
    }

    function _renderizarGraficoInterno(labels, dataInvestido, dataJuros, dataTotal, dataRenda, totalCiclos, extras) {
        const ctx = document.getElementById('chartPatrimonio').getContext('2d');
        if (myChart) { myChart.destroy(); myChart = null; }
        zoomLevel = 0;
        const temAlgumValor = dataTotal.some(v => v > 0);
        if (!temAlgumValor) return;

        const rendasVisible = document.getElementById('chkRenda').checked;
        
        const anoFiltroVal = parseInt(document.getElementById('inputAnoFiltro').value) || totalCiclos;
        const temporalIdx = (modoAtual === 'completo' && temporalAtivo) ? labels.indexOf(anoFiltroVal.toString()) : -1;

        const ptRadius = labels.length <= 12 ? 4 : labels.length <= 30 ? 3 : labels.length <= 60 ? 2 : 1.5;
        const ptRadiusLg = labels.length <= 12 ? 5 : labels.length <= 30 ? 4 : labels.length <= 60 ? 3 : 2;

        function makePointColors(baseColor, dimColor, count) {
            if (temporalIdx < 0) return baseColor;
            return Array.from({length: count}, (_, i) => i <= temporalIdx ? baseColor : dimColor);
        }
        function makeBorderWidths(baseW, count) {
            if (temporalIdx < 0) return baseW;
            return Array.from({length: count}, (_, i) => i <= temporalIdx ? baseW : baseW * 0.5);
        }

        const n = labels.length;
        const dimBlue   = 'rgba(0,191,255,0.18)';
        const dimOrange = 'rgba(255,140,0,0.18)';
        const dimGreen  = 'rgba(50,205,50,0.18)';
        const dimYellow = 'rgba(255,204,0,0.18)';

        const liberdadePoint = getLiberdadeAno(dataRenda, labels);
        const ultimoAportePoint = getUltimoAporteEficazPoint(dataJuros, dataInvestido, labels);
        const metaPoints = getMetaPoints(dataTotal, labels);
        const metaPoint = metaPoints.length > 0 ? metaPoints[0] : null;
        _liberdadePoint = liberdadePoint;
        _ultimoAportePoint = ultimoAportePoint;
        _metaPoint = metaPoint;
        _metaPoints = metaPoints;

        // Atualiza card de Liberdade na sidebar
        const libStatusEl = document.getElementById('liberdadeStatus');
        if (libStatusEl) {
            if (liberdadePoint) {
                const custoRaw = document.getElementById('inputCustoVida')?.value;
                const custo = parseCurrencyValue(custoRaw);
                libStatusEl.innerHTML = `<span style="color:#32CD32;">🚩 Liberdade atingida em <strong>${liberdadePoint.humanLabel}</strong></span><br><span style="color:#6b7280;">Renda passiva ≥ ${formatCurrency(custo)}/mês</span>`;
                libStatusEl.classList.remove('hidden');
            } else if (document.getElementById('chkLiberdade')?.checked && parseCurrencyValue(document.getElementById('inputCustoVida')?.value) > 0) {
                libStatusEl.innerHTML = '<span style="color:#9ca3af;">⚠️ Liberdade não atingida no período</span>';
                libStatusEl.classList.remove('hidden');
            } else {
                libStatusEl.classList.add('hidden');
            }
        }

        // Atualiza card de Último Aporte Eficaz na sidebar
        const uaStatusEl = document.getElementById('ultimoAporteStatus');
        if (uaStatusEl) {
            if (ultimoAportePoint) {
                uaStatusEl.innerHTML = `<span style="color:#FFCC00;">▲ Juros superam aportes em <strong>${ultimoAportePoint.humanLabel}</strong></span>`;
                uaStatusEl.classList.remove('hidden');
            } else if (document.getElementById('chkUltimoAporte')?.checked) {
                uaStatusEl.innerHTML = '<span style="color:#9ca3af;">⚠️ Cruzamento não ocorre no período</span>';
                uaStatusEl.classList.remove('hidden');
            } else {
                uaStatusEl.classList.add('hidden');
            }
        }

        const metaResEl = document.getElementById('metaResultado');
        if (metaResEl) {
            if (metaPoints.length > 0) {
                metaResEl.textContent = metaPoints.map(mp => {
                    const nome = mp.nome ? `"${mp.nome}"` : `R$${(mp.valor/1e6>=1?(mp.valor/1e6).toFixed(1)+'M':(mp.valor/1e3).toFixed(0)+'K')}`;
                    return `🎯 ${nome}: ${mp.humanLabel || mp.label}`;
                }).join(' · ');
                metaResEl.classList.remove('hidden');
                // Atualiza status por meta individualmente
                // Sort metaPoints by fracIdx to know the order
                const sortedMPs = [...metaPoints].sort((a,b) => (a.fracIdx||a.idx) - (b.fracIdx||b.idx));
                metaList.forEach(m => {
                    const stEl = document.getElementById('metaStatus_' + m.id);
                    if (!stEl) return;
                    const found = metaPoints.find(p => p.id === m.id);
                    if (found) {
                        const foundIdx = sortedMPs.findIndex(p => p.id === m.id);
                        const prev = foundIdx > 0 ? sortedMPs[foundIdx - 1] : null;
                        let html = `<span style="color:#32CD32;">✅ Atingida em ${found.humanLabel || found.label}</span>`;
                        if (prev) {
                            // Calculate delta between this and previous meta
                            const deltaMonths = Math.round(((found.fracIdx||found.idx) - (prev.fracIdx||prev.idx)) * (tipoPeriodo==='anual'?12:1));
                            const dAnos = Math.floor(deltaMonths / 12);
                            const dMeses = deltaMonths % 12;
                            let deltaStr = '';
                            if (dAnos > 0 && dMeses > 0) deltaStr = `${dAnos} ${dAnos===1?'ano':'anos'} e ${dMeses} ${dMeses===1?'mês':'meses'}`;
                            else if (dAnos > 0) deltaStr = `${dAnos} ${dAnos===1?'ano':'anos'}`;
                            else deltaStr = `${dMeses} ${dMeses===1?'mês':'meses'}`;
                            html += `<br><span style="color:#a78bfa;">⏱ +${deltaStr} desde a meta anterior</span>`;
                        }
                        stEl.innerHTML = html;
                        stEl.classList.remove('hidden');
                    } else if (m.valor > 0) {
                        stEl.innerHTML = '<span style="color:#9ca3af;">⚠️ Não atingida no período</span>';
                        stEl.classList.remove('hidden');
                    } else {
                        stEl.classList.add('hidden');
                    }
                });
            } else if (document.getElementById('chkMeta')?.checked && metaList.some(m => m.valor > 0)) {
                metaResEl.textContent = '⚠️ Meta(s) não atingida(s) no período simulado';
                metaResEl.classList.remove('hidden');
            } else {
                metaResEl.classList.add('hidden');
            }
        }

        // Se cenários ativo, atualiza os cards de cenários
        if (cenariosAtivo && modoAtual === 'completo') {
            renderizarCenarioCards();
        }

        const poupancaSecAtiva = document.getElementById('chkPoupanca')?.checked && modoAtual === 'completo' && document.getElementById('chkAtivarAvancado')?.checked;
        const aporteMensalBase = parseCurrencyValue(document.getElementById('inputMensal').value);
        const vInicialBase = parseCurrencyValue(document.getElementById('inputInicial').value);
        const showPoupanca = poupancaSecAtiva && poupancaAtivaPoupanca;
        const showCorrente = poupancaSecAtiva && poupancaAtivaCorrente;
        const dataPoupancaLine = showPoupanca ? calcularDadosPoupanca(labels, vInicialBase, aporteMensalBase, false) : null;
        const dataCorrenteLine = showCorrente ? calcularDadosPoupanca(labels, vInicialBase, aporteMensalBase, true) : null;
        const hideOtherLines = poupancaSecAtiva && (showPoupanca || showCorrente);

        myChart = new Chart(ctx, {
            type: 'line',
            plugins: [neonGlowPlugin, _bolaDeNeveChartPlugin],
            data: {
                labels: labels,
                datasets: [
                    { label: 'Total Aportado', data: dataInvestido, borderColor: temporalIdx>=0 ? makePointColors(_coresChart.blue, _coresChart.dimBlue, n) : _coresChart.blue, segment: temporalIdx>=0 ? {borderColor: ctx2 => ctx2.p1DataIndex <= temporalIdx ? _coresChart.blue : _coresChart.dimBlue} : {}, backgroundColor: 'transparent', pointBackgroundColor: makePointColors(_coresChart.blue, _coresChart.dimBlue, n), pointStyle: 'circle', borderWidth: 1.5, pointRadius: ptRadius, pointHoverRadius: 6, tension: 0.15, hidden: hideOtherLines || (modoAtual === 'completo' && cenariosAtivo && cenarios.length > 0) || (_doidoMode && atrasoAtivo) },
                    { label: 'Total em Juros', data: dataJuros, borderColor: temporalIdx>=0 ? makePointColors(_coresChart.orange, _coresChart.dimOrange, n) : _coresChart.orange, segment: temporalIdx>=0 ? {borderColor: ctx2 => ctx2.p1DataIndex <= temporalIdx ? _coresChart.orange : _coresChart.dimOrange} : {}, backgroundColor: 'transparent', pointBackgroundColor: makePointColors(_coresChart.orange, _coresChart.dimOrange, n), pointStyle: 'circle', borderWidth: 1.5, pointRadius: ptRadius, pointHoverRadius: 6, tension: 0.15, hidden: hideOtherLines || (modoAtual === 'completo' && cenariosAtivo && cenarios.length > 0) || (_doidoMode && atrasoAtivo) },
                    { label: 'Patrimônio Total', data: dataTotal, borderColor: temporalIdx>=0 ? makePointColors(_coresChart.green, _coresChart.dimGreen, n) : _coresChart.green, segment: temporalIdx>=0 ? {borderColor: ctx2 => ctx2.p1DataIndex <= temporalIdx ? _coresChart.green : _coresChart.dimGreen} : {}, backgroundColor: 'transparent', pointBackgroundColor: makePointColors(_coresChart.green, _coresChart.dimGreen, n), pointStyle: 'circle', borderWidth: 2.5, pointRadius: ptRadiusLg, pointHoverRadius: 7, tension: 0.15, hidden: (modoAtual === 'completo' && cenariosAtivo && cenarios.length > 0) || (_doidoMode && atrasoAtivo) },
                    { label: 'Renda', data: dataRenda, borderColor: temporalIdx>=0 ? makePointColors(_coresChart.yellow, _coresChart.dimYellow, n) : _coresChart.yellow, segment: temporalIdx>=0 ? {borderColor: ctx2 => ctx2.p1DataIndex <= temporalIdx ? _coresChart.yellow : _coresChart.dimYellow} : {}, backgroundColor: 'transparent', pointBackgroundColor: makePointColors(_coresChart.yellow, _coresChart.dimYellow, n), pointStyle: 'circle', borderWidth: 1.5, pointRadius: ptRadius, pointHoverRadius: 6, tension: 0.15, clip: false, hidden: !rendasVisible || hideOtherLines || (modoAtual === 'completo' && cenariosAtivo && cenarios.length > 0) || (_doidoMode && atrasoAtivo) },
                    ...(dataPoupancaLine ? [{ label: '__poupanca__', data: dataPoupancaLine, borderColor: temporalIdx>=0 ? makePointColors(_coresChart.orange, _coresChart.dimOrange, n) : _coresChart.orange, segment: temporalIdx>=0 ? {borderColor: ctx2 => ctx2.p1DataIndex <= temporalIdx ? _coresChart.orange : _coresChart.dimOrange} : {}, borderDash: [5,3], backgroundColor: 'transparent', pointBackgroundColor: temporalIdx>=0 ? makePointColors(_coresChart.orange, _coresChart.dimOrange, n) : _coresChart.orange, pointStyle: 'circle', borderWidth: 1.8, pointRadius: ptRadius, pointHoverRadius: 6, tension: 0.15 }] : []),
                    ...(dataCorrenteLine ? [{ label: '__corrente__', data: dataCorrenteLine, borderColor: temporalIdx>=0 ? makePointColors('#ef4444', 'rgba(239,68,68,0.18)', n) : '#ef4444', segment: temporalIdx>=0 ? {borderColor: ctx2 => ctx2.p1DataIndex <= temporalIdx ? '#ef4444' : 'rgba(239,68,68,0.18)'} : {}, borderDash: [5,3], backgroundColor: 'transparent', pointBackgroundColor: temporalIdx>=0 ? makePointColors('#ef4444', 'rgba(239,68,68,0.18)', n) : '#ef4444', pointStyle: 'circle', borderWidth: 1.8, pointRadius: ptRadius, pointHoverRadius: 6, tension: 0.15 }] : []),
                    ...(cenariosAtivo && modoAtual === 'completo' ? cenarios.map(c => ({
                        label: '__cenario__' + c.id,
                        data: (() => {
                            // align cenario data to current labels
                            return labels.map(l => {
                                const i = c.labels.indexOf(l);
                                return i >= 0 ? c.dataTotal[i] : null;
                            });
                        })(),
                        borderColor: c.color,
                        borderDash: [6,3],
                        backgroundColor: 'transparent',
                        pointBackgroundColor: c.color,
                        pointStyle: 'circle',
                        borderWidth: 1.5,
                        pointRadius: ptRadius,
                        pointHoverRadius: 5,
                        tension: 0.15,
                        spanGaps: false
                    })) : []),
                    // Cisne Negro: linha original tracejada cinza para comparação
                    ...(typeof _doidoMode !== 'undefined' && _doidoMode && atrasoAtivo && extras.atrasoData ? [
                        {
                            label: 'Começa Hoje',
                            data: extras.atrasoData.dataHoje,
                            borderColor: '#32CD32', backgroundColor: 'transparent',
                            borderWidth: 2.5, pointRadius: 2, pointHoverRadius: 5, tension: 0.15,
                        },
                        {
                            label: 'Com Atraso',
                            data: extras.atrasoData.dataAtrasado,
                            borderColor: '#3b82f6', backgroundColor: 'transparent',
                            borderWidth: 2.5, pointRadius: 2, pointHoverRadius: 5, tension: 0.15,
                            borderDash: [6, 3],
                        },
                    ] : []),
                    ...(cisneNegroAtivo && extras.dataTotalOriginal ? [{
                        label: '__cisne_original__',
                        data: extras.dataTotalOriginal,
                        borderColor: 'rgba(100,100,120,0.4)',
                        borderDash: [4,4],
                        backgroundColor: 'transparent',
                        pointRadius: 0,
                        borderWidth: 1.5,
                        tension: 0.15,
                        hidden: false
                    }] : []),
                    // Volatilidade: monteCarloData agora é o original (fantasma cinza)
                    ...(monteCarloAtivo && extras.monteCarloData ? [{
                        label: '__volatilidade_original__',
                        data: extras.monteCarloData,
                        borderColor: 'rgba(100,100,120,0.4)',
                        borderDash: [4, 4],
                        backgroundColor: 'transparent',
                        pointRadius: 0,
                        borderWidth: 1.5,
                        tension: 0.15,
                        hidden: false
                    }] : []),
                    // Sabático: sabaticoData é o original (fantasma cinza); linha verde já tem o impacto
                    ...(sabaticoAtivo && extras.sabaticoData ? [{
                        label: '__sabatico_original__',
                        data: extras.sabaticoData,
                        borderColor: 'rgba(100,100,120,0.4)',
                        borderDash: [4, 4],
                        backgroundColor: 'transparent',
                        pointRadius: 0,
                        borderWidth: 1.5,
                        tension: 0.15,
                        hidden: false
                    }] : [])
                ]
            },
            options: {
                responsive: true,
                animation: {
                    duration: 0,
                    onComplete: function() {
                        if (myChart) myChart.draw();
                    }
                },

                maintainAspectRatio: false,
                onClick: function(evt) {
                    const points = myChart.getElementsAtEventForMode(evt, 'index', { intersect: false }, false);
                    if (points.length === 0) return;
                    const idx = points[0].index;
                    const clickedLabel = myChart.data.labels[idx];
                    if (clickedLabel === undefined) return;
                    const canvasRect = myChart.canvas.getBoundingClientRect();
                    const relX = evt.native.clientX - canvasRect.left;
                    const relY = evt.native.clientY - canvasRect.top;
                    const now = Date.now();
                    const fixar = (myChart._lastClickLabel === clickedLabel && now - (myChart._lastClickTime||0) < 400);
                    myChart._lastClickLabel = clickedLabel;
                    myChart._lastClickTime  = now;
                    mostrarPopupAno(clickedLabel, relX, relY, fixar);
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        position: 'nearest',
                        backgroundColor: window._chartBgColor || '#1a1a22',
                        titleColor: window._chartTitleColor || '#FFFFFF',
                        titleFont: { size: 12, weight: 'bold' },
                        bodyColor: window._chartBodyColor || '#d1d5db',
                        borderColor: window._chartGridColor || '#32323e',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 10,
                        usePointStyle: true,
                        boxWidth: 8,
                        boxHeight: 8,
                        callbacks: {
                            label: function(ctx2) {
                                if (ctx2.dataset.label === '__poupanca__' || ctx2.dataset.label === '__corrente__') return null;
                                if (ctx2.dataset.label === '__cisne_original__') return '  🦢 Sem crise: ' + formatCurrency(ctx2.parsed.y);
                                if (ctx2.dataset.label === '__montecarlo__') return '  🎲 Volatilidade real: ' + formatCurrency(ctx2.parsed.y);
                                if (ctx2.dataset.label === '__sabatico__') return '  🏖️ Com sabático: ' + formatCurrency(ctx2.parsed.y);
                                if (ctx2.dataset.label?.startsWith('__cenario__')) {
                                    const cId = parseInt(ctx2.dataset.label.replace('__cenario__',''));
                                    const c = cenarios.find(x => x.id === cId);
                                    if (!c) return null;
                                    return '  📊 ' + c.label + ': ' + formatCurrency(ctx2.parsed.y);
                                }

                                const idx = ctx2.dataIndex;
                                const label = ctx2.chart.data.labels[idx];
                                const ciclo = parseInt(label);
                                const d = baseDadosCalculados.anos[ciclo];
                                const sufixo = tipoPeriodo === 'anual' ? 'ano' : 'mês';

                                // Dataset 0 = Total Aportado (azul)
                                if (ctx2.datasetIndex === 0) {
                                    const base = '  Total Aportado: ' + formatCurrency(ctx2.parsed.y);
                                    if (!d) return base;
                                    const ipcaAtivo = modoAtual === 'completo'
                                        ? document.getElementById('chkInflacaoAporte')?.checked
                                        : document.getElementById('chkIpcaCalc')?.checked;
                                    const aporteVig = d.aporteVigente;
                                    if (ipcaAtivo && aporteVig > 0) {
                                        return ['  Total Aportado: ' + formatCurrency(ctx2.parsed.y),
                                                '  ↳ Aporte neste ' + sufixo + ': ' + formatCurrency(aporteVig) + '/mês'];
                                    } else if (aporteVig !== undefined && modoAtual === 'completo') {
                                        const aporteLabel = aporteVig === 0 ? 'sem aportes' : formatCurrency(aporteVig) + '/mês';
                                        return ['  Total Aportado: ' + formatCurrency(ctx2.parsed.y),
                                                '  ↳ Aporte: ' + aporteLabel];
                                    }
                                    return base;
                                }

                                // Dataset 1 = Total em Juros (laranja)
                                if (ctx2.datasetIndex === 1) {
                                    const base = '  Total em Juros: ' + formatCurrency(ctx2.parsed.y);
                                    if (!d) return base;
                                    const pctDoTotal = d.total > 0 ? ((d.juros / d.total) * 100).toFixed(1) : 0;
                                    const superou = d.juros >= d.investido;
                                    const extra = superou
                                        ? '  ↳ ' + pctDoTotal + '% do patrimônio — juros > aportes! 🎯'
                                        : '  ↳ ' + pctDoTotal + '% do patrimônio';
                                    return ['  Total em Juros: ' + formatCurrency(ctx2.parsed.y), extra];
                                }

                                // Dataset 2 = Patrimônio Total (verde)
                                if (ctx2.datasetIndex === 2) {
                                    if (!d) return '  Patrimônio Total: ' + formatCurrency(ctx2.parsed.y);
                                    const pctJuros = d.total > 0 ? ((d.juros / d.total) * 100).toFixed(1) : 0;
                                    const pctAporte = d.total > 0 ? ((d.investido / d.total) * 100).toFixed(1) : 0;
                                    const lines = ['  Patrimônio Total: ' + formatCurrency(ctx2.parsed.y),
                                            '  ↳ ' + pctJuros + '% juros · ' + pctAporte + '% aportes'];
                                    // Valor real (poder de compra hoje) se IPCA ativo
                                    const ipcaAtivo2 = modoAtual === 'completo'
                                        ? document.getElementById('chkInflacaoAporte')?.checked
                                        : document.getElementById('chkIpcaCalc')?.checked;
                                    if (ipcaAtivo2 && ciclo > 0) {
                                        const taxaIpca2 = modoAtual === 'completo'
                                            ? (parseFloat(document.getElementById('inputInflacao')?.value) || 4.5) / 100
                                            : (parseFloat(document.getElementById('inputIpcaCalcValor')?.value) || 4.5) / 100;
                                        const anosDefl = tipoPeriodo === 'anual' ? ciclo : ciclo / 12;
                                        const patrimonioReal = d.total / Math.pow(1 + taxaIpca2, anosDefl);
                                        lines.push('  ↳ Valor real hoje: ' + formatCurrency(patrimonioReal));
                                    }
                                    return lines;
                                }

                                // Dataset 3 = Renda (amarelo)
                                if (ctx2.datasetIndex === 3) {
                                    if (!d) return '  Renda: ' + formatCurrency(ctx2.parsed.y);
                                    const rendaMensal = tipoPeriodo === 'anual' ? d.renda / 12 : d.renda;
                                    const salMin = SALARIO_MINIMO;
                                    const multiplos = (rendaMensal / salMin).toFixed(1);
                                    // Regra dos 4%: retirada segura anual = 4% do patrimônio
                                    const retiradaSegura4pct = d.total > 0 ? (d.total * 0.04) / 12 : 0;
                                    const lines = ['  Renda ' + (tipoPeriodo === 'anual' ? 'Anual' : 'Mensal') + ': ' + formatCurrency(ctx2.parsed.y),
                                            '  ↳ ' + formatCurrency(rendaMensal) + '/mês · ' + multiplos + '× sal. mín.'];
                                    if (retiradaSegura4pct > 0) {
                                        lines.push('  ↳ Retirada segura (4%): ' + formatCurrency(retiradaSegura4pct) + '/mês');
                                    }
                                    return lines;
                                }

                                return '  ' + ctx2.dataset.label + ': ' + formatCurrency(ctx2.parsed.y);
                            },
                            afterBody: function(items) {
                                const extras = [];
                                if (temporalIdx >= 0 && items[0]?.dataIndex === temporalIdx) {
                                    extras.push('', '📅 Ponto de inspeção temporal');
                                }
                                if (ultimoAportePoint && items[0]?.dataIndex === ultimoAportePoint.idx) {
                                    extras.push('', '▲ Último Aporte Eficaz: juros superam aportes');
                                }
                                return extras;
                            }
                        }
                    },
                    annotation: (() => {
                        const annots = {};
                        if (liberdadePoint) {
                            const libLabel = `🚩 Liberdade — ${liberdadePoint.humanLabel || (tipoPeriodo === 'anual' ? 'Ano' : 'Mês') + ' ' + liberdadePoint.label}`;
                            const libFracX = liberdadePoint.fracIdx !== undefined ? liberdadePoint.fracIdx : liberdadePoint.idx;
                            annots.liberdadeFlag = {
                                type: 'line',
                                xMin: libFracX,
                                xMax: libFracX,
                                borderColor: 'rgba(239,68,68,0.45)',
                                borderWidth: 1.2,
                                borderDash: [4,4],
                                label: { display: false },
                                enter: function(ctx2, event) {
                                    showLiberdadeTooltip(event, libLabel);
                                },
                                leave: function(ctx2, event) {
                                    hideLiberdadeTooltip();
                                }
                            };
                        }
                        if (ultimoAportePoint) {
                            const uaLabel = `▲ Último Aporte Eficaz — ${ultimoAportePoint.humanLabel || (tipoPeriodo === 'anual' ? 'Ano' : 'Mês') + ' ' + ultimoAportePoint.label}: juros superam aportes`;
                            annots.ultimoAporte = {
                                type: 'line',
                                xMin: ultimoAportePoint.idx,
                                xMax: ultimoAportePoint.idx,
                                borderColor: 'rgba(255,204,0,0)',
                                borderWidth: 0,
                                label: { display: false },
                                enter: function(ctx2, event) {
                                    showLiberdadeTooltip(event, uaLabel);
                                },
                                leave: function(ctx2, event) {
                                    hideLiberdadeTooltip();
                                }
                            };
                        }
                        // Vertical line annotations for meta crossing (for hover tooltips)
                        metaPoints.forEach((mp, mi) => {
                            const nomeMeta = mp.nome || `Meta ${mi+1} (${formatCurrency(mp.valor)})`;
                            const shortVal = mp.valor >= 1e6 ? (mp.valor/1e6).toFixed(mp.valor%1e6===0?0:1)+'M' : mp.valor >= 1e3 ? (mp.valor/1e3).toFixed(mp.valor%1e3===0?0:1)+'k' : String(Math.round(mp.valor));
                            const metaLabel = `◆ ${shortVal} — ${mp.humanLabel || mp.label}`;
                            const fracX = mp.fracIdx !== undefined ? mp.fracIdx : mp.idx;
                            annots['metaDiamond_' + mp.id] = {
                                type: 'line',
                                xMin: fracX,
                                xMax: fracX,
                                borderColor: 'rgba(167,139,250,0)',
                                borderWidth: 18,
                                label: { display: false },
                                enter: function(ctx2, event) {
                                    showLiberdadeTooltip(event, metaLabel);
                                },
                                leave: function(ctx2, event) {
                                    hideLiberdadeTooltip();
                                }
                            };
                        });
                        return Object.keys(annots).length > 0 ? { annotations: annots } : {};
                    })()
                },
                scales: {
                    x: { 
                        grid: { color: window._chartGridColor || '#1f1f24', drawBorder: false }, 
                        ticks: { 
                            color: window._chartTickColor || '#8e8e93', font: { size: 11 },
                            callback: function(val, index) {
                                return this.getLabelForValue(val);
                            }
                        }
                    },
                    y: { grid: { color: window._chartGridColor || '#1f1f24', drawBorder: false }, ticks: { color: window._chartTickColor || '#8e8e93', font: { size: 11 }, callback: function(v) { return 'R$ ' + v.toLocaleString('pt-BR', { maximumFractionDigits: 0 }); } } }
                }
            }
        });

        const canvas = document.getElementById('chartPatrimonio');
        canvas.onwheel = null;
        let currentZoomStep = 0;
        const MAX_ZOOM_STEPS = 3;
        const totalPtsNatural = labels.length - 1;

        canvas.addEventListener('wheel', function(e) {
            e.preventDefault();
            if (!myChart) return;
            const totalPts = labels.length - 1;
            if (totalPts < 4) return;
            const zoomIn = e.deltaY < 0;

            if (zoomIn && currentZoomStep < MAX_ZOOM_STEPS) {
                currentZoomStep++;
            } else if (!zoomIn && currentZoomStep > 0) {
                currentZoomStep--;
            } else {
                return;
            }

            if (currentZoomStep === 0) {
                myChart.options.scales.x.min = undefined;
                myChart.options.scales.x.max = undefined;
            } else {
                const divisor = Math.pow(2, currentZoomStep);
                const newRange = Math.max(3, Math.round(totalPts / divisor));

                const rect = canvas.getBoundingClientRect();
                const cursorRatio = (e.clientX - rect.left) / rect.width;

                let newMin, newMax;
                if (cursorRatio < 0.333) {
                    newMin = 0;
                    newMax = Math.min(totalPts, newRange);
                } else if (cursorRatio < 0.667) {
                    const center = Math.round(totalPts / 2);
                    const half = Math.floor(newRange / 2);
                    newMin = Math.max(0, center - half);
                    newMax = Math.min(totalPts, newMin + newRange);
                    if (newMax === totalPts) newMin = Math.max(0, newMax - newRange);
                } else {
                    newMax = totalPts;
                    newMin = Math.max(0, totalPts - newRange);
                }

                myChart.options.scales.x.min = newMin;
                myChart.options.scales.x.max = newMax;
            }
            myChart.options.scales.y.min = undefined;
            myChart.options.scales.y.max = undefined;
            myChart.update('none');
        }, { passive: false });

        canvas.addEventListener('click', function(e) {
            if (!myChart) return;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const xScale = myChart.scales.x;
            const chartArea = myChart.chartArea;
            if (y > chartArea.bottom + 2 && y < chartArea.bottom + 40) {
                const ticks = xScale.ticks;
                if (!ticks || ticks.length === 0) return;
                let closestIdx = 0, closestDist = Infinity;
                ticks.forEach((tick, i) => {
                    const px = xScale.getPixelForTick(i);
                    const dist = Math.abs(px - x);
                    if (dist < closestDist) { closestDist = dist; closestIdx = i; }
                });
                if (closestDist < 24) {
                    const label = xScale.ticks[closestIdx].label ?? labels[closestIdx];
                    mostrarPopupAno(label, x, y, false);
                }
            }
        });

        datasetVisibility.forEach((vis, i) => {
            if (!vis) { myChart.hide(i); }
        });
        if (!rendasVisible) { myChart.hide(3); datasetVisibility[3] = false; }

        ['legendAportes','legendJuros','legendTotal','legendRenda'].forEach((id, i) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            btn.classList.toggle('active', !!datasetVisibility[i]);
            btn.classList.toggle('inactive', !datasetVisibility[i]);
        });
    } // end _renderizarGraficoInterno

    function setupLegendToggles() {
        const legendMap = [
            { btnId: 'legendAportes', dsIdx: 0 },
            { btnId: 'legendJuros',   dsIdx: 1 },
            { btnId: 'legendTotal',   dsIdx: 2 },
            { btnId: 'legendRenda',   dsIdx: 3 },
        ];
        legendMap.forEach(({ btnId, dsIdx }) => {
            document.getElementById(btnId)?.addEventListener('click', () => {
                if (!myChart) return;
                datasetVisibility[dsIdx] = !datasetVisibility[dsIdx];
                if (datasetVisibility[dsIdx]) myChart.show(dsIdx);
                else myChart.hide(dsIdx);
                if (dsIdx === 3 && !document.getElementById('chkRenda').checked) {
                    myChart.hide(3);
                    datasetVisibility[3] = false;
                }
                legendMap.forEach(({ btnId: bId, dsIdx: i }) => {
                    const btn = document.getElementById(bId);
                    btn.classList.toggle('active', !!datasetVisibility[i]);
                    btn.classList.toggle('inactive', !datasetVisibility[i]);
                });
                myChart.update();
            });
        });
    }

    let activeCardId = null;
    const cardNeonMap = [
        { cardId: 'cardTotal',    dsIdx: 2, neonClass: 'card-neon-green'  },
        { cardId: 'cardJuros',    dsIdx: 1, neonClass: 'card-neon-orange' },
        { cardId: 'cardInvestido',dsIdx: 0, neonClass: 'card-neon-blue'   },
        { cardId: 'cardRenda',    dsIdx: 3, neonClass: 'card-neon-yellow' },
    ];

    function gerarComentarioCard(cardId, d, finalD, ciclo, cicloFinal) {
        const sufixo = tipoPeriodo === 'anual' ? 'ano' : 'mês';
        if (cardId === 'cardTotal') {
            const pct = finalD.total > 0 ? (d.total / finalD.total * 100).toFixed(1) : 0;
            return pct >= 80
                ? `🚀 No ${sufixo} ${ciclo} você já atingiu ${pct}% do patrimônio final. Você está na fase exponencial — os juros compostos dominam o crescimento!`
                : pct >= 50
                ? `📈 Metade do caminho concluída. No ${sufixo} ${ciclo} você acumulou ${pct}% do patrimônio final de ${formatCurrency(finalD.total)}.`
                : `⏳ No ${sufixo} ${ciclo} você acumulou ${pct}% do patrimônio final. A mágica dos juros compostos cresce com o tempo — continue firme.`;
        }
        if (cardId === 'cardJuros') {
            if (d.juros > d.investido) {
                const fatia = d.total > 0 ? (d.juros / d.total * 100).toFixed(1) : 0;
                return `🎯 Os juros já ultrapassaram o total aportado! Neste ${sufixo} os juros representam ${fatia}% do patrimônio — seu dinheiro trabalha mais do que você.`;
            } else {
                const falta = formatCurrency(d.investido - d.juros);
                return `📊 Os juros ainda não superaram o aportado. Falta ${falta} para essa virada — ela é o ponto mágico dos juros compostos!`;
            }
        }
        if (cardId === 'cardInvestido') {
            const fatia = d.total > 0 ? (d.investido / d.total * 100).toFixed(1) : 0;
            return `💪 Seu esforço representa ${fatia}% do patrimônio atual. O restante (${(100 - parseFloat(fatia)).toFixed(1)}%) foi gerado pelos juros compostos — isso é o poder de investir consistentemente.`;
        }
        if (cardId === 'cardRenda') {
            const rendaMensal = d.renda / (tipoPeriodo === 'anual' ? 12 : 1);
            const pct = finalD.renda > 0 ? (d.renda / finalD.renda * 100).toFixed(1) : 0;
            return `💰 Neste ${sufixo} sua renda seria ${formatCurrency(rendaMensal)}/mês. Isso representa ${pct}% da renda final projetada de ${formatCurrency(finalD.renda / 12)}/mês.`;
        }
        return '';
    }

    function setupCardNeonClick() {
        cardNeonMap.forEach(({ cardId, neonClass }) => {
            const card = document.getElementById(cardId);
            if (!card) return;
            card.addEventListener('click', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL') return;

                const panel = document.getElementById('cardInfoPanel');
                const isActive = activeCardId === cardId;

                cardNeonMap.forEach(m => {
                    document.getElementById(m.cardId)?.classList.remove('card-selected-purple');
                });

                if (isActive) {
                    activeCardId = null;
                    panel?.classList.add('hidden');
                    return;
                }

                card.classList.add('card-selected-purple');
                activeCardId = cardId;

                const tempoInput = parseInt(document.getElementById('inputAnos').value) || 1;
                const cicloFinal = tempoInput;
                const cicloInspecao = temporalAtivo
                    ? (parseInt(document.getElementById('inputAnoFiltro').value) || cicloFinal)
                    : cicloFinal;
                const d = baseDadosCalculados.anos[cicloInspecao] || { investido: 0, juros: 0, total: 0, renda: 0 };
                const finalD = baseDadosCalculados.anos[cicloFinal] || { investido: 1, juros: 1, total: 1, renda: 1 };

                let pct = 0, titulo = '', cor = '#a855f7';
                if (cardId === 'cardTotal')     { pct = finalD.total  > 0 ? d.total  / finalD.total  * 100 : 0; titulo = 'Patrimônio Total'; cor = '#32CD32'; }
                if (cardId === 'cardJuros')     { pct = finalD.juros  > 0 ? d.juros  / finalD.juros  * 100 : 0; titulo = 'Total em Juros';   cor = '#FF8C00'; }
                if (cardId === 'cardInvestido') { pct = finalD.total  > 0 ? d.investido / finalD.total * 100 : 0; titulo = 'Total Aportado'; cor = '#00BFFF'; }
                if (cardId === 'cardRenda')     { pct = finalD.renda  > 0 ? d.renda  / finalD.renda  * 100 : 0; titulo = 'Renda';           cor = '#FFCC00'; }
                pct = Math.min(100, Math.max(0, pct));

                document.getElementById('cardInfoTitle').textContent = titulo;
                document.getElementById('cardInfoPct').textContent   = pct.toFixed(1) + '% do final';
                document.getElementById('cardInfoPct').style.color   = cor;
                document.getElementById('cardInfoPct').style.background = cor + '22';
                document.getElementById('cardProgressFill').style.width      = pct + '%';
                document.getElementById('cardProgressFill').style.background = cor;
                document.getElementById('cardProgressFill').style.boxShadow  = `0 0 8px ${cor}80`;
                document.getElementById('cardInfoComment').textContent = gerarComentarioCard(cardId, d, finalD, cicloInspecao, cicloFinal);
                panel?.classList.remove('hidden');
            });
        });
    }

    let activeCardDataset = -1;

    function setupCardDetails() {
        ['detailTotal','detailJuros','detailInvestido','detailRenda'].forEach(id => {
            document.getElementById(id)?.classList.remove('expanded');
        });
    }

    function setupPeriodArrows() {
        document.getElementById('btnPeriodoUp')?.addEventListener('click', () => {
            const el = document.getElementById('inputAnos');
            el.value = (parseInt(el.value)||0) + 1;
            executarPipelineCore();
        });
        document.getElementById('btnPeriodoDown')?.addEventListener('click', () => {
            const el = document.getElementById('inputAnos');
            el.value = Math.max(1, (parseInt(el.value)||0) - 1);
            executarPipelineCore();
        });
        document.getElementById('btnInteligUp')?.addEventListener('click', () => {
            const el = document.getElementById('inputAnoInicioInteligente');
            el.value = (parseInt(el.value)||0) + 1;
            executarPipelineCore();
        });
        document.getElementById('btnInteligDown')?.addEventListener('click', () => {
            const el = document.getElementById('inputAnoInicioInteligente');
            el.value = Math.max(1, (parseInt(el.value)||0) - 1);
            executarPipelineCore();
        });
        document.getElementById('btnRetiradaUp')?.addEventListener('click', () => {
            const el = document.getElementById('inputAnoInicioRetirada');
            el.value = (parseInt(el.value)||0) + 1;
            executarPipelineCore();
        });
        document.getElementById('btnRetiradaDown')?.addEventListener('click', () => {
            const el = document.getElementById('inputAnoInicioRetirada');
            el.value = Math.max(1, (parseInt(el.value)||0) - 1);
            executarPipelineCore();
        });
        document.getElementById('btnIdadeUp')?.addEventListener('click', () => {
            const el = document.getElementById('inputIdade');
            const expectativa = parseInt(document.getElementById('inputExpectativaVida').value) || 76;
            el.value = Math.min(expectativa - 1, (parseInt(el.value)||0) + 1);
            executarPipelineCore();
        });
        document.getElementById('btnIdadeDown')?.addEventListener('click', () => {
            const el = document.getElementById('inputIdade');
            el.value = Math.max(1, (parseInt(el.value)||0) - 1);
            executarPipelineCore();
        });
        document.getElementById('btnTemporalUp')?.addEventListener('click', () => {
            const el = document.getElementById('inputAnoFiltro');
            const max = parseInt(el.max) || 9999;
            el.value = Math.min(max, (parseInt(el.value)||0) + 1);
            executarPipelineCore();
        });
        document.getElementById('btnTemporalDown')?.addEventListener('click', () => {
            const el = document.getElementById('inputAnoFiltro');
            el.value = Math.max(1, (parseInt(el.value)||0) - 1);
            executarPipelineCore();
        });
    }

    function init() {
        document.body.classList.add('modo-simples');
        // Lembrete de manutenção: salário mínimo é fixado por ano.
        if (new Date().getFullYear() > SALARIO_MINIMO_ANO) {
            console.warn(`[Mais Valor] Salário mínimo de referência (R$ ${SALARIO_MINIMO}, ${SALARIO_MINIMO_ANO}) pode estar desatualizado. Atualize a constante SALARIO_MINIMO.`);
        }
        setupCurrencyMask('inputInicial');
        setupCurrencyMask('inputMensal');
        setupCurrencyMask('inputValorRetirada');
        setupCurrencyMask('inputNovoAporte');
        setupCurrencyMask('inputCustoVida');

        // Cap chart height at 1.5× its width
        const chartWrapper = document.getElementById('chartWrapper');
        if (chartWrapper && window.ResizeObserver) {
            const chartRO = new ResizeObserver(entries => {
                for (const entry of entries) {
                    const w = entry.contentRect.width;
                    const maxH = Math.round(w * 1.5);
                    chartWrapper.style.height = Math.min(maxH, 560) + 'px';
                }
            });
            chartRO.observe(chartWrapper);
        }

        setupLegendToggles();
        setupCardDetails();
        setupCardNeonClick();
        _setupCardsDoidoClick(); // v1.doido: registra listener em capture para interceptar no modo doido
        setupPeriodArrows();

        document.getElementById('inputTaxa').addEventListener('input', executarPipelineDebounced);
        document.getElementById('inputAnos').addEventListener('input', () => { executarPipelineDebounced(); });

        // Meta input
        setupCurrencyMask('inputMeta');
        document.getElementById('inputMeta')?.addEventListener('input', executarPipelineDebounced);
        document.getElementById('chkMeta')?.addEventListener('change', executarPipelineCore);

        // Modo reverso inputs
        setupCurrencyMask('inputPatrimonioAlvo');
        document.getElementById('inputPatrimonioAlvo')?.addEventListener('input', calcularModoReverso);

        // Colapsável Meta
        document.getElementById('headerMeta')?.addEventListener('click', () => {
            const box = document.getElementById('boxMeta');
            const icon = document.getElementById('toggleIconMeta');
            box?.classList.toggle('hidden');
            if (icon) icon.textContent = box?.classList.contains('hidden') ? '▶' : '▼';
        });

        // Colapsável Cenarios — agora controlado por toggleCenarios/toggleHeaderCenarios
        // (o click no header só colapsa quando ativo, via toggleHeaderCenarios inline)
        document.getElementById('inputInflacao').addEventListener('input', executarPipelineDebounced);
        document.getElementById('inputAnoInicioRetirada').addEventListener('input', executarPipelineDebounced);
        document.getElementById('inputAnoInicioInteligente').addEventListener('input', executarPipelineDebounced);
        document.getElementById('inputAnoFiltro').addEventListener('input', () => { atualizarMetricasExibidas(); executarPipelineDebounced(); });

        function _dispararEmocaoModo(btn) {
            const wrap = document.getElementById('modoToggleWrap');
            const wr = wrap.getBoundingClientRect();
            const size = wr.width;
            const r = document.createElement('div');
            r.className = 'modo-ripple';
            r.style.cssText = `width:${size}px;height:${size}px;left:${size/2 * -1 + wr.width/2}px;top:${18 - size/2}px;`;
            wrap.appendChild(r);
            setTimeout(() => r.remove(), 600);
            wrap.classList.remove('modo-flash');
            void wrap.offsetWidth;
            wrap.classList.add('modo-flash');
            setTimeout(() => wrap.classList.remove('modo-flash'), 500);
        }
        document.getElementById('btnModoSimples').addEventListener('click', function() { _dispararEmocaoModo(this); alternarModoExibicao('simples'); });
        document.getElementById('btnModoCompleto').addEventListener('click', function() { _dispararEmocaoModo(this); alternarModoExibicao('completo'); });

        // Helper: cor de fundo do botão toggle ativo, respeitando o tema atual
        function _bgToggleAtivo() {
            const t = (typeof _temaAtual !== 'undefined') ? _temaAtual : (localStorage.getItem('mvTema') || 'dark');
            if (t === 'cute')   return 'linear-gradient(135deg,#b070d8,#8850b8)';
            if (t === 'pastel') return 'linear-gradient(135deg,#e8a84a,#c8882a)';
            if (t === 'light')  return 'linear-gradient(135deg,#c87830,#a85e1a)';
            return 'var(--gold)'; // dark
        }

        document.getElementById('btnTaxaAnual').addEventListener('click', () => {
            tipoTaxa = "anual";
            const a = document.getElementById('btnTaxaAnual'), b = document.getElementById('btnTaxaMensal');
            a.className = "px-2 py-0.5 rounded-md text-toggle-active transition btn-toggle-ativo"; a.style.background = '';
            b.className = "px-2 py-0.5 rounded-md text-gray-400 transition";                      b.style.background = '';
            executarPipelineCore();
        });
        document.getElementById('btnTaxaMensal').addEventListener('click', () => {
            tipoTaxa = "mensal";
            const a = document.getElementById('btnTaxaMensal'), b = document.getElementById('btnTaxaAnual');
            a.className = "px-2 py-0.5 rounded-md text-toggle-active transition btn-toggle-ativo"; a.style.background = '';
            b.className = "px-2 py-0.5 rounded-md text-gray-400 transition";                      b.style.background = '';
            executarPipelineCore();
        });

        document.getElementById('btnPeriodoAnos').addEventListener('click', () => {
            tipoPeriodo = "anual";
            document.getElementById('labelPeriodoSufixo').innerText = "anos";
            const a = document.getElementById('btnPeriodoAnos'), b = document.getElementById('btnPeriodoMeses');
            a.className = "px-2 py-0.5 rounded-md text-toggle-active transition btn-toggle-ativo"; a.style.background = '';
            b.className = "px-2 py-0.5 rounded-md text-gray-400 transition";                      b.style.background = '';
            renderizarRetiradaUnica(); // [1.2] rótulo Ano/Mês acompanha o período
            executarPipelineCore();
        });
        document.getElementById('btnPeriodoMeses').addEventListener('click', () => {
            tipoPeriodo = "mensal";
            document.getElementById('labelPeriodoSufixo').innerText = "meses";
            const a = document.getElementById('btnPeriodoMeses'), b = document.getElementById('btnPeriodoAnos');
            a.className = "px-2 py-0.5 rounded-md text-toggle-active transition btn-toggle-ativo"; a.style.background = '';
            b.className = "px-2 py-0.5 rounded-md text-gray-400 transition";                      b.style.background = '';
            renderizarRetiradaUnica(); // [1.2] rótulo Ano/Mês acompanha o período
            executarPipelineCore();
        });

        document.getElementById('chkAtivarAvancado').addEventListener('change', function() {
            const box = document.getElementById('boxCamposAvancados');
            if (this.checked) {
                box.classList.remove('opacity-30','pointer-events-none');
            } else {
                box.classList.add('opacity-30','pointer-events-none');
                // Collapse all expanded sub-sections
                const collapseMap = [
                    { box: 'boxAporteInteligente', icon: 'toggleIconAporte', chk: 'chkAporteInteligente' },
                    { box: 'boxRetirada',          icon: 'toggleIconRetirada', chk: 'chkRetirada' },
                    { box: 'boxLiberdade',         icon: 'toggleIconLiberdade', chk: 'chkLiberdade' },
                    { box: 'boxMeta',              icon: 'toggleIconMeta',   chk: 'chkMeta' },
                    { box: 'boxCenarios',          icon: 'toggleIconCenarios', chk: null },
                    { box: 'boxPoupanca',          icon: 'toggleIconPoupanca', chk: 'chkPoupanca' },
                ];
                collapseMap.forEach(({ box: bId, icon: iId, chk: cId }) => {
                    const b = document.getElementById(bId);
                    const ic = document.getElementById(iId);
                    if (b && !b.classList.contains('hidden')) {
                        b.classList.add('hidden');
                        if (ic) ic.classList.remove('open');
                    }
                    if (cId) { const c = document.getElementById(cId); if (c) c.checked = false; }
                });
                // Zerar cenários explicitamente
                const chkCen = document.getElementById('chkCenarios');
                if (chkCen) chkCen.checked = false;
                cenariosAtivo = false;
                cenarios = [];
                cenarioCounter = 0;
                const cardsCen = document.getElementById('cardsGridCenarios');
                if (cardsCen) cardsCen.classList.add('hidden');
                const cardsNorm = document.getElementById('cardsGrid');
                if (cardsNorm) cardsNorm.classList.remove('hidden');
                renderListaCenarios();
            }
            executarPipelineCore();
        });

        // toggleSmartSection: usado pelo onclick="toggleSmartSection('...')" no header da Inspeção Temporal
        window.toggleSmartSection = function(nome) {
            const box  = document.getElementById('box'  + nome);
            const icon = document.getElementById('toggleIcon' + nome);
            if (!box) return;
            const isHidden = box.classList.contains('hidden');
            box.classList.toggle('hidden', !isHidden);
            if (icon) isHidden ? icon.classList.add('open') : icon.classList.remove('open');
        };

        document.getElementById('headerAporteInteligente')?.addEventListener('click', function(e) {
            if (e.target.tagName === 'INPUT') return;
            const box = document.getElementById('boxAporteInteligente');
            const icon = document.getElementById('toggleIconAporte');
            const isHidden = box.classList.contains('hidden');
            box.classList.toggle('hidden', !isHidden);
            isHidden ? icon.classList.add('open') : icon.classList.remove('open');
        });

        document.getElementById('chkAporteInteligente').addEventListener('change', function() {
            const box = document.getElementById('boxAporteInteligente');
            const icon = document.getElementById('toggleIconAporte');
            if (this.checked) {
                box.classList.remove('hidden');
                icon.classList.add('open');
            } else {
                box.classList.add('hidden');
                icon.classList.remove('open');
            }
            executarPipelineCore();
        });

        document.getElementById('headerRetirada')?.addEventListener('click', function(e) {
            if (e.target.tagName === 'INPUT') return;
            const box = document.getElementById('boxRetirada');
            const icon = document.getElementById('toggleIconRetirada');
            const isHidden = box.classList.contains('hidden');
            box.classList.toggle('hidden', !isHidden);
            isHidden ? icon.classList.add('open') : icon.classList.remove('open');
        });

        document.getElementById('chkRetirada').addEventListener('change', function() {
            const box = document.getElementById('boxRetirada');
            const icon = document.getElementById('toggleIconRetirada');
            if (this.checked) {
                box.classList.remove('hidden');
                icon.classList.add('open');
            } else {
                box.classList.add('hidden');
                icon.classList.remove('open');
            }
            executarPipelineCore();
        });

        document.getElementById('headerLiberdade')?.addEventListener('click', function(e) {
            if (e.target.tagName === 'INPUT') return;
            const box = document.getElementById('boxLiberdade');
            const icon = document.getElementById('toggleIconLiberdade');
            const isHidden = box.classList.contains('hidden');
            box.classList.toggle('hidden', !isHidden);
            isHidden ? icon.classList.add('open') : icon.classList.remove('open');
        });

        document.getElementById('chkLiberdade')?.addEventListener('change', function() {
            const box = document.getElementById('boxLiberdade');
            const icon = document.getElementById('toggleIconLiberdade');
            if (this.checked) {
                box.classList.remove('hidden');
                icon.classList.add('open');
            } else {
                box.classList.add('hidden');
                icon.classList.remove('open');
            }
            executarPipelineCore();
        });

        document.getElementById('inputCustoVida')?.addEventListener('input', executarPipelineDebounced);
        document.getElementById('inputCustoVida')?.addEventListener('blur', function() {
            if (!this.value || this.value.trim() === '') { this.value = ''; }
            clearTimeout(_pipelineDebounceTimer); _pipelineDebounceTimer = null;
            executarPipelineCore();
        });

        document.getElementById('headerPoupanca')?.addEventListener('click', function(e) {
            if (e.target.tagName === 'INPUT') return;
            const box = document.getElementById('boxPoupanca');
            const icon = document.getElementById('toggleIconPoupanca');
            const isHidden = box.classList.contains('hidden');
            box.classList.toggle('hidden', !isHidden);
            isHidden ? icon.classList.add('open') : icon.classList.remove('open');
        });

        document.getElementById('chkPoupanca')?.addEventListener('change', function() {
            const box = document.getElementById('boxPoupanca');
            const icon = document.getElementById('toggleIconPoupanca');
            if (this.checked) {
                box.classList.remove('hidden');
                icon.classList.add('open');
            } else {
                box.classList.add('hidden');
                icon.classList.remove('open');
            }
            executarPipelineCore();
        });

        document.getElementById('chkInflacaoAporte')?.addEventListener('change', function() {
            executarPipelineCore();
        });
        document.getElementById('chkIpcaCalc')?.addEventListener('change', executarPipelineCore);
        document.getElementById('inputIpcaCalcValor')?.addEventListener('input', executarPipelineDebounced);

        document.getElementById('chkVidaReal')?.addEventListener('change', function() {
            const idadeSection = document.getElementById('idadeSection');
            const periodoSection = document.getElementById('periodoSection');
            if (this.checked) {
                _periodoAntesDaVidaReal = document.getElementById('inputAnos').value;
                idadeSection.classList.remove('hidden');
                periodoSection.classList.add('opacity-30', 'pointer-events-none');
                tipoPeriodo = 'anual';
                document.getElementById('labelPeriodoSufixo').innerText = 'anos';
                document.getElementById('btnPeriodoAnos').className = "px-2 py-0.5 rounded-md text-toggle-active transition btn-toggle-ativo"; document.getElementById('btnPeriodoAnos').style.background = '';
                document.getElementById('btnPeriodoMeses').className = "px-2 py-0.5 rounded-md text-gray-400 transition";                      document.getElementById('btnPeriodoMeses').style.background = '';
            } else {
                idadeSection.classList.add('hidden');
                periodoSection.classList.remove('opacity-30', 'pointer-events-none');
                if (_periodoAntesDaVidaReal !== null) {
                    document.getElementById('inputAnos').value = _periodoAntesDaVidaReal;
                    _periodoAntesDaVidaReal = null;
                }
            }
            executarPipelineCore();
        });

        document.getElementById('inputIdade')?.addEventListener('input', executarPipelineDebounced);
        document.getElementById('inputExpectativaVida')?.addEventListener('change', executarPipelineCore);

        document.getElementById('chkTemporalAtivo').addEventListener('change', function() {
            temporalAtivo = this.checked;
            const box    = document.getElementById('boxTemporalInput');
            const boxPai = document.getElementById('boxInspecaoTemporal');
            const icon   = document.getElementById('toggleIconInspecaoTemporal');
            if (this.checked) {
                if (boxPai && boxPai.classList.contains('hidden')) {
                    boxPai.classList.remove('hidden');
                    if (icon) icon.classList.add('open');
                }
                box.classList.remove('opacity-30','pointer-events-none');
                const totalCiclos = tipoPeriodo === 'anual' ? (parseInt(document.getElementById('inputAnos').value)||1) : (parseInt(document.getElementById('inputAnos').value)||1);
                document.getElementById('inputAnoFiltro').value = totalCiclos;
            } else {
                box.classList.add('opacity-30','pointer-events-none');
                ['detailTotal','detailJuros','detailInvestido','detailRenda'].forEach(id => {
                    document.getElementById(id)?.classList.remove('expanded');
                });
            }
            executarPipelineCore();
        });

        function _syncRendaToggle(checked) {
            const wrap = document.getElementById('rendaToggleWrap');
            const slider = document.getElementById('rendaSlider');
            const btnOff = document.getElementById('btnRendaOff');
            const btnOn  = document.getElementById('btnRendaOn');
            if (!wrap || !slider) return;
            const offEl = btnOff, onEl = btnOn;
            if (checked) {
                slider.style.left  = (offEl.offsetWidth + 2) + 'px';
                slider.style.width = onEl.offsetWidth + 'px';
                offEl.style.color = 'var(--text-dim)';
                onEl.style.color  = 'var(--bg-base)';
            } else {
                slider.style.left  = '0px';
                slider.style.width = offEl.offsetWidth + 'px';
                offEl.style.color = 'var(--bg-base)';
                onEl.style.color  = 'var(--text-dim)';
            }
        }
        document.getElementById('chkRenda').addEventListener('change', function() {
            _syncRendaToggle(this.checked);
            if (myChart) {
                if (this.checked) myChart.show(3);
                else myChart.hide(3);
                myChart.update();
            }
            if (!this.checked && activeCardDataset === 3) {
                activeCardDataset = -1;
                cardNeonMap.forEach(m => document.getElementById(m.cardId)?.classList.remove(m.neonClass));
                for (let i = 0; i < 4; i++) {
                    if (datasetVisibility[i]) myChart?.show(i);
                    else myChart?.hide(i);
                }
            }
            const legendRenda = document.getElementById('legendRenda');
            legendRenda?.classList.toggle('active', this.checked);
            legendRenda?.classList.toggle('inactive', !this.checked);
        });
        // Init visual do toggle renda
        setTimeout(() => _syncRendaToggle(document.getElementById('chkRenda').checked), 50);

        document.getElementById('chkInflacao').addEventListener('change', executarPipelineCore);

        document.getElementById('btnReiniciarBasico').addEventListener('click', () => {
            document.getElementById('inputInicial').value = '0,00';
            document.getElementById('inputMensal').value = '0,00';
            document.getElementById('inputTaxa').value = '12';
            document.getElementById('inputAnos').value = '3';
            tipoTaxa = 'anual';
            tipoPeriodo = 'anual';
            document.getElementById('btnTaxaAnual').className  = "px-2 py-0.5 rounded-md text-toggle-active transition btn-toggle-ativo"; document.getElementById('btnTaxaAnual').style.background  = '';
            document.getElementById('btnTaxaMensal').className = "px-2 py-0.5 rounded-md text-gray-400 transition";                      document.getElementById('btnTaxaMensal').style.background = '';
            document.getElementById('btnPeriodoAnos').className  = "px-2 py-0.5 rounded-md text-toggle-active transition btn-toggle-ativo"; document.getElementById('btnPeriodoAnos').style.background  = '';
            document.getElementById('btnPeriodoMeses').className = "px-2 py-0.5 rounded-md text-gray-400 transition";                      document.getElementById('btnPeriodoMeses').style.background = '';
            document.getElementById('labelPeriodoSufixo').innerText = "anos";
            executarPipelineCore();
        });

        document.getElementById('btnReiniciarAvancado').addEventListener('click', () => {
            document.getElementById('chkAtivarAvancado').checked = false;
            document.getElementById('boxCamposAvancados').classList.add('opacity-30','pointer-events-none');
            document.getElementById('chkAporteInteligente').checked = false;
            document.getElementById('boxAporteInteligente').classList.add('hidden');
            document.getElementById('toggleIconAporte').classList.remove('open');
            document.getElementById('chkRetirada').checked = false;
            document.getElementById('boxRetirada').classList.add('hidden');
            document.getElementById('toggleIconRetirada').classList.remove('open');
            document.getElementById('inputNovoAporte').value = '';
            document.getElementById('inputAnoInicioInteligente').value = '';
            document.getElementById('inputValorRetirada').value = '';
            document.getElementById('inputAnoInicioRetirada').value = '';
            document.getElementById('chkInflacao').checked = false;
            document.getElementById('chkInflacaoAporte').checked = false;
            document.getElementById('inputInflacao').value = '4.5';
            document.getElementById('lblIpca').textContent = '4,5%';
            document.getElementById('chkTemporalAtivo').checked = false;
            temporalAtivo = false;
            document.getElementById('boxTemporalInput').classList.add('opacity-30','pointer-events-none');
            document.getElementById('chkVidaReal').checked = false;
            document.getElementById('idadeSection').classList.add('hidden');
            document.getElementById('periodoSection').classList.remove('opacity-30','pointer-events-none');
            if (typeof _periodoAntesDaVidaReal !== 'undefined' && _periodoAntesDaVidaReal !== null) {
                document.getElementById('inputAnos').value = _periodoAntesDaVidaReal;
                _periodoAntesDaVidaReal = null;
            }
            document.getElementById('chkLiberdade').checked = false;
            document.getElementById('boxLiberdade').classList.add('hidden');
            document.getElementById('toggleIconLiberdade').classList.remove('open');
            document.getElementById('inputCustoVida').value = '';
            document.getElementById('chkPoupanca').checked = false;
            document.getElementById('boxPoupanca').classList.add('hidden');
            document.getElementById('toggleIconPoupanca').classList.remove('open');
            poupancaAtivaPoupanca = true;
            poupancaAtivaCorrente = false;
            const dotP = document.getElementById('radioPoupancaDot');
            if (dotP) { dotP.style.background = '#FF8C00'; dotP.style.borderColor = '#FF8C00'; dotP.style.boxShadow = '0 0 5px rgba(255,140,0,0.5)'; }
            const dotC = document.getElementById('radioCorrenteDot');
            if (dotC) { dotC.style.background = 'transparent'; dotC.style.borderColor = '#3a3a48'; dotC.style.boxShadow = 'none'; }
            document.getElementById('lblTaxaPoupanca').style.color = '#FF8C00';
            retiradaUnicaList = [];
            renderizarRetiradaUnica();

            // Reset Último Aporte Eficaz
            const chkUltimo = document.getElementById('chkUltimoAporte');
            if (chkUltimo) chkUltimo.checked = false;
            const uaStatus = document.getElementById('ultimoAporteStatus');
            if (uaStatus) uaStatus.classList.add('hidden');

            // Reset Meta
            const chkMetaEl = document.getElementById('chkMeta');
            if (chkMetaEl) chkMetaEl.checked = false;
            const boxMetaEl = document.getElementById('boxMeta');
            if (boxMetaEl) boxMetaEl.classList.add('hidden');
            const iconMetaEl = document.getElementById('toggleIconMeta');
            if (iconMetaEl) iconMetaEl.classList.remove('open');
            metaList = [];
            adicionarMetaSilenciosa();

            // Reset Cenários
            const chkCenariosEl = document.getElementById('chkCenarios');
            if (chkCenariosEl) chkCenariosEl.checked = false;
            const boxCenariosEl = document.getElementById('boxCenarios');
            if (boxCenariosEl) boxCenariosEl.classList.add('hidden');
            const iconCenariosEl = document.getElementById('toggleIconCenarios');
            if (iconCenariosEl) iconCenariosEl.classList.remove('open');
            const btnSalvarEl = document.getElementById('btnSalvarCenario');
            if (btnSalvarEl) btnSalvarEl.classList.add('hidden');
            cenariosAtivo = false;
            cenarios = [];
            cenarioCounter = 0;
            const cardsCenarios = document.getElementById('cardsGridCenarios');
            if (cardsCenarios) cardsCenarios.classList.add('hidden');
            const cardsNormais = document.getElementById('cardsGrid');
            if (cardsNormais) cardsNormais.classList.remove('hidden');
            renderListaCenarios();

            // Zera inputs principais
            document.getElementById('inputInicial').value = '0,00';
            document.getElementById('inputMensal').value = '0,00';
            document.getElementById('inputTaxa').value = '12';
            document.getElementById('inputAnos').value = '1';
            executarPipelineCore();
        });

        // Valores iniciais na carga
        document.getElementById('inputInicial').value = '10.000,00';
        document.getElementById('inputMensal').value = '1.500,00';
        document.getElementById('inputTaxa').value = '12';
        document.getElementById('inputAnos').value = '5';
        executarPipelineCore();
        aplicarParamsURL(); // [S8-17] link compartilhado sobrescreve os padrões
        initEasterEgg();
    }

    function ativarEdicaoExpectativa() {
        document.getElementById('lblExpectativa').classList.add('hidden');
        const inp = document.getElementById('inputExpectativaVida');
        inp.classList.remove('hidden');
        inp.focus();
        inp.select();
    }
    function finalizarEdicaoExpectativa() {
        const inp = document.getElementById('inputExpectativaVida');
        const lbl = document.getElementById('lblExpectativa');
        let val = parseInt(inp.value) || 76;
        if (val < 50) val = 50;
        if (val > 120) val = 120;
        inp.value = val;
        lbl.textContent = val + ' anos';
        inp.classList.add('hidden');
        lbl.classList.remove('hidden');
        executarPipelineCore();
    }

    function ativarEdicaoIpcaCalc() {
        document.getElementById('lblIpcaCalcValor').classList.add('hidden');
        const inp = document.getElementById('inputIpcaCalcValor');
        inp.classList.remove('hidden');
        inp.focus();
        inp.select();
    }
    function finalizarEdicaoIpcaCalc() {
        const inp = document.getElementById('inputIpcaCalcValor');
        const lbl = document.getElementById('lblIpcaCalcValor');
        let val = parseFloat(inp.value);
        if (isNaN(val) || val < 0) val = 4.5;
        if (val > 30) val = 30;
        inp.value = val;
        lbl.textContent = val.toFixed(1).replace('.', ',') + '%';
        inp.classList.add('hidden');
        lbl.classList.remove('hidden');
        executarPipelineCore();
    }
    function onIpcaCalcChange() {
        const ativo = document.getElementById('chkIpcaCalc').checked;
        const lblText = document.getElementById('lblIpcaCalcText');
        const lblVal  = document.getElementById('lblIpcaCalcValor');
        lblText.style.color = ativo ? '#FFCC00' : '#9ca3af';
        lblVal.style.color  = ativo ? '#FFCC00' : '#6b7280';
        executarPipelineCore();
        atualizarIpcaCalcInfo();
    }
    function atualizarIpcaCalcInfo() {
        const box = document.getElementById('ipcaCalcInfo');
        if (!box) return;
        const ativo = document.getElementById('chkIpcaCalc')?.checked;
        if (!ativo || modoAtual !== 'simples') { box.classList.add('hidden'); return; }

        const aporteBase = parseCurrencyValue(document.getElementById('inputMensal').value);
        const ipca = (parseFloat(document.getElementById('inputIpcaCalcValor')?.value) || 4.5) / 100;
        const anos = parseInt(document.getElementById('inputAnos').value) || 1;
        if (aporteBase <= 0) { box.classList.add('hidden'); return; }

        const aporteFinal = aporteBase * Math.pow(1 + ipca, anos);
        const aporteTotal = aporteBase * ((Math.pow(1 + ipca, anos + 1) - (1 + ipca)) / ipca);
        const aportesMedioAnual = anos > 0 ? aporteTotal / anos : aporteBase;

        document.getElementById('ipcaCalcInfoMedio').textContent = `↗ Aporte médio no período: ${formatCurrency(aportesMedioAnual / 12)}/mês`;
        document.getElementById('ipcaCalcInfoFinal').textContent = `↗ Aporte final (${tipoPeriodo === 'anual' ? 'ano' : 'mês'} ${anos}): ${formatCurrency(aporteFinal)}/mês`;
        box.classList.remove('hidden');
    }

    function ativarEdicaoIpca() {
        document.getElementById('lblIpca').classList.add('hidden');
        const inp = document.getElementById('inputInflacao');
        inp.classList.remove('hidden');
        inp.focus();
        inp.select();
    }
    function finalizarEdicaoIpca() {
        const inp = document.getElementById('inputInflacao');
        const lbl = document.getElementById('lblIpca');
        let val = parseFloat(inp.value);
        if (isNaN(val) || val < 0) val = 4.5;
        if (val > 30) val = 30;
        inp.value = val;
        lbl.textContent = val.toFixed(1).replace('.', ',') + '%';
        inp.classList.add('hidden');
        lbl.classList.remove('hidden');
        executarPipelineCore();
    }

    function exportarExcel() {
        const anos = baseDadosCalculados.anos;
        const chaves = Object.keys(anos).map(Number).sort((a,b)=>a-b);
        const sufixo = tipoPeriodo === 'anual' ? 'Ano' : 'Mês';
        const ipcaAtivo = modoAtual === 'completo'
            ? document.getElementById('chkInflacaoAporte')?.checked
            : document.getElementById('chkIpcaCalc')?.checked;
        const usaIpca = !!ipcaAtivo;

        const cabecalho = [sufixo, 'Patrimônio Total (R$)', 'Total em Juros (R$)', 'Total Aportado (R$)', 'Renda Anual (R$)', 'Renda Mensal (R$)'];
        if (usaIpca) cabecalho.push('Aporte Mensal Vigente (R$)');

        const rows = [cabecalho];
        chaves.forEach(k => {
            const d = anos[k];
            // d.renda é anual no período anual e mensal no período mensal
            const rendaAnual  = tipoPeriodo === 'anual' ? d.renda : d.renda * 12;
            const rendaMensal = tipoPeriodo === 'anual' ? d.renda / 12 : d.renda;
            const row = [k, d.total.toFixed(2), d.juros.toFixed(2), d.investido.toFixed(2), rendaAnual.toFixed(2), rendaMensal.toFixed(2)];
            if (usaIpca) row.push((d.aporteVigente||0).toFixed(2));
            rows.push(row);
        });

        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = cabecalho.map(() => ({wch: 22}));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Simulação');
        XLSX.writeFile(wb, 'Simulacao_Mais_Valor.xlsx');
    }

    function exportarPDF() {
        if (!baseDadosCalculados?.anos) return;
        const anos = baseDadosCalculados.anos;
        const chaves = Object.keys(anos).map(Number).sort((a,b)=>a-b);
        const sufixo = tipoPeriodo === 'anual' ? 'Ano' : 'Mês';
        const finalAno = chaves[chaves.length - 1];
        const finalDados = anos[finalAno] || {};
        const patrimonioFinal = finalDados.total || 0;
        const rendaMensalFinal = tipoPeriodo === 'anual' ? (finalDados.renda || 0) / 12 : (finalDados.renda || 0);
        const dataHoje = new Date().toLocaleDateString('pt-BR');

        const vInicial = document.getElementById('inputInicial').value;
        const aMensal  = document.getElementById('inputMensal').value;
        const taxa     = document.getElementById('inputTaxa').value + '% ' + (tipoTaxa === 'anual' ? 'a.a.' : 'a.m.');
        const periodo  = document.getElementById('inputAnos').value + ' ' + (tipoPeriodo === 'anual' ? 'anos' : 'meses');

        const tRows = chaves.map((k, i) => {
            const d = anos[k];
            const bg = i % 2 === 0 ? '#0f0f18' : '#13131f';
            return `<tr style="background:${bg};color:#d1d5db;">
                <td style="padding:5px 10px;">${k}</td>
                <td style="padding:5px 10px;text-align:right;color:#32CD32;font-weight:bold;">${formatCurrency(d.total)}</td>
                <td style="padding:5px 10px;text-align:right;color:#FF8C00;">${formatCurrency(d.juros)}</td>
                <td style="padding:5px 10px;text-align:right;color:#00BFFF;">${formatCurrency(d.investido)}</td>
                <td style="padding:5px 10px;text-align:right;color:#FFCC00;">${formatCurrency(tipoPeriodo === 'anual' ? d.renda/12 : d.renda)}</td>
            </tr>`;
        }).join('');

        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
        <title>Simulação Mais Valor</title>
        <style>
            body { background:#0f0f12; color:#e5e7eb; font-family:sans-serif; padding:32px; }
            h1 { color:#FFCC00; font-size:24px; margin-bottom:4px; }
            .sub { color:#9ca3af; font-size:13px; margin-bottom:24px; }
            .params { display:flex; gap:16px; margin-bottom:28px; flex-wrap:wrap; }
            .param { background:#16161a; border:1px solid #24242b; border-radius:10px; padding:10px 16px; }
            .param label { font-size:10px; color:#6b7280; text-transform:uppercase; letter-spacing:.05em; display:block; }
            .param span { font-size:16px; font-weight:bold; color:#fff; }
            .resultado { background:#0f1a0f; border:1px solid #32CD3240; border-radius:12px; padding:16px 20px; margin-bottom:28px; }
            table { width:100%; border-collapse:collapse; font-size:12px; }
            th { background:#1a1a2e; color:#FFCC00; padding:6px 10px; text-align:right; }
            th:first-child { text-align:left; }
            @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
        </style></head><body>
        <h1>MAIS VALOR · Simulação de Investimento</h1>
        <div class="sub">Gerado em ${dataHoje}</div>
        <div class="params">
            <div class="param"><label>Capital Inicial</label><span>R$ ${vInicial}</span></div>
            <div class="param"><label>Aporte Mensal</label><span>R$ ${aMensal}</span></div>
            <div class="param"><label>Rentabilidade</label><span>${taxa}</span></div>
            <div class="param"><label>Período</label><span>${periodo}</span></div>
        </div>
        <div class="resultado">
            <div style="font-size:18px;font-weight:900;color:#FFCC00;margin-bottom:12px;">📊 Resultado Final</div>
            <p style="color:#d1d5db;margin:0 0 6px;">Patrimônio acumulado: <strong style="color:#32CD32;font-size:18px;">${formatCurrency(patrimonioFinal)}</strong></p>
            <p style="color:#d1d5db;margin:0;">Renda mensal projetada (${taxa}): <strong style="color:#FFCC00;">${formatCurrency(rendaMensalFinal)}/mês</strong></p>
        </div>
        <div style="font-size:15px;font-weight:bold;color:#FFCC00;margin-bottom:12px;">📋 Evolução ${sufixo} a ${sufixo}</div>
        <table>
            <thead><tr>
                <th style="text-align:left;">${sufixo}</th>
                <th>Patrimônio</th><th>Juros Acum.</th><th>Aportado</th><th>Renda Mensal</th>
            </tr></thead>
            <tbody>${tRows}</tbody>
        </table>
        <script>window.onload=()=>window.print()<\/script>
        </html>`;

        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 15000);
    }

    // ── [S8-17] COMPARTILHAR SIMULAÇÃO POR URL ──────────────────────────────
    // Gera um link com os parâmetros principais; quem abrir vê a mesma simulação.
    function compartilharSimulacao(btn) {
        const p = new URLSearchParams();
        p.set('i', String(parseCurrencyValue(document.getElementById('inputInicial').value) || 0));
        p.set('m', String(parseCurrencyValue(document.getElementById('inputMensal').value) || 0));
        p.set('t', document.getElementById('inputTaxa').value || '0');
        p.set('tt', tipoTaxa === 'anual' ? 'a' : 'm');
        p.set('n', document.getElementById('inputAnos').value || '1');
        p.set('tp', tipoPeriodo === 'anual' ? 'a' : 'm');
        p.set('md', modoAtual === 'completo' ? 'c' : 's');
        const url = location.origin + location.pathname + '?' + p.toString();
        const feedbackOk = () => {
            if (!btn) return;
            if (!btn.dataset.orig) btn.dataset.orig = btn.innerHTML;
            btn.innerHTML = '✓ Link copiado!';
            setTimeout(() => { btn.innerHTML = btn.dataset.orig; }, 2200);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(feedbackOk)
                .catch(() => { window.prompt('Copie o link da simulação:', url); });
        } else {
            window.prompt('Copie o link da simulação:', url);
        }
    }

    // Aplica os parâmetros da URL (link compartilhado) por cima dos padrões.
    // Valores são validados; nada é aplicado se a URL não tiver parâmetros.
    function aplicarParamsURL() {
        const q = new URLSearchParams(location.search);
        if (!q.has('i') && !q.has('m') && !q.has('t') && !q.has('n')) return;
        const fmtBR = v => (parseFloat(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (q.get('md') === 'c') alternarModoExibicao('completo');
        if (q.get('tt') === 'm') document.getElementById('btnTaxaMensal')?.click();
        if (q.get('tp') === 'm') document.getElementById('btnPeriodoMeses')?.click();
        if (q.has('i')) document.getElementById('inputInicial').value = fmtBR(q.get('i'));
        if (q.has('m')) document.getElementById('inputMensal').value = fmtBR(q.get('m'));
        if (q.has('t')) {
            const t = parseFloat(String(q.get('t')).replace(',', '.'));
            if (isFinite(t) && t >= 0 && t <= 1000) document.getElementById('inputTaxa').value = String(t);
        }
        if (q.has('n')) {
            const n = parseInt(q.get('n'));
            if (isFinite(n) && n >= 1 && n <= 1200) document.getElementById('inputAnos').value = String(n);
        }
        executarPipelineCore();
    }

    function atualizarStatusLed() {
        const labelEl = document.getElementById('statusModoLabel');
        const funcoesEl = document.getElementById('statusFuncoesAtivas');
        const ledDot = document.getElementById('ledModoDot');
        if (!labelEl || !funcoesEl) return;

        const isSim = modoAtual === 'completo';

        labelEl.textContent = isSim ? 'Modo Ativo: Simulador' : 'Modo Ativo: Calculadora';

        // Cor do LED e label seguem o tema e o modo
        const _corDisplay = (() => {
            const tema = (typeof _temaAtual !== 'undefined') ? _temaAtual : (localStorage.getItem('mvTema') || 'dark');
            if (tema === 'cute')   return { hex:'#ff1493', glow:'rgba(255,20,147,0.8)' };
            if (tema === 'light')  return { hex:'#FF8C00', glow:'rgba(255,140,0,0.8)' };
            if (tema === 'pastel') return { hex:'#FF8C00', glow:'rgba(255,140,0,0.8)' };
            // dark (default)
            return { hex:'#22c55e', glow:'rgba(34,197,94,0.7)' };
        })();
        labelEl.style.color = _corDisplay.hex;
        if (ledDot) { ledDot.style.background = _corDisplay.hex; ledDot.style.boxShadow = `0 0 6px 1px ${_corDisplay.glow}`; }

        const funcoes = [];

        if (!isSim) {
            if (document.getElementById('chkIpcaCalc')?.checked) {
                const v = parseFloat(document.getElementById('inputIpcaCalcValor')?.value || '4.5').toFixed(1).replace('.',',');
                funcoes.push({ txt: `IPCA no aporte (${v}%)` });
            }
        } else {
            if (document.getElementById('chkVidaReal')?.checked) {
                funcoes.push({ txt: 'Vida Real ativado' });
            }
            if (document.getElementById('chkInflacaoAporte')?.checked) {
                const v = parseFloat(document.getElementById('inputInflacao')?.value || '4.5').toFixed(1).replace('.',',');
                funcoes.push({ txt: `IPCA no aporte (${v}%)` });
            }
            if (document.getElementById('chkAtivarAvancado')?.checked) {
                if (document.getElementById('chkAporteInteligente')?.checked) {
                    const anoAI = parseInt(document.getElementById('inputAnoInicioInteligente').value) || 0;
                    if (anoAI > 0) {
                        funcoes.push({ txt: `Aporte inteligente a partir do ano ${anoAI}` });
                    }
                    if (document.getElementById('chkUltimoAporte')?.checked) {
                        funcoes.push({ txt: '▲ Último Aporte Eficaz ativo' });
                    }
                }
                if (document.getElementById('chkRetirada')?.checked) {
                    const anoR = parseInt(document.getElementById('inputAnoInicioRetirada').value) || 0;
                    if (anoR > 0) {
                        // [2.3] deixa claro que os aportes param na fase de retirada
                        funcoes.push({ txt: `Retiradas a partir do ano ${anoR} · aportes suspensos na retirada` });
                    }
                }
            }
            if (temporalAtivo) {
                const anoT = document.getElementById('inputAnoFiltro').value;
                funcoes.push({ txt: `Inspeção temporal: ${tipoPeriodo === 'anual' ? 'Ano' : 'Mês'} ${anoT}` });
            }
            if (document.getElementById('chkLiberdade')?.checked) {
                const custo = document.getElementById('inputCustoVida')?.value;
                if (custo && parseCurrencyValue(custo) > 0) funcoes.push({ txt: `Liberdade: custo ${formatCurrency(parseCurrencyValue(custo))}/mês` });
            }
            if (document.getElementById('chkMeta')?.checked) {
                const meta = document.getElementById('inputMeta')?.value;
                if (meta && parseCurrencyValue(meta) > 0) funcoes.push({ txt: `Meta: ${formatCurrency(parseCurrencyValue(meta))}` });
            }
            if (cenariosAtivo && cenarios.length > 0) {
                funcoes.push({ txt: `${cenarios.length} cenário(s) comparativo(s)` });
            }
            if (retiradaUnicaList.filter(r => r.ano > 0).length > 0) {
                funcoes.push({ txt: `${retiradaUnicaList.filter(r=>r.ano>0).length} retirada(s) pontual(is)` });
            }
        }

        funcoesEl.innerHTML = funcoes.length > 0
            ? funcoes.map(f => `<span style="font-size:10px;color:${_corDisplay.hex};">· ${f.txt}</span>`).join('')
            : `<span style="font-size:10px;color:${_corDisplay.hex};opacity:0.5;">· Parâmetros padrão</span>`;
        setTimeout(() => { if (window._syncCardHeight) window._syncCardHeight(); if (window._atualizarSetasLed) window._atualizarSetasLed(); }, 50);
    }

    let retiradaUnicaList = [];

    function adicionarRetiradaUnica() {
        const id = Date.now();
        retiradaUnicaList.push({ id, ano: '', valor: '' });
        renderizarRetiradaUnica();
    }

    function removerRetiradaUnica(id) {
        retiradaUnicaList = retiradaUnicaList.filter(r => r.id !== id);
        renderizarRetiradaUnica();
        executarPipelineCore();
    }

    function renderizarRetiradaUnica() {
        const container = document.getElementById('listaRetiradaUnica');
        if (!container) return;
        container.innerHTML = '';
        retiradaUnicaList.forEach(r => {
            const row = document.createElement('div');
            row.className = 'flex items-center gap-1.5';
            row.innerHTML = `
                <div class="relative flex-1">
                    <span class="absolute left-2 top-1.5 text-gray-500 text-xs">${tipoPeriodo === 'anual' ? 'Ano' : 'Mês'}</span>
                    <input type="number" min="1" value="${r.ano}" placeholder="—"
                        class="input-field w-full rounded-lg pl-8 pr-2 py-1.5 font-bold text-right text-xs focus:outline-none"
                        style="color:${r.ano?'#fff':'#6b7280'};"
                        oninput="atualizarRetiradaUnica(${r.id},'ano',this.value);this.style.color=this.value?'#fff':'#6b7280';">
                </div>
                <div class="relative flex-1">
                    <span class="absolute left-2 top-1.5 text-gray-500 text-xs">R$</span>
                    <input type="text" value="${r.valor}" placeholder="0,00"
                        class="input-field w-full rounded-lg pl-6 pr-2 py-1.5 font-bold text-right text-xs focus:outline-none"
                        style="color:${r.valor?'#fff':'#6b7280'};"
                        oninput="atualizarRetiradaUnica(${r.id},'valorRaw',this.value);this.style.color=this.value?'#fff':'#6b7280';">
                </div>
                <button onclick="removerRetiradaUnica(${r.id})" class="text-gray-600 hover:text-red-400 transition text-xs" style="flex-shrink:0;">✕</button>
            `;
            container.appendChild(row);
        });
    }

    function atualizarRetiradaUnica(id, campo, valor) {
        const r = retiradaUnicaList.find(x => x.id === id);
        if (!r) return;
        if (campo === 'ano') r.ano = parseInt(valor) || 0;
        if (campo === 'valorRaw') r.valorRaw = valor;
        executarPipelineDebounced();
    }

    // ── Meta de Patrimônio (múltiplas) ─────────────────────────────────────
    function getMetaPoints(dataTotal, labels) {
        const chk = document.getElementById('chkMeta');
        if (!chk?.checked) return [];
        if (modoAtual !== 'completo') return [];
        const avancadoAtivo = document.getElementById('chkAtivarAvancado')?.checked;
        if (!avancadoAtivo) return [];
        const pts = [];
        metaList.forEach(m => {
            if (m.valor <= 0) return;
            for (let i = 1; i < dataTotal.length; i++) {
                if (dataTotal[i] >= m.valor) {
                    // Interpolate exact crossing fraction between index i-1 and i
                    const vPrev = dataTotal[i - 1];
                    const vCurr = dataTotal[i];
                    const frac = vCurr > vPrev ? (m.valor - vPrev) / (vCurr - vPrev) : 0;
                    const fracIdx = (i - 1) + frac;

                    // Humanized label: e.g. "5 anos e 2 meses"
                    let humanLabel;
                    if (tipoPeriodo === 'anual') {
                        const totalMesesFrac = fracIdx * 12;
                        const anos = Math.floor(totalMesesFrac / 12);
                        const meses = Math.round(totalMesesFrac % 12);
                        if (meses === 0) {
                            humanLabel = anos === 1 ? '1 ano' : (anos + ' anos');
                        } else if (anos === 0) {
                            humanLabel = meses === 1 ? '1 m\u00eas' : (meses + ' meses');
                        } else {
                            humanLabel = anos + ' ' + (anos===1?'ano':'anos') + ' e ' + meses + ' ' + (meses===1?'m\u00eas':'meses');
                        }
                    } else {
                        const totalMFrac = Math.round(fracIdx);
                        const anosM = Math.floor(totalMFrac / 12);
                        const mesesM = totalMFrac % 12;
                        if (anosM === 0) {
                            humanLabel = totalMFrac + ' ' + (totalMFrac===1?'m\u00eas':'meses');
                        } else if (mesesM === 0) {
                            humanLabel = anosM + ' ' + (anosM===1?'ano':'anos');
                        } else {
                            humanLabel = anosM + ' ' + (anosM===1?'ano':'anos') + ' e ' + mesesM + ' ' + (mesesM===1?'m\u00eas':'meses');
                        }
                    }

                    pts.push({ idx: i, fracIdx, frac, label: labels[i], humanLabel, valor: m.valor, nome: m.nome, id: m.id });
                    break;
                }
            }
        });
        return pts;
    }

    // Legado: getMetaPoint retorna o primeiro ponto para compatibilidade
    function getMetaPoint(dataTotal, labels) {
        const pts = getMetaPoints(dataTotal, labels);
        return pts.length > 0 ? pts[0] : null;
    }

    // Renderiza a lista de metas na sidebar
    function renderizarListaMetas() {
        const container = document.getElementById('listaMetas');
        if (!container) return;
        container.innerHTML = '';
        if (metaList.length === 0) {
            // Adiciona uma meta vazia por padrão se a lista estiver vazia
            adicionarMetaSilenciosa();
            return;
        }
        metaList.forEach((m, idx) => {
            const row = document.createElement('div');
            row.className = 'flex flex-col gap-1';
            row.innerHTML = `
                <div class="flex items-center gap-1 mb-0.5">
                    <span class="w-2 h-2 rounded" style="background:#a78bfa;transform:rotate(45deg);display:inline-block;flex-shrink:0;"></span>
                    <input type="text" value="${m.nome}" placeholder="Nome da meta (opcional)"
                        class="input-field flex-1 rounded-lg px-2 py-0.5 text-[10px] focus:outline-none"
                        style="color:${m.nome?'#d1d5db':'#6b7280'};"
                        oninput="atualizarMeta(${m.id},'nome',this.value);this.style.color=this.value?'#d1d5db':'#6b7280'">
                    <button onclick="removerMeta(${m.id})" class="text-gray-600 hover:text-red-400 transition text-xs flex-shrink-0" style="display:${metaList.length>1?'block':'none'};">✕</button>
                </div>
                <div class="relative">
                    <span class="absolute left-3 top-2 text-gray-500 text-sm">R$</span>
                    <input type="text" id="inputMetaItem_${m.id}" value="${m.rawVal||''}" placeholder="0,00"
                        class="input-field w-full rounded-xl pl-9 pr-3 py-2 font-bold text-right focus:outline-none"
                        style="color:${(m.rawVal && parseCurrencyValue(m.rawVal) > 0) ? '#ffffff' : '#6b7280'};">
                </div>
                <div id="metaStatus_${m.id}" class="text-[9px] text-gray-500 hidden leading-4"></div>
            `;
            container.appendChild(row);
            // Setup currency mask on the new input — pass onChange to keep rawVal in sync
            setupCurrencyMask('inputMetaItem_' + m.id, function(displayVal, reais) {
                m.rawVal = displayVal;
                m.valor = reais;
                const el = document.getElementById('inputMetaItem_' + m.id);
                if (el) el.style.color = reais > 0 ? '#ffffff' : '#6b7280';
            });
        });
    }

    function adicionarMetaSilenciosa() {
        const id = Date.now();
        metaList.push({ id, valor: 0, rawVal: '', nome: '' });
        renderizarListaMetas();
    }

    function adicionarMeta() {
        if (metaList.length >= 5) return; // max 5 metas
        const id = Date.now();
        metaList.push({ id, valor: 0, rawVal: '', nome: '' });
        renderizarListaMetas();
        executarPipelineCore();
    }

    function removerMeta(id) {
        metaList = metaList.filter(m => m.id !== id);
        if (metaList.length === 0) adicionarMetaSilenciosa();
        else renderizarListaMetas();
        executarPipelineCore();
    }

    function atualizarMeta(id, campo, valor) {
        const m = metaList.find(x => x.id === id);
        if (!m) return;
        if (campo === 'valor') {
            m.rawVal = valor;
            m.valor = parseCurrencyValue(valor);
        }
        if (campo === 'nome') m.nome = valor;
        executarPipelineDebounced();
    }

    // ── Cenários ────────────────────────────────────────────────────────────

    function toggleCenarios(checked) {
        cenariosAtivo = checked;
        const btnSalvar = document.getElementById('btnSalvarCenario');
        const box = document.getElementById('boxCenarios');
        const icon = document.getElementById('toggleIconCenarios');
        const cardsNormais = document.getElementById('cardsGrid');
        const cardsCenarios = document.getElementById('cardsGridCenarios');

        if (checked) {
            box?.classList.remove('hidden');
            if (icon) icon.classList.add('open');
            // Mostra botão salvar apenas se < 5 cenários
            if (btnSalvar) btnSalvar.classList.toggle('hidden', cenarios.length >= 5);
            // Só mostra grid de cenários se já houver cenários salvos
            if (cenarios.length > 0) {
                cardsNormais?.classList.add('hidden');
                cardsCenarios?.classList.remove('hidden');
            }
            // Gráfico continua normal até o primeiro save
        } else {
            if (btnSalvar) btnSalvar.classList.add('hidden');
            box?.classList.add('hidden');
            if (icon) icon.classList.remove('open');
            // Restaura cards normais
            cardsNormais?.classList.remove('hidden');
            cardsCenarios?.classList.add('hidden');
            cenarioCounter = 0;
            cenarios = [];
            cenarioBaseSnapshot = null;
            selectedCenarioId = null;
            renderListaCenarios();
        }
        executarPipelineCore();
    }

    function toggleHeaderCenarios(e) {
        const box = document.getElementById('boxCenarios');
        const icon = document.getElementById('toggleIconCenarios');
        const isHidden = box?.classList.contains('hidden');
        box?.classList.toggle('hidden', !isHidden);
        if (icon) isHidden ? icon.classList.add('open') : icon.classList.remove('open');
        // Se abrindo e cenários não está ativo, ativa agora
        if (isHidden && !cenariosAtivo) {
            const chk = document.getElementById('chkCenarios');
            if (chk) { chk.checked = true; toggleCenarios(true); }
        }
    }

    function salvarCenario() {
        if (!baseDadosCalculados || !baseDadosCalculados.anos) return;
        if (cenarios.length >= 5) return;

        const allLabels = Object.keys(baseDadosCalculados.anos).map(String);
        const allTotal  = allLabels.map(l => Math.round(baseDadosCalculados.anos[parseInt(l)]?.total || 0));

        const aporte = parseCurrencyValue(document.getElementById('inputMensal').value);
        const taxa   = parseFloat(document.getElementById('inputTaxa').value) || 0;
        const anos   = parseInt(document.getElementById('inputAnos').value) || 0;
        const sublabel = `${formatCurrency(aporte)}/mês · ${taxa}% · ${anos}a`;

        const isFirst = cenarios.length === 0;
        cenarioCounter++;

        // Primeiro save = "Teu Cenário" (âncora verde), demais = Cenário 2, 3...
        const label = isFirst ? 'Teu Cenário' : `Cenário ${cenarioCounter}`;
        const color = isFirst ? '#32CD32' : CENARIO_COLORS[(cenarioCounter - 2) % CENARIO_COLORS.length];

        const newCenario = {
            id: Date.now(),
            label,
            sublabel,
            color,
            isBase: isFirst,
            labels: allLabels,
            dataTotal: allTotal
        };

        if (isFirst) {
            cenarioBaseSnapshot = { aporte, taxa, anos, total: allTotal[allTotal.length - 1] };
            // Agora que há cenários: oculta cards normais, mostra grid de cenários
            document.getElementById('cardsGrid')?.classList.add('hidden');
            document.getElementById('cardsGridCenarios')?.classList.remove('hidden');
        }

        cenarios.push(newCenario);

        const btnSalvar = document.getElementById('btnSalvarCenario');
        if (btnSalvar) btnSalvar.classList.toggle('hidden', cenarios.length >= 5);

        renderListaCenarios();
        renderizarCenarioCards();
        executarPipelineCore();
    }

    function removerCenario(id) {
        const removido = cenarios.find(c => c.id === id);
        cenarios = cenarios.filter(c => c.id !== id);

        // Se removeu "Teu Cenário" (base), limpa tudo
        if (removido?.isBase) {
            cenarios = [];
            cenarioCounter = 0;
            cenarioBaseSnapshot = null;
            selectedCenarioId = null;
            document.getElementById('cardsGrid')?.classList.remove('hidden');
            document.getElementById('cardsGridCenarios')?.classList.add('hidden');
            const btnSalvar = document.getElementById('btnSalvarCenario');
            if (btnSalvar && cenariosAtivo) btnSalvar.classList.remove('hidden');
            renderListaCenarios();
            executarPipelineCore();
            return;
        }

        // Se não há mais cenários (exceto base já removida), volta para cards normais
        if (cenarios.length === 0) {
            document.getElementById('cardsGrid')?.classList.remove('hidden');
            document.getElementById('cardsGridCenarios')?.classList.add('hidden');
        }

        const btnSalvar = document.getElementById('btnSalvarCenario');
        if (btnSalvar && cenariosAtivo) btnSalvar.classList.toggle('hidden', cenarios.length >= 5);
        renderListaCenarios();
        renderizarCenarioCards();
        executarPipelineCore();
    }

    function renderListaCenarios() {
        const lista = document.getElementById('listaCenarios');
        if (!lista) return;
        lista.innerHTML = '';
        if (cenarios.length === 0) {
            lista.innerHTML = '<p class="text-[9px] text-gray-600">Nenhum cenário salvo.</p>';
            return;
        }
        cenarios.forEach(c => {
            const isSelected = selectedCenarioId === c.id;
            const row = document.createElement('div');
            row.className = 'flex flex-col gap-1';

            // Row principal
            const mainRow = document.createElement('div');
            mainRow.className = 'flex items-center gap-2 cursor-pointer rounded-lg px-1 py-0.5 transition';
            mainRow.style.background = isSelected ? `${c.color}18` : 'transparent';
            mainRow.title = isSelected ? 'Clique para desselecionar' : 'Clique para selecionar e editar este cenário';

            mainRow.innerHTML = `
                <span class="flex-shrink-0 cursor-pointer cenario-select-dot" data-id="${c.id}"
                    style="width:12px;height:12px;border-radius:50%;border:2.5px solid ${c.color};background:${isSelected ? c.color : '#0f0f12'};box-shadow:0 0 6px ${c.color}${isSelected ? 'cc' : '44'};transition:all 0.15s;flex-shrink:0;">
                </span>
                <span class="text-[10px] flex-1 truncate font-${isSelected ? 'bold' : 'normal'}" style="color:${isSelected ? c.color : '#d1d5db'};" title="${c.sublabel || c.label}">${c.label}</span>
                ${isSelected ? `<span class="text-[9px] text-gray-500 italic truncate max-w-[80px]">${c.sublabel || ''}</span>` : ''}
                <button onclick="event.stopPropagation();removerCenario(${c.id})" class="text-gray-600 hover:text-red-400 transition text-xs flex-shrink-0" title="Remover">✕</button>
            `;
            mainRow.addEventListener('click', () => selecionarCenario(c.id));

            row.appendChild(mainRow);

            // Painel de edição inline quando selecionado
            if (isSelected) {
                const editPanel = document.createElement('div');
                editPanel.className = 'ml-4 pl-2 flex flex-col gap-1.5 pb-1';
                editPanel.style.borderLeft = `2px solid ${c.color}66`;
                editPanel.innerHTML = `
                    <p class="text-[9px] text-gray-500 leading-tight">Altere os parâmetros e clique em <strong style="color:${c.color};">Atualizar</strong> para modificar este cenário.</p>
                    <button onclick="atualizarCenarioSelecionado(${c.id})"
                        class="self-start flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition"
                        style="color:${c.color};border:1px solid ${c.color}44;background:${c.color}12;">
                        ↺ Atualizar cenário
                    </button>
                `;
                row.appendChild(editPanel);
            }

            lista.appendChild(row);
        });

        // Nota de limite
        const notaEl = document.createElement('p');
        notaEl.className = 'text-[9px] text-gray-600 mt-0.5';
        notaEl.textContent = cenarios.length >= 5
            ? 'Limite de 5 cenários atingido. Exclua um para salvar novo.'
            : `Salva o estado atual. Máx. 5 cenários (${cenarios.length}/5).`;
        lista.appendChild(notaEl);
    }

    function selecionarCenario(id) {
        selectedCenarioId = (selectedCenarioId === id) ? null : id;
        renderListaCenarios();
    }

    function atualizarCenarioSelecionado(id) {
        if (!baseDadosCalculados || !baseDadosCalculados.anos) return;
        const c = cenarios.find(x => x.id === id);
        if (!c) return;

        const allLabels = Object.keys(baseDadosCalculados.anos).map(String);
        const allTotal  = allLabels.map(l => Math.round(baseDadosCalculados.anos[parseInt(l)]?.total || 0));
        const aporte = parseCurrencyValue(document.getElementById('inputMensal').value);
        const taxa   = parseFloat(document.getElementById('inputTaxa').value) || 0;
        const anos   = parseInt(document.getElementById('inputAnos').value) || 0;

        c.sublabel  = `${formatCurrency(aporte)}/mês · ${taxa}% · ${anos}a`;
        c.labels    = allLabels;
        c.dataTotal = allTotal;

        renderListaCenarios();
        renderizarCenarioCards();
        executarPipelineCore();
    }

    // Renderiza os cards de cenários (Cenário Atual + cenários salvos)
    function renderizarCenarioCards() {
        if (!cenariosAtivo) return;
        const container = document.getElementById('cenarioCardsContainer');
        if (!container) return;

        // Limpa tudo e reconstrói dinamicamente
        container.innerHTML = '';

        const baseCenario = cenarios.find(c => c.isBase);
        const baseTotal = baseCenario ? (baseCenario.dataTotal[baseCenario.dataTotal.length - 1] || 0) : 0;
        const finalTotal = baseDadosCalculados?.final?.total || 0; // valor atual da simulação (linha verde viva)

        cenarios.forEach(c => {
            const totalCenario = c.dataTotal[c.dataTotal.length - 1] || 0;

            const card = document.createElement('div');
            card.dataset.cenarioId = c.id;
            card.className = 'dark-card p-4 rounded-2xl shadow-md border-t-4 transition transform hover:scale-[1.02]';
            card.style.borderColor = c.color;

            let diffHtml = '';
            if (!c.isBase && baseCenario) {
                const diff = totalCenario - baseTotal;
                const diffSign = diff >= 0 ? '+' : '';
                const diffColor = diff >= 0 ? '#32CD32' : '#ef4444';
                diffHtml = `<p class="text-[10px] mt-1" style="color:${diffColor};">${diffSign}${formatCurrency(Math.abs(diff))} vs Teu Cenário</p>`;
            } else if (c.isBase) {
                // Mostra diferença entre estado atual e Teu Cenário
                const diff = finalTotal - totalCenario;
                const diffSign = diff >= 0 ? '+' : '';
                const diffColor = diff >= 0 ? '#32CD32' : '#ef4444';
                const diffLabel = diff !== 0 ? `<p class="text-[10px] mt-0.5" style="color:${diffColor};">${diffSign}${formatCurrency(Math.abs(diff))} vs atual</p>` : '';
                diffHtml = diffLabel;
            }

            card.innerHTML = `
                <div class="flex items-center gap-1.5 mb-1">
                    <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${c.color};box-shadow:0 0 5px ${c.color}88;"></span>
                    <p class="text-[10px] font-bold uppercase tracking-wider truncate" style="color:${c.color};" title="${c.label}">${c.label}</p>
                    ${!c.isBase ? `<button onclick="removerCenario(${c.id})" class="ml-auto text-gray-600 hover:text-red-400 transition text-[9px] flex-shrink-0" title="Remover">✕</button>` : `<button onclick="removerCenario(${c.id})" class="ml-auto text-gray-600 hover:text-red-400 transition text-[9px] flex-shrink-0" title="Remover base">✕</button>`}
                </div>
                <p class="text-[9px] text-gray-500 truncate mb-1">${c.sublabel || ''}</p>
                <p class="text-lg font-black text-white mt-1">${formatCurrency(totalCenario)}</p>
                ${diffHtml}
            `;
            container.appendChild(card);
        });
    }

    // ── Modo Reverso ────────────────────────────────────────────────────────
    function toggleModoReverso() {
        const chk = document.getElementById('chkModoReverso');
        const box = document.getElementById('boxModoReverso');
        if (chk?.checked) {
            box?.classList.remove('hidden');
            calcularModoReverso();
        } else {
            box?.classList.add('hidden');
            document.getElementById('reversoResultado')?.classList.add('hidden');
        }
    }

    function toggleBoxMeta(checked) {
        const box = document.getElementById('boxMeta');
        const icon = document.getElementById('toggleIconMeta');
        if (checked) {
            box?.classList.remove('hidden');
            if (icon) icon.classList.add('open');
            // Inicializa a lista se vazia
            if (metaList.length === 0) adicionarMetaSilenciosa();
            else renderizarListaMetas();
        }
        executarPipelineCore();
    }

    function aplicarAporteReverso() {
        const valEl = document.getElementById('reversoValor');
        if (!valEl) return;
        const raw = valEl.textContent.replace('R$','').trim();
        const valor = parseCurrencyValue(raw);
        if (valor <= 0) return;

        // Format and apply to inputMensal
        const inputMensal = document.getElementById('inputMensal');
        if (!inputMensal) return;
        const formatted = valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        inputMensal.value = formatted;
        inputMensal.style.color = '#ffffff';
        inputMensal.dispatchEvent(new Event('input'));

        // Brief visual feedback on the button
        const btn = document.getElementById('btnAplicarReverso');
        if (btn) {
            btn.textContent = '✓ aplicado';
            btn.style.color = '#32CD32';
            btn.style.borderColor = 'rgba(50,205,50,0.5)';
            setTimeout(() => {
                btn.textContent = '↑ aplicar';
                btn.style.color = '';
                btn.style.borderColor = '';
            }, 1800);
        }
    }

    function calcularModoReverso() {
        if (!document.getElementById('chkModoReverso')?.checked) return;
        const patrimonioAlvo = parseCurrencyValue(document.getElementById('inputPatrimonioAlvo')?.value);
        const vInicial = parseCurrencyValue(document.getElementById('inputInicial').value);
        const taxaInput = (parseFloat(document.getElementById('inputTaxa').value) || 0) / 100;
        const tempoInput = parseInt(document.getElementById('inputAnos').value) || 1;

        const resEl = document.getElementById('reversoResultado');
        const valEl = document.getElementById('reversoValor');
        const detEl = document.getElementById('reversoDetalhe');

        if (patrimonioAlvo <= 0 || taxaInput <= 0 || tempoInput <= 0) {
            resEl?.classList.add('hidden');
            return;
        }

        const taxaMensal = tipoTaxa === 'anual'
            ? Math.pow(1 + taxaInput, 1/12) - 1
            : taxaInput;
        const totalMeses = tipoPeriodo === 'anual' ? tempoInput * 12 : tempoInput;

        // Convenção do site: mês 1 SEM aporte (o 1º aporte já está no valor inicial).
        // [2.7] Se "IPCA no aporte" estiver ativo, o aporte cresce a cada virada de
        // ano — não existe fórmula fechada simples, então resolvemos por busca
        // binária usando EXATAMENTE o mesmo cronograma do pipeline.
        const inflacaoAtiva = modoAtual === 'completo'
            ? (document.getElementById('chkInflacaoAporte')?.checked || false)
            : (document.getElementById('chkIpcaCalc')?.checked || false);
        const taxaInfl = modoAtual === 'completo'
            ? ((parseFloat(document.getElementById('inputInflacao')?.value) || 4.5) / 100)
            : ((parseFloat(document.getElementById('inputIpcaCalcValor')?.value) || 4.5) / 100);

        let aportNecessario, totalAportadoCalc, sufixoIpca = '';
        if (inflacaoAtiva && taxaInfl > 0) {
            const fvIpca = (pmt) => {
                let s = vInicial, ap = pmt, anoAnt = 0;
                for (let m = 1; m <= totalMeses; m++) {
                    const ano = Math.ceil(m / 12);
                    if (ano > anoAnt) { if (anoAnt > 0) ap *= (1 + taxaInfl); anoAnt = ano; }
                    s = s * (1 + taxaMensal) + (m === 1 ? 0 : ap);
                }
                return s;
            };
            const somaIpca = (pmt) => {
                let t = 0, ap = pmt, anoAnt = 0;
                for (let m = 1; m <= totalMeses; m++) {
                    const ano = Math.ceil(m / 12);
                    if (ano > anoAnt) { if (anoAnt > 0) ap *= (1 + taxaInfl); anoAnt = ano; }
                    if (m > 1) t += ap;
                }
                return t;
            };
            if (fvIpca(0) >= patrimonioAlvo) {
                aportNecessario = 0;
            } else {
                let lo = 0, hi = 1;
                while (fvIpca(hi) < patrimonioAlvo && hi < 1e9) hi *= 2;
                for (let k = 0; k < 80; k++) { const mid = (lo + hi) / 2; if (fvIpca(mid) < patrimonioAlvo) lo = mid; else hi = mid; }
                aportNecessario = hi;
            }
            totalAportadoCalc = vInicial + somaIpca(Math.ceil(aportNecessario));
            sufixoIpca = ` · 1º aporte (cresce ${(taxaInfl*100).toFixed(1).replace('.',',')}%/ano com o IPCA)`;
        } else {
            // Sem IPCA: fórmula fechada com (n-1) aportes, do mês 2 ao mês n:
            // PMT = (FV - PV*(1+r)^n) / [((1+r)^(n-1) - 1)/r]
            const fatorComp = Math.pow(1 + taxaMensal, totalMeses);
            const fvSemAporte = vInicial * fatorComp;
            const fatorAnuidade = (Math.pow(1 + taxaMensal, totalMeses - 1) - 1) / taxaMensal;
            if (fatorAnuidade <= 0) { resEl?.classList.add('hidden'); return; }
            aportNecessario = (patrimonioAlvo - fvSemAporte) / fatorAnuidade;
            totalAportadoCalc = vInicial + Math.ceil(Math.max(0, aportNecessario)) * (totalMeses - 1);
        }

        if (aportNecessario <= 0) {
            valEl.textContent = 'R$ 0,00';
            detEl.textContent = 'Seu capital inicial já ultrapassa a meta com os juros!';
        } else {
            valEl.textContent = formatCurrency(Math.ceil(aportNecessario));
            const jurosGerados = patrimonioAlvo - totalAportadoCalc;
            detEl.textContent = `Total aportado: ${formatCurrency(totalAportadoCalc)} · Juros gerados: ${formatCurrency(Math.max(0, jurosGerados))}${sufixoIpca}`;
        }
        resEl?.classList.remove('hidden');
    }

    function getLiberdadeAno(dataRenda, labels) {
        const libActive = document.getElementById('chkLiberdade')?.checked;
        const avancadoAtivo = document.getElementById('chkAtivarAvancado')?.checked;
        const custoRaw = document.getElementById('inputCustoVida')?.value;
        if (!libActive || !custoRaw) return null;
        if (modoAtual !== 'completo' || !avancadoAtivo) return null;
        const custo = parseCurrencyValue(custoRaw);
        if (custo <= 0) return null;
        for (let i = 0; i < dataRenda.length; i++) {
            const rendaMensal = tipoPeriodo === 'anual' ? dataRenda[i] / 12 : dataRenda[i];
            if (rendaMensal >= custo) {
                // Interpolate fraction between i-1 and i
                let fracIdx = i;
                if (i > 0) {
                    const rendaPrevMensal = tipoPeriodo === 'anual' ? dataRenda[i-1] / 12 : dataRenda[i-1];
                    const rendaCurrMensal = rendaMensal;
                    const frac = rendaCurrMensal > rendaPrevMensal ? (custo - rendaPrevMensal) / (rendaCurrMensal - rendaPrevMensal) : 0;
                    fracIdx = (i - 1) + frac;
                }
                // Build humanLabel
                let humanLabel;
                if (tipoPeriodo === 'anual') {
                    const totalMesesFrac = fracIdx * 12;
                    const anos = Math.floor(totalMesesFrac / 12);
                    const meses = Math.round(totalMesesFrac % 12);
                    if (meses === 0) humanLabel = anos === 1 ? '1 ano' : (anos + ' anos');
                    else if (anos === 0) humanLabel = meses === 1 ? '1 mês' : (meses + ' meses');
                    else humanLabel = anos + ' ' + (anos===1?'ano':'anos') + ' e ' + meses + ' ' + (meses===1?'mês':'meses');
                } else {
                    const totalMFrac = Math.round(fracIdx);
                    const anosM = Math.floor(totalMFrac / 12);
                    const mesesM = totalMFrac % 12;
                    if (anosM === 0) humanLabel = totalMFrac + ' ' + (totalMFrac===1?'mês':'meses');
                    else if (mesesM === 0) humanLabel = anosM + ' ' + (anosM===1?'ano':'anos');
                    else humanLabel = anosM + ' ' + (anosM===1?'ano':'anos') + ' e ' + mesesM + ' ' + (mesesM===1?'mês':'meses');
                }
                return { idx: i, fracIdx, label: labels[i], humanLabel };
            }
        }
        return null;
    }

    function getUltimoAporteEficazPoint(dataJuros, dataInvestido, labels) {
        const chk = document.getElementById('chkUltimoAporte');
        if (!chk?.checked) return null;
        if (modoAtual !== 'completo') return null;
        const avancadoAtivo = document.getElementById('chkAtivarAvancado')?.checked;
        if (!avancadoAtivo) return null;
        for (let i = 1; i < dataJuros.length; i++) {
            if (dataJuros[i] >= dataInvestido[i] && dataInvestido[i] > 0) {
                // Interpolate crossing fraction
                const jPrev = dataJuros[i-1], jCurr = dataJuros[i];
                const iPrev = dataInvestido[i-1], iCurr = dataInvestido[i];
                let frac = 0;
                const denom = (jCurr - jPrev) - (iCurr - iPrev);
                if (denom !== 0) frac = Math.max(0, Math.min(1, (iPrev - jPrev) / denom));
                const fracIdx = (i - 1) + frac;
                let humanLabel;
                if (tipoPeriodo === 'anual') {
                    const totalMesesFrac = fracIdx * 12;
                    const anos = Math.floor(totalMesesFrac / 12);
                    const meses = Math.round(totalMesesFrac % 12);
                    if (meses === 0) humanLabel = anos === 1 ? '1 ano' : (anos + ' anos');
                    else if (anos === 0) humanLabel = meses === 1 ? '1 mês' : (meses + ' meses');
                    else humanLabel = anos + ' ' + (anos===1?'ano':'anos') + ' e ' + meses + ' ' + (meses===1?'mês':'meses');
                } else {
                    const totalMFrac = Math.round(fracIdx);
                    const anosM = Math.floor(totalMFrac / 12);
                    const mesesM = totalMFrac % 12;
                    if (anosM === 0) humanLabel = totalMFrac + ' ' + (totalMFrac===1?'mês':'meses');
                    else if (mesesM === 0) humanLabel = anosM + ' ' + (anosM===1?'ano':'anos');
                    else humanLabel = anosM + ' ' + (anosM===1?'ano':'anos') + ' e ' + mesesM + ' ' + (mesesM===1?'mês':'meses');
                }
                return { idx: i, fracIdx, label: labels[i], humanLabel };
            }
        }
        return null;
    }

    //  EASTER EGG — v1.0 badge (hover tooltip + 3x click modal)
    let _easterClickCount = 0;
    let _easterClickTimer = null;
    let _doidoMode = false;
    const EASTER_KEY = 'doido123'; // chave secreta

    function initEasterEgg() {
        const badge = document.getElementById('versionBadge');
        const tooltip = document.getElementById('easterEggTooltip');
        if (!badge || !tooltip) return;

        // Hover: mostrar tooltip com versão + data
        badge.addEventListener('mouseenter', function(e) {
            if (_doidoMode) return;
            tooltip.classList.add('visible');
            positionTooltip(e);
        });
        badge.addEventListener('mousemove', positionTooltip);
        badge.addEventListener('mouseleave', function() {
            tooltip.classList.remove('visible');
        });

        function positionTooltip(e) {
            tooltip.style.left = (e.clientX + 14) + 'px';
            tooltip.style.top = (e.clientY - 32) + 'px';
        }

        // 3x click: abrir modal ou desativar modo doido (apenas no simulador)
        badge.addEventListener('click', function() {
            if (modoAtual !== 'completo') return; // easter egg só no simulador
            // ignorar cliques enquanto o modal está aberto
            const modal = document.getElementById('easterEggModal');
            if (modal?.classList.contains('visible')) return;
            _easterClickCount++;
            clearTimeout(_easterClickTimer);
            if (_easterClickCount >= 3) {
                _easterClickCount = 0;
                if (_doidoMode) {
                    desativarModoDoido();
                } else {
                    abrirEasterModal();
                }
            } else {
                _easterClickTimer = setTimeout(() => { _easterClickCount = 0; }, 800);
            }
        });
    }

    function abrirEasterModal() {
        const modal = document.getElementById('easterEggModal');
        if (!modal) return;
        // zerar contador e timer ao abrir — evita 4º clique fechar
        _easterClickCount = 0;
        clearTimeout(_easterClickTimer);
        modal.classList.add('visible');
        setTimeout(() => document.getElementById('easterKeyInput')?.focus(), 200);
        document.getElementById('easterMsg').textContent = '';
    }

    function fecharEasterModal() {
        document.getElementById('easterEggModal')?.classList.remove('visible');
    }

    function tentarChave() {
        const input = document.getElementById('easterKeyInput');
        const msg = document.getElementById('easterMsg');
        if (!input) return;
        const val = input.value.trim().toLowerCase();
        if (val === EASTER_KEY) {
            input.classList.add('success');
            msg.style.color = '#34d399';
            msg.textContent = '✅ Modo v1.doido desbloqueado!';
            setTimeout(() => {
                fecharEasterModal();
                ativarModoDoido();
            }, 1200);
        } else {
            input.classList.add('error');
            msg.style.color = '#ef4444';
            msg.textContent = '❌ Chave inválida. Tente novamente...';
        }
    }

    function ativarModoDoido() {
        _doidoMode = true;
        const badge = document.getElementById('versionBadge');
        if (badge) {
            badge.textContent = 'v1.doido';
            badge.classList.add('doido-mode');
            badge.title = '🌀 Modo Maluco ativado!';
        }
        // Mostrar painel Funções Malucas
        const panel = document.getElementById('funcoesMalucasPanel');
        if (panel) {
            panel.classList.remove('hidden');
            panel.style.animation = 'modalIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275)';
        }
        // Garantir estado visual correto: todas desativadas ao abrir
        const chkTodas = document.getElementById('chkTodasFuncoes');
        if (chkTodas) chkTodas.checked = false;
        ['CisneNegro','MonteCarlo','Atraso','Termometro','Sabatico','BolaDeNeve'].forEach(n => {
            setFnLabel(n, false);
            document.getElementById('box' + n)?.classList.add('hidden');
            const icon = document.getElementById('toggleIcon' + n);
            if (icon) icon.classList.remove('open');
        });
        // Mini toast
        mostrarToastDoido('🌀 Funções Malucas desbloqueadas! Modo v1.doido ativado!');
    }

    function desativarModoDoido() {
        _doidoMode = false;
        const badge = document.getElementById('versionBadge');
        if (badge) {
            badge.textContent = 'v1.0 beta';
            badge.classList.remove('doido-mode');
            badge.title = '';
        }
        // Ocultar painel Funções Malucas e desativar todas as funções
        const panel = document.getElementById('funcoesMalucasPanel');
        if (panel) panel.classList.add('hidden');

        // Desativar todas as funções malucas ativas
        cisneNegroAtivo = false;
        monteCarloAtivo = false;
        atrasoAtivo = false;
        termometroAtivo = false;
        sabaticoAtivo = false;
        bolaDeNeveAtivo = false;

        const checkboxes = ['chkCisneNegro','chkMonteCarlo','chkAtraso','chkTermometro','chkSabatico','chkBolaDeNeve'];
        checkboxes.forEach(id => { const el = document.getElementById(id); if (el) el.checked = false; });

        mostrarToastDoido('🔒 Modo v1.doido desativado');
        executarPipelineCore();
    }

    function mostrarToastDoido(msg) {
        let toast = document.getElementById('toastDoido');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toastDoido';
            toast.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9998;background:#1a0a2e;border:1px solid rgba(168,85,247,0.6);border-radius:12px;padding:10px 16px;font-size:12px;font-weight:700;color:#c084fc;box-shadow:0 4px 24px rgba(139,92,246,0.4);transition:opacity 0.4s,transform 0.4s;pointer-events:none;';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
        setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(8px)'; }, 3500);
    }

    //  FUNÇÕES MALUCAS — toggle helpers
    function toggleFuncaoMaluca(nome) {
        const box = document.getElementById('box' + nome);
        const icon = document.getElementById('toggleIcon' + nome);
        const isHidden = box?.classList.contains('hidden');
        box?.classList.toggle('hidden', !isHidden);
        if (icon) isHidden ? icon.classList.add('open') : icon.classList.remove('open');
    }

    // ── 1. CISNE NEGRO ──────────────────────────────────────
    let cisneNegroAtivo = false;
    let _monteCarloSeeds = null;
    let _cisneAnoSorteado = 10;
    let _cisneIntensidadeSorteada = 30;

    function sortearCisne() {
        const totalAnos = parseInt(document.getElementById('inputAnos')?.value) || 12;
        // Ano: entre 20% e 70% do período
        _cisneAnoSorteado = Math.round(totalAnos * (0.2 + Math.random() * 0.5));
        _cisneAnoSorteado = Math.max(1, _cisneAnoSorteado);
        // Intensidade: entre 20% e 65%
        const intensidades = [20, 25, 30, 35, 40, 45, 50, 55, 60, 65];
        _cisneIntensidadeSorteada = intensidades[Math.floor(Math.random() * intensidades.length)];

        const nomes = {20:'Correção', 25:'Recessão leve', 30:'Crash 2008', 35:'Crise severa', 40:'Colapso moderado', 45:'Crash extremo', 50:'Grande Depressão', 55:'Colapso sistêmico', 60:'Catástrofe financeira', 65:'Apocalipse do mercado'};
        const nome = nomes[_cisneIntensidadeSorteada] || 'Crise';
        const infoEl = document.getElementById('cisneInfoTxt');
        const info = document.getElementById('cisneInfoInline') || document.getElementById('cisneInfo');
        if (infoEl) infoEl.innerHTML = 'Ano <strong style="color:#ef4444">' + _cisneAnoSorteado + '</strong> · Queda <strong style="color:#ef4444">' + _cisneIntensidadeSorteada + '%</strong> <span style="color:#6b7280">(' + nome + ')</span>';
        if (info) { info.classList.remove('hidden'); info.style.display = 'flex'; }
        executarPipelineCore();
    }

    function toggleCisneAleatorio() {
        const isAleatorio = document.getElementById('chkCisneAleatorio')?.checked;
        const manuais = document.getElementById('cisneManuais');
        const info = document.getElementById('cisneInfo');
        if (isAleatorio) {
            manuais?.classList.add('hidden');
            info?.classList.remove('hidden');
            sortearCisne();
        } else {
            manuais?.classList.remove('hidden');
            info?.classList.add('hidden');
            executarPipelineCore();
        }
    }

    function toggleCisneNegroCheck() {
        const chk = document.getElementById('chkCisneNegro');
        cisneNegroAtivo = chk?.checked || false;
        if (typeof setFnLabel === 'function') setFnLabel('CisneNegro', cisneNegroAtivo);
        const box = document.getElementById('boxCisneNegro');
        const icon = document.getElementById('toggleIconCisneNegro');
        if (cisneNegroAtivo) {
            box?.classList.remove('hidden');
            if (icon) icon.classList.add('open');
            const isAleatorio = document.getElementById('chkCisneAleatorio')?.checked ?? true;
            if (isAleatorio) sortearCisne();
            else executarPipelineCore();
        } else {
            box?.classList.add('hidden');
            if (icon) icon.classList.remove('open');
            const el = document.getElementById('cisneResultadoBox');
            if (el) { el.classList.add('hidden'); el.style.display = ''; }
            executarPipelineCore();
        }
    }

    // Aplicar o efeito cisne negro sobre dados de patrimônio calculados
    function aplicarCisneNegro(dataTotal, labels) {
        if (!cisneNegroAtivo) return dataTotal;
        const isAleatorio = document.getElementById('chkCisneAleatorio')?.checked ?? true;
        const anoColapso = isAleatorio
            ? _cisneAnoSorteado
            : (parseInt(document.getElementById('inputCisneAno')?.value) || 10);
        const queda = isAleatorio
            ? _cisneIntensidadeSorteada / 100
            : (parseInt(document.getElementById('sliderCisne')?.value) || 30) / 100;

        const result = [...dataTotal];
        // Encontrar índice do colapso. anoColapso está em ANOS; em período mensal
        // os labels são meses, então o alvo de comparação precisa ser convertido.
        const alvoColapso = tipoPeriodo === 'mensal' ? anoColapso * 12 : anoColapso;
        let idxColapso = labels.findIndex(l => parseInt(l) >= alvoColapso);
        if (idxColapso < 0) idxColapso = Math.floor(labels.length / 2);
        if (idxColapso === 0) idxColapso = 1;

        // Aplicar queda no ponto do colapso
        const valorAntes = result[idxColapso] || 0;
        const valorColapso = Math.round(valorAntes * (1 - queda));
        result[idxColapso] = valorColapso;

        // Recuperação gradual nos próximos anos retornando à trajetória original
        const totalPts = result.length;
        const recoverPts = Math.min(Math.max(3, Math.floor((totalPts - idxColapso) * 0.45)), 10);
        for (let i = 1; i <= recoverPts && idxColapso + i < totalPts; i++) {
            const frac = i / recoverPts;
            const original = dataTotal[idxColapso + i];
            // Ease-out quadrático: começa devagar, acelera
            const easedFrac = 1 - Math.pow(1 - frac, 2);
            result[idxColapso + i] = Math.round(valorColapso + (original - valorColapso) * easedFrac);
        }
        return result;
    }

    // ── 2. MONTE CARLO ──────────────────────────────────────
    let monteCarloAtivo = false;

    function toggleMonteCarloCheck() {
        const chk = document.getElementById('chkMonteCarlo');
        monteCarloAtivo = chk?.checked || false;
        if (typeof setFnLabel === 'function') setFnLabel('MonteCarlo', monteCarloAtivo);
        const box = document.getElementById('boxMonteCarlo');
        const icon = document.getElementById('toggleIconMonteCarlo');
        if (monteCarloAtivo) {
            box?.classList.remove('hidden');
            if (icon) icon.classList.add('open');
            regenerarMonteCarlo();
        } else {
            box?.classList.add('hidden');
            if (icon) icon.classList.remove('open');
            document.getElementById('monteCarloInfo')?.classList.add('hidden');
            executarPipelineCore();
        }
    }

    function regenerarMonteCarlo() {
        _monteCarloSeeds = null; // forçar novo sorteio
        executarPipelineCore();
    }

    function gerarTaxasAleatórias(n, mediaAnual, volatilidade) {
        // Box-Muller para distribuição normal
        if (!_monteCarloSeeds || _monteCarloSeeds.length !== n) {
            _monteCarloSeeds = [];
            for (let i = 0; i < n; i++) {
                const u1 = Math.random(), u2 = Math.random();
                const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
                _monteCarloSeeds.push(z);
            }
        }
        return _monteCarloSeeds.map(z => mediaAnual + z * volatilidade);
    }

    function aplicarMonteCarlo(labels, vInicial, aporteMensal, taxaAnualBase) {
        if (!monteCarloAtivo) return null;
        const volatilidade = (parseInt(document.getElementById('sliderVolatilidade')?.value) || 8) / 100;
        const n = labels.length;
        // [2.6] Usa o cronograma REAL de aportes do pipeline (IPCA no aporte, aporte
        // inteligente e retiradas respeitados). Fallback: aporte base fixo.
        const aportes = baseDadosCalculados.aportesMensais || null;
        const aporteDoMes = (mesAbs) => aportes ? (aportes[mesAbs - 1] ?? 0) : (mesAbs === 1 ? 0 : aporteMensal);
        const data = [Math.round(vInicial)];
        let saldo = vInicial;
        const infoEl = document.getElementById('monteCarloInfo');
        if (tipoPeriodo === 'anual') {
            const taxas = gerarTaxasAleatórias(n, taxaAnualBase, volatilidade);
            for (let i = 1; i < n; i++) {
                const taxaAnual = Math.max(-0.5, taxas[i]); // limitar queda a -50%
                const taxaMensal = Math.pow(1 + taxaAnual, 1/12) - 1;
                for (let s = 0; s < 12; s++) {
                    const mesAbs = (i - 1) * 12 + s + 1;
                    saldo = saldo * (1 + taxaMensal) + aporteDoMes(mesAbs);
                }
                data.push(Math.round(Math.max(0, saldo)));
            }
            if (infoEl) {
                const taxaMin = (Math.min(...taxas) * 100).toFixed(1);
                const taxaMax = (Math.max(...taxas) * 100).toFixed(1);
                infoEl.innerHTML = `Pior ano: <strong style="color:#ef4444">${taxaMin}%</strong> · Melhor ano: <strong style="color:#34d399">${taxaMax}%</strong> · Resultado: ${formatCurrency(data[data.length-1])}`;
                infoEl.classList.remove('hidden');
            }
        } else {
            // [2.5] Período mensal: sorteia retornos MENSAIS com σ_mensal = σ_anual/√12.
            // Antes cada mês recebia um sorteio com dispersão ANUAL → o mesmo slider
            // de volatilidade gerava riscos diferentes nos dois modos de período.
            const mediaMensal = Math.pow(1 + taxaAnualBase, 1/12) - 1;
            const volMensal = volatilidade / Math.sqrt(12);
            const taxasM = gerarTaxasAleatórias(n, mediaMensal, volMensal);
            for (let i = 1; i < n; i++) {
                const taxaMensal = Math.max(-0.5, taxasM[i]);
                saldo = saldo * (1 + taxaMensal) + aporteDoMes(i);
                data.push(Math.round(Math.max(0, saldo)));
            }
            if (infoEl) {
                const taxaMin = (Math.min(...taxasM) * 100).toFixed(2);
                const taxaMax = (Math.max(...taxasM) * 100).toFixed(2);
                infoEl.innerHTML = `Pior mês: <strong style="color:#ef4444">${taxaMin}%</strong> · Melhor mês: <strong style="color:#34d399">${taxaMax}%</strong> · Resultado: ${formatCurrency(data[data.length-1])}`;
                infoEl.classList.remove('hidden');
            }
        }
        return data;
    }

    // ── 3. CUSTO DO ATRASO ──────────────────────────────────
    let atrasoAtivo = false;
    let _atrasoMeses = 12;

    function toggleAtrasoCheck() {
        const chk = document.getElementById('chkAtraso');
        atrasoAtivo = chk?.checked || false;
        if (typeof setFnLabel === 'function') setFnLabel('Atraso', atrasoAtivo);
        const box = document.getElementById('boxAtraso');
        const icon = document.getElementById('toggleIconAtraso');
        if (atrasoAtivo) {
            box?.classList.remove('hidden');
            if (icon) icon.classList.add('open');
        } else {
            box?.classList.add('hidden');
            if (icon) icon.classList.remove('open');
        }
        executarPipelineCore();
        if (typeof _sincronizarGridAtraso === 'function') _sincronizarGridAtraso();
    }

    function setAtrasoMeses(m) {
        _atrasoMeses = m;
        const b12 = document.getElementById('btnAtraso12');
        const b24 = document.getElementById('btnAtraso24');
        [b12, b24].forEach(b => {
            if (!b) return;
            const bm = b.dataset.tipo === 'anos'
                ? (parseInt(b.dataset.anos) || 2) * 12
                : parseInt(b.dataset.meses || 12);
            const active = bm === m;
            b.style.background = active ? 'rgba(52,211,153,0.1)' : '';
            b.style.color      = active ? '#34d399' : '#6b7280';
            b.style.border     = active ? '1px solid rgba(52,211,153,0.4)' : '1px solid #2d2d3a';
        });
        executarPipelineCore();
    }

    function calcularAtraso() {
        if (!atrasoAtivo || !baseDadosCalculados?.final?.total) return;
        const vInicial = parseCurrencyValue(document.getElementById('inputInicial').value);
        const aporteMensal = parseCurrencyValue(document.getElementById('inputMensal').value);
        const taxaAnual = (parseFloat(document.getElementById('inputTaxa').value) || 0) / 100;
        const totalMeses = tipoPeriodo === 'anual'
            ? (parseInt(document.getElementById('inputAnos').value) || 0) * 12
            : (parseInt(document.getElementById('inputAnos').value) || 0);
        const taxaMensal = tipoTaxa === 'anual' ? Math.pow(1 + taxaAnual, 1/12) - 1 : taxaAnual;
        // [2.6] Usa o cronograma REAL de aportes do pipeline quando disponível
        const aportes = baseDadosCalculados.aportesMensais || null;
        const calcFV = (meses) => {
            let s = vInicial;
            // Convenção do site: mês 1 sem aporte (o 1º aporte já está no valor inicial)
            for (let i = 0; i < meses; i++) {
                const ap = aportes ? (aportes[i] ?? 0) : (i === 0 ? 0 : aporteMensal);
                s = s * (1 + taxaMensal) + ap;
            }
            return s;
        };
        const hoje = calcFV(totalMeses);
        const com = calcFV(Math.max(0, totalMeses - _atrasoMeses));
        const perda = hoje - com;
        document.getElementById('atrasoValorHoje').textContent = formatCurrency(hoje);
        document.getElementById('atrasoValorDepois').textContent = formatCurrency(com);
        document.getElementById('atrasoPerda').textContent = '-' + formatCurrency(perda);
        document.getElementById('atrasoResultado')?.classList.remove('hidden');
    }

    // ── 4. TERMÔMETRO DO DESESPERO ──────────────────────────
    let termometroAtivo = false;

    function toggleTermometroCheck() {
        const chk = document.getElementById('chkTermometro');
        termometroAtivo = chk?.checked || false;
        if (typeof setFnLabel === 'function') setFnLabel('Termometro', termometroAtivo);
        const box = document.getElementById('boxTermometro');
        const icon = document.getElementById('toggleIconTermometro');
        if (termometroAtivo) {
            box?.classList.remove('hidden');
            if (icon) icon.classList.add('open');
            calcularTermometro();
        } else {
            box?.classList.add('hidden');
            if (icon) icon.classList.remove('open');
            document.getElementById('termometroPopupMarker')?.remove();
            document.getElementById('termometroLineMarker')?.remove();
        }
    }

    function calcularTermometro() {
        if (!termometroAtivo || !baseDadosCalculados?.anos) return;
        const tabela = document.getElementById('termometroTabela');
        if (!tabela) return;
        tabela.innerHTML = '';
        tabela.classList.remove('hidden');

        const anos = baseDadosCalculados.anos;
        const chaveAnos = Object.keys(anos).map(Number).sort((a,b)=>a-b);
        const marcosPct = [5, 10, 15]; // oscilações típicas de mercado
        let rows = [];

        // Pegar alguns marcos de ano
        const marcos = chaveAnos.filter((a, i) => i === 0 || a % Math.max(1, Math.floor(chaveAnos.length / 5)) === 0 || i === chaveAnos.length - 1).slice(0, 5);

        marcos.forEach(ano => {
            const total = anos[ano]?.total || 0;
            if (total < 10000) return;
            marcosPct.forEach(pct => {
                const oscilacao = total * (pct / 100);
                const impacto = pct <= 5 ? '😰' : pct <= 10 ? '😱' : '💀';
                rows.push({ ano, total, pct, oscilacao, impacto });
            });
        });

        if (rows.length === 0) {
            tabela.innerHTML = '<p class="text-[9px] text-gray-500">Calcule uma simulação primeiro.</p>';
            return;
        }

        // Header
        const header = document.createElement('div');
        header.className = 'grid text-[9px] font-bold text-gray-500 uppercase pb-1 border-b border-[#24242b]';
        header.style.gridTemplateColumns = '2fr 1fr 2fr 1fr';
        header.innerHTML = '<span>Patrimônio</span><span class="text-center">Oscil.</span><span class="text-right">Impacto R$</span><span class="text-center">🧠</span>';
        tabela.appendChild(header);

        // Filtrar: um marco representativo por pct
        const filtrado = marcosPct.flatMap(pct => {
            const candidates = rows.filter(r => r.pct === pct);
            if (!candidates.length) return [];
            const mid = candidates[Math.floor(candidates.length / 2)];
            return [mid];
        });

        filtrado.forEach(r => {
            const row = document.createElement('div');
            row.className = 'grid items-center py-1.5 border-b text-[9px]';
            row.style.cssText = 'grid-template-columns:2fr 1fr 2fr 1fr;border-color:#1a1a22;';
            const cor = r.pct <= 5 ? '#fbbf24' : r.pct <= 10 ? '#fb923c' : '#ef4444';
            row.innerHTML = `
                <span style="color:#9ca3af;">Ano ${r.ano}: ${formatCurrency(r.total)}</span>
                <span class="text-center font-bold" style="color:${cor};">${r.pct}%</span>
                <span class="text-right font-black" style="color:${cor};">-${formatCurrency(r.oscilacao)}</span>
                <span class="text-center">${r.impacto}</span>
            `;
            tabela.appendChild(row);
        });

        const nota = document.createElement('p');
        nota.className = 'text-[9px] text-gray-600 leading-tight mt-1';
        nota.textContent = 'Oscilações normais de mercado. Lembre-se: a queda é temporária, o pânico é permanente.';
        tabela.appendChild(nota);
    }

    // ── 5. ANO SABÁTICO ─────────────────────────────────────
    let sabaticoAtivo = false;

    function toggleSabaticoCheck() {
        const chk = document.getElementById('chkSabatico');
        sabaticoAtivo = chk?.checked || false;
        if (typeof setFnLabel === 'function') setFnLabel('Sabatico', sabaticoAtivo);
        const box = document.getElementById('boxSabatico');
        const icon = document.getElementById('toggleIconSabatico');
        if (sabaticoAtivo) {
            box?.classList.remove('hidden');
            if (icon) icon.classList.add('open');
        } else {
            box?.classList.add('hidden');
            if (icon) icon.classList.remove('open');
        }
        executarPipelineCore();
    }

    function calcularSabatico() {
        if (!sabaticoAtivo) return;
        const vInicial = parseCurrencyValue(document.getElementById('inputInicial').value);
        const aporteMensal = parseCurrencyValue(document.getElementById('inputMensal').value);
        const taxaAnual = (parseFloat(document.getElementById('inputTaxa').value) || 0) / 100;
        const totalMeses = tipoPeriodo === 'anual'
            ? (parseInt(document.getElementById('inputAnos').value) || 0) * 12
            : (parseInt(document.getElementById('inputAnos').value) || 0);
        const taxaMensal = tipoTaxa === 'anual' ? Math.pow(1 + taxaAnual, 1/12) - 1 : taxaAnual;
        const anoSab = parseInt(document.getElementById('inputSabaticoAno')?.value) || 6;
        const durMeses = parseInt(document.getElementById('inputSabaticoDuracao')?.value) || 12;
        const saqueMensal = parseCurrencyValue(document.getElementById('inputSabaticoSaque')?.value);
        const mesSabInicio = anoSab * 12;
        const mesSabFim = mesSabInicio + durMeses;

        const simular = (comSabatico) => {
            let s = vInicial;
            for (let m = 1; m <= totalMeses; m++) {
                if (comSabatico && m > mesSabInicio && m <= mesSabFim) {
                    s = s * (1 + taxaMensal) - saqueMensal;
                } else if (comSabatico && m > mesSabFim) {
                    s = s * (1 + taxaMensal) + aporteMensal;
                } else {
                    s = s * (1 + taxaMensal) + aporteMensal;
                }
                if (s < 0) s = 0;
            }
            return s;
        };

        const sem = simular(false);
        const com = simular(true);
        const perda = sem - com;

        document.getElementById('sabaticoValorSem').textContent = formatCurrency(sem);
        document.getElementById('sabaticoValorCom').textContent = formatCurrency(com);
        document.getElementById('sabaticoPerda').textContent = '-' + formatCurrency(Math.max(0, perda));
        document.getElementById('sabaticoResultado')?.classList.remove('hidden');
    }

    // ── 6. EFEITO BOLA DE NEVE ──────────────────────────────
    let bolaDeNeveAtivo = false;

    function toggleBolaDeNeveCheck() {
        const chk = document.getElementById('chkBolaDeNeve');
        bolaDeNeveAtivo = chk?.checked || false;
        if (typeof setFnLabel === 'function') setFnLabel('BolaDeNeve', bolaDeNeveAtivo);
        const box = document.getElementById('boxBolaDeNeve');
        const icon = document.getElementById('toggleIconBolaDeNeve');
        if (bolaDeNeveAtivo) {
            box?.classList.remove('hidden');
            if (icon) icon.classList.add('open');
        } else {
            box?.classList.add('hidden');
            if (icon) icon.classList.remove('open');
            _bolaDeNeveAnoCruzamento = null;
            const row = document.getElementById('bolaDeNeveMarkerRow');
            if (row) { row.innerHTML = ''; row.style.display = 'none'; }
        }
        executarPipelineCore();
    }

    function calcularBolaDeNeve() {
        if (!bolaDeNeveAtivo || !baseDadosCalculados?.anos) return;
        const infoEl = document.getElementById('bolaDeNeveInfo');
        if (!infoEl) return;
        infoEl.innerHTML = '';
        infoEl.classList.remove('hidden');

        const anos = baseDadosCalculados.anos;
        const chaveAnos = Object.keys(anos).map(Number).sort((a,b)=>a-b);
        const aporteMensal = parseCurrencyValue(document.getElementById('inputMensal').value);
        const aporteAnual = aporteMensal * 12;

        let cruzamentoAno = null;
        for (let i = 1; i < chaveAnos.length; i++) {
            const ano = chaveAnos[i];
            const anoPrev = chaveAnos[i-1];
            const jurosAno = (anos[ano]?.total || 0) - (anos[anoPrev]?.total || 0) - aporteAnual;
            if (jurosAno >= aporteAnual && aporteAnual > 0) {
                cruzamentoAno = ano;
                break;
            }
        }

        const totalAnos = chaveAnos[chaveAnos.length - 1] || 1;
        const fase1 = cruzamentoAno || totalAnos;
        const fase2 = cruzamentoAno ? totalAnos - cruzamentoAno : 0;

        const barraFase1 = document.createElement('div');
        barraFase1.style.cssText = 'height:6px;border-radius:3px;background:linear-gradient(90deg,#3b82f6,#60a5fa);margin-bottom:2px;transition:width 0.5s;';
        barraFase1.style.width = ((fase1/totalAnos)*100).toFixed(1) + '%';

        const barraFase2 = document.createElement('div');
        barraFase2.style.cssText = 'height:6px;border-radius:3px;background:linear-gradient(90deg,#22d3ee,#06b6d4);transition:width 0.5s;';
        barraFase2.style.width = ((fase2/totalAnos)*100).toFixed(1) + '%';

        const track = document.createElement('div');
        track.style.cssText = 'background:#1a1a22;border-radius:4px;padding:2px;margin-bottom:8px;';
        const barraContainer = document.createElement('div');
        barraContainer.style.display = 'flex';
        barraContainer.appendChild(barraFase1);
        barraContainer.appendChild(barraFase2);
        track.appendChild(barraContainer);

        if (cruzamentoAno) {
            const msg = document.createElement('div');
            msg.style.cssText = 'font-size:9px;line-height:1.5;color:#9ca3af;';
            msg.innerHTML = `
                <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px;">
                    <span style="width:10px;height:10px;border-radius:2px;background:linear-gradient(90deg,#3b82f6,#60a5fa);flex-shrink:0;"></span>
                    <span><strong style="color:#60a5fa;">Fase 1 — Esforço Humano</strong>: Anos 1 a ${cruzamentoAno - 1}. Seu suor comanda o crescimento.</span>
                </div>
                <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
                    <span style="width:10px;height:10px;border-radius:2px;background:linear-gradient(90deg,#22d3ee,#06b6d4);flex-shrink:0;"></span>
                    <span><strong style="color:#22d3ee;">Fase 2 — Tração de Mercado</strong>: Anos ${cruzamentoAno} a ${totalAnos}. O mercado gera mais que você aporta.</span>
                </div>
                <div style="padding:6px 8px;border-radius:8px;background:#001520;border:1px solid rgba(34,211,238,0.25);">
                    🎯 <strong style="color:#22d3ee;">No Ano ${cruzamentoAno}</strong> os juros anuais ultrapassam seus aportes anuais de <strong style="color:#FFCC00;">${formatCurrency(aporteAnual)}</strong>.<br>
                    A partir daí, o dinheiro trabalha mais do que você!
                </div>
            `;
            infoEl.appendChild(track);
            infoEl.appendChild(msg);
        } else {
            infoEl.innerHTML = '<p class="text-[9px] text-gray-500">Aumente o período ou a taxa para atingir a Fase 2 de Tração de Mercado.</p>';
        }
    }

    //  Hook nas funções pós-cálculo para recalcular malucas
    function hookFuncoesMalucas() {
        // atraso: modo doido usa simularHibrido, modo normal usa calcFV
        if (typeof _doidoMode !== 'undefined' && _doidoMode) {
            calcularAtrasoHibrido();
        } else {
            calcularAtraso();
        }
        calcularTermometro();
        calcularSabatico();
        calcularBolaDeNeve();
        if (typeof _doidoMode !== 'undefined' && _doidoMode) {
            calcularBolaDeNeveDoido();
            if (bolaDeNeveAtivo) requestAnimationFrame(() => atualizarBolaDeNeveMarker());
            if (termometroAtivo) requestAnimationFrame(() => atualizarTermometroMarker());
            _sincronizarGridAtraso();
        }
    }

    // =======================================================
    // v1.doido — BLOCO COMPLETO (ativo so quando _doidoMode)
    // =======================================================

    // Modelo Hibrido 50/50: 50% valorizacao de cota + 50% dividendos mensais
    function simularHibrido({
        vInicial, aporteMensal, taxaAnual, totalMeses,
        crises = [], volatilidadePorAno = null,
        pausas = [], reinvestirDiv = true,
        reservaRFpct = 0
    }) {
        const txValAnual = taxaAnual * 0.5;
        const txDivAnual = taxaAnual * 0.5;
        const txRFMensal = Math.pow(1 + taxaAnual, 1/12) - 1;
        const pctRV = 1 - reservaRFpct;
        const pctRF = reservaRFpct;
        let preco = 1.0, cotas = vInicial * pctRV, saldoRF = vInicial * pctRF;
        let caixaDiv = 0, totalAportado = vInicial;
        let totalDividendosRecebidos = 0, reservaUsadaNaCrise = 0;
        const snapshots = [];
        for (let m = 1; m <= totalMeses; m++) {
            const anoIdx = Math.floor((m - 1) / 12);
            const txValAnualM = volatilidadePorAno ? Math.max(-0.99, volatilidadePorAno[anoIdx] * 0.5) : txValAnual;
            const txValMensal = Math.pow(Math.max(0.01, 1 + txValAnualM), 1/12) - 1;
            const txDivAnualM = volatilidadePorAno ? Math.max(0, volatilidadePorAno[anoIdx] * 0.5) : txDivAnual;
            const txDivMensal = Math.pow(1 + txDivAnualM, 1/12) - 1;
            saldoRF *= (1 + txRFMensal);
            let quedaEfetiva = 0;
            for (const c of crises) {
                if (m === c.mesInicio && reservaRFpct > 0 && saldoRF > 0) {
                    const cotasCompradas = saldoRF / (preco * (1 - c.queda));
                    cotas += cotasCompradas; reservaUsadaNaCrise += saldoRF; saldoRF = 0;
                }
                if (m === c.mesInicio) quedaEfetiva = c.queda;
                if (m === c.mesFim + 1) {
                    preco /= (1 - c.queda);
                    if (reservaRFpct > 0) {
                        const rfAlvo = (cotas * preco) * pctRF;
                        const cotasVender = Math.min(cotas, rfAlvo / Math.max(preco, 0.001));
                        cotas -= cotasVender; saldoRF = cotasVender * preco;
                    }
                }
            }
            if (quedaEfetiva > 0) preco *= (1 - quedaEfetiva);
            preco *= (1 + txValMensal);
            let fatorCrise = 1.0;
            for (const c of crises) { if (m >= c.mesInicio && m <= c.mesFim) fatorCrise = 1 - (c.queda * 0.10); }
            const dividendoMes = (cotas * preco) * txDivMensal * fatorCrise;
            totalDividendosRecebidos += dividendoMes;
            if (reinvestirDiv && preco > 0) cotas += dividendoMes / preco; else caixaDiv += dividendoMes;
            let emPausa = false, saquePausa = 0;
            for (const p of pausas) { if (m > p.mesInicio && m <= p.mesFim) { emPausa = true; saquePausa = p.saqueMensal; } }
            if (!emPausa) {
                // Convenção do site: mês 1 sem aporte (o 1º aporte já está no valor inicial)
                if (m > 1) {
                    if (preco > 0) cotas += (aporteMensal * pctRV) / preco;
                    saldoRF += aporteMensal * pctRF; totalAportado += aporteMensal;
                }
            } else {
                const cv = Math.min(cotas, saquePausa / Math.max(preco, 0.001));
                cotas = Math.max(0, cotas - cv); totalAportado -= saquePausa;
            }
            if (cotas < 0) cotas = 0; if (saldoRF < 0) saldoRF = 0; if (totalAportado < 0) totalAportado = 0;
            if (m % 12 === 0) snapshots.push({ totalAportado, patrimonioSnap: cotas * preco + saldoRF + caixaDiv, saldoRF, dividendosRecebidos: totalDividendosRecebidos });
        }
        return { saldoFinal: cotas * preco + saldoRF + caixaDiv, snapshots, totalDividendosRecebidos, reservaUsadaNaCrise };
    }

    // Globals extras do modo doido
    let _bolaDeNeveAnoCruzamento = null;
    let _impactoFuncao           = null;
    let _cisneMetaDados          = null;
    let _cardAtivoId             = null;

    function _getCtxDoido() {
        return {
            vInicial:     parseCurrencyValue(document.getElementById('inputInicial').value),
            aporteMensal: parseCurrencyValue(document.getElementById('inputMensal').value),
            taxaAnual:    (parseFloat(document.getElementById('inputTaxa').value) || 0) / 100,
            totalAnos:    tipoPeriodo === 'anual'
                ? (parseInt(document.getElementById('inputAnos').value) || 0)
                : Math.ceil((parseInt(document.getElementById('inputAnos').value) || 0) / 12),
        };
    }

    // Cisne Negro hibrido
    function aplicarCisneNegroHibrido(dataTotal, labels) {
        if (!cisneNegroAtivo) return dataTotal;
        const isAleatorio = document.getElementById('chkCisneAleatorio')?.checked ?? true;
        const anoColapso  = isAleatorio ? _cisneAnoSorteado : (parseInt(document.getElementById('inputCisneAno')?.value) || 10);
        const queda       = isAleatorio ? _cisneIntensidadeSorteada / 100 : (parseInt(document.getElementById('sliderCisne')?.value) || 30) / 100;
        const usarRF      = document.getElementById('chkCisneReservaRF')?.checked || false;
        const { vInicial, aporteMensal, taxaAnual } = _getCtxDoido();
        const totalAnos   = labels.length;
        const mesInicio   = (anoColapso - 1) * 12 + 1;
        const mesFim      = anoColapso * 12;

        // Simular do zero igual ao v14 — sem e com RF produzem o mesmo patrimônio total
        // pois os 25% RF já fazem parte do vInicial (só redistribui, não cria)
        const { snapshots, reservaUsadaNaCrise } = simularHibrido({
            vInicial, aporteMensal, taxaAnual,
            totalMeses: totalAnos * 12,
            crises: [{ mesInicio, mesFim, queda }],
            reservaRFpct: usarRF ? 0.25 : 0
        });

        _cisneMetaDados = { queda, anoColapso, mesInicio, mesFim, usarRF, reservaUsadaNaCrise };

        // Anos antes da crise: substituir pelos valores do pipeline original (trajetória idêntica)
        const result = snapshots.map(s => Math.round(s.patrimonioSnap));
        for (let i = 0; i < Math.min(anoColapso - 1, result.length); i++) {
            result[i] = dataTotal[i];
        }
        return result;
    }

    function calcularCisneResultadoDoido(dataTotal, dataCom) {
        const sem = dataTotal[dataTotal.length - 1] || 0;
        const com = dataCom[dataCom.length - 1] || 0;
        const dif = com - sem;
        const isBon = dif > 0;
        const elSem = document.getElementById('cisneValorSem');
        const elCom = document.getElementById('cisneValorCom');
        const elImp = document.getElementById('cisneImpacto');
        if (elSem) elSem.textContent = formatCurrency(sem);
        if (elCom) { elCom.textContent = formatCurrency(com); elCom.style.color = isBon ? '#34d399' : '#ef4444'; }
        if (elImp) { elImp.textContent = (isBon ? '+' : '-') + formatCurrency(Math.abs(isBon ? dif : sem - com)) + (isBon ? ' 🚀' : ''); elImp.style.color = isBon ? '#34d399' : '#ef4444'; }
        if (_cisneMetaDados && isBon) {
            const { queda, anoColapso, usarRF, reservaUsadaNaCrise } = _cisneMetaDados;
            let sub = document.getElementById('cisneBonusDesc');
            if (!sub) { sub = document.createElement('p'); sub.id = 'cisneBonusDesc'; sub.style.cssText = 'font-size:9px;color:#6b7280;margin-top:4px;line-height:1.5;'; document.getElementById('cisneResultadoBox')?.appendChild(sub); }
            let desc = 'Aportes no ano <span style="color:#ef4444;font-weight:700">' + anoColapso + '</span> compraram cotas <span style="color:#ef4444;font-weight:700">' + Math.round(queda*100) + '%</span> mais baratas.';
            if (usarRF && reservaUsadaNaCrise > 0) desc += ' Reserva RF de <span style="color:#34d399;font-weight:700">' + formatCurrency(reservaUsadaNaCrise) + '</span> convertida no piso.';
            sub.innerHTML = desc; sub.style.display = 'block';
        } else { const s = document.getElementById('cisneBonusDesc'); if (s) s.style.display = 'none'; }
        const elBox = document.getElementById('cisneResultadoBox');
        if (elBox) { elBox.classList.remove('hidden'); elBox.style.display = 'flex'; }
    }

    // Monte Carlo hibrido
    function calcularMonteCarloHibrido(labels, vInicial, aporteMensal, taxaAnualBase) {
        const vol = (parseInt(document.getElementById('sliderVolatilidade')?.value) || 8) / 100;
        const n = labels.length; // usa labels.length como fonte de verdade
        if (!_monteCarloSeeds || _monteCarloSeeds.length !== n) {
            _monteCarloSeeds = [];
            for (let i = 0; i < n; i++) {
                const u1 = Math.random(), u2 = Math.random();
                _monteCarloSeeds.push(Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2));
            }
        }
        const taxasPorAno = _monteCarloSeeds.map(z => Math.max(-0.8, (taxaAnualBase*0.5 + z*vol) + (taxaAnualBase*0.5 + z*(vol*0.10))));
        const { snapshots } = simularHibrido({ vInicial, aporteMensal, taxaAnual: taxaAnualBase, totalMeses: n * 12, volatilidadePorAno: taxasPorAno });
        const data = snapshots.map(s => Math.round(s.patrimonioSnap));
        const infoEl = document.getElementById('monteCarloInfo');
        if (infoEl) {
            infoEl.innerHTML = 'Pior ano: <strong style="color:#ef4444">' + (Math.min(...taxasPorAno)*100).toFixed(1) + '%</strong> · Melhor: <strong style="color:#34d399">' + (Math.max(...taxasPorAno)*100).toFixed(1) + '%</strong> · Resultado: ' + formatCurrency(data[data.length-1]) + '<br><span style="color:#a78bfa;font-size:8px;">Dividendos amortecem a queda (10x mais estaveis)</span>';
            infoEl.classList.remove('hidden');
        }
        return data;
    }

    // Sabático hibrido
    function calcularSabaticoHibrido(labels, vInicial, aporteMensal, taxaMensal) {
        // Igual ao v14: usa simularHibrido com pausas
        // Durante o sabático: aportes param, saques saem das cotas, dividendos continuam
        // Se saque > rendimento total, patrimônio cai — correto financeiramente
        const anoSab    = parseInt(document.getElementById('inputSabaticoAno')?.value) || 6;
        const durMeses  = parseInt(document.getElementById('inputSabaticoDuracao')?.value) || 12;
        // parseCurrencyValue para aceitar tanto número puro quanto formato BRL mascarado
        const saqueMens = parseCurrencyValue(document.getElementById('inputSabaticoSaque')?.value) || 0;
        const mesSabInicio = anoSab * 12;
        const mesSabFim    = mesSabInicio + durMeses;
        const taxaAnualEq  = Math.pow(1 + taxaMensal, 12) - 1;
        const totalMeses   = labels.length * 12;
        const { snapshots } = simularHibrido({
            vInicial, aporteMensal, taxaAnual: taxaAnualEq, totalMeses,
            pausas: [{ mesInicio: mesSabInicio, mesFim: mesSabFim, saqueMensal: saqueMens }]
        });
        return {
            dataTotal:     snapshots.map(s => Math.round(s.patrimonioSnap)),
            dataInvestido: snapshots.map(s => Math.round(Math.max(0, s.totalAportado)))
        };
    }

    // Atraso hibrido
    function calcularAtrasoHibrido() {
        if (!atrasoAtivo || !baseDadosCalculados?.final?.total) return;
        const { vInicial, aporteMensal, taxaAnual } = _getCtxDoido();
        // usa o número de anos do baseDadosCalculados como fonte de verdade
        const totalAnos = Object.keys(baseDadosCalculados.anos).length;
        if (!totalAnos) return;
        const totalMeses = totalAnos * 12;
        const { saldoFinal: hoje } = simularHibrido({ vInicial, aporteMensal, taxaAnual, totalMeses });
        const { saldoFinal: com  } = simularHibrido({ vInicial: 0, aporteMensal, taxaAnual, totalMeses, pausas: [{ mesInicio: 0, mesFim: _atrasoMeses, saqueMensal: 0 }] });
        const custo = Math.max(0, hoje - com);
        const custoMes = _atrasoMeses > 0 ? custo / _atrasoMeses : 0;
        const label = _atrasoMeses >= 12 ? (_atrasoMeses % 12 === 0 ? _atrasoMeses/12 : (_atrasoMeses/12).toFixed(1)) + ' ano(s) de atraso' : _atrasoMeses + ' meses de atraso';
        const kpiH = document.getElementById('kpiAtrasoHoje');
        const kpiD = document.getElementById('kpiAtrasoDepois');
        const lblC = document.getElementById('lblCardAtraso');
        if (kpiH) { kpiH.textContent = formatCurrency(hoje); kpiH.dataset.valor = hoje; }
        if (kpiD) { kpiD.textContent = formatCurrency(com);  kpiD.dataset.valor = com;  }
        if (lblC) lblC.textContent = label;
        const subH = document.getElementById('kpiAtrasoHojeSub');
        const subD = document.getElementById('kpiAtrasoDepoisSub');
        if (subH) subH.innerHTML = '<span style="color:#6b7280">Renda: </span><span style="color:#4ade80;font-weight:700">' + formatCurrency(hoje * taxaAnual / 12) + '/mes</span>';
        if (subD) subD.innerHTML = '<span style="color:#f87171;font-weight:700">- ' + formatCurrency(custo) + ' perdidos</span><br><span style="color:#6b7280">aprox. ' + formatCurrency(custoMes) + '/mes de procrastinacao</span>';
        const elH = document.getElementById('atrasoValorHoje');
        const elD = document.getElementById('atrasoValorDepois');
        const elP = document.getElementById('atrasoPerda');
        if (elH) elH.textContent = formatCurrency(hoje);
        if (elD) elD.textContent = formatCurrency(com);
        if (elP) elP.textContent = '-' + formatCurrency(custo);
        document.getElementById('atrasoResultado')?.classList.remove('hidden');
    }

    function calcularAtrasoParaGrafico() {
        const { vInicial, aporteMensal, taxaAnual } = _getCtxDoido();
        const totalAnos = Object.keys(baseDadosCalculados?.anos || {}).length;
        if (!totalAnos) return null;
        const totalMeses = totalAnos * 12;
        const { snapshots: snapH } = simularHibrido({ vInicial, aporteMensal, taxaAnual, totalMeses });
        const { snapshots: snapA } = simularHibrido({ vInicial: 0, aporteMensal, taxaAnual, totalMeses, pausas: [{ mesInicio: 0, mesFim: _atrasoMeses, saqueMensal: 0 }] });
        return { dataHoje: snapH.map(s => Math.round(s.patrimonioSnap)), dataAtrasado: snapA.map(s => Math.round(s.patrimonioSnap)) };
    }

    // Marcador bola de neve no grafico
    function atualizarBolaDeNeveMarker() {
        const row = document.getElementById('bolaDeNeveMarkerRow');
        if (!row) return;
        row.innerHTML = '';
        if (!bolaDeNeveAtivo || !_bolaDeNeveAnoCruzamento || !myChart) { row.style.display = 'none'; return; }
        const labels = myChart.data.labels;
        const idx    = labels.indexOf(String(_bolaDeNeveAnoCruzamento));
        if (idx < 0) { row.style.display = 'none'; return; }
        const xScale = myChart.scales.x;
        const xLeft  = xScale.getPixelForValue(0);
        const xRight = xScale.getPixelForValue(labels.length - 1);
        const xMark  = xScale.getPixelForValue(idx);
        row.style.display = 'block';
        const pct1 = ((idx / labels.length) * 100).toFixed(1);
        const pct2 = (100 - parseFloat(pct1)).toFixed(1);
        const bar = document.createElement('div');
        bar.style.cssText = 'position:absolute;left:' + xLeft + 'px;top:14px;width:' + (xRight-xLeft) + 'px;height:6px;border-radius:3px;display:flex;overflow:hidden;';
        bar.innerHTML = '<div style="width:' + pct1 + '%;background:linear-gradient(90deg,#3b82f6,#60a5fa);border-radius:3px 0 0 3px;"></div><div style="width:' + pct2 + '%;background:linear-gradient(90deg,#22d3ee,#06b6d4);border-radius:0 3px 3px 0;"></div>';
        row.appendChild(bar);
        const pin = document.createElement('div');
        pin.style.cssText = 'position:absolute;left:' + xMark + 'px;top:0;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;line-height:1;';
        pin.innerHTML = '<span style="font-size:13px;line-height:1;">&#9731;</span><div style="width:1px;height:8px;background:#22d3ee;margin:0 auto;"></div>';
        row.appendChild(pin);
    }

    // Marcador termometro no grafico
    function atualizarTermometroMarker() {
        document.getElementById('termometroPopupMarker')?.remove();
        if (!termometroAtivo || !myChart || !baseDadosCalculados?.anos) return;
        const anos = baseDadosCalculados.anos;
        const chaveAnos = Object.keys(anos).map(Number).sort((a,b)=>a-b);
        const anoEsc  = parseInt(document.getElementById('inputTermometroAno')?.value) || chaveAnos[Math.floor(chaveAnos.length/2)] || 10;
        const anoReal = chaveAnos.reduce((p, c) => Math.abs(c-anoEsc) < Math.abs(p-anoEsc) ? c : p, chaveAnos[0]);
        const total   = anos[anoReal]?.total || 0;
        if (!total) return;
        const labels = myChart.data.labels;
        const idx    = labels.indexOf(String(anoReal));
        if (idx < 0) return;
        const x       = myChart.scales.x.getPixelForValue(idx);
        const canvas  = document.getElementById('chartPatrimonio');
        const container = canvas?.parentElement;
        if (!container) return;
        const popup = document.createElement('div');
        popup.id = 'termometroPopupMarker';
        popup.style.cssText = 'position:absolute;left:-9999px;top:-9999px;background:' + (window._chartBgColor||'#1a1a22') + ';border:1px solid rgba(253,230,138,0.4);border-radius:10px;padding:8px 12px;font-size:11px;color:' + (window._chartBodyColor||'#fde68a') + ';z-index:10;pointer-events:none;white-space:nowrap;line-height:1.7;';
        popup.innerHTML = '&#127777; <strong style="color:#fde68a;">Ano ' + anoReal + '</strong>: ' + formatCurrency(total) +
            '<br><span style="color:#fbbf24;">&#9650; -5%:</span> <strong style="color:#fbbf24;">-' + formatCurrency(total*0.05) + '</strong>' +
            '<br><span style="color:#fb923c;">&#9670; -15%:</span> <strong style="color:#fb923c;">-' + formatCurrency(total*0.15) + '</strong>' +
            '<br><span style="color:#ef4444;">&#9660; -30%:</span> <strong style="color:#ef4444;">-' + formatCurrency(total*0.30) + '</strong>';
        container.appendChild(popup);
        // posicionar 2-3 anos à esquerda do ano escolhido, acima do chartArea
        const popupW = popup.offsetWidth;
        const popupH = popup.offsetHeight;
        const margem = 8;
        // fixo no topo da área do gráfico (acima de todas as linhas)
        const topPos = myChart.chartArea.top - popupH - margem;
        // deslocar ~2.5 anos à esquerda para não tapar as linhas do ano escolhido
        const tickWidth = (myChart.chartArea.right - myChart.chartArea.left) / Math.max(1, myChart.data.labels.length - 1);
        let leftPos = x - popupW - (tickWidth * 0.5);
        if (leftPos < myChart.chartArea.left) leftPos = myChart.chartArea.left;
        if (leftPos + popupW > myChart.chartArea.right) leftPos = myChart.chartArea.right - popupW;
        popup.style.left = leftPos + 'px';
        popup.style.top  = Math.max(0, topPos) + 'px';
        document.getElementById('termometroLineMarker')?.remove();
        const vline = document.createElement('div');
        vline.id = 'termometroLineMarker';
        vline.style.cssText = 'position:absolute;left:' + x + 'px;top:' + myChart.chartArea.top + 'px;width:1px;height:' + (myChart.chartArea.bottom - myChart.chartArea.top) + 'px;background:rgba(253,230,138,0.3);pointer-events:none;z-index:5;';
        container.appendChild(vline);
    }

    // Painel expandido dos cards (modo doido)
    function abrirPainelCard(tipo) {
        if (!_doidoMode) return;
        const painel   = document.getElementById('painelExpandido');
        const conteudo = document.getElementById('painelConteudo');
        if (!painel || !conteudo) return;
        if (_cardAtivoId === tipo) { fecharPainelCard(); return; }
        _cardAtivoId = tipo;
        ['cardTotal','cardJuros','cardInvestido','cardRenda','cardAtrasoHoje','cardAtrasoDepois'].forEach(id => document.getElementById(id)?.classList.remove('card-ativo'));
        const mapCard = { total:'cardTotal', juros:'cardJuros', aportado:'cardInvestido', renda:'cardRenda', atrasoHoje:'cardAtrasoHoje', atrasoDepois:'cardAtrasoDepois' };
        document.getElementById(mapCard[tipo])?.classList.add('card-ativo');
        const f = baseDadosCalculados.final;
        const lastAno = Object.values(baseDadosCalculados.anos).slice(-1)[0] || {};
        const { aporteMensal, taxaAnual } = _getCtxDoido();
        const totalBase  = f.total || 0;
        const totalFinal = _impactoFuncao ? (totalBase + _impactoFuncao.delta) : totalBase;
        const juros      = lastAno.juros    || 0;
        const investido  = lastAno.investido || 0;
        const rendaAnual = f.renda || 0;
        const rendaMensal = rendaAnual / 12;
        const multiploAporte = aporteMensal > 0 ? rendaMensal / aporteMensal : 0;
        const multiplicador  = investido > 0 ? (juros / investido).toFixed(1) : '0';
        const pctJuros   = totalFinal > 0 ? ((juros/totalFinal)*100).toFixed(1) : 0;
        const pctInvest  = totalFinal > 0 ? ((investido/totalFinal)*100).toFixed(1) : 0;
        const aporteAnual = aporteMensal * 12;
        const cores = { total:'#32CD32', juros:'#FF8C00', aportado:'#00BFFF', renda:'#FFCC00' };
        const cor = cores[tipo] || '#a855f7';
        function bp(cor, badge, bg, dir, desc) {
            return '<div class="p-header"><div class="p-header-left"><span class="p-dot" style="background:' + cor + ';box-shadow:0 0 5px ' + cor + ';"></span><span class="p-badge" style="background:' + bg + ';color:#fff;">' + badge + '</span></div><span class="p-label-dir">' + dir + '</span></div><div class="p-desc">' + desc + '</div>';
        }
        let html = '';
        if (tipo === 'total') {
            const extra = _impactoFuncao
                ? 'Funcao <strong style="color:#c084fc;">' + _impactoFuncao.funcao + '</strong>: <strong style="color:' + (_impactoFuncao.delta>=0?'#4ade80':'#f87171') + ';">' + (_impactoFuncao.delta>=0?'+':'') + formatCurrency(_impactoFuncao.delta) + '</strong> sobre o cenario base.'
                : _bolaDeNeveAnoCruzamento
                    ? 'Ponto de virada no <strong style="color:#22d3ee;">ano ' + _bolaDeNeveAnoCruzamento + '</strong> - depois disso o patrimonio acelera sem precisar de voce.'
                    : 'Cada R$1 aportado virou R$' + (1+parseFloat(multiplicador)).toFixed(1) + ' - <strong style="color:#FF8C00;">' + pctJuros + '%</strong> juros, <strong style="color:#00BFFF;">' + pctInvest + '%</strong> aportes.';
            html = bp(cor, pctJuros + '% gerado por juros', 'rgba(22,163,74,0.7)', 'do patrimonio final', extra);
        } else if (tipo === 'juros') {
            const superou = juros > investido;
            const extra = superou
                ? 'Seu dinheiro trabalha mais do que voce. Ponto de virada' + (_bolaDeNeveAnoCruzamento ? ' foi o <strong style="color:#22d3ee;">ano ' + _bolaDeNeveAnoCruzamento + '</strong>' : ' atingido') + ' - juros > ' + formatCurrency(aporteAnual) + '/ano.'
                : 'Faltam <strong style="color:#FF8C00;">' + formatCurrency(investido-juros) + '</strong> para juros superarem o total aportado' + (_bolaDeNeveAnoCruzamento ? ' - virada no <strong style="color:#22d3ee;">ano ' + _bolaDeNeveAnoCruzamento + '</strong>' : '') + '.';
            html = bp(cor, pctJuros + '% do final', 'rgba(234,88,12,0.7)', 'do objetivo final', extra);
        } else if (tipo === 'aportado') {
            const extra = sabaticoAtivo ? 'Sabatico pausou aportes - dividendos continuaram reinvestindo durante o periodo.' : 'Os outros <strong style="color:#FF8C00;">' + pctJuros + '%</strong> (' + formatCurrency(juros) + ') vieram exclusivamente de juros compostos.';
            html = bp(cor, pctInvest + '% do final', 'rgba(3,105,161,0.7)', 'do objetivo final', extra);
        } else if (tipo === 'renda') {
            const extra = multiploAporte >= 1
                ? 'Independencia financeira: rendimentos cobrem seus aportes' + (cisneNegroAtivo ? ' mesmo apos a crise.' : '.')
                : 'Quando chegar a 1x (' + formatCurrency(aporteMensal) + '/mes), os rendimentos cobrem seus aportes' + (cisneNegroAtivo ? ' - calculo pos-recuperacao do Cisne Negro.' : '.');
            html = bp(cor, formatCurrency(rendaMensal) + '/mes', 'rgba(161,98,7,0.7)', 'renda passiva projetada', extra);
        } else if (tipo === 'atrasoHoje') {
            const hV = parseFloat(document.getElementById('kpiAtrasoHoje')?.dataset?.valor || 0);
            const dV = parseFloat(document.getElementById('kpiAtrasoDepois')?.dataset?.valor || 0);
            const custo = Math.max(0, hV - dV);
            const custoMes = _atrasoMeses > 0 ? custo / _atrasoMeses : 0;
            const labelA = document.getElementById('lblCardAtraso')?.textContent || 'Com Atraso';
            html = bp('#32CD32', 'cenario base', 'rgba(22,163,74,0.7)', 'comecando hoje', 'Comparado a "' + labelA + '", comecar hoje preserva <strong style="color:#4ade80;">' + formatCurrency(custo) + '</strong> - equivale a <strong style="color:#4ade80;">' + formatCurrency(custoMes) + '/mes</strong> de procrastinacao.');
        } else if (tipo === 'atrasoDepois') {
            const hV = parseFloat(document.getElementById('kpiAtrasoHoje')?.dataset?.valor || 0);
            const dV = parseFloat(document.getElementById('kpiAtrasoDepois')?.dataset?.valor || 0);
            const custo = Math.max(0, hV - dV);
            const custoMes = _atrasoMeses > 0 ? custo / _atrasoMeses : 0;
            const labelA = document.getElementById('lblCardAtraso')?.textContent || 'Com Atraso';
            html = bp('#3b82f6', labelA, 'rgba(37,99,235,0.7)', 'cenario com atraso', 'Cada mes de atraso custa em media <strong style="color:#f87171;">' + formatCurrency(custoMes) + '</strong> - total de <strong style="color:#f87171;">' + formatCurrency(custo) + '</strong> perdidos ao adiar ' + _atrasoMeses + ' meses.');
        }
        conteudo.innerHTML = html;
        painel.classList.add('visivel');
    }

    function fecharPainelCard() {
        document.getElementById('painelExpandido')?.classList.remove('visivel');
        _cardAtivoId = null;
        ['cardTotal','cardJuros','cardInvestido','cardRenda','cardAtrasoHoje','cardAtrasoDepois'].forEach(id => document.getElementById(id)?.classList.remove('card-ativo'));
    }

    // Sync grid de cards atraso/normal (modo doido)
    function _sincronizarGridAtraso() {
        if (!_doidoMode) return;
        const cn = document.getElementById('cardsGrid');
        const ca = document.getElementById('cardsGridAtraso');
        if (!cn || !ca) return;
        cn.classList.toggle('hidden', atrasoAtivo);
        ca.classList.toggle('hidden', !atrasoAtivo);
        if (_cardAtivoId) {
            const eAtraso = ['atrasoHoje','atrasoDepois'].includes(_cardAtivoId);
            if ((eAtraso && !atrasoAtivo) || (!eAtraso && atrasoAtivo)) fecharPainelCard();
        }
    }

    // Cruzamento bola de neve para o modo doido
    function calcularBolaDeNeveDoido() {
        if (!bolaDeNeveAtivo || !baseDadosCalculados?.anos) { _bolaDeNeveAnoCruzamento = null; return; }
        const anos = baseDadosCalculados.anos;
        const chaveAnos = Object.keys(anos).map(Number).sort((a,b)=>a-b);
        const aporteMensal = parseCurrencyValue(document.getElementById('inputMensal').value);
        const aporteAnual  = aporteMensal * 12;
        _bolaDeNeveAnoCruzamento = null;
        for (let i = 1; i < chaveAnos.length; i++) {
            const ano = chaveAnos[i], anoPrev = chaveAnos[i-1];
            const jurosAno = (anos[ano]?.total||0) - (anos[anoPrev]?.total||0) - aporteAnual;
            if (jurosAno >= aporteAnual && aporteAnual > 0) { _bolaDeNeveAnoCruzamento = ano; break; }
        }
    }

    // Registrar clicks no modo doido (capture=true intercepta antes do listener normal)
    function _setupCardsDoidoClick() {
        [{ id:'cardTotal', tipo:'total' }, { id:'cardJuros', tipo:'juros' }, { id:'cardInvestido', tipo:'aportado' }, { id:'cardRenda', tipo:'renda' }]
        .forEach(({ id, tipo }) => {
            const card = document.getElementById(id);
            if (!card) return;
            card.addEventListener('click', (e) => {
                if (!_doidoMode) return;
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL') return;
                e.stopImmediatePropagation();
                abrirPainelCard(tipo);
            }, true);
        });
    }


    // ── Funções de suporte ao painel v14 (modo doido) ────────

    // stepYearInput: spinner de ano nos inputs do painel
    function stepYearInput(id, delta, cbName) {
        const el = document.getElementById(id);
        if (!el) return;
        const min = parseInt(el.min) || 1;
        const max = parseInt(el.max) || 999;
        el.value = Math.min(max, Math.max(min, (parseInt(el.value) || 1) + delta));
        if (cbName === 'executarPipelineCore') executarPipelineCore();
        else if (cbName === 'executarPipelineDebounced') executarPipelineDebounced();
        else if (cbName === 'calcularTermometro') calcularTermometro();
        else if (cbName === 'debounceTermometro') debounceTermometro();
    }

    // debounceTermometro: debounce para o input do termômetro
    let _termometroDebounce = null;
    function debounceTermometro() {
        clearTimeout(_termometroDebounce);
        _termometroDebounce = setTimeout(calcularTermometro, 400);
    }

    // setFnLabel: acende/apaga label da função maluca
    function setFnLabel(nome, ativo) {
        const el = document.getElementById('lbl' + nome);
        if (el) el.style.color = ativo ? '#c084fc' : '#4a3a5c';
    }

    // toggleTodasFuncoes: ativa/desativa todas as funções
    function toggleTodasFuncoes(ativo) {
        const container = document.getElementById('funcoesMalucasPanel');
        if (!ativo) {
            container?.classList.add('funcoes-desativadas');
            ['CisneNegro','MonteCarlo','Atraso','Termometro','Sabatico','BolaDeNeve'].forEach(id => {
                const chk = document.getElementById('chk' + id);
                if (chk) chk.checked = false;
                document.getElementById('box' + id)?.classList.add('hidden');
                const icon = document.getElementById('toggleIcon' + id);
                if (icon) icon.classList.remove('open');
            });
            cisneNegroAtivo = false; monteCarloAtivo = false; atrasoAtivo = false;
            termometroAtivo = false; sabaticoAtivo   = false; bolaDeNeveAtivo = false;
            ['CisneNegro','MonteCarlo','Atraso','Termometro','Sabatico','BolaDeNeve'].forEach(n => setFnLabel(n, false));
            _bolaDeNeveAnoCruzamento = null; _monteCarloSeeds = null;
            ['cisneResultadoBox','monteCarloInfo','atrasoResultado','termometroTabela','sabaticoResultado','bolaDeNeveInfo'].forEach(id => {
                const el = document.getElementById(id);
                if (el) { el.classList.add('hidden'); el.style.display = ''; }
            });
            fecharPainelCard();
            _sincronizarGridAtraso();
            executarPipelineCore();
        } else {
            container?.classList.remove('funcoes-desativadas');
        }
    }

    // setAtrasoPreset: define preset de meses e reseta os botões
    function setAtrasoPreset(meses) {
        const b12 = document.getElementById('btnAtraso12');
        const b24 = document.getElementById('btnAtraso24');
        if (b12) { b12.dataset.meses = 12; b12.dataset.tipo = 'meses'; }
        if (b24) { b24.dataset.anos  = 2;  b24.dataset.meses = 24; b24.dataset.tipo = 'anos'; }
        setAtrasoMeses(meses);
    }

    // abrirAtrasoEditor / fecharAtrasoEditor: edição inline dos botões de atraso
    function abrirAtrasoEditor(btn, defaultM) {
        if (btn.querySelector('.atraso-editor')) return;
        btn.innerHTML = '';
        btn.style.padding = '2px 6px';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'space-between';
        btn.onclick = null; btn.ondblclick = null;
        const editor = document.createElement('div');
        editor.className = 'atraso-editor';
        editor.style.cssText = 'display:flex;align-items:center;width:100%;justify-content:space-between;';
        const isAnos = btn.dataset.tipo === 'anos';
        const valorInicial = isAnos ? (parseInt(btn.dataset.anos) || 2) : (parseInt(btn.dataset.meses) || defaultM);
        const inp = document.createElement('input');
        inp.type = 'number'; inp.min = '1'; inp.max = isAnos ? '50' : '120';
        inp.value = valorInicial;
        inp.style.cssText = 'width:32px;background:transparent;border:none;outline:none;color:#34d399;font-weight:700;font-size:11px;text-align:left;-moz-appearance:textfield;';
        inp.addEventListener('input', () => {
            const v = Math.max(1, Math.min(parseInt(inp.max), parseInt(inp.value) || 1));
            if (isAnos) { btn.dataset.anos = v; btn.dataset.meses = v * 12; setAtrasoMeses(v * 12); }
            else { btn.dataset.meses = v; setAtrasoMeses(v); }
        });
        inp.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === 'Escape') fecharAtrasoEditor(btn); });
        const arrows = document.createElement('div');
        arrows.style.cssText = 'display:flex;flex-direction:column;margin-left:auto;';
        const bUp = document.createElement('button');
        bUp.textContent = '▲';
        bUp.style.cssText = 'background:none;border:none;color:#6b7280;cursor:pointer;font-size:8px;line-height:1;padding:0 2px;';
        bUp.onmouseenter = () => bUp.style.color = '#c084fc';
        bUp.onmouseleave = () => bUp.style.color = '#6b7280';
        bUp.onclick = (e) => { e.stopPropagation(); inp.value = Math.min(120,(parseInt(inp.value)||1)+1); inp.dispatchEvent(new Event('input')); };
        const bDn = document.createElement('button');
        bDn.textContent = '▼';
        bDn.style.cssText = 'background:none;border:none;color:#6b7280;cursor:pointer;font-size:8px;line-height:1;padding:0 2px;';
        bDn.onmouseenter = () => bDn.style.color = '#c084fc';
        bDn.onmouseleave = () => bDn.style.color = '#6b7280';
        bDn.onclick = (e) => { e.stopPropagation(); inp.value = Math.max(1,(parseInt(inp.value)||1)-1); inp.dispatchEvent(new Event('input')); };
        arrows.appendChild(bUp); arrows.appendChild(bDn);
        editor.appendChild(inp); editor.appendChild(arrows);
        btn.appendChild(editor);
        setTimeout(() => inp.focus(), 50);
        setTimeout(() => {
            document.addEventListener('click', function handler(e) {
                if (!btn.contains(e.target)) { fecharAtrasoEditor(btn); document.removeEventListener('click', handler); }
            });
        }, 100);
    }

    function fecharAtrasoEditor(btn) {
        const isAnos = btn.dataset.tipo === 'anos';
        const displayVal = isAnos ? (parseInt(btn.dataset.anos) || 2) : (parseInt(btn.dataset.meses) || _atrasoMeses);
        const m = isAnos ? displayVal * 12 : displayVal;
        const label = btn.id === 'btnAtraso12' ? displayVal + ' meses' : displayVal + (displayVal === 1 ? ' ano' : ' anos');
        btn.innerHTML = label;
        btn.style.padding = ''; btn.style.display = ''; btn.style.alignItems = ''; btn.style.justifyContent = '';
        btn.onclick = () => setAtrasoMeses(m);
        btn.ondblclick = () => abrirAtrasoEditor(btn, m);
        setAtrasoMeses(_atrasoMeses);
    }

    // Plugin Chart.js para bola de neve e termômetro (afterRender)
    const _bolaDeNeveChartPlugin = {
        id: 'doidoMarkers',
        afterRender(chart) {
            if (typeof _doidoMode === 'undefined' || !_doidoMode) return;
            if (bolaDeNeveAtivo) atualizarBolaDeNeveMarker();
            if (termometroAtivo) atualizarTermometroMarker();
        }
    };

    window.onload = init;

    /* ═══════════════════════════════════════════════════════════════
       MOTION DESIGN ENGINE — não toca em lógica financeira
       ═══════════════════════════════════════════════════════════════ */

    // ── 1. COUNTER ANIMATION nos KPIs ──────────────────────────────
    // Cada KPI guarda o valor atual e interpola suavemente até o alvo
    const _kpiState = {};  // { id: { current, raf } }

    function easeOutExpo(t) {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    function animarKPI(id, target) {
        const el = document.getElementById(id);
        if (!el) return;

        // Se não há diferença significativa, seta direto
        const prev = _kpiState[id]?.current ?? 0;
        if (Math.abs(target - prev) < 1) {
            el.innerText = formatCurrency(target);
            _kpiState[id] = { current: target };
            return;
        }

        // Cancela animação anterior se ainda rodando
        if (_kpiState[id]?.raf) cancelAnimationFrame(_kpiState[id].raf);

        const duration = 480; // ms
        const start = prev;
        const diff = target - start;
        const startTime = performance.now();

        function step(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeOutExpo(progress);
            const raw = start + diff * eased;
            const current = Math.round(raw * 100) / 100;

            let displayVal;
            if (modoAtual === 'completo' && progress < 1) {
                // centavos rodam 00→99 em loop baseado no tempo decorrido
                const centsCycle = Math.floor((elapsed / 20)) % 100;
                displayVal = Math.floor(raw) + centsCycle / 100;
            } else {
                displayVal = current;
            }

            el.innerText = formatCurrency(displayVal);
            _kpiState[id] = { current, raf: progress < 1 ? requestAnimationFrame(step) : null };
        }
        _kpiState[id] = { current: prev, raf: requestAnimationFrame(step) };
    }

    // ── 2. SLIDE-IN dos cards KPI ao trocar de modo ─────────────────
    // Anima cada card do grid com stagger quando modo muda
    function animarCardsEntrada() {
        const cards = document.querySelectorAll('#cardsGrid > div');
        cards.forEach((card, i) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(14px)';
            card.style.transition = 'none';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    card.style.transition = `opacity 0.38s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms,
                                             transform 0.38s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms`;
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                });
            });
        });
    }

    // Patch alternarModoExibicao para adicionar animação de cards
    const _alternarModoOriginal = alternarModoExibicao;
    alternarModoExibicao = function(modo) {
        _alternarModoOriginal(modo);
        animarCardsEntrada();
        // Animar painel lateral avançado entrando
        const painelAvancado = document.getElementById('containerAporteInteligente');
        if (modo === 'completo' && painelAvancado) {
            painelAvancado.style.opacity = '0';
            painelAvancado.style.transform = 'translateY(-8px)';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    painelAvancado.style.transition = 'opacity 0.4s cubic-bezier(0.16,1,0.3,1), transform 0.4s cubic-bezier(0.16,1,0.3,1)';
                    painelAvancado.style.opacity = '1';
                    painelAvancado.style.transform = 'translateY(0)';
                });
            });
        }
    };

    // ── 3. PROGRESS BAR — fill animado com spring ──────────────────
    // Patch do cardProgressFill para animar width com spring physics
    let _progressTarget = 0;
    let _progressCurrent = 0;
    let _progressRaf = null;

    function animarProgressBar(targetPct) {
        _progressTarget = Math.min(100, Math.max(0, targetPct));
        if (_progressRaf) return; // já animando

        const fill = document.getElementById('cardProgressFill');
        if (!fill) return;

        const duration = 700;
        const startVal = _progressCurrent;
        const diff = _progressTarget - startVal;
        const startTime = performance.now();

        function spring(t) {
            // Overshoot spring: expo-out com leve bounce
            const c = 0.15;
            return 1 - Math.pow(2, -10 * t) * Math.cos(t * Math.PI * 3.5 * c + Math.PI * 0.12);
        }

        function step(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = spring(progress);
            _progressCurrent = startVal + diff * eased;
            fill.style.width = _progressCurrent.toFixed(2) + '%';

            if (progress < 1) {
                _progressRaf = requestAnimationFrame(step);
            } else {
                _progressCurrent = _progressTarget;
                fill.style.width = _progressTarget + '%';
                _progressRaf = null;
            }
        }
        _progressRaf = requestAnimationFrame(step);
    }

    // Observar mudanças no cardInfoPanel para disparar animação
    const _cardInfoObserver = new MutationObserver(() => {
        const fill = document.getElementById('cardProgressFill');
        if (!fill) return;
        const pct = parseFloat(fill.style.width) || 0;
        if (pct !== _progressCurrent) {
            const target = pct;
            fill.style.width = _progressCurrent + '%'; // reset visual para animar do ponto certo
            animarProgressBar(target);
        }
    });
    // Inicia observer após load
    setTimeout(() => {
        const panel = document.getElementById('cardInfoPanel');
        if (panel) _cardInfoObserver.observe(panel, { attributes: true, childList: true, subtree: true });
    }, 800);

    // ── 4. GRÁFICO — ripple ao clicar nos pontos (removido) ──────────────────

    // ── 5. SIDEBAR SMART-SECTIONS — slide expand/collapse ─────────
    // Anima abertura/fechamento dos painéis colapsáveis com height transition
    function _animarSlideToggle(el, mostrar) {
        if (mostrar) {
            el.classList.remove('hidden');
            el.style.overflow = 'hidden';
            el.style.maxHeight = '0px';
            el.style.opacity = '0';
            el.style.transition = 'none';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    el.style.transition = 'max-height 0.38s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease';
                    el.style.maxHeight = el.scrollHeight + 'px';
                    el.style.opacity = '1';
                    setTimeout(() => {
                        el.style.maxHeight = '';
                        el.style.overflow = '';
                    }, 400);
                });
            });
        } else {
            el.style.overflow = 'hidden';
            el.style.maxHeight = el.scrollHeight + 'px';
            el.style.opacity = '1';
            requestAnimationFrame(() => {
                el.style.transition = 'max-height 0.3s cubic-bezier(0.4,0,1,1), opacity 0.22s ease';
                el.style.maxHeight = '0px';
                el.style.opacity = '0';
                setTimeout(() => { el.classList.add('hidden'); el.style.maxHeight = ''; }, 320);
            });
        }
    }

    // Patch toggleFuncaoMaluca para usar slide animation
    if (typeof toggleFuncaoMaluca === 'function') {
        const _toggleFuncaoOriginal = toggleFuncaoMaluca;
        toggleFuncaoMaluca = function(nome) {
            const box = document.getElementById('box' + nome);
            const wasHidden = box && box.classList.contains('hidden');
            _toggleFuncaoOriginal(nome);
            if (box) {
                const isNowHidden = box.classList.contains('hidden');
                if (wasHidden !== isNowHidden) {
                    // foi toggled — animar
                    box.classList.remove('hidden'); // remove para detectar scrollHeight
                    _animarSlideToggle(box, !isNowHidden);
                }
            }
        };
    }

    // Animar os painéis do sidebar (Aporte Inteligente, Retirada, etc.)
    // Patch das funções de toggle que usam classList.add/remove 'hidden' nos boxAporte etc.
    ['boxAporteInteligente','boxRetirada','boxPoupanca','boxCenarios','boxMeta','boxLiberdade'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        // Observar mudanças de display/hidden nesses elementos
        const obs = new MutationObserver(mutations => {
            mutations.forEach(m => {
                if (m.attributeName === 'class') {
                    const hidden = el.classList.contains('hidden');
                    // Se foi adicionado hidden via JS, animar out; se removido, animar in
                    // (MutationObserver pega depois da mudança, então verificamos o estado atual)
                    // Só animar se mudou de estado
                    if (m.oldValue && m.oldValue.includes('hidden') !== hidden) {
                        _animarSlideToggle(el, !hidden);
                    }
                }
            });
        });
        obs.observe(el, { attributes: true, attributeOldValue: true });
    });

    // ── 6. PAGE LOAD — stagger de entrada ─────────────────────────
    // Garantir que a animação inicial rode mesmo se o CSS não pegou
    function _runPageEntrance() {
        const groups = [
            { selector: '#cardsGrid > div', baseDelay: 300, step: 70 },
            { selector: '.lg\\:col-span-1 > .dark-card', baseDelay: 150, step: 80 },
        ];
        groups.forEach(({ selector, baseDelay, step }) => {
            document.querySelectorAll(selector).forEach((el, i) => {
                el.style.opacity = '0';
                el.style.transform = 'translateY(16px)';
                setTimeout(() => {
                    el.style.transition = 'opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)';
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                }, baseDelay + i * step);
            });
        });
    }

    // ── 11. MODO TOGGLE — stagger fade nos elementos do sidebar ───
    function _mostrarComFade(id, delay) {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove('hidden', 'modo-fadeout');
        el.classList.remove('modo-fadein');
        void el.offsetWidth;
        el.style.animationDelay = delay + 'ms';
        el.classList.add('modo-fadein');
    }
    function _esconderComFade(id, delay, cb) {
        const el = document.getElementById(id);
        if (!el || el.classList.contains('hidden')) return;
        el.classList.remove('modo-fadein');
        el.style.animationDelay = delay + 'ms';
        el.classList.add('modo-fadeout');
        setTimeout(() => {
            el.classList.add('hidden');
            el.classList.remove('modo-fadeout');
            el.style.animationDelay = '';
            if (cb) cb();
        }, 200 + delay);
    }

    // Patch alternarModoExibicao — stagger fade nos elementos do sidebar
    const _alternarModoBase = alternarModoExibicao;
    alternarModoExibicao = function(modo) {
        _alternarModoBase(modo);
        if (modo === 'completo') {
            _mostrarComFade('inflacaoSection',            0);
            _mostrarComFade('containerAporteInteligente', 50);
            _mostrarComFade('divReiniciarAvancado',       100);
            setTimeout(() => { const el = document.getElementById('vidaRealRow'); if (el) el.style.visibility = 'visible'; }, 150);
        } else {
            const elVR = document.getElementById('vidaRealRow'); if (elVR) elVR.style.visibility = 'hidden';
            _esconderComFade('divReiniciarAvancado',      30);
            _esconderComFade('containerAporteInteligente',60);
            _esconderComFade('inflacaoSection',           90);
        }
    };
    const _kpiPulseMap = {
        'kpiTotal':      { card: 'cardTotal',      color: 'rgba(50,205,50,0.18)'  },
        'kpiJuros':      { card: 'cardJuros',      color: 'rgba(255,140,0,0.18)'  },
        'kpiInvestido':  { card: 'cardInvestido',  color: 'rgba(0,191,255,0.18)'  },
        'kpiRendaAnual': { card: 'cardRenda',      color: 'rgba(255,204,0,0.18)'  },
    };
    function _pulseCard(kpiId) {
        const map = _kpiPulseMap[kpiId];
        if (!map) return;
        const card = document.getElementById(map.card);
        if (!card) return;
        // Remove overlay anterior se ainda existir
        card.querySelectorAll('.kpi-pulse-overlay').forEach(el => el.remove());
        const overlay = document.createElement('div');
        overlay.className = 'kpi-pulse-overlay';
        overlay.style.background = `radial-gradient(ellipse at center, ${map.color} 0%, transparent 70%)`;
        card.appendChild(overlay);
        setTimeout(() => overlay.remove(), 750);
    }
    // Patch animarKPI para disparar pulse no início de cada nova animação
    const _animarKPIOriginal = animarKPI;
    animarKPI = function(id, target) {
        const prev = _kpiState[id]?.current ?? 0;
        if (Math.abs(target - prev) >= 1) _pulseCard(id);
        _animarKPIOriginal(id, target);
    };

    // ── 8. INPUT SHAKE ao valor inválido ──────────────────────────
    // Taxa: não pode ser 0 ou negativo; Anos: mínimo 1
    function _shakeInput(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove('input-shake');
        void el.offsetWidth;
        el.classList.add('input-shake');
        setTimeout(() => el.classList.remove('input-shake'), 400);
    }
    document.getElementById('inputTaxa')?.addEventListener('blur', function() {
        const v = parseFloat(this.value.replace(',','.'));
        if (isNaN(v) || v <= 0) _shakeInput('inputTaxa');
    });
    document.getElementById('inputAnos')?.addEventListener('blur', function() {
        const v = parseInt(this.value);
        if (isNaN(v) || v < 1) _shakeInput('inputAnos');
    });

    // ── 9. SLIDING INDICATOR no modo toggle ───────────────────────
    function _atualizarSlider(modo) {
        const wrap = document.getElementById('modoToggleWrap');
        const slider = document.getElementById('modoSlider');
        const btnS = document.getElementById('btnModoSimples');
        const btnC = document.getElementById('btnModoCompleto');
        if (!wrap || !slider || !btnS || !btnC) return;
        const wrapRect = wrap.getBoundingClientRect();
        const activeBtn = modo === 'simples' ? btnS : btnC;
        const activeRect = activeBtn.getBoundingClientRect();
        slider.style.left   = (activeRect.left - wrapRect.left) + 'px';
        slider.style.width  = activeRect.width + 'px';
        // Cor do texto ativo por tema
        const _temaAtualSlider = document.documentElement.getAttribute('data-theme') || 'dark';
        const _corAtivoMap = { light: '#fff8ee', pastel: '#1a0f05', cute: '#fff0ff', dark: 'var(--bg-base)' };
        const _corInativoMap = { light: '#7a6e65', pastel: '#a8896e', cute: '#9a6880', dark: '' };
        const corAtivo = _corAtivoMap[_temaAtualSlider] || 'var(--bg-base)';
        const corInativo = _corInativoMap[_temaAtualSlider] || '';
        btnS.style.color = modo === 'simples' ? corAtivo : corInativo;
        btnS.style.background = 'transparent';
        btnC.style.color = modo === 'completo' ? corAtivo : corInativo;
        btnC.style.background = 'transparent';
    }
    // Patch para sincronizar slider ao trocar modo
    const _alternarModoComSlider = alternarModoExibicao;
    alternarModoExibicao = function(modo) {
        _alternarModoComSlider(modo);
        setTimeout(() => _atualizarSlider(modo), 10);
    };
    // Init slider na carga
    setTimeout(() => _atualizarSlider('simples'), 100);

    // ── 10. BANNER PARTICLES — pontos flutuantes sutis ────────────
    // ── STATUS PANEL: setas de scroll ──
    (function() {
        // ─────────────────────────────────────────────────────────────
        // LED TICKER — loop infinito sobre #statusFuncoesAtivas
        //
        // ESTRATÉGIA: interceptar o setter de innerHTML do container.
        // O atualizarStatusLed() faz funcoesEl.innerHTML = "..." a cada
        // recalculo — isso destrói qualquer wrapper filho que criemos.
        // Solução: sobrescrever innerHTML via Object.defineProperty para
        // que toda escrita vá para o innerEl interno, preservando o wrapper.
        // ─────────────────────────────────────────────────────────────
        const container = document.getElementById('statusFuncoesAtivas');
        if (!container) return;

        // Janela fixa
        container.style.overflow = 'hidden';
        container.style.position = 'relative';

        // Wrapper deslizante
        const innerEl = document.createElement('div');
        innerEl.style.cssText = 'display:flex;flex-direction:column;gap:2px;will-change:transform;';
        // Migra filhos existentes
        while (container.firstChild) innerEl.appendChild(container.firstChild);
        container.appendChild(innerEl);

        // Máscara fade topo/baixo — efeito 3D "entrar por baixo, sair pelo topo"
        container.style.maskImage        = 'linear-gradient(to bottom,transparent 0%,#000 25%,#000 75%,transparent 100%)';
        container.style.webkitMaskImage  = 'linear-gradient(to bottom,transparent 0%,#000 25%,#000 75%,transparent 100%)';

        // ── Intercepta innerHTML do container para redirecionar ao innerEl ──
        // Salva o setter nativo antes de sobrescrever
        const _nativeInnerHTMLDesc = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
        Object.defineProperty(container, 'innerHTML', {
            get() { return innerEl.innerHTML; },
            set(html) {
                // Escreve no innerEl, não no container
                _nativeInnerHTMLDesc.set.call(innerEl, html);
                // Agenda reinício do ticker
                _scheduleRestart();
            },
            configurable: true
        });

        // ── Estado do ticker ──
        let _raf       = null;
        let _running   = false;
        let _paused    = false;
        let _pauseT    = null;
        let _offset    = 0;   // px acumulado
        let _loopH     = 0;   // altura de 1 bloco real (para wrap)
        const SPEED    = 0.12; // px/frame

        function _reais() {
            return Array.from(innerEl.children).filter(c => !c.__clone);
        }

        function _clones() {
            return Array.from(innerEl.children).filter(c => c.__clone);
        }

        function _buildClones() {
            _clones().forEach(c => c.remove());
            const reais = _reais();
            if (!reais.length) { _loopH = 0; return; }
            reais.forEach(r => {
                const cl = r.cloneNode(true);
                cl.__clone = true;
                innerEl.appendChild(cl);
            });
            _loopH = reais.reduce((s, r) => s + r.offsetHeight + 2, 0);
        }

        function _overflow() {
            const reais = _reais();
            if (reais.length < 4) return false; // só roda com 4+ itens
            const h = reais.reduce((s, r) => s + r.offsetHeight + 2, 0);
            return h > container.clientHeight + 1;
        }

        function _tick() {
            if (!_running || _paused) { _raf = null; return; }
            if (_loopH <= 0) { _raf = null; return; }
            _offset += SPEED;
            if (_offset >= _loopH) _offset -= _loopH;
            innerEl.style.transform = 'translateY(' + (-_offset).toFixed(2) + 'px)';

            // ── Efeito zoom discreto: só aplica quando há carrossel rodando ──
            if (_overflow()) {
                const contRect   = container.getBoundingClientRect();
                const centerY    = contRect.top + contRect.height / 2;
                const allItems   = Array.from(innerEl.children);
                allItems.forEach(item => {
                    const rect   = item.getBoundingClientRect();
                    const itemCY = rect.top + rect.height / 2;
                    const dist   = Math.abs(itemCY - centerY) / (contRect.height / 2 || 1);
                    const clamped = Math.min(dist, 1);
                    // zoom suave: 1.12 no centro, 1.0 fora — nunca encolhe
                    const scale  = 1.0 + (1 - clamped) * (1 - clamped) * 0.12;
                    item.style.transform       = 'scale(' + scale.toFixed(3) + ')';
                    item.style.transformOrigin = 'left center';
                    item.style.transition      = 'none';
                });
            }

            _raf = requestAnimationFrame(_tick);
        }

        function _start() {
            if (_running) return;
            _buildClones();
            if (!_overflow()) return;
            _running = true;
            _paused  = false;
            if (!_raf) _raf = requestAnimationFrame(_tick);
        }

        function _resetItemScales() {
            Array.from(innerEl.children).forEach(item => {
                item.style.transform      = '';
                item.style.transformOrigin = '';
            });
        }

        function _stop() {
            _running = false;
            _paused  = false;
            if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
            _offset = 0;
            innerEl.style.transform = '';
            _clones().forEach(c => c.remove());
            _resetItemScales();
        }

        function _pauseResume() {
            _paused = true;
            clearTimeout(_pauseT);
            _pauseT = setTimeout(() => {
                _paused = false;
                if (_running && !_raf) _raf = requestAnimationFrame(_tick);
            }, 1400);
        }

        // Debounced restart chamado pelo setter do innerHTML
        let _restartT = null;
        function _scheduleRestart() {
            clearTimeout(_restartT);
            _restartT = setTimeout(() => {
                _stop();
                if (_overflow()) {
                    _start();
                } else {
                    _resetItemScales();
                }
                _atualizarSetas();
            }, 60);
        }

        // ── Wheel sobre o chip inteiro ──
        const chip = document.getElementById('statusChipInner') || container.parentElement;
        if (chip) {
            chip.addEventListener('wheel', e => {
                e.preventDefault();
                e.stopPropagation();
                if (!_running || _loopH <= 0) return;
                _pauseResume();
                _offset += e.deltaY > 0 ? 20 : -20;
                if (_offset < 0)       _offset += _loopH;
                if (_offset >= _loopH) _offset -= _loopH;
                innerEl.style.transform = 'translateY(' + (-_offset).toFixed(2) + 'px)';
            }, { passive: false });
        }

        // ── Setas ──
        const arrowUp   = document.getElementById('ledArrowUp');
        const arrowDown = document.getElementById('ledArrowDown');

        function _atualizarSetas() {
            if (!arrowUp || !arrowDown) return;
            const cor  = document.getElementById('statusModoLabel')?.style.color || '#22c55e';
            const neon = '0 0 6px ' + cor + ',0 0 12px ' + cor;
            [arrowUp, arrowDown].forEach(b => { b.style.color = cor; b.style.textShadow = neon; });
            arrowUp.style.display   = 'none';
            arrowDown.style.display = 'none';
        }

        window.ledScroll = function(dir) {
            if (!_running || _loopH <= 0) return;
            _pauseResume();
            _offset += dir * 18;
            if (_offset < 0)       _offset += _loopH;
            if (_offset >= _loopH) _offset -= _loopH;
            innerEl.style.transform = 'translateY(' + (-_offset).toFixed(2) + 'px)';
        };

        window._atualizarSetasLed = _atualizarSetas;
        window._syncCardHeight    = function() {};

        // Inicia na primeira renderização
        setTimeout(() => {
            if (_overflow()) _start();
            _atualizarSetas();
        }, 400);
    })();

    (function initBodyParticles() {
        const canvas = document.createElement('canvas');
        canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;pointer-events:none;z-index:0;';
        document.body.style.position = 'relative';
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        const COUNT = 88;
        const colors = [
            [255, 60,  0],
            [255, 100, 0],
            [255, 140, 0],
            [255, 165, 0],
            [255, 200, 0],
            [255, 220, 0],
            [255, 80,  20],
            [240, 50,  0],
            [255, 180, 0],
            [255, 120, 10],
        ];
        let W, H, particles;

        function resize() {
            W = canvas.width  = document.body.scrollWidth;
            H = canvas.height = document.body.scrollHeight;
            canvas.style.height = H + 'px';
        }

        function mkParticle() {
            const [r,g,b] = colors[Math.floor(Math.random() * colors.length)];
            const baseAlpha = Math.random() < 0.25
                ? Math.random() * 0.35 + 0.45   // iluminadas
                : Math.random() * 0.25 + 0.15;  // médias — todas visíveis
            return {
                x: Math.random() * W,
                y: Math.random() * H,
                r: Math.random() * 1.76 + 0.4,
                vx: (Math.random() - 0.5) * 0.25,
                vy: (Math.random() - 0.5) * 0.25,
                baseAlpha,
                alpha: baseAlpha,
                cr: r, cg: g, cb: b,
                // oscilação de brilho independente por partícula
                phase: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.008 + 0.003,
                amp:   Math.random() * 0.18 + 0.08,
            };
        }

        function init() {
            resize();
            particles = Array.from({ length: COUNT }, mkParticle);
        }

        function draw() {
            ctx.clearRect(0, 0, W, H);
            particles.forEach(p => {
                // movimento
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
                if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;

                // oscilação lenta de brilho
                p.phase += p.speed;
                p.alpha = Math.max(0.05, p.baseAlpha + Math.sin(p.phase) * p.amp);

                const {cr, cg, cb, alpha, r} = p;

                // halo neon externo — bem difuso
                const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 10);
                glow.addColorStop(0,   `rgba(${cr},${cg},${cb},${(alpha * 0.25).toFixed(3)})`);
                glow.addColorStop(0.2, `rgba(${cr},${cg},${cb},${(alpha * 0.10).toFixed(3)})`);
                glow.addColorStop(0.5, `rgba(${cr},${cg},${cb},${(alpha * 0.03).toFixed(3)})`);
                glow.addColorStop(1,   `rgba(${cr},${cg},${cb},0)`);
                ctx.beginPath();
                ctx.arc(p.x, p.y, r * 10, 0, Math.PI * 2);
                ctx.fillStyle = glow;
                ctx.fill();

                // núcleo — pequeno e suave
                ctx.beginPath();
                ctx.arc(p.x, p.y, r * 0.6, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${cr},${cg},${cb},${Math.min(1, alpha * 0.7).toFixed(3)})`;
                ctx.shadowBlur  = 4;
                ctx.shadowColor = `rgba(${cr},${cg},${cb},0.5)`;
                ctx.fill();
                ctx.shadowBlur = 0;
            });
            requestAnimationFrame(draw);
        }

        new ResizeObserver(resize).observe(document.body);
        init();
        draw();
    })();

