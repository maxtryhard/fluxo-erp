export type Role = 'ADMIN' | 'COMERCIAL' | 'FINANCEIRO' | 'RH' | 'GERENCIA';

export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
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

export type MessageScope = 'SHARED' | 'FINANCEIRO' | 'RH';
export type MessageKind = 'MESSAGE' | 'ANALYSIS' | 'QUESTION';
export type SectorMessage = {
  id: string;
  demand_id: string | null;
  scope: MessageScope;
  kind: MessageKind;
  body: string;
  author_id: string;
  author_name: string;
  department: string;
  created_at: string;
}

export type Employee = {
  id: string;
  name: string;
  job_title: string;
  skills: string[];
  capacity_percent: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};
export type TeamAllocation = {
  id: string;
  employee_id: string;
  demand_id: string;
  assignment_role: string;
  starts_on: string;
  ends_on: string;
  dedication: number;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_by: string;
  created_at: string;
};

export type FinancialDirection = 'RECEIVABLE' | 'PAYABLE';
export type FinancialEntry = {
  id: string;
  batch_id: string;
  demand_id: string | null;
  direction: FinancialDirection;
  description: string;
  counterparty: string;
  amount_cents: number;
  due_on: string;
  installment_number: number;
  installment_count: number;
  notes: string;
  settled_on: string | null;
  settled_by: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_by: string;
  created_at: string;
};
export type FinancialEvent = {
  id: string;
  entry_id: string;
  action: 'CREATED' | 'SETTLED' | 'CANCELLED';
  author_id: string;
  author_name: string;
  details: string;
  created_at: string;
};
