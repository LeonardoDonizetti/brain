/* Área de Estudos do Brain: lógica pura (sem tela), testável no Node.
   Plano semanal em blocos, leitura de texto livre, ciclo de matérias, revisão espaçada, estatísticas e dicas.
   Tudo roda no aparelho, sem internet e sem IA paga: são regras. */
(function (root) {
  'use strict';

  const TIPOS = { estudo: 'Estudo', aula: 'Aula', escola: 'Escola', trabalho: 'Trabalho', treino: 'Treino', refeicao: 'Refeição', deslocamento: 'Deslocamento', descanso: 'Descanso', outro: 'Outro' };
  const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const DIAS_CURTO = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const ORDEM_SEMANA = [1, 2, 3, 4, 5, 6, 0];
  const INTERVALOS = [1, 7, 30, 90]; // revisão espaçada: 1 dia, 1 semana, 1 mês, 3 meses
  const MOTIVOS = { nao_sabia: 'Não sabia o conteúdo', distracao: 'Distração', calculo: 'Erro de cálculo', interpretacao: 'Interpretação da questão', tempo: 'Falta de tempo', chute: 'Chutei' };
  const CORES_MATERIA = ['#2f5fb3', '#2e7d57', '#b3402f', '#b0701c', '#7a4f9e', '#1f7f95', '#b03a6a', '#5f6b7a'];

  const pad = (n) => String(n).padStart(2, '0');
  const ehData = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
  const ehHora = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s || ''));
  const txt = (v, n) => (v === undefined || v === null ? '' : String(v)).slice(0, n || 200);
  const isoDe = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const deIso = (s) => { const [a, m, d] = s.split('-').map(Number); return new Date(a, m - 1, d); };
  const somaDias = (s, n) => { const d = deIso(s); d.setDate(d.getDate() + n); return isoDe(d); };
  const minutos = (h) => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
  const hhmm = (m) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const diasEntre = (a, b) => Math.round((deIso(a) - deIso(b)) / 86400000);

  function estadoVazio() {
    return { materias: [], blocos: [], vestibulares: [], sessoes: [], revisoes: [], erros: [], nota: '', foto: null, prox_id: 1 };
  }

  /** Aceita qualquer objeto e devolve um estado de estudos válido (descarta o que estiver errado). */
  function sanitizar(o) {
    o = o && typeof o === 'object' ? o : {};
    const L = (v) => (Array.isArray(v) ? v : []);
    const e = estadoVazio();
    let maxId = 0;
    const ids = new Set();
    const id = (x) => { let n = Number.isInteger(x) && x > 0 ? x : 0; if (!n || ids.has(n)) n = Math.max(maxId, ...ids, 0) + 1; ids.add(n); maxId = Math.max(maxId, n); return n; };
    for (const m of L(o.materias).slice(0, 40)) {
      if (!txt(m.nome).trim()) continue;
      e.materias.push({ id: id(m.id), nome: txt(m.nome, 40).trim(), cor: Number.isInteger(m.cor) && m.cor >= 0 && m.cor < CORES_MATERIA.length ? m.cor : e.materias.length % CORES_MATERIA.length, prioridade: [1, 2, 3].includes(m.prioridade) ? m.prioridade : 2, meta_h: Math.max(0, Math.min(80, Number(m.meta_h) || 0)) });
    }
    const idsMat = new Set(e.materias.map((m) => m.id));
    for (const b of L(o.blocos).slice(0, 600)) {
      if (!Number.isInteger(b.dia) || b.dia < 0 || b.dia > 6 || !ehHora(b.ini) || !ehHora(b.fim) || !txt(b.titulo).trim()) continue;
      e.blocos.push({ id: id(b.id), dia: b.dia, ini: b.ini, fim: b.fim, titulo: txt(b.titulo, 80).trim(), tipo: TIPOS[b.tipo] ? b.tipo : 'outro', materia_id: idsMat.has(b.materia_id) ? b.materia_id : null });
    }
    for (const v of L(o.vestibulares).slice(0, 20)) {
      if (!txt(v.nome).trim() || !ehData(v.data)) continue;
      e.vestibulares.push({ id: id(v.id), nome: txt(v.nome, 60).trim(), data: v.data, foco: v.foco === true });
    }
    for (const s of L(o.sessoes).slice(-3000)) {
      const mi = Math.round(Number(s.minutos));
      if (!ehData(s.data) || !(mi >= 1 && mi <= 720)) continue;
      e.sessoes.push({ id: id(s.id), data: s.data, minutos: mi, materia_id: idsMat.has(s.materia_id) ? s.materia_id : null });
    }
    for (const r of L(o.revisoes).slice(-1000)) {
      if (!txt(r.tema).trim() || !ehData(r.estudado_em) || !ehData(r.proxima)) continue;
      e.revisoes.push({ id: id(r.id), tema: txt(r.tema, 100).trim(), materia_id: idsMat.has(r.materia_id) ? r.materia_id : null, estudado_em: r.estudado_em, etapa: Math.max(0, Math.min(INTERVALOS.length, Number(r.etapa) || 0)), proxima: r.proxima, concluida: r.concluida === true });
    }
    for (const x of L(o.erros).slice(-1000)) {
      if (!txt(x.assunto).trim() || !ehData(x.data)) continue;
      e.erros.push({ id: id(x.id), data: x.data, materia_id: idsMat.has(x.materia_id) ? x.materia_id : null, assunto: txt(x.assunto, 100).trim(), motivo: MOTIVOS[x.motivo] ? x.motivo : 'nao_sabia', nota: txt(x.nota, 300), resolvido: x.resolvido === true });
    }
    e.nota = txt(o.nota, 3000);
    e.foto = typeof o.foto === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(o.foto) && o.foto.length <= 700000 ? o.foto : null;
    e.prox_id = Math.max(maxId, 0) + 1;
    return e;
  }

  const novoId = (e) => { const n = e.prox_id || 1; e.prox_id = n + 1; return n; };

  // ---------------------------------------------------------- leitura de texto livre
  const REG_DIA = /\b(domingo|dom|segunda(?:-feira)?|seg|terca(?:-feira)?|ter|quarta(?:-feira)?|qua|quinta(?:-feira)?|qui|sexta(?:-feira)?|sex|sabado|sab)\b/g;
  const IDX_DIA = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6 };
  const diaIdx = (w) => IDX_DIA[w.slice(0, 3)];
  const REG_HORA = '(\\d{1,2})\\s*(?::|h)\\s*(\\d{2})?';
  const FILTRO = /\b(das|dos|de|do|da|as|a|o|para|pra|para o|estudar|estudo|quero|vou|toda|todo|todos|os|dias|ate|e|por|em|no|na|horas?|hs?|min)\b/g;

  function expandir(a, b) { const l = []; let d = a; for (let i = 0; i < 8; i++) { l.push(d); if (d === b) break; d = (d + 1) % 7; } return l; }

  function inferirTipo(t) {
    const n = norm(t);
    if (/academia|treino|musculacao|corrida|exercicio fisico/.test(n)) return 'treino';
    if (/almoc|cafe|jantar|lanche|refeic/.test(n)) return 'refeicao';
    if (/desloc|onibus|metro|trajeto|transito/.test(n)) return 'deslocamento';
    if (/trabalho|estagio|emprego/.test(n)) return 'trabalho';
    if (/^em\b|escola|colegio/.test(n)) return 'escola';
    if (/\baula|cursinho|prof\b/.test(n)) return 'aula';
    if (/descanso|dormir|sono|lazer|livre|folga/.test(n)) return 'descanso';
    return null;
  }

  /** Converte linhas como "seg a sex 05:00-06:00 física" em blocos. Devolve também as linhas que não deu para entender. */
  function lerTexto(textoBruto, materias) {
    materias = materias || [];
    const blocos = [], ignoradas = [];
    for (const bruta of String(textoBruto || '').split(/\r?\n|;/)) {
      const linha = bruta.trim();
      if (!linha) continue;
      let n = norm(linha);
      const dias = new Set();
      if (/\b(todos os dias|todo dia|diariamente|diario)\b/.test(n)) { for (let i = 0; i < 7; i++) dias.add(i); n = n.replace(/\b(todos os dias|todo dia|diariamente|diario)\b/, ' '); }
      if (/\b(dias uteis|segunda a sexta|seg a sex|seg-sex|segunda-sexta)\b/.test(n)) { [1, 2, 3, 4, 5].forEach((i) => dias.add(i)); n = n.replace(/\b(dias uteis|segunda a sexta|seg a sex|seg-sex|segunda-sexta)\b/, ' '); }
      if (/\b(fim de semana|fins de semana|fds)\b/.test(n)) { dias.add(6); dias.add(0); n = n.replace(/\b(fim de semana|fins de semana|fds)\b/, ' '); }
      // faixas "seg a qui" / "seg-qui" e listas "seg, qua e sex"
      const achados = [];
      n = n.replace(REG_DIA, (m, w, pos) => { achados.push({ i: diaIdx(w), pos }); return ' \u0001 '; });
      const partes = n.split('\u0001');
      for (let k = 0; k < achados.length; k++) {
        const entre = (partes[k + 1] || '').trim();
        if (k + 1 < achados.length && /^(a|ate|-|–)$/.test(entre)) { expandir(achados[k].i, achados[k + 1].i).forEach((d) => dias.add(d)); k++; }
        else dias.add(achados[k].i);
      }
      n = partes.join(' ');
      // duração "por 2h"
      let dur = null;
      n = n.replace(/\bpor\s+(\d+(?:[.,]\d+)?)\s*(h|horas?|min|minutos?)\b/, (m, v, u) => { dur = Math.round(parseFloat(v.replace(',', '.')) * (u.startsWith('m') ? 1 : 60)); return ' '; });
      // horários
      const horas = [];
      n = n.replace(new RegExp(REG_HORA, 'g'), (m, h, mi) => { const H = Number(h), M = mi ? Number(mi) : 0; if (H > 24 || M > 59) return m; horas.push(H * 60 + M); return ' \u0002 '; });
      let ini = null, fim = null;
      if (horas.length >= 2) { ini = horas[0]; fim = horas[1]; }
      else if (horas.length === 1 && dur) { ini = horas[0]; fim = ini + dur; }
      n = n.replace(/\u0002/g, ' ').replace(/[-–:,.]/g, ' ').replace(FILTRO, ' ').replace(/\s+/g, ' ').trim();
      if (!dias.size || ini === null || fim === null) { ignoradas.push(linha); continue; }
      if (fim <= ini) fim = fim === 0 || fim < ini ? fim + 1440 : ini + 60;
      if (fim > 1440) fim = 1440;
      if (ini >= 1440 || fim - ini < 5) { ignoradas.push(linha); continue; }
      // recupera a grafia original (com acentos) das palavras que sobraram no título
      const sobra = n ? n.split(' ') : [];
      const orig = linha.split(/\s+/).filter((w) => { const k = norm(w).replace(/[^a-z0-9/]/g, ''); const i = sobra.indexOf(k); if (i >= 0) { sobra.splice(i, 1); return true; } return false; });
      let titulo = orig.join(' ') || n || 'Estudo';
      const mat = materias.find((m) => norm(titulo).includes(norm(m.nome)) || norm(m.nome).includes(norm(titulo)) && norm(titulo).length >= 4);
      let tipo = inferirTipo(titulo) || (mat || /estud|revis|simulado|redacao|exerc|questoes|ciclo|leitura/.test(norm(titulo)) ? 'estudo' : 'outro');
      if (mat && tipo === 'outro') tipo = 'estudo';
      titulo = titulo.charAt(0).toUpperCase() + titulo.slice(1);
      for (const d of [...dias].sort()) blocos.push({ dia: d, ini: hhmm(ini), fim: fim >= 1440 ? '23:59' : hhmm(fim), titulo, tipo, materia_id: mat ? mat.id : null });
    }
    return { blocos, ignoradas };
  }

  // ---------------------------------------------------------- bloco agora / próximo
  function agoraProximo(blocos, now) {
    const dia = now.getDay(), m = now.getHours() * 60 + now.getMinutes();
    const hoje = blocos.filter((b) => b.dia === dia).sort((a, b) => minutos(a.ini) - minutos(b.ini));
    const atual = hoje.find((b) => minutos(b.ini) <= m && m < minutos(b.fim)) || null;
    const proximo = hoje.find((b) => minutos(b.ini) > m) || null;
    return { atual, proximo, hoje };
  }

  /** Marca blocos que se sobrepõem no mesmo dia (para avisar). */
  function conflitos(blocos) {
    const r = [];
    for (let d = 0; d < 7; d++) {
      const l = blocos.filter((b) => b.dia === d).sort((a, b) => minutos(a.ini) - minutos(b.ini));
      for (let i = 1; i < l.length; i++) if (minutos(l[i].ini) < minutos(l[i - 1].fim)) r.push([l[i - 1], l[i]]);
    }
    return r;
  }

  // ---------------------------------------------------------- ciclo de matérias (preenche blocos de estudo vazios)
  function gerarPlano(e) {
    const mats = e.materias;
    if (!mats.length) return { atribuicoes: [], motivo: 'Cadastre as matérias primeiro.' };
    const foco = e.vestibulares.some((v) => v.foco);
    const peso = (m) => ({ 1: 1, 2: 2, 3: 3 }[m.prioridade] || 2);
    const soma = mats.reduce((s, m) => s + peso(m), 0);
    const ocupado = new Map(mats.map((m) => [m.id, 0]));
    for (const b of e.blocos) if (b.tipo === 'estudo' && b.materia_id) ocupado.set(b.materia_id, (ocupado.get(b.materia_id) || 0) + minutos(b.fim) - minutos(b.ini));
    const livres = e.blocos.filter((b) => b.tipo === 'estudo' && !b.materia_id).sort((a, b) => (ORDEM_SEMANA.indexOf(a.dia) - ORDEM_SEMANA.indexOf(b.dia)) || (minutos(a.ini) - minutos(b.ini)));
    if (!livres.length) return { atribuicoes: [], motivo: 'Não há blocos de estudo sem matéria. Crie blocos do tipo Estudo (por exemplo, "Ciclo") e eu distribuo as matérias.' };
    const total = livres.reduce((s, b) => s + minutos(b.fim) - minutos(b.ini), 0) + [...ocupado.values()].reduce((s, v) => s + v, 0);
    const atribuicoes = [];
    const ultimoDoDia = new Map();
    for (const b of livres) {
      const dur = minutos(b.fim) - minutos(b.ini);
      let melhor = null, melhorScore = -Infinity;
      for (const m of mats) {
        const alvo = (peso(m) / soma) * total;
        let deficit = alvo - ocupado.get(m.id);
        if (m.meta_h > 0) deficit += Math.max(0, m.meta_h * 60 - ocupado.get(m.id)) * 0.25;
        if (ultimoDoDia.get(b.dia) === m.id) deficit -= 1000; // intercala: evita a mesma matéria em sequência
        if (deficit > melhorScore) { melhorScore = deficit; melhor = m; }
      }
      ocupado.set(melhor.id, ocupado.get(melhor.id) + dur);
      ultimoDoDia.set(b.dia, melhor.id);
      atribuicoes.push({ id: b.id, materia_id: melhor.id });
    }
    return { atribuicoes, foco, motivo: '' };
  }

  // ---------------------------------------------------------- estatísticas de estudo
  function inicioSemana(hoje) { const d = deIso(hoje); const dif = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dif); return isoDe(d); } // segunda
  function estatisticas(e, hoje) {
    const por = new Map();
    let minHoje = 0, minSemana = 0;
    const ini = inicioSemana(hoje);
    const diasMin = new Map();
    for (const s of e.sessoes) {
      diasMin.set(s.data, (diasMin.get(s.data) || 0) + s.minutos);
      if (s.data === hoje) minHoje += s.minutos;
      if (s.data >= ini && s.data <= hoje) { minSemana += s.minutos; por.set(s.materia_id, (por.get(s.materia_id) || 0) + s.minutos); }
    }
    let seq = 0, d = diasMin.get(hoje) ? hoje : somaDias(hoje, -1);
    while (diasMin.get(d)) { seq++; d = somaDias(d, -1); }
    const ultimos7 = []; for (let i = 6; i >= 0; i--) { const dia = somaDias(hoje, -i); ultimos7.push({ data: dia, min: diasMin.get(dia) || 0 }); }
    return { hoje: minHoje, semana: minSemana, porMateria: por, sequencia: seq, ultimos7 };
  }
  const fmtMin = (m) => { m = Math.round(m); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ' ' + pad(m % 60) : ''}`; };

  // ---------------------------------------------------------- revisão espaçada
  function criarRevisao(e, tema, materiaId, hoje) {
    const r = { id: novoId(e), tema: txt(tema, 100).trim(), materia_id: materiaId || null, estudado_em: hoje, etapa: 0, proxima: somaDias(hoje, INTERVALOS[0]), concluida: false };
    e.revisoes.push(r); return r;
  }
  function concluirRevisao(r, hoje) {
    r.etapa += 1;
    if (r.etapa >= INTERVALOS.length) { r.concluida = true; return r; }
    const alvo = somaDias(r.estudado_em, INTERVALOS[r.etapa]);
    r.proxima = alvo > hoje ? alvo : somaDias(hoje, Math.max(1, INTERVALOS[r.etapa] - INTERVALOS[r.etapa - 1]));
    return r;
  }
  /** Resultado da revisão (como no Anki): 'bom' avança, 'dificil' repete em 3 dias, 'esqueci' volta ao início. */
  function avaliarRevisao(r, nivel, hoje) {
    if (nivel === 'bom') return concluirRevisao(r, hoje);
    if (nivel === 'dificil') { r.proxima = somaDias(hoje, 3); return r; }
    r.etapa = 0; r.concluida = false; r.proxima = somaDias(hoje, 1); return r;
  }
  const revisoesDevidas = (e, hoje) => e.revisoes.filter((r) => !r.concluida && r.proxima <= hoje).sort((a, b) => a.proxima.localeCompare(b.proxima));

  // ---------------------------------------------------------- vestibulares
  function proximoVestibular(e, hoje) {
    const futuros = e.vestibulares.filter((v) => v.data >= hoje).sort((a, b) => (b.foco - a.foco) || a.data.localeCompare(b.data));
    if (!futuros.length) return null;
    const v = futuros[0];
    return { ...v, dias: diasEntre(v.data, hoje), semanas: Math.floor(diasEntre(v.data, hoje) / 7) };
  }

  // ---------------------------------------------------------- coach de estudos
  const DICA_ERRO = {
    nao_sabia: 'Vale revisar a teoria desses assuntos e fazer questões logo depois.',
    distracao: 'Tente blocos de foco de 25 minutos, com o celular longe.',
    calculo: 'Treine contas à mão e confira o resultado antes de marcar.',
    interpretacao: 'Sublinhe o que a questão pede antes de resolver.',
    tempo: 'Faça simulados cronometrados e deixe as difíceis para o final.',
    chute: 'Chutar muito indica lacuna: transforme esses erros em revisão.',
  };
  /** Mensagens para o coach geral. ctx: { e (estudos), hoje, agora } */
  function mensagens(ctx) {
    const e = ctx.e; if (!e) return [];
    const out = [];
    const add = (nivel, texto, prio) => out.push({ area: 'estudo', nivel, texto, prio });
    const hoje = ctx.hoje, agora = ctx.agora || new Date();
    const v = proximoVestibular(e, hoje);
    if (v) add(v.dias <= 30 ? 'aviso' : 'info', v.dias === 0 ? `Hoje é o dia: ${v.nome}. Confie no que você estudou.` : `Faltam ${v.dias} ${v.dias === 1 ? 'dia' : 'dias'} para ${v.nome}${v.semanas >= 2 ? ` (cerca de ${v.semanas} semanas)` : ''}.`, 76);
    const dev = revisoesDevidas(e, hoje);
    if (dev.length) add('aviso', `${dev.length} ${dev.length === 1 ? 'revisão pendente' : 'revisões pendentes'} para hoje. Revisar no tempo certo é o que fixa o conteúdo.`, 78);
    const st = estatisticas(e, hoje);
    const { atual, proximo, hoje: blocosHoje } = agoraProximo(e.blocos, agora);
    if (atual) add('info', `Agora: ${atual.titulo} até ${atual.fim}.${atual.tipo === 'estudo' ? ' Que tal um bloco de foco?' : ''}`, 57);
    else if (proximo) add('info', `Próximo da agenda: ${proximo.titulo} às ${proximo.ini}.`, 52);
    const temEstudoHoje = blocosHoje.some((b) => b.tipo === 'estudo');
    if (st.hoje === 0 && temEstudoHoje && agora.getHours() >= 16) add('aviso', 'Você ainda não registrou estudo hoje. Comece com 25 minutos, só uma matéria.', 71);
    else if (st.hoje >= 60) add('bom', `Você estudou ${fmtMin(st.hoje)} hoje. Bom trabalho!`, 24);
    if (st.sequencia >= 3) add('bom', `${st.sequencia} dias seguidos estudando. Continue.`, 22);
    const dow = (agora.getDay() + 6) % 7; // 0 = segunda
    if (dow >= 2) {
      for (const m of e.materias) {
        if (m.meta_h <= 0) continue;
        const feito = (st.porMateria.get(m.id) || 0) / 60;
        if (feito < m.meta_h * 0.4) { add('aviso', `${m.nome}: ${feito.toFixed(1).replace('.', ',')} h de ${m.meta_h} h da meta da semana.`, 66); break; }
      }
    }
    const abertos = e.erros.filter((x) => !x.resolvido).slice(-30);
    if (abertos.length >= 4) {
      const c = {}; abertos.forEach((x) => { c[x.motivo] = (c[x.motivo] || 0) + 1; });
      const [top, n] = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
      if (n >= 3) add('info', `Seu motivo de erro mais comum é "${MOTIVOS[top].toLowerCase()}" (${n} de ${abertos.length}). ${DICA_ERRO[top]}`, 40);
    }
    return out;
  }

  /** Respostas do coach sobre estudos. Devolve texto ou null se a pergunta não é de estudos. */
  function responder(q, ctx) {
    const e = ctx.e; if (!e) return null;
    const has = (...t) => t.some((x) => new RegExp('(^|[^a-z0-9])' + x).test(q));
    if (!has('estud', 'vestibular', 'enem', 'prova', 'revis', 'materia', 'pomodoro', 'foco', 'simulado', 'ciclo', 'erro', 'caderno', 'tecnica', 'como estudar', 'concentra')) return null;
    const msgs = mensagens(ctx);
    if (has('tecnica', 'como estudar', 'metodo', 'melhor jeito')) return 'Segundo a pesquisa em psicologia da aprendizagem, o que mais funciona é: 1) recuperação ativa (fechar o material e tentar lembrar ou resolver questões), 2) repetição espaçada (revisar após 1 dia, 1 semana, 1 mês), 3) intercalar matérias em vez de estudar uma só por horas, 4) explicar o assunto com suas palavras. Reler e grifar rende bem menos. Veja a aba Plano para um resumo.';
    if (has('erro', 'caderno')) { const m = msgs.find((x) => /erro mais comum/.test(x.texto)); return m ? m.texto : 'Registre seus erros em Revisões, no Caderno de erros. Com alguns registros eu aponto o padrão mais comum.'; }
    if (has('revis')) { const d = revisoesDevidas(e, ctx.hoje); return d.length ? `Você tem ${d.length} ${d.length === 1 ? 'revisão' : 'revisões'} para hoje, por exemplo: ${d.slice(0, 3).map((r) => r.tema).join(', ')}.` : 'Nenhuma revisão pendente hoje. Ao terminar um assunto, adicione em Revisões e eu agendo 1 dia, 1 semana, 1 mês e 3 meses.'; }
    if (has('vestibular', 'enem', 'prova')) { const v = proximoVestibular(e, ctx.hoje); return v ? `${v.nome}: faltam ${v.dias} dias${v.semanas >= 1 ? ` (${v.semanas} semanas)` : ''}. ${v.dias > 60 ? 'Ainda há tempo para construir base: priorize teoria e muitas questões.' : v.dias > 14 ? 'Fase de intensificar: simulados, revisão de erros e matérias de maior peso.' : 'Reta final: revise o caderno de erros, durma bem e foque no que já domina.'}` : 'Cadastre seu vestibular na aba Plano e eu acompanho a contagem regressiva.'; }
    const l = msgs.filter((m) => m.nivel !== 'bom').slice(0, 3).map((m) => m.texto);
    const st = estatisticas(e, ctx.hoje);
    return (l.length ? l.join(' ') + ' ' : '') + `Estudo registrado: hoje ${fmtMin(st.hoje)}, na semana ${fmtMin(st.semana)}.`;
  }

  // ---------------------------------------------------------- modelo a partir da foto do usuário
  function modeloFoto() {
    const materias = ['Física', 'Biologia', 'Química', 'Matemática', 'Português', 'História', 'Geografia'].map((nome, i) => ({ id: i + 1, nome, cor: i, prioridade: 2, meta_h: 0 }));
    const M = Object.fromEntries(materias.map((m) => [m.nome, m.id]));
    const b = [];
    let id = 100;
    const add = (dia, ini, fim, titulo, tipo, mat) => b.push({ id: id++, dia, ini, fim, titulo, tipo, materia_id: mat ? M[mat] : null });
    const manha = { 1: 'Física', 2: 'Biologia', 3: 'Química', 4: 'Física', 5: 'Química' };
    const profs = {
      1: ['Davi', 'Theodoro', 'Mário', 'Mário'], 2: ['Cris Bastos', 'Cris Bastos/Rocha', 'Rocha', 'Tchelo'], 3: ['Math Cury', 'Léo Ribas', 'Beto', 'Rogério'],
      4: ['Fábio Simon', 'Fábio Simon', 'Maurinho', 'Jojo'], 5: ['Eufrásio', 'Mavi', 'Gui Mourão', 'Gui Mourão'],
    };
    const horas = [['18:30', '19:20'], ['19:20', '20:10'], ['20:30', '21:20'], ['21:20', '22:10']];
    for (let d = 1; d <= 5; d++) {
      add(d, '05:00', '06:00', manha[d], 'estudo', manha[d]);
      add(d, '06:00', '07:00', 'Academia', 'treino');
      add(d, '07:30', '12:30', 'Escola (EM)', 'escola');
      add(d, '12:30', '13:30', 'Almoço', 'refeicao');
      add(d, '14:00', '17:00', 'Trabalho', 'trabalho');
      add(d, '17:00', '18:30', 'Deslocamento', 'deslocamento');
      profs[d].forEach((p, i) => add(d, horas[i][0], horas[i][1], `Aula: ${p}`, 'aula'));
      add(d, '22:10', '23:00', 'Deslocamento', 'deslocamento');
    }
    add(6, '06:00', '06:30', 'Café', 'refeicao');
    add(6, '06:30', '07:30', 'Biologia', 'estudo', 'Biologia');
    add(6, '08:30', '09:30', 'Deslocamento', 'deslocamento');
    add(6, '09:30', '11:30', 'Aulas: Bruno Arruda, Maion, Castro, Renata', 'aula');
    add(6, '12:30', '14:00', 'Almoço', 'refeicao');
    for (let i = 0; i < 5; i++) add(6, hhmm(14 * 60 + 30 + i * 60), hhmm(15 * 60 + 30 + i * 60), 'Ciclo de estudos', 'estudo');
    add(0, '07:30', '09:00', 'Português', 'aula', 'Português');
    add(0, '09:00', '11:00', 'Matemática', 'aula', 'Matemática');
    add(0, '11:00', '12:30', 'Geografia', 'aula', 'Geografia');
    add(0, '12:30', '14:00', 'Almoço', 'refeicao');
    add(0, '14:00', '15:30', 'Português', 'aula', 'Português');
    add(0, '16:00', '17:30', 'História', 'aula', 'História');
    add(0, '18:00', '19:30', 'Matemática', 'aula', 'Matemática');
    const e = sanitizar({ materias, blocos: b });
    return e;
  }

  const api = { TIPOS, DIAS, DIAS_CURTO, ORDEM_SEMANA, INTERVALOS, MOTIVOS, CORES_MATERIA, DICA_ERRO, estadoVazio, sanitizar, novoId, lerTexto, agoraProximo, conflitos, gerarPlano, estatisticas, inicioSemana, fmtMin, criarRevisao, concluirRevisao, avaliarRevisao, revisoesDevidas, proximoVestibular, mensagens, responder, modeloFoto, minutos, hhmm, somaDias, isoDe, norm };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.BrainEstudos = api;
})(typeof window !== 'undefined' ? window : globalThis);
