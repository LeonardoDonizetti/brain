/* Tutorial guiado: escurece a tela, destaca um elemento por vez, explica e rola a página sozinho.
   Abre sozinho na primeira visita de cada página; o botão "?" no topo repete. Tudo local (localStorage). */
(function (raiz) {
  'use strict';
  const CHAVE = (pg) => 'brain-tour-v1-' + pg;

  // alvo: lista de seletores (usa o primeiro visível) ou função. antes: ação para preparar a tela (ex.: abrir uma aba).
  const clicar = (sel) => () => { const b = document.querySelector(sel); if (b) b.click(); };
  const dentroDe = (sel, pai) => () => { const e = document.querySelector(sel); return e ? (e.closest(pai) || e) : null; };
  const AJUDA = { alvo: ['.tr-ajuda'], t: 'Rever este tutorial', x: 'Quando quiser ver tudo de novo, toque no ? aqui no topo. Cada página tem o seu tutorial.' };

  const PASSOS = {
    inicio: [
      { alvo: ['.topo-config .eng'], t: 'Configurações', x: 'Aqui ficam a cor do app, metas, coach, senha, backup e a opção de rever a introdução.' },
      { alvo: ['#jg-chip'], t: 'Sua ofensiva', x: 'Conta quantos dias seguidos você fez pelo menos uma coisa no app. Toque para ver nível, XP e escudos.' },
      { alvo: ['.jg-cartao'], t: 'Cartão da ofensiva', x: 'Mostra a semana, o seu nível e o XP de hoje. Tarefa, hábito, revisão e sessão de foco rendem pontos.' },
      { alvo: ['#coach:not([hidden])'], t: 'Coach', x: 'Dicas com base nas suas tarefas e rotina. Tudo é calculado no seu aparelho, nada vai para a internet.' },
      { alvo: ['#rapido'], t: 'Tarefa rápida', x: 'Escreva e toque em Adicionar. Dá para usar data e hora na frase, como "prova sexta 14h".' },
      { alvo: ['.aneis'], t: 'Seu dia em três anéis', x: 'Rotina, tarefas e jornada. Toque em um deles para abrir a página.' },
      { alvo: ['#semana'], t: 'Sua semana', x: 'Resumo dos últimos 7 dias comparado com a semana anterior.' },
      { alvo: dentroDe('#mapa', '.cartao'), t: 'Constância', x: 'Cada quadradinho é um dia. Quanto mais escuro, mais da sua rotina você cumpriu.' },
      { alvo: ['.tabbar'], t: 'Navegação', x: 'Troque entre Rotina, Estudos, Jornada, Tarefas e Finanças. Cada seção tem a sua cor.' },
      AJUDA,
    ],
    rotina: [
      { alvo: ['.dias-nav', '#data-topo'], t: 'Escolha o dia', x: 'Use as setas para ver o dia anterior ou o próximo. A rotina é marcada dia a dia.' },
      { alvo: ['#resumo:not([hidden])', '#vazio-total:not([hidden])'], t: 'Resumo do dia', x: 'O anel mostra quanto da rotina você cumpriu hoje e as barras mostram os últimos 7 dias. Se estiver vazio, comece pelo modelo sugerido.' },
      { alvo: ['#blocos .bloco-topo'], t: 'Períodos do dia', x: 'Ritual da manhã, hábitos, ritual da noite e renúncias (o que você decidiu deixar de fazer).' },
      { alvo: ['#blocos ul li'], t: 'Marcar como feito', x: 'Toque no círculo para concluir o item. O lápis edita ou apaga. Os dias seguidos aparecem ao lado.' },
      { alvo: ['#novo'], t: 'Novo item', x: 'Toque no + para criar um ritual, hábito ou renúncia, com horário e duração se quiser.' },
      AJUDA,
    ],
    estudos: [
      { alvo: ['#coach:not([hidden])'], t: 'Coach de estudos', x: 'Sugere o que fazer agora com base no seu plano e na data da prova.' },
      { alvo: ['#abas'], t: 'Cinco áreas', x: 'Hoje, Semana, Foco, Revisões e Plano. Vamos passar por cada uma.' },
      { antes: clicar('[data-aba=hoje]'), alvo: ['.hero-es', '.vazio-i'], t: 'Agora e próximo', x: 'Mostra o bloco de estudo do momento, quanto falta e o próximo. Se ainda não há plano, comece por aqui.' },
      { antes: clicar('[data-aba=hoje]'), alvo: ['.nums'], t: 'Seus números', x: 'Minutos estudados hoje e na semana, dias seguidos e revisões pendentes.' },
      { antes: clicar('[data-aba=hoje]'), alvo: dentroDe('.tl-i', '.es'), t: 'Agenda de hoje', x: 'Os blocos do dia em ordem. O botão Foco já começa o cronômetro naquela matéria.' },
      { antes: clicar('[data-aba=semana]'), alvo: dentroDe('.grade-sem', '.es'), t: 'Minha semana', x: 'Grade com todos os blocos. Toque num dia para ver a lista e criar ou editar blocos.' },
      { antes: clicar('[data-aba=foco]'), alvo: ['.chips-m'], t: 'Escolha a matéria', x: 'Selecione o que vai estudar. O tempo fica registrado nessa matéria.' },
      { antes: clicar('[data-aba=foco]'), alvo: ['.anel-f'], t: 'Cronômetro de foco', x: 'Escolha 25, 50 ou 90 minutos e toque em Iniciar. Blocos curtos com pausa ajudam a manter a atenção.' },
      { antes: clicar('[data-aba=rev]'), alvo: ['#painel .es'], t: 'Revisão espaçada', x: 'Anote o que estudou e o app agenda revisões em 1 dia, 1 semana, 1 mês e 3 meses. Revisar assim fixa muito mais.' },
      { antes: clicar('[data-aba=plano]'), alvo: ['#painel textarea'], t: 'Seu plano', x: 'Escreva como estuda em linguagem normal (por exemplo "seg a sex 05:00-06:00 física") e eu monto os blocos.' },
      AJUDA,
    ],
    jornada: [
      { alvo: ['#hero'], t: 'Sua jornada', x: 'Um desafio de disciplina com nome e número de dias. Cada dia avaliado e cada item da rotina cumprido aparecem aqui.' },
      { alvo: ['#cfg'], t: 'Configurar', x: 'Mude nome, duração e data de início. É aqui também que você pode abandonar a jornada.' },
      { alvo: ['#stats'], t: 'Números', x: 'Sequência positiva, melhor sequência, dias positivos e negativos e o cumprimento médio.' },
      { alvo: dentroDe('#grafico', '.painel'), t: 'Gráfico', x: 'Cumprimento da rotina e da avaliação ao longo do tempo. Troque o período nos botões.' },
      { alvo: dentroDe('#trilha', '.painel'), t: 'Trilha', x: 'Um ponto por dia: verde para dia positivo, vermelho para negativo e cinza para sem avaliação.' },
      AJUDA,
    ],
    tarefas: [
      { alvo: ['#res'], t: 'Resumo do dia', x: 'O anel mostra quantas tarefas de hoje você já concluiu e qual vale começar primeiro.' },
      { alvo: ['#stats'], t: 'Três números', x: 'Atrasadas, concluídas nos últimos 7 dias e dias seguidos cumprindo a meta.' },
      { alvo: ['#abas'], t: 'Visões', x: 'Hoje, Próximas, Calendário e Matriz (urgente x importante). Deslize para o lado para ver todas.' },
      { alvo: ['#vista'], t: 'Sua lista', x: 'Toque no círculo para concluir. Toque no texto para abrir os detalhes: data, prioridade, lista, repetição e subtarefas.' },
      { alvo: ['.composer'], t: 'Adicionar rápido', x: 'Escreva "Prova sexta 14h !alta #escola": o app entende a data, a hora, a prioridade (!) e a lista (#).' },
      AJUDA,
    ],
    financas: [
      { alvo: ['.mes'], t: 'Escolha o mês', x: 'Use as setas para navegar pelos meses e comparar.' },
      { alvo: ['#hero'], t: 'Panorama do mês', x: 'Quanto você gastou, quanto resta do limite, entradas, saldo e quanto pode gastar por dia.' },
      { alvo: ['#abas-f'], t: 'Três visões', x: 'Resumo (análises), Lançamentos (lista, busca e edição) e Planejar (limites, metas e contas fixas).' },
      { alvo: ['#cats'], t: 'Gastos por categoria', x: 'Veja para onde o dinheiro vai. Defina limites por categoria para receber avisos.' },
      { alvo: ['#grafico-sec:not([hidden])', '#an'], t: 'Análises', x: 'Gráficos por categoria e ao longo dos meses. Alterne entre valor e quantidade.' },
      { alvo: ['.composer'], t: 'Registrar rápido', x: 'Escreva "32 no iFood ontem" ou use o microfone. Escolha Gasto ou Entrada e toque na seta.' },
      AJUDA,
    ],
  };

  let est = null; // estado do tour em andamento

  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduz = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  function visivel(el) {
    if (!el || !el.getBoundingClientRect) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    if (el.closest('[hidden]')) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none';
  }
  function achar(alvo) {
    if (typeof alvo === 'function') { const e = alvo(); return visivel(e) ? e : null; }
    for (const s of alvo) { const e = document.querySelector(s); if (visivel(e)) return e; }
    return null;
  }
  async function esperarAlvo(passo, ms) {
    const fim = Date.now() + ms;
    for (;;) { const e = achar(passo.alvo); if (e || Date.now() > fim) return e; await espera(120); }
  }
  function fixo(el) {
    for (let n = el; n && n !== document.body; n = n.parentElement) { const p = getComputedStyle(n).position; if (p === 'fixed' || p === 'sticky') return true; }
    return false;
  }

  function css() {
    if (document.getElementById('tr-css')) return;
    const s = document.createElement('style'); s.id = 'tr-css';
    s.textContent = `
      .tr-veil { position: fixed; inset: 0; z-index: 10000; background: transparent; touch-action: none; }
      /* o destaque é movido por transform (GPU) e a sombra gigante escurece o resto da tela */
      .tr-hole { position: fixed; z-index: 10001; left: 0; top: 0; pointer-events: none; border-radius: 1rem; will-change: transform, width, height;
        box-shadow: 0 0 0 3px rgba(255,255,255,0), 0 0 0 9999px rgba(8,12,28,0); transition: box-shadow .32s ease; }
      .tr-hole.on { box-shadow: 0 0 0 3px #fff, 0 0 0 9999px rgba(8,12,28,.78); }
      .tr-card { position: fixed; z-index: 10002; left: 50%; width: min(calc(100vw - 1.5rem), 25rem); box-sizing: border-box; background: #fff; color: #1c2330; border: 2px solid var(--accent, #1565d8); border-radius: 1.25rem; box-shadow: 0 6px 0 var(--chunk, #0d4aa8), 0 18px 40px rgba(0,0,0,.35); padding: 1rem 1.1rem 1rem; font-family: inherit;
        opacity: 0; transform: translate(-50%, 14px); transition: opacity .22s ease, transform .26s cubic-bezier(.2,.8,.2,1); will-change: opacity, transform; }
      .tr-card.vis { opacity: 1; transform: translate(-50%, 0); }
      .tr-card.topo { top: max(.75rem, env(safe-area-inset-top)); transform: translate(-50%, -14px); }
      .tr-card.topo.vis { transform: translate(-50%, 0); }
      .tr-card.base { bottom: max(.75rem, env(safe-area-inset-bottom)); }
      .tr-topo { display: flex; align-items: center; gap: .6rem; margin-bottom: .45rem; }
      .tr-topo svg { flex: none; }
      .tr-pas { font-size: .8rem; font-weight: 700; color: #4b5565; letter-spacing: .02em; }
      .tr-pontos { display: flex; gap: .25rem; margin-top: .3rem; }
      .tr-pontos i { width: .5rem; height: .5rem; border-radius: 50%; background: #d5dbe6; transition: background .3s; }
      .tr-pontos i.f { background: var(--accent, #1565d8); }
      .tr-card h3 { margin: 0 0 .25rem; font-size: 1.15rem; font-weight: 800; color: var(--accent, #1565d8); letter-spacing: -.01em; }
      .tr-card p { margin: 0 0 .9rem; font-size: 1rem; line-height: 1.5; color: #1c2330; }
      .tr-bts { display: flex; align-items: center; gap: .5rem; }
      .tr-bts button { font: inherit; font-weight: 750; border-radius: .9rem; min-height: 2.75rem; padding: 0 1.1rem; cursor: pointer; }
      .tr-pular { margin-right: auto; background: none; border: 0; color: #4b5565; text-decoration: underline; padding: 0 .2rem !important; }
      .tr-volta { background: #fff; border: 2px solid #d5dbe6; color: #1c2330; box-shadow: 0 3px 0 #d5dbe6; }
      .tr-prox { background: var(--accent, #1565d8); color: #fff; border: 0; box-shadow: 0 4px 0 var(--chunk, #0d4aa8); }
      .tr-bts button:active { transform: translateY(2px); box-shadow: none; }
      .tr-bts button:focus-visible { outline: 3px solid #1c2330; outline-offset: 2px; }
      .tr-ajuda { cursor: pointer; font-weight: 800; font-size: 1.15rem; }
      @media (prefers-reduced-motion: reduce) { .tr-hole, .tr-card, .tr-pontos i { transition: none; } }
    `;
    document.head.append(s);
  }

  const suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // easeInOutCubic
  const lerp = (a, b, t) => a + (b - a) * t;

  function montar() {
    css();
    const veil = document.createElement('div'); veil.className = 'tr-veil';
    const hole = document.createElement('div'); hole.className = 'tr-hole';
    const card = document.createElement('div'); card.className = 'tr-card base'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-live', 'polite');
    document.body.append(veil, hole, card);
    return { veil, hole, card };
  }

  function desenharCard(passo, i, total, ultimo) {
    const m = raiz.BrainMascote ? raiz.BrainMascote.svg(ultimo ? 'festa' : raiz.BrainMascote.poseDaPagina(), 56) : '';
    const pontos = Array.from({ length: total }, (_, k) => `<i class="${k <= i ? 'f' : ''}"></i>`).join('');
    est.card.innerHTML = `<div class="tr-topo">${m}<div><div class="tr-pas">Passo ${i + 1} de ${total}</div><div class="tr-pontos" aria-hidden="true">${pontos}</div></div></div>
      <h3></h3><p></p>
      <div class="tr-bts"><button type="button" class="tr-pular">Pular</button>${i > 0 ? '<button type="button" class="tr-volta">Voltar</button>' : ''}<button type="button" class="tr-prox">${ultimo ? 'Entendi!' : 'Próximo'}</button></div>`;
    est.card.querySelector('h3').textContent = passo.t;
    est.card.querySelector('p').textContent = passo.x;
    est.card.querySelector('.tr-pular').onclick = () => fechar(true);
    const v = est.card.querySelector('.tr-volta'); if (v) v.onclick = () => ir(-1);
    est.card.querySelector('.tr-prox').onclick = () => ir(1);
  }

  /** Retângulo do destaque (em coordenadas da tela) para um elemento. */
  function retDe(el) {
    const r = el.getBoundingClientRect(); const p = 6, vw = innerWidth, vh = innerHeight;
    const l = Math.max(2, r.left - p), t = Math.max(2, r.top - p);
    return { x: l, y: t, w: Math.max(10, Math.min(vw - 4, r.right + p) - l), h: Math.max(10, Math.min(vh - 4, r.bottom + p) - t) };
  }
  function poe(r) {
    est.rect = r;
    est.hole.style.width = r.w + 'px'; est.hole.style.height = r.h + 'px';
    est.hole.style.transform = `translate3d(${r.x}px, ${r.y}px, 0)`;
  }
  // com a tela parada, o destaque acompanha o elemento (redimensionar, conteúdo que muda de altura)
  function laco() {
    if (!est) return;
    if (!est.movendo && est.alvo && est.alvo.isConnected) { const r = retDe(est.alvo); if (!est.rect || Math.abs(r.x - est.rect.x) + Math.abs(r.y - est.rect.y) + Math.abs(r.w - est.rect.w) + Math.abs(r.h - est.rect.h) > 0.5) poe(r); }
    est.raf = requestAnimationFrame(laco);
  }

  /** Rola a página e move o destaque no mesmo compasso (mesma curva), sem pulos. */
  function animar(el, dest, mostrarCard, dur) {
    return new Promise((resolve) => {
      const ticket = est.ticket;
      const y0 = window.scrollY; const A = est.rect || retDe(el);
      const t0 = performance.now(); let cardOk = false;
      est.movendo = true;
      const passo = (agora) => {
        if (!est || ticket !== est.ticket) return resolve(false);
        const p = dur <= 0 ? 1 : Math.min(1, (agora - t0) / dur); const e = suave(p);
        if (dest !== null) window.scrollTo(0, lerp(y0, dest, e));
        if (!el.isConnected) return resolve(false);
        const B = retDe(el);
        poe({ x: lerp(A.x, B.x, e), y: lerp(A.y, B.y, e), w: lerp(A.w, B.w, e), h: lerp(A.h, B.h, e) });
        if (!cardOk && p >= 0.55) { cardOk = true; mostrarCard(); }
        if (p < 1) requestAnimationFrame(passo); else { est.movendo = false; if (!cardOk) mostrarCard(); resolve(true); }
      };
      requestAnimationFrame(passo);
    });
  }

  function fixo(el) {
    for (let n = el; n && n !== document.body; n = n.parentElement) { const p = getComputedStyle(n).position; if (p === 'fixed' || p === 'sticky') return true; }
    return false;
  }

  async function mostrar(i, dir) {
    const passos = est.passos; const ticket = ++est.ticket;
    est.card.classList.remove('vis');                       // texto antigo some enquanto o destaque viaja
    let pos = est.visiveis.indexOf(i);
    while (pos >= 0 && pos < est.visiveis.length) {
      const idx = est.visiveis[pos]; const p = passos[idx];
      if (p.antes) { try { p.antes(); } catch (e) { /* ignora */ } await espera(380); }
      const el = await esperarAlvo(p, p.antes ? 1200 : 400);
      if (!est || ticket !== est.ticket) return;
      if (el) {
        est.i = idx;
        desenharCard(p, pos, est.visiveis.length, pos === est.visiveis.length - 1);
        est.card.classList.add('base'); est.card.classList.remove('topo');
        // para onde a página precisa rolar (o cartão fica embaixo; o alvo vai para a área livre acima dele)
        const cardH = est.card.getBoundingClientRect().height, vh = innerHeight, livre = vh - cardH - 36;
        const r = el.getBoundingClientRect();
        let dest = null;
        if (!fixo(el)) {
          const alvoY = r.height <= livre ? window.scrollY + r.top - Math.max(16, (livre - r.height) / 2) : window.scrollY + r.top - 16;
          const max = Math.max(0, document.documentElement.scrollHeight - vh);
          dest = Math.min(max, Math.max(0, alvoY));
          if (Math.abs(dest - window.scrollY) < 2) dest = null;
        }
        const topoFinal = r.top - ((dest === null ? window.scrollY : dest) - window.scrollY);
        const lado = (topoFinal + r.height / 2) > vh * 0.52 ? 'topo' : 'base';
        const dist = dest === null ? 0 : Math.abs(dest - window.scrollY);
        const dur = reduz() ? 0 : Math.round(Math.min(760, Math.max(420, 380 + dist * 0.28)));
        est.alvo = el;
        const ok = await animar(el, dest, () => {
          if (!est || ticket !== est.ticket) return;
          est.card.classList.toggle('topo', lado === 'topo'); est.card.classList.toggle('base', lado === 'base');
          void est.card.offsetWidth;                           // reinicia a transição de entrada
          est.card.classList.add('vis');
          const b = est.card.querySelector('.tr-prox'); if (b) b.focus({ preventScroll: true });
        }, dur);
        if (!ok && est && ticket === est.ticket) { est.movendo = false; }
        return;
      }
      est.visiveis.splice(pos, 1);
      if (dir < 0) pos -= 1;
    }
    if (dir > 0) fechar(true); else if (est.visiveis.length) mostrar(est.visiveis[0], 1);
  }

  async function ir(dir) {
    if (!est || est.movendo) return;
    const pos = est.visiveis.indexOf(est.i);
    const prox = pos + dir;
    if (prox >= est.visiveis.length) return fechar(true);
    if (prox < 0) return;
    mostrar(est.visiveis[prox], dir);
  }

  function tecla(e) {
    if (!est) return;
    if (e.key === 'Escape') { e.preventDefault(); fechar(true); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); ir(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); ir(-1); }
  }

  function fechar(marcar) {
    if (!est) return;
    const e = est; est = null;
    cancelAnimationFrame(e.raf);
    document.removeEventListener('keydown', tecla, true);
    removeEventListener('resize', onResize);
    if (marcar) { try { localStorage.setItem(CHAVE(e.pg), '1'); } catch (x) { /* sem storage */ } }
    // saída suave: cartão e escurecimento desaparecem, a tela volta ao topo
    e.card.classList.remove('vis'); e.hole.classList.remove('on');
    const y0 = window.scrollY, t0 = performance.now(), dur = reduz() ? 0 : Math.min(500, 200 + y0 * 0.15);
    const volta = (agora) => {
      const p = dur <= 0 ? 1 : Math.min(1, (agora - t0) / dur);
      window.scrollTo(0, lerp(y0, 0, suave(p)));
      if (p < 1) requestAnimationFrame(volta); else terminar();
    };
    const terminar = () => {
      e.veil.remove(); e.hole.remove(); e.card.remove();
      document.documentElement.style.overflow = e.overflowAntes;
      if (e.foco && e.foco.focus) { try { e.foco.focus({ preventScroll: true }); } catch (x) { /* ignora */ } }
      document.dispatchEvent(new CustomEvent('brain-tour-fim', { detail: { pagina: e.pg } }));
    };
    setTimeout(() => requestAnimationFrame(volta), 80);
  }
  function onResize() { if (est && est.alvo && !est.movendo) poe(retDe(est.alvo)); }

  function paginaAtual() { return document.documentElement.getAttribute('data-pg') || ''; }

  async function iniciar(forcar) {
    const pg = paginaAtual();
    const lista = PASSOS[pg];
    if (!lista || est) return false;
    if (!forcar) {
      try { if (localStorage.getItem(CHAVE(pg)) || localStorage.getItem('brain-tour-off')) return false; } catch (e) { /* segue */ }
    }
    // espera a tela ficar livre (cadeado, diálogos, comemoração)
    for (let k = 0; k < 60; k++) {
      if (!document.querySelector('#bk, dialog[open], .jg-fest')) break;
      await espera(800);
    }
    if (est) return false;
    await esperarAlvo(lista[0], 2500);
    const ui = montar();
    est = { pg, passos: lista, ...ui, ticket: 0, i: 0, alvo: null, rect: null, movendo: false, foco: document.activeElement, overflowAntes: document.documentElement.style.overflow };
    document.documentElement.style.overflow = 'hidden';
    window.scrollTo({ top: 0 });
    document.addEventListener('keydown', tecla, true);
    addEventListener('resize', onResize);
    est.visiveis = lista.map((_, k) => k).filter((k) => lista[k].antes || achar(lista[k].alvo));
    if (!est.visiveis.length) return fechar(false);
    // o destaque nasce "dentro" do primeiro alvo (zoom suave) enquanto a tela escurece
    const primeiro = achar(lista[est.visiveis[0]].alvo);
    if (primeiro) { const r = retDe(primeiro); poe({ x: r.x - 30, y: r.y - 30, w: r.w + 60, h: r.h + 60 }); }
    requestAnimationFrame(() => est && est.hole.classList.add('on'));
    est.raf = requestAnimationFrame(laco);
    mostrar(est.visiveis[0], 1);
    return true;
  }

  function botaoAjuda() {
    if (!PASSOS[paginaAtual()]) return;
    let tent = 0;
    const t = setInterval(() => {
      const eng = document.querySelector('.topo-config .eng');
      if (eng && !document.querySelector('.tr-ajuda')) {
        const g = document.createElement('div'); g.style.cssText = 'display:flex;gap:.5rem;align-items:center;position:relative;z-index:1';
        eng.replaceWith(g);
        const b = document.createElement('button'); b.type = 'button'; b.className = 'eng tr-ajuda'; b.setAttribute('aria-label', 'Tutorial desta página'); b.textContent = '?';
        b.addEventListener('click', () => iniciar(true));
        g.append(eng, b);
        clearInterval(t);
      }
      if (++tent > 40) clearInterval(t);
    }, 100);
  }

  const API = { PASSOS, iniciar, fechar: () => fechar(false), ativo: () => !!est };
  if (typeof module === 'object' && module.exports) module.exports = API;
  else {
    raiz.BrainTour = API;
    const ini = () => { botaoAjuda(); setTimeout(() => iniciar(false), 900); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ini); else ini();
  }
})(typeof window !== 'undefined' ? window : globalThis);
