// ── Sentry — monitoramento de erros ──────────────────────────────
(function() {
  const s = document.createElement('script');
  s.src = 'https://browser.sentry-cdn.com/7.99.0/bundle.min.js';
  s.crossOrigin = 'anonymous';
  s.onload = function() {
    if (window.Sentry) {
      Sentry.init({
        dsn: 'https://5c73ae0a2da83db6c80acffed3530730@o4511545034932224.ingest.de.sentry.io/4511545047187536',
        environment: location.hostname.includes('localhost') ? 'development' : 'production',
        tracesSampleRate: 0.1,
      });
    }
  };
  document.head.appendChild(s);
})();

// ── Google Analytics ─────────────────────────────────────────────
(function() {
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=G-MXYNF830JM';
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', 'G-MXYNF830JM');
})();

const LOGO_SVG_HTML = `<svg preserveAspectRatio="xMidYMid meet" viewBox="0 0 577 549" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="display:block;fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><defs>
  <linearGradient id="mvSilver" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%"  stop-color="#8E9294"/>
    <stop offset="12%" stop-color="#F7F8F8"/>
    <stop offset="24%" stop-color="#9AA0A2"/>
    <stop offset="38%" stop-color="#FFFFFF"/>
    <stop offset="52%" stop-color="#7E8385"/>
    <stop offset="66%" stop-color="#EDEFEF"/>
    <stop offset="80%" stop-color="#8E9294"/>
    <stop offset="100%" stop-color="#D8DADA"/>
  </linearGradient>
  <linearGradient id="mvGold" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%"  stop-color="#7A5A17"/>
    <stop offset="14%" stop-color="#FCE8A0"/>
    <stop offset="28%" stop-color="#C8901A"/>
    <stop offset="42%" stop-color="#FFF6D6"/>
    <stop offset="56%" stop-color="#8A6212"/>
    <stop offset="70%" stop-color="#F5A623"/>
    <stop offset="85%" stop-color="#FCE8A0"/>
    <stop offset="100%" stop-color="#9C7018"/>
  </linearGradient>
</defs>
    <g id="Fundo" transform="matrix(1.478006,0,0,1.478006,-16.587114,-14.015828)">
        <clipPath id="_clip1">
            <rect x="11.223" y="0" width="411.878" height="383.706"/>
        </clipPath>
        <g clip-path="url(#_clip1)">
            <g transform="matrix(1,0,0,1,-333.061096,-217.074964)">
                <path d="M397.338,352.763C396.871,352.724 396.96,352.484 396.5,352.446C396.434,352.44 395.909,352.396 395.697,352.625C395.494,352.845 395.722,353.286 395.518,353.506C395.626,354.509 395.581,354.49 395.732,355.501C396.124,358.112 396.359,359.679 396.322,388.499C396.277,423.454 396.43,469.631 396.352,479.49C396.343,480.647 396.362,480.714 395.494,481.492C394.661,482.239 394.588,482.152 393.477,482.146C386.14,482.103 386.152,482.186 385.516,482.161C382.267,482.037 363.42,482.305 361.498,482.333C352.044,482.467 348.427,482.723 347.623,482.216C346.425,481.461 346.503,480.45 346.499,478.5C346.501,435.5 346.504,392.5 346.506,349.5C346.5,340.218 346.428,233.528 346.439,233.48C346.79,231.958 348.311,232.487 348.48,232.546C349.185,232.791 349.748,233.58 371.165,254.84C380.955,264.559 380.923,264.567 390.646,274.352C417.545,301.453 444.443,328.555 471.341,355.656C476.65,361.02 478.448,363.586 480.348,362.272C480.761,361.986 530.215,311.645 534.411,307.417C547.268,294.464 547.245,294.463 548.381,293.375C551.509,290.382 556.029,285.564 572.356,269.283C572.483,269.157 574.052,267.592 574.59,269.461C574.688,269.801 574.727,281.457 574.73,282.5C574.745,287.141 574.854,319.904 574.669,340.505C574.639,343.78 573.371,343.753 570.146,347.16C564.549,353.074 552.128,365.276 551.243,366.259C546.125,371.948 541.515,375.738 536.821,380.829C531.567,386.529 530.658,386.72 513.93,403.891C513.1,404.743 506.868,411.14 503.402,414.393C497.506,419.926 490.069,427.928 489.46,428.458C487.648,430.035 482.814,435.56 480.502,435.441C478.054,435.314 471.664,429.062 469.53,426.472C467.105,423.528 459.554,417.088 456.556,413.445C454.888,411.419 446.176,403.406 444.569,401.432C442.955,399.448 433.133,389.969 430.658,387.355C424.456,380.804 407.657,363.996 406.308,362.699C399.092,355.762 399.183,355.671 397.338,352.763Z" style="fill:url(#mvSilver);"/>
            </g>
            <g transform="matrix(1,0,0,1,-333.061096,-217.074964)">
                <path d="M734.401,229.483C734.422,231.084 734.248,231.076 734.343,249.499C734.354,251.648 734.216,261.39 734.499,265.5C734.697,268.359 734.12,293.486 734.472,299.502C734.533,300.532 734.424,301.495 734.626,303.499C734.652,303.751 734.621,307.899 734.355,307.764C732.419,306.777 732.496,306.962 732.353,306.825C729.371,303.995 726.628,302.87 721.743,299.184C719.691,297.636 719.613,297.753 717.722,296.002C717.249,295.565 717.193,295.697 716.536,295.724C716.261,295.736 715.956,295.621 715.711,295.746C714.878,296.167 699.747,326.16 694.965,333.783C693.489,336.136 688.549,346.688 676.58,368.544C671.749,377.367 672.027,377.501 667.147,386.306C665.405,389.448 653.777,411.744 653.439,412.469C651.883,415.806 640.503,435.904 637.806,441.652C634.467,448.767 633.862,448.442 630.098,456.292C629.816,456.88 626.787,462.348 623.707,468.612C618.058,480.102 617.041,479.548 614.411,485.454C613.716,487.012 608.12,498.428 606.816,500.671C603.481,506.409 595.732,521.187 594.337,524.42C592.073,529.669 591.228,529.637 585.499,529.515C579.827,529.393 579.059,529.423 578.499,529.444C577.736,529.474 576.079,529.347 575.499,529.377C566.149,529.866 564.29,529.338 558.507,529.806C555.456,530.053 555.969,528.222 555.121,523.565C554.157,518.274 553.728,513.442 548.36,484.526C547.736,481.162 547.99,481.122 540.966,442.41C540.523,439.968 537.719,422.931 537.241,420.557C536.7,417.87 535.264,408.057 534.202,402.561C532.881,395.718 533.157,395.26 534.61,393.591C535.437,392.642 535.477,392.686 541.423,386.427C542.055,385.761 542.051,385.779 555.429,372.425C555.75,372.105 564.685,363.529 568.616,359.619C571.222,357.027 573.876,353.84 574.387,357.521C574.654,359.448 574.774,359.427 578.387,381.517C578.512,382.281 581.9,400.537 583.244,409.532C584.505,417.974 587.986,432.315 588.526,439.492C588.634,440.933 589.514,441.572 589.545,441.638C589.718,441.449 590.073,441.511 590.245,441.323C590.412,441.139 590.271,441.071 591.394,438.443C592.027,436.963 592.263,437.104 600.923,420.723C606.054,411.018 606.241,411.143 611.346,401.421C625.51,374.448 625.826,374.622 627.05,372.273C628.131,370.198 630.172,366.016 630.439,365.469C631.517,363.26 641.761,345.097 645.402,337.451C645.402,337.451 676.096,281.031 678.83,275.645C679.86,273.939 680.779,273.062 677.74,271.151C672.365,267.773 672.459,267.596 666.6,265.158C666.175,264.981 664.286,264.196 661.499,262.503L659.638,261.434C659.309,261.36 659.126,261.032 658.797,260.957C658.655,260.925 657.877,260.202 658.037,260.113C658.425,259.897 657.666,260.139 659.4,259.325C663.843,257.24 663.841,257.252 715.407,234.274C716.661,233.715 723.051,230.768 730.55,227.618C731.17,227.358 733.399,226.036 734.232,226.785C734.818,227.312 734.422,229.274 734.401,229.483Z" style="fill:url(#mvGold);"/>
            </g>
            <g transform="matrix(1,0,0,1,-333.061096,-217.074964)">
                <path d="M539.483,535.721C542.974,536.008 544.894,536.057 550.564,538.365C564.088,543.871 571.079,560.215 566.742,575.574C566.391,576.817 564.232,582.439 561.173,586.244C559.675,588.108 551.308,598.519 533.499,597.521C532.293,597.454 523.103,596.524 516.705,591.261C514.514,589.459 507.694,584.182 505.553,572.49C504.063,564.354 506.084,557.713 506.457,556.487C507.823,551.997 511.431,545.281 518.681,540.795C528.327,534.827 537.018,535.638 539.483,535.721ZM537.504,585.665C538.269,585.598 543.536,585.139 546.617,582.651C551.74,578.515 553.126,572.417 552.964,567.498C552.86,564.337 553.226,559.32 549.568,553.455C547.571,550.254 542.777,548.247 538.461,547.894C515.577,546.022 517.052,576.256 526.521,582.471C531.09,585.469 533.587,585.595 537.504,585.665ZM579.499,536.535C597.544,536.739 606.95,535.193 614.695,540.184C615.002,540.382 621.334,543.401 621.757,553.491C621.873,556.247 621.293,562.686 618.235,566.279C615.629,569.341 611.715,571.392 611.604,571.579C610.842,572.866 612.724,574.228 613.132,574.78C616.7,579.603 620.13,586.621 621.743,589.366C623.002,591.507 623.005,591.48 624.414,593.551C624.677,593.939 625.555,595.457 625.561,595.498C625.593,595.718 624.856,596.621 624.555,596.663C623.862,596.76 618.983,596.69 618.498,596.684C610.334,596.567 609.287,596.759 605.41,589.552C605.115,589.004 600.917,581.672 599.705,579.389C598.622,577.35 597.943,575.615 593.5,575.449C590.161,575.324 590.701,577.672 590.688,581.5C590.639,595.054 590.941,596.094 588.492,596.447C587.691,596.563 580.001,596.49 578.501,596.557C576.016,596.666 575.911,595.982 575.911,593.497C575.91,590.16 575.723,537.997 575.834,537.624C576.264,536.175 579.47,536.535 579.499,536.535ZM597.499,564.708C597.629,564.7 605.5,565.321 607.169,557.426C607.742,554.72 606.965,547.944 598.493,547.654C597.946,547.635 592.587,547.451 591.662,547.903C591.502,547.981 591.432,548.175 591.31,548.304C590.472,549.187 590.76,549.35 590.638,555.504C590.487,563.064 590.628,564.423 592.47,564.71C592.718,564.749 597.096,564.711 597.499,564.708ZM428.502,536.414C434.114,536.61 435.408,536.135 436.676,539.434L452.427,580.526C454.921,587.033 454.821,587.052 457.583,593.469C457.766,593.895 458.565,595.406 458.075,596.158C457.657,596.801 457.492,596.83 448.499,596.532C442.988,596.349 443.022,593.54 440.018,585.682C438.801,582.501 437.922,583.257 434.506,583.251C433.15,583.249 418.419,583.226 417.559,583.67C413.857,585.585 415.804,595.842 408.503,596.529C407.866,596.589 407.874,596.433 400.511,596.738C396.171,596.917 398.054,594.465 399.037,592.293C400.356,589.377 409.015,565.767 410.328,562.432C419.232,539.803 418.857,537.154 421.512,536.548C422.774,536.26 427.833,536.405 428.502,536.414ZM431.499,572.87C431.745,572.87 434.313,572.869 434.566,572.593C435.515,571.56 432.197,563.545 429.698,555.426C428.538,551.657 428.57,551.619 428.455,551.555C428.404,551.527 426.892,551.708 426.858,551.745C426.422,552.227 427.18,552.481 424.79,559.605C423.308,564.021 423.518,564.07 422.082,568.374C421.303,570.708 421.132,570.673 421.161,571.549C421.214,573.186 421.847,572.878 423.487,572.867C425.92,572.85 425.904,572.829 431.499,572.87ZM393.507,536.583C393.709,536.572 396.547,536.347 398.503,536.459C402.456,536.686 402.521,536.648 402.978,537.079C404.046,538.085 403.359,538.281 402.691,539.602C401.835,541.296 398.273,551.162 397.384,553.457C391.354,569.022 391.487,569.063 388.258,577.406C381.37,595.202 381.194,595.193 380.601,595.619C379.878,596.14 378.382,597.215 369.495,596.556C366.603,596.341 366.851,595.295 363.982,588.301C361.854,583.111 355.673,566.512 355.298,565.584C345.551,541.445 345.874,541.333 344.848,539.317C343.096,535.872 345.639,536.298 349.504,536.373C354.633,536.473 358.159,536.273 359.597,538.428C361.192,540.816 363.117,546.793 363.359,547.544C370.499,569.717 370.714,569.632 371.326,571.562C371.462,571.991 372.992,576.821 373.005,576.926C373.025,577.072 372.842,577.204 372.874,577.348C372.916,577.54 373.108,577.665 373.205,577.837C373.322,578.043 373.301,578.372 373.512,578.478C374.324,578.886 374.37,578.542 374.744,577.721C374.812,577.571 374.977,577.468 375.015,577.307C375.051,577.154 374.922,576.994 374.951,576.839C374.981,576.67 375.131,576.544 375.184,576.382C375.28,576.082 375.314,575.765 375.394,575.461C375.838,573.754 377.479,569.11 377.672,568.562C381.919,556.546 382.794,550.719 388.068,540.278C389.683,537.08 389.954,536.934 393.507,536.583ZM476.497,536.58C478.844,536.697 479.752,536.159 479.915,538.49C480.148,541.842 479.567,541.845 479.95,580.488C479.953,580.723 479.979,583.354 479.996,583.423C480.324,584.717 480.173,585.121 481.517,585.178C483.036,585.241 483.017,584.894 500.513,585.179C503.789,585.232 503.714,586.222 503.713,589.502C503.711,594.652 503.258,595.507 502.969,595.876C501.837,597.319 501.409,596.536 485.505,596.723C482.543,596.758 470.778,596.669 469.497,596.659C466.21,596.634 465.137,596.809 465.111,593.519C464.989,577.995 465.229,578.017 465.078,562.509C465.059,560.588 464.853,539.434 464.956,538.504C465.201,536.287 466.841,536.457 468.499,536.451C472.808,536.437 475.069,536.537 476.497,536.58ZM356.092,512.487C356.162,515.493 356.164,515.477 356.156,518.492C356.132,527.643 357.164,529.759 353.524,529.832C348.994,529.923 347.473,529.92 347.352,527.52C347.17,523.906 347.287,504.501 347.299,502.499C347.361,492.379 346.817,490.08 348.473,489.437C349.609,488.995 353.816,489.231 354.522,489.326C357.663,489.746 357.791,490.837 362.852,500.309C367.144,508.34 368.518,512.021 368.711,512.378C368.79,512.523 369.585,513.99 370.476,513.45C370.87,513.212 370.872,513.174 373.121,508.335C375.015,504.26 375.131,504.332 377.12,500.312C379.37,495.765 381.657,490.498 382.73,489.857C384.428,488.843 391.015,489.395 391.482,489.548C392.776,489.971 392.59,490.447 392.589,501.499C392.586,528.002 392.682,528.147 391.997,528.993C391.667,529.4 390.986,530.24 385.479,529.64C385.302,529.621 384.015,529.481 383.589,528.462C382.873,526.753 383.809,509.995 383.898,508.392L381.376,508.422C381.16,509.052 380.25,512.264 377.867,516.717C375.99,520.223 374.081,523.956 373.524,524.522C372.363,525.7 369.234,526.22 367.484,525.541C366.843,525.292 365.31,524.697 362.662,518.426C360.735,513.862 360.523,513.977 358.667,509.397C358.345,509.604 356.57,509.166 356.248,509.373C355.976,509.548 356.352,511.929 356.092,512.487ZM442.087,498.513C441.941,498.352 441.996,490.603 442.252,490.397C442.454,490.226 442.51,489.923 442.712,489.752C443.324,489.234 445.267,489.211 445.494,489.208C448.904,489.169 450.682,489.251 451.267,489.762C451.824,490.248 451.826,490.374 451.896,502.501C452.043,528.1 452.098,528.337 451.206,529.163C450.44,529.872 448.516,529.738 448.512,529.738C443.471,529.788 442.279,529.862 442.167,526.537C442.083,524.035 442.087,500.755 442.087,498.513ZM414.49,489.258C417.769,489.253 421.146,488.824 422.239,490.646C422.393,490.902 426.624,501.537 427.364,503.552C435.514,525.723 435.964,525.532 436.663,527.461C436.72,527.619 437.204,528.956 436.543,529.554C436.221,529.845 434.654,529.758 434.489,529.749C430.391,529.521 427.787,530.101 426.498,527.501C424.753,523.98 424.752,521.518 422.443,520.899C421.827,520.734 411.437,520.848 410.388,521.148C408.083,521.807 407.698,527.01 405.699,528.754C405.26,529.137 404.61,529.704 398.48,529.735C398.3,529.736 396.654,529.745 396.601,528.485C396.581,528.029 397.454,525.746 397.543,525.513C398.866,522.053 399.776,519.323 400.544,517.517C405,507.035 404.659,506.925 410.345,492.434C411.729,488.908 412.844,489.495 414.49,489.258ZM416.431,500.268C416.22,500.36 416.114,499.731 415.902,499.822C415.64,499.936 415.601,502.717 412.868,509.635C411.797,512.347 411.374,512.383 411.857,513.222C412.321,514.027 412.487,513.827 413.426,513.862C420.657,514.137 420.849,513.74 421.119,513.184C421.653,512.08 419.06,507.592 418.211,502.61C418.18,502.428 418.041,501.612 417.647,500.372L416.431,500.268ZM470.568,522.089C471.01,522.12 472.888,522.502 474.632,521.768C477.107,520.727 478.485,515.968 473.58,514.303C467.898,512.374 458.317,511.383 458.879,500.518C459.043,497.346 461.118,490.533 469.425,489.138C469.836,489.069 476.873,487.46 483.603,491.355C485.59,492.505 485.668,493.902 484.195,496.299C481.202,501.169 479.159,497.197 474.504,496.477C468.84,495.601 466.131,501.499 471.424,503.656C477.15,505.99 487.373,506.479 486.17,518.457C485.864,521.498 483.708,526.68 478.653,528.834C469.081,532.914 458.219,526.529 457.733,525.368C457.097,523.849 460.032,519.715 461.435,519.311C462.97,518.869 465.326,520.052 465.633,520.206C468.008,521.399 468.013,521.366 470.568,522.089Z" style="fill:url(#mvSilver);"/>
            </g>
        </g>
    </g>
</svg>`;

const NAV_LINKS = [
  { href: 'index.html',        label: 'Home' },
  { href: 'acoes.html',        label: 'Ações' },
  { href: 'fiis.html',         label: 'FIIs' },
  { href: 'criptos.html',      label: 'Criptos' },
  { href: 'dividendos.html',   label: 'Dividendos' },
  { href: 'rankings.html',     label: 'Rankings' },
  { href: 'comparador.html',   label: 'Comparador' },
  { href: 'artigos/index.html', label: 'Artigos' },
  { href: 'ferramentas.html',  label: 'Ferramentas' },
  { href: 'analise.html',      label: '✦ Análise' },
  { href: 'watchlist.html',    label: '★ Watchlist' },
  { href: 'simulador.html',    label: 'Simulador' },
  { href: 'carteira/index.html', label: 'Carteira' },
  { href: 'status.html',       label: '● Status' },
];

// ── Ícones SVG dourados do dropdown Ativos (mesmo estilo do Simulador Backtest) ──
const ATIVO_ICONS = {
  acoes: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" stroke="#F5A623" stroke-width="5" stroke-opacity="0.22"/><polyline points="16 7 22 7 22 13" stroke="#F5A623" stroke-width="5" stroke-opacity="0.22"/><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" stroke="#F5A623" stroke-width="1.5"/><polyline points="16 7 22 7 22 13" stroke="#F5A623" stroke-width="1.5"/></svg>`,
  fiis: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle"><path d="M3 21h18M5 21V9l7-6 7 6v12M9 21v-6h6v6" stroke="#F5A623" stroke-width="5" stroke-opacity="0.22"/><path d="M3 21h18M5 21V9l7-6 7 6v12M9 21v-6h6v6" stroke="#F5A623" stroke-width="1.5"/></svg>`,
  dividendos: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle"><circle cx="12" cy="12" r="9" stroke="#F5A623" stroke-width="5" stroke-opacity="0.22"/><circle cx="12" cy="12" r="9" fill="#F5A623" fill-opacity="0.12" stroke="#F5A623" stroke-width="1.5"/><path d="M12 7v10M9.6 9.2c0-1.1 1.1-1.7 2.4-1.7s2.5.7 2.5 1.8c0 2.3-4.9 1.3-4.9 3.5 0 1.1 1.1 1.8 2.4 1.8s2.5-.6 2.5-1.7" stroke="#F5A623" stroke-width="1.3"/></svg>`,
  criptos: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle"><path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894M10.551 19.089L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 5.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727" stroke="#F5A623" stroke-width="5" stroke-opacity="0.22"/><path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894M10.551 19.089L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 5.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727" stroke="#F5A623" stroke-width="1.5"/></svg>`,
  bdrs: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle"><circle cx="12" cy="12" r="10" fill="#F5A623" fill-opacity="0.12" stroke="#F5A623" stroke-width="1.5"/><line x1="2" y1="12" x2="22" y2="12" stroke="#F5A623" stroke-width="1" stroke-opacity="0.75"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="#F5A623" stroke-width="1" stroke-opacity="0.75"/></svg>`,
  etfs: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" fill="#F5A623" fill-opacity="0.15" stroke="#F5A623" stroke-width="1.4" stroke-linejoin="round"/><line x1="3" y1="6" x2="21" y2="6" stroke="#F5A623" stroke-width="1.4"/><path d="M16 10a4 4 0 0 1-8 0" stroke="#F5A623" stroke-width="1.4"/></svg>`,
  reits: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle"><path d="M3 21h18M5 21V9l7-6 7 6v12M9 21v-6h6v6" stroke="#F5A623" stroke-width="5" stroke-opacity="0.22"/><path d="M3 21h18M5 21V9l7-6 7 6v12M9 21v-6h6v6" stroke="#F5A623" stroke-width="1.5"/></svg>`,
  stocks: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle"><circle cx="12" cy="12" r="10" fill="#F5A623" fill-opacity="0.12" stroke="#F5A623" stroke-width="1.5"/><line x1="2" y1="12" x2="22" y2="12" stroke="#F5A623" stroke-width="1" stroke-opacity="0.75"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="#F5A623" stroke-width="1" stroke-opacity="0.75"/></svg>`,
  rankings: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle"><path d="M7 4h10v4a5 5 0 0 1-10 0V4z" stroke="#F5A623" stroke-width="5" stroke-opacity="0.22"/><path d="M7 4h10v4a5 5 0 0 1-10 0V4z" fill="#F5A623" fill-opacity="0.15" stroke="#F5A623" stroke-width="1.5"/><path d="M7 5H4.5v1.5A3 3 0 0 0 7 9.5M17 5h2.5v1.5A3 3 0 0 1 17 9.5M9.5 21h5M12 13.5V21" stroke="#F5A623" stroke-width="1.4"/></svg>`,
};

// ── Ícones SVG dourados do dropdown Ferramentas (mesmo estilo) ──
const FERRAMENTA_ICONS = {
  simulador: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle"><rect x="4" y="11" width="3.5" height="9" rx="1" fill="#F5A623" fill-opacity="0.15" stroke="#F5A623" stroke-width="1.4"/><rect x="10.25" y="7" width="3.5" height="13" rx="1" fill="#F5A623" fill-opacity="0.15" stroke="#F5A623" stroke-width="1.4"/><rect x="16.5" y="4" width="3.5" height="16" rx="1" fill="#F5A623" fill-opacity="0.15" stroke="#F5A623" stroke-width="1.4"/></svg>`,
  calculadora: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle"><rect x="5" y="3" width="14" height="18" rx="2" fill="#F5A623" fill-opacity="0.13" stroke="#F5A623" stroke-width="1.4"/><rect x="7.5" y="5.5" width="9" height="3" rx="0.6" stroke="#F5A623" stroke-width="1.2"/><circle cx="8.5" cy="12" r="0.9" fill="#F5A623"/><circle cx="12" cy="12" r="0.9" fill="#F5A623"/><circle cx="15.5" cy="12" r="0.9" fill="#F5A623"/><circle cx="8.5" cy="15.5" r="0.9" fill="#F5A623"/><circle cx="12" cy="15.5" r="0.9" fill="#F5A623"/><circle cx="15.5" cy="15.5" r="0.9" fill="#F5A623"/></svg>`,
  comparador: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle"><path d="M12 3v18M5 7h14M8 21h8" stroke="#F5A623" stroke-width="1.4"/><path d="M5 7l-2.5 6a3 3 0 0 0 5 0L5 7zM19 7l-2.5 6a3 3 0 0 0 5 0L19 7z" fill="#F5A623" fill-opacity="0.13" stroke="#F5A623" stroke-width="1.4"/></svg>`,
  analise: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle"><path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3L12 3z" fill="#F5A623" fill-opacity="0.15" stroke="#F5A623" stroke-width="1.3"/><path d="M18 15l.7 1.8 1.8.7-1.8.7L18 20l-.7-1.8-1.8-.7 1.8-.7L18 15z" fill="#F5A623" fill-opacity="0.2" stroke="#F5A623" stroke-width="1"/></svg>`,
  outras: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle"><path d="M14.7 6.3a4 4 0 0 0-5.2 5.2L3 18l3 3 6.5-6.5a4 4 0 0 0 5.2-5.2l-2.4 2.4-2.1-.6-.6-2.1 2.4-2.4z" fill="#F5A623" fill-opacity="0.13" stroke="#F5A623" stroke-width="1.4"/></svg>`,
};

// ── Ícone de carteira (aba "Carteira"), mesmo estilo dourado dos ícones acima ──
const WALLET_ICON = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle"><path d="M17 8V5a1 1 0 0 0-1-1H6a2 2 0 0 0 0 4h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V6M20 12v4h-4a2 2 0 0 1 0-4h4" stroke="#F5A623" stroke-width="5" stroke-opacity="0.22"/><path d="M17 8V5a1 1 0 0 0-1-1H6a2 2 0 0 0 0 4h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V6M20 12v4h-4a2 2 0 0 1 0-4h4" stroke="#F5A623" stroke-width="1.5"/></svg>`;

// ── Theme toggle ─────────────────────────────────────────────────
function getTheme() { return localStorage.getItem('mv_theme') || 'dark'; }
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('mv_theme', t);
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = t === 'dark' ? '☀️' : '🌙';
}
function toggleTheme() { applyTheme(getTheme() === 'dark' ? 'light' : 'dark'); }

// ── Logo helper ───────────────────────────────────────────────────
function logoHtml(ticker, size = 32, cls = 'asset-logo') {
  const initials = ticker.replace(/\d+/g, '').slice(0, 3) || ticker.slice(0, 3);
  const avCls = size <= 26 ? 'logo-sm-avatar' : 'logo-avatar';
  return `<img
    src="https://raw.githubusercontent.com/thefintz/icones-b3/main/icones/${ticker}.png"
    style="width:${size}px;height:${size}px;border-radius:50%;object-fit:contain;background:#fff;flex-shrink:0"
    onerror="this.outerHTML='<div class=\\'${avCls}\\' style=\\'width:${size}px;height:${size}px;font-size:${Math.round(size*0.35)}px\\'>${initials}</div>'"
    loading="lazy">`;
}
window.logoHtml = logoHtml;

// ── Score fundamentalista ─────────────────────────────────────────
function calcScore(d) {
  if (!d) return null;
  let pts = 0, max = 0;
  const isFii = d.t && /\d{2}$/.test(d.t);
  // Base FIXA: dado faltando NÃO infla mais o score. Antes o total possível só
  // contava indicadores presentes, então microcap com poucos dados chegava a 100.
  // Agora cada indicador ausente simplesmente não pontua (mas conta na base).
  if (isFii) {
    max += 30; if (d.dy >= 8 && d.dy <= 25) pts += 30; else if (d.dy >= 5) pts += 15;
    max += 40; if (d.pvp > 0 && d.pvp <= 0.95) pts += 40; else if (d.pvp > 0 && d.pvp <= 1.05) pts += 20;
    // v30 real pode não existir (null nas listagens) — o critério só entra no
    // score quando há dado de verdade (na página do ativo ele é recalculado do histórico).
    if (d.v30 != null) { max += 30; if (d.v30 >= 0) pts += 30; else if (d.v30 >= -5) pts += 15; }
  } else {
    max += 25; if (d.pl > 0 && d.pl <= 15) pts += 25; else if (d.pl > 0 && d.pl <= 25) pts += 12;
    max += 15; if (d.pvp > 0 && d.pvp < 1) pts += 15; else if (d.pvp > 0 && d.pvp < 1.5) pts += 8;
    max += 20; if (d.dy >= 6) pts += 20; else if (d.dy >= 3) pts += 10;
    max += 20; if (d.roe >= 15) pts += 20; else if (d.roe >= 10) pts += 10;
    max += 10; if (d.roic >= 12) pts += 10; else if (d.roic >= 8) pts += 5;
    max += 10; if (d.mrg_liq > 10) pts += 10; else if (d.mrg_liq > 0) pts += 5;
  }
  if (!max) return null;
  return Math.round((pts / max) * 100);
}
window.calcScore = calcScore;

function scoreBadge(d) {
  const s = calcScore(d);
  if (s === null) return '';
  const cls = s >= 65 ? 'score-a' : s >= 40 ? 'score-b' : 'score-c';
  const lbl = s >= 65 ? 'A' : s >= 40 ? 'B' : 'C';
  return `<span class="score-badge ${cls}" title="Score fundamentalista: ${s}/100">${lbl} ${s}</span>`;
}
window.scoreBadge = scoreBadge;

// ── Base path (para subpastas como /Consolidador/) ────────────────
const NAV_BASE = window.NAV_BASE_PATH || '';

// ── BCB data ──────────────────────────────────────────────────────
async function loadBCBNav() {
  try {
    const r = await fetch(NAV_BASE + 'data/bcb.json');
    if (!r.ok) return;
    const j = await r.json();
    window.BCB_DATA = j;
    if (j.cdi?.anual) {
      document.querySelectorAll('.tk-selic').forEach(el => { el.textContent = j.cdi.anual.toFixed(2) + '%'; });
    }
    if (j.ipca?.acumulado_12m) {
      document.querySelectorAll('.tk-ipca').forEach(el => { el.textContent = j.ipca.acumulado_12m.toFixed(2) + '%'; });
    }
  } catch(e) {}
}

// ── Verifica se hoje é dia de COPOM ──────────────────────────────
function isCopomDay() {
  const COPOM_DATES = [
    '2025-01-29','2025-03-19','2025-05-07','2025-06-18',
    '2025-07-30','2025-09-17','2025-11-05','2025-12-10',
    '2026-01-28','2026-03-18','2026-05-06','2026-06-17',
    '2026-07-29','2026-09-16','2026-11-04','2026-12-09',
  ];
  const today = new Date().toISOString().slice(0, 10);
  return COPOM_DATES.includes(today);
}

// ── Live indices ──────────────────────────────────────────────────
// Índices BR/EUA vêm do indices.json gerado pelo Actions (brapi com token via Secret).
// AwesomeAPI é gratuita e usada aqui para câmbio e cripto em tempo real.
// A brapi NÃO é chamada no browser — evita consumo do limite gratuito.
async function fetchLiveIndices() {
  const result = {};
  await Promise.allSettled([
    // Câmbio ao vivo
    fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,GBP-BRL,JPY-BRL,ARS-BRL')
      .then(r => r.json())
      .then(d => {
        if (d.USDBRL?.bid) result.dolar = { val: +parseFloat(d.USDBRL.bid).toFixed(4), chg: +parseFloat(d.USDBRL.pctChange).toFixed(2) };
        if (d.EURBRL?.bid) result.euro  = { val: +parseFloat(d.EURBRL.bid).toFixed(4), chg: +parseFloat(d.EURBRL.pctChange).toFixed(2) };
        if (d.GBPBRL?.bid) result.gbp   = { val: +parseFloat(d.GBPBRL.bid).toFixed(4), chg: +parseFloat(d.GBPBRL.pctChange).toFixed(2) };
        if (d.JPYBRL?.bid) result.jpy   = { val: +parseFloat(d.JPYBRL.bid).toFixed(4), chg: +parseFloat(d.JPYBRL.pctChange).toFixed(2) };
        if (d.ARSBRL?.bid) result.ars   = { val: +parseFloat(d.ARSBRL.bid).toFixed(4), chg: +parseFloat(d.ARSBRL.pctChange).toFixed(2) };
      }).catch(() => {}),
    // Cripto ao vivo
    fetch('https://economia.awesomeapi.com.br/json/last/BTC-USD,ETH-USD,SOL-USD,BNB-USD')
      .then(r => r.json())
      .then(d => {
        if (d.BTCUSD?.bid) result.btc = { val: +parseFloat(d.BTCUSD.bid).toFixed(0), chg: +parseFloat(d.BTCUSD.pctChange).toFixed(2) };
        if (d.ETHUSD?.bid) result.eth = { val: +parseFloat(d.ETHUSD.bid).toFixed(0), chg: +parseFloat(d.ETHUSD.pctChange).toFixed(2) };
        if (d.SOLUSD?.bid) result.sol = { val: +parseFloat(d.SOLUSD.bid).toFixed(2), chg: +parseFloat(d.SOLUSD.pctChange).toFixed(2) };
        if (d.BNBUSD?.bid) result.bnb = { val: +parseFloat(d.BNBUSD.bid).toFixed(2), chg: +parseFloat(d.BNBUSD.pctChange).toFixed(2) };
      }).catch(() => {}),
  ]);
  return result;
}

function fmtNum(v, dec = 0) {
  if (!v?.val || v.val <= 0) return '—';
  return v.val.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function chgClass(v) { return (v?.chg || 0) >= 0 ? 'up-pill' : 'dn-pill'; }
function chgStr(v)   { return v?.chg != null ? `${v.chg >= 0 ? '+' : ''}${v.chg.toFixed(2)}%` : ''; }
function pillHtml(v) { return v?.val > 0 ? `<span class="pill ${chgClass(v)}">${chgStr(v)}</span>` : ''; }

async function loadIndicesNav() {
  const [jsonResult, liveResult] = await Promise.allSettled([
    fetch(NAV_BASE + 'data/indices.json').then(r => r.ok ? r.json() : {}),
    fetchLiveIndices(),
  ]);

  const fromJson = jsonResult.status === 'fulfilled' ? (jsonResult.value || {}) : {};
  const fromLive = liveResult.status  === 'fulfilled' ? (liveResult.value || {}) : {};

  // Live (AwesomeAPI) tem prioridade; fallback para JSON do Actions
  const pick = (key) => {
    const live = fromLive[key], json = fromJson[key];
    if (live?.val && live.val > 0) return live;
    if (json?.val && json.val > 0) return json;
    return null;
  };

  const j = {
    ibov:     pick('ibov'),
    ifix:     pick('ifix'),
    small:    pick('small'),
    idiv:     pick('idiv'),
    ibra:     pick('ibra'),
    ifnc:     pick('ifnc'),
    sp500:    pick('sp500'),
    nasdaq:   pick('nasdaq'),
    dow:      pick('dow'),
    russell:  pick('russell'),
    dolar:    pick('dolar'),
    euro:     pick('euro'),
    gbp:      pick('gbp'),
    jpy:      pick('jpy'),
    ars:      pick('ars'),
    btc:      pick('btc'),
    eth:      pick('eth'),
    sol:      pick('sol'),
    bnb:      pick('bnb'),
    ouro:     pick('ouro'),
    prata:    pick('prata'),
    petroleo: pick('petroleo'),
  };

  const buildTickerItems = () => {
    const items = [];
    // Índices BR
    if (j.ibov)     items.push(`<div class="ticker-item"><span class="ticker-name">IBOV</span><span class="ticker-val">${fmtNum(j.ibov)}</span>${pillHtml(j.ibov)}</div>`);
    if (j.ifix)     items.push(`<div class="ticker-item"><span class="ticker-name">IFIX</span><span class="ticker-val">${fmtNum(j.ifix)}</span>${pillHtml(j.ifix)}</div>`);
    if (j.small)    items.push(`<div class="ticker-item"><span class="ticker-name">SMALL</span><span class="ticker-val">${fmtNum(j.small)}</span>${pillHtml(j.small)}</div>`);
    if (j.idiv)     items.push(`<div class="ticker-item"><span class="ticker-name">IDIV</span><span class="ticker-val">${fmtNum(j.idiv)}</span>${pillHtml(j.idiv)}</div>`);
    if (j.ibra)     items.push(`<div class="ticker-item"><span class="ticker-name">IBrA</span><span class="ticker-val">${fmtNum(j.ibra)}</span>${pillHtml(j.ibra)}</div>`);
    if (j.ifnc)     items.push(`<div class="ticker-item"><span class="ticker-name">IFNC</span><span class="ticker-val">${fmtNum(j.ifnc)}</span>${pillHtml(j.ifnc)}</div>`);
    // Índices EUA
    if (j.sp500)    items.push(`<div class="ticker-item"><span class="ticker-name">S&P 500</span><span class="ticker-val">${fmtNum(j.sp500)}</span>${pillHtml(j.sp500)}</div>`);
    if (j.nasdaq)   items.push(`<div class="ticker-item"><span class="ticker-name">NASDAQ</span><span class="ticker-val">${fmtNum(j.nasdaq)}</span>${pillHtml(j.nasdaq)}</div>`);
    if (j.dow)      items.push(`<div class="ticker-item"><span class="ticker-name">DOW</span><span class="ticker-val">${fmtNum(j.dow)}</span>${pillHtml(j.dow)}</div>`);
    if (j.russell)  items.push(`<div class="ticker-item"><span class="ticker-name">RUSSELL</span><span class="ticker-val">${fmtNum(j.russell)}</span>${pillHtml(j.russell)}</div>`);
    // Câmbio
    if (j.dolar)    items.push(`<div class="ticker-item"><span class="ticker-name">USD/BRL</span><span class="ticker-val">R$${fmtNum(j.dolar,4)}</span>${pillHtml(j.dolar)}</div>`);
    if (j.euro)     items.push(`<div class="ticker-item"><span class="ticker-name">EUR/BRL</span><span class="ticker-val">R$${fmtNum(j.euro,4)}</span>${pillHtml(j.euro)}</div>`);
    if (j.gbp)      items.push(`<div class="ticker-item"><span class="ticker-name">GBP/BRL</span><span class="ticker-val">R$${fmtNum(j.gbp,4)}</span>${pillHtml(j.gbp)}</div>`);
    if (j.jpy)      items.push(`<div class="ticker-item"><span class="ticker-name">JPY/BRL</span><span class="ticker-val">R$${fmtNum(j.jpy,4)}</span>${pillHtml(j.jpy)}</div>`);
    if (j.ars)      items.push(`<div class="ticker-item"><span class="ticker-name">ARS/BRL</span><span class="ticker-val">R$${fmtNum(j.ars,4)}</span>${pillHtml(j.ars)}</div>`);
    // Commodities
    if (j.ouro)     items.push(`<div class="ticker-item"><span class="ticker-name">OURO</span><span class="ticker-val">US$${fmtNum(j.ouro,0)}</span>${pillHtml(j.ouro)}</div>`);
    if (j.prata)    items.push(`<div class="ticker-item"><span class="ticker-name">PRATA</span><span class="ticker-val">US$${fmtNum(j.prata,2)}</span>${pillHtml(j.prata)}</div>`);
    if (j.petroleo) items.push(`<div class="ticker-item"><span class="ticker-name">PETRÓLEO</span><span class="ticker-val">US$${fmtNum(j.petroleo,2)}</span>${pillHtml(j.petroleo)}</div>`);
    // Cripto
    if (j.btc)      items.push(`<div class="ticker-item"><span class="ticker-name">BTC</span><span class="ticker-val">US$${fmtNum(j.btc,0)}</span>${pillHtml(j.btc)}</div>`);
    if (j.eth)      items.push(`<div class="ticker-item"><span class="ticker-name">ETH</span><span class="ticker-val">US$${fmtNum(j.eth,0)}</span>${pillHtml(j.eth)}</div>`);
    if (j.sol)      items.push(`<div class="ticker-item"><span class="ticker-name">SOL</span><span class="ticker-val">US$${fmtNum(j.sol,2)}</span>${pillHtml(j.sol)}</div>`);
    if (j.bnb)      items.push(`<div class="ticker-item"><span class="ticker-name">BNB</span><span class="ticker-val">US$${fmtNum(j.bnb,2)}</span>${pillHtml(j.bnb)}</div>`);
    // Renda fixa (BCB)
    items.push(`<div class="ticker-item"><span class="ticker-name">IPCA 12m</span><span class="ticker-val tk-ipca">—</span></div>`);
    if (isCopomDay()) {
      items.push(`<div class="ticker-item" style="border-color:rgba(245,166,35,0.4)"><span class="ticker-name" style="color:var(--gold)">🔔 SELIC</span><span class="ticker-val tk-selic">—</span></div>`);
    }
    setTimeout(() => {
      if (typeof ACOES !== 'undefined' && ACOES.length) {
        const topLiquid = [...ACOES]
          .filter(a => a.volNum > 0)
          .sort((a, b) => (b.volNum || 0) - (a.volNum || 0))
          .slice(0, 6);
        const track = document.getElementById('ticker-track');
        if (track && topLiquid.length) {
          const extraHtml = topLiquid.map(a => {
            const cls = a.v >= 0 ? 'up-pill' : 'dn-pill';
            const sign = a.v >= 0 ? '+' : '';
            return `<div class="ticker-item">
              <span class="ticker-name">${a.t}</span>
              <span class="ticker-val">R$${a.p.toFixed(2)}</span>
              <span class="pill ${cls}">${sign}${a.v.toFixed(2)}%</span>
            </div>`;
          }).join('');
          const current = track.innerHTML.slice(0, track.innerHTML.length / 2);
          track.innerHTML = (current + extraHtml) + (current + extraHtml);
        }
      }
    }, 3000);
    return items.join('');
  };

  const track = document.getElementById('ticker-track');
  if (track) {
    const html = buildTickerItems();
    track.innerHTML = html + html;
  }

  const setCard = (valId, chgId, data, decimals = 0, prefix = '') => {
    const valEl = document.getElementById(valId);
    const chgEl = document.getElementById(chgId);
    if (!data) return;
    if (valEl) valEl.textContent = prefix + fmtNum(data, decimals);
    if (chgEl) {
      chgEl.textContent = chgStr(data);
      chgEl.className = `idx-chg ${(data.chg || 0) >= 0 ? 'up' : 'dn'}`;
    }
  };

  if (j.ibov) {
    const el = document.getElementById('idx-ibov');
    if (el) el.textContent = fmtNum(j.ibov);
    const ec = document.getElementById('idx-ibov-chg');
    if (ec) {
      ec.textContent = `${(j.ibov.chg_pts||0) >= 0 ? '+' : ''}${(j.ibov.chg_pts||0).toFixed(0)} pts (${chgStr(j.ibov)})`;
      ec.className = `idx-chg ${j.ibov.chg >= 0 ? 'up' : 'dn'}`;
    }
  }
  setCard('idx-ifix',     'idx-ifix-chg',     j.ifix);
  setCard('idx-small',    'idx-small-chg',    j.small);
  setCard('idx-idiv',     'idx-idiv-chg',     j.idiv);
  setCard('idx-sp500',    'idx-sp500-chg',    j.sp500);
  setCard('idx-nasdaq',   'idx-nasdaq-chg',   j.nasdaq);
  setCard('idx-dolar',    'idx-dolar-chg',    j.dolar,    4, 'R$ ');
  setCard('idx-euro',     'idx-euro-chg',     j.euro,     4, 'R$ ');
  setCard('idx-btc',      'idx-btc-chg',      j.btc,      0, 'US$ ');
  setCard('idx-eth',      'idx-eth-chg',      j.eth,      0, 'US$ ');
  setCard('idx-ouro',     'idx-ouro-chg',     j.ouro,     0, 'US$ ');
  setCard('idx-petroleo', 'idx-petroleo-chg', j.petroleo, 2, 'US$ ');

  setTimeout(loadBCBNav, 300);
}

// ── Hambúrguer mobile ─────────────────────────────────────────────
function toggleMobileMenu() {
  const menu = document.getElementById('nav-mobile-menu');
  const btn  = document.getElementById('nav-hamburger');
  if (!menu) return;
  const open = menu.classList.toggle('open');
  if (btn) btn.innerHTML = open ? '✕' : '☰';
  document.body.style.overflow = open ? 'hidden' : '';
}

function renderNavSlim() {
  const page = location.pathname.split('/').pop() || 'index.html';
  const links = NAV_LINKS.map(l => {
    const cls = page === l.href.split('/').pop() ? 'active' : '';
    return `<a href="${NAV_BASE}${l.href}" class="${cls}">${l.label}</a>`;
  }).join('');
  document.getElementById('nav-placeholder').innerHTML = `
  <style>
  .nav-slim{
    position:sticky;top:0;z-index:200;
    background:rgba(8,8,9,0.95);
    backdrop-filter:blur(20px);
    border-bottom:1px solid var(--border,rgba(255,255,255,0.06));
    padding:0 2rem;
    display:flex;align-items:center;gap:0;
    animation:slideDown 0.35s ease both;
    overflow-x:auto;
  }
  [data-theme="light"] .nav-slim{background:rgba(245,245,240,0.95);}
  .nav-slim-logo{
    display:flex;align-items:center;gap:8px;
    flex-shrink:0;text-decoration:none;padding:14px 0;padding-right:4px;
    font-size:18px;font-weight:800;color:var(--text,#ECEAE4);
    border-bottom:none!important;
  }
  .nav-slim-logo em{color:var(--gold,#F5A623);font-style:normal;}
  .nav-slim-logo svg{height:40px!important;width:auto!important;flex-shrink:0;}
  .nav-slim-links{display:flex;align-items:center;gap:0;overflow-x:auto;flex:1;}
  .nav-slim a{
    font-size:13px;font-weight:600;color:var(--text2,#8A8884);
    padding:0 10px;height:48px;display:inline-flex;align-items:center;
    text-decoration:none;white-space:nowrap;
    border-bottom:2px solid transparent;
    transition:color .15s,border-color .15s;
  }
  .nav-slim a:hover,.nav-slim a.active{color:var(--text,#ECEAE4);}
  .nav-slim a.active{color:var(--gold,#F5A623);border-bottom-color:var(--gold,#F5A623);}
  </style>
  <div class="nav-slim">
    <div style="display:flex;align-items:center;flex:1;min-width:0">
      <a class="nav-slim-logo" href="${NAV_BASE}index.html">${LOGO_SVG_HTML}</a>
      <div class="nav-slim-links">${links}</div>
    </div>
    <button class="theme-toggle" id="theme-btn" onclick="toggleTheme()" title="Alternar tema" style="flex-shrink:0;background:transparent;border:none;cursor:pointer;font-size:16px;padding:4px 8px;margin-left:1rem;color:var(--text2)">☀️</button>
  </div>`;
  applyTheme(getTheme());
}

function renderNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  const inConsolidador = location.pathname.includes('carteira');
  document.body.classList.toggle('is-consolidador', inConsolidador);

  const ativosNacPages  = ['acoes.html','fiis.html','dividendos.html','criptos.html'];
  const ativosExtPages  = ['bdrs.html','etfs.html','reits.html','stocks.html'];
  const ativosAllPages  = [...ativosNacPages, ...ativosExtPages, 'rankings.html'];
  const ferramentasAllPages = ['simulador.html','comparador.html','analise.html','ferramentas.html'];

  const ativosActive      = ativosAllPages.includes(page);
  const ferramentasActive = ferramentasAllPages.includes(page);
  const homeActive        = page === 'index.html' && !inConsolidador;
  const watchActive       = page === 'watchlist.html';
  const carteiraActive    = inConsolidador;
  const statusActive      = page === 'status.html';
  const artigosActive     = location.pathname.includes('/artigos/');

  const dropBtnStyle = (active) =>
    `cursor:pointer;font-size:12.5px;font-weight:600;letter-spacing:0.2px;white-space:nowrap;` +
    `padding:5px 10px;border-radius:7px;transition:var(--transition,all .15s);user-select:none;` +
    (active
      ? 'color:var(--gold,#F5A623);background:var(--bg4,rgba(245,166,35,0.08));box-shadow:inset 0 0 0 1px rgba(245,166,35,0.2)'
      : 'color:var(--text2,#8A8884);background:transparent');

  document.getElementById('nav-placeholder').innerHTML = `
  <style>
  #nav-hamburger{display:none;background:transparent;border:none;color:var(--text);font-size:22px;cursor:pointer;padding:6px 8px;line-height:1;border-radius:8px;transition:background .15s;flex-shrink:0}
  #nav-hamburger:hover{background:var(--bg3)}
  #nav-mobile-menu{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:var(--bg,#0E0E11);z-index:500;flex-direction:column;padding:20px 24px;overflow-y:auto;animation:slideDown .2s ease}
  #nav-mobile-menu.open{display:flex}
  #nav-mobile-menu .mob-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
  #nav-mobile-menu .mob-header svg{height:52px!important;width:auto!important;flex-shrink:0;}
  #nav-mobile-menu .mob-close{background:transparent;border:1px solid var(--border);color:var(--text);font-size:20px;cursor:pointer;padding:6px 12px;border-radius:8px;font-family:var(--font-body,sans-serif)}
  #nav-mobile-menu a{display:block;padding:11px 0 11px 8px;font-size:16px;font-weight:600;color:var(--text2);border-bottom:1px solid var(--border);text-decoration:none;transition:color .15s}
  #nav-mobile-menu a:hover,#nav-mobile-menu a.active{color:var(--gold,#D4A017)}
  .mob-group-label{font-size:10px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:var(--text3,#555);padding:18px 0 4px;border-bottom:none!important}
  .mob-group-sub{font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--gold,#D4A017);opacity:.65;padding:10px 0 2px;border-bottom:none!important}
  @media (max-width:900px){#nav-hamburger{display:none!important}}
  .mv-floatdrop{
    display:none;position:fixed;
    background:var(--bg2,#1a1a1f);
    border:1px solid var(--border3,rgba(255,255,255,0.12));
    border-radius:12px;padding:8px;min-width:170px;
    z-index:99999;box-shadow:0 12px 40px rgba(0,0,0,0.6);
  }
  .mv-floatdrop a{display:block;padding:8px 12px;border-radius:7px;font-size:13px;font-weight:600;color:var(--text2,#aaa);white-space:nowrap;text-decoration:none;transition:background .12s,color .12s}
  .mv-floatdrop a:hover{background:var(--bg3,#252529);color:var(--text,#fff)}
  .mv-floatdrop a.active{color:var(--gold,#F5A623)}
  .mv-floatdrop a.active:hover{background:var(--bg3,#252529)}
  .mv-drop-label{font-size:10px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:var(--text3,#555);padding:6px 12px 3px}
  .mv-drop-div{height:1px;background:var(--border,rgba(255,255,255,0.07));margin:6px 0}
  </style>

  <div id="nav-mobile-menu">
    <div class="mob-header">
      <a href="${NAV_BASE}index.html" style="display:flex;align-items:center;gap:10px;text-decoration:none;border:none;padding:0">
        ${LOGO_SVG_HTML}
      </a>
      <button class="mob-close" onclick="toggleMobileMenu()">✕</button>
    </div>
    <div id="nav-auth-area-mobile" style="padding:12px 0 16px;border-bottom:1px solid var(--border);margin-bottom:4px"></div>
    <a href="${NAV_BASE}index.html" class="${homeActive?'active':''}" onclick="toggleMobileMenu()">🏠 Home</a>
    <a href="${NAV_BASE}carteira/index.html" class="${carteiraActive?'active':''}" onclick="toggleMobileMenu()">${WALLET_ICON} Carteira</a>
    <div class="mob-group-label">Ativos</div>
    <div class="mob-group-sub">Nacional</div>
    <a href="${NAV_BASE}acoes.html" class="${page==='acoes.html'?'active':''}" onclick="toggleMobileMenu()">${ATIVO_ICONS.acoes} Ações</a>
    <a href="${NAV_BASE}fiis.html" class="${page==='fiis.html'?'active':''}" onclick="toggleMobileMenu()">${ATIVO_ICONS.fiis} FIIs</a>
    <a href="${NAV_BASE}dividendos.html" class="${page==='dividendos.html'?'active':''}" onclick="toggleMobileMenu()">${ATIVO_ICONS.dividendos} Dividendos</a>
    <a href="${NAV_BASE}criptos.html" class="${page==='criptos.html'?'active':''}" onclick="toggleMobileMenu()">${ATIVO_ICONS.criptos} Criptos</a>
    <div class="mob-group-sub">Exterior</div>
    <a href="${NAV_BASE}bdrs.html" class="${page==='bdrs.html'?'active':''}" onclick="toggleMobileMenu()">${ATIVO_ICONS.bdrs} BDRs</a>
    <a href="${NAV_BASE}etfs.html" class="${page==='etfs.html'?'active':''}" onclick="toggleMobileMenu()">${ATIVO_ICONS.etfs} ETFs</a>
    <a href="${NAV_BASE}reits.html" class="${page==='reits.html'?'active':''}" onclick="toggleMobileMenu()">${ATIVO_ICONS.reits} REITs</a>
    <a href="${NAV_BASE}stocks.html" class="${page==='stocks.html'?'active':''}" onclick="toggleMobileMenu()">${ATIVO_ICONS.stocks} Stocks</a>
    <a href="${NAV_BASE}rankings.html" class="${page==='rankings.html'?'active':''}" onclick="toggleMobileMenu()">${ATIVO_ICONS.rankings} Rankings</a>
    <div class="mob-group-label">Ferramentas</div>
    <a href="${NAV_BASE}simulador.html" class="${page==='simulador.html'?'active':''}" onclick="toggleMobileMenu()">${FERRAMENTA_ICONS.simulador} Simulador</a>
    <a href="${NAV_BASE}calculadora/index.html" onclick="toggleMobileMenu()">${FERRAMENTA_ICONS.calculadora} Calculadora</a>
    <a href="${NAV_BASE}comparador.html" class="${page==='comparador.html'?'active':''}" onclick="toggleMobileMenu()">${FERRAMENTA_ICONS.comparador} Comparador</a>
    <a href="${NAV_BASE}analise.html" class="${page==='analise.html'?'active':''}" onclick="toggleMobileMenu()">${FERRAMENTA_ICONS.analise} Análise IA</a>
    <a href="${NAV_BASE}ferramentas.html" class="${page==='ferramentas.html'?'active':''}" onclick="toggleMobileMenu()">${FERRAMENTA_ICONS.outras} Outras</a>
    <a href="${NAV_BASE}artigos/index.html" class="${location.pathname.includes('/artigos/')?'active':''}" onclick="toggleMobileMenu()"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle"><path d="M14 3v4a1 1 0 0 0 1 1h4" stroke="#F5A623" stroke-width="5" stroke-opacity="0.22"/><path d="M14 3v4a1 1 0 0 0 1 1h4" stroke="#F5A623" stroke-width="1.5"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" stroke="#F5A623" stroke-width="5" stroke-opacity="0.22"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" stroke="#F5A623" stroke-width="1.5"/><path d="M9 9h1M9 13h6M9 17h6" stroke="#F5A623" stroke-width="5" stroke-opacity="0.22"/><path d="M9 9h1M9 13h6M9 17h6" stroke="#F5A623" stroke-width="1.5"/></svg> Artigos</a>
    <a href="${NAV_BASE}metodologia.html" class="${page==='metodologia.html'?'active':''}" onclick="toggleMobileMenu()">📐 Metodologia</a>
    <div class="mob-group-label">Conta</div>
    <a href="${NAV_BASE}watchlist.html" class="${watchActive?'active':''}" onclick="toggleMobileMenu()">★ Watchlist</a>
    <a href="${NAV_BASE}status.html" class="${statusActive?'active':''}" onclick="toggleMobileMenu()" style="color:var(--up)">● Status</a>
  </div>

  <nav>
    <div class="nav-top-row">
      <a class="nav-logo" href="${NAV_BASE}index.html">
        ${LOGO_SVG_HTML}
      </a>
      <div id="nav-auth-area"></div>
      <button id="nav-hamburger" onclick="toggleMobileMenu()" aria-label="Menu">☰</button>
    </div>
    <div class="nav-bottom-row">
      <div class="nav-links">
        <a href="${NAV_BASE}index.html" class="${homeActive?'active':''}">Home</a>
        <a href="${NAV_BASE}carteira/index.html" class="${carteiraActive?'active':''}">${WALLET_ICON} Carteira</a>
        <span id="mv-ativos-btn" style="${dropBtnStyle(ativosActive)}">Ativos ▾</span>
        <span id="mv-ferramentas-btn" style="${dropBtnStyle(ferramentasActive)}">Ferramentas ▾</span>
        <a href="${NAV_BASE}artigos/index.html" class="${artigosActive?'active':''}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle"><path d="M14 3v4a1 1 0 0 0 1 1h4" stroke="#F5A623" stroke-width="5" stroke-opacity="0.22"/><path d="M14 3v4a1 1 0 0 0 1 1h4" stroke="#F5A623" stroke-width="1.5"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" stroke="#F5A623" stroke-width="5" stroke-opacity="0.22"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" stroke="#F5A623" stroke-width="1.5"/><path d="M9 9h1M9 13h6M9 17h6" stroke="#F5A623" stroke-width="5" stroke-opacity="0.22"/><path d="M9 9h1M9 13h6M9 17h6" stroke="#F5A623" stroke-width="1.5"/></svg> Artigos</a>
        <a href="${NAV_BASE}watchlist.html" class="${watchActive?'active':''}">★ Watchlist</a>
        <a href="${NAV_BASE}status.html" class="${statusActive?'active':''}" style="color:var(--up);font-size:11px">● Status</a>
      </div>
      <div class="nav-search-wrap">
        <span class="nav-search-icon">⌕</span>
        <input class="nav-search" type="text" placeholder="Buscar ativo... " id="nav-search-input"
          oninput="navSearchLive(this.value)" onkeydown="if(event.key==='Enter')navSearchGo(this.value)"
          onfocus="document.querySelector('.nav-search-shortcut').style.display='none'"
          onblur="document.querySelector('.nav-search-shortcut').style.display=''">
        <span class="nav-search-shortcut">/</span>
        <div id="nav-search-results"></div>
      </div>
    </div>
  </nav>

  ${document.documentElement.dataset.indices === 'true' ? `
  <div class="ticker-bar">
    <div class="ticker-track" id="ticker-track">
      <div class="ticker-item"><span class="ticker-name" style="animation:pulse 1s ease-in-out infinite">Carregando...</span></div>
    </div>
  </div>

  <div class="indices-bar">
    <div class="idx-card">
      <div class="idx-name">Ibovespa</div>
      <div class="idx-val" id="idx-ibov">—</div>
      <div class="idx-chg" id="idx-ibov-chg">—</div>
    </div>
    <div class="idx-card">
      <div class="idx-name">S&amp;P 500</div>
      <div class="idx-val" id="idx-sp500">—</div>
      <div class="idx-chg" id="idx-sp500-chg">—</div>
    </div>
    <div class="idx-card">
      <div class="idx-name">Nasdaq</div>
      <div class="idx-val" id="idx-nasdaq">—</div>
      <div class="idx-chg" id="idx-nasdaq-chg">—</div>
    </div>
    <div class="idx-card">
      <div class="idx-name">Dólar</div>
      <div class="idx-val" id="idx-dolar">—</div>
      <div class="idx-chg" id="idx-dolar-chg">—</div>
    </div>
    <div class="idx-card">
      <div class="idx-name">Bitcoin</div>
      <div class="idx-val" id="idx-btc">—</div>
      <div class="idx-chg" id="idx-btc-chg">—</div>
    </div>
    <div class="idx-card">
      <div class="idx-name">Ethereum</div>
      <div class="idx-val" id="idx-eth">—</div>
      <div class="idx-chg" id="idx-eth-chg">—</div>
    </div>
  </div>` : ''}`;

  applyTheme(getTheme());

  // ── Dropdown: Ativos ─────────────────────────────────────────────
  const ativosDrop = document.createElement('div');
  ativosDrop.id = 'mv-ativos-floatdrop';
  ativosDrop.className = 'mv-floatdrop';
  ativosDrop.innerHTML = `
    <div class="mv-drop-label">Nacional</div>
    <a href="${NAV_BASE}acoes.html" class="${page==='acoes.html'?'active':''}">${ATIVO_ICONS.acoes} Ações</a>
    <a href="${NAV_BASE}fiis.html" class="${page==='fiis.html'?'active':''}">${ATIVO_ICONS.fiis} FIIs</a>
    <a href="${NAV_BASE}dividendos.html" class="${page==='dividendos.html'?'active':''}">${ATIVO_ICONS.dividendos} Dividendos</a>
    <a href="${NAV_BASE}criptos.html" class="${page==='criptos.html'?'active':''}">${ATIVO_ICONS.criptos} Criptos</a>
    <div class="mv-drop-div"></div>
    <div class="mv-drop-label">Exterior</div>
    <a href="${NAV_BASE}bdrs.html" class="${page==='bdrs.html'?'active':''}">${ATIVO_ICONS.bdrs} BDRs</a>
    <a href="${NAV_BASE}etfs.html" class="${page==='etfs.html'?'active':''}">${ATIVO_ICONS.etfs} ETFs</a>
    <a href="${NAV_BASE}reits.html" class="${page==='reits.html'?'active':''}">${ATIVO_ICONS.reits} REITs</a>
    <a href="${NAV_BASE}stocks.html" class="${page==='stocks.html'?'active':''}">${ATIVO_ICONS.stocks} Stocks</a>
    <div class="mv-drop-div"></div>
    <a href="${NAV_BASE}rankings.html" class="${page==='rankings.html'?'active':''}">${ATIVO_ICONS.rankings} Rankings</a>`;
  document.body.appendChild(ativosDrop);

  // ── Dropdown: Ferramentas ────────────────────────────────────────
  const ferramentasDrop = document.createElement('div');
  ferramentasDrop.id = 'mv-ferramentas-floatdrop';
  ferramentasDrop.className = 'mv-floatdrop';
  ferramentasDrop.innerHTML = `
    <a href="${NAV_BASE}simulador.html" class="${page==='simulador.html'?'active':''}">${FERRAMENTA_ICONS.simulador} Simulador</a>
    <a href="${NAV_BASE}calculadora/index.html">${FERRAMENTA_ICONS.calculadora} Calculadora</a>
    <a href="${NAV_BASE}comparador.html" class="${page==='comparador.html'?'active':''}">${FERRAMENTA_ICONS.comparador} Comparador</a>
    <a href="${NAV_BASE}analise.html" class="${page==='analise.html'?'active':''}">${FERRAMENTA_ICONS.analise} Análise IA</a>
    <div class="mv-drop-div"></div>
    <a href="${NAV_BASE}ferramentas.html" class="${page==='ferramentas.html'?'active':''}">${FERRAMENTA_ICONS.outras} Outras ferramentas</a>`;
  document.body.appendChild(ferramentasDrop);

  // ── Dropdowns por CLIQUE (abre/fecha ao clicar; sem depender de hover) ───
  function setupDropClick(btnId, dropEl) {
    const posicionar = () => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      dropEl.style.top  = (r.bottom + 6) + 'px';
      dropEl.style.left = r.left + 'px';
    };
    document.addEventListener('click', (e) => {
      if (e.target.closest('#' + btnId)) {
        e.stopPropagation();
        const estavaAberto = dropEl.style.display === 'block';
        // fecha qualquer dropdown aberto antes de abrir este
        document.querySelectorAll('.mv-floatdrop').forEach(d => d.style.display = 'none');
        if (!estavaAberto) { posicionar(); dropEl.style.display = 'block'; }
      } else if (!e.target.closest('#' + dropEl.id)) {
        dropEl.style.display = 'none'; // clicou fora -> fecha
      }
    });
    window.addEventListener('resize', () => {
      if (dropEl.style.display === 'block') posicionar();
    });
    // Ao rolar a página, fecha o dropdown (ele é fixo e ficaria solto na tela)
    window.addEventListener('scroll', () => {
      if (dropEl.style.display === 'block') dropEl.style.display = 'none';
    }, { passive: true });
  }

  setupDropClick('mv-ativos-btn',      ativosDrop);
  setupDropClick('mv-ferramentas-btn', ferramentasDrop);

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-search-wrap')) {
      const r = document.getElementById('nav-search-results');
      if (r) r.style.display = 'none';
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !['INPUT','TEXTAREA'].includes(e.target.tagName)) {
      e.preventDefault();
      document.getElementById('nav-search-input')?.focus();
    }
    if (e.key === 'Escape') {
      document.getElementById('nav-search-input')?.blur();
      const r = document.getElementById('nav-search-results');
      if (r) r.style.display = 'none';
      const menu = document.getElementById('nav-mobile-menu');
      if (menu?.classList.contains('open')) toggleMobileMenu();
    }
  });

  loadIndicesNav();

  // Mobile: move o login (#nav-auth-area) para a linha da busca,
  // posicionado antes das abas (.nav-links) para ficar na linha 2.
  if (window.matchMedia('(max-width:768px)').matches) {
    const authArea = document.getElementById('nav-auth-area');
    const bottomRow = document.querySelector('.nav-bottom-row');
    const navLinks = bottomRow ? bottomRow.querySelector('.nav-links') : null;
    if (authArea && bottomRow) {
      if (navLinks) bottomRow.insertBefore(authArea, navLinks);
      else bottomRow.appendChild(authArea);
    }
  }
}

function navUpdateTotal() {
  setTimeout(() => {
    const items = document.querySelectorAll('.tk-total');
    if (typeof ACOES !== 'undefined') {
      const total = ACOES.length + (FIIS?.length || 0);
      items.forEach(el => el.textContent = total + ' ativos');
    }
  }, 3000);
}

function navSearchLive(q) {
  const box = document.getElementById('nav-search-results');
  if (!box || q.length < 2) { if (box) box.style.display = 'none'; return; }
  const all = [
    ...(typeof ACOES !== 'undefined' ? ACOES : []),
    ...(typeof FIIS  !== 'undefined' ? FIIS  : []),
  ];
  const results = all.filter(d =>
    d.t.toLowerCase().startsWith(q.toLowerCase()) || d.n.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 8);
  if (!results.length) { box.style.display = 'none'; return; }
  const isFii = d => d.t.match(/\d{2}$/);
  box.innerHTML = results.map(d => {
    const score = scoreBadge(d);
    return `
    <div onclick="location.href='${NAV_BASE}ativo.html?t=${d.t}${isFii(d) ? '&tipo=fii' : ''}'"
      style="display:flex;align-items:center;justify-content:space-between;padding:11px 14px;cursor:pointer;border-bottom:1px solid var(--border);transition:background .12s"
      onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background=''">
      <div style="display:flex;align-items:center;gap:10px">
        ${logoHtml(d.t, 28)}
        <div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-weight:700;font-size:13px">${d.t}</span>
            ${score}
          </div>
          <div style="font-size:11px;color:var(--text3)">${d.n.slice(0,30)}</div>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-family:var(--font-mono);font-size:13px">R$ ${d.p.toFixed(2)}</div>
        <div style="font-size:11px;color:${d.v >= 0 ? 'var(--up)' : 'var(--dn)'}">${d.v >= 0 ? '+' : ''}${d.v.toFixed(2)}%</div>
      </div>
    </div>`;
  }).join('');
  box.style.display = 'block';
}

function navSearchGo(q) {
  if (!q) return;
  const all = [
    ...(typeof ACOES !== 'undefined' ? ACOES : []),
    ...(typeof FIIS  !== 'undefined' ? FIIS  : []),
  ];
  const found = all.find(d => d.t.toLowerCase() === q.toLowerCase());
  if (found) location.href = `${NAV_BASE}ativo.html?t=${found.t}${found.t.match(/\d{2}$/) ? '&tipo=fii' : ''}`;
  else location.href = `${NAV_BASE}acoes.html?q=${q}`;
}

// ── Autenticação global (Firebase) ───────────────────────────────
const _NAV_FB_CONFIG = {
  apiKey: "AIzaSyBDojPPrdkrqr52WxDL-WPy5wL1fsWo1HI",
  authDomain: "consolidador-de-carteira-c3a83.firebaseapp.com",
  projectId: "consolidador-de-carteira-c3a83",
  storageBucket: "consolidador-de-carteira-c3a83.firebasestorage.app",
  messagingSenderId: "691277823486",
  appId: "1:691277823486:web:a17e3faf4375adc61354af"
};

function navLoginGoogle() {
  if (typeof firebase === 'undefined') return;
  firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider())
    .catch(e => console.warn('Login:', e.message));
}
window.navLoginGoogle = navLoginGoogle;

function navLogout() {
  if (typeof firebase === 'undefined') return;
  firebase.auth().signOut();
}
window.navLogout = navLogout;

function _navAuthBtnHtml(user) {
  if (user) {
    const name = (user.displayName || '').split(' ')[0] || 'Conta';
    const photo = user.photoURL || '';
    return `
      <img src="${photo}" alt="${name}"
        style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:1.5px solid rgba(212,160,23,0.5);cursor:pointer;flex-shrink:0"
        onerror="this.style.display='none'"
        title="${user.displayName || ''}"
        onclick="document.getElementById('nav-user-drop')?.classList.toggle('open')">
      <div id="nav-user-drop"
        style="display:none;position:absolute;right:0;top:38px;background:var(--bg2,#1a1a1f);border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:12px 14px;z-index:99999;min-width:170px;box-shadow:0 8px 32px rgba(0,0,0,0.5)">
        <div style="font-size:13px;font-weight:700;color:var(--text,#eee);margin-bottom:4px;white-space:nowrap">${name}</div>
        <div style="font-size:11px;color:var(--text3,#666);margin-bottom:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px">${user.email || ''}</div>
        <a href="${NAV_BASE}carteira/index.html" style="display:block;font-size:12px;color:var(--gold,#D4A017);text-decoration:none;padding:4px 0;font-weight:600">📊 Minha Carteira</a>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:8px 0">
        <button onclick="navLogout()"
          style="width:100%;background:transparent;border:1px solid rgba(255,255,255,0.1);color:var(--text2,#aaa);padding:6px 10px;border-radius:6px;cursor:pointer;font-size:12px;font-family:inherit">
          Sair da conta
        </button>
      </div>`;
  } else {
    return `
      <button onclick="navLoginGoogle()"
        style="display:flex;align-items:center;gap:5px;background:transparent;border:1px solid rgba(212,160,23,0.45);color:var(--gold,#D4A017);padding:5px 12px;border-radius:20px;cursor:pointer;font-size:12px;font-weight:600;font-family:inherit;white-space:nowrap;transition:all .15s;flex-shrink:0"
        onmouseover="this.style.background='rgba(212,160,23,0.1)'" onmouseout="this.style.background='transparent'">
        <svg width="13" height="13" viewBox="0 0 24 24" style="flex-shrink:0">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Entrar
      </button>`;
  }
}

function _navAuthMobileBtnHtml(user) {
  if (user) {
    const name = (user.displayName || '').split(' ')[0] || 'Conta';
    const photo = user.photoURL || '';
    return `
      <div style="display:flex;align-items:center;gap:10px">
        <img src="${photo}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid rgba(212,160,23,0.4)" onerror="this.style.display='none'">
        <div>
          <div style="font-size:15px;font-weight:700;color:var(--text,#eee)">${name}</div>
          <button onclick="navLogout();toggleMobileMenu()"
            style="margin-top:4px;background:transparent;border:1px solid rgba(255,255,255,0.15);color:var(--text2,#aaa);padding:3px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-family:inherit">
            Sair
          </button>
        </div>
      </div>`;
  } else {
    return `
      <button onclick="navLoginGoogle()"
        style="display:flex;align-items:center;gap:8px;background:transparent;border:1.5px solid rgba(212,160,23,0.45);color:var(--gold,#D4A017);padding:10px 16px;border-radius:10px;cursor:pointer;font-size:15px;font-weight:700;font-family:inherit;width:100%">
        <svg width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Entrar com Google
      </button>`;
  }
}

function renderNavAuth(user) {
  const d = document.getElementById('nav-auth-area');
  const m = document.getElementById('nav-auth-area-mobile');
  if (d) d.innerHTML = _navAuthBtnHtml(user);
  if (m) m.innerHTML = _navAuthMobileBtnHtml(user);
  // fecha dropdown ao clicar fora
  if (user) {
    document.addEventListener('click', (e) => {
      const drop = document.getElementById('nav-user-drop');
      if (drop && !e.target.closest('#nav-auth-area')) drop.classList.remove('open');
    }, { once: false, capture: false });
  }
}

function _setupNavAuth() {
  if (typeof firebase === 'undefined' || typeof firebase.auth !== 'function') return;
  if (!firebase.apps.length) firebase.initializeApp(_NAV_FB_CONFIG);
  firebase.auth().onAuthStateChanged(renderNavAuth);
}

function initSiteAuth() {
  if (typeof firebase !== 'undefined') { _setupNavAuth(); return; }
  let loaded = 0;
  const srcs = [
    'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js',
  ];
  srcs.forEach(src => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => { if (++loaded === srcs.length) _setupNavAuth(); };
    document.head.appendChild(s);
  });
}

// CSS extra: dropdown aberto
(function(){
  const st = document.createElement('style');
  st.textContent = '#nav-user-drop.open{display:block!important}';
  document.head.appendChild(st);
})();

function renderFooter() {
  const el = document.getElementById('footer-placeholder');
  if (!el) return;
  const year = new Date().getFullYear();
  el.innerHTML = `
  <footer>
    <p>© ${year} <em>Mais Valor</em> — dados atualizados diariamente após o fechamento do pregão B3.<br>
    Não constitui recomendação de investimento.</p>
    <p style="margin-top:10px;font-size:13px">
      <a href="/sobre.html" style="color:var(--text2);text-decoration:none">Sobre</a>
      <span style="color:var(--text3);margin:0 8px">·</span>
      <a href="/artigos/" style="color:var(--text2);text-decoration:none">Artigos</a>
      <span style="color:var(--text3);margin:0 8px">·</span>
      <a href="/metodologia.html" style="color:var(--text2);text-decoration:none">Metodologia</a>
      <span style="color:var(--text3);margin:0 8px">·</span>
      <a href="/contato.html" style="color:var(--text2);text-decoration:none">Contato</a>
      <span style="color:var(--text3);margin:0 8px">·</span>
      <a href="/privacidade.html" style="color:var(--text2);text-decoration:none">Política de Privacidade</a>
      <span style="color:var(--text3);margin:0 8px">·</span>
      <a href="/termos.html" style="color:var(--text2);text-decoration:none">Termos de Serviço</a>
    </p>
  </footer>`;
}

document.addEventListener('DOMContentLoaded', () => {
  renderNav();
  renderFooter();
  navUpdateTotal();
  initSiteAuth();
});

/* ===== PWA: liga o manifest e registra o service worker em todas as páginas ===== */
(function(){
  const head = document.head;
  if (head && !document.querySelector('link[rel="manifest"]')){
    const l = document.createElement('link'); l.rel = 'manifest'; l.href = '/manifest.json'; head.appendChild(l);
  }
  if (head && !document.querySelector('meta[name="theme-color"]')){
    const m = document.createElement('meta'); m.name = 'theme-color'; m.content = '#080809'; head.appendChild(m);
  }
  if (head && !document.querySelector('link[rel="apple-touch-icon"]')){
    const a = document.createElement('link'); a.rel = 'apple-touch-icon'; a.href = '/icons/icon-192.png'; head.appendChild(a);
  }
  if ('serviceWorker' in navigator){
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(()=>{}));
  }
  /* Google AdSense — carrega o anúncio em todas as páginas (sem duplicar onde já está no HTML) */
  if (head && !document.querySelector('script[src*="adsbygoogle"]')){
    const ad = document.createElement('script');
    ad.async = true;
    ad.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8043391674129748';
    ad.crossOrigin = 'anonymous';
    head.appendChild(ad);
  }
})();
