/* Brain no celular: o "servidor" roda dentro do navegador.

   As páginas continuam chamando fetch('/api/...'). Aqui interceptamos essas chamadas e
   respondemos com dados guardados no próprio aparelho (IndexedDB). Nada sai do celular.
   (Versão em JavaScript dos módulos financas, tarefas, rotina e jornada da versão para PC.) */
(function (root) {
  'use strict';

  const T = typeof require !== 'undefined' && typeof module !== 'undefined' ? require('./texto.js') : root.BrainTexto;
  const P = typeof require !== 'undefined' && typeof module !== 'undefined' ? require('./prefs.js') : (root.BrainPrefs || root.BrainPrefsLib);
  const C = typeof require !== 'undefined' && typeof module !== 'undefined' ? require('./categorias.js') : root.BrainCategorias;
  const { iso, addDias, hojeData, deIso } = T;

  class ErroHTTP extends Error {
    constructor(status, mensagem) { super(mensagem); this.status = status; }
  }
  const erro = (status, mensagem) => { throw new ErroHTTP(status, mensagem); };
  const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
  const texto = (v) => (v === undefined || v === null ? '' : String(v));

  // =========================================================== armazenamento
  const NOME_BANCO = 'brain-local';
  const CHAVE_LS = 'brain-local-estado';

  function estadoVazio() {
    return {
      versao: 1,
      gastos: [], tarefas: [], rotina_itens: [], rotina_registros: [], avaliacoes: [],
      config: {}, preferencias: null, ultimo_backup: null,
    };
  }

  /** Guarda um único documento JSON. IndexedDB primeiro; localStorage ou memória se não houver. */
  const Armazem = {
    modo: null,
    memoria: null,
    _db: null,
    async _abrir() {
      if (this._db) return this._db;
      this._db = await new Promise((resolve, reject) => {
        const req = root.indexedDB.open(NOME_BANCO, 1);
        req.onupgradeneeded = () => req.result.createObjectStore('estado');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        req.onblocked = () => reject(new Error('banco bloqueado'));
      });
      return this._db;
    },
    async ler() {
      if (this.modo === null) {
        try { await this._abrir(); this.modo = 'indexeddb'; }
        catch (e) {
          try { root.localStorage.setItem('__t', '1'); root.localStorage.removeItem('__t'); this.modo = 'localstorage'; }
          catch (e2) { this.modo = 'memoria'; }
        }
      }
      if (this.modo === 'indexeddb') {
        const db = await this._abrir();
        return new Promise((resolve, reject) => {
          const req = db.transaction('estado', 'readonly').objectStore('estado').get('principal');
          req.onsuccess = () => resolve(req.result ? JSON.parse(req.result) : null);
          req.onerror = () => reject(req.error);
        });
      }
      if (this.modo === 'localstorage') { const s = root.localStorage.getItem(CHAVE_LS); return s ? JSON.parse(s) : null; }
      return this.memoria ? JSON.parse(this.memoria) : null;
    },
    async gravar(estado) {
      const json = JSON.stringify(estado);
      if (this.modo === 'indexeddb') {
        const db = await this._abrir();
        return new Promise((resolve, reject) => {
          const tx = db.transaction('estado', 'readwrite');
          tx.objectStore('estado').put(json, 'principal');
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        });
      }
      if (this.modo === 'localstorage') { root.localStorage.setItem(CHAVE_LS, json); return; }
      this.memoria = json;
    },
  };

  let fila = Promise.resolve();
  /** Executa uma operação por vez: lê o estado, deixa o tratador mexer e grava se algo mudou. */
  function executar(tratador) {
    const passo = fila.then(async () => {
      const salvo = await Armazem.ler();
      const estado = Object.assign(estadoVazio(), salvo || {});
      const ctx = { salvar: false };
      const resultado = await tratador(estado, ctx);
      if (ctx.salvar) await Armazem.gravar(estado);
      return resultado;
    });
    fila = passo.catch(() => {});
    return passo;
  }

  const proximoId = (lista) => lista.reduce((m, x) => Math.max(m, x.id || 0), 0) + 1;

  // =========================================================== validações
  function validarData(s, msg) {
    const d = deIso(texto(s));
    if (!d) erro(400, msg || 'Data inválida.');
    return d;
  }
  function validarHora(s) {
    const m = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(texto(s));
    if (!m) erro(400, 'Hora inválida.');
    return `${m[1]}:${m[2]}`;
  }
  const mesValido = (s) => /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

  // =========================================================== finanças
  function retreinar(estado) {
    const hist = estado.gastos
      .slice()
      .sort((a, b) => (a.corrigido ? 1 : 0) - (b.corrigido ? 1 : 0) || a.id - b.id)
      .map((g) => ({ descricao: g.descricao, categoria: g.categoria, corrigido: !!g.corrigido }));
    C.classificador.treinar(hist);
  }

  async function financasRegistrar(estado, ctx, q, corpo) {
    const entrada = texto(corpo && corpo.texto).trim();
    if (!entrada) erro(400, 'Escreva ou fale um gasto.');
    const { itens, ignorados } = T.interpretarGastos(entrada);
    if (!itens.length) erro(422, 'Não achei o valor. Escreva algo como: 32 no ifood, ou: uber 15 reais ontem.');
    retreinar(estado);
    let id = proximoId(estado.gastos);
    for (const item of itens) {
      item.categoria = C.classificador.prever(item.descricao);
      estado.gastos.push({ id: id++, valor: item.valor, categoria: item.categoria, descricao: item.descricao, data: item.data, texto_original: entrada, corrigido: 0 });
    }
    ctx.salvar = true;
    return { registrados: itens, ignorados };
  }

  async function financasListar(estado, ctx, q) {
    const mes = q.get('mes') || iso(hojeData()).slice(0, 7);
    if (!mesValido(mes)) erro(400, 'Use o formato AAAA-MM.');
    const gastos = estado.gastos
      .filter((g) => g.data.slice(0, 7) === mes)
      .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : b.id - a.id))
      .map((g) => ({ id: g.id, valor: g.valor, categoria: g.categoria, descricao: g.descricao, data: g.data }));
    const porCat = new Map();
    for (const g of gastos) {
      const i = porCat.get(g.categoria) || { valor: 0, quantidade: 0 };
      i.valor += g.valor; i.quantidade += 1;
      porCat.set(g.categoria, i);
    }
    return {
      mes,
      total: r2(gastos.reduce((s, g) => s + g.valor, 0)),
      por_categoria: [...porCat.entries()].map(([categoria, i]) => ({ categoria, valor: r2(i.valor), quantidade: i.quantidade })).sort((a, b) => b.valor - a.valor),
      gastos,
      categorias: C.CATEGORIAS,
    };
  }

  async function financasEditar(estado, ctx, q, corpo, params) {
    const atual = estado.gastos.find((g) => g.id === params.id);
    if (!atual) erro(404, 'Gasto não encontrado.');
    corpo = corpo || {};
    const valor = corpo.valor === undefined || corpo.valor === null ? atual.valor : r2(Number(corpo.valor));
    if (!(valor > 0 && valor < 10000000)) erro(400, 'Valor inválido.');
    const descricao = corpo.descricao === undefined || corpo.descricao === null ? atual.descricao : texto(corpo.descricao).trim().slice(0, 120);
    if (!descricao) erro(400, 'A descrição não pode ficar vazia.');
    const categoria = corpo.categoria === undefined || corpo.categoria === null ? atual.categoria : corpo.categoria;
    if (!C.CATEGORIAS.includes(categoria)) erro(400, 'Categoria inválida.');
    const data = corpo.data === undefined || corpo.data === null ? atual.data : iso(validarData(corpo.data));
    const corrigido = categoria !== atual.categoria || descricao !== atual.descricao ? 1 : atual.corrigido;
    Object.assign(atual, { valor, descricao, categoria, data, corrigido });
    ctx.salvar = true;
    return { ok: true };
  }

  async function financasApagar(estado, ctx, q, corpo, params) {
    estado.gastos = estado.gastos.filter((g) => g.id !== params.id);
    ctx.salvar = true;
    return { ok: true };
  }

  // =========================================================== tarefas
  const cmpNulo = (a, b) => (a === null || a === undefined ? 1 : 0) - (b === null || b === undefined ? 1 : 0);
  const cmpTxt = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

  async function tarefasListar(estado) {
    const lista = estado.tarefas.slice().sort((a, b) =>
      (a.feita - b.feita) || cmpNulo(a.data, b.data) || cmpTxt(a.data || '', b.data || '') ||
      cmpNulo(a.hora, b.hora) || cmpTxt(a.hora || '', b.hora || '') || (a.id - b.id));
    return { tarefas: lista.map((t) => ({ id: t.id, titulo: t.titulo, data: t.data, hora: t.hora, feita: t.feita, concluida_em: t.concluida_em || null })) };
  }

  function lerTarefa(corpo) {
    corpo = corpo || {};
    const titulo = texto(corpo.titulo).trim();
    if (!titulo) erro(400, 'Dê um título para a tarefa.');
    const data = corpo.data ? iso(validarData(corpo.data)) : null;
    const hora = corpo.hora ? validarHora(corpo.hora) : null;
    return { titulo, data, hora };
  }

  async function tarefasCriar(estado, ctx, q, corpo) {
    let { titulo, data, hora } = lerTarefa(corpo);
    // Datas e horas escritas no título ("prova sexta 14h") preenchem o que faltar
    const lido = T.interpretarTarefa(titulo);
    data = data || (lido.data ? iso(lido.data) : null);
    hora = hora || lido.hora || null;
    if (data || hora) titulo = lido.titulo;
    titulo = titulo.slice(0, 200);
    const id = proximoId(estado.tarefas);
    estado.tarefas.push({ id, titulo, data, hora, feita: 0, concluida_em: null });
    ctx.salvar = true;
    return { id, titulo, data, hora };
  }

  async function tarefasEditar(estado, ctx, q, corpo, params) {
    const { titulo, data, hora } = lerTarefa(corpo);
    const t = estado.tarefas.find((x) => x.id === params.id);
    if (t) { Object.assign(t, { titulo: titulo.slice(0, 200), data, hora }); ctx.salvar = true; }
    return { ok: true };
  }

  async function tarefasAlternar(estado, ctx, q, corpo, params) {
    const t = estado.tarefas.find((x) => x.id === params.id);
    if (t) { t.feita = 1 - t.feita; t.concluida_em = t.feita ? iso(hojeData()) : null; ctx.salvar = true; }
    return { ok: true };
  }

  async function tarefasApagar(estado, ctx, q, corpo, params) {
    estado.tarefas = estado.tarefas.filter((t) => t.id !== params.id);
    ctx.salvar = true;
    return { ok: true };
  }

  // =========================================================== rotina
  const PERIODOS = ['manha', 'dia', 'noite'];
  const TIPOS = ['ritual', 'habito', 'renuncia'];
  // [período, tipo, título, hora, minutos]. Renúncias aparecem em painel próprio.
  const MODELO = [
    ['manha', 'ritual', 'Acordar e beber um copo de água', '07:00', 2],
    ['manha', 'ritual', 'Arrumar a cama', null, 3],
    ['manha', 'ritual', 'Alongar ou se exercitar', null, 10],
    ['manha', 'ritual', 'Planejar as 3 prioridades do dia', null, 5],
    ['dia', 'habito', 'Estudar com foco, sem celular', null, 60],
    ['dia', 'habito', 'Ler 10 páginas', null, 15],
    ['dia', 'habito', 'Beber 2 litros de água', null, null],
    ['noite', 'ritual', 'Revisar o dia e anotar uma vitória', null, 5],
    ['noite', 'ritual', 'Preparar a roupa e a mochila de amanhã', null, 5],
    ['noite', 'ritual', 'Dormir no mesmo horário', '22:30', null],
    ['dia', 'renuncia', 'Não olhar redes sociais na primeira hora do dia', null, null],
    ['dia', 'renuncia', 'Sem telas 30 minutos antes de dormir', '22:00', null],
    ['dia', 'renuncia', 'Reduzir açúcar e fast food', null, null],
  ];

  function lerItem(corpo) {
    corpo = corpo || {};
    if (!PERIODOS.includes(corpo.periodo)) erro(400, 'Período inválido.');
    if (!TIPOS.includes(corpo.tipo)) erro(400, 'Tipo inválido.');
    const titulo = texto(corpo.titulo).trim();
    if (!titulo) erro(400, 'Dê um nome para o item.');
    const hora = corpo.hora ? validarHora(corpo.hora) : null;
    let minutos = null;
    if (corpo.minutos !== undefined && corpo.minutos !== null) {
      minutos = Number(corpo.minutos);
      if (!Number.isInteger(minutos) || minutos < 1 || minutos > 600) erro(400, 'A duração deve ficar entre 1 e 600 minutos.');
    }
    return { periodo: corpo.periodo, tipo: corpo.tipo, titulo: titulo.slice(0, 120), hora, minutos };
  }

  /** Dias seguidos cumpridos. Se hoje ainda não foi marcado, conta a partir de ontem. */
  function sequencia(datas, hoje) {
    let d = hoje;
    if (!datas.has(iso(d))) d = addDias(d, -1);
    let n = 0;
    while (datas.has(iso(d))) { n++; d = addDias(d, -1); }
    return n;
  }

  /** Para cada dia: quantos itens existiam e quantos foram cumpridos. Itens criados depois do dia não contam. */
  function resumoDias(estado, dias) {
    const ids = new Set(estado.rotina_itens.map((i) => i.id));
    const feitosPorDia = new Map();
    for (const r of estado.rotina_registros) {
      if (!ids.has(r.item_id)) continue;
      if (!feitosPorDia.has(r.data)) feitosPorDia.set(r.data, new Set());
      feitosPorDia.get(r.data).add(r.item_id);
    }
    const saida = {};
    for (const d of dias) {
      const k = iso(d);
      const feitos = feitosPorDia.get(k) || new Set();
      const existentes = new Set(feitos);
      for (const i of estado.rotina_itens) if ((i.criado || '') <= k) existentes.add(i.id);
      saida[k] = { feitos: feitos.size, total: existentes.size };
    }
    return saida;
  }

  async function rotinaListar(estado, ctx, q) {
    const hoje = hojeData();
    const dia = q.get('data') ? validarData(q.get('data')) : hoje;
    const itens = estado.rotina_itens.slice().sort((a, b) => cmpNulo(a.hora, b.hora) || cmpTxt(a.hora || '', b.hora || '') || (a.id - b.id));
    const ids = new Set(itens.map((i) => i.id));
    const porItem = new Map();
    for (const r of estado.rotina_registros) {
      if (!ids.has(r.item_id)) continue;
      if (!porItem.has(r.item_id)) porItem.set(r.item_id, new Set());
      porItem.get(r.item_id).add(r.data);
    }
    const lista = itens.map((i) => {
      const datas = porItem.get(i.id) || new Set();
      return { id: i.id, periodo: i.periodo, tipo: i.tipo, titulo: i.titulo, hora: i.hora, minutos: i.minutos, feito: datas.has(iso(dia)), sequencia: sequencia(datas, hoje) };
    });
    const ultimos = [6, 5, 4, 3, 2, 1, 0].map((k) => addDias(hoje, -k));
    const resumo = resumoDias(estado, ultimos);
    return {
      data: iso(dia),
      itens: lista,
      progresso: { feitos: lista.filter((i) => i.feito).length, total: lista.length },
      semana: ultimos.map((d) => ({ data: iso(d), ...resumo[iso(d)] })),
    };
  }

  async function rotinaCriar(estado, ctx, q, corpo) {
    const item = lerItem(corpo);
    const id = proximoId(estado.rotina_itens);
    estado.rotina_itens.push({ id, ...item, criado: iso(hojeData()) });
    ctx.salvar = true;
    return { id };
  }

  async function rotinaEditar(estado, ctx, q, corpo, params) {
    const item = lerItem(corpo);
    const atual = estado.rotina_itens.find((i) => i.id === params.id);
    if (!atual) erro(404, 'Item não encontrado.');
    Object.assign(atual, item);
    ctx.salvar = true;
    return { ok: true };
  }

  async function rotinaApagar(estado, ctx, q, corpo, params) {
    estado.rotina_registros = estado.rotina_registros.filter((r) => r.item_id !== params.id);
    estado.rotina_itens = estado.rotina_itens.filter((i) => i.id !== params.id);
    ctx.salvar = true;
    return { ok: true };
  }

  async function rotinaMarcar(estado, ctx, q, corpo) {
    corpo = corpo || {};
    const dia = validarData(corpo.data);
    if (dia.getTime() > hojeData().getTime()) erro(400, 'Não dá para marcar um dia que ainda não chegou.');
    const itemId = Number(corpo.item_id);
    if (!estado.rotina_itens.some((i) => i.id === itemId)) erro(404, 'Item não encontrado.');
    const k = iso(dia);
    const existe = estado.rotina_registros.some((r) => r.item_id === itemId && r.data === k);
    if (corpo.feito && !existe) estado.rotina_registros.push({ item_id: itemId, data: k });
    if (!corpo.feito && existe) estado.rotina_registros = estado.rotina_registros.filter((r) => !(r.item_id === itemId && r.data === k));
    ctx.salvar = true;
    return { ok: true };
  }

  async function rotinaModelo(estado, ctx) {
    if (estado.rotina_itens.length) erro(409, 'Você já tem itens na rotina.');
    const criado = iso(hojeData());
    let id = 1;
    for (const [periodo, tipo, titulo, hora, minutos] of MODELO) estado.rotina_itens.push({ id: id++, periodo, tipo, titulo, hora, minutos, criado });
    ctx.salvar = true;
    return { criados: MODELO.length };
  }

  // =========================================================== jornada
  function melhorSequencia(datas) {
    let melhor = 0, atual = 0, anterior = null;
    for (const k of [...datas].sort()) {
      const d = deIso(k);
      atual = anterior && Math.round((d.getTime() - anterior.getTime()) / 86400000) === 1 ? atual + 1 : 1;
      melhor = Math.max(melhor, atual);
      anterior = d;
    }
    return melhor;
  }

  function diaPassadoOuHoje(s) {
    const d = validarData(s);
    if (d.getTime() > hojeData().getTime()) erro(400, 'Esse dia ainda não chegou.');
    return d;
  }

  const diasEntre = (a, b) => Math.round((a.getTime() - b.getTime()) / 86400000);

  async function jornadaPainel(estado, ctx, q) {
    const dias = q.get('dias') === null || q.get('dias') === undefined ? 30 : Number(q.get('dias'));
    if (!Number.isInteger(dias) || dias < 1 || dias > 365) erro(400, 'Escolha entre 1 e 365 dias.');
    const hoje = hojeData();
    const cfg = estado.config || {};
    const avals = new Map(estado.avaliacoes.map((a) => [a.data, { resultado: a.resultado, nota: a.nota || '' }]));
    const inicio = cfg.inicio ? deIso(cfg.inicio) : null;
    const duracao = cfg.duracao ? Number(cfg.duracao) : 30;
    const janela = [];
    for (let k = dias - 1; k >= 0; k--) janela.push(addDias(hoje, -k));
    const trilhaDatas = inicio ? Array.from({ length: duracao }, (_, n) => addDias(inicio, n)) : [];
    const resumo = resumoDias(estado, [...janela, ...trilhaDatas.filter((d) => d.getTime() <= hoje.getTime())]);

    const info = (d) => {
      const k = iso(d);
      const r = resumo[k];
      const a = avals.get(k);
      return { data: k, feitos: r.feitos, total: r.total, cumprimento: r.total ? Math.round((r.feitos / r.total) * 100) : null, avaliacao: a ? a.resultado : null, nota: a ? a.nota : '' };
    };
    const lista = janela.map(info);
    const trilha = trilhaDatas.map((d, n) => {
      const estado_ = d.getTime() > hoje.getTime() ? 'futuro' : d.getTime() === hoje.getTime() ? 'hoje' : 'passado';
      const base = { dia: n + 1, data: iso(d), estado: estado_ };
      return { ...base, ...(d.getTime() <= hoje.getTime() ? info(d) : { cumprimento: null, avaliacao: null }) };
    });
    const cumprimentos = lista.map((x) => x.cumprimento).filter((v) => v !== null);
    const positivas = new Set([...avals.entries()].filter(([, a]) => a.resultado === 'positivo').map(([k]) => k));
    const av = avals.get(iso(hoje));
    const negativaHoje = !!av && av.resultado === 'negativo';
    return {
      hoje: iso(hoje),
      jornada: {
        nome: cfg.nome || 'Minha jornada',
        duracao,
        inicio: inicio ? iso(inicio) : null,
        dia_atual: inicio ? diasEntre(hoje, inicio) + 1 : null,
      },
      avaliacao_hoje: av || null,
      dias: lista,
      trilha,
      estatisticas: {
        positivos: lista.filter((x) => x.avaliacao === 'positivo').length,
        negativos: lista.filter((x) => x.avaliacao === 'negativo').length,
        sem_avaliacao: lista.filter((x) => x.avaliacao === null).length,
        media_cumprimento: cumprimentos.length ? Math.round(cumprimentos.reduce((a, b) => a + b, 0) / cumprimentos.length) : null,
        sequencia_positiva: negativaHoje ? 0 : sequencia(positivas, hoje),
        melhor_sequencia: melhorSequencia(positivas),
      },
    };
  }

  async function jornadaConfig(estado, ctx, q, corpo) {
    corpo = corpo || {};
    const nome = texto(corpo.nome === undefined || corpo.nome === null ? 'Minha jornada' : corpo.nome).trim().slice(0, 40) || 'Minha jornada';
    const duracao = corpo.duracao === undefined || corpo.duracao === null ? 30 : Number(corpo.duracao);
    if (!Number.isInteger(duracao) || duracao < 7 || duracao > 365) erro(400, 'A duração deve ficar entre 7 e 365 dias.');
    const inicio = corpo.inicio ? validarData(corpo.inicio, 'Data de início inválida.') : hojeData();
    if (inicio.getTime() > hojeData().getTime()) erro(400, 'O início não pode ser no futuro.');
    estado.config = { ...estado.config, nome, duracao, inicio: iso(inicio) };
    ctx.salvar = true;
    return { ok: true };
  }

  async function jornadaAvaliar(estado, ctx, q, corpo) {
    corpo = corpo || {};
    const dia = diaPassadoOuHoje(corpo.data);
    if (!['positivo', 'negativo'].includes(corpo.resultado)) erro(400, 'Escolha positivo ou negativo.');
    const nota = texto(corpo.nota).trim().slice(0, 500);
    const k = iso(dia);
    estado.avaliacoes = estado.avaliacoes.filter((a) => a.data !== k);
    estado.avaliacoes.push({ data: k, resultado: corpo.resultado, nota });
    ctx.salvar = true;
    return { ok: true };
  }

  async function jornadaRemover(estado, ctx, q) {
    const dia = diaPassadoOuHoje(q.get('data'));
    const k = iso(dia);
    estado.avaliacoes = estado.avaliacoes.filter((a) => a.data !== k);
    ctx.salvar = true;
    return { ok: true };
  }


  // =========================================================== preferências
  async function prefsLer(estado) {
    return { salvo: !!estado.preferencias, preferencias: P.sanitizar(estado.preferencias) };
  }
  async function prefsSalvar(estado, ctx, q, corpo) {
    estado.preferencias = P.sanitizar(corpo);
    ctx.salvar = true;
    return { ok: true, preferencias: estado.preferencias };
  }

  // =========================================================== roteador
  const id = '(\\d+)';
  const ROTAS = [
    ['POST', '/api/financas/gastos', financasRegistrar],
    ['GET', '/api/financas/gastos', financasListar],
    ['PUT', `/api/financas/gastos/${id}`, financasEditar],
    ['DELETE', `/api/financas/gastos/${id}`, financasApagar],
    ['GET', '/api/tarefas', tarefasListar],
    ['POST', '/api/tarefas', tarefasCriar],
    ['PUT', `/api/tarefas/${id}`, tarefasEditar],
    ['PATCH', `/api/tarefas/${id}/alternar`, tarefasAlternar],
    ['DELETE', `/api/tarefas/${id}`, tarefasApagar],
    ['GET', '/api/rotina', rotinaListar],
    ['POST', '/api/rotina/itens', rotinaCriar],
    ['PUT', `/api/rotina/itens/${id}`, rotinaEditar],
    ['DELETE', `/api/rotina/itens/${id}`, rotinaApagar],
    ['PUT', '/api/rotina/marcar', rotinaMarcar],
    ['POST', '/api/rotina/modelo', rotinaModelo],
    ['GET', '/api/preferencias', prefsLer],
    ['PUT', '/api/preferencias', prefsSalvar],
    ['GET', '/api/jornada', jornadaPainel],
    ['PUT', '/api/jornada/config', jornadaConfig],
    ['PUT', '/api/jornada/avaliacao', jornadaAvaliar],
    ['DELETE', '/api/jornada/avaliacao', jornadaRemover],
  ].map(([metodo, padrao, tratador]) => ({ metodo, re: new RegExp(`^${padrao}$`), tratador }));

  /** Executa uma chamada de API. Devolve { status, corpo }. */
  async function chamar(metodo, caminho, query, corpo) {
    const q = query && typeof query.get === 'function' ? query : new URLSearchParams(query || '');
    const limpo = caminho.replace(/\/+$/, '');
    const existeCaminho = ROTAS.some((r) => r.re.test(limpo));
    const rota = ROTAS.find((r) => r.metodo === metodo && r.re.test(limpo));
    if (!rota) return { status: existeCaminho ? 405 : 404, corpo: { detail: 'Rota não encontrada.' } };
    const m = rota.re.exec(limpo);
    const params = m[1] !== undefined ? { id: Number(m[1]) } : {};
    try {
      const resultado = await executar((estado, ctx) => rota.tratador(estado, ctx, q, corpo, params));
      return { status: 200, corpo: resultado };
    } catch (e) {
      if (e instanceof ErroHTTP) return { status: e.status, corpo: { detail: e.message } };
      if (typeof console !== 'undefined') console.error('Erro interno', e);
      return { status: 500, corpo: { detail: 'Não consegui salvar no aparelho. Verifique o espaço e as permissões do navegador.' } };
    }
  }

  // =========================================================== backup
  function copiaLimpa(estado) {
    return {
      app: 'brain', versao: 1, exportado_em: new Date().toISOString(),
      gastos: estado.gastos, tarefas: estado.tarefas, rotina_itens: estado.rotina_itens,
      rotina_registros: estado.rotina_registros, avaliacoes: estado.avaliacoes, config: estado.config,
      preferencias: estado.preferencias,
    };
  }

  /** Gera o texto JSON do backup e anota a data do último backup. */
  function exportar() {
    return executar(async (estado, ctx) => {
      estado.ultimo_backup = iso(hojeData());
      ctx.salvar = true;
      return JSON.stringify(copiaLimpa(estado), null, 1);
    });
  }

  /** Cópia dos dados sem marcar como backup (usada nas planilhas). */
  function copia() {
    return executar(async (estado) => copiaLimpa(estado));
  }

  const ehData = (s) => typeof s === 'string' && !!deIso(s);
  const lista = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : []);

  /** Valida e normaliza um backup (do celular ou exportado do PC). Ignora registros inválidos. */
  function normalizarBackup(obj) {
    if (!obj || typeof obj !== 'object' || obj.app !== 'brain') throw new Error('Esse arquivo não é um backup do Brain.');
    const novo = estadoVazio();
    const ids = new Set();
    for (const g of lista(obj.gastos)) {
      if (!(g.valor > 0) || !ehData(g.data) || !C.CATEGORIAS.includes(g.categoria) || !texto(g.descricao).trim()) continue;
      const id = Number.isInteger(g.id) && !ids.has('g' + g.id) ? g.id : 0;
      novo.gastos.push({ id, valor: r2(Number(g.valor)), categoria: g.categoria, descricao: texto(g.descricao).slice(0, 120), data: g.data, texto_original: texto(g.texto_original), corrigido: g.corrigido ? 1 : 0 });
      if (id) ids.add('g' + id);
    }
    for (const t of lista(obj.tarefas)) {
      if (!texto(t.titulo).trim()) continue;
      novo.tarefas.push({ id: Number.isInteger(t.id) ? t.id : 0, titulo: texto(t.titulo).slice(0, 200), data: ehData(t.data) ? t.data : null, hora: /^([01]\d|2[0-3]):[0-5]\d$/.test(texto(t.hora)) ? t.hora : null, feita: t.feita ? 1 : 0, concluida_em: t.feita && ehData(t.concluida_em) ? t.concluida_em : null });
    }
    for (const i of lista(obj.rotina_itens)) {
      if (!PERIODOS.includes(i.periodo) || !TIPOS.includes(i.tipo) || !texto(i.titulo).trim() || !Number.isInteger(i.id)) continue;
      const minutos = Number.isInteger(i.minutos) && i.minutos >= 1 && i.minutos <= 600 ? i.minutos : null;
      novo.rotina_itens.push({ id: i.id, periodo: i.periodo, tipo: i.tipo, titulo: texto(i.titulo).slice(0, 120), hora: /^([01]\d|2[0-3]):[0-5]\d$/.test(texto(i.hora)) ? i.hora : null, minutos, criado: ehData(i.criado) ? i.criado : '' });
    }
    const itensValidos = new Set(novo.rotina_itens.map((i) => i.id));
    const vistos = new Set();
    for (const r of lista(obj.rotina_registros)) {
      const chave = `${r.item_id}|${r.data}`;
      if (!itensValidos.has(r.item_id) || !ehData(r.data) || vistos.has(chave)) continue;
      vistos.add(chave);
      novo.rotina_registros.push({ item_id: r.item_id, data: r.data });
    }
    const porData = new Map();
    for (const a of lista(obj.avaliacoes)) if (ehData(a.data) && ['positivo', 'negativo'].includes(a.resultado)) porData.set(a.data, { data: a.data, resultado: a.resultado, nota: texto(a.nota).slice(0, 500) });
    novo.avaliacoes = [...porData.values()];
    const c = obj.config && typeof obj.config === 'object' ? obj.config : {};
    if (ehData(c.inicio)) {
      const duracao = Number(c.duracao);
      novo.config = { nome: texto(c.nome || 'Minha jornada').slice(0, 40), duracao: Number.isInteger(duracao) && duracao >= 7 && duracao <= 365 ? duracao : 30, inicio: c.inicio };
    }
    if (obj.preferencias && typeof obj.preferencias === 'object') novo.preferencias = P.sanitizar(obj.preferencias);
    // ids ausentes ou repetidos ganham números novos
    for (const chave of ['gastos', 'tarefas']) {
      const usados = new Set();
      let prox = novo[chave].reduce((m, x) => Math.max(m, x.id || 0), 0) + 1;
      for (const x of novo[chave]) { if (!x.id || usados.has(x.id)) x.id = prox++; usados.add(x.id); }
    }
    return novo;
  }

  /** Substitui TODOS os dados do aparelho pelo conteúdo do backup. */
  function importar(textoJson) {
    let obj;
    try { obj = JSON.parse(textoJson); } catch (e) { return Promise.reject(new Error('Não consegui ler o arquivo. Ele precisa ser um backup .json do Brain.')); }
    let novo;
    try { novo = normalizarBackup(obj); } catch (e) { return Promise.reject(e); }
    return executar(async (estado, ctx) => {
      Object.assign(estado, novo, { ultimo_backup: estado.ultimo_backup, preferencias: novo.preferencias || estado.preferencias });
      ctx.salvar = true;
      return { gastos: novo.gastos.length, tarefas: novo.tarefas.length, itens: novo.rotina_itens.length, avaliacoes: novo.avaliacoes.length };
    });
  }


  /** Apaga gastos, tarefas, rotina e jornada deste aparelho. Mantém as preferências. */
  function apagarTudo() {
    return executar(async (estado, ctx) => {
      const prefs = estado.preferencias;
      const ultimo = estado.ultimo_backup;
      Object.assign(estado, estadoVazio(), { preferencias: prefs, ultimo_backup: ultimo });
      ctx.salvar = true;
      return { ok: true };
    });
  }

  /** Quantos registros existem e quando foi o último backup (para o lembrete). */
  function resumo() {
    return executar(async (estado) => {
      const registros = estado.gastos.length + estado.tarefas.length + estado.rotina_itens.length + estado.avaliacoes.length + estado.rotina_registros.length;
      return { registros, ultimo_backup: estado.ultimo_backup, armazenamento: Armazem.modo };
    });
  }

  /** Pede ao navegador para não apagar os dados sozinho quando faltar espaço. */
  async function persistir() {
    try {
      if (root.navigator && root.navigator.storage && root.navigator.storage.persist) return await root.navigator.storage.persist();
    } catch (e) { /* sem suporte */ }
    return false;
  }

  const api = { chamar, copia, exportar, importar, apagarTudo, resumo, persistir, normalizarBackup, sequencia, melhorSequencia, _armazem: Armazem, _executar: executar, ErroHTTP };

  // No navegador: responde às chamadas fetch('/api/...') com os dados locais.
  if (typeof window !== 'undefined' && typeof window.fetch === 'function' && typeof process === 'undefined') {
    const fetchOriginal = window.fetch.bind(window);
    window.fetch = async function (entrada, opcoes) {
      const url = new URL(typeof entrada === 'string' ? entrada : entrada.url, window.location.href);
      const i = url.pathname.indexOf('/api/');
      if (i === -1) return fetchOriginal(entrada, opcoes);
      const metodo = ((opcoes && opcoes.method) || (typeof entrada !== 'string' && entrada.method) || 'GET').toUpperCase();
      let corpo = null;
      if (opcoes && opcoes.body) { try { corpo = JSON.parse(opcoes.body); } catch (e) { corpo = null; } }
      const r = await chamar(metodo, url.pathname.slice(i), url.searchParams, corpo);
      return new Response(JSON.stringify(r.corpo), { status: r.status, headers: { 'Content-Type': 'application/json' } });
    };
    window.BrainLocal = api;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BrainLocal = api;
})(typeof self !== 'undefined' ? self : this);
