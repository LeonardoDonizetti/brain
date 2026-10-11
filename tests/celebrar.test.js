'use strict';
const test = require('node:test');
const assert = require('node:assert');
const C = require('../site/celebrar.js');

test('textoDia: primeiro dia, dia comum, marco e ofensiva salva', () => {
  const a = C.textoDia(1, false);
  assert.match(a.titulo, /começou/); assert.strictEqual(a.marco, false);
  const b = C.textoDia(12, false);
  assert.strictEqual(b.titulo, '12 dias de ofensiva!'); assert.ok(b.sub.length > 10); assert.strictEqual(b.marco, false);
  const c = C.textoDia(7, false);
  assert.match(c.titulo, /semana/); assert.strictEqual(c.marco, true);
  const d = C.textoDia(30, true);
  assert.match(d.titulo, /salva/); assert.strictEqual(d.marco, false);
});

test('textoDia: todo marco tem título e subtítulo', () => {
  for (const n of Object.keys(C.MARCO)) { const t = C.textoDia(Number(n), false); assert.ok(t.titulo && t.sub && t.marco); }
});

test('textoDia: subtítulo não repete em sequência', () => {
  let rep = 0, ant = '';
  for (let i = 2; i < 40; i++) { const t = C.textoDia(i * 1.5 | 0 || 2, false); if (t.sub === ant && !t.marco) rep++; ant = t.sub; }
  assert.strictEqual(rep, 0);
});
