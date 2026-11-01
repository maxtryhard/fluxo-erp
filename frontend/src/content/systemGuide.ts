import { Activity, BriefcaseBusiness, CircleDollarSign, ClipboardList, MessageSquare, Users } from 'lucide-react';

export type GuideDestination = 'overview' | 'commercial' | 'finance' | 'people' | 'demands' | 'chat';
export type GuideId = 'workflow' | Exclude<GuideDestination, 'overview'>;
export type GuideTopic = {
  id: GuideId;
  title: string;
  kicker: string;
  summary: string;
  icon: typeof Activity;
  destination: GuideDestination;
  action: string;
  steps: { title: string; body: string }[];
  note: string;
};

// Educational content only: no account data, fake records or permission decisions.
export const systemGuide: GuideTopic[] = [
  {
    id: 'workflow', title: 'Uma demanda. Um fluxo.', kicker: 'TUDO CONECTADO', icon: Activity,
    summary: 'Do orçamento à execução, cada área trabalha sobre a mesma demanda.',
    destination: 'overview', action: 'Ir para visão geral',
    steps: [
      { title: 'Comercial prepara', body: 'Registra o cliente, o escopo e o orçamento. O parecer acompanha o encaminhamento para o Financeiro.' },
      { title: 'Financeiro analisa', body: 'Revisa as condições, o custo estimado e o valor faturado. Após a aprovação, encaminha a demanda ao RH.' },
      { title: 'RH organiza', body: 'Consulta a disponibilidade, aloca colaboradores e registra o parecer para enviar à execução.' },
      { title: 'Todos acompanham', body: 'A demanda mantém seu código, histórico e conversas. Cada perfil vê somente as informações permitidas para sua área.' },
    ],
    note: 'Orçamento, faturamento e recebimento são etapas diferentes. Uma aprovação não confirma que o cliente já pagou.',
  },
  {
    id: 'commercial', title: 'Comercial', kicker: 'DA IDEIA À PROPOSTA', icon: BriefcaseBusiness,
    summary: 'Transforme uma solicitação em uma demanda com contexto e orçamento.',
    destination: 'commercial', action: 'Abrir Comercial',
    steps: [
      { title: 'Crie a demanda', body: 'Informe cliente, título, descrição do escopo e valor do orçamento.' },
      { title: 'Complete o contexto', body: 'Use os detalhes e a conversa da demanda para registrar dúvidas, análises e orientações.' },
      { title: 'Encaminhe com parecer', body: 'Ao aprovar a proposta, explique o que foi analisado e envie para revisão financeira.' },
    ],
    note: 'Cadastros e aprovações comerciais são realizados por Comercial e Administração. A revisão do Financeiro continua sendo uma etapa própria.',
  },
  {
    id: 'finance', title: 'Financeiro', kicker: 'PREVISÃO E REALIZAÇÃO', icon: CircleDollarSign,
    summary: 'Revise demandas e acompanhe compromissos, pagamentos e recebimentos.',
    destination: 'finance', action: 'Abrir Financeiro',
    steps: [
      { title: 'Revise as demandas', body: 'Em Revisões, confira orçamento, condição de pagamento, custo estimado e faturamento. Registre o parecer antes de enviar ao RH.' },
      { title: 'Cadastre as contas', body: 'Contas a receber e a pagar registram compromissos, vencimentos e parcelas. O vínculo com uma demanda é opcional.' },
      { title: 'Registre a baixa', body: 'Confirme a data efetiva somente depois de receber ou pagar a parcela integral. Esse registro não faz uma transferência bancária.' },
      { title: 'Consulte o painel', body: 'Recebido, pago e resultado usam as baixas do período. Valores em aberto, atrasos e próximos vencimentos ajudam no acompanhamento.' },
    ],
    note: 'Financeiro e Administração alteram os registros; Gerência consulta. Informações financeiras restritas não ficam visíveis ao Comercial ou RH.',
  },
  {
    id: 'people', title: 'Pessoas & RH', kicker: 'A EQUIPE CERTA', icon: Users,
    summary: 'Organize colaboradores, disponibilidade e alocações para cada demanda.',
    destination: 'people', action: 'Abrir Pessoas & RH',
    steps: [
      { title: 'Prepare a equipe', body: 'Cadastre nome, função, competências e disponibilidade na aba Equipe, mesmo antes de uma demanda chegar.' },
      { title: 'Planeje as alocações', body: 'Escolha o colaborador, a demanda recebida, o período e o percentual de dedicação. O sistema verifica conflitos de disponibilidade.' },
      { title: 'Confirme o encaminhamento', body: 'Em Demandas recebidas, confira a equipe planejada e registre o parecer para enviar à execução.' },
      { title: 'Acompanhe os períodos', body: 'Consulte alocações em curso, futuras e encerradas. Cancelamentos de alocações abertas exigem um motivo.' },
    ],
    note: 'Cadastrar um colaborador não cria uma conta de acesso. RH e Administração gerenciam a equipe; Gerência consulta.',
  },
  {
    id: 'demands', title: 'Demandas', kicker: 'CONTEXTO QUE PERMANECE', icon: ClipboardList,
    summary: 'Encontre o escopo, a situação e o histórico de cada solicitação.',
    destination: 'demands', action: 'Abrir demandas',
    steps: [
      { title: 'Encontre a solicitação', body: 'Busque por código, título ou cliente na lista de demandas.' },
      { title: 'Abra os detalhes', body: 'Confira o resumo, a situação e os dados que seu perfil tem permissão para consultar.' },
      { title: 'Consulte o histórico', body: 'Veja os acontecimentos registrados por área, mantendo o contexto do trabalho desde a proposta.' },
      { title: 'Converse sobre a demanda', body: 'Registre mensagens, análises e pendências vinculadas à própria solicitação.' },
    ],
    note: 'O histórico e os campos respeitam as permissões de cada setor. As ações de revisão ficam nas áreas responsáveis.',
  },
  {
    id: 'chat', title: 'Conversas', kicker: 'SETORES QUE SE ENTENDEM', icon: MessageSquare,
    summary: 'Compartilhe orientações e registre o que falta para o trabalho avançar.',
    destination: 'chat', action: 'Abrir conversas',
    steps: [
      { title: 'Escolha o contexto', body: 'Use Conversas para assuntos gerais entre setores; nos detalhes de uma demanda, registre o que pertence àquela solicitação.' },
      { title: 'Confira a visibilidade', body: 'O canal Entre setores é compartilhado. Financeiro e RH têm canais restritos conforme as permissões.' },
      { title: 'Registre com clareza', body: 'Escolha Mensagem, Análise ou Pendência / dúvida. Explique o contexto e o próximo passo esperado.' },
    ],
    note: 'As conversas atualizam a cada 15 segundos, com opção de atualização manual. Pendência / dúvida é um tipo de registro, não uma tarefa com conclusão automática.',
  },
];
