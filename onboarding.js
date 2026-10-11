/* Boas-vindas do Brain: roteiro de perguntas e regras que transformam as respostas em ajustes.
   Tudo roda no aparelho, sem enviar nada. Funciona no navegador e no Node (testes). */
(function (root) {
  'use strict';

  const MODULOS = [
    { id: 'tarefas', nome: 'Tarefas', texto: 'Lista com prazo e horário, metas por dia e semana, e botão para o Google Agenda.', href: 'tarefas.html' },
    { id: 'rotina', nome: 'Rotina', texto: 'Hábitos do dia a dia com marcação rápida e constância.', href: 'rotina.html' },
    { id: 'estudos', nome: 'Estudos', texto: 'Plano semanal, foco com cronômetro, revisão espaçada, caderno de erros e vestibulares.', href: 'estudos.html' },
    { id: 'jornada', nome: 'Jornada', texto: 'Desafio de vários dias para criar constância, com histórico.', href: 'jornada.html' },
    { id: 'financas', nome: 'Finanças', texto: 'Gastos, receitas, orçamento e gráficos por categoria.', href: 'financas.html' },
    { id: 'coach', nome: 'Coach', texto: 'Incentiva suas tarefas e avisa quando um gasto foge do normal. Funciona por regras no seu aparelho.', href: './' },
  ];

  const O = (v, t, eco) => ({ v, t, eco });
  const PERGUNTAS = [
    { id: 'foco', texto: 'Como anda o seu foco ultimamente?', opcoes: [
      O('dificil', 'Me distraio com facilidade', 'Entendi. Vou sugerir blocos curtos de foco e metas pequenas.'),
      O('varia', 'Depende do dia', 'Normal. O Brain se adapta aos seus dias bons e aos ruins.'),
      O('bom', 'Consigo me concentrar bem', 'Ótimo! Então o desafio agora é manter o ritmo.') ] },
    { id: 'disc', texto: 'E a disciplina: você mantém o que começa?', opcoes: [
      O('baixa', 'Começo animado e acabo largando', 'Sem culpa. Vou começar com metas leves para você ganhar embalo.'),
      O('media', 'Oscilo, mas costumo retomar', 'Saber retomar é a habilidade que mais pesa na constância.'),
      O('alta', 'Costumo manter a constância', 'Excelente! Posso deixar as metas mais desafiadoras.') ] },
    { id: 'tarefas', texto: 'Como você organiza as tarefas hoje?', opcoes: [
      O('nada', 'Guardo tudo na cabeça', 'Tirar da cabeça já alivia bastante. Começamos por aí.'),
      O('acumula', 'Eu anoto, mas as tarefas acumulam', 'Isso é mais comum do que parece. Metas diárias pequenas ajudam a desafogar.'),
      O('ok', 'Está tudo em dia', 'Muito bem! Vou deixar a meta diária um pouco mais alta.') ] },
    { id: 'estudos', texto: 'E os estudos?', opcoes: [
      O('sem', 'Não tenho rotina de estudo', 'O plano semanal foi feito para isso.'),
      O('solto', 'Estudo, mas sem um plano', 'Um plano com revisões costuma render mais que horas soltas.'),
      O('plano', 'Tenho plano e sigo', 'Então use o app para registrar o foco e as revisões.'),
      O('nao', 'Não estou estudando agora', 'Sem problema. Deixo Estudos em segundo plano.') ] },
    { id: 'dinheiro', texto: 'Como está o controle do dinheiro?', opcoes: [
      O('nada', 'Não acompanho meus gastos', 'Registrar por uma semana já mostra para onde o dinheiro vai.'),
      O('as_vezes', 'Olho de vez em quando', 'Registrar na hora deixa os gráficos bem mais úteis.'),
      O('controle', 'Controlo bem', 'Ótimo! Então o foco será orçamento e categorias.'),
      O('nao', 'Prefiro não usar finanças', 'Combinado. Escondo os gastos da tela inicial.') ] },
    { id: 'rotina', texto: 'Como é a sua rotina diária?', opcoes: [
      O('sem', 'Muda todo dia', 'Começar com 2 ou 3 hábitos fixos já dá estrutura.'),
      O('meio', 'Tenho horários, mas nem sempre cumpro', 'Marcar o hábito na hora ajuda a perceber quando você sai do trilho.'),
      O('firme', 'É bem definida', 'Ótimo! Use a Rotina para registrar a sua constância.') ] },
  ];
  const PRIORIDADES = [['tarefas', 'Tarefas'], ['estudos', 'Estudos'], ['financas', 'Finanças'], ['rotina', 'Rotina'], ['jornada', 'Jornada']];
  const TONS = [
    O('amigo', 'Amigo: incentivo leve', 'Combinado: vou incentivar você com leveza.'),
    O('firme', 'Firme: direto, com cobrança', 'Combinado: vou ser direto e cobrar quando precisar.'),
    O('calmo', 'Calmo: sem pressão', 'Combinado: sem pressão, no seu tempo.') ];

  const MOTIVOS = [['vestibular', 'Passar no vestibular ou no ENEM'], ['notas', 'Melhorar minhas notas'], ['disciplina', 'Criar disciplina e constância'], ['organizar', 'Organizar tarefas e rotina'], ['dinheiro', 'Controlar meu dinheiro']];
  const MOTIVACOES = [['curso', 'Entrar no curso que eu quero'], ['familia', 'Deixar minha família orgulhosa'], ['autonomia', 'Ter mais autonomia'], ['estresse', 'Menos correria e estresse'], ['tempo', 'Ganhar tempo livre'], ['mente', 'Ter a cabeça mais tranquila'], ['grana', 'Independência financeira']];
  const RITMOS = [['leve', 'Com calma, mas sem parar'], ['medio', 'Equilibrado, no meu tempo'], ['rapido', 'O mais rápido que der']];
  const HORAS = []; for (let h = 0.5; h <= 8; h += 0.5) HORAS.push(h);
  const rotuloHoras = (h) => (h < 1 ? '30 min' : Number.isInteger(h) ? `${h} h` : `${Math.floor(h)} h 30`);

  const VALIDOS = {};
  for (const p of PERGUNTAS) VALIDOS[p.id] = p.opcoes.map((o) => o.v);
  VALIDOS.tom = TONS.map((o) => o.v);
  VALIDOS.motivo = MOTIVOS.map((x) => x[0]);
  VALIDOS.ritmo = RITMOS.map((x) => x[0]);

  /** Mantém só respostas conhecidas; o resto é descartado. */
  function sanitizarPerfil(p) {
    p = p && typeof p === 'object' ? p : {};
    const r = {};
    if (typeof p.nome === 'string') { const n = p.nome.replace(/\s+/g, ' ').trim().slice(0, 24); if (n) r.nome = n; }
    for (const k of Object.keys(VALIDOS)) if (VALIDOS[k].includes(p[k])) r[k] = p[k];
    if (Array.isArray(p.motivacoes)) { const ok = MOTIVACOES.map((x) => x[0]); const u = [...new Set(p.motivacoes.filter((x) => ok.includes(x)))].slice(0, 3); if (u.length) r.motivacoes = u; }
    if (HORAS.includes(Number(p.horas))) r.horas = Number(p.horas);
    if (Number.isInteger(Number(p.dias)) && Number(p.dias) >= 1 && Number(p.dias) <= 7 && p.dias !== null && p.dias !== '') r.dias = Number(p.dias);
    if (Array.isArray(p.prioridade)) {
      const ok = PRIORIDADES.map((x) => x[0]);
      const u = [...new Set(p.prioridade.filter((x) => ok.includes(x)))].slice(0, 2);
      if (u.length) r.prioridade = u;
    }
    return r;
  }

  const PONTOS = {
    tarefas: { nada: 3, acumula: 2, ok: 0 },
    estudos: { sem: 3, solto: 2, plano: 0, nao: -1 },
    financas: { nada: 3, as_vezes: 2, controle: 0, nao: -1 },
    rotina: { sem: 3, meio: 2, firme: 0 },
    jornada: { baixa: 3, media: 2, alta: 1 },
  };
  const PASSO = {
    tarefas: (r) => ({ titulo: 'Anote 3 tarefas para hoje', texto: r.tarefas === 'nada' ? 'Tire da cabeça o que está pendente. Prazo e horário são opcionais.' : 'Escolha as 3 mais importantes e deixe o resto para depois.', href: 'tarefas.html' }),
    estudos: (r) => ({ titulo: r.foco === 'dificil' ? 'Faça um foco de 25 minutos' : 'Monte seu plano semanal', texto: r.foco === 'dificil' ? 'Um bloco curto com cronômetro é o jeito mais leve de começar a estudar.' : 'Cadastre as matérias e deixe o Brain preencher os blocos livres.', href: 'estudos.html' }),
    financas: (r) => ({ titulo: 'Registre seus gastos por 7 dias', texto: r.dinheiro === 'nada' ? 'Sem julgar: só anotar. No fim da semana o gráfico mostra o padrão.' : 'Anote na hora, assim nada se perde. O coach avisa se uma categoria pesar.', href: 'financas.html' }),
    rotina: () => ({ titulo: 'Crie 2 ou 3 hábitos fixos', texto: 'Comece pequeno, como beber água ou ler 10 minutos, e marque todo dia.', href: 'rotina.html' }),
    jornada: (r) => ({ titulo: 'Comece uma jornada curta', texto: r.disc === 'baixa' ? 'Sete dias bastam. Se falhar, você retoma sem perder o histórico.' : 'Defina um desafio de alguns dias e acompanhe a constância.', href: 'jornada.html' }),
  };

  const NIVEIS = [[25, 'Começando'], [50, 'Em formação'], [75, 'Boa base'], [100, 'Firme']];
  /** Estimativa 0-100 de constância a partir das respostas (não é diagnóstico). */
  function constancia(respostas) {
    const r = sanitizarPerfil(respostas);
    const pts = (v, mapa) => (v in mapa ? mapa[v] : 1);
    const soma = pts(r.foco, { dificil: 0, varia: 1, bom: 2 }) + pts(r.disc, { baixa: 0, media: 1, alta: 2 })
      + pts(r.tarefas, { nada: 0, acumula: 1, ok: 2 }) + pts(r.rotina, { sem: 0, meio: 1, firme: 2 });
    const pct = Math.round((soma / 8) * 100);
    return { pct, nivel: NIVEIS.find((n) => pct <= n[0])[1] };
  }

  /** Transforma as respostas em ajustes e em um plano de primeiros passos. */
  function plano(respostas) {
    const r = sanitizarPerfil(respostas);
    const ajustes = [];
    let diaria = { nada: 2, acumula: 3, ok: 5 }[r.tarefas] || 3;
    if (r.disc === 'baixa') diaria = Math.min(diaria, 2);
    if (r.foco === 'dificil') diaria = Math.min(diaria, 3);
    if (r.disc === 'alta' && r.tarefas === 'ok') diaria = 6;
    if (r.ritmo === 'leve') diaria = Math.max(1, diaria - 1); else if (r.ritmo === 'rapido') diaria = Math.min(8, diaria + 1);
    const prefs = {
      meta_diaria: diaria,
      meta_semanal: diaria * 5,
      coach: true,
      coach_tom: r.tom || 'amigo',
      coach_alerta_pct: { nada: 40, as_vezes: 40, controle: 50, nao: 60 }[r.dinheiro] || 40,
      home: { aneis: true, semana: true, barras: true, constancia: true, tabela: true, gastos: r.dinheiro !== 'nao' },
    };
    ajustes.push(`Meta de ${prefs.meta_diaria} ${prefs.meta_diaria === 1 ? 'tarefa' : 'tarefas'} por dia e ${prefs.meta_semanal} por semana`);
    ajustes.push(`Coach com tom ${{ amigo: 'amigável', firme: 'firme', calmo: 'calmo' }[prefs.coach_tom]}`);
    if (r.horas && r.dias) { const tot = r.horas * r.dias; ajustes.push(`Meta de estudo: ${rotuloHoras(r.horas)} por dia, ${r.dias} ${r.dias === 1 ? 'dia' : 'dias'} por semana (${Number.isInteger(tot) ? tot : tot.toFixed(1).replace('.', ',')} h)`); }
    if (r.dinheiro !== 'nao') ajustes.push(`Aviso quando uma categoria passar de ${prefs.coach_alerta_pct}% dos gastos`);
    else ajustes.push('Gastos escondidos da tela inicial');

    const pri = r.prioridade || [];
    const nota = {
      tarefas: PONTOS.tarefas[r.tarefas] || 0,
      estudos: r.estudos ? PONTOS.estudos[r.estudos] : 0,
      financas: r.dinheiro ? PONTOS.financas[r.dinheiro] : 0,
      rotina: r.rotina ? PONTOS.rotina[r.rotina] : 0,
      jornada: r.disc ? PONTOS.jornada[r.disc] : 0,
    };
    if (r.foco === 'dificil') { nota.estudos += r.estudos === 'nao' ? 0 : 1; nota.jornada += 1; }
    for (const p of pri) nota[p] += 2;
    const porMotivo = { vestibular: 'estudos', notas: 'estudos', disciplina: 'jornada', organizar: 'tarefas', dinheiro: 'financas' }[r.motivo];
    if (porMotivo) nota[porMotivo] += 2;
    if (r.motivo === 'organizar') nota.rotina += 1;
    const passos = Object.keys(nota)
      .filter((k) => nota[k] > 0 && !(k === 'estudos' && r.estudos === 'nao') && !(k === 'financas' && r.dinheiro === 'nao'))
      .sort((a, b) => nota[b] - nota[a])
      .slice(0, 3)
      .map((k) => Object.assign({ id: k }, PASSO[k](r)));
    if (!passos.length) passos.push({ id: 'tarefas', titulo: 'Anote uma tarefa para hoje', texto: 'Um começo pequeno já basta.', href: 'tarefas.html' });
    return { perfil: r, prefs, ajustes, passos };
  }

  const lib = { MODULOS, PERGUNTAS, PRIORIDADES, TONS, MOTIVOS, MOTIVACOES, RITMOS, HORAS, rotuloHoras, sanitizarPerfil, constancia, plano };
  root.BrainOnboarding = lib;
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
})(typeof self !== 'undefined' ? self : this);
