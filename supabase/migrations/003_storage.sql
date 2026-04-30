-- ============================================================
-- Storage Buckets
-- ============================================================
-- Run this after enabling Supabase Storage in your project dashboard.

-- Gallery bucket (public read)
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

-- Event flyers bucket (public read)
insert into storage.buckets (id, name, public)
values ('event-flyers', 'event-flyers', true)
on conflict (id) do nothing;

-- Business logos bucket (public read)
insert into storage.buckets (id, name, public)
values ('business-logos', 'business-logos', true)
on conflict (id) do nothing;

-- Fundraiser images bucket (public read)
insert into storage.buckets (id, name, public)
values ('fundraiser-images', 'fundraiser-images', true)
on conflict (id) do nothing;

-- ─── Storage Policies ───────────────────────────────────────

-- Gallery: public read
create policy "Public read gallery"
  on storage.objects for select
  using (bucket_id = 'gallery');

-- Gallery: admin upload/delete
create policy "Admin upload gallery"
  on storage.objects for insert
  with check (bucket_id = 'gallery' and auth.uid() is not null);

create policy "Admin delete gallery"
  on storage.objects for delete
  using (bucket_id = 'gallery' and auth.uid() is not null);

-- Event flyers: public read
create policy "Public read event flyers"
  on storage.objects for select
  using (bucket_id = 'event-flyers');

create policy "Admin upload event flyers"
  on storage.objects for insert
  with check (bucket_id = 'event-flyers' and auth.uid() is not null);

-- Business logos: public read
create policy "Public read business logos"
  on storage.objects for select
  using (bucket_id = 'business-logos');

create policy "Admin upload business logos"
  on storage.objects for insert
  with check (bucket_id = 'business-logos' and auth.uid() is not null);

-- Fundraiser images: public read
create policy "Public read fundraiser images"
  on storage.objects for select
  using (bucket_id = 'fundraiser-images');

create policy "Admin upload fundraiser images"
  on storage.objects for insert
  with check (bucket_id = 'fundraiser-images' and auth.uid() is not null);
