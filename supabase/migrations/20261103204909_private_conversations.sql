begin;
create table public.direct_conversations (
 id uuid primary key default gen_random_uuid(),
 member_low uuid not null references public.profiles(id),
 member_high uuid not null references public.profiles(id),
 created_at timestamptz not null default clock_timestamp(),
 check(member_low<member_high), unique(member_low,member_high)
);
create index direct_conversations_high on public.direct_conversations(member_high);
create table public.direct_messages (
 id uuid primary key default gen_random_uuid(),
 conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
 sender_id uuid not null references public.profiles(id),
 body text not null check(char_length(btrim(body)) between 1 and 4000),
 demand_id uuid references public.demands(id) on delete set null,
 client_nonce uuid not null,
 created_at timestamptz not null default clock_timestamp(),
 unique(sender_id,client_nonce)
);
create index direct_messages_thread on public.direct_messages(conversation_id,created_at desc,id desc);
create index direct_messages_demand on public.direct_messages(demand_id) where demand_id is not null;
create table public.direct_reads (
 conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
 user_id uuid not null references public.profiles(id),
 read_at timestamptz not null default 'epoch',
 read_message_id uuid not null default '00000000-0000-0000-0000-000000000000',
 primary key(conversation_id,user_id)
);
create index direct_reads_user on public.direct_reads(user_id);
-- Internal rate-limit state; clients never read or write it directly.
create table public.direct_action_limits (
 user_id uuid primary key references public.profiles(id),
 searched_at timestamptz, opened_at timestamptz, sent_at timestamptz
);
alter table public.direct_conversations enable row level security;
alter table public.direct_messages enable row level security;
alter table public.direct_reads enable row level security;
alter table public.direct_action_limits enable row level security;
revoke all on public.direct_conversations,public.direct_messages,public.direct_reads,public.direct_action_limits from public,anon,authenticated;
grant select on public.direct_conversations,public.direct_messages,public.direct_reads to authenticated;

create function public.is_direct_participant(p_conversation uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select public.is_active_member() and exists(select 1 from public.direct_conversations c where c.id=p_conversation and auth.uid() in(c.member_low,c.member_high))
$$;
revoke all on function public.is_direct_participant(uuid) from public,anon;
grant execute on function public.is_direct_participant(uuid) to authenticated;
create policy direct_conversations_read on public.direct_conversations for select to authenticated using(public.is_direct_participant(id));
create policy direct_messages_read on public.direct_messages for select to authenticated using(public.is_direct_participant(conversation_id));
create policy direct_reads_own on public.direct_reads for select to authenticated using(user_id=auth.uid() and public.is_direct_participant(conversation_id));

create function public.claim_direct_action(p_action text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=auth.uid(); previous public.direct_action_limits; now_at timestamptz:=clock_timestamp();
begin
 if not public.is_active_member() then raise exception 'Acesso não autorizado.' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,7));
 select * into previous from public.direct_action_limits where user_id=actor;
 if (p_action='SEARCH' and previous.searched_at>now_at-interval '1 second')
 or (p_action='OPEN' and previous.opened_at>now_at-interval '1 second')
 or (p_action='SEND' and previous.sent_at>now_at-interval '2 seconds') then
  raise exception 'Aguarde um instante antes de tentar novamente.';
 end if;
 if p_action not in('SEARCH','OPEN','SEND') or p_action is null then raise exception 'Ação inválida.'; end if;
 insert into public.direct_action_limits(user_id,searched_at,opened_at,sent_at)
 values(actor,case when p_action='SEARCH' then now_at end,case when p_action='OPEN' then now_at end,case when p_action='SEND' then now_at end)
 on conflict(user_id) do update set
 searched_at=case when p_action='SEARCH' then now_at else direct_action_limits.searched_at end,
 opened_at=case when p_action='OPEN' then now_at else direct_action_limits.opened_at end,
 sent_at=case when p_action='SEND' then now_at else direct_action_limits.sent_at end;
end $$;
revoke all on function public.claim_direct_action(text) from public,anon,authenticated;

create function public.search_messaging_people(p_query text)
returns table(user_id uuid,full_name text,department text)
language plpgsql security definer set search_path=public,pg_temp as $$
declare term text:=lower(btrim(p_query));
begin
 if term is null or char_length(term) not between 2 and 254 then raise exception 'Digite de 2 a 254 caracteres.'; end if;
 perform public.claim_direct_action('SEARCH');
 return query select p.id,p.full_name,p.department from public.profiles p
 where p.status='ACTIVE' and p.id<>auth.uid() and
 (case when strpos(term,'@')>0 then lower(p.email)=term else strpos(lower(p.full_name),term)>0 end)
 order by lower(p.full_name),p.id limit 10;
end $$;

create function public.open_direct_conversation(p_other uuid) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=auth.uid(); result_id uuid;
begin
 if not public.is_active_member() or p_other is null or p_other=actor or not exists(select 1 from public.profiles where id=p_other and status='ACTIVE') then
  raise exception 'Não foi possível iniciar esta conversa.' using errcode='42501'; end if;
 perform public.claim_direct_action('OPEN');
 insert into public.direct_conversations(member_low,member_high) values(least(actor,p_other),greatest(actor,p_other)) on conflict(member_low,member_high) do nothing;
 select id into result_id from public.direct_conversations where member_low=least(actor,p_other) and member_high=greatest(actor,p_other);
 return result_id;
end $$;

create function public.get_direct_inbox(p_before_at timestamptz default null,p_before_id uuid default null,p_conversation uuid default null)
returns table(conversation_id uuid,other_user_id uuid,other_name text,other_department text,other_active boolean,last_body text,last_sender_id uuid,last_message_at timestamptz,last_message_id uuid,sort_at timestamptz,unread_count bigint)
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if not public.is_active_member() then raise exception 'Acesso não autorizado.' using errcode='42501'; end if;
 if (p_before_at is null)<>(p_before_id is null) then raise exception 'Página inválida.'; end if;
 return query
 with threads as (
 select c.id conversation_id,p.id other_user_id,p.full_name other_name,p.department other_department,p.status='ACTIVE' other_active,
 left(m.body,160) last_body,m.sender_id last_sender_id,m.created_at last_message_at,m.id last_message_id,coalesce(m.created_at,c.created_at) sort_at,
 (select count(*) from public.direct_messages u where u.conversation_id=c.id and u.sender_id<>auth.uid()
 and (u.created_at,u.id)>(coalesce(r.read_at,'epoch'::timestamptz),coalesce(r.read_message_id,'00000000-0000-0000-0000-000000000000'::uuid))) unread_count
 from public.direct_conversations c join public.profiles p on p.id=case when c.member_low=auth.uid() then c.member_high else c.member_low end
 left join lateral(select * from public.direct_messages x where x.conversation_id=c.id order by x.created_at desc,x.id desc limit 1)m on true
 left join public.direct_reads r on r.conversation_id=c.id and r.user_id=auth.uid()
 where auth.uid() in(c.member_low,c.member_high) and (p_conversation is null or c.id=p_conversation)
 ) select t.* from threads t where p_before_at is null or (t.sort_at,t.conversation_id)<(p_before_at,p_before_id)
 order by t.sort_at desc,t.conversation_id desc limit 30;
end $$;

create function public.send_direct_message(p_conversation uuid,p_body text,p_nonce uuid,p_demand uuid default null) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=auth.uid(); previous public.direct_messages; thread public.direct_conversations; result_id uuid;
begin
 if not public.is_direct_participant(p_conversation) then raise exception 'Conversa não autorizada.' using errcode='42501'; end if;
 if p_body is null or char_length(btrim(p_body)) not between 1 and 4000 or p_nonce is null then raise exception 'Escreva uma mensagem de 1 a 4000 caracteres.'; end if;
 -- Serialize per sender, then per conversation. Reads use the same thread lock.
 perform pg_advisory_xact_lock(hashtextextended(actor::text,7));
 select * into previous from public.direct_messages where sender_id=actor and client_nonce=p_nonce;
 if found then
  if previous.conversation_id=p_conversation and previous.body=btrim(p_body) and previous.demand_id is not distinct from p_demand then return previous.id; end if;
  raise exception 'Identificador de envio já utilizado. Edite a mensagem e tente novamente.';
 end if;
 perform public.claim_direct_action('SEND');
 select * into thread from public.direct_conversations where id=p_conversation for update;
 if not exists(select 1 from public.profiles p where p.id=case when thread.member_low=actor then thread.member_high else thread.member_low end and p.status='ACTIVE') then
  raise exception 'Esta pessoa não está disponível para receber mensagens.';
 end if;
 -- A link carries only a demand ID, never fields from another sector.
 if p_demand is not null and not exists(select 1 from public.demands where id=p_demand) then raise exception 'Demanda não encontrada.'; end if;
 insert into public.direct_messages(conversation_id,sender_id,body,client_nonce,demand_id)
 values(p_conversation,actor,btrim(p_body),p_nonce,p_demand) returning id into result_id;
 return result_id;
end $$;

create function public.mark_direct_read(p_conversation uuid,p_message uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare target public.direct_messages;
begin
 if not public.is_direct_participant(p_conversation) then raise exception 'Conversa não autorizada.' using errcode='42501'; end if;
 perform 1 from public.direct_conversations where id=p_conversation for update;
 select * into target from public.direct_messages where id=p_message and conversation_id=p_conversation;
 if not found then raise exception 'Mensagem não encontrada.'; end if;
 insert into public.direct_reads(conversation_id,user_id,read_at,read_message_id) values(p_conversation,auth.uid(),target.created_at,target.id)
 on conflict(conversation_id,user_id) do update set read_at=excluded.read_at,read_message_id=excluded.read_message_id
 where (direct_reads.read_at,direct_reads.read_message_id)<(excluded.read_at,excluded.read_message_id);
end $$;
revoke all on function public.search_messaging_people(text),public.open_direct_conversation(uuid),public.get_direct_inbox(timestamptz,uuid,uuid),public.send_direct_message(uuid,text,uuid,uuid),public.mark_direct_read(uuid,uuid) from public,anon;
grant execute on function public.search_messaging_people(text),public.open_direct_conversation(uuid),public.get_direct_inbox(timestamptz,uuid,uuid),public.send_direct_message(uuid,text,uuid,uuid),public.mark_direct_read(uuid,uuid) to authenticated;
-- Realtime still authorizes each subscriber through the SELECT policy.
do $publication$
begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='direct_messages') then
  alter publication supabase_realtime add table public.direct_messages;
 end if;
end $publication$;
commit;
