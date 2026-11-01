begin;
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 100),
  job_title text not null check (char_length(btrim(job_title)) between 2 and 100),
  skills text[] not null default '{}',
  capacity_percent integer not null default 100 check (capacity_percent in (0,50,100)),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.team_allocations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id),
  demand_id uuid not null references public.demands(id),
  assignment_role text not null check (char_length(btrim(assignment_role)) between 2 and 100),
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  dedication integer not null check (dedication between 1 and 100),
  cancelled_at timestamptz,
  cancellation_reason text check (char_length(btrim(cancellation_reason)) between 5 and 1000),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index team_allocations_employee_period on public.team_allocations(employee_id,starts_on,ends_on) where cancelled_at is null;
create index team_allocations_demand on public.team_allocations(demand_id);
alter table public.employees enable row level security;
alter table public.team_allocations enable row level security;
create function public.can_read_people() returns boolean language sql stable security definer set search_path = public,pg_temp as $$
  select coalesce(public.current_profile_role() in ('ADMIN','GERENCIA','RH'),false)
$$;
revoke all on function public.can_read_people() from public,anon;
grant execute on function public.can_read_people() to authenticated;
create policy employees_read_hr on public.employees for select to authenticated using (public.can_read_people());
create policy allocations_read_hr on public.team_allocations for select to authenticated using (public.can_read_people());
revoke all on public.employees, public.team_allocations from public,anon,authenticated;
grant select on public.employees,public.team_allocations to authenticated;

-- Check every point where load can increase, rather than adding nonconcurrent jobs.
create function public.hr_peak_load(p_employee uuid,p_start date,p_end date)
returns integer language sql stable security definer set search_path = public,pg_temp as $$
  with reservations as (
    select a.starts_on,a.ends_on,a.dedication from public.team_allocations a
    join public.demands d on d.id = a.demand_id
    where a.employee_id = p_employee and a.cancelled_at is null
      and d.status not in ('ENTREGUE','CANCELADO') and a.ends_on >= p_start and a.starts_on <= p_end
  ), boundaries as (
    select p_start as day union select starts_on from reservations where starts_on >= p_start
  ) select coalesce(max((select coalesce(sum(r.dedication),0) from reservations r where b.day between r.starts_on and r.ends_on)),0)::integer from boundaries b
$$;
revoke all on function public.hr_peak_load(uuid,date,date) from public,anon,authenticated;

create function public.save_employee(p_id uuid,p_name text,p_job_title text,p_skills text[],p_capacity integer,p_active boolean)
returns uuid language plpgsql security definer set search_path = public,pg_temp as $$
declare result_id uuid;
begin
  if public.current_profile_role() is null or public.current_profile_role() not in ('ADMIN','RH') then
    raise exception 'Somente RH e Administração podem alterar a equipe.' using errcode='42501';
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 2 and 100
    or p_job_title is null or char_length(btrim(p_job_title)) not between 2 and 100
    or p_capacity is null or p_capacity not in (0,50,100) or p_active is null then raise exception 'Confira nome, função e disponibilidade.'; end if;
  if p_skills is null or cardinality(p_skills)>30 or exists(select 1 from unnest(p_skills) s where s is null or char_length(btrim(s)) not between 1 and 100) then
    raise exception 'Informe até 30 competências, com até 100 caracteres cada.';
  end if;
  if p_id is null then
    insert into public.employees(name,job_title,skills,capacity_percent,active)
    values(btrim(p_name),btrim(p_job_title),p_skills,p_capacity,p_active) returning id into result_id;
  else
    perform 1 from public.employees where id=p_id for update;
    if not found then raise exception 'Colaborador não encontrado.'; end if;
    if public.hr_peak_load(
      p_id,
      (now() at time zone 'America/Cuiaba')::date,
      '9999-12-31'::date
    ) > (case when p_active then p_capacity else 0 end) then
      raise exception 'Há alocações atuais ou futuras acima desta disponibilidade. Reorganize as alocações primeiro.';
    end if;
    update public.employees set name=btrim(p_name),job_title=btrim(p_job_title),skills=p_skills,capacity_percent=p_capacity,active=p_active,updated_at=now()
    where id=p_id returning id into result_id;
  end if;
  return result_id;
end $$;

create function public.allocate_employee(p_employee uuid,p_demand uuid,p_role text,p_start date,p_end date,p_dedication integer)
returns uuid language plpgsql security definer set search_path = public,pg_temp as $$
declare member public.employees; demand_status text; allocation_id uuid;
begin
  if public.current_profile_role() is null or public.current_profile_role() not in ('ADMIN','RH') then
    raise exception 'Alocação não autorizada.' using errcode='42501'; end if;
  if p_start is null or p_end is null or p_end<p_start or p_start<(now() at time zone 'America/Cuiaba')::date
    or p_dedication is null or p_dedication not between 1 and 100
    or p_role is null or char_length(btrim(p_role)) not between 2 and 100 then raise exception 'Confira função, período e dedicação. O início não pode estar no passado.'; end if;
  select * into member from public.employees where id=p_employee for update;
  if member.id is null or not member.active or member.capacity_percent=0 then raise exception 'Colaborador indisponível ou inativo.'; end if;
  select status into demand_status from public.demands where id=p_demand for share;
  if demand_status is distinct from 'ALOCACAO_RH' then raise exception 'A demanda precisa estar aguardando alocação de RH.'; end if;
  if exists(select 1 from public.team_allocations where employee_id=p_employee and demand_id=p_demand and cancelled_at is null and starts_on<=p_end and ends_on>=p_start) then
    raise exception 'Este colaborador já está alocado nesta demanda no período.'; end if;
  if public.hr_peak_load(p_employee,p_start,p_end)+p_dedication>member.capacity_percent then
    raise exception 'Conflito de alocação: a dedicação supera a disponibilidade em parte do período.'; end if;
  insert into public.team_allocations(employee_id,demand_id,assignment_role,starts_on,ends_on,dedication,created_by)
  values(p_employee,p_demand,btrim(p_role),p_start,p_end,p_dedication,auth.uid()) returning id into allocation_id;
  insert into public.demand_history(demand_id,author_id,author_name,department,action,details)
  select p_demand,p.id,p.full_name,'RH','Colaborador alocado',member.name || ' · ' || btrim(p_role) || ' · ' || p_dedication || '% · ' || p_start || ' a ' || p_end
  from public.profiles p where p.id=auth.uid();
  return allocation_id;
end $$;

create function public.cancel_team_allocation(p_id uuid,p_reason text) returns void
language plpgsql security definer set search_path = public,pg_temp as $$
declare allocation public.team_allocations; member_name text; demand_status text;
begin
  if public.current_profile_role() is null or public.current_profile_role() not in ('ADMIN','RH') then raise exception 'Cancelamento não autorizado.' using errcode='42501'; end if;
  if p_reason is null or char_length(btrim(p_reason)) not between 5 and 1000 then raise exception 'Informe um motivo de 5 a 1000 caracteres.'; end if;
  select * into allocation from public.team_allocations where id=p_id;
  if allocation.id is null then raise exception 'Alocação não encontrada.'; end if;
  select name into member_name from public.employees where id=allocation.employee_id for update;
  -- Use the same lock order as allocation (employee, then demand).
  select status into demand_status from public.demands where id=allocation.demand_id for share;
  if allocation.ends_on < (now() at time zone 'America/Cuiaba')::date or demand_status in ('ENTREGUE','CANCELADO') then
    raise exception 'Alocações encerradas são preservadas como histórico.';
  end if;
  update public.team_allocations set cancelled_at=clock_timestamp(),cancellation_reason=btrim(p_reason) where id=p_id and cancelled_at is null;
  if not found then raise exception 'A alocação já foi cancelada.'; end if;
  insert into public.demand_history(demand_id,author_id,author_name,department,action,details)
  select allocation.demand_id,p.id,p.full_name,'RH','Alocação cancelada',member_name || ' · ' || btrim(p_reason)
  from public.profiles p where p.id=auth.uid();
end $$;

-- A dedicated HR entry point; existing Commercial/Financial review stays untouched.
create function public.confirm_hr_team(p_demand uuid,p_note text) returns void
language plpgsql security definer set search_path = public,pg_temp as $$
declare people_count integer; team_roles text[];
begin
  if public.current_profile_role() is null or public.current_profile_role() not in ('ADMIN','RH') then raise exception 'Confirmação não autorizada.' using errcode='42501'; end if;
  perform 1 from public.demands where id=p_demand and status='ALOCACAO_RH' for update;
  if not found then raise exception 'A demanda não está aguardando alocação de RH.'; end if;
  select count(distinct a.employee_id)::integer,array_agg(distinct a.assignment_role)
  into people_count,team_roles from public.team_allocations a where a.demand_id=p_demand and a.cancelled_at is null and a.ends_on>=(now() at time zone 'America/Cuiaba')::date;
  if people_count=0 then raise exception 'Aloque ao menos um colaborador antes de confirmar a equipe.'; end if;
  perform public.review_demand_with_note(p_demand,'HR',p_note,jsonb_build_object('requiredRoles',team_roles,'assignedStaffCount',people_count));
end $$;
revoke all on function public.save_employee(uuid,text,text,text[],integer,boolean) from public,anon;
revoke all on function public.allocate_employee(uuid,uuid,text,date,date,integer) from public,anon;
revoke all on function public.cancel_team_allocation(uuid,text) from public,anon;
revoke all on function public.confirm_hr_team(uuid,text) from public,anon;
grant execute on function public.save_employee(uuid,text,text,text[],integer,boolean) to authenticated;
grant execute on function public.allocate_employee(uuid,uuid,text,date,date,integer) to authenticated;
grant execute on function public.cancel_team_allocation(uuid,text) to authenticated;
grant execute on function public.confirm_hr_team(uuid,text) to authenticated;
commit;
