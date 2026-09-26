create table public.tico_brief_events (
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 event text not null check(event in ('source_started','preview_reached','preview_field_edited','delegation_changed','deployment_first_success')),
 properties jsonb not null default '{}',created_at timestamptz not null default now()
);
alter table public.tico_brief_events enable row level security;
revoke all on public.tico_brief_events from anon,authenticated;
grant insert,select on public.tico_brief_events to authenticated;
create policy brief_events_own on public.tico_brief_events for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
