/* Coach do Brain: incentiva tarefas/rotina e avisa sobre gastos.
   Funciona por REGRAS escritas aqui, no aparelho, sem internet e sem IA paga: não é um modelo de linguagem,
   é um conjunto de regras que lê seus dados e fala em português. Tom ajustável nas configurações. */
(function (root) {
  'use strict';
  const BRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
  const plural = (n, a, b) => (n === 1 ? a : b);
  const min = (c) => c.toLowerCase();

  // Frases por tom. Princípios: foco no próximo passo pequeno, sem culpa, sem "zerar" progresso (Duolingo/Cleo/Habitica/Smashing).
  const TOM = {
    amigo: {
      gasto_peso: (c, p, v) => `${p}% dos seus gastos do mês estão em ${c} (${BRL(v)}). Vale dar uma olhada: dá pra segurar um pouquinho essa semana?`,
      gasto_freq: (c, n, v) => `${n} lançamentos de ${min(c)} nos últimos 7 dias (${BRL(v)}). Sem culpa, só um toque pra você perceber o ritmo.`,
      gasto_alta: (c, p) => `${c} está ${p}% acima do mês passado. Quer rever o que mudou?`,
      lim_estourou: (c, v, l) => `${c} passou do limite: ${BRL(v)} de ${BRL(l)}. Que tal pausar essa categoria até o fim do mês?`,
      lim_perto: (c, p) => `${c} já usou ${p}% do limite. Falta pouco, vale ir com calma.`,
      orc_estourou: (v, l) => `O orçamento do mês passou: ${BRL(v)} de ${BRL(l)}. Amanhã é um bom dia pra recomeçar o controle.`,
      orc_perto: (p) => `Você já usou ${p}% do orçamento do mês.`,
      gasto_bom: () => 'Seus gastos estão sob controle neste mês. Bom trabalho!',
      saldo_neg: (v) => `Neste mês você gastou ${BRL(v)} a mais do que entrou. Dá pra equilibrar.`,
      tar_atrasadas: (n) => `Você tem ${n} ${plural(n, 'tarefa atrasada', 'tarefas atrasadas')}. Escolhe uma só, a mais fácil, e começa por ela.`,
      tar_hoje: (n, t) => `Hoje: ${n} ${plural(n, 'tarefa', 'tarefas')}. Começa por "${t}": só os primeiros 2 minutos.`,
      tar_tudo: () => 'Tudo do dia concluído. Respira e aproveita, você mereceu.',
      tar_nenhuma: () => 'Você ainda não concluiu nenhuma tarefa hoje. Uma pequena já conta e puxa as outras.',
      tar_feitas: (n) => `${n} ${plural(n, 'tarefa concluída', 'tarefas concluídas')} hoje. Continua assim!`,
      tar_vazio: () => 'Sem tarefas pendentes. Que tal planejar o amanhã em 1 minuto?',
      rot_pend: (n) => `Falta${n === 1 ? '' : 'm'} ${n} ${plural(n, 'item', 'itens')} da rotina hoje. Dá tempo.`,
      rot_ok: () => 'Rotina de hoje completa. Constância é o que muda a vida.',
      jor_avaliar: () => 'Antes de dormir, avalie seu dia na Jornada. Leva 20 segundos.',
      jor_dia: (d, n) => `Dia ${d} de ${n} da sua jornada. Um dia de cada vez.`,
    },
    firme: {
      gasto_peso: (c, p, v) => `${p}% do mês em ${c} (${BRL(v)}). Isso é muito. Corte o que não for necessário.`,
      gasto_freq: (c, n, v) => `${n} gastos com ${min(c)} em 7 dias, ${BRL(v)}. Esse ritmo não se sustenta.`,
      gasto_alta: (c, p) => `${c} subiu ${p}% em relação ao mês passado. Descubra por quê e corrija.`,
      lim_estourou: (c, v, l) => `Limite de ${min(c)} estourado: ${BRL(v)} de ${BRL(l)}. Pare de gastar nessa categoria hoje.`,
      lim_perto: (c, p) => `${c} em ${p}% do limite. Não gaste mais sem necessidade.`,
      orc_estourou: (v, l) => `Orçamento estourado: ${BRL(v)} de ${BRL(l)}. Segure tudo que não for essencial.`,
      orc_perto: (p) => `${p}% do orçamento já foi. Disciplina agora.`,
      gasto_bom: () => 'Gastos dentro do plano. Mantenha.',
      saldo_neg: (v) => `Você gastou ${BRL(v)} a mais do que ganhou. Corrija o rumo.`,
      tar_atrasadas: (n) => `${n} ${plural(n, 'tarefa atrasada', 'tarefas atrasadas')}. Resolva a mais antiga agora.`,
      tar_hoje: (n, t) => `${n} ${plural(n, 'tarefa', 'tarefas')} hoje. Comece por "${t}". Sem enrolar.`,
      tar_tudo: () => 'Dia cumprido. Descanse e volte amanhã com o mesmo foco.',
      tar_nenhuma: () => 'Zero tarefas concluídas hoje. Faça uma agora, a menor que tiver.',
      tar_feitas: (n) => `${n} ${plural(n, 'feita', 'feitas')} hoje. Falta o resto.`,
      tar_vazio: () => 'Nada pendente. Defina a prioridade de amanhã.',
      rot_pend: (n) => `${n} ${plural(n, 'item', 'itens')} da rotina sem fazer. Faça agora.`,
      rot_ok: () => 'Rotina completa. É assim que se constrói resultado.',
      jor_avaliar: () => 'Avalie seu dia na Jornada antes de dormir.',
      jor_dia: (d, n) => `Dia ${d}/${n}. Não negocie com você mesmo.`,
    },
    calmo: {
      gasto_peso: (c, p, v) => `Notei que ${p}% do mês foi em ${c} (${BRL(v)}). Só para você ter em mente, sem pressão.`,
      gasto_freq: (c, n, v) => `Foram ${n} lançamentos de ${min(c)} nesta semana (${BRL(v)}). Observar já ajuda.`,
      gasto_alta: (c, p) => `${c} está um pouco mais alto que no mês passado (+${p}%). Talvez valha uma olhada com calma.`,
      lim_estourou: (c, v, l) => `${c} passou do limite combinado: ${BRL(v)} de ${BRL(l)}. Tudo bem, dá para ajustar daqui para frente.`,
      lim_perto: (c, p) => `${c} chegou a ${p}% do limite. Vale ir devagar.`,
      orc_estourou: (v, l) => `O orçamento do mês foi ultrapassado (${BRL(v)} de ${BRL(l)}). No próximo mês você ajusta com mais tranquilidade.`,
      orc_perto: (p) => `Você usou ${p}% do orçamento do mês.`,
      gasto_bom: () => 'Seus gastos estão tranquilos este mês.',
      saldo_neg: (v) => `Saiu ${BRL(v)} a mais do que entrou neste mês. Sem pânico, dá para reequilibrar.`,
      tar_atrasadas: (n) => `Há ${n} ${plural(n, 'tarefa pendente de dias anteriores', 'tarefas pendentes de dias anteriores')}. Escolha uma e faça no seu ritmo.`,
      tar_hoje: (n, t) => `Você tem ${n} ${plural(n, 'tarefa', 'tarefas')} hoje. Uma sugestão: "${t}", só por alguns minutos.`,
      tar_tudo: () => 'Tudo concluído por hoje. Que bom! Descanse.',
      tar_nenhuma: () => 'Ainda nada concluído hoje, e tudo bem. Quando se sentir pronto, comece por algo pequeno.',
      tar_feitas: (n) => `${n} ${plural(n, 'tarefa concluída', 'tarefas concluídas')} hoje. Bom ritmo.`,
      tar_vazio: () => 'Nenhuma tarefa pendente. Aproveite a calma.',
      rot_pend: (n) => `Ainda ${n === 1 ? 'resta' : 'restam'} ${n} ${plural(n, 'item', 'itens')} da rotina. Quando puder.`,
      rot_ok: () => 'Rotina de hoje concluída. Muito bem.',
      jor_avaliar: () => 'Se puder, reserve um instante para avaliar o dia na Jornada.',
      jor_dia: (d, n) => `Dia ${d} de ${n}. Passo a passo.`,
    },
  };

  /** ctx: { agora:Date, tarefas:[], rotina:{itens,progresso}, jornada:{jornada,avaliacao_hoje}, fin:{atual,anterior}, tom, limitePeso } */
  function analisar(ctx) {
    const tom = TOM[ctx.tom] || TOM.amigo;
    const hoje = ctx.hoje;
    const hora = ctx.agora.getHours();
    const saida = [];
    const add = (area, nivel, texto, prio) => saida.push({ area, nivel, texto, prio });
    const limitePeso = ctx.limitePeso || 40;

    // ---- gastos ----
    const f = ctx.fin && ctx.fin.atual;
    if (f && f.total > 0) {
      const cats = f.por_categoria || [];
      const orc = f.orcamento || { total: 0, categorias: {} };
      const lims = orc.categorias || {};
      for (const c of cats) {
        const lim = lims[c.categoria];
        if (lim > 0) {
          if (c.valor >= lim) add('gasto', 'alerta', tom.lim_estourou(c.categoria, c.valor, lim), 100);
          else if (c.valor >= lim * 0.8) add('gasto', 'aviso', tom.lim_perto(c.categoria, pct(c.valor, lim)), 80);
        }
      }
      if (orc.total > 0) {
        if (f.total >= orc.total) add('gasto', 'alerta', tom.orc_estourou(f.total, orc.total), 99);
        else if (f.total >= orc.total * 0.8) add('gasto', 'aviso', tom.orc_perto(pct(f.total, orc.total)), 79);
      }
      const top = cats[0];
      if (top && f.total >= 100 && top.quantidade >= 3 && pct(top.valor, f.total) >= limitePeso && !(lims[top.categoria] > 0 && top.valor >= lims[top.categoria])) {
        add('gasto', 'alerta', tom.gasto_peso(top.categoria, pct(top.valor, f.total), top.valor), 90);
      }
      // frequência nos últimos 7 dias, por categoria
      const corte = new Date(ctx.agora.getFullYear(), ctx.agora.getMonth(), ctx.agora.getDate() - 6);
      const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const desde = iso(corte);
      const sem = new Map();
      const todos = [].concat((f.gastos || []), ctx.fin.anterior ? (ctx.fin.anterior.gastos || []) : []);
      for (const g of todos) {
        if (g.tipo === 'receita' || g.data < desde || g.data > hoje) continue;
        const i = sem.get(g.categoria) || { n: 0, v: 0 };
        i.n++; i.v += g.valor; sem.set(g.categoria, i);
      }
      let melhor = null;
      for (const [cat, i] of sem) if (i.n >= 4 && i.v >= 80 && (!melhor || i.v > melhor.i.v)) melhor = { cat, i };
      if (melhor && !(top && melhor.cat === top.categoria && pct(top.valor, f.total) >= limitePeso)) add('gasto', 'aviso', tom.gasto_freq(melhor.cat, melhor.i.n, melhor.i.v), 70);
      // alta vs. mês passado (só compara se já passou da metade do mês anterior em dias equivalentes)
      const ant = ctx.fin.anterior;
      if (ant && ant.por_categoria) {
        const dia = Number(hoje.slice(8, 10));
        const ateDia = (arr, cat) => arr.filter((g) => g.tipo !== 'receita' && g.categoria === cat && Number(g.data.slice(8, 10)) <= dia).reduce((s, g) => s + g.valor, 0);
        for (const c of cats.slice(0, 3)) {
          const antes = ateDia(ant.gastos || [], c.categoria);
          if (antes >= 50 && c.valor > antes * 1.3 && c.valor - antes >= 50) { add('gasto', 'aviso', tom.gasto_alta(c.categoria, Math.round((c.valor / antes - 1) * 100)), 60); break; }
        }
      }
      if (f.entradas > 0 && f.total > f.entradas * 1.0 && f.total - f.entradas >= 50) add('gasto', 'aviso', tom.saldo_neg(f.total - f.entradas), 65);
      if (!saida.some((s) => s.area === 'gasto')) add('gasto', 'bom', tom.gasto_bom(), 10);
    }

    // ---- tarefas ----
    const tars = ctx.tarefas || [];
    const pend = tars.filter((t) => !t.feita);
    const atrasadas = pend.filter((t) => t.data && t.data < hoje);
    const dehoje = pend.filter((t) => t.data === hoje).sort((a, b) => (a.hora || '99').localeCompare(b.hora || '99'));
    const feitasHoje = tars.filter((t) => t.feita && t.concluida_em === hoje).length;
    const alvo = dehoje[0] || atrasadas[atrasadas.length - 1] || pend.find((t) => !t.data);
    if (atrasadas.length) add('tarefa', 'aviso', tom.tar_atrasadas(atrasadas.length), 75);
    if (dehoje.length) add('tarefa', 'info', tom.tar_hoje(dehoje.length, dehoje[0].titulo), 55);
    else if (!atrasadas.length && feitasHoje > 0) add('tarefa', 'bom', tom.tar_tudo(), 30);
    if (feitasHoje === 0 && hora >= 15 && alvo) add('tarefa', 'aviso', tom.tar_nenhuma(), 72);
    else if (feitasHoje > 0 && (dehoje.length || atrasadas.length)) add('tarefa', 'bom', tom.tar_feitas(feitasHoje), 25);
    if (!pend.length && feitasHoje === 0) add('tarefa', 'info', tom.tar_vazio(), 5);

    // ---- rotina e jornada ----
    const r = ctx.rotina && ctx.rotina.progresso;
    if (r && r.total > 0) {
      if (r.feitos === r.total) add('rotina', 'bom', tom.rot_ok(), 20);
      else if (hora >= 17) add('rotina', 'aviso', tom.rot_pend(r.total - r.feitos), 50);
    }
    const j = ctx.jornada;
    if (j && j.jornada && j.jornada.dia_atual && j.jornada.dia_atual <= j.jornada.duracao) {
      if (!j.avaliacao_hoje && hora >= 20) add('jornada', 'info', tom.jor_avaliar(), 45);
      else add('jornada', 'info', tom.jor_dia(j.jornada.dia_atual, j.jornada.duracao), 8);
    }
    saida.sort((a, b) => b.prio - a.prio);
    return { mensagens: saida, alvo: alvo ? alvo.titulo : null, atrasadas: atrasadas.length, dehoje: dehoje.length };
  }

  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  /** Responde a uma pergunta livre por palavras-chave. */
  function responder(pergunta, ctx) {
    const q = norm(pergunta);
    const a = analisar(ctx);
    const pela = (area) => a.mensagens.filter((m) => m.area === area).map((m) => m.texto);
    const tem = (...p) => p.some((x) => q.includes(x));
    const juntar = (l, vazio) => (l.length ? l.slice(0, 3).join(' ') : vazio);
    if (tem('sem vontade', 'preguica', 'desanim', 'cansad', 'procrastin', 'motiva', 'nao consigo', 'travad', 'ajuda')) {
      const t = a.alvo ? `"${a.alvo}"` : 'a menor tarefa que você tiver';
      return `Quando falta vontade, ajuda diminuir o passo: abra ${t} e trabalhe só 2 minutos, sem prometer terminar. Começar costuma ser a parte mais difícil. Se depois de 2 minutos quiser parar, tudo bem, já valeu. Depois eu te mostro o próximo.`;
    }
    if (tem('gasto', 'gastando', 'dinheiro', 'financ', 'alimenta', 'comida', 'ifood', 'mercado', 'limite', 'orcamento', 'economi')) {
      const f = ctx.fin && ctx.fin.atual;
      if (!f || !f.total) return 'Ainda não tenho gastos deste mês para analisar. Registre alguns em Finanças e eu comento.';
      const top = (f.por_categoria || []).slice(0, 3).map((c) => `${c.categoria} ${BRL(c.valor)}`).join(', ');
      return `${juntar(pela('gasto').filter((_, i) => i < 3), '')} No mês você gastou ${BRL(f.total)}. Maiores categorias: ${top}.`.trim();
    }
    if (tem('tarefa', 'fazer', 'hoje', 'pendente', 'atrasad', 'prioridade', 'comecar')) {
      const l = pela('tarefa');
      return juntar(l, 'Nenhuma tarefa pendente agora.') + (a.alvo ? ` Sugestão de começo: "${a.alvo}".` : '');
    }
    if (tem('rotina', 'habito')) return juntar(pela('rotina'), 'Sua rotina está em dia por enquanto.');
    if (tem('jornada', 'dia ', 'caverna')) return juntar(pela('jornada'), 'Você não tem uma jornada em andamento. Dá para começar uma na aba Jornada.');
    if (tem('resumo', 'como estou', 'como vou', 'status', 'oi', 'ola', 'bom dia', 'boa tarde', 'boa noite')) {
      return juntar(a.mensagens.filter((m) => m.nivel !== 'bom' || a.mensagens.length < 3), 'Tudo tranquilo por aqui.');
    }
    return 'Posso falar sobre suas tarefas de hoje, seus gastos do mês, rotina e jornada, ou dar um empurrão se estiver sem vontade. Sou um assistente de regras que roda só no seu aparelho, então pergunte sobre esses temas.';
  }

  const api = { analisar, responder, TOM };
  if (typeof module === 'object' && module.exports) { module.exports = api; return; }
  root.BrainCoach = api;

  // ================= interface (navegador) =================
  if (typeof document === 'undefined') return;
  const P = () => root.BrainPrefs;
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const get = (u) => fetch(u).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))));

  async function coletar() {
    const agora = new Date();
    const mes = iso(agora).slice(0, 7);
    const ant = iso(new Date(agora.getFullYear(), agora.getMonth() - 1, 1)).slice(0, 7);
    const [t, r, j, fa, fb] = await Promise.all([
      get('/api/tarefas').catch(() => ({ tarefas: [] })),
      get('/api/rotina').catch(() => null),
      get('/api/jornada?dias=7').catch(() => null),
      get(`/api/financas/gastos?mes=${mes}`).catch(() => null),
      get(`/api/financas/gastos?mes=${ant}`).catch(() => null),
    ]);
    const p = P() ? P().get() : { coach_tom: 'amigo', coach_alerta_pct: 40 };
    return { agora, hoje: iso(agora), tarefas: t.tarefas, rotina: r, jornada: j, fin: { atual: fa, anterior: fb }, tom: p.coach_tom, limitePeso: p.coach_alerta_pct };
  }

  function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  const css = document.createElement('style');
  css.textContent = `
  .coach { display: grid; gap: .6rem; }
  .coach-msg { display: flex; gap: .6rem; align-items: flex-start; font-size: .92rem; line-height: 1.4; }
  .coach-msg i { flex: none; width: .55rem; height: .55rem; border-radius: 50%; margin-top: .42rem; background: var(--accent); }
  .coach-msg.n-alerta i { background: var(--danger); } .coach-msg.n-aviso i { background: #d99a1f; } .coach-msg.n-bom i { background: #2fa36b; }
  .coach-rod { display: flex; justify-content: space-between; align-items: center; gap: .6rem; margin-top: .2rem; }
  .coach-rod small { color: var(--muted); font-size: .75rem; }
  .coach-btn { font: inherit; font-weight: 600; font-size: .85rem; border: 1px solid var(--line); background: var(--accent-soft); color: var(--accent); border-radius: 999px; padding: .45rem .9rem; cursor: pointer; }
  dialog.coach-dlg { padding: 1rem; }
  .coach-log { display: grid; gap: .5rem; max-height: 50vh; overflow-y: auto; margin: .6rem 0; padding-right: .2rem; }
  .coach-b { padding: .55rem .8rem; border-radius: 1rem; font-size: .9rem; line-height: 1.4; max-width: 88%; }
  .coach-b.c { background: var(--accent-soft); color: var(--ink); justify-self: start; border-bottom-left-radius: .3rem; }
  .coach-b.u { background: var(--accent); color: var(--on-accent); justify-self: end; border-bottom-right-radius: .3rem; }
  .coach-rap { display: flex; flex-wrap: wrap; gap: .4rem; margin-bottom: .6rem; }
  .coach-rap button { font: inherit; font-size: .78rem; border: 1px solid var(--line); background: var(--surface); color: var(--ink); border-radius: 999px; padding: .35rem .7rem; cursor: pointer; }
  .coach-in { display: flex; gap: .5rem; } .coach-in input { flex: 1; }
  .coach-in button { font: inherit; font-weight: 650; border: 0; background: var(--accent); color: var(--on-accent); border-radius: .7rem; padding: 0 1rem; cursor: pointer; }`;
  document.head.append(css);

  let dlg = null;
  function abrirChat() {
    if (!dlg) {
      dlg = el('dialog', 'coach-dlg');
      dlg.innerHTML = `<h3>Coach</h3><p class="dica">Assistente de regras, roda só no seu aparelho. Pergunte sobre tarefas, gastos, rotina ou jornada.</p>
        <div class="coach-log" aria-live="polite"></div>
        <div class="coach-rap"></div>
        <form class="coach-in"><input type="text" maxlength="200" placeholder="Escreva sua pergunta" aria-label="Pergunta ao coach"><button type="submit">Enviar</button></form>
        <div class="acoes" style="margin-top:.7rem"><button type="button" class="fechar">Fechar</button></div>`;
      document.body.append(dlg);
      const log = dlg.querySelector('.coach-log');
      const bolha = (t, c) => { log.append(el('div', 'coach-b ' + c, t)); log.scrollTop = log.scrollHeight; };
      const perguntar = async (t) => {
        if (!t.trim()) return;
        bolha(t, 'u');
        try { bolha(responder(t, await coletar()), 'c'); } catch (e) { bolha('Não consegui ler seus dados agora.', 'c'); }
      };
      ['Como estou hoje?', 'O que faço agora?', 'Como estão meus gastos?', 'Estou sem vontade'].forEach((t) => {
        const b = el('button', null, t); b.type = 'button'; b.onclick = () => perguntar(t); dlg.querySelector('.coach-rap').append(b);
      });
      const inp = dlg.querySelector('input');
      dlg.querySelector('form').onsubmit = (e) => { e.preventDefault(); const v = inp.value; inp.value = ''; perguntar(v); };
      dlg.querySelector('.fechar').onclick = () => dlg.close();
      dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
      coletar().then((c) => bolha(analisar(c).mensagens.filter((m) => m.nivel !== 'bom').slice(0, 2).map((m) => m.texto).join(' ') || 'Oi! Tudo em ordem por aqui. Em que posso ajudar?', 'c')).catch(() => {});
    }
    dlg.showModal();
  }

  /** Desenha as mensagens do coach dentro de `alvo`. foco: 'tudo' | 'gasto' */
  async function montar(alvo, foco, max) {
    if (!alvo) return;
    const p = P() ? P().get() : { coach: true };
    if (p.coach === false) { alvo.hidden = true; return; }
    let c;
    try { c = await coletar(); } catch (e) { alvo.hidden = true; return; }
    let msgs = analisar(c).mensagens;
    if (foco === 'gasto') msgs = msgs.filter((m) => m.area === 'gasto');
    else msgs = msgs.filter((m, i) => m.nivel !== 'bom' || i < 2);
    msgs = msgs.slice(0, max || 3);
    if (!msgs.length) { alvo.hidden = true; return; }
    alvo.hidden = false;
    alvo.replaceChildren();
    const caixa = el('div', 'coach');
    msgs.forEach((m) => { const d = el('div', 'coach-msg n-' + m.nivel); d.append(el('i'), el('span', null, m.texto)); caixa.append(d); });
    const rod = el('div', 'coach-rod');
    rod.append(el('small', null, 'Coach · regras no seu aparelho'));
    const b = el('button', 'coach-btn', 'Conversar'); b.type = 'button'; b.onclick = abrirChat;
    rod.append(b); caixa.append(rod);
    alvo.append(caixa);
  }
  api.montar = montar; api.abrirChat = abrirChat;
})(typeof window !== 'undefined' ? window : globalThis);
