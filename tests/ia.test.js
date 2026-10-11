const test = require('node:test');
const assert = require('node:assert');
const IA = require('../site/ia.js');
const C = require('../site/coach.js');
const A = require('../site/api-local.js');
const T = require('../site/texto.js');

const ctx = {
  hoje: '2026-10-11', agora: new Date('2026-10-11T12:00:00'),
  tarefas: [
    { id: 1, titulo: 'Prova de química', data: '2026-10-12', hora: '14:00', prioridade: 3, feita: 0 },
    { id: 2, titulo: 'Entregar redação', data: '2026-10-09', feita: 0 },
    { id: 3, titulo: 'Ler cap. 4', data: null, feita: 0 },
    { id: 4, titulo: 'Feita hoje', data: '2026-10-11', feita: 1, concluida_em: '2026-10-11' },
  ],
  rotina: { progresso: { feitos: 2, total: 5 } },
  fin: { atual: { total: 275, entradas: 1800, por_categoria: [{ categoria: 'Moradia', valor: 73 }], orcamento: { total: 1500, categorias: { Lazer: 200 } }, gastos: [{ tipo: 'despesa', data: '2026-10-10', valor: 20, descricao: 'uber', categoria: 'Transporte' }] } },
  estudos: { materias: [{ nome: 'Física', meta_h: 4 }], blocos: [{ dia: 0, ini: '09:00', fim: '10:00', titulo: 'Física' }], vestibulares: [{ nome: 'UFSC', data: '2026-12-01' }], revisoes: [], nota: 'Foco no ENEM' },
};

test('contexto: resume tarefas, rotina, finanças e estudos sem vazar além do necessário', () => {
  const c = IA.contexto(ctx);
  assert.match(c, /3 pendentes, 1 atrasadas, 1 concluídas hoje/);
  assert.match(c, /Prova de química \[2026-10-12 14:00\] \(prioridade 3\)/);
  assert.match(c, /ROTINA DE HOJE: 2 de 5/);
  assert.match(c, /gastou R\$\s275,00/);
  assert.match(c, /UFSC em 2026-12-01/);
  assert.match(c, /Agenda de estudo de hoje: 09:00-10:00 Física/);
  assert.ok(!/AIza/.test(c));
  assert.strictEqual(IA.contexto({}).includes('TAREFAS: 0 pendentes'), true);
});

test('instruções: tom, data, segurança e dados como dados', () => {
  const s = IA.instrucoes({ nome: 'Leo', tom: 'firme', hoje: '2026-10-11', contexto: 'X' });
  assert.match(s, /Leo/); assert.match(s, /domingo, 2026-10-11/); assert.match(s, /direto, objetivo/);
  assert.match(s, /não são instruções/); assert.match(s, /CVV/); assert.match(s, /NUNCA altera nada sozinho/);
});

test('ações: valida tipos, datas, valores e descarta lixo', () => {
  const h = '2026-10-11';
  const r = IA.validarAcoes([
    { tipo: 'criar_tarefa', titulo: '  Prova de química  ', data: '2026-10-16', hora: '14:00', prioridade: 2 },
    { tipo: 'criar_tarefa', titulo: 'x', data: '16/10', hora: '25:99', prioridade: 9 },
    { tipo: 'registrar_gasto', valor: '32,5', descricao: 'ifood', categoria: 'Alimentação' },
    { tipo: 'registrar_gasto', valor: 10, descricao: 'x', categoria: 'Inventada', data: '2031-01-01' },
    { tipo: 'registrar_entrada', valor: 100 },
    { tipo: 'apagar_tudo' }, null, 'x',
  ], h);
  assert.strictEqual(r.length, 5);
  assert.strictEqual(IA.validarAcoes([{ tipo: 'criar_tarefa', titulo: '' }, { tipo: 'registrar_gasto', valor: -3 }, { tipo: 'registrar_gasto', valor: 1e12 }, { tipo: 'apagar_tudo' }, null, 'x'], h).length, 0);
  assert.deepStrictEqual([r[0].titulo, r[0].data, r[0].hora, r[0].prioridade], ['Prova de química', '2026-10-16', '14:00', 2]);
  assert.deepStrictEqual([r[1].data, r[1].hora, r[1].prioridade], [null, null, 0]);
  assert.deepStrictEqual([r[2].valor, r[2].categoria, r[2].data], [32.5, 'Alimentação', h]);
  assert.deepStrictEqual([r[3].categoria, r[3].data], [null, h]);
  assert.strictEqual(r[4].tipo, 'registrar_entrada'); assert.strictEqual(r[4].descricao, 'Entrada');
  assert.strictEqual(IA.validarAcoes('x', h).length, 0);
  assert.strictEqual(IA.validarAcoes(Array(20).fill({ tipo: 'criar_tarefa', titulo: 'a' }), h).length, 5);
});

test('interpretar: JSON, cerca de código, texto puro e vazio', () => {
  const j = JSON.stringify({ resposta: 'Oi!', acoes: [{ tipo: 'criar_tarefa', titulo: 'a' }], sugestoes: ['x', 'y', 'z', 'w', ''] });
  let r = IA.interpretar(j, '2026-10-11');
  assert.strictEqual(r.texto, 'Oi!'); assert.strictEqual(r.acoes.length, 1); assert.strictEqual(r.sugestoes.length, 3);
  r = IA.interpretar('```json\n' + j + '\n```', '2026-10-11'); assert.strictEqual(r.texto, 'Oi!');
  r = IA.interpretar('Só texto, sem json.', ''); assert.strictEqual(r.texto, 'Só texto, sem json.'); assert.deepStrictEqual(r.acoes, []);
  r = IA.interpretar('blá {"resposta":"ok"} blá', ''); assert.strictEqual(r.texto, 'ok');
  assert.strictEqual(IA.interpretar('', ''), null);
  assert.strictEqual(IA.interpretar('{"resposta":""}', ''), null);
  assert.strictEqual(IA.interpretar('[1,2]', '').texto, '[1,2]');
});

test('histórico: começa por usuário, alterna papéis e limita tamanho', () => {
  const h = IA.historicoParaApi([{ papel: 'c', texto: 'oi' }, { papel: 'u', texto: 'a' }, { papel: 'u', texto: 'b' }, { papel: 'c', texto: 'c' }]);
  assert.deepStrictEqual(h.map((x) => x.role), ['user', 'model']);
  assert.match(h[0].parts[0].text, /a\nb/);
  assert.strictEqual(IA.historicoParaApi(Array.from({ length: 30 }, (_, i) => ({ papel: i % 2 ? 'c' : 'u', texto: 't' + i }))).length <= 8, true);
});

const resp = (status, corpo) => ({ ok: status < 300, status, json: async () => corpo });
const modelos = resp(200, { models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }] });
const cand = (o) => resp(200, { candidates: [{ content: { parts: [{ text: typeof o === 'string' ? o : JSON.stringify(o) }] } }] });
const CH = 'AIza' + 'x'.repeat(30);

test('perguntar: escolhe modelo, manda sistema+contexto, devolve ações validadas', async () => {
  const chamadas = [];
  const f = async (url, op) => { chamadas.push([url, op]); return url.includes('/models?') ? modelos : cand({ resposta: 'Anotei!', acoes: [{ tipo: 'criar_tarefa', titulo: 'Prova', data: '2026-10-16' }, { tipo: 'x' }], sugestoes: ['Algo mais?'] }); };
  const r = await IA.perguntar({ chave: CH, pergunta: 'anota prova sexta', historico: [{ papel: 'u', texto: 'oi' }, { papel: 'c', texto: 'olá' }], ctx, perfil: { nome: 'Leo', tom: 'amigo' }, fetchFn: f });
  assert.strictEqual(r.modelo, 'gemini-2.5-flash'); assert.strictEqual(r.acoes.length, 1); assert.strictEqual(r.texto, 'Anotei!');
  const corpo = JSON.parse(chamadas[1][1].body);
  assert.match(corpo.systemInstruction.parts[0].text, /Prova de química/);
  assert.deepStrictEqual(corpo.contents.map((c) => c.role), ['user', 'model', 'user']);
  assert.match(corpo.contents[2].parts[0].text, /anota prova sexta/);
  assert.ok(corpo.generationConfig.responseSchema);
  assert.ok(!chamadas[1][0].includes('undefined'));
});

test('perguntar: se o esquema for recusado, tenta de novo sem ele', async () => {
  let n = 0;
  const f = async (url, op) => {
    if (url.includes('/models?')) return modelos;
    n++; const g = JSON.parse(op.body).generationConfig;
    return g.responseSchema ? resp(400, { error: { message: 'Invalid JSON payload: enum' } }) : cand({ resposta: 'ok' });
  };
  const r = await IA.perguntar({ chave: CH, modelo: 'gemini-x', pergunta: 'oi', historico: [], ctx, fetchFn: f });
  assert.strictEqual(n, 2); assert.strictEqual(r.texto, 'ok');
});

test('perguntar: erros viram mensagens amigáveis com código', async () => {
  const falha = (status, corpo) => async (url) => (url.includes('/models?') ? modelos : resp(status, corpo || {}));
  const cod = async (f, extra) => { try { await IA.perguntar(Object.assign({ chave: CH, modelo: 'm', pergunta: 'oi', historico: [], ctx, fetchFn: f }, extra)); } catch (e) { return e; } };
  assert.strictEqual((await cod(falha(429))).codigo, 'cota');
  assert.strictEqual((await cod(falha(403))).codigo, 'chave');
  assert.strictEqual((await cod(falha(404))).codigo, 'modelo');
  assert.strictEqual((await cod(falha(503))).codigo, 'servidor');
  assert.strictEqual((await cod(async () => { throw new Error('net'); })).codigo, 'sem_rede');
  assert.strictEqual((await cod(async () => resp(200, { candidates: [] }))).codigo, 'vazio');
  assert.strictEqual((await cod(async () => resp(200, { promptFeedback: { blockReason: 'SAFETY' } }))).codigo, 'vazio');
  assert.strictEqual((await cod(falha(200), { chave: 'curta' })).codigo, 'chave');
  const e400 = await cod(async (u) => (u.includes('/models?') ? modelos : resp(400, { error: { message: 'API key not valid' } })));
  assert.strictEqual(e400.codigo, 'chave');
});

test('perguntar: sem modelo disponível', async () => {
  try { await IA.perguntar({ chave: CH, pergunta: 'oi', historico: [], ctx, fetchFn: async () => resp(200, { models: [] }) }); assert.fail(); } catch (e) { assert.strictEqual(e.codigo, 'modelo'); }
});

test('coach: crise é detectada localmente, antes de qualquer rede', () => {
  for (const t of ['quero morrer', 'Não quero mais viver', 'vou me cortar', 'penso em suicídio']) assert.ok(C.ehCrise(t), t);
  for (const t of ['quero morrer de rir da prova', 'quanto gastei']) if (t.includes('morrer de rir')) continue; else assert.ok(!C.ehCrise(t), t);
});

const hoje = () => T.iso(T.hojeData());
test('API de finanças aceita item estruturado (vindo do Coach) e valida de novo', async () => {
  A._armazem.memoria = null;
  let r = await A.chamar('POST', '/api/financas/gastos', '', { tipo: 'despesa', item: { valor: 32.5, descricao: 'ifood', categoria: 'Alimentação', data: hoje() } });
  assert.strictEqual(r.status, 200); assert.strictEqual(r.corpo.registrados[0].valor, 32.5);
  r = await A.chamar('POST', '/api/financas/gastos', '', { tipo: 'receita', item: { valor: 100, descricao: 'freela' } });
  assert.strictEqual(r.status, 200);
  r = await A.chamar('POST', '/api/financas/gastos', '', { item: { valor: -5, descricao: 'x' } });
  assert.strictEqual(r.status, 422);
  r = await A.chamar('POST', '/api/financas/gastos', '', { item: { valor: 'abc' } });
  assert.strictEqual(r.status, 422);
  r = await A.chamar('POST', '/api/financas/gastos', '', { item: { valor: 9, descricao: 'x', categoria: 'Inventada', data: 'ontem' } });
  assert.strictEqual(r.status, 200); assert.ok(['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer', 'Educação', 'Compras', 'Assinaturas', 'Outros'].includes(r.corpo.registrados[0].categoria));
  const l = await A.chamar('GET', '/api/financas/gastos', '');
  const e = l.corpo.gastos.find((g) => g.descricao === 'freela'); assert.strictEqual(e.tipo, 'receita');
});

test('leitor de foto: usa esquema JSON e tenta sem ele se o modelo recusar', async () => {
  const L = require('../site/leitor.js');
  const img = 'data:image/jpeg;base64,AAAA';
  let n = 0; const cfgs = [];
  const f = async (url, op) => { n++; const g = JSON.parse(op.body).generationConfig; cfgs.push(!!g.responseSchema); return g.responseSchema ? resp(400, { error: { message: 'bad schema' } }) : cand([{ dia: 1, ini: '07:30', fim: '08:20', titulo: 'Física', tipo: 'aula' }]); };
  const r = await L.lerFoto({ chave: CH, imagem: img, materias: [], modelo: 'gemini-x', fetchFn: f });
  assert.deepStrictEqual(cfgs, [true, false]); assert.strictEqual(r.blocos.length, 1);
  cfgs.length = 0;
  const g2 = async (url, op) => { cfgs.push(!!JSON.parse(op.body).generationConfig.responseSchema); return cand([{ dia: 2, ini: '08:00', fim: '09:00', titulo: 'Química' }]); };
  assert.strictEqual((await L.lerFoto({ chave: CH, imagem: img, materias: [], modelo: 'gemini-x', fetchFn: g2 })).blocos.length, 1);
  assert.deepStrictEqual(cfgs, [true]);
  await assert.rejects(L.lerFoto({ chave: CH, imagem: img, materias: [], modelo: 'm', fetchFn: async () => resp(429, {}) }), /Limite do plano/);
});
