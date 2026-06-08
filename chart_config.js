// chart_config.js — crosshair instantâneo via overlay canvas

function createChart(canvasId, labels, data, color, bgColor) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  // Cria overlay transparente sobre o canvas para capturar mouse
  const wrapper = canvas.parentElement;
  wrapper.style.position = 'relative';

  // Remove overlay antigo se existir
  const oldOverlay = wrapper.querySelector('.chart-overlay');
  if (oldOverlay) oldOverlay.remove();

  const overlay = document.createElement('canvas');
  overlay.className = 'chart-overlay';
  overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;';
  wrapper.appendChild(overlay);

  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: color,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 0,
        fill: true,
        backgroundColor: bgColor,
        tension: 0.35
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false } // desativa tooltip nativo
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,.04)' },
          ticks: { color: '#5E5C58', font: { size: 10, family: 'DM Mono' }, maxTicksLimit: 10, maxRotation: 0 }
        },
        y: {
          grid: { color: 'rgba(255,255,255,.04)' },
          ticks: { color: '#5E5C58', font: { size: 10, family: 'DM Mono' }, callback: v => 'R$' + (v >= 1000 ? (v/1000).toFixed(1)+'k' : v.toFixed(0)) }
        }
      }
    }
  });

  // Tooltip customizado
  let tooltip = document.getElementById('chart-tooltip-global');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'chart-tooltip-global';
    tooltip.style.cssText = `
      position:fixed;pointer-events:none;z-index:9999;
      background:rgba(17,17,19,0.95);border:1px solid rgba(245,166,35,0.4);
      border-radius:8px;padding:8px 12px;font-family:'DM Mono',monospace;
      font-size:12px;color:#F0EDE8;display:none;
      box-shadow:0 4px 20px rgba(0,0,0,0.5);min-width:120px;
    `;
    document.body.appendChild(tooltip);
  }

  // Handler de mouse
  wrapper.style.pointerEvents = 'all';
  canvas.style.pointerEvents = 'all';

  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const ca = chart.chartArea;
    if (!ca || mouseX < ca.left || mouseX > ca.right || mouseY < ca.top || mouseY > ca.bottom) {
      overlay.getContext('2d').clearRect(0, 0, overlay.width, overlay.height);
      tooltip.style.display = 'none';
      return;
    }

    // Sincroniza tamanho do overlay
    overlay.width = canvas.width;
    overlay.height = canvas.height;

    // Encontra o ponto mais próximo
    const xScale = chart.scales.x;
    const yScale = chart.scales.y;
    const pct = (mouseX - ca.left) / (ca.right - ca.left);
    const idx = Math.round(pct * (data.length - 1));
    const clampedIdx = Math.max(0, Math.min(data.length - 1, idx));

    const px = xScale.getPixelForValue(clampedIdx);
    const py = yScale.getPixelForValue(data[clampedIdx]);

    // Desenha crosshair
    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // Linha vertical
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(px, ca.top);
    ctx.lineTo(px, ca.bottom);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(245,166,35,0.7)';
    ctx.setLineDash([4, 4]);
    ctx.stroke();

    // Ponto destacado
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.stroke();
    ctx.restore();

    // Tooltip
    const val = data[clampedIdx];
    const label = labels[clampedIdx] || '';
    const prev = clampedIdx > 0 ? data[clampedIdx - 1] : null;
    const chg = prev ? ((val - prev) / prev * 100) : 0;
    const chgStr = prev ? `${chg >= 0 ? '▲' : '▼'} ${Math.abs(chg).toFixed(2)}%` : '';
    const chgColor = chg >= 0 ? '#22C87A' : '#E8503A';

    tooltip.innerHTML = `
      <div style="color:#9B9896;font-size:10px;margin-bottom:4px">${label}</div>
      <div style="font-size:15px;font-weight:700">R$ ${val.toFixed(2)}</div>
      ${chgStr ? `<div style="color:${chgColor};font-size:11px;margin-top:2px">${chgStr}</div>` : ''}
    `;

    // Posiciona tooltip
    let tx = e.clientX + 16;
    let ty = e.clientY - 40;
    if (tx + 150 > window.innerWidth) tx = e.clientX - 150;
    if (ty < 0) ty = e.clientY + 16;

    tooltip.style.left = tx + 'px';
    tooltip.style.top = ty + 'px';
    tooltip.style.display = 'block';
  }

  function onMouseLeave() {
    overlay.getContext('2d').clearRect(0, 0, overlay.width, overlay.height);
    tooltip.style.display = 'none';
  }

  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseleave', onMouseLeave);

  // Guarda referência para limpar depois
  chart._overlayCanvas = overlay;
  chart._onMouseMove = onMouseMove;
  chart._onMouseLeave = onMouseLeave;

  return chart;
}
