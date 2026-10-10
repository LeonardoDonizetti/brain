// Barra de navegação inferior, compartilhada por todas as páginas.
(function () {
  const svg = (conteudo) => `<svg viewBox="0 0 24 24" aria-hidden="true">${conteudo}</svg>`;
  const ABAS = [
    { href: './', nome: 'Início', icone: svg('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>') },
    {
      href: 'rotina.html', nome: 'Rotina',
      icone: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    },
    { href: 'estudos.html', nome: 'Estudos', icone: svg('<path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5z"/><path d="M4 20.5A2.5 2.5 0 006.5 23H20v-5"/><path d="M9 8h7M9 12h5"/>') },
    { href: 'jornada.html', nome: 'Jornada', icone: svg('<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>') },
    { href: 'tarefas.html', nome: 'Tarefas', icone: svg('<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>') },
    {
      href: 'financas.html', nome: 'Finanças',
      icone: svg('<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18"/><circle cx="16.5" cy="15" r="1"/>'),
    },
  ];


  // ---------- engrenagem (configurações) ----------
  const ENGRENAGEM = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>';
  const hojeIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

  const REFERENCIAS = [
    { nome: 'Todoist', url: 'https://www.todoist.com/help/todoist/features/use-the-productivity-view-in-todoist-6S63uAa9', uso: 'Visão de Produtividade: gráfico de tarefas concluídas, metas diária e semanal, dias de folga e modo férias, lista "Próximos" por dia.' },
    { nome: 'TickTick', url: 'https://blog.ticktick.com/2020/12/08/20-lesser-known-ticktick-features/', uso: 'Escolha do primeiro dia da semana (domingo, segunda ou sábado), hábitos com sequência e lembretes.' },
    { nome: 'Things 3', url: 'https://culturedcode.com/things/', uso: 'Foco na lista "Hoje", visual limpo e poucas decisões por tela.' },
    { nome: 'Notion', url: 'https://www.notion.com', uso: 'Página inicial montada por blocos que você liga e desliga.' },
    { nome: 'Apple Fitness', url: 'https://www.apple.com/watch/', uso: 'Anéis de progresso diário.' },
    { nome: 'GitHub', url: 'https://github.com', uso: 'Mapa de quadradinhos de contribuições, usado na Constância.' },
    { nome: 'Streaks', url: 'https://www.streaksapp.com', uso: 'Sequência de dias seguidos como motivação dos hábitos.' },
    { nome: 'Anki', url: 'https://apps.ankiweb.net', uso: 'Repetição espaçada: revisões agendadas em 1 dia, 1 semana, 1 mês e 3 meses.' },
    { nome: 'Pomofocus', url: 'https://pomofocus.io', uso: 'Cronômetro de foco com presets e registro do tempo estudado.' },
    { nome: 'Dunlosky et al. (2013)', url: 'https://www.aft.org/ae/fall2013/dunlosky_rawson_marsh_nathan_willingham', uso: 'Pesquisa sobre técnicas de estudo: recuperação ativa, prática espaçada e intercalada.' },
    { nome: 'Structured', url: 'https://structured.app', uso: 'Linha do tempo do dia com bloco atual em destaque e blocos coloridos.' },
    { nome: 'Google Agenda', url: 'https://calendar.google.com', uso: 'Visão semanal em colunas com linha do horário atual.' },
    { nome: 'Forest', url: 'https://www.forestapp.cc', uso: 'Anel de foco com contagem regressiva e registro das sessões.' },
    { nome: 'Modo Caverna', url: null, uso: 'Jornada por dias, avaliação diária, rotinas e renúncias (referência que você trouxe).' },
  ];
  const DIAS_LETRA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const DIAS_NOME = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const BLOCOS = [['aneis', 'Anéis de hoje'], ['barras', 'Tarefas concluídas (barras)'], ['constancia', 'Constância (mapa de dias)'], ['tabela', 'Próximas tarefas'], ['gastos', 'Gastos do mês']];
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function seg(pref, opcoes) {
    return `<div class="seg" role="group" data-pref="${pref}">${opcoes.map(([v, t]) => `<button type="button" data-v="${v}" aria-pressed="false">${t}</button>`).join('')}</div>`;
  }

  function montarEngrenagem() {
    const estilo = document.createElement('style');
    estilo.textContent = `
      .topo-config { display: flex; padding: max(.5rem, env(safe-area-inset-top)) 1rem 0; }
      .topo-config button.eng { width: 2.6rem; height: 2.6rem; border-radius: .8rem; border: 1px solid var(--line); background: var(--surface); color: var(--ink); display: grid; place-items: center; padding: 0; cursor: pointer; }
      .topo-config button.eng:hover { border-color: var(--accent); }
      dialog.cfg { border: 0; background: var(--bg); color: var(--ink); padding: 0; width: 100%; max-width: 36rem; height: 100dvh; max-height: 100dvh; margin: 0 auto; overflow: hidden; }
      dialog.cfg[open] { display: flex; flex-direction: column; }
      dialog.cfg::backdrop { background: rgba(0,0,0,.5); }
      .cfg-topo { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: max(.8rem, env(safe-area-inset-top)) 1rem .8rem; background: var(--surface); border-bottom: 1px solid var(--line); }
      .cfg-topo h2 { margin: 0; font-size: 1.15rem; color: var(--ink); text-transform: none; letter-spacing: 0; font-weight: 750; }
      .cfg-topo button { border: 1px solid var(--line); background: var(--bg); border-radius: .7rem; min-height: 2.4rem; padding: 0 .9rem; font-weight: 650; }
      .cfg-corpo { overflow-y: auto; padding: .4rem 1rem calc(2rem + env(safe-area-inset-bottom)); -webkit-overflow-scrolling: touch; }
      .cfg-corpo h3 { margin: 1.4rem 0 .5rem; font-size: .78rem; color: var(--muted); text-transform: uppercase; letter-spacing: .07em; font-weight: 650; }
      .cfg-cartao { background: var(--surface); border: 1px solid var(--line); border-radius: 1rem; padding: .3rem 1rem; }
      .cfg-linha { padding: .8rem 0; border-bottom: 1px solid var(--line); }
      .cfg-linha:last-child { border-bottom: 0; }
      .cfg-linha .rot { font-weight: 650; font-size: .95rem; }
      .cfg-linha .dica { color: var(--muted); font-size: .82rem; line-height: 1.35; margin: .15rem 0 0; }
      .cfg-linha.flex { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
      .cfg-linha .ctl { margin-top: .6rem; }
      .seg { display: flex; background: var(--bg); border-radius: .75rem; padding: .2rem; gap: .15rem; }
      .seg button { flex: 1; border: 0; background: transparent; color: var(--muted); font-weight: 650; font-size: .85rem; min-height: 2.3rem; border-radius: .6rem; padding: 0 .4rem; }
      .seg button[aria-pressed="true"] { background: var(--surface); color: var(--ink); box-shadow: 0 1px 3px rgba(0,0,0,.18); }
      .cores { display: flex; gap: .6rem; flex-wrap: wrap; }
      .cores button { width: 2.5rem; height: 2.5rem; border-radius: 50%; border: 3px solid var(--surface); box-shadow: 0 0 0 1px var(--line-strong); padding: 0; display: grid; place-items: center; color: #fff; }
      .cores button[aria-pressed="true"] { box-shadow: 0 0 0 3px var(--ink); }
      .cores svg { width: 1.1rem; height: 1.1rem; fill: none; stroke: currentColor; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; opacity: 0; }
      .cores button[aria-pressed="true"] svg { opacity: 1; }
      .passo { display: inline-flex; align-items: center; gap: .3rem; background: var(--bg); border-radius: .75rem; padding: .2rem; }
      .passo button { width: 2.3rem; height: 2.3rem; border: 0; border-radius: .6rem; background: var(--surface); font-size: 1.2rem; font-weight: 650; }
      .passo output { min-width: 2.6rem; text-align: center; font-weight: 750; font-variant-numeric: tabular-nums; }
      .dias { display: flex; gap: .35rem; }
      .dias button { flex: 1; min-height: 2.4rem; border-radius: .6rem; border: 1px solid var(--line); background: var(--surface); font-weight: 650; font-size: .85rem; }
      .dias button[aria-pressed="true"] { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
      .chave { position: relative; width: 2.9rem; height: 1.7rem; flex: none; }
      .chave input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; z-index: 1; }
      .chave span { position: absolute; inset: 0; border-radius: 1rem; background: var(--line-strong); transition: background .15s; }
      .chave span::after { content: ""; position: absolute; top: .2rem; left: .2rem; width: 1.3rem; height: 1.3rem; border-radius: 50%; background: #fff; transition: transform .15s; }
      .chave input:checked + span { background: var(--accent); }
      .chave input:checked + span::after { transform: translateX(1.2rem); }
      .chave input:focus-visible + span { outline: 3px solid var(--accent); outline-offset: 2px; }
      .cfg-botoes { display: flex; gap: .6rem; flex-wrap: wrap; margin-top: .6rem; }
      .cfg-botoes button { flex: 1 1 8rem; min-height: 2.7rem; border-radius: .75rem; border: 1px solid var(--line); background: var(--surface); font-weight: 650; }
      .cfg-botoes button.principal { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
      .cfg-botoes button.perigo { color: var(--danger); border-color: var(--danger); }
      .cfg-msg { margin: .7rem 0 0; font-size: .88rem; min-height: 1.2rem; }
      .aviso { color: var(--warm); font-weight: 650; }
      .cfg-cartao ul.refs { list-style: none; margin: 0; padding: 0; background: none; border: 0; border-radius: 0; box-shadow: none; }
      .cfg-cartao .refs li { display: block; background: none; border: 0; border-bottom: 1px solid var(--line); border-radius: 0; box-shadow: none; margin: 0; padding: .7rem 0; }
      .cfg-cartao .refs li:last-child { border-bottom: 0; }
      .refs a, .refs b { font-weight: 700; color: var(--accent); text-decoration: none; }
      .refs a::after { content: " ↗"; font-weight: 500; }
      .refs b { color: var(--ink); }
      .refs p { margin: .15rem 0 0; color: var(--muted); font-size: .84rem; line-height: 1.35; }
    `;
    document.head.append(estilo);

    // fica acima do conteúdo e rola junto com a página (some ao rolar para baixo)
    const topo = document.createElement('div');
    topo.className = 'topo-config';
    topo.innerHTML = `<button type="button" class="eng" aria-label="Configurações">${ENGRENAGEM}</button>`;
    document.body.prepend(topo);

    const P = window.BrainPrefs;
    const cores = P ? Object.entries(P.CORES) : [];
    const dlg = document.createElement('dialog');
    dlg.className = 'cfg';
    dlg.setAttribute('aria-labelledby', 'cfg-t');
    dlg.innerHTML = `
      <div class="cfg-topo"><h2 id="cfg-t">Configurações</h2><button type="button" id="cfg-fechar">Fechar</button></div>
      <div class="cfg-corpo">
        <h3>Aparência</h3>
        <div class="cfg-cartao">
          <div class="cfg-linha"><div class="rot">Tema</div><div class="ctl">${seg('tema', [['auto', 'Automático'], ['claro', 'Claro'], ['escuro', 'Escuro']])}</div></div>
          <div class="cfg-linha"><div class="rot">Cor de destaque</div><p class="dica">As últimas 7 são gradientes.</p><div class="ctl cores" id="cfg-cores">${cores.map(([k, c]) => `<button type="button" data-v="${k}" aria-pressed="false" aria-label="${c.nome}" style="background:${c.grad ? `linear-gradient(135deg, ${c.claro[0]}, ${c.claro[3]})` : (c.claro ? c.claro[0] : '#3452e1')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>`).join('')}</div></div>
        </div>

        <h3>Metas</h3>
        <div class="cfg-cartao">
          <div class="cfg-linha flex"><div><div class="rot">Meta diária</div><p class="dica">Tarefas concluídas por dia. Zero desliga.</p></div><div class="passo" data-passo="meta_diaria" data-min="0" data-max="50" data-p="1"><button type="button" data-d="-1" aria-label="Diminuir meta diária">−</button><output></output><button type="button" data-d="1" aria-label="Aumentar meta diária">+</button></div></div>
          <div class="cfg-linha flex"><div><div class="rot">Meta semanal</div><p class="dica">Tarefas concluídas por semana. Zero desliga.</p></div><div class="passo" data-passo="meta_semanal" data-min="0" data-max="300" data-p="5"><button type="button" data-d="-1" aria-label="Diminuir meta semanal">−</button><output></output><button type="button" data-d="1" aria-label="Aumentar meta semanal">+</button></div></div>
          <div class="cfg-linha"><div class="rot">Dias de folga</div><p class="dica">Nesses dias a meta não é cobrada.</p><div class="ctl dias" id="cfg-folgas">${DIAS_LETRA.map((l, i) => `<button type="button" data-d="${i}" aria-pressed="false" aria-label="${DIAS_NOME[i]}">${l}</button>`).join('')}</div></div>
          <div class="cfg-linha flex"><div><div class="rot">Modo férias</div><p class="dica">Pausa as metas sem cobrar nada.</p></div><label class="chave"><input type="checkbox" data-check="modo_ferias" aria-label="Modo férias"><span></span></label></div>
        </div>

        <h3>Coach</h3>
        <div class="cfg-cartao">
          <div class="cfg-linha flex"><div><div class="rot">Coach ligado</div><p class="dica">Incentiva suas tarefas e avisa sobre gastos. Funciona por regras no seu aparelho, sem IA paga.</p></div><label class="chave"><input type="checkbox" data-check="coach" aria-label="Coach ligado"><span></span></label></div>
          <div class="cfg-linha"><div class="rot">Tom de voz</div><div class="ctl">${seg('coach_tom', [['amigo', 'Amigo'], ['firme', 'Firme'], ['calmo', 'Calmo']])}</div></div>
          <div class="cfg-linha"><div class="rot">Avisar quando uma categoria passar de</div><p class="dica">Percentual do total gasto no mês (ex.: Alimentação).</p><div class="ctl">${seg('coach_alerta_pct', [[30, '30%'], [40, '40%'], [50, '50%'], [60, '60%']])}</div></div>
        </div>

        <h3>Calendário</h3>
        <div class="cfg-cartao">
          <div class="cfg-linha"><div class="rot">A semana começa em</div><div class="ctl">${seg('semana_inicio', [[0, 'Domingo'], [1, 'Segunda'], [6, 'Sábado']])}</div></div>
        </div>

        <h3>Página inicial</h3>
        <div class="cfg-cartao">
          ${BLOCOS.map(([k, t]) => `<div class="cfg-linha flex"><div class="rot">${t}</div><label class="chave"><input type="checkbox" data-home="${k}" aria-label="${t}"><span></span></label></div>`).join('')}
          <div class="cfg-linha"><div class="rot">Período do gráfico de barras</div><div class="ctl">${seg('periodo_grafico', [[7, '7 dias'], [14, '14 dias'], [30, '30 dias']])}</div></div>
        </div>

        <h3>Agenda (Google)</h3>
        <div class="cfg-cartao">
          <div class="cfg-linha"><div class="rot">Levar tarefas para o Google Agenda</div>
            <p class="dica">De graça e sem login: baixe o arquivo .ics e abra no celular (o Google Agenda oferece adicionar) ou importe em calendar.google.com, Configurações, Importar. Entram as tarefas pendentes que têm data. Para uma tarefa só, use "Adicionar ao Google Agenda" na edição dela.</p>
            <div class="cfg-botoes"><button type="button" class="principal" id="cfg-ics">Baixar agenda (.ics)</button></div></div>
        </div>

        <h3>Dados e backup</h3>
        <div class="cfg-cartao">
          <div class="cfg-linha"><div class="rot">Backup</div><p class="dica" id="cfg-info">Tudo fica guardado só neste aparelho.</p>
            <div class="cfg-botoes"><button type="button" class="principal" id="cfg-exportar">Salvar backup</button><button type="button" id="cfg-importar">Restaurar backup</button></div>
            <input type="file" id="cfg-arquivo" accept=".json,application/json" hidden></div>
          <div class="cfg-linha"><div class="rot">Lembrar de fazer backup</div><div class="ctl">${seg('lembrete_backup', [[7, '7 dias'], [14, '14 dias'], [30, '30 dias'], [0, 'Nunca']])}</div></div>
          <div class="cfg-linha"><div class="rot">Exportar planilha (CSV)</div><p class="dica">Abre no Excel e no Google Planilhas.</p>
            <div class="cfg-botoes"><button type="button" id="cfg-csv-tarefas">Tarefas</button><button type="button" id="cfg-csv-gastos">Gastos</button></div></div>
          <div class="cfg-linha"><div class="rot">Apagar todos os dados</div><p class="dica">Remove gastos, tarefas, rotina e jornada deste aparelho. Suas configurações ficam. Faça um backup antes.</p>
            <div class="cfg-botoes"><button type="button" class="perigo" id="cfg-apagar">Apagar tudo</button></div></div>
          <p class="cfg-msg" id="cfg-msg" role="status"></p>
        </div>

        <h3>Referências</h3>
        <div class="cfg-cartao">
          <p class="dica" style="margin:.8rem 0 .2rem">Apps e sites que inspiraram as telas e as opções do Brain.</p>
          <ul class="refs">${REFERENCIAS.map((r) => `<li>${r.url ? `<a href="${r.url}" target="_blank" rel="noopener noreferrer">${esc(r.nome)}</a>` : `<b>${esc(r.nome)}</b>`}<p>${esc(r.uso)}</p></li>`).join('')}</ul>
        </div>
        <p class="dica" style="text-align:center;margin:1.2rem 0 0;color:var(--muted);font-size:.8rem">Brain · uso pessoal · seus dados ficam só neste aparelho</p>
      </div>`;
    document.body.append(dlg);
    const $ = (id) => dlg.querySelector('#' + id);
    const L = () => window.BrainLocal;
    const msg = (t, aviso) => { const m = $('cfg-msg'); m.textContent = t; m.className = 'cfg-msg' + (aviso ? ' aviso' : ''); };

    // ---- estado dos controles ----
    function marcar() {
      if (!P) return;
      const p = P.get();
      dlg.querySelectorAll('.seg').forEach((g) => g.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(String(p[g.dataset.pref]) === b.dataset.v))));
      dlg.querySelectorAll('#cfg-cores button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === p.cor)));
      dlg.querySelectorAll('#cfg-folgas button').forEach((b) => b.setAttribute('aria-pressed', String(p.dias_folga.includes(Number(b.dataset.d)))));
      dlg.querySelectorAll('[data-passo]').forEach((g) => { g.querySelector('output').textContent = p[g.dataset.passo] === 0 ? 'Off' : p[g.dataset.passo]; });
      dlg.querySelectorAll('[data-check]').forEach((i) => { i.checked = !!p[i.dataset.check]; });
      dlg.querySelectorAll('[data-home]').forEach((i) => { i.checked = !!p.home[i.dataset.home]; });
    }
    if (P) {
      dlg.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        const g = b.closest('.seg');
        if (g) { const v = ['tema', 'coach_tom'].includes(g.dataset.pref) ? b.dataset.v : Number(b.dataset.v); P.set({ [g.dataset.pref]: v }); marcar(); return; }
        if (b.closest('#cfg-cores')) { P.set({ cor: b.dataset.v }); marcar(); return; }
        if (b.closest('#cfg-folgas')) {
          const d = Number(b.dataset.d); const atual = P.get().dias_folga;
          P.set({ dias_folga: atual.includes(d) ? atual.filter((x) => x !== d) : atual.concat(d) }); marcar(); return;
        }
        const ps = b.closest('[data-passo]');
        if (ps) {
          const k = ps.dataset.passo; const v = P.get()[k] + Number(b.dataset.d) * Number(ps.dataset.p);
          P.set({ [k]: Math.max(Number(ps.dataset.min), Math.min(Number(ps.dataset.max), v)) }); marcar();
        }
      });
      dlg.addEventListener('change', (e) => {
        const i = e.target;
        if (i.dataset.check) P.set({ [i.dataset.check]: i.checked });
        else if (i.dataset.home) P.set({ home: { [i.dataset.home]: i.checked } });
        marcar();
      });
      P.aoMudar(marcar);
    }

    async function atualizarInfo() {
      const info = $('cfg-info');
      if (!L()) { info.textContent = 'Os dados ficam no servidor do seu computador.'; return; }
      try {
        const r = await L().resumo();
        const lembrar = P ? P.get().lembrete_backup : 14;
        let t = 'Tudo fica guardado só neste aparelho.';
        let aviso = false;
        if (r.registros) {
          if (!r.ultimo_backup) { t += ' Você ainda não fez backup.'; aviso = lembrar > 0; }
          else {
            const dias = Math.round((new Date(hojeIso() + 'T12:00') - new Date(r.ultimo_backup + 'T12:00')) / 86400000);
            t += dias <= 0 ? ' Último backup: hoje.' : ` Último backup: há ${dias} dia${dias > 1 ? 's' : ''}.`;
            if (lembrar > 0 && dias >= lembrar) aviso = true;
          }
        }
        info.textContent = t;
        info.className = 'dica' + (aviso ? ' aviso' : '');
      } catch (e) {}
    }

    const abrir = () => { msg(''); marcar(); atualizarInfo(); if (!dlg.open) dlg.showModal(); };
    topo.querySelector('.eng').addEventListener('click', abrir);
    $('cfg-fechar').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

    function baixar(blob, nome) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = nome; a.rel = 'noopener';
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    }

    $('cfg-exportar').addEventListener('click', async () => {
      msg('');
      if (!L()) { msg('O backup só existe na versão do celular.'); return; }
      let texto;
      try { texto = await L().exportar(); }
      catch (e) { msg('Não consegui ler os dados do aparelho: ' + (e && e.message ? e.message : e), true); return; }
      const nome = `brain-backup-${hojeIso()}.json`;
      const blob = new Blob([texto], { type: 'application/json' });
      let feito = false;
      try {
        const arquivo = new File([blob], nome, { type: 'application/json' });
        if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
          await navigator.share({ files: [arquivo], title: 'Backup do Brain' });
          feito = true;
        }
      } catch (e) {
        if (e && e.name === 'AbortError') { msg('Compartilhamento cancelado. Toque de novo em "Salvar backup".'); return; }
      }
      if (!feito) { try { baixar(blob, nome); feito = true; } catch (e) {} }
      msg(feito ? 'Backup gerado. Confira em Downloads/Arquivos e guarde uma cópia fora do celular (e-mail, nuvem).' : 'Não consegui salvar o arquivo. Use o botão "Copiar texto do backup" abaixo.', !feito);
      if (feito) atualizarInfo();
      let c = $('cfg-copiar');
      if (!c) {
        c = document.createElement('button'); c.id = 'cfg-copiar'; c.type = 'button'; c.textContent = 'Copiar texto do backup';
        c.style.cssText = 'margin-top:.6rem;width:100%;min-height:2.7rem;border-radius:.75rem;border:1px solid var(--line);background:var(--surface);font-weight:650';
        $('cfg-msg').after(c);
      }
      c.onclick = async () => {
        try { await navigator.clipboard.writeText(texto); msg('Texto copiado. Cole em uma nota ou e-mail para você mesmo.'); }
        catch (e) { msg('O navegador não deixou copiar.', true); }
      };
    });

    $('cfg-importar').addEventListener('click', () => {
      if (!L()) { msg('O backup só existe na versão do celular.'); return; }
      $('cfg-arquivo').click();
    });
    $('cfg-arquivo').addEventListener('change', async (ev) => {
      const f = ev.target.files[0];
      ev.target.value = '';
      if (!f) return;
      if (!confirm('Restaurar vai SUBSTITUIR tudo o que está neste aparelho pelo conteúdo do arquivo. Continuar?')) return;
      try {
        const r = await L().importar(await f.text());
        msg(`Restaurado: ${r.gastos} gastos, ${r.tarefas} tarefas, ${r.itens} itens de rotina, ${r.avaliacoes} avaliações.`);
        setTimeout(() => location.reload(), 900);
      } catch (e) { msg(e.message || 'Não consegui restaurar esse arquivo.', true); }
    });

    // ---- CSV (ponto e vírgula + BOM: abre direto no Excel em português) ----
    const celula = (v) => {
      let t = v === null || v === undefined ? '' : String(v);
      if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; // evita fórmulas em planilhas
      return /[";\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
    };
    const csv = (cab, linhas) => '﻿' + [cab, ...linhas].map((l) => l.map(celula).join(';')).join('\r\n') + '\r\n';
    async function exportarCsv(tipo) {
      if (!L()) { msg('A planilha só existe na versão do celular.'); return; }
      try {
        const d = await L().copia();
        const nome = `brain-${tipo}-${hojeIso()}.csv`;
        const texto = tipo === 'tarefas'
          ? csv(['Dia', 'Hora', 'Tarefa', 'Concluída', 'Concluída em'], d.tarefas.slice().sort((a, b) => (a.data || '9999').localeCompare(b.data || '9999')).map((t) => [t.data, t.hora, t.titulo, t.feita ? 'sim' : 'não', t.concluida_em]))
          : csv(['Data', 'Tipo', 'Valor', 'Categoria', 'Descrição'], d.gastos.slice().sort((a, b) => a.data.localeCompare(b.data)).map((g) => [g.data, g.tipo === 'receita' ? 'Entrada' : 'Gasto', String(g.valor).replace('.', ','), g.categoria, g.descricao]));
        baixar(new Blob([texto], { type: 'text/csv;charset=utf-8' }), nome);
        msg(`Planilha de ${tipo} gerada (${tipo === 'tarefas' ? d.tarefas.length : d.gastos.length} linhas).`);
      } catch (e) { msg('Não consegui gerar a planilha.', true); }
    }
    $('cfg-ics').addEventListener('click', async () => {
      if (!L()) { msg('Isso só existe na versão do celular.'); return; }
      try {
        if (!window.BrainAgenda) await new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'agenda.js'; s.onload = ok; s.onerror = no; document.head.append(s); });
        const d = await L().copia();
        const r = window.BrainAgenda.ics(d.tarefas);
        if (!r.eventos) { msg('Nenhuma tarefa pendente com data para exportar.', true); return; }
        baixar(new Blob([r.texto], { type: 'text/calendar;charset=utf-8' }), `brain-agenda-${hojeIso()}.ics`);
        msg(`Agenda gerada com ${r.eventos} ${r.eventos === 1 ? 'evento' : 'eventos'}.`);
      } catch (e) { msg('Não consegui gerar a agenda.', true); }
    });
    $('cfg-csv-tarefas').addEventListener('click', () => exportarCsv('tarefas'));
    $('cfg-csv-gastos').addEventListener('click', () => exportarCsv('gastos'));

    $('cfg-apagar').addEventListener('click', async () => {
      if (!L()) { msg('Isso só existe na versão do celular.'); return; }
      const r = prompt('Isto apaga TODOS os gastos, tarefas, rotina e jornada deste aparelho e não dá para desfazer.\n\nPara confirmar, digite APAGAR:');
      if (r === null) return;
      if (r.trim().toUpperCase() !== 'APAGAR') { msg('Nada foi apagado: a palavra não confere.', true); return; }
      try { await L().apagarTudo(); msg('Tudo foi apagado.'); setTimeout(() => location.reload(), 700); }
      catch (e) { msg('Não consegui apagar.', true); }
    });

    if (L()) L().persistir();
  }

  function montar() {
    montarEngrenagem();
    const arq = location.pathname.split('/').pop();
    const atual = !arq || arq === 'index.html' ? './' : arq;
    const nav = document.createElement('nav');
    nav.className = 'tabbar';
    nav.setAttribute('aria-label', 'Navegação principal');
    const caixa = document.createElement('div');
    caixa.className = 'tabs';
    ABAS.forEach((aba) => {
      const a = document.createElement('a');
      a.href = aba.href;
      a.innerHTML = aba.icone + '<span></span>';
      a.querySelector('span').textContent = aba.nome;
      if (aba.href === atual) { a.setAttribute('aria-current', 'page'); a.insertAdjacentHTML('afterbegin', '<i class="ind" aria-hidden="true"></i>'); }
      caixa.append(a);
    });
    nav.append(caixa);
    document.body.append(nav);
  }

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar);
  else montar();
})();
