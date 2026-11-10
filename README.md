# Tàolù (套路)

Linguagem para descrever katis de Kung Fu, sequências de socos e chutes e rotinas de treino,
em português, inglês e chinês.

A documentação, o vocabulário, os exemplos e um editor ao vivo estão em `index.html`,
publicado pelo GitHub Pages.

```
kati "Exemplo" {
  parte "Abertura" {
    unida + saudação
  }
  linha 1 {
    [ avança E, arco E + soco D médio + cintura E ] x3 alt
    gira 180 D
  }
}
```

- `+` junta o que acontece ao mesmo tempo; a vírgula separa o que vem em seguida.
- `[ … ] x3` repete; `alt` troca os lados a cada repetição.
- `D`/`E` indicam o lado; `alto`, `médio`, `baixo` a altura; `frente`, `trás`, `esquerda`, `direita` a direção.

## Arquivos

- `index.html`: página de documentação com editor.
- `taolu.js`: interpretador (análise, desdobramento de repetições e espelhos, tradução pt/en/zh, destaque de sintaxe).
  Funciona no navegador (`window.Taolu`) e no Node (`require("./taolu.js")`).
- `exemplos.js`: exemplos e trechos do guia.

## Uso no Node

```js
const T = require("./taolu.js");
const { ast, errors } = T.parse(codigo);
const { rows, stats } = T.expand(ast);   // movimentos numerados, repetições desdobradas
console.log(T.print(ast, "zh"));         // o mesmo código em chinês
```
