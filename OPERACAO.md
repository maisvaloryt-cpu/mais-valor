# Publicação e limites dos serviços

## brapi

Histórico longo e dividendos ficam desativados por padrão na brapi. Ter um
`BRAPI_TOKEN` não comprova acesso a esses recursos pagos. Os coletores continuam
consultando as outras fontes já implementadas e preservando os arquivos existentes
quando não conseguem dados novos.

Se o plano contratado incluir o recurso, habilite separadamente em GitHub →
Settings → Secrets and variables → Actions → Variables:

- `BRAPI_HISTORY_ENABLED=true`: habilita as consultas de 5 e 10 anos.
- `BRAPI_DIVIDENDS_ENABLED=true`: habilita dividendos e JCP.

Os tokens continuam em **Secrets**. As variáveis acima não são tokens.
Os workflows de atualização repassam essas configurações aos scripts.
Localmente, as mesmas variáveis podem ser definidas no ambiente.

Nos recursos pagos, HTTP 401/429 suspende a chave até terminar o processo;
HTTP 403 suspende o recurso daquela chave. Isso evita repetir o mesmo bloqueio
para cada ticker. As cotações simples e os históricos curtos existentes continuam
com a configuração anterior. Não é necessário habilitar recursos pagos para
executar os coletores.

Validação sem consumir API: `python -m unittest discover -s tests -p 'test_brapi_access.py' -v`
(requer `requests`).

## Vercel

O domínio `canalmaisvalor.com.br` respondeu pela Vercel na verificação de
21/09/2026. `.vercelignore` exclui originais PNG sem referências nas páginas,
backups, coletores e documentos do pacote publicado. As versões WebP usadas pelo
site, dados JSON, `api/analise.js`, `ads.txt` e `robots.txt` continuam incluídos.
Os originais permanecem no repositório.

Ao adicionar uma imagem, use a pasta `imagens/Artigos/otimizadas/` ou atualize as
exclusões: os PNGs diretamente em `imagens/` e a pasta `selecionadas/` são fontes
de edição e não são publicados.

Essa redução vale para novas publicações. Ela não remove o armazenamento ocupado
por publicações antigas. Para o alerta de 10 GB, conferir Usage e a política de
retenção de deployments no painel. Antes de remover qualquer deployment antigo,
identificar a produção ativa e a versão necessária para rollback.

Referência: https://vercel.com/docs/deployments/vercel-ignore

## Netlify

O e-mail informa esgotamento de créditos e suspensão de novas publicações.
Alterações no código não devolvem créditos consumidos. Como o domínio principal
responde pela Vercel, conferir no painel se a Netlify ainda atende outro domínio
ou uma finalidade necessária. Caso seja uma publicação duplicada, interromper
os builds automáticos desse projeto evita consumo futuro.

Não interromper as atualizações dos JSONs para economizar deployments na hospedagem
principal: isso deixaria as cotações do site desatualizadas. O plano por créditos
da Netlify cobra também por publicações de produção, além de tráfego e requisições.

Referência: https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/

## GitHub Pages

As últimas execuções consultadas estavam concluídas com sucesso. A falha de
21/09/2026 às 16:44 UTC ocorreu no deploy e registrou ausência de `id-token: write`;
o build daquela execução passou. O aviso de build de 08/09 é outra execução, cujo
log completo não estava disponível na consulta pública realizada.

O arquivo `.nojekyll` sinaliza que este site já contém HTML estático e dispensa
processamento Jekyll. Ele não altera permissões da conta. Caso a falha de permissão
se repita, conferir o workflow de Pages e suas permissões. Um workflow próprio de
deploy precisa de `contents: read`, `pages: write` e `id-token: write`.

Execução com erro de permissão: https://github.com/maisvaloryt-cpu/mais-valor/actions/runs/35627561737
Execução posterior bem-sucedida: https://github.com/maisvaloryt-cpu/mais-valor/actions/runs/35672116687

## AdSense

A página inicial contém a meta tag `google-adsense-account` com o mesmo publisher
do `ads.txt` e do script de anúncios. A meta tag permite verificar propriedade
sem depender da escolha de cookies do visitante.

Após publicar, em AdSense → Sites → canalmaisvalor.com.br, usar a opção de
verificação por **meta tag** (ou por `ads.txt`, se preferir). Verificar que o
identificador mostrado na conta é `ca-pub-8043391674129748`.

Isso prepara a verificação técnica de propriedade. Uma eventual reprovação de
conteúdo, identidade ou conta exige o texto específico do erro no painel.

Referência: https://support.google.com/adsense/answer/7584263?hl=pt-BR
