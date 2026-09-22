-- All fixtures are rolled back; never modifies existing accounts or balances.
begin;
create temp table test_users (a uuid, b uuid);
insert into test_users values(gen_random_uuid(),gen_random_uuid());
grant select on test_users to authenticated;
insert into auth.users(id) select a from test_users union all select b from test_users;
select set_config('request.jwt.claim.sub', (select a::text from test_users), true);
set local role authenticated;
insert into public.user_workspace(briefing) values('{"brandName":"Isolation test"}');
insert into public.campaign_history(strategy) values('{"brandName":"Isolation test"}');
insert into storage.objects(bucket_id,name) values('user-creatives',auth.uid()::text || '/test/fixture.png');
select public.save_ad_connection('meta','{"adAccountId":"act_test","userAccessToken":"must-not-persist"}', 'test-only-vault-token');
do $$ begin
  if public.load_ad_token('meta') <> 'test-only-vault-token' then raise exception 'Token did not roundtrip'; end if;
  if exists(select 1 from public.ad_connections where settings ? 'userAccessToken') then raise exception 'Plaintext token persisted'; end if;
  if (select count(*) from public.user_workspace) <> 1 then raise exception 'Owner cannot read draft'; end if;
  if (select count(*) from storage.objects where bucket_id='user-creatives') <> 1 then raise exception 'Owner cannot read private file'; end if;
  begin
    insert into public.credit_transactions(user_id,amount,type,description) values(auth.uid(),100,'credit','forged');
    raise exception 'Credit escalation allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.performance_daily(user_id,platform,account_id,date,currency,spend,impressions,clicks)
    values(auth.uid(),'meta','act_test',current_date,'USD',1,1,1);
    raise exception 'Forged metrics allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub', (select b::text from test_users), true);
set local role authenticated;
do $$ begin
  if exists(select 1 from public.user_workspace) or exists(select 1 from public.campaign_history) or exists(select 1 from public.ad_connections) then raise exception 'Cross-user data leak'; end if;
  if public.load_ad_token('meta') is not null then raise exception 'Cross-user token leak'; end if;
  if exists(select 1 from storage.objects where bucket_id='user-creatives') then raise exception 'Cross-user storage leak'; end if;
  begin
    insert into storage.objects(bucket_id,name) select 'user-creatives',a::text || '/test/forged.png' from test_users;
    raise exception 'Cross-user upload allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.user_workspace(user_id) select a from test_users;
    raise exception 'Cross-user write allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub', (select a::text from test_users), true);
set local role authenticated;
select public.save_ad_connection('meta','{"isConnected":false}', '');
do $$ begin if public.load_ad_token('meta') is not null then raise exception 'Disconnect did not remove token'; end if; end $$;
reset role;
rollback;
select 'PASS: owner persistence, cross-user isolation, private storage, Vault roundtrip/removal, protected credits and metrics' as result;
