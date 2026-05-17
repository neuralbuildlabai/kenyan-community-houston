-- ============================================================
-- 039 — Super admin authority: member status + gallery delete RPCs
-- ============================================================
-- Fixes elevated-admin 403s on member activation and gallery delete
-- by providing SECURITY DEFINER admin RPCs and ensuring the
-- platform super-admin account is active with full privileges.
-- Does not weaken anon/public RLS on private data.

-- ─── 1. Re-assert is_admin() delegates to elevated check ─────
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.kigh_is_elevated_admin();
$$;

comment on function public.is_admin() is
  'Returns true only for elevated admin roles in profiles.role (migration 039 re-assert).';

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

-- ─── 2. Table grants: authenticated admins need DML via RLS ────
grant select, update, delete on public.gallery_images to authenticated;
revoke delete, update on public.gallery_images from anon;

grant select, update on public.members to authenticated;

-- ─── 3. Re-assert gallery admin RLS (explicit elevated helper) ─
drop policy if exists "Admins manage gallery images" on public.gallery_images;
create policy "Admins manage gallery images"
  on public.gallery_images for all
  to authenticated
  using (public.kigh_is_elevated_admin())
  with check (public.kigh_is_elevated_admin());

drop policy if exists "Admins full access members" on public.members;
create policy "Admins full access members"
  on public.members for all
  to authenticated
  using (public.kigh_is_elevated_admin())
  with check (public.kigh_is_elevated_admin());

-- ─── 4. Storage: elevated admins manage gallery buckets ───────
drop policy if exists "gallery_public_delete_admin" on storage.objects;
create policy "gallery_public_delete_admin"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'gallery-public' and public.kigh_is_elevated_admin());

drop policy if exists "gallery_public_update_admin" on storage.objects;
create policy "gallery_public_update_admin"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'gallery-public' and public.kigh_is_elevated_admin())
  with check (bucket_id = 'gallery-public' and public.kigh_is_elevated_admin());

drop policy if exists "gallery_public_write_admin" on storage.objects;
create policy "gallery_public_write_admin"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'gallery-public' and public.kigh_is_elevated_admin());

drop policy if exists "gallery_submissions_delete_admin_or_owner" on storage.objects;
create policy "gallery_submissions_delete_admin_or_owner"
  on storage.objects for delete
  to authenticated, anon
  using (
    bucket_id = 'gallery-submissions'
    and (
      public.kigh_is_elevated_admin()
      or (
        auth.uid() is not null
        and (
          name like ('pending/u/' || auth.uid()::text || '/%')
          or owner = auth.uid()
        )
      )
    )
  );

drop policy if exists "gallery_submissions_select_admin" on storage.objects;
create policy "gallery_submissions_select_admin"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'gallery-submissions' and public.kigh_is_elevated_admin());

-- ─── 5. Ensure platform super-admin account (idempotent) ─────
do $$
declare
  v_email constant text := 'admin@kenyancommunityhouston.org';
  v_uid uuid;
  v_now timestamptz := now();
begin
  select u.id into v_uid
    from auth.users u
   where lower(trim(u.email)) = lower(v_email)
   limit 1;

  if v_uid is null then
    raise notice '039: auth user % not found — skip profile/member promotion (bootstrap after invite)', v_email;
    return;
  end if;

  insert into public.profiles (id, email, role, created_at, updated_at)
  values (v_uid, v_email, 'super_admin', v_now, v_now)
  on conflict (id) do update
    set email = excluded.email,
        role = 'super_admin',
        updated_at = v_now;

  insert into public.admin_user_profiles (
    user_id,
    must_change_password,
    display_name,
    position_title,
    created_at,
    updated_at
  )
  values (
    v_uid,
    false,
    'KIGH Super Admin',
    'Super Admin',
    v_now,
    v_now
  )
  on conflict (user_id) do update
    set display_name = coalesce(public.admin_user_profiles.display_name, excluded.display_name),
        position_title = coalesce(public.admin_user_profiles.position_title, excluded.position_title),
        updated_at = v_now;

  update public.members m
     set membership_status = 'active',
         dues_status = case
           when m.dues_status in ('paid', 'waived') then m.dues_status
           else 'paid'
         end,
         good_standing = true,
         good_standing_as_of = coalesce(m.good_standing_as_of, current_date),
         user_id = coalesce(m.user_id, v_uid),
         auth_email_confirmed_at = coalesce(
           m.auth_email_confirmed_at,
           (select u.email_confirmed_at from auth.users u where u.id = v_uid)
         ),
         updated_at = v_now
   where lower(trim(m.email)) = lower(v_email);

  raise notice '039: ensured super_admin profile and active member row for %', v_email;
end;
$$;

-- ─── 6. admin_update_member_status ───────────────────────────
create or replace function public.admin_update_member_status(
  p_member_id uuid,
  p_membership_status text default null,
  p_dues_status text default null,
  p_good_standing boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.members%rowtype;
  v_status text;
  v_dues text;
  v_standing boolean;
  v_allowed_status constant text[] := array['pending', 'active', 'inactive', 'rejected'];
  v_allowed_dues constant text[] := array['pending', 'paid', 'waived', 'overdue'];
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.kigh_is_elevated_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_row from public.members where id = p_member_id for update;
  if not found then
    raise exception 'member_not_found' using errcode = 'P0002';
  end if;

  v_status := coalesce(nullif(trim(p_membership_status), ''), v_row.membership_status);
  v_dues := coalesce(nullif(trim(p_dues_status), ''), v_row.dues_status);

  if not v_status = any(v_allowed_status) then
    raise exception 'invalid_membership_status' using errcode = '22023';
  end if;
  if not v_dues = any(v_allowed_dues) then
    raise exception 'invalid_dues_status' using errcode = '22023';
  end if;

  v_standing := coalesce(p_good_standing, v_row.good_standing);
  if p_good_standing is null
     and v_status = 'active'
     and v_dues in ('paid', 'waived') then
    v_standing := true;
  elsif v_status in ('pending', 'inactive', 'rejected') and p_good_standing is null then
    v_standing := false;
  end if;

  update public.members m
     set membership_status = v_status,
         dues_status = v_dues,
         good_standing = v_standing,
         good_standing_as_of = case
           when v_standing and not coalesce(m.good_standing, false) then current_date
           when not v_standing then null
           else m.good_standing_as_of
         end,
         reviewed_at = case
           when v_status is distinct from m.membership_status then now()
           else m.reviewed_at
         end,
         reviewed_by = case
           when v_status is distinct from m.membership_status then auth.uid()
           else m.reviewed_by
         end,
         updated_at = now()
   where m.id = p_member_id
   returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'email', v_row.email,
    'membership_status', v_row.membership_status,
    'dues_status', v_row.dues_status,
    'good_standing', v_row.good_standing,
    'good_standing_as_of', v_row.good_standing_as_of
  );
end;
$$;

revoke all on function public.admin_update_member_status(uuid, text, text, boolean) from public;
grant execute on function public.admin_update_member_status(uuid, text, text, boolean) to authenticated;

comment on function public.admin_update_member_status(uuid, text, text, boolean) is
  'Elevated admins only: update membership_status, dues_status, and good_standing for a member row.';

-- ─── 7. admin_delete_gallery_image ───────────────────────────
create or replace function public.admin_delete_gallery_image(p_image_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.gallery_images%rowtype;
  v_objects jsonb := '[]'::jsonb;
  v_album text;
  v_ext text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.kigh_is_elevated_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_row from public.gallery_images where id = p_image_id;
  if not found then
    raise exception 'gallery_image_not_found' using errcode = 'P0002';
  end if;

  if v_row.submission_storage_bucket is not null
     and v_row.submission_storage_path is not null then
    v_objects := v_objects || jsonb_build_array(
      jsonb_build_object(
        'bucket', v_row.submission_storage_bucket,
        'paths', (
          select coalesce(jsonb_agg(p), '[]'::jsonb)
            from unnest(
              array_remove(
                array[v_row.submission_storage_path, v_row.submission_thumb_path],
                null::text
              )
            ) as p
        )
      )
    );
  end if;

  if v_row.album_id is not null then
    v_album := v_row.album_id::text;
    v_ext := case
      when coalesce(v_row.submission_storage_path, v_row.image_url, '') like '%.webp%' then 'webp'
      else 'jpg'
    end;
    v_objects := v_objects || jsonb_build_array(
      jsonb_build_object(
        'bucket', 'gallery-public',
        'paths', jsonb_build_array(
          format('published/%s/%s-web.%s', v_album, p_image_id::text, v_ext),
          format('published/%s/%s-thumb.%s', v_album, p_image_id::text, v_ext)
        )
      )
    );
  end if;

  delete from public.gallery_images where id = p_image_id;

  return jsonb_build_object(
    'deleted', true,
    'image_id', p_image_id,
    'storage_objects', v_objects
  );
end;
$$;

revoke all on function public.admin_delete_gallery_image(uuid) from public;
grant execute on function public.admin_delete_gallery_image(uuid) to authenticated;

comment on function public.admin_delete_gallery_image(uuid) is
  'Elevated admins only: delete gallery_images row and return storage paths for client cleanup.';

-- ─── 8. admin_set_gallery_image_status (approve/reject/archive) ─
create or replace function public.admin_set_gallery_image_status(
  p_image_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.gallery_images%rowtype;
  v_allowed constant text[] := array[
    'draft', 'pending', 'published', 'unpublished', 'archived', 'rejected'
  ];
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.kigh_is_elevated_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if not coalesce(trim(p_status), '') = any(v_allowed) then
    raise exception 'invalid_gallery_status' using errcode = '22023';
  end if;

  update public.gallery_images gi
     set status = trim(p_status),
         updated_at = now()
   where gi.id = p_image_id
   returning * into v_row;

  if not found then
    raise exception 'gallery_image_not_found' using errcode = 'P0002';
  end if;

  return jsonb_build_object('id', v_row.id, 'status', v_row.status);
end;
$$;

revoke all on function public.admin_set_gallery_image_status(uuid, text) from public;
grant execute on function public.admin_set_gallery_image_status(uuid, text) to authenticated;

comment on function public.admin_set_gallery_image_status(uuid, text) is
  'Elevated admins only: update gallery_images.status without broad table UPDATE grants.';
