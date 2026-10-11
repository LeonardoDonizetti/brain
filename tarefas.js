/* Regras das tarefas do Brain: prioridade, listas (#etiqueta), repetição e subtarefas.
   Funciona no navegador e no Node (testes). Sem dependências. */
(function (root) {
  'use strict';

  const PRIORIDADES = ['Sem prioridade', 'Baixa', 'Média', 'Alta'];
  const REPETIR = { '': 'Não repete', diaria: 'Todo dia', dias_uteis: 'Dias úteis', semanal: 'Toda semana', mensal: 'Todo mês' };

  const semAcento = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const pad = (n) => String(n).padStart(2, '0');
  const isoDe = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const deIso = (s) => { const [a, m, d] = s.split('-').map(Number); return new Date(a, m - 1, d, 12); };

  /** Tira do texto as marcas rápidas: !alta !média !baixa, #lista e "todo dia / toda semana / todo mês / dias úteis". */
  function extrairMarcas(texto) {
    let t = String(texto || '');
    let prioridade = 0, lista = '', repetir = '';
    // comparar sem acento mantendo as posições: trabalhamos em cópia sem acento e cortamos o original pelos mesmos índices
    const cortaSemAcento = (re, fn) => {
      let base = semAcento(t), m;
      while ((m = re.exec(base))) {
        fn(m);
        t = t.slice(0, m.index) + ' ' + t.slice(m.index + m[0].length);
        base = semAcento(t); re.lastIndex = 0;
      }
    };
    cortaSemAcento(/(^|\s)!(alta|media|baixa)(?=\s|$)/i, (m) => { prioridade = { alta: 3, media: 2, baixa: 1 }[m[2].toLowerCase()]; });
    cortaSemAcento(/(^|\s)#([a-z0-9_-]{1,24})(?=\s|$)/i, (m) => { if (!lista) lista = m[2]; });
    cortaSemAcento(/(^|\s)(todos os dias|todo dia|diariamente)(?=\s|$)/i, () => { repetir = 'diaria'; });
    cortaSemAcento(/(^|\s)(dias uteis)(?=\s|$)/i, () => { repetir = 'dias_uteis'; });
    cortaSemAcento(/(^|\s)(toda semana|semanalmente)(?=\s|$)/i, () => { repetir = 'semanal'; });
    cortaSemAcento(/(^|\s)(todo mes|mensalmente)(?=\s|$)/i, () => { repetir = 'mensal'; });
    return { titulo: t.replace(/\s+/g, ' ').trim(), prioridade, lista, repetir };
  }

  /** Próxima data de uma tarefa que se repete (sempre depois de `data`). */
  function proximaData(data, repetir) {
    const d = deIso(data);
    if (repetir === 'diaria') d.setDate(d.getDate() + 1);
    else if (repetir === 'dias_uteis') { do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6); }
    else if (repetir === 'semanal') d.setDate(d.getDate() + 7);
    else if (repetir === 'mensal') {
      const dia = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + 1);
      const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(dia, ultimo));
    } else return null;
    return isoDe(d);
  }

  /** Aceita qualquer coisa e devolve os campos extras de uma tarefa já válidos. */
  function extras(t) {
    t = t && typeof t === 'object' ? t : {};
    const prioridade = [0, 1, 2, 3].includes(t.prioridade) ? t.prioridade : 0;
    const lista = typeof t.lista === 'string' ? t.lista.replace(/^#/, '').replace(/\s+/g, ' ').trim().slice(0, 24) : '';
    const repetir = Object.prototype.hasOwnProperty.call(REPETIR, t.repetir) ? t.repetir : '';
    const nota = typeof t.nota === 'string' ? t.nota.trim().slice(0, 500) : '';
    const subs = [];
    if (Array.isArray(t.subtarefas)) {
      let id = 1;
      for (const s of t.subtarefas.slice(0, 30)) {
        const titulo = s && typeof s.titulo === 'string' ? s.titulo.replace(/\s+/g, ' ').trim().slice(0, 120) : '';
        if (titulo) subs.push({ id: id++, titulo, feita: s.feita ? 1 : 0 });
      }
    }
    return { prioridade, lista, repetir, nota, subtarefas: subs };
  }

  /** Ordem para o dia: mais prioritária primeiro, depois horário (sem hora por último), depois a mais antiga. */
  function compararDia(a, b) {
    return (b.prioridade || 0) - (a.prioridade || 0) || (a.hora || '99:99').localeCompare(b.hora || '99:99') || (a.id - b.id);
  }

  const lib = { PRIORIDADES, REPETIR, extrairMarcas, proximaData, extras, compararDia, isoDe, deIso };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.BrainTarefas = lib;
})(typeof self !== 'undefined' ? self : this);
