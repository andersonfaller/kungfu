/* Exemplos e trechos do guia da linguagem Tàolù. Página: window.TaoluExemplos. Node: require("./exemplos.js"). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.TaoluExemplos = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const HERO = `# Um movimento por linha. "+" junta o que acontece junto; "," separa o que vem em seguida.
unida + cintura D + cintura E + olhar esquerda              "並步抱拳"
avança E, arco E + varre-mão E, soco D médio + cintura E !  "弓步沖拳"
[ tan D baixo + soco E médio + cintura D ] x2 alt
`;

  const DEMOS = {
    linha: `unida + cintura D + cintura E
avança E, arco E + soco D médio + cintura E
`,
    lados: `cavalo + bloqueio E + soco D médio direita + olhar direita
gira 180 D, arco D + palma D alto
baixa E ← + perfura E baixo ←
`,
    repeticao: `[ tan D baixo + soco E médio + cintura D ] x4 alt
"rotação dos ombros" x8
`,
    def: `def soco-no-arco {
  avança E, arco E + soco D médio + cintura E
}

@soco-no-arco
@soco-no-arco espelho
`,
    ritmo: `cavalo + soco D médio + cintura E ! * "Hā"
inspira + palma-alta D ~
cavalo + cintura D + cintura E segura 1min
`,
    texto: `gato D + ergue-palma D + gancho E trás   "Palma que sobe na base vazia"
arco E + "mãos em garra de tigre"
? "giro com salto: perguntar ao professor"
`,
    estrutura: `kati "Exemplo" {
  chinês: "例子"
  nota: "Campos, partes e linhas"

  parte "Abertura" {
    unida + saudação
  }
  linha 1 {
    [ avança E, arco E + soco D médio + cintura E ] x3 alt   # ida
    gira 180 D
  }
}
`,
    linguas: `avança E, arco E + soco D médio + cintura E !
[ tan D baixo + soco E médio + cintura D ] x2 alt
cavalo + cintura D + cintura E segura 30s
`,
  };

  const EXEMPLOS = [
    {
      id: "wubuquan",
      titulo: "Wǔ Bù Quán",
      han: "五步拳",
      tipo: "Kati completo",
      resumo: "A forma das cinco bases do wushu chinês, escrita do começo ao fim. Mostra bases, passos, mãos, giros e direções juntos.",
      src: `kati "Wǔ Bù Quán" {
  chinês: "五步拳"
  estilo: "Wushu chinês, forma básica"
  nota: "Forma das cinco bases: arco, cavalo, descanso, baixa e vazia. Os lados podem variar de escola para escola."

  parte "Preparação" {
    unida + cintura D + cintura E + olhar esquerda                     "並步抱拳 bìng bù bào quán"
  }

  parte "Forma" {
    avança E, arco E + varre-mão E, soco D médio + cintura E !          "弓步沖拳 gōng bù chōng quán"
    tan D baixo + soco E médio + cintura D !                            "彈踢沖拳 tán tī chōng quán"
    avança D + gira 90 E, cavalo + bloqueio E + soco D médio direita + olhar direita !   "馬步架打 mǎ bù jià dǎ"
    cruza-atrás E + cobre D, descanso D + soco E médio direita + cintura D !            "歇步蓋打 xiē bù gài dǎ"
    garça E + perfura D alto                                            "提膝穿掌 tí xī chuān zhǎng"
    baixa E esquerda + perfura E baixo esquerda + olhar esquerda        "仆步穿掌 pū bù chuān zhǎng"
    arco E, avança D, gato D + ergue-palma D + gancho E trás + olhar frente   "虛步挑掌 xū bù tiāo zhǎng"
  }

  parte "Fechamento" {
    recolhe D, unida + cintura D + cintura E + olhar frente             "並步抱拳"
    unida + solta ~                                                     "收勢 shōu shì"
  }
}
`,
    },
    {
      id: "tantui",
      titulo: "Tán Tuǐ 10",
      han: "彈腿",
      tipo: "Modelo para preencher",
      resumo: "A estrutura do Tantui de 10 linhas: preparação, dez linhas de ida e volta e fechamento. Cada ? é um movimento que você ainda vai escrever.",
      src: `kati "Tán Tuǐ 10" {
  chinês: "彈腿"
  estilo: "Shaolin do Norte, ASKF, 1ª fase"
  nota: "Modelo de estrutura. Cada linha vai e volta na mesma reta. Troque cada ? pelo que você aprendeu e ajuste as repetições."

  def preparacao {
    unida + saudação                    "抱拳禮 saudação"
    unida + cintura D + cintura E
  }

  @preparacao

  linha 1 {
    [ ? "movimento da ida" ] x3 alt     # quantas vezes na ida?
    gira 180 D
    [ ? "movimento da volta" ] x3 alt
  }
  linha 2 { ? }
  linha 3 { ? }
  linha 4 { ? }
  linha 5 { ? }
  linha 6 { ? }
  linha 7 { ? }
  linha 8 { ? }
  linha 9 { ? }
  linha 10 { ? }

  parte "Fechamento" {
    ?
    @preparacao
  }
}
`,
    },
    {
      id: "shaolin1",
      titulo: "1º Shǎo Lín",
      han: "練步拳",
      tipo: "Modelo para preencher",
      resumo: "Esqueleto do primeiro kati Shaolin, com abertura, partes e fechamento. Dite o kati e ele vira esta notação.",
      src: `kati "1º Shǎo Lín" {
  chinês: "練步拳"
  estilo: "Shaolin do Norte, ASKF, 1ª fase"
  nota: "Modelo para preencher, um movimento por linha."

  parte "Abertura" {
    unida + saudação                    "抱拳禮 saudação"
    ?
  }

  parte "1ª parte" {
    ?
    ?
    ?
  }

  parte "2ª parte" {
    ?
  }

  parte "Fechamento" {
    ?
    unida + saudação
  }
}
`,
    },
    {
      id: "golpes",
      titulo: "Socos e chutes da graduação",
      han: "拳・腿",
      tipo: "Modelo para preencher",
      resumo: "As listas numeradas da academia, com uma técnica por número. Os socos 1 a 6 e os chutes 1 a 7 são os que você já aprendeu.",
      src: `sequência "Socos da graduação" {
  estilo: "ASKF, aula de Força"
  nota: "Uma técnica por número: nome, base e execução."

  técnica 1 { ? }
  técnica 2 { ? }
  técnica 3 { ? }
  técnica 4 { ? }
  técnica 5 { ? }
  técnica 6 { ? }
}

sequência "Chutes da graduação" {
  estilo: "ASKF, aula de Kung Fu Tradicional"

  técnica 1 { ? }
  técnica 2 { ? }
  técnica 3 { ? }
  técnica 4 { ? }
  técnica 5 { ? }
  técnica 6 { ? }
  técnica 7 { ? }
}
`,
    },
    {
      id: "fundamentos",
      titulo: "Socos e chutes de base",
      han: "拳腳",
      tipo: "Exemplo geral",
      resumo: "Exercícios de base comuns no Shaolin do Norte e no wushu, para mostrar como fica uma sequência preenchida. Não é a lista numerada da academia.",
      src: `rotina "Socos e chutes de base" {
  nota: "Exercícios gerais. Não é a lista numerada da academia."

  parte "Soco direto parado" {
    cavalo + cintura D + cintura E
    [ soco D médio + cintura E ! ; soco E médio + cintura D ! ] x10
  }

  parte "Soco na base do arco, andando" {
    natural + cintura D + cintura E
    avança E, arco E + soco D médio + cintura E ! x6 alt
  }

  parte "Chute tan com soco" {
    natural + cintura D + cintura E
    [ tan D baixo + soco E médio + cintura D, avança D ] x6 alt
  }

  parte "Chute frontal e chute lateral" {
    [ frontal D médio, avança D ] x6 alt
    [ lateral D médio direita, recolhe D ] x6 alt
  }
}
`,
    },
    {
      id: "alongamento",
      titulo: "Aquecimento e alongamento",
      han: "壓腿",
      tipo: "Rotina",
      resumo: "Articulações, prensas de perna e aberturas, com tempos e repetições. Os itens entre aspas são movimentos livres, fora do vocabulário.",
      src: `rotina "Aquecimento e alongamento" {
  nota: "Ajuste tempos e repetições ao seu treino."

  parte "Articulações" {
    "rotação do pescoço" x8 alt
    "rotação dos ombros" x8 alt
    "rotação dos punhos e tornozelos" x8 alt
    giro-cintura D x8 alt
    "rotação dos joelhos" x8 alt
  }

  parte "Prensas de perna (壓腿)" {
    prensa-frente D segura 30s x2 alt
    prensa-lado D segura 30s x2 alt
    [ prensa-baixa D ~ ; prensa-baixa E ~ ] x6
  }

  parte "Aberturas" {
    espacate D segura 30s x2 alt
    espacate-lado segura 30s
    ponte segura 10s ~
  }
}
`,
    },
    {
      id: "jibengong",
      titulo: "Bases e chutes de base",
      han: "基本功",
      tipo: "Rotina",
      resumo: "O treino tradicional de base: segurar as posturas e chutar com a perna estendida, andando.",
      src: `rotina "Bases e chutes de base" {
  chinês: "基本功"
  nota: "Posturas paradas (樁功) e chutes com a perna estendida (踢腿)."

  parte "Posturas paradas (樁功)" {
    cavalo + cintura D + cintura E segura 1min ~
    arco D + cintura D + cintura E segura 30s x2 alt
    gato D + cintura D + cintura E segura 30s x2 alt
    baixa D segura 20s x2 alt
  }

  parte "Chutes com a perna estendida (踢腿)" {
    natural + cintura D + cintura E
    [ esticado D alto, avança D ] x10 alt
    [ esticado-lado D alto, avança D ] x10 alt
    [ crescente-in D alto, avança D ] x10 alt
    [ crescente-out D alto, avança D ] x10 alt
    [ tapa D alto, avança D ] x10 alt
  }
}
`,
    },
  ];

  return { HERO, DEMOS, EXEMPLOS };
});
