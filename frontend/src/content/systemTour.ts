import type { GuideDestination } from './systemGuide';

export type TourStep = {
  id: string;
  page: GuideDestination;
  target: string;
  title: string;
  body: string;
  activate?: string;
};
const target = (id: string) => `[data-tour="${id}"]`;
const steps: TourStep[] = [
  { id: 'navigation', page: 'overview', target: target('navigation'), title: 'Seu caminho pelo Fluxo', body: 'Esta barra reúne as áreas liberadas para sua conta. Durante o tour, Avançar e Voltar navegam pelo sistema sem cadastrar ou aprovar registros.' },
  { id: 'overview', page: 'overview', target: `${target('overview-metrics')} .metric-card`, title: 'Comece pela visão geral', body: 'Aqui ficam os indicadores da operação. Os valores são calculados a partir das demandas e respeitam as permissões do seu perfil.' },
  { id: 'demand-search', page: 'demands', target: target('demand-search'), title: 'Encontre uma demanda', body: 'A busca filtra a lista por título, cliente, código ou situação. É o ponto de partida para localizar o trabalho de um setor.' },
  { id: 'demand-context', page: 'demands', target: `${target('demand-results')} :is(.demand-card,.empty-state)`, title: 'Abra o contexto completo', body: 'Quando houver registros, a seta de cada card abre detalhes, conversa e acesso ao histórico. Se a lista estiver vazia, as novas demandas aparecerão aqui.' },
  { id: 'commercial-create', page: 'commercial', target: target('new-demand'), title: 'O trabalho começa no Comercial', body: 'Nova demanda abre o cadastro de cliente, título, escopo e orçamento. Neste tour, o botão é apenas destacado; nenhum formulário é enviado.' },
  { id: 'commercial-review', page: 'commercial', target: `${target('demand-results')} :is(.demand-card,.empty-state)`, title: 'Analise antes de encaminhar', body: 'Abra uma demanda em orçamento para completar o contexto e registrar o parecer. A aprovação comercial encaminha para a revisão do Financeiro.' },
  { id: 'finance-overview', page: 'finance', target: target('finance-tabs'), activate: target('finance-tab-overview'), title: 'O Financeiro tem quatro áreas', body: 'Visão financeira acompanha movimentos e vencimentos. Revisões recebe demandas do Comercial. As outras abas organizam contas a receber e a pagar.' },
  { id: 'finance-period', page: 'finance', target: target('finance-period'), title: 'Consulte o período realizado', body: 'Estas datas filtram recebimentos e pagamentos pela baixa efetiva. Orçamento e faturamento não entram automaticamente como dinheiro recebido.' },
  { id: 'finance-reviews', page: 'finance', target: target('finance-tab-reviews'), activate: target('finance-tab-reviews'), title: 'Agora estamos em Revisões', body: 'As demandas aprovadas pelo Comercial aparecem nesta aba. Os responsáveis revisam condições, custos e faturamento e registram o parecer para encaminhar ao RH.' },
  { id: 'finance-receivables', page: 'finance', target: target('finance-toolbar'), activate: target('finance-tab-receivables'), title: 'Veja as contas a receber', body: 'A busca e o filtro de situação ajudam a localizar parcelas. Financeiro e Administração podem cadastrar contas e registrar o recebimento integral depois que ele ocorrer.' },
  { id: 'finance-payables', page: 'finance', target: target('finance-tab-payables'), activate: target('finance-tab-payables'), title: 'Acompanhe também as saídas', body: 'Contas a pagar mantém despesas, fornecedores e vencimentos. Registrar uma baixa confirma o pagamento ocorrido; não faz uma transferência bancária.' },
  { id: 'people-team', page: 'people', target: target('people-toolbar'), activate: target('people-tab-team'), title: 'Prepare a equipe antes da demanda', body: 'Equipe organiza colaboradores, funções, competências e disponibilidade. RH e Administração gerenciam os cadastros; Gerência consulta. Colaborador não é uma conta de acesso.' },
  { id: 'people-allocations', page: 'people', target: target('people-tab-allocations'), activate: target('people-tab-allocations'), title: 'Planeje quem vai atuar', body: 'Alocações vincula pessoas a demandas recebidas, com função, período e dedicação. O sistema verifica conflitos antes de salvar.' },
  { id: 'people-demands', page: 'people', target: target('people-tab-demands'), activate: target('people-tab-demands'), title: 'Confira a equipe e encaminhe', body: 'Demandas recebidas reúne o que foi aprovado pelo Financeiro. O RH monta a equipe e registra o parecer para enviar à execução.' },
  { id: 'chat', page: 'chat', target: target('conversation-scopes'), title: 'Escolha quem pode ler a conversa', body: 'Pessoas reúne conversas privadas. Setores mantém os canais compartilhados e restritos. Você também pode vincular uma demanda à mensagem, respeitando as permissões de cada área.' },
];

export function getTourSteps(allowedPages: readonly string[], onlyPage?: GuideDestination): TourStep[] {
  const selected = steps.filter((step) => allowedPages.includes(step.page) && (!onlyPage || step.page === onlyPage));
  const lastPage = onlyPage ?? (allowedPages.includes('overview') ? 'overview' : selected.at(-1)?.page);
  if (!lastPage) return [];
  return [...selected, { id: 'finish', page: lastPage, target: target('guide-trigger'), title: 'O guia continua por aqui', body: 'Como usar permite repetir o tour ou consultar os cards explicativos. Você pode sair a qualquer momento e continuar trabalhando na área atual.' }];
}
