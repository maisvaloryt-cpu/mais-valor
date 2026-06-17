# 📋 Instruções de Instalação — Cotações Intraday + Stale

## O que este pacote contém

| Arquivo | O que faz |
|---|---|
| `site/data.js` | Merge automático intraday + fechamento diário |
| `site/style.css` | Classe `.stale` (amarelo) para dados desatualizados |
| `site/nav.js` | Ticker bar com stale em IBOV, IFIX, Câmbio |
| `site/*.html` | Todas as páginas com suporte a stale |
| `fetch_indices.py` | Salva `lastValid` no indices.json |
| `fetch_bcb.py` | Salva `lastValid` no bcb.json |
| `fetch_data.py` | Fallback com lastValid nas cotações |
| `.github/workflows/update.yml` | Workflow com modo `setup` |
| `AppScript_CotacoesGitHub.js` | Script para o Google Sheets |

---

## PASSO 1 — Aplicar arquivos no repositório

Substitua os arquivos no seu repositório local pelos arquivos deste pacote:

```
site/data.js          → data.js          (raiz do repo)
site/style.css        → style.css        (raiz do repo)
site/nav.js           → nav.js           (raiz do repo)
site/index.html       → index.html       (raiz do repo)
site/acoes.html       → acoes.html       (raiz do repo)
site/fiis.html        → fiis.html        (raiz do repo)
site/rankings.html    → rankings.html    (raiz do repo)
site/watchlist.html   → watchlist.html   (raiz do repo)
site/comparador.html  → comparador.html  (raiz do repo)
site/dividendos.html  → dividendos.html  (raiz do repo)
site/criptos.html     → criptos.html     (raiz do repo)
site/ativo.html       → ativo.html       (raiz do repo)
site/status.html      → status.html      (raiz do repo)
.github/workflows/update.yml → .github/workflows/update.yml
```

---

## PASSO 2 — Criar estrutura de pastas no GitHub

Após fazer push, rode o workflow `setup` **uma vez** para criar a pasta `data/intraday/` e os placeholders JSON:

1. Vá no seu repositório no GitHub
2. Clique em **Actions** → **Atualizar Cotações Diariamente**
3. Clique em **Run workflow**
4. No campo `modo`, digite: `setup`
5. Clique em **Run workflow** (botão verde)

Isso cria os arquivos `data/intraday/acoes-br.json`, `fiis.json`, etc. com placeholders. O site já não vai dar 404 enquanto o Apps Script não rodar pela primeira vez.

---

## PASSO 3 — Criar Personal Access Token do GitHub

O Apps Script precisa de um token para fazer push no repositório.

1. Acesse: https://github.com/settings/tokens
2. Clique em **Generate new token (classic)**
3. Nome: `mais-valor-apps-script`
4. Expiração: **No expiration** (ou 1 ano, anote para renovar)
5. Marque o escopo: ✅ **repo** (acesso completo a repositórios privados e públicos)
6. Clique em **Generate token**
7. **COPIE o token agora** — ele só aparece uma vez. Começa com `ghp_...`

---

## PASSO 4 — Criar as 4 planilhas no Google Sheets

Você precisará de **4 planilhas separadas** para não ultrapassar o limite de fórmulas do GOOGLEFINANCE.

### 4.1 — Importar a planilha base

1. Acesse: https://sheets.google.com
2. Clique em **+** (Nova planilha)
3. Menu **Arquivo** → **Importar**
4. Selecione o arquivo `cotacoes-site-investimentos-completa.xlsx` (gerado anteriormente)
5. Modo de importação: **Substituir planilha**
6. Clique em **Importar dados**

Esta será a **Planilha 1 — Ações BR**.

### 4.2 — Criar as outras 3 planilhas

Repita o processo de importação 3 vezes, criando:
- **Planilha 2 — FIIs** (mesma planilha importada, mas você vai usar só a aba FIIs)
- **Planilha 3 — Internacional** (abas Stocks EUA + BDRs)
- **Planilha 4 — Cripto e Macro** (abas Cripto + Câmbio e Macro)

> **Dica:** Pode ser a mesma planilha importada 4 vezes com nomes diferentes, já que o Apps Script de cada uma só lê as abas configuradas em `PLANILHA_TIPO`.

### 4.3 — Configurar o Apps Script em cada planilha

Em **cada uma das 4 planilhas**:

1. Menu **Extensões** → **Apps Script**
2. Apague todo o código padrão
3. Cole o conteúdo do arquivo `AppScript_CotacoesGitHub.js`
4. Altere as 4 constantes no topo:

```javascript
const GITHUB_OWNER  = 'seu-usuario-github';  // ex: 'joaosilva'
const GITHUB_REPO   = 'seu-repositorio';     // ex: 'mais-valor'
const GITHUB_TOKEN  = 'ghp_xxxxxxxxxxxx';    // token gerado no Passo 3
const GITHUB_BRANCH = 'main';               // ou 'master' se for seu branch
```

5. Mude o `PLANILHA_TIPO` conforme a planilha:
   - Planilha 1 → `const PLANILHA_TIPO = 'acoes-br';`
   - Planilha 2 → `const PLANILHA_TIPO = 'fiis';`
   - Planilha 3 → `const PLANILHA_TIPO = 'internacional';`
   - Planilha 4 → `const PLANILHA_TIPO = 'cripto-macro';`

6. Salve o script (**Ctrl+S** ou ícone de disquete)

7. No menu de funções, selecione `setupTrigger` e clique em **▶ Executar**
   - Primeira vez: o Google vai pedir permissão → clique em **Revisar permissões** → **Avançado** → **Acessar** → **Permitir**
   - Isso cria o trigger de 20 minutos automaticamente

8. **Teste imediato:** selecione `testarAgora` e clique em **▶ Executar**
   - Verifique nos Logs (View → Logs) se aparece `✅ Push OK`
   - Se aparecer erro 401 → token inválido
   - Se aparecer erro 404 → usuário/repo errado

---

## PASSO 5 — Verificar no GitHub

Após rodar `testarAgora`, vá no GitHub e confira:
- `data/intraday/acoes-br.json` deve ter dados reais de ações
- `data/intraday/fiis.json` deve ter dados de FIIs
- etc.

---

## PASSO 6 — Push final e deploy

No seu computador, dentro da pasta do projeto:

```bash
# Substituir os arquivos (copie os da pasta site/ para a raiz do repo)
# Depois:
git add .
git commit -m "✨ Intraday merge + stale indicators"
git push
```

O Vercel vai detectar o push e republicar o site automaticamente.

---

## Como funciona depois de tudo configurado

```
Durante o pregão (10h–18h, dias úteis):
  Google Sheets atualiza GOOGLEFINANCE a cada 15-20 min
      ↓
  Apps Script lê as células e faz push em data/intraday/*.json
      ↓
  Vercel republica o site
      ↓
  Site exibe cotações quase ao vivo (dados intraday, sem stale)

Todo dia às 18h (GitHub Actions):
  Busca fechamento completo via brapi (403 ações + 380 FIIs)
  Atualiza fundamentus, BCB, índices
  Salva em data/cotacoes.json, data/indices.json, etc.

Quando uma API falha:
  O JSON mantém o último valor válido com stale: true
  O site exibe o valor em amarelo com tooltip "Último valor disponível"
  Nunca aparece "—" para dados que já existiram
```

---

## Solução de problemas

| Sintoma | Causa | Solução |
|---|---|---|
| Push do Apps Script dá 401 | Token inválido ou expirado | Gere novo token no GitHub |
| Push dá 404 | Owner/repo errado | Verifique as constantes |
| Apps Script dá timeout | Muitas linhas na planilha | Limite a 300 linhas na aba |
| Site mostra dados amarelos durante o pregão | Planilha com fórmulas com erro | Abra o Google Sheets e verifique se o GOOGLEFINANCE está retornando valores |
| `data/intraday/` não existe | Setup não foi rodado | Rode o workflow com modo `setup` |
| Dados intraday não aparecem no site | JSON placeholder ainda em vigor | Aguarde o primeiro ciclo do Apps Script (20 min) |

---

## Renovar o Personal Access Token

O token do GitHub expira conforme a validade escolhida. Para renovar:
1. https://github.com/settings/tokens
2. Clique no token → **Regenerate token**
3. Atualize a constante `GITHUB_TOKEN` em **cada um dos 4** Apps Scripts
4. Rode `setupTrigger` novamente em cada planilha

---

*Gerado automaticamente — Mais Valor Site de Cotações*
