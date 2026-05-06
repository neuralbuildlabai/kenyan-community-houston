# Kenyan Community Houston

A modern community platform connecting Kenyans across the greater Houston area. Built with React, TypeScript, Vite, Tailwind CSS, shadcn/ui, and Supabase.

---

## Features

- **Public pages** – Home, Events, Announcements, Businesses, Community Support (Fundraisers), Sports & Youth, Gallery, New to Houston, About, Contact
- **Submission forms** – Community members can submit events, announcements, businesses, and fundraisers for review
- **Admin portal** – Full content management with moderation queue, gallery uploads, contact inbox, user management, and settings
- **Supabase backend** – PostgreSQL with Row Level Security, Supabase Auth, and Storage buckets

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui + Radix UI |
| Icons | Lucide React |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| Routing | React Router v6 |
| Notifications | Sonner |
| SEO | react-helmet-async |

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-org/kenyan-community-houston.git
cd kenyan-community-houston
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Set up the database

In your [Supabase dashboard](https://app.supabase.com), open the SQL editor and run **all** numbered migrations in order from `supabase/migrations/001_*.sql` through the highest-numbered file. Each new migration is additive and idempotent.

> ⚠️  **Production seed warning.** `supabase/seed.sql` contains
> fictional businesses, fundraisers, and named individuals. It is
> for local development and Playwright tests only. **Do NOT run
> `seed.sql` against staging or production.** When bootstrapping
> a production project, apply migrations only and then optionally
> apply `supabase/seed.production.example.sql` (which only seeds
> the default KIGH community and governance settings — no demo
> people or content).

For local development you may seed demo data:

```
supabase/seed.sql           # local/demo only — never production
```

For production:

```
supabase/seed.production.example.sql   # safe bootstrap (community + governance)
```

### 5. Create storage buckets

The `003_storage.sql` migration creates the buckets programmatically, but if you prefer the UI:

In the Supabase dashboard → Storage → Create buckets:
- `gallery` (public)
- `event-flyers` (public)
- `business-logos` (public)
- `fundraiser-images` (public)

### 6. Create your first admin user

The recommended path is the deployed Edge Function `create-admin-user`,
which uses the service-role key server-side, validates the caller's
role, and forces a password rotation on first login. From the Supabase
dashboard, sign in as an existing super_admin and call the function;
once a single super_admin exists you can manage further admins from
`/admin/users`.

For the very first admin (chicken-and-egg case), create the auth user
through the Supabase Dashboard → Authentication → Users → Invite user
flow, then in the SQL editor `update public.profiles set
role='super_admin' where id = '<that user id>'`. Force password rotation
by inserting a row into `admin_user_profiles` with
`must_change_password = true`.

> Do not use the public Auth signup endpoint to create the first
> admin in production — that path may be disabled in production.

### 7. Production / staging environment separation

This repo enforces environment separation:

- `VITE_APP_ENV` declares the environment (`production` | `staging` | `development`).
- The frontend renders a top-of-page warning banner when not in production.
- `src/lib/supabase.ts` enforces a Supabase URL allow-list at boot
  via `VITE_PRODUCTION_SUPABASE_URLS` and `VITE_STAGING_SUPABASE_URLS`,
  refusing to start a production build pointed at a non-prod project.

See `.env.staging.example` and `.env.production.example` for the
exact variables required.

### 7. Start the development server

```bash
npm run dev
```

App runs at [http://localhost:5173](http://localhost:5173)

Sign in (members and admins): [http://localhost:5173/login](http://localhost:5173/login) — `/admin/login` resolves to the same page.

### Google / Gmail sign-in (Supabase Auth)

The app supports **Continue with Google** on `/login` and on `/membership`. Configure this in the Supabase dashboard (not in git-secrets):

1. **Supabase Dashboard** → **Authentication** → **Providers** → enable **Google**, and paste the **Client ID** and **Client secret** from Google Cloud.
2. **Google Cloud Console** → **APIs & Services** → **Credentials** → create an **OAuth 2.0 Client ID** (Web). Under **Authorized redirect URIs**, add the URL Supabase shows for the Google provider (typically `https://<project-ref>.supabase.co/auth/v1/callback`).
3. **Supabase Dashboard** → **Authentication** → **URL Configuration**:
   - Set **Site URL** to your real site root in production (or `http://127.0.0.1:5173` for local dev if that is how you open the app).
   - Under **Redirect URLs**, allow every origin you use, including the SPA auth route, for example:  
     `http://127.0.0.1:5173/auth/callback`  
     `https://<your-staging-domain>/auth/callback`  
     `https://<your-production-domain>/auth/callback`  
     The app redirects to `/auth/callback?next=/membership` (or `/profile`, etc.) after Google OAuth and uses the same path for **email confirmation** links from `signUp`.
4. **Email/password** sign-up accepts any valid email domain; there is no Gmail-only restriction. Google is optional OAuth in addition to email/password.

---

## Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components (Button, Input, Card, etc.)
│   ├── layout/          # PublicLayout, AdminLayout, Header, Footer, AdminSidebar
│   ├── AnnouncementCard.tsx
│   ├── BusinessCard.tsx
│   ├── EventCard.tsx
│   ├── FundraiserCard.tsx
│   ├── SportsCard.tsx
│   ├── ConfirmDialog.tsx
│   ├── EmptyState.tsx
│   ├── LoadingSpinner.tsx
│   ├── ProtectedRoute.tsx
│   └── SEOHead.tsx
├── contexts/
│   └── AuthContext.tsx
├── lib/
│   ├── supabase.ts      # Supabase client
│   ├── constants.ts     # APP_NAME, categories, etc.
│   └── utils.ts         # cn, slugify, formatDate, formatCurrency, etc.
├── pages/
│   ├── public/          # All public-facing pages
│   └── admin/           # All admin pages
├── App.tsx              # Route definitions
└── main.tsx             # Entry point
supabase/
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_rls_policies.sql
│   └── 003_storage.sql
└── seed.sql
```

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

---

## Admin Portal Routes

| Route | Description |
|---|---|
| `/login` (also `/admin/login`) | Shared sign-in for members and admins |
| `/admin/dashboard` | Overview & stats |
| `/admin/submissions` | Moderation queue |
| `/admin/events` | Manage events |
| `/admin/announcements` | Manage announcements |
| `/admin/businesses` | Manage businesses |
| `/admin/fundraisers` | Manage fundraisers |
| `/admin/gallery` | Gallery management & uploads |
| `/admin/contacts` | Contact form inbox |
| `/admin/users` | Admin user management |
| `/admin/settings` | Account & site settings |

---

## Public Routes

| Route | Description |
|---|---|
| `/` | Home page |
| `/events` | Events listing |
| `/events/:slug` | Event detail |
| `/events/submit` | Submit an event |
| `/announcements` | Announcements listing |
| `/announcements/:slug` | Announcement detail |
| `/announcements/submit` | Submit announcement |
| `/businesses` | Business directory |
| `/businesses/:slug` | Business profile |
| `/businesses/submit` | List your business |
| `/community-support` | Fundraisers listing |
| `/community-support/:slug` | Fundraiser detail |
| `/community-support/submit` | Submit fundraiser |
| `/sports-youth` | Sports & youth posts |
| `/gallery` | Photo gallery |
| `/new-to-houston` | Newcomer resources |
| `/about` | About page |
| `/contact` | Contact form |
| `/privacy` | Privacy policy |
| `/terms` | Terms of use |

---

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_APP_ENV` | `production` \| `staging` \| `development` (defence-in-depth env tag) |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key |
| `VITE_PRODUCTION_SUPABASE_URLS` | Comma-separated allow-list of valid production URLs |
| `VITE_STAGING_SUPABASE_URLS` | Comma-separated allow-list of valid staging URLs |
| `VITE_APP_URL` | Canonical site URL for SEO and email links |
| `VITE_APP_NAME` | Display name |
| `VITE_SITE_NAME` | Long-form site name |
| `VITE_CONTACT_EMAIL` | Contact email shown in templates |

---

## License

Private project – all rights reserved.
