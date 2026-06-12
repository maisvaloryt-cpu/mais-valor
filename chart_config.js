// chart_config.js — crosshair, pin-on-click, seleção de período por drag

// ── Overlay interativo (crosshair, pin, drag) ─────────────────────────────
// Pode ser aplicado a qualquer chart.js existente via addChartOverlay()
function addChartOverlay(chart, canvas, labels, data, color, unit) {
  const wrapper = canvas.parentElement;
  wrapper.style.position = 'relative';

  // Remove overlay antigo se existir
  wrapper.querySelectorAll('.chart-overlay, .chart-range-bar, .chart-pin-box').forEach(el => el.remove());

  const overlay = document.createElement('canvas');
  overlay.className = 'chart-overlay';
  overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2;';
  wrapper.appendChild(overlay);

  const infoBox = document.createElement('div');
  infoBox.className = 'chart-pin-box';
  infoBox.style.cssText = `
    display:none;position:absolute;top:8px;left:50%;transform:translateX(-50%);
    background:rgba(17,17,19,0.96);border:1px solid rgba(245,166,35,0.5);
    border-radius:10px;padding:8px 16px;font-family:'JetBrains Mono',monospace;
    font-size:12px;color:#F0EDE8;z-index:10;pointer-events:none;text-align:center;
    box-shadow:0 4px 20px rgba(0,0,0,0.5);white-space:nowrap;
  `;
  wrapper.appendChild(infoBox);

  let tooltip = document.getElementById('chart-tooltip-global');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'chart-tooltip-global';
    tooltip.style.cssText = `
      position:fixed;pointer-events:none;z-index:9999;
      background:rgba(17,17,19,0.95);border:1px solid rgba(245,166,35,0.4);
      border-radius:8px;padding:8px 12px;font-family:'JetBrains Mono',monospace;
      font-size:12px;color:#F0EDE8;display:none;
      box-shadow:0 4px 20px rgba(0,0,0,0.5);min-width:120px;
    `;
    document.body.appendChild(tooltip);
  }

  wrapper.style.pointerEvents = 'all';
  canvas.style.pointerEvents = 'all';

  let pinIdx = null, isDragging = false, dragStart = null, dragEnd = null, lockedRange = null;

  function getIdx(mouseX) {
    const ca = chart.chartArea;
    if (!ca) return null;
    const pct = (mouseX - ca.left) / (ca.right - ca.left);
    return Math.max(0, Math.min(data.length - 1, Math.round(pct * (data.length - 1))));
  }

  function syncOverlaySize() { overlay.width = canvas.width; overlay.height = canvas.height; }

  function drawCrosshair(idx, pinned = false) {
    syncOverlaySize();
    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    const ca = chart.chartArea;
    const xScale = chart.scales.x, yScale = chart.scales.y;
    const px = xScale.getPixelForValue(idx);
    const py = yScale.getPixelForValue(data[idx]);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(px, ca.top); ctx.lineTo(px, ca.bottom);
    ctx.lineWidth = pinned ? 2 : 1;
    ctx.strokeStyle = pinned ? 'rgba(245,166,35,0.9)' : 'rgba(245,166,35,0.7)';
    ctx.setLineDash(pinned ? [] : [4, 4]); ctx.stroke();
    ctx.beginPath(); ctx.arc(px, py, pinned ? 6 : 5, 0, Math.PI * 2);
    ctx.fillStyle = pinned ? '#F5A623' : color; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([]); ctx.stroke();
    ctx.restore();
  }

  function drawRangeSelection(i1, i2) {
    syncOverlaySize();
    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    const ca = chart.chartArea, xScale = chart.scales.x, yScale = chart.scales.y;
    const from = Math.min(i1, i2), to = Math.max(i1, i2);
    const x1 = xScale.getPixelForValue(from), x2 = xScale.getPixelForValue(to);
    ctx.save();
    ctx.fillStyle = 'rgba(245,166,35,0.08)';
    ctx.fillRect(x1, ca.top, x2 - x1, ca.bottom - ca.top);
    ctx.strokeStyle = 'rgba(245,166,35,0.5)'; ctx.lineWidth = 1; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x1, ca.top); ctx.lineTo(x1, ca.bottom); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, ca.top); ctx.lineTo(x2, ca.bottom); ctx.stroke();
    [from, to].forEach(idx => {
      const px = xScale.getPixelForValue(idx), py = yScale.getPixelForValue(data[idx]);
      ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#F5A623'; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    });
    ctx.restore();
    const v1 = data[from], v2 = data[to];
    const chgPct = ((v2 - v1) / v1 * 100);
    const chgSign = chgPct >= 0 ? '+' : '';
    const chgColor = chgPct >= 0 ? '#1FC96E' : '#E8503A';
    const pfx = unit === 'usd' ? 'US$' : unit === 'pts' ? '' : 'R$';
    const sfx = unit === 'pts' ? ' pts' : '';
    infoBox.innerHTML = `
      <span style="color:#9B9896;font-size:10px">${labels[from]} → ${labels[to]}</span><br>
      <span>${pfx}${v1.toFixed(2)}${sfx}</span>
      <span style="color:var(--text3)"> → </span>
      <span>${pfx}${v2.toFixed(2)}${sfx}</span>
      &nbsp;<span style="color:${chgColor};font-weight:700">${chgSign}${chgPct.toFixed(2)}%</span>
    `;
    infoBox.style.display = 'block';
  }

  function showTooltip(e, idx) {
    const val = data[idx], lbl = labels[idx] || '';
    const prev = idx > 0 ? data[idx - 1] : null;
    const chg = prev ? ((val - prev) / prev * 100) : 0;
    const chgStr = prev ? `${chg >= 0 ? '▲' : '▼'} ${Math.abs(chg).toFixed(2)}%` : '';
    const chgColor = chg >= 0 ? '#22C87A' : '#E8503A';
    tooltip.innerHTML = `
      <div style="color:#9B9896;font-size:10px;margin-bottom:4px">${lbl}</div>
      <div style="font-size:15px;font-weight:700">${unit === 'usd' ? 'US$' : unit === 'pts' ? '' : 'R$'}${val.toFixed(2)}${unit === 'pts' ? ' pts' : ''}</div>
      ${chgStr ? `<div style="color:${chgColor};font-size:11px;margin-top:2px">${chgStr}</div>` : ''}
    `;
    let tx = e.clientX + 16, ty = e.clientY - 40;
    if (tx + 160 > window.innerWidth) tx = e.clientX - 160;
    if (ty < 0) ty = e.clientY + 16;
    tooltip.style.left = tx + 'px'; tooltip.style.top = ty + 'px'; tooltip.style.display = 'block';
  }

  function hideTooltip() { tooltip.style.display = 'none'; }

  function clearAll() {
    syncOverlaySize();
    overlay.getContext('2d').clearRect(0, 0, overlay.width, overlay.height);
    infoBox.style.display = 'none';
    hideTooltip();
  }

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const ca = chart.chartArea;
    if (!ca || mouseX < ca.left || mouseX > ca.right) return;
    if (lockedRange) { lockedRange = null; pinIdx = null; clearAll(); return; }
    isDragging = true; dragStart = getIdx(mouseX); dragEnd = null;
  });

  canvas.addEventListener('mousemove', (e) => {
    if (lockedRange) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left, mouseY = e.clientY - rect.top;
    const ca = chart.chartArea;
    if (!ca || mouseX < ca.left || mouseX > ca.right || mouseY < ca.top || mouseY > ca.bottom) {
      if (!pinIdx && !isDragging) clearAll(); return;
    }
    const idx = getIdx(mouseX);
    if (isDragging && dragStart !== null) {
      dragEnd = idx;
      if (Math.abs(dragEnd - dragStart) > 1) { drawRangeSelection(dragStart, dragEnd); hideTooltip(); }
      else { drawCrosshair(idx, false); showTooltip(e, idx); }
    } else if (pinIdx !== null) {
      drawCrosshair(pinIdx, true);
      const v1 = data[pinIdx], v2 = data[idx];
      const chgPct = ((v2 - v1) / v1 * 100);
      const chgSign = chgPct >= 0 ? '+' : '';
      const chgColor = chgPct >= 0 ? '#1FC96E' : '#E8503A';
      const pfx2 = unit === 'usd' ? 'US$' : unit === 'pts' ? '' : 'R$';
      const sfx2 = unit === 'pts' ? ' pts' : '';
      infoBox.innerHTML = `
        <div style="font-size:15px;font-weight:700;line-height:1">${pfx2}${v1.toFixed(2)} <span style="color:var(--text3);font-weight:400">→</span> ${pfx2}${v2.toFixed(2)}${sfx2}</div>
        <div style="display:flex;justify-content:space-between;gap:16px;margin-top:3px">
          <span style="color:#9B9896;font-size:10px">${labels[pinIdx]} → ${labels[idx]}</span>
          <span style="color:${chgColor};font-size:11px;font-weight:700">${chgSign}${chgPct.toFixed(2)}%</span>
        </div>
      `;
      infoBox.style.display = 'block';
      hideTooltip();
    } else { drawCrosshair(idx, false); showTooltip(e, idx); }
  });

  canvas.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const ca = chart.chartArea;
    isDragging = false;
    if (dragEnd !== null && Math.abs(dragEnd - dragStart) > 1) {
      drawRangeSelection(dragStart, dragEnd); pinIdx = null; lockedRange = { from: dragStart, to: dragEnd };
    } else {
      if (ca && mouseX >= ca.left && mouseX <= ca.right) {
        const idx = getIdx(mouseX);
        if (pinIdx === idx) { pinIdx = null; infoBox.style.display = 'none'; clearAll(); }
        else if (pinIdx !== null) {
          const from = Math.min(pinIdx, idx), to = Math.max(pinIdx, idx);
          drawRangeSelection(from, to); pinIdx = null; lockedRange = { from, to };
        } else {
          pinIdx = idx;
          const pfxPin = unit === 'usd' ? 'US$' : unit === 'pts' ? '' : 'R$';
          const sfxPin = unit === 'pts' ? ' pts' : '';
          infoBox.innerHTML = `
            <div style="font-size:15px;font-weight:700;line-height:1">${pfxPin}${data[idx].toFixed(2)}${sfxPin}</div>
            <div style="color:#F5A623;font-size:10px;margin-top:3px">${labels[idx]}</div>
          `;
          infoBox.style.display = 'block';
          drawCrosshair(idx, true);
        }
      }
    }
    dragStart = null; dragEnd = null;
  });

  canvas.addEventListener('mouseleave', () => {
    isDragging = false;
    if (lockedRange) return;
    if (pinIdx === null) clearAll(); else hideTooltip();
  });

  canvas.addEventListener('dblclick', () => {
    pinIdx = null; dragStart = null; dragEnd = null; lockedRange = null; clearAll();
  });

  chart._overlayCanvas = overlay;
}

// ── createChart: cria o gráfico + aplica overlay ──────────────────────────
function createChart(canvasId, labels, data, color, bgColor, unit) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const wrapper = canvas.parentElement;

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
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,.04)' },
          ticks: { color: '#5E5C58', font: { size: 10, family: 'JetBrains Mono' }, maxTicksLimit: 10, maxRotation: 0 }
        },
        y: {
          grace: '5%',
          grid: { color: 'rgba(255,255,255,.04)' },
          ticks: { color: '#5E5C58', font: { size: 10, family: 'JetBrains Mono' }, callback: v => {
            const prefix = unit === 'usd' ? 'US$' : unit === 'pts' ? '' : 'R$';
            const suffix = unit === 'pts' ? ' pts' : '';
            return prefix + (v >= 1000 ? (v/1000).toFixed(1)+'k' : v.toFixed(0)) + suffix;
          } }
        }
      }
    }
  });

  addChartOverlay(chart, canvas, labels, data, color, unit);
  return chart;
}
