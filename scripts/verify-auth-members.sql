-- Run against staging/UAT or after migration 028 (verification only).
-- Lists auth users that still have no linked public.members row.

select
  u.id as auth_user_id,
  u.email,
  u.email_confirmed_at,
  u.created_at as auth_created_at
from auth.users u
left join public.members m on m.user_id = u.id
where m.id is null
order by u.created_at desc nulls last;
