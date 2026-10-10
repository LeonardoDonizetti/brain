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
    home: { aneis: true, barras: true, constancia: true, tabela: true, gastos: true },
  };

  // [claro: destaque, suave, texto sobre destaque] [escuro: ...]
  const CORES = {
    azul:    { nome: 'Azul',    claro: null, escuro: null },
    verde:   { nome: 'Verde',   claro: ['#1a7f53', '#e3f5ec', '#ffffff'], escuro: ['#4cc38a', '#17332a', '#08210f'] },
    roxo:    { nome: 'Roxo',    claro: ['#7a45d1', '#f0e8fb', '#ffffff'], escuro: ['#b996f2', '#2b1f47', '#1a0f33'] },
    laranja: { nome: 'Laranja', claro: ['#b84f08', '#fdeedd', '#ffffff'], escuro: ['#f0a060', '#3a2512', '#2a1505'] },
    rosa:    { nome: 'Rosa',    claro: ['#c72c6b', '#fde8f0', '#ffffff'], escuro: ['#f27fa8', '#3d1a2a', '#2e0b1a'] },
    grafite: { nome: 'Grafite', claro: ['#3a4656', '#e9edf2', '#ffffff'], escuro: ['#b8c4d4', '#263140', '#101820'] },
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
      for (const v of ['--accent', '--accent-soft', '--on-accent']) el.style.removeProperty(v);
      if (par) { el.style.setProperty('--accent', par[0]); el.style.setProperty('--accent-soft', par[1]); el.style.setProperty('--on-accent', par[2]); }
      let meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', escuro ? '#0e1319' : (par ? par[0] : '#3452e1'));
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
