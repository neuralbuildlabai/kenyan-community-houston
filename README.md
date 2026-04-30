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

In your [Supabase dashboard](https://app.supabase.com), open the SQL editor and run the migrations in order:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_storage.sql
```

Then optionally seed sample data:

```
supabase/seed.sql
```

### 5. Create storage buckets

The `003_storage.sql` migration creates the buckets programmatically, but if you prefer the UI:

In the Supabase dashboard → Storage → Create buckets:
- `gallery` (public)
- `event-flyers` (public)
- `business-logos` (public)
- `fundraiser-images` (public)

### 6. Create your first admin user

In the Supabase dashboard → Authentication → Users → Invite user, or use the Admin Users page once you have one admin account.

Alternatively, use the Supabase Auth API directly:

```bash
curl -X POST 'https://your-project-id.supabase.co/auth/v1/signup' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"email": "admin@example.com", "password": "your-password"}'
```

### 7. Start the development server

```bash
npm run dev
```

App runs at [http://localhost:5173](http://localhost:5173)

Admin portal: [http://localhost:5173/admin/login](http://localhost:5173/admin/login)

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
| `/admin/login` | Admin login |
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
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

---

## License

Private project – all rights reserved.
