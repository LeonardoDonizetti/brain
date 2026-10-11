/* Mascote do Brain (cérebro fofo) com humores: feliz, triste, festa. Arte original, SVG plano. */
(function (raiz) {
  'use strict';
  const B = '#ef9a95', D = '#d97d78';

  // ===== Poses por seção: o mascote muda de postura e de objeto conforme a área do app =====
  const T = '#2a2420';
  const olhos = (dy) => `<ellipse cx="55" cy="${66 + dy}" rx="6.4" ry="7.4" fill="${T}"/><ellipse cx="85" cy="${66 + dy}" rx="6.4" ry="7.4" fill="${T}"/><circle cx="57.4" cy="${63 + dy}" r="2.6" fill="#fff"/><circle cx="87.4" cy="${63 + dy}" r="2.6" fill="#fff"/>`;
  const sorriso = '<path d="M65 76q5 6.5 10 0z" fill="#b8453f" stroke="#2a2420" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
  const bracoP = (d, cls) => `<path ${cls ? `class="${cls}" ` : ''}d="${d}" fill="none" stroke="${B}" stroke-width="8" stroke-linecap="round"/>`;
  const mao = (x, y) => `<circle cx="${x}" cy="${y}" r="6" fill="${B}"/>`;
  const POSES = {
    // Início: acenando
    aceno: {
      rosto: olhos(0) + '<path d="M63 75q7 9 14 0z" fill="#b8453f" stroke="#2a2420" stroke-width="2" stroke-linejoin="round"/>',
      bracos: bracoP('M18 70q-10 8-8 22') + `<g class="m-acena" style="transform-origin:122px 64px">${bracoP('M122 64q14-4 13-24')}${mao(135, 38)}</g>`,
      frente: '<path d="M126 22q5-5 10 0M121 12q8-8 16 0" fill="none" stroke="#ffb21f" stroke-width="3" stroke-linecap="round"/>'
    },
    // Estudos: lendo um livro, de capelo
    lendo: {
      rosto: olhos(3) + '<path d="M66 78q4 4 8 0" fill="none" stroke="#2a2420" stroke-width="2.6" stroke-linecap="round"/><path d="M47 56q8-4 14 0M79 56q8-4 14 0" fill="none" stroke="#2a2420" stroke-width="2.4" stroke-linecap="round"/>',
      bracos: bracoP('M18 70q4 22 26 28') + bracoP('M122 70q-4 22-26 28'),
      pernas: false,
      frente: `<g class="m-livro"><path d="M70 92q-14-7-32-3v22q18-4 32 3z" fill="#fff" stroke="#3b5bdb" stroke-width="2.6" stroke-linejoin="round"/><path d="M70 92q14-7 32-3v22q-18-4-32 3z" fill="#f4f7ff" stroke="#3b5bdb" stroke-width="2.6" stroke-linejoin="round"/><path d="M70 92v22" stroke="#3b5bdb" stroke-width="2.6"/><path d="M44 97q10-2 20 1M44 103q10-2 20 1M76 98q10-3 20-1M76 104q10-3 20-1" fill="none" stroke="#9fb4f5" stroke-width="2" stroke-linecap="round"/></g>${mao(40, 100)}${mao(100, 100)}
        <g class="m-capelo"><path d="M70 2l32 12-32 12-32-12z" fill="#3a3f5c" stroke="#262a40" stroke-width="2" stroke-linejoin="round"/><path d="M52 21v10q18 8 36 0V21" fill="#4a5073" stroke="#262a40" stroke-width="2" stroke-linejoin="round"/><path d="M100 15v18" stroke="#ffb21f" stroke-width="2.6" stroke-linecap="round"/><circle cx="100" cy="35" r="3.2" fill="#ffb21f"/></g>
        <path d="M18 26l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#a78bfa" opacity=".9"/>`
    },
    // Tarefas: com a prancheta e o check
    prancheta: {
      rosto: olhos(0) + '<path d="M63 75q7 9 14 0z" fill="#b8453f" stroke="#2a2420" stroke-width="2" stroke-linejoin="round"/>',
      bracos: bracoP('M18 70q-10 8-8 22') + bracoP('M122 64q-4 22-26 28'),
      frente: `<g class="m-prancheta" style="transform-origin:112px 78px"><rect x="94" y="56" width="38" height="50" rx="5" fill="#fff" stroke="#087590" stroke-width="3"/><rect x="104" y="51" width="18" height="9" rx="3" fill="#087590"/><path d="M101 74l4 4 7-8" fill="none" stroke="#16a34a" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M116 74h10" stroke="#9fd0dc" stroke-width="3" stroke-linecap="round"/><path d="M101 88l4 4 7-8" fill="none" stroke="#16a34a" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M116 88h10" stroke="#9fd0dc" stroke-width="3" stroke-linecap="round"/></g>${mao(97, 92)}`
    },
    // Rotina: caneca quentinha de manhã, sol ao lado
    cafe: {
      rosto: '<path d="M48 68q7-7 14 0M78 68q7-7 14 0" fill="none" stroke="#2a2420" stroke-width="3" stroke-linecap="round"/><path d="M64 75q6 6 12 0" fill="none" stroke="#2a2420" stroke-width="2.8" stroke-linecap="round"/>',
      bracos: bracoP('M18 70q-10 8-8 22') + bracoP('M122 68q-8 6-15 26'),
      frente: `<g><rect x="108" y="82" width="22" height="22" rx="6" fill="#fff" stroke="#c2410c" stroke-width="3"/><path d="M130 88q9 0 9 6.5t-9 6.5" fill="none" stroke="#c2410c" stroke-width="3" stroke-linecap="round"/><path d="M111 90h16" stroke="#c2410c" stroke-width="3" opacity=".3" stroke-linecap="round"/></g>${mao(107, 95)}
        <g class="m-vapor" fill="none" stroke="#fdba74" stroke-width="3" stroke-linecap="round"><path d="M114 75q-4-5 0-9"/><path d="M123 75q-4-5 0-9"/></g>
        <g class="m-sol" style="transform-origin:16px 18px"><circle cx="16" cy="18" r="7" fill="#ffb21f"/><g stroke="#ffb21f" stroke-width="3" stroke-linecap="round"><path d="M16 5v4M16 27v4M3 18h4M25 18h4M7 9l3 3M22 24l3 3M25 9l-3 3M10 24l-3 3"/></g></g>`
    },
    // Finanças: segurando uma moeda grande
    moeda: {
      rosto: olhos(0) + '<path d="M64 75q6 8 12 0z" fill="#b8453f" stroke="#2a2420" stroke-width="2" stroke-linejoin="round"/>',
      bracos: bracoP('M18 70q-10 8-8 22') + bracoP('M122 68q-10 14-25 22'),
      frente: `<g class="m-moeda" style="transform-origin:112px 78px"><circle cx="112" cy="74" r="19" fill="#ffc83d" stroke="#c98100" stroke-width="3"/><circle cx="112" cy="74" r="13.5" fill="none" stroke="#e0a010" stroke-width="2"/><text x="112" y="80" text-anchor="middle" font-family="IBM Plex Sans,Arial,sans-serif" font-weight="800" font-size="16" fill="#9a6200">$</text></g>${mao(97, 91)}
        <g class="m-brilho"><path d="M130 48l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#ffb21f"/><path d="M14 30l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" fill="#16a34a" opacity=".85"/></g>`
    },
    // Ofensiva: comemoração simples (mesmo rosto da festa, sem chapéu), punhos para o alto e pulinho
    vitoria: {
      vb: [-10, -14, 160, 142], salta: true,
      rosto: `<path d="M48 68q7-9 14 0M78 68q7-9 14 0" fill="none" stroke="#2a2420" stroke-width="3" stroke-linecap="round"/><path d="M62 75q8 12 16 0z" fill="#b8453f" stroke="#2a2420" stroke-width="2" stroke-linejoin="round"/><path d="M66 79q4 3 8 0" fill="none" stroke="#ef8a85" stroke-width="2" stroke-linecap="round"/>`,
      bracos: `<g class="m-puno-e" style="transform-origin:18px 62px">${bracoP('M18 62q-12-6-10-22')}${mao(8, 39)}</g><g class="m-puno-d" style="transform-origin:122px 62px">${bracoP('M122 62q12-6 12-22')}${mao(134, 39)}</g>`,
      frente: '<g class="m-brilho"><path d="M14 22l2 4.6 4.6 2-4.6 2-2 4.6-2-4.6-4.6-2 4.6-2z" fill="#ffb21f"/><path d="M128 18l1.8 4.2 4.2 1.8-4.2 1.8-1.8 4.2-1.8-4.2-4.2-1.8 4.2-1.8z" fill="#ffb21f"/></g>'
    },
    // Marco: igual, com uma coroa dourada
    rei: {
      vb: [-10, -22, 160, 150], salta: true,
      rosto: `<path d="M48 68q7-9 14 0M78 68q7-9 14 0" fill="none" stroke="#2a2420" stroke-width="3" stroke-linecap="round"/><path d="M62 75q8 12 16 0z" fill="#b8453f" stroke="#2a2420" stroke-width="2" stroke-linejoin="round"/><path d="M66 79q4 3 8 0" fill="none" stroke="#ef8a85" stroke-width="2" stroke-linecap="round"/>`,
      bracos: `<g class="m-puno-e" style="transform-origin:18px 62px">${bracoP('M18 62q-12-6-10-22')}${mao(8, 39)}</g><g class="m-puno-d" style="transform-origin:122px 62px">${bracoP('M122 62q12-6 12-22')}${mao(134, 39)}</g>`,
      frente: '<g transform="translate(70 15) rotate(-4)"><path d="M-21 9L-24 -11L-11 -2L0 -16L11 -2L24 -11L21 9Z" fill="#ffd23f" stroke="#c98100" stroke-width="2.4" stroke-linejoin="round"/><path d="M-21 4h42" stroke="#c98100" stroke-width="2"/><circle cx="-11" cy="6.6" r="1.9" fill="#ef4444"/><circle cx="0" cy="6.6" r="2.1" fill="#3b82f6"/><circle cx="11" cy="6.6" r="1.9" fill="#22c55e"/></g><g class="m-brilho"><path d="M14 22l2 4.6 4.6 2-4.6 2-2 4.6-2-4.6-4.6-2 4.6-2z" fill="#ffb21f"/><path d="M128 18l1.8 4.2 4.2 1.8-4.2 1.8-1.8 4.2-1.8-4.2-4.2-1.8 4.2-1.8z" fill="#ffb21f"/></g>'
    },
    // Jornada: bandeira no alto
    bandeira: {
      rosto: '<path d="M48 68q7-8 14 0M78 68q7-8 14 0" fill="none" stroke="#2a2420" stroke-width="3" stroke-linecap="round"/><path d="M62 74q8 13 16 0z" fill="#b8453f" stroke="#2a2420" stroke-width="2" stroke-linejoin="round"/>',
      bracos: bracoP('M18 62q-12-6-10-22') + bracoP('M122 62q4-8 2-18'),
      frente: `<g class="m-bandeira" style="transform-origin:124px 12px"><path d="M124 3v43" stroke="#7a4b2a" stroke-width="3" stroke-linecap="round"/><path d="M126 5h13l-4 7 4 7h-13z" fill="#be1f68" stroke="#8c1450" stroke-width="2" stroke-linejoin="round"/></g>${mao(124, 44)}${mao(8, 38)}
        <path d="M14 14l2.2 5 5 2.2-5 2.2-2.2 5-2.2-5-5-2.2 5-2.2z" fill="#ffb21f"/>`
    }
  };
  const POSE_PAG = { inicio: 'aceno', estudos: 'lendo', tarefas: 'prancheta', rotina: 'cafe', financas: 'moeda', jornada: 'bandeira' };
  const FALAS = {
    inicio: ['Opa! Bora ver como tá o dia?', 'Oi! Hoje o dia é seu.', 'Um passinho de cada vez, a gente chega lá.'],
    estudos: ['Shh... tô lendo aqui 📖', 'Cada revisão fixa mais um pouquinho!', 'Que tal 25 minutinhos de foco?'],
    tarefas: ['Uma de cada vez e some tudo!', 'Riscar tarefa é o melhor.', 'Já fez a mais chata? Aí o resto é fácil.'],
    rotina: ['Bom dia! Café na mão e bora.', 'Rotina boa é a que você consegue repetir.', 'Pequeno hábito, grande resultado.'],
    financas: ['Anotou o gasto de hoje?', 'Cada real conta, viu?', 'Guardar um pouquinho já é vitória.'],
    jornada: ['Olha só o quanto você andou!', 'Bandeira fincada, próxima meta!', 'Evoluir é isso: um dia depois do outro.']
  };

  // ===== acessórios com mais detalhe =====
  /** Chapéu de aniversário: cone listrado, bolinhas, aba, pompom felpudo. */
  function chapeu() {
    const H = 28, R = 13, w = (h) => R * (1 - h / H);
    const banda = (h1, h2, f) => `<path d="M${(-w(h1)).toFixed(2)} ${-h1}L${w(h1).toFixed(2)} ${-h1}L${w(h2).toFixed(2)} ${-h2}L${(-w(h2)).toFixed(2)} ${-h2}Z" fill="${f}"/>`;
    return `<g transform="translate(72 19) rotate(-16) scale(1.25)">
      <path d="M${-R} 0L0 ${-H}L${R} 0Z" fill="#ff6fa5"/>
      ${banda(4, 9, '#ffd23f')}${banda(13, 17, '#5ab4ff')}${banda(21, 24.5, '#ffd23f')}
      <g fill="#fff" opacity=".9"><circle cx="-5.5" cy="-11" r="1.3"/><circle cx="4.5" cy="-11" r="1.3"/><circle cx="-1" cy="-19" r="1.2"/><circle cx="-7.5" cy="-2" r="1.2"/><circle cx="7.5" cy="-2" r="1.2"/></g>
      <path d="M${-R} 0L0 ${-H}L${R} 0Z" fill="none" stroke="#b02a63" stroke-width="1.7" stroke-linejoin="round"/>
      <ellipse cx="0" cy="1" rx="14.5" ry="3" fill="#ff4d8d" stroke="#b02a63" stroke-width="1.6"/>
      <path d="M-13 .6q13 3 26 0" fill="none" stroke="#ffd2e3" stroke-width="1" stroke-linecap="round" opacity=".8"/>
      <g><circle cx="0" cy="${-H - 1}" r="4.6" fill="#ffd23f" stroke="#c98100" stroke-width="1.4"/><circle cx="-2.6" cy="${-H - 3}" r="1.5" fill="#fff3b0"/><circle cx="2.8" cy="${-H}" r="1.4" fill="#fff3b0"/><circle cx="-1" cy="${-H + 1.6}" r="1.2" fill="#e0a800" opacity=".6"/></g>
    </g>`;
  }
  /** Confetes variados: fitas onduladas, retângulos, estrelinhas, triângulos e argolas. */
  function confetes() {
    const L = [['r', -4, 16, 24, '#ff5a8a'], ['w', 8, -8, -14, '#4aa8ff'], ['s', 130, 6, 0, '#ffb21f'], ['t', 143, 54, 28, '#7c3aed'], ['o', -3, 50, 0, '#16a34a'], ['w', 117, -12, 12, '#ff7a00'], ['r', 144, 26, -34, '#16a34a'], ['s', -6, 34, 0, '#ff7a00'], ['t', 20, -12, -16, '#ff5a8a'], ['o', 138, -6, 0, '#4aa8ff'], ['w', -2, 74, 28, '#7c3aed'], ['r', 141, 80, 40, '#ffb21f'], ['s', 100, -8, 0, '#4aa8ff']];
    const f = {
      r: (c) => `<rect x="-3.6" y="-1.7" width="7.2" height="3.4" rx=".9" fill="${c}"/>`,
      w: (c) => `<path d="M-7 0q3.5-5 7 0t7 0" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/>`,
      s: (c) => `<path d="M0 -5.4Q1 -1 5.4 0Q1 1 0 5.4Q-1 1 -5.4 0Q-1 -1 0 -5.4Z" fill="${c}"/>`,
      t: (c) => `<path d="M0 -4L4 3L-4 3Z" fill="${c}" stroke="${c}" stroke-width="1.4" stroke-linejoin="round"/>`,
      o: (c) => `<circle r="3" fill="none" stroke="${c}" stroke-width="1.9"/>`,
    };
    return `<g class="m-confs" aria-hidden="true">${L.map(([t, x, y, a, c], i) => `<g class="m-c" style="animation-delay:${(i * 0.23).toFixed(2)}s" transform="translate(${x} ${y}) rotate(${a})">${f[t](c)}</g>`).join('')}</g>`;
  }
  const lagrima = '<path d="M49 79q-6.5 8.5-.5 13q6-1.5 .5-13z" fill="#7cc4f2" stroke="#4aa0d8" stroke-width="1.4" stroke-linejoin="round"/><path d="M48 85q-1.6 3 .2 4.4" fill="none" stroke="#fff" stroke-width="1.3" stroke-linecap="round" opacity=".85"/>';

  function svg(humor, px, cls) {
    humor = humor || 'feliz';
    const PO = POSES[humor] || POSES[POSE_PAG[humor]] || null;
    const corpo = `<g fill="${B}"><circle cx="36" cy="52" r="22"/><circle cx="62" cy="36" r="25"/><circle cx="90" cy="40" r="22"/><circle cx="106" cy="60" r="17"/><circle cx="40" cy="74" r="19"/><circle cx="72" cy="78" r="22"/><circle cx="98" cy="76" r="17"/><ellipse cx="70" cy="62" rx="46" ry="26"/></g>
      <g fill="none" stroke="${D}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 50c6-8 14-4 18-12"/><path d="M52 22c8 4 6 12 14 14"/><path d="M80 24c8 2 8 10 16 10"/><path d="M104 48c6 2 8 8 14 8"/><path d="M96 92c6-2 10-8 14-6"/><path d="M26 74c6 4 10 0 14 6"/></g>
      <circle cx="44" cy="77" r="7.5" fill="#f9a9a4" opacity=".85"/><circle cx="96" cy="77" r="7.5" fill="#f9a9a4" opacity=".85"/>`;
    let rosto;
    if (PO) {
      rosto = PO.rosto;
    } else if (humor === 'triste') {
      rosto = `<ellipse cx="55" cy="68" rx="6.2" ry="7" fill="#2a2420"/><ellipse cx="85" cy="68" rx="6.2" ry="7" fill="#2a2420"/><circle cx="57" cy="65.5" r="2.4" fill="#fff"/><circle cx="87" cy="65.5" r="2.4" fill="#fff"/>
        <path d="M47 56l12 3M93 56l-12 3" stroke="#2a2420" stroke-width="2.6" stroke-linecap="round"/><path d="M64 82q6-6 12 0" fill="none" stroke="#2a2420" stroke-width="2.6" stroke-linecap="round"/>${lagrima}`;
    } else if (humor === 'festa') {
      rosto = `<path d="M48 68q7-9 14 0M78 68q7-9 14 0" fill="none" stroke="#2a2420" stroke-width="3" stroke-linecap="round"/><path d="M62 75q8 12 16 0z" fill="#b8453f" stroke="#2a2420" stroke-width="2" stroke-linejoin="round"/><path d="M66 79q4 3 8 0" fill="none" stroke="#ef8a85" stroke-width="2" stroke-linecap="round"/>`;
    } else {
      rosto = `<ellipse cx="55" cy="66" rx="6.4" ry="7.4" fill="#2a2420"/><ellipse cx="85" cy="66" rx="6.4" ry="7.4" fill="#2a2420"/><circle cx="57.4" cy="63" r="2.6" fill="#fff"/><circle cx="87.4" cy="63" r="2.6" fill="#fff"/><circle cx="53.2" cy="69.2" r="1.3" fill="#fff"/><circle cx="83.2" cy="69.2" r="1.3" fill="#fff"/>
        <path d="M65 76q5 6.5 10 0z" fill="#b8453f" stroke="#2a2420" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    }
    const pernas = `<path d="M56 98v9M84 98v9" fill="none" stroke="${B}" stroke-width="10" stroke-linecap="round"/><ellipse cx="55" cy="112" rx="9" ry="5" fill="${D}"/><ellipse cx="85" cy="112" rx="9" ry="5" fill="${D}"/>`;
    const br = (d) => `<path d="${d}" fill="none" stroke="${B}" stroke-width="8" stroke-linecap="round"/>`;
    const mao = (x, y) => `<circle cx="${x}" cy="${y}" r="5.6" fill="${B}"/><circle cx="${x - 1.6}" cy="${y - 1.8}" r="1.5" fill="#fff" opacity=".35"/>`;
    const bracos = PO ? PO.bracos : humor === 'festa' ? br('M18 62q-12-6-10-22') + br('M122 62q12-6 12-22') + mao(8, 39) + mao(134, 39)
      : humor === 'triste' ? br('M18 72q-8 8-4 22') + br('M122 72q8 8 4 22') + mao(14, 95) + mao(126, 95)
        : br('M18 70q-10 8-8 22') + br('M122 62q12-6 12-22') + mao(10, 93) + mao(134, 39);
    // brilho no topo, sombra sob o corpo e chão: dão volume sem pesar
    const volume = `<path d="M24 44q4-11 15-15M54 17q9-4 17-1" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" opacity=".38"/><path d="M36 90q34 13 72-4" fill="none" stroke="${D}" stroke-width="5" stroke-linecap="round" opacity=".28"/>`;
    const chao = '<ellipse cx="70" cy="119" rx="34" ry="3.6" fill="#1d2433" opacity=".1"/>';
    const festa = humor === 'festa';
    const w = px || 80;
    const vb = PO && PO.vb ? PO.vb : festa ? [-10, -27, 160, 151] : [-10, -4, 160, 128];
    return `<svg viewBox="${vb.join(' ')}" width="${w}" height="${Math.round(w * vb[3] / vb[2])}" role="img" aria-hidden="true" class="mascote-b${PO ? ' m-pose' : ''}${PO && PO.salta ? ' m-salta' : ''}${cls ? ' ' + cls : ''}">${chao}${PO && PO.tras ? PO.tras : ''}${PO && PO.salta ? '<g class="m-all">' : ''}${bracos}${PO && PO.pernas === false ? '' : pernas}${corpo}${volume}${rosto}${PO ? PO.frente : ''}${PO && PO.salta ? '</g>' : ''}${festa ? chapeu() + confetes() : ''}</svg>`;
  }

  function paginaAtual() { return (typeof document !== 'undefined' && document.documentElement.getAttribute('data-pg')) || 'inicio'; }
  function poseDaPagina() { return POSE_PAG[paginaAtual()] || 'aceno'; }

  /** Mascote da faixa do topo: muda de pose por seção e reage ao toque com uma fala. */
  function companheiro(topo) {
    if (!topo || topo.querySelector('.mascote-comp')) return;
    const pg = paginaAtual();
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'mascote-comp'; b.setAttribute('aria-label', 'Conversar com o Brain');
    b.innerHTML = svg(poseDaPagina(), 68);
    topo.appendChild(b);
    const fala = document.createElement('div'); fala.className = 'mascote-fala'; fala.setAttribute('role', 'status'); fala.setAttribute('aria-live', 'polite'); document.body.appendChild(fala); let k = Math.floor(Math.random() * 3), t;
    b.addEventListener('click', () => {
      const f = FALAS[pg] || FALAS.inicio; fala.textContent = f[k++ % f.length];
      const r = b.getBoundingClientRect(); fala.style.top = Math.round(r.bottom + 8) + 'px'; fala.style.right = Math.max(12, Math.round(innerWidth - r.right - 4)) + 'px';
      b.classList.remove('pulo'); void b.offsetWidth; b.classList.add('pulo'); fala.classList.add('on');
      clearTimeout(t); t = setTimeout(() => fala.classList.remove('on'), 2800);
      try { if (navigator.vibrate && !matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate(12); } catch (e) { /* sem vibração */ }
    });
  }

  // Põe o mascote nos estados vazios (sem mexer no texto de cada tela).
  function decorar(no) {
    (no.querySelectorAll ? no.querySelectorAll('.vazio-t:not([data-m]), .vazio-i:not([data-m]), .vazio-total:not([data-m]):not([hidden])') : []).forEach((el) => {
      el.setAttribute('data-m', '1');
      el.insertAdjacentHTML('afterbegin', `<div class="mascote-vazio">${svg(poseDaPagina(), 84)}</div>`);
    });
  }
  function iniciar() {
    decorar(document);
    companheiro(document.querySelector('.topo-config'));
    new MutationObserver((ms) => { for (const m of ms) { if (m.addedNodes.length) { decorar(document); break; } if (m.type === 'attributes') { decorar(document); break; } } })
      .observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  }
  const API = { svg, decorar, companheiro, poseDaPagina, POSES: Object.keys(POSES) };
  if (typeof module === 'object' && module.exports) module.exports = API;
  else {
    raiz.BrainMascote = API;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
  }
})(typeof window !== 'undefined' ? window : globalThis);
