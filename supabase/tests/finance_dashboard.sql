-- Run only in an isolated Supabase-compatible test DB. Always rolls back.
begin;
create temporary table finance_test_actors as select gen_random_uuid() as id,role from unnest(array['ADMIN','FINANCEIRO','GERENCIA','COMERCIAL','RH','PENDING']) as role;
grant select on finance_test_actors to authenticated;
insert into auth.users(id,email,raw_user_meta_data) select id,id::text||'@example.invalid','{"full_name":"Finance test fixture"}'::jsonb from finance_test_actors;
update public.profiles p set role=case when a.role='PENDING' then 'FINANCEIRO' else a.role end,status=case when a.role='PENDING' then 'PENDING' else 'ACTIVE' end from finance_test_actors a where p.id=a.id;
create function pg_temp.expect_finance_failure(statement text) returns void language plpgsql as $$
begin
  begin execute statement; exception when raise_exception or insufficient_privilege or check_violation then return; end;
  raise exception 'Expected rejection: %',statement;
end $$;
select set_config('request.jwt.claim.sub',(select id::text from finance_test_actors where role='ADMIN'),true);
create temporary table finance_test_demands(id uuid);
with inserted as (
  insert into public.demands(client_name,title,description,budget_total,commercial_responsible_id)
  values('Test fixture','Finance integration fixture','Isolated finance test',100,auth.uid()) returning id
) insert into finance_test_demands select id from inserted;
update public.demands set status='APROVADO_COMERCIAL' where id in(select id from finance_test_demands);
grant select on finance_test_demands to authenticated;
set local role authenticated;
do $$
declare batch uuid:=gen_random_uuid(); expense_batch uuid:=gen_random_uuid(); target uuid; actor record; actual integer;
  first_entry uuid; second_entry uuid; total bigint; dates date[]; business_today date:=(now() at time zone 'America/Cuiaba')::date;
begin
  select id into target from finance_test_demands;
  perform set_config('request.jwt.claim.sub',(select id::text from finance_test_actors where role='FINANCEIRO'),true);
  perform public.create_financial_entries(batch,'RECEIVABLE','Installment fixture','Test counterparty',10000,'2028-01-31',3,target,'Test notes');
  select sum(amount_cents),array_agg(due_on order by installment_number) into total,dates from public.financial_entries where batch_id=batch;
  if total<>10000 or dates<>array['2028-01-31','2028-02-29','2028-03-31']::date[] then raise exception 'Installment cents or month-end dates are incorrect'; end if;
  -- Exact retries cannot duplicate the batch; changing an existing request is rejected.
  perform public.create_financial_entries(batch,'RECEIVABLE','Installment fixture','Test counterparty',10000,'2028-01-31',3,target,'Test notes');
  select count(*) into actual from public.financial_entries where batch_id=batch;
  if actual<>3 then raise exception 'Retry duplicated installments'; end if;
  perform pg_temp.expect_finance_failure(format('select public.create_financial_entries(%L,''RECEIVABLE'',''Different payload'',''Test counterparty'',10000,''2028-01-31'',3,%L,''Test notes'')',batch,target));
  perform pg_temp.expect_finance_failure('select public.create_financial_entries(gen_random_uuid(),''PAYABLE'',''Invalid total'',''Test counterparty'',-1,current_date,1,null,'''')');
  select id into first_entry from public.financial_entries where batch_id=batch and installment_number=1;
  select id into second_entry from public.financial_entries where batch_id=batch and installment_number=2;
  perform pg_temp.expect_finance_failure(format('select public.settle_financial_entry(%L,%L)',first_entry,business_today+1));
  perform public.settle_financial_entry(first_entry,business_today);
  perform pg_temp.expect_finance_failure(format('select public.settle_financial_entry(%L,%L)',first_entry,business_today));
  perform pg_temp.expect_finance_failure(format('select public.cancel_financial_entry(%L,''Cannot cancel settled'')',first_entry));
  perform public.cancel_financial_entry(second_entry,'Isolated cancellation test');
  perform pg_temp.expect_finance_failure(format('select public.settle_financial_entry(%L,%L)',second_entry,business_today));
  perform pg_temp.expect_finance_failure(format('select public.cancel_financial_entry(%L,''Duplicate cancellation'')',second_entry));
  if not exists(select 1 from public.demands where id=target and status='APROVADO_COMERCIAL') then raise exception 'Ledger operation changed workflow stage'; end if;
  select count(*) into actual from public.financial_entry_events where entry_id in(select id from public.financial_entries where batch_id=batch);
  if actual<>5 then raise exception 'Expected three creation, one settlement and one cancellation audit events'; end if;

  -- A payable is a separate outgoing commitment, never a budget estimate.
  perform set_config('request.jwt.claim.sub',(select id::text from finance_test_actors where role='ADMIN'),true);
  perform public.create_financial_entries(expense_batch,'PAYABLE','Outgoing fixture','Test supplier',500,business_today,1,null,'');
  select id into first_entry from public.financial_entries where batch_id=expense_batch;
  perform public.settle_financial_entry(first_entry,business_today);
  for actor in select * from finance_test_actors loop
    perform set_config('request.jwt.claim.sub',actor.id::text,true);
    select count(*) into actual from public.financial_entries where batch_id in(batch,expense_batch);
    if actual<>(case when actor.role in('ADMIN','FINANCEIRO','GERENCIA') then 4 else 0 end) then raise exception 'Ledger visibility failed for %',actor.role; end if;
    select count(*) into actual from public.financial_entry_events where entry_id=first_entry;
    if actual<>(case when actor.role in('ADMIN','FINANCEIRO','GERENCIA') then 2 else 0 end) then raise exception 'Audit visibility failed for %',actor.role; end if;
    if actor.role not in('ADMIN','FINANCEIRO') then
      perform pg_temp.expect_finance_failure('select public.create_financial_entries(gen_random_uuid(),''PAYABLE'',''Forbidden fixture'',''Test supplier'',100,current_date,1,null,'''')');
      perform pg_temp.expect_finance_failure(format('select public.settle_financial_entry(%L,%L)',first_entry,business_today));
      perform pg_temp.expect_finance_failure(format('select public.cancel_financial_entry(%L,''Unauthorized cancellation'')',first_entry));
    end if;
  end loop;
  if has_table_privilege('authenticated','public.financial_entries','INSERT') or has_table_privilege('authenticated','public.financial_entries','UPDATE') or has_table_privilege('authenticated','public.financial_entries','DELETE') or has_table_privilege('authenticated','public.financial_entry_events','UPDATE') then raise exception 'Direct ledger mutations must be revoked'; end if;
end $$;
reset role;
rollback;
