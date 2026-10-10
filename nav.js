// Barra de navegação inferior, compartilhada por todas as páginas.
(function () {
  const svg = (conteudo) => `<svg viewBox="0 0 24 24" aria-hidden="true">${conteudo}</svg>`;
  const ABAS = [
    { href: './', nome: 'Início', icone: svg('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>') },
    {
      href: 'rotina.html', nome: 'Rotina',
      icone: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    },
    { href: 'jornada.html', nome: 'Jornada', icone: svg('<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>') },
    { href: 'tarefas.html', nome: 'Tarefas', icone: svg('<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>') },
    {
      href: 'financas.html', nome: 'Finanças',
      icone: svg('<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18"/><circle cx="16.5" cy="15" r="1"/>'),
    },
  ];


  // ---------- engrenagem (configurações e backup) ----------
  const ENGRENAGEM = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>';
  const hojeIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

  function montarEngrenagem() {
    const estilo = document.createElement('style');
    estilo.textContent = `
      .topo-config { display: flex; padding: max(.5rem, env(safe-area-inset-top)) 1rem 0; }
      .topo-config button.eng { width: 2.6rem; height: 2.6rem; border-radius: .8rem; border: 1px solid var(--line); background: var(--surface); color: var(--ink); display: grid; place-items: center; padding: 0; cursor: pointer; }
      .topo-config button.eng:hover { border-color: var(--accent); }
      dialog.cfg { border: 1px solid var(--line); border-radius: 1.1rem; background: var(--surface); color: var(--ink); padding: 1.2rem; width: min(92vw, 26rem); }
      dialog.cfg::backdrop { background: rgba(0,0,0,.45); }
      dialog.cfg h2 { margin: 0 0 .2rem; font-size: 1.15rem; }
      dialog.cfg h3 { margin: 1.1rem 0 .15rem; font-size: .95rem; }
      dialog.cfg p { margin: .2rem 0 .7rem; color: var(--muted); font-size: .88rem; line-height: 1.4; }
      dialog.cfg p.aviso { color: #b45309; font-weight: 650; }
      dialog.cfg .linha { display: flex; gap: .6rem; flex-wrap: wrap; }
      dialog.cfg button { flex: 1 1 8rem; min-height: 2.7rem; border-radius: .75rem; border: 1px solid var(--line); background: var(--surface); color: var(--ink); font: inherit; font-weight: 650; cursor: pointer; }
      dialog.cfg button.principal { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
      dialog.cfg button.fechar { width: 100%; margin-top: 1rem; }
      dialog.cfg .msg { margin: .7rem 0 0; font-size: .88rem; color: var(--ink); }
    `;
    document.head.append(estilo);

    // fica no fim do que está acima do conteúdo, rola junto com a página (some ao rolar para baixo)
    const topo = document.createElement('div');
    topo.className = 'topo-config';
    topo.innerHTML = `<button type="button" class="eng" aria-label="Configurações e backup">${ENGRENAGEM}</button>`;
    document.body.prepend(topo);

    const dlg = document.createElement('dialog');
    dlg.className = 'cfg';
    dlg.setAttribute('aria-labelledby', 'cfg-t');
    dlg.innerHTML = `
      <h2 id="cfg-t">Configurações</h2>
      <h3>Backup dos dados</h3>
      <p id="cfg-info">Tudo fica guardado só neste aparelho.</p>
      <div class="linha">
        <button type="button" class="principal" id="cfg-exportar">Salvar backup</button>
        <button type="button" id="cfg-importar">Restaurar backup</button>
      </div>
      <input type="file" id="cfg-arquivo" accept=".json,application/json" hidden>
      <p class="msg" id="cfg-msg" role="status"></p>
      <button type="button" class="fechar" id="cfg-fechar">Fechar</button>`;
    document.body.append(dlg);
    const $ = (id) => dlg.querySelector('#' + id);
    const L = () => window.BrainLocal;

    async function atualizarInfo() {
      const info = $('cfg-info');
      if (!L()) { info.textContent = 'Os dados ficam no servidor do seu computador.'; return; }
      try {
        const r = await L().resumo();
        let t = 'Tudo fica guardado só neste aparelho.';
        let aviso = false;
        if (r.registros) {
          if (!r.ultimo_backup) { t += ' Você ainda não fez backup.'; aviso = true; }
          else {
            const dias = Math.round((new Date(hojeIso() + 'T12:00') - new Date(r.ultimo_backup + 'T12:00')) / 86400000);
            t += dias <= 0 ? ' Último backup: hoje.' : ` Último backup: há ${dias} dia${dias > 1 ? 's' : ''}.`;
            if (dias >= 14) aviso = true;
          }
        }
        info.textContent = t;
        info.className = aviso ? 'aviso' : '';
      } catch (e) {}
    }

    topo.querySelector('.eng').addEventListener('click', () => { $('cfg-msg').textContent = ''; atualizarInfo(); dlg.showModal(); });
    $('cfg-fechar').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

    function baixar(blob, nome) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = nome; a.rel = 'noopener';
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    }

    $('cfg-exportar').addEventListener('click', async () => {
      const msg = $('cfg-msg');
      msg.textContent = '';
      if (!L()) { msg.textContent = 'O backup só existe na versão do celular.'; return; }
      let texto;
      try { texto = await L().exportar(); }
      catch (e) { msg.textContent = 'Não consegui ler os dados do aparelho: ' + (e && e.message ? e.message : e); return; }
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
        if (e && e.name === 'AbortError') { msg.textContent = 'Compartilhamento cancelado. Toque de novo em "Salvar backup".'; return; }
      }
      if (!feito) { try { baixar(blob, nome); feito = true; } catch (e) {} }
      msg.textContent = feito
        ? 'Backup gerado. Confira em Downloads/Arquivos e guarde uma cópia fora do celular (e-mail, nuvem).'
        : 'Não consegui salvar o arquivo. Use o botão "Copiar texto do backup" abaixo.';
      if (feito) atualizarInfo();
      let c = $('cfg-copiar');
      if (!c) {
        c = document.createElement('button'); c.id = 'cfg-copiar'; c.type = 'button'; c.textContent = 'Copiar texto do backup';
        c.style.cssText = 'margin-top:.6rem;width:100%';
        msg.after(c);
      }
      c.onclick = async () => {
        try { await navigator.clipboard.writeText(texto); msg.textContent = 'Texto copiado. Cole em uma nota ou e-mail para você mesmo.'; }
        catch (e) { msg.textContent = 'O navegador não deixou copiar.'; }
      };
    });

    $('cfg-importar').addEventListener('click', () => {
      if (!L()) { $('cfg-msg').textContent = 'O backup só existe na versão do celular.'; return; }
      $('cfg-arquivo').click();
    });
    $('cfg-arquivo').addEventListener('change', async (ev) => {
      const f = ev.target.files[0];
      ev.target.value = '';
      if (!f) return;
      if (!confirm('Restaurar vai SUBSTITUIR tudo o que está neste aparelho pelo conteúdo do arquivo. Continuar?')) return;
      try {
        const r = await L().importar(await f.text());
        $('cfg-msg').textContent = `Restaurado: ${r.gastos} gastos, ${r.tarefas} tarefas, ${r.itens} itens de rotina, ${r.avaliacoes} avaliações.`;
        setTimeout(() => location.reload(), 900);
      } catch (e) { $('cfg-msg').textContent = e.message || 'Não consegui restaurar esse arquivo.'; }
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
      if (aba.href === atual) a.setAttribute('aria-current', 'page');
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
