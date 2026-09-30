-- Accept the new privacy revision and retain the previous version for open signup tabs.
-- Each record keeps the version the browser displayed when the user accepted.
create or replace function private.record_signup_legal_consent()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  accepted_version text := new.raw_user_meta_data ->> 'legal_consent_version';
begin
  if new.raw_user_meta_data ->> 'legal_consent_accepted' is distinct from 'true'
     or accepted_version is null
     or accepted_version not in ('2026-09-29-867a277', '2026-09-29-suppression-v2') then
    raise exception 'TICO_LEGAL_CONSENT_REQUIRED' using errcode = '23514';
  end if;

  insert into public.legal_acceptances (user_id, consent_version, consent_text)
  values (
    new.id,
    accepted_version,
    'He leído y acepto los Términos y Condiciones y autorizo el tratamiento de mis datos personales conforme a la Política de Privacidad, incluida la comunicación internacional necesaria a Vercel, Supabase y Google descrita allí.'
  );
  return new;
end;
$$;
