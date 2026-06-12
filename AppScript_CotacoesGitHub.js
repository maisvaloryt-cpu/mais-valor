// ═══════════════════════════════════════════════════════════════════════════
//  APPS SCRIPT — Cotações Google Sheets → JSON → GitHub
//  Cole este código em: Extensions → Apps Script (em cada planilha)
//  Configure as constantes abaixo e rode setupTrigger() uma vez.
// ═══════════════════════════════════════════════════════════════════════════

// ── CONFIGURAÇÕES ──────────────────────────────────────────────────────────
const GITHUB_OWNER = 'SEU_USUARIO';        // ex: 'joaosilva'
const GITHUB_REPO  = 'SEU_REPOSITORIO';   // ex: 'maisvalor'
const GITHUB_TOKEN = 'ghp_SEU_TOKEN';     // Personal Access Token (repo scope)
const GITHUB_BRANCH = 'main';

// Qual JSON esse script vai gerar? Ajuste por planilha:
// 'acoes-br' | 'fiis' | 'internacional' | 'cripto-macro'
const PLANILHA_TIPO = 'acoes-br';

// Mapa de tipo → caminho do JSON no repo
const JSON_PATHS = {
  'acoes-br':      'data/intraday/acoes-br.json',
  'fiis':          'data/intraday/fiis.json',
  'internacional': 'data/intraday/internacional.json',
  'cripto-macro':  'data/intraday/cripto-macro.json',
};

// ── HORÁRIO DO PREGÃO ──────────────────────────────────────────────────────
const PREGAO_INICIO = 10;  // 10h (abertura B3 com buffer)
const PREGAO_FIM    = 18;  // 18h (após fechamento)

// ═══════════════════════════════════════════════════════════════════════════
//  FUNÇÃO PRINCIPAL — chamada pelo trigger a cada 20 minutos
// ═══════════════════════════════════════════════════════════════════════════
function coletarEEnviar() {
  const agora = new Date();
  const hora = agora.getHours();
  const diaSemana = agora.getDay(); // 0=Dom, 6=Sab

  // Roda apenas em dias úteis durante o pregão
  if (diaSemana === 0 || diaSemana === 6) {
    Logger.log('Fim de semana, pulando.');
    return;
  }
  if (hora < PREGAO_INICIO || hora >= PREGAO_FIM) {
    Logger.log(`Fora do pregão (${hora}h), pulando.`);
    return;
  }

  const json = coletarDados();
  if (!json) {
    Logger.log('Sem dados para enviar.');
    return;
  }

  enviarParaGitHub(json);
  acumularChartIntraday(json);  // Acumula série temporal intraday para o gráfico 1D
}

// ═══════════════════════════════════════════════════════════════════════════
//  COLETAR DADOS DE TODAS AS ABAS
// ═══════════════════════════════════════════════════════════════════════════
function coletarDados() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const agora = new Date();
  const updatedAt = Utilities.formatDate(agora, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');

  // Mapa de abas por tipo de planilha
  const ABAS_POR_TIPO = {
    'acoes-br':      ['📊 Ações BR', '📊 ETFs BR'],
    'fiis':          ['📊 FIIs'],
    'internacional': ['📊 Stocks EUA', '📊 BDRs'],
    'cripto-macro':  ['📊 Cripto', '📊 Câmbio e Macro'],
  };

  const abasAlvo = ABAS_POR_TIPO[PLANILHA_TIPO] || [];
  const resultado = { updated_at: updatedAt };

  abasAlvo.forEach(nomeAba => {
    const sheet = ss.getSheetByName(nomeAba);
    if (!sheet) {
      Logger.log(`Aba não encontrada: ${nomeAba}`);
      return;
    }

    const dados = lerAba(sheet, nomeAba);
    const chave = nomeAbaParaChave(nomeAba);
    if (chave && dados.length > 0) {
      resultado[chave] = dados;
      Logger.log(`✓ ${nomeAba}: ${dados.length} ativos coletados`);
    }
  });

  return resultado;
}

function nomeAbaParaChave(nome) {
  const mapa = {
    '📊 Ações BR':      'acoes',
    '📊 ETFs BR':       'etfs',
    '📊 FIIs':          'fiis',
    '📊 Stocks EUA':    'stocks',
    '📊 BDRs':          'bdrs',
    '📊 Cripto':        'cripto',
    '📊 Câmbio e Macro':'macro',
  };
  return mapa[nome] || null;
}

// ─── Ler uma aba e retornar array de objetos ──────────────────────────────
function lerAba(sheet, nomeAba) {
  // Row 1 = título, Row 2 = headers, Row 3+ = dados
  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return [];

  const headers = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0];
  const dataRange = sheet.getRange(3, 1, lastRow - 2, sheet.getLastColumn());
  const values = dataRange.getValues();

  const ativos = [];

  values.forEach(row => {
    const ticker = String(row[0] || '').trim();
    if (!ticker || ticker.startsWith('⚠') || ticker === 'nan') return;

    // Monta objeto dinamicamente baseado nos headers
    const obj = { ticker, stale: false };
    let temPreco = false;

    headers.forEach((h, i) => {
      if (i === 0) return; // ticker já foi pego
      const val = row[i];
      const header = String(h || '').trim();

      // Ignorar valores vazios, erros ou '-'
      const valido = val !== '' && val !== '-' && val !== null && val !== undefined &&
                     !(typeof val === 'string' && val.startsWith('#'));

      switch(header) {
        case 'Preço':           obj.price        = valido ? parseFloat(val) || null : null; if(obj.price) temPreco = true; break;
        case 'Var%':            obj.changePct    = valido ? parseFloat(val) || 0 : 0; break;
        case 'Var R$':          obj.change       = valido ? parseFloat(val) || 0 : 0; break;
        case 'Abertura':        obj.open         = valido ? parseFloat(val) || null : null; break;
        case 'Máxima':          obj.high         = valido ? parseFloat(val) || null : null; break;
        case 'Mínima':          obj.low          = valido ? parseFloat(val) || null : null; break;
        case 'Fechamento Ant.': obj.prevClose    = valido ? parseFloat(val) || null : null; break;
        case 'Volume':          obj.volume       = valido ? parseFloat(val) || 0 : 0; break;
        case 'Mkt Cap':         obj.marketCap    = valido ? parseFloat(val) || 0 : 0; break;
        case 'Shares':          obj.shares       = valido ? parseFloat(val) || 0 : 0; break;
        case 'EPS':             obj.eps          = valido ? parseFloat(val) || null : null; break;
        case 'P/E':             obj.pe           = valido ? parseFloat(val) || null : null; break;
        case 'DY%':             obj.dividendYield= valido ? parseFloat(val) || 0 : 0; break;
        case 'Segmento':
        case 'Tipo/Setor':      obj.setor        = valido ? String(val) : ''; break;
        case 'Nome':            if(valido && String(val).trim()) obj.name = String(val).trim(); break;
        // Cripto
        case 'Preço (USD)':     obj.price        = valido ? parseFloat(val) || null : null; if(obj.price) temPreco = true; break;
        case 'Market Cap':      obj.marketCap    = valido ? parseFloat(val) || 0 : 0; break;
        case 'Volume 24h':      obj.volume       = valido ? parseFloat(val) || 0 : 0; break;
        case 'Categoria':       obj.categoria    = valido ? String(val) : ''; break;
        // Câmbio/Macro
        case 'Código GF':       obj.codigoGF     = valido ? String(val) : ''; break;
        case 'Descrição':       obj.descricao    = valido ? String(val) : ''; break;
        case 'Tipo':            obj.tipo         = valido ? String(val) : ''; break;
        case 'Valor':           obj.price        = valido ? parseFloat(val) || null : null; if(obj.price) temPreco = true; break;
        case 'Máx Dia':         obj.high         = valido ? parseFloat(val) || null : null; break;
        case 'Mín Dia':         obj.low          = valido ? parseFloat(val) || null : null; break;
      }
    });

    // Se não tem preço válido, marca como stale (vai buscar lastValid no site)
    if (!temPreco) {
      obj.stale = true;
      obj.price = null;
    }

    ativos.push(obj);
  });

  return ativos;
}

// ═══════════════════════════════════════════════════════════════════════════
//  ENVIAR JSON PARA O GITHUB
//  Usa a API do GitHub para criar/atualizar arquivo no repositório
// ═══════════════════════════════════════════════════════════════════════════
function enviarParaGitHub(dados) {
  const path = JSON_PATHS[PLANILHA_TIPO];
  if (!path) {
    Logger.log('PLANILHA_TIPO inválido: ' + PLANILHA_TIPO);
    return;
  }

  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
  const conteudo = JSON.stringify(dados, null, 2);
  const conteudoBase64 = Utilities.base64Encode(conteudo, Utilities.Charset.UTF_8);

  // Verificar SHA atual do arquivo (necessário para update)
  let sha = null;
  try {
    const getResp = UrlFetchApp.fetch(apiUrl + `?ref=${GITHUB_BRANCH}`, {
      method: 'get',
      headers: { 'Authorization': 'Bearer ' + GITHUB_TOKEN, 'Accept': 'application/vnd.github+json' },
      muteHttpExceptions: true,
    });
    if (getResp.getResponseCode() === 200) {
      sha = JSON.parse(getResp.getContentText()).sha;
    }
  } catch(e) {
    Logger.log('Aviso ao buscar SHA: ' + e.message);
  }

  // Montar body
  const agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
  const body = {
    message: `📊 Intraday ${PLANILHA_TIPO} — ${agora}`,
    content: conteudoBase64,
    branch: GITHUB_BRANCH,
  };
  if (sha) body.sha = sha;

  try {
    const resp = UrlFetchApp.fetch(apiUrl, {
      method: 'put',
      headers: {
        'Authorization': 'Bearer ' + GITHUB_TOKEN,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      payload: JSON.stringify(body),
      muteHttpExceptions: true,
    });

    const code = resp.getResponseCode();
    if (code === 200 || code === 201) {
      // Registra no Log
      const logSh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('📝 Log');
      if (logSh) {
        const totalAtivos = Object.values(dados).filter(Array.isArray).reduce((s,a)=>s+a.length,0);
        const inicio = new Date() - 0; // só pra não dar erro de lint
        logSh.insertRowAfter(2);
        logSh.getRange(3, 1, 1, 5).setValues([[
          agora,
          '✅ OK',
          `Push ${path} (${code})`,
          totalAtivos,
          '—',
        ]]);
      }
      Logger.log(`✅ Push OK: ${path} (HTTP ${code})`);
    } else {
      Logger.log(`❌ Erro GitHub: HTTP ${code} — ${resp.getContentText().slice(0,200)}`);
      registrarErroLog(agora, code, resp.getContentText().slice(0,100));
    }
  } catch(e) {
    Logger.log('❌ Exceção ao enviar: ' + e.message);
    registrarErroLog(Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm'), 'EXC', e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  ACUMULAR CHART INTRADAY
//  Lê data/intraday/chart/{tipo}.json do GitHub, adiciona o ponto atual
//  com timestamp (HH:mm) e salva de volta. Reseta automaticamente a cada dia.
//
//  Estrutura do arquivo:
//  {
//    "date": "2026-06-12",
//    "updated_at": "12/06/2026 14:20",
//    "points": [
//      {"t": "10:00", "PETR4": 38.50, "VALE3": 72.30, ...},
//      {"t": "10:20", "PETR4": 38.62, ...}
//    ]
//  }
// ═══════════════════════════════════════════════════════════════════════════
function acumularChartIntraday(dadosAtuais) {
  const chartPath = JSON_PATHS[PLANILHA_TIPO].replace('data/intraday/', 'data/intraday/chart/');
  const hoje  = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
  const hora  = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'HH:mm');
  const agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');

  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${chartPath}`;

  // ── 1. Ler arquivo existente do GitHub ────────────────────────────────────
  let sha = null;
  let chartData = { date: '', points: [] };

  try {
    const resp = UrlFetchApp.fetch(apiUrl + `?ref=${GITHUB_BRANCH}`, {
      method: 'get',
      headers: { 'Authorization': 'Bearer ' + GITHUB_TOKEN, 'Accept': 'application/vnd.github+json' },
      muteHttpExceptions: true,
    });
    const code = resp.getResponseCode();
    if (code === 200) {
      const parsed = JSON.parse(resp.getContentText());
      sha = parsed.sha;
      // O conteúdo vem em base64 com quebras de linha — remover antes de decodificar
      const conteudo = Utilities.newBlob(
        Utilities.base64Decode(parsed.content.replace(/\n/g, ''))
      ).getDataAsString();
      chartData = JSON.parse(conteudo);
    } else if (code !== 404) {
      Logger.log(`Chart: GET retornou HTTP ${code}`);
    }
  } catch(e) {
    Logger.log('Chart: erro ao ler arquivo existente — ' + e.message);
  }

  // ── 2. Se não é de hoje, reinicia (mas mantém SHA para poder sobrescrever) ─
  if (chartData.date !== hoje) {
    chartData = { date: hoje, points: [] };
    // sha é mantido: se o arquivo existia (de ontem), precisamos do SHA para update
  }

  // ── 3. Evitar duplicata do mesmo minuto ───────────────────────────────────
  if (chartData.points.some(p => p.t === hora)) {
    Logger.log(`Chart: ponto ${hora} já existe — nada a fazer.`);
    return;
  }

  // ── 4. Montar ponto com preços atuais (todas as chaves do JSON) ───────────
  const ponto = { t: hora };
  const CHAVES = ['acoes', 'etfs', 'fiis', 'stocks', 'bdrs', 'cripto', 'macro'];
  CHAVES.forEach(chave => {
    if (!Array.isArray(dadosAtuais[chave])) return;
    dadosAtuais[chave].forEach(item => {
      if (item.ticker && item.price != null && !item.stale) {
        ponto[item.ticker] = item.price;
      }
    });
  });

  chartData.points.push(ponto);
  chartData.updated_at = agora;

  // ── 5. Salvar de volta no GitHub ──────────────────────────────────────────
  const conteudoBase64 = Utilities.base64Encode(
    JSON.stringify(chartData, null, 2), Utilities.Charset.UTF_8
  );
  const body = {
    message: `📈 Chart intraday ${PLANILHA_TIPO} — ${agora} (${chartData.points.length} pts)`,
    content: conteudoBase64,
    branch: GITHUB_BRANCH,
  };
  if (sha) body.sha = sha;

  try {
    const resp = UrlFetchApp.fetch(apiUrl, {
      method: 'put',
      headers: {
        'Authorization': 'Bearer ' + GITHUB_TOKEN,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      payload: JSON.stringify(body),
      muteHttpExceptions: true,
    });
    const code = resp.getResponseCode();
    if (code === 200 || code === 201) {
      Logger.log(`✅ Chart acumulado: ${chartPath} — ${chartData.points.length} pontos`);
    } else {
      Logger.log(`❌ Chart: erro HTTP ${code} — ${resp.getContentText().slice(0, 200)}`);
    }
  } catch(e) {
    Logger.log('❌ Chart: exceção ao salvar — ' + e.message);
  }
}

function registrarErroLog(agora, code, msg) {
  try {
    const logSh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('📝 Log');
    if (logSh) {
      logSh.insertRowAfter(2);
      logSh.getRange(3, 1, 1, 5).setValues([[agora, '❌ ERRO', `HTTP ${code}: ${msg}`, 0, '—']]);
    }
  } catch(e) {}
}

// ═══════════════════════════════════════════════════════════════════════════
//  SETUP — rode UMA VEZ para criar o trigger de 20 minutos
// ═══════════════════════════════════════════════════════════════════════════
function setupTrigger() {
  // Remove triggers antigos desta função para evitar duplicatas
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'coletarEEnviar') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Cria trigger a cada 20 minutos
  ScriptApp.newTrigger('coletarEEnviar')
    .timeBased()
    .everyMinutes(20)
    .create();

  Logger.log('✅ Trigger criado: coletarEEnviar a cada 20 minutos.');
  Logger.log('   Planilha: ' + PLANILHA_TIPO);
  Logger.log('   JSON destino: ' + JSON_PATHS[PLANILHA_TIPO]);
}

// ── Para remover o trigger ─────────────────────────────────────────────────
function removeTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'coletarEEnviar') {
      ScriptApp.deleteTrigger(t);
      Logger.log('Trigger removido.');
    }
  });
}

// ── Teste manual sem esperar o trigger ────────────────────────────────────
function testarAgora() {
  Logger.log('=== TESTE MANUAL ===');
  const json = coletarDados();
  Logger.log('Dados coletados: ' + JSON.stringify(json, null, 2).slice(0, 500) + '...');
  Logger.log('Enviando para GitHub...');
  enviarParaGitHub(json);
}
