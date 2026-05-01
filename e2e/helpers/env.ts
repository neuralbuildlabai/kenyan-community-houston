export const hasAdminCredentials =
  Boolean(process.env.E2E_ADMIN_EMAIL?.trim()) && Boolean(process.env.E2E_ADMIN_PASSWORD?.trim())

export const hasMemberCredentials =
  Boolean(process.env.E2E_MEMBER_EMAIL?.trim()) && Boolean(process.env.E2E_MEMBER_PASSWORD?.trim())

export const formSubmissionsEnabled = process.env.E2E_ENABLE_FORM_SUBMISSIONS === 'true'

export const uploadTestsEnabled = process.env.E2E_ENABLE_UPLOAD_TESTS === 'true'
