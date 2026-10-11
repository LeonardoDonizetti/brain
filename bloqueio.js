/* Tela de bloqueio, bloqueio automático e a parte "Segurança" das configurações.
   Depende de api-local.js (BrainLocal.cofre) e cofre.js. Só roda no navegador. */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  const W = window;
  const ls = { get: (k) => { try { return W.localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { W.localStorage.setItem(k, v); } catch (e) { /* sem armazenamento */ } }, del: (k) => { try { W.localStorage.removeItem(k); } catch (e) { /* sem armazenamento */ } } };
  const ss = { get: (k) => { try { return W.sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { W.sessionStorage.setItem(k, v); } catch (e) { /* sem sessão */ } } };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const L = () => W.BrainLocal && W.BrainLocal.cofre;
  const limiteMin = () => { try { const v = W.BrainPrefs && W.BrainPrefs.get().bloqueio_min; return [0, 1, 5, 15].includes(v) ? v : 1; } catch (e) { return 1; } };

  // ---- cobertura imediata (evita mostrar dados antes de saber se está bloqueado) ----
  const css = document.createElement('style');
  css.textContent = 'html.bk body > *:not(#bk), html.bk-priv body > *:not(#bk) { visibility: hidden !important; }'
    + '#bk { position: fixed; inset: 0; z-index: 99999; background: var(--bg, #f6f7f8); color: var(--ink, #16191d); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1.5rem; box-sizing: border-box; font-family: inherit; }'
    + '#bk .bk-in { width: 100%; max-width: 20rem; text-align: center; }'
    + '#bk h1 { font-size: 1.5rem; margin: .8rem 0 .2rem; letter-spacing: -.02em; }'
    + '#bk p { color: var(--muted, #5d6671); font-size: .92rem; margin: .2rem 0 1rem; line-height: 1.45; }'
    + '#bk input { width: 100%; box-sizing: border-box; font: inherit; font-size: 1.15rem; text-align: center; padding: .8rem; border-radius: .7rem; border: 1px solid var(--line-strong, #ccd1d8); background: var(--surface, #fff); color: inherit; min-height: 3rem; }'
    + '#bk button { width: 100%; font: inherit; font-weight: 600; min-height: 3rem; border-radius: .7rem; border: 0; margin-top: .6rem; cursor: pointer; background: var(--accent, #0b5f73); color: var(--on-accent, #fff); }'
    + '#bk button.sec { background: none; color: var(--muted, #5d6671); font-weight: 500; min-height: 2.75rem; font-size: .88rem; text-decoration: underline; }'
    + '#bk .bk-erro { color: var(--danger, #b3261e); min-height: 1.3em; font-size: .88rem; margin: .5rem 0 0; }'
    + '#bk svg { width: 2.6rem; height: 2.6rem; color: var(--accent, #0b5f73); }';
  document.head.appendChild(css);

  let estaBloqueado = false;
  const chaveNaSessao = () => !!ss.get('brain-kx');
  if (ls.get('brain-cofre') === '1' && !chaveNaSessao()) document.documentElement.classList.add('bk');

  // ---- tela de bloqueio ----
  const tentativas = () => ({ n: Number(ls.get('brain-bk-n') || 0), ate: Number(ls.get('brain-bk-ate') || 0) });
  function mostrarBloqueio() {
    if (document.getElementById('bk')) return;
    estaBloqueado = true;
    document.querySelectorAll('dialog[open]').forEach((d) => { try { d.close(); } catch (e) { /* já fechado */ } });
    document.documentElement.classList.add('bk');
    const num = ls.get('brain-cofre-num') === '1';
    const el = document.createElement('div'); el.id = 'bk'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Brain bloqueado');
    el.innerHTML = '<div class="bk-in"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>'
      + '<h1>Brain bloqueado</h1><p>Digite sua ' + (num ? 'senha numérica' : 'senha') + ' para abrir.</p>'
      + '<form id="bk-f"><label for="bk-s" style="position:absolute;left:-9999px">Senha</label><input id="bk-s" type="password" autocomplete="current-password" ' + (num ? 'inputmode="numeric" ' : '') + 'maxlength="64" required>'
      + '<p class="bk-erro" id="bk-e" role="alert"></p><button type="submit" id="bk-ok">Desbloquear</button></form>'
      + '<button type="button" class="sec" id="bk-esq">Esqueci a senha</button></div>';
    document.body.appendChild(el);
    const inp = el.querySelector('#bk-s'); const err = el.querySelector('#bk-e'); const btn = el.querySelector('#bk-ok');
    setTimeout(() => { try { inp.focus(); } catch (e) { /* sem foco */ } }, 50);
    let espera = null;
    const checarEspera = () => {
      const t = tentativas(); const resta = Math.ceil((t.ate - Date.now()) / 1000);
      if (resta > 0) { btn.disabled = true; err.textContent = `Muitas tentativas. Aguarde ${resta}s.`; espera = setTimeout(checarEspera, 1000); }
      else { btn.disabled = false; if (/Aguarde/.test(err.textContent)) err.textContent = ''; }
    };
    checarEspera();
    el.querySelector('#bk-f').addEventListener('submit', async (ev) => {
      ev.preventDefault(); if (btn.disabled) return;
      btn.disabled = true; err.textContent = '';
      try {
        await L().desbloquear(inp.value);
        ls.del('brain-bk-n'); ls.del('brain-bk-ate'); ss.set('brain-ult', String(Date.now()));
        location.reload();
      } catch (e) {
        const t = tentativas(); const n = t.n + 1; ls.set('brain-bk-n', String(n));
        if (n >= 5) ls.set('brain-bk-ate', String(Date.now() + Math.min(900, 15 * Math.pow(2, n - 5)) * 1000));
        inp.value = ''; err.textContent = e && /incorreta/.test(e.message) ? 'Senha incorreta.' : 'Não consegui desbloquear.';
        btn.disabled = false; checarEspera(); try { inp.focus(); } catch (e2) { /* sem foco */ }
      }
    });
    el.querySelector('#bk-esq').addEventListener('click', () => {
      el.querySelector('.bk-in').innerHTML = '<h1>Esqueceu a senha?</h1><p>Os dados ficam cifrados e não há como recuperar a senha. Se você tem um backup, apague os dados deste aparelho e restaure o backup (se o backup for protegido, vale a senha dele). Sem backup, os dados se perdem.</p>'
        + '<button type="button" id="bk-ap" style="background:var(--danger,#b3261e);color:#fff">Apagar dados deste aparelho</button><button type="button" class="sec" id="bk-vl">Voltar</button>';
      el.querySelector('#bk-vl').onclick = () => { el.remove(); mostrarBloqueio(); };
      el.querySelector('#bk-ap').onclick = () => {
        if (!W.confirm('Apagar TODOS os dados deste aparelho? Isso não pode ser desfeito.')) return;
        const fim = () => { ls.del('brain-cofre'); ls.del('brain-cofre-num'); ls.del('brain-bk-n'); ls.del('brain-bk-ate'); try { W.sessionStorage.clear(); } catch (e) { /* sem sessão */ } location.replace('./'); };
        try { const r = W.indexedDB.deleteDatabase('brain-local'); r.onsuccess = fim; r.onerror = fim; r.onblocked = fim; } catch (e) { fim(); }
        ls.del('brain-local-estado');
      };
    });
    void espera;
  }

  async function bloquearAgora() {
    if (!L()) return;
    L().bloquear(); ss.set('brain-ult', '0');
    mostrarBloqueio();
  }

  // ---- bloqueio automático ----
  let ultimaAtividade = Date.now(); let ultimoGravado = 0;
  const marcar = () => { ultimaAtividade = Date.now(); if (ultimaAtividade - ultimoGravado > 5000) { ultimoGravado = ultimaAtividade; ss.set('brain-ult', String(ultimaAtividade)); } };
  async function verificar(aoVoltar) {
    if (!L() || estaBloqueado) return;
    if (!(await L().protegido())) return;
    if (await L().bloqueado()) { mostrarBloqueio(); return; }
    const lim = limiteMin(); const ult = Number(ss.get('brain-ult') || Date.now());
    const ocioso = (Date.now() - Math.max(ult, aoVoltar ? 0 : ultimaAtividade)) / 1000;
    const maximo = lim === 0 ? 4 : lim * 60;
    if (ocioso > maximo && (aoVoltar || lim > 0)) bloquearAgora();
  }
  ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach((e) => W.addEventListener(e, marcar, { passive: true, capture: true }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      ss.set('brain-ult', String(Date.now()));
      if (ls.get('brain-cofre') === '1') document.documentElement.classList.add('bk-priv');
    } else {
      document.documentElement.classList.remove('bk-priv'); verificar(true);
    }
  });
  W.addEventListener('pageshow', () => { document.documentElement.classList.remove('bk-priv'); verificar(true); });
  setInterval(() => { if (document.visibilityState === 'visible') verificar(false); }, 15000);

  document.addEventListener('DOMContentLoaded', async () => {
    if (!L()) { document.documentElement.classList.remove('bk'); return; }
    try {
      const prot = await L().protegido();
      if (prot) ls.set('brain-cofre', '1'); else { ls.del('brain-cofre'); ls.del('brain-cofre-num'); }
      if (prot && await L().bloqueado()) mostrarBloqueio();
      else { document.documentElement.classList.remove('bk'); if (prot) { marcar(); verificar(true); } }
    } catch (e) { document.documentElement.classList.remove('bk'); }
  });

  // ---- configurações: seção "Segurança" ----
  function montar(raiz, msg) {
    if (!raiz || !L()) { if (raiz) raiz.innerHTML = '<p class="dica">O bloqueio só existe na versão do celular.</p>'; return; }
    const F = W.BrainCofre;
    async function desenhar() {
      const prot = await L().protegido();
      raiz.innerHTML = prot
        ? '<div class="cfg-linha"><div class="rot">Bloqueio com senha: ativo</div><p class="dica">Seus dados estão cifrados neste aparelho. Sem a senha ninguém consegue abri-los, nem eu. Não existe recuperação de senha: mantenha um backup.</p>'
          + '<div class="cfg-botoes"><button type="button" class="principal" data-s="bloquear">Bloquear agora</button><button type="button" data-s="trocar">Trocar senha</button><button type="button" class="perigo" data-s="desativar">Desativar</button></div></div>'
        : '<div class="cfg-linha"><div class="rot">Bloqueio com senha</div><p class="dica">Cifra os dados deste aparelho (AES-256) e pede a senha ao abrir o Brain. Quem pegar seu celular não lê suas tarefas e finanças.</p>'
          + '<div class="cfg-botoes"><button type="button" class="principal" data-s="ativar">Ativar bloqueio</button></div></div>';
      raiz.querySelectorAll('[data-s]').forEach((b) => b.addEventListener('click', () => acao(b.dataset.s)));
    }
    function formulario(titulo, campos, textoBotao, aoEnviar, perigo) {
      const dlg = document.createElement('dialog'); dlg.className = 'dlg-seg';
      dlg.style.cssText = 'border:1px solid var(--line);border-radius:.9rem;padding:1.1rem;max-width:22rem;width:calc(100% - 2rem);background:var(--surface);color:var(--ink)';
      dlg.innerHTML = `<form method="dialog" style="display:grid;gap:.5rem"><h3 style="margin:0 0 .2rem">${esc(titulo)}</h3>`
        + campos.map((c, k) => `<label for="sg${k}" style="font-size:.85rem;color:var(--muted)">${esc(c.rot)}</label><input id="sg${k}" type="password" autocomplete="${c.auto || 'off'}" maxlength="64" ${c.num ? 'inputmode="numeric"' : ''} style="font:inherit;padding:.65rem;border:1px solid var(--line-strong);border-radius:.6rem;background:var(--bg);color:inherit;min-height:2.75rem">`).join('')
        + '<p class="dica" id="sg-d" style="margin:0;min-height:1.2em"></p><p id="sg-e" role="alert" style="color:var(--danger);margin:0;font-size:.86rem;min-height:1.2em"></p>'
        + `<div style="display:flex;gap:.5rem;justify-content:flex-end"><button type="button" id="sg-c" style="min-height:2.75rem;padding:0 1rem;border-radius:.6rem;border:1px solid var(--line-strong);background:none;color:inherit;font:inherit">Cancelar</button><button type="submit" id="sg-ok" style="min-height:2.75rem;padding:0 1rem;border-radius:.6rem;border:0;background:${perigo ? 'var(--danger)' : 'var(--accent)'};color:${perigo ? '#fff' : 'var(--on-accent)'};font:inherit;font-weight:600">${esc(textoBotao)}</button></div></form>`;
      document.body.appendChild(dlg); dlg.showModal();
      const err = dlg.querySelector('#sg-e'); const dica = dlg.querySelector('#sg-d'); const ins = [...dlg.querySelectorAll('input')];
      const alvoForca = campos.findIndex((c) => c.forca);
      if (alvoForca >= 0 && F) ins[alvoForca].addEventListener('input', () => { dica.textContent = ins[alvoForca].value ? F.forca(ins[alvoForca].value).texto : ''; });
      dlg.querySelector('#sg-c').onclick = () => { dlg.close(); dlg.remove(); };
      dlg.addEventListener('cancel', () => dlg.remove());
      dlg.querySelector('form').addEventListener('submit', async (ev) => {
        ev.preventDefault(); err.textContent = '';
        try { await aoEnviar(ins.map((i) => i.value)); dlg.close(); dlg.remove(); } catch (e) { err.textContent = e && e.message ? e.message : 'Algo deu errado.'; }
      });
      setTimeout(() => { try { ins[0].focus(); } catch (e) { /* sem foco */ } }, 60);
    }
    W.BrainSeg._f = formulario;
    async function acao(a) {
      if (a === 'ativar') {
        formulario('Ativar bloqueio', [{ rot: 'Nova senha (4 a 64 caracteres)', auto: 'new-password', forca: true }, { rot: 'Repita a senha', auto: 'new-password' }], 'Ativar', async (v) => {
          if (v[0] !== v[1]) throw new Error('As senhas não são iguais.');
          await L().ativar(v[0]); ls.set('brain-cofre', '1'); if (/^\d+$/.test(v[0])) ls.set('brain-cofre-num', '1'); else ls.del('brain-cofre-num');
          ss.set('brain-ult', String(Date.now())); msg('Bloqueio ativado. Anote a senha: não dá para recuperar.'); desenhar();
        });
      } else if (a === 'trocar') {
        formulario('Trocar senha', [{ rot: 'Senha atual', auto: 'current-password' }, { rot: 'Nova senha', auto: 'new-password', forca: true }, { rot: 'Repita a nova senha', auto: 'new-password' }], 'Trocar', async (v) => {
          if (v[1] !== v[2]) throw new Error('As senhas novas não são iguais.');
          await L().trocar(v[0], v[1]); if (/^\d+$/.test(v[1])) ls.set('brain-cofre-num', '1'); else ls.del('brain-cofre-num'); msg('Senha trocada.');
        });
      } else if (a === 'desativar') {
        formulario('Desativar bloqueio', [{ rot: 'Digite a senha para confirmar', auto: 'current-password' }], 'Desativar', async (v) => {
          await L().desativar(v[0]); ls.del('brain-cofre'); ls.del('brain-cofre-num'); msg('Bloqueio desativado. Os dados voltaram a ficar sem cifra neste aparelho.'); desenhar();
        }, true);
      } else if (a === 'bloquear') { bloquearAgora(); }
    }
    desenhar();
  }

    /** Formulário simples de senha usado também pelo backup protegido (definido dentro de montar; reexposto aqui). */
  W.BrainSeg = { montar, bloquearAgora, mostrarBloqueio, formulario: (...a) => (W.BrainSeg._f ? W.BrainSeg._f(...a) : null) };
})();
