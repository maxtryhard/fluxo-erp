import { getSupabase } from './supabase';
import type { DirectConversation, DirectMessage, MessagingPerson } from '../types';
function failure(error: { code?: string; message: string }): Error {
 return new Error(['PGRST202','PGRST205','42P01'].includes(error.code ?? '')
  ? 'As conversas privadas ainda precisam ser habilitadas no Supabase.' : error.message);
}
export async function searchPeople(query: string): Promise<MessagingPerson[]> {
 const {data,error}=await getSupabase().rpc('search_messaging_people',{p_query:query.trim()});
 if(error)throw failure(error); return data;
}
export async function openConversation(otherId: string): Promise<string> {
 const {data,error}=await getSupabase().rpc('open_direct_conversation',{p_other:otherId});
 if(error)throw failure(error);return data;
}
export async function getInbox(before?: DirectConversation): Promise<DirectConversation[]> {
 const {data,error}=await getSupabase().rpc('get_direct_inbox',before?{p_before_at:before.sort_at,p_before_id:before.conversation_id}:{});
 if(error)throw failure(error);return data;
}
export async function getConversation(id: string): Promise<DirectConversation> {
 const {data,error}=await getSupabase().rpc('get_direct_inbox',{p_conversation:id});
 if(error)throw failure(error);
 if(!data[0])throw new Error('Conversa não encontrada ou acesso indisponível.');
 return data[0];
}
export async function getDirectMessages(id: string,before?: DirectMessage): Promise<DirectMessage[]> {
 let query=getSupabase().from('direct_messages').select('*').eq('conversation_id',id);
 if(before)query=query.or(`created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`);
 const {data,error}=await query.order('created_at',{ascending:false}).order('id',{ascending:false}).limit(50);
 if(error)throw failure(error);return data.reverse();
}
export async function sendDirectMessage(id: string,body: string,nonce: string,demandId: string|null): Promise<void> {
 const {error}=await getSupabase().rpc('send_direct_message',{p_conversation:id,p_body:body,p_nonce:nonce,p_demand:demandId});
 if(error)throw failure(error);
}
export async function markDirectRead(id: string,messageId: string): Promise<void> {
 const {error}=await getSupabase().rpc('mark_direct_read',{p_conversation:id,p_message:messageId});
 if(error)throw failure(error);
}
export function watchDirectMessages(userId: string,onChange: ()=>void): ()=>void {
 const client=getSupabase();
 const channel=client.channel(`private-inbox-${userId}-${crypto.randomUUID()}`).on('postgres_changes',
  {event:'INSERT',schema:'public',table:'direct_messages'},()=>{if(!document.hidden)onChange();}).subscribe();
 return ()=>{void client.removeChannel(channel);};
}
