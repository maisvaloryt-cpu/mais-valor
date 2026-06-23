    // ── CORES DO GRÁFICO — substituíveis por tema ──
    window._coresChart = {
        green:     '#32CD32', dimGreen:  'rgba(50,205,50,0.18)',
        orange:    '#FF8C00', dimOrange: 'rgba(255,140,0,0.18)',
        blue:      '#00BFFF', dimBlue:   'rgba(0,191,255,0.18)',
        yellow:    '#FFCC00', dimYellow: 'rgba(255,204,0,0.18)',
    };
    window._chartBgColor   = '#1a1a22';
    window._chartGridColor = '#1f1f24';
    window._chartTickColor = '#8e8e93';

    // ── TEMA: dark / light / pastel / cute ──
    const _temas = [
        { key: 'dark',   icon: '🌙', label: 'Dark'   },
        { key: 'light',  icon: '☀️',  label: 'Claro'  },
        { key: 'pastel', icon: '🍂', label: 'Marrom' },
        { key: 'cute',   icon: '🌸', label: 'Cute'   },
    ];
    let _temaAtual = localStorage.getItem('mvTema') || 'dark';

    const _themeCSS = {
        dark: `
            #statusModoLabel { color: #22c55e !important; font-family: 'Courier New', monospace !important; letter-spacing: 1.5px !important; text-shadow: 0 0 6px rgba(34,197,94,0.9), 0 0 14px rgba(34,197,94,0.6), 0 0 28px rgba(34,197,94,0.3) !important; }
            #ledModoDot { background: #22c55e !important; box-shadow: 0 0 6px 1px rgba(34,197,94,0.7) !important; }
            #statusFuncoesAtivas span { color: #22c55e !important; text-shadow: 0 0 5px rgba(34,197,94,0.8), 0 0 12px rgba(34,197,94,0.4) !important; }
            #logoWrapper { box-shadow: -4px 5px 14px rgba(0,0,0,0.55), -3px 4px 10px 1px rgba(255,204,0,0.3) !important; }
        `,
        light: `
            body { background-color:#f0ede8 !important; color:#1a1714 !important; }
            .text-white { color:#1a1714 !important; }
            .text-gray-200 { color:#3a322a !important; }
            .text-gray-300 { color:#5a4f46 !important; }
            .text-gray-400 { color:#7a6e65 !important; }
            .text-gray-500 { color:#9a8e85 !important; }
            .text-gray-600 { color:#b4a89f !important; }
            .bg-\\[\\#0f0f12\\], .bg-\\[\\#0a0a0d\\] { background-color:#e8e2da !important; }
            .bg-\\[\\#16161a\\] { background-color:#ddd7ce !important; }
            .bg-\\[\\#1e1e24\\] { background-color:#d4cdc4 !important; }
            .border-\\[\\#24242b\\] { border-color:#c4bdb4 !important; }
            .border-\\[\\#2d2d37\\], .border-\\[\\#2a2a38\\], .border-\\[\\#3a3a48\\] { border-color:#b8b2aa !important; }
            .dark-card { background-color:rgba(255,255,255,0.18) !important; border-color:#d4cfc8 !important; box-shadow: 0 2px 8px rgba(160,140,120,0.18), 0 6px 24px rgba(140,120,100,0.12), inset 0 1px 0 rgba(255,255,255,0.6) !important; }
            #cardsGrid .dark-card { box-shadow: 0 2px 8px rgba(160,140,120,0.15), 0 4px 16px rgba(140,120,100,0.1) !important; }
            .smart-section { box-shadow: 0 2px 8px rgba(160,140,120,0.14), 0 4px 14px rgba(140,120,100,0.09) !important; }
            #themeCycleBtn { background:#d4cdc4 !important; border-color:#b8b0a6 !important; color:#5a4f46 !important; }
            #themeCycleBtn:hover { background:#c8c0b6 !important; border-color:#a89e94 !important; }
            #modoToggleWrap { background-color:#ddd7ce !important; border-color:#c4bdb4 !important; }
            #modoSlider { background:#c87830 !important; }
            #btnModoSimples:not(.text-toggle-active) { color:#7a6e65 !important; }
            #btnModoCompleto:not(.text-toggle-active) { color:#7a6e65 !important; }
            #btnModoSimples.text-toggle-active, #btnModoCompleto.text-toggle-active { color:#fff8ee !important; }
            .input-field { background-color:#f7f4f0 !important; border-color:#d4cfc8 !important; color:#1a1714 !important; }
            .btn-toggle-ativo { background:linear-gradient(135deg,#c87830,#a85e1a) !important; color:#fff8ee !important; box-shadow:0 1px 4px rgba(160,90,20,0.35) !important; }
            .text-toggle-active { color:#fff8ee !important; }
            #btnTaxaAnual:not(.btn-toggle-ativo), #btnTaxaMensal:not(.btn-toggle-ativo),
            #btnPeriodoAnos:not(.btn-toggle-ativo), #btnPeriodoMeses:not(.btn-toggle-ativo) { color:#7a6e65 !important; background:transparent !important; }
            input[type="checkbox"]:not([style]) { accent-color:#c87830; }
            [data-theme="light"] #statusChipFrame { background:linear-gradient(145deg,#f0f0f0,#888888,#ffffff,#666666,#e0e0e0) !important; }
            [data-theme="light"] #statusChipInner { background:#c8b89a !important; }
            [data-theme="light"] #statusChipInner > div:first-child {
                background: radial-gradient(ellipse at 50% 50%, transparent 15%, rgba(60,35,10,0.55) 100%) !important;
            }
            [data-theme="light"] #statusModoLabel { color:#FF8C00 !important; text-shadow: 0 0 6px rgba(255,140,0,0.9), 0 0 14px rgba(255,140,0,0.6), 0 0 28px rgba(255,140,0,0.3) !important; }
            [data-theme="light"] #ledModoDot { background:#FF8C00 !important; box-shadow:0 0 6px 1px rgba(255,140,0,0.8) !important; }
            [data-theme="light"] #statusFuncoesAtivas span { color:#FF8C00 !important; text-shadow: 0 0 5px rgba(255,140,0,0.8), 0 0 12px rgba(255,140,0,0.4) !important; }
        `,
        pastel: `
            body { background-color:#201810 !important; color:#f5e8d8 !important; }
            .text-white { color:#f5e8d8 !important; }
            .text-gray-200 { color:#e8d5be !important; }
            .text-gray-300 { color:#d4b896 !important; }
            .text-gray-400 { color:#c4a882 !important; }
            .text-gray-500 { color:#a8896e !important; }
            .text-gray-600 { color:#8a6e55 !important; }
            .bg-\\[\\#0f0f12\\], .bg-\\[\\#0a0a0d\\] { background-color:#241a12 !important; }
            .bg-\\[\\#16161a\\] { background-color:#3a2c20 !important; }
            .bg-\\[\\#1e1e24\\] { background-color:#4a3828 !important; }
            .border-\\[\\#24242b\\] { border-color:#6a5240 !important; }
            .border-\\[\\#2d2d37\\], .border-\\[\\#2a2a38\\], .border-\\[\\#3a3a48\\] { border-color:#7a6250 !important; }
            .dark-card { background-color:rgba(38,22,10,0.48) !important; border-color:#6a5240 !important; box-shadow: 0 2px 8px rgba(20,12,6,0.45), 0 6px 24px rgba(10,6,3,0.3), inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.25) !important; }
            #cardTotal, #cardJuros, #cardInvestido, #cardRenda, #cardPoupInvest, #cardPoupPoupanca, #cardPoupCorrente { background-color:rgba(32,18,8,0.42) !important; }
            .smart-section { box-shadow: 0 2px 8px rgba(20,12,6,0.38), 0 4px 16px rgba(10,6,3,0.24) !important; }
            #modoToggleWrap { background-color:#3a2c20 !important; border-color:#6a5240 !important; }
            #modoSlider { background:#e8a84a !important; }
            #btnModoSimples:not(.text-toggle-active) { color:#a8896e !important; }
            #btnModoCompleto:not(.text-toggle-active) { color:#a8896e !important; }
            #btnModoSimples.text-toggle-active, #btnModoCompleto.text-toggle-active { color:#1a0f05 !important; }
            .input-field { background-color:#241a12 !important; border-color:#6a5240 !important; color:#f5e8d8 !important; }
            .btn-toggle-ativo { background:linear-gradient(135deg,#e8a84a,#c8882a) !important; color:#1a0f05 !important; box-shadow:0 1px 4px rgba(200,120,20,0.35) !important; }
            .text-toggle-active { color:#1a0f05 !important; }
            #btnTaxaAnual:not(.btn-toggle-ativo), #btnTaxaMensal:not(.btn-toggle-ativo),
            #btnPeriodoAnos:not(.btn-toggle-ativo), #btnPeriodoMeses:not(.btn-toggle-ativo) { color:#a8896e !important; background:transparent !important; }
            input[type="checkbox"]:not([style]) { accent-color:#e8a84a; }
            #logoWrapper { box-shadow: -4px 5px 14px rgba(0,0,0,0.55), -3px 4px 10px 1px rgba(232,168,74,0.35) !important; }
            [data-theme="pastel"] #statusChipFrame { background:linear-gradient(145deg,#c9a84c,#8b6914,#e8c96a,#7a5a0e,#c9a84c) !important; }
            [data-theme="pastel"] #statusChipInner { background:#6a4a2e !important; }
            [data-theme="pastel"] #statusChipInner > div:first-child {
                background: radial-gradient(ellipse at 50% 50%, transparent 25%, rgba(30,15,5,0.38) 100%) !important;
            }
            [data-theme="pastel"] #statusModoLabel { color:#FF8C00 !important; text-shadow: 0 0 6px rgba(255,140,0,0.9), 0 0 14px rgba(255,140,0,0.6), 0 0 28px rgba(255,140,0,0.3) !important; }
            [data-theme="pastel"] #ledModoDot { background:#FF8C00 !important; box-shadow:0 0 6px 1px rgba(255,140,0,0.8) !important; }
            [data-theme="pastel"] #statusFuncoesAtivas span { color:#FF8C00 !important; text-shadow: 0 0 5px rgba(255,140,0,0.8), 0 0 12px rgba(255,140,0,0.4) !important; }
        `,
        cute: `
            body { color:#3a1828 !important; }
            .text-white { color:#3a1828 !important; }
            .text-gray-200 { color:#4a2838 !important; }
            .text-gray-300 { color:#6a3850 !important; }
            .text-gray-400 { color:#7a4860 !important; }
            .text-gray-500 { color:#9a6880 !important; }
            .text-gray-600 { color:#b088a0 !important; }
            .bg-\\[\\#0f0f12\\], .bg-\\[\\#0a0a0d\\] { background-color:#f0d8e8 !important; }
            .bg-\\[\\#16161a\\] { background-color:#ead0e0 !important; }
            .bg-\\[\\#1e1e24\\] { background-color:#e0c4d8 !important; }
            .border-\\[\\#24242b\\] { border-color:#d0a8c0 !important; }
            .border-\\[\\#2d2d37\\], .border-\\[\\#2a2a38\\], .border-\\[\\#3a3a48\\] { border-color:#c498b0 !important; }
            .dark-card { border-color:#dbb0c8 !important; box-shadow: 0 2px 8px rgba(180,80,120,0.12), 0 6px 22px rgba(140,60,100,0.09), inset 0 1px 0 rgba(255,255,255,0.5) !important; }
            #cardsGrid .dark-card { box-shadow: 0 2px 8px rgba(180,80,120,0.12), 0 4px 16px rgba(140,60,100,0.08) !important; }
            .smart-section { box-shadow: 0 2px 8px rgba(180,80,120,0.1), 0 4px 14px rgba(140,60,100,0.07) !important; }
            #statusLedPanel { background-color:#fae8f0 !important; border-color:#dbb0c8 !important; }
            #themeCycleBtn { background:#e8c4d8 !important; border-color:#cc99b8 !important; color:#7a4860 !important; }
            #themeCycleBtn:hover { background:#ddb8ce !important; border-color:#b87fa0 !important; }
            #modoToggleWrap { background-color:#ead0e0 !important; border-color:#d0a8c0 !important; }
            #modoSlider { background:linear-gradient(135deg,#b070d8,#8850b8) !important; }
            #btnModoSimples:not(.text-toggle-active) { color:#9a6880 !important; }
            #btnModoCompleto:not(.text-toggle-active) { color:#9a6880 !important; }
            #btnModoSimples.text-toggle-active, #btnModoCompleto.text-toggle-active { color:#fff0ff !important; }
            .input-field { background-color:#f5dde8 !important; border-color:#d0a8c0 !important; color:#3a1828 !important; }
            #cardTotal    { border-top-color:#e0507a !important; }
            #cardJuros    { border-top-color:#9060c8 !important; }
            #cardInvestido { border-top-color:#40b8b0 !important; }
            #cardRenda    { border-top-color:#c88050 !important; }
            #cardTotal::after    { background: radial-gradient(ellipse at 50% 0%, rgba(224,80,122,0.14) 0%, transparent 70%) !important; }
            #cardJuros::after    { background: radial-gradient(ellipse at 50% 0%, rgba(144,96,200,0.14) 0%, transparent 70%) !important; }
            #cardInvestido::after { background: radial-gradient(ellipse at 50% 0%, rgba(64,184,176,0.14) 0%, transparent 70%) !important; }
            #cardRenda::after    { background: radial-gradient(ellipse at 50% 0%, rgba(200,128,80,0.14) 0%, transparent 70%) !important; }
            #kpiTotal    { color:#e0507a !important; }
            #kpiJuros    { color:#9060c8 !important; }
            #kpiInvestido { color:#40b8b0 !important; }
            #kpiRendaAnual { color:#c88050 !important; }
            #cardTotal:hover    { box-shadow: 0 12px 40px rgba(224,80,122,0.18), 0 4px 16px rgba(0,0,0,0.06) !important; }
            #cardJuros:hover    { box-shadow: 0 12px 40px rgba(144,96,200,0.18), 0 4px 16px rgba(0,0,0,0.06) !important; }
            #cardInvestido:hover { box-shadow: 0 12px 40px rgba(64,184,176,0.18), 0 4px 16px rgba(0,0,0,0.06) !important; }
            #cardRenda:hover    { box-shadow: 0 12px 40px rgba(200,128,80,0.18), 0 4px 16px rgba(0,0,0,0.06) !important; }
            [data-theme="cute"] #ledModoDot {
                background: radial-gradient(circle at 35% 35%, #ff6eb0, #e8186e) !important;
                box-shadow: 0 0 0 2px rgba(255,255,255,0.6), 0 0 10px 3px rgba(232,24,110,0.6), 0 0 20px 6px rgba(232,24,110,0.25) !important;
                width: 13px !important; height: 13px !important;
            }
            [data-theme="cute"] #statusChipFrame {
                background: linear-gradient(160deg,
                    #fde8f4 0%, #c8709a 30%, #f8d0e8 55%, #b85888 80%, #fde8f4 100%
                ) !important;
                box-shadow:
                    0 1px 2px rgba(160,60,100,0.35),
                    0 6px 20px rgba(180,80,120,0.28),
                    inset 0 1px 0 rgba(255,255,255,0.75),
                    inset 0 -1px 0 rgba(160,60,100,0.35) !important;
                border-radius: 14px !important;
                padding: 3px !important;
            }
            [data-theme="cute"] #statusChipInner {
                background: #fce8f2 !important;
                background-image:
                    radial-gradient(circle, rgba(212,24,110,0.18) 1px, transparent 1px) !important;
                background-size: 4px 4px !important;
                border-radius: 12px !important;
                box-shadow:
                    inset 0 0 0 1px rgba(200,100,150,0.25),
                    inset 0 0 28px 8px rgba(180,60,110,0.18),
                    inset 0 1px 3px rgba(180,80,120,0.15) !important;
            }
            [data-theme="cute"] #statusChipInner::before {
                content: '' !important;
                position: absolute !important; top: 0 !important; left: 0 !important; right: 0 !important; height: 52% !important;
                background: linear-gradient(170deg, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0.18) 55%, transparent 100%) !important;
                pointer-events: none !important; z-index: 4 !important; border-radius: 12px 12px 0 0 !important;
            }
            [data-theme="cute"] #statusModoLabel {
                color: #d4186e !important;
                font-family: 'Courier New', monospace !important;
                font-size: 10px !important;
                font-weight: 900 !important;
                letter-spacing: 2px !important;
                text-shadow: 0 0 6px rgba(212,24,110,0.9), 0 0 14px rgba(212,24,110,0.6), 0 0 28px rgba(212,24,110,0.3) !important;
            }
            @media (max-width: 768px) {
                [data-theme="cute"] #statusModoLabel {
                    font-size: 8px !important;
                    letter-spacing: 0px !important;
                }
                [data-theme="cute"] #statusChipInner {
                    padding: 4px 7px !important;
                    overflow: hidden !important;
                }
                [data-theme="cute"] #statusChipFrame {
                    padding: 2px !important;
                    border-radius: 8px !important;
                }
                [data-theme="cute"] #statusFuncoesAtivas {
                    height: 28px !important;
                }
            }
            [data-theme="cute"] #statusFuncoesAtivas span { color:#d4186e !important; text-shadow: 0 0 5px rgba(212,24,110,0.8), 0 0 12px rgba(212,24,110,0.4) !important; }
            [data-theme="cute"] #statusChipInner > div:first-child {
                background: radial-gradient(ellipse at 50% 50%, transparent 15%, rgba(120,25,65,0.58) 100%) !important;
            }
            #cardsGrid .dark-card { box-shadow: 0 4px 16px rgba(180,80,120,0.08) !important; }
            #comentarioTotal, #comentarioJuros, #comentarioAporteMensal, #comentarioRenda { color:#9a6880 !important; }
            .easter-modal-box { background:linear-gradient(145deg,#f5d8ec,#eecce4) !important; border-color:rgba(155,112,200,0.5) !important; }
            .easter-modal-box h2 { color:#8b4abf !important; }
            .easter-modal-box p { color:#7a4860 !important; }
            #easterEggModal { background:rgba(220,160,190,0.4) !important; }
            #easterKeyInput { background:#f0d0e4 !important; border-color:rgba(155,112,200,0.4) !important; color:#8b4abf !important; }
            .btn-toggle-ativo { background:linear-gradient(135deg,#b070d8,#8850b8) !important; color:#fff0ff !important; box-shadow:0 1px 6px rgba(144,80,200,0.4) !important; }
            .text-toggle-active { color:#fff0ff !important; }
            #btnTaxaAnual:not(.btn-toggle-ativo), #btnTaxaMensal:not(.btn-toggle-ativo),
            #btnPeriodoAnos:not(.btn-toggle-ativo), #btnPeriodoMeses:not(.btn-toggle-ativo) { color:#9a6880 !important; background:transparent !important; }
            input[type="checkbox"]:not([style]) { accent-color:#b070d8; }
        `,
    };

    // Banners têm inline style !important — só JS consegue sobrescrever
    const _bannerColors = {
        dark:   { bg:'linear-gradient(135deg,#141420,#0f0f18)', border:'#1f1f2a' },
        light:  { bg:'linear-gradient(135deg,#d8d0c6,#ccc4ba)', border:'#b8b0a6' },
        pastel: { bg:'linear-gradient(135deg,#3a2c20,#2a1f14)', border:'#6a5240' },
        cute:   { bg:'linear-gradient(135deg,#f0d8e8,#e8ccde)', border:'#d0a8c0' },
    };

    function _aplicarBanners(key) {
        const bc = _bannerColors[key] || _bannerColors.dark;
        const bS = document.getElementById('bannerSuperior');
        const bL = document.getElementById('bannerLateral');
        if (bS) { bS.style.background = bc.bg; bS.style.borderColor = bc.border; }
        if (bL) { bL.style.background = bc.bg; bL.style.borderColor = bc.border; }
    }

    function _atualizarDisplayTema(key) {
        const chipInner = document.getElementById('statusChipInner');
        const chipFrame = document.getElementById('statusChipFrame');
        if (!chipInner || !chipFrame) return;

        const configs = {
            dark:   { bg: 'radial-gradient(ellipse at 50% 50%,#0d150d 0%,#060a06 60%,#030603 100%)', frame: 'linear-gradient(145deg,#5a5a5a,#2a2a2a,#4a4a4a,#1a1a1a)' },
            light:  { bg: '#f7f4f0', frame: 'linear-gradient(145deg,#d0ccc6,#b0aca6,#e0dcd6,#8a8680)' },
            pastel: { bg: '#3a2c20', frame: 'linear-gradient(145deg,#c9a84c,#8b6914,#e8c96a,#7a5a0e,#c9a84c)' },
            cute:   { bg: 'none', frame: 'linear-gradient(145deg,#f5c8dc 0%,#e8a0c0 15%,#fce0ec 30%,#d4789c 50%,#fce0ec 70%,#e8a0c0 85%,#f5c8dc 100%)' },
        };
        const c = configs[key] || configs.dark;
        chipInner.style.background = c.bg;
        chipFrame.style.background = c.frame;

        // No tema dark, força verde explicitamente (outros temas são cobertos pelo CSS override)
        if (key === 'dark') {
            const labelEl = document.getElementById('statusModoLabel');
            const ledDot  = document.getElementById('ledModoDot');
            const funcoesEl = document.getElementById('statusFuncoesAtivas');
            if (labelEl) labelEl.style.color = '#22c55e';
            if (ledDot)  { ledDot.style.background = '#22c55e'; ledDot.style.boxShadow = '0 0 6px 1px rgba(34,197,94,0.7)'; }
            if (funcoesEl) funcoesEl.querySelectorAll('span').forEach(s => s.style.color = '#22c55e');
        }
        // No tema cute, força o fundo com dots via JS (complementa o CSS)
        if (key === 'cute') {
            const inner = document.getElementById('statusChipInner');
            if (inner) {
                inner.style.background = '#fce8f2';
                inner.style.backgroundImage = 'radial-gradient(circle, rgba(212,24,110,0.18) 1px, transparent 1px)';
                inner.style.backgroundSize = '4px 4px';
                inner.style.borderRadius = '12px';
            }
        }
    }

    function _aplicarTema(key) {
        const tema = _temas.find(t => t.key === key) || _temas[0];
        document.documentElement.setAttribute('data-theme', key === 'dark' ? '' : key);
        document.getElementById('themeOverride').textContent = _themeCSS[key] || '';
        document.getElementById('themeIcon').textContent  = tema.icon;
        document.getElementById('themeLabel').textContent = tema.label;
        localStorage.setItem('mvTema', key);
        _temaAtual = key;

        if (key === 'cute') {
            window._coresChart = { green:'#e0507a', dimGreen:'rgba(224,80,122,0.2)', orange:'#9060c8', dimOrange:'rgba(144,96,200,0.2)', blue:'#40b8b0', dimBlue:'rgba(64,184,176,0.2)', yellow:'#c88050', dimYellow:'rgba(200,128,80,0.2)' };
            window._chartBgColor   = '#f0d8e8';
            window._chartGridColor = '#dbb0c8';
            window._chartTickColor = '#9a6880';
            window._chartTitleColor = '#6b2050';
            window._chartBodyColor  = '#7a4060';
        } else if (key === 'light') {
            window._coresChart = { green:'#32CD32', dimGreen:'rgba(50,205,50,0.18)', orange:'#FF8C00', dimOrange:'rgba(255,140,0,0.18)', blue:'#00BFFF', dimBlue:'rgba(0,191,255,0.18)', yellow:'#FFCC00', dimYellow:'rgba(255,204,0,0.18)' };
            window._chartBgColor   = '#e8e2da';
            window._chartGridColor = '#c8bfb5';
            window._chartTickColor = '#7a6e65';
            window._chartTitleColor = '#3a2c1a';
            window._chartBodyColor  = '#5a4a36';
        } else if (key === 'pastel') {
            window._coresChart = { green:'#32CD32', dimGreen:'rgba(50,205,50,0.18)', orange:'#FF8C00', dimOrange:'rgba(255,140,0,0.18)', blue:'#00BFFF', dimBlue:'rgba(0,191,255,0.18)', yellow:'#FFCC00', dimYellow:'rgba(255,204,0,0.18)' };
            window._chartBgColor   = '#2a1f15';
            window._chartGridColor = '#5a4030';
            window._chartTickColor = '#a8896e';
            window._chartTitleColor = '#f5e8d8';
            window._chartBodyColor  = '#c4a882';
        } else {
            window._coresChart = { green:'#32CD32', dimGreen:'rgba(50,205,50,0.18)', orange:'#FF8C00', dimOrange:'rgba(255,140,0,0.18)', blue:'#00BFFF', dimBlue:'rgba(0,191,255,0.18)', yellow:'#FFCC00', dimYellow:'rgba(255,204,0,0.18)' };
            window._chartBgColor   = '#1a1a22';
            window._chartGridColor = '#1f1f24';
            window._chartTickColor = '#8e8e93';
            window._chartTitleColor = '#ffffff';
            window._chartBodyColor  = '#d1d5db';
        }
        // Sincroniza bolinhas das legendas com as cores reais do gráfico
        const _dotMap = { legendTotal:'green', legendJuros:'orange', legendAportes:'blue', legendRenda:'yellow' };
        Object.entries(_dotMap).forEach(([id, k]) => {
            const dot = document.getElementById(id)?.querySelector('.legend-dot');
            if (dot) dot.style.background = window._coresChart[k] || '';
        });
        if (typeof executarPipelineCore === 'function') {
            executarPipelineCore();
        }

        // Display de modo: fundo segue o tema
        _atualizarDisplayTema(key);
        if (typeof atualizarStatusLed === 'function') atualizarStatusLed();

        // Banners: inline style !important só JS consegue sobrescrever
        _aplicarBanners(key);
        // Reaplica cores do slider de modo ao trocar tema
        setTimeout(() => _atualizarSlider(modoAtual), 20);
    }

    function ciclaTema() {
        const idx = _temas.findIndex(t => t.key === _temaAtual);
        const next = _temas[(idx + 1) % _temas.length];
        _aplicarTema(next.key);
    }

    _aplicarTema(_temaAtual);

    // ── TILT 3D em todos os .dark-card ──
    // Cores específicas por ID de card KPI; demais usam neutro
    const _cardColorMap = {
        cardTotal:    [50,205,50],
        cardJuros:    [255,140,0],
        cardInvestido:[0,191,255],
        cardRenda:    [255,204,0],
        cardPoupInvest:   [50,205,50],
        cardPoupPoupanca: [255,140,0],
        cardPoupCorrente: [239,68,68],
        cardAtrasoHoje:   [50,205,50],
        cardAtrasoDepois: [59,130,246],
    };
    const _cardColorDefault = [120,120,160]; // neutro roxo-azulado para cards sem cor

    // Perspective no pai dos KPI cards
    const _cardsGrid = document.getElementById('cardsGrid');
    if (_cardsGrid) _cardsGrid.style.perspective = '1200px';

    document.querySelectorAll('.dark-card').forEach(el => {
        const [r,g,b] = _cardColorMap[el.id] || _cardColorDefault;
        el.style.transformStyle = 'preserve-3d';

        // Overlay de luz — inserido uma vez (evita duplicata em re-execuções)
        let spec = el.querySelector('.__tilt-spec');
        if (!spec) {
            spec = document.createElement('div');
            spec.className = '__tilt-spec';
            spec.style.cssText = 'position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:1;transition:background 0.12s ease;';
            el.appendChild(spec);
        }

        el.addEventListener('mousemove', e => {
            const rect = el.getBoundingClientRect();
            const nx = (e.clientX - rect.left) / rect.width  - 0.5;
            const ny = (e.clientY - rect.top)  / rect.height - 0.5;
            el.style.transition = 'box-shadow 0.1s ease';
            el.style.transform = `rotateY(${nx*10}deg) rotateX(${-ny*10}deg) translateZ(8px)`;
            el.style.boxShadow = `${-nx*10}px ${ny*10+12}px 28px rgba(0,0,0,0.38), 0 0 20px rgba(${r},${g},${b},0.15)`;
            const px = (nx+0.5)*100, py = (ny+0.5)*100;
            spec.style.background = `radial-gradient(circle at ${px}% ${py}%, rgba(220,60,20,0.08) 0%, rgba(180,40,10,0.03) 30%, transparent 55%)`;
        });
        el.addEventListener('mouseleave', () => {
            el.style.transition = 'transform 0.5s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s ease';
            el.style.transform = '';
            el.style.boxShadow = '';
            spec.style.background = '';
        });
    });

    // ── EMOTION DESIGN: breathing glow + sparkle sequencial suave nos pontos ──
    (function() {
        let glowT = 0;
        let sparkleT = 0;
        const SPARKLE_DURATION = 60;
        const SPARKLE_DATASET = 2; // Patrimônio Total (verde, primeiro card)

        const baseCanvas = document.getElementById('chartPatrimonio');
        if (!baseCanvas) return;
        const wrapper = baseCanvas.parentElement;
        const overlayCanvas = document.createElement('canvas');
        overlayCanvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:2;';
        wrapper.appendChild(overlayCanvas);

        function syncOverlay() {
            const dpr = window.devicePixelRatio || 1;
            overlayCanvas.width  = baseCanvas.offsetWidth  * dpr;
            overlayCanvas.height = baseCanvas.offsetHeight * dpr;
            overlayCanvas.style.width  = baseCanvas.offsetWidth  + 'px';
            overlayCanvas.style.height = baseCanvas.offsetHeight + 'px';
        }

        function loop() {
            if (!myChart) {
                const _ctx = overlayCanvas.getContext('2d');
                _ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
                requestAnimationFrame(loop);
                return;
            }

            // breathing glow
            glowT += 0.010;
            window._neonGlowBlur = 6 + Math.sin(glowT) * 5;

            // sparkle com janela deslizante de 3 pontos
            syncOverlay();
            const ctx = overlayCanvas.getContext('2d');
            const dpr = window.devicePixelRatio || 1;
            ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
            ctx.save();
            ctx.scale(dpr, dpr);

            const nPts = myChart.data.labels ? myChart.data.labels.length : 0;
            const _sparkleData = myChart.data.datasets[SPARKLE_DATASET]?.data || [];
            const _hasRealData = _sparkleData.some(v => v > 0);
            if (nPts > 0 && _hasRealData) {
                const cycle    = sparkleT / SPARKLE_DURATION;
                const curIdx   = Math.floor(cycle % nPts);
                const progress = (cycle % 1); // 0→1 dentro do ponto atual

                // onda gaussiana centrada no curIdx — intensidade extra, nunca apaga
                for (let offset = -2; offset <= 2; offset++) {
                    const idx = (curIdx + offset + nPts) % nPts;
                    // distância contínua ao centro da onda (0=centro, ±2=bordas)
                    const dist = offset - progress + 0.5; // desloca suavemente
                    // gaussiana: pico=1 no centro, cai nas bordas
                    const extra = Math.exp(-(dist * dist) / 1.2);

                    if (extra < 0.05) continue;

                    const meta = myChart.getDatasetMeta(SPARKLE_DATASET);
                    if (!meta || meta.hidden || !meta.data[idx]) continue;
                    const pt    = meta.data[idx];
                    const color = myChart.data.datasets[SPARKLE_DATASET].borderColor;
                    if (typeof color !== 'string') continue;
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
                    ctx.fillStyle   = color;
                    ctx.globalAlpha = extra * 0.85;
                    ctx.shadowBlur  = 20 * extra;
                    ctx.shadowColor = color;
                    ctx.fill();
                    ctx.restore();
                }

                const sparkleStep = nPts >= 13 ? 7.2
                    : nPts >= 7  ? 7.2 * (nPts / 13)
                    :              7.2 * (nPts / 13) * 0.55;
                sparkleT += sparkleStep;
            }
            ctx.restore();

            requestAnimationFrame(loop);
        }

        window._neonGlowBlur = 10;

        const _origBefore = neonGlowPlugin.beforeDatasetDraw;
        neonGlowPlugin.beforeDatasetDraw = function(chart, args) {
            const ctx = chart.ctx;
            const borderColor = args.meta.dataset.options.borderColor;
            ctx.save();
            ctx.shadowBlur  = window._neonGlowBlur || 10;
            ctx.shadowColor = typeof borderColor === 'string' ? borderColor : '#32CD32';
        };

        loop();
    })();
