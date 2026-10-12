/* Lembretes do Brain: notificações LOCAIS (sem servidor, sem custo) que o próprio celular dispara, mesmo com o app fechado.
   Funciona no app Android (APK, plugin Local Notifications do Capacitor). No navegador não há como avisar com o app fechado.
   O planejamento (planejar) é uma função pura e testável: recebe os dados e devolve a lista de avisos futuros.
   A cada abertura do app (e a cada mudança) os avisos são recalculados, então o que você já fez não é cobrado. */
(function (raiz) {
  'use strict';

  const CHAVE = 'brain-notif';
  const PADRAO = {
    ativo: false,
    ofensiva: true, h1: '15:00', h2: '18:00',   // lembrete da ofensiva: uma de tarde e uma perto do fim do dia
    tarefas: true, tarefas_hora: '08:00',       // tarefas só com data: um resumo de manhã; tarefas com hora: no horário
    antes_tarefa: 10,                           // minutos de antecedência para tarefas com hora
    rotina: true, antes_rotina: 5,              // itens da rotina com horário
    estudos: true, antes_estudo: 5,             // blocos de estudo do plano semanal
  };
  const MAX = 60;           // o Android guarda poucos alarmes pendentes: ficam os mais próximos
  const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
  const DIAS_OFENSIVA = 7, DIAS_ROTINA = 3, DIAS_ESTUDO = 7, DIAS_TAREFA = 7;

  const p2 = (n) => String(n).padStart(2, '0');
  const isoDe = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  const dia = (base, add) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + add, 12, 0, 0);
  const em = (d, hhmm, menosMin) => { const [h, m] = hhmm.split(':').map(Number); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m - (menosMin || 0), 0); };
  const dataBR = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7);
  function idDe(chave) { let h = 5381; for (let i = 0; i < chave.length; i++) h = ((h * 33) ^ chave.charCodeAt(i)) >>> 0; return (h % 2147483000) + 100; }

  function limpar(p) {
    const o = Object.assign({}, PADRAO, p || {});
    for (const k of ['ativo', 'ofensiva', 'tarefas', 'rotina', 'estudos']) o[k] = o[k] === true;
    for (const k of ['h1', 'h2', 'tarefas_hora']) if (!HORA.test(String(o[k]))) o[k] = PADRAO[k];
    for (const [k, max] of [['antes_tarefa', 120], ['antes_rotina', 120], ['antes_estudo', 120]]) { const n = Math.round(Number(o[k])); o[k] = n >= 0 && n <= max ? n : PADRAO[k]; }
    return o;
  }

  const MSG_TARDE = [
    ['Sua ofensiva está de pé 🔥', 'Ainda dá tempo de fazer algo hoje. Uma tarefa já conta!'],
    ['Um passo pequeno mantém a ofensiva', 'Conclua uma tarefa ou marque um item da rotina.'],
    ['Hoje ainda não contou', 'Escolha a tarefa mais fácil e comece por ela.'],
  ];
  const MSG_NOITE = [
    ['⏳ Última chamada da ofensiva', 'Falta pouco para o dia acabar. Faça uma tarefa antes de dormir!'],
    ['Não deixe a ofensiva cair hoje', 'Cinco minutos já resolvem: conclua uma tarefa.'],
    ['Ainda dá tempo!', 'Marque um item da rotina ou termine uma tarefa pendente.'],
  ];

  /** dados: { tarefas:[{titulo,data,hora,feita}], rotina:[{id,titulo,hora,feito}] (de hoje), blocos:[{dia,ini,titulo,tipo}],
   *           jogo:{ativo_hoje, sequencia}, folgas:[0-6], ferias:boolean }
   *  Devolve [{ id, quando: Date, titulo, corpo, pagina, tipo }], ordenado e limitado. */
  function planejar({ agora, prefs, dados }) {
    const p = limpar(prefs);
    if (!p.ativo) return [];
    const d = dados || {}, hoje = dia(agora, 0), hojeIso = isoDe(hoje);
    const minimo = agora.getTime() + 20000;
    const lista = [];
    const add = (chave, quando, titulo, corpo, pagina, tipo) => { if (quando.getTime() > minimo) lista.push({ id: idDe(chave), quando, titulo, corpo, pagina, tipo }); };

    if (p.ofensiva && !d.ferias) {
      const horas = [...new Set([p.h1, p.h2])].sort();
      const folgas = new Set(d.folgas || []);
      const jogo = d.jogo || {};
      for (let k = 0; k < DIAS_OFENSIVA; k++) {
        const dd = dia(hoje, k);
        if (folgas.has(dd.getDay())) continue;
        if (k === 0 && jogo.ativo_hoje) continue;
        horas.forEach((h, i) => {
          const ultimo = horas.length > 1 && i === horas.length - 1;
          const varia = (ultimo ? MSG_NOITE : MSG_TARDE)[(dd.getDate() + i) % 3];
          let [t, c] = varia;
          const seq = Number(jogo.sequencia) || 0;
          if (k === 0 && seq > 0 && !ultimo) { t = `Sua ofensiva de ${seq} ${seq === 1 ? 'dia' : 'dias'} 🔥`; c = 'Ainda dá tempo de fazer algo hoje. Uma tarefa já conta!'; }
          if (k === 0 && seq > 0 && ultimo) { t = `⏳ ${seq} ${seq === 1 ? 'dia' : 'dias'} de ofensiva em jogo`; c = 'Falta pouco para o dia acabar. Faça uma tarefa antes de dormir!'; }
          if (k === 0 && seq === 0) { t = ultimo ? 'Ainda dá tempo de começar uma ofensiva' : 'Que tal começar uma ofensiva hoje?'; c = 'Conclua uma tarefa e a sequência começa.'; }
          add(`of|${isoDe(dd)}|${h}`, em(dd, h), t, c, 'tarefas.html', 'ofensiva');
        });
      }
    }

    if (p.tarefas) {
      const porDia = new Map();
      for (const t of d.tarefas || []) {
        if (t.feita || !t.data || t.data < hojeIso || t.data > isoDe(dia(hoje, DIAS_TAREFA))) continue;
        if (t.hora && HORA.test(t.hora)) {
          const alvo = new Date(t.data + 'T12:00:00');
          const antes = p.antes_tarefa;
          add(`tf|${t.id || t.titulo}|${t.data}|${t.hora}`, em(alvo, t.hora, antes), `📌 ${t.titulo}`, antes > 0 ? `Marcada para ${t.hora} (daqui a ${antes} min).` : `Marcada para agora (${t.hora}).`, 'tarefas.html', 'tarefa');
        } else {
          if (!porDia.has(t.data)) porDia.set(t.data, []);
          porDia.get(t.data).push(t.titulo);
        }
      }
      for (const [data, titulos] of porDia) {
        const alvo = new Date(data + 'T12:00:00');
        const eHoje = data === hojeIso;
        const t = titulos.length === 1 ? (eHoje ? 'Tarefa para hoje' : `Tarefa de ${dataBR(data)}`) : (eHoje ? `${titulos.length} tarefas para hoje` : `${titulos.length} tarefas em ${dataBR(data)}`);
        const c = titulos.slice(0, 3).join(' · ') + (titulos.length > 3 ? ` e mais ${titulos.length - 3}` : '');
        add(`tg|${data}`, em(alvo, p.tarefas_hora), t, c, 'tarefas.html', 'tarefa');
      }
    }

    if (p.rotina) {
      for (let k = 0; k < DIAS_ROTINA; k++) {
        const dd = dia(hoje, k);
        for (const i of d.rotina || []) {
          if (!i.hora || !HORA.test(i.hora) || (k === 0 && i.feito)) continue;
          const antes = p.antes_rotina;
          add(`rt|${i.id}|${isoDe(dd)}`, em(dd, i.hora, antes), i.titulo, antes > 0 ? `Rotina às ${i.hora} (daqui a ${antes} min).` : `Hora da rotina (${i.hora}).`, 'rotina.html', 'rotina');
        }
      }
    }

    if (p.estudos) {
      for (let k = 0; k < DIAS_ESTUDO; k++) {
        const dd = dia(hoje, k);
        for (const b of d.blocos || []) {
          if (b.tipo !== 'estudo' || b.dia !== dd.getDay() || !HORA.test(b.ini || '')) continue;
          const antes = p.antes_estudo;
          add(`es|${b.dia}|${b.ini}|${b.titulo}|${isoDe(dd)}`, em(dd, b.ini, antes), `📚 ${b.titulo}`, antes > 0 ? `Sessão de estudo às ${b.ini} (daqui a ${antes} min).` : `Hora de estudar (${b.ini}).`, 'estudos.html', 'estudo');
        }
      }
    }

    lista.sort((a, b) => a.quando - b.quando || a.id - b.id);
    const vistos = new Set();
    return lista.filter((n) => (vistos.has(n.id) ? false : (vistos.add(n.id), true))).slice(0, MAX);
  }

  // ------------------------------------------------------------------ parte do aparelho (só no navegador/app)
  const API = { PADRAO, limpar, planejar, idDe };
  if (typeof window === 'undefined') { if (typeof module === 'object' && module.exports) module.exports = API; else raiz.BrainNotif = API; return; }

  const ler = () => { try { return limpar(JSON.parse(localStorage.getItem(CHAVE) || '{}')); } catch (e) { return limpar({}); } };
  const gravar = (p) => { try { localStorage.setItem(CHAVE, JSON.stringify(limpar(p))); } catch (e) { /* sem armazenamento */ } };
  const plugin = () => { const c = window.Capacitor; return c && c.isNativePlatform && c.isNativePlatform() && c.Plugins && c.Plugins.LocalNotifications ? c.Plugins.LocalNotifications : null; };
  const disponivel = () => !!plugin();
  const json = async (url) => { const r = await window.fetch(url); if (!r.ok) throw new Error(url); return r.json(); };

  async function coletar() {
    const [t, r, e, j, pr] = await Promise.all([json('/api/tarefas'), json('/api/rotina'), json('/api/estudos'), json('/api/jogo'), json('/api/preferencias')]);
    const prefs = (pr && pr.preferencias) || {};
    return {
      tarefas: t.tarefas || [], rotina: r.itens || r.rotina || [], blocos: ((e.estudos || e).blocos) || [],
      jogo: { ativo_hoje: !!j.ativo_hoje, sequencia: j.sequencia || 0 }, folgas: prefs.dias_folga || [], ferias: !!prefs.modo_ferias,
    };
  }

  let fila = Promise.resolve(), ouvindo = false;
  function sincronizar() {
    fila = fila.then(async () => {
      const LN = plugin(); if (!LN) return { nativo: false };
      const p = ler();
      try {
        const pend = await LN.getPending();
        if (pend && pend.notifications && pend.notifications.length) await LN.cancel({ notifications: pend.notifications.map((n) => ({ id: n.id })) });
        if (!p.ativo) return { nativo: true, agendadas: 0 };
        const perm = await LN.checkPermissions();
        if (perm.display !== 'granted') return { nativo: true, agendadas: 0, semPermissao: true };
        const plano = planejar({ agora: new Date(), prefs: p, dados: await coletar() });
        if (!ouvindo) {
          ouvindo = true;
          try { LN.addListener('localNotificationActionPerformed', (ev) => { const pg = ev && ev.notification && ev.notification.extra && ev.notification.extra.pagina; if (pg && !location.pathname.endsWith(pg)) location.href = pg; }); } catch (e) { /* sem ouvinte */ }
        }
        try { await LN.createChannel({ id: 'brain-lembretes', name: 'Lembretes do Brain', description: 'Ofensiva, tarefas, rotina e estudos', importance: 4, visibility: 1, vibration: true }); } catch (e) { /* canal já existe */ }
        if (plano.length) await LN.schedule({ notifications: plano.map((n) => ({ id: n.id, title: n.titulo, body: n.corpo, channelId: 'brain-lembretes', smallIcon: 'ic_stat_brain', schedule: { at: n.quando, allowWhileIdle: true }, extra: { pagina: n.pagina, tipo: n.tipo } })) });
        return { nativo: true, agendadas: plano.length };
      } catch (e) { return { nativo: true, erro: String((e && e.message) || e) }; }
    });
    return fila;
  }
  let timer = null;
  const logo = (ms) => { clearTimeout(timer); timer = setTimeout(sincronizar, ms); };

  async function ativar() {
    const LN = plugin(); if (!LN) return { ok: false, motivo: 'Os lembretes funcionam no app Android (APK).' };
    let perm = await LN.checkPermissions();
    if (perm.display !== 'granted') perm = await LN.requestPermissions();
    if (perm.display !== 'granted') return { ok: false, motivo: 'O Android bloqueou as notificações. Libere em Configurações do celular > Apps > Brain > Notificações.' };
    gravar(Object.assign(ler(), { ativo: true }));
    const r = await sincronizar();
    return { ok: true, agendadas: r && r.agendadas };
  }
  async function desativar() { gravar(Object.assign(ler(), { ativo: false })); await sincronizar(); }
  async function salvar(parcial) { gravar(Object.assign(ler(), parcial)); return sincronizar(); }
  async function testar() {
    const LN = plugin(); if (!LN) return false;
    const perm = await LN.checkPermissions(); if (perm.display !== 'granted') return false;
    try { await LN.createChannel({ id: 'brain-lembretes', name: 'Lembretes do Brain', importance: 4, visibility: 1, vibration: true }); } catch (e) { /* ok */ }
    await LN.schedule({ notifications: [{ id: 99, title: 'Tudo certo por aqui 🎉', body: 'Os lembretes do Brain estão funcionando.', channelId: 'brain-lembretes', smallIcon: 'ic_stat_brain', schedule: { at: new Date(Date.now() + 3000), allowWhileIdle: true }, extra: { pagina: 'index.html' } }] });
    return true;
  }

  /** Monta a seção "Lembretes" dentro de `el` (usada nas Configurações). */
  function montarConfig(el) {
    const nat = disponivel();
    const p = ler();
    const op = (v, atual, rot) => `<option value="${v}"${v === atual ? ' selected' : ''}>${rot}</option>`;
    const antes = (atual) => [0, 5, 10, 15, 30].map((v) => op(v, atual, v ? v + ' min antes' : 'na hora')).join('');
    const sw = (id, on, rot) => `<label class="chave"><input type="checkbox" id="${id}" ${on ? 'checked' : ''} aria-label="${rot}"><span></span></label>`;
    el.innerHTML = `
      <div class="cfg-linha flex"><div><div class="rot">Lembretes no celular</div><p class="dica" id="nt-dica">${nat ? 'Avisos que aparecem mesmo com o app fechado. Tudo fica no seu aparelho, sem custo.' : 'Disponível no app Android (APK). No navegador, o aviso só apareceria com a página aberta, então fica desligado.'}</p></div>${sw('nt-ativo', p.ativo && nat, 'Ativar lembretes')}</div>
      <div id="nt-opcoes" ${p.ativo && nat ? '' : 'hidden'}>
        <div class="cfg-linha flex"><div><div class="rot">Ofensiva</div><p class="dica">Avisa se o dia ainda não contou. Se você já fez, não avisa.</p><div class="nt-horas"><label>De tarde <input type="time" id="nt-h1" value="${p.h1}"></label><label>No fim do dia <input type="time" id="nt-h2" value="${p.h2}"></label></div></div>${sw('nt-of', p.ofensiva, 'Lembrete da ofensiva')}</div>
        <div class="cfg-linha flex"><div><div class="rot">Tarefas</div><p class="dica">No horário da tarefa. As que têm só a data entram num resumo de manhã.</p><div class="nt-horas"><label>Aviso <select id="nt-at">${antes(p.antes_tarefa)}</select></label><label>Resumo do dia <input type="time" id="nt-th" value="${p.tarefas_hora}"></label></div></div>${sw('nt-tf', p.tarefas, 'Lembrete de tarefas')}</div>
        <div class="cfg-linha flex"><div><div class="rot">Rotina</div><p class="dica">Itens da rotina que têm horário.</p><div class="nt-horas"><label>Aviso <select id="nt-ar">${antes(p.antes_rotina)}</select></label></div></div>${sw('nt-rt', p.rotina, 'Lembrete da rotina')}</div>
        <div class="cfg-linha flex"><div><div class="rot">Estudos</div><p class="dica">Sessões do seu plano de estudos.</p><div class="nt-horas"><label>Aviso <select id="nt-ae">${antes(p.antes_estudo)}</select></label></div></div>${sw('nt-es', p.estudos, 'Lembrete de estudos')}</div>
        <div class="cfg-linha"><div class="cfg-botoes"><button type="button" id="nt-testar">Enviar um aviso de teste</button></div><p class="dica" id="nt-st" role="status"></p></div>
      </div>`;
    if (!document.getElementById('nt-css')) {
      const s = document.createElement('style'); s.id = 'nt-css';
      s.textContent = '.nt-horas { display: flex; gap: .7rem; flex-wrap: wrap; margin-top: .55rem; } .nt-horas label { display: grid; gap: .2rem; font-size: .8rem; color: var(--muted); } .nt-horas input, .nt-horas select { font: inherit; padding: .45rem .55rem; border-radius: .6rem; border: 1px solid var(--line); background: var(--surface, #fff); color: var(--ink, inherit); min-height: 2.4rem; }';
      document.head.append(s);
    }
    const $ = (id) => el.querySelector('#' + id), st = $('nt-st');
    const msg = (t) => { if (st) st.textContent = t; };
    $('nt-ativo').onchange = async (e) => {
      if (!nat) { e.target.checked = false; return; }
      if (e.target.checked) {
        const r = await ativar();
        if (!r.ok) { e.target.checked = false; msg(r.motivo); $('nt-dica').textContent = r.motivo; return; }
        $('nt-opcoes').hidden = false; msg(r.agendadas ? `Pronto: ${r.agendadas} avisos agendados.` : 'Pronto. Os avisos aparecem conforme você usar o app.');
      } else { await desativar(); $('nt-opcoes').hidden = true; }
    };
    const liga = (id, campo, tipo) => { $(id).onchange = async () => { const el2 = $(id); await salvar({ [campo]: tipo === 'chk' ? el2.checked : tipo === 'num' ? Number(el2.value) : el2.value }); msg('Salvo.'); }; };
    liga('nt-of', 'ofensiva', 'chk'); liga('nt-h1', 'h1'); liga('nt-h2', 'h2'); liga('nt-tf', 'tarefas', 'chk'); liga('nt-at', 'antes_tarefa', 'num'); liga('nt-th', 'tarefas_hora');
    liga('nt-rt', 'rotina', 'chk'); liga('nt-ar', 'antes_rotina', 'num'); liga('nt-es', 'estudos', 'chk'); liga('nt-ae', 'antes_estudo', 'num');
    $('nt-testar').onclick = async () => { msg((await testar()) ? 'Enviando... o aviso chega em 3 segundos.' : 'Não consegui: confira a permissão de notificações do celular.'); };
  }

  Object.assign(API, { ler, salvar, ativar, desativar, testar, sincronizar, montarConfig, disponivel });
  raiz.BrainNotif = API;
  // recalcula ao abrir, ao voltar para o app e quando algo muda (tarefa feita, item da rotina marcado...)
  const iniciar = () => { logo(1500); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
  window.addEventListener('brain-mudou', () => logo(1200));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') logo(800); });
})(typeof window !== 'undefined' ? window : globalThis);
