import { Demand, DemandHistory, DemandStatus } from '../models/types.js';

// Repositório central unificado de demandas (ERP)
const demands: Demand[] = [
  {
    id: 'dem-001',
    code: 'ORD-2026-001',
    clientName: 'Tecnologia Alpha Ltda',
    title: 'Desenvolvimento de Módulo Customizado',
    description: 'Implementação de esteira automatizada e integração fiscal.',
    status: 'ALOCACAO_RH',
    budgetTotal: 45000,
    commercialResponsibleId: 'usr-2',
    paymentTerms: '3x 15.000 (30/60/90)',
    invoicedValue: 45000,
    costEstimate: 22000,
    financialApproved: true,
    requiredRoles: ['Dev Fullstack', 'Tech Lead', 'Designer UI/UX'],
    assignedStaffCount: 2,
    rhApproved: false,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'dem-002',
    code: 'ORD-2026-002',
    clientName: 'Varejo Beta S/A',
    title: 'Consultoria de Migração Cloud',
    description: 'Levantamento de infraestrutura legado e planejamento de custos.',
    status: 'APROVADO_COMERCIAL',
    budgetTotal: 18500,
    commercialResponsibleId: 'usr-2',
    financialApproved: false,
    rhApproved: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const histories: DemandHistory[] = [
  {
    id: 'hist-001',
    demandId: 'dem-001',
    timestamp: new Date(Date.now() - 5 * 86400000).toISOString(),
    authorId: 'usr-2',
    authorName: 'Gestor Comercial',
    department: 'Comercial',
    action: 'Criação da Proposta',
    details: 'Orçamento inicial gerado no valor de R$ 45.000,00',
  },
  {
    id: 'hist-002',
    demandId: 'dem-001',
    timestamp: new Date(Date.now() - 3 * 86400000).toISOString(),
    authorId: 'usr-3',
    authorName: 'Analista Financeiro',
    department: 'Financeiro',
    action: 'Aprovação Financeira',
    details: 'Condições de pagamento validadas e margem aprovada.',
  },
  {
    id: 'hist-003',
    demandId: 'dem-002',
    timestamp: new Date().toISOString(),
    authorId: 'usr-2',
    authorName: 'Gestor Comercial',
    department: 'Comercial',
    action: 'Proposta aprovada pelo Comercial',
    details: 'Proposta encaminhada para análise Financeira.',
  },
];

export const getAllDemands = (): Demand[] => {
  return [...demands];
};

export const getDemandById = (id: string): Demand | undefined => {
  return demands.find((d) => d.id === id);
};

export const getHistoriesByDemandId = (demandId: string): DemandHistory[] => {
  return histories.filter((h) => h.demandId === demandId);
};

export const createDemand = (
  data: {
    clientName: string;
    title: string;
    description: string;
    budgetTotal: number;
    commercialResponsibleId: string;
    authorName: string;
  }
): Demand => {
  const count = demands.length + 1;
  const newDemand: Demand = {
    id: `dem-${String(count).padStart(3, '0')}`,
    code: `ORD-2026-${String(count).padStart(3, '0')}`,
    clientName: data.clientName,
    title: data.title,
    description: data.description,
    status: 'ORCAMENTO',
    budgetTotal: data.budgetTotal,
    commercialResponsibleId: data.commercialResponsibleId,
    financialApproved: false,
    rhApproved: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  demands.unshift(newDemand);

  histories.push({
    id: `hist-${Date.now()}`,
    demandId: newDemand.id,
    timestamp: new Date().toISOString(),
    authorId: data.commercialResponsibleId,
    authorName: data.authorName,
    department: 'Comercial',
    action: 'Orçamento Criado',
    details: `Orçamento comercial cadastrado no valor de R$ ${data.budgetTotal.toFixed(2)}`,
  });

  return newDemand;
};

export const approveCommercialDemand = (
  id: string,
  authorId: string,
  authorName: string
): Demand | null => {
  const demand = demands.find((item) => item.id === id);
  if (!demand || demand.status !== 'ORCAMENTO') return null;

  demand.status = 'APROVADO_COMERCIAL';
  demand.updatedAt = new Date().toISOString();
  histories.push({
    id: `hist-${Date.now()}`,
    demandId: demand.id,
    timestamp: demand.updatedAt,
    authorId,
    authorName,
    department: 'Comercial',
    action: 'Proposta aprovada pelo Comercial',
    details: 'Proposta encaminhada para análise Financeira.',
  });
  return demand;
};

export const updateFinancialDemand = (
  id: string,
  data: {
    paymentTerms: string;
    costEstimate: number;
    invoicedValue: number;
    approved: boolean;
    authorId: string;
    authorName: string;
  }
): Demand | null => {
  const demand = demands.find((d) => d.id === id);
  if (!demand || demand.status !== 'APROVADO_COMERCIAL') return null;

  demand.paymentTerms = data.paymentTerms;
  demand.costEstimate = data.costEstimate;
  demand.invoicedValue = data.invoicedValue;
  demand.financialApproved = data.approved;
  demand.status = data.approved ? 'ALOCACAO_RH' : 'CANCELADO';
  demand.updatedAt = new Date().toISOString();

  histories.push({
    id: `hist-${Date.now()}`,
    demandId: demand.id,
    timestamp: new Date().toISOString(),
    authorId: data.authorId,
    authorName: data.authorName,
    department: 'Financeiro',
    action: data.approved ? 'Aprovação Financeira' : 'Rejeição Financeira',
    details: `Condição: ${data.paymentTerms} | Custo Est.: R$ ${data.costEstimate.toFixed(2)} | Faturado: R$ ${data.invoicedValue.toFixed(2)}`,
  });

  return demand;
};

export const updateRhDemand = (
  id: string,
  data: {
    requiredRoles: string[];
    assignedStaffCount: number;
    approved: boolean;
    authorId: string;
    authorName: string;
  }
): Demand | null => {
  const demand = demands.find((d) => d.id === id);
  if (!demand || demand.status !== 'ALOCACAO_RH' || !demand.financialApproved) return null;

  demand.requiredRoles = data.requiredRoles;
  demand.assignedStaffCount = data.assignedStaffCount;
  demand.rhApproved = data.approved;
  demand.status = data.approved ? 'EM_EXECUCAO' : 'ALOCACAO_RH';
  demand.updatedAt = new Date().toISOString();

  histories.push({
    id: `hist-${Date.now()}`,
    demandId: demand.id,
    timestamp: new Date().toISOString(),
    authorId: data.authorId,
    authorName: data.authorName,
    department: 'RH',
    action: data.approved ? 'Equipe Alocada' : 'Pendente de Alocação',
    details: `Perfis: ${data.requiredRoles.join(', ')} | Pessoas alocadas: ${data.assignedStaffCount}`,
  });

  return demand;
};

export const advanceDemandStatus = (
  id: string,
  nextStatus: DemandStatus,
  authorId: string,
  authorName: string,
  department: string,
  note: string
): Demand | null => {
  const demand = demands.find((d) => d.id === id);
  if (!demand) return null;

  demand.status = nextStatus;
  demand.updatedAt = new Date().toISOString();

  histories.push({
    id: `hist-${Date.now()}`,
    demandId: demand.id,
    timestamp: new Date().toISOString(),
    authorId,
    authorName,
    department,
    action: `Status alterado para ${nextStatus}`,
    details: note,
  });

  return demand;
};

export const getGerencialOverview = () => {
  const total = demands.length;
  const totalBudget = demands.reduce((acc, curr) => acc + curr.budgetTotal, 0);
  const totalInvoiced = demands.reduce((acc, curr) => acc + (curr.invoicedValue || 0), 0);
  const byStatus: Record<string, number> = {};

  demands.forEach((d) => {
    byStatus[d.status] = (byStatus[d.status] || 0) + 1;
  });

  return {
    totalDemands: total,
    totalBudget,
    totalInvoiced,
    byStatus,
    activeDemands: demands.filter((d) => d.status !== 'ENTREGUE' && d.status !== 'CANCELADO').length,
  };
};
