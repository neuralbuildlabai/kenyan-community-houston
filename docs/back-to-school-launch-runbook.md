# Back-to-School Virtual Session — Production Launch Runbook

## Order of operations

The tech steps (1) must finish before the admin steps (2) — the signup
form's role dropdown and membership opt-in need migrations 071–074 and
the new build live in production first.

## 1. Tech: migrate + deploy (one person, ~5 minutes)

```bash
cd ~/projects/kenyan-community-houston

supabase link --project-ref tzrlwleaycawpkzmbqxr   # PRODUCTION
supabase db push                                    # applies 071, 072, 073, 074
npm run deploy:prod

supabase link --project-ref eipjpvltwmvdyvbqqwus   # re-link back to staging
```

## 2. Admin: create the event (any elevated admin, in the browser)

1. Sign in at **www.kenyansingreaterhouston.org/admin** → **Calendar** → create event.
2. Fill in:
   - **Title:** KIGH Back-to-School Virtual Session
   - **Date:** Friday, August 14, 2026 · set the start time
   - **Virtual:** ON (add the Zoom/Meet link in the virtual URL field when ready)
   - **Category:** Education / Career
   - **Free event:** ON
   - **Description:** short paragraph inviting teachers, educators, counselors,
     college advisors, and mentors to present; parents, students & community
     welcome to attend. Mention presenters receive a KIGH digital certificate
     of recognition.
   - **Flyer:** upload the Back-to-School flyer image
3. In the **Volunteer signup** section:
   - **Enable:** ON
   - **Instructions** (suggested):
     > Presenters welcome — teachers, counselors, college advisors, and
     > mentors. Select your role below and add your session topic in the notes.
   - Optionally set **Signup closes** (e.g. Aug 12) so there's time to build
     the run-of-show.
4. **Publish** the event.
5. Copy the generated **volunteer link** (Copy / WhatsApp buttons in the
   editor). It will look like:
   `https://www.kenyansingreaterhouston.org/events/<slug>/volunteer`

## 3. Share (suggested WhatsApp message)

> 📚 KIGH Back-to-School Virtual Session — Friday, August 14 🍎
>
> Teachers, educators, counselors, college advisors, mentors — sign up to
> present! Pick your role and topic here (takes under a minute):
> [volunteer link]
>
> Presenters receive a KIGH digital certificate of recognition. 🎓
> Parents, students & community: mark your calendar — attendance details to follow.

## 4. After launch — where things show up

- **Presenter/volunteer signups:** Admin → Volunteers (filter by event; role
  column shows what they picked).
- **Membership opt-ins:** Admin → Members, `membership_status = pending`;
  the review note says "Auto-created from event volunteer/presenter signup…".
  2026 dues show as **waived** (automatic until Dec 1, 2026 — then new leads
  switch to pending for 2027; no action needed on the day).
- Follow up with each pending member to welcome them and collect mailing
  address; point voluntary contributions at **/support**.

## 5. After the event

- Issue **Community Speaker Recognition** certificates to confirmed
  presenters via Admin → Certificates (manual, one per presenter, ~2–3 min
  each; send the PDFs by email/WhatsApp).

## Notes

- December 2026: existing members marked `waived` were waived for 2026 only —
  flip them to `pending` for the 2027 dues cycle (one admin SQL or manual
  status changes in Admin → Members).
- Per-event custom role lists (e.g. a financial-literacy session wanting only
  insurance/tax/planning roles) can be set on any event via
  `events.volunteer_role_options` — see migration 072's header comment.
