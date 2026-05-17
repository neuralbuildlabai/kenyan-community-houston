-- ============================================================
-- 040 — Gallery admin status RPC: content_status enum cast + admin list
-- ============================================================
-- Fixes POST 400 on admin_set_gallery_image_status:
--   column "status" is of type content_status but expression is of type text
-- Adds admin_list_gallery_images so elevated admins load the review queue
-- without relying on broad table SELECT + RLS (reduces 403 noise for non-admins).

-- ─── 1. admin_list_gallery_images ────────────────────────────
create or replace function public.admin_list_gallery_images()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.kigh_is_elevated_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return (
    select coalesce(jsonb_agg(to_jsonb(gi) order by gi.created_at desc), '[]'::jsonb)
    from (
      select
        gi.id,
        gi.album_id,
        gi.caption,
        gi.alt_text,
        gi.image_url,
        gi.thumbnail_url,
        gi.status::text as status,
        gi.created_at,
        gi.submission_storage_bucket,
        gi.submission_storage_path,
        gi.submission_thumb_path,
        gi.is_homepage_featured,
        gi.sort_order,
        gi.submitted_by_name,
        gi.submitted_by_email
      from public.gallery_images gi
    ) gi
  );
end;
$$;

revoke all on function public.admin_list_gallery_images() from public;
grant execute on function public.admin_list_gallery_images() to authenticated;

comment on function public.admin_list_gallery_images() is
  'Elevated admins only: full admin gallery queue rows (includes submitter PII for review).';

-- ─── 2. admin_set_gallery_image_status (enum cast) ─────────────
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
  v_status text;
  v_allowed constant text[] := array['pending', 'published', 'rejected', 'archived'];
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.kigh_is_elevated_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  v_status := lower(trim(coalesce(p_status, '')));
  if not v_status = any(v_allowed) then
    raise exception 'invalid_gallery_status' using errcode = '22023';
  end if;

  update public.gallery_images gi
     set status = v_status::content_status,
         updated_at = now(),
         approved_at = case
           when v_status = 'published' then now()
           when v_status in ('pending', 'rejected', 'archived') then null
           else gi.approved_at
         end,
         approved_by = case
           when v_status = 'published' then auth.uid()
           when v_status in ('pending', 'rejected', 'archived') then null
           else gi.approved_by
         end
         -- gallery_images uses approved_at/approved_by (no reviewed_* columns).
   where gi.id = p_image_id
   returning * into v_row;

  if not found then
    raise exception 'gallery_image_not_found' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'status', v_row.status::text,
    'updated_at', v_row.updated_at,
    'approved_at', v_row.approved_at,
    'approved_by', v_row.approved_by
  );
end;
$$;

revoke all on function public.admin_set_gallery_image_status(uuid, text) from public;
grant execute on function public.admin_set_gallery_image_status(uuid, text) to authenticated;

comment on function public.admin_set_gallery_image_status(uuid, text) is
  'Elevated admins only: set gallery_images.status (content_status cast) for approve/reject/archive/unpublish.';

-- ─── 3. admin_delete_gallery_image (storage paths for all buckets) ─
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
  v_pub_web text;
  v_pub_thumb text;
  v_paths text[];
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

  v_pub_web := substring(v_row.image_url from 'gallery-public/([^?]+)');
  v_pub_thumb := substring(v_row.thumbnail_url from 'gallery-public/([^?]+)');
  v_paths := array_remove(array[v_pub_web, v_pub_thumb], null::text);

  if v_row.album_id is not null and cardinality(v_paths) = 0 then
    v_album := v_row.album_id::text;
    v_ext := case
      when coalesce(v_row.submission_storage_path, v_row.image_url, '') like '%.webp%' then 'webp'
      else 'jpg'
    end;
    v_paths := array[
      format('published/%s/%s-web.%s', v_album, p_image_id::text, v_ext),
      format('published/%s/%s-thumb.%s', v_album, p_image_id::text, v_ext)
    ];
  end if;

  if cardinality(v_paths) > 0 then
    v_objects := v_objects || jsonb_build_array(
      jsonb_build_object('bucket', 'gallery-public', 'paths', to_jsonb(v_paths))
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
  'Elevated admins only: delete gallery_images row and return gallery-submissions + gallery-public storage paths for client cleanup.';
