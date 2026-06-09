# Fix: busca por nome em acoes.html

## O problema
A função `filterTable()` em `acoes.html` só busca pelo ticker (`d.t`), não pelo nome da empresa (`d.n`).

## A correção

Encontre a função `filterTable` no `acoes.html`. Ela deve ter algo assim:

```js
// ANTES (busca só por ticker)
function filterTable() {
  const q = (document.getElementById('f-search').value || '').toLowerCase();
  // ...
  .filter(d => d.t.toLowerCase().includes(q))
```

Substitua o filtro por:

```js
// DEPOIS (busca por ticker OU nome)
  .filter(d =>
    d.t.toLowerCase().includes(q) ||
    (d.n || '').toLowerCase().includes(q)
  )
```

## Exemplo completo da função corrigida

```js
function filterTable() {
  const q = (document.getElementById('f-search').value || '').toLowerCase();
  const setor = document.getElementById('f-setor')?.value || '';
  // ... demais filtros ...

  data = ACOES_DEMO.filter(d => {
    const matchQ = !q || d.t.toLowerCase().includes(q) || (d.n || '').toLowerCase().includes(q);
    const matchSetor = !setor || d.setor === setor;
    return matchQ && matchSetor;
  });

  // ... resto da função (sort + renderTable) permanece igual ...
}
```

Essa única mudança faz com que o usuário possa buscar tanto por `PETR4` quanto por `Petrobras`.
