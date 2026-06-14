/* ── MOBILE LAYOUT: parâmetros + cards lado a lado ── */
(function() {
    // Busca elementos pela classe sem usar querySelector com escape
    function getByClass(cls) {
        var all = document.getElementsByTagName('div');
        for (var i = 0; i < all.length; i++) {
            if (all[i].classList.contains(cls)) return all[i];
        }
        return null;
    }

    function applyMobileLayout() {
        var isMobile = window.innerWidth <= 768;
        var row = document.getElementById('mv-mobile-row');

        if (isMobile) {
            if (row) return;

            var sidebar   = getByClass('lg:col-span-1');
            var colSpan3  = getByClass('lg:col-span-3');
            var cardsGrid = document.getElementById('cardsGrid');
            if (!sidebar || !colSpan3 || !cardsGrid) return;

            var grid = sidebar.parentElement;
            if (!grid) return;

            row = document.createElement('div');
            row.id = 'mv-mobile-row';
            grid.insertBefore(row, sidebar);
            row.appendChild(sidebar);    // parâmetros à esquerda
            row.appendChild(cardsGrid);  // cards à direita

        } else {
            if (!row) return;

            var grid      = row.parentElement;
            var sidebar   = getByClass('lg:col-span-1');
            var colSpan3  = getByClass('lg:col-span-3');
            var cardsGrid = document.getElementById('cardsGrid');
            if (!grid || !sidebar || !cardsGrid || !colSpan3) return;

            grid.insertBefore(sidebar, colSpan3);
            colSpan3.insertBefore(cardsGrid, colSpan3.firstChild);
            grid.removeChild(row);
        }
    }

    document.addEventListener('DOMContentLoaded', applyMobileLayout);
    var _t;
    window.addEventListener('resize', function() {
        clearTimeout(_t);
        _t = setTimeout(applyMobileLayout, 150);
    });
})();
