create table public.tico_brief_deployments (
 id uuid primary key, user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 brief_hash text not null, ledger jsonb not null, signature text not null,
 running boolean not null default false, updated_at timestamptz not null default now()
);
alter table public.tico_brief_deployments enable row level security;
revoke all on public.tico_brief_deployments from anon,authenticated;
grant select,insert,update on public.tico_brief_deployments to authenticated;
create policy brief_deployments_own on public.tico_brief_deployments for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
-- The server authenticates every ledger with an HMAC before trusting any IDs.
-- Atomic claim: no expiry-based automatic retry of possibly successful Meta writes.
create function public.claim_tico_deployment(p_id uuid) returns boolean language plpgsql security invoker set search_path='' as $$
declare claimed uuid;
begin
 update public.tico_brief_deployments set running=true,updated_at=now() where id=p_id and user_id=(select auth.uid()) and not running returning id into claimed;
 return claimed is not null;
end; $$;
revoke all on function public.claim_tico_deployment(uuid) from public,anon;
grant execute on function public.claim_tico_deployment(uuid) to authenticated;
