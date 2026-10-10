/* Agenda: exporta tarefas para o Google Agenda (ou qualquer agenda) sem login e sem custo.
   - googleUrl(tarefa): link "adicionar evento" do Google Agenda.
   - ics(tarefas): arquivo .ics (importar no Google Agenda, Outlook, Apple Calendário). */
(function (root) {
  'use strict';
  const pad = (n) => String(n).padStart(2, '0');
  const ehData = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
  const ehHora = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s || ''));
  const compacta = (d) => d.replace(/-/g, '');
  const maisUmDia = (d) => { const [a, m, x] = d.split('-').map(Number); const n = new Date(a, m - 1, x + 1); return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`; };
  /** início e fim em horário local "flutuante" (sem fuso): o evento cai na mesma hora que você vê no Brain */
  function quando(t) {
    if (!ehData(t.data)) return null;
    if (ehHora(t.hora)) {
      const [h, mi] = t.hora.split(':').map(Number);
      const [a, m, x] = t.data.split('-').map(Number);
      const fim = new Date(a, m - 1, x, h + 1, mi);
      const f = `${fim.getFullYear()}${pad(fim.getMonth() + 1)}${pad(fim.getDate())}T${pad(fim.getHours())}${pad(fim.getMinutes())}00`;
      return { dia: false, ini: `${compacta(t.data)}T${t.hora.replace(':', '')}00`, fim: f };
    }
    return { dia: true, ini: compacta(t.data), fim: compacta(maisUmDia(t.data)) };
  }
  function googleUrl(t) {
    const q = quando(t || {});
    if (!q) return null;
    const p = new URLSearchParams({ action: 'TEMPLATE', text: String(t.titulo || 'Tarefa').slice(0, 200), dates: `${q.ini}/${q.fim}`, details: 'Criado no Brain' });
    return 'https://calendar.google.com/calendar/render?' + p.toString();
  }
  const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const dobra = (l) => { const o = []; let r = l; while (r.length > 74) { o.push(r.slice(0, 74)); r = ' ' + r.slice(74); } o.push(r); return o.join('\r\n'); };
  function ics(tarefas, opcoes) {
    opcoes = opcoes || {};
    const agora = opcoes.agora || new Date();
    const stamp = `${agora.getUTCFullYear()}${pad(agora.getUTCMonth() + 1)}${pad(agora.getUTCDate())}T${pad(agora.getUTCHours())}${pad(agora.getUTCMinutes())}${pad(agora.getUTCSeconds())}Z`;
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Brain//Tarefas//PT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Brain'];
    let n = 0;
    for (const t of tarefas || []) {
      if (!opcoes.incluirFeitas && t.feita) continue;
      const q = quando(t);
      if (!q) continue;
      n++;
      L.push('BEGIN:VEVENT', `UID:brain-${t.id}@brain.local`, `DTSTAMP:${stamp}`);
      if (q.dia) L.push(`DTSTART;VALUE=DATE:${q.ini}`, `DTEND;VALUE=DATE:${q.fim}`);
      else L.push(`DTSTART:${q.ini}`, `DTEND:${q.fim}`);
      L.push(`SUMMARY:${esc(String(t.titulo || 'Tarefa').slice(0, 200))}`);
      if (t.feita) L.push('STATUS:CONFIRMED', 'DESCRIPTION:Concluída no Brain');
      if (!q.dia && !t.feita) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Lembrete', 'TRIGGER:-PT30M', 'END:VALARM');
      L.push('END:VEVENT');
    }
    L.push('END:VCALENDAR');
    return { texto: L.map(dobra).join('\r\n') + '\r\n', eventos: n };
  }
  const api = { googleUrl, ics, quando };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.BrainAgenda = api;
})(typeof window !== 'undefined' ? window : globalThis);
