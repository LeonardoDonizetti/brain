/* Celebrações do Brain.
   Recompensa imediata e visível logo depois da ação (princípio das "emoções criam hábitos", de BJ Fogg),
   com variação nas frases e nos efeitos para não virar rotina cega.

   - micro(el, opts)  : estouro de confete + "+10 XP" + frase curta ao concluir algo
   - moedas(opts)     : chuva de moedas ao registrar dinheiro que entrou
   - metaDoDia(opts)  : cartão do mascote quando a lista do dia fica toda feita
   - dia(r, opts)     : tela cheia ao fechar o dia da ofensiva (chama, contador, mascote, confete)

   Tudo roda em um único canvas (só transform/opacity no resto), respeita "reduzir movimento"
   e as preferências "efeitos" e "efeitos_som" (som desligado por padrão). Sem imagens nem bibliotecas. */
(function (root) {
  'use strict';

  /* ---------------- textos (puros) ---------------- */
  const MICRO = ['Boa!', 'Mandou bem!', 'Feito!', 'É isso!', 'Mais uma!', 'Aí sim!', 'Show!', 'Na mira!'];
  const SUPER = ['Combo!', 'Arrasou!', 'Que ritmo!', 'Em chamas!'];
  const MOEDAS = ['Entrou dinheiro!', 'Boa, mais uma entrada!', 'No caixa!'];
  const META = ['Tudo feito por hoje!', 'Lista zerada!', 'Dia fechado!'];
  const META_SUB = ['Você cumpriu tudo o que marcou. Aproveite o descanso.', 'Cada tarefa feita é um voto no seu eu do futuro.', 'Constância é isso: aparecer e entregar.'];
  const SUB_DIA = ['Mais um dia firme. Continue assim.', 'A constância está pagando.', 'Quem aparece todo dia chega longe.', 'Seu eu do futuro agradece.'];
  const MARCO = {
    3: ['Três dias seguidos!', 'O hábito começa a se formar.'],
    7: ['Uma semana inteira!', 'Sete dias seguidos. Isso já é constância de verdade.'],
    14: ['Duas semanas!', 'Quatorze dias sem largar. O ritmo já é seu.'],
    30: ['Um mês de ofensiva!', 'Trinta dias seguidos. Pouca gente chega aqui.'],
    60: ['Dois meses firmes!', 'Sessenta dias. Isso virou parte de você.'],
    100: ['Cem dias!', 'Três dígitos de constância. Lendário.'],
    200: ['Duzentos dias!', 'Você é a prova de que constância funciona.'],
    365: ['Um ano inteiro!', 'Trezentos e sessenta e cinco dias. Que orgulho.'],
  };
  const ultimo = {};
  function sortear(lista, chave) {
    let i;
    do { i = Math.floor(Math.random() * lista.length); } while (lista.length > 1 && i === ultimo[chave]);
    ultimo[chave] = i; return lista[i];
  }
  /** Título e subtítulo da tela de ofensiva, conforme o dia. */
  function textoDia(n, salvou) {
    if (salvou) return { titulo: 'Ofensiva salva!', sub: 'Você recuperou o dia que faltava.', marco: false };
    if (MARCO[n]) return { titulo: MARCO[n][0], sub: MARCO[n][1], marco: true };
    if (n <= 1) return { titulo: 'Ofensiva começou!', sub: 'O primeiro dia já está feito. Volte amanhã para ela crescer.', marco: false };
    return { titulo: `${n} dias de ofensiva!`, sub: sortear(SUB_DIA, 'dia'), marco: false };
  }

  const api = { textoDia, MARCO };
  if (typeof document === 'undefined') { if (typeof module !== 'undefined' && module.exports) module.exports = api; return; }

  /* ---------------- preferências e acessibilidade ---------------- */
  const prefs = () => { try { return (root.BrainPrefs && root.BrainPrefs.get()) || {}; } catch (e) { return {}; } };
  const reduzido = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const ligado = () => prefs().efeitos !== false;
  const comMovimento = () => ligado() && !reduzido();
  const somLigado = () => prefs().efeitos_som === true;
  const vibrar = (p) => { try { if (ligado() && navigator.vibrate) navigator.vibrate(p); } catch (e) { /* sem vibração */ } };
  const accent = () => { try { return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#1565d8'; } catch (e) { return '#1565d8'; } };

  /* ---------------- som (WebAudio, sem arquivos) ---------------- */
  let ac = null;
  function tom(f, t0, dur, tipo, vol) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = tipo || 'triangle'; o.frequency.setValueAtTime(f, t0);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + dur + 0.03);
  }
  function tocar(k) {
    if (!somLigado()) return;
    try {
      ac = ac || new (root.AudioContext || root.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      const t = ac.currentTime + 0.01;
      if (k === 'micro') { tom(784, t, 0.12); tom(1175, t + 0.07, 0.18); }
      else if (k === 'moeda') { tom(1319, t, 0.08, 'square', 0.05); tom(1760, t + 0.07, 0.22, 'square', 0.05); }
      else if (k === 'dia') [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tom(f, t + i * 0.09, 0.32, 'triangle', 0.13));
      else if (k === 'meta') [659.25, 783.99, 1046.5].forEach((f, i) => tom(f, t + i * 0.1, 0.28, 'triangle', 0.12));
    } catch (e) { /* sem áudio */ }
  }

  /* ---------------- estilos ---------------- */
  const CSS = `
#cel-raiz { position: fixed; inset: 0; width: 100%; height: 100%; margin: 0; padding: 0; border: 0; background: none; overflow: visible; pointer-events: none; font-family: 'IBM Plex Sans', system-ui, sans-serif; color: #1d2433; }
#cel-raiz:not(:popover-open):not(.cel-fb) { display: none; }
.cel-fb { z-index: 2147483000; }
.cel-cv { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2; }
.cel-anel { position: absolute; width: 2.8rem; height: 2.8rem; margin: -1.4rem 0 0 -1.4rem; border-radius: 50%; border: 3px solid var(--c, #1565d8); pointer-events: none; z-index: 3; animation: cel-anel .5s cubic-bezier(.2,.7,.3,1) both; }
.cel-chip { position: absolute; z-index: 3; transform: translate(-50%, -50%); pointer-events: none; display: grid; justify-items: center; gap: .1rem; padding: .35rem .75rem .4rem; border-radius: 1rem; background: #fff; border: 2px solid var(--c, #1565d8); box-shadow: 0 3px 0 var(--c, #1565d8); animation: cel-chip 1.05s cubic-bezier(.2,.8,.3,1) both; white-space: nowrap; }
.cel-chip b { font-size: 1.05rem; font-weight: 800; color: var(--c, #1565d8); line-height: 1; }
.cel-chip small { font-size: .74rem; font-weight: 700; color: #4a5568; line-height: 1; }
.cel-chip.sup { background: #fff6d6; --c: #d98200; }
@keyframes cel-anel { from { transform: scale(.35); opacity: .95; } to { transform: scale(2.1); opacity: 0; } }
@keyframes cel-chip { 0% { transform: translate(-50%, -20%) scale(.4); opacity: 0; } 16% { transform: translate(-50%, -80%) scale(1.14); opacity: 1; } 28% { transform: translate(-50%, -90%) scale(1); } 78% { opacity: 1; } 100% { transform: translate(-50%, -230%) scale(1); opacity: 0; } }

.cel-meta { position: absolute; left: 50%; top: calc(env(safe-area-inset-top, 0px) + .8rem); width: min(22rem, calc(100% - 1.5rem)); transform: translateX(-50%); z-index: 3; pointer-events: auto; display: flex; align-items: center; gap: .75rem; padding: .7rem .9rem; border-radius: 1.2rem; background: #fff; border: 2px solid #f0b429; box-shadow: 0 4px 0 #f0b429, 0 14px 30px rgba(20,30,60,.2); animation: cel-meta-in .6s cubic-bezier(.34,1.56,.64,1) both; }
.cel-meta.sai { animation: cel-meta-out .3s ease-in both; }
.cel-meta svg { flex: none; width: 3.6rem; height: auto; }
.cel-meta b { display: block; font-size: 1.05rem; font-weight: 800; }
.cel-meta span { display: block; font-size: .84rem; color: #4a5568; line-height: 1.3; margin-top: .1rem; }
@keyframes cel-meta-in { from { transform: translate(-50%, -140%) scale(.9); opacity: 0; } to { transform: translate(-50%, 0) scale(1); opacity: 1; } }
@keyframes cel-meta-out { to { transform: translate(-50%, -140%); opacity: 0; } }

.cel-dia { position: absolute; inset: 0; z-index: 1; pointer-events: auto; display: grid; place-items: center; overflow: hidden; padding: env(safe-area-inset-top, 0px) 1rem env(safe-area-inset-bottom, 0px); background: radial-gradient(circle at 50% 36%, #fff9e6 0%, #ffe9bd 42%, #ffcf86 100%); animation: cel-fundo .3s ease-out both; }
.cel-dia.marco { background: radial-gradient(circle at 50% 36%, #4a3aa8 0%, #2b2178 50%, #150f45 100%); color: #fff; }
.cel-dia.sai { animation: cel-fundo-sai .28s ease-in both; }
.cel-raios { position: absolute; left: 50%; top: 36%; width: 130vmax; height: 130vmax; margin: -65vmax 0 0 -65vmax; background: repeating-conic-gradient(from 0deg, rgba(255,255,255,.6) 0 6deg, transparent 6deg 18deg); -webkit-mask: radial-gradient(circle, #000 0, transparent 52%); mask: radial-gradient(circle, #000 0, transparent 52%); animation: cel-gira 28s linear infinite, cel-surge .8s ease-out both; pointer-events: none; }
.cel-dia.marco .cel-raios { background: repeating-conic-gradient(from 0deg, rgba(255,214,90,.34) 0 6deg, transparent 6deg 18deg); }
.cel-cena { position: relative; z-index: 1; width: min(22rem, 100%); display: grid; justify-items: center; text-align: center; gap: .15rem; }
.cel-faixa { display: flex; align-items: center; justify-content: center; gap: .9rem; }
.cel-chama { animation: cel-pop .75s cubic-bezier(.34,1.56,.64,1) .1s both; filter: none; }
.cel-chama svg { display: block; }
.cel-numbloco { text-align: left; line-height: 1; animation: cel-pop .6s cubic-bezier(.34,1.56,.64,1) .3s both; }
.cel-odo { display: block; position: relative; height: 1em; font-size: 4.6rem; font-weight: 800; letter-spacing: -.03em; overflow: hidden; color: #c2410c; min-width: 1ch; }
.cel-dia.marco h2, .cel-dia.marco p.sub { color: #fff; }
.cel-dia.marco .cel-odo { color: #ffd23f; }
.cel-odo i { display: block; font-style: normal; height: 1em; line-height: 1; }
.cel-odo .vai { animation: cel-odo-sai .45s cubic-bezier(.6,0,.4,1) .55s both; }
.cel-odo .vem { position: absolute; left: 0; top: 0; animation: cel-odo-entra .6s cubic-bezier(.34,1.56,.64,1) .62s both; }
.cel-un { display: block; font-size: .95rem; font-weight: 700; margin-top: .25rem; opacity: .85; }
.cel-selo { display: inline-block; margin-bottom: .4rem; padding: .22rem .7rem; border-radius: 2rem; background: #ffd23f; color: #5c3b00; font-size: .72rem; font-weight: 800; letter-spacing: .08em; animation: cel-pop .5s cubic-bezier(.34,1.56,.64,1) .2s both; }
.cel-masc { margin-top: .2rem; animation: cel-sobe .65s cubic-bezier(.34,1.56,.64,1) .45s both; }
.cel-masc svg { display: block; }
.cel-dia h2 { color: #1d2433; margin: .2rem 0 0; font-size: 1.6rem; line-height: 1.15; font-weight: 800; animation: cel-fade .5s ease-out .8s both; }
.cel-dia p.sub { margin: .4rem 0 0; font-size: 1rem; line-height: 1.4; opacity: .88; animation: cel-fade .5s ease-out .95s both; }
.cel-sem { margin-top: .9rem; animation: cel-fade .5s ease-out 1.1s both; }
.cel-btn { margin-top: 1.1rem; width: min(100%, 16rem); min-height: 3.1rem; border: 0; border-radius: 1rem; background: #1565d8; color: #fff; font-family: inherit; font-weight: 800; font-size: 1.05rem; box-shadow: 0 4px 0 #0d4aa8; cursor: pointer; animation: cel-fade .45s ease-out 1.3s both; }
.cel-btn:active, .cel-btn.pr { transform: translateY(3px); box-shadow: 0 1px 0 #0d4aa8; }
.cel-dia.marco .cel-btn { background: #ffd23f; color: #3b2600; box-shadow: 0 4px 0 #c99a00; }
.cel-onda { position: absolute; left: 50%; top: 36%; width: 9rem; height: 9rem; margin: -4.5rem 0 0 -4.5rem; border-radius: 50%; border: 4px solid rgba(255,170,0,.8); pointer-events: none; animation: cel-onda 1.1s ease-out both; }
.cel-dia.marco .cel-onda { border-color: rgba(255,214,90,.9); }
.cel-flash { position: absolute; inset: 0; background: #fff; pointer-events: none; animation: cel-flash .35s ease-out both; z-index: 4; }
.cel-quieto *, .cel-quieto { animation: none !important; }
@keyframes cel-fundo { from { opacity: 0; } to { opacity: 1; } }
@keyframes cel-fundo-sai { to { opacity: 0; } }
@keyframes cel-gira { to { transform: rotate(360deg); } }
@keyframes cel-surge { from { opacity: 0; transform: scale(.4); } to { opacity: 1; } }
@keyframes cel-pop { 0% { transform: scale(0) rotate(-16deg); opacity: 0; } 100% { transform: none; opacity: 1; } }
@keyframes cel-sobe { 0% { transform: translateY(46px) scale(.6); opacity: 0; } 100% { transform: none; opacity: 1; } }
@keyframes cel-fade { from { transform: translateY(14px); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes cel-odo-sai { to { transform: translateY(-100%); } }
@keyframes cel-odo-entra { from { transform: translateY(100%); } to { transform: none; } }
@keyframes cel-onda { from { transform: scale(.2); opacity: .8; } to { transform: scale(3.6); opacity: 0; } }
@keyframes cel-flash { from { opacity: .85; } to { opacity: 0; } }
@media (max-height: 640px) { .cel-odo { font-size: 3.6rem; } .cel-masc svg { width: 110px; height: auto; } .cel-dia h2 { font-size: 1.35rem; } }
`;

  /* ---------------- camada superior (canvas + elementos) ---------------- */
  let raiz = null, cv = null, cx = null, W = 0, H = 0, dpr = 1;
  function estilo() {
    if (document.getElementById('cel-css')) return;
    const s = document.createElement('style'); s.id = 'cel-css'; s.textContent = CSS; document.head.appendChild(s);
  }
  function redim() {
    if (!cv) return;
    dpr = Math.min(2, root.devicePixelRatio || 1); W = root.innerWidth; H = root.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  /** Mostra a camada por cima de tudo (inclusive de <dialog> abertos, via popover). */
  function abrirRaiz() {
    estilo();
    if (!raiz) {
      raiz = document.createElement('div'); raiz.id = 'cel-raiz'; raiz.setAttribute('aria-hidden', 'false');
      try { raiz.popover = 'manual'; } catch (e) { /* sem popover */ }
      cv = document.createElement('canvas'); cv.className = 'cel-cv'; cv.setAttribute('aria-hidden', 'true'); cx = cv.getContext('2d');
      raiz.appendChild(cv); document.body.appendChild(raiz);
      root.addEventListener('resize', redim); redim();
    }
    try { if (raiz.matches(':popover-open')) raiz.hidePopover(); raiz.showPopover(); }
    catch (e) { raiz.classList.add('cel-fb'); }
    return raiz;
  }
  function fecharRaizSeOcioso() {
    if (!raiz || P.length || raiz.querySelector('.cel-dia, .cel-meta, .cel-chip, .cel-anel')) return;
    try { if (raiz.matches(':popover-open')) raiz.hidePopover(); } catch (e) { /* ignora */ }
    raiz.classList.remove('cel-fb');
  }

  /* ---------------- partículas ---------------- */
  const P = []; let raf = 0, ult = 0;
  const r1 = (a, b) => a + Math.random() * (b - a);
  const PALETA = ['#ffb21f', '#1565d8', '#ef5da8', '#2fbf71', '#7c3aed', '#ff7a00', '#22c3e6'];
  function emitir(o) {
    if (!cx) return;
    const n = Math.min(o.n || 20, 90);
    for (let i = 0; i < n; i++) {
      const ang = (o.angulo + r1(-o.abertura, o.abertura)) * Math.PI / 180, v = r1(o.vel[0], o.vel[1]);
      const forma = o.formas[(Math.random() * o.formas.length) | 0], t = r1(o.tam[0], o.tam[1]);
      P.push({
        x: o.x + (o.dx ? r1(-o.dx, o.dx) : 0), y: o.y + (o.dy ? r1(-o.dy, o.dy) : 0), vx: Math.cos(ang) * v, vy: Math.sin(ang) * v,
        r: r1(0, 6.28), vr: r1(-9, 9), f: forma, w: forma === 'fita' ? t * 2.2 : t, h: forma === 'fita' ? t * .45 : forma === 'ret' ? t * 1.5 : t,
        c: forma === 'moeda' ? '#f5b82e' : o.cores[(Math.random() * o.cores.length) | 0], fase: r1(0, 6.28), fv: r1(5, 13),
        g: o.g, ar: o.arrasto || 0.985, vida: 0, max: r1(o.vida[0], o.vida[1]),
      });
    }
    if (!raf) { ult = performance.now(); raf = requestAnimationFrame(quadro); }
  }
  function estrela(c, R, r) {
    c.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, d = i % 2 ? r : R; c.lineTo(Math.cos(a) * d, Math.sin(a) * d); }
    c.closePath();
  }
  function desenhar(p) {
    cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r);
    const k = p.vida / p.max; cx.globalAlpha = k > .72 ? Math.max(0, 1 - (k - .72) / .28) : 1;
    const giro = Math.cos(p.fase);
    cx.fillStyle = p.c;
    if (p.f === 'ret' || p.f === 'fita') { cx.scale(1, giro); cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); }
    else if (p.f === 'bola') { cx.beginPath(); cx.arc(0, 0, p.w / 2, 0, 6.28); cx.fill(); }
    else if (p.f === 'tri') { cx.scale(1, giro); cx.beginPath(); cx.moveTo(0, -p.w * .6); cx.lineTo(p.w * .55, p.w * .45); cx.lineTo(-p.w * .55, p.w * .45); cx.closePath(); cx.fill(); }
    else if (p.f === 'estrela') { cx.scale(giro, 1); estrela(cx, p.w * .75, p.w * .3); cx.fill(); }
    else if (p.f === 'moeda') {
      cx.scale(giro, 1); cx.beginPath(); cx.arc(0, 0, p.w * .62, 0, 6.28); cx.fill();
      cx.lineWidth = Math.max(1.2, p.w * .12); cx.strokeStyle = '#c98a0a'; cx.stroke();
      cx.beginPath(); cx.arc(0, 0, p.w * .34, 0, 6.28); cx.strokeStyle = '#ffe08a'; cx.lineWidth = Math.max(1, p.w * .09); cx.stroke();
    }
    cx.restore();
  }
  function quadro(t) {
    const dt = Math.min(0.034, (t - ult) / 1000); ult = t;
    cx.clearRect(0, 0, W, H);
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.vida += dt;
      if (p.vida >= p.max || p.y > H + 40) { P.splice(i, 1); continue; }
      const a = Math.pow(p.ar, dt * 60);
      p.vx *= a; p.vy = p.vy * a + p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; p.fase += p.fv * dt;
      desenhar(p);
    }
    if (P.length) raf = requestAnimationFrame(quadro);
    else { raf = 0; cx.clearRect(0, 0, W, H); fecharRaizSeOcioso(); }
  }
  const FORMAS = ['ret', 'bola', 'tri', 'estrela', 'fita'];
  const explosao = (x, y, o) => emitir(Object.assign({ x, y, n: 18, angulo: -90, abertura: 180, vel: [160, 420], tam: [5, 10], g: 760, vida: [.7, 1.1], cores: PALETA, formas: FORMAS }, o));
  const canhao = (lado, o) => emitir(Object.assign({ x: lado === 'e' ? -6 : W + 6, y: H * .9, n: 38, angulo: lado === 'e' ? -62 : -118, abertura: 20, vel: [520, 1050], tam: [6, 12], g: 980, arrasto: .975, vida: [1.5, 2.4], cores: PALETA, formas: FORMAS }, o));
  const chuva = (n, o) => emitir(Object.assign({ x: W / 2, dx: W / 2, y: -14, n, angulo: 90, abertura: 22, vel: [90, 300], tam: [6, 12], g: 300, arrasto: .992, vida: [2.2, 3.4], cores: PALETA, formas: FORMAS }, o));

  /* ---------------- 1) micro-recompensa ---------------- */
  function pos(el) {
    const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    return r && (r.width || r.height) ? [r.left + r.width / 2, r.top + r.height / 2] : [root.innerWidth / 2, root.innerHeight * .45];
  }
  function micro(el, o) {
    o = o || {};
    if (!ligado()) return;
    const [x0, y] = pos(el), x = Math.max(70, Math.min(root.innerWidth - 70, x0));
    const cor = o.cor || accent(), sup = o.super === true || (o.super !== false && Math.random() < 0.14);
    const r = abrirRaiz();
    if (!reduzido()) {
      const a = document.createElement('i'); a.className = 'cel-anel'; a.style.cssText = `left:${x0}px;top:${y}px;--c:${cor}`; r.appendChild(a); setTimeout(() => { a.remove(); fecharRaizSeOcioso(); }, 560);
    }
    const c = document.createElement('div'); c.className = 'cel-chip' + (sup ? ' sup' : ''); c.style.cssText = `left:${x}px;top:${y - 10}px;--c:${cor}`;
    c.innerHTML = `<b></b><small></small>`;
    c.firstChild.textContent = o.xp ? `+${o.xp} XP` : (o.texto || 'Feito!'); c.lastChild.textContent = sup ? sortear(SUPER, 'sup') : (o.xp ? sortear(MICRO, 'micro') : '');
    if (!c.lastChild.textContent) c.lastChild.remove();
    if (reduzido()) c.style.animation = 'cel-fade .3s ease-out both, cel-fade .3s ease-in 1.1s reverse both';
    r.appendChild(c); setTimeout(() => { c.remove(); fecharRaizSeOcioso(); }, reduzido() ? 1500 : 1100);
    if (comMovimento()) {
      const cores = [cor, '#ffc12e', '#ff6b8b', '#2fbf6a', '#3b9bff'];
      explosao(x0, y, { n: sup ? 40 : 20, cores, vel: sup ? [200, 560] : [150, 380], tam: sup ? [6, 12] : [4.5, 9], formas: sup ? ['estrela', 'estrela', 'bola', 'ret', 'tri'] : FORMAS });
    }
    vibrar(sup ? [10, 30, 16] : 8); tocar('micro');
  }

  /* ---------------- 2) chuva de moedas ---------------- */
  function moedas(o) {
    o = o || {};
    if (!ligado()) return;
    const r = abrirRaiz();
    const c = document.createElement('div'); c.className = 'cel-chip sup'; c.style.cssText = `left:50%;top:38%;--c:#d98200`;
    c.innerHTML = '<b></b><small></small>'; c.firstChild.textContent = o.texto || sortear(MOEDAS, 'moeda'); c.lastChild.textContent = o.sub || 'Dinheiro entrando é motivo de comemorar';
    r.appendChild(c); setTimeout(() => { c.remove(); fecharRaizSeOcioso(); }, 1200);
    if (comMovimento()) {
      chuva(34, { cores: ['#f5b82e'], formas: ['moeda'], tam: [11, 17], g: 620, vel: [140, 380], vida: [1.8, 2.6] });
      setTimeout(() => explosao(root.innerWidth / 2, root.innerHeight * .38, { n: 16, cores: ['#ffe08a', '#f5b82e', '#fff'], formas: ['estrela', 'bola'], vel: [120, 320] }), 120);
    }
    vibrar([12, 30, 12]); tocar('moeda');
  }

  /* ---------------- 3) lista do dia toda feita ---------------- */
  function metaDoDia(o) {
    o = o || {};
    if (!ligado() || document.querySelector('.cel-meta')) return;
    const r = abrirRaiz();
    const m = document.createElement('div'); m.className = 'cel-meta'; m.setAttribute('role', 'status');
    const masc = root.BrainMascote ? root.BrainMascote.svg('festa', 60) : '';
    m.innerHTML = `${masc}<div><b></b><span></span></div>`;
    m.querySelector('b').textContent = o.titulo || sortear(META, 'meta'); m.querySelector('span').textContent = o.sub || sortear(META_SUB, 'metasub');
    r.appendChild(m);
    const sai = () => { m.classList.add('sai'); setTimeout(() => { m.remove(); fecharRaizSeOcioso(); }, 320); };
    m.addEventListener('click', sai); setTimeout(sai, 3600);
    if (comMovimento()) { chuva(46, {}); setTimeout(() => chuva(22, {}), 500); }
    vibrar([20, 40, 20]); tocar('meta');
  }

  /* ---------------- 4) fechou o dia da ofensiva ---------------- */
  function dia(rj, o) {
    o = o || {};
    if (document.querySelector('.cel-dia')) return;
    const n = Math.max(1, (rj && rj.sequencia) || o.n || 1);
    const t = textoDia(n, !!(o.salvou || (rj && rj.salvou_hoje)));
    const titulo = o.titulo || t.titulo, sub = o.sub || t.sub, marco = o.marco != null ? o.marco : t.marco;
    const movimento = comMovimento();
    const ui = root.BrainJogoUI;
    const anterior = document.activeElement;
    const r = abrirRaiz();
    const d = document.createElement('div');
    d.className = 'cel-dia' + (marco ? ' marco' : '') + (movimento ? '' : ' cel-quieto');
    d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', titulo);
    const chama = ui && ui.chama ? ui.chama('ativa', 104, true) : '';
    const masc = root.BrainMascote ? root.BrainMascote.svg('festa', 150) : '';
    const sem = ui && ui.faixa && rj && rj.semana ? ui.faixa(rj) : '';
    const de = Math.max(0, n - 1);
    d.innerHTML = `${movimento ? '<div class="cel-raios" aria-hidden="true"></div><i class="cel-onda" style="animation-delay:.2s"></i><i class="cel-onda" style="animation-delay:.5s"></i>' : ''}
      <div class="cel-cena">
        ${marco ? '<span class="cel-selo">NOVA MARCA</span>' : ''}
        <div class="cel-faixa"><span class="cel-chama" aria-hidden="true">${chama}</span>
          <div class="cel-numbloco"><span class="cel-odo" aria-hidden="true"><i class="vai">${de}</i><i class="vem">${n}</i></span><span class="cel-un">${n === 1 ? 'dia' : 'dias'} de ofensiva</span></div></div>
        <div class="cel-masc" aria-hidden="true">${masc}</div>
        <h2></h2><p class="sub"></p>
        <div class="cel-sem">${sem}</div>
        <button type="button" class="cel-btn">Continuar</button>
      </div>${movimento ? '<i class="cel-flash" aria-hidden="true"></i>' : ''}`;
    d.querySelector('h2').textContent = titulo; d.querySelector('p.sub').textContent = sub;
    if (!movimento) d.querySelector('.cel-odo .vai').remove();
    r.insertBefore(d, r.firstChild);
    const btn = d.querySelector('.cel-btn');
    let aberto = true;
    const fechar = () => {
      if (!aberto) return; aberto = false; document.removeEventListener('keydown', esq);
      d.classList.add('sai'); setTimeout(() => { d.remove(); fecharRaizSeOcioso(); try { if (anterior && anterior.focus) anterior.focus({ preventScroll: true }); } catch (e) { /* ignora */ } }, movimento ? 280 : 0);
    };
    const esq = (e) => { if (e.key === 'Escape') fechar(); };
    document.addEventListener('keydown', esq);
    btn.onclick = fechar;
    const t0 = Date.now(); d.addEventListener('click', (e) => { if (e.target === d && Date.now() - t0 > 1200) fechar(); });
    setTimeout(() => { try { btn.focus({ preventScroll: true }); } catch (e) { /* ignora */ } }, movimento ? 1300 : 50);
    if (movimento) {
      const ouro = ['#ffd23f', '#ffb21f', '#fff3b0', '#ff7a00'], cores = marco ? ouro.concat(['#ffffff', '#b794ff']) : PALETA;
      setTimeout(() => { canhao('e', { cores }); canhao('d', { cores }); }, 130);
      setTimeout(() => explosao(W / 2, H * .3, { n: marco ? 46 : 30, cores: marco ? ouro : cores, formas: ['estrela', 'estrela', 'bola', 'tri'], vel: [220, 600], tam: [6, 13], vida: [1, 1.7] }), 700);
      setTimeout(() => chuva(marco ? 60 : 36, { cores }), 950);
      if (marco) { setTimeout(() => { canhao('e', { cores: ouro, n: 30 }); canhao('d', { cores: ouro, n: 30 }); }, 1500); setTimeout(() => chuva(40, { cores: ouro, formas: ['estrela', 'bola'] }), 1900); }
      vibrar(marco ? [30, 50, 30, 50, 90] : [24, 40, 24, 40, 60]);
    }
    tocar('dia');
  }

  root.BrainCelebrar = Object.assign(api, { micro, moedas, metaDoDia, dia, ligado });
  /* tocar uma comemoração de teste (Configurações) */
  root.BrainCelebrar.testar = function () {
    dia({ sequencia: 7, semana: null }, { marco: false });
  };
})(typeof self !== 'undefined' ? self : this);
