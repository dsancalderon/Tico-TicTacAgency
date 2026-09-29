-- Applied remotely as 20260929015933; keep this version aligned with Supabase.
-- Billing/webhook integration must populate this table using a trusted server role.
-- Users cannot extend their own subscription by editing a form or database row.
create table public.subscription_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  status text not null check (status in ('active','inactive')),
  check (current_period_end > current_period_start)
);
alter table public.subscription_entitlements enable row level security;
revoke all on public.subscription_entitlements from anon, authenticated;
grant select on public.subscription_entitlements to authenticated;
create policy subscription_read_own on public.subscription_entitlements for select to authenticated using (user_id = (select auth.uid()));

-- The signature binds the complete immutable forecast to the owner, deployment and
-- resolved targeting. All server reads verify it; client-written values are untrusted.
create table public.campaign_performance_goals (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  forecast jsonb not null,
  resolved_key text not null,
  signature text not null,
  created_at timestamptz not null default now()
);
alter table public.campaign_performance_goals enable row level security;
revoke all on public.campaign_performance_goals from anon, authenticated;
grant select, insert, update on public.campaign_performance_goals to authenticated;
create policy goals_own on public.campaign_performance_goals for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- Once a deployment has started the original forecast cannot be overwritten,
-- including through the REST API or a concurrent forecast request.
create function public.protect_started_campaign_goal() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if exists (select 1 from public.tico_brief_deployments where id = new.id) then
    raise exception 'This deployment already has a frozen goal';
  end if;
  return new;
end; $$;
create trigger protect_campaign_goal before insert or update on public.campaign_performance_goals for each row execute function public.protect_started_campaign_goal();
