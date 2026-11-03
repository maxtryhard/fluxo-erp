-- Internal trigger functions are invoked by existing triggers, never as client RPCs.
-- Keep all application RPC/helper grants and trigger bindings intact.
begin;
revoke execute on function public.create_profile_for_new_auth_user() from public, anon, authenticated;
revoke execute on function public.guard_demand_insert() from public, anon, authenticated;
revoke execute on function public.guard_demand_update() from public, anon, authenticated;
revoke execute on function public.write_demand_history() from public, anon, authenticated;

-- This installation-specific event trigger is not present in every environment.
-- Preserve its owner, body, grants to service roles and ensure_rls binding.
do $migration$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    if (select prorettype from pg_proc where oid = 'public.rls_auto_enable()'::regprocedure) <> 'event_trigger'::regtype then
      raise exception 'Unexpected rls_auto_enable signature; inspect before changing permissions.';
    end if;
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $migration$;
commit;
