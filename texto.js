/* Leitura de texto livre em português: datas, horas e valores.
   Tudo roda no próprio navegador, sem internet e sem IA externa.
   (Versão em JavaScript do modulos/texto.py da versão para PC.) */
(function (root) {
  'use strict';

  const MESES = { janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12 };
  const DIAS_SEMANA = { segunda: 0, terca: 1, quarta: 2, quinta: 3, sexta: 4, sabado: 5, domingo: 6 };

  // Palavras "de ligação" que sobram nas pontas depois de tirar valor/data
  const LIGACOES = new Set([
    'gastei', 'gasto', 'gastos', 'paguei', 'pago', 'pagamento', 'comprei', 'compra', 'compras',
    'foi', 'fui', 'deu', 'custou', 'custa', 'de', 'do', 'da', 'dos', 'das', 'no', 'na', 'nos',
    'nas', 'em', 'com', 'pro', 'pra', 'para', 'por', 'um', 'uma', 'o', 'a', 'os', 'as', 'reais',
    'real', 'r$', 'e', 'ai', 'que', 'me', 'hoje', 'ontem', 'anteontem', 'dia', 'ate',
  ]);
  const LIGACOES_FIM = new Set(['de', 'do', 'da', 'no', 'na', 'em', 'para', 'pra', 'por', 'com', 'dia', 'as', 'e', 'ate', 'a', 'o']);

  /** Minúsculas e sem acentos, mantendo exatamente o mesmo comprimento do original. */
  function semAcento(texto) {
    let saida = '';
    for (const c of texto) {
      if (c.length > 1) { saida += c; continue; }
      const base = c.normalize('NFD')[0].toLowerCase();
      saida += base.length === 1 ? base : c;
    }
    return saida;
  }

  const cortar = (texto, ini, fim) => texto.slice(0, ini) + ' ' + texto.slice(fim);

  // ---------- datas (Date local, sempre à meia-noite) ----------
  function mkData(ano, mes, dia) {
    if (!(ano >= 1 && ano <= 9999)) return null;
    const d = new Date(2000, 0, 1);
    d.setFullYear(ano, mes - 1, dia);
    return d.getFullYear() === ano && d.getMonth() === mes - 1 && d.getDate() === dia ? d : null;
  }
  const addDias = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const diaSemana = (d) => (d.getDay() + 6) % 7; // segunda = 0
  const mesmoDia = (a, b) => a.getTime() === b.getTime();
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${String(d.getFullYear()).padStart(4, '0')}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  function hojeData() {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }
  function deIso(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    return m ? mkData(+m[1], +m[2], +m[3]) : null;
  }

  function semAno(dia, mes, hoje, preferir) {
    const d = mkData(hoje.getFullYear(), mes, dia);
    if (!d) return null;
    let ajuste = null;
    if (preferir === 'passado' && d.getTime() > addDias(hoje, 30).getTime()) ajuste = mkData(hoje.getFullYear() - 1, mes, dia);
    else if (preferir === 'futuro' && d.getTime() < addDias(hoje, -30).getTime()) ajuste = mkData(hoje.getFullYear() + 1, mes, dia);
    return ajuste || d;
  }

  /** "dia 15" sem mês: a ocorrência mais recente (passado) ou a próxima (futuro). */
  function diaDoMes(dia, hoje, preferir) {
    for (let k = 0; k < 14; k++) {
      const desloc = preferir === 'passado' ? -k : k;
      const indice = hoje.getMonth() + desloc;
      const ano = hoje.getFullYear() + Math.floor(indice / 12);
      const mes = ((indice % 12) + 12) % 12 + 1;
      const d = mkData(ano, mes, dia);
      if (!d) continue;
      if (preferir === 'passado' && d.getTime() <= hoje.getTime()) return d;
      if (preferir === 'futuro' && d.getTime() >= hoje.getTime()) return d;
    }
    return null;
  }

  const NOMES_MESES = Object.keys(MESES).join('|');
  const NOMES_DIAS = Object.keys(DIAS_SEMANA).join('|');
  const RE_DATA_2 = new RegExp(`(?<!\\d)(?:dia\\s+)?(\\d{1,2})\\s+de\\s+(${NOMES_MESES})(?:\\s+de\\s+(\\d{4}))?\\b`);
  const RE_DATA_4 = new RegExp(`\\b(${NOMES_DIAS})(?:[- ]?feira)?(?:\\s+(passada|passado|que vem|proxima|proximo))?\\b`);

  /** Procura uma data no texto. Devolve [Date | null, texto sem a data]. */
  function extrairData(texto, hoje, preferir) {
    hoje = hoje || hojeData();
    preferir = preferir || 'passado';
    const base = semAcento(texto);

    // 1) 15/10, 15/10/26, 15/10/2026
    for (const m of base.matchAll(/(?<![\d/])(\d{1,2})\/(\d{1,2})(?:\/(\d{4}|\d{2}))?(?![\d/])/g)) {
      const dia = +m[1], mes = +m[2];
      let d;
      if (m[3]) {
        let ano = +m[3];
        if (ano < 100) ano += 2000;
        d = mkData(ano, mes, dia);
      } else {
        d = semAno(dia, mes, hoje, preferir);
      }
      if (d) return [d, cortar(texto, m.index, m.index + m[0].length)];
    }

    // 2) 15 de outubro [de 2026]
    let m = RE_DATA_2.exec(base);
    if (m) {
      const dia = +m[1], mes = MESES[m[2]];
      const d = m[3] ? mkData(+m[3], mes, dia) : semAno(dia, mes, hoje, preferir);
      if (d) return [d, cortar(texto, m.index, m.index + m[0].length)];
    }

    // 3) hoje, ontem, amanhã...
    for (const [palavra, delta] of [['depois de amanha', 2], ['anteontem', -2], ['amanha', 1], ['ontem', -1], ['hoje', 0]]) {
      m = new RegExp(`\\b${palavra}\\b`).exec(base);
      if (m) return [addDias(hoje, delta), cortar(texto, m.index, m.index + m[0].length)];
    }

    // 4) sexta, sexta-feira, sexta passada, sexta que vem
    m = RE_DATA_4.exec(base);
    if (m) {
      const alvo = DIAS_SEMANA[m[1]];
      const mod = m[2];
      let direcao;
      if (mod === 'passada' || mod === 'passado') direcao = 'passado';
      else if (mod === 'proxima' || mod === 'proximo' || mod === 'que vem') direcao = 'futuro';
      else direcao = preferir;
      let d;
      if (direcao === 'passado') {
        d = addDias(hoje, -(((diaSemana(hoje) - alvo) % 7) + 7) % 7);
        if (mesmoDia(d, hoje) && (mod === 'passada' || mod === 'passado')) d = addDias(d, -7);
      } else {
        d = addDias(hoje, (((alvo - diaSemana(hoje)) % 7) + 7) % 7);
        if (mesmoDia(d, hoje)) d = addDias(d, 7);
      }
      return [d, cortar(texto, m.index, m.index + m[0].length)];
    }

    // 5) dia 15
    m = /\bdia\s+(\d{1,2})\b/.exec(base);
    if (m) {
      const d = diaDoMes(+m[1], hoje, preferir);
      if (d) return [d, cortar(texto, m.index, m.index + m[0].length)];
    }

    return [null, texto];
  }

  // ---------- horas (texto "HH:MM") ----------
  function horaValida(h, mi) {
    return h >= 0 && h <= 23 && mi >= 0 && mi <= 59 ? `${pad(h)}:${pad(mi)}` : null;
  }

  /** Procura uma hora no texto (14h, 14h30, 14:30, às 9, meio-dia). Devolve ["HH:MM" | null, texto sem a hora]. */
  function extrairHora(texto) {
    const base = semAcento(texto);

    let m = /\bmeio[- ]?dia\b/.exec(base);
    if (m) return ['12:00', cortar(texto, m.index, m.index + m[0].length)];
    m = /\bmeia[- ]?noite\b/.exec(base);
    if (m) return ['00:00', cortar(texto, m.index, m.index + m[0].length)];

    const padroes = [
      /(?<![\d/])(?:as\s+)?(\d{1,2})\s*(?::|h)\s*(\d{2})(?![\d/])/g, // 14:30, 14h30
      /(?<![\d/])(?:as\s+)?(\d{1,2})\s*h(?:oras?)?\b(?!\d)/g, // 14h, 14 horas
    ];
    for (const padrao of padroes) {
      for (const mm of base.matchAll(padrao)) {
        const minutos = mm[2] ? +mm[2] : 0;
        const t = horaValida(+mm[1], minutos);
        if (t) return [t, cortar(texto, mm.index, mm.index + mm[0].length)];
      }
    }

    // "às 9" (com acento) ou "as 9" no fim da frase
    const minusculo = texto.toLowerCase();
    if (minusculo.length === texto.length) {
      for (const padrao of [/(?<![\p{L}\p{N}_])às\s+(\d{1,2})(?![\d/:h])/u, /\bas\s+(\d{1,2})(?=\s*(?:[,.;!?]|$))/]) {
        const mm = padrao.exec(minusculo);
        if (mm) {
          const t = horaValida(+mm[1], 0);
          if (t) return [t, cortar(texto, mm.index, mm.index + mm[0].length)];
        }
      }
    }
    return [null, texto];
  }

  function limparExtremos(texto, inicio) {
    if (inicio === undefined) inicio = true;
    const palavras = texto.replace(/\n/g, ' ').split(/\s+/).filter(Boolean);
    const solto = (p) => semAcento(p).replace(/^[.,;:!?\-()"']+|[.,;:!?\-()"']+$/g, '');
    while (inicio && palavras.length && (!solto(palavras[0]) || LIGACOES.has(solto(palavras[0])))) palavras.shift();
    const fim = inicio ? LIGACOES : LIGACOES_FIM;
    while (palavras.length && (!solto(palavras[palavras.length - 1]) || fim.has(solto(palavras[palavras.length - 1])))) palavras.pop();
    return palavras.map((p) => p.replace(/^[,;:]+|[,;:]+$/g, '')).join(' ');
  }

  // ---------- valores ----------
  const RE_NUMERO = /(?<![\w.,/])(r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?![\d/])(?!\s?(?:kg|gr|g|ml|l|lt|litros?|metros?|m|cm|un|x)\b)(?:\s*(mil|k|reais|real|conto|contos|pila|pilas)\b)?/g;

  function paraFloat(s) {
    if (s.includes('.') && s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if (s.includes(',')) s = s.replace(',', '.');
    else if (s.includes('.') && /^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    return parseFloat(s);
  }

  const arredonda2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;

  /** Acha o valor em reais. Devolve [valor, texto sem o valor] ou null. */
  function extrairValor(texto) {
    const base = semAcento(texto);
    const candidatos = [];
    for (const m of base.matchAll(RE_NUMERO)) {
      let valor = paraFloat(m[2]);
      if (Number.isNaN(valor)) continue;
      const unidade = m[3];
      if (unidade === 'mil' || unidade === 'k') valor *= 1000;
      if (!(valor > 0 && valor < 10000000)) continue;
      let prioridade;
      if (m[1] || ['reais', 'real', 'conto', 'contos', 'pila', 'pilas'].includes(unidade)) prioridade = 0;
      else if (/(?:^|\s)por\s*$/.test(base.slice(0, m.index))) prioridade = 1;
      else prioridade = 2;
      candidatos.push({ prioridade, ini: m.index, valor: arredonda2(valor), fim: m.index + m[0].length });
    }
    if (!candidatos.length) return null;
    candidatos.sort((a, b) => a.prioridade - b.prioridade || a.ini - b.ini);
    const c = candidatos[0];
    return [c.valor, cortar(texto, c.ini, c.fim)];
  }

  function dividirSegmentos(texto) {
    return texto.trim().split(/\s+e\s+|\s*[;+\n]\s*|,\s+/i).map((p) => (p || '').trim()).filter(Boolean);
  }

  /** '32 no ifood ontem e 15 de uber' -> { itens, ignorados }. */
  function interpretarGastos(texto, hoje) {
    hoje = hoje || hojeData();
    const itens = [];
    const ignorados = [];
    for (const segmento of dividirSegmentos(texto)) {
      const [data, r1] = extrairData(segmento, hoje, 'passado');
      const [, r2] = extrairHora(r1);
      const achado = extrairValor(r2);
      if (!achado) { ignorados.push(segmento); continue; }
      const [valor, resto] = achado;
      itens.push({ valor, descricao: (limparExtremos(resto) || 'Gasto').slice(0, 120), data: iso(data || hoje) });
    }
    return { itens, ignorados };
  }

  /** 'Prova de inglês sexta 14h' -> { titulo, data: Date | null, hora: 'HH:MM' | null }. */
  function interpretarTarefa(titulo, hoje) {
    hoje = hoje || hojeData();
    const [data, r1] = extrairData(titulo, hoje, 'futuro');
    const [hora, r2] = extrairHora(r1);
    const limpo = limparExtremos(r2, false);
    return { titulo: limpo || titulo.trim(), data, hora };
  }

  const api = { semAcento, mkData, addDias, iso, deIso, hojeData, extrairData, extrairHora, extrairValor, dividirSegmentos, limparExtremos, interpretarGastos, interpretarTarefa };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BrainTexto = api;
})(typeof self !== 'undefined' ? self : this);
