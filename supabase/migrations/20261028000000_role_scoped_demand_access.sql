create or replace function public.get_visible_demands()
returns table (
  id uuid,
  code text,
  client_name text,
  title text,
  description text,
  status text,
  budget_total numeric,
  commercial_responsible_id uuid,
  payment_terms text,
  invoiced_value numeric,
  cost_estimate numeric,
  financial_approved boolean,
  required_roles text[],
  assigned_staff_count integer,
  rh_approved boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  actor_role text := public.current_profile_role();
begin
  if actor_role is null then
    return;
  end if;

  return query
  select
    d.id,
    d.code,
    d.client_name,
    d.title,
    d.description,
    d.status,
    case when actor_role <> 'RH' then d.budget_total end,
    d.commercial_responsible_id,
    case when actor_role in ('ADMIN', 'GERENCIA', 'FINANCEIRO') then d.payment_terms end,
    case when actor_role in ('ADMIN', 'GERENCIA', 'FINANCEIRO') then d.invoiced_value end,
    case when actor_role in ('ADMIN', 'GERENCIA', 'FINANCEIRO') then d.cost_estimate end,
    case when actor_role in ('ADMIN', 'GERENCIA', 'FINANCEIRO') then d.financial_approved end,
    case when actor_role in ('ADMIN', 'GERENCIA', 'RH') then d.required_roles end,
    case when actor_role in ('ADMIN', 'GERENCIA', 'RH') then d.assigned_staff_count end,
    case when actor_role in ('ADMIN', 'GERENCIA', 'RH') then d.rh_approved end,
    d.created_at,
    d.updated_at
  from public.demands as d
  order by d.created_at desc;
end;
$function$;

create or replace function public.get_visible_demand_history(p_demand_id uuid)
returns table (
  id uuid,
  demand_id uuid,
  "timestamp" timestamptz,
  author_id uuid,
  author_name text,
  department text,
  action text,
  details text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  actor_role text := public.current_profile_role();
begin
  if actor_role is null then
    return;
  end if;

  return query
  select
    h.id,
    h.demand_id,
    h.timestamp,
    h.author_id,
    h.author_name,
    h.department,
    h.action,
    h.details
  from public.demand_history as h
  where h.demand_id = p_demand_id
    and (
      actor_role in ('ADMIN', 'GERENCIA')
      or (actor_role = 'COMERCIAL' and h.department = 'Comercial')
      or (actor_role = 'FINANCEIRO' and h.department in ('Comercial', 'Financeiro'))
      or (actor_role = 'RH' and h.department in ('Comercial', 'RH'))
    )
  order by h.timestamp asc;
end;
$function$;

revoke all on function public.get_visible_demands() from public, anon, authenticated;
revoke all on function public.get_visible_demand_history(uuid) from public, anon, authenticated;
grant execute on function public.get_visible_demands() to authenticated;
grant execute on function public.get_visible_demand_history(uuid) to authenticated;

revoke select on public.demands from public, anon, authenticated;
grant select (id, status) on public.demands to authenticated;

revoke select on public.demand_history from public, anon, authenticated;
drop policy if exists demand_history_read_active on public.demand_history;
drop policy if exists demand_history_read_areas on public.demand_history;
create policy demand_history_read_areas
  on public.demand_history for select to authenticated
  using (
    (select public.is_admin())
    or (select public.current_profile_role()) = 'GERENCIA'
    or (
      (select public.current_profile_role()) = 'COMERCIAL'
      and department = 'Comercial'
    )
    or (
      (select public.current_profile_role()) = 'FINANCEIRO'
      and department in ('Comercial', 'Financeiro')
    )
    or (
      (select public.current_profile_role()) = 'RH'
      and department in ('Comercial', 'RH')
    )
  );
