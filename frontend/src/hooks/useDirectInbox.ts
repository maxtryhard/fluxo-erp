import { useCallback, useEffect, useRef, useState } from 'react';
import type { DirectConversation } from '../types';
import { getInbox, watchDirectMessages } from '../services/directMessages';
const merge=(old: DirectConversation[],next: DirectConversation[])=>{
 const map=new Map(old.map(item=>[item.conversation_id,item]));next.forEach(item=>map.set(item.conversation_id,item));
 return [...map.values()].sort((a,b)=>b.sort_at.localeCompare(a.sort_at)||b.conversation_id.localeCompare(a.conversation_id));
};
export function useDirectInbox(userId: string) {
 const [inbox,setInbox]=useState<DirectConversation[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [hasMore,setHasMore]=useState(false),[loadingMore,setLoadingMore]=useState(false),[revision,setRevision]=useState(0);
 const alive=useRef(false),request=useRef(0),initial=useRef(true),paging=useRef(false);
 const refresh=useCallback(async()=>{
  const version=++request.current;
  try{const rows=await getInbox();if(!alive.current||version!==request.current)return;
   setInbox(previous=>merge(previous,rows));if(initial.current){setHasMore(rows.length===30);initial.current=false;}
   setError('');setRevision(value=>value+1);
  }catch(failure){if(alive.current&&version===request.current)setError(failure instanceof Error?failure.message:'Não foi possível atualizar as conversas.');}
  finally{if(alive.current&&version===request.current)setLoading(false);}
 },[]);
 useEffect(()=>{
  alive.current=true;void refresh();
  const update=()=>{if(!document.hidden)void refresh();};
  const stop=watchDirectMessages(userId,update),timer=window.setInterval(update,15000);
  document.addEventListener('visibilitychange',update);window.addEventListener('focus',update);
  return()=>{alive.current=false;request.current++;stop();clearInterval(timer);document.removeEventListener('visibilitychange',update);window.removeEventListener('focus',update);};
 },[userId,refresh]);
 const loadMore=async()=>{
  if(paging.current||!inbox.length)return;paging.current=true;setLoadingMore(true);
  try{const rows=await getInbox(inbox.at(-1));if(alive.current){setInbox(old=>merge(old,rows));setHasMore(rows.length===30);setError('');}}
  catch(failure){if(alive.current)setError(failure instanceof Error?failure.message:'Não foi possível carregar as conversas.');}
  finally{paging.current=false;if(alive.current)setLoadingMore(false);}
 };
 const include=(conversation: DirectConversation)=>setInbox(old=>merge(old,[conversation]));
 const read=(id: string,messageId: string)=>setInbox(old=>old.map(item=>item.conversation_id===id&&item.last_message_id===messageId?{...item,unread_count:0}:item));
 return{inbox,loading,error,refresh,hasMore,loadingMore,loadMore,include,read,revision};
}
