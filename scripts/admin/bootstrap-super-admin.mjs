#!/usr/bin/env node
// ============================================================
// scripts/admin/bootstrap-super-admin.mjs — PRODUCTION SAFE
// ============================================================
// Promotes an existing auth user to super_admin on a clean
// production Supabase project. See
// docs/production-bootstrap-super-admin.md for the full flow.
//
// Refuses to run unless every guard is satisfied. Read each
// failure message before bypassing.
// ============================================================

import { createClient } from '@supabase/supabase-js';

const KIGH_ENV = (process.env.KIGH_ENV || '').trim().toLowerCase();
const CONFIRM = process.env.KIGH_PRODUCTION_CONFIRM || '';
const OVERWRITE = process.env.KIGH_BOOTSTRAP_OVERWRITE || '';
const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const STAGING_URLS = (process.env.KIGH_STAGING_SUPABASE_URLS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const PROD_REF = (process.env.KIGH_PRODUCTION_PROJECT_REF || '').trim();

const targetEmail = (process.argv[2] || 'admin@kenyancommunityhouston.org').trim().toLowerCase();

function die(msg, code = 1) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(code);
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(' KIGH PRODUCTION SUPER-ADMIN BOOTSTRAP');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ── Guard 1: explicit production acknowledgement ────────────────
if (KIGH_ENV !== 'production') {
  die('Refusing to run. Set KIGH_ENV=production to acknowledge that this script targets a production Supabase project.');
}
if (CONFIRM !== 'YES_I_AM_BOOTSTRAPPING_PRODUCTION') {
  die('Refusing to run. Set KIGH_PRODUCTION_CONFIRM=YES_I_AM_BOOTSTRAPPING_PRODUCTION to confirm intent.');
}

// ── Guard 2: env vars present ───────────────────────────────────
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  die('Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY.');
}

// ── Guard 3: staging-URL collision ──────────────────────────────
if (STAGING_URLS.length && STAGING_URLS.includes(SUPABASE_URL)) {
  die(`Refusing to run. SUPABASE_URL matches KIGH_STAGING_SUPABASE_URLS (${STAGING_URLS.join(', ')}). Use a production URL.`);
}
if (PROD_REF && !SUPABASE_URL.includes(PROD_REF)) {
  die(`Refusing to run. SUPABASE_URL does not match KIGH_PRODUCTION_PROJECT_REF "${PROD_REF}".`);
}

// ── Guard 4: target email sanity ────────────────────────────────
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
  die(`Invalid target email "${targetEmail}".`);
}

console.log(`Environment    : ${KIGH_ENV}`);
console.log(`Supabase URL   : ${SUPABASE_URL}`);
console.log(`Target user    : ${targetEmail}`);
console.log(`Overwrite      : ${OVERWRITE === 'YES_OVERWRITE_EXISTING' ? 'YES' : 'no'}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findAuthUser(email) {
  const perPage = 1000;
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const m = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (m) return m;
    if (!data.users.length || data.users.length < perPage) return null;
    page += 1;
  }
}

async function ensureNoOtherSuperAdmin() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,role')
    .eq('role', 'super_admin');
  if (error) {
    console.warn(`⚠️  Could not enumerate existing super_admins: ${error.message}`);
    return;
  }
  if (!data || data.length === 0) return;
  const others = data.filter((p) => (p.email || '').toLowerCase() !== targetEmail);
  if (others.length === 0) return;
  if (OVERWRITE !== 'YES_OVERWRITE_EXISTING') {
    die(
      `Refusing to run. Existing super_admin(s) found: ${others.map((o) => o.email).join(', ')}. ` +
        'Set KIGH_BOOTSTRAP_OVERWRITE=YES_OVERWRITE_EXISTING to proceed anyway.'
    );
  }
  console.warn(`⚠️  Proceeding with existing super_admin(s) on the project: ${others.map((o) => o.email).join(', ')}`);
}

async function main() {
  const user = await findAuthUser(targetEmail);
  if (!user) {
    die(
      `Auth user "${targetEmail}" not found. Create it via Supabase Dashboard → Auth → Users → Invite, ` +
        'then re-run this script. (See docs/production-bootstrap-super-admin.md.)'
    );
  }

  await ensureNoOtherSuperAdmin();

  const now = new Date().toISOString();

  const { error: upProf } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: targetEmail,
      role: 'super_admin',
      updated_at: now,
    },
    { onConflict: 'id' }
  );
  if (upProf) die(`profiles upsert failed: ${upProf.message}`);

  const { error: upSec } = await supabase.from('admin_user_profiles').upsert(
    {
      user_id: user.id,
      must_change_password: true,
      temporary_password_set_at: now,
      password_changed_at: null,
      display_name: 'KIGH Super Admin',
      position_title: 'Super Admin',
      updated_at: now,
    },
    { onConflict: 'user_id' }
  );
  if (upSec) {
    console.warn(`⚠️  admin_user_profiles upsert failed: ${upSec.message}`);
    console.warn('    The profile is super_admin but the force-rotate gate is not set.');
  }

  console.log(`✅ ${targetEmail} is now super_admin in production.`);
  console.log('   Sign in once at /admin/login. The change-password gate will');
  console.log('   require a new password before the dashboard loads.');
}

main().catch((e) => {
  die(`Bootstrap failed: ${e.message}`);
});
