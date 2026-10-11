/* Ofensiva, XP e nível do Brain (gamificação).
   Tudo é CALCULADO a partir dos registros que você já faz (tarefas, estudos, rotina, jornada, finanças):
   não há contador separado que possa ficar fora de sincronia, e o histórico antigo já conta.

   Regras (inspiradas na ofensiva do Duolingo, com ajustes para ser mais gentil):
   - Um dia COMPLETO vale na ofensiva: 30 XP no dia + pelo menos uma ENTREGA de verdade (concluir uma tarefa,
     15 min de foco, uma revisão de estudo ou 3 itens da rotina). Só anotar um gasto ou avaliar o dia não basta.
     No modo leve (⚙) qualquer ação já vale o dia.
   - Escudo: cobre um dia perdido sozinho. Você começa com 1 e ganha outro a cada 7 dias seguidos (máx. 2).
   - Resgate: perdeu um dia sem escudo? Faça 40 XP no dia seguinte e a ofensiva é salva.
   - Dias de folga (preferências) e modo férias não quebram a ofensiva.
   - Passou disso, a ofensiva quebra: aparece quebrada e você recomeça do 1. O recorde fica guardado. */
(function (root) {
  'use strict';

  const T = typeof require !== 'undefined' && typeof module !== 'undefined' ? require('./texto.js') : root.BrainTexto;
  const { iso, addDias, deIso } = T;

  const XP = { tarefa: 10, rotina: 5, avaliacao: 10, revisao: 8, gasto: 4, foco: 10 };
  const GASTOS_POR_DIA = 3;
  const META_XP_DIA = 30;
  const FOCO_MIN = 15;     // minutos de foco que contam como entrega
  const ROTINA_MIN = 3;    // itens da rotina que contam como entrega
  const META_RESGATE = 40;
  const ESCUDOS_MAX = 2;
  const ESCUDOS_INICIO = 1;
  const MARCOS = [3, 7, 14, 30, 60, 100, 200, 365];
  const NIVEIS = ['Iniciante', 'Curioso', 'Focado', 'Constante', 'Dedicado', 'Veterano', 'Mestre', 'Lenda'];

  const ehData = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const L = (v) => (Array.isArray(v) ? v : []);

  /** Mapa data -> { xp, acoes, gastos, tarefas, foco, revisoes, rotina } com tudo que vale ponto, sem contar o futuro. */
  function coletar(estado, hoje) {
    const m = new Map();
    const dia = (data) => {
      let x = m.get(data);
      if (!x) { x = { xp: 0, acoes: 0, gastos: 0, tarefas: 0, foco: 0, revisoes: 0, rotina: 0 }; m.set(data, x); }
      return x;
    };
    const add = (data, xp, campo, qtd) => {
      if (!ehData(data) || data > hoje) return;
      const x = dia(data); x.xp += xp; x.acoes += 1; if (campo) x[campo] += qtd === undefined ? 1 : qtd;
    };
    for (const t of L(estado.tarefas)) if (t && t.feita && t.concluida_em) add(t.concluida_em, XP.tarefa, 'tarefas');
    for (const r of L(estado.rotina_registros)) if (r) add(r.data, XP.rotina, 'rotina');
    for (const a of L(estado.avaliacoes)) if (a) add(a.data, XP.avaliacao);
    const es = estado.estudos || {};
    for (const s of L(es.sessoes)) if (s) add(s.data, XP.foco + Math.min(30, Math.floor((Number(s.minutos) || 0) / 5)), 'foco', Number(s.minutos) || 0);
    for (const r of L(es.revisoes)) if (r) add(r.estudado_em, XP.revisao, 'revisoes');
    for (const g of L(estado.gastos)) {
      if (!g || !ehData(g.data) || g.data > hoje) continue;
      const x = dia(g.data);
      if (x.gastos >= GASTOS_POR_DIA) continue;
      x.gastos++; x.xp += XP.gasto; x.acoes++;
    }
    return m;
  }

  /** O que falta para o dia ser "completo". No modo leve, qualquer XP já vale. */
  function detalheDia(x, leve) {
    x = x || { xp: 0, acoes: 0, gastos: 0, tarefas: 0, foco: 0, revisoes: 0, rotina: 0 };
    const meta = leve ? 1 : META_XP_DIA;
    const entrega = leve ? x.xp > 0 : (x.tarefas >= 1 || x.foco >= FOCO_MIN || x.revisoes >= 1 || x.rotina >= ROTINA_MIN);
    const xpOk = x.xp >= meta;
    return { xp: x.xp, meta, xp_ok: xpOk, entrega, completo: xpOk && entrega, tarefas: x.tarefas, foco: x.foco, revisoes: x.revisoes, rotina: x.rotina, leve: !!leve };
  }

  function nivelDe(xp) {
    const n = Math.floor(Math.sqrt(xp / 40)) + 1;
    const ini = 40 * (n - 1) * (n - 1), fim = 40 * n * n;
    return { n, titulo: NIVEIS[Math.min(NIVEIS.length - 1, n - 1)], xp_nivel: xp - ini, xp_prox: fim - ini, pct: Math.round(((xp - ini) / (fim - ini)) * 100) };
  }

  function diaDaSemana(s) { return deIso(s).getDay(); }

  function calcular(estado, prefs, hojeIso) {
    estado = estado || {}; prefs = prefs || {};
    const hoje = hojeIso;
    const dados = coletar(estado, hoje);
    const leve = prefs.ofensiva_leve === true;
    const xpDe = (d) => (dados.get(d) ? dados.get(d).xp : 0);
    const detDe = (d) => detalheDia(dados.get(d), leve);
    const completo = (d) => detDe(d).completo;
    const resgata = (d) => { const x = detDe(d); return x.xp >= META_RESGATE && (leve || x.entrega); };
    const folgas = new Set(L(prefs.dias_folga));
    const ferias = prefs.modo_ferias === true;
    const datas = [...dados.keys()].sort();
    const xpTotal = [...dados.values()].reduce((a, x) => a + x.xp, 0);
    const nivel = nivelDe(xpTotal);
    const base = {
      hoje, xp_hoje: xpDe(hoje), meta_xp_dia: detDe(hoje).meta, modo: leve ? 'leve' : 'completo', dia: detDe(hoje), meta_resgate: META_RESGATE, xp_total: xpTotal, nivel,
      marcos: MARCOS, escudos_max: ESCUDOS_MAX, dias_ativos: 0,
    };

    if (!datas.length) {
      return Object.assign(base, { estado: 'nova', sequencia: 0, melhor: 0, escudos: ESCUDOS_INICIO, perdida: null, resgate: null, semana: semana(prefs, hoje, new Map()), marcos_ok: [], proximo_marco: MARCOS[0], semana_perfeita: false, ativo_hoje: false });
    }

    const status = new Map();
    let seq = 0, esc = ESCUDOS_INICIO, melhor = 0, perdida = null, resgate = null, perfeitos = 0;
    let d = datas[0];
    while (d <= hoje) {
      if (completo(d)) {
        seq += 1; status.set(d, 'feito');
        if (seq % 7 === 0 && esc < ESCUDOS_MAX) esc += 1;
        if (seq > melhor) melhor = seq;
      } else if (d === hoje) {
        status.set(d, xpDe(d) > 0 ? 'parcial' : 'pendente');
      } else if (ferias || folgas.has(diaDaSemana(d))) {
        status.set(d, 'folga');
      } else if (esc > 0) {
        esc -= 1; status.set(d, 'escudo');
      } else {
        const prox = iso(addDias(deIso(d), 1));
        const xpProx = xpDe(prox);
        if (seq === 0) {
          status.set(d, 'perdido');
        } else if (prox <= hoje && resgata(prox)) {
          status.set(d, 'resgatado');
        } else if (prox === hoje) {
          // perdeu ontem; ainda dá para salvar hoje com 40 XP
          status.set(d, 'perdido');
          resgate = { valor: seq, falta: Math.max(0, META_RESGATE - xpProx), desde: d, entrega: leve || detDe(prox).entrega };
          perdida = { valor: seq, em: d };
          const seqAntes = seq;
          seq = 0;
          status.set(hoje, xpProx > 0 ? 'parcial' : 'pendente');
          return finalizar(Object.assign({}, base, { estado: 'quebrada', resgatavel: true, sequencia: 0, melhor: Math.max(melhor, seqAntes), escudos: esc, perdida, resgate, ativo_hoje: false }), status, prefs, hoje, melhor);
        } else {
          status.set(d, 'perdido');
          perdida = { valor: seq, em: d };
          seq = 0;
        }
      }
      d = iso(addDias(deIso(d), 1));
    }

    const ativoHoje = completo(hoje);
    let est;
    if (ativoHoje) est = 'ativa';
    else if (seq > 0) est = 'em_risco';
    else if (perdida && diasEntre(perdida.em, hoje) <= 7) est = 'quebrada';
    else est = 'inicio';
    // resgate bem-sucedido hoje: mostra aviso uma vez
    const salvouHoje = ativoHoje && status.get(iso(addDias(deIso(hoje), -1))) === 'resgatado';
    return finalizar(Object.assign({}, base, { estado: est, resgatavel: false, sequencia: seq, melhor, escudos: esc, perdida, resgate: null, ativo_hoje: ativoHoje, salvou_hoje: salvouHoje }), status, prefs, hoje, melhor);
  }

  function diasEntre(a, b) { return Math.round((deIso(b) - deIso(a)) / 86400000); }

  function finalizar(r, status, prefs, hoje, melhor) {
    r.semana = semana(prefs, hoje, status);
    r.dias_ativos = [...status.values()].filter((v) => v === 'feito' || v === 'resgatado').length;
    r.marcos_ok = MARCOS.filter((m) => r.melhor >= m);
    r.proximo_marco = MARCOS.find((m) => m > r.sequencia) || null;
    // semana perfeita: os últimos 7 dias todos feitos, sem escudo
    let perf = true;
    for (let i = 0; i < 7; i++) { const k = iso(addDias(deIso(hoje), -i)); const s = status.get(k); if (s !== 'feito') { perf = false; break; } }
    r.semana_perfeita = perf;
    return r;
  }

  /** Os 7 dias da semana atual (primeiro dia conforme as preferências). */
  function semana(prefs, hoje, status) {
    const ini = Number.isInteger(prefs.semana_inicio) ? prefs.semana_inicio : 0;
    const dh = diaDaSemana(hoje);
    const recuo = (dh - ini + 7) % 7;
    const primeiro = addDias(deIso(hoje), -recuo);
    const letras = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    const out = [];
    for (let i = 0; i < 7; i++) {
      const dt = addDias(primeiro, i); const k = iso(dt);
      let s = status.get(k) || (k > hoje ? 'futuro' : 'vazio');
      out.push({ data: k, letra: letras[dt.getDay()], estado: s, hoje: k === hoje });
    }
    return out;
  }

  const api = { XP, META_XP_DIA, FOCO_MIN, ROTINA_MIN, detalheDia, META_RESGATE, ESCUDOS_MAX, ESCUDOS_INICIO, MARCOS, NIVEIS, coletar, nivelDe, calcular };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BrainJogo = api;
})(typeof self !== 'undefined' ? self : this);
