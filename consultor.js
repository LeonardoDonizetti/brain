/* Consultor financeiro do Brain.
   Parte 1 (pura, testada): diagnóstico dos últimos meses, sugestão de limites por categoria (método 50/30/20 adaptado
   aos seus gastos reais) e respostas de consultoria que funcionam sem internet.
   Parte 2 (navegador): conversa guiada (renda, objetivo, quanto guardar) que termina numa proposta editável de limites.
   Se a IA do Google estiver ligada (sua chave grátis), a conversa livre usa o Gemini com o papel de consultor.
   Orientação educativa: não é recomendação de investimento e nada é salvo sem você tocar em Aplicar. */
(function (root) {
  'use strict';
  const CATS = ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação', 'Lazer', 'Compras', 'Assinaturas', 'Outros'];
  const NEC = ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação'];
  const DES = ['Lazer', 'Compras', 'Assinaturas', 'Outros'];
  // sem histórico: 50/30/20 (necessidades 50%, desejos 30%, poupança 20%) distribuído por categoria
  const PADRAO = { Alimentação: 0.2, Transporte: 0.1, Moradia: 0.1, Saúde: 0.05, Educação: 0.05, Lazer: 0.14, Compras: 0.08, Assinaturas: 0.04, Outros: 0.04 };
  const BRL = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const BRL2 = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const soma = (o, ks) => (ks || Object.keys(o)).reduce((s, k) => s + (o[k] || 0), 0);
  const passo = (v) => (v >= 200 ? 10 : 5);
  const baixo = (v) => (v <= 0 ? 0 : Math.max(passo(v), Math.floor(v / passo(v)) * passo(v)));

  /** Média por categoria e renda média dos meses informados (cada mês = resposta de /api/financas/gastos). */
  function diagnostico(meses) {
    const usados = (meses || []).filter((m) => m && Array.isArray(m.por_categoria) && (m.total > 0 || m.entradas > 0));
    const comGasto = usados.filter((m) => m.total > 0), comEntrada = usados.filter((m) => m.entradas > 0);
    const medias = {}; CATS.forEach((c) => { medias[c] = 0; });
    for (const m of comGasto) for (const x of m.por_categoria) if (medias[x.categoria] !== undefined) medias[x.categoria] += x.valor / comGasto.length;
    const gastoMedio = soma(medias);
    const rendaMedia = comEntrada.length ? comEntrada.reduce((s, m) => s + m.entradas, 0) / comEntrada.length : 0;
    const ord = Object.entries(medias).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    return { medias, gastoMedio, rendaMedia, mesesComGasto: comGasto.length, maior: ord[0] ? { categoria: ord[0][0], valor: ord[0][1], pct: gastoMedio ? ord[0][1] / gastoMedio : 0 } : null, temHistorico: comGasto.length > 0 && gastoMedio > 0 };
  }

  /**
   * Limites sugeridos. renda: R$/mês; medias: média por categoria (pode ser vazia); poupancaPct: 0..0.6.
   * Regra: o teto de gastos é renda x (1 - poupança). Se o padrão atual cabe, mantém com pequena folga; se não cabe,
   * corta primeiro os desejos (até 40%), depois as necessidades (até 12%) e, só no fim, tudo proporcionalmente (avisando).
   */
  function sugerirLimites({ renda, medias, poupancaPct }) {
    renda = Number(renda) || 0; const pp = Math.min(0.6, Math.max(0, Number(poupancaPct) || 0));
    const teto = renda * (1 - pp);
    const temHist = !!medias && soma(medias) > 0;
    const base = {}; CATS.forEach((c) => { base[c] = temHist ? Math.max(0, medias[c] || 0) : renda * PADRAO[c]; });
    if (temHist && base.Outros < renda * 0.03) base.Outros = renda * 0.03;   // reserva para imprevistos
    const avisos = [], motivos = [];
    let atual = soma(base), corte = atual - teto;
    const escala = (ks, f) => ks.forEach((k) => { base[k] *= f; });
    if (corte > 0.5) {
      const d = soma(base, DES), cd = Math.min(corte, d * 0.4);
      if (d > 0 && cd > 0) { escala(DES, 1 - cd / d); corte -= cd; motivos.push(`Reduzi ${BRL(cd)} dos gastos do dia a dia (lazer, compras, assinaturas e outros). É onde o corte dói menos.`); }
      if (corte > 0.5) {
        const n = soma(base, NEC), cn = Math.min(corte, n * 0.12);
        if (n > 0 && cn > 0) { escala(NEC, 1 - cn / n); corte -= cn; motivos.push(`Apertei ${BRL(cn)} nas necessidades, só até onde é realista.`); }
      }
      if (corte > 0.5) {
        const t = soma(base); escala(CATS, teto / t);
        avisos.push(`Guardar ${Math.round(pp * 100)}% com esse padrão de gastos fica apertado. Considere começar guardando menos (por exemplo, ${Math.max(5, Math.round(pp * 50))}%) ou aumentar a renda.`);
      }
    } else if (temHist) {
      escala(CATS, 1.04);   // pequena folga sobre o que você já gasta
      const folga = teto - soma(base);
      if (folga > renda * 0.05) motivos.push(`Seus gastos já cabem no teto e sobram cerca de ${BRL(folga)} por mês. Esse valor pode ir para a sua meta de guardar.`);
    }
    const limites = {}; CATS.forEach((c) => { const v = baixo(base[c]); if (v > 0) limites[c] = v; });
    let total = soma(limites);
    // arredondar para baixo nunca deve estourar o teto; se estourar por causa do piso mínimo, tira do maior desejo
    while (total > teto + 0.01 && total > 0) {
      const alvo = Object.entries(limites).sort((a, b) => b[1] - a[1])[0];
      if (!alvo) break;
      const novo = alvo[1] - passo(alvo[1]); if (novo <= 0) delete limites[alvo[0]]; else limites[alvo[0]] = novo;
      total = soma(limites);
    }
    return { limites, total, teto, poupar: Math.max(0, renda - total), poupancaPct: pp, renda, avisos, motivos, temHistorico: temHist, grupos: { necessidades: soma(limites, NEC), desejos: soma(limites, DES) } };
  }

  /** Escolhe quanto guardar conforme o objetivo e a folga real do orçamento. */
  function poupancaRecomendada(objetivo, renda, gastoMedio) {
    const base = { guardar: 0.2, controlar: 0.1, meta: 0.2, aperto: 0.05 }[objetivo] || 0.1;
    if (renda > 0 && gastoMedio > 0) return Math.min(base, Math.max(0.05, Math.floor(((renda - gastoMedio) / renda) * 20) / 20 || 0.05));
    return base;
  }

  const AVISO = 'Orientação educativa, não é recomendação de investimento.';

  /** Respostas de consultoria sem IA. Devolve null se não souber (a conversa guiada cuida). */
  function responder(texto, d) {
    const q = String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const tem = (...p) => p.some((x) => q.includes(x));
    d = d || { medias: {}, gastoMedio: 0, rendaMedia: 0 };
    if (tem('50/30/20', '50 30 20', 'regra dos 50')) return { texto: 'A regra 50/30/20 divide o que entra em três partes: 50% para necessidades (comida, transporte, moradia, saúde, estudo), 30% para desejos (lazer, compras, assinaturas) e 20% para guardar. É um ponto de partida, não uma lei: se sua renda é pequena, as necessidades pesam mais e tudo bem. O que importa é guardar uma parte fixa antes de gastar o resto.', sugestoes: ['Montar meus limites', 'Quanto devo guardar?'] };
    if (tem('reserva', 'emergencia', 'imprevisto')) return { texto: 'Reserva de emergência é o dinheiro separado para imprevistos (um conserto, uma consulta). Adultos com renda costumam mirar 3 a 6 meses de gastos essenciais. Para quem está começando, uma meta realista é juntar primeiro um mês de gastos básicos, ou algo entre R$ 500 e R$ 1.000, e ir aumentando. Deixe em um lugar seguro e de saque rápido, como poupança ou renda fixa com liquidez diária. ' + AVISO, sugestoes: ['Montar meus limites', 'Como guardar mais?'] };
    if (tem('quanto devo guardar', 'quanto guardar', 'quanto poupar', 'porcentagem')) return { texto: 'Um bom começo é guardar de 10% a 20% do que entra. Se hoje você não guarda nada, comece com 5% a 10% e suba um ponto por mês. O segredo é guardar no dia em que o dinheiro entra, antes de gastar, e tratar isso como uma conta fixa.', sugestoes: ['Montar meus limites', 'Como guardar mais?'] };
    if (tem('guardar mais', 'economizar', 'poupar', 'reduzir gasto', 'cortar gasto', 'gastar menos')) {
      const m = d.maior;
      return { texto: `Três passos que funcionam: 1) guarde logo que o dinheiro entrar, mesmo que pouco; 2) olhe a maior categoria e corte o supérfluo dela${m ? ` (a sua é ${m.categoria}, cerca de ${Math.round(m.pct * 100)}% dos gastos)` : ''}; 3) use a regra das 24 horas para compras não planejadas: espere um dia e, se ainda quiser, compre. Revise assinaturas que você quase não usa.`, sugestoes: ['Montar meus limites', 'O que é 50/30/20?'] };
    }
    if (tem('divida', 'cartao', 'parcel', 'emprest', 'juros')) return { texto: 'Dívida cara (cartão rotativo, cheque especial) cobra juros muito altos e deve ser a prioridade antes de investir. Evite parcelar o que não cabe no mês: parcelar não aumenta o dinheiro, só espalha o gasto e reduz a sua folga dos próximos meses. Se já está devendo, liste as dívidas, pague primeiro a de maior juros e tente renegociar. ' + AVISO, sugestoes: ['Montar meus limites'] };
    if (tem('invest', 'tesouro', 'cdb', 'bolsa', 'acoes', 'renda fixa', 'rendimento')) return { texto: 'Antes de investir, o caminho comum é: 1) organizar o orçamento, 2) montar a reserva de emergência em algo seguro e líquido, 3) só então pensar em objetivos de prazo mais longo. Quanto maior o prazo, mais risco você consegue suportar; dinheiro que você pode precisar em breve não deve ficar em risco. Se quiser, posso explicar a diferença entre poupança, CDB e Tesouro Selic em termos gerais. ' + AVISO, sugestoes: ['Montar meus limites', 'Reserva de emergência'] };
    if (tem('gastando demais', 'gasto demais', 'gastei demais', 'estourei', 'estouro', 'to gastando muito', 'gastando muito')) {
      const m = d.maior;
      return { texto: m ? `Olhando seus lançamentos, a categoria que mais pesa é ${m.categoria} (${BRL(m.valor)} por mês em média, ${Math.round(m.pct * 100)}% do total). Definir um limite para ela costuma ser o primeiro passo. Quer que eu monte limites com base no que você realmente gasta?` : 'Ainda tenho poucos lançamentos para apontar o que pesa. Registre alguns gastos e eu analiso. Enquanto isso, posso montar limites com base em uma regra geral.', sugestoes: ['Montar meus limites'] };
    }
    return null;
  }

  /** Texto compacto dos dados financeiros para a IA (só números e categorias; sem descrições). */
  function contextoFin(d, orc, renda) {
    d = d || { medias: {} };
    const L = [];
    L.push(`Renda mensal informada ou registrada: ${renda ? BRL2(renda) : 'não informada'}.`);
    if (d.temHistorico) L.push(`Gasto médio mensal (${d.mesesComGasto} mês/meses com dados): ${BRL2(d.gastoMedio)}. Por categoria: ` + Object.entries(d.medias).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${BRL2(v)}`).join('; ') + '.');
    else L.push('Ainda não há histórico de gastos suficiente.');
    const lim = orc && orc.categorias ? Object.entries(orc.categorias).map(([k, v]) => `${k} ${BRL2(v)}`).join('; ') : '';
    L.push(`Limites atuais: ${orc && orc.total ? 'total ' + BRL2(orc.total) : 'sem total'}${lim ? '; ' + lim : ''}.`);
    return L.join('\n');
  }

  const API = { CATS, NEC, DES, PADRAO, diagnostico, sugerirLimites, poupancaRecomendada, responder, contextoFin, BRL, AVISO };
  if (typeof module === 'object' && module.exports) { module.exports = API; return; }
  root.BrainConsultor = API;

  // ================= interface (navegador) =================
  if (typeof document === 'undefined') return;
  const P = () => root.BrainPrefs;
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const get = (u) => fetch(u).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))));
  const mesIso = (i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
  const chaveIA = () => { try { return (localStorage.getItem('brain-gemini-key') || '').trim(); } catch (e) { return ''; } };
  const iaLigada = () => !!(P() && P().get().coach_ia && root.BrainIA && chaveIA().length >= 20);

  const css = document.createElement('style');
  css.textContent = `
  dialog.cons-dlg { padding: 1rem; width: min(94vw, 30rem); max-height: 92vh; display: flex; flex-direction: column; }
  dialog.cons-dlg[open] { display: flex; }
  .cons-log { display: grid; gap: .55rem; overflow-y: auto; margin: .6rem 0; padding: .1rem .15rem .4rem 0; flex: 1; min-height: 14rem; align-content: start; }
  .cons-b { padding: .6rem .85rem; border-radius: 1rem; font-size: .92rem; line-height: 1.45; max-width: 92%; white-space: pre-line; }
  .cons-b.c { background: var(--accent-soft); color: var(--ink); justify-self: start; border-bottom-left-radius: .3rem; }
  .cons-b.u { background: var(--accent); color: var(--on-accent); justify-self: end; border-bottom-right-radius: .3rem; }
  .cons-b.pensando { opacity: .7; }
  .cons-topo { display: flex; justify-content: space-between; align-items: center; gap: .5rem; }
  .cons-topo .fechar { width: 2.6rem; height: 2.6rem; border-radius: 50%; padding: 0; font-size: 1rem; flex: none; border: 1px solid var(--line); background: var(--surface); color: var(--ink); cursor: pointer; }
  .cons-sub { font-size: .78rem; }
  .cons-rap { display: flex; flex-wrap: nowrap; gap: .4rem; margin: .1rem -.2rem .5rem 0; overflow-x: auto; padding: .1rem .2rem .2rem 0; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
  .cons-rap::-webkit-scrollbar { display: none; }
  .cons-rap, .cons-in, .cons-aviso, .cons-topo, .cons-sub { flex: none; }
  .cons-rap button { flex: none; white-space: nowrap; }
  .cons-rap:empty { display: none; }
  .cons-rap button { font: inherit; font-size: .82rem; font-weight: 600; border: 1px solid var(--line); background: var(--surface); color: var(--ink); border-radius: 999px; padding: .45rem .85rem; min-height: 2.5rem; cursor: pointer; }
  .cons-in { display: flex; gap: .5rem; } .cons-in input { flex: 1; }
  .cons-aviso { margin: .5rem 0 0; font-size: .74rem; color: var(--muted); line-height: 1.35; }
  .cons-prop { justify-self: stretch; max-width: 100%; border: 2px solid var(--borda-t, var(--line)); border-radius: 1rem; padding: .7rem .8rem; background: var(--surface); display: grid; gap: .5rem; }
  .cons-prop h4 { margin: 0; font-size: .98rem; }
  .cons-prop .linha { display: grid; grid-template-columns: 1fr 6.2rem; gap: .5rem; align-items: center; font-size: .88rem; }
  .cons-prop .linha small { display: block; color: var(--muted); font-size: .72rem; }
  .cons-prop input { padding: .4rem .5rem; min-height: 2.4rem; text-align: right; }
  .cons-prop .tot { display: flex; justify-content: space-between; font-weight: 700; border-top: 1px solid var(--line); padding-top: .5rem; font-size: .92rem; }
  .cons-prop .nota { font-size: .8rem; color: var(--muted); line-height: 1.4; margin: 0; }
  .cons-prop .aviso2 { font-size: .8rem; color: var(--warm, #b45309); margin: 0; }
  .cons-prop .bts { display: flex; gap: .5rem; flex-wrap: wrap; }
  .cons-prop .bts button { font: inherit; font-weight: 700; border-radius: .7rem; min-height: 2.6rem; padding: 0 1rem; cursor: pointer; border: 1px solid var(--line); background: var(--surface); color: var(--ink); }
  .cons-prop .bts .ok { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
  .cons-prop.feito { background: var(--accent-soft); border-color: transparent; }
  .cons-card { display: grid; gap: .5rem; }
  .cons-card p { margin: 0; font-size: .9rem; line-height: 1.45; }
  `;
  document.head.append(css);

  async function coletarFin() {
    const [m0, m1, m2, orc] = await Promise.all([0, 1, 2].map((i) => get('/api/financas/gastos?mes=' + mesIso(i)).catch(() => null)).concat([get('/api/financas/orcamento').catch(() => null)]));
    const d = diagnostico([m0, m1, m2]);
    return { d, orc: orc || { total: 0, categorias: {} }, renda: (m0 && m0.entradas > 0 ? m0.entradas : d.rendaMedia) || 0, mes: m0 };
  }

  let dlg = null;
  function abrir(opcoes) {
    opcoes = opcoes || {};
    if (!dlg) {
      dlg = el('dialog', 'cons-dlg');
      dlg.setAttribute('aria-labelledby', 'cons-tit');
      dlg.innerHTML = `<div class="cons-topo"><h3 id="cons-tit" style="margin:0">Consultor financeiro</h3><button type="button" class="fechar" aria-label="Fechar o consultor">✕</button></div><p class="dica cons-sub" style="margin:.2rem 0 0"></p>
        <div class="cons-log" aria-live="polite"></div>
        <div class="cons-rap"></div>
        <form class="cons-in"><input type="text" maxlength="400" placeholder="Pergunte algo ou diga sua dúvida" aria-label="Mensagem para o consultor"><button type="submit" class="primario">Enviar</button></form>
        <p class="cons-aviso"></p>`;
      document.body.append(dlg);
      dlg.querySelector('.fechar').onclick = () => dlg.close();
      dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
      iniciar();
    }
    const ia = iaLigada();
    dlg.querySelector('.cons-sub').textContent = ia ? 'Conversa com IA (Google Gemini, sua chave grátis) usando um resumo dos seus números.' : 'Funciona no seu aparelho, sem internet. Ligue o Coach com IA em Configurações para conversar livremente.';
    dlg.querySelector('.cons-aviso').textContent = AVISO + (ia ? ' A IA pode errar: confira antes de aplicar.' : '') + ' Nada é salvo sem você tocar em Aplicar.';
    dlg.showModal();
    if (opcoes.comecar) dlg._comecar && dlg._comecar();
  }

  function iniciar() {
    const log = dlg.querySelector('.cons-log'), rap = dlg.querySelector('.cons-rap'), form = dlg.querySelector('form'), inp = form.querySelector('input');
    const S = { passo: 'livre', renda: 0, objetivo: '', pp: 0.1, dados: null, hist: [] };
    const bolha = (t, c) => { const b = el('div', 'cons-b ' + c, t); log.append(b); log.scrollTop = log.scrollHeight; return b; };
    const sugerir = (l) => { rap.replaceChildren(); l.forEach((t) => { const b = el('button', null, typeof t === 'string' ? t : t.rotulo); b.type = 'button'; b.onclick = () => (typeof t === 'string' ? entrada(t) : t.acao()); rap.append(b); }); };
    const dados = async () => { if (!S.dados) S.dados = await coletarFin(); return S.dados; };
    const MENU = ['Montar meus limites', 'Estou gastando demais', 'Quanto devo guardar?', 'Reserva de emergência', 'O que é 50/30/20?'];

    async function comecar() {
      S.passo = 'livre'; S.dados = null; const f = await dados().catch(() => null);
      let t = 'Oi! Sou seu consultor financeiro aqui no Brain. Posso te ajudar a definir limites de gastos, decidir quanto guardar e tirar dúvidas de dinheiro.';
      if (f && f.d.temHistorico) t += `\n\nOlhando seus registros, você gasta em média ${BRL(f.d.gastoMedio)} por mês${f.d.maior ? ` e a categoria que mais pesa é ${f.d.maior.categoria}` : ''}.`;
      else t += '\n\nAinda tenho poucos registros seus, então vou usar uma regra geral e ajustar conforme você registrar gastos.';
      bolha(t, 'c'); sugerir(MENU);
    }
    dlg._comecar = null;
    log.replaceChildren(); comecar();

    // ---- conversa guiada: renda -> objetivo -> quanto guardar -> proposta
    async function guiaInicio() {
      const f = await dados();
      if (f.renda > 0) {
        S.renda = f.renda; S.passo = 'renda-ok';
        bolha(`Para calcular, preciso saber sua renda mensal (mesada, salário, bolsa, freelas). Pelos seus registros considero ${BRL2(f.renda)}. Está certo?`, 'c');
        sugerir([{ rotulo: `Sim, ${BRL(f.renda)}`, acao: () => { bolha(`Sim, ${BRL(f.renda)}`, 'u'); guiaObjetivo(); } }, { rotulo: 'Informar outro valor', acao: () => { bolha('Informar outro valor', 'u'); pedirRenda(); } }]);
      } else pedirRenda();
    }
    function pedirRenda() { S.passo = 'renda'; bolha('Qual é a sua renda mensal, somando mesada, salário, bolsa ou freelas? Pode escrever só o número, por exemplo 1500.', 'c'); sugerir([]); inp.focus(); }
    function guiaObjetivo() {
      S.passo = 'objetivo';
      bolha('Qual é o seu principal objetivo agora?', 'c');
      const o = (rot, k) => ({ rotulo: rot, acao: () => { bolha(rot, 'u'); S.objetivo = k; guiaPoupanca(); } });
      sugerir([o('Guardar dinheiro', 'guardar'), o('Controlar os gastos', 'controlar'), o('Juntar para uma meta', 'meta'), o('Sair do aperto', 'aperto')]);
    }
    async function guiaPoupanca() {
      const f = await dados(); const rec = poupancaRecomendada(S.objetivo, S.renda, f.d.gastoMedio);
      S.pp = rec; S.passo = 'poupanca';
      const pct = Math.round(rec * 100);
      bolha(`Pelo seu objetivo e pelo que você já gasta, eu sugiro guardar ${pct}% da renda (${BRL(S.renda * rec)} por mês). Quer usar esse valor ou prefere outro?`, 'c');
      const op = (p) => ({ rotulo: `${p}%`, acao: () => { bolha(`${p}%`, 'u'); S.pp = p / 100; proposta(); } });
      const lista = [{ rotulo: `Usar ${pct}%`, acao: () => { bolha(`Usar ${pct}%`, 'u'); proposta(); } }];
      [5, 10, 20, 30].filter((p) => p !== pct).forEach((p) => lista.push(op(p)));
      sugerir(lista);
    }
    async function proposta() {
      const f = await dados(); S.passo = 'livre';
      const r = sugerirLimites({ renda: S.renda, medias: f.d.medias, poupancaPct: S.pp });
      bolha(`Pronto. Com renda de ${BRL(S.renda)} e meta de guardar ${Math.round(S.pp * 100)}%, o teto de gastos fica em ${BRL(r.teto)} por mês. Montei estes limites a partir do que você realmente gasta. Pode ajustar qualquer valor antes de aplicar.`, 'c');
      cartaoLimites(r, f);
      sugerir(['Por que esses valores?', 'Como guardar mais?', 'Reserva de emergência']);
      S.ultima = r;
    }
    function cartaoLimites(r, f, titulo) {
      const c = el('div', 'cons-prop'); c.append(el('h4', null, titulo || 'Limites sugeridos para o mês'));
      const campos = {};
      CATS.forEach((cat) => {
        const med = f.d.medias[cat] || 0;
        if (!r.limites[cat] && !med) return;
        const linha = el('div', 'linha'); const rot = el('div'); rot.append(el('span', null, cat));
        rot.append(el('small', null, med > 0 ? `você gasta ~${BRL(med)}/mês` : 'sem histórico'));
        const i = el('input'); i.type = 'number'; i.min = '0'; i.step = '5'; i.inputMode = 'numeric'; i.value = String(r.limites[cat] || 0); i.setAttribute('aria-label', 'Limite de ' + cat);
        campos[cat] = i; linha.append(rot, i); c.append(linha);
      });
      const tot = el('div', 'tot'); const tl = el('span', null, 'Total de gastos'), tv = el('span'); tot.append(tl, tv); c.append(tot);
      const guardar = el('div', 'tot'); guardar.style.borderTop = '0'; guardar.style.paddingTop = '0'; const gl = el('span', null, 'Sobra para guardar'), gv = el('span'); guardar.append(gl, gv); c.append(guardar);
      const recalc = () => { const t = Object.values(campos).reduce((s, i) => s + (Number(i.value) || 0), 0); tv.textContent = BRL(t); const g = r.renda - t; gv.textContent = BRL(g) + (r.renda ? ` (${Math.round((g / r.renda) * 100)}%)` : ''); gv.style.color = g < 0 ? 'var(--danger)' : 'var(--ok)'; };
      Object.values(campos).forEach((i) => i.addEventListener('input', recalc)); recalc();
      r.avisos.forEach((a) => c.append(el('p', 'aviso2', a)));
      const bts = el('div', 'bts'); const ok = el('button', 'ok', 'Aplicar limites'), nao = el('button', null, 'Agora não'); ok.type = nao.type = 'button';
      ok.onclick = async () => {
        ok.disabled = nao.disabled = true;
        const categorias = {}; let total = 0; Object.entries(campos).forEach(([k, i]) => { const v = Math.max(0, Math.round(Number(i.value) || 0)); if (v > 0) { categorias[k] = v; total += v; } });
        try {
          const rr = await fetch('/api/financas/orcamento', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ total, categorias }) });
          if (!rr.ok) throw new Error((await rr.json().catch(() => ({}))).detail || 'Não consegui salvar.');
          c.className = 'cons-prop feito'; c.replaceChildren(el('p', null, `Limites aplicados: ${BRL(total)} por mês. Você acompanha o uso na tela de Finanças e eu aviso quando chegar perto.`));
          S.dados = null; root.dispatchEvent(new CustomEvent('brain-limites'));
          try { if (typeof carregar === 'function') carregar(); } catch (e) { /* tela não expõe carregar */ }
          if (root.BrainCelebrar) root.BrainCelebrar.micro(dlg.querySelector('.cons-in button'), { xp: 10, texto: 'Orçamento definido' });
        } catch (e) { ok.disabled = nao.disabled = false; let m = c.querySelector('.err'); if (!m) { m = el('p', 'aviso2 err'); m.setAttribute('role', 'alert'); c.insertBefore(m, bts); } m.textContent = e.message; }
      };
      nao.onclick = () => { c.remove(); };
      bts.append(ok, nao); c.append(bts); log.append(c); log.scrollTop = log.scrollHeight;
    }
    function porque() {
      const r = S.ultima; if (!r) return responderLocal('limites');
      const t = ['Como cheguei nesses valores:', `• Teto = renda menos a parte que você quer guardar (${Math.round(r.poupancaPct * 100)}%).`, r.temHistorico ? '• Parti da média do que você realmente gastou nos últimos meses, em cada categoria, em vez de números genéricos.' : '• Como ainda não há histórico, usei a regra 50/30/20 (50% necessidades, 30% desejos, 20% guardar) adaptada.'].concat(r.motivos.map((m) => '• ' + m)).concat(['• Os valores foram arredondados para baixo, de 5 em 5 (ou de 10 em 10).']).join('\n');
      bolha(t, 'c'); sugerir(['Como guardar mais?', 'Reserva de emergência']);
    }

    function responderLocal(t) {
      const f = S.dados;
      const r = responder(t, f ? f.d : null);
      if (r) { bolha(r.texto, 'c'); sugerir(r.sugestoes || MENU); return true; }
      return false;
    }

    async function comIA(t) {
      const esp = bolha('Pensando', 'c pensando');
      try {
        const f = await dados();
        const p = P() ? P().get() : {};
        const modelo = (() => { try { return localStorage.getItem('brain-gemini-model') || undefined; } catch (e) { return undefined; } })();
        const hoje = new Date(); const iso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
        const res = await root.BrainIA.perguntar({ chave: chaveIA(), modelo, pergunta: t, historico: S.hist, ctx: { hoje: iso }, perfil: { nome: p.perfil && p.perfil.nome, tom: p.coach_tom }, modo: 'consultor', contextoExtra: contextoFin(f.d, f.orc, S.renda || f.renda) });
        try { localStorage.setItem('brain-gemini-model', res.modelo); } catch (e) { /* sem cache */ }
        esp.className = 'cons-b c'; esp.textContent = res.texto;
        S.hist.push({ papel: 'u', texto: t }, { papel: 'c', texto: res.texto });
        res.acoes.filter((a) => a.tipo === 'definir_limites').forEach((a) => {
          const renda = S.renda || f.renda;
          cartaoLimites({ limites: a.limites, renda, avisos: [], motivos: [], total: a.total }, f, 'Limites propostos pela IA');
        });
        sugerir(res.sugestoes.length ? res.sugestoes : MENU);
        return true;
      } catch (e) { esp.remove(); bolha((e && e.message ? e.message : 'Sem IA agora.') + ' Respondi com o consultor do aparelho.', 'c'); return false; }
    }

    async function entrada(t) {
      t = String(t || '').trim(); if (!t) return;
      bolha(t, 'u');
      const q = t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (S.passo === 'renda') {
        const n = Number(t.replace(/[^\d,.]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
        if (!isFinite(n) || n < 50 || n > 1e7) { bolha('Não entendi o valor. Escreva só o número da renda mensal, por exemplo 1500.', 'c'); return; }
        S.renda = n; guiaObjetivo(); return;
      }
      if (/montar|definir|limite|orcamento|teto/.test(q) && /(montar|definir|criar|fazer|quero|ajuda|meus limites|limites)/.test(q) && !/o que e|por que|porque/.test(q)) { await guiaInicio(); return; }
      if (/por que esses|porque esses|como chegou|por que esses valores/.test(q)) { porque(); return; }
      await dados().catch(() => null);
      if (iaLigada()) { if (await comIA(t)) return; }
      if (responderLocal(t)) return;
      bolha('Posso ajudar a montar seus limites de gastos, decidir quanto guardar e explicar conceitos como 50/30/20 e reserva de emergência. Por onde quer começar?', 'c'); sugerir(MENU);
    }
    form.onsubmit = (e) => { e.preventDefault(); const v = inp.value; inp.value = ''; entrada(v); };
  }

  /** Cartão de entrada para a tela de Finanças. */
  function montarCartao(alvo) {
    if (!alvo) return;
    alvo.replaceChildren();
    const c = el('div', 'cons-card');
    c.append(el('h3', null, 'Consultor financeiro'));
    c.append(el('p', null, 'Não sabe quanto definir de limite? Converse com o consultor: ele analisa o que você gasta, pergunta sobre sua renda e seus objetivos e monta limites sob medida, que você ajusta e aplica.'));
    const b = el('button', 'btn2 pri', 'Falar com o consultor'); b.type = 'button'; b.onclick = () => abrir({ comecar: false });
    const l = el('div', 'linhas'); l.append(b); c.append(l);
    alvo.append(c);
  }
  API.abrir = abrir; API.montarCartao = montarCartao;
})(typeof window !== 'undefined' ? window : globalThis);
