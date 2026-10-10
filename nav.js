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

  function montar() {
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
