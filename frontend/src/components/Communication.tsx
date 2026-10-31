import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { MessageSquare, RefreshCw, Send, ShieldCheck } from 'lucide-react';
import type { MessageKind, MessageScope, SectorMessage, User } from '../types';
import { getMessages, sendMessage } from '../services/communication';

const scopes: { id: MessageScope; label: string; description: string }[] = [
  { id: 'SHARED', label: 'Entre setores', description: 'Visível a todas as contas ativas. Compartilhe contexto, próximos passos e dúvidas; mantenha dados financeiros e pessoais nos canais restritos.' },
  { id: 'FINANCEIRO', label: 'Financeiro · restrito', description: 'Somente Financeiro, Gerência e Administração podem ler esta conversa.' },
  { id: 'RH', label: 'RH · restrito', description: 'Somente RH, Gerência e Administração podem ler esta conversa.' },
];
const kinds: Record<MessageKind, string> = { MESSAGE: 'Mensagem', ANALYSIS: 'Análise', QUESTION: 'Pendência / dúvida' };
const timestamp = (value: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));

export function Communication({ user, demandId = null }: { user: User; demandId?: string | null }) {
  const [scope, setScope] = useState<MessageScope>('SHARED');
  const available = scopes.filter((item) => item.id === 'SHARED' || ['ADMIN', 'GERENCIA'].includes(user.role) || item.id === user.role);
  return (
    <section className="communication" aria-label={demandId ? 'Conversa da demanda' : 'Conversas entre setores'}>
      <div className="communication-heading"><MessageSquare size={20} aria-hidden="true" /><div><h2>{demandId ? 'Contexto e conversa da demanda' : 'Conversas entre setores'}</h2><p>{demandId ? 'Registre o que foi analisado, o que falta e o próximo passo.' : 'Alinhe o trabalho de Comercial, Financeiro e RH.'}</p></div></div>
      <div className="conversation-scopes" role="group" aria-label="Visibilidade da conversa">
        {available.map((item) => <button key={item.id} type="button" aria-pressed={scope === item.id} onClick={() => setScope(item.id)}>{item.label}</button>)}
      </div>
      <p className="conversation-visibility"><ShieldCheck size={16} aria-hidden="true" />{scopes.find((item) => item.id === scope)?.description}</p>
      <ConversationThread key={`${demandId ?? 'general'}-${scope}`} user={user} demandId={demandId} scope={scope} />
    </section>
  );
}

function ConversationThread({ user, demandId, scope }: { user: User; demandId: string | null; scope: MessageScope }) {
  const [messages, setMessages] = useState<SectorMessage[]>([]);
  const [older, setOlder] = useState<SectorMessage[]>([]);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [body, setBody] = useState('');
  const [kind, setKind] = useState<MessageKind>('MESSAGE');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('');
  const busy = useRef(false);
  const olderExhausted = useRef(false);
  const alive = useRef(true);
  const load = useCallback(async () => {
    const data = await getMessages(demandId, scope);
    if (!alive.current) return;
    setMessages(data);
    setHasOlder(!olderExhausted.current && data.length === 50);
    setError('');
  }, [demandId, scope]);

  useEffect(() => {
    alive.current = true;
    const refresh = async () => {
      if (document.hidden || busy.current) return;
      busy.current = true;
      try { await load(); }
      catch (failure) { if (alive.current) setError(failure instanceof Error ? failure.message : 'Não foi possível carregar a conversa.'); }
      finally { busy.current = false; if (alive.current) setLoading(false); }
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), 15000);
    return () => { alive.current = false; window.clearInterval(interval); };
  }, [load]);

  // Keep loaded pages as new messages move the latest page boundary.
  useEffect(() => {
    setOlder((previous) => {
      const byId = new Map(previous.map((message) => [message.id, message]));
      messages.forEach((message) => byId.set(message.id, message));
      return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
    });
  }, [messages]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending || body.trim().length < 3) return;
    setSending(true); setError(''); setStatus('');
    try {
      await sendMessage(demandId, scope, kind, body);
      if (!alive.current) return;
      setBody(''); setStatus('Registro enviado.');
      await load();
    } catch (failure) {
      if (alive.current) setError(failure instanceof Error ? failure.message : 'Não foi possível enviar. Seu texto foi mantido.');
    } finally { if (alive.current) setSending(false); }
  };
  const loadOlder = async () => {
    if (!older[0] || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const data = await getMessages(demandId, scope, older[0]);
      if (alive.current) {
        setOlder((previous) => [...data, ...previous]); olderExhausted.current = data.length < 50; setHasOlder(data.length === 50); setError('');
      }
    } catch (failure) { if (alive.current) setError(failure instanceof Error ? failure.message : 'Não foi possível carregar mensagens anteriores.'); }
    finally { if (alive.current) setLoadingOlder(false); }
  };
  return (
    <>
      <div className="conversation-toolbar"><span>Atualização automática a cada 15 segundos</span><button type="button" className="text-button" onClick={() => void load().catch((failure: unknown) => setError(failure instanceof Error ? failure.message : 'Falha ao atualizar.'))}><RefreshCw size={14} />Atualizar</button></div>
      {error && <p className="alert" role="alert">{error}</p>}
      <div className="conversation-messages" tabIndex={0} aria-label="Registros da conversa">
        {loading ? <p role="status">Carregando conversa...</p> : <>
          {hasOlder && <button className="text-button" type="button" disabled={loadingOlder} onClick={() => void loadOlder()}>{loadingOlder ? 'Carregando...' : 'Carregar registros anteriores'}</button>}
          {!older.length && !error && <div className="conversation-empty"><MessageSquare size={26} /><strong>A conversa começa aqui</strong><p>Compartilhe contexto ou registre uma análise para a equipe.</p></div>}
          {older.map((message) => <article className={`conversation-message ${message.author_id === user.id ? 'conversation-message-own' : ''}`} key={message.id}>
            <header><strong>{message.author_name}</strong><span>{message.department}</span><time dateTime={message.created_at}>{timestamp(message.created_at)}</time></header>
            <span className="conversation-kind">{kinds[message.kind]}</span><p>{message.body}</p>
          </article>)}
        </>}
      </div>
      <form className="conversation-form" onSubmit={(event) => void submit(event)}>
        <label className="field-label">Tipo de registro<select value={kind} onChange={(event) => setKind(event.target.value as MessageKind)}>{Object.entries(kinds).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label className="field-label">{kinds[kind]}<textarea value={body} onChange={(event) => setBody(event.target.value)} required minLength={3} maxLength={4000} rows={3} placeholder="Descreva o contexto, os pontos analisados e o que precisa acontecer em seguida..." /></label>
        <div className="conversation-form-footer"><span>{body.length}/4000</span><span role="status">{status}</span><button type="submit" className="primary-button" disabled={sending || body.trim().length < 3}><Send size={15} />{sending ? 'Enviando...' : 'Enviar registro'}</button></div>
      </form>
    </>
  );
}
