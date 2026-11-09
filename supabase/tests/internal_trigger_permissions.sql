-- Isolated database only, after all migrations. No production fixtures.
begin;
do $test$
declare fn record;
begin
  for fn in
    select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in (
      'create_profile_for_new_auth_user','guard_demand_insert',
      'guard_demand_update','write_demand_history','rls_auto_enable'
    )
  loop
    if has_function_privilege('anon',fn.oid,'EXECUTE') or has_function_privilege('authenticated',fn.oid,'EXECUTE')
      or exists(select 1 from aclexplode(coalesce((select proacl from pg_proc where oid=fn.oid),acldefault('f',(select proowner from pg_proc where oid=fn.oid)))) a where a.grantee=0 and a.privilege_type='EXECUTE') then
      raise exception 'Client can execute internal function %',fn.proname;
    end if;
  end loop;
  -- Accessible RPCs and RLS helpers must remain executable.
  for fn in
    select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prorettype not in ('trigger'::regtype,'event_trigger'::regtype)
      and p.proname not in ('hr_peak_load','claim_direct_action')
  loop
    if not has_function_privilege('authenticated',fn.oid,'EXECUTE') or has_function_privilege('anon',fn.oid,'EXECUTE') then
      raise exception 'Application function grant changed: %',fn.proname;
    end if;
  end loop;
end $test$;
-- Auth runs this insert through its service role; its existing trigger still creates
-- a pending profile even when metadata attempts to promote it.
create temporary table trigger_test_actor(id uuid);
insert into trigger_test_actor values(gen_random_uuid());
insert into auth.users(id,email,raw_user_meta_data)
select id,id::text||'@example.invalid','{"full_name":"Trigger fixture","role":"ADMIN","status":"ACTIVE"}'::jsonb from trigger_test_actor;
do $test$ begin
  if not exists(select 1 from public.profiles p join trigger_test_actor t using(id) where p.status='PENDING' and p.role='COMERCIAL') then
    raise exception 'Signup trigger stopped creating pending profiles'; end if;
end $test$;
rollback;
-- The communication/people/finance suites also exercise demand insert/update/history
-- triggers as authenticated users, whose direct function EXECUTE is revoked.
