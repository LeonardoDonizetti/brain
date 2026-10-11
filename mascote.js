/* Mascote do Brain (cérebro fofo) com humores: feliz, triste, festa. Arte original, SVG plano. */
(function (raiz) {
  'use strict';
  const B = '#ef9a95', D = '#d97d78';
  function svg(humor, px, cls) {
    humor = humor || 'feliz';
    const corpo = `<g fill="${B}"><circle cx="36" cy="52" r="22"/><circle cx="62" cy="36" r="25"/><circle cx="90" cy="40" r="22"/><circle cx="106" cy="60" r="17"/><circle cx="40" cy="74" r="19"/><circle cx="72" cy="78" r="22"/><circle cx="98" cy="76" r="17"/><ellipse cx="70" cy="62" rx="46" ry="26"/></g>
      <g fill="none" stroke="${D}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 50c6-8 14-4 18-12"/><path d="M52 22c8 4 6 12 14 14"/><path d="M80 24c8 2 8 10 16 10"/><path d="M104 48c6 2 8 8 14 8"/><path d="M96 92c6-2 10-8 14-6"/><path d="M26 74c6 4 10 0 14 6"/></g>
      <circle cx="44" cy="77" r="7.5" fill="#f9a9a4" opacity=".85"/><circle cx="96" cy="77" r="7.5" fill="#f9a9a4" opacity=".85"/>`;
    let rosto;
    if (humor === 'triste') {
      rosto = `<ellipse cx="55" cy="68" rx="6.2" ry="7" fill="#2a2420"/><ellipse cx="85" cy="68" rx="6.2" ry="7" fill="#2a2420"/><circle cx="57" cy="65.5" r="2.4" fill="#fff"/><circle cx="87" cy="65.5" r="2.4" fill="#fff"/>
        <path d="M47 56l12 3M93 56l-12 3" stroke="#2a2420" stroke-width="2.6" stroke-linecap="round"/><path d="M64 82q6-6 12 0" fill="none" stroke="#2a2420" stroke-width="2.6" stroke-linecap="round"/><path d="M50 78q-2 7 0 10" fill="none" stroke="#7cc4f2" stroke-width="3" stroke-linecap="round"/>`;
    } else if (humor === 'festa') {
      rosto = `<path d="M48 68q7-9 14 0M78 68q7-9 14 0" fill="none" stroke="#2a2420" stroke-width="3" stroke-linecap="round"/><path d="M62 75q8 12 16 0z" fill="#b8453f" stroke="#2a2420" stroke-width="2" stroke-linejoin="round"/>
        <path d="M52 18l8-14 8 14z" fill="#ffb21f" stroke="#c98100" stroke-width="2" stroke-linejoin="round" transform="translate(8 -2)"/><circle cx="12" cy="30" r="3" fill="#1565d8"/><circle cx="128" cy="26" r="3" fill="#ff7a00"/><circle cx="120" cy="8" r="2.5" fill="#7c3aed"/><circle cx="20" cy="10" r="2.5" fill="#15803d"/>`;
    } else {
      rosto = `<ellipse cx="55" cy="66" rx="6.4" ry="7.4" fill="#2a2420"/><ellipse cx="85" cy="66" rx="6.4" ry="7.4" fill="#2a2420"/><circle cx="57.4" cy="63" r="2.6" fill="#fff"/><circle cx="87.4" cy="63" r="2.6" fill="#fff"/><circle cx="53.2" cy="69.2" r="1.3" fill="#fff"/><circle cx="83.2" cy="69.2" r="1.3" fill="#fff"/>
        <path d="M65 76q5 6.5 10 0z" fill="#b8453f" stroke="#2a2420" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    }
    const pernas = `<path d="M56 98v9M84 98v9" fill="none" stroke="${B}" stroke-width="10" stroke-linecap="round"/><ellipse cx="55" cy="112" rx="9" ry="5" fill="${D}"/><ellipse cx="85" cy="112" rx="9" ry="5" fill="${D}"/>`;
    const br = (d) => `<path d="${d}" fill="none" stroke="${B}" stroke-width="8" stroke-linecap="round"/>`;
    const bracos = humor === 'festa' ? br('M18 62q-12-6-10-22') + br('M122 62q12-6 12-22') : humor === 'triste' ? br('M18 72q-8 8-4 22') + br('M122 72q8 8 4 22') : br('M18 70q-10 8-8 22') + br('M122 62q12-6 12-22');
    const w = px || 80;
    return `<svg viewBox="0 0 140 120" width="${w}" height="${Math.round(w * 120 / 140)}" role="img" aria-hidden="true" class="mascote-b${cls ? ' ' + cls : ''}">${bracos}${pernas}${corpo}${rosto}</svg>`;
  }

  // Põe o mascote nos estados vazios (sem mexer no texto de cada tela).
  function decorar(no) {
    (no.querySelectorAll ? no.querySelectorAll('.vazio-t:not([data-m]), .vazio-i:not([data-m]), .vazio-total:not([data-m]):not([hidden])') : []).forEach((el) => {
      el.setAttribute('data-m', '1');
      el.insertAdjacentHTML('afterbegin', `<div class="mascote-vazio">${svg('feliz', 84)}</div>`);
    });
  }
  function iniciar() {
    decorar(document);
    new MutationObserver((ms) => { for (const m of ms) { if (m.addedNodes.length) { decorar(document); break; } if (m.type === 'attributes') { decorar(document); break; } } })
      .observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  }
  const API = { svg, decorar };
  if (typeof module === 'object' && module.exports) module.exports = API;
  else {
    raiz.BrainMascote = API;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
  }
})(typeof window !== 'undefined' ? window : globalThis);
