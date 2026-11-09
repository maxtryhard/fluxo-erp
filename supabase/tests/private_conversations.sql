-- Isolated database only. Fixtures never persist.
begin;
create temporary table dm_actors as select gen_random_uuid() id,role from unnest(array['COMERCIAL','FINANCEIRO','RH','GERENCIA','ADMIN','PENDING'])role;
grant select on dm_actors to authenticated;
insert into auth.users(id,email,raw_user_meta_data) select id,id::text||'@example.invalid','{"full_name":"Messaging fixture"}'::jsonb from dm_actors;
update public.profiles p set role=case when a.role='PENDING' then 'COMERCIAL' else a.role end,status=case when a.role='PENDING' then 'PENDING' else 'ACTIVE' end from dm_actors a where a.id=p.id;
create temporary table dm_fixture(conversation uuid,message uuid,nonce uuid,demand uuid);
grant select,insert,update on dm_fixture to authenticated;
set local role authenticated;
do $test$
declare commercial uuid;finance uuid;pending uuid;thread uuid;msg uuid;nonce uuid:=gen_random_uuid();linked uuid;denied boolean;actual integer;
begin
 select id into commercial from dm_actors where role='COMERCIAL'; select id into finance from dm_actors where role='FINANCEIRO';select id into pending from dm_actors where role='PENDING';
 perform set_config('request.jwt.claim.sub',commercial::text,true);
 if (select count(*) from public.search_messaging_people('Messaging fixture'))<>4 then raise exception 'Directory exposed pending account or omitted active users';end if;
 denied:=false;begin perform public.search_messaging_people('Messaging fixture');exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'Directory throttle missing';end if;
 denied:=false;begin perform public.open_direct_conversation(commercial);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Self conversation allowed';end if;
 denied:=false;begin perform public.open_direct_conversation(pending);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Pending recipient allowed';end if;
 thread:=public.open_direct_conversation(finance);
 insert into public.demands(client_name,title,description,budget_total,commercial_responsible_id) values('Fixture','Linked demand fixture','Direct message context fixture',100,commercial) returning id into linked;
 msg:=public.send_direct_message(thread,'Mensagem privada de teste',nonce,linked);
 if public.send_direct_message(thread,'Mensagem privada de teste',nonce,linked)<>msg then raise exception 'Retry duplicated message';end if;
 denied:=false;begin perform public.send_direct_message(thread,'Different payload',nonce,null);exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'Nonce payload mismatch accepted';end if;
 denied:=false;begin perform public.send_direct_message(thread,'Another message',gen_random_uuid(),null);exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'Send throttle missing';end if;
 if (select unread_count from public.get_direct_inbox() where conversation_id=thread)<>0 then raise exception 'Own message counted unread';end if;
 insert into dm_fixture values(thread,msg,nonce,linked);
 perform set_config('request.jwt.claim.sub',finance::text,true);
 if public.open_direct_conversation(commercial)<>thread then raise exception 'Reverse pair duplicated thread';end if;
 if (select count(*) from public.direct_messages where conversation_id=thread)<>1 then raise exception 'Participant cannot read';end if;
 if (select unread_count from public.get_direct_inbox() where conversation_id=thread)<>1 then raise exception 'Incoming unread missing';end if;
 perform public.mark_direct_read(thread,msg);
 if (select unread_count from public.get_direct_inbox() where conversation_id=thread)<>0 then raise exception 'Unread marker not applied';end if;
 if (select count(*) from public.get_direct_inbox(null,null,thread))<>1 then raise exception 'Thread lookup failed';end if;
 for commercial in select id from dm_actors where role in('RH','ADMIN','GERENCIA','PENDING') loop
  perform set_config('request.jwt.claim.sub',commercial::text,true);
  if public.current_profile_role() is not null and exists(select 1 from public.get_direct_inbox()) then raise exception 'Inbox exposed a private conversation to an outsider';end if;
  if exists(select 1 from public.direct_messages) or exists(select 1 from public.direct_conversations) or exists(select 1 from public.direct_reads) then raise exception 'Outsider read private data';end if;
  denied:=false;begin perform public.send_direct_message(thread,'Outsider injection',gen_random_uuid(),null);exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'Outsider sent message';end if;
  denied:=false;begin perform public.mark_direct_read(thread,msg);exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'Outsider marked read';end if;
 end loop;
end $test$;
reset role;
-- Exact email search reveals only the minimal directory projection.
update public.direct_action_limits set searched_at='epoch';
set local role authenticated;
do $test$ declare actor uuid; begin
 select id into actor from dm_actors where role='COMERCIAL';perform set_config('request.jwt.claim.sub',actor::text,true);
 if (select count(*) from public.search_messaging_people(upper((select id::text from dm_actors where role='FINANCEIRO')||'@example.invalid')))<>1 then raise exception 'Exact email lookup failed';end if;
end $test$;
reset role;
-- Pagination and monotonic read watermark, using owner-written test messages only.
insert into public.direct_messages(conversation_id,sender_id,body,client_nonce,created_at)
select f.conversation,a.id,'Pagination fixture '||i,gen_random_uuid(),clock_timestamp()+i*interval '1 second' from dm_fixture f cross join dm_actors a cross join generate_series(1,110)i where a.role='COMERCIAL';
set local role authenticated;
do $test$ declare thread uuid;latest uuid;first_time timestamptz;first_id uuid;count_page integer; begin
 perform set_config('request.jwt.claim.sub',(select id::text from dm_actors where role='FINANCEIRO'),true);select conversation into thread from dm_fixture;
 select id into latest from public.direct_messages order by created_at desc,id desc limit 1;
 perform public.mark_direct_read(thread,latest);perform public.mark_direct_read(thread,(select message from dm_fixture));
 if (select unread_count from public.get_direct_inbox() where conversation_id=thread)<>0 then raise exception 'Old marker moved watermark backwards';end if;
 select created_at,id into first_time,first_id from public.direct_messages order by created_at desc,id desc offset 49 limit 1;
 select count(*) into count_page from(select id from public.direct_messages where (created_at,id)<(first_time,first_id) order by created_at desc,id desc limit 50) page;
 if count_page<>50 then raise exception 'Message cursor skipped history';end if;
end $test$;
reset role;
update public.direct_action_limits set sent_at='epoch';
update public.profiles set status='REJECTED' where id=(select id from dm_actors where role='FINANCEIRO');
set local role authenticated;
do $test$ declare denied boolean:=false;begin
 perform set_config('request.jwt.claim.sub',(select id::text from dm_actors where role='FINANCEIRO'),true);
 if exists(select 1 from public.direct_messages) then raise exception 'Inactive actor read messages';end if;
 perform set_config('request.jwt.claim.sub',(select id::text from dm_actors where role='COMERCIAL'),true);
 if (select other_active from public.get_direct_inbox() where conversation_id=(select conversation from dm_fixture)) then raise exception 'Inactive recipient marked active';end if;
 begin perform public.send_direct_message((select conversation from dm_fixture),'Unavailable recipient',gen_random_uuid(),null);exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'Inactive recipient received message';end if;
end $test$;
reset role;
do $test$ declare table_name text; begin
 foreach table_name in array array['direct_conversations','direct_messages','direct_reads','direct_action_limits'] loop
  if has_table_privilege('authenticated','public.'||table_name,'INSERT') or has_table_privilege('authenticated','public.'||table_name,'UPDATE') or has_table_privilege('authenticated','public.'||table_name,'DELETE') or has_table_privilege('anon','public.'||table_name,'SELECT') then raise exception 'Direct mutation or anonymous read grant: %',table_name;end if;
 end loop;
 if has_function_privilege('authenticated','public.claim_direct_action(text)','EXECUTE') then raise exception 'Internal limiter exposed';end if;
end $test$;
rollback;
