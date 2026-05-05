#!/usr/bin/env node
// ============================================================
// scripts/admin/create-uat-users.mjs — STAGING / UAT ONLY
// ============================================================
// Hardened May 2026 production-readiness run (Part D):
//
//   * Refuses to run unless KIGH_ENV=staging (or =uat).
//   * Refuses to run if VITE_APP_ENV/APP_ENV/NODE_ENV claims production.
//   * Refuses to run if SUPABASE_URL appears in
//     KIGH_PRODUCTION_SUPABASE_URLS (comma-separated allow-list).
//   * Refuses to run if SUPABASE_URL is the documented production
//     project ref (KIGH_PRODUCTION_PROJECT_REF).
//   * No hardcoded weak password. Caller MUST supply
//     UAT_TEMP_PASSWORD or pass --generate to create a strong
//     one-shot password printed to stdout.
//   * No hardcoded tester emails. Caller passes UAT_USER_LIST
//     (comma-separated email[:Display Name] entries) or a JSON
//     file via --users-file <path>.
//
// This script must NEVER target production. Read every guard
// message before bypassing.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';

const KIGH_ENV = (process.env.KIGH_ENV || '').trim().toLowerCase();
const APP_ENV = (process.env.VITE_APP_ENV || process.env.APP_ENV || process.env.NODE_ENV || '').trim().toLowerCase();
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.STAGING_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY || '';
const PROD_REF = (process.env.KIGH_PRODUCTION_PROJECT_REF || '').trim();
const PROD_URL_ALLOWLIST = (process.env.KIGH_PRODUCTION_SUPABASE_URLS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const args = process.argv.slice(2);
const wantsGenerated = args.includes('--generate');
const usersFileIdx = args.indexOf('--users-file');
const usersFile = usersFileIdx >= 0 ? args[usersFileIdx + 1] : null;

function die(msg, code = 1) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(code);
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(' KIGH STAGING/UAT USER CREATION  (NOT FOR PRODUCTION)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ── Guard 1: explicit staging/UAT acknowledgement ────────────────
if (KIGH_ENV !== 'staging' && KIGH_ENV !== 'uat') {
  die(
    'Refusing to run. Set KIGH_ENV=staging (or KIGH_ENV=uat) to ' +
      'acknowledge that this script is staging/UAT only and must not ' +
      'target production.'
  );
}

// ── Guard 2: VITE_APP_ENV / APP_ENV / NODE_ENV must not say prod ─
if (APP_ENV === 'production' || APP_ENV === 'prod') {
  die(
    `Refusing to run. APP_ENV/VITE_APP_ENV/NODE_ENV is "${APP_ENV}". ` +
      'This script must never run in a production environment.'
  );
}

// ── Guard 3: required env vars ───────────────────────────────────
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  die(
    'Missing required environment variables:\n' +
      '  SUPABASE_URL  (or STAGING_SUPABASE_URL)\n' +
      '  SUPABASE_SERVICE_ROLE_KEY  (or STAGING_SUPABASE_SERVICE_ROLE_KEY)'
  );
}

// ── Guard 4: production project ref / URL allow-list collision ───
if (PROD_REF && SUPABASE_URL.includes(PROD_REF)) {
  die(
    `Refusing to run. SUPABASE_URL contains the production project ref "${PROD_REF}". ` +
      'Use the staging project ref instead.'
  );
}
if (PROD_URL_ALLOWLIST.length > 0 && PROD_URL_ALLOWLIST.includes(SUPABASE_URL)) {
  die(
    `Refusing to run. SUPABASE_URL "${SUPABASE_URL}" matches an entry in ` +
      'KIGH_PRODUCTION_SUPABASE_URLS. Use a staging URL instead.'
  );
}

// ── Guard 5: temporary password ──────────────────────────────────
let tempPassword = process.env.UAT_TEMP_PASSWORD || '';
if (!tempPassword && wantsGenerated) {
  tempPassword = randomBytes(18).toString('base64url') + '!Aa1';
}
if (!tempPassword) {
  die(
    'No password supplied. Set UAT_TEMP_PASSWORD to a strong value, ' +
      'or pass --generate to have the script generate a one-shot ' +
      'password and print it to stdout.'
  );
}
if (tempPassword.length < 12) {
  die('UAT_TEMP_PASSWORD must be at least 12 characters.');
}

// ── Guard 6: tester list ─────────────────────────────────────────
function parseInlineUsers(raw) {
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [email, ...rest] = entry.split(':');
      return {
        email: (email || '').trim().toLowerCase(),
        fullName: rest.join(':').trim() || (email || '').split('@')[0],
      };
    })
    .filter((u) => u.email);
}

let users = [];
if (usersFile) {
  try {
    const raw = readFileSync(usersFile, 'utf8');
    const parsed = JSON.parse(raw);
    users = parsed.map((u) => ({
      email: (u.email || '').trim().toLowerCase(),
      fullName: u.fullName || u.full_name || (u.email || '').split('@')[0],
    }));
  } catch (e) {
    die(`Could not read --users-file ${usersFile}: ${e.message}`);
  }
} else if (process.env.UAT_USER_LIST) {
  users = parseInlineUsers(process.env.UAT_USER_LIST);
}

if (!users.length) {
  die(
    'No tester users supplied. Set UAT_USER_LIST="alice@kighuat.test:Alice,bob@kighuat.test:Bob" ' +
      'or pass --users-file <path-to-json> with [{ "email": "...", "fullName": "..." }].'
  );
}

// ── Sanity-check email domains: refuse real-looking domains ──────
const REAL_DOMAINS = [
  'kenyancommunityhouston.org',
  'gmail.com',
  'outlook.com',
  'yahoo.com',
  'hotmail.com',
];
for (const u of users) {
  const domain = u.email.split('@')[1] || '';
  if (REAL_DOMAINS.includes(domain)) {
    die(
      `Refusing to create UAT account for "${u.email}". ` +
        'Use a clearly synthetic test domain (e.g. @kighuat.test).'
    );
  }
}

const role = (process.env.UAT_ROLE || 'community_admin').trim();
if (role === 'super_admin' || role === 'platform_admin') {
  die(
    `Refusing to create UAT users with role "${role}". UAT testers must ` +
      'use community_admin or a lower role.'
  );
}

const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

console.log(`Environment    : ${KIGH_ENV.toUpperCase()} (KIGH_ENV)`);
console.log(`App env        : ${APP_ENV || '(unset)'}`);
console.log(`Supabase URL   : ${SUPABASE_URL}`);
console.log(`Role           : ${role}`);
console.log(`Password       : (${wantsGenerated ? 'generated' : 'env-supplied'}, will be printed once below)`);
console.log(`UAT expires at : ${expiresAt}`);
console.log(`Users          : ${users.length}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function findUserByEmail(email) {
  const perPage = 1000;
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (!data.users.length || data.users.length < perPage) return null;
    page += 1;
  }
}

async function createOrUpdateAuthUser(account) {
  const existing = await findUserByEmail(account.email);
  const userMetadata = {
    full_name: account.fullName,
    role,
    uat_expires_at: expiresAt,
    temporary_uat_user: true,
  };
  const appMetadata = {
    ...(existing?.app_metadata || {}),
    temporary_uat_user: true,
    uat_expires_at: expiresAt,
  };
  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: tempPassword,
      email_confirm: true,
      user_metadata: userMetadata,
      app_metadata: appMetadata,
    });
    if (error) throw error;
    return data.user;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email: account.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: userMetadata,
    app_metadata: appMetadata,
  });
  if (error) throw error;
  return data.user;
}

async function getDefaultCommunityId() {
  const { data, error } = await supabase
    .from('communities')
    .select('id')
    .eq('slug', 'kigh')
    .maybeSingle();
  if (error) throw new Error(`Could not read default KIGH community: ${error.message}`);
  if (!data?.id) {
    throw new Error('Default KIGH community not found. Confirm migration 014 has been applied.');
  }
  return data.id;
}

async function upsertProfile(user, account) {
  const now = new Date().toISOString();
  const payload = {
    id: user.id,
    email: account.email,
    full_name: account.fullName,
    role,
    updated_at: now,
  };
  const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
  if (error) throw new Error(`Profile upsert failed for ${account.email}: ${error.message}`);
}

async function upsertAdminUserProfile(user, account) {
  const now = new Date().toISOString();
  const payload = {
    user_id: user.id,
    must_change_password: false,
    temporary_password_set_at: now,
    password_changed_at: now,
    display_name: account.fullName,
    position_title: 'UAT Tester',
    updated_at: now,
  };
  const { error } = await supabase
    .from('admin_user_profiles')
    .upsert(payload, { onConflict: 'user_id' });
  if (error) {
    console.warn(`⚠️  admin_user_profiles upsert failed for ${account.email}: ${error.message}`);
  }
}

async function upsertCommunityRole(user, account, communityId) {
  const now = new Date().toISOString();
  const { data: existingRows, error: selectError } = await supabase
    .from('community_admin_roles')
    .select('id')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .limit(1);
  if (selectError) {
    throw new Error(`community_admin_roles lookup failed for ${account.email}: ${selectError.message}`);
  }
  const payload = {
    user_id: user.id,
    community_id: communityId,
    role,
    status: 'active',
    updated_at: now,
  };
  if (existingRows?.length) {
    const { error } = await supabase
      .from('community_admin_roles')
      .update(payload)
      .eq('id', existingRows[0].id);
    if (error) throw new Error(`community_admin_roles update failed for ${account.email}: ${error.message}`);
    return;
  }
  const { error } = await supabase
    .from('community_admin_roles')
    .insert({ ...payload, created_at: now });
  if (error) throw new Error(`community_admin_roles insert failed for ${account.email}: ${error.message}`);
}

async function main() {
  const communityId = await getDefaultCommunityId();
  console.log(`Default KIGH community_id: ${communityId}\n`);

  let successCount = 0;
  for (const account of users) {
    try {
      console.log(`Creating/updating ${account.email}...`);
      const user = await createOrUpdateAuthUser(account);
      await upsertProfile(user, account);
      await upsertAdminUserProfile(user, account);
      await upsertCommunityRole(user, account, communityId);
      successCount += 1;
      console.log(`✅ ${account.email} | ${role} | ${user.id}\n`);
    } catch (error) {
      console.error(`❌ Failed ${account.email}: ${error.message}\n`);
      process.exitCode = 1;
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' DONE — STAGING/UAT ONLY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Successful users: ${successCount}/${users.length}`);
  console.log(`Temporary password for these UAT accounts: ${tempPassword}`);
  console.log('Expires after: ' + expiresAt);
  console.log('Disable/delete these accounts after UAT ends.');
}

main();
