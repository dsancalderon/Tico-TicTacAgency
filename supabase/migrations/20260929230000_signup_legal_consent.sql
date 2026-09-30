-- Record the exact consent statement accepted at signup. The timestamp is set by Postgres.
create table public.legal_acceptances (
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_version text not null,
  consent_text text not null,
  accepted_at timestamptz not null default clock_timestamp(),
  source text not null default 'signup',
  primary key (user_id, consent_version)
);

alter table public.legal_acceptances enable row level security;
revoke all on public.legal_acceptances from anon, authenticated;
grant select on public.legal_acceptances to authenticated;

create policy legal_acceptances_select_own on public.legal_acceptances
  for select to authenticated using ((select auth.uid()) = user_id);

create function private.record_signup_legal_consent()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.raw_user_meta_data ->> 'legal_consent_accepted' is distinct from 'true'
     or new.raw_user_meta_data ->> 'legal_consent_version' is distinct from '2026-09-29-867a277' then
    raise exception 'TICO_LEGAL_CONSENT_REQUIRED' using errcode = '23514';
  end if;

  insert into public.legal_acceptances (user_id, consent_version, consent_text)
  values (
    new.id,
    '2026-09-29-867a277',
    'He leído y acepto los Términos y Condiciones y autorizo el tratamiento de mis datos personales conforme a la Política de Privacidad, incluida la comunicación internacional necesaria a Vercel, Supabase y Google descrita allí.'
  );
  return new;
end;
$$;

revoke all on function private.record_signup_legal_consent() from public, anon, authenticated;

create trigger on_auth_user_created_record_legal_consent
  after insert on auth.users
  for each row execute function private.record_signup_legal_consent();
