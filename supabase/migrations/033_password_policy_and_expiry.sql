-- ============================================================
-- 033 — KIGH password policy metadata on profiles + RPC
-- ============================================================

alter table public.profiles
  add column if not exists password_changed_at timestamptz default now(),
  add column if not exists password_expires_at timestamptz default (now() + interval '180 days'),
  add column if not exists force_password_change boolean not null default false,
  add column if not exists password_policy_version text not null default 'kigh-v1';

comment on column public.profiles.password_changed_at is
  'Last successful password rotation (Supabase Auth); not the password itself.';
comment on column public.profiles.password_expires_at is
  'When the current password expires; app treats past timestamps as requiring renewal.';
comment on column public.profiles.force_password_change is
  'When true, email/password users are redirected to change-password until cleared.';
comment on column public.profiles.password_policy_version is
  'Label for the policy rules applied at last rotation (e.g. kigh-v1).';

-- Controlled update path (SECURITY DEFINER) so clients rely on RPC after Auth password change.
create or replace function public.kigh_apply_profile_password_rotation()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  update public.profiles
     set password_changed_at = now(),
         password_expires_at = now() + interval '180 days',
         force_password_change = false,
         password_policy_version = 'kigh-v1',
         updated_at = now()
   where id = auth.uid();
end;
$$;

comment on function public.kigh_apply_profile_password_rotation() is
  'Sets password rotation timestamps for the current auth user after Supabase Auth password update.';

grant execute on function public.kigh_apply_profile_password_rotation() to authenticated;

-- Elevated admins may flag another user for mandatory password refresh.
create or replace function public.kigh_profile_force_password_change(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if not public.kigh_is_elevated_admin() then
    raise exception 'not_authorized';
  end if;

  update public.profiles
     set force_password_change = true,
         updated_at = now()
   where id = p_user_id;

  if not found then
    raise exception 'profile_not_found';
  end if;
end;
$$;

comment on function public.kigh_profile_force_password_change(uuid) is
  'Marks a profile for mandatory password change on next login (elevated admins only).';

grant execute on function public.kigh_profile_force_password_change(uuid) to authenticated;
