# Staging RLS Security Fix — Manual Validation

After applying migrations 013–019 to the **staging** Supabase project,
run the SQL below in the Supabase SQL editor as the indicated user
(use the dashboard "Impersonate" tool, the `set_authenticated_user`
RPC trick, or service role + custom JWT — pick what your team is
comfortable with).

The goal is to prove three things:

1. The repaired `is_admin()` rejects ordinary authenticated users.
2. The new helpers behave correctly across roles.
3. RLS reads on the previously-broken tables now succeed only for
   elevated admins (or owners where applicable).

> ⚠️  Run only against staging. Never against production.
> ⚠️  Some queries write a single audit row via the writer RPC; that
> is fine in staging. Skip those if you want pure read-only.

---

## 0. Prerequisites

```sql
-- Confirm migrations 013–019 are applied.
select relname
from pg_class
where relkind = 'r'
  and relname in (
    'communities','community_domains','community_admin_roles',
    'community_governance_settings','community_ads','audit_logs'
  )
order by relname;
-- Expect 6 rows.

select proname
from pg_proc
where proname in (
  'is_admin','kigh_is_elevated_admin','kigh_current_user_role',
  'kigh_is_platform_super_admin','kigh_has_community_role',
  'kigh_default_community_id','kigh_record_audit',
  'list_active_community_ads','kigh_agm_quorum_required',
  'kigh_link_member_to_user'
)
order by proname;
-- Expect 10 rows.
```

---

## 1. As anon (no auth token)

Using the SQL editor's "anon" role or a curl call against PostgREST
without an Authorization header.

```sql
-- 1a. Public-published reads still work.
select count(*) from public.events       where status = 'published';
select count(*) from public.announcements where status = 'published';

-- 1b. Private tables MUST be empty/blocked.
select count(*) from public.contact_submissions;        -- expect 0
select count(*) from public.members;                    -- expect 0
select count(*) from public.household_members;          -- expect 0
select count(*) from public.membership_payments;        -- expect 0
select count(*) from public.service_interests;          -- expect 0
select count(*) from public.profiles;                   -- expect 0
select count(*) from public.admin_user_profiles;        -- expect 0
select count(*) from public.member_media_submissions;   -- expect 0
select count(*) from public.audit_logs;                 -- expect 0
select count(*) from public.community_admin_roles;      -- expect 0

-- 1c. Anon can submit a contact form (with honeypot empty).
insert into public.contact_submissions (name, email, subject, message, status, honeypot)
values ('Anon Test', 'anon@example.test', 'rls test', 'rls validation', 'new', '');

-- 1d. Anon CANNOT submit with non-empty honeypot.
insert into public.contact_submissions (name, email, subject, message, status, honeypot)
values ('Bot', 'bot@example.test', 'spam', 'spam', 'new', 'http://bots.example.com');
-- Expect: ERROR: new row violates row-level security policy

-- 1e. Anon ads list works only for approved+in-window.
select count(*) from public.list_active_community_ads(null, null, 50);
-- Expect: 0 unless you've approved an ad.
```

---

## 2. As an authenticated NON-admin user

Sign in (or impersonate) a user whose `profiles.role` is NULL or
`'viewer'` or any non-admin string.

```sql
-- 2a. is_admin() must be FALSE.
select public.is_admin();                -- expect false
select public.kigh_is_elevated_admin();  -- expect false
select public.kigh_is_platform_super_admin(); -- expect false
select public.kigh_current_user_role();  -- expect '' or 'viewer' or whatever role string
select public.kigh_has_community_role(array['admin'], null); -- expect false unless they have community admin

-- 2b. Reads on private admin tables MUST return 0 rows.
select count(*) from public.contact_submissions;       -- expect 0
select count(*) from public.members;                   -- expect 0 unless their user_id is linked
select count(*) from public.service_interests;         -- expect 0
select count(*) from public.audit_logs;                -- expect 0
select count(*) from public.admin_user_profiles
  where user_id <> auth.uid();                          -- expect 0
select count(*) from public.community_admin_roles
  where user_id <> auth.uid();                          -- expect 0

-- 2c. Cannot write to admin tables (gallery_images insert as published).
insert into public.gallery_images (image_url, status)
values ('https://example.test/x.jpg', 'published');
-- Expect: ERROR: new row violates row-level security policy

-- 2d. Cannot read admin-only resources.
select count(*) from public.resources where access_level = 'admin_only';
-- Expect: 0
```

---

## 3. As a linked member (own row only)

Sign in as a user whose `auth.users.id` matches a `members.user_id`
(use `kigh_link_member_to_user(p_member_id, p_user_id)` from a
super_admin session to create the link if needed).

```sql
-- 3a. Member sees only their own row.
select count(*) from public.members;
-- Expect: 1

-- 3b. Member can update their non-status fields.
update public.members
   set phone = '+1 555-0000'
 where user_id = auth.uid();
-- Expect: success

-- 3c. Member CANNOT escalate their own status.
update public.members
   set membership_status = 'active'
 where user_id = auth.uid();
-- Expect: failure (row_check fails on the policy because old != new for membership_status)
```

---

## 4. As a community_admin / admin

Sign in as a user with `profiles.role = 'community_admin'`.

```sql
-- 4a. Helpers must be true.
select public.is_admin();                -- expect true
select public.kigh_is_elevated_admin();  -- expect true

-- 4b. Reads on private admin tables now return rows.
select count(*) from public.contact_submissions; -- expect >= 0 (row count)
select count(*) from public.members;             -- expect >= 0
select count(*) from public.service_interests;   -- expect >= 0

-- 4c. Status flip on a contact submission works.
update public.contact_submissions
   set status = 'read'
 where status = 'new'
   and email = 'anon@example.test';

-- 4d. Audit writer works.
select public.kigh_record_audit(
  'rls.validation',
  'contact_submissions',
  null,
  null,
  '{"check":"community_admin"}'::jsonb
);
-- Expect: a uuid; row appears in audit_logs.
```

---

## 5. As a super_admin

Sign in as a user with `profiles.role = 'super_admin'`.

```sql
-- 5a. Helpers must be true.
select public.is_admin();                          -- expect true
select public.kigh_is_platform_super_admin();      -- expect true

-- 5b. Can manage community_admin_roles.
select count(*) from public.community_admin_roles; -- works
-- (insert/update/delete are also allowed by the "ads admin write super" policy)

-- 5c. Can read full audit log.
select count(*) from public.audit_logs;            -- works
```

---

## 6. Storage validation

In the Supabase Storage UI, attempt the following with each test
account; the result column shows the expected outcome.

| Action | anon | non-admin | community_admin | super_admin |
|---|---|---|---|---|
| List `kigh-private-documents` | denied | denied | allowed | allowed |
| Download object from `kigh-private-documents` | denied | denied | allowed | allowed |
| Upload to `gallery` | denied | denied | allowed | allowed |
| Upload to `business-logos` | denied | denied | allowed | allowed |
| Upload to own folder in `kigh-member-media/<uid>/x.png` | denied | allowed | allowed | allowed |
| Upload to other folder in `kigh-member-media/<other-uid>/x.png` | denied | denied | allowed (override) | allowed (override) |

If any "denied" row succeeds, that is a failure — investigate the
storage policy on that bucket.

---

## 7. Roll-forward / roll-back hooks

If 013 needs to be rolled back, recreate the legacy `is_admin()`:

```sql
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select auth.uid() is not null $$;
```

…**but never do this in production.** It is here only as the
emergency knob if a 013 follow-up causes an unrelated admin lockout
on staging.

If 014 needs to be rolled back, drop the new tables in dependency
order: `community_admin_roles`, `community_domains`,
`community_governance_settings`, `communities`. The `community_id`
columns on legacy tables can stay — they are nullable and harmless.

---

## 8. Sign-off

When every check above passes on staging, sign and date this file
in your PR description (or attach a screenshot of the SQL session)
before opening the production cutover PR.
