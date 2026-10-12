/* Cartão de anexo: mostra o arquivo escolhido (nome, tipo, tamanho, dimensões) e o andamento de cada etapa
   (lendo, otimizando, enviando para a IA, lendo com a IA). Só interface; nada é enviado por aqui. */
(function (raiz) {
  'use strict';
  const fmt = (b) => (b < 1024 ? `${b} B` : b < 1048576 ? `${Math.round(b / 1024)} KB` : `${(b / 1048576).toFixed(1).replace('.', ',')} MB`);
  const ehPdf = (f) => !!f && (f.type === 'application/pdf' || /\.pdf$/i.test(f.name || ''));
  function tipoLegivel(f) {
    if (ehPdf(f)) return 'PDF';
    const t = String((f && f.type) || '').split('/')[1] || '';
    const nome = { jpeg: 'JPEG', jpg: 'JPEG', png: 'PNG', webp: 'WebP', heic: 'HEIC', heif: 'HEIF', gif: 'GIF' }[t.toLowerCase()];
    return nome ? `Imagem ${nome}` : 'Imagem';
  }
  /** Descrição curta do arquivo: "Imagem JPEG · 3,2 MB · 4032×3024". */
  const descrever = (f, dim) => [tipoLegivel(f), fmt(f.size || 0), dim ? `${dim.w}×${dim.h}` : ''].filter(Boolean).join(' · ');
  function dimensoes(f) {
    return new Promise((ok) => {
      if (ehPdf(f) || typeof Image === 'undefined') return ok(null);
      const u = URL.createObjectURL(f), i = new Image();
      i.onload = () => { URL.revokeObjectURL(u); ok({ w: i.naturalWidth, h: i.naturalHeight }); };
      i.onerror = () => { URL.revokeObjectURL(u); ok(null); };
      i.src = u;
    });
  }
  const PDF_ICONE = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="10" fill="#fdecec"/><path d="M18 10h20l10 10v34H18z" fill="#fff" stroke="#d64545" stroke-width="3" stroke-linejoin="round"/><text x="32" y="45" font-family="Arial" font-weight="700" font-size="14" text-anchor="middle" fill="#d64545">PDF</text></svg>');

  function estilo() {
    if (typeof document === 'undefined' || document.getElementById('anx-css')) return;
    const s = document.createElement('style'); s.id = 'anx-css';
    s.textContent = `.anx { display: flex; gap: .8rem; align-items: center; margin-top: .9rem; padding: .7rem; border: 1px solid var(--line, #d5dbe6); border-radius: .9rem; background: var(--bg, #f6f7fb); }
      .anx-mini { width: 4.4rem; height: 4.4rem; border-radius: .6rem; flex: none; object-fit: cover; border: 1px solid var(--line, #d5dbe6); background: var(--surface, #fff); }
      .anx-info { min-width: 0; flex: 1; display: grid; gap: .22rem; }
      .anx-nome { font-weight: 700; font-size: .92rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .anx-det { font-size: .78rem; color: var(--muted, #5b6575); }
      .anx-barra { height: .5rem; border-radius: .5rem; background: var(--line, #d5dbe6); overflow: hidden; margin-top: .15rem; position: relative; }
      .anx-barra i { display: block; height: 100%; width: 0; border-radius: .5rem; background: var(--accent, #1565d8); transition: width .3s ease; }
      .anx-barra.ind i { width: 40% !important; position: absolute; left: 0; animation: anx-vai 1.1s ease-in-out infinite; }
      @keyframes anx-vai { 0% { left: -40%; } 100% { left: 100%; } }
      .anx.ok .anx-barra i { background: var(--ok, #16a34a); }
      .anx.erro .anx-barra i { background: var(--danger, #d64545); }
      .anx-etapa { font-size: .84rem; font-weight: 650; }
      .anx.erro .anx-etapa { color: var(--danger, #d64545); }
      @media (prefers-reduced-motion: reduce) { .anx-barra i { transition: none; } .anx-barra.ind i { animation: none; width: 100% !important; opacity: .5; } }`;
    document.head.append(s);
  }

  /** Monta o cartão dentro de `el` e devolve o controle. */
  function criar(el) {
    estilo();
    el.innerHTML = '<div class="anx"><img class="anx-mini" alt=""><div class="anx-info"><b class="anx-nome"></b><span class="anx-det"></span><div class="anx-barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-label="Andamento"><i></i></div><span class="anx-etapa" role="status" aria-live="polite"></span></div></div>';
    const q = (c) => el.querySelector(c), cx = q('.anx'), barra = q('.anx-barra'), pct = q('i');
    let url = null;
    const api = {
      /** Mostra o arquivo escolhido (miniatura, nome, tipo, tamanho). */
      async arquivo(f) {
        cx.classList.remove('ok', 'erro'); el.hidden = false;
        q('.anx-nome').textContent = f.name || (ehPdf(f) ? 'documento.pdf' : 'foto');
        q('.anx-det').textContent = descrever(f, null);
        if (url) { URL.revokeObjectURL(url); url = null; }
        if (ehPdf(f)) q('.anx-mini').src = PDF_ICONE; else { url = URL.createObjectURL(f); q('.anx-mini').src = url; }
        const dim = await dimensoes(f);
        q('.anx-det').textContent = descrever(f, dim);
        return dim;
      },
      /** Mostra um arquivo já guardado (sem o File original). */
      mostrar({ nome, det, mini }) { cx.classList.remove('ok', 'erro'); el.hidden = false; q('.anx-nome').textContent = nome || 'arquivo'; q('.anx-det').textContent = det || ''; q('.anx-mini').src = mini || PDF_ICONE; },
      detalhe(t) { q('.anx-det').textContent = t; },
      /** Etapa em andamento; p = 0..100, ou null para andamento indeterminado (esperando a IA). */
      etapa(t, p) {
        cx.classList.remove('ok', 'erro');
        q('.anx-etapa').textContent = t;
        if (p == null) { barra.classList.add('ind'); barra.removeAttribute('aria-valuenow'); } else { barra.classList.remove('ind'); pct.style.width = Math.max(0, Math.min(100, p)) + '%'; barra.setAttribute('aria-valuenow', String(Math.round(p))); }
      },
      pronto(t) { barra.classList.remove('ind'); pct.style.width = '100%'; cx.classList.add('ok'); q('.anx-etapa').textContent = t; },
      erro(t) { barra.classList.remove('ind'); pct.style.width = '100%'; cx.classList.remove('ok'); cx.classList.add('erro'); q('.anx-etapa').textContent = t; },
      limpar() { if (url) { URL.revokeObjectURL(url); url = null; } el.replaceChildren(); },
    };
    return api;
  }
  const API = { PDF_ICONE, criar, descrever, tipoLegivel, fmt, ehPdf, dimensoes };
  if (typeof module === 'object' && module.exports) module.exports = API; else raiz.BrainAnexo = API;
})(typeof window !== 'undefined' ? window : globalThis);
