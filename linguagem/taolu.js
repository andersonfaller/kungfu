/* Tàolù (套路): linguagem para descrever katis, sequências de golpes e rotinas de treino.
 * Funciona no navegador (window.Taolu) e no Node (require("./taolu.js")).
 *
 * API:
 *   Taolu.parse(src)          -> { ast, errors }
 *   Taolu.expand(ast)         -> { rows, stats, errors }   (repetições e espelhos desdobrados)
 *   Taolu.print(ast, lang)    -> código formatado em "pt", "en" ou "zh"
 *   Taolu.highlight(src)      -> HTML com <span class="t-...">
 *   Taolu.describe(ação, lang)-> { cat, text, zh, py }
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Taolu = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const LANGS = ["pt", "en", "zh"];
  const LANG_NAMES = { pt: "Português", en: "English", zh: "中文" };

  const CATS = {
    base:  { pt: "Bases", en: "Stances", zh: "步型" },
    passo: { pt: "Passos", en: "Footwork", zh: "步法" },
    mao:   { pt: "Mãos", en: "Hands", zh: "手法" },
    perna: { pt: "Pernas", en: "Legs", zh: "腿法" },
    corpo: { pt: "Corpo, olhar e respiração", en: "Body, gaze and breath", zh: "身法・眼法・呼吸" },
    along: { pt: "Alongamentos", en: "Stretches", zh: "柔韌" },
  };

  /* ------------------------------------------------------------------ vocabulário */
  // V(id, categoria, apelidos pt, apelidos en, apelidos zh, pinyin, nome pt, nome en, o que o lado indica, descrição)
  // O primeiro apelido de cada língua é o que aparece quando o código é traduzido.
  const V = (id, cat, pt, en, zh, py, nomePt, nomeEn, lado, desc) =>
    ({ id, cat, pt, en, zh, py, nome: { pt: nomePt, en: nomeEn, zh: zh[0] }, lado, desc });

  const VOCAB = [
    // Bases (步型)
    V("mabu", "base", ["cavalo"], ["horse"], ["馬步", "马步"], "mǎ bù", "Base do cavalo", "Horse stance", null,
      "Pés paralelos e bem afastados, joelhos dobrados, tronco ereto."),
    V("gongbu", "base", ["arco"], ["bow"], ["弓步"], "gōng bù", "Base do arco", "Bow stance", "perna da frente",
      "Perna da frente dobrada com o joelho sobre o pé; perna de trás estendida."),
    V("xubu", "base", ["gato", "vazia"], ["cat", "empty"], ["虛步", "虚步"], "xū bù", "Base vazia (gato)", "Empty stance", "perna da frente",
      "Peso quase todo na perna de trás; a da frente toca o chão só com a ponta."),
    V("pubu", "base", ["baixa"], ["drop"], ["仆步"], "pū bù", "Base baixa", "Drop stance", "perna estendida",
      "Uma perna totalmente agachada, a outra estendida rente ao chão."),
    V("xiebu", "base", ["descanso"], ["rest"], ["歇步"], "xiē bù", "Base de descanso", "Resting stance", "perna da frente",
      "Pernas cruzadas e agachadas, sentado sobre a perna de trás."),
    V("dulibu", "base", ["garça", "garca"], ["crane"], ["獨立步", "独立步"], "dú lì bù", "Base da garça", "Crane stance", "perna erguida",
      "Equilíbrio numa perna só, com o joelho da outra erguido."),
    V("bingbu", "base", ["unida"], ["together"], ["並步", "并步"], "bìng bù", "Pés unidos", "Feet together", null,
      "Pés juntos e pernas estendidas."),
    V("kailibu", "base", ["natural"], ["natural"], ["開立步", "开立步"], "kāi lì bù", "Em pé, pés afastados", "Natural stance", null,
      "Em pé, pés na largura dos ombros."),
    V("dingbu", "base", ["ding"], ["ding"], ["丁步"], "dīng bù", "Base T (dīng)", "T stance", "pé apoiado na ponta",
      "Agachado sobre uma perna; a ponta do outro pé toca o chão ao lado do pé de apoio."),
    V("chabu_base", "base", ["cruzada"], ["cross"], ["叉步"], "chā bù", "Base cruzada", "Cross stance", "perna de trás",
      "Uma perna cruza por trás da outra e apoia só a ponta do pé."),

    // Passos (步法)
    V("shangbu", "passo", ["avança"], ["step"], ["上步"], "shàng bù", "Avança", "Step forward", "pé que se move",
      "O pé indicado dá um passo à frente."),
    V("tuibu", "passo", ["recua"], ["retreat"], ["退步"], "tuì bù", "Recua", "Step back", "pé que se move",
      "O pé indicado dá um passo para trás."),
    V("chabu", "passo", ["cruza-atrás"], ["cross-behind"], ["插步"], "chā bù", "Cruza por trás", "Cross behind", "pé que se move",
      "O pé indicado cruza por trás do outro."),
    V("gaibu", "passo", ["cruza-frente"], ["cross-front"], ["蓋步", "盖步"], "gài bù", "Cruza pela frente", "Cross in front", "pé que se move",
      "O pé indicado cruza pela frente do outro."),
    V("dianbu", "passo", ["desliza"], ["shuffle"], ["墊步", "垫步"], "diàn bù", "Desliza", "Shuffle step", "pé que se move",
      "O pé de trás encosta no da frente, que avança deslizando."),
    V("tiaobu", "passo", ["salta"], ["jump"], ["跳步"], "tiào bù", "Salta", "Jump", "pé de impulso",
      "Pequeno salto, trocando ou não os pés."),
    V("zhuanshen", "passo", ["gira"], ["turn"], ["轉身", "转身"], "zhuǎn shēn", "Gira o corpo", "Turn", "sentido do giro",
      "Gira o corpo para o lado indicado. Diga o ângulo: gira 180 D."),
    V("shoujiao", "passo", ["recolhe"], ["draw"], ["收腳", "收脚"], "shōu jiǎo", "Recolhe o pé", "Draw foot in", "pé que se move",
      "Traz o pé indicado para junto do outro."),
    V("zhenjiao", "passo", ["pisa"], ["stamp"], ["震腳", "震脚"], "zhèn jiǎo", "Pisa forte", "Stamp", "pé que pisa",
      "Bate o pé no chão com força."),

    // Mãos (手法)
    V("chongquan", "mao", ["soco"], ["punch"], ["沖拳", "冲拳"], "chōng quán", "Soco direto", "Straight punch", "mão",
      "O punho sai da cintura girando e termina com a palma para baixo."),
    V("zaiquan", "mao", ["soco-baixo"], ["down-punch"], ["栽拳"], "zāi quán", "Soco para baixo", "Planting punch", "mão",
      "Soco que desce em direção ao chão."),
    V("chaoquan", "mao", ["soco-cima"], ["uppercut"], ["抄拳"], "chāo quán", "Soco de baixo para cima", "Uppercut", "mão",
      "Soco que sobe em arco curto."),
    V("guanquan", "mao", ["cruzado"], ["hook"], ["貫拳", "贯拳"], "guàn quán", "Soco cruzado", "Hook punch", "mão",
      "Soco em arco horizontal, de fora para dentro."),
    V("zaquan", "mao", ["martelo"], ["hammer"], ["砸拳"], "zá quán", "Martelo", "Hammer fist", "mão",
      "O punho desce batendo com a base, como um martelo."),
    V("fanbeiquan", "mao", ["revés"], ["backfist"], ["反背拳"], "fǎn bèi quán", "Soco de revés", "Backfist", "mão",
      "Bate com as costas do punho, num arco de dentro para fora."),
    V("tuizhang", "mao", ["palma"], ["palm"], ["推掌"], "tuī zhǎng", "Palma empurrando", "Push palm", "mão",
      "A palma vertical empurra à frente, dedos para cima."),
    V("pizhang", "mao", ["corte"], ["chop"], ["劈掌"], "pī zhǎng", "Palma em corte", "Chopping palm", "mão",
      "A palma desce cortando com a borda da mão."),
    V("chuanzhang", "mao", ["perfura"], ["pierce"], ["穿掌"], "chuān zhǎng", "Palma perfurante", "Piercing palm", "mão",
      "A mão estendida avança com a ponta dos dedos."),
    V("tiaozhang", "mao", ["ergue-palma"], ["lift-palm"], ["挑掌"], "tiāo zhǎng", "Palma que sobe", "Lifting palm", "mão",
      "A palma sobe à frente, dedos apontando para cima."),
    V("liangzhang", "mao", ["palma-alta"], ["flash-palm"], ["亮掌"], "liàng zhǎng", "Palma acima da cabeça", "Flash palm", "mão",
      "A palma gira e para acima da cabeça, ao lado da testa."),
    V("goushou", "mao", ["gancho"], ["hook-hand"], ["勾手"], "gōu shǒu", "Mão em gancho", "Hook hand", "mão",
      "Pontas dos dedos unidas e punho dobrado; costuma ficar atrás do corpo."),
    V("jia", "mao", ["bloqueio"], ["block"], ["架"], "jià", "Bloqueio alto", "Rising block", "mão",
      "O antebraço sobe e para acima da cabeça."),
    V("an", "mao", ["pressiona"], ["press"], ["按"], "àn", "Pressiona para baixo", "Press down", "mão",
      "A palma empurra para baixo."),
    V("lan", "mao", ["intercepta"], ["intercept"], ["攔", "拦"], "lán", "Intercepta", "Intercept", "mão",
      "O braço corta a linha do ataque e desvia para o lado."),
    V("gai", "mao", ["cobre"], ["cover"], ["蓋", "盖"], "gài", "Cobre", "Cover", "mão",
      "A palma passa por cima e desce, cobrindo o braço do oponente."),
    V("lou", "mao", ["varre-mão"], ["brush"], ["摟", "搂"], "lōu", "Varre com a mão", "Brushing hand", "mão",
      "A mão passa na horizontal desviando e costuma voltar à cintura."),
    V("zhua", "mao", ["agarra"], ["grab"], ["抓"], "zhuā", "Agarra", "Grab", "mão",
      "A mão fecha segurando."),
    V("baoquan", "mao", ["cintura"], ["chamber"], ["抱拳"], "bào quán", "Punho na cintura", "Fist at waist", "mão",
      "Punho fechado junto à cintura, palma para cima."),
    V("baoquanli", "mao", ["saudação", "saudacao"], ["salute"], ["抱拳禮", "抱拳礼"], "bào quán lǐ", "Saudação (Kin Lai)", "Fist-palm salute", null,
      "Punho direito fechado encostado na palma esquerda aberta, à frente do peito."),
    V("chuishou", "mao", ["solta"], ["release"], ["垂手"], "chuí shǒu", "Braços soltos", "Arms down", "mão",
      "Braço relaxado ao lado do corpo. Sem lado, os dois."),

    // Pernas (腿法)
    V("tantui", "perna", ["tan"], ["snap"], ["彈腿", "弹腿"], "tán tuǐ", "Chute tan (de ponta)", "Snap kick", "perna",
      "O joelho sobe e a perna estica rápido, batendo com a ponta do pé, na altura baixa ou média."),
    V("dengtui", "perna", ["frontal"], ["push-kick"], ["蹬腿"], "dēng tuǐ", "Chute frontal (de calcanhar)", "Heel thrust kick", "perna",
      "A perna estica empurrando com o calcanhar, dedos para cima."),
    V("cechuai", "perna", ["lateral"], ["side-kick"], ["側踹", "侧踹"], "cè chuài", "Chute lateral", "Side kick", "perna",
      "Com o corpo de lado, a perna estica batendo com a sola ou a borda do pé."),
    V("zhengtitui", "perna", ["esticado"], ["straight"], ["正踢腿"], "zhèng tī tuǐ", "Chute esticado à frente", "Straight front kick", "perna",
      "A perna estendida sobe à frente até perto da testa, com a ponta do pé puxada."),
    V("cetitui", "perna", ["esticado-lado"], ["straight-side"], ["側踢腿", "侧踢腿"], "cè tī tuǐ", "Chute esticado ao lado", "Straight side kick", "perna",
      "A perna estendida sobe pela lateral, em direção à orelha."),
    V("lihetui", "perna", ["crescente-in"], ["inside-crescent"], ["裡合腿", "里合腿"], "lǐ hé tuǐ", "Crescente para dentro", "Inside crescent kick", "perna",
      "A perna estendida faz um arco de fora para dentro."),
    V("waibaitui", "perna", ["crescente-out"], ["outside-crescent"], ["外擺腿", "外摆腿"], "wài bǎi tuǐ", "Crescente para fora", "Outside crescent kick", "perna",
      "A perna estendida faz um arco de dentro para fora."),
    V("paijiao", "perna", ["tapa"], ["slap"], ["拍腳", "拍脚"], "pāi jiǎo", "Chute com tapa", "Slap kick", "perna",
      "A perna sobe estendida e a mão bate no peito do pé."),
    V("saotui", "perna", ["varrida"], ["sweep"], ["掃腿", "扫腿"], "sǎo tuǐ", "Varrida", "Sweep", "perna que varre",
      "Agachado, a perna estendida gira rente ao chão. Com trás, é a varrida de costas."),
    V("tixi", "perna", ["joelho"], ["knee"], ["提膝"], "tí xī", "Joelho erguido", "Knee raise", "perna",
      "O joelho sobe à frente do corpo, como golpe ou postura."),
    V("xuanfengjiao", "perna", ["tornado"], ["tornado"], ["旋風腳", "旋风脚"], "xuàn fēng jiǎo", "Tornado", "Whirlwind kick", "perna que chuta",
      "Salto girando com crescente para dentro, batendo na palma."),
    V("tengkongfeijiao", "perna", ["voadora"], ["flying-kick"], ["騰空飛腳", "腾空飞脚"], "téng kōng fēi jiǎo", "Voadora com tapa", "Flying slap kick", "perna que chuta",
      "Salto; no ar a perna chuta e a mão bate no peito do pé."),

    // Corpo, olhar e respiração
    V("mushi", "corpo", ["olhar"], ["look"], ["目視", "目视"], "mù shì", "Olhar", "Gaze", null,
      "Para onde vão os olhos. Diga a direção: olhar esquerda."),
    V("qingshen", "corpo", ["inclina"], ["lean"], ["傾身", "倾身"], "qīng shēn", "Inclina o tronco", "Lean", null,
      "Inclina o tronco na direção indicada."),
    V("xi", "corpo", ["inspira"], ["inhale"], ["吸"], "xī", "Inspira", "Inhale", null, "Inspiração."),
    V("hu", "corpo", ["expira"], ["exhale"], ["呼"], "hū", "Expira", "Exhale", null, "Expiração."),

    // Alongamentos (柔韌)
    V("zhengyatui", "along", ["prensa-frente"], ["front-press"], ["正壓腿", "正压腿"], "zhèng yā tuǐ", "Prensa de perna à frente", "Front leg press", "perna estendida",
      "Calcanhar apoiado no alto e perna estendida; o tronco desce em direção à perna."),
    V("ceyatui", "along", ["prensa-lado"], ["side-press"], ["側壓腿", "侧压腿"], "cè yā tuǐ", "Prensa de perna ao lado", "Side leg press", "perna estendida",
      "Perna apoiada de lado; o tronco desce lateralmente sobre ela."),
    V("pubuyatui", "along", ["prensa-baixa"], ["drop-press"], ["仆步壓腿", "仆步压腿"], "pū bù yā tuǐ", "Prensa na base baixa", "Drop stance press", "perna estendida",
      "Na base baixa, leva o peso de um lado para o outro."),
    V("picha", "along", ["espacate"], ["split"], ["劈叉"], "pǐ chà", "Espacate frontal", "Front split", "perna da frente",
      "Pernas abertas à frente e atrás, no chão."),
    V("hengcha", "along", ["espacate-lado"], ["side-split"], ["橫叉", "横叉"], "héng chà", "Espacate lateral", "Side split", null,
      "Pernas abertas para os lados, no chão."),
    V("xiayao", "along", ["ponte"], ["bridge"], ["下腰"], "xià yāo", "Ponte", "Bridge", null,
      "Tronco arqueado para trás até apoiar as mãos no chão."),
    V("shuanyao", "along", ["giro-cintura"], ["waist-circle"], ["涮腰"], "shuàn yāo", "Giro de cintura", "Waist circle", "sentido do giro",
      "Tronco inclinado faz círculos amplos a partir da cintura."),
  ];

  /* ------------------------------------------------------------------ palavras da linguagem */
  const KW = {
    kati:      { pt: ["kati"], en: ["form"], zh: ["套路"] },
    rotina:    { pt: ["rotina"], en: ["routine"], zh: ["練習", "练习"] },
    sequencia: { pt: ["sequência", "sequencia"], en: ["sequence"], zh: ["組合", "组合"] },
    parte:     { pt: ["parte"], en: ["part"], zh: ["段"] },
    linha:     { pt: ["linha"], en: ["road"], zh: ["路"] },
    tecnica:   { pt: ["técnica", "tecnica"], en: ["technique"], zh: ["招"] },
    def:       { pt: ["def"], en: ["def"], zh: ["定"] },
    alt:       { pt: ["alt"], en: ["alt"], zh: ["換", "换"] },
    espelho:   { pt: ["espelho"], en: ["mirror"], zh: ["反"] },
    segura:    { pt: ["segura"], en: ["hold"], zh: ["保持"] },
  };
  const KIND_NAMES = {
    pt: { kati: "Kati", rotina: "Rotina", sequencia: "Sequência", parte: "Parte", linha: "Linha", tecnica: "Técnica" },
    en: { kati: "Form", rotina: "Routine", sequencia: "Sequence", parte: "Part", linha: "Road", tecnica: "Technique" },
    zh: { kati: "套路", rotina: "練習", sequencia: "組合", parte: "段", linha: "路", tecnica: "招" },
  };
  const BLOCKS = new Set(["kati", "rotina", "sequencia", "parte", "linha", "tecnica"]);
  const TOP_BLOCKS = new Set(["kati", "rotina", "sequencia"]);
  const SIDES = { D: { pt: "D", en: "R", zh: "右" }, E: { pt: "E", en: "L", zh: "左" } };
  const SIDE_EXACT = { D: "D", E: "E", R: "D", L: "E", "右": "D", "左": "E" };
  const LEVELS = {
    alto:  { pt: ["alto"], en: ["high"], zh: ["上"] },
    medio: { pt: ["médio", "medio"], en: ["mid"], zh: ["中"] },
    baixo: { pt: ["baixo"], en: ["low"], zh: ["下"] },
  };
  const DIRS = {
    frente: { pt: ["frente"], en: ["front"], zh: ["向前"], arrow: "↑" },
    tras:   { pt: ["trás", "tras"], en: ["back"], zh: ["向後", "向后"], arrow: "↓" },
    esq:    { pt: ["esquerda"], en: ["left"], zh: ["向左"], arrow: "←" },
    dir:    { pt: ["direita"], en: ["right"], zh: ["向右"], arrow: "→" },
  };
  const ARROWS = { "↑": "frente", "↓": "tras", "←": "esq", "→": "dir" };
  const FIELDS = {
    chines: { pt: ["chinês", "chines"], en: ["chinese"], zh: ["中文"] },
    estilo: { pt: ["estilo"], en: ["style"], zh: ["風格", "风格"] },
    nota:   { pt: ["nota"], en: ["note"], zh: ["註", "注"] },
    fonte:  { pt: ["fonte"], en: ["source"], zh: ["來源", "来源"] },
    fase:   { pt: ["fase"], en: ["level"], zh: ["階段", "阶段"] },
  };

  // Palavras usadas na leitura (descrição por extenso)
  const WORDS = {
    side:  { pt: { D: "direita", E: "esquerda" }, en: { D: "right", E: "left" }, zh: { D: "右", E: "左" } },
    level: { pt: { alto: "alto", medio: "médio", baixo: "baixo" }, en: { alto: "high", medio: "middle", baixo: "low" }, zh: { alto: "上盤", medio: "中盤", baixo: "下盤" } },
    dir:   { pt: { frente: "para a frente", tras: "para trás", esq: "para a esquerda", dir: "para a direita" },
             en: { frente: "forward", tras: "backward", esq: "to the left", dir: "to the right" },
             zh: { frente: "向前", tras: "向後", esq: "向左", dir: "向右" } },
    todo:  { pt: "a descrever", en: "to be described", zh: "待補" },
    mods:  { pt: { forca: "explosivo", suave: "suave", pausa: "pausa", grito: "grito" },
             en: { forca: "explosive", suave: "soft", pausa: "pause", grito: "shout" },
             zh: { forca: "發力", suave: "慢", pausa: "停", grito: "喝" } },
  };

  /* ------------------------------------------------------------------ índice de palavras */
  const fold = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const BYID = {};
  const LEX = new Map();
  const FIELDMAP = new Map();
  const CONFLICTS = [];
  const lexAdd = (alias, val) => {
    const k = fold(alias);
    const prev = LEX.get(k);
    if (prev && (prev.t !== val.t || prev.id !== val.id)) { CONFLICTS.push(alias); return; }
    LEX.set(k, val);
  };
  for (const e of VOCAB) {
    BYID[e.id] = e;
    for (const l of LANGS) for (const a of e[l]) lexAdd(a, { t: "term", id: e.id });
  }
  for (const [id, m] of Object.entries(KW)) for (const l of LANGS) for (const a of m[l]) lexAdd(a, { t: "kw", id });
  for (const [id, m] of Object.entries(LEVELS)) for (const l of LANGS) for (const a of m[l]) lexAdd(a, { t: "level", id });
  for (const [id, m] of Object.entries(DIRS)) for (const l of LANGS) for (const a of m[l]) lexAdd(a, { t: "dir", id });
  for (const [id, m] of Object.entries(FIELDS)) for (const l of LANGS) for (const a of m[l]) FIELDMAP.set(fold(a), id);
  // Pinyin sem tons também vale em qualquer língua (mabu, gongbu, chongquan…), quando não é ambíguo.
  const pyCount = {};
  for (const e of VOCAB) { const k = fold(e.py).replace(/\s+/g, ""); pyCount[k] = (pyCount[k] || 0) + 1; }
  for (const e of VOCAB) {
    const k = fold(e.py).replace(/\s+/g, "");
    if (pyCount[k] === 1 && !LEX.has(k)) LEX.set(k, { t: "term", id: e.id });
  }

  function classify(w) {
    if (SIDE_EXACT[w]) return [{ t: "side", id: SIDE_EXACT[w] }];
    const hit = LEX.get(fold(w));
    if (hit) return [hit];
    // Chinês com o lado colado: 右弓步, 左沖拳
    if (w.length > 1 && (w[0] === "左" || w[0] === "右")) {
      const rest = LEX.get(fold(w.slice(1)));
      if (rest && rest.t === "term") return [{ t: "side", id: SIDE_EXACT[w[0]] }, rest];
    }
    return null;
  }

  function lev(a, b) {
    const m = a.length, n = b.length;
    if (Math.abs(m - n) > 2) return 9;
    const d = Array.from({ length: m + 1 }, (_, i) => [i]);
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n];
  }
  function suggest(w) {
    const k = fold(w); let best = null, bd = 3;
    for (const key of LEX.keys()) { const x = lev(k, key); if (x < bd) { bd = x; best = key; } }
    return bd <= 2 ? best : null;
  }

  /* ------------------------------------------------------------------ léxico */
  const WORDCH = /[\p{L}\p{M}\p{N}_'\-]/u;
  const SYMS = "{}[]+,:!~*?…↑↓←→×";

  function tokenize(src) {
    const out = [];
    let i = 0, line = 1, ls = 0, bol = true;
    const add = (type, v, s, e) => { out.push({ type, v, s, e, line, col: s - ls + 1 }); if (type !== "nl") bol = false; };
    while (i < src.length) {
      const c = src[i];
      if (c === "\n") { add("nl", "\n", i, i + 1); i++; line++; ls = i; bol = true; continue; }
      if (c === " " || c === "\t" || c === "\r" || c === " ") { i++; continue; }
      if (c === "#") { let j = i; while (j < src.length && src[j] !== "\n") j++; add("comment", src.slice(i + 1, j).trim(), i, j); i = j; continue; }
      if (c === ";") { add("sep", ";", i, i + 1); i++; continue; }
      if (c === '"' || c === "“") {
        const close = c === '"' ? '"' : "”";
        let j = i + 1; while (j < src.length && src[j] !== close && src[j] !== "\n") j++;
        if (src[j] !== close) { add("bad", "Faltou fechar as aspas", i, j); i = j; continue; }
        add("str", src.slice(i + 1, j), i, j + 1); i = j + 1; continue;
      }
      if (c === "@") { let j = i + 1; while (j < src.length && WORDCH.test(src[j])) j++; add("call", src.slice(i + 1, j), i, j); i = j; continue; }
      if (src.startsWith("...", i)) { add("sym", "…", i, i + 3); i += 3; continue; }
      if (c === "×" && /\d/.test(src[i + 1] || "")) { let j = i + 1; while (/\d/.test(src[j] || "")) j++; add("rep", Number(src.slice(i + 1, j)), i, j); i = j; continue; }
      if (SYMS.includes(c)) { add("sym", c, i, i + 1); i++; continue; }
      if (/\d/.test(c)) {
        let j = i; while (j < src.length && /\d/.test(src[j])) j++;
        const n = Number(src.slice(i, j));
        if (bol && (src[j] === "." || src[j] === ")")) { add("numlabel", n, i, j + 1); i = j + 1; continue; }
        const m = src.slice(j).match(/^(min|s|秒|分)(?![\p{L}])/u);
        if (m) { add("dur", m[1] === "min" || m[1] === "分" ? n * 60 : n, i, j + m[1].length); i = j + m[1].length; continue; }
        add("num", n, i, j); i = j; continue;
      }
      if (WORDCH.test(c)) {
        let j = i; while (j < src.length && WORDCH.test(src[j])) j++;
        const w = src.slice(i, j);
        const rm = w.match(/^[x×](\d+)$/);
        if (rm) add("rep", Number(rm[1]), i, j); else add("word", w, i, j);
        i = j; continue;
      }
      add("bad", "Caractere que a linguagem não usa: " + c, i, i + 1); i++;
    }
    add("eof", "", src.length, src.length);
    return out;
  }

  /* ------------------------------------------------------------------ análise */
  function parse(src) {
    const all = tokenize(src);
    const errors = [];
    for (const t of all) if (t.type === "bad") errors.push({ line: t.line, col: t.col, msg: t.v });
    const toks = all.filter((t) => t.type !== "numlabel" && t.type !== "bad");
    let p = 0;
    const peek = (k = 0) => toks[Math.min(p + k, toks.length - 1)];
    const next = () => toks[p++];
    const isSym = (t, s) => t.type === "sym" && t.v === s;
    const kw = (t) => { if (t.type !== "word") return null; const h = LEX.get(fold(t.v)); return h && h.t === "kw" ? h.id : null; };
    const fail = (t, msg) => { throw { tok: t, msg }; };
    const text = (t) => src.slice(t.s, t.e) || "fim do texto";
    const endOfLine = (t) => t.type === "nl" || t.type === "sep" || t.type === "eof";
    const isRepStart = (t) => t.type === "rep" || ((t.type === "word" && t.v === "x") || isSym(t, "×")) && peek(1).type === "num" || kw(t) === "alt";

    function recover() { while (!endOfLine(peek()) && !isSym(peek(), "}") && !isSym(peek(), "]")) p++; }

    function parseItems(endSym) {
      const items = [];
      for (;;) {
        const t = peek();
        if (t.type === "nl" || t.type === "sep") { p++; continue; }
        if (t.type === "eof") { if (endSym) errors.push({ line: t.line, col: t.col, msg: `Faltou fechar com ${endSym}` }); break; }
        if (endSym && isSym(t, endSym)) break;
        if (isSym(t, "}") || isSym(t, "]")) { errors.push({ line: t.line, col: t.col, msg: `${t.v} sem a abertura correspondente` }); p++; continue; }
        if (t.type === "comment") { items.push({ type: "comment", text: t.v, line: t.line }); p++; continue; }
        try {
          if (t.type === "word" && isSym(peek(1), ":")) { items.push(parseField()); continue; }
          const k = kw(t);
          if (k && BLOCKS.has(k)) { items.push(parseBlock()); continue; }
          if (k === "def") { items.push(parseDef()); continue; }
          if (isSym(t, "[")) { items.push(parseRepeat()); continue; }
          if (t.type === "call") { items.push(parseCall()); continue; }
          items.push(parseMove());
        } catch (e) {
          if (!e || !e.tok) throw e;
          errors.push({ line: e.tok.line, col: e.tok.col, msg: e.msg });
          recover();
        }
      }
      return items;
    }

    function parseField() {
      const t = next(); next(); // chave e ":"
      let value = "";
      if (peek().type === "str") value = next().v;
      else {
        const parts = [];
        while (!endOfLine(peek()) && peek().type !== "comment" && !isSym(peek(), "}")) parts.push(text(next()));
        value = parts.join(" ");
      }
      const id = FIELDMAP.get(fold(t.v)) || null;
      return { type: "field", key: t.v, id, value, line: t.line };
    }

    function openBrace(what) {
      while (peek().type === "nl") p++;
      if (!isSym(peek(), "{")) fail(peek(), `Esperava { depois de ${what}`);
      p++;
    }
    function closeBrace(node) {
      if (isSym(peek(), "}")) p++;
      if (peek().type === "comment") node.comment = next().v;
    }

    function parseBlock() {
      const t = next(); const kind = kw(t);
      const node = { type: "block", kind, num: null, title: null, body: [], line: t.line };
      if (peek().type === "num") node.num = next().v;
      if (peek().type === "str") node.title = next().v;
      openBrace(t.v);
      node.body = parseItems("}");
      closeBrace(node);
      return node;
    }

    function parseDef() {
      const t = next(); const n = peek();
      if (n.type !== "word") fail(n, "Depois de def vem um nome, por exemplo: def abertura { … }");
      p++;
      const node = { type: "def", name: n.v, body: [], line: t.line };
      openBrace("def " + n.v);
      node.body = parseItems("}");
      closeBrace(node);
      return node;
    }

    function parseRepSuffix() {
      let times = null, alt = false;
      for (;;) {
        const t = peek();
        if (t.type === "rep") { times = t.v; p++; continue; }
        if (((t.type === "word" && t.v === "x") || isSym(t, "×")) && peek(1).type === "num") { times = peek(1).v; p += 2; continue; }
        if (kw(t) === "alt") { alt = true; p++; continue; }
        break;
      }
      if (times === 0) fail(peek(), "Repetir zero vezes não faz sentido");
      return { times, alt };
    }

    function parseRepeat() {
      const t = next();
      const body = parseItems("]");
      if (!isSym(peek(), "]")) fail(peek(), "Faltou fechar a repetição com ]");
      p++;
      const r = parseRepSuffix();
      if (!r.times) { if (r.alt) r.times = 2; else fail(peek(), "Diga quantas vezes repetir, por exemplo: ] x3"); }
      const node = { type: "repeat", times: r.times, alt: r.alt, body, line: t.line };
      if (peek().type === "comment") node.comment = next().v;
      return node;
    }

    function parseCall() {
      const t = next();
      let mirror = false;
      if (kw(peek()) === "espelho") { mirror = true; p++; }
      const r = parseRepSuffix();
      const node = { type: "call", name: t.v, mirror, times: r.times || (r.alt ? 2 : 1), alt: r.alt, line: t.line, col: t.col };
      if (peek().type === "comment") node.comment = next().v;
      else if (!endOfLine(peek()) && !isSym(peek(), "}") && !isSym(peek(), "]")) fail(peek(), `Não entendi "${text(peek())}" depois de @${t.v}`);
      return node;
    }

    function actionEnds(t) {
      if (["nl", "sep", "eof", "comment", "str", "rep", "dur"].includes(t.type)) return true;
      if (t.type === "sym" && "+,}]!~*…".includes(t.v)) return true;
      const k = kw(t);
      if (k === "alt" || k === "segura") return true;
      if ((t.type === "word" && t.v === "x" || isSym(t, "×")) && peek(1).type === "num") return true;
      return false;
    }

    function parseAction() {
      const t = peek();
      if (t.type === "str") { p++; return { kind: "free", text: t.v }; }
      if (isSym(t, "?")) { p++; return { kind: "todo" }; }
      const a = { kind: "term", id: null, side: null, level: null, dir: null, num: null };
      let firstTerm = null, n = 0;
      while (!actionEnds(peek())) {
        const k = peek(); n++;
        if (k.type === "num") { a.num = k.v; p++; continue; }
        if (k.type === "sym" && ARROWS[k.v]) { a.dir = ARROWS[k.v]; p++; continue; }
        if (k.type === "sym") fail(k, `O símbolo ${k.v} não cabe aqui`);
        if (k.type === "call") fail(k, "Uma chamada @nome fica sozinha na linha");
        if (k.type !== "word") fail(k, "Não entendi isto");
        const parts = classify(k.v);
        if (!parts) {
          const s = /[㐀-鿿]/.test(k.v) ? null : suggest(k.v);
          fail(k, s ? `Não conheço "${k.v}". Quis dizer "${s}"?` : `Não conheço "${k.v}". Para algo fora do vocabulário, escreva entre aspas: "${k.v}"`);
        }
        for (const part of parts) {
          if (part.t === "term") {
            if (a.id) fail(k, `Faltou + ou vírgula entre "${firstTerm}" e "${k.v}". Use + para ao mesmo tempo e vírgula para em seguida.`);
            a.id = part.id; firstTerm = k.v;
          } else if (part.t === "side") a.side = part.id;
          else if (part.t === "level") a.level = part.id;
          else if (part.t === "dir") a.dir = part.id;
          else fail(k, `"${k.v}" não pode aparecer no meio de um movimento`);
        }
        p++;
      }
      if (!n) fail(peek(), `Esperava um movimento antes de "${text(peek())}"`);
      if (!a.id) fail(t, "Falta dizer a técnica: qual base, passo, mão ou perna");
      return a;
    }

    function parseMove() {
      const start = peek();
      const groups = [[]];
      for (;;) {
        groups[groups.length - 1].push(parseAction());
        const t = peek();
        if (isSym(t, "+")) { p++; continue; }
        if (isSym(t, ",")) { p++; groups.push([]); continue; }
        break;
      }
      const mv = { type: "move", groups, mods: {}, label: null, times: 1, alt: false, line: start.line };
      for (;;) {
        const t = peek();
        if (isSym(t, "!")) { mv.mods.forca = true; p++; continue; }
        if (isSym(t, "~")) { mv.mods.suave = true; p++; continue; }
        if (isSym(t, "…")) { mv.mods.pausa = true; p++; continue; }
        if (isSym(t, "*")) { p++; mv.mods.grito = peek().type === "str" ? next().v : true; continue; }
        if (kw(t) === "segura") { p++; if (peek().type !== "dur") fail(peek(), "Depois de segura vem um tempo, por exemplo: segura 30s"); mv.mods.dur = next().v; continue; }
        if (t.type === "dur") { mv.mods.dur = t.v; p++; continue; }
        if (isRepStart(t)) {
          const r = parseRepSuffix();
          if (r.times) mv.times = r.times;
          if (r.alt) { mv.alt = true; if (mv.times === 1) mv.times = 2; }
          continue;
        }
        if (t.type === "str") { if (mv.label !== null) fail(t, "Este movimento já tem um nome"); mv.label = t.v; p++; continue; }
        break;
      }
      const e = peek();
      if (e.type === "comment") { mv.comment = e.v; p++; }
      else if (!endOfLine(e) && !isSym(e, "}") && !isSym(e, "]")) {
        fail(e, isSym(e, ",") || isSym(e, "+")
          ? "Os sinais ! ~ * … e o tempo vão no fim do movimento"
          : `Não entendi "${text(e)}" aqui`);
      }
      return mv;
    }

    const items = parseItems(null);
    errors.sort((a, b) => a.line - b.line || a.col - b.col);
    return { ast: { type: "program", items }, errors };
  }

  /* ------------------------------------------------------------------ desdobramento */
  const flip = (a) => (a.kind !== "term" ? a : {
    ...a,
    side: a.side === "D" ? "E" : a.side === "E" ? "D" : a.side,
    dir: a.dir === "esq" ? "dir" : a.dir === "dir" ? "esq" : a.dir,
  });

  function fieldsOf(items) {
    const f = {};
    for (const it of items) if (it.type === "field") f[it.id || it.key] = it.value;
    return f;
  }

  function expand(ast, opts = {}) {
    const limit = opts.limit || 4000;
    const defs = new Map();
    const errors = [];
    (function collect(items) {
      for (const it of items) {
        if (it.type === "def") { if (defs.has(it.name)) errors.push({ line: it.line, col: 1, msg: `def ${it.name} aparece duas vezes` }); defs.set(it.name, it); }
        if (it.body) collect(it.body);
      }
    })(ast.items);

    const rows = [];
    const stats = { moves: 0, todo: 0, dur: 0, cats: {}, truncated: false };
    let n = 0;

    function walk(items, mirror, depth, stack) {
      for (const it of items) {
        if (rows.length >= limit) { stats.truncated = true; return; }
        if (it.type === "block") {
          if (TOP_BLOCKS.has(it.kind)) n = 0;
          rows.push({ type: "head", kind: it.kind, num: it.num, title: it.title, depth, fields: fieldsOf(it.body), line: it.line });
          walk(it.body, mirror, depth + 1, stack);
        } else if (it.type === "repeat") {
          for (let i = 0; i < it.times; i++) walk(it.body, mirror !== (it.alt && i % 2 === 1), depth, stack);
        } else if (it.type === "call") {
          const d = defs.get(it.name);
          if (!d) { errors.push({ line: it.line, col: it.col || 1, msg: `Não existe def ${it.name}` }); continue; }
          if (stack.includes(it.name)) { errors.push({ line: it.line, col: it.col || 1, msg: `def ${it.name} chama a si mesmo` }); continue; }
          for (let i = 0; i < it.times; i++) walk(d.body, (mirror !== it.mirror) !== (it.alt && i % 2 === 1), depth, stack.concat(it.name));
        } else if (it.type === "move") {
          for (let i = 0; i < it.times; i++) {
            const m = mirror !== (it.alt && i % 2 === 1);
            n++;
            const groups = it.groups.map((g) => g.map((a) => (m ? flip(a) : a)));
            const todo = groups.some((g) => g.some((a) => a.kind === "todo"));
            rows.push({ type: "move", n, groups, mods: it.mods, label: it.label, line: it.line, mirrored: m, todo });
            stats.moves++;
            if (todo) stats.todo++;
            if (it.mods.dur) stats.dur += it.mods.dur;
            for (const g of groups) for (const a of g) if (a.kind === "term") { const c = BYID[a.id].cat; stats.cats[c] = (stats.cats[c] || 0) + 1; }
          }
        }
      }
    }
    walk(ast.items, false, 0, []);
    return { rows, stats, errors };
  }

  /* ------------------------------------------------------------------ impressão (tradução) */
  const quote = (s) => '"' + String(s).replace(/"/g, "'") + '"';
  const kwName = (id, lang) => KW[id][lang][0];
  function durStr(secs, lang) {
    if (lang === "zh") return secs >= 60 && secs % 60 === 0 ? secs / 60 + "分" : secs + "秒";
    return secs >= 60 && secs % 60 === 0 ? secs / 60 + "min" : secs + "s";
  }
  function actStr(a, lang) {
    if (a.kind === "free") return quote(a.text);
    if (a.kind === "todo") return "?";
    const e = BYID[a.id];
    const name = e[lang][0];
    const tail = [];
    if (a.num != null) tail.push(a.num);
    if (lang !== "zh" && a.side) tail.push(SIDES[a.side][lang]);
    if (a.level) tail.push(LEVELS[a.level][lang][0]);
    if (a.dir) tail.push(DIRS[a.dir][lang][0]);
    const head = lang === "zh" && a.side ? SIDES[a.side].zh + name : name;
    return [head, ...tail].join(" ");
  }
  function repStr(times, alt, lang) {
    if (!times || times < 2) return alt ? " " + kwName("alt", lang) : "";
    return " " + (lang === "zh" ? "×" : "x") + times + (alt ? " " + kwName("alt", lang) : "");
  }
  function moveStr(m, lang, withRep = true) {
    let s = m.groups.map((g) => g.map((a) => actStr(a, lang)).join(" + ")).join(", ");
    const md = m.mods;
    if (md.forca) s += " !";
    if (md.suave) s += " ~";
    if (md.pausa) s += " …";
    if (md.grito) s += md.grito === true ? " *" : " * " + quote(md.grito);
    if (md.dur) s += " " + kwName("segura", lang) + " " + durStr(md.dur, lang);
    if (withRep) s += repStr(m.times, m.alt && m.times === 2 ? true : m.alt, lang);
    if (m.label != null) s += "  " + quote(m.label);
    return s;
  }
  function print(ast, lang = "pt") {
    const L = [];
    const cmt = (n) => (n.comment ? "   # " + n.comment : "");
    const fieldKey = (it) => (it.id ? FIELDS[it.id][lang][0] : it.key);
    function pr(items, ind) {
      const pad = "  ".repeat(ind);
      let prevBlock = false;
      for (const it of items) {
        if (it.type === "block" && prevBlock) L.push("");
        prevBlock = it.type === "block" || it.type === "def";
        if (it.type === "comment") L.push(pad + "# " + it.text);
        else if (it.type === "field") L.push(pad + fieldKey(it) + ": " + quote(it.value));
        else if (it.type === "block") {
          const head = [kwName(it.kind, lang), it.num != null ? it.num : null, it.title != null ? quote(it.title) : null].filter((x) => x !== null).join(" ");
          if (it.body.length === 1 && it.body[0].type === "move" && !it.body[0].comment && moveStr(it.body[0], lang).length < 40) {
            L.push(pad + head + " { " + moveStr(it.body[0], lang) + " }" + cmt(it));
          } else {
            L.push(pad + head + " {"); pr(it.body, ind + 1); L.push(pad + "}" + cmt(it));
          }
        } else if (it.type === "def") {
          L.push(pad + kwName("def", lang) + " " + it.name + " {"); pr(it.body, ind + 1); L.push(pad + "}" + cmt(it));
        } else if (it.type === "repeat") {
          const simple = it.body.length <= 3 && it.body.every((b) => b.type === "move" && !b.comment);
          const inline = simple ? "[ " + it.body.map((b) => moveStr(b, lang)).join(" ; ") + " ]" : null;
          if (inline && inline.length <= 72) L.push(pad + inline + repStr(it.times, it.alt, lang) + cmt(it));
          else { L.push(pad + "["); pr(it.body, ind + 1); L.push(pad + "]" + repStr(it.times, it.alt, lang) + cmt(it)); }
        } else if (it.type === "call") {
          L.push(pad + "@" + it.name + (it.mirror ? " " + kwName("espelho", lang) : "") + repStr(it.times, it.alt, lang) + cmt(it));
        } else if (it.type === "move") {
          L.push(pad + moveStr(it, lang) + cmt(it));
        }
      }
    }
    pr(ast.items, 0);
    return L.join("\n") + "\n";
  }

  /* ------------------------------------------------------------------ leitura */
  function describe(a, lang = "pt") {
    if (a.kind === "free") return { cat: "livre", text: a.text };
    if (a.kind === "todo") return { cat: "todo", text: WORDS.todo[lang] };
    const e = BYID[a.id];
    const args = [];
    if (lang !== "zh" && a.side) args.push(WORDS.side[lang][a.side]);
    if (a.num != null) args.push(a.num + "°");
    if (a.level) args.push(WORDS.level[lang][a.level]);
    if (a.dir) args.push(WORDS.dir[lang][a.dir]);
    if (lang === "zh") {
      return { cat: e.cat, text: (a.side ? WORDS.side.zh[a.side] : "") + e.zh[0] + (args.length ? " " + args.join(" ") : ""), zh: e.zh[0], py: e.py };
    }
    return { cat: e.cat, text: e.nome[lang] + (args.length ? " (" + args.join(", ") + ")" : ""), zh: e.zh[0], py: e.py };
  }

  /* ------------------------------------------------------------------ destaque de sintaxe */
  const escHTML = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function tokClass(t, toks, idx) {
    switch (t.type) {
      case "comment": return "t-cmt";
      case "str": return "t-str";
      case "num": case "dur": case "rep": case "numlabel": return "t-num";
      case "call": return "t-call";
      case "bad": return "t-bad";
      case "sym":
        if ("!~*…".includes(t.v)) return "t-mod";
        if ("+,".includes(t.v)) return "t-op";
        if (ARROWS[t.v]) return "t-dir";
        if (t.v === "?") return "t-todo";
        return "t-br";
      case "word": {
        const nx = toks[idx + 1];
        if (nx && nx.type === "sym" && nx.v === ":") return "t-key";
        if (t.v === "x" && nx && nx.type === "num") return "t-num";
        const r = classify(t.v);
        if (!r) return "t-unk";
        const term = r.find((x) => x.t === "term");
        if (term) return "t-" + BYID[term.id].cat;
        return { side: "t-side", level: "t-side", dir: "t-dir", kw: "t-kw" }[r[0].t] || "";
      }
      default: return "";
    }
  }
  function highlight(src) {
    const toks = tokenize(src);
    let html = "", last = 0;
    toks.forEach((t, i) => {
      if (t.type === "eof") return;
      html += escHTML(src.slice(last, t.s));
      const raw = src.slice(t.s, t.e);
      const cls = t.type === "nl" ? "" : tokClass(t, toks, i);
      html += cls ? `<span class="${cls}">${escHTML(raw)}</span>` : escHTML(raw);
      last = t.e;
    });
    return html + escHTML(src.slice(last));
  }

  return {
    LANGS, LANG_NAMES, CATS, VOCAB, BYID, KW, KIND_NAMES, SIDES, LEVELS, DIRS, ARROWS, FIELDS, WORDS, CONFLICTS,
    tokenize, parse, expand, print, describe, highlight, classify,
    translate(src, lang) { const r = parse(src); return r.errors.length ? null : print(r.ast, lang); },
  };
});
