/* Mais Valor — motion reveal leve para os gráficos dos artigos.
   Sem bibliotecas externas. Se o navegador não suportar
   IntersectionObserver, ou se a pessoa preferir menos animação
   (prefers-reduced-motion), o script simplesmente não faz nada e
   os gráficos continuam aparecendo estáticos, como sempre. */
(function () {
  'use strict';

  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var figs = document.querySelectorAll('.art-fig');
  if (!figs.length) return;

  document.body.classList.add('mv-ready');

  // Prepara o "desenhar" das linhas/curvas (stroke-dasharray calculado
  // em tempo real, então funciona pra qualquer tamanho de gráfico).
  document.querySelectorAll('.art-fig svg .mv-draw').forEach(function (el) {
    try {
      var len = el.getTotalLength();
      el.style.strokeDasharray = String(len);
      el.style.strokeDashoffset = String(len);
      el.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(.16,.85,.24,1)';
    } catch (e) { /* elemento sem getTotalLength — ignora, fica estático */ }
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var fig = entry.target;
      fig.classList.add('mv-in');
      fig.querySelectorAll('svg .mv-draw').forEach(function (el) {
        el.style.strokeDashoffset = '0';
      });
      io.unobserve(fig);
    });
  }, { threshold: 0.3, rootMargin: '0px 0px -40px 0px' });

  figs.forEach(function (fig) { io.observe(fig); });
})();
