/* Resposta ao toque sem "encolher" ao rolar: so marca .pr quando o dedo fica parado ~90ms.
   Qualquer movimento (rolagem) ou cancelamento remove a marca. */
(function () {
  'use strict';
  var SEL = 'button, .tabs a, a.anel, a.card, .lapis, .icon, .check, .cel, .btn, .btn2, .pill, .opc, #mic, .abandonar';
  var t = null, alvo = null, x0 = 0, y0 = 0;
  function limpa() { clearTimeout(t); t = null; if (alvo) { alvo.classList.remove('pr'); alvo = null; } }
  document.addEventListener('pointerdown', function (e) {
    limpa();
    var el = e.target.closest && e.target.closest(SEL);
    if (!el) return;
    x0 = e.clientX; y0 = e.clientY;
    t = setTimeout(function () { alvo = el; el.classList.add('pr'); }, 90);
  }, { passive: true });
  document.addEventListener('pointermove', function (e) {
    if (t || alvo) { if (Math.abs(e.clientX - x0) > 6 || Math.abs(e.clientY - y0) > 6) limpa(); }
  }, { passive: true });
  ['pointerup', 'pointercancel', 'dragstart', 'contextmenu'].forEach(function (n) { document.addEventListener(n, function () { if (alvo) { var a = alvo; setTimeout(function () { a.classList.remove('pr'); }, 60); alvo = null; } clearTimeout(t); t = null; }, { passive: true }); });
  window.addEventListener('scroll', limpa, { passive: true, capture: true });
})();
