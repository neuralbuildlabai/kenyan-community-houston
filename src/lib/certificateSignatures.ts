import { supabase } from '@/lib/supabase'
import type { CertificateFormData } from '@/lib/certificateTemplates'
import type { CertificateSignature } from '@/lib/types'

export const CERTIFICATE_SIGNATURES_BUCKET = 'certificate-signatures'
export const ACCEPTED_SIGNATURE_TYPES = 'image/png,image/jpeg,image/jpg'
export const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024

export function getSignaturePublicUrl(imagePath: string): string {
  if (imagePath.startsWith('http')) return imagePath
  const { data } = supabase.storage.from(CERTIFICATE_SIGNATURES_BUCKET).getPublicUrl(imagePath)
  return data.publicUrl
}

export async function fetchActiveCertificateSignatures(): Promise<CertificateSignature[]> {
  const { data, error } = await supabase
    .from('certificate_signatures')
    .select('*')
    .eq('is_active', true)
    .order('is_default', { ascending: false })
    .order('signer_name', { ascending: true })

  if (error) throw error
  return (data as CertificateSignature[]) ?? []
}

export async function fetchAllCertificateSignatures(): Promise<CertificateSignature[]> {
  const { data, error } = await supabase
    .from('certificate_signatures')
    .select('*')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as CertificateSignature[]) ?? []
}

export async function fetchDefaultCertificateSignature(): Promise<CertificateSignature | null> {
  const { data, error } = await supabase
    .from('certificate_signatures')
    .select('*')
    .eq('is_default', true)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw error
  return (data as CertificateSignature | null) ?? null
}

export function validateSignatureFile(file: File): string | null {
  const allowed = ['image/png', 'image/jpeg', 'image/jpg']
  if (!allowed.includes(file.type)) {
    return 'Please upload a PNG or JPG image.'
  }
  if (file.size > MAX_SIGNATURE_BYTES) {
    return 'Signature image must be 2 MB or smaller.'
  }
  return null
}

export async function uploadCertificateSignatureImage(file: File, signatureId: string): Promise<string> {
  const ext = file.type === 'image/png' ? 'png' : 'jpg'
  const path = `${signatureId}.${ext}`
  const { error } = await supabase.storage
    .from(CERTIFICATE_SIGNATURES_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) throw error
  return path
}

export async function deleteCertificateSignatureImage(imagePath: string): Promise<void> {
  if (!imagePath) return
  const { error } = await supabase.storage.from(CERTIFICATE_SIGNATURES_BUCKET).remove([imagePath])
  if (error) throw error
}

export async function clearOtherDefaultSignatures(exceptId: string): Promise<void> {
  const { error } = await supabase
    .from('certificate_signatures')
    .update({ is_default: false })
    .eq('is_default', true)
    .neq('id', exceptId)

  if (error) throw error
}

export async function createCertificateSignature(input: {
  id?: string
  signerName: string
  signerTitle: string
  imagePath: string
  isDefault?: boolean
  createdBy?: string | null
}): Promise<CertificateSignature> {
  const id = input.id ?? crypto.randomUUID()

  if (input.isDefault) {
    await supabase.from('certificate_signatures').update({ is_default: false }).eq('is_default', true)
  }

  const { data, error } = await supabase
    .from('certificate_signatures')
    .insert({
      id,
      signer_name: input.signerName.trim(),
      signer_title: input.signerTitle.trim(),
      image_url: input.imagePath,
      is_default: input.isDefault ?? false,
      is_active: true,
      created_by: input.createdBy ?? null,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as CertificateSignature
}

export async function updateCertificateSignature(
  id: string,
  patch: Partial<{
    signer_name: string
    signer_title: string
    image_url: string
    is_default: boolean
    is_active: boolean
  }>
): Promise<CertificateSignature> {
  if (patch.is_default) {
    await clearOtherDefaultSignatures(id)
  }

  const { data, error } = await supabase
    .from('certificate_signatures')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data as CertificateSignature
}

export async function deleteCertificateSignature(record: CertificateSignature): Promise<void> {
  if (record.image_url) {
    await deleteCertificateSignatureImage(record.image_url)
  }
  const { error } = await supabase.from('certificate_signatures').delete().eq('id', record.id)
  if (error) throw error
}


export function resolveCertificateSignature(
  mode: CertificateFormData['signatureMode'],
  signatureId: string | null,
  signatures: CertificateSignature[],
  snapshot?: {
    signerName?: string | null
    signerTitle?: string | null
    imageUrl?: string | null
  } | null
): CertificateSignature | null {
  if (mode === 'none') return null

  if (snapshot?.imageUrl) {
    return {
      id: signatureId ?? 'snapshot',
      signer_name: snapshot.signerName?.trim() || '',
      signer_title: snapshot.signerTitle?.trim() || 'Authorized Signatory',
      image_url: snapshot.imageUrl,
      is_default: false,
      is_active: true,
      created_by: null,
      created_at: '',
      updated_at: '',
    }
  }

  if (mode === 'selected' && signatureId) {
    return signatures.find((s) => s.id === signatureId && s.is_active) ?? null
  }
  if (mode === 'default') {
    return signatures.find((s) => s.is_default && s.is_active) ?? null
  }
  return null
}
