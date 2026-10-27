export type Role = 'ADMIN' | 'COMERCIAL' | 'FINANCEIRO' | 'RH' | 'GERENCIA';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  active: boolean;
  createdAt: string;
}

export interface RegistrationRequest {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface CreateDemandInput {
  clientName: string;
  title: string;
  description: string;
  budgetTotal: number;
}

export type DemandStatus =
  | 'ORCAMENTO'
  | 'APROVADO_COMERCIAL'
  | 'EM_ANALISE_FINANCEIRA'
  | 'FATURADO'
  | 'ALOCACAO_RH'
  | 'EM_EXECUCAO'
  | 'ENTREGUE'
  | 'CANCELADO';

export interface Demand {
  id: string;
  code: string;
  clientName: string;
  title: string;
  description: string;
  status: DemandStatus;
  budgetTotal?: number;
  commercialResponsibleId: string;
  paymentTerms?: string;
  invoicedValue?: number;
  costEstimate?: number;
  financialApproved?: boolean;
  requiredRoles?: string[];
  assignedStaffCount?: number;
  rhApproved?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DemandHistory {
  id: string;
  demandId: string;
  timestamp: string;
  authorId: string;
  authorName: string;
  department: string;
  action: string;
  details: string;
}

export interface Overview {
  totalDemands: number;
  totalBudget: number;
  totalInvoiced: number;
  byStatus: Record<string, number>;
  activeDemands: number;
}
