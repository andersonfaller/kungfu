# Tàolù (套路)

Linguagem para descrever katis, sequências de socos e chutes e rotinas de treino.
Documentação e editor: https://claude.ai/artifact/Mf4M4bkVFkkiYjh17Qadmo

- `taolu.js`: interpretador (análise, desdobramento de repetições, tradução pt/en/zh, destaque de sintaxe).
  Funciona no navegador (`window.Taolu`) e no Node (`require("./taolu.js")`).
- `exemplos.js`: exemplos e trechos do guia.
- `index.html`: página de documentação publicada como artifact.

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

Uso no Node:

```js
const T = require("./taolu.js");
const { ast, errors } = T.parse(codigo);
const { rows, stats } = T.expand(ast);   // movimentos numerados, repetições desdobradas
console.log(T.print(ast, "zh"));         // o mesmo código em chinês
```
