/* Preferências do Brain (tema, cor, metas, semana...). Vale para este aparelho e entra no backup.
   Carregue este arquivo no <head>: o tema é aplicado antes da página aparecer. */
(function (root) {
  'use strict';

  const PADRAO = {
    tema: 'auto',            // auto | claro | escuro
    cor: 'azul',             // azul | verde | roxo | laranja | rosa | grafite
    semana_inicio: 0,        // 0 domingo, 1 segunda, 6 sábado
    meta_diaria: 3,          // tarefas por dia (0 desliga)
    meta_semanal: 15,        // tarefas por semana (0 desliga)
    dias_folga: [],          // dias da semana sem cobrança de meta (0-6)
    modo_ferias: false,      // pausa as metas sem "quebrar" nada
    periodo_grafico: 7,      // 7 | 14 | 30
    lembrete_backup: 14,     // dias; 0 = nunca lembrar
    coach: true,             // mensagens do coach
    coach_tom: 'amigo',      // amigo | firme | calmo
    coach_alerta_pct: 40,    // avisa quando uma categoria passa disso % dos gastos
    home: { aneis: true, barras: true, constancia: true, tabela: true, gastos: true },
  };

  // [claro: destaque, suave, texto sobre destaque, (opcional) segunda cor do degradê] [escuro: ...]
  // As chaves (azul, verde...) são antigas e mantidas para não perder a escolha salva; os nomes e as cores são novos.
  const CORES = {
    azul:    { nome: 'Petróleo',  claro: null, escuro: null },
    verde:   { nome: 'Pinheiro',  claro: ['#1b6b46', '#e4f1ea', '#ffffff'], escuro: ['#5cc08f', '#162b21', '#06200f'] },
    roxo:    { nome: 'Ameixa',    claro: ['#5b3a7a', '#efe9f4', '#ffffff'], escuro: ['#c3a3dd', '#261a33', '#190d26'] },
    laranja: { nome: 'Terracota', claro: ['#a8481f', '#f8ebe4', '#ffffff'], escuro: ['#f0a07a', '#35201a', '#2a1006'] },
    rosa:    { nome: 'Rubi',      claro: ['#a31f45', '#f9e7ec', '#ffffff'], escuro: ['#f08aa4', '#381a24', '#2e0b17'] },
    grafite: { nome: 'Grafite',   claro: ['#2f3a47', '#e7eaee', '#ffffff'], escuro: ['#c5ced9', '#23292f', '#101820'] },
    // degradês discretos: a mesma cor em dois tons
    aurora:  { nome: 'Cobalto',     grad: true, claro: ['#1f4fbf', '#e6ecf9', '#ffffff', '#173b94'], escuro: ['#7a9ae8', '#18233d', '#0a1530', '#5878c9'] },
    sol:     { nome: 'Âmbar',       grad: true, claro: ['#b45309', '#f9eddc', '#ffffff', '#8a3d06'], escuro: ['#eab36a', '#32250f', '#241503', '#c98f45'] },
    oceano:  { nome: 'Oceano',      grad: true, claro: ['#0a6a8a', '#e1eff4', '#ffffff', '#08425e'], escuro: ['#62bfdc', '#12282f', '#041c26', '#3c95b3'] },
    floresta:{ nome: 'Floresta',    grad: true, claro: ['#1b6b46', '#e4f1ea', '#ffffff', '#124a30'], escuro: ['#5cc08f', '#162b21', '#06200f', '#3c9468'] },
    fogo:    { nome: 'Bordô',       grad: true, claro: ['#9b1c31', '#f8e8eb', '#ffffff', '#6e1223'], escuro: ['#ee8c9b', '#361b20', '#2a0911', '#c76577'] },
    vinho:   { nome: 'Berinjela',   grad: true, claro: ['#5b3a7a', '#efe9f4', '#ffffff', '#3d2554'], escuro: ['#c3a3dd', '#261a33', '#190d26', '#9b78bb'] },
    noite:   { nome: 'Noite',       grad: true, claro: ['#2f3a47', '#e7eaee', '#ffffff', '#151b22'], escuro: ['#c5ced9', '#23292f', '#101820', '#8d98a6'] },
  };

  const inteiro = (v, min, max, padrao) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= min && n <= max ? n : padrao;
  };

  /** Aceita qualquer objeto e devolve preferências válidas (o que vier errado volta ao padrão). */
  function sanitizar(p) {
    p = p && typeof p === 'object' ? p : {};
    const h = p.home && typeof p.home === 'object' ? p.home : {};
    const home = {};
    for (const k of Object.keys(PADRAO.home)) home[k] = typeof h[k] === 'boolean' ? h[k] : PADRAO.home[k];
    const folgas = Array.isArray(p.dias_folga) ? p.dias_folga.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) : [];
    return {
      tema: ['auto', 'claro', 'escuro'].includes(p.tema) ? p.tema : PADRAO.tema,
      cor: Object.prototype.hasOwnProperty.call(CORES, p.cor) ? p.cor : PADRAO.cor,
      semana_inicio: [0, 1, 6].includes(p.semana_inicio) ? p.semana_inicio : PADRAO.semana_inicio,
      meta_diaria: inteiro(p.meta_diaria, 0, 50, PADRAO.meta_diaria),
      meta_semanal: inteiro(p.meta_semanal, 0, 300, PADRAO.meta_semanal),
      dias_folga: [...new Set(folgas)].sort(),
      modo_ferias: p.modo_ferias === true,
      periodo_grafico: [7, 14, 30].includes(p.periodo_grafico) ? p.periodo_grafico : PADRAO.periodo_grafico,
      lembrete_backup: [0, 7, 14, 30].includes(p.lembrete_backup) ? p.lembrete_backup : PADRAO.lembrete_backup,
      coach: p.coach !== false,
      coach_tom: ['amigo', 'firme', 'calmo'].includes(p.coach_tom) ? p.coach_tom : PADRAO.coach_tom,
      coach_alerta_pct: [30, 40, 50, 60].includes(p.coach_alerta_pct) ? p.coach_alerta_pct : PADRAO.coach_alerta_pct,
      home,
    };
  }

  const lib = { PADRAO, CORES, sanitizar };

  if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    const CHAVE = 'brain-prefs';
    let atual;
    try { atual = sanitizar(JSON.parse(root.localStorage.getItem(CHAVE))); } catch (e) { atual = sanitizar({}); }
    const ouvintes = [];
    const escuroSistema = root.matchMedia ? root.matchMedia('(prefers-color-scheme: dark)') : null;

    function aplicar() {
      const el = document.documentElement;
      if (atual.tema === 'auto') el.removeAttribute('data-tema'); else el.setAttribute('data-tema', atual.tema);
      const escuro = atual.tema === 'escuro' || (atual.tema === 'auto' && escuroSistema && escuroSistema.matches);
      const c = CORES[atual.cor];
      const par = c && (escuro ? c.escuro : c.claro);
      for (const v of ['--accent', '--accent-soft', '--on-accent', '--accent-grad']) el.style.removeProperty(v);
      if (par) { el.style.setProperty('--accent', par[0]); el.style.setProperty('--accent-soft', par[1]); el.style.setProperty('--on-accent', par[2]); if (par[3]) el.style.setProperty('--accent-grad', `linear-gradient(135deg, ${par[0]}, ${par[3]})`); }
      let meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', escuro ? '#101214' : (par ? par[0] : '#0b5f73'));
    }
    if (escuroSistema && escuroSistema.addEventListener) escuroSistema.addEventListener('change', aplicar);

    function guardarLocal() { try { root.localStorage.setItem(CHAVE, JSON.stringify(atual)); } catch (e) { /* sem armazenamento: vale só nesta sessão */ } }

    const api = Object.assign({}, lib, {
      get: () => JSON.parse(JSON.stringify(atual)),
      /** Muda algumas preferências (ex.: set({ tema: 'escuro' })), aplica na hora e guarda no aparelho. */
      set(parcial) {
        const novo = sanitizar(Object.assign({}, atual, parcial, parcial && parcial.home ? { home: Object.assign({}, atual.home, parcial.home) } : {}));
        const mudouVisual = novo.tema !== atual.tema || novo.cor !== atual.cor;
        atual = novo;
        if (mudouVisual) { document.documentElement.classList.add('troca-tema'); clearTimeout(api._tt); api._tt = setTimeout(() => document.documentElement.classList.remove('troca-tema'), 400); }
        aplicar(); guardarLocal();
        if (root.BrainLocal) root.BrainLocal.chamar('PUT', '/api/preferencias', '', novo).catch(() => {});
        ouvintes.forEach((f) => { try { f(api.get()); } catch (e) {} });
        return api.get();
      },
      aoMudar(f) { ouvintes.push(f); },
      /** Traz do armazenamento principal (vale após restaurar um backup) */
      async sincronizar() {
        if (!root.BrainLocal) return;
        try {
          const r = await root.BrainLocal.chamar('GET', '/api/preferencias', '');
          if (r.status === 200 && r.corpo && r.corpo.salvo) {
            const novo = sanitizar(r.corpo.preferencias);
            if (JSON.stringify(novo) !== JSON.stringify(atual)) { atual = novo; aplicar(); guardarLocal(); ouvintes.forEach((f) => { try { f(api.get()); } catch (e) {} }); }
          } else if (r.status === 200) {
            root.BrainLocal.chamar('PUT', '/api/preferencias', '', atual).catch(() => {});
          }
        } catch (e) {}
      },
    });
    aplicar();
    root.BrainPrefs = api;
    document.addEventListener('DOMContentLoaded', () => { aplicar(); api.sincronizar(); });
  } else {
    root.BrainPrefsLib = lib;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
})(typeof self !== 'undefined' ? self : this);
