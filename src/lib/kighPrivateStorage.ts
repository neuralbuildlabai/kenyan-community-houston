/** Private admin documents bucket — not public; RLS + app never expose paths on public pages. */
export const KIGH_PRIVATE_DOCUMENTS_BUCKET = 'kigh-private-documents'

/** Signed URL lifetime for admin downloads (seconds). */
export const PRIVATE_SIGNED_URL_EXPIRY_SEC = 300

export function sanitizeStorageFileName(name: string): string {
  const base = name.replace(/[/\\]/g, '_').replace(/[^\w.\-()\s]+/g, '_').trim()
  return base.length > 0 ? base.slice(0, 200) : 'file'
}

export function isPrivateKighDocumentBucket(bucket: string | null | undefined): boolean {
  return bucket === KIGH_PRIVATE_DOCUMENTS_BUCKET
}
