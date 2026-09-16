# davidaugusto89.github.io

Cartão digital estático em HTML, CSS e JavaScript, com manifest e service worker próprios.
Não há etapa de build, lint ou typecheck configurada.

## Ícones do PWA

O original é `assets/icons/ti-icon.svg`: terminal `>_` em branco suave sobre
azul muito escuro, sem fontes ou imagens externas. Para regenerar os assets,
use Python 3 e Chromium já disponíveis no ambiente, sem instalar pacotes:

```sh
python3 scripts/generate-icons.py
```

Se necessário, defina `CHROMIUM` com o caminho do executável. O script gera
`favicon.ico` (16/32/48), favicons PNG (32/48), Apple Touch Icon (180),
ícones normais (192/512) e maskable (192/512). Todos os tamanhos são em pixels.
Os arquivos gerados são versionados; o site não precisa dessas ferramentas em produção.

As versões Apple e maskable têm fundo opaco até as bordas para receber o recorte
do sistema. O símbolo permanece dentro da área segura circular central de raio
40% da largura, conforme a [orientação para maskable icons](https://web.dev/articles/maskable-icon).
Os ícones normais têm cantos arredondados e transparência apenas nos cantos.

Ao alterar os assets, atualize também a versão do cache em `sw.js`.
