/* Interface da ofensiva: chip no topo, painel (folha), cartão do Início, comemoração e aviso de ofensiva quebrada.
   Os números vêm de GET /api/jogo (jogo.js). Nada aqui guarda pontos: só lembra o que já foi mostrado. */
(function () {
  'use strict';
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const lerLS = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const gravarLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } };
  const hojeIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const reduzido = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ------------------------------------------------------------ chama (SVG original)
  const CHAMA = 'M32 3C35 18 53 27 53 49C53 65 43 77 32 77C21 77 11 65 11 49C11 39 17 33 22 27C22 35 26 39 29 39C26 27 28 14 32 3Z';
  const MIOLO = 'M32 38C34 47 43 51 43 61C43 69 38 74 32 74C26 74 21 69 21 61C21 55 25 51 28 46C29 50 31 51 32 50C31 45 31 41 32 38Z';
  let uid = 0;
  function chama(estado, px, anim) {
    const id = 'ch' + (uid++);
    px = px || 40;
    const vb = 'viewBox="0 0 64 80"';
    const tam = `width="${px}" height="${Math.round(px * 1.25)}"`;
    if (estado === 'quebrada') {
      const corte = 'M-4 -4H33L29 20L38 33L29 47L36 60L31 84H-4Z';
      return `<svg ${vb} ${tam} role="img" aria-hidden="true" class="chama q">
        <defs><clipPath id="${id}a"><path d="${corte}"/></clipPath><clipPath id="${id}b"><path d="M68 -4H33L29 20L38 33L29 47L36 60L31 84H68Z"/></clipPath></defs>
        <g transform="translate(-3 3) rotate(-5 32 70)" clip-path="url(#${id}a)"><path d="${CHAMA}" fill="#b4bcc8"/><path d="${MIOLO}" fill="#d3d9e1"/></g>
        <g transform="translate(3 -1) rotate(4 32 70)" clip-path="url(#${id}b)"><path d="${CHAMA}" fill="#a7b0bd"/><path d="${MIOLO}" fill="#cbd2db"/></g>
        <path d="M33 3L29 20L38 33L29 47L36 60L31 78" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round" opacity=".9"/>
        <circle cx="52" cy="70" r="1.8" fill="#b4bcc8"/><circle cx="10" cy="63" r="1.4" fill="#b4bcc8"/></svg>`;
    }
    if (estado === 'inicio' || estado === 'nova') {
      return `<svg ${vb} ${tam} role="img" aria-hidden="true" class="chama v"><path d="${CHAMA}" fill="#eef1f5" stroke="#c9d1dc" stroke-width="3" stroke-linejoin="round"/><path d="${MIOLO}" fill="#e2e7ee"/></svg>`;
    }
    const risco = estado === 'em_risco';
    return `<svg ${vb} ${tam} role="img" aria-hidden="true" class="chama ${risco ? 'r' : 'a'}${anim ? ' anim' : ''}">
      <defs><linearGradient id="${id}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${risco ? '#f59e3a' : '#ff6a00'}"/><stop offset=".6" stop-color="${risco ? '#f8b04a' : '#ff9a1a'}"/><stop offset="1" stop-color="${risco ? '#fbc56a' : '#ffc12e'}"/></linearGradient></defs>
      <path d="${CHAMA}" fill="url(#${id})"/><path d="${MIOLO}" fill="${risco ? '#ffe2a6' : '#fff0a8'}"/></svg>`;
  }
  const ESCUDO = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 2l8 3v6c0 5-3.4 9.2-8 11-4.6-1.8-8-6-8-11V5z" fill="currentColor"/></svg>';
  const CHECK = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const XIS = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const VOLTA = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 3-6.2M4 4v5h5"/></svg>';
  const LUA = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg>';

  function bolinha(d) {
    const ic = { feito: CHECK, escudo: ESCUDO, resgatado: VOLTA, perdido: XIS, folga: LUA, parcial: CHECK }[d.estado] || '';
    return `<div class="sm-dia s-${d.estado}${d.hoje ? ' hoje' : ''}" role="img" aria-label="${esc(rotuloDia(d))}"><span class="sm-l">${d.letra}</span><span class="sm-b">${ic}</span></div>`;
  }
  const rotuloDia = (d) => `${d.letra}${d.hoje ? ' (hoje)' : ''}: ${({ feito: 'feito', escudo: 'coberto pelo escudo', resgatado: 'resgatado', perdido: 'perdido', folga: 'folga', pendente: 'ainda sem ação', parcial: 'em andamento', futuro: 'ainda não chegou', vazio: 'sem registro' })[d.estado] || ''}`;
  const faixa = (r) => `<div class="sm" role="group" aria-label="Semana">${r.semana.map(bolinha).join('')}</div>`;

  // ------------------------------------------------------------ textos
  const horasRestantes = () => { const a = new Date(); const f = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 1); return Math.max(1, Math.round((f - a) / 3600000)); };
  const plural = (n, s, p) => (n === 1 ? s : p);
  function mensagem(r) {
    const seq = r.sequencia;
    switch (r.estado) {
      case 'nova': return { t: 'Comece sua ofensiva', s: 'Faça qualquer coisa no Brain hoje: concluir uma tarefa, estudar 25 minutos, marcar a rotina ou anotar um gasto.' };
      case 'inicio': return { t: 'Comece uma nova ofensiva', s: `Uma ação hoje já vale o dia.${r.melhor ? ` Seu recorde é ${r.melhor} ${plural(r.melhor, 'dia', 'dias')}.` : ''}` };
      case 'em_risco': return { t: `Salve sua ofensiva de ${seq} ${plural(seq, 'dia', 'dias')}!`, s: `Falta uma ação hoje. Restam cerca de ${horasRestantes()} h.` };
      case 'quebrada':
        if (r.resgatavel) return { t: `Sua ofensiva de ${r.resgate.valor} ${plural(r.resgate.valor, 'dia', 'dias')} quebrou`, s: `Dá tempo de salvar: ganhe ${r.resgate.falta} XP hoje e ela volta.` };
        return { t: `Sua ofensiva de ${r.perdida.valor} ${plural(r.perdida.valor, 'dia', 'dias')} acabou`, s: 'Acontece com todo mundo. Recomece hoje, uma ação já vale o dia.' };
      default: {
        if (r.salvou_hoje) return { t: 'Ofensiva salva!', s: 'Você recuperou o dia que faltava. Bom trabalho.' };
        if (seq === 1) return { t: 'A ofensiva começou!', s: 'Volte amanhã para ela crescer.' };
        const prox = r.proximo_marco;
        return { t: 'Mais um dia firme!', s: prox ? `Faltam ${prox - seq} ${plural(prox - seq, 'dia', 'dias')} para a marca de ${prox}.` : 'Você passou de todas as marcas. Lenda.' };
      }
    }
  }

  // ------------------------------------------------------------ estilo
  function estilo() {
    if (document.getElementById('jogo-css')) return;
    const s = document.createElement('style'); s.id = 'jogo-css';
    s.textContent = `
      .chama { display: block; overflow: visible; }
      @media (prefers-reduced-motion: no-preference) {
        .chama.a.anim, .jg-chip[data-e="ativa"] .chama { animation: jg-tremer 2.2s ease-in-out infinite; transform-origin: 50% 90%; }
        .chama.r { animation: jg-pulsa 1.6s ease-in-out infinite; transform-origin: 50% 90%; }
        @keyframes jg-tremer { 0%,100% { transform: scale(1) rotate(0); } 30% { transform: scale(1.05,1.08) rotate(-2deg); } 60% { transform: scale(.98,1.03) rotate(2deg); } }
        @keyframes jg-pulsa { 50% { transform: scale(1.07); opacity: .85; } }
      }
      .topo-config { align-items: center; justify-content: space-between; }
      .jg-chip { display: inline-flex; align-items: center; gap: .3rem; min-height: 2.75rem; padding: 0 .85rem 0 .65rem; border-radius: 1rem; border: 2px solid var(--line); background: #fff; box-shadow: 0 3px 0 var(--line); font-weight: 800; font-size: 1.05rem; color: var(--muted); cursor: pointer; }
      .jg-chip:active { box-shadow: none; transform: translateY(3px) !important; }
      .jg-chip[data-e="ativa"] { color: #b94a00; border-color: #ffd7a8; box-shadow: 0 3px 0 #ffd7a8; background: #fff9f1; }
      .jg-chip[data-e="em_risco"] { color: #b94a00; border-color: #ffd7a8; box-shadow: 0 3px 0 #ffd7a8; background: #fff9f1; }
      .jg-chip[data-e="quebrada"] { color: #667085; }
      .jg-chip b { font-variant-numeric: tabular-nums; min-width: .7rem; }

      /* semana */
      .sm { display: grid; grid-template-columns: repeat(7, 1fr); gap: .25rem; }
      .sm-dia { display: grid; justify-items: center; gap: .3rem; }
      .sm-l { font-size: .72rem; font-weight: 700; color: var(--muted); }
      .sm-dia.hoje .sm-l { color: var(--accent); }
      .sm-b { width: 2.1rem; height: 2.1rem; border-radius: 50%; display: grid; place-items: center; background: #f1f3f7; color: #fff; border: 2px solid #f1f3f7; }
      .sm-dia.s-feito .sm-b, .sm-dia.s-parcial .sm-b { background: linear-gradient(#ff9a1a, #ff7a00); border-color: #ff7a00; }
      .sm-dia.s-escudo .sm-b { background: #3b9bff; border-color: #3b9bff; }
      .sm-dia.s-resgatado .sm-b { background: #2fbf6a; border-color: #2fbf6a; }
      .sm-dia.s-perdido .sm-b { background: #fff; border-color: #ffc9c4; color: #e5483b; }
      .sm-dia.s-folga .sm-b { background: #eef0f4; color: #8a94a3; border-color: #eef0f4; }
      .sm-dia.s-pendente .sm-b, .sm-dia.hoje.s-vazio .sm-b { background: #fff; border: 2px dashed var(--accent); }
      .sm-dia.s-futuro .sm-b { background: #fff; border: 2px solid #eef0f4; }
      .sm-dia.s-parcial .sm-b { opacity: .55; }

      /* cartão do Início */
      .jg-cartao { display: block; width: 100%; text-align: left; background: #fff; border: 2px solid #ffd7a8; border-radius: 1.25rem; box-shadow: 0 4px 0 #ffd7a8; padding: 1rem 1rem .9rem; margin: 0 0 1.1rem; color: var(--ink); cursor: pointer; }
      .jg-cartao:active { box-shadow: none; transform: translateY(4px) !important; }
      .jg-cartao[data-e="quebrada"], .jg-cartao[data-e="inicio"], .jg-cartao[data-e="nova"] { border-color: var(--line); box-shadow: 0 4px 0 var(--line); }
      .jg-topo { display: flex; align-items: center; gap: .9rem; margin-bottom: .8rem; }
      .jg-num { font-size: 2.3rem; line-height: 1; font-weight: 850; letter-spacing: -.02em; color: #d65500; }
      .jg-cartao[data-e="quebrada"] .jg-num, .jg-cartao[data-e="inicio"] .jg-num, .jg-cartao[data-e="nova"] .jg-num { color: #667085; }
      .jg-un { display: block; font-size: .85rem; font-weight: 700; color: var(--muted); }
      .jg-msg { font-size: .95rem; font-weight: 700; margin: 0 0 .1rem; }
      .jg-sub { font-size: .82rem; color: var(--muted); margin: 0; }
      .jg-mini { display: flex; gap: .5rem; flex-wrap: wrap; margin-top: .8rem; }
      .jg-pill { display: inline-flex; align-items: center; gap: .35rem; border-radius: 2rem; padding: .25rem .7rem; background: #f1f6ff; color: #1457b8; font-weight: 700; font-size: .8rem; }
      .jg-pill.o { background: #fff3e0; color: #b45309; }

      /* folha (painel) */
      dialog.jg-dlg { padding: 0; width: min(100vw, 28rem); max-width: 28rem; max-height: 92dvh; margin: auto auto 0; border-radius: 1.5rem 1.5rem 0 0; border: 0; background: #fff; overflow: auto; }
      dialog.jg-dlg::backdrop { background: rgba(15, 23, 42, .45); }
      .jg-in { padding: 1.1rem 1.2rem calc(1.4rem + env(safe-area-inset-bottom)); }
      .jg-fecha { position: sticky; top: 0; float: right; width: 2.75rem; height: 2.75rem; border-radius: 50%; border: 0; background: #f1f3f7; font-size: 1.3rem; line-height: 1; z-index: 2; }
      .jg-heroi:focus { outline: none; }
      .jg-heroi { display: grid; justify-items: center; text-align: center; padding: .4rem 0 1rem; }
      .jg-heroi .chama { margin-bottom: .2rem; }
      .jg-big { font-size: 3.4rem; line-height: 1; font-weight: 900; letter-spacing: -.03em; color: #d65500; }
      .jg-big.q { color: #667085; }
      .jg-heroi h3 { margin: .35rem 0 .2rem; font-size: 1.15rem; }
      .jg-heroi p { margin: 0; color: var(--muted); font-size: .92rem; max-width: 20rem; }
      .jg-bloco { border: 2px solid var(--line); border-radius: 1.1rem; padding: .9rem 1rem; margin-top: .9rem; }
      .jg-bloco h4 { margin: 0 0 .7rem; font-size: .8rem; letter-spacing: .04em; text-transform: uppercase; color: var(--muted); }
      .jg-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: .6rem; margin-top: .9rem; }
      .jg-stat { border: 2px solid var(--line); border-radius: 1rem; padding: .7rem .5rem; text-align: center; }
      .jg-stat b { display: block; font-size: 1.35rem; font-weight: 850; }
      .jg-stat span { font-size: .72rem; color: var(--muted); font-weight: 650; }
      .jg-escudos { display: inline-flex; gap: .2rem; color: #3b9bff; }
      .jg-escudos .v { color: #cfd6e0; }
      .jg-barra { height: .85rem; border-radius: 1rem; background: #eef0f4; overflow: hidden; }
      .jg-barra i { display: block; height: 100%; border-radius: 1rem; background: linear-gradient(90deg, #ffb020, #ff7a00); }
      .jg-barra.az i { background: linear-gradient(90deg, #4aa3ff, #1a73e8); }
      .jg-nivel { display: flex; justify-content: space-between; align-items: baseline; font-weight: 750; margin-bottom: .5rem; }
      .jg-nivel small { color: var(--muted); font-weight: 600; }
      .jg-resg { border-radius: 1.1rem; padding: .9rem 1rem; margin-top: .9rem; background: #fff4e5; border: 2px solid #ffd7a8; }
      .jg-resg b { display: block; margin-bottom: .5rem; }
      .jg-marcos { display: grid; grid-template-columns: repeat(4, 1fr); gap: .5rem; }
      .jg-marco { text-align: center; display: grid; justify-items: center; gap: .15rem; font-size: .75rem; font-weight: 700; color: var(--muted); }
      .jg-marco .m { width: 3rem; height: 3rem; border-radius: 50%; display: grid; place-items: center; background: #f1f3f7; font-weight: 850; font-size: .95rem; color: #5b6575; }
      .jg-marco.ok .m { background: linear-gradient(#ffc12e, #ff7a00); color: #3a1c00; box-shadow: 0 3px 0 #d96300; }
      .jg-marco.ok { color: var(--ink); }
      .jg-como { margin: 0; padding-left: 1.1rem; font-size: .88rem; color: var(--ink); }
      .jg-como li { display: list-item; padding: .15rem 0; border: 0; }
      .jg-como-xp { display: grid; grid-template-columns: 1fr auto; gap: .2rem .8rem; font-size: .88rem; margin-top: .7rem; }
      .jg-como-xp b { text-align: right; color: #1457b8; }
      .jg-btn { display: block; width: 100%; margin-top: 1rem; min-height: 3rem; border: 0; border-radius: 1rem; background: var(--accent); color: #fff; font-weight: 800; box-shadow: 0 4px 0 var(--chunk, #0f4fb5); }
      .jg-btn:active { box-shadow: 0 1px 0 var(--chunk, #0f4fb5); transform: translateY(3px) !important; }

      /* comemoração */
      .jg-fest { position: fixed; inset: 0; z-index: 90; display: grid; place-items: center; background: rgba(255, 255, 255, .97); padding: 1.5rem; text-align: center; overflow: hidden; }
      .jg-fest .corpo { display: grid; justify-items: center; gap: .3rem; max-width: 22rem; position: relative; z-index: 1; }
      .jg-fest .jg-big { font-size: 5rem; }
      .jg-fest h2 { margin: .2rem 0 0; font-size: 1.4rem; color: var(--ink); font-weight: 850; }
      .jg-fest p { margin: .2rem 0 1rem; color: var(--muted); }
      .jg-fest .jg-btn { max-width: 18rem; }
      .jg-conf { position: absolute; top: -5%; width: .55rem; height: 1rem; border-radius: .15rem; opacity: 0; }
      @media (prefers-reduced-motion: no-preference) {
        .jg-fest .corpo { animation: jg-entra .5s cubic-bezier(.23,1,.32,1) both; }
        .jg-fest .chama { animation: jg-pula .9s cubic-bezier(.23,1,.32,1) both, jg-tremer 2.2s ease-in-out .9s infinite; transform-origin: 50% 90%; }
        .jg-conf { animation: jg-cai var(--d, 2.4s) cubic-bezier(.3,.6,.4,1) var(--a, 0s) forwards; }
        @keyframes jg-entra { from { opacity: 0; transform: translateY(18px) scale(.96); } }
        @keyframes jg-pula { 0% { transform: scale(.3); } 60% { transform: scale(1.18); } 100% { transform: scale(1); } }
        @keyframes jg-cai { 0% { opacity: 1; transform: translateY(0) rotate(0); } 100% { opacity: 1; transform: translateY(105vh) rotate(var(--r, 540deg)); } }
      }
    `;
    document.head.appendChild(s);
  }

  // ------------------------------------------------------------ dados
  let R = null;
  let ocupado = false;
  async function buscar() {
    try {
      const r = await fetch('/api/jogo');
      if (!r.ok) return null;
      return await r.json();
    } catch (e) { return null; }
  }

  // ------------------------------------------------------------ chip e cartão
  function chip() {
    let b = document.getElementById('jg-chip');
    if (!b) {
      const alvo = document.querySelector('.topo-config');
      if (!alvo) return null;
      b = document.createElement('button');
      b.type = 'button'; b.id = 'jg-chip'; b.className = 'jg-chip';
      b.addEventListener('click', abrir);
      alvo.appendChild(b);
    }
    return b;
  }
  function pintarChip() {
    const b = chip(); if (!b || !R) return;
    b.dataset.e = R.estado;
    const n = R.estado === 'quebrada' ? 0 : R.sequencia;
    b.innerHTML = `${chama(R.estado, 22)}<b>${n}</b>`;
    b.setAttribute('aria-label', `Ofensiva: ${n} ${plural(n, 'dia', 'dias')}. ${mensagem(R).t}. Abrir detalhes.`);
  }
  function pintarCartoes() {
    document.querySelectorAll('[data-jogo-cartao]').forEach((el) => {
      if (!R) return;
      const m = mensagem(R);
      const n = R.estado === 'quebrada' ? 0 : R.sequencia;
      el.innerHTML = `<button type="button" class="jg-cartao" data-e="${R.estado}" aria-label="Abrir a ofensiva">
        <div class="jg-topo">${chama(R.estado, 46, true)}<div><span class="jg-num">${n}</span><span class="jg-un">${plural(n, 'dia', 'dias')} de ofensiva</span></div></div>
        <p class="jg-msg">${esc(m.t)}</p><p class="jg-sub">${esc(m.s)}</p>
        <div style="margin-top:.9rem">${faixa(R)}</div>
        <div class="jg-mini"><span class="jg-pill">Nível ${R.nivel.n} · ${esc(R.nivel.titulo)}</span><span class="jg-pill o">${R.xp_hoje} XP hoje</span></div></button>`;
      el.querySelector('button').addEventListener('click', abrir);
    });
  }

  // ------------------------------------------------------------ painel
  function corpoPainel(r) {
    const m = mensagem(r);
    const n = r.estado === 'quebrada' ? 0 : r.sequencia;
    const esc2 = Array.from({ length: r.escudos_max }, (_, i) => `<span class="${i < r.escudos ? '' : 'v'}">${ESCUDO}</span>`).join('');
    const marcos = r.marcos.map((x) => `<div class="jg-marco ${r.marcos_ok.includes(x) ? 'ok' : ''}"><span class="m">${x}</span>${r.marcos_ok.includes(x) ? 'feita' : 'dias'}</div>`).join('');
    const resg = r.resgatavel ? `<div class="jg-resg"><b>Salve sua ofensiva: ${Math.min(r.xp_hoje, r.meta_resgate)}/${r.meta_resgate} XP hoje</b><div class="jg-barra"><i style="width:${Math.min(100, Math.round((r.xp_hoje / r.meta_resgate) * 100))}%"></i></div></div>` : '';
    const metaDia = Math.min(100, Math.round((r.xp_hoje / r.meta_xp_dia) * 100));
    return `<button type="button" class="jg-fecha" aria-label="Fechar">×</button>
      <div class="jg-heroi" tabindex="-1" autofocus>${chama(r.estado, 92, true)}<div class="jg-big ${r.estado === 'quebrada' ? 'q' : ''}">${n}</div><h3>${esc(m.t)}</h3><p>${esc(m.s)}</p></div>
      ${resg}
      <div class="jg-bloco"><h4>Esta semana</h4>${faixa(r)}</div>
      <div class="jg-stats">
        <div class="jg-stat"><b class="jg-escudos" role="img" aria-label="${r.escudos} de ${r.escudos_max} escudos">${esc2}</b><span>Escudos</span></div>
        <div class="jg-stat"><b>${r.melhor}</b><span>Recorde (dias)</span></div>
        <div class="jg-stat"><b>${r.dias_ativos}</b><span>Dias ativos</span></div>
      </div>
      <div class="jg-bloco"><div class="jg-nivel"><span>Nível ${r.nivel.n} · ${esc(r.nivel.titulo)}</span><small>${r.xp_total} XP</small></div>
        <div class="jg-barra az" role="progressbar" aria-valuenow="${r.nivel.pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Progresso do nível"><i style="width:${r.nivel.pct}%"></i></div>
        <p class="jg-sub" style="margin-top:.5rem">Faltam ${r.nivel.xp_prox - r.nivel.xp_nivel} XP para o próximo nível.</p></div>
      <div class="jg-bloco"><div class="jg-nivel"><span>Meta do dia</span><small>${Math.min(r.xp_hoje, r.meta_xp_dia)}/${r.meta_xp_dia} XP</small></div>
        <div class="jg-barra" role="progressbar" aria-valuenow="${metaDia}" aria-valuemin="0" aria-valuemax="100" aria-label="Meta de XP do dia"><i style="width:${metaDia}%"></i></div></div>
      <div class="jg-bloco"><h4>Marcas de ofensiva</h4><div class="jg-marcos">${marcos}</div></div>
      <div class="jg-bloco"><h4>Como funciona</h4>
        <ul class="jg-como" style="list-style:disc;background:none;border:0;border-radius:0;overflow:visible">
          <li>Um dia vale com <b>uma ação</b> em qualquer parte do app.</li>
          <li>O <b>escudo</b> cobre um dia perdido sozinho. Você ganha um a cada 7 dias seguidos (máximo ${r.escudos_max}).</li>
          <li>Perdeu um dia sem escudo? Faça <b>${r.meta_resgate} XP</b> no dia seguinte e a ofensiva é salva.</li>
          <li>Dias de folga e o modo férias (⚙) não quebram a ofensiva.</li>
        </ul>
        <div class="jg-como-xp"><span>Concluir tarefa</span><b>+10</b><span>Sessão de foco (25 min)</span><b>+15</b><span>Revisão de estudo</span><b>+8</b><span>Item da rotina</span><b>+5</b><span>Avaliar o dia (Jornada)</span><b>+10</b><span>Anotar gasto (até 3/dia)</span><b>+4</b></div></div>
      <button type="button" class="jg-btn" id="jg-ok">${r.ativo_hoje ? 'Continuar' : 'Vamos lá'}</button>`;
  }
  function abrir() {
    if (!R) return;
    estilo();
    let d = document.getElementById('jg-dlg');
    if (!d) { d = document.createElement('dialog'); d.id = 'jg-dlg'; d.className = 'jg-dlg'; d.setAttribute('aria-label', 'Ofensiva'); document.body.appendChild(d); d.addEventListener('click', (e) => { if (e.target === d) d.close(); }); }
    d.innerHTML = `<div class="jg-in">${corpoPainel(R)}</div>`;
    d.querySelector('.jg-fecha').onclick = () => d.close();
    d.querySelector('#jg-ok').onclick = () => d.close();
    if (!d.open) d.showModal();
    d.scrollTop = 0;
    const h = d.querySelector('.jg-heroi'); if (h) h.focus({ preventScroll: true });
  }

  // ------------------------------------------------------------ comemoração
  function festa(r, titulo, sub) {
    if (document.querySelector('.jg-fest')) return;
    const f = document.createElement('div'); f.className = 'jg-fest'; f.setAttribute('role', 'dialog'); f.setAttribute('aria-modal', 'true'); f.setAttribute('aria-label', titulo);
    const cores = ['#ff7a00', '#ffc12e', '#3b9bff', '#2fbf6a', '#ff6b8b', '#7c4dff'];
    const conf = reduzido() ? '' : Array.from({ length: 36 }, (_, i) => `<i class="jg-conf" style="left:${Math.round(Math.random() * 100)}%;background:${cores[i % cores.length]};--a:${(Math.random() * .8).toFixed(2)}s;--d:${(1.8 + Math.random() * 1.4).toFixed(2)}s;--r:${Math.round(360 + Math.random() * 720)}deg"></i>`).join('');
    f.innerHTML = `${conf}<div class="corpo">${chama('ativa', 120)}<div class="jg-big">${r.sequencia}</div><h2>${esc(titulo)}</h2><p>${esc(sub)}</p>${faixa(r)}<button type="button" class="jg-btn" id="jg-f-ok">Continuar</button></div>`;
    document.body.appendChild(f);
    const btn = f.querySelector('#jg-f-ok'); btn.focus();
    const fechar = () => { f.remove(); document.removeEventListener('keydown', esq); };
    const esq = (e) => { if (e.key === 'Escape') fechar(); };
    document.addEventListener('keydown', esq);
    btn.onclick = fechar;
    try { if (navigator.vibrate) navigator.vibrate(30); } catch (e) { /* sem vibração */ }
  }

  function aposAtualizar(veioDeAcao) {
    const hoje = hojeIso();
    const visto = lerLS('brain-jogo-visto') || {};
    if (R.ativo_hoje && visto.data !== hoje) {
      if (veioDeAcao) {
        const marco = R.marcos.includes(R.sequencia);
        const t = R.salvou_hoje ? 'Ofensiva salva!' : marco ? `Marca de ${R.sequencia} dias!` : R.sequencia === 1 ? 'Ofensiva começou!' : `${R.sequencia} dias de ofensiva!`;
        const s = R.salvou_hoje ? 'Você recuperou o dia que faltava.' : marco ? 'Que constância. Você conquistou uma nova marca.' : R.sequencia === 1 ? 'Volte amanhã para ela crescer.' : 'Mais um dia firme. Continue assim.';
        festa(R, t, s);
      }
      gravarLS('brain-jogo-visto', { data: hoje, seq: R.sequencia });
    } else if (!veioDeAcao && R.estado === 'quebrada') {
      const av = lerLS('brain-jogo-quebra');
      if (av !== hoje) { gravarLS('brain-jogo-quebra', hoje); setTimeout(abrir, 600); }
    }
  }

  async function atualizar(veioDeAcao) {
    if (ocupado) return; ocupado = true;
    try {
      const r = await buscar();
      if (!r) return;
      R = r; estilo(); pintarChip(); pintarCartoes();
      const d = document.getElementById('jg-dlg'); if (d && d.open) { d.querySelector('.jg-in').innerHTML = corpoPainel(R); d.querySelector('.jg-fecha').onclick = () => d.close(); d.querySelector('#jg-ok').onclick = () => d.close(); }
      aposAtualizar(veioDeAcao);
    } finally { ocupado = false; }
  }

  let t = null;
  window.addEventListener('brain-mudou', () => { clearTimeout(t); t = setTimeout(() => atualizar(true), 350); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) atualizar(false); });
  window.addEventListener('brain-desbloqueado', () => atualizar(false));
  window.BrainJogoUI = { atualizar, abrir, chama, faixa, mensagem };

  function iniciar() {
    estilo();
    let tent = 0;
    const tenta = () => { if (chip() || ++tent > 20) atualizar(false); else setTimeout(tenta, 100); };
    tenta();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
