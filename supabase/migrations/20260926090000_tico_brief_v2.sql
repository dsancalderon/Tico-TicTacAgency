-- Additive: keep the legacy platform token and its RPCs working.
create table public.meta_brief_connections (
  id text not null, user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null, connected_at timestamptz not null default now(), primary key(user_id,id)
);
create table private.meta_brief_secrets (
  user_id uuid not null references auth.users(id) on delete cascade, connection_id text not null,
  secret_id uuid not null references vault.secrets(id), primary key(user_id,connection_id),
  foreign key(user_id,connection_id) references public.meta_brief_connections(user_id,id) on delete cascade
);
alter table public.meta_brief_connections enable row level security;
alter table private.meta_brief_secrets enable row level security;
revoke all on public.meta_brief_connections from anon,authenticated;
grant select on public.meta_brief_connections to authenticated;
create policy brief_connections_own on public.meta_brief_connections for select to authenticated using(user_id=(select auth.uid()));
create function public.save_meta_brief_connection(p_id text,p_name text,p_token text) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid(); sid uuid;
begin
  if uid is null or length(p_id) not between 1 and 120 or length(p_token) < 10 then raise exception 'Invalid connection'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text || p_id,0));
  insert into public.meta_brief_connections(id,user_id,name) values(p_id,uid,left(p_name,160))
    on conflict(user_id,id) do update set name=excluded.name,connected_at=now();
  select secret_id into sid from private.meta_brief_secrets where user_id=uid and connection_id=p_id;
  if sid is null then
    sid := vault.create_secret(p_token);
    insert into private.meta_brief_secrets values(uid,p_id,sid);
  else perform vault.update_secret(sid,p_token); end if;
end; $$;
create function public.load_meta_brief_token(p_id text) returns text language sql security definer set search_path='' as $$
 select v.decrypted_secret from private.meta_brief_secrets s join vault.decrypted_secrets v on v.id=s.secret_id
 where s.user_id=(select auth.uid()) and s.connection_id=p_id;
$$;
revoke all on function public.save_meta_brief_connection(text,text,text),public.load_meta_brief_token(text) from public,anon;
grant execute on function public.save_meta_brief_connection(text,text,text),public.load_meta_brief_token(text) to authenticated;

create table public.tico_brief_preferences (
 user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
 delegation jsonb not null default '{}', last_assets jsonb not null default '{}'
);
alter table public.tico_brief_preferences enable row level security;
revoke all on public.tico_brief_preferences from anon,authenticated;
grant select,insert,update on public.tico_brief_preferences to authenticated;
create policy brief_preferences_own on public.tico_brief_preferences for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
update storage.buckets set allowed_mime_types = array['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime','application/pdf','audio/webm','audio/mp4','audio/ogg','audio/wav'] where id='user-creatives';
