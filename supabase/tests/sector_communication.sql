-- Run in an isolated Supabase test database after all migrations. Always rolls back.
begin;
create temporary table communication_test_actors as
select gen_random_uuid() as id, role from unnest(array['ADMIN','COMERCIAL','FINANCEIRO','RH','GERENCIA','PENDING']) as role;
grant select on communication_test_actors to authenticated;
insert into auth.users(id, email, raw_user_meta_data)
select id, id::text || '@example.invalid', '{"full_name":"Communication test fixture"}'::jsonb from communication_test_actors;
update public.profiles p set role = case when a.role = 'PENDING' then 'COMERCIAL' else a.role end,
  status = case when a.role = 'PENDING' then 'PENDING' else 'ACTIVE' end
from communication_test_actors a where p.id = a.id;
insert into public.sector_messages(scope, kind, body, author_id, author_name, department)
select scope, 'MESSAGE', 'Isolated visibility test', a.id, 'Communication test fixture', 'Diretoria'
from communication_test_actors a cross join unnest(array['SHARED','FINANCEIRO','RH']) as scope where role = 'ADMIN';

set local role authenticated;
do $$
declare actor record; expected integer; actual integer; forbidden boolean; fixture_demand_id uuid; current_status text;
begin
  for actor in select * from communication_test_actors loop
    perform set_config('request.jwt.claim.sub', actor.id::text, true);
    expected := case when actor.role in ('ADMIN','GERENCIA') then 3 when actor.role in ('FINANCEIRO','RH') then 2 when actor.role = 'COMERCIAL' then 1 else 0 end;
    select count(*) into actual from public.sector_messages where body = 'Isolated visibility test';
    if actual <> expected then raise exception 'Visibility failed for %: % instead of %', actor.role, actual, expected; end if;
    if actor.role in ('COMERCIAL','RH','PENDING') then
      forbidden := false;
      begin
        perform public.send_sector_message(null, 'FINANCEIRO', 'MESSAGE', 'Forbidden scoped message');
      exception when insufficient_privilege then forbidden := true;
      end;
      if not forbidden then raise exception 'Unauthorized financial send accepted for %', actor.role; end if;
    end if;
  end loop;
  -- Invalid notes cannot advance a demand; valid handoffs record both changes.
  perform set_config('request.jwt.claim.sub', (select id::text from communication_test_actors where role = 'COMERCIAL'), true);
  insert into public.demands(client_name, title, description, budget_total, commercial_responsible_id)
  values ('Test fixture', 'Isolated workflow test', 'Transactional communication fixture', 100, auth.uid()) returning id into fixture_demand_id;
  forbidden := false;
  begin
    perform public.review_demand_with_note(fixture_demand_id, 'COMMERCIAL', '', '{}'::jsonb);
  exception when raise_exception then forbidden := true;
  end;
  select status into current_status from public.demands where id = fixture_demand_id;
  if not forbidden or current_status <> 'ORCAMENTO' then raise exception 'Missing note advanced demand'; end if;
  perform public.review_demand_with_note(fixture_demand_id, 'COMMERCIAL', 'Validated commercial handoff fixture', '{}'::jsonb);
  select status into current_status from public.demands where id = fixture_demand_id;
  if current_status <> 'APROVADO_COMERCIAL' or not exists (
    select 1 from public.sector_messages m where m.demand_id = fixture_demand_id and m.kind = 'ANALYSIS'
  ) then raise exception 'Handoff was not saved atomically'; end if;

  if has_table_privilege('authenticated','public.sector_messages','INSERT')
    or has_table_privilege('authenticated','public.sector_messages','UPDATE')
    or has_table_privilege('authenticated','public.sector_messages','DELETE') then
    raise exception 'Messages must be immutable and written through the authenticated RPC';
  end if;
end $$;
reset role;
rollback;
