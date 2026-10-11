const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../site/categorias.js');

const base = new C.Classificador();
base.treinar([]);

test('categorias: palavras conhecidas', () => {
  const casos = { iFood: 'Alimentação', uber: 'Transporte', 'farmácia': 'Saúde', aluguel: 'Moradia', netflix: 'Assinaturas', cinema: 'Lazer', livro: 'Educação', camiseta: 'Compras', 'Uber Eats': 'Alimentação', 'conta de luz': 'Moradia', mercado: 'Alimentação' };
  for (const [d, esperado] of Object.entries(casos)) assert.equal(base.prever(d), esperado, d);
});
test('categorias: variações e erros de digitação', () => {
  const casos = { lanches: 'Alimentação', remedios: 'Saúde', ifod: 'Alimentação', 'farmacia popular': 'Saúde', uberr: 'Transporte', netflx: 'Assinaturas', supermercdo: 'Alimentação' };
  for (const [d, esperado] of Object.entries(casos)) assert.equal(base.prever(d), esperado, d);
});
test('categorias: desconhecido vira Outros', () => {
  for (const d of ['xyzzy qwerty', '', 'Gasto', 'qualquer coisa', 'barbearia', 'corte de cabelo']) assert.equal(base.prever(d), 'Outros', d);
});
test('categorias: aprende com a correção', () => {
  const c = new C.Classificador();
  c.treinar([{ descricao: 'bar do ze', categoria: 'Lazer', corrigido: true }]);
  assert.equal(c.prever('bar do ze'), 'Lazer'); // memória exata
  assert.equal(c.prever('bar do ze centro'), 'Lazer'); // generaliza
  assert.equal(c.prever('bar'), 'Alimentação'); // o resto continua igual
});
test('categorias: uma correção muda o futuro, mas não atropela um match claro', () => {
  const c = new C.Classificador();
  c.treinar([{ descricao: 'cabeleireiro da ana', categoria: 'Compras', corrigido: true }]);
  assert.equal(c.prever('cabeleireiro da ana'), 'Compras');
  assert.equal(c.prever('cabeleireiro ana'), 'Compras');
  assert.equal(c.prever('uber'), 'Transporte');
});
test('categorias: histórico automático também conta, mas pesa menos que correção', () => {
  const c = new C.Classificador();
  c.treinar([
    { descricao: 'padoca do joao', categoria: 'Outros', corrigido: false },
    { descricao: 'padoca do joao', categoria: 'Alimentação', corrigido: true },
  ]);
  assert.equal(c.prever('padoca do joao'), 'Alimentação'); // a correção é a mais recente na memória
});
test('categorias: categoria inválida no histórico é ignorada', () => {
  const c = new C.Classificador();
  c.treinar([{ descricao: 'coisa x', categoria: 'Inventada', corrigido: true }]);
  assert.equal(c.prever('coisa x'), 'Outros');
});
