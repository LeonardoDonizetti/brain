/* Coach do Brain: incentiva tarefas/rotina e avisa sobre gastos.
   Funciona por REGRAS escritas aqui, no aparelho, sem internet e sem IA paga: não é um modelo de linguagem,
   é um conjunto de regras que lê seus dados e fala em português. Tom ajustável nas configurações. */
(function (root) {
  'use strict';
  const BRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
  const plural = (n, a, b) => (n === 1 ? a : b);
  const min = (c) => c.toLowerCase();

  const ES = () => (typeof require === 'function' && typeof module === 'object' ? require('./estudos.js') : root.BrainEstudos);

  // Frases por tom. Princípios: foco no próximo passo pequeno, sem culpa, sem "zerar" progresso (Duolingo/Cleo/Habitica/Smashing).
  const TOM = {
    amigo: {
      gasto_peso: (c, p, v) => `${p}% dos seus gastos do mês estão em ${c} (${BRL(v)}). Vale dar uma olhada: dá pra segurar um pouquinho essa semana?`,
      gasto_freq: (c, n, v) => `${n} lançamentos de ${min(c)} nos últimos 7 dias (${BRL(v)}). Sem culpa, só um toque pra você perceber o ritmo.`,
      gasto_alta: (c, p) => `${c} está ${p}% acima do mês passado. Quer rever o que mudou?`,
      lim_estourou: (c, v, l) => `${c} passou do limite: ${BRL(v)} de ${BRL(l)}. Que tal pausar essa categoria até o fim do mês?`,
      lim_perto: (c, p) => `${c} já usou ${p}% do limite. Falta pouco, vale ir com calma.`,
      orc_estourou: (v, l) => `O orçamento do mês passou: ${BRL(v)} de ${BRL(l)}. Amanhã é um bom dia pra recomeçar o controle.`,
      orc_perto: (p) => `Você já usou ${p}% do orçamento do mês.`,
      gasto_bom: () => 'Seus gastos estão sob controle neste mês. Bom trabalho!',
      saldo_neg: (v) => `Neste mês você gastou ${BRL(v)} a mais do que entrou. Dá pra equilibrar.`,
      tar_atrasadas: (n) => `Você tem ${n} ${plural(n, 'tarefa atrasada', 'tarefas atrasadas')}. Escolhe uma só, a mais fácil, e começa por ela.`,
      tar_hoje: (n, t) => `Hoje: ${n} ${plural(n, 'tarefa', 'tarefas')}. Começa por "${t}": só os primeiros 2 minutos.`,
      tar_tudo: () => 'Tudo do dia concluído. Respira e aproveita, você mereceu.',
      tar_nenhuma: () => 'Você ainda não concluiu nenhuma tarefa hoje. Uma pequena já conta e puxa as outras.',
      tar_feitas: (n) => `${n} ${plural(n, 'tarefa concluída', 'tarefas concluídas')} hoje. Continua assim!`,
      tar_vazio: () => 'Sem tarefas pendentes. Que tal planejar o amanhã em 1 minuto?',
      rot_pend: (n) => `Falta${n === 1 ? '' : 'm'} ${n} ${plural(n, 'item', 'itens')} da rotina hoje. Dá tempo.`,
      rot_ok: () => 'Rotina de hoje completa. Constância é o que muda a vida.',
      jor_avaliar: () => 'Antes de dormir, avalie seu dia na Jornada. Leva 20 segundos.',
      jor_dia: (d, n) => `Dia ${d} de ${n} da sua jornada. Um dia de cada vez.`,
    },
    firme: {
      gasto_peso: (c, p, v) => `${p}% do mês em ${c} (${BRL(v)}). Isso é muito. Corte o que não for necessário.`,
      gasto_freq: (c, n, v) => `${n} gastos com ${min(c)} em 7 dias, ${BRL(v)}. Esse ritmo não se sustenta.`,
      gasto_alta: (c, p) => `${c} subiu ${p}% em relação ao mês passado. Descubra por quê e corrija.`,
      lim_estourou: (c, v, l) => `Limite de ${min(c)} estourado: ${BRL(v)} de ${BRL(l)}. Pare de gastar nessa categoria hoje.`,
      lim_perto: (c, p) => `${c} em ${p}% do limite. Não gaste mais sem necessidade.`,
      orc_estourou: (v, l) => `Orçamento estourado: ${BRL(v)} de ${BRL(l)}. Segure tudo que não for essencial.`,
      orc_perto: (p) => `${p}% do orçamento já foi. Disciplina agora.`,
      gasto_bom: () => 'Gastos dentro do plano. Mantenha.',
      saldo_neg: (v) => `Você gastou ${BRL(v)} a mais do que ganhou. Corrija o rumo.`,
      tar_atrasadas: (n) => `${n} ${plural(n, 'tarefa atrasada', 'tarefas atrasadas')}. Resolva a mais antiga agora.`,
      tar_hoje: (n, t) => `${n} ${plural(n, 'tarefa', 'tarefas')} hoje. Comece por "${t}". Sem enrolar.`,
      tar_tudo: () => 'Dia cumprido. Descanse e volte amanhã com o mesmo foco.',
      tar_nenhuma: () => 'Zero tarefas concluídas hoje. Faça uma agora, a menor que tiver.',
      tar_feitas: (n) => `${n} ${plural(n, 'feita', 'feitas')} hoje. Falta o resto.`,
      tar_vazio: () => 'Nada pendente. Defina a prioridade de amanhã.',
      rot_pend: (n) => `${n} ${plural(n, 'item', 'itens')} da rotina sem fazer. Faça agora.`,
      rot_ok: () => 'Rotina completa. É assim que se constrói resultado.',
      jor_avaliar: () => 'Avalie seu dia na Jornada antes de dormir.',
      jor_dia: (d, n) => `Dia ${d}/${n}. Não negocie com você mesmo.`,
    },
    calmo: {
      gasto_peso: (c, p, v) => `Notei que ${p}% do mês foi em ${c} (${BRL(v)}). Só para você ter em mente, sem pressão.`,
      gasto_freq: (c, n, v) => `Foram ${n} lançamentos de ${min(c)} nesta semana (${BRL(v)}). Observar já ajuda.`,
      gasto_alta: (c, p) => `${c} está um pouco mais alto que no mês passado (+${p}%). Talvez valha uma olhada com calma.`,
      lim_estourou: (c, v, l) => `${c} passou do limite combinado: ${BRL(v)} de ${BRL(l)}. Tudo bem, dá para ajustar daqui para frente.`,
      lim_perto: (c, p) => `${c} chegou a ${p}% do limite. Vale ir devagar.`,
      orc_estourou: (v, l) => `O orçamento do mês foi ultrapassado (${BRL(v)} de ${BRL(l)}). No próximo mês você ajusta com mais tranquilidade.`,
      orc_perto: (p) => `Você usou ${p}% do orçamento do mês.`,
      gasto_bom: () => 'Seus gastos estão tranquilos este mês.',
      saldo_neg: (v) => `Saiu ${BRL(v)} a mais do que entrou neste mês. Sem pânico, dá para reequilibrar.`,
      tar_atrasadas: (n) => `Há ${n} ${plural(n, 'tarefa pendente de dias anteriores', 'tarefas pendentes de dias anteriores')}. Escolha uma e faça no seu ritmo.`,
      tar_hoje: (n, t) => `Você tem ${n} ${plural(n, 'tarefa', 'tarefas')} hoje. Uma sugestão: "${t}", só por alguns minutos.`,
      tar_tudo: () => 'Tudo concluído por hoje. Que bom! Descanse.',
      tar_nenhuma: () => 'Ainda nada concluído hoje, e tudo bem. Quando se sentir pronto, comece por algo pequeno.',
      tar_feitas: (n) => `${n} ${plural(n, 'tarefa concluída', 'tarefas concluídas')} hoje. Bom ritmo.`,
      tar_vazio: () => 'Nenhuma tarefa pendente. Aproveite a calma.',
      rot_pend: (n) => `Ainda ${n === 1 ? 'resta' : 'restam'} ${n} ${plural(n, 'item', 'itens')} da rotina. Quando puder.`,
      rot_ok: () => 'Rotina de hoje concluída. Muito bem.',
      jor_avaliar: () => 'Se puder, reserve um instante para avaliar o dia na Jornada.',
      jor_dia: (d, n) => `Dia ${d} de ${n}. Passo a passo.`,
    },
  };

  /** ctx: { agora:Date, tarefas:[], rotina:{itens,progresso}, jornada:{jornada,avaliacao_hoje}, fin:{atual,anterior}, tom, limitePeso } */
  function analisar(ctx) {
    const tom = TOM[ctx.tom] || TOM.amigo;
    const hoje = ctx.hoje;
    const hora = ctx.agora.getHours();
    const saida = [];
    const add = (area, nivel, texto, prio) => saida.push({ area, nivel, texto, prio });
    const limitePeso = ctx.limitePeso || 40;

    // ---- gastos ----
    const f = ctx.fin && ctx.fin.atual;
    if (f && f.total > 0) {
      const cats = f.por_categoria || [];
      const orc = f.orcamento || { total: 0, categorias: {} };
      const lims = orc.categorias || {};
      for (const c of cats) {
        const lim = lims[c.categoria];
        if (lim > 0) {
          if (c.valor >= lim) add('gasto', 'alerta', tom.lim_estourou(c.categoria, c.valor, lim), 100);
          else if (c.valor >= lim * 0.8) add('gasto', 'aviso', tom.lim_perto(c.categoria, pct(c.valor, lim)), 80);
        }
      }
      if (orc.total > 0) {
        if (f.total >= orc.total) add('gasto', 'alerta', tom.orc_estourou(f.total, orc.total), 99);
        else if (f.total >= orc.total * 0.8) add('gasto', 'aviso', tom.orc_perto(pct(f.total, orc.total)), 79);
      }
      const top = cats[0];
      if (top && f.total >= 100 && top.quantidade >= 3 && pct(top.valor, f.total) >= limitePeso && !(lims[top.categoria] > 0 && top.valor >= lims[top.categoria])) {
        add('gasto', 'alerta', tom.gasto_peso(top.categoria, pct(top.valor, f.total), top.valor), 90);
      }
      // frequência nos últimos 7 dias, por categoria
      const corte = new Date(ctx.agora.getFullYear(), ctx.agora.getMonth(), ctx.agora.getDate() - 6);
      const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const desde = iso(corte);
      const sem = new Map();
      const todos = [].concat((f.gastos || []), ctx.fin.anterior ? (ctx.fin.anterior.gastos || []) : []);
      for (const g of todos) {
        if (g.tipo === 'receita' || g.data < desde || g.data > hoje) continue;
        const i = sem.get(g.categoria) || { n: 0, v: 0 };
        i.n++; i.v += g.valor; sem.set(g.categoria, i);
      }
      let melhor = null;
      for (const [cat, i] of sem) if (i.n >= 4 && i.v >= 80 && (!melhor || i.v > melhor.i.v)) melhor = { cat, i };
      if (melhor && !(top && melhor.cat === top.categoria && pct(top.valor, f.total) >= limitePeso)) add('gasto', 'aviso', tom.gasto_freq(melhor.cat, melhor.i.n, melhor.i.v), 70);
      // alta vs. mês passado (só compara se já passou da metade do mês anterior em dias equivalentes)
      const ant = ctx.fin.anterior;
      if (ant && ant.por_categoria) {
        const dia = Number(hoje.slice(8, 10));
        const ateDia = (arr, cat) => arr.filter((g) => g.tipo !== 'receita' && g.categoria === cat && Number(g.data.slice(8, 10)) <= dia).reduce((s, g) => s + g.valor, 0);
        for (const c of cats.slice(0, 3)) {
          const antes = ateDia(ant.gastos || [], c.categoria);
          if (antes >= 50 && c.valor > antes * 1.3 && c.valor - antes >= 50) { add('gasto', 'aviso', tom.gasto_alta(c.categoria, Math.round((c.valor / antes - 1) * 100)), 60); break; }
        }
      }
      if (f.entradas > 0 && f.total > f.entradas * 1.0 && f.total - f.entradas >= 50) add('gasto', 'aviso', tom.saldo_neg(f.total - f.entradas), 65);
      if (!saida.some((s) => s.area === 'gasto')) add('gasto', 'bom', tom.gasto_bom(), 10);
    }

    // ---- tarefas ----
    const tars = ctx.tarefas || [];
    const pend = tars.filter((t) => !t.feita);
    const atrasadas = pend.filter((t) => t.data && t.data < hoje);
    const dehoje = pend.filter((t) => t.data === hoje).sort((a, b) => (a.hora || '99').localeCompare(b.hora || '99'));
    const feitasHoje = tars.filter((t) => t.feita && t.concluida_em === hoje).length;
    const alvo = dehoje[0] || atrasadas[atrasadas.length - 1] || pend.find((t) => !t.data);
    if (atrasadas.length) add('tarefa', 'aviso', tom.tar_atrasadas(atrasadas.length), 75);
    if (dehoje.length) add('tarefa', 'info', tom.tar_hoje(dehoje.length, dehoje[0].titulo), 55);
    else if (!atrasadas.length && feitasHoje > 0) add('tarefa', 'bom', tom.tar_tudo(), 30);
    if (feitasHoje === 0 && hora >= 15 && alvo) add('tarefa', 'aviso', tom.tar_nenhuma(), 72);
    else if (feitasHoje > 0 && (dehoje.length || atrasadas.length)) add('tarefa', 'bom', tom.tar_feitas(feitasHoje), 25);
    if (!pend.length && feitasHoje === 0) add('tarefa', 'info', tom.tar_vazio(), 5);

    // ---- rotina e jornada ----
    const r = ctx.rotina && ctx.rotina.progresso;
    if (r && r.total > 0) {
      if (r.feitos === r.total) add('rotina', 'bom', tom.rot_ok(), 20);
      else if (hora >= 17) add('rotina', 'aviso', tom.rot_pend(r.total - r.feitos), 50);
    }
    const j = ctx.jornada;
    if (j && j.jornada && j.jornada.dia_atual && j.jornada.dia_atual <= j.jornada.duracao) {
      if (!j.avaliacao_hoje && hora >= 20) add('jornada', 'info', tom.jor_avaliar(), 45);
      else add('jornada', 'info', tom.jor_dia(j.jornada.dia_atual, j.jornada.duracao), 8);
    }
    if (ctx.estudos && ES()) { try { ES().mensagens({ e: ctx.estudos, hoje, agora: ctx.agora }).forEach((m) => saida.push(m)); } catch (e) { /* estudos indisponíveis: segue sem */ } }
    saida.sort((a, b) => b.prio - a.prio);
    return { mensagens: saida, alvo: alvo ? alvo.titulo : null, atrasadas: atrasadas.length, dehoje: dehoje.length };
  }

  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  // Termos casam com o INÍCIO de uma palavra (ex.: "obrigad" pega obrigado/obrigada) no texto sem acentos.
  const tem = (q, ...termos) => termos.some((t) => new RegExp('(^|[^a-z0-9])' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(q));
  const SUGESTOES = ['Como estou hoje?', 'O que faço agora?', 'Como estão meus gastos?', 'Estou sem vontade'];
  const resumoTxt = (a, n) => a.mensagens.filter((m) => m.nivel !== 'bom').slice(0, n).map((m) => m.texto).join(' ');
  const pelaArea = (a, area) => a.mensagens.filter((m) => m.area === area).slice(0, 3).map((m) => m.texto).join(' ');
  const pick = (l, seed) => l[Math.abs(seed) % l.length];

  /** Entende a mensagem e devolve { texto, sugestoes, intencao }. Nunca lança erro e nunca devolve vazio. */
  function conversar(pergunta, ctx, estado) {
    estado = estado || {};
    let q = norm(pergunta).replace(/\s+/g, ' ').trim();
    const seed = q.length + (ctx && ctx.agora ? ctx.agora.getMinutes() : 0);
    let a;
    try { a = analisar(ctx || { agora: new Date(), hoje: '', tarefas: [], fin: {} }); } catch (e) { a = { mensagens: [], alvo: null }; }
    const R = (texto, intencao, sugestoes) => ({ texto, intencao, sugestoes: sugestoes || [] });
    const hora = ctx && ctx.agora ? ctx.agora.getHours() : 12;

    if (!q || !/[a-z0-9]/.test(q.replace(/[^a-z0-9]/g, '') || '')) {
      if (/[\u{1F300}-\u{1FAFF}❤\u{1F44D}]/u.test(String(pergunta))) return R('😊 Se quiser, me pergunte sobre suas tarefas, gastos, rotina ou jornada.', 'emoji', SUGESTOES);
      return R('Escreva sua pergunta ou toque em uma das sugestões abaixo.', 'vazio', SUGESTOES);
    }
    // 1) segurança vem antes de tudo
    if (tem(q, 'suicid', 'me matar', 'quero morrer', 'nao quero mais viver', 'me machucar', 'automutil')) {
      return R('Sinto muito que você esteja se sentindo assim. Você não precisa passar por isso sozinho. No Brasil, o CVV atende 24 horas pelo telefone 188 (ligação gratuita) ou em cvv.org.br. Se estiver em perigo agora, ligue 192 (SAMU). Se puder, fale também com alguém de confiança perto de você.', 'crise', []);
    }
    // 2) assuntos do Brasil: motivação / sentimentos
    if (tem(q, 'sem vontade', 'preguica', 'desanim', 'procrastin', 'motiva', 'nao consigo', 'travad', 'sem energia', 'nao estou afim', 'nao to afim', 'me ajuda', 'me ajude')) {
      const t = a.alvo ? `"${a.alvo}"` : 'a menor tarefa que você tiver';
      return R(`Quando falta vontade, ajuda diminuir o passo: abra ${t} e trabalhe só 2 minutos, sem prometer terminar. Começar costuma ser a parte mais difícil. Se depois de 2 minutos quiser parar, tudo bem, já valeu.`, 'motivacao', ['O que faço agora?', 'Como estou hoje?']);
    }
    if (tem(q, 'triste', 'ansios', 'estressad', 'cansad', 'sobrecarreg', 'esgotad', 'deprimid', 'mal hoje', 'dia ruim', 'desesper')) {
      return R('Sinto muito que o dia esteja pesado. Hoje não precisa ser perfeito: escolha uma coisa pequena, respire e faça só ela. Se esse peso estiver durando, vale conversar com alguém de confiança ou um profissional. Sou só um assistente de regras e não substituo isso.', 'sentimento', ['O que faço agora?', 'Estou sem vontade']);
    }
    // 3) domínios do app
    if (ctx && ctx.estudos && ES()) {
      let re = null; try { re = ES().responder(q, { e: ctx.estudos, hoje: ctx.hoje, agora: ctx.agora }); } catch (e) { re = null; }
      if (re) return R(re, 'estudos', ['Como estou hoje?', 'O que faço agora?']);
    }
    if (tem(q, 'gast', 'dinheiro', 'financ', 'alimenta', 'comida', 'ifood', 'mercado', 'limite', 'orcamento', 'economi', 'saldo', 'salario', 'contas', 'quanto gastei', 'categoria')) {
      const f = ctx && ctx.fin && ctx.fin.atual;
      if (!f || !f.total) return R('Ainda não tenho gastos deste mês para analisar. Registre alguns em Finanças e eu comento.', 'gastos', ['Como estou hoje?']);
      const top = (f.por_categoria || []).slice(0, 3).map((c) => `${c.categoria} ${BRL(c.valor)}`).join(', ');
      return R(`${pelaArea(a, 'gasto')} No mês você gastou ${BRL(f.total)}${f.entradas ? ` e recebeu ${BRL(f.entradas)}` : ''}. Maiores categorias: ${top}.`.trim(), 'gastos', ['O que faço agora?']);
    }
    if (tem(q, 'tarefa', 'afazer', 'pendente', 'atrasad', 'prioridade', 'o que faco', 'o que fazer', 'por onde comec', 'agora', 'proxim')) {
      const l = pelaArea(a, 'tarefa');
      return R((l || 'Nenhuma tarefa pendente agora.') + (a.alvo ? ` Sugestão de começo: "${a.alvo}".` : ''), 'tarefas', ['Estou sem vontade', 'Como estão meus gastos?']);
    }
    if (tem(q, 'rotina', 'habito', 'ritual')) return R(pelaArea(a, 'rotina') || 'Sua rotina está em dia por enquanto.', 'rotina', ['O que faço agora?']);
    if (tem(q, 'jornada', 'caverna', 'desafio')) return R(pelaArea(a, 'jornada') || 'Você não tem uma jornada em andamento. Dá para começar uma na aba Jornada.', 'jornada', ['Como estou hoje?']);
    if (tem(q, 'resumo', 'como estou', 'como vou', 'como to', 'status', 'situacao', 'panorama', 'balanco')) {
      return R(resumoTxt(a, 3) || 'Está tudo em ordem por aqui. Nada atrasado e nenhum alerta de gastos.', 'resumo', ['O que faço agora?']);
    }
    // 4) conversa social
    if (tem(q, 'obrigad', 'valeu', 'vlw', 'thanks', 'brigad', 'agradec')) return R(pick(['Por nada! Conte comigo.', 'Disponha! Qualquer coisa é só chamar.', 'Tamo junto! 😊'], seed), 'agradecimento', SUGESTOES.slice(0, 2));
    if (tem(q, 'tchau', 'ate mais', 'ate logo', 'flw', 'falou', 'ate amanha', 'fui ', 'bye')) return R('Até mais! Bom descanso e boa sorte com o que falta. 👋', 'despedida', []);
    if (tem(q, 'quem e voce', 'quem voce e', 'quem e vc', 'voce e uma ia', 'voce e um robo', 'voce e humano', 'seu nome', 'como se chama', 'chatgpt', 'gpt', 'o que voce faz', 'o que voce sabe', 'o que vc faz', 'o que voce pode', 'ajuda', 'help', 'comandos', 'como funciona', 'para que serve')) {
      return R('Sou o coach do seu Brain. Funciono por regras que leem seus dados aqui no aparelho, sem internet e sem IA paga, então não sou um modelo de linguagem. Posso: resumir seu dia, sugerir por qual tarefa começar, avisar sobre gastos e limites, falar da rotina e da jornada, e dar um empurrão quando faltar vontade.', 'identidade', SUGESTOES);
    }
    if (tem(q, 'tudo bem', 'tudo bom', 'como vai', 'como voce esta', 'como esta voce', 'como vc ta', 'de boa', 'e voce', 'e vc')) {
      return R('Por aqui tudo certo, obrigado por perguntar! E você, como está? Se quiser, vejo como está o seu dia.', 'bemestar', ['Como estou hoje?', 'O que faço agora?']);
    }
    if (tem(q, 'ola', 'oi', 'oie', 'oii', 'eai', 'e ai', 'opa', 'hey', 'hello', 'salve', 'fala ', 'bom dia', 'boa tarde', 'boa noite', 'iai', 'eae')) {
      const saud = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
      const r = resumoTxt(a, 2);
      return R(`${saud}! ${r ? r : 'Tudo em ordem por aqui.'} Quer ajuda com algo?`, 'saudacao', ['O que faço agora?', 'Como estão meus gastos?']);
    }
    if (tem(q, 'kkk', 'haha', 'rsrs', 'rs ', 'lol', 'kk')) return R('😄 Bom ver você de bom humor! Quer que eu mostre o que falta fazer hoje?', 'risada', ['O que faço agora?']);
    if (tem(q, 'burro', 'inutil', 'lixo', 'ruim', 'idiota', 'odeio', 'nao serve', 'nao entende')) return R('Desculpe, ainda tenho limites: entendo bem tarefas, gastos, rotina e jornada. Me diga o que precisa dentro desses temas e eu tento de novo.', 'critica', SUGESTOES);
    if (/^(sim|s|nao|n|ok|beleza|blz|certo|tá|ta|talvez|entendi|show|massa|legal|boa|top|uhum|aham)\b/.test(q)) return R('Certo! Quer que eu mostre o que falta fazer ou como estão seus gastos?', 'confirmacao', ['O que faço agora?', 'Como estão meus gastos?']);
    // 5) fora do escopo: reconhece, explica o limite e oferece caminhos (nunca beco sem saída)
    const f2 = (estado.falhas || 0) + 1; estado.falhas = f2;
    if (tem(q, 'clima', 'tempo faz', 'previsao', 'piada', 'receita', 'noticia', 'futebol', 'jogo', 'musica', 'filme', 'quanto e ', 'quanto da ', 'calcul', 'traduz', 'o que e ', 'quem foi', 'capital', 'presidente', 'dolar', 'bitcoin', 'cotacao')) {
      return R('Essa eu não sei responder: só conheço o que está no seu Brain (tarefas, gastos, rotina e jornada) e não tenho acesso à internet. Posso ajudar com algum desses?', 'fora_escopo', SUGESTOES);
    }
    if (f2 >= 2) return R('Ainda não entendi. Posso ajudar com: tarefas e prioridades, gastos e limites, rotina, jornada, ou motivação. Toque em uma das opções ou escreva algo como "como estão meus gastos?".', 'fallback2', SUGESTOES);
    return R('Não tenho certeza se entendi. Posso falar sobre suas tarefas, seus gastos do mês, a rotina e a jornada, ou ajudar quando estiver sem vontade. Quer tentar um destes?', 'fallback', SUGESTOES);
  }

  /** Compatível: devolve só o texto. */
  function responder(pergunta, ctx, estado) {
    try { return conversar(pergunta, ctx, estado).texto; } catch (e) { return 'Tive um problema para ler seus dados agora, mas continuo aqui. Tente de novo em instantes.'; }
  }

  const api = { analisar, responder, conversar, TOM };
  if (typeof module === 'object' && module.exports) { module.exports = api; return; }
  root.BrainCoach = api;

  // ================= interface (navegador) =================
  if (typeof document === 'undefined') return;
  const P = () => root.BrainPrefs;
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const get = (u) => fetch(u).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))));

  async function coletar() {
    const agora = new Date();
    const mes = iso(agora).slice(0, 7);
    const ant = iso(new Date(agora.getFullYear(), agora.getMonth() - 1, 1)).slice(0, 7);
    const [t, r, j, fa, fb, es] = await Promise.all([
      get('/api/tarefas').catch(() => ({ tarefas: [] })),
      get('/api/rotina').catch(() => null),
      get('/api/jornada?dias=7').catch(() => null),
      get(`/api/financas/gastos?mes=${mes}`).catch(() => null),
      get(`/api/financas/gastos?mes=${ant}`).catch(() => null),
      get('/api/estudos').catch(() => null),
    ]);
    const p = P() ? P().get() : { coach_tom: 'amigo', coach_alerta_pct: 40 };
    return { agora, hoje: iso(agora), tarefas: t.tarefas, rotina: r, jornada: j, fin: { atual: fa, anterior: fb }, estudos: es && es.estudos, tom: p.coach_tom, limitePeso: p.coach_alerta_pct };
  }

  function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  const css = document.createElement('style');
  css.textContent = `
  .coach { display: grid; gap: .6rem; }
  .coach-msg { display: flex; gap: .6rem; align-items: flex-start; font-size: .92rem; line-height: 1.4; }
  .coach-msg i { flex: none; width: .55rem; height: .55rem; border-radius: 50%; margin-top: .42rem; background: var(--accent); }
  .coach-msg.n-alerta i { background: var(--danger); } .coach-msg.n-aviso i { background: #d99a1f; } .coach-msg.n-bom i { background: #2fa36b; }
  .coach-rod { display: flex; justify-content: space-between; align-items: center; gap: .6rem; margin-top: .2rem; }
  .coach-rod small { color: var(--muted); font-size: .75rem; }
  .coach-btn { font: inherit; font-weight: 600; font-size: .85rem; border: 1px solid var(--line); background: var(--accent-soft); color: var(--accent); border-radius: 999px; padding: .45rem .9rem; cursor: pointer; }
  dialog.coach-dlg { padding: 1rem; }
  .coach-log { display: grid; gap: .5rem; max-height: 50vh; overflow-y: auto; margin: .6rem 0; padding-right: .2rem; }
  .coach-b { padding: .55rem .8rem; border-radius: 1rem; font-size: .9rem; line-height: 1.4; max-width: 88%; }
  .coach-b.c { background: var(--accent-soft); color: var(--ink); justify-self: start; border-bottom-left-radius: .3rem; }
  .coach-b.u { background: var(--accent); color: var(--on-accent); justify-self: end; border-bottom-right-radius: .3rem; }
  .coach-rap { display: flex; flex-wrap: wrap; gap: .4rem; margin-bottom: .6rem; }
  .coach-rap button { font: inherit; font-size: .78rem; border: 1px solid var(--line); background: var(--surface); color: var(--ink); border-radius: 999px; padding: .35rem .7rem; cursor: pointer; }
  .coach-in { display: flex; gap: .5rem; } .coach-in input { flex: 1; }
  .coach-in button { font: inherit; font-weight: 650; border: 0; background: var(--accent); color: var(--on-accent); border-radius: .7rem; padding: 0 1rem; cursor: pointer; }`;
  document.head.append(css);

  let dlg = null;
  function abrirChat() {
    if (!dlg) {
      dlg = el('dialog', 'coach-dlg');
      dlg.innerHTML = `<h3>Coach</h3><p class="dica">Assistente de regras, roda só no seu aparelho. Pergunte sobre tarefas, gastos, rotina ou jornada.</p>
        <div class="coach-log" aria-live="polite"></div>
        <div class="coach-rap"></div>
        <form class="coach-in"><input type="text" maxlength="200" placeholder="Escreva sua pergunta" aria-label="Pergunta ao coach"><button type="submit">Enviar</button></form>
        <div class="acoes" style="margin-top:.7rem"><button type="button" class="fechar">Fechar</button></div>`;
      document.body.append(dlg);
      const log = dlg.querySelector('.coach-log');
      const bolha = (t, c) => { log.append(el('div', 'coach-b ' + c, t)); log.scrollTop = log.scrollHeight; };
      const estado = { falhas: 0 };
      const rap = () => dlg.querySelector('.coach-rap');
      const sugerir = (l) => { rap().replaceChildren(); l.forEach((t) => { const b = el('button', null, t); b.type = 'button'; b.onclick = () => perguntar(t); rap().append(b); }); };
      const perguntar = async (t) => {
        if (!t.trim()) { bolha('Escreva sua pergunta ou toque em uma sugestão.', 'c'); return; }
        bolha(t, 'u');
        let r;
        try { r = conversar(t, await coletar(), estado); } catch (e) { r = { texto: 'Não consegui ler seus dados agora, mas continuo aqui. Tente de novo em instantes.', sugestoes: SUGESTOES, intencao: 'erro' }; }
        if (!['fallback', 'fallback2', 'fora_escopo'].includes(r.intencao)) estado.falhas = 0;
        bolha(r.texto, 'c');
        sugerir(r.sugestoes && r.sugestoes.length ? r.sugestoes : SUGESTOES);
      };
      sugerir(SUGESTOES);
      const inp = dlg.querySelector('input');
      dlg.querySelector('form').onsubmit = (e) => { e.preventDefault(); const v = inp.value; inp.value = ''; perguntar(v); };
      dlg.querySelector('.fechar').onclick = () => dlg.close();
      dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
      coletar().then((c) => bolha(analisar(c).mensagens.filter((m) => m.nivel !== 'bom').slice(0, 2).map((m) => m.texto).join(' ') || 'Oi! Tudo em ordem por aqui. Em que posso ajudar?', 'c')).catch(() => {});
    }
    dlg.showModal();
  }

  /** Desenha as mensagens do coach dentro de `alvo`. foco: 'tudo' | 'gasto' */
  async function montar(alvo, foco, max) {
    if (!alvo) return;
    const p = P() ? P().get() : { coach: true };
    if (p.coach === false) { alvo.hidden = true; return; }
    let c;
    try { c = await coletar(); } catch (e) { alvo.hidden = true; return; }
    let msgs = analisar(c).mensagens;
    if (foco === 'gasto' || foco === 'estudo') msgs = msgs.filter((m) => m.area === foco);
    else msgs = msgs.filter((m, i) => m.nivel !== 'bom' || i < 2);
    msgs = msgs.slice(0, max || 3);
    if (!msgs.length) { alvo.hidden = true; return; }
    alvo.hidden = false;
    alvo.replaceChildren();
    const caixa = el('div', 'coach');
    msgs.forEach((m) => { const d = el('div', 'coach-msg n-' + m.nivel); d.append(el('i'), el('span', null, m.texto)); caixa.append(d); });
    const rod = el('div', 'coach-rod');
    rod.append(el('small', null, 'Coach · regras no seu aparelho'));
    const b = el('button', 'coach-btn', 'Conversar'); b.type = 'button'; b.onclick = abrirChat;
    rod.append(b); caixa.append(rod);
    alvo.append(caixa);
  }
  api.montar = montar; api.abrirChat = abrirChat;
})(typeof window !== 'undefined' ? window : globalThis);
