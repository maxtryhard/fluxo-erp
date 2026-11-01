import { getSupabase } from './supabase';
import type { Employee, TeamAllocation } from '../types';

function failure(error: { code?: string; message: string }): Error {
  return new Error(['PGRST205', 'PGRST202', '42P01'].includes(error.code ?? '')
    ? 'O cadastro da equipe ainda precisa ser habilitado no Supabase. Aplique a migration de Pessoas & RH.' : error.message);
}
async function allRows<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { code?: string; message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await page(from, from + 499);
    if (error) throw failure(error);
    rows.push(...(data ?? []));
    if (!data || data.length < 500) return rows;
  }
}
export async function getPeople(): Promise<{ employees: Employee[]; allocations: TeamAllocation[] }> {
  const [employees, allocations] = await Promise.all([
    allRows<Employee>((from, to) => getSupabase().from('employees').select('*').order('name').order('id').range(from, to)),
    allRows<TeamAllocation>((from, to) => getSupabase().from('team_allocations').select('*').order('created_at', { ascending: false }).order('id').range(from, to)),
  ]);
  return { employees, allocations };
}
export async function saveEmployee(input: Pick<Employee, 'name' | 'job_title' | 'skills' | 'capacity_percent' | 'active'>, id: string | null): Promise<void> {
  const { error } = await getSupabase().rpc('save_employee', { p_id: id, p_name: input.name.trim(), p_job_title: input.job_title.trim(), p_skills: input.skills, p_capacity: input.capacity_percent, p_active: input.active });
  if (error) throw failure(error);
}
export async function allocateEmployee(input: Pick<TeamAllocation, 'employee_id' | 'demand_id' | 'assignment_role' | 'starts_on' | 'ends_on' | 'dedication'>): Promise<void> {
  const { error } = await getSupabase().rpc('allocate_employee', { p_employee: input.employee_id, p_demand: input.demand_id, p_role: input.assignment_role.trim(), p_start: input.starts_on, p_end: input.ends_on, p_dedication: input.dedication });
  if (error) throw failure(error);
}
export async function cancelAllocation(id: string, reason: string): Promise<void> {
  const { error } = await getSupabase().rpc('cancel_team_allocation', { p_id: id, p_reason: reason.trim() });
  if (error) throw failure(error);
}
export async function confirmTeam(id: string, note: string): Promise<void> {
  const { error } = await getSupabase().rpc('confirm_hr_team', { p_demand: id, p_note: note.trim() });
  if (error) throw failure(error);
}
