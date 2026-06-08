// chart_config.js — configuração global de gráficos com crosshair e tooltip rico

// Plugin crosshair — linha vertical dourada que segue o cursor
const CrosshairPlugin = {
  id: 'crosshair',
  afterDraw(chart) {
    if (!chart._crossX) return;
    const {ctx, chartArea: {top, bottom}} = chart;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(chart._crossX, top);
    ctx.lineTo(chart._crossX, bottom);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(245,166,35,0.6)';
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.restore();
  },
  afterEvent(chart, args) {
    const e = args.event;
    if(e.type === 'mousemove') { chart._crossX = e.x; chart.draw(); }
    else if(e.type === 'mouseout') { chart._crossX = null; chart.draw(); }
  }
};

// Registra o plugin globalmente
if(typeof Chart !== 'undefined') {
  Chart.register(CrosshairPlugin);
}

// Função global para criar gráfico com tooltip rico
function createChart(canvasId, labels, data, color, bgColor) {
  const canvas = document.getElementById(canvasId);
  if(!canvas) return null;

  return new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: color,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: color,
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        fill: true,
        backgroundColor: bgColor,
        tension: 0.35
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(17,17,19,0.95)',
          borderColor: 'rgba(245,166,35,0.3)',
          borderWidth: 1,
          titleColor: '#9B9896',
          bodyColor: '#F0EDE8',
          padding: 10,
          displayColors: false,
          callbacks: {
            title: (items) => items[0]?.label || '',
            label: (ctx) => {
              const val = ctx.parsed.y;
              return `  R$ ${val.toFixed(2)}`;
            },
            afterLabel: (ctx) => {
              const data = ctx.dataset.data;
              const i = ctx.dataIndex;
              if(i > 0 && data[i-1]) {
                const chg = ((data[i] - data[i-1]) / data[i-1] * 100);
                return `  ${chg >= 0 ? '▲' : '▼'} ${chg.toFixed(2)}%`;
              }
              return '';
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,.04)' },
          ticks: {
            color: '#5E5C58',
            font: { size: 10, family: 'DM Mono' },
            maxTicksLimit: 10,
            maxRotation: 0
          }
        },
        y: {
          grid: { color: 'rgba(255,255,255,.04)' },
          ticks: {
            color: '#5E5C58',
            font: { size: 10, family: 'DM Mono' },
            callback: v => 'R$' + (v >= 1000 ? (v/1000).toFixed(1)+'k' : v.toFixed(0))
          }
        }
      }
    }
  });
}

// Aplica defaults globais após Chart.js carregar
document.addEventListener('DOMContentLoaded', () => {
  if(typeof Chart === 'undefined') return;
  
  // Registra o plugin crosshair globalmente
  Chart.register(CrosshairPlugin);
  
  // Defaults globais para todos os charts
  Chart.defaults.interaction = { mode: 'index', intersect: false };
  Chart.defaults.plugins.tooltip = {
    ...Chart.defaults.plugins.tooltip,
    enabled: true,
    backgroundColor: 'rgba(17,17,19,0.95)',
    borderColor: 'rgba(245,166,35,0.3)',
    borderWidth: 1,
    titleColor: '#9B9896',
    bodyColor: '#F0EDE8',
    padding: 10,
    displayColors: false,
    callbacks: {
      label: (ctx) => `  R$ ${ctx.parsed.y.toFixed(2)}`,
      afterLabel: (ctx) => {
        const d = ctx.dataset.data;
        const i = ctx.dataIndex;
        if(i > 0 && d[i-1]) {
          const chg = ((d[i] - d[i-1]) / d[i-1] * 100);
          return `  ${chg >= 0 ? '▲' : '▼'} ${Math.abs(chg).toFixed(2)}%`;
        }
        return '';
      }
    }
  };
});
