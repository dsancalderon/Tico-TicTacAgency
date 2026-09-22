-- User-owned workspace data. Credentials live only in Vault, never in JSON documents.
create table public.user_workspace (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  briefing jsonb,
  strategy jsonb,
  step text not null default 'briefing' check (step in ('briefing','strategy','deployed')),
  updated_at timestamptz not null default now()
);
create table public.campaign_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  strategy jsonb not null check (jsonb_typeof(strategy) = 'object'),
  deployment jsonb,
  created_at timestamptz not null default now()
);
create index campaign_history_user_date on public.campaign_history(user_id, created_at desc);
create table public.ad_connections (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  platform text not null check (platform in ('meta','google')),
  settings jsonb not null default '{}' check (jsonb_typeof(settings) = 'object' and not settings ? 'userAccessToken'),
  updated_at timestamptz not null default now(),
  primary key (user_id, platform)
);
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.connection_secrets (
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  secret_id uuid not null references vault.secrets(id),
  primary key (user_id, platform)
);
create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount > 0),
  type text not null check (type in ('credit','debit','refund')),
  description text not null,
  campaign_id uuid references public.campaign_history(id) on delete set null,
  external_reference text unique,
  created_at timestamptz not null default now()
);
create index credit_transactions_user_date on public.credit_transactions(user_id, created_at desc);
create index credit_transactions_campaign on public.credit_transactions(campaign_id);
create table public.performance_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('meta','google')),
  account_id text not null,
  date date not null,
  currency text not null,
  spend numeric not null check (spend >= 0),
  impressions bigint not null check (impressions >= 0),
  clicks bigint not null check (clicks >= 0),
  conversions numeric,
  conversion_value numeric,
  synced_at timestamptz not null default now(),
  primary key (user_id, platform, account_id, date)
);

create function public.touch_workspace_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger user_workspace_updated before update on public.user_workspace for each row execute function public.touch_workspace_updated_at();
create trigger ad_connections_updated before update on public.ad_connections for each row execute function public.touch_workspace_updated_at();

alter table public.user_workspace enable row level security;
alter table public.campaign_history enable row level security;
alter table public.ad_connections enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.performance_daily enable row level security;
alter table private.connection_secrets enable row level security;
revoke all on public.user_workspace, public.campaign_history, public.ad_connections, public.credit_transactions, public.performance_daily from anon, authenticated;
grant select, insert, update, delete on public.user_workspace, public.campaign_history to authenticated;
grant select on public.ad_connections, public.credit_transactions, public.performance_daily to authenticated;
grant all on public.user_workspace, public.campaign_history, public.ad_connections, public.credit_transactions, public.performance_daily to service_role;
create policy workspace_own on public.user_workspace for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy campaigns_own on public.campaign_history for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy connections_own on public.ad_connections for select to authenticated using ((select auth.uid()) = user_id);
create policy credits_own on public.credit_transactions for select to authenticated using ((select auth.uid()) = user_id);
create policy metrics_own on public.performance_daily for select to authenticated using ((select auth.uid()) = user_id);

create function public.save_ad_connection(p_platform text, p_settings jsonb, p_token text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); sid uuid;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_platform not in ('meta','google') or jsonb_typeof(p_settings) <> 'object' then raise exception 'Invalid connection'; end if;
  -- Serialize saves so concurrent updates cannot orphan Vault secrets.
  perform pg_advisory_xact_lock(hashtextextended(uid::text || p_platform, 0));
  insert into public.ad_connections(user_id, platform, settings) values(uid,p_platform,p_settings - 'userAccessToken')
  on conflict(user_id,platform) do update set settings=excluded.settings;
  select secret_id into sid from private.connection_secrets where user_id=uid and platform=p_platform;
  if p_token = '' then
    delete from private.connection_secrets where user_id=uid and platform=p_platform;
    delete from vault.secrets where id=sid;
  elsif p_token is not null then
    if sid is null then
      sid := vault.create_secret(p_token);
      insert into private.connection_secrets values(uid,p_platform,sid);
    else perform vault.update_secret(sid,p_token); end if;
  end if;
end;
$$;
create function public.load_ad_token(p_platform text) returns text language sql security definer set search_path = '' as $$
  select s.decrypted_secret from private.connection_secrets c join vault.decrypted_secrets s on s.id=c.secret_id
  where c.user_id=(select auth.uid()) and c.platform=p_platform;
$$;
create function public.my_credit_balance() returns bigint language sql stable security invoker set search_path = '' as $$
  select coalesce(sum(case when type='debit' then -amount else amount end),0)::bigint
  from public.credit_transactions where user_id=(select auth.uid());
$$;
revoke all on function public.save_ad_connection(text,jsonb,text), public.load_ad_token(text), public.my_credit_balance() from public, anon;
grant execute on function public.save_ad_connection(text,jsonb,text), public.load_ad_token(text), public.my_credit_balance() to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('user-creatives','user-creatives',false,20971520,array['image/jpeg','image/png','image/webp','video/mp4','video/webm']);
create policy creatives_read_own on storage.objects for select to authenticated using (bucket_id='user-creatives' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy creatives_insert_own on storage.objects for insert to authenticated with check (bucket_id='user-creatives' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy creatives_delete_own on storage.objects for delete to authenticated using (bucket_id='user-creatives' and (storage.foldername(name))[1]=(select auth.uid())::text);
