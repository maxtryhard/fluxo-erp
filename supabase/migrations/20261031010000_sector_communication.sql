begin;
create table public.sector_messages (
  id uuid primary key default gen_random_uuid(),
  demand_id uuid references public.demands(id) on delete cascade,
  scope text not null check (scope in ('SHARED', 'FINANCEIRO', 'RH')),
  kind text not null check (kind in ('MESSAGE', 'ANALYSIS', 'QUESTION')),
  body text not null check (char_length(btrim(body)) between 3 and 4000),
  author_id uuid not null references public.profiles(id),
  author_name text not null,
  department text not null,
  created_at timestamptz not null default clock_timestamp()
);
create index sector_messages_thread on public.sector_messages(scope, demand_id, created_at desc, id desc);
alter table public.sector_messages enable row level security;
create or replace function public.can_read_sector(p_scope text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(public.current_profile_role() in ('ADMIN','GERENCIA') or
    (public.current_profile_role() is not null and p_scope = 'SHARED') or
    public.current_profile_role() = p_scope, false)
$$;
revoke all on function public.can_read_sector(text) from public, anon;
grant execute on function public.can_read_sector(text) to authenticated;
create policy sector_messages_read on public.sector_messages for select to authenticated
using (public.can_read_sector(scope));
revoke all on public.sector_messages from anon, authenticated;
grant select on public.sector_messages to authenticated;

create or replace function public.send_sector_message(p_demand_id uuid, p_scope text, p_kind text, p_body text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare actor public.profiles; message_id uuid;
begin
  select * into actor from public.profiles where id = auth.uid() and status = 'ACTIVE';
  if actor.id is null or not public.can_read_sector(p_scope) then
    raise exception 'Conversa não autorizada.' using errcode = '42501';
  end if;
  if p_kind not in ('MESSAGE','ANALYSIS','QUESTION') then raise exception 'Tipo de registro inválido.'; end if;
  -- Serializes sends per author to prevent bursts through parallel requests.
  perform pg_advisory_xact_lock(hashtextextended(actor.id::text, 0));
  if exists(select 1 from public.sector_messages where author_id = actor.id and created_at > clock_timestamp() - interval '2 seconds') then
    raise exception 'Aguarde alguns segundos antes de enviar outra mensagem.';
  end if;
  insert into public.sector_messages(demand_id, scope, kind, body, author_id, author_name, department)
  values (p_demand_id, p_scope, p_kind, btrim(p_body), actor.id, actor.full_name, actor.department)
  returning id into message_id;
  return message_id;
end $$;

-- A written handoff and the workflow update succeed or roll back together.
-- Invoker rights retain the existing workflow triggers and RLS restrictions.
create or replace function public.review_demand_with_note(p_id uuid, p_action text, p_note text, p_data jsonb)
returns void language plpgsql security invoker set search_path = public, pg_temp as $$
declare changed integer; note_scope text;
begin
  if p_note is null or char_length(btrim(p_note)) not between 10 and 4000 then
    raise exception 'Descreva a análise em 10 a 4000 caracteres.';
  end if;
  if p_action = 'COMMERCIAL' and public.current_profile_role() in ('ADMIN','COMERCIAL') then
    update public.demands set status = 'APROVADO_COMERCIAL' where id = p_id and status = 'ORCAMENTO';
    get diagnostics changed = row_count;
    note_scope := 'SHARED';
  elsif p_action = 'FINANCE' and public.current_profile_role() in ('ADMIN','FINANCEIRO') then
    if p_data is null or jsonb_typeof(p_data->'paymentTerms') is distinct from 'string'
      or jsonb_typeof(p_data->'costEstimate') is distinct from 'number'
      or jsonb_typeof(p_data->'invoicedValue') is distinct from 'number' then
      raise exception 'Preencha condição de pagamento, custo e valor faturado.';
    end if;
    if char_length(btrim(p_data->>'paymentTerms')) not between 1 and 1000 then
      raise exception 'Condição de pagamento inválida.';
    end if;
    update public.demands set payment_terms = p_data->>'paymentTerms',
      cost_estimate = (p_data->>'costEstimate')::numeric, invoiced_value = (p_data->>'invoicedValue')::numeric,
      financial_approved = true, status = 'ALOCACAO_RH' where id = p_id and status = 'APROVADO_COMERCIAL';
    get diagnostics changed = row_count;
    note_scope := 'FINANCEIRO';
  elsif p_action = 'HR' and public.current_profile_role() in ('ADMIN','RH') then
    if p_data is null or jsonb_typeof(p_data->'requiredRoles') is distinct from 'array'
      or jsonb_typeof(p_data->'assignedStaffCount') is distinct from 'number' then
      raise exception 'Preencha os perfis necessários e a quantidade de pessoas.';
    end if;
    if jsonb_array_length(p_data->'requiredRoles') not between 1 and 30 or exists (
      select 1 from jsonb_array_elements(p_data->'requiredRoles') as item
      where jsonb_typeof(item) <> 'string' or char_length(btrim(item #>> '{}')) not between 1 and 100
    ) then raise exception 'Perfis necessários inválidos.'; end if;
    update public.demands set required_roles = array(select jsonb_array_elements_text(p_data->'requiredRoles')),
      assigned_staff_count = (p_data->>'assignedStaffCount')::integer, rh_approved = true,
      status = 'EM_EXECUCAO' where id = p_id and status = 'ALOCACAO_RH';
    get diagnostics changed = row_count;
    note_scope := 'RH';
  else raise exception 'Revisão não autorizada.' using errcode = '42501';
  end if;
  if changed <> 1 then raise exception 'A demanda mudou de etapa. Atualize a lista.'; end if;
  perform public.send_sector_message(p_id, note_scope, 'ANALYSIS', p_note);
end $$;
revoke all on function public.send_sector_message(uuid,text,text,text) from public, anon;
revoke all on function public.review_demand_with_note(uuid,text,text,jsonb) from public, anon;
grant execute on function public.send_sector_message(uuid,text,text,text) to authenticated;
grant execute on function public.review_demand_with_note(uuid,text,text,jsonb) to authenticated;
commit;
