export type Role = 'ADMIN' | 'COMERCIAL' | 'FINANCEIRO' | 'RH' | 'GERENCIA';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  department: 'Comercial' | 'Financeiro' | 'RH' | 'Diretoria';
  active: boolean;
  createdAt: string;
}

export type SafeUser = Omit<User, 'passwordHash'>;

export interface RegistrationRequest {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export type SafeRegistrationRequest = Omit<RegistrationRequest, 'passwordHash'>;

export type DemandStatus =
  | 'ORCAMENTO'
  | 'APROVADO_COMERCIAL'
  | 'EM_ANALISE_FINANCEIRA'
  | 'FATURADO'
  | 'ALOCACAO_RH'
  | 'EM_EXECUCAO'
  | 'ENTREGUE'
  | 'CANCELADO';

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

export interface Demand {
  id: string;
  code: string;
  clientName: string;
  title: string;
  description: string;
  status: DemandStatus;

  // Comercial
  budgetTotal: number;
  commercialResponsibleId: string;

  // Financeiro
  paymentTerms?: string;
  invoicedValue?: number;
  costEstimate?: number;
  financialApproved: boolean;

  // Recursos Humanos
  requiredRoles?: string[];
  assignedStaffCount?: number;
  rhApproved: boolean;

  createdAt: string;
  updatedAt: string;
}
