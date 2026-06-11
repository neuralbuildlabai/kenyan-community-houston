# DNS & Email Audit — kenyansingreaterhouston.org

_Audit date: 2026-05-27_

## Decision

**All public contact email goes to `kenyansinhouston@gmail.com`. The
domain does not run mail.**

No mailbox is provisioned on `kenyansingreaterhouston.org`. No
forwarding either. The team is using the Gmail inbox they already
monitor, and we're not adding the operational surface area of a
domain mailbox right now.

The repo has been updated to reflect this:

- `.env`, `.env.production.example`, `.env.staging.example` —
  `VITE_CONTACT_EMAIL=kenyansinhouston@gmail.com`
- `src/lib/constants.ts` — comment on `PUBLIC_CONTACT_EMAIL` rewritten
  to match the policy

This doc only covers the minimum DNS housekeeping required even when
a domain doesn't run mail. Future direction (domain mailbox, Resend
for transactional auth email, etc.) is captured at the bottom under
**§ Deferred** so it doesn't get lost.

## Current DNS state

From `dig` + `whois` on 2026-05-27:

| Record | Value | Notes |
| --- | --- | --- |
| Registrar | GoDaddy.com, LLC | Manage records in the GoDaddy DNS Manager |
| Nameservers | `ns33.domaincontrol.com`, `ns34.domaincontrol.com` | GoDaddy default |
| MX | _(none)_ | Domain cannot receive mail |
| SPF / DKIM / DMARC | _(unknown — sandbox couldn't reach DNS; almost certainly absent)_ | Run the block in **§ Verification** to confirm |

## What to add at GoDaddy (minimal, anti-spoof only)

Since the domain doesn't send or receive mail, the small but useful
move is to publish records that say so out loud — receiving mail
servers (Gmail, Outlook) will then reject any message that *claims*
to be from `@kenyansingreaterhouston.org`. Without these, a spammer
can spoof the domain freely. With them, they can't.

Add these three records in the GoDaddy DNS Manager:

### 1. Null MX record (RFC 7505)

| Field | Value |
| --- | --- |
| Type | `MX` |
| Host (Name) | `@` |
| Priority | `0` |
| Points to | `.` _(a single dot — literally just "`.`")_ |
| TTL | `1 Hour` |

Tells the world "this domain explicitly does not accept email." Some
GoDaddy UIs balk at a single dot as the target — if so, the
equivalent is `Priority 0` pointing at an empty value, or you can
skip this one record (the SPF + DMARC below are the more important
pair).

### 2. Hard-fail SPF

| Field | Value |
| --- | --- |
| Type | `TXT` |
| Host (Name) | `@` |
| Value | `v=spf1 -all` |
| TTL | `1 Hour` |

Says "no IP is authorized to send mail from this domain." The `-all`
(hard fail) is the right choice when nothing legitimately sends.

### 3. Strict DMARC

| Field | Value |
| --- | --- |
| Type | `TXT` |
| Host (Name) | `_dmarc` |
| Value | `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s` |
| TTL | `1 Hour` |

Tells receiving servers to reject anything claiming to be from this
domain, including subdomains, with strict alignment. No reporting
address (`rua=`) is included because there's no inbox to receive
aggregate reports — that's fine for this baseline.

That's it. Three records, ten minutes in the GoDaddy UI, and the
domain is meaningfully safer than it is right now.

## What NOT to do (right now)

- **Don't sign up for Google Workspace, Zoho, Fastmail, ImprovMX,
  etc.** Pure Gmail policy. Revisit when the team wants a real
  `info@…` mailbox.
- **Don't wire Resend / SendGrid / Postmark into Supabase Auth.**
  Supabase's built-in SMTP is sufficient for password-reset volume
  at current scale. When that changes, see **§ Deferred**.
- **Don't add `VITE_CONTACT_EMAIL=info@kenyansingreaterhouston.org`
  anywhere.** That mailbox does not exist. Mail to it will bounce.

## Verification

Run these from your laptop after adding the records above (allow
15 min – a few hours for propagation):

```bash
DOMAIN="kenyansingreaterhouston.org"

dig $DOMAIN MX +short                 # should show: 0 .
dig $DOMAIN TXT +short                # should include: v=spf1 -all
dig _dmarc.$DOMAIN TXT +short         # should show: v=DMARC1; p=reject; ...
```

Optional sanity checks (cross-provider validation):

- <https://mxtoolbox.com/SuperTool.aspx?action=mx%3akenyansingreaterhouston.org>
- <https://dmarcian.com/dmarc-inspector/?domain=kenyansingreaterhouston.org>

## Brand / URL alignment (done 2026-05-27)

Per the team decision, everything points to
`https://www.kenyansingreaterhouston.org/`. The following files were
updated in the same pass as the email policy above:

- `.env` (local dev) — `VITE_APP_NAME`, `VITE_SITE_NAME` →
  `Kenyans in Greater Houston`
- `.env.production.example` — header comment + `VITE_APP_URL` →
  `https://www.kenyansingreaterhouston.org`, `VITE_APP_NAME` /
  `VITE_SITE_NAME` → `Kenyans in Greater Houston`
- `.env.staging.example` — header comment + `VITE_APP_URL` →
  `https://staging.kenyansingreaterhouston.org`, `VITE_APP_NAME` →
  `Kenyans in Greater Houston (Staging)`, `VITE_SITE_NAME` →
  `Kenyans in Greater Houston`
- `index.html` — `<title>` → `Kenyans in Greater Houston`
- `README.md` — top-level title → `Kenyans in Greater Houston`
- `src/lib/memberDemographics.ts` — `PUBLIC_SITE_URL` fallback →
  `https://www.kenyansingreaterhouston.org`
- `src/vite-env.d.ts` — JSDoc example URL → same
- `src/components/SEOHead.tsx` — `siteUrl` fallback was
  `https://kenyancommunityhouston.com` (wrong domain *and* wrong
  TLD); now `https://www.kenyansingreaterhouston.org`. This one
  matters more than the others because it ends up in every page's
  Open Graph / canonical URL meta tags when `VITE_APP_URL` is unset.
- `src/lib/calendarLinks.ts` — iCal `UID:` suffix changed from
  `@kenyancommunityhouston` to `@kenyansingreaterhouston.org`
  (cosmetic — UIDs need to be unique strings, not real addresses,
  but worth aligning).

Already-correct files left untouched:

- `src/lib/constants.ts` — `APP_NAME` was already
  `Kenyans in Greater Houston`.
- `supabase/functions/_shared/cors.ts` — CORS allow-list already
  covered both apex and `www` of the correct domain.

Intentionally NOT changed (historical record):

- The audit / readiness docs under `docs/` that describe past
  state (`pre-duplication-surgical-environment-audit.md`,
  `production-duplication-readiness-2026-05.md`,
  `staging-production-duplication-brutal-assessment.md`,
  `production-cutover-checklist.md`,
  `production-bootstrap-super-admin.md`,
  `kigh-system-user-manual.md`). These describe decisions made at
  the time and rewriting them now would obscure project history. New
  docs going forward should use the new brand.

## ⚠️ Landmine: hardcoded super-admin email on a dead domain

**Not fixed in this pass — flagged for a dedicated cleanup.**

`supabase/functions/create-admin-user/index.ts:181` contains:

```ts
if (callerEmail === 'admin@kenyancommunityhouston.org') {
  callerAdminRow = { id: callerId, email: callerEmail, role: 'super_admin' }
  callerRole = 'super_admin'
}
```

This is a hardcoded bypass that grants `super_admin` role to whoever
signs in with `admin@kenyancommunityhouston.org`, skipping the
`admin_users` table lookup. The associated tests
(`src/lib/createAdminUserEdgeFunction.test.ts:88, 158, 159` and
`src/lib/superAdminAuthorityMigration.test.ts:19, 20`) assert that
exact string, so any rename has to happen in lockstep.

The risk:

1. The email lives on `kenyancommunityhouston.org`, which has **no MX
   records**. Mail to it bounces. So this account cannot receive a
   Supabase password-reset email — if the session is lost, recovery
   requires direct DB intervention.
2. The brand decision is to consolidate on
   `kenyansingreaterhouston.org`. Keeping a hardcoded production
   bypass on a deprecated brand domain is footgun-shaped.

Cleanup path (separate working session):

1. Decide the canonical super-admin email. Two options:
   (a) provision `admin@kenyansingreaterhouston.org` once a mailbox
   exists on the domain, or (b) use the team Gmail
   (`kenyansinhouston@gmail.com`) — which works *today*.
2. Invite the new email in Supabase Auth and grant it `super_admin`
   in `admin_users`.
3. Sign in as the new super admin and confirm full admin surface
   works.
4. Update `supabase/functions/create-admin-user/index.ts:181`,
   `src/lib/createAdminUserEdgeFunction.test.ts`, and
   `src/lib/superAdminAuthorityMigration.test.ts` to the new email.
5. Deploy. Verify. Then remove the old `admin@kenyancommunityhouston.org`
   account from Supabase Auth.

Until that's done, document the recovery procedure: whoever has
DB-level access can manually flip `admin_users.role` for a new email
to reclaim the super-admin gate.

## Reminder: Vercel dashboard is the source of truth

`.env.vercel.production` and `.env.vercel.preview` in this repo are
**snapshots** created by `vercel env pull` and are gitignored. The
values that actually ship to production live in the Vercel project
settings. If `VITE_CONTACT_EMAIL` is currently set there to anything
other than `kenyansinhouston@gmail.com` (or is unset, which is also
fine — the `constants.ts` fallback covers it), update it in the
dashboard:

> Vercel → Project → Settings → Environment Variables →
> `VITE_CONTACT_EMAIL` → set to `kenyansinhouston@gmail.com` for
> Production and Preview → redeploy.

## Deferred

Captured here so we can pick it up when the project is ready,
without re-discovering it:

1. **Domain mailbox.** When the team wants `info@…` to be a real
   inbox, the cheapest path is a free forwarding service
   (ImprovMX, ForwardEmail.net) → forward to the Gmail. Will replace
   the null-MX above with the provider's MX records.
2. **Resend for Supabase Auth.** The comment in
   `src/pages/auth/ForgotPasswordPage.tsx` plans for this. When
   password-reset volume justifies it, verify the domain in Resend,
   point Supabase Auth → SMTP at Resend, and update SPF/DKIM/DMARC
   accordingly (the strict records above will need to be relaxed).
3. **Brand-drift cleanup** — see §"Brand / domain drift in the repo"
   above.
