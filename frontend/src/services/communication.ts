import { getSupabase } from './supabase';
import type { MessageKind, MessageScope, SectorMessage } from '../types';

function messageError(code: string | undefined, fallback: string): Error {
  return new Error(code === 'PGRST205' || code === 'PGRST202' || code === '42P01'
    ? 'A comunicação ainda precisa ser habilitada no Supabase. Aplique a migration de comunicação entre setores.'
    : fallback);
}

export async function getMessages(demandId: string | null, scope: MessageScope, before?: SectorMessage): Promise<SectorMessage[]> {
  let query = getSupabase().from('sector_messages').select('*').eq('scope', scope);
  query = demandId ? query.eq('demand_id', demandId) : query.is('demand_id', null);
  if (before) query = query.or(`created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`);
  const { data, error } = await query.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(50);
  if (error) throw messageError(error.code, 'Não foi possível carregar a conversa. Tente atualizar.');
  return data.reverse();
}

export async function sendMessage(demandId: string | null, scope: MessageScope, kind: MessageKind, body: string): Promise<void> {
  const { error } = await getSupabase().rpc('send_sector_message', { p_demand_id: demandId, p_scope: scope, p_kind: kind, p_body: body.trim() });
  if (error) throw messageError(error.code, error.message);
}

export async function reviewDemand(id: string, action: 'COMMERCIAL' | 'FINANCE' | 'HR', note: string,
  data: Record<string, string | number | boolean | string[]> = {}): Promise<void> {
  const { error } = await getSupabase().rpc('review_demand_with_note', { p_id: id, p_action: action, p_note: note, p_data: data });
  if (error) throw messageError(error.code, error.message);
}
