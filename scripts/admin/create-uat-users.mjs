import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.STAGING_SUPABASE_URL;

const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(`
Missing required environment variables.

Required:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

Example:
  export SUPABASE_URL="https://eipjpvltwmvdyvbqqwus.supabase.co"
  export SUPABASE_SERVICE_ROLE_KEY="PASTE_STAGING_SERVICE_ROLE_KEY_HERE"
  node scripts/admin/create-uat-users.mjs
`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const password = '123456!';
const role = 'community_admin';
const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

const users = [
  { email: 'DrBev@kighuat.test', fullName: 'Dr Bev' },
  { email: 'Brenda@kighuat.test', fullName: 'Brenda' },
  { email: 'Michelle@kighuat.test', fullName: 'Michelle' },
  { email: 'Lauryn@kighuat.test', fullName: 'Lauryn' },
  { email: 'Patrick@kighuat.test', fullName: 'Patrick' },
  { email: 'tester@kighuat.test', fullName: 'General Tester' },
];

async function findUserByEmail(email) {
  const perPage = 1000;
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) throw error;

    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );

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
      password,
      email_confirm: true,
      user_metadata: userMetadata,
      app_metadata: appMetadata,
    });

    if (error) throw error;
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: account.email,
    password,
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

  if (error) {
    throw new Error(`Could not read default KIGH community: ${error.message}`);
  }

  if (!data?.id) {
    throw new Error(
      'Default KIGH community not found. Confirm migration 014_multi_community_foundation.sql has been applied.'
    );
  }

  return data.id;
}

async function upsertProfile(user, account) {
  const now = new Date().toISOString();

  const candidatePayloads = [
    {
      id: user.id,
      email: account.email,
      full_name: account.fullName,
      name: account.fullName,
      role,
      platform_handoff_expires_at: expiresAt,
      updated_at: now,
    },
    {
      id: user.id,
      email: account.email,
      full_name: account.fullName,
      role,
      platform_handoff_expires_at: expiresAt,
      updated_at: now,
    },
    {
      id: user.id,
      email: account.email,
      name: account.fullName,
      role,
      platform_handoff_expires_at: expiresAt,
      updated_at: now,
    },
    {
      id: user.id,
      email: account.email,
      full_name: account.fullName,
      role,
      updated_at: now,
    },
    {
      id: user.id,
      email: account.email,
      name: account.fullName,
      role,
      updated_at: now,
    },
    {
      id: user.id,
      email: account.email,
      role,
      updated_at: now,
    },
    {
      id: user.id,
      role,
      updated_at: now,
    },
  ];

  let lastError = null;

  for (const payload of candidatePayloads) {
    const { error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' });

    if (!error) return;

    lastError = error;
  }

  throw new Error(`Profile upsert failed for ${account.email}: ${lastError?.message}`);
}

async function upsertAdminUserProfile(user, account) {
  const now = new Date().toISOString();

  const candidatePayloads = [
    {
      user_id: user.id,
      email: account.email,
      full_name: account.fullName,
      role,
      status: 'active',
      updated_at: now,
    },
    {
      id: user.id,
      email: account.email,
      full_name: account.fullName,
      role,
      status: 'active',
      updated_at: now,
    },
    {
      user_id: user.id,
      email: account.email,
      role,
      status: 'active',
      updated_at: now,
    },
  ];

  for (const payload of candidatePayloads) {
    const { error } = await supabase
      .from('admin_user_profiles')
      .upsert(payload);

    if (!error) return;

    const message = error.message || '';

    if (
      message.includes('relation "public.admin_user_profiles" does not exist') ||
      message.includes('Could not find the table') ||
      message.includes('schema cache')
    ) {
      console.warn('⚠️  admin_user_profiles table not available; skipping.');
      return;
    }
  }

  console.warn(`⚠️  Could not upsert admin_user_profiles for ${account.email}; continuing.`);
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
    throw new Error(
      `community_admin_roles lookup failed for ${account.email}: ${selectError.message}`
    );
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

    if (error) {
      throw new Error(
        `community_admin_roles update failed for ${account.email}: ${error.message}`
      );
    }

    return;
  }

  const { error } = await supabase
    .from('community_admin_roles')
    .insert({
      ...payload,
      created_at: now,
    });

  if (error) {
    throw new Error(
      `community_admin_roles insert failed for ${account.email}: ${error.message}`
    );
  }
}

async function verifyUser(account) {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,email,role')
    .ilike('email', account.email)
    .maybeSingle();

  if (profileError) {
    console.warn(`⚠️  Could not verify profile for ${account.email}: ${profileError.message}`);
  } else if (!profile) {
    console.warn(`⚠️  No profile row found for ${account.email}`);
  } else if (profile.role !== role) {
    console.warn(`⚠️  ${account.email} profile role is ${profile.role}, expected ${role}`);
  } else {
    console.log(`   verified profile role: ${profile.role}`);
  }
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('KIGH STAGING/UAT USER CREATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Role: ${role}`);
  console.log(`Password: ${password}`);
  console.log(`Expires at: ${expiresAt}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (!SUPABASE_URL.includes('eipjpvltwmvdyvbqqwus')) {
    console.warn(`
⚠️  WARNING:
This Supabase URL does not include the known current staging project ref:
  eipjpvltwmvdyvbqqwus

Current URL:
  ${SUPABASE_URL}

If this is not the KIGH staging project, stop now.
`);
  }

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
      await verifyUser(account);

      successCount += 1;
      console.log(`✅ ${account.email} | ${role} | ${user.id}\n`);
    } catch (error) {
      console.error(`❌ Failed ${account.email}: ${error.message}\n`);
      process.exitCode = 1;
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('DONE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Successful users: ${successCount}/${users.length}`);
  console.log('Temporary UAT logins:');
  for (const account of users) {
    console.log(`${account.email} / ${password}`);
  }
  console.log('\nThese are staging/UAT accounts only. Disable/delete after 72 hours.');
}

main();
