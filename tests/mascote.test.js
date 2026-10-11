const test = require('node:test'); const assert = require('node:assert');
const M = require('../site/mascote.js');
test('cada seção tem uma pose própria, com SVG bem formado', () => {
  assert.deepStrictEqual(M.POSES.sort(), ['aceno', 'bandeira', 'cafe', 'lendo', 'moeda', 'prancheta']);
  const vistos = new Set();
  for (const p of M.POSES) { const s = M.svg(p, 80); assert.match(s, /^<svg[\s\S]*<\/svg>$/); assert.ok(s.includes('m-pose')); vistos.add(s); }
  assert.strictEqual(vistos.size, 6);
  for (const h of ['feliz', 'triste', 'festa']) assert.ok(!M.svg(h, 80).includes('m-pose'));
});
