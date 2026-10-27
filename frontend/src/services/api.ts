import type { CreateDemandInput, Demand, DemandHistory, DemandStatus, Overview, RegistrationRequest, Role, User } from '../types';
import { getSupabase } from './supabase';

type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  department: string;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED';
  created_at: string;
};

const toUser = (profile: ProfileRow): User => ({
  id: profile.id,
  name: profile.full_name,
  email: profile.email,
  role: profile.role,
  department: profile.department,
  active: profile.status === 'ACTIVE',
  createdAt: profile.created_at,
});

const toDemand = (row: {
  id: string;
  code: string;
  client_name: string;
  title: string;
  description: string;
  status: DemandStatus;
  budget_total: number | null;
  commercial_responsible_id: string;
  payment_terms: string | null;
  invoiced_value: number | null;
  cost_estimate: number | null;
  financial_approved: boolean | null;
  required_roles: string[] | null;
  assigned_staff_count: number | null;
  rh_approved: boolean | null;
  created_at: string;
  updated_at: string;
}): Demand => ({
  id: row.id,
  code: row.code,
  clientName: row.client_name,
  title: row.title,
  description: row.description,
  status: row.status,
  budgetTotal: row.budget_total === null ? undefined : Number(row.budget_total),
  commercialResponsibleId: row.commercial_responsible_id,
  paymentTerms: row.payment_terms ?? undefined,
  invoicedValue: row.invoiced_value === null ? undefined : Number(row.invoiced_value),
  costEstimate: row.cost_estimate === null ? undefined : Number(row.cost_estimate),
  financialApproved: row.financial_approved ?? undefined,
  requiredRoles: row.required_roles ?? undefined,
  assignedStaffCount: row.assigned_staff_count ?? undefined,
  rhApproved: row.rh_approved ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const getProfile = async (id: string): Promise<ProfileRow> => {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('id, email, full_name, role, department, status, created_at')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error('Perfil não encontrado. Verifique se a migração do Supabase foi aplicada.');
  }
  return data;
};

const requireActiveProfile = async (id: string): Promise<User> => {
  const profile = await getProfile(id);
  if (profile.status !== 'ACTIVE') {
    const { error: signOutError } = await getSupabase().auth.signOut();
    if (signOutError) throw new Error(signOutError.message);
    throw new Error(
      profile.status === 'REJECTED'
        ? 'Sua solicitação de acesso não foi aprovada. Fale com o administrador.'
        : 'Seu cadastro está aguardando aprovação de um administrador.',
    );
  }
  return toUser(profile);
};

const ensureUpdated = (id: string | null): void => {
  if (!id) throw new Error('Registro não encontrado ou etapa do fluxo não autorizada.');
};

const ensureUpdatedCount = (count: number | null): void => {
  if (count !== 1) throw new Error('Registro não encontrado ou etapa do fluxo não autorizada.');
};

export const api = {
  async login(email: string, password: string): Promise<User> {
    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('O Supabase Auth não retornou o usuário autenticado.');
    return requireActiveProfile(data.user.id);
  },

  async register(name: string, email: string, password: string): Promise<void> {
    const { error } = await getSupabase().auth.signUp({
      email,
      password,
      options: { data: { full_name: name.trim() } },
    });
    if (error) throw new Error(error.message);
  },

  async currentUser(): Promise<User | null> {
    const { data, error } = await getSupabase().auth.getUser();
    if (error) {
      if (error.name === 'AuthSessionMissingError') return null;
      throw new Error(error.message);
    }
    if (!data.user) return null;
    return requireActiveProfile(data.user.id);
  },

  async registrationRequests(): Promise<RegistrationRequest[]> {
    const { data, error } = await getSupabase()
      .from('profiles')
      .select('id, full_name, email, created_at')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return data.map((profile) => ({
      id: profile.id,
      name: profile.full_name,
      email: profile.email,
      createdAt: profile.created_at,
    }));
  },

  async approveRegistration(id: string, role: Exclude<Role, 'ADMIN'>): Promise<void> {
    const departmentByRole: Record<Exclude<Role, 'ADMIN'>, string> = {
      COMERCIAL: 'Comercial',
      FINANCEIRO: 'Financeiro',
      RH: 'RH',
      GERENCIA: 'Diretoria',
    };
    const { data, error } = await getSupabase()
      .from('profiles')
      .update({ role, department: departmentByRole[role], status: 'ACTIVE' })
      .eq('id', id)
      .eq('status', 'PENDING')
      .select('id')
      .maybeSingle();

    if (error) throw new Error(error.message);
    ensureUpdated(data?.id ?? null);
  },

  async rejectRegistration(id: string): Promise<void> {
    const { data, error } = await getSupabase()
      .from('profiles')
      .update({ status: 'REJECTED' })
      .eq('id', id)
      .eq('status', 'PENDING')
      .select('id')
      .maybeSingle();

    if (error) throw new Error(error.message);
    ensureUpdated(data?.id ?? null);
  },

  async profile(): Promise<User> {
    const { data, error } = await getSupabase().auth.getUser();
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Sessão não encontrada.');
    return requireActiveProfile(data.user.id);
  },

  async demands(): Promise<Demand[]> {
    const { data, error } = await getSupabase().rpc('get_visible_demands');

    if (error) throw new Error(error.message);
    return data.map(toDemand);
  },

  async overview(): Promise<Overview> {
    const demands = await this.demands();
    const byStatus: Record<string, number> = {};
    for (const demand of demands) {
      byStatus[demand.status] = (byStatus[demand.status] ?? 0) + 1;
    }
    return {
      totalDemands: demands.length,
      totalBudget: demands.reduce((total, demand) => total + (demand.budgetTotal ?? 0), 0),
      totalInvoiced: demands.reduce((total, demand) => total + (demand.invoicedValue ?? 0), 0),
      byStatus,
      activeDemands: demands.filter((demand) => !['ENTREGUE', 'CANCELADO'].includes(demand.status)).length,
    };
  },

  async demandHistory(id: string): Promise<DemandHistory[]> {
    const { data, error } = await getSupabase().rpc('get_visible_demand_history', { p_demand_id: id });

    if (error) throw new Error(error.message);
    return data.map((event) => ({
      id: event.id,
      demandId: event.demand_id,
      timestamp: event.timestamp,
      authorId: event.author_id ?? '',
      authorName: event.author_name,
      department: event.department,
      action: event.action,
      details: event.details,
    }));
  },

  async createDemand(data: CreateDemandInput): Promise<void> {
    const { data: authData, error: authError } = await getSupabase().auth.getUser();
    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error('Entre novamente para cadastrar uma demanda.');

    const { error } = await getSupabase().from('demands').insert({
      client_name: data.clientName,
      title: data.title,
      description: data.description,
      budget_total: data.budgetTotal,
      commercial_responsible_id: authData.user.id,
    });
    if (error) throw new Error(error.message);
  },

  async approveCommercial(id: string): Promise<void> {
    const { count, error } = await getSupabase()
      .from('demands')
      .update({ status: 'APROVADO_COMERCIAL' }, { count: 'exact' })
      .eq('id', id)
      .eq('status', 'ORCAMENTO');
    if (error) throw new Error(error.message);
    ensureUpdatedCount(count);
  },

  async updateFinancial(
    id: string,
    update: { paymentTerms: string; costEstimate: number; invoicedValue: number; approved: boolean },
  ): Promise<void> {
    const { count, error } = await getSupabase()
      .from('demands')
      .update({
        payment_terms: update.paymentTerms,
        cost_estimate: update.costEstimate,
        invoiced_value: update.invoicedValue,
        financial_approved: update.approved,
        status: update.approved ? 'ALOCACAO_RH' : 'CANCELADO',
      }, { count: 'exact' })
      .eq('id', id)
      .eq('status', 'APROVADO_COMERCIAL');
    if (error) throw new Error(error.message);
    ensureUpdatedCount(count);
  },

  async updateHr(
    id: string,
    update: { requiredRoles: string[]; assignedStaffCount: number; approved: boolean },
  ): Promise<void> {
    const { count, error } = await getSupabase()
      .from('demands')
      .update({
        required_roles: update.requiredRoles,
        assigned_staff_count: update.assignedStaffCount,
        rh_approved: update.approved,
        status: update.approved ? 'EM_EXECUCAO' : 'ALOCACAO_RH',
      }, { count: 'exact' })
      .eq('id', id)
      .eq('status', 'ALOCACAO_RH');
    if (error) throw new Error(error.message);
    ensureUpdatedCount(count);
  },

  async logout(): Promise<void> {
    const { error } = await getSupabase().auth.signOut();
    if (error) throw new Error(error.message);
  },
};
