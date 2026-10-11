/* Animação suave de gráficos: anéis e barras partem do valor ANTERIOR (guardado na sessão) e
   crescem até o novo, mesmo quando a tela é redesenhada ou o usuário volta de outra página.
   Anel que sobe dá um "pop"; anel que fecha 100% solta uma comemoração. Respeita "reduzir movimento". */
(function (root) {
  'use strict';
  const KEY = 'brain-anim-v1';
  let mem = {};
  try { mem = JSON.parse(sessionStorage.getItem(KEY) || '{}') || {}; } catch (e) { mem = {}; }
  const reduz = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const ligado = () => { try { return !(root.BrainPrefs && root.BrainPrefs.get().efeitos === false); } catch (e) { return true; } };
  const anima = () => !reduz() && ligado();
  const EASE = 'cubic-bezier(.22, 1, .36, 1)';
  const lim = (v) => Math.max(0, Math.min(100, Number(v) || 0));

  /** Valor anterior de uma chave (e já grava o novo). */
  function anterior(chave, novo, padrao) {
    const a = Object.prototype.hasOwnProperty.call(mem, chave) ? mem[chave] : padrao;
    mem[chave] = novo;
    try { sessionStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* sem sessionStorage */ }
    return a;
  }

  function estilo() {
    if (document.getElementById('an-css')) return;
    const s = document.createElement('style'); s.id = 'an-css';
    s.textContent = '.an-pulsa { animation: an-pulsa .65s cubic-bezier(.34,1.56,.64,1); } @keyframes an-pulsa { 0% { transform: scale(1); } 35% { transform: scale(1.09); } 100% { transform: none; } } .an-num { font-variant-numeric: tabular-nums; }';
    document.head.appendChild(s);
  }
  function pulsar(el) {
    if (!el || !anima()) return; estilo();
    el.classList.remove('an-pulsa'); void el.offsetWidth; el.classList.add('an-pulsa');
    setTimeout(() => el.classList.remove('an-pulsa'), 750);
  }

  /** Barra (largura ou altura em %) que cresce do valor anterior ao novo. */
  function barra(el, chave, pct, eixo, dur) {
    eixo = eixo || 'width'; pct = lim(pct);
    const a = lim(anterior(chave, pct, 0));
    if (!el) return;
    if (!anima() || a === pct) { el.style.transition = 'none'; el.style[eixo] = pct + '%'; return; }
    el.style.transition = 'none'; el.style[eixo] = a + '%'; void el.offsetWidth;
    el.style.transition = `${eixo} ${dur || 850}ms ${EASE}`; el.style[eixo] = pct + '%';
  }

  /** Anel SVG com pathLength 100 (stroke-dasharray "p resto"). Retorna { subiu, completou }. */
  function anel(circulo, chave, pct, o) {
    o = o || {}; pct = lim(pct);
    const a = lim(anterior(chave, pct, 0));
    if (!circulo) return { subiu: false, completou: false };
    const poe = (v) => { circulo.style.strokeDasharray = `${v} ${100 - v}`; circulo.setAttribute('stroke-dasharray', `${v} ${100 - v}`); };
    const subiu = pct > a, completou = pct >= 100 && a < 100;
    if (!anima() || a === pct) { circulo.style.transition = 'none'; poe(pct); return { subiu: false, completou: false }; }
    circulo.style.transition = 'none'; poe(a); void circulo.getBoundingClientRect();
    circulo.style.transition = `stroke-dasharray ${o.dur || 900}ms ${EASE}, stroke .3s ease`; poe(pct);
    if (subiu) setTimeout(() => pulsar(o.pulso || circulo.closest('.anel') || circulo.parentNode), 520);
    if (completou && o.celebrar !== false && root.BrainCelebrar) setTimeout(() => root.BrainCelebrar.micro(o.pulso || circulo, { texto: o.texto || 'Meta batida!', super: true }), 760);
    return { subiu, completou };
  }

  /** Número que sobe contando do valor anterior ao novo. */
  function contar(el, chave, valor, fmt) {
    fmt = fmt || String;
    const a = anterior(chave, valor, 0);
    if (!el) return;
    if (!anima() || a === valor) { el.textContent = fmt(valor); return; }
    estilo(); el.classList.add('an-num');
    const t0 = performance.now(), dur = 800;
    const passo = (t) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(Math.round(a + (valor - a) * e));
      if (k < 1 && el.isConnected) requestAnimationFrame(passo); else el.textContent = fmt(valor);
    };
    requestAnimationFrame(passo);
  }

  /** Varre uma área e anima toda barra marcada com data-ak (chave), data-pct e, opcional, data-eixo (width|height). */
  function varrer(raiz) {
    if (!raiz || !raiz.querySelectorAll) return;
    raiz.querySelectorAll('[data-ak]').forEach((el) => barra(el, el.dataset.ak, Number(el.dataset.pct), el.dataset.eixo || 'width'));
  }

  root.BrainAnim = { barra, anel, contar, varrer, pulsar, anterior };
})(typeof self !== 'undefined' ? self : this);
