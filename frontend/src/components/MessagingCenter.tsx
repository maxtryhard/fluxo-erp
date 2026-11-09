import { useEffect, useRef, useState } from 'react';
import { ChevronRight, LockKeyhole, MessageSquare, Plus, Search, Users, X } from 'lucide-react';
import type { Demand, MessagingPerson, User } from '../types';
import { getConversation, openConversation, searchPeople } from '../services/directMessages';
import { useDirectInbox } from '../hooks/useDirectInbox';
import { personInitials } from '../utils/conversations';
import { Communication } from './Communication';
import { DirectConversationPanel } from './DirectConversationPanel';
const previewTime=(value:string|null)=>value?new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit'}).format(new Date(value)):'';
export default function MessagingCenter({user,demands}:{user:User;demands:Demand[]}){
 const [mode,setMode]=useState<'people'|'sectors'>('people'),[selected,setSelected]=useState<string|null>(null);
 const [query,setQuery]=useState(''),[people,setPeople]=useState<MessagingPerson[]>([]),[searching,setSearching]=useState(false),[searchError,setSearchError]=useState('');
 const [opening,setOpening]=useState<string|null>(null);const input=useRef<HTMLInputElement>(null),busy=useRef(false),alive=useRef(true);
 const box=useDirectInbox(user.id);const conversation=box.inbox.find(item=>item.conversation_id===selected);
 const unread=box.inbox.reduce((total,item)=>total+Number(item.unread_count),0);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{
  let cancelled=false;setPeople([]);setSearchError('');setSearching(query.trim().length>=2);
  if(query.trim().length<2)return()=>{cancelled=true;};
  const timer=setTimeout(()=>{void searchPeople(query).then(rows=>{if(!cancelled)setPeople(rows);}).catch(failure=>{if(!cancelled)setSearchError(failure instanceof Error?failure.message:'Não foi possível buscar pessoas.');}).finally(()=>{if(!cancelled)setSearching(false);});},1200);
  return()=>{cancelled=true;clearTimeout(timer);};
 },[query]);
 const openPerson=async(person:MessagingPerson)=>{
  if(busy.current)return;busy.current=true;setOpening(person.user_id);setSearchError('');
  try{const id=await openConversation(person.user_id),thread=await getConversation(id);if(!alive.current)return;box.include(thread);setSelected(id);setQuery('');}
  catch(failure){if(alive.current)setSearchError(failure instanceof Error?failure.message:'Não foi possível iniciar a conversa.');}
  finally{busy.current=false;if(alive.current)setOpening(null);}
 };
 return <section className="message-center">
  <div className="page-heading"><div><div className="eyebrow">COLABORAÇÃO</div><h1>Conversas</h1><p>Pessoas, setores e o contexto do seu trabalho.</p></div></div>
  <div className="message-modes" data-tour="conversation-scopes" role="group" aria-label="Tipo de conversa">
   <button type="button" aria-pressed={mode==='people'} onClick={()=>setMode('people')}><MessageSquare size={17}/>Pessoas{unread>0&&<span className="message-unread" aria-label={`${unread} mensagens não lidas`}>{unread>99?'99+':unread}</span>}</button>
   <button type="button" aria-pressed={mode==='sectors'} onClick={()=>setMode('sectors')}><Users size={17}/>Setores</button>
  </div>
  {mode==='sectors'?<Communication user={user}/>:<div className={`messenger ${selected?'messenger-selected':''}`}>
   <aside className="messenger-sidebar" aria-label="Lista de conversas">
    <header><div><h2>Mensagens</h2></div><button className="icon-button" type="button" aria-label="Nova conversa" onClick={()=>{setSelected(null);input.current?.focus();}}><Plus size={20}/></button></header>
    <label className="messenger-search"><Search size={17} aria-hidden="true"/><input ref={input} type="search" value={query} maxLength={254} onChange={e=>setQuery(e.target.value)} placeholder="Buscar nome ou e-mail" aria-label="Buscar pessoas por nome ou e-mail"/>{query&&<button type="button" aria-label="Limpar busca" onClick={()=>setQuery('')}><X size={15}/></button>}</label>
    {query?<div className="messenger-results"><div className="messenger-list-label">PESSOAS DO FLUXO</div>
     {query.trim().length<2?<p>Digite pelo menos 2 caracteres.</p>:searching?<p role="status">Buscando pessoas...</p>:<>
      {searchError&&<p className="messenger-error" role="alert">{searchError}</p>}
      {!people.length&&!searchError&&<p>Nenhuma pessoa encontrada. Busque pelo nome ou e-mail completo.</p>}
      {people.map(person=><button className="messenger-person" type="button" key={person.user_id} disabled={!!opening} onClick={()=>void openPerson(person)}><span className="messenger-avatar">{personInitials(person.full_name)}</span><span><strong>{person.full_name}</strong><small>{opening===person.user_id?'Abrindo conversa...':person.department}</small></span><ChevronRight size={15}/></button>)}
     </>}
    </div>:<>
     <div className="messenger-list-label">CONVERSAS PRIVADAS</div>
     {box.loading?<p className="messenger-note" role="status">Carregando conversas...</p>:!box.inbox.length&&!box.error&&<div className="messenger-list-empty"><MessageSquare size={24}/><strong>Sua primeira conversa</strong><p>Busque uma pessoa pelo nome ou e-mail para começar.</p></div>}
     {box.error&&<div className="messenger-note"><p className="messenger-error" role="alert">{box.error}</p><button className="text-button" onClick={()=>void box.refresh()}>Tentar novamente</button></div>}
     <div className="messenger-list">{box.inbox.map(item=><button type="button" key={item.conversation_id} className={`messenger-item ${selected===item.conversation_id?'messenger-item-active':''}`} aria-current={selected===item.conversation_id?'true':undefined} onClick={()=>setSelected(item.conversation_id)}>
      <span className="messenger-avatar">{personInitials(item.other_name)}</span><span className="messenger-item-copy"><strong>{item.other_name}</strong><small>{item.other_department}</small><span>{item.last_body?`${item.last_sender_id===user.id?'Você: ':''}${item.last_body}`:'Envie a primeira mensagem.'}</span></span><span className="messenger-item-meta"><time>{previewTime(item.last_message_at)}</time>{item.unread_count>0&&<span className="message-unread" aria-label={`${item.unread_count} não lidas`}>{item.unread_count>99?'99+':item.unread_count}</span>}</span>
     </button>)}</div>
     {box.hasMore&&<button className="text-button messenger-more" disabled={box.loadingMore} onClick={()=>void box.loadMore()}>{box.loadingMore?'Carregando...':'Mais conversas'}</button>}
    </>}
    <footer><LockKeyhole size={14}/><span>Privadas entre os participantes</span></footer>
   </aside>
   <div className="messenger-content">
    {conversation?<DirectConversationPanel key={conversation.conversation_id} conversation={conversation} user={user} demands={demands} revision={box.revision} onBack={()=>setSelected(null)} onRead={(id)=>box.read(conversation.conversation_id,id)} onSent={()=>void box.refresh()}/>:<div className="messenger-welcome"><span className="messenger-welcome-icon"><MessageSquare size={34} strokeWidth={1.3}/></span><h2>Escolha uma conversa</h2><p>Busque uma pessoa por nome ou e-mail para iniciar uma conversa privada.</p><button type="button" className="secondary-button" onClick={()=>input.current?.focus()}><Plus size={16}/>Nova conversa</button><small><LockKeyhole size={13}/>Apenas você e a outra pessoa têm acesso pelo sistema.</small></div>}
   </div>
  </div>}
 </section>;
}
