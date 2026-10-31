import { getSupabase } from './supabase';
import type { FinancialDirection, FinancialEntry, FinancialEvent } from '../types';

function failure(error: { code?: string; message: string }): Error {
  return new Error(['PGRST205', 'PGRST202', '42P01'].includes(error.code ?? '')
    ? 'O painel financeiro ainda precisa ser habilitado no Supabase. Aplique a migration do dashboard financeiro.' : error.message);
}
export async function getFinancialEntries(): Promise<FinancialEntry[]> {
  const rows: FinancialEntry[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await getSupabase().from('financial_entries').select('*').order('created_at', { ascending: false }).order('id').range(from, from + 499);
    if (error) throw failure(error);
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}
export async function getFinancialEvents(id: string): Promise<FinancialEvent[]> {
  const { data, error } = await getSupabase().from('financial_entry_events').select('*').eq('entry_id', id).order('created_at');
  if (error) throw failure(error);
  return data;
}
export async function createFinancialEntries(input: { batchId: string; direction: FinancialDirection; description: string; counterparty: string; totalCents: number; firstDue: string; installments: number; demandId: string; notes: string }): Promise<void> {
  const { error } = await getSupabase().rpc('create_financial_entries', { p_batch: input.batchId, p_direction: input.direction, p_description: input.description, p_counterparty: input.counterparty, p_total_cents: input.totalCents, p_first_due: input.firstDue, p_installments: input.installments, p_demand: input.demandId || null, p_notes: input.notes });
  if (error) throw failure(error);
}
export async function settleFinancialEntry(id: string, date: string): Promise<void> {
  const { error } = await getSupabase().rpc('settle_financial_entry', { p_id: id, p_settled_on: date });
  if (error) throw failure(error);
}
export async function cancelFinancialEntry(id: string, reason: string): Promise<void> {
  const { error } = await getSupabase().rpc('cancel_financial_entry', { p_id: id, p_reason: reason.trim() });
  if (error) throw failure(error);
}
