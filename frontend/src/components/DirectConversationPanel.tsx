import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowDown, ArrowLeft, ArrowUpRight, Link2, LockKeyhole, Send } from 'lucide-react';
import type { Demand, DirectConversation, DirectMessage, User } from '../types';
import { getDirectMessages, markDirectRead, sendDirectMessage } from '../services/directMessages';
import { mergeDirectMessages, personInitials } from '../utils/conversations';
import { Link } from '../routing/Link';
const time=(value:string)=>new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit'}).format(new Date(value));
const day=(value:string)=>new Intl.DateTimeFormat('pt-BR',{day:'numeric',month:'long',year:'numeric'}).format(new Date(value));
type Props={conversation:DirectConversation;user:User;demands:Demand[];revision:number;onBack:()=>void;onRead:(id:string)=>void;onSent:()=>void};
export function DirectConversationPanel({conversation,user,demands,revision,onBack,onRead,onSent}:Props){
 const [messages,setMessages]=useState<DirectMessage[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [hasOlder,setHasOlder]=useState(false),[olderLoading,setOlderLoading]=useState(false),[body,setBody]=useState(''),[demandId,setDemandId]=useState('');
 const [linking,setLinking]=useState(false),[sending,setSending]=useState(false),[newBelow,setNewBelow]=useState(false),[notice,setNotice]=useState('');
 const view=useRef<HTMLDivElement>(null),draft=useRef<HTMLTextAreaElement>(null),alive=useRef(false),request=useRef(0),items=useRef<DirectMessage[]>([]);
 const pinned=useRef(true),anchor=useRef<{height:number;top:number}|null>(null),paging=useRef(false),busy=useRef(false),initial=useRef(true),marked=useRef('');
 const nonce=useRef<{signature:string;value:string}|null>(null),readCallback=useRef(onRead),sentCallback=useRef(onSent);
 readCallback.current=onRead;sentCallback.current=onSent;
 const commit=(next:DirectMessage[])=>{items.current=next;setMessages(next);};
 const load=useCallback(async()=>{
  const version=++request.current;
  const data=await getDirectMessages(conversation.conversation_id);
  if(!alive.current||version!==request.current)return;
  // After a long absence, rebuild a contiguous latest window instead of hiding a gap.
  const ids=new Set(items.current.map(item=>item.id));
  const gap=items.current.length>0&&data.length===50&&!data.some(item=>ids.has(item.id));
  if(initial.current||gap){setHasOlder(data.length===50);initial.current=false;}
  commit(gap?data:mergeDirectMessages(items.current,data));setLoading(false);setError('');
 },[conversation.conversation_id]);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;request.current++;};},[]);
 useEffect(()=>{void load().catch(failure=>{if(alive.current){setLoading(false);setError(failure instanceof Error?failure.message:'Não foi possível carregar as mensagens.');}});},[load,revision]);
 const markVisible=useCallback(()=>{
  const latest=items.current.at(-1);
  if(!latest||document.hidden||!pinned.current||marked.current===latest.id)return;
  marked.current=latest.id;
  void markDirectRead(conversation.conversation_id,latest.id).then(()=>{if(alive.current)readCallback.current(latest.id);}).catch(()=>{
   if(alive.current){if(marked.current===latest.id)marked.current='';setNotice('Não foi possível atualizar a leitura. Tentaremos novamente na próxima atualização.');}
  });
 },[conversation.conversation_id]);
 useLayoutEffect(()=>{
  const element=view.current;if(!element)return;
  if(anchor.current){element.scrollTop=anchor.current.top+element.scrollHeight-anchor.current.height;anchor.current=null;}
  else if(pinned.current){element.scrollTop=element.scrollHeight;setNewBelow(false);markVisible();}
  else setNewBelow(true);
 },[messages,markVisible]);
 useEffect(()=>{const visible=()=>{if(!document.hidden)markVisible();};document.addEventListener('visibilitychange',visible);return()=>document.removeEventListener('visibilitychange',visible);},[markVisible]);
 const older=async()=>{
  if(paging.current||!items.current.length)return;paging.current=true;setOlderLoading(true);pinned.current=false;
  try{const rows=await getDirectMessages(conversation.conversation_id,items.current[0]);if(!alive.current)return;
   const element=view.current;if(element)anchor.current={height:element.scrollHeight,top:element.scrollTop};
   commit(mergeDirectMessages(items.current,rows));setHasOlder(rows.length===50);
  }catch(failure){if(alive.current)setError(failure instanceof Error?failure.message:'Não foi possível carregar mensagens anteriores.');}
  finally{paging.current=false;if(alive.current)setOlderLoading(false);}
 };
 const submit=async(event:FormEvent)=>{
  event.preventDefault();if(busy.current||!body.trim()||!conversation.other_active)return;
  const signature=JSON.stringify([body.trim(),demandId]);
  if(nonce.current?.signature!==signature)nonce.current={signature,value:crypto.randomUUID()};
  busy.current=true;setSending(true);setError('');setNotice('');
  try{
   await sendDirectMessage(conversation.conversation_id,body.trim(),nonce.current.value,demandId||null);
   if(!alive.current)return;
   nonce.current=null;setBody('');setDemandId('');setLinking(false);pinned.current=true;setNotice('Mensagem enviada.');sentCallback.current();
   try{await load();}catch{if(alive.current)setNotice('Mensagem enviada. A atualização da conversa está pendente.');}
   draft.current?.focus();
  }catch(failure){if(alive.current)setError(failure instanceof Error?failure.message:'Não foi possível enviar. Seu texto foi mantido.');}
  finally{busy.current=false;if(alive.current)setSending(false);}
 };
 const scrollBottom=()=>{const element=view.current;if(element){element.scrollTop=element.scrollHeight;pinned.current=true;setNewBelow(false);markVisible();}};
 return <section className="direct-panel" aria-label={`Conversa com ${conversation.other_name}`}>
  <header className="direct-header"><button className="icon-button messenger-back" type="button" aria-label="Voltar às conversas" onClick={onBack}><ArrowLeft size={19}/></button><span className="messenger-avatar">{personInitials(conversation.other_name)}</span><div><h2>{conversation.other_name}</h2><p>{conversation.other_department}{!conversation.other_active?' · Conta inativa':''}</p></div><span className="direct-private"><LockKeyhole size={14}/>Privada</span></header>
  <div className="direct-privacy"><LockKeyhole size={13}/><span>Esta conversa é visível apenas para os dois participantes no Fluxo.</span></div>
  {error&&<div className="direct-error" role="alert">{error}<button className="text-button" type="button" onClick={()=>void load().catch(()=>{})}>Atualizar</button></div>}
  <div className="direct-messages" ref={view} tabIndex={0} aria-label="Mensagens da conversa" onScroll={()=>{const element=view.current;if(!element)return;pinned.current=element.scrollHeight-element.scrollTop-element.clientHeight<64;if(pinned.current){setNewBelow(false);markVisible();}}}>
   {loading?<p className="messenger-note" role="status">Carregando mensagens...</p>:<>
    {hasOlder&&<button type="button" className="text-button direct-older" disabled={olderLoading} onClick={()=>void older()}>{olderLoading?'Carregando...':'Mensagens anteriores'}</button>}
    {!messages.length&&!error&&<div className="direct-empty"><MessagePlaceholder/><h3>Converse com {conversation.other_name.split(' ')[0]}</h3><p>Compartilhe uma dúvida ou alinhe o próximo passo do trabalho.</p></div>}
    {messages.map((message,index)=>{
     const linked=demands.find(demand=>demand.id===message.demand_id),own=message.sender_id===user.id;
     const separate=index===0||new Date(messages[index-1].created_at).toDateString()!==new Date(message.created_at).toDateString();
     return <div key={message.id}>{separate&&<div className="direct-day"><span>{day(message.created_at)}</span></div>}<article className={`direct-message ${own?'direct-message-own':''}`} aria-label={own?'Sua mensagem':`Mensagem de ${conversation.other_name}`}>
      <p>{message.body}</p>{message.demand_id&&<Link className="direct-demand" to={`/demandas?demanda=${encodeURIComponent(message.demand_id)}`}><Link2 size={14}/><span><strong>{linked?.code??'Demanda relacionada'}</strong>{linked&&<small>{linked.title}</small>}</span><ArrowUpRight size={15}/></Link>}
      <time dateTime={message.created_at}>{time(message.created_at)}</time>
     </article></div>;
    })}
   </>}
  </div>
  {newBelow&&<button type="button" className="direct-new" onClick={scrollBottom}><ArrowDown size={14}/>Ir para as últimas mensagens</button>}
  <form className="direct-composer" onSubmit={event=>void submit(event)}>
   {!conversation.other_active&&<p className="messenger-error">Esta conta está inativa. O histórico permanece disponível para você.</p>}
   {linking&&<label className="field-label direct-link-picker">Demanda relacionada<select value={demandId} onChange={e=>setDemandId(e.target.value)} disabled={sending}><option value="">Sem vínculo</option>{demands.map(demand=><option key={demand.id} value={demand.id}>{demand.code} · {demand.title}</option>)}</select><small>Vincular não compartilha campos financeiros ou de RH.</small></label>}
   <div className="direct-composer-row"><button className="icon-button" type="button" aria-label="Vincular uma demanda" aria-expanded={linking} disabled={sending||!conversation.other_active} onClick={()=>setLinking(value=>!value)}><Link2 size={19}/></button>
    <label className="direct-draft"><span className="sr-only">Mensagem para {conversation.other_name}</span><textarea ref={draft} value={body} maxLength={4000} rows={2} disabled={sending||!conversation.other_active} placeholder="Escreva sua mensagem..." onChange={e=>setBody(e.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();event.currentTarget.form?.requestSubmit();}}}/></label>
    <button type="submit" className="direct-send" disabled={sending||!body.trim()||!conversation.other_active} aria-label={sending?'Enviando mensagem':'Enviar mensagem'}><Send size={18}/></button>
   </div>
   <div className="direct-composer-footer"><span role="status">{notice||'Enter para enviar · Shift+Enter para pular linha'}</span><span>{body.length}/4000</span></div>
  </form>
 </section>;
}
function MessagePlaceholder(){return <span className="messenger-avatar"><LockKeyhole size={21}/></span>;}
