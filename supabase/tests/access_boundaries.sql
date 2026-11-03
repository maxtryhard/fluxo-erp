-- Isolated test database only, after all migrations. Does not persist fixtures.
begin;
create temporary table access_actors as
select gen_random_uuid() id, role from unnest(array['ADMIN','COMERCIAL','FINANCEIRO','RH','GERENCIA','PENDING','REJECTED']) role;
grant select on access_actors to authenticated;
insert into auth.users(id,email,raw_user_meta_data)
select id,id::text||'@example.invalid',jsonb_build_object('full_name','Access fixture','role','ADMIN','status','ACTIVE') from access_actors;
-- Public signup metadata must never promote a user.
do $$ begin
  if exists(select 1 from public.profiles p join access_actors a using(id) where p.status<>'PENDING' or p.role<>'COMERCIAL') then
    raise exception 'Signup metadata granted access'; end if;
end $$;
update public.profiles p set role=case when a.role in ('PENDING','REJECTED') then 'COMERCIAL' else a.role end,
 status=case when a.role in ('PENDING','REJECTED') then a.role else 'ACTIVE' end
from access_actors a where p.id=a.id;
create temporary table access_demand(id uuid);
grant select on access_demand to authenticated;
select set_config('request.jwt.claim.sub',(select id::text from access_actors where role='COMERCIAL'),true);
insert into public.demands(client_name,title,description,budget_total,commercial_responsible_id)
select 'Fixture','Access boundary fixture','Isolated test demand',200,id from access_actors where role='COMERCIAL';
insert into access_demand select id from public.demands where title='Access boundary fixture';
select set_config('request.jwt.claim.sub',(select id::text from access_actors where role='ADMIN'),true);
update public.demands set payment_terms='30 dias',cost_estimate=100,invoiced_value=200,required_roles=array['Operador'] where id=(select id from access_demand);
insert into public.demand_history(demand_id,author_name,department,action,details)
select d.id,'Fixture',department,'Access fixture','Scoped event' from access_demand d cross join unnest(array['Comercial','Financeiro','RH']) department;
set local role authenticated;
do $$
declare actor record; d record; total integer; denied boolean;
begin
 for actor in select * from access_actors loop
  perform set_config('request.jwt.claim.sub',actor.id::text,true);
  -- Forged JWT metadata is not an authorization source.
  perform set_config('request.jwt.claims','{"role":"ADMIN","user_metadata":{"role":"ADMIN"}}',true);
  if actor.role in ('PENDING','REJECTED') then
    if exists(select 1 from public.get_visible_demands()) or public.can_read_finance() or public.can_read_people() or public.can_read_sector('SHARED') then
      raise exception 'Inactive account can read modules'; end if;
  else
    select * into d from public.get_visible_demands() where id=(select id from access_demand);
    if d.id is null then raise exception 'Missing demand for %',actor.role; end if;
    if (d.budget_total is not null) <> (actor.role<>'RH') then raise exception 'Budget boundary failed for %',actor.role; end if;
    if (d.payment_terms is not null) <> (actor.role in ('ADMIN','GERENCIA','FINANCEIRO')) then raise exception 'Finance boundary failed for %',actor.role; end if;
    if (d.required_roles is not null) <> (actor.role in ('ADMIN','GERENCIA','RH')) then raise exception 'HR boundary failed for %',actor.role; end if;
    select count(*) into total from public.get_visible_demand_history((select id from access_demand)) where action='Access fixture';
    if total <> (case when actor.role in ('ADMIN','GERENCIA') then 3 when actor.role='COMERCIAL' then 1 else 2 end) then raise exception 'History boundary failed for %',actor.role; end if;
  end if;
  denied:=false;
  begin perform budget_total from public.demands; exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Direct demand columns readable'; end if;
  if actor.role<>'ADMIN' then
    update public.profiles set role='ADMIN',status='ACTIVE' where id=actor.id;
    if found then raise exception 'Self promotion allowed'; end if;
  end if;
 end loop;
end $$;
reset role;
set local role anon;
do $$ declare denied boolean:=false; begin
 begin perform public.get_visible_demands(); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Anonymous demand RPC allowed'; end if;
end $$;
reset role;
rollback;
