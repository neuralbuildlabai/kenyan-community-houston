export const hasAdminCredentials =
  Boolean(process.env.E2E_ADMIN_EMAIL?.trim()) && Boolean(process.env.E2E_ADMIN_PASSWORD?.trim())

export const formSubmissionsEnabled = process.env.E2E_ENABLE_FORM_SUBMISSIONS === 'true'
