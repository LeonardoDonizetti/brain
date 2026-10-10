/* Classificador de categoria dos gastos (aprendizado de máquina local).

   Como decide, nesta ordem:
   1. Memória: se você já lançou ou corrigiu exatamente essa descrição, repete a categoria.
   2. Vizinhos mais parecidos (k-NN com TF-IDF de trechos de letras): compara a descrição
      com as palavras-chave iniciais e com TODO o seu histórico. Correções suas pesam mais.
   3. Palavras-chave, se nada for parecido o bastante.
   4. "Outros".
   (Versão em JavaScript, feita para rodar no navegador do celular.) */
(function (root) {
  'use strict';

  const T = typeof require !== 'undefined' && typeof module !== 'undefined' ? require('./texto.js') : root.BrainTexto;

  const CATEGORIAS = ["Alimentação", "Transporte", "Moradia", "Saúde", "Lazer", "Educação", "Compras", "Assinaturas", "Outros"];

  const PALAVRAS = {
    "Alimentação": [
      "ifood",
      "rappi",
      "uber eats",
      "restaurante",
      "lanche",
      "almoco",
      "jantar",
      "cafe",
      "padaria",
      "mercado",
      "supermercado",
      "pizza",
      "hamburguer",
      "burger",
      "mcdonalds",
      "mc donalds",
      "burger king",
      "subway",
      "sorvete",
      "acai",
      "doce",
      "bolo",
      "comida",
      "marmita",
      "feira",
      "acougue",
      "hortifruti",
      "bar",
      "cerveja",
      "pao",
      "salgado",
      "coxinha",
      "chocolate",
      "refrigerante",
      "agua",
      "suco",
      "sushi",
      "churrasco",
      "pastel",
      "esfiha",
      "starbucks",
      "cantina",
      "cafeteria",
      "lanchonete",
      "bk"
    ],
    "Transporte": [
      "uber",
      "99",
      "taxi",
      "onibus",
      "metro",
      "trem",
      "passagem",
      "bilhete unico",
      "gasolina",
      "combustivel",
      "etanol",
      "estacionamento",
      "pedagio",
      "mecanico",
      "oleo",
      "lavagem",
      "ipva",
      "bike",
      "patinete",
      "cabify",
      "99pop",
      "carro",
      "moto",
      "recarga bilhete",
      "sptrans",
      "posto"
    ],
    "Moradia": [
      "aluguel",
      "condominio",
      "energia",
      "conta de luz",
      "conta de agua",
      "conta de gas",
      "gas",
      "internet",
      "wifi",
      "iptu",
      "reforma",
      "moveis",
      "limpeza",
      "faxina",
      "diarista",
      "luz",
      "encanador",
      "eletricista"
    ],
    "Saúde": [
      "farmacia",
      "remedio",
      "medico",
      "consulta",
      "dentista",
      "exame",
      "plano de saude",
      "hospital",
      "psicologo",
      "terapia",
      "academia",
      "vitamina",
      "suplemento",
      "drogasil",
      "droga raia",
      "pacheco",
      "oculos",
      "lente",
      "fisioterapia"
    ],
    "Lazer": [
      "cinema",
      "show",
      "teatro",
      "festa",
      "balada",
      "jogo",
      "game",
      "steam",
      "viagem",
      "hotel",
      "passeio",
      "parque",
      "ingresso",
      "praia",
      "clube",
      "futebol",
      "boliche",
      "karaoke",
      "role",
      "pub",
      "museu"
    ],
    "Educação": [
      "curso",
      "livro",
      "faculdade",
      "escola",
      "mensalidade",
      "material escolar",
      "caderno",
      "apostila",
      "udemy",
      "alura",
      "inscricao",
      "vestibular",
      "enem",
      "xerox",
      "impressao",
      "caneta",
      "lapis",
      "simulado",
      "colegio"
    ],
    "Compras": [
      "roupa",
      "camiseta",
      "calca",
      "tenis",
      "sapato",
      "presente",
      "celular",
      "fone",
      "eletronico",
      "amazon",
      "shopee",
      "mercado livre",
      "aliexpress",
      "shein",
      "magalu",
      "casas bahia",
      "perfume",
      "maquiagem",
      "cosmetico",
      "mochila",
      "relogio",
      "bolsa",
      "shopping",
      "loja",
      "jaqueta",
      "moletom",
      "bermuda"
    ],
    "Assinaturas": [
      "netflix",
      "spotify",
      "youtube premium",
      "prime",
      "disney",
      "hbo",
      "max",
      "globoplay",
      "chatgpt",
      "claude",
      "icloud",
      "google one",
      "assinatura",
      "deezer",
      "crunchyroll",
      "game pass",
      "playstation plus",
      "ps plus",
      "twitch",
      "apple music"
    ]
  };

  const LIMIAR = 0.55; // semelhança mínima para confiar no modelo
  const K = 3; // quantos vizinhos votam
  const PESO_CORRECAO = 8; // uma correção sua vale 8 exemplos automáticos

  function normalizar(texto) {
    return T.semAcento(texto).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  const escapa = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const ORDENADAS = Object.entries(PALAVRAS)
    .flatMap(([cat, lista]) => lista.map((p) => [p, cat]))
    .sort((a, b) => b[0].length - a[0].length);
  const REGEX_PALAVRAS = ORDENADAS.map(([p, cat]) => [new RegExp(`\\b${escapa(p)}s?\\b`), cat]);

  /** Categoria pela palavra-chave mais longa encontrada na descrição. */
  function porPalavras(descricao) {
    const n = normalizar(descricao);
    for (const [re, cat] of REGEX_PALAVRAS) if (re.test(n)) return cat;
    return null;
  }

  /** Trechos de 2 a 4 letras dentro de cada palavra (com espaço nas pontas). */
  function trechos(n) {
    const out = [];
    for (const w of n.split(' ')) {
      if (!w) continue;
      const p = ` ${w} `;
      for (let k = 2; k <= 4; k++) for (let i = 0; i + k <= p.length; i++) out.push(p.slice(i, i + k));
    }
    return out;
  }

  class Classificador {
    constructor() {
      this.exemplos = [];
      this.memoria = new Map();
      this.idf = new Map();
    }

    /** historico: lista de { descricao, categoria, corrigido }, da mais antiga para a mais nova. */
    treinar(historico) {
      const brutos = [];
      for (const [cat, lista] of Object.entries(PALAVRAS)) for (const p of lista) brutos.push({ n: normalizar(p), categoria: cat, peso: 1 });
      const memoria = new Map();
      for (const h of historico || []) {
        const n = normalizar(h.descricao || '');
        if (!n || !CATEGORIAS.includes(h.categoria)) continue;
        brutos.push({ n, categoria: h.categoria, peso: h.corrigido ? PESO_CORRECAO : 1 });
        memoria.set(n, h.categoria);
      }
      // IDF: trechos raros valem mais
      const df = new Map();
      const contagens = brutos.map((b) => {
        const c = new Map();
        for (const t of trechos(b.n)) c.set(t, (c.get(t) || 0) + 1);
        for (const t of c.keys()) df.set(t, (df.get(t) || 0) + 1);
        return c;
      });
      const N = brutos.length;
      const idf = new Map();
      for (const [t, d] of df) idf.set(t, Math.log((N + 1) / (d + 1)) + 1);
      this.idf = idf;
      this.memoria = memoria;
      this.exemplos = brutos.map((b, i) => ({ categoria: b.categoria, peso: b.peso, vetor: this._vetor(contagens[i]) }));
    }

    _vetor(contagens) {
      const v = new Map();
      let soma = 0;
      for (const [t, c] of contagens) {
        const idf = this.idf.get(t);
        if (idf === undefined) continue; // trecho nunca visto: não ajuda a comparar
        const w = (1 + Math.log(c)) * idf;
        v.set(t, w);
        soma += w * w;
      }
      const norma = Math.sqrt(soma);
      if (!norma) return null;
      for (const [t, w] of v) v.set(t, w / norma);
      return v;
    }

    prever(descricao) {
      const n = normalizar(descricao || '');
      if (!n || n === 'gasto') return 'Outros'; // "Gasto" é o texto padrão quando não há descrição
      if (this.memoria.has(n)) return this.memoria.get(n);
      const contagens = new Map();
      for (const t of trechos(n)) contagens.set(t, (contagens.get(t) || 0) + 1);
      const q = this._vetor(contagens);
      if (q) {
        const sims = [];
        for (const e of this.exemplos) {
          if (!e.vetor) continue;
          let s = 0;
          const [pequeno, grande] = q.size <= e.vetor.size ? [q, e.vetor] : [e.vetor, q];
          for (const [t, w] of pequeno) { const o = grande.get(t); if (o !== undefined) s += w * o; }
          if (s > 0) sims.push({ s, e });
        }
        sims.sort((a, b) => b.s - a.s);
        const top = sims.slice(0, K);
        if (top.length && top[0].s >= LIMIAR) {
          const placar = {};
          for (const { s, e } of top) placar[e.categoria] = (placar[e.categoria] || 0) + Math.pow(s, 3) * Math.sqrt(e.peso);
          return Object.entries(placar).sort((a, b) => b[1] - a[1])[0][0];
        }
      }
      return porPalavras(descricao) || 'Outros';
    }
  }

  const api = { CATEGORIAS, PALAVRAS, normalizar, porPalavras, Classificador, classificador: new Classificador() };
  api.classificador.treinar([]);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BrainCategorias = api;
})(typeof self !== 'undefined' ? self : this);
