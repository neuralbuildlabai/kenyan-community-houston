# KIGH Production Deployment Safety Guide

This project uses a guarded production deployment flow to reduce the risk of accidentally deploying UAT/Preview work to Production.

## Golden rule

Preview/UAT testing and Production release are different actions.

- UAT / Preview deploy: `npm run deploy:preview`
- Production deploy: `npm run deploy:prod`

Do not use raw `vercel --prod` during normal testing.

---

## Current deployment model

The project currently uses:

- One GitHub repository
- One Vercel project
- One Supabase project for the current launch path
- Vercel Preview deployments for UAT/testing
- Vercel Production deployment for the final public site/domain

Important: if the same Supabase project is used for Preview and Production, then Preview and Production share the same database, auth users, storage, and data. Do not run destructive tests against that Supabase project after public launch.

---

## Preview / UAT deployment

Use Preview for normal testing.

```bash
npm run deploy:preview
