-- Administrator-only smoke test; no identities/messages are created.
begin read only;
do $audit$
declare actor record;denied boolean;unknown_thread uuid:=gen_random_uuid();name text;
begin
 foreach name in array array['direct_conversations','direct_messages','direct_reads','direct_action_limits'] loop
  if not(select relrowsecurity from pg_class where oid=('public.'||name)::regclass) or has_table_privilege('anon','public.'||name,'SELECT')
   or has_table_privilege('authenticated','public.'||name,'INSERT') or has_table_privilege('authenticated','public.'||name,'UPDATE') or has_table_privilege('authenticated','public.'||name,'DELETE') then raise exception 'Private table privilege/RLS mismatch';end if;
 end loop;
 if has_function_privilege('anon','public.claim_direct_action(text)','EXECUTE') or has_function_privilege('authenticated','public.claim_direct_action(text)','EXECUTE') then raise exception 'Internal limiter exposed';end if;
 for actor in select id from public.profiles where status='ACTIVE' loop
  perform set_config('request.jwt.claim.sub',actor.id::text,true);
  execute 'set local role authenticated';
  if exists(select 1 from public.direct_conversations where auth.uid() not in(member_low,member_high)) then raise exception 'Outsider conversation visible';end if;
  perform count(*) from public.get_direct_inbox();
  denied:=false;
  begin perform public.send_direct_message(unknown_thread,'Unauthorized audit message',gen_random_uuid(),null);exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'Unknown thread accepted a message';end if;
  execute 'reset role';
 end loop;
 perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000000',true);
 execute 'set local role authenticated';
 denied:=false;
 begin perform public.search_messaging_people('Audit fixture not registered');exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Unregistered identity accessed directory';end if;
 execute 'reset role';
 execute 'set local role anon';
 denied:=false;
 begin perform public.get_direct_inbox();exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Anonymous inbox allowed';end if;
 execute 'reset role';
end $audit$;
rollback;
select 'passed' as private_conversations_read_only_verification;
