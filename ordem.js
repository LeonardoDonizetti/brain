/* Regra de ordem da Rotina: itens COM horário nunca saem da ordem crescente; itens sem horário vão para qualquer lugar. */
(function (raiz) {
  'use strict';
  /** Pode mover o item `id` para a posição `novo` (índice final) desta lista? Devolve {ok, conflito?}. */
  function movimentoValido(lista, id, novo) {
    const idx = lista.findIndex((i) => i.id === id);
    if (idx < 0 || novo < 0 || novo >= lista.length) return { ok: false };
    const item = lista[idx];
    if (idx === novo || !item.hora) return { ok: true };
    const N = lista.slice(); N.splice(idx, 1); N.splice(novo, 0, item);
    for (let k = 0; k < N.length; k++) {
      if (k === novo || !N[k].hora) continue;
      if (k < novo ? N[k].hora > item.hora : N[k].hora < item.hora) return { ok: false, conflito: N[k] };
    }
    return { ok: true };
  }
  /** A lista inteira respeita a regra? (usada para validar a ordem recebida) */
  function listaValida(lista) {
    let ult = '';
    for (const i of lista) { if (!i.hora) continue; if (i.hora < ult) return false; ult = i.hora; }
    return true;
  }
  function mover(lista, id, novo) {
    const idx = lista.findIndex((i) => i.id === id); const N = lista.slice();
    if (idx < 0) return N; const [x] = N.splice(idx, 1); N.splice(novo, 0, x); return N;
  }
  const API = { movimentoValido, listaValida, mover };
  if (typeof module === 'object' && module.exports) module.exports = API; else raiz.BrainOrdem = API;
})(typeof window !== 'undefined' ? window : globalThis);
