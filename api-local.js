/* Brain no celular: o "servidor" roda dentro do navegador.

   As páginas continuam chamando fetch('/api/...'). Aqui interceptamos essas chamadas e
   respondemos com dados guardados no próprio aparelho (IndexedDB). Nada sai do celular.
   (Versão em JavaScript dos módulos financas, tarefas, rotina e jornada da versão para PC.) */
(function (root) {
  'use strict';

  const T = typeof require !== 'undefined' && typeof module !== 'undefined' ? require('./texto.js') : root.BrainTexto;
  const P = typeof require !== 'undefined' && typeof module !== 'undefined' ? require('./prefs.js') : (root.BrainPrefs || root.BrainPrefsLib);
  const C = typeof require !== 'undefined' && typeof module !== 'undefined' ? require('./categorias.js') : root.BrainCategorias;
  const TF = typeof require !== 'undefined' && typeof module !== 'undefined' ? require('./tarefas.js') : root.BrainTarefas;
  const ES = typeof require !== 'undefined' && typeof module !== 'undefined' ? require('./estudos.js') : root.BrainEstudos;
  const CF = typeof require !== 'undefined' && typeof module !== 'undefined' ? require('./cofre.js') : root.BrainCofre;
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
      gastos: [], orcamento: { total: 0, categorias: {} }, recorrentes: [], metas_fin: [], tarefas: [], rotina_itens: [], rotina_registros: [], avaliacoes: [],
      config: {}, jornadas: [], estudos: null, preferencias: null, ultimo_backup: null,
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
    chave: null,              // chave AES na memória (só existe com o cofre desbloqueado)
    sal: null,
    voltas: null,
    _sessaoLida: false,
    async _bruto() {
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
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => reject(req.error);
        });
      }
      if (this.modo === 'localstorage') return root.localStorage.getItem(CHAVE_LS);
      return this.memoria;
    },
    /** Se a página foi aberta com o cofre já destravado nesta sessão, recupera a chave (some ao fechar o app). */
    async _sessao() {
      if (this._sessaoLida) return; this._sessaoLida = true;
      try {
        const s = root.sessionStorage && root.sessionStorage.getItem('brain-kx');
        if (s && CF && CF.disponivel()) { const o = JSON.parse(s); this.chave = await CF.importarChave(o.k); this.sal = o.s; this.voltas = o.v || null; }
      } catch (e) { this.chave = null; }
    },
    _guardarSessao(b64) { try { if (root.sessionStorage) { if (b64) root.sessionStorage.setItem('brain-kx', JSON.stringify({ k: b64, s: this.sal, v: this.voltas })); else root.sessionStorage.removeItem('brain-kx'); } } catch (e) { /* sem sessão */ } },
    async ler() {
      await this._sessao();
      const bruto = await this._bruto();
      if (!bruto) return null;
      const obj = JSON.parse(bruto);
      if (CF && CF.ehEnvelope(obj)) {
        if (!this.chave) erro(423, 'O Brain está bloqueado.');
        try { return JSON.parse(await CF.decifrar(this.chave, obj)); }
        catch (e) { this.chave = null; this._guardarSessao(null); erro(423, 'O Brain está bloqueado.'); }
      }
      return obj;
    },
    async _gravarBruto(json) {
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
    async gravar(estado) {
      let json = JSON.stringify(estado);
      if (this.chave) json = JSON.stringify(await CF.cifrar(this.chave, json, this.sal, this.voltas));
      await this._gravarBruto(json);
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
            .filter((g) => g.tipo !== 'receita')
      .sort((a, b) => (a.corrigido ? 1 : 0) - (b.corrigido ? 1 : 0) || a.id - b.id)
      .map((g) => ({ descricao: g.descricao, categoria: g.categoria, corrigido: !!g.corrigido }));
    C.classificador.treinar(hist);
  }

  const CAT_ENTRADA = 'Entrada';

  async function financasRegistrar(estado, ctx, q, corpo) {
    const entrada = texto(corpo && corpo.texto).trim();
    if (!entrada) erro(400, 'Escreva ou fale um gasto.');
    const { itens, ignorados } = T.interpretarGastos(entrada);
    if (!itens.length) erro(422, 'Não achei o valor. Escreva algo como: 32 no ifood, ou: uber 15 reais ontem.');
    const tipo = corpo.tipo === 'receita' ? 'receita' : 'despesa';
    if (tipo === 'despesa') retreinar(estado);
    let id = proximoId(estado.gastos);
    for (const item of itens) {
      item.categoria = tipo === 'receita' ? CAT_ENTRADA : C.classificador.prever(item.descricao);
      item.tipo = tipo;
      estado.gastos.push({ id: id++, tipo, valor: item.valor, categoria: item.categoria, descricao: item.descricao, data: item.data, texto_original: entrada, corrigido: 0 });
    }
    ctx.salvar = true;
    return { registrados: itens, ignorados };
  }

  const diasDoMes = (mes) => { const [a, m] = mes.split('-').map(Number); return new Date(a, m, 0).getDate(); };

  async function financasListar(estado, ctx, q) {
    const mes = q.get('mes') || iso(hojeData()).slice(0, 7);
    if (!mesValido(mes)) erro(400, 'Use o formato AAAA-MM.');
    const doMes = estado.gastos
      .filter((g) => g.data.slice(0, 7) === mes)
      .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : b.id - a.id));
    const gastos = doMes.map((g) => ({ id: g.id, tipo: g.tipo === 'receita' ? 'receita' : 'despesa', valor: g.valor, categoria: g.categoria, descricao: g.descricao, data: g.data }));
    const despesas = gastos.filter((g) => g.tipo !== 'receita');
    const porCat = new Map();
    for (const g of despesas) {
      const i = porCat.get(g.categoria) || { valor: 0, quantidade: 0 };
      i.valor += g.valor; i.quantidade += 1;
      porCat.set(g.categoria, i);
    }
    const total = r2(despesas.reduce((s, g) => s + g.valor, 0));
    const entradas = r2(gastos.filter((g) => g.tipo === 'receita').reduce((s, g) => s + g.valor, 0));
    const recorrentes = estado.recorrentes
      .slice().sort((a, b) => a.dia - b.dia || a.id - b.id)
      .map((r) => ({ id: r.id, descricao: r.descricao, valor: r.valor, dia: r.dia, categoria: r.categoria,
        lancado: estado.gastos.some((g) => g.recorrente_id === r.id && g.data.slice(0, 7) === mes),
        data_prevista: `${mes}-${String(Math.min(r.dia, diasDoMes(mes))).padStart(2, '0')}` }));
    return {
      mes,
      total,
      entradas,
      saldo: r2(entradas - total),
      por_categoria: [...porCat.entries()].map(([categoria, i]) => ({ categoria, valor: r2(i.valor), quantidade: i.quantidade })).sort((a, b) => b.valor - a.valor),
      gastos,
      categorias: C.CATEGORIAS,
      orcamento: { total: estado.orcamento.total || 0, categorias: Object.assign({}, estado.orcamento.categorias) },
      recorrentes,
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
    const ehEntrada = atual.tipo === 'receita';
    const categoria = ehEntrada ? CAT_ENTRADA : (corpo.categoria === undefined || corpo.categoria === null ? atual.categoria : corpo.categoria);
    if (!ehEntrada && !C.CATEGORIAS.includes(categoria)) erro(400, 'Categoria inválida.');
    const data = corpo.data === undefined || corpo.data === null ? atual.data : iso(validarData(corpo.data));
    const corrigido = !ehEntrada && (categoria !== atual.categoria || descricao !== atual.descricao) ? 1 : atual.corrigido;
    Object.assign(atual, { valor, descricao, categoria, data, corrigido });
    ctx.salvar = true;
    return { ok: true };
  }

  async function financasApagar(estado, ctx, q, corpo, params) {
    estado.gastos = estado.gastos.filter((g) => g.id !== params.id);
    ctx.salvar = true;
    return { ok: true };
  }


  // ---- limites por categoria (orçamento) ----
  const valorLimite = (v) => {
    const n = r2(Number(v));
    if (!(n >= 0 && n < 10000000)) erro(400, 'Limite inválido.');
    return n;
  };
  async function orcamentoLer(estado) {
    return { total: estado.orcamento.total || 0, categorias: Object.assign({}, estado.orcamento.categorias) };
  }
  async function orcamentoSalvar(estado, ctx, q, corpo) {
    corpo = corpo || {};
    const total = corpo.total === undefined || corpo.total === null || corpo.total === '' ? 0 : valorLimite(corpo.total);
    const categorias = {};
    const entrada = corpo.categorias && typeof corpo.categorias === 'object' ? corpo.categorias : {};
    for (const [cat, v] of Object.entries(entrada)) {
      if (!C.CATEGORIAS.includes(cat)) erro(400, 'Categoria inválida.');
      if (v === null || v === '' || v === undefined) continue;
      const n = valorLimite(v);
      if (n > 0) categorias[cat] = n;
    }
    estado.orcamento = { total, categorias };
    ctx.salvar = true;
    return { ok: true, orcamento: estado.orcamento };
  }

  // ---- contas fixas (recorrentes) ----
  function lerRecorrente(corpo) {
    corpo = corpo || {};
    const descricao = texto(corpo.descricao).trim().slice(0, 120);
    if (!descricao) erro(400, 'Dê um nome para a conta fixa.');
    const valor = r2(Number(corpo.valor));
    if (!(valor > 0 && valor < 10000000)) erro(400, 'Valor inválido.');
    const dia = Number(corpo.dia);
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) erro(400, 'O dia deve ficar entre 1 e 31.');
    const categoria = corpo.categoria === undefined || corpo.categoria === null || corpo.categoria === '' ? 'Outros' : corpo.categoria;
    if (!C.CATEGORIAS.includes(categoria)) erro(400, 'Categoria inválida.');
    return { descricao, valor, dia, categoria };
  }
  async function recorrenteCriar(estado, ctx, q, corpo) {
    const r = lerRecorrente(corpo);
    const id = proximoId(estado.recorrentes);
    estado.recorrentes.push({ id, ...r });
    ctx.salvar = true;
    return { id };
  }
  async function recorrenteEditar(estado, ctx, q, corpo, params) {
    const r = lerRecorrente(corpo);
    const atual = estado.recorrentes.find((x) => x.id === params.id);
    if (!atual) erro(404, 'Conta fixa não encontrada.');
    Object.assign(atual, r);
    ctx.salvar = true;
    return { ok: true };
  }
  async function recorrenteApagar(estado, ctx, q, corpo, params) {
    estado.recorrentes = estado.recorrentes.filter((x) => x.id !== params.id);
    ctx.salvar = true;
    return { ok: true };
  }

  // ---- metas de economia ----
  const listaMetas = (estado) => (estado.metas_fin = Array.isArray(estado.metas_fin) ? estado.metas_fin : []);
  function lerMeta(corpo) {
    corpo = corpo || {};
    const nome = texto(corpo.nome).replace(/\s+/g, ' ').trim().slice(0, 60);
    if (!nome) erro(400, 'Dê um nome para a meta.');
    const alvo = r2(Number(corpo.alvo));
    if (!(alvo > 0 && alvo < 100000000)) erro(400, 'Informe o valor da meta.');
    const prazo = corpo.prazo ? iso(validarData(corpo.prazo)) : null;
    return { nome, alvo, prazo };
  }
  async function metasListar(estado) { return { metas: listaMetas(estado).map((m) => ({ ...m })) }; }
  async function metaCriar(estado, ctx, q, corpo) {
    const m = lerMeta(corpo);
    const guardado = corpo && Number(corpo.guardado) > 0 ? r2(Number(corpo.guardado)) : 0;
    const l = listaMetas(estado);
    if (l.length >= 20) erro(400, 'Limite de 20 metas.');
    const id = proximoId(l);
    l.push({ id, ...m, guardado, criada: iso(hojeData()) });
    ctx.salvar = true;
    return { id };
  }
  async function metaEditar(estado, ctx, q, corpo, params) {
    const atual = listaMetas(estado).find((x) => x.id === params.id);
    if (!atual) erro(404, 'Meta não encontrada.');
    Object.assign(atual, lerMeta(corpo));
    ctx.salvar = true;
    return { ok: true };
  }
  async function metaGuardar(estado, ctx, q, corpo, params) {
    const atual = listaMetas(estado).find((x) => x.id === params.id);
    if (!atual) erro(404, 'Meta não encontrada.');
    const v = r2(Number(corpo && corpo.valor));
    if (!Number.isFinite(v) || v === 0 || Math.abs(v) >= 100000000) erro(400, 'Informe um valor.');
    atual.guardado = Math.max(0, r2(atual.guardado + v));
    ctx.salvar = true;
    return { ok: true, guardado: atual.guardado };
  }
  async function metaApagar(estado, ctx, q, corpo, params) {
    estado.metas_fin = listaMetas(estado).filter((x) => x.id !== params.id);
    ctx.salvar = true;
    return { ok: true };
  }
  async function recorrenteLancar(estado, ctx, q, corpo, params) {
    const r = estado.recorrentes.find((x) => x.id === params.id);
    if (!r) erro(404, 'Conta fixa não encontrada.');
    const mes = texto(corpo && corpo.mes) || iso(hojeData()).slice(0, 7);
    if (!mesValido(mes)) erro(400, 'Use o formato AAAA-MM.');
    if (estado.gastos.some((g) => g.recorrente_id === r.id && g.data.slice(0, 7) === mes)) erro(409, 'Essa conta já foi lançada neste mês.');
    const data = `${mes}-${String(Math.min(r.dia, diasDoMes(mes))).padStart(2, '0')}`;
    const id = proximoId(estado.gastos);
    estado.gastos.push({ id, tipo: 'despesa', valor: r.valor, categoria: r.categoria, descricao: r.descricao, data, texto_original: '', corrigido: 0, recorrente_id: r.id });
    ctx.salvar = true;
    return { id, data };
  }

  // =========================================================== tarefas
  const cmpNulo = (a, b) => (a === null || a === undefined ? 1 : 0) - (b === null || b === undefined ? 1 : 0);
  const cmpTxt = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

  const tarefaPublica = (t) => Object.assign({ id: t.id, titulo: t.titulo, data: t.data, hora: t.hora, feita: t.feita, concluida_em: t.concluida_em || null }, TF.extras(t));

  async function tarefasListar(estado) {
    const lista = estado.tarefas.slice().sort((a, b) =>
      (a.feita - b.feita) || cmpNulo(a.data, b.data) || cmpTxt(a.data || '', b.data || '') ||
      cmpNulo(a.hora, b.hora) || cmpTxt(a.hora || '', b.hora || '') || (a.id - b.id));
    return { tarefas: lista.map(tarefaPublica) };
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
    corpo = corpo || {};
    let { titulo, data, hora } = lerTarefa(corpo);
    // Marcas rápidas no título: !alta, #lista, "todo dia"; o que vier nos campos tem prioridade
    const m = TF.extrairMarcas(titulo);
    if (m.titulo) titulo = m.titulo;
    // Datas e horas escritas no título ("prova sexta 14h") preenchem o que faltar
    const lido = T.interpretarTarefa(titulo);
    data = data || (lido.data ? iso(lido.data) : null);
    hora = hora || lido.hora || null;
    if (data || hora) titulo = lido.titulo;
    titulo = titulo.slice(0, 200);
    const ex = TF.extras({ prioridade: corpo.prioridade !== undefined ? corpo.prioridade : m.prioridade, lista: corpo.lista !== undefined ? corpo.lista : m.lista, repetir: corpo.repetir !== undefined ? corpo.repetir : m.repetir, nota: corpo.nota, subtarefas: corpo.subtarefas });
    if (ex.repetir && !data) data = iso(hojeData());   // tarefa que se repete precisa de uma data de partida
    const id = proximoId(estado.tarefas);
    estado.tarefas.push(Object.assign({ id, titulo, data, hora, feita: 0, concluida_em: null }, ex));
    ctx.salvar = true;
    return Object.assign({ id, titulo, data, hora }, ex);
  }

  async function tarefasEditar(estado, ctx, q, corpo, params) {
    const { titulo, data, hora } = lerTarefa(corpo);
    const t = estado.tarefas.find((x) => x.id === params.id);
    if (t) {
      const atual = TF.extras(t);
      const novo = {};
      for (const k of ['prioridade', 'lista', 'repetir', 'nota', 'subtarefas']) novo[k] = corpo[k] !== undefined ? corpo[k] : atual[k];
      const ex = TF.extras(novo);
      if (ex.repetir && !data) { ex.repetir = ''; }
      Object.assign(t, { titulo: titulo.slice(0, 200), data, hora }, ex);
      ctx.salvar = true;
    }
    return { ok: true };
  }

  async function tarefasAlternar(estado, ctx, q, corpo, params) {
    const t = estado.tarefas.find((x) => x.id === params.id);
    if (!t) return { ok: true };
    t.feita = 1 - t.feita; t.concluida_em = t.feita ? iso(hojeData()) : null; ctx.salvar = true;
    if (t.feita && t.repetir && t.data) {
      // tarefa que se repete: conclui esta e já cria a próxima ocorrência (subtarefas zeradas)
      const ex = TF.extras(t);
      const prox = TF.proximaData(t.data < iso(hojeData()) ? iso(hojeData()) : t.data, ex.repetir);
      if (prox) {
        ex.subtarefas = ex.subtarefas.map((s) => Object.assign({}, s, { feita: 0 }));
        const id = proximoId(estado.tarefas);
        estado.tarefas.push(Object.assign({ id, titulo: t.titulo, data: prox, hora: t.hora, feita: 0, concluida_em: null }, ex));
        t.gerou = id;
        return { ok: true, proxima: { id, data: prox } };
      }
    } else if (!t.feita && t.gerou) {
      // desfez a conclusão: remove a próxima ocorrência se ela ainda não foi mexida
      const g = estado.tarefas.find((x) => x.id === t.gerou);
      if (g && !g.feita) estado.tarefas = estado.tarefas.filter((x) => x.id !== t.gerou);
      delete t.gerou;
    }
    return { ok: true };
  }

  async function tarefasApagar(estado, ctx, q, corpo, params) {
    estado.tarefas = estado.tarefas.filter((t) => t.id !== params.id);
    ctx.salvar = true;
    return { ok: true };
  }

  // Desfazer de um "apagar": devolve o item como estava (mantém o id se estiver livre)
  async function restaurar(estado, ctx, q, corpo) {
    corpo = corpo || {};
    const it = corpo.item && typeof corpo.item === 'object' ? corpo.item : {};
    if (corpo.colecao === 'tarefas') {
      const { titulo, data, hora } = lerTarefa(it);
      const livre = Number.isInteger(it.id) && it.id > 0 && !estado.tarefas.some((t) => t.id === it.id);
      const id = livre ? it.id : proximoId(estado.tarefas);
      const feita = it.feita ? 1 : 0;
      estado.tarefas.push(Object.assign({ id, titulo: titulo.slice(0, 200), data, hora, feita, concluida_em: feita && it.concluida_em ? iso(validarData(it.concluida_em)) : null }, TF.extras(it)));
      ctx.salvar = true;
      return { ok: true, id };
    }
    if (corpo.colecao === 'gastos') {
      const valor = r2(Number(it.valor));
      if (!(valor > 0 && valor < 10000000)) erro(400, 'Valor inválido.');
      const tipo = it.tipo === 'receita' ? 'receita' : 'despesa';
      const categoria = tipo === 'receita' ? CAT_ENTRADA : it.categoria;
      if (tipo === 'despesa' && !C.CATEGORIAS.includes(categoria)) erro(400, 'Categoria inválida.');
      const descricao = texto(it.descricao).trim().slice(0, 120) || 'Lançamento';
      const livre = Number.isInteger(it.id) && it.id > 0 && !estado.gastos.some((g) => g.id === it.id);
      const id = livre ? it.id : proximoId(estado.gastos);
      estado.gastos.push({ id, valor, categoria, descricao, data: iso(validarData(it.data)), texto_original: texto(it.texto_original).slice(0, 300), corrigido: it.corrigido ? 1 : 0, tipo });
      ctx.salvar = true;
      return { ok: true, id };
    }
    erro(400, 'Nada para restaurar.');
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
      historico: (estado.jornadas || []).slice().reverse().slice(0, 20),
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
    const anterior = estado.config || {};
    if (anterior.inicio && Number(anterior.duracao) > 0 && diasEntre(hojeData(), deIso(anterior.inicio)) + 1 > Number(anterior.duracao)) {
      estado.jornadas = estado.jornadas || [];
      estado.jornadas.push({ id: proximoId(estado.jornadas), nome: anterior.nome || 'Minha jornada', duracao: Number(anterior.duracao), inicio: anterior.inicio, fim: iso(addDias(deIso(anterior.inicio), Number(anterior.duracao) - 1)), dias_cumpridos: Number(anterior.duracao), status: 'concluida', motivo: '' });
    }
    estado.config = { ...anterior, nome, duracao, inicio: iso(inicio) };
    ctx.salvar = true;
    return { ok: true };
  }


  async function jornadaAbandonar(estado, ctx, q, corpo) {
    const cfg = estado.config || {};
    if (!cfg.inicio) erro(409, 'Você não tem uma jornada em andamento.');
    const duracao = Number(cfg.duracao) || 30;
    const dia = diasEntre(hojeData(), deIso(cfg.inicio)) + 1;
    if (dia > duracao) erro(409, 'Essa jornada já terminou. Comece uma nova.');
    estado.jornadas = estado.jornadas || [];
    const registro = { id: proximoId(estado.jornadas), nome: cfg.nome || 'Minha jornada', duracao, inicio: cfg.inicio, fim: iso(hojeData()), dias_cumpridos: Math.max(0, dia - 1), status: 'abandonada', motivo: texto(corpo && corpo.motivo).trim().slice(0, 300) };
    estado.jornadas.push(registro);
    estado.config = {};
    ctx.salvar = true;
    return { ok: true, jornada: registro };
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
  async function estudosLer(estado) {
    return { estudos: ES.sanitizar(estado.estudos) };
  }
  async function estudosSalvar(estado, ctx, q, corpo) {
    if (!corpo || typeof corpo !== 'object' || typeof corpo.estudos !== 'object') erro(400, 'Dados de estudos inválidos.');
    estado.estudos = ES.sanitizar(corpo.estudos);
    ctx.salvar = true;
    return { estudos: estado.estudos };
  }

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
    ['GET', '/api/financas/orcamento', orcamentoLer],
    ['PUT', '/api/financas/orcamento', orcamentoSalvar],
    ['GET', '/api/financas/metas', metasListar],
    ['POST', '/api/financas/metas', metaCriar],
    ['PUT', `/api/financas/metas/${id}`, metaEditar],
    ['POST', `/api/financas/metas/${id}/guardar`, metaGuardar],
    ['DELETE', `/api/financas/metas/${id}`, metaApagar],
    ['POST', '/api/financas/recorrentes', recorrenteCriar],
    ['PUT', `/api/financas/recorrentes/${id}`, recorrenteEditar],
    ['DELETE', `/api/financas/recorrentes/${id}`, recorrenteApagar],
    ['POST', `/api/financas/recorrentes/${id}/lancar`, recorrenteLancar],
    ['GET', '/api/tarefas', tarefasListar],
    ['POST', '/api/tarefas', tarefasCriar],
    ['PUT', `/api/tarefas/${id}`, tarefasEditar],
    ['PATCH', `/api/tarefas/${id}/alternar`, tarefasAlternar],
    ['DELETE', `/api/tarefas/${id}`, tarefasApagar],
    ['POST', '/api/restaurar', restaurar],
    ['GET', '/api/rotina', rotinaListar],
    ['POST', '/api/rotina/itens', rotinaCriar],
    ['PUT', `/api/rotina/itens/${id}`, rotinaEditar],
    ['DELETE', `/api/rotina/itens/${id}`, rotinaApagar],
    ['PUT', '/api/rotina/marcar', rotinaMarcar],
    ['POST', '/api/rotina/modelo', rotinaModelo],
    ['GET', '/api/estudos', estudosLer],
    ['PUT', '/api/estudos', estudosSalvar],
    ['GET', '/api/preferencias', prefsLer],
    ['PUT', '/api/preferencias', prefsSalvar],
    ['GET', '/api/jornada', jornadaPainel],
    ['PUT', '/api/jornada/config', jornadaConfig],
    ['POST', '/api/jornada/abandonar', jornadaAbandonar],
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
      gastos: estado.gastos, orcamento: estado.orcamento, recorrentes: estado.recorrentes, metas_fin: listaMetas(estado), tarefas: estado.tarefas, rotina_itens: estado.rotina_itens,
      rotina_registros: estado.rotina_registros, avaliacoes: estado.avaliacoes, config: estado.config, jornadas: estado.jornadas, estudos: estado.estudos,
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
      const tipo = g.tipo === 'receita' ? 'receita' : 'despesa';
      const catOk = tipo === 'receita' ? g.categoria === CAT_ENTRADA : C.CATEGORIAS.includes(g.categoria);
      if (!(g.valor > 0) || !ehData(g.data) || !catOk || !texto(g.descricao).trim()) continue;
      const id = Number.isInteger(g.id) && !ids.has('g' + g.id) ? g.id : 0;
      const item = { id, tipo, valor: r2(Number(g.valor)), categoria: g.categoria, descricao: texto(g.descricao).slice(0, 120), data: g.data, texto_original: texto(g.texto_original), corrigido: g.corrigido ? 1 : 0 };
      if (Number.isInteger(g.recorrente_id)) item.recorrente_id = g.recorrente_id;
      novo.gastos.push(item);
      if (id) ids.add('g' + id);
    }
    for (const r of lista(obj.recorrentes)) {
      const valor = r2(Number(r.valor));
      if (!Number.isInteger(r.id) || !texto(r.descricao).trim() || !(valor > 0) || !Number.isInteger(r.dia) || r.dia < 1 || r.dia > 31 || !C.CATEGORIAS.includes(r.categoria)) continue;
      novo.recorrentes.push({ id: r.id, descricao: texto(r.descricao).slice(0, 120), valor, dia: r.dia, categoria: r.categoria });
    }
    for (const m of lista(obj.metas_fin)) {
      const alvo = r2(Number(m.alvo)); const nome = texto(m.nome).replace(/\s+/g, ' ').trim().slice(0, 60);
      if (!Number.isInteger(m.id) || !nome || !(alvo > 0 && alvo < 100000000)) continue;
      const g = r2(Number(m.guardado)); 
      novo.metas_fin.push({ id: m.id, nome, alvo, prazo: ehData(m.prazo) ? m.prazo : null, guardado: g > 0 && g < 100000000 ? g : 0, criada: ehData(m.criada) ? m.criada : '' });
    }
    if (obj.orcamento && typeof obj.orcamento === 'object') {
      const o = obj.orcamento;
      const cats = {};
      if (o.categorias && typeof o.categorias === 'object') for (const [k, v] of Object.entries(o.categorias)) if (C.CATEGORIAS.includes(k) && Number(v) > 0 && Number(v) < 10000000) cats[k] = r2(Number(v));
      novo.orcamento = { total: Number(o.total) > 0 && Number(o.total) < 10000000 ? r2(Number(o.total)) : 0, categorias: cats };
    }
    for (const t of lista(obj.tarefas)) {
      if (!texto(t.titulo).trim()) continue;
      novo.tarefas.push({ id: Number.isInteger(t.id) ? t.id : 0, titulo: texto(t.titulo).slice(0, 200), data: ehData(t.data) ? t.data : null, hora: /^([01]\d|2[0-3]):[0-5]\d$/.test(texto(t.hora)) ? t.hora : null, feita: t.feita ? 1 : 0, concluida_em: t.feita && ehData(t.concluida_em) ? t.concluida_em : null, ...TF.extras(t) });
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
    for (const j of lista(obj.jornadas)) {
      if (!ehData(j.inicio) || !ehData(j.fim) || !['abandonada', 'concluida'].includes(j.status)) continue;
      const duracao = Number(j.duracao);
      novo.jornadas.push({ id: novo.jornadas.length + 1, nome: texto(j.nome || 'Minha jornada').slice(0, 40), duracao: Number.isInteger(duracao) && duracao >= 7 && duracao <= 365 ? duracao : 30, inicio: j.inicio, fim: j.fim, dias_cumpridos: Math.max(0, Math.min(365, Number(j.dias_cumpridos) || 0)), status: j.status, motivo: texto(j.motivo).slice(0, 300) });
    }
    if (obj.estudos && typeof obj.estudos === 'object') novo.estudos = ES.sanitizar(obj.estudos);
    if (obj.preferencias && typeof obj.preferencias === 'object') novo.preferencias = P.sanitizar(obj.preferencias);
    // ids ausentes ou repetidos ganham números novos
    for (const chave of ['gastos', 'tarefas']) {
      const usados = new Set();
      let prox = novo[chave].reduce((m, x) => Math.max(m, x.id || 0), 0) + 1;
      for (const x of novo[chave]) { if (!x.id || usados.has(x.id)) x.id = prox++; usados.add(x.id); }
    }
    return novo;
  }

  /** Substitui TODOS os dados do aparelho pelo conteúdo do backup (aceita backup protegido com senha). */
  async function importar(textoJson, senha) {
    let obj;
    try { obj = JSON.parse(textoJson); } catch (e) { throw new Error('Não consegui ler o arquivo. Ele precisa ser um backup .json do Brain.'); }
    if (CF && CF.ehEnvelope(obj)) {
      if (!senha) { const e = new Error('Este backup é protegido por senha.'); e.pedeSenha = true; throw e; }
      const chave = await CF.derivar(senha, obj.s, obj.it);
      try { obj = JSON.parse(await CF.decifrar(chave, obj)); } catch (e) { const er = new Error('Senha do backup incorreta.'); er.pedeSenha = true; throw er; }
    }
    const novo = normalizarBackup(obj);
    return executar(async (estado, ctx) => {
      Object.assign(estado, novo, { ultimo_backup: estado.ultimo_backup, preferencias: novo.preferencias || estado.preferencias });
      ctx.salvar = true;
      return { gastos: novo.gastos.length, tarefas: novo.tarefas.length, itens: novo.rotina_itens.length, avaliacoes: novo.avaliacoes.length };
    });
  }

  // =========================================================== cofre (senha + criptografia)
  const brutoObj = async () => { await Armazem._sessao(); const b = await Armazem._bruto(); return b ? JSON.parse(b) : null; };
  const senhaOk = (s) => { if (typeof s !== 'string' || s.length < 4 || s.length > 64) throw new Error('A senha precisa ter de 4 a 64 caracteres.'); };
  /** Confere a senha atual (reautenticação) sem alterar nada. */
  async function conferirSenha(senha) {
    const o = await brutoObj();
    if (!(o && CF.ehEnvelope(o))) throw new Error('O bloqueio não está ativo.');
    const chave = await CF.derivar(senha, o.s, o.it);
    await CF.decifrar(chave, o);
    return chave;
  }
  const cofre = {
    disponivel: () => !!CF && CF.disponivel(),
    async protegido() { const o = await brutoObj(); return !!(o && CF.ehEnvelope(o)); },
    async bloqueado() { const o = await brutoObj(); return !!(o && CF.ehEnvelope(o)) && !Armazem.chave; },
    async ativar(senha) {
      senhaOk(senha);
      if (!CF.disponivel()) throw new Error('Este aparelho não oferece criptografia no navegador.');
      if (await this.protegido()) throw new Error('O bloqueio já está ativo.');
      await executar(async (estado, ctx) => {
        Armazem.sal = CF.novoSal(); Armazem.voltas = CF.VOLTAS;
        Armazem.chave = await CF.derivar(senha, Armazem.sal, Armazem.voltas);
        ctx.salvar = true;
      });
      Armazem._guardarSessao(await CF.exportarChave(Armazem.chave));
      return { ok: true };
    },
    async desbloquear(senha) {
      const o = await brutoObj();
      if (!(o && CF.ehEnvelope(o))) return { ok: true };
      const chave = await CF.derivar(String(senha || ''), o.s, o.it);
      await CF.decifrar(chave, o); // lança "Senha incorreta."
      Armazem.chave = chave; Armazem.sal = o.s; Armazem.voltas = o.it;
      Armazem._guardarSessao(await CF.exportarChave(chave));
      return { ok: true };
    },
    bloquear() { Armazem.chave = null; Armazem._guardarSessao(null); return { ok: true }; },
    async desativar(senha) {
      await conferirSenha(senha);
      await Armazem._sessao();
      await executar(async (estado, ctx) => { Armazem.chave = null; ctx.salvar = true; });
      Armazem._guardarSessao(null);
      return { ok: true };
    },
    async trocar(atual, nova) {
      senhaOk(nova);
      await conferirSenha(atual);
      await executar(async (estado, ctx) => {
        Armazem.sal = CF.novoSal(); Armazem.voltas = CF.VOLTAS;
        Armazem.chave = await CF.derivar(nova, Armazem.sal, Armazem.voltas);
        ctx.salvar = true;
      });
      Armazem._guardarSessao(await CF.exportarChave(Armazem.chave));
      return { ok: true };
    },
  };

  /** Backup protegido com senha (o arquivo só abre com ela). */
  function exportarCifrado(senha) {
    senhaOk(senha);
    return executar(async (estado, ctx) => {
      estado.ultimo_backup = iso(hojeData());
      ctx.salvar = true;
      const sal = CF.novoSal();
      const chave = await CF.derivar(senha, sal, CF.VOLTAS);
      return JSON.stringify(await CF.cifrar(chave, JSON.stringify(copiaLimpa(estado)), sal, CF.VOLTAS));
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

  const api = { chamar, copia, exportar, exportarCifrado, importar, cofre, apagarTudo, resumo, persistir, normalizarBackup, sequencia, melhorSequencia, _armazem: Armazem, _executar: executar, ErroHTTP };

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
