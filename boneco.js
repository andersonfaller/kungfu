/* Boneco: transforma os movimentos de um programa Tàolù em poses de um boneco 3D simples e desenha em <canvas>.
 * Navegador: window.Boneco. Node: require("./boneco.js").
 *
 *   const film = Boneco.build(rows, Taolu.BYID)   // rows = Taolu.expand(ast).rows
 *   film.initial                                   // pose de partida (em pé)
 *   film.steps[i] = { row, frames: [pose, ...] }   // uma pose por grupo separado por vírgula
 *   Boneco.mix(a, b, t)                            // pose intermediária, para animar
 *   Boneco.draw(ctx, pose, { w, h, cam: "frente" | "costas", colors, thumb })
 *
 * Coordenadas do corpo, em metros: x para a direita do praticante, y para cima, z para a frente do peito.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Boneco = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const L = { thigh: 0.44, shin: 0.44, ankle: 0.06, foot: 0.18, upper: 0.29, fore: 0.27, hipW: 0.09, spine: 0.52, shW: 0.19, neck: 0.19, head: 0.105 };
  const LEG = L.thigh + L.shin;
  const DIR_ANG = { frente: 0, dir: 90, esq: -90, tras: 180 };
  const SIDES = ["D", "E"];

  /* ---------------------------------------------------------------- vetores */
  const rad = (d) => (d * Math.PI) / 180;
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = (a) => Math.hypot(a[0], a[1], a[2]);
  const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const lerp = (a, b, t) => a + (b - a) * t;
  const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  // yaw positivo gira para a direita; pitch positivo inclina para a frente; roll positivo inclina para a direita
  const rotY = (p, d) => { const a = rad(d), c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; };
  const rotX = (p, d) => { const a = rad(d), c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; };
  const rotZ = (p, d) => { const a = rad(d), c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[1] * s, -p[0] * s + p[1] * c, p[2]]; };
  const chest = (sp) => (p) => rotY(rotX(rotZ(p, sp.roll), sp.pitch), sp.yaw);
  const chestInv = (sp) => (p) => rotZ(rotX(rotY(p, -sp.yaw), -sp.pitch), -sp.roll);
  const sgn = (side) => (side === "E" ? -1 : 1);
  const other = (side) => (side === "E" ? "D" : "E");

  // Cinemática inversa de dois segmentos (coxa+canela, braço+antebraço). "pole" é para onde o joelho/cotovelo aponta.
  function ik(rootP, target, l1, l2, pole) {
    const d = sub(target, rootP);
    let dist = len(d);
    const dir = dist > 1e-6 ? mul(d, 1 / dist) : [0, -1, 0];
    dist = Math.min((l1 + l2) * 0.999, Math.max(Math.abs(l1 - l2) + 0.02, dist));
    const end = add(rootP, mul(dir, dist));
    const ca = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist);
    const ang = Math.acos(Math.max(-1, Math.min(1, ca)));
    let pp = sub(pole, mul(dir, dot(pole, dir)));
    if (len(pp) < 1e-5) pp = Math.abs(dir[1]) < 0.9 ? cross(dir, [0, 1, 0]) : cross(dir, [1, 0, 0]);
    pp = norm(pp);
    const mid = add(rootP, add(mul(dir, Math.cos(ang) * l1), mul(pp, Math.sin(ang) * l1)));
    return { mid, end };
  }

  /* ---------------------------------------------------------------- bases */
  const F = (x, z, yaw = 0, mode = "flat", y = L.ankle) => ({ p: [x, y, z], yaw, mode });
  function stanceDef(id, side) {
    const s = sgn(side), S = side === "E" ? "E" : "D", O = other(S);
    const pair = (fs, fo, ks, ko) => ({ [S]: fs, [O]: fo, _k: { [S]: ks, [O]: ko } });
    const mk = (pelvis, feet, extra = {}) => ({ pelvis, feet: { D: feet.D, E: feet.E }, kp: feet._k || { D: [0.15, 0, 1], E: [-0.15, 0, 1] }, ...extra });
    switch (id) {
      case "bingbu": return mk([0, 0.93, 0], { D: F(0.06, 0), E: F(-0.06, 0) });
      case "mabu": return mk([0, 0.55, -0.02], { D: F(0.42, 0), E: F(-0.42, 0), _k: { D: [0.7, 0, 0.7], E: [-0.7, 0, 0.7] } });
      case "gongbu": return mk([0, 0.66, 0.03], pair(F(s * 0.14, 0.52), F(-s * 0.12, -0.5, -s * 45), [0, 0, 1], [-s * 0.3, 0, 1]));
      case "xubu": return mk([-s * 0.03, 0.64, -0.12], pair(F(s * 0.12, 0.3, 0, "toe", 0.1), F(-s * 0.1, -0.12, -s * 35), [0, 0, 1], [-s * 0.4, 0, 1]));
      case "pubu": return mk([-s * 0.18, 0.34, -0.02], pair(F(s * 0.7, 0.04), F(-s * 0.16, 0, -s * 30), [0, 1, 0.3], [-s * 0.8, 0, 0.6]));
      case "xiebu": return mk([s * 0.06, 0.42, 0], pair(F(s * 0.04, 0.16, s * 40), F(s * 0.2, -0.16, s * 10, "toe", 0.09), [s * 0.3, 0, 1], [s * 0.6, -0.2, 0.8]));
      case "dulibu": return mk([-s * 0.02, 0.91, 0], pair({ p: [s * 0.08, 0.5, 0.14], yaw: 0, mode: "point" }, F(-s * 0.06, 0), [0, 0.6, 1], [0, 0, 1]));
      case "dingbu": return mk([-s * 0.08, 0.68, -0.02], pair(F(-s * 0.01, 0.08, 0, "toe", 0.1), F(-s * 0.12, 0, -s * 10), [s * 0.3, 0, 1], [0, 0, 1]));
      case "chabu_base": case "chabu":
        return mk([-s * 0.08, 0.72, -0.04], pair(F(-s * 0.22, -0.3, -s * 20, "toe", 0.09), F(-s * 0.1, 0.12, -s * 30), [-s * 0.4, 0, 1], [0, 0, 1]));
      case "shangbu": return mk([0, 0.88, 0.06], pair(F(s * 0.12, 0.34), F(-s * 0.12, -0.18, -s * 20), [0, 0, 1], [0, 0, 1]));
      case "dianbu": return mk([0, 0.89, 0.04], pair(F(s * 0.12, 0.26), F(-s * 0.12, -0.08, -s * 15), [0, 0, 1], [0, 0, 1]));
      case "tuibu": return mk([0, 0.88, -0.06], pair(F(s * 0.12, -0.34, s * 20), F(-s * 0.12, 0.18), [0, 0, 1], [0, 0, 1]));
      case "gaibu": return mk([-s * 0.1, 0.84, 0.04], pair(F(-s * 0.24, 0.2, -s * 50), F(-s * 0.06, -0.1, -s * 10), [0, 0, 1], [0, 0, 1]));
      case "tiaobu": return mk([0, 1.12, 0], { D: F(0.14, 0.05, 0, "point", 0.3), E: F(-0.14, -0.05, 0, "point", 0.3) }, { air: true });
      case "shoujiao": return mk([0, 0.9, 0], pair(F(s * 0.07, 0), F(-s * 0.07, 0), [0, 0, 1], [0, 0, 1]));
      case "zhenjiao": return mk([0, 0.86, 0], pair(F(s * 0.16, 0.04), F(-s * 0.16, 0), [0, 0, 1], [0, 0, 1]));
      default: return mk([0, 0.92, 0], { D: F(0.17, 0, 8), E: F(-0.17, 0, -8) }); // kailibu: em pé
    }
  }
  // Para onde aponta a perna do lado indicado, em cada base (graus; 0 = frente do peito)
  const leadAngle = (id, side) => (id === "pubu" ? (side === "E" ? -90 : 90) : 0);

  /* ---------------------------------------------------------------- mãos */
  // off = alvo do punho a partir do ombro, no referencial do peito: [para fora, para cima, para a frente]
  const LVL_UP = { alto: 0.2, medio: -0.04, baixo: -0.42 };
  const TECH = {
    chongquan:  { off: [-0.07, 0, 0.53], lvl: true, dirOk: true, shape: "fist", pole: [0.4, -1, -0.2] },
    zaiquan:    { off: [-0.04, -0.5, 0.3], dirOk: true, shape: "fist", pole: [0.3, -0.3, -1] },
    chaoquan:   { off: [-0.1, 0.02, 0.25], shape: "fist", pole: [0.2, -1, 0.2] },
    guanquan:   { off: [-0.22, 0, 0.36], lvl: true, shape: "fist", pole: [1, 0.3, -0.2] },
    zaquan:     { off: [-0.04, -0.28, 0.42], dirOk: true, shape: "fist", pole: [0.3, -1, -0.3] },
    fanbeiquan: { off: [0.02, 0, 0.46], lvl: true, lvlDef: "alto", dirOk: true, shape: "fist", pole: [0.7, -0.5, 0] },
    tuizhang:   { off: [-0.07, 0, 0.5], lvl: true, dirOk: true, shape: "palmV", pole: [0.4, -1, 0] },
    pizhang:    { off: [-0.05, -0.18, 0.46], dirOk: true, shape: "palm", pole: [0.4, -1, 0] },
    chuanzhang: { off: [-0.05, 0, 0.55], lvl: true, dirOk: true, shape: "spear", pole: [0.4, -1, 0] },
    tiaozhang:  { off: [-0.02, 0.02, 0.44], dirOk: true, shape: "palmV", pole: [0.3, -1, 0] },
    liangzhang: { off: [-0.04, 0.34, 0.08], shape: "palm", pole: [1, 0.2, 0] },
    goushou:    { off: [0.06, -0.14, -0.48], dirOk: true, reach: 0.5, shape: "hook", pole: [0.3, -1, 0.2] },
    jia:        { off: [-0.12, 0.3, 0.14], shape: "fist", pole: [1, 0.3, 0.2] },
    an:         { off: [-0.1, -0.42, 0.24], shape: "palm", pole: [0.4, -0.5, -1] },
    lan:        { off: [-0.3, -0.12, 0.28], shape: "fist", pole: [0.6, -1, 0] },
    gai:        { off: [-0.14, -0.24, 0.36], shape: "palm", pole: [0.6, 0.2, 0] },
    lou:        { off: [0.28, -0.36, 0.12], shape: "palm", pole: [0.3, -1, -0.3] },
    zhua:       { off: [-0.05, 0, 0.48], lvl: true, dirOk: true, shape: "claw", pole: [0.4, -1, 0] },
    baoquan:    { off: [-0.02, -0.48, -0.07], shape: "fist", pole: [0.2, -0.2, -1] },
    chuishou:   { off: [0.03, -0.55, 0.0], shape: "palm", pole: [0.2, 0, -1] },
    saudacao_D: { off: [-0.18, -0.12, 0.3], shape: "fist", pole: [0.5, -1, 0] },
    saudacao_E: { off: [-0.16, -0.1, 0.31], shape: "palmV", pole: [0.5, -1, 0] },
  };
  function armPose(a, side) {
    const s = sgn(side), t = TECH[a.id] || TECH.chuishou;
    const up = t.lvl ? LVL_UP[a.level || t.lvlDef || "medio"] : t.off[1];
    let off = [s * t.off[0], up, t.off[2]];
    if (a.dir && t.dirOk && DIR_ANG[a.dir] !== undefined) {
      const reach = t.reach || Math.hypot(t.off[0], t.off[2]);
      off = rotY([s * -0.04, up, reach], DIR_ANG[a.dir]);
    }
    return { off, shape: t.shape, pole: [s * t.pole[0], t.pole[1], t.pole[2]] };
  }
  function shoulderLocal(pose, side) {
    const cr = chest(pose.spine);
    return add(add(pose.pelvis, cr([0, L.spine, 0])), cr([sgn(side) * L.shW, -0.02, 0]));
  }
  function handTo(pose, side, target, shape) {
    const s = sgn(side);
    pose.hands[side] = { off: chestInv(pose.spine)(sub(target, shoulderLocal(pose, side))), shape: shape || "palm", pole: [s * 0.6, -0.7, 0.1] };
  }

  /* ---------------------------------------------------------------- pernas */
  const KLVL = {
    tantui: { baixo: 0.32, medio: 0.62, alto: 0.95, def: "baixo" },
    dengtui: { baixo: 0.45, medio: 0.8, alto: 1.1, def: "medio" },
    cechuai: { baixo: 0.5, medio: 0.85, alto: 1.15, def: "medio" },
  };
  const ELEV = { alto: 75, medio: 42, baixo: 22 };
  function applyKick(pose, a) {
    const K = a.side || "D", O = other(K), s = sgn(K);
    pose.feet[O] = F(-s * 0.08, 0, -s * 15);
    pose.kp[O] = [-s * 0.1, 0, 1];
    pose.pelvis = [-s * 0.03, 0.89, 0];
    pose.active["leg" + K] = "perna";
    let hip = add(pose.pelvis, [s * L.hipW, 0, 0]);
    const straightFwd = (elev, side) => add(hip, mul(norm(side
      ? [s * Math.cos(rad(elev)), Math.sin(rad(elev)), 0.12]
      : [s * 0.05, Math.sin(rad(elev)), Math.cos(rad(elev))]), LEG * 0.995));
    let foot, mode = "point", kp = [0, 0.3, 1], defDir = 0;
    switch (a.id) {
      case "tantui": foot = [s * 0.06, KLVL.tantui[a.level || "baixo"], 0.7]; break;
      case "dengtui": foot = [s * 0.07, KLVL.dengtui[a.level || "medio"], 0.66]; mode = "flex"; break;
      case "cechuai":
        foot = [s * 0.82, KLVL.cechuai[a.level || "medio"], 0.02]; mode = "blade"; kp = [0, 0.4, 1];
        pose.spine.roll = -s * 30; defDir = s * 90; break;
      case "zhengtitui": foot = straightFwd(ELEV[a.level || "alto"]); mode = "flex"; break;
      case "cetitui": foot = straightFwd(ELEV[a.level || "alto"] - 5, true); mode = "flex"; pose.spine.roll = -s * 12; defDir = s * 90; break;
      case "lihetui": case "waibaitui": {
        foot = straightFwd(58); mode = "flex";
        const pts = [];
        for (let i = 0; i <= 14; i++) {
          const ang = a.id === "lihetui" ? lerp(75, -45, i / 14) : lerp(-45, 75, i / 14);
          pts.push(add(hip, mul([s * Math.sin(rad(ang)) * Math.cos(rad(55)), Math.sin(rad(55)), Math.cos(rad(ang)) * Math.cos(rad(55))], LEG + 0.14)));
        }
        pose.hint.arcs.push({ pts, cat: "perna" });
        break;
      }
      case "paijiao": foot = straightFwd(62); pose._slap = { hand: K, foot: K }; break;
      case "saotui": {
        pose.pelvis = [-s * 0.16, 0.34, 0];
        pose.feet[O] = F(-s * 0.18, 0, -s * 30);
        pose.kp[O] = [-s * 0.7, 0, 0.7];
        hip = add(pose.pelvis, [s * L.hipW, 0, 0]);
        const back = a.dir === "tras";
        foot = [s * 0.42, 0.05, back ? -0.5 : 0.52]; mode = "flat"; kp = [0, 1, 0];
        const c = pose.feet[O].p, pts = [];
        for (let i = 0; i <= 14; i++) { const ang = back ? lerp(140, 280, i / 14) : lerp(40, -100, i / 14); pts.push([c[0] + s * Math.sin(rad(ang)) * 0.78, 0.02, c[2] + Math.cos(rad(ang)) * 0.78]); }
        pose.hint.arcs.push({ pts, cat: "perna" });
        pose.spine.pitch = 25;
        a = { ...a, dir: null };
        break;
      }
      case "tixi": foot = [s * 0.08, 0.5, 0.15]; kp = [0, 0.6, 1]; break;
      case "xuanfengjiao": case "tengkongfeijiao": {
        const tornado = a.id === "xuanfengjiao";
        pose.pelvis[1] += 0.38; pose.hint.air = true;
        hip = add(pose.pelvis, [s * L.hipW, 0, 0]);
        foot = add(hip, mul(norm([s * (tornado ? -0.25 : 0.05), Math.sin(rad(60)), Math.cos(rad(60))]), LEG * 0.995));
        pose.feet[O] = { p: [-s * 0.1, pose.pelvis[1] - 0.5, tornado ? -0.15 : 0.2], yaw: 0, mode: "point" };
        pose.kp[O] = tornado ? [0, -0.3, 1] : [0, 0.5, 1];
        pose._slap = { hand: tornado ? O : K, foot: K };
        break;
      }
      default: foot = [s * 0.06, 0.6, 0.6];
    }
    if (a.dir && DIR_ANG[a.dir] !== undefined) {
      const rel = DIR_ANG[a.dir] - defDir;
      if (rel) foot = add(hip, rotY(sub(foot, hip), rel));
    }
    pose.feet[K] = { p: foot, yaw: 0, mode };
    pose.kp[K] = kp;
  }

  /* ---------------------------------------------------------------- alongamentos */
  function applyAlong(pose, a) {
    const K = a.side || "D", O = other(K), s = sgn(K);
    pose.active.legD = pose.active.legE = "along";
    switch (a.id) {
      case "zhengyatui": {
        pose.pelvis = [-s * 0.02, 0.92, -0.05];
        pose.feet[O] = F(-s * 0.08, -0.05, -s * 20); pose.kp[O] = [0, 0, 1];
        const f = add(add(pose.pelvis, [s * L.hipW, 0, 0]), [0, -0.04, LEG * 0.985]);
        pose.feet[K] = { p: f, yaw: 0, mode: "flex" }; pose.kp[K] = [0, 1, 0];
        pose.spine.pitch = 55;
        pose.hint.bar = { a: [f[0] - 0.3, f[1] - 0.05, f[2]], b: [f[0] + 0.3, f[1] - 0.05, f[2]] };
        pose._reach = { D: add(f, [0.05, 0.05, -0.14]), E: add(f, [-0.05, 0.05, -0.14]) };
        pose.active.armD = pose.active.armE = "along";
        break;
      }
      case "ceyatui": {
        pose.pelvis = [-s * 0.06, 0.92, 0];
        pose.feet[O] = F(-s * 0.1, 0, -s * 10); pose.kp[O] = [0, 0, 1];
        const f = add(add(pose.pelvis, [s * L.hipW, 0, 0]), [s * LEG * 0.985, -0.04, 0]);
        pose.feet[K] = { p: f, yaw: 0, mode: "flex" }; pose.kp[K] = [0, 1, 0];
        pose.spine.roll = s * 42;
        pose.hint.bar = { a: [f[0], f[1] - 0.05, -0.3], b: [f[0], f[1] - 0.05, 0.3] };
        pose._reach = { [K]: add(f, [-s * 0.12, 0.06, 0]) };
        pose.hands[O] = armPose({ id: "liangzhang" }, O);
        pose.active["arm" + K] = "along";
        break;
      }
      case "pubuyatui": {
        const d = stanceDef("pubu", K);
        pose.pelvis = d.pelvis; pose.feet = { D: { ...d.feet.D }, E: { ...d.feet.E } }; pose.kp = { ...d.kp };
        pose.hands.D = armPose({ id: "an" }, "D"); pose.hands.E = armPose({ id: "an" }, "E");
        pose.spine.pitch = 15;
        break;
      }
      case "picha": {
        pose.pelvis = [0, 0.12, 0];
        pose.feet[K] = F(s * 0.06, 0.82, 0, "flex", 0.05); pose.feet[O] = F(-s * 0.06, -0.82, 180, "flat", 0.05);
        pose.kp[K] = [0, 1, 0]; pose.kp[O] = [0, -1, 0];
        pose.hands.D = { off: [0.5, 0.02, 0], shape: "palm", pole: [0, -1, 0] };
        pose.hands.E = { off: [-0.5, 0.02, 0], shape: "palm", pole: [0, -1, 0] };
        break;
      }
      case "hengcha": {
        pose.pelvis = [0, 0.12, 0.04];
        pose.feet.D = F(0.84, 0.04, 0, "flex", 0.05); pose.feet.E = F(-0.84, 0.04, 0, "flex", 0.05);
        pose.kp = { D: [0, 1, 0], E: [0, 1, 0] };
        pose.spine.pitch = 15;
        pose.hands.D = { off: [-0.05, -0.38, 0.35], shape: "palm", pole: [0.4, -1, 0] };
        pose.hands.E = { off: [0.05, -0.38, 0.35], shape: "palm", pole: [-0.4, -1, 0] };
        break;
      }
      case "xiayao": {
        pose.pelvis = [0, 0.78, 0.08];
        pose.feet.D = F(0.18, 0.3); pose.feet.E = F(-0.18, 0.3);
        pose.kp = { D: [0.2, 0, 1], E: [-0.2, 0, 1] };
        pose.spine.pitch = -150;
        pose._reach = { D: [0.22, 0.06, -0.55], E: [-0.22, 0.06, -0.55] };
        pose.active.armD = pose.active.armE = "along";
        break;
      }
      case "shuanyao": {
        pose.feet.D = F(0.28, 0, 10); pose.feet.E = F(-0.28, 0, -10);
        pose.spine.pitch = 45; pose.spine.roll = s * 20;
        const pts = [];
        for (let i = 0; i <= 18; i++) { const ang = lerp(0, 300, i / 18) * s; pts.push([Math.sin(rad(ang)) * 0.5, 1.25, Math.cos(rad(ang)) * 0.5]); }
        pose.hint.arcs.push({ pts, cat: "along" });
        break;
      }
    }
  }

  /* ---------------------------------------------------------------- do código para as poses */
  function makeState() {
    return { facing: 0, stance: { id: "kailibu", side: "D" }, arms: { D: { id: "chuishou" }, E: { id: "chuishou" } } };
  }

  function applyGroup(st, g, BYID) {
    const ctx = { kick: null, along: null, lean: null, gaze: null, arms: [], legs: {}, turn: 0, frees: [], todo: false };
    let base = null, passo = null;
    for (const a of g) {
      if (a.kind === "free") { ctx.frees.push(a.text); continue; }
      if (a.kind === "todo") { ctx.todo = true; continue; }
      const e = BYID[a.id];
      if (!e) continue;
      if (e.cat === "base") base = a;
      else if (e.cat === "passo") {
        if (a.id === "zhuanshen") { const t = (a.num != null ? a.num : 180) * (a.side === "E" ? -1 : 1); st.facing += t; ctx.turn += t; }
        else passo = a;
      } else if (e.cat === "mao") {
        if (a.id === "baoquanli") { st.arms.D = { id: "saudacao_D" }; st.arms.E = { id: "saudacao_E" }; ctx.arms.push("D", "E"); }
        else if (!a.side) { st.arms.D = { ...a }; st.arms.E = { ...a }; ctx.arms.push("D", "E"); }
        else { st.arms[a.side] = { ...a }; ctx.arms.push(a.side); }
      } else if (e.cat === "perna") ctx.kick = a;
      else if (e.cat === "along") ctx.along = a;
      else if (e.cat === "corpo") {
        if (a.id === "mushi") ctx.gaze = DIR_ANG[a.dir || "frente"];
        else if (a.id === "qingshen") ctx.lean = a.dir || "frente";
      }
    }
    const pick = base || passo;
    if (pick) {
      const side = pick.side || "D";
      if (base && base.dir && DIR_ANG[base.dir] !== undefined) {
        const t = DIR_ANG[base.dir] - leadAngle(base.id, side);
        st.facing += t; ctx.turn += t;
      }
      st.stance = { id: pick.id, side };
      if (base) { ctx.legs.D = "base"; ctx.legs.E = "base"; } else ctx.legs[side] = "passo";
    }
    return ctx;
  }

  function compose(st, ctx, row) {
    const d = stanceDef(st.stance.id, st.stance.side);
    const pose = {
      facing: st.facing,
      pelvis: d.pelvis.slice(),
      spine: { yaw: 0, pitch: 0, roll: 0 },
      gaze: ctx.gaze != null ? Math.max(-100, Math.min(100, ctx.gaze)) : 0,
      feet: { D: { ...d.feet.D, p: d.feet.D.p.slice() }, E: { ...d.feet.E, p: d.feet.E.p.slice() } },
      kp: { D: d.kp.D, E: d.kp.E },
      hands: {},
      active: { armD: null, armE: null, legD: ctx.legs.D || null, legE: ctx.legs.E || null, head: ctx.gaze != null ? "corpo" : null },
      hint: { arcs: [], bar: null, air: !!d.air, todo: !!ctx.todo, turn: ctx.turn || 0, force: !!(row && row.mods && row.mods.forca), free: ctx.frees.length > 0 },
    };
    if (ctx.kick) applyKick(pose, ctx.kick);
    if (ctx.along) applyAlong(pose, ctx.along);
    if (ctx.lean) {
      if (ctx.lean === "frente") pose.spine.pitch += 25; else if (ctx.lean === "tras") pose.spine.pitch -= 20;
      else pose.spine.roll += ctx.lean === "dir" ? 20 : -20;
    }
    for (const s of SIDES) {
      if (!pose.hands[s]) pose.hands[s] = armPose(st.arms[s], s);
      if (ctx.arms.includes(s) && !pose.active["arm" + s]) pose.active["arm" + s] = "mao";
    }
    if (pose._reach) for (const s of SIDES) if (pose._reach[s]) handTo(pose, s, pose._reach[s], "palm");
    if (pose._slap) { handTo(pose, pose._slap.hand, add(pose.feet[pose._slap.foot].p, [0, 0.04, 0]), "palm"); pose.active["arm" + pose._slap.hand] = "perna"; }
    delete pose._reach; delete pose._slap;
    return pose;
  }

  function build(rows, BYID) {
    const st = makeState();
    const initial = compose(st, { arms: [], legs: {}, frees: [] }, null);
    const steps = [];
    for (const r of rows) {
      if (r.type !== "move") continue;
      const frames = r.groups.map((g) => compose(st, applyGroup(st, g, BYID), r));
      steps.push({ row: r, frames });
    }
    return { initial, steps };
  }

  /* ---------------------------------------------------------------- interpolação */
  function mix(a, b, t) {
    const o = {
      facing: lerp(a.facing, b.facing, t),
      pelvis: lerp3(a.pelvis, b.pelvis, t),
      spine: { yaw: lerp(a.spine.yaw, b.spine.yaw, t), pitch: lerp(a.spine.pitch, b.spine.pitch, t), roll: lerp(a.spine.roll, b.spine.roll, t) },
      gaze: lerp(a.gaze, b.gaze, t),
      feet: {}, kp: {}, hands: {},
      active: t < 0.5 ? a.active : b.active,
      hint: t < 0.7 ? { ...a.hint, arcs: [], force: false, turn: 0 } : b.hint,
    };
    for (const s of SIDES) {
      o.feet[s] = { p: lerp3(a.feet[s].p, b.feet[s].p, t), yaw: lerp(a.feet[s].yaw || 0, b.feet[s].yaw || 0, t), mode: t < 0.5 ? a.feet[s].mode : b.feet[s].mode };
      o.kp[s] = lerp3(a.kp[s], b.kp[s], t);
      o.hands[s] = { off: lerp3(a.hands[s].off, b.hands[s].off, t), shape: t < 0.5 ? a.hands[s].shape : b.hands[s].shape, pole: lerp3(a.hands[s].pole, b.hands[s].pole, t) };
    }
    return o;
  }

  /* ---------------------------------------------------------------- esqueleto */
  function toeOf(f, knee, ankle) {
    const yd = [Math.sin(rad(f.yaw || 0)), 0, Math.cos(rad(f.yaw || 0))];
    const shin = norm(sub(ankle, knee));
    switch (f.mode) {
      case "toe": return add(ankle, add(mul(yd, 0.14), [0, -0.07, 0]));
      case "point": return add(ankle, mul(shin, 0.16));
      case "flex": { let t = cross(shin, [1, 0, 0]); if (len(t) < 0.3) t = [0, 1, 0]; else if (t[1] < 0) t = mul(t, -1); return add(ankle, mul(norm(t), 0.15)); }
      case "blade": return add(ankle, [0, 0, 0.15]);
      default: return add(ankle, add(mul(yd, L.foot), [0, -0.045, 0]));
    }
  }
  function skeleton(pose) {
    const cr = chest(pose.spine), P = pose.pelvis;
    const hip = { D: add(P, [L.hipW, 0, 0]), E: add(P, [-L.hipW, 0, 0]) };
    const neck = add(P, cr([0, L.spine, 0]));
    const sh = { D: add(neck, cr([L.shW, -0.02, 0])), E: add(neck, cr([-L.shW, -0.02, 0])) };
    const head = add(neck, cr([0, L.neck, 0]));
    const look = cr(rotY([0, 0, 1], pose.gaze));
    const up = cr([0, 1, 0]);
    const leg = {}, arm = {};
    for (const s of SIDES) {
      const f = pose.feet[s];
      const r = ik(hip[s], f.p, L.thigh, L.shin, pose.kp[s]);
      leg[s] = { hip: hip[s], knee: r.mid, ankle: r.end, toe: toeOf(f, r.mid, r.end) };
      const h = pose.hands[s];
      const ra = ik(sh[s], add(sh[s], cr(h.off)), L.upper, L.fore, cr(h.pole));
      arm[s] = { sh: sh[s], elbow: ra.mid, wrist: ra.end, shape: h.shape };
    }
    return { P, hip, neck, sh, head, look, up, leg, arm };
  }

  /* ---------------------------------------------------------------- desenho */
  function draw(ctx, pose, o) {
    const W = o.w, H = o.h, C = o.colors, thumb = !!o.thumb;
    ctx.clearRect(0, 0, W, H);
    const sc = Math.min(H / 2.5, W / 2.4);
    const cx = W / 2, cy = H * 0.85;
    const th = rad(o.cam === "costas" ? 205 : 25), ph = rad(thumb ? 10 : 14);
    const ct = Math.cos(th), st = Math.sin(th), cp = Math.cos(ph), sp = Math.sin(ph);
    const prj = (p) => { const x = -p[0] * ct + p[2] * st, d = p[0] * st + p[2] * ct; return [cx + x * sc, cy - (p[1] * cp - d * sp) * sc, d * cp + p[1] * sp]; };
    const P = (p) => prj(rotY(p, pose.facing));
    const px = (m) => Math.max(thumb ? 1.2 : 1.5, m * sc);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    const line = (a, b, w, c, dash) => { ctx.beginPath(); ctx.setLineDash(dash || []); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineWidth = w; ctx.strokeStyle = c; ctx.stroke(); ctx.setLineDash([]); };
    const arrowHead = (a, b, size, c) => {
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      ctx.beginPath(); ctx.moveTo(b[0], b[1]);
      ctx.lineTo(b[0] - size * Math.cos(ang - 0.5), b[1] - size * Math.sin(ang - 0.5));
      ctx.lineTo(b[0] - size * Math.cos(ang + 0.5), b[1] - size * Math.sin(ang + 0.5));
      ctx.closePath(); ctx.fillStyle = c; ctx.fill();
    };
    const poly = (pts, w, c, dash) => {
      if (pts.length < 2) return;
      ctx.beginPath(); ctx.setLineDash(dash || []);
      pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
      ctx.lineWidth = w; ctx.strokeStyle = c; ctx.stroke(); ctx.setLineDash([]);
    };

    // Chão: grade fixa de 2 m × 2 m, com linhas a cada 50 cm
    const g = thumb ? 0.75 : 1;
    for (let i = -2; i <= 2; i++) {
      const v = (i / 2) * g;
      line(prj([-g, 0, v]), prj([g, 0, v]), 1, C.line);
      line(prj([v, 0, -g]), prj([v, 0, g]), 1, C.line);
    }
    // Seta da frente do corpo no chão
    if (!thumb) {
      const a0 = P([0, 0, 0.32]), a1 = P([0, 0, 0.85]);
      line(a0, a1, 2, C.muted); arrowHead(a0, a1, 8, C.muted);
    }
    // Giro: arco no chão
    if (pose.hint.turn && !thumb) {
      const r = 0.62, n = 20, pts = [];
      for (let i = 0; i <= n; i++) pts.push(prj(rotY([0, 0, r], pose.facing - pose.hint.turn + (pose.hint.turn * i) / n)));
      poly(pts, 2, C.passo, [5, 4]); arrowHead(pts[n - 1], pts[n], 9, C.passo);
    }
    if (pose.hint.air) {
      const c0 = P([pose.pelvis[0], 0, pose.pelvis[2]]);
      ctx.beginPath(); ctx.ellipse(c0[0], c0[1], 0.32 * sc, 0.07 * sc, 0, 0, Math.PI * 2); ctx.fillStyle = C.line; ctx.fill();
    }
    if (pose.hint.bar) line(P(pose.hint.bar.a), P(pose.hint.bar.b), px(0.03), C.muted);

    const sk = skeleton(pose);
    const items = [];
    const colOf = (side, act) => (act ? C[act] || C.ink : side === "D" ? C.ink : C.left);
    const seg = (a, b, w, c) => { const A = P(a), B = P(b); items.push({ d: (A[2] + B[2]) / 2, draw: () => line(A, B, w, c) }); };
    for (const s of SIDES) {
      const lg = sk.leg[s], lc = colOf(s, pose.active["leg" + s]);
      seg(lg.hip, lg.knee, px(0.055), lc);
      seg(lg.knee, lg.ankle, px(0.05), lc);
      seg(lg.ankle, lg.toe, px(0.04), lc);
      const am = sk.arm[s], ac = colOf(s, pose.active["arm" + s]);
      seg(am.sh, am.elbow, px(0.045), ac);
      seg(am.elbow, am.wrist, px(0.042), ac);
      const fore = norm(sub(am.wrist, am.elbow));
      const W0 = P(am.wrist);
      items.push({ d: W0[2] + 0.001, draw: () => {
        if (am.shape === "fist") {
          const c = P(add(am.wrist, mul(fore, 0.035)));
          ctx.beginPath(); ctx.arc(c[0], c[1], px(0.045), 0, Math.PI * 2); ctx.fillStyle = ac; ctx.fill();
        } else if (am.shape === "hook") {
          const a1 = P(add(am.wrist, mul(fore, 0.06))), a2 = P(add(add(am.wrist, mul(fore, 0.07)), mul(sk.up, -0.07)));
          poly([W0, a1, a2], px(0.03), ac);
        } else if (am.shape === "claw") {
          const c = P(add(am.wrist, mul(fore, 0.04)));
          ctx.beginPath(); ctx.arc(c[0], c[1], px(0.032), 0, Math.PI * 2); ctx.fillStyle = ac; ctx.fill();
          for (const k of [-1, 0, 1]) { const t = P(add(add(am.wrist, mul(fore, 0.1)), mul(sk.up, k * 0.035))); line(c, t, px(0.014), ac); }
        } else {
          const dir = am.shape === "palmV" ? norm(add(mul(sk.up, 0.85), mul(fore, 0.15))) : fore;
          const tip = P(add(am.wrist, mul(dir, am.shape === "spear" ? 0.13 : 0.1)));
          line(W0, tip, px(0.034), ac);
        }
      } });
    }
    // Tronco
    const tq = [sk.sh.D, sk.sh.E, sk.hip.E, sk.hip.D].map(P);
    items.push({ d: tq.reduce((m, q) => m + q[2], 0) / 4, draw: () => {
      ctx.beginPath(); tq.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath();
      ctx.fillStyle = C.torso; ctx.fill(); ctx.lineWidth = px(0.028); ctx.strokeStyle = C.ink; ctx.stroke();
    } });
    // Cabeça e linha do olhar
    const Hh = P(sk.head);
    items.push({ d: Hh[2], draw: () => {
      const nose = P(add(sk.head, mul(sk.look, L.head + 0.07)));
      ctx.beginPath(); ctx.arc(Hh[0], Hh[1], L.head * sc, 0, Math.PI * 2);
      ctx.fillStyle = C.surface; ctx.fill(); ctx.lineWidth = px(0.026); ctx.strokeStyle = C.ink; ctx.stroke();
      line(Hh, nose, px(0.03), pose.active.head ? C.corpo : C.ink);
    } });
    const neckA = P(sk.neck), neckB = P(add(sk.neck, mul(sk.up, 0.09)));
    items.push({ d: neckA[2] - 0.001, draw: () => line(neckA, neckB, px(0.035), C.ink) });

    items.sort((a, b) => a.d - b.d).forEach((it) => it.draw());

    // Dicas por cima: arcos de movimento, força
    for (const arc of pose.hint.arcs) {
      const pts = arc.pts.map(P);
      poly(pts, thumb ? 1 : 2, C[arc.cat] || C.muted, [5, 4]);
      if (!thumb) arrowHead(pts[pts.length - 2], pts[pts.length - 1], 9, C[arc.cat] || C.muted);
    }
    if (pose.hint.force && !thumb) {
      const pts = [];
      for (const s of SIDES) {
        const act = pose.active["arm" + s];
        if (act === "mao") pts.push(add(sk.arm[s].wrist, mul(norm(sub(sk.arm[s].wrist, sk.arm[s].elbow)), 0.04)));
        if (pose.active["leg" + s] === "perna") pts.push(sk.leg[s].toe);
      }
      for (const p of pts) {
        const c = P(p);
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2 + 0.2;
          line([c[0] + Math.cos(a) * 0.07 * sc, c[1] + Math.sin(a) * 0.07 * sc], [c[0] + Math.cos(a) * 0.12 * sc, c[1] + Math.sin(a) * 0.12 * sc], 1.5, C.mod);
        }
      }
    }
    if (pose.hint.todo) {
      ctx.font = `700 ${Math.round(0.34 * sc)}px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillStyle = C.mao; ctx.textAlign = "center";
      ctx.fillText("?", Hh[0] + 0.32 * sc, Hh[1] - 0.05 * sc);
    }
    return sk;
  }

  return { build, mix, draw, skeleton, stanceDef, armPose, L };
});
