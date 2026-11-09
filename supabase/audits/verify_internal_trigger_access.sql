-- Run as an administrator. Catalog checks and read-only authorization smoke tests.
-- Does not create identities or change existing profiles/business records.
begin read only;
do $audit$
declare fn record; actor record; denied boolean;
begin
  for fn in select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('create_profile_for_new_auth_user','guard_demand_insert','guard_demand_update','write_demand_history','rls_auto_enable')
  loop
    if has_function_privilege('anon',fn.oid,'EXECUTE') or has_function_privilege('authenticated',fn.oid,'EXECUTE') then
      raise exception 'Internal function remains client-executable: %',fn.proname;
    end if;
  end loop;
  for fn in select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prorettype not in ('trigger'::regtype,'event_trigger'::regtype) and p.proname not in ('hr_peak_load','claim_direct_action')
  loop
    if not has_function_privilege('authenticated',fn.oid,'EXECUTE') or has_function_privilege('anon',fn.oid,'EXECUTE') then
      raise exception 'Application function grant changed: %',fn.proname;
    end if;
  end loop;
  for actor in select id,role from public.profiles where status='ACTIVE' loop
    perform set_config('request.jwt.claim.sub',actor.id::text,true);
    perform set_config('request.jwt.claims',jsonb_build_object('sub',actor.id,'role','authenticated')::text,true);
    execute 'set local role authenticated';
    if current_user<>'authenticated' or public.current_profile_role() is distinct from actor.role then
      raise exception 'Current profile resolution failed'; end if;
    if actor.role='FINANCEIRO' then
      if not public.can_read_finance() or public.can_read_people() or public.can_read_sector('RH') then
        raise exception 'Finance sector boundary failed'; end if;
      if exists(select 1 from public.get_visible_demands() where required_roles is not null or assigned_staff_count is not null or rh_approved is not null) then
        raise exception 'Finance can read HR fields'; end if;
    end if;
    perform count(*) from public.get_visible_demands();
    denied:=false;
    begin perform budget_total from public.demands; exception when insufficient_privilege then denied:=true; end;
    if not denied then raise exception 'Direct private column read permitted'; end if;
    execute 'reset role';
  end loop;
  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000000',true);
  perform set_config('request.jwt.claims','{"role":"authenticated","user_metadata":{"role":"ADMIN","status":"ACTIVE"}}',true);
  execute 'set local role authenticated';
  if public.current_profile_role() is not null or public.can_read_finance() or public.can_read_people() or public.can_read_sector('SHARED') or exists(select 1 from public.get_visible_demands()) then
    raise exception 'Unregistered identity authorized'; end if;
  execute 'reset role';
  execute 'set local role anon';
  denied:=false;
  begin perform public.get_visible_demands(); exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Anonymous demand RPC permitted'; end if;
  execute 'reset role';
end $audit$;
rollback;
select 'passed' as internal_trigger_access_verification;
