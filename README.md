# 📈 Mais Valor — Site de Cotações B3

Site completo de cotações da B3, com dados de ações, FIIs, dividendos e ferramentas para investidores.

## 📁 Estrutura do projeto

```
mais-valor/
├── index.html          ← Página inicial com resumo e destaques
├── acoes.html          ← Lista completa de ações com filtros
├── fiis.html           ← Lista completa de FIIs com filtros
├── dividendos.html     ← Agenda de dividendos e JCP
├── rankings.html       ← Rankings por DY, altas, baixas, volume
├── ferramentas.html    ← Calculadoras de juros, aposentadoria e DY
├── style.css           ← Estilos compartilhados (tema escuro)
├── nav.js              ← Navegação e ticker bar compartilhados
├── data.js             ← Dados de demonstração (substituídos pelos JSONs)
├── fetch_data.py       ← Script Python que busca dados reais
├── logo.png            ← Sua logo
├── data/
│   └── cotacoes.json   ← Gerado automaticamente todos os dias
└── .github/
    └── workflows/
        └── update.yml  ← GitHub Actions: roda fetch_data.py todo dia útil às 18h
```

## 🚀 Como publicar no GitHub Pages

### Passo 1 — Criar o repositório

1. Acesse [github.com](https://github.com) e faça login
2. Clique em **New repository** (botão verde)
3. Nome: `mais-valor` (ou qualquer nome)
4. Marque **Public**
5. Clique em **Create repository**

### Passo 2 — Enviar os arquivos

No seu computador, abra o terminal na pasta do projeto e rode:
```bash
git init
git add .
git commit -m "🚀 Lançamento do Mais Valor"
git remote add origin https://github.com/SEU_USUARIO/mais-valor.git
git push -u origin main
```

### Passo 3 — Ativar o GitHub Pages

1. No repositório, clique em **Settings**
2. No menu lateral, clique em **Pages**
3. Em "Source", selecione **Deploy from a branch**
4. Branch: **main**, Folder: **/ (root)**
5. Clique em **Save**

Após alguns minutos, seu site estará em:
`https://SEU_USUARIO.github.io/mais-valor/`

### Passo 4 — Ativar o GitHub Actions (dados reais)

O workflow `.github/workflows/update.yml` já está configurado.
Ele roda automaticamente todo dia útil às 18h (horário de Brasília).

Para rodar manualmente:
1. Vá em **Actions** no seu repositório
2. Clique em **Atualizar Cotações Diariamente**
3. Clique em **Run workflow**

## 📊 Fontes de dados

- **Yahoo Finance** — cotações, variações e indicadores fundamentalistas
- Gratuito, sem necessidade de API key

## ⚙️ Personalização

- Para adicionar mais ativos, edite as listas `ACOES` e `FIIS` em `fetch_data.py`
- Para mudar cores, edite as variáveis CSS em `style.css`
- Para adicionar páginas, copie qualquer HTML existente como base

## 📝 Licença

Uso pessoal. Não constitui recomendação de investimento.
