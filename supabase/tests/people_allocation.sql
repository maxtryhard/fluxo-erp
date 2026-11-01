-- Isolated Supabase test DB only. All fixtures and mutations are rolled back.
begin;
create temporary table people_test_actors as
select gen_random_uuid() as id, role from unnest(array['ADMIN','RH','GERENCIA','COMERCIAL','FINANCEIRO','PENDING']) as role;
grant select on people_test_actors to authenticated;
insert into auth.users(id,email,raw_user_meta_data)
select id,id::text || '@example.invalid','{"full_name":"People test fixture"}'::jsonb from people_test_actors;
update public.profiles p set role=case when a.role='PENDING' then 'RH' else a.role end,
status=case when a.role='PENDING' then 'PENDING' else 'ACTIVE' end from people_test_actors a where p.id=a.id;

create function pg_temp.expect_people_failure(statement text) returns void language plpgsql as $$
begin
  begin
    execute statement;
  exception when raise_exception or insufficient_privilege or check_violation then return;
  end;
  raise exception 'Expected rejection, but operation succeeded: %',statement;
end $$;

-- Fixture demands use the existing insert and update guards.
select set_config('request.jwt.claim.sub',(select id::text from people_test_actors where role='ADMIN'),true);
create temporary table people_test_demands(id uuid);
with inserted as (
 insert into public.demands(client_name,title,description,budget_total,commercial_responsible_id)
 select 'Test fixture','People allocation fixture','Isolated allocation test',100,auth.uid() from generate_series(1,3)
 returning id
) insert into people_test_demands select id from inserted;
update public.demands set status='ALOCACAO_RH',financial_approved=true where id in(select id from people_test_demands);
grant select on people_test_demands to authenticated;

set local role authenticated;
do $$
declare person uuid; first_allocation uuid; second_allocation uuid; target uuid; other_target uuid;
  actor record; expected integer; actual integer; business_today date := (now() at time zone 'America/Cuiaba')::date;
begin
  perform set_config('request.jwt.claim.sub',(select id::text from people_test_actors where role='RH'),true);
  select id into target from people_test_demands order by id limit 1;
  select id into other_target from people_test_demands order by id offset 1 limit 1;
  person:=public.save_employee(null,'Fixture employee','Test function',array['Test skill'],100,true);
  first_allocation:=public.allocate_employee(person,target,'Test function',business_today,business_today+2,60);
  -- Same demand cannot reserve the same person twice over an overlapping period.
  perform pg_temp.expect_people_failure(format('select public.allocate_employee(%L,%L,%L,%L,%L,10)',person,target,'Test function',business_today,business_today+2));
  -- Aggregate overload across demands is rejected.
  perform pg_temp.expect_people_failure(format('select public.allocate_employee(%L,%L,%L,%L,%L,50)',person,other_target,'Test function',business_today,business_today+2));
  second_allocation:=public.allocate_employee(person,other_target,'Test function',business_today,business_today+2,40);
  -- Sequential reservations do not count as simultaneous load.
  perform public.allocate_employee(person,other_target,'Test function',business_today+3,business_today+5,100);
  perform pg_temp.expect_people_failure(format('select public.save_employee(%L,%L,%L,array[]::text[],50,true)',person,'Fixture employee','Test function'));
  perform pg_temp.expect_people_failure(format('select public.save_employee(%L,%L,%L,array[]::text[],100,false)',person,'Fixture employee','Test function'));
  perform public.cancel_team_allocation(second_allocation,'Isolated cancellation test');
  perform pg_temp.expect_people_failure(format('select public.cancel_team_allocation(%L,%L)',second_allocation,'Duplicate cancellation'));
  -- The dedicated confirmation derives count/roles from real allocations.
  perform public.confirm_hr_team(target,'Equipe validada no teste de integração.');
  if not exists(select 1 from public.demands where id=target and status='EM_EXECUCAO') then raise exception 'HR confirmation did not advance demand'; end if;
  if not exists(select 1 from public.team_allocations where id=first_allocation and cancelled_at is null) then raise exception 'Confirmation removed allocation'; end if;

  for actor in select * from people_test_actors loop
    perform set_config('request.jwt.claim.sub',actor.id::text,true);
    expected:=case when actor.role in('ADMIN','RH','GERENCIA') then 1 else 0 end;
    select count(*) into actual from public.employees where id=person;
    if actual<>expected then raise exception 'Employee visibility failed for %',actor.role; end if;
    select count(distinct employee_id) into actual from public.team_allocations where employee_id=person;
    if actual<>expected then raise exception 'Allocation visibility failed for %',actor.role; end if;
    if actor.role not in('ADMIN','RH') then
      perform pg_temp.expect_people_failure('select public.save_employee(null,''Forbidden fixture'',''Test function'',array[]::text[],100,true)');
      perform pg_temp.expect_people_failure(format('select public.cancel_team_allocation(%L,%L)',first_allocation,'Unauthorized cancellation'));
      perform pg_temp.expect_people_failure(format('select public.confirm_hr_team(%L,%L)',other_target,'Unauthorized team confirmation'));
    end if;
  end loop;
  if has_table_privilege('authenticated','public.employees','INSERT') or has_table_privilege('authenticated','public.employees','UPDATE')
    or has_table_privilege('authenticated','public.team_allocations','INSERT') or has_table_privilege('authenticated','public.team_allocations','DELETE') then
    raise exception 'Direct staffing mutations must not be granted'; end if;
end $$;
reset role;
rollback;
