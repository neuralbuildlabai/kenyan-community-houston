# Community Requests & Event Comments

This document describes the **Community Requests** (`/chat`) and **Event questions & comments** features added in migration `030_community_requests_and_event_comments.sql`.

## 1. Feature overview

- **Community Requests** — Logged-in members open a single tracked thread to ask for referrals, services, event clarification, membership questions, etc. The leadership team responds in-thread. This is **not** an anonymous public chatroom.
- **Event comments** — Logged-in members may post a question on a published event detail page. Submissions are **pending** until an elevated admin approves, hides, or removes them. Public visitors only see **approved** comments.

## 2. One-active-request rule

Each member may have **at most one** row in `chat_threads` with `status` in `('open', 'pending_admin', 'pending_member')`. Enforcement:

- **Partial unique index** `one_active_chat_thread_per_user` on `(user_id)` where status is active.
- **RPC** `create_chat_request(p_title, p_category, p_body)` inserts the thread and first message atomically; duplicate active rows raise `active_request_already_exists`.

## 3. Member workflow

1. Sign in → visit `/chat`.
2. If no active request: fill **title** (5–120 chars), **category**, and **message** (1–3000 chars) → **Start a Request** (calls `create_chat_request`).
3. Conversation appears; member may **reply** while the thread is active (`chat_messages` insert).
4. **Close request** chooses a reason and calls `close_chat_request`; status becomes `closed`.
5. After close, the member may start a **new** request.

## 4. Admin workflow

- **Community Requests** — `/admin/chat` (elevated admin only). List, filter, open a thread, change **status** / **priority**, reply as admin (sets workflow toward “awaiting member” via trigger), optional **internal notes** (`is_internal_note = true`, never visible to members).
- **Event comments** — `/admin/event-comments`. Filter by status; **Approve**, **Hide**, or **Remove** each row.

## 5. Event comments workflow

1. Public event detail (`/events/:slug`) renders **Questions & Comments**.
2. Anonymous users: read approved only; see sign-in prompt.
3. Authenticated members: submit pending comment; see confirmation and own pending text if policy allows.
4. Admins moderate via `/admin/event-comments`.

## 6. RLS / security model

- Uses existing **`public.is_admin()`** (delegates to **`kigh_is_elevated_admin()`** after migration 013).
- **`chat_threads`**: members `SELECT` own rows; no direct `INSERT`/`UPDATE` for members (RPC + admin policies). Admins full CRUD.
- **`chat_messages`**: members `INSERT`/`SELECT` only on own active threads; cannot set `is_internal_note` or spoof `sender_role`. Admins see all including internal notes.
- **`event_comments`**: anon `SELECT` approved only; members `INSERT` pending; members `SELECT` approved ∪ own pending; admins full moderation.

## 7. Migration

- File: `supabase/migrations/030_community_requests_and_event_comments.sql`
- Tables: `chat_threads`, `chat_messages`, `event_comments`
- RPCs: `create_chat_request`, `close_chat_request`
- Trigger: `chat_messages_after_insert_bump_thread` updates `last_message_at` and workflow status.

## 8. Manual production steps

1. **Apply migration** (Supabase SQL editor or CLI):  
   `supabase db push` or run the SQL file against production in a controlled window.
2. **Verify** partial unique index exists (`one_active_chat_thread_per_user`).
3. **Smoke test**: member creates request → admin replies on `/admin/chat` → member sees reply → member closes → member creates again.
4. **Event comments**: member submits on an event → admin approves → public sees text.

## 9. Future enhancements (not implemented)

- Supabase Realtime for live threads  
- Email notifications (admin / member)  
- SMS notifications  
- Abuse reporting & rate limiting / CAPTCHA  
- File attachments  
- Assignment / routing to committees  
- Auto-triage / AI receptionist  

---

For environment variables, no new `VITE_*` keys are required. Optional: document `E2E_MEMBER_EMAIL` / `E2E_MEMBER_PASSWORD` in `.env.test.example` for Playwright member flows.
