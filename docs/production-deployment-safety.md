# KIGH Production Deployment Safety Guide

This project uses a guarded deployment flow to reduce the risk of accidentally deploying UAT or Preview work to Production.

## Golden rule

Preview/UAT testing and Production release are different actions.

- Preview/UAT deploy: `npm run deploy:preview`
- Production deploy: `npm run deploy:prod`

Do not use raw `vercel --prod` during normal testing.

---

## Deployment commands

### Preview / UAT

Use this for normal testing:

```bash
npm run deploy:preview
```

This runs a normal Vercel Preview deployment and does **not** deploy to Production.

### Production

Use this only when intentionally releasing:

```bash
npm run deploy:prod
```

This runs:

```bash
node scripts/deploy-production-guard.mjs
```

The production guard blocks deployment unless:

1. The Git working tree is clean.
2. The current branch is `main`.
3. The user types exactly `DEPLOY PRODUCTION`.
4. The user confirms again by typing `yes`.

Only then does the script run:

```bash
vercel --prod
```

---

## Production guard behavior

The guard blocks Production deployment if there are uncommitted files.

Example blocked state:

```text
M package.json
?? scripts/deploy-production-guard.mjs
```

Fix by committing, stashing, or restoring changes before Production deploy.

The guard also blocks Production deployment from any branch other than `main`.

---

## Required operating discipline

Use this for UAT and Preview testing:

```bash
npm run deploy:preview
```

Use this for real Production release:

```bash
npm run deploy:prod
```

Avoid this during normal testing:

```bash
vercel --prod
```

If `vercel --prod` is ever used manually, treat it as a Production release and run the full validation checklist afterward.

---

## Current launch model

The current launch path uses:

- One GitHub repository
- One Vercel project
- One Supabase project
- Vercel Preview deployments for testing
- Vercel Production deployment for the public site/domain

Important: if Preview and Production use the same Supabase project, they share the same database, auth users, storage, and data. After public launch, do not run destructive UAT tests against that shared Supabase project.

---

## Pre-production checklist

Before running `npm run deploy:prod`, run:

```bash
git status --short
git log --oneline -10
```

`git status --short` should return nothing.

Then run:

```bash
npm run lint
npx tsc --noEmit
npm run build
npm test
```

Expected result:

- ESLint: no errors
- TypeScript: pass
- Build: pass
- Vitest: pass

Known warnings may exist, but Production cutover should have zero test failures.

---

## Deployed E2E validation

After Production deployment, run Playwright against the deployed Vercel alias or final domain.

Before domain cutover:

```bash
PLAYWRIGHT_BASE_URL=https://kenyan-community-houston-drab.vercel.app \
PLAYWRIGHT_SKIP_WEB_SERVER=true \
npx playwright test --project=chromium
```

Targeted cutover suite:

```bash
PLAYWRIGHT_BASE_URL=https://kenyan-community-houston-drab.vercel.app \
PLAYWRIGHT_SKIP_WEB_SERVER=true \
npx playwright test \
  e2e/tests/public-smoke.spec.ts \
  e2e/tests/gallery.spec.ts \
  e2e/tests/calendar-events.spec.ts \
  e2e/tests/membership-auth.spec.ts \
  e2e/tests/member-location-profession.spec.ts \
  e2e/tests/community-requests.spec.ts \
  e2e/tests/public-header-login.spec.ts \
  e2e/tests/mobile-smoke.spec.ts \
  e2e/tests/support.spec.ts \
  e2e/tests/whatsapp-invites.spec.ts \
  e2e/tests/static-submit-routes.spec.ts \
  --project=chromium
```

Admin-focused suite:

```bash
PLAYWRIGHT_BASE_URL=https://kenyan-community-houston-drab.vercel.app \
PLAYWRIGHT_SKIP_WEB_SERVER=true \
npx playwright test \
  e2e/tests/admin-pages.spec.ts \
  e2e/tests/admin-gallery-bulk.spec.ts \
  e2e/tests/admin-dashboard-attention.spec.ts \
  --project=chromium
```

Admin/member tests may skip when `E2E_ADMIN_*` or `E2E_MEMBER_*` credentials are not configured. Expected credential-gated skips are acceptable. Failures are not acceptable for cutover.

---

## Vercel environment rules

Preview and Production environment variables are separate.

Check env vars:

```bash
vercel env ls
```

Production should explicitly include required app variables before real domain cutover:

```text
VITE_CONTACT_EMAIL
VITE_DEPLOYMENT_TYPE
VITE_APP_ENV
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_PRODUCTION_SUPABASE_URLS
```

Recommended:

```text
VITE_APP_URL
VITE_PUBLIC_SITE_URL
VITE_SUPABASE_ENV
```

Do not paste secrets or keys into chat, screenshots, tickets, or public documentation.

---

## Inspect Vercel env names safely

To inspect Production env names without exposing values:

```bash
vercel env pull .env.vercel.production --environment=production
cut -d= -f1 .env.vercel.production | sort
```

The file `.env.vercel.production` must not be committed.

Generated Vercel env files should be ignored:

```text
.env.vercel.*
```

---

## Local env file rule

Local `.env` files are for local development only.

Production should use Vercel Production environment variables.

Check whether `.env` is tracked:

```bash
git ls-files .env
```

If `.env` is tracked, remove it from Git tracking only after Vercel Production env vars are confirmed:

```bash
git rm --cached .env
grep -n '^\.env$' .gitignore || echo '.env' >> .gitignore
git add .gitignore
git commit -m 'chore: stop tracking local environment file'
git push origin main
```

This does not delete the local `.env`; it only stops tracking it in Git.

---

## Supabase Auth URL cutover

Before real domain cutover, keep the Vercel alias in Supabase Auth redirect URLs:

```text
https://kenyan-community-houston-drab.vercel.app
https://kenyan-community-houston-drab.vercel.app/*
```

After the real domain is connected and verified, update Supabase Authentication URL Configuration.

Set Site URL:

```text
https://yourdomain.com
```

Add redirect URLs:

```text
https://yourdomain.com
https://yourdomain.com/*
https://www.yourdomain.com
https://www.yourdomain.com/*
https://kenyan-community-houston-drab.vercel.app
https://kenyan-community-houston-drab.vercel.app/*
```

Keep the Vercel alias temporarily during transition.

---

## Domain cutover sequence

1. Confirm working tree is clean.
2. Confirm latest commit is pushed to `origin/main`.
3. Confirm Production Vercel env vars are present.
4. Deploy using `npm run deploy:prod`.
5. Run deployed E2E tests against the Vercel alias.
6. Add the domain in Vercel.
7. Update DNS as instructed by Vercel.
8. Update Supabase Auth Site URL and redirect URLs.
9. Run smoke tests against the real domain.
10. Manually verify admin, member, and logged-out flows.

---

## Manual post-cutover checklist

Open and verify:

```text
/
/membership
/login
/calendar
/events
/gallery
/gallery/submit
/new-to-houston
/chat
/support
/governance
/admin/dashboard
/admin/gallery?tab=published
/admin/members?membershipStatus=pending
```

Verify:

```text
Header Login visible when logged out
Account/Logout visible when logged in
Membership form loads
Calendar grid works
Event detail flyers show full image
Gallery slideshow works
Gallery submit accepts multiple images
Support KIGH treasury handles are visible
Admin dashboard attention links work
Admin gallery published tab can manage images
Members page approval fields are readable
```

---

## Final release evidence

After cutover, record:

```text
Commit:
Vercel deployment URL:
Production domain:
Playwright result:
Manual smoke completed by:
Date/time:
```
