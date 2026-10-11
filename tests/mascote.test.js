const test = require('node:test'); const assert = require('node:assert');
const M = require('../site/mascote.js');
test('cada seção tem uma pose própria, com SVG bem formado', () => {
  assert.deepStrictEqual(M.POSES.sort(), ['aceno', 'bandeira', 'cafe', 'lendo', 'moeda', 'prancheta', 'rei', 'vitoria']);
  const vistos = new Set();
  for (const p of M.POSES) { const s = M.svg(p, 80); assert.match(s, /^<svg[\s\S]*<\/svg>$/); assert.ok(s.includes('m-pose')); vistos.add(s); }
  assert.strictEqual(vistos.size, 8);
  for (const h of ['feliz', 'triste', 'festa']) assert.ok(!M.svg(h, 80).includes('m-pose'));
});

test('guia do tutorial: gesto e expressão diferentes a cada passo, festa no último', () => {
  const M = require('../site/mascote.js');
  const v = new Set();
  for (let i = 0; i < M.N_GUIAS; i++) { const s = M.guia(i, 72, false); assert.match(s, /^<svg[\s\S]*<\/svg>$/); assert.ok(s.includes('m-boca')); assert.ok(s.includes('m-bal')); v.add(s); }
  assert.strictEqual(v.size, M.N_GUIAS);
  assert.ok(M.guia(0, 72, false) === M.guia(M.N_GUIAS, 72, false));
  assert.ok(M.guia(2, 72, true).includes('m-confs'));
});
