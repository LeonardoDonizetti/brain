const test = require('node:test');
const assert = require('node:assert');
const A = require('../site/api-local.js');
const T = require('../site/texto.js');
const hoje = () => T.iso(T.hojeData());
const ontem = () => T.iso(T.addDias(T.hojeData(), -1));
const amanha = () => T.iso(T.addDias(T.hojeData(), 1));
const zerar = () => { A._armazem.memoria = null; };
const ok = async (m, c, q, b) => { const r = await A.chamar(m, c, q, b); assert.strictEqual(r.status, 200, JSON.stringify(r.corpo)); return r.corpo; };

test('finanças: registrar, listar, editar, apagar', async () => {
  zerar();
  let r = await A.chamar('POST', '/api/financas/gastos', '', { texto: '' });
  assert.strictEqual(r.status, 400);
  r = await A.chamar('POST', '/api/financas/gastos', '', { texto: 'comprei algo' });
  assert.strictEqual(r.status, 422);
  const reg = await ok('POST', '/api/financas/gastos', '', { texto: '32 no ifood e uber 15 reais ontem' });
  assert.strictEqual(reg.registrados.length, 2);
  const lista = await ok('GET', '/api/financas/gastos', '');
  assert.strictEqual(lista.total, 47 - (ontem().slice(0, 7) !== hoje().slice(0, 7) ? 15 : 0));
  const g = lista.gastos[0];
  assert.strictEqual((await A.chamar('PUT', `/api/financas/gastos/${g.id}`, '', { valor: -1 })).corpo.detail, 'Valor inválido.');
  assert.strictEqual((await A.chamar('PUT', `/api/financas/gastos/${g.id}`, '', { categoria: 'x' })).corpo.detail, 'Categoria inválida.');
  assert.strictEqual((await A.chamar('PUT', '/api/financas/gastos/999', '', {})).status, 404);
  await ok('PUT', `/api/financas/gastos/${g.id}`, '', { categoria: 'Lazer', descricao: 'cinema' });
  const dep = await ok('GET', '/api/financas/gastos', '');
  assert.ok(dep.gastos.find((x) => x.id === g.id).categoria === 'Lazer');
  await ok('DELETE', `/api/financas/gastos/${g.id}`, '');
  assert.strictEqual((await A.chamar('GET', '/api/financas/gastos', 'mes=2020-13')).status, 400);
});

test('finanças: aprende com correção', async () => {
  zerar();
  await ok('POST', '/api/financas/gastos', '', { texto: '20 em zorbas' });
  const l = await ok('GET', '/api/financas/gastos', '');
  await ok('PUT', `/api/financas/gastos/${l.gastos[0].id}`, '', { categoria: 'Lazer' });
  await ok('POST', '/api/financas/gastos', '', { texto: '30 em zorbas' });
  const l2 = await ok('GET', '/api/financas/gastos', '');
  assert.ok(l2.gastos.every((g) => g.categoria === 'Lazer'));
});

test('tarefas: criar com data no título, ordenar, alternar', async () => {
  zerar();
  assert.strictEqual((await A.chamar('POST', '/api/tarefas', '', { titulo: ' ' })).status, 400);
  const t = await ok('POST', '/api/tarefas', '', { titulo: 'prova de física amanhã às 9' });
  assert.strictEqual(t.data, amanha()); assert.strictEqual(t.hora, '09:00');
  assert.ok(!/amanh/.test(t.titulo));
  await ok('POST', '/api/tarefas', '', { titulo: 'sem data' });
  await ok('PATCH', `/api/tarefas/${t.id}/alternar`, '');
  const l = await ok('GET', '/api/tarefas', '');
  assert.strictEqual(l.tarefas[1].concluida_em, hoje());
  assert.strictEqual(l.tarefas[0].titulo, 'sem data');
  assert.strictEqual(l.tarefas[1].feita, 1);
  await ok('PATCH', `/api/tarefas/${t.id}/alternar`, ''); assert.strictEqual((await ok('GET', '/api/tarefas', '')).tarefas.find((x) => x.id === t.id).concluida_em, null);
  await ok('PUT', `/api/tarefas/${t.id}`, '', { titulo: 'x', data: hoje(), hora: '10:30' });
  assert.strictEqual((await A.chamar('PUT', `/api/tarefas/${t.id}`, '', { titulo: 'x', hora: '25:00' })).corpo.detail, 'Hora inválida.');
  await ok('DELETE', `/api/tarefas/${t.id}`, '');
  assert.strictEqual((await ok('GET', '/api/tarefas', '')).tarefas.length, 1);
});

test('rotina: modelo, marcar, sequência, progresso', async () => {
  zerar();
  assert.strictEqual((await ok('POST', '/api/rotina/modelo', '')).criados, 13);
  assert.strictEqual((await A.chamar('POST', '/api/rotina/modelo', '')).status, 409);
  let r = await ok('GET', '/api/rotina', '');
  assert.strictEqual(r.itens.length, 13); assert.strictEqual(r.semana.length, 7);
  const id = r.itens[0].id;
  await ok('PUT', '/api/rotina/marcar', '', { item_id: id, data: hoje(), feito: true });
  await ok('PUT', '/api/rotina/marcar', '', { item_id: id, data: ontem(), feito: true });
  assert.strictEqual((await A.chamar('PUT', '/api/rotina/marcar', '', { item_id: id, data: amanha(), feito: true })).corpo.detail, 'Não dá para marcar um dia que ainda não chegou.');
  assert.strictEqual((await A.chamar('PUT', '/api/rotina/marcar', '', { item_id: 999, data: hoje(), feito: true })).status, 404);
  r = await ok('GET', '/api/rotina', '');
  assert.strictEqual(r.progresso.feitos, 1);
  assert.strictEqual(r.itens.find((i) => i.id === id).sequencia, 2);
  assert.strictEqual(r.semana[6].feitos, 1);
  await ok('PUT', '/api/rotina/marcar', '', { item_id: id, data: hoje(), feito: false });
  assert.strictEqual((await ok('GET', '/api/rotina', '')).progresso.feitos, 0);
});

test('rotina: validações e CRUD', async () => {
  zerar();
  const base = { periodo: 'manha', tipo: 'habito', titulo: 'Ler' };
  assert.strictEqual((await A.chamar('POST', '/api/rotina/itens', '', { ...base, periodo: 'x' })).corpo.detail, 'Período inválido.');
  assert.strictEqual((await A.chamar('POST', '/api/rotina/itens', '', { ...base, tipo: 'x' })).corpo.detail, 'Tipo inválido.');
  assert.strictEqual((await A.chamar('POST', '/api/rotina/itens', '', { ...base, titulo: '' })).corpo.detail, 'Dê um nome para o item.');
  assert.strictEqual((await A.chamar('POST', '/api/rotina/itens', '', { ...base, minutos: 700 })).corpo.detail, 'A duração deve ficar entre 1 e 600 minutos.');
  const { id } = await ok('POST', '/api/rotina/itens', '', { ...base, minutos: 20, hora: '06:30' });
  await ok('PUT', `/api/rotina/itens/${id}`, '', { ...base, titulo: 'Ler mais' });
  assert.strictEqual((await ok('GET', '/api/rotina', '')).itens[0].titulo, 'Ler mais');
  await ok('DELETE', `/api/rotina/itens/${id}`, '');
  assert.strictEqual((await ok('GET', '/api/rotina', '')).itens.length, 0);
});

test('jornada: config, avaliação, estatísticas', async () => {
  zerar();
  assert.strictEqual((await A.chamar('GET', '/api/jornada', 'dias=0')).corpo.detail, 'Escolha entre 1 e 365 dias.');
  let j = await ok('GET', '/api/jornada', '');
  assert.strictEqual(j.jornada.dia_atual, null); assert.strictEqual(j.dias.length, 30);
  assert.strictEqual((await A.chamar('PUT', '/api/jornada/config', '', { duracao: 3 })).status, 400);
  assert.strictEqual((await A.chamar('PUT', '/api/jornada/config', '', { inicio: amanha() })).status, 400);
  await ok('PUT', '/api/jornada/config', '', { nome: 'Foco', duracao: 30, inicio: T.iso(T.addDias(T.hojeData(), -4)) });
  await ok('PUT', '/api/jornada/avaliacao', '', { data: ontem(), resultado: 'positivo', nota: 'bom' });
  await ok('PUT', '/api/jornada/avaliacao', '', { data: hoje(), resultado: 'positivo' });
  j = await ok('GET', '/api/jornada', '');
  assert.strictEqual(j.jornada.dia_atual, 5); assert.strictEqual(j.trilha.length, 30);
  assert.strictEqual(j.estatisticas.sequencia_positiva, 2); assert.strictEqual(j.estatisticas.positivos, 2);
  await ok('PUT', '/api/jornada/avaliacao', '', { data: hoje(), resultado: 'negativo', nota: 'ruim' });
  j = await ok('GET', '/api/jornada', '');
  assert.strictEqual(j.estatisticas.sequencia_positiva, 0); assert.strictEqual(j.estatisticas.melhor_sequencia, 1);
  assert.strictEqual(j.avaliacao_hoje.resultado, 'negativo');
  assert.strictEqual((await A.chamar('PUT', '/api/jornada/avaliacao', '', { data: amanha(), resultado: 'positivo' })).status, 400);
  await ok('DELETE', '/api/jornada/avaliacao', `data=${hoje()}`);
  assert.strictEqual((await ok('GET', '/api/jornada', '')).avaliacao_hoje, null);
});

test('backup: exportar e importar', async () => {
  zerar();
  await ok('POST', '/api/rotina/modelo', '');
  await ok('POST', '/api/financas/gastos', '', { texto: '12 no ifood' });
  await ok('POST', '/api/tarefas', '', { titulo: 'a' });
  const json = await A.exportar();
  assert.ok((await A.resumo()).ultimo_backup);
  zerar();
  assert.strictEqual((await A.resumo()).registros, 0);
  const res = await A.importar(json);
  assert.deepStrictEqual([res.gastos, res.tarefas, res.itens], [1, 1, 13]);
  assert.strictEqual((await ok('GET', '/api/tarefas', '')).tarefas.length, 1);
  await assert.rejects(A.importar('lixo'));
  await assert.rejects(A.importar('{"app":"outro"}'));
});

test('rota inexistente', async () => {
  assert.strictEqual((await A.chamar('GET', '/api/nada', '')).status, 404);
});

test('preferências: padrão, salvar, sanitizar, backup e apagar tudo', async () => {
  zerar();
  let r = await ok('GET', '/api/preferencias', '');
  assert.strictEqual(r.salvo, false); assert.strictEqual(r.preferencias.meta_diaria, 3);
  r = await ok('PUT', '/api/preferencias', '', { tema: 'escuro', cor: 'roxo', meta_diaria: 7, dias_folga: [0, 6, 6, 9], semana_inicio: 1, home: { gastos: false }, lixo: 1, lembrete_backup: 99 });
  assert.deepStrictEqual(r.preferencias.dias_folga, [0, 6]);
  assert.strictEqual(r.preferencias.lembrete_backup, 14);
  assert.strictEqual(r.preferencias.home.gastos, false); assert.strictEqual(r.preferencias.home.barras, true);
  assert.strictEqual(r.preferencias.lixo, undefined);
  r = await ok('GET', '/api/preferencias', '');
  assert.strictEqual(r.salvo, true); assert.strictEqual(r.preferencias.cor, 'roxo');
  await ok('POST', '/api/tarefas', '', { titulo: 'a' });
  const json = await A.exportar();
  await A.apagarTudo();
  assert.strictEqual((await ok('GET', '/api/tarefas', '')).tarefas.length, 0);
  assert.strictEqual((await ok('GET', '/api/preferencias', '')).preferencias.cor, 'roxo');
  await ok('PUT', '/api/preferencias', '', { cor: 'verde' });
  await A.importar(json);
  assert.strictEqual((await ok('GET', '/api/preferencias', '')).preferencias.cor, 'roxo');
  // backup antigo, sem preferências, não apaga as atuais
  const velho = JSON.parse(json); delete velho.preferencias;
  await ok('PUT', '/api/preferencias', '', { cor: 'verde' });
  await A.importar(JSON.stringify(velho));
  assert.strictEqual((await ok('GET', '/api/preferencias', '')).preferencias.cor, 'verde');
  assert.strictEqual((await ok('GET', '/api/preferencias', '')).preferencias.tema, 'claro'); // o app é sempre branco
});

test('finanças: entradas, saldo, limites e contas fixas', async () => {
  zerar();
  await ok('POST', '/api/financas/gastos', '', { texto: '40 no ifood' });
  const e = await ok('POST', '/api/financas/gastos', '', { texto: '1500 de salário', tipo: 'receita' });
  assert.strictEqual(e.registrados[0].categoria, 'Entrada');
  let l = await ok('GET', '/api/financas/gastos', '');
  assert.strictEqual(l.total, 40); assert.strictEqual(l.entradas, 1500); assert.strictEqual(l.saldo, 1460);
  assert.ok(l.por_categoria.every((c) => c.categoria !== 'Entrada'));
  const ent = l.gastos.find((g) => g.tipo === 'receita');
  await ok('PUT', `/api/financas/gastos/${ent.id}`, '', { valor: 1600, categoria: 'Lazer' });
  l = await ok('GET', '/api/financas/gastos', '');
  assert.strictEqual(l.entradas, 1600); assert.strictEqual(l.gastos.find((g) => g.id === ent.id).categoria, 'Entrada');
  // limites
  assert.strictEqual((await A.chamar('PUT', '/api/financas/orcamento', '', { categorias: { Lazer: -1 } })).status, 400);
  assert.strictEqual((await A.chamar('PUT', '/api/financas/orcamento', '', { categorias: { Nada: 10 } })).status, 400);
  await ok('PUT', '/api/financas/orcamento', '', { total: 800, categorias: { Alimentação: 300, Lazer: 0 } });
  l = await ok('GET', '/api/financas/gastos', '');
  assert.deepStrictEqual(l.orcamento, { total: 800, categorias: { 'Alimentação': 300 } });
  // contas fixas
  assert.strictEqual((await A.chamar('POST', '/api/financas/recorrentes', '', { descricao: '', valor: 10, dia: 5 })).status, 400);
  assert.strictEqual((await A.chamar('POST', '/api/financas/recorrentes', '', { descricao: 'Netflix', valor: 10, dia: 40 })).corpo.detail, 'O dia deve ficar entre 1 e 31.');
  const r = await ok('POST', '/api/financas/recorrentes', '', { descricao: 'Netflix', valor: 39.9, dia: 31, categoria: 'Assinaturas' });
  l = await ok('GET', '/api/financas/gastos', 'mes=2026-02');
  assert.strictEqual(l.recorrentes[0].data_prevista, '2026-02-28'); assert.strictEqual(l.recorrentes[0].lancado, false);
  const lan = await ok('POST', `/api/financas/recorrentes/${r.id}/lancar`, '', { mes: '2026-02' });
  assert.strictEqual(lan.data, '2026-02-28');
  assert.strictEqual((await A.chamar('POST', `/api/financas/recorrentes/${r.id}/lancar`, '', { mes: '2026-02' })).status, 409);
  l = await ok('GET', '/api/financas/gastos', 'mes=2026-02');
  assert.strictEqual(l.recorrentes[0].lancado, true); assert.strictEqual(l.total, 39.9);
  await ok('PUT', `/api/financas/recorrentes/${r.id}`, '', { descricao: 'Netflix HD', valor: 55, dia: 10, categoria: 'Assinaturas' });
  // backup preserva tudo e aceita backup antigo (sem tipo)
  const json = await A.exportar();
  zerar(); await A.importar(json);
  l = await ok('GET', '/api/financas/gastos', '');
  assert.strictEqual(l.entradas, 1600); assert.strictEqual(l.orcamento.total, 800); assert.strictEqual(l.recorrentes[0].descricao, 'Netflix HD');
  const velho = { app: 'brain', gastos: [{ id: 1, valor: 9, categoria: 'Lazer', descricao: 'x', data: '2026-01-02' }] };
  zerar(); await A.importar(JSON.stringify(velho));
  assert.strictEqual((await ok('GET', '/api/financas/gastos', 'mes=2026-01')).total, 9);
});

test('jornada: abandonar, histórico e recomeçar', async () => {
  zerar();
  assert.strictEqual((await A.chamar('POST', '/api/jornada/abandonar', '', {})).status, 409);
  await ok('PUT', '/api/jornada/config', '', { nome: 'Foco', duracao: 30, inicio: T.iso(T.addDias(T.hojeData(), -4)) });
  const r = await ok('POST', '/api/jornada/abandonar', '', { motivo: 'Prova chegando' });
  assert.strictEqual(r.jornada.status, 'abandonada'); assert.strictEqual(r.jornada.dias_cumpridos, 4);
  let j = await ok('GET', '/api/jornada', '');
  assert.strictEqual(j.jornada.dia_atual, null); assert.strictEqual(j.historico.length, 1); assert.strictEqual(j.historico[0].motivo, 'Prova chegando');
  assert.strictEqual((await A.chamar('POST', '/api/jornada/abandonar', '', {})).status, 409);
  // recomeçar e concluir: a concluída vai para o histórico ao começar outra
  await ok('PUT', '/api/jornada/config', '', { nome: 'Curta', duracao: 7, inicio: T.iso(T.addDias(T.hojeData(), -10)) });
  assert.strictEqual((await A.chamar('POST', '/api/jornada/abandonar', '', {})).status, 409);
  await ok('PUT', '/api/jornada/config', '', { nome: 'Nova', duracao: 30 });
  j = await ok('GET', '/api/jornada', '');
  assert.deepStrictEqual(j.historico.map((h) => h.status), ['concluida', 'abandonada']);
  assert.strictEqual(j.jornada.nome, 'Nova');
  const json = await A.exportar(); zerar(); await A.importar(json);
  assert.strictEqual((await ok('GET', '/api/jornada', '')).historico.length, 2);
  await A.apagarTudo();
  assert.strictEqual((await ok('GET', '/api/jornada', '')).historico.length, 0);
});

test('coach: avisa gasto concentrado, limite e tarefas', () => {
  const C = require('../site/coach.js');
  const base = { agora: new Date(2026, 9, 10, 18), hoje: '2026-10-10', tom: 'amigo', tarefas: [{ titulo: 'Estudar', data: '2026-10-10', feita: 0 }], fin: { atual: { total: 500, entradas: 0, gastos: [], por_categoria: [{ categoria: 'Alimentação', valor: 300, quantidade: 5 }, { categoria: 'Lazer', valor: 200, quantidade: 2 }], orcamento: { total: 0, categorias: {} } }, anterior: null } };
  let r = C.analisar(base);
  assert.ok(r.mensagens.some((m) => m.area === 'gasto' && /Alimentação/.test(m.texto)));
  assert.strictEqual(r.alvo, 'Estudar');
  base.fin.atual.orcamento = { total: 0, categorias: { Lazer: 150 } };
  r = C.analisar(base);
  assert.ok(r.mensagens.some((m) => /limite/i.test(m.texto) && /Lazer/.test(m.texto)));
  assert.notStrictEqual(C.analisar({ ...base, tom: 'firme' }).mensagens[0].texto, C.analisar(base).mensagens[0].texto);
  assert.ok(/2 minutos/.test(C.responder('estou sem vontade', base)));
  assert.ok(/R\$/.test(C.responder('como estão meus gastos?', base)));
  assert.ok(C.responder('qualquer coisa estranha', base).length > 20);
  // sem dados: não quebra
  assert.ok(Array.isArray(C.analisar({ agora: new Date(), hoje: '2026-10-10', tarefas: [], fin: {} }).mensagens));
});

test('coach: conversa fora do roteiro nunca quebra', () => {
  const C = require('../site/coach.js');
  const ctx = { agora: new Date(2026, 9, 10, 19), hoje: '2026-10-10', tom: 'amigo', tarefas: [{ titulo: 'Estudar', data: '2026-10-10', feita: 0 }], fin: {} };
  const entradas = ['olá', 'Olá!', 'oi', 'tudo bem?', 'obrigado', 'kkk', 'quem é você', 'tchau', 'sdfsdf', '', '   ', '👍', 'previsão do tempo', 'me conta uma piada', '2+2', 'oi, como estão meus gastos?', 'estou triste', 'ok', 'Boa noite', '<script>alert(1)</script>', 'a'.repeat(5000)];
  for (const q of entradas) {
    const r = C.conversar(q, ctx, { falhas: 0 });
    assert.strictEqual(typeof r.texto, 'string', q);
    assert.ok(r.texto.length > 10 && !/object Object|undefined|NaN/.test(r.texto), q + ' => ' + r.texto);
    assert.ok(Array.isArray(r.sugestoes));
  }
  assert.strictEqual(C.conversar('olá', ctx, {}).intencao, 'saudacao');
  assert.strictEqual(C.conversar('me conta uma piada', ctx, {}).intencao, 'fora_escopo');
  assert.strictEqual(C.conversar('quero morrer', ctx, {}).intencao, 'crise');
  assert.ok(/188/.test(C.responder('não quero mais viver', ctx)));
  const st = { falhas: 0 };
  assert.strictEqual(C.conversar('xkcd', ctx, st).intencao, 'fallback');
  assert.strictEqual(C.conversar('xkcd', ctx, st).intencao, 'fallback2');
  // contexto ausente ou quebrado
  assert.ok(C.responder('oi', null).length > 5);
  assert.ok(C.responder('oi', {}).length > 5);
  assert.ok(C.responder('como estão meus gastos', { agora: new Date(), fin: { atual: { total: 100, por_categoria: [] } } }).length > 5);
});

test('agenda: link do Google e arquivo .ics', () => {
  const G = require('../site/agenda.js');
  const u = new URL(G.googleUrl({ titulo: 'Prova de física & química', data: '2026-10-12', hora: '19:30' }));
  assert.strictEqual(u.hostname, 'calendar.google.com');
  assert.strictEqual(u.searchParams.get('dates'), '20261012T193000/20261012T203000');
  assert.strictEqual(u.searchParams.get('text'), 'Prova de física & química');
  assert.strictEqual(new URL(G.googleUrl({ titulo: 'X', data: '2026-12-31' })).searchParams.get('dates'), '20261231/20270101');
  assert.strictEqual(G.googleUrl({ titulo: 'sem data' }), null);
  const r = G.ics([
    { id: 1, titulo: 'Estudar; revisar, tudo', data: '2026-10-12', hora: '23:30', feita: 0 },
    { id: 2, titulo: 'Dia todo', data: '2026-10-13', hora: null, feita: 0 },
    { id: 3, titulo: 'Feita', data: '2026-10-13', hora: null, feita: 1 },
    { id: 4, titulo: 'Sem data', data: null, hora: null, feita: 0 },
  ], { agora: new Date(Date.UTC(2026, 9, 10, 12, 0, 0)) });
  assert.strictEqual(r.eventos, 2);
  assert.ok(r.texto.startsWith('BEGIN:VCALENDAR\r\n') && r.texto.endsWith('END:VCALENDAR\r\n'));
  assert.ok(r.texto.includes('DTSTART:20261012T233000') && r.texto.includes('DTEND:20261013T003000'));
  assert.ok(r.texto.includes('DTSTART;VALUE=DATE:20261013') && r.texto.includes('DTEND;VALUE=DATE:20261014'));
  assert.ok(r.texto.includes('SUMMARY:Estudar\\; revisar\\, tudo'));
  assert.ok(!r.texto.includes('Sem data') && !r.texto.includes('SUMMARY:Feita'));
  assert.strictEqual(G.ics([{ id: 3, titulo: 'F', data: '2026-10-13', feita: 1 }], { incluirFeitas: true }).eventos, 1);
});

test('prefs: gradientes válidos e cores antigas continuam', () => {
  const P = require('../site/prefs.js');
  for (const k of ['aurora', 'sol', 'oceano', 'floresta', 'fogo', 'vinho', 'noite']) {
    assert.strictEqual(P.sanitizar({ cor: k }).cor, k);
    assert.strictEqual(P.CORES[k].claro.length, 4); assert.strictEqual(P.CORES[k].escuro.length, 4);
  }
  assert.strictEqual(P.sanitizar({ cor: 'verde' }).cor, 'verde');
  assert.strictEqual(P.sanitizar({ cor: 'inexistente' }).cor, 'azul');
});

test('estudos: leitura de texto, ciclo, revisão, estatísticas e backup', async () => {
  const E = require('../site/estudos.js');
  const m = (() => { // semana de exemplo montada aqui no teste
    const nomes = ['Física', 'Biologia', 'Química', 'Matemática', 'Português', 'História', 'Geografia'];
    const materias = nomes.map((nome, i) => ({ id: i + 1, nome, cor: i, prioridade: 2, meta_h: 0 }));
    const b = []; let id = 100;
    const add = (dia, ini, fim, titulo, tipo, mat) => b.push({ id: id++, dia, ini, fim, titulo, tipo, materia_id: mat || null });
    const manha = { 1: 1, 2: 2, 3: 3, 4: 1, 5: 3 };
    for (let d = 1; d <= 5; d++) { add(d, '05:00', '06:00', nomes[manha[d] - 1], 'estudo', manha[d]); add(d, '07:30', '12:30', 'Escola', 'escola'); add(d, '14:00', '17:00', 'Trabalho', 'trabalho'); add(d, '18:30', '22:10', 'Aulas', 'aula'); }
    for (let i = 0; i < 5; i++) add(6, E.hhmm(14 * 60 + 30 + i * 60), E.hhmm(15 * 60 + 30 + i * 60), 'Ciclo de estudos', 'estudo');
    return E.sanitizar({ materias, blocos: b });
  })();
  assert.ok(m.materias.length === 7 && m.blocos.length >= 25);
  assert.strictEqual(E.conflitos(m.blocos).length, 0);
  const r = E.lerTexto('seg a sex 05:00-06:00 física\nter e qui das 14h às 16h30 matemática\nsábado 14h por 3h ciclo de estudos\nfim de semana 8h-9h redação\nlixo sem horário\nseg, qua e sex 6h às 7h academia', m.materias);
  assert.strictEqual(r.ignoradas.length, 1);
  assert.strictEqual(r.blocos.filter((b) => b.titulo === 'Física').length, 5);
  const mat = r.blocos.find((b) => b.titulo === 'Matemática'); assert.strictEqual(mat.ini, '14:00'); assert.strictEqual(mat.fim, '16:30'); assert.ok(mat.materia_id);
  const ciclo = r.blocos.find((b) => /ciclo/i.test(b.titulo)); assert.strictEqual(ciclo.fim, '17:00'); assert.strictEqual(ciclo.tipo, 'estudo');
  assert.ok(r.blocos.some((b) => b.titulo === 'Redação' && b.dia === 0));
  assert.strictEqual(r.blocos.find((b) => /academia/i.test(b.titulo)).tipo, 'treino');
  // ciclo de matérias
  const g = E.gerarPlano(m); assert.strictEqual(g.atribuicoes.length, 5);
  assert.ok(new Set(g.atribuicoes.map((a) => a.materia_id)).size >= 4);
  assert.strictEqual(E.gerarPlano(E.estadoVazio()).atribuicoes.length, 0);
  // agora / próximo (segunda 05:30 = Física)
  const ap = E.agoraProximo(m.blocos, new Date(2026, 9, 12, 5, 30)); assert.strictEqual(ap.atual.titulo, 'Física');
  // revisão espaçada
  const e = E.estadoVazio(); const rev = E.criarRevisao(e, 'Cinemática', null, '2026-10-01');
  assert.strictEqual(rev.proxima, '2026-10-02'); assert.strictEqual(E.revisoesDevidas(e, '2026-10-02').length, 1);
  E.concluirRevisao(rev, '2026-10-02'); assert.strictEqual(rev.proxima, '2026-10-08');
  E.concluirRevisao(rev, '2026-10-08'); assert.strictEqual(rev.proxima, '2026-10-31');
  E.concluirRevisao(rev, '2026-10-31'); E.concluirRevisao(rev, '2027-01-30'); assert.strictEqual(rev.concluida, true);
  // estatísticas
  e.sessoes.push({ id: 1, data: '2026-10-10', minutos: 50, materia_id: null }, { id: 2, data: '2026-10-09', minutos: 25, materia_id: null });
  const st = E.estatisticas(e, '2026-10-10'); assert.strictEqual(st.hoje, 50); assert.strictEqual(st.sequencia, 2); assert.strictEqual(st.semana, 75);
  // vestibular e mensagens
  e.vestibulares.push({ id: 5, nome: 'ENEM', data: '2026-11-08', foco: true });
  assert.strictEqual(E.proximoVestibular(e, '2026-10-10').dias, 29);
  assert.ok(E.mensagens({ e, hoje: '2026-10-10', agora: new Date(2026, 9, 10, 18) }).some((x) => /ENEM/.test(x.texto)));
  assert.ok(/ENEM/.test(E.responder('quanto falta pro enem', { e, hoje: '2026-10-10', agora: new Date(2026, 9, 10, 18) })));
  assert.strictEqual(E.responder('oi tudo bem', { e, hoje: '2026-10-10' }), null);
  // API: salvar, sanitizar, backup
  zerar();
  const sujo = { materias: [{ id: 1, nome: 'Física' }, { nome: '' }], blocos: [{ dia: 1, ini: '05:00', fim: '06:00', titulo: 'Física', tipo: 'estudo', materia_id: 1 }, { dia: 9, ini: '99:00', fim: '06:00', titulo: 'x' }], foto: 'javascript:alert(1)', nota: 'ok' };
  const put = await ok('PUT', '/api/estudos', '', { estudos: sujo });
  assert.strictEqual(put.estudos.materias.length, 1); assert.strictEqual(put.estudos.blocos.length, 1); assert.strictEqual(put.estudos.foto, null);
  assert.strictEqual((await A.chamar('PUT', '/api/estudos', '', { estudos: 'x' })).status, 400);
  const json = await A.exportar(); zerar(); await A.importar(json);
  assert.strictEqual((await ok('GET', '/api/estudos', '')).estudos.nota, 'ok');
  await A.apagarTudo();
  assert.strictEqual((await ok('GET', '/api/estudos', '')).estudos.blocos.length, 0);
});

test('coach: entende perguntas de estudo', () => {
  const C = require('../site/coach.js');
  const E = require('../site/estudos.js');
  const e = E.estadoVazio(); e.vestibulares.push({ id: 1, nome: 'UFSC', data: '2026-12-01', foco: true });
  const ctx = { agora: new Date(2026, 9, 10, 18), hoje: '2026-10-10', tom: 'amigo', tarefas: [], fin: {}, estudos: e };
  assert.ok(/UFSC/.test(C.responder('quanto falta para a prova?', ctx)));
  assert.ok(/recuperação ativa/i.test(C.responder('qual a melhor técnica de estudo?', ctx)));
  assert.ok(C.analisar(ctx).mensagens.some((m) => m.area === 'estudo'));
});

test('leitor de foto: interpreta resposta da IA e trata erros', async () => {
  const L = require('../site/leitor.js');
  const mats = [{ id: 1, nome: 'Física' }];
  const r = L.interpretar('```json\n[{"dia":1,"ini":"5:00","fim":"06:00","titulo":"Física","tipo":"estudo"},{"dia":"sexta","ini":"18h30","fim":"19:20","titulo":"Aula: Davi","tipo":"aula"},{"dia":9,"ini":"x","fim":"y","titulo":"ruim"},{"dia":2,"ini":"10:00","fim":"09:00","titulo":"invertido"}]\n```', mats);
  assert.strictEqual(r.blocos.length, 2); assert.strictEqual(r.ignoradas.length, 2);
  assert.strictEqual(r.blocos[0].ini, '05:00'); assert.strictEqual(r.blocos[0].materia_id, 1);
  assert.strictEqual(r.blocos[1].dia, 5); assert.strictEqual(r.blocos[1].ini, '18:30');
  assert.ok(L.interpretar('não é json', mats).erro);
  assert.strictEqual(L.interpretar('{"blocos":[{"dia":0,"ini":"07:00","fim":"08:00","titulo":"X","tipo":"???"}]}', mats).blocos[0].tipo, 'outro');
  assert.strictEqual(L.escolherModelo([{ name: 'models/gemini-1.5-pro', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-2.5-flash-lite', supportedGenerationMethods: ['generateContent'] }, { name: 'models/text-embedding', supportedGenerationMethods: ['embedContent'] }]), 'gemini-2.5-flash');
  const img = 'data:image/jpeg;base64,AAAA';
  const chaves = [];
  const falso = (resp, status = 200) => async (url, op) => { chaves.push([url, op && op.body]); return { ok: status === 200, status, json: async () => resp }; };
  const ok2 = async (url, op) => (op ? { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '[{"dia":3,"ini":"08:00","fim":"09:00","titulo":"Química","tipo":"estudo"}]' }] } }] }) } : { ok: true, status: 200, json: async () => ({ models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }] }) });
  const res = await L.lerFoto({ chave: 'AIza' + 'x'.repeat(30), imagem: img, materias: mats, fetchFn: ok2 });
  assert.strictEqual(res.blocos.length, 1); assert.strictEqual(res.modelo, 'gemini-2.5-flash');
  await assert.rejects(L.lerFoto({ chave: 'curta', imagem: img, materias: mats, fetchFn: ok2 }), /chave/);
  await assert.rejects(L.lerFoto({ chave: 'AIza' + 'x'.repeat(30), imagem: 'oi', materias: mats, fetchFn: ok2 }), /Arquivo inválido/);
  await assert.rejects(L.lerFoto({ chave: 'AIza' + 'x'.repeat(30), imagem: img, materias: mats, fetchFn: falso({ error: { message: 'API key not valid' } }, 400) }), /não foi aceita/);
  await assert.rejects(L.lerFoto({ chave: 'AIza' + 'x'.repeat(30), imagem: img, materias: mats, modelo: 'm', fetchFn: falso({}, 429) }), /Limite/);
  await assert.rejects(L.lerFoto({ chave: 'AIza' + 'x'.repeat(30), imagem: img, materias: mats, modelo: 'm', fetchFn: async () => { throw new Error('x'); } }), /conexão/);
});

test('boas-vindas: plano personalizado e perfil sanitizado', () => {
  const O = require('../site/onboarding.js');
  const a = O.plano({ nome: '  Leo  ', foco: 'dificil', disc: 'baixa', tarefas: 'nada', estudos: 'sem', dinheiro: 'nada', rotina: 'sem', prioridade: ['estudos', 'x', 'tarefas', 'rotina'], tom: 'calmo' });
  assert.equal(a.perfil.nome, 'Leo');
  assert.deepEqual(a.perfil.prioridade, ['estudos', 'tarefas']);
  assert.equal(a.prefs.meta_diaria, 2);
  assert.equal(a.prefs.meta_semanal, 10);
  assert.equal(a.prefs.coach_tom, 'calmo');
  assert.equal(a.passos.length, 3);
  assert.equal(a.passos[0].id, 'estudos');
  const b = O.plano({ foco: 'bom', disc: 'alta', tarefas: 'ok', estudos: 'nao', dinheiro: 'nao', rotina: 'firme' });
  assert.equal(b.prefs.meta_diaria, 6);
  assert.equal(b.prefs.home.gastos, false);
  assert.ok(!b.passos.some((p) => p.id === 'estudos' || p.id === 'financas'));
  const c = O.plano({ foco: 'lixo', nome: 5, prioridade: 'x' });
  assert.deepEqual(c.perfil, {});
  assert.ok(c.passos.length >= 1);
  const P = require('../site/prefs.js');
  assert.equal(P.sanitizar({ onboarding: 'sim', perfil: { nome: 'A', foco: '<b>' } }).onboarding, false);
  assert.deepEqual(P.sanitizar({ onboarding: true, perfil: { nome: 'A', foco: 'dificil', zz: 1 } }).perfil, { nome: 'A', foco: 'dificil' });
});

test('boas-vindas v2: motivo, ritmo, horas, dias e índice de constância', () => {
  const O = require('../site/onboarding.js');
  const P = require('../site/prefs.js');
  const r = O.sanitizarPerfil({ motivo: 'vestibular', motivacoes: ['curso', 'x', 'familia', 'tempo', 'grana'], ritmo: 'rapido', horas: 2.5, dias: 6 });
  assert.equal(r.motivo, 'vestibular'); assert.deepEqual(r.motivacoes, ['curso', 'familia', 'tempo']);
  assert.equal(r.ritmo, 'rapido'); assert.equal(r.horas, 2.5); assert.equal(r.dias, 6);
  const ruim = O.sanitizarPerfil({ motivo: 'hack', ritmo: 'x', horas: 99, dias: 9, motivacoes: 'a' });
  assert.deepEqual(ruim, {});
  assert.deepEqual(O.sanitizarPerfil({ dias: null, horas: null }), {});
  assert.equal(O.constancia({}).pct, 50);
  assert.equal(O.constancia({ foco: 'dificil', disc: 'baixa', tarefas: 'nada', rotina: 'sem' }).pct, 0);
  assert.equal(O.constancia({ foco: 'bom', disc: 'alta', tarefas: 'ok', rotina: 'firme' }).nivel, 'Firme');
  const lento = O.plano({ tarefas: 'acumula', ritmo: 'leve' }); const rapido = O.plano({ tarefas: 'acumula', ritmo: 'rapido' });
  assert.equal(lento.prefs.meta_diaria, 2); assert.equal(rapido.prefs.meta_diaria, 4);
  const pl = O.plano({ motivo: 'dinheiro', horas: 1.5, dias: 4 });
  assert.equal(pl.passos[0].id, 'financas');
  assert.ok(pl.ajustes.some((x) => /1 h 30 por dia, 4 dias por semana \(6 h\)/.test(x)));
  assert.equal(P.sanitizar({ perfil: { motivo: 'notas', ritmo: 'leve', horas: 3, dias: 5, motivacoes: ['curso', '<b>'] } }).perfil.motivacoes.length, 1);
  assert.equal(P.sanitizar({ perfil: { horas: 20, dias: 9 } }).perfil.horas, undefined);
});

test('desfazer apagar: restaura tarefa e lançamento com o mesmo id', async () => {
  A._armazem.memoria = null;
  const t = await ok('POST', '/api/tarefas', '', { titulo: 'Ler capítulo 3', data: '2026-10-12', hora: '10:00' });
  await ok('PATCH', `/api/tarefas/${t.id}/alternar`, '', {});
  const antes = (await ok('GET', '/api/tarefas', '')).tarefas.find((x) => x.id === t.id);
  await ok('DELETE', `/api/tarefas/${t.id}`, '');
  assert.ok(!(await ok('GET', '/api/tarefas', '')).tarefas.some((x) => x.id === t.id));
  await ok('POST', '/api/restaurar', '', { colecao: 'tarefas', item: antes });
  const dep = (await ok('GET', '/api/tarefas', '')).tarefas.find((x) => x.id === t.id);
  assert.equal(dep.titulo, 'Ler capítulo 3'); assert.equal(dep.hora, '10:00'); assert.ok(dep.feita);
  await ok('POST', '/api/financas/gastos', '', { texto: '40 no mercado' });
  const lista = await ok('GET', '/api/financas/gastos', '');
  const item = lista.gastos[0]; const gid = item.id;
  await ok('DELETE', `/api/financas/gastos/${gid}`, '');
  await ok('POST', '/api/restaurar', '', { colecao: 'gastos', item });
  assert.ok((await ok('GET', '/api/financas/gastos', '')).gastos.some((x) => x.id === gid && x.valor === 40));
  assert.strictEqual((await A.chamar('POST', '/api/restaurar', '', { colecao: 'gastos', item: { valor: -3 } })).status, 400);
  assert.strictEqual((await A.chamar('POST', '/api/restaurar', '', { colecao: 'x', item: {} })).status, 400);
});

test('revisão: avaliar como no Anki (bom avança, pouco em 3 dias, esqueci recomeça)', () => {
  const ES = require('../site/estudos.js');
  const e = ES.estadoVazio();
  const r = ES.criarRevisao(e, 'Cinemática', null, '2026-10-01');
  ES.avaliarRevisao(r, 'bom', '2026-10-02');
  assert.equal(r.etapa, 1);
  assert.ok(r.proxima > '2026-10-02');
  ES.avaliarRevisao(r, 'dificil', '2026-10-09');
  assert.equal(r.etapa, 1); assert.equal(r.proxima, '2026-10-12');
  ES.avaliarRevisao(r, 'esqueci', '2026-10-12');
  assert.equal(r.etapa, 0); assert.equal(r.proxima, '2026-10-13'); assert.equal(r.concluida, false);
});

test('tarefas v2: marcas rápidas, prioridade, lista, subtarefas e repetição', async () => {
  const TF = require('../site/tarefas.js');
  const m = TF.extrairMarcas('Estudar física amanhã 19h !alta #estudos todo dia');
  assert.equal(m.prioridade, 3); assert.equal(m.lista, 'estudos'); assert.equal(m.repetir, 'diaria');
  assert.equal(m.titulo, 'Estudar física amanhã 19h');
  assert.equal(TF.extrairMarcas('ler !média').prioridade, 2);
  assert.equal(TF.extrairMarcas('ler dias úteis').repetir, 'dias_uteis');
  assert.equal(TF.extrairMarcas('c#sharp não é lista').lista, '');
  assert.equal(TF.proximaData('2026-10-09', 'dias_uteis'), '2026-10-12');
  assert.equal(TF.proximaData('2026-01-31', 'mensal'), '2026-02-28');
  assert.equal(TF.proximaData('2026-10-10', 'semanal'), '2026-10-17');
  zerar();
  const t = await ok('POST', '/api/tarefas', '', { titulo: 'Revisar matéria !alta #escola toda semana', data: hoje(), subtarefas: [{ titulo: 'Capítulo 1' }, { titulo: ' ' }, { titulo: 'Capítulo 2', feita: 1 }] });
  assert.equal(t.titulo, 'Revisar matéria'); assert.equal(t.prioridade, 3); assert.equal(t.lista, 'escola'); assert.equal(t.repetir, 'semanal');
  assert.equal(t.subtarefas.length, 2);
  let l = (await ok('GET', '/api/tarefas', '')).tarefas;
  assert.equal(l[0].subtarefas[1].feita, 1);
  // editar mantém o que não vier no corpo
  await ok('PUT', `/api/tarefas/${t.id}`, '', { titulo: 'Revisar matéria', data: hoje(), hora: null, nota: 'Foco nos exercícios' });
  l = (await ok('GET', '/api/tarefas', '')).tarefas;
  assert.equal(l[0].prioridade, 3); assert.equal(l[0].nota, 'Foco nos exercícios');
  // concluir uma que se repete cria a próxima; desfazer remove a próxima
  await ok('PATCH', `/api/tarefas/${t.id}/alternar`, '', {});
  l = (await ok('GET', '/api/tarefas', '')).tarefas;
  assert.equal(l.length, 2);
  const prox = l.find((x) => !x.feita);
  assert.equal(prox.data, TF.proximaData(hoje(), 'semanal')); assert.ok(prox.subtarefas.every((s) => !s.feita));
  await ok('PATCH', `/api/tarefas/${t.id}/alternar`, '', {});
  assert.equal((await ok('GET', '/api/tarefas', '')).tarefas.length, 1);
  // repetição sem data usa hoje; backup mantém os campos
  const r = await ok('POST', '/api/tarefas', '', { titulo: 'Beber água todo dia' });
  assert.equal(r.data, hoje());
  const bk = await ok('GET', '/api/exportar', '').catch(() => null);
  const copia = bk || JSON.parse(await A.exportar());
  assert.ok(JSON.stringify(copia).includes('"prioridade":3') || JSON.stringify(copia).includes('"prioridade": 3'));
  // valores inválidos viram padrão
  const x = await ok('POST', '/api/tarefas', '', { titulo: 'Qualquer', prioridade: 9, repetir: 'x', lista: '#  Casa  ' });
  assert.equal(x.prioridade, 0); assert.equal(x.repetir, ''); assert.equal(x.lista, 'Casa');
});

test('metas de economia: criar, guardar, editar, apagar e backup', async () => {
  zerar();
  const m = await ok('POST', '/api/financas/metas', '', { nome: 'Viagem de formatura', alvo: 1000, prazo: amanha() });
  await ok('POST', `/api/financas/metas/${m.id}/guardar`, '', { valor: 250 });
  let l = (await ok('GET', '/api/financas/metas', '')).metas;
  assert.equal(l[0].guardado, 250); assert.equal(l[0].alvo, 1000);
  await ok('POST', `/api/financas/metas/${m.id}/guardar`, '', { valor: -400 });
  assert.equal((await ok('GET', '/api/financas/metas', '')).metas[0].guardado, 0);
  assert.equal((await A.chamar('POST', '/api/financas/metas', '', { nome: '', alvo: 10 })).status, 400);
  assert.equal((await A.chamar('POST', '/api/financas/metas', '', { nome: 'x', alvo: -1 })).status, 400);
  assert.equal((await A.chamar('POST', `/api/financas/metas/${m.id}/guardar`, '', { valor: 0 })).status, 400);
  await ok('PUT', `/api/financas/metas/${m.id}`, '', { nome: 'Viagem', alvo: 1500 });
  await ok('POST', `/api/financas/metas/${m.id}/guardar`, '', { valor: 100 });
  const copia = JSON.parse(await A.exportar());
  assert.equal(copia.metas_fin[0].nome, 'Viagem');
  zerar();
  await A.importar(JSON.stringify(copia));
  assert.equal((await ok('GET', '/api/financas/metas', '')).metas[0].guardado, 100);
  await ok('DELETE', `/api/financas/metas/${m.id}`, '');
  assert.equal((await ok('GET', '/api/financas/metas', '')).metas.length, 0);
});

test('cofre: ativar, bloquear, desbloquear, trocar e desativar senha', async () => {
  A._armazem.memoria = null; A._armazem.chave = null; A._armazem.modo = 'memoria';
  const cf = A.cofre;
  await ok('POST', '/api/tarefas', '', { titulo: 'Segredo de estado' });
  assert.equal(await cf.protegido(), false);
  await assert.rejects(cf.ativar('123'), /4 a 64/);
  await cf.ativar('minha senha forte');
  assert.equal(await cf.protegido(), true);
  assert.equal(await cf.bloqueado(), false);
  // o armazenamento só tem texto cifrado
  const bruto = A._armazem.memoria;
  assert.ok(!bruto.includes('Segredo de estado'));
  assert.equal(JSON.parse(bruto).brain_cifrado, 1);
  // continua funcionando desbloqueado, e grava cifrado
  await ok('POST', '/api/tarefas', '', { titulo: 'Outra tarefa' });
  assert.ok(!A._armazem.memoria.includes('Outra tarefa'));
  // bloqueado: nada responde
  cf.bloquear();
  assert.equal(await cf.bloqueado(), true);
  const r = await A.chamar('GET', '/api/tarefas', '', null);
  assert.equal(r.status, 423);
  await assert.rejects(cf.desbloquear('errada'), /Senha incorreta/);
  await cf.desbloquear('minha senha forte');
  const lista = await ok('GET', '/api/tarefas', '', null);
  assert.equal((lista.tarefas || lista).length, 2);
  // backup protegido
  const bk = await A.exportarCifrado('senha do backup');
  assert.ok(!bk.includes('Segredo de estado'));
  await assert.rejects(A.importar(bk), /protegido por senha/);
  await assert.rejects(A.importar(bk, 'outra'), /incorreta/);
  // trocar e desativar
  await assert.rejects(cf.trocar('errada', 'nova senha 1'), /Senha incorreta/);
  await cf.trocar('minha senha forte', 'nova senha 1');
  cf.bloquear();
  await assert.rejects(cf.desbloquear('minha senha forte'), /Senha incorreta/);
  await cf.desbloquear('nova senha 1');
  await assert.rejects(cf.desativar('x'), /Senha incorreta/);
  await cf.desativar('nova senha 1');
  assert.equal(await cf.protegido(), false);
  assert.ok(A._armazem.memoria.includes('Outra tarefa'));
  // restaurar o backup protegido
  const rs = await A.importar(bk, 'senha do backup');
  assert.equal(rs.tarefas, 2);
});

// ---------------------------------------------------------------- gamificação (ofensiva)
const JG = require('../site/jogo.js');
const dia = (n) => T.iso(T.addDias(T.hojeData(), -n));
// um dia "completo" = 6 itens da rotina (30 XP e 3+ itens = entrega)
const comRotina = (...ns) => ({ rotina_registros: ns.flatMap((n) => [1, 2, 3, 4, 5, 6].map((i) => ({ item_id: i, data: dia(n) }))), tarefas: [], avaliacoes: [], gastos: [], estudos: null });

test('ofensiva: sem registros começa "nova" e não quebra nada', () => {
  const r = JG.calcular({}, {}, hoje());
  assert.equal(r.estado, 'nova'); assert.equal(r.sequencia, 0); assert.equal(r.escudos, 1);
  assert.equal(r.semana.length, 7);
});

test('ofensiva: dias seguidos acumulam e hoje vazio fica "em risco", sem quebrar', () => {
  let r = JG.calcular(comRotina(0, 1, 2, 3), {}, hoje());
  assert.equal(r.estado, 'ativa'); assert.equal(r.sequencia, 4);
  r = JG.calcular(comRotina(1, 2, 3), {}, hoje());
  assert.equal(r.estado, 'em_risco'); assert.equal(r.sequencia, 3);
});

test('ofensiva: um dia perdido gasta o escudo; o segundo quebra', () => {
  let r = JG.calcular(comRotina(0, 2, 3), {}, hoje());           // perdeu o dia 1, escudo cobre
  assert.equal(r.sequencia, 3); assert.equal(r.escudos, 0);
  const sd = r.semana.find((s) => s.data === dia(1)); if (sd) assert.equal(sd.estado, 'escudo'); // a faixa semanal pode não incluir ontem (domingo)
  r = JG.calcular(comRotina(0, 4, 5, 6), {}, hoje());            // perdeu os dias 3, 2 e 1; só há 1 escudo
  assert.equal(r.estado, 'ativa'); assert.equal(r.sequencia, 1); assert.ok(r.perdida && r.perdida.valor === 3); assert.equal(r.melhor, 3);
});

test('ofensiva: quebrou ontem e hoje ainda dá para resgatar com 40 XP', () => {
  const e = comRotina(4, 5, 6);                                   // dias 3 e 2 sem registro: escudo no 3, quebra no 2... e 1 também
  let r = JG.calcular(e, {}, hoje());
  assert.equal(r.estado, 'quebrada'); assert.equal(r.sequencia, 0);
  const e2 = comRotina(3, 4, 5);                                  // escudo cobre o dia 2, perdeu o dia 1
  r = JG.calcular(e2, {}, hoje());
  assert.equal(r.estado, 'quebrada'); assert.equal(r.resgatavel, true); assert.equal(r.resgate.falta, JG.META_RESGATE);
  for (let i = 0; i < 8; i++) e2.rotina_registros.push({ item_id: 100 + i, data: hoje() }); // 40 XP hoje, com entrega (rotina)
  r = JG.calcular(e2, {}, hoje());
  assert.equal(r.estado, 'ativa'); assert.equal(r.sequencia, 4); assert.equal(r.salvou_hoje, true);
});

test('ofensiva: dia de folga e modo férias não quebram; escudo ganho a cada 7 dias (máx. 2)', () => {
  const e = comRotina(0, 1, 3, 4);                                // buraco no dia 2
  const dow = T.deIso(dia(2)).getDay();
  let r = JG.calcular(e, { dias_folga: [dow] }, hoje());
  assert.equal(r.sequencia, 4); assert.equal(r.escudos, 1);
  r = JG.calcular(comRotina(0, 1, 4, 5), { modo_ferias: true }, hoje());
  assert.equal(r.sequencia, 4);
  r = JG.calcular(comRotina(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13), {}, hoje());
  assert.equal(r.sequencia, 14); assert.equal(r.escudos, JG.ESCUDOS_MAX); assert.equal(r.semana_perfeita, true);
  assert.deepEqual(r.marcos_ok, [3, 7, 14]);
});

test('ofensiva: XP e nível vêm de tarefas, estudos, revisões e gastos (sem contar o futuro)', () => {
  const e = { tarefas: [{ feita: 1, concluida_em: hoje() }, { feita: 1, concluida_em: amanha() }], rotina_registros: [], avaliacoes: [{ data: hoje(), resultado: 'positivo' }],
    estudos: { sessoes: [{ data: hoje(), minutos: 25 }], revisoes: [{ estudado_em: hoje() }] }, gastos: [1, 2, 3, 4, 5].map(() => ({ data: hoje() })) };
  const r = JG.calcular(e, {}, hoje());
  assert.equal(r.xp_hoje, 10 + 10 + (10 + 5) + 8 + 3 * 4);
  assert.equal(r.nivel.n, 2);
});

test('API: GET /api/jogo responde com o painel da ofensiva', async () => {
  zerar();
  let r = await ok('GET', '/api/jogo', '');
  assert.equal(r.estado, 'nova');
  await ok('POST', '/api/tarefas', '', { titulo: 'Estudar', data: hoje() });
  const t = (await ok('GET', '/api/tarefas', '')).tarefas || [];
  const id = t.length ? t[0].id : 1;
  await ok('PUT', `/api/tarefas/${id}/alternar`, '').catch(() => null);
  r = await ok('GET', '/api/jogo', '');
  assert.ok(['nova', 'ativa'].includes(r.estado));
});

test('ofensiva: só anotar gasto ou avaliar o dia NÃO completa o dia', () => {
  const e = { tarefas: [], rotina_registros: [], avaliacoes: [{ data: hoje(), resultado: 'positivo' }], gastos: [1, 2, 3].map(() => ({ data: hoje() })), estudos: null };
  let r = JG.calcular(e, {}, hoje());
  assert.equal(r.dia.xp, 22); assert.equal(r.dia.xp_ok, false); assert.equal(r.dia.entrega, false);
  assert.equal(r.ativo_hoje, false); assert.equal(r.sequencia, 0);
  assert.equal(r.semana.find((s) => s.hoje).estado, 'parcial');
  r = JG.calcular(e, { ofensiva_leve: true }, hoje());           // modo leve: qualquer ação vale
  assert.equal(r.ativo_hoje, true); assert.equal(r.sequencia, 1); assert.equal(r.modo, 'leve');
});

test('ofensiva: 30 XP sem entrega não vale; tarefa + XP suficiente vale', () => {
  const sem = { tarefas: [], rotina_registros: [], avaliacoes: [{ data: hoje() }], gastos: [1, 2, 3].map(() => ({ data: hoje() })), estudos: { sessoes: [], revisoes: [] } };
  sem.rotina_registros = [{ item_id: 1, data: hoje() }, { item_id: 2, data: hoje() }];   // 22 + 10 = 32 XP, só 2 itens da rotina
  let r = JG.calcular(sem, {}, hoje());
  assert.equal(r.dia.xp_ok, true); assert.equal(r.dia.entrega, false); assert.equal(r.ativo_hoje, false);
  sem.tarefas = [{ feita: 1, concluida_em: hoje() }];                                       // agora há uma entrega real
  r = JG.calcular(sem, {}, hoje());
  assert.equal(r.dia.entrega, true); assert.equal(r.ativo_hoje, true); assert.equal(r.sequencia, 1);
});

test('ofensiva: foco de 15 min, uma revisão ou 3 itens da rotina contam como entrega', () => {
  const base = () => ({ tarefas: [], rotina_registros: [1, 2, 3, 4].map((i) => ({ item_id: i, data: hoje() })), avaliacoes: [{ data: hoje() }], gastos: [], estudos: { sessoes: [], revisoes: [] } }); // 30 XP
  let e = base(); e.rotina_registros = e.rotina_registros.slice(0, 2); e.estudos.sessoes = [{ data: hoje(), minutos: 15 }];
  assert.equal(JG.calcular(e, {}, hoje()).dia.entrega, true);
  e = base(); e.rotina_registros = e.rotina_registros.slice(0, 2); e.estudos.sessoes = [{ data: hoje(), minutos: 10 }];
  assert.equal(JG.calcular(e, {}, hoje()).dia.entrega, false);
  e = base(); e.rotina_registros = e.rotina_registros.slice(0, 2); e.estudos.revisoes = [{ estudado_em: hoje() }];
  assert.equal(JG.calcular(e, {}, hoje()).dia.entrega, true);
  assert.equal(JG.calcular(base(), {}, hoje()).dia.entrega, true);                           // 4 itens da rotina
});

test('ofensiva: dia passado só com ação simples gasta o escudo (não conta)', () => {
  const e = comRotina(0, 2, 3);
  e.gastos.push({ data: dia(1) });                                                          // ontem: só um gasto
  const r = JG.calcular(e, {}, hoje());
  assert.equal(r.semana.find((s) => s.data === dia(1)) ? r.semana.find((s) => s.data === dia(1)).estado : 'escudo', 'escudo');
  assert.equal(r.sequencia, 3);
});

test('estudos: cronograma personalizado encaixa os estudos nos horários livres', () => {
  const E = require('../site/estudos.js');
  const fixos = [];
  for (let d = 1; d <= 5; d++) { fixos.push({ dia: d, ini: '07:30', fim: '12:30', titulo: 'Escola', tipo: 'escola' }, { dia: d, ini: '14:00', fim: '17:00', titulo: 'Trabalho', tipo: 'trabalho' }); }
  const mats = [{ id: 1, nome: 'Matemática', prioridade: 3, meta_h: 0 }, { id: 2, nome: 'Física', prioridade: 2, meta_h: 0 }, { id: 3, nome: 'Redação', prioridade: 1, meta_h: 0 }, { id: 4, nome: 'Química', prioridade: 2, meta_h: 0 }];
  const r = E.montarCronograma(fixos, { horasSemana: 10, materias: mats, diasLivres: [0], foco: ['redação'] });
  assert.ok(r.blocos.length >= 7);
  assert.ok(r.resumo.minutos >= 9 * 60 && r.resumo.minutos <= 11 * 60, 'perto da meta: ' + r.resumo.minutos);
  assert.ok(!r.blocos.some((b) => b.dia === 0), 'domingo livre');
  assert.strictEqual(E.conflitos(fixos.concat(r.blocos)).length, 0, 'sem choque com aula/trabalho');
  assert.ok(r.blocos.every((b) => b.tipo === 'estudo' && b.ini < b.fim));
  assert.ok(new Set(r.blocos.map((b) => b.titulo)).size >= 4);
  for (const d of [1, 2, 3, 4, 5, 6]) { const l = r.blocos.filter((b) => b.dia === d); for (let i = 1; i < l.length; i++) assert.notStrictEqual(l[i].titulo, l[i - 1].titulo); }
  // prioridade alta recebe mais tempo que baixa, mesmo com o foco em Redação
  assert.ok((r.resumo.porMateria['Matemática'] || 0) >= (r.resumo.porMateria['Química'] || 0));
  // sem matérias cadastradas usa as padrão
  const p = E.montarCronograma([], { horasSemana: 6 });
  assert.ok(p.blocos.length > 0 && E.MATERIAS_PADRAO.includes(p.blocos[0].titulo));
  // semana toda ocupada: avisa
  const cheio = []; for (let d = 0; d < 7; d++) cheio.push({ dia: d, ini: '05:00', fim: '22:30', titulo: 'Ocupado', tipo: 'outro' });
  const v = E.montarCronograma(cheio, { horasSemana: 5 });
  assert.strictEqual(v.blocos.length, 0); assert.ok(v.avisos.length >= 1);
  // planilha
  const csv = E.planilhaTexto(r.blocos); assert.ok(csv.startsWith('\ufeffHorário;Segunda;Terça'));
  assert.ok(E.planilhaTexto(r.blocos, 'tsv').split('\r\n')[0].split('\t').length === 8);
  assert.ok(E.grade(r.blocos).linhas.length > 4);
});

test('rotina: reordenar por arraste respeita horários crescentes', async () => {
  zerar();
  const O = require('../site/ordem.js');
  const mk = (titulo, hora) => ok('POST', '/api/rotina/itens', '', { periodo: 'manha', tipo: 'ritual', titulo, hora });
  const a = (await mk('A 07', '07:00')).id, b = (await mk('B 08', '08:00')).id, c = (await mk('C livre', null)).id, d = (await mk('D 09', '09:00')).id;
  const ids = async () => (await ok('GET', '/api/rotina', '')).itens.map((i) => i.id);
  assert.deepStrictEqual(await ids(), [a, b, d, c]);
  // regra pura
  const L = (await ok('GET', '/api/rotina', '')).itens;
  assert.strictEqual(O.movimentoValido(L, a, 1).ok, false);  // 07 não pode ficar depois das 08
  assert.strictEqual(O.movimentoValido(L, d, 0).ok, false);  // 09 não pode subir acima das 07
  assert.strictEqual(O.movimentoValido(L, d, 2).ok, true);   // passar para depois do livre vale
  assert.strictEqual(O.movimentoValido(L, c, 0).ok, true);   // sem horário vai para qualquer lugar
  // servidor: sem horário no topo, depois volta
  await ok('PUT', '/api/rotina/ordem', '', { ids: [c, a, b, d] });
  assert.deepStrictEqual(await ids(), [c, a, b, d]);
  await ok('PUT', '/api/rotina/ordem', '', { ids: [a, c, b, d] });
  assert.deepStrictEqual(await ids(), [a, c, b, d]);
  assert.strictEqual((await A.chamar('PUT', '/api/rotina/ordem', '', { ids: [b, a, c, d] })).status, 400);
  assert.strictEqual((await A.chamar('PUT', '/api/rotina/ordem', '', { ids: [a, 999] })).status, 404);
  assert.strictEqual((await A.chamar('PUT', '/api/rotina/ordem', '', { ids: [] })).status, 400);
  // item novo entra pelo horário, sem desmanchar o que foi arrastado
  const e = (await mk('E 08:30', '08:30')).id, f = (await mk('F sem hora', null)).id;
  assert.deepStrictEqual(await ids(), [a, c, b, e, d, f]);
  // mudar o horário reposiciona o item
  await ok('PUT', `/api/rotina/itens/${e}`, '', { periodo: 'manha', tipo: 'ritual', titulo: 'E', hora: '06:00' });
  assert.deepStrictEqual((await ids()).slice(0, 2), [e, a]);
  // sobrevive ao backup
  const bk = JSON.parse(await A.exportar());
  assert.ok(bk.rotina_itens.some((i) => Number.isInteger(i.ordem)));
});

test('comprovante: interpreta a resposta da IA com validação', async () => {
  const L = require('../site/leitor.js');
  const r = L.interpretarComprovante('```json\n[{"valor":"R$ 1.234,56","descricao":"  Mercado   Bom Preço ","data":"2026-10-10","categoria":"Alimentação","tipo":"despesa"},{"valor":0,"descricao":"x"},{"valor":15,"descricao":"Uber","data":"2099-01-01","categoria":"Foo","tipo":"receita"},{"valor":"abc","descricao":"y"}]\n```', '2026-10-12');
  assert.strictEqual(r.itens.length, 2);
  assert.strictEqual(r.ignorados, 2);
  assert.deepStrictEqual(r.itens[0], { valor: 1234.56, descricao: 'Mercado Bom Preço', data: '2026-10-10', categoria: 'Alimentação', tipo: 'despesa' });
  assert.deepStrictEqual(r.itens[1], { valor: 15, descricao: 'Uber', data: '2026-10-12', categoria: '', tipo: 'receita' });
  assert.ok(L.interpretarComprovante('não é json', '2026-10-12').erro);
  assert.deepStrictEqual(L.interpretarComprovante('[]', '2026-10-12').itens, []);
  assert.match(L.montarPromptComprovante('2026-10-12'), /VALOR TOTAL/);
  // chamada completa com fetch simulado
  const f = async (url) => (String(url).includes(':generateContent')
    ? { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '[{"valor":32.9,"descricao":"iFood"}]' }] } }] }) }
    : { ok: true, status: 200, json: async () => ({ models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }] }) });
  const out = await L.lerComprovante({ chave: 'AIza' + 'x'.repeat(30), imagem: 'data:image/jpeg;base64,AAAA', hoje: '2026-10-12', fetchFn: f });
  assert.strictEqual(out.itens[0].valor, 32.9);
  await assert.rejects(L.lerComprovante({ chave: 'curta', imagem: 'data:image/jpeg;base64,AAAA', hoje: '2026-10-12', fetchFn: f }), /chave/i);
  // registro de item estruturado (o que a prévia envia)
  zerar();
  const reg = await ok('POST', '/api/financas/gastos', '', { tipo: 'despesa', item: { valor: 32.9, descricao: 'iFood', data: hoje() } });
  assert.strictEqual(reg.registrados[0].valor, 32.9);
});

test('estudos: cor livre da matéria e texto legível', () => {
  const ES = require('../site/estudos.js');
  const e = ES.sanitizar({ materias: [{ id: 1, nome: 'A', cor: '#E11D48' }, { id: 2, nome: 'B', cor: 3 }, { id: 3, nome: 'C', cor: 'vermelho' }] });
  assert.strictEqual(ES.corMateria(e.materias[0]), '#e11d48');
  assert.strictEqual(ES.corMateria(e.materias[1]), ES.CORES_MATERIA[3]);
  assert.match(ES.corMateria(e.materias[2]), /^#[0-9a-f]{6}$/);
  assert.strictEqual(ES.textoSobre('#ffffff'), '#1c2330');
  assert.strictEqual(ES.textoSobre('#000000'), '#ffffff');
  assert.strictEqual(ES.textoSobre('#2f5fb3'), '#ffffff');
});

test('IA não repete o que já existe (gasto, entrada, tarefa, compromisso)', async () => {
  zerar();
  const item = { valor: 87.45, descricao: 'Supermercado Dia', data: hoje() };
  await ok('POST', '/api/financas/gastos', '', { tipo: 'despesa', item });
  const rep = await A.chamar('POST', '/api/financas/gastos', '', { tipo: 'despesa', item: { ...item, descricao: 'Mercado' } });
  assert.strictEqual(rep.status, 409);
  assert.match(rep.corpo.detail, /Já existe um gasto de R\$\s?87,45/);
  await ok('POST', '/api/financas/gastos', '', { tipo: 'receita', item });          // tipo diferente não conta
  await ok('POST', '/api/financas/gastos', '', { tipo: 'despesa', forcar: true, item }); // "adicionar mesmo assim"
  await ok('POST', '/api/financas/gastos', '', { tipo: 'despesa', item: { ...item, valor: 10 } });
  assert.strictEqual((await ok('GET', '/api/financas/gastos', '')).gastos.filter((g) => g.valor === 87.45).length, 3);
  // tarefas: só a IA é barrada; manual continua livre
  await ok('POST', '/api/tarefas', '', { titulo: 'Estudar química', data: hoje(), origem: 'ia' });
  assert.strictEqual((await A.chamar('POST', '/api/tarefas', '', { titulo: 'estudar quimica', data: hoje(), origem: 'ia' })).status, 409);
  await ok('POST', '/api/tarefas', '', { titulo: 'Estudar química', data: hoje() });
  await ok('POST', '/api/tarefas', '', { titulo: 'Estudar química', data: hoje(), origem: 'ia', forcar: true });
  // helpers de foto
  const L = require('../site/leitor.js'), ES = require('../site/estudos.js');
  const m = L.marcarDuplicados([{ valor: 87.45, data: hoje(), tipo: 'despesa', descricao: 'a' }, { valor: 5, data: hoje(), tipo: 'despesa', descricao: 'b' }, { valor: 5, data: hoje(), tipo: 'despesa', descricao: 'c' }], [{ tipo: 'despesa', valor: 87.45, data: hoje(), descricao: 'Mercado' }]);
  assert.deepStrictEqual(m.map((x) => x.dup), ['Mercado', undefined, 'repetido nesta foto']);
  assert.ok(ES.blocoIgual({ dia: 1, ini: '07:00', fim: '12:00', titulo: 'Escola' }, { dia: 1, ini: '07:00', fim: '12:00', titulo: 'escola' }));
  assert.ok(!ES.blocoIgual({ dia: 1, ini: '07:00', fim: '12:00', titulo: 'Escola' }, { dia: 2, ini: '07:00', fim: '12:00', titulo: 'Escola' }));
});

test('leitor aceita PDF além de imagem', async () => {
  const L = require('../site/leitor.js');
  let corpo = null;
  const f = async (url, o) => { if (String(url).includes(':generateContent')) { corpo = JSON.parse(o.body); return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '[{"valor":10,"descricao":"x"}]' }] } }] }) }; } return { ok: true, status: 200, json: async () => ({ models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }] }) }; };
  const r = await L.lerComprovante({ chave: 'AIza' + 'x'.repeat(30), imagem: 'data:application/pdf;base64,JVBERi0=', hoje: '2026-10-12', fetchFn: f });
  assert.strictEqual(r.itens.length, 1);
  assert.strictEqual(corpo.contents[0].parts[1].inline_data.mime_type, 'application/pdf');
  await assert.rejects(L.lerComprovante({ chave: 'AIza' + 'x'.repeat(30), imagem: 'data:text/plain;base64,AAAA', hoje: '2026-10-12', fetchFn: f }), /inválido/);
  assert.ok(L.ehPdf({ name: 'Fatura.PDF', type: '' }) && !L.ehPdf({ name: 'a.png', type: 'image/png' }));
});
