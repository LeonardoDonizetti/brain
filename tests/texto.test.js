// Mesmos casos dos testes Python (tests/test_brain.py), agora para o texto.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../site/texto.js');

const HOJE = T.mkData(2026, 10, 9); // sexta-feira
const D = (a, m, d) => T.mkData(a, m, d);
const eq = (a, b, msg) => assert.deepEqual(a, b, msg);
const data = (texto, pref = 'passado') => { const d = T.extrairData(texto, HOJE, pref)[0]; return d ? T.iso(d) : null; };
const valor = (texto) => { const a = T.extrairValor(texto); return a ? a[0] : null; };
const hora = (texto) => T.extrairHora(texto)[0];

test('valores: formatos', () => {
  const casos = { '32 no ifood': 32, 'R$ 15,50 uber': 15.5, 'uber 15,5': 15.5, 'paguei 1.250,00 de aluguel': 1250, 'aluguel 1250': 1250, '2 mil de celular': 2000, '1,5 mil': 1500, '50 reais': 50, 'R$12': 12, 'mercado 89.90': 89.9, '30 conto': 30 };
  for (const [t, esperado] of Object.entries(casos)) eq(valor(t), esperado, t);
});
test('valores: ignora peso e prioriza dinheiro', () => {
  eq(valor('2kg de arroz 30'), 30);
  eq(valor('comprei 3 camisetas por 120'), 120);
  eq(valor('2 pizzas R$ 80'), 80);
});
test('valores: sem valor', () => { eq(valor('uber'), null); eq(valor('0 reais'), null); });

test('datas: relativas', () => {
  eq(data('hoje'), '2026-10-09');
  eq(data('ontem'), '2026-10-08');
  eq(data('anteontem'), '2026-10-07');
  eq(data('amanhã', 'futuro'), '2026-10-10');
  eq(data('depois de amanhã', 'futuro'), '2026-10-11');
});
test('datas: absolutas', () => {
  eq(data('15/10', 'futuro'), '2026-10-15');
  eq(data('15/10/2026'), '2026-10-15');
  eq(data('3/1/27', 'futuro'), '2027-01-03');
  eq(data('20 de março de 2026'), '2026-03-20');
  eq(data('dia 20 de dezembro', 'futuro'), '2026-12-20');
  eq(data('31/02'), null);
  eq(data('sem data nenhuma'), null);
});
test('datas: ano inferido', () => {
  eq(data('20/12'), '2025-12-20');
  eq(data('20/12', 'futuro'), '2026-12-20');
  eq(data('5/1', 'futuro'), '2027-01-05');
});
test('datas: dia da semana', () => {
  eq(data('quarta'), '2026-10-07');
  eq(data('sexta'), '2026-10-09');
  eq(data('sexta passada'), '2026-10-02');
  eq(data('sábado', 'futuro'), '2026-10-10');
  eq(data('sexta', 'futuro'), '2026-10-16');
  eq(data('segunda-feira que vem'), '2026-10-12');
});
test('datas: dia do mês', () => {
  eq(data('dia 5'), '2026-10-05');
  eq(data('dia 20'), '2026-09-20');
  eq(data('dia 20', 'futuro'), '2026-10-20');
  eq(data('dia 31', 'futuro'), '2026-10-31');
});
test('datas: remove o trecho', () => { assert.ok(!T.extrairData('uber ontem 15', HOJE)[1].includes('ontem')); });

test('horas: formatos', () => {
  const casos = { 'reunião 14h': '14:00', 'às 14h30': '14:30', '14:30': '14:30', 'prova às 9': '09:00', 'meio-dia': '12:00', 'meia noite': '00:00', 'às 8 horas': '08:00', 'estudar às 19': '19:00' };
  for (const [t, esperado] of Object.entries(casos)) eq(hora(t), esperado, t);
});
test('horas: não confunde', () => {
  eq(hora('comprar as 2 pizzas hoje'), null);
  eq(hora('estudar capítulo 5'), null);
  eq(hora('25h'), null);
  eq(hora('15/10'), null);
});

test('gastos: frase com dois gastos', () => {
  const { itens, ignorados } = T.interpretarGastos('gastei 32 no iFood ontem e 15 de Uber hoje', HOJE);
  eq(itens.length, 2);
  eq([itens[0].valor, itens[0].descricao, itens[0].data], [32, 'iFood', '2026-10-08']);
  eq([itens[1].valor, itens[1].descricao, itens[1].data], [15, 'Uber', '2026-10-09']);
  eq(ignorados, []);
});
test('gastos: decimais e vírgula', () => {
  const { itens } = T.interpretarGastos('mercado R$ 89,90, uber 15', HOJE);
  eq(itens.map((i) => [i.valor, i.descricao]), [[89.9, 'mercado'], [15, 'uber']]);
});
test('gastos: sem data usa hoje', () => {
  const { itens } = T.interpretarGastos('paguei 45 reais na farmácia', HOJE);
  eq([itens[0].valor, itens[0].descricao, itens[0].data], [45, 'farmácia', '2026-10-09']);
});
test('gastos: ignora trecho sem valor', () => {
  const { itens, ignorados } = T.interpretarGastos('20 no uber e lanche', HOJE);
  eq(itens.length, 1); eq(ignorados, ['lanche']);
});
test('gastos: texto sem valor', () => {
  const { itens, ignorados } = T.interpretarGastos('fui ao mercado', HOJE);
  eq(itens, []); assert.ok(ignorados.length);
});
test('gastos: só valor', () => { eq(T.interpretarGastos('50', HOJE).itens[0].descricao, 'Gasto'); });

test('gastos: frases variadas (as mesmas conferidas no Python)', () => {
  const casos = [
    ['gastei 32 reais no mercado hoje', [[32, 'mercado', '2026-10-09']]],
    ['uber 18,90', [[18.9, 'uber', '2026-10-09']]],
    ['R$ 250 de tênis na loja ontem', [[250, 'tênis na loja', '2026-10-08']]],
    ['paguei 1.200 de aluguel dia 5', [[1200, 'aluguel', '2026-10-05']]],
    ['almoço 28 e café 7,50', [[28, 'almoço', '2026-10-09'], [7.5, 'café', '2026-10-09']]],
    ['50 reais de gasolina na sexta passada', [[50, 'gasolina', '2026-10-02']]],
    ['comprei um livro por 45', [[45, 'livro', '2026-10-09']]],
    ['spotify 21,90 mensal', [[21.9, 'spotify mensal', '2026-10-09']]],
    ['cinema 30 reais sábado', [[30, 'cinema', '2026-10-03']]],
    ['dentista 200 dia 3', [[200, 'dentista', '2026-10-03']]],
    ['gastei 15 no 99 ontem', [[15, '99', '2026-10-08']]],
    ['12/10 mercado 130', [[130, 'mercado', '2026-10-12']]],
    ['paguei R$ 3.499,90 no notebook', [[3499.9, 'notebook', '2026-10-09']]],
    ['12 mil de carro', [[12000, 'carro', '2026-10-09']]],
  ];
  for (const [frase, esperado] of casos) eq(T.interpretarGastos(frase, HOJE).itens.map((i) => [i.valor, i.descricao, i.data]), esperado, frase);
});

test('tarefas: título com data e hora', () => {
  const r = T.interpretarTarefa('Prova de inglês na sexta às 14h', HOJE);
  eq([r.titulo, T.iso(r.data), r.hora], ['Prova de inglês', '2026-10-16', '14:00']);
});
test('tarefas: amanhã', () => {
  const r = T.interpretarTarefa('Entregar trabalho amanhã', HOJE);
  eq([r.titulo, T.iso(r.data), r.hora], ['Entregar trabalho', '2026-10-10', null]);
});
test('tarefas: sem data', () => {
  const r = T.interpretarTarefa('Estudar capítulo 5', HOJE);
  eq([r.titulo, r.data, r.hora], ['Estudar capítulo 5', null, null]);
});
test('tarefas: só data não apaga o título', () => {
  const r = T.interpretarTarefa('amanhã', HOJE);
  eq(r.titulo, 'amanhã'); assert.ok(r.data);
});
test('tarefas: frases variadas', () => {
  const casos = [['Reunião com o grupo dia 15 às 19h30', ['Reunião com o grupo', '2026-10-15', '19:30']], ['estudar para a prova de sexta', ['estudar para a prova', '2026-10-16', null]], ['dentista 20/10 às 8h', ['dentista', '2026-10-20', '08:00']], ['Comprar as 2 camisas', ['Comprar as 2 camisas', null, null]]];
  for (const [t, esperado] of casos) { const r = T.interpretarTarefa(t, HOJE); eq([r.titulo, r.data ? T.iso(r.data) : null, r.hora], esperado, t); }
});
