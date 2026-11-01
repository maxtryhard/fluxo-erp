begin;
create table public.financial_batches (
  id uuid primary key,
  author_id uuid not null references public.profiles(id),
  request jsonb not null,
  created_at timestamptz not null default clock_timestamp()
);
create index financial_batches_author_time on public.financial_batches(author_id,created_at desc);
create table public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.financial_batches(id),
  demand_id uuid references public.demands(id),
  direction text not null check(direction in ('RECEIVABLE','PAYABLE')),
  description text not null check(char_length(btrim(description)) between 3 and 200),
  counterparty text not null check(char_length(btrim(counterparty)) between 2 and 200),
  amount_cents bigint not null check(amount_cents between 1 and 1000000000000),
  due_on date not null,
  installment_number integer not null check(installment_number between 1 and 60),
  installment_count integer not null check(installment_count between 1 and 60 and installment_number<=installment_count),
  notes text not null default '' check(char_length(notes)<=2000),
  settled_on date,
  settled_by uuid references public.profiles(id),
  cancelled_at timestamptz,
  cancellation_reason text check(char_length(btrim(cancellation_reason)) between 5 and 1000),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default clock_timestamp(),
  unique(batch_id,installment_number),
  check(not (settled_on is not null and cancelled_at is not null)),
  check((settled_on is null)=(settled_by is null)),
  check((cancelled_at is null)=(cancellation_reason is null))
);
create index financial_entries_due on public.financial_entries(direction,due_on);
create index financial_entries_settled on public.financial_entries(settled_on) where settled_on is not null;
create index financial_entries_demand on public.financial_entries(demand_id);
create table public.financial_entry_events (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.financial_entries(id),
  action text not null check(action in ('CREATED','SETTLED','CANCELLED')),
  author_id uuid not null references public.profiles(id),
  author_name text not null,
  details text not null,
  created_at timestamptz not null default clock_timestamp()
);
create index financial_entry_events_entry on public.financial_entry_events(entry_id,created_at);
alter table public.financial_entries enable row level security;
alter table public.financial_batches enable row level security;
alter table public.financial_entry_events enable row level security;
create function public.can_read_finance() returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce(public.current_profile_role() in ('ADMIN','GERENCIA','FINANCEIRO'),false)
$$;
revoke all on function public.can_read_finance() from public,anon;
grant execute on function public.can_read_finance() to authenticated;
create policy financial_entries_read on public.financial_entries for select to authenticated using(public.can_read_finance());
create policy financial_events_read on public.financial_entry_events for select to authenticated using(public.can_read_finance());
revoke all on public.financial_batches,public.financial_entries,public.financial_entry_events from public,anon,authenticated;
grant select on public.financial_entries,public.financial_entry_events to authenticated;

-- Manual account records, with exact cents and retry-safe monthly installments.
create function public.create_financial_entries(p_batch uuid,p_direction text,p_description text,p_counterparty text,p_total_cents bigint,p_first_due date,p_installments integer,p_demand uuid,p_notes text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare actor public.profiles; payload jsonb; previous public.financial_batches; item_id uuid; i integer; cents bigint; due date;
begin
  select * into actor from public.profiles where id=auth.uid() and status='ACTIVE' and role in ('ADMIN','FINANCEIRO');
  if actor.id is null then raise exception 'Somente Financeiro e Administração podem cadastrar contas.' using errcode='42501'; end if;
  if p_batch is null or p_direction is null or p_direction not in ('RECEIVABLE','PAYABLE')
    or p_description is null or char_length(btrim(p_description)) not between 3 and 200
    or p_counterparty is null or char_length(btrim(p_counterparty)) not between 2 and 200
    or p_total_cents is null or p_total_cents not between 1 and 1000000000000
    or p_first_due is null or p_installments is null or p_installments not between 1 and 60
    or p_total_cents<p_installments or p_notes is null or char_length(p_notes)>2000 then
    raise exception 'Confira descrição, cliente/fornecedor, valor, vencimento e parcelas.'; end if;
  payload:=jsonb_build_object('direction',p_direction,'description',btrim(p_description),'counterparty',btrim(p_counterparty),'total',p_total_cents,'due',p_first_due,'installments',p_installments,'demand',p_demand,'notes',btrim(p_notes));
  perform pg_advisory_xact_lock(hashtextextended(actor.id::text,1));
  select * into previous from public.financial_batches where id=p_batch;
  if found then
    if previous.author_id=actor.id and previous.request=payload then return p_batch; end if;
    raise exception 'Identificador de envio já utilizado. Reabra o formulário.';
  end if;
  if p_demand is not null and not exists(select 1 from public.demands where id=p_demand and status not in ('ORCAMENTO','CANCELADO')) then
    raise exception 'Vincule uma demanda aprovada pelo Comercial e não cancelada.'; end if;
  if exists(select 1 from public.financial_batches where author_id=actor.id and created_at>clock_timestamp()-interval '1 second') then
    raise exception 'Aguarde um segundo antes de cadastrar outra conta.'; end if;
  insert into public.financial_batches(id,author_id,request) values(p_batch,actor.id,payload);
  for i in 1..p_installments loop
    cents:=p_total_cents/p_installments + (case when i<=p_total_cents%p_installments then 1 else 0 end);
    due:=(p_first_due + make_interval(months=>i-1))::date;
    insert into public.financial_entries(batch_id,demand_id,direction,description,counterparty,amount_cents,due_on,installment_number,installment_count,notes,created_by)
    values(p_batch,p_demand,p_direction,btrim(p_description),btrim(p_counterparty),cents,due,i,p_installments,btrim(p_notes),actor.id) returning id into item_id;
    insert into public.financial_entry_events(entry_id,action,author_id,author_name,details)
    values(item_id,'CREATED',actor.id,actor.full_name,'Conta registrada · parcela '||i||'/'||p_installments);
  end loop;
  if p_demand is not null then
    insert into public.demand_history(demand_id,author_id,author_name,department,action,details)
    values(p_demand,actor.id,actor.full_name,'Financeiro','Conta financeira registrada',btrim(p_description)||' · '||p_installments||' parcela(s) · '||p_direction);
  end if;
  return p_batch;
end $$;

create function public.settle_financial_entry(p_id uuid,p_settled_on date) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare actor public.profiles; account public.financial_entries;
begin
  select * into actor from public.profiles where id=auth.uid() and status='ACTIVE' and role in ('ADMIN','FINANCEIRO');
  if actor.id is null then raise exception 'Baixa não autorizada.' using errcode='42501'; end if;
  if p_settled_on is null or p_settled_on>(now() at time zone 'America/Cuiaba')::date then raise exception 'Informe a data em que o pagamento ou recebimento ocorreu, sem data futura.'; end if;
  select * into account from public.financial_entries where id=p_id for update;
  if account.id is null or account.cancelled_at is not null then raise exception 'Conta não encontrada ou cancelada.'; end if;
  if account.settled_on is not null then raise exception 'Esta conta já recebeu baixa. Atualize a lista.'; end if;
  update public.financial_entries set settled_on=p_settled_on,settled_by=actor.id where id=p_id;
  insert into public.financial_entry_events(entry_id,action,author_id,author_name,details)
  values(p_id,'SETTLED',actor.id,actor.full_name,'Baixa integral registrada em '||p_settled_on);
  if account.demand_id is not null then
    insert into public.demand_history(demand_id,author_id,author_name,department,action,details)
    values(account.demand_id,actor.id,actor.full_name,'Financeiro','Baixa financeira registrada',account.description||' · parcela '||account.installment_number||'/'||account.installment_count||' · '||p_settled_on);
  end if;
end $$;

create function public.cancel_financial_entry(p_id uuid,p_reason text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare actor public.profiles; account public.financial_entries;
begin
  select * into actor from public.profiles where id=auth.uid() and status='ACTIVE' and role in ('ADMIN','FINANCEIRO');
  if actor.id is null then raise exception 'Cancelamento não autorizado.' using errcode='42501'; end if;
  if p_reason is null or char_length(btrim(p_reason)) not between 5 and 1000 then raise exception 'Informe um motivo de 5 a 1000 caracteres.'; end if;
  select * into account from public.financial_entries where id=p_id for update;
  if account.id is null or account.cancelled_at is not null or account.settled_on is not null then raise exception 'Somente contas em aberto podem ser canceladas.'; end if;
  update public.financial_entries set cancelled_at=clock_timestamp(),cancellation_reason=btrim(p_reason) where id=p_id;
  insert into public.financial_entry_events(entry_id,action,author_id,author_name,details)
  values(p_id,'CANCELLED',actor.id,actor.full_name,btrim(p_reason));
  if account.demand_id is not null then
    insert into public.demand_history(demand_id,author_id,author_name,department,action,details)
    values(account.demand_id,actor.id,actor.full_name,'Financeiro','Conta financeira cancelada',account.description||' · '||btrim(p_reason));
  end if;
end $$;
revoke all on function public.create_financial_entries(uuid,text,text,text,bigint,date,integer,uuid,text) from public,anon;
revoke all on function public.settle_financial_entry(uuid,date) from public,anon;
revoke all on function public.cancel_financial_entry(uuid,text) from public,anon;
grant execute on function public.create_financial_entries(uuid,text,text,text,bigint,date,integer,uuid,text) to authenticated;
grant execute on function public.settle_financial_entry(uuid,date) to authenticated;
grant execute on function public.cancel_financial_entry(uuid,text) to authenticated;
commit;
