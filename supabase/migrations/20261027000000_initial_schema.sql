create sequence if not exists public.demand_code_seq start with 1;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null check (char_length(full_name) between 2 and 100),
  role text not null default 'COMERCIAL'
    check (role in ('ADMIN', 'COMERCIAL', 'FINANCEIRO', 'RH', 'GERENCIA')),
  department text not null default 'Comercial'
    check (department in ('Comercial', 'Financeiro', 'RH', 'Diretoria')),
  status text not null default 'PENDING'
    check (status in ('PENDING', 'ACTIVE', 'REJECTED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_email_lower_unique
  on public.profiles (lower(email));

create table if not exists public.demands (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default (
    'ORD-' || to_char(current_date, 'YYYY') || '-' ||
    lpad(nextval('public.demand_code_seq')::text, 3, '0')
  ),
  client_name text not null check (char_length(client_name) between 2 and 200),
  title text not null check (char_length(title) between 3 and 200),
  description text not null check (char_length(description) between 5 and 5000),
  status text not null default 'ORCAMENTO'
    check (status in (
      'ORCAMENTO', 'APROVADO_COMERCIAL', 'EM_ANALISE_FINANCEIRA', 'FATURADO',
      'ALOCACAO_RH', 'EM_EXECUCAO', 'ENTREGUE', 'CANCELADO'
    )),
  budget_total numeric(14, 2) not null check (budget_total > 0),
  commercial_responsible_id uuid not null references public.profiles (id),
  payment_terms text,
  invoiced_value numeric(14, 2) check (invoiced_value >= 0),
  cost_estimate numeric(14, 2) check (cost_estimate >= 0),
  financial_approved boolean not null default false,
  required_roles text[] not null default '{}',
  assigned_staff_count integer not null default 0 check (assigned_staff_count >= 0),
  rh_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.demand_history (
  id uuid primary key default gen_random_uuid(),
  demand_id uuid not null references public.demands (id) on delete cascade,
  timestamp timestamptz not null default now(),
  author_id uuid references public.profiles (id) on delete set null,
  author_name text not null,
  department text not null,
  action text not null,
  details text not null default ''
);

create index if not exists demands_status_created_at_idx
  on public.demands (status, created_at desc);
create index if not exists demand_history_demand_timestamp_idx
  on public.demand_history (demand_id, timestamp desc);

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role
  from public.profiles
  where id = (select auth.uid())
    and status = 'ACTIVE'
  limit 1
$$;

create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and status = 'ACTIVE'
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.current_profile_role() = 'ADMIN', false)
$$;

revoke all on function public.current_profile_role() from public, anon;
revoke all on function public.is_active_member() from public, anon;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.is_active_member() to authenticated;
grant execute on function public.is_admin() to authenticated;

create or replace function public.create_profile_for_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    lower(new.email),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Usuário')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.create_profile_for_new_auth_user();

create or replace function public.guard_demand_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_role text := public.current_profile_role();
begin
  new.updated_at := now();

  if actor_role = 'ADMIN' then
    return new;
  end if;

  if actor_role = 'COMERCIAL'
    and old.status = 'ORCAMENTO'
    and new.status = 'APROVADO_COMERCIAL'
    and (to_jsonb(new) - array['status', 'updated_at']) = (to_jsonb(old) - array['status', 'updated_at'])
  then
    return new;
  end if;

  if actor_role = 'FINANCEIRO'
    and old.status = 'APROVADO_COMERCIAL'
    and new.status in ('ALOCACAO_RH', 'CANCELADO')
    and (to_jsonb(new) - array['payment_terms', 'cost_estimate', 'invoiced_value', 'financial_approved', 'status', 'updated_at'])
      = (to_jsonb(old) - array['payment_terms', 'cost_estimate', 'invoiced_value', 'financial_approved', 'status', 'updated_at'])
    and new.financial_approved = (new.status = 'ALOCACAO_RH')
  then
    return new;
  end if;

  if actor_role = 'RH'
    and old.status = 'ALOCACAO_RH'
    and old.financial_approved
    and new.status in ('ALOCACAO_RH', 'EM_EXECUCAO')
    and (to_jsonb(new) - array['required_roles', 'assigned_staff_count', 'rh_approved', 'status', 'updated_at'])
      = (to_jsonb(old) - array['required_roles', 'assigned_staff_count', 'rh_approved', 'status', 'updated_at'])
    and new.rh_approved = (new.status = 'EM_EXECUCAO')
  then
    return new;
  end if;

  raise exception 'Transição ou alteração de demanda não autorizada para o perfil atual.'
    using errcode = '42501';
end;
$$;

create or replace function public.guard_demand_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_role text := public.current_profile_role();
begin
  if actor_role is null
    or actor_role not in ('ADMIN', 'COMERCIAL')
    or new.commercial_responsible_id is distinct from (select auth.uid())
    or new.status <> 'ORCAMENTO'
    or new.financial_approved
    or new.rh_approved
    or new.payment_terms is not null
    or new.invoiced_value is not null
    or new.cost_estimate is not null
    or cardinality(new.required_roles) <> 0
    or new.assigned_staff_count <> 0
  then
    raise exception 'A demanda deve iniciar somente com dados comerciais e pelo usuário autenticado.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function public.write_demand_history()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor public.profiles%rowtype;
  event_action text;
  event_details text;
begin
  select * into actor
  from public.profiles
  where id = (select auth.uid());

  if tg_op = 'INSERT' then
    event_action := 'Orçamento criado';
    event_details := 'Demanda registrada no fluxo integrado.';
  elsif new.status is distinct from old.status then
    case new.status
      when 'APROVADO_COMERCIAL' then
        event_action := 'Proposta aprovada pelo Comercial';
        event_details := 'Demanda encaminhada para análise Financeira.';
      when 'ALOCACAO_RH' then
        event_action := 'Análise Financeira aprovada';
        event_details := 'Demanda encaminhada para alocação de RH.';
      when 'CANCELADO' then
        event_action := 'Demanda cancelada pelo Financeiro';
        event_details := 'Análise Financeira não aprovada.';
      when 'EM_EXECUCAO' then
        event_action := 'Equipe alocada pelo RH';
        event_details := 'Demanda liberada para execução.';
      else
        event_action := 'Status da demanda atualizado';
        event_details := 'Novo status: ' || new.status;
    end case;
  elsif public.current_profile_role() = 'FINANCEIRO' then
    event_action := 'Dados Financeiros atualizados';
    event_details := 'Condições, custos e faturamento foram revisados.';
  elsif public.current_profile_role() = 'ADMIN' then
    event_action := 'Demanda atualizada pela Administração';
    event_details := 'Dados ou status foram atualizados por um administrador.';
  else
    event_action := 'Dados de RH atualizados';
    event_details := 'Perfis e quantidade de pessoas alocadas foram revisados.';
  end if;

  insert into public.demand_history (
    demand_id, author_id, author_name, department, action, details
  )
  values (
    new.id,
    actor.id,
    coalesce(actor.full_name, 'Sistema'),
    coalesce(actor.department, 'Sistema'),
    event_action,
    event_details
  );

  return new;
end;
$$;

drop trigger if exists guard_demand_update_trigger on public.demands;
drop trigger if exists guard_demand_insert_trigger on public.demands;
create trigger guard_demand_insert_trigger
  before insert on public.demands
  for each row execute function public.guard_demand_insert();

create trigger guard_demand_update_trigger
  before update on public.demands
  for each row execute function public.guard_demand_update();

drop trigger if exists demand_history_after_insert on public.demands;
create trigger demand_history_after_insert
  after insert on public.demands
  for each row execute function public.write_demand_history();

drop trigger if exists demand_history_after_update on public.demands;
create trigger demand_history_after_update
  after update on public.demands
  for each row execute function public.write_demand_history();

alter table public.profiles enable row level security;
alter table public.demands enable row level security;
alter table public.demand_history enable row level security;

drop policy if exists profiles_read_self_or_admin on public.profiles;
create policy profiles_read_self_or_admin
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update
  on public.profiles for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists demands_read_active on public.demands;
create policy demands_read_active
  on public.demands for select to authenticated
  using ((select public.is_active_member()));

drop policy if exists demands_insert_commercial on public.demands;
create policy demands_insert_commercial
  on public.demands for insert to authenticated
  with check (
    (select public.is_active_member())
    and (select public.current_profile_role()) in ('ADMIN', 'COMERCIAL')
    and commercial_responsible_id = (select auth.uid())
    and status = 'ORCAMENTO'
  );

drop policy if exists demands_update_workflow on public.demands;
create policy demands_update_workflow
  on public.demands for update to authenticated
  using (
    (select public.is_active_member())
    and (
      (select public.is_admin())
      or ((select public.current_profile_role()) = 'COMERCIAL' and status = 'ORCAMENTO')
      or ((select public.current_profile_role()) = 'FINANCEIRO' and status = 'APROVADO_COMERCIAL')
      or ((select public.current_profile_role()) = 'RH' and status = 'ALOCACAO_RH' and financial_approved)
    )
  )
  with check (
    (select public.is_active_member())
    and (
      (select public.is_admin())
      or ((select public.current_profile_role()) = 'COMERCIAL' and status = 'APROVADO_COMERCIAL')
      or ((select public.current_profile_role()) = 'FINANCEIRO' and status in ('ALOCACAO_RH', 'CANCELADO'))
      or ((select public.current_profile_role()) = 'RH' and status in ('ALOCACAO_RH', 'EM_EXECUCAO'))
    )
  );

drop policy if exists demand_history_read_active on public.demand_history;
create policy demand_history_read_active
  on public.demand_history for select to authenticated
  using ((select public.is_active_member()));

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.demands to authenticated;
grant select on public.demand_history to authenticated;
grant usage, select on sequence public.demand_code_seq to authenticated;
revoke all on public.profiles, public.demands, public.demand_history from anon;

comment on table public.profiles is 'Perfil e estado de aprovação vinculados à identidade Supabase Auth.';
comment on table public.demands is 'Registro central da demanda e seus dados Comercial, Financeiro e RH.';
comment on table public.demand_history is 'Histórico append-only criado por triggers do banco.';
