import { useRef, useState } from 'react'
import { ImagePlus, Star, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import {
  ACCEPTED_SIGNATURE_TYPES,
  createCertificateSignature,
  deleteCertificateSignature,
  getSignaturePublicUrl,
  updateCertificateSignature,
  uploadCertificateSignatureImage,
  validateSignatureFile,
} from '@/lib/certificateSignatures'
import type { CertificateSignature } from '@/lib/types'

type CertificateSignatureLibraryProps = {
  signatures: CertificateSignature[]
  onChanged: () => void
  createdBy?: string | null
}

export function CertificateSignatureLibrary({
  signatures,
  onChanged,
  createdBy = null,
}: CertificateSignatureLibraryProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [signerName, setSignerName] = useState('')
  const [signerTitle, setSignerTitle] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CertificateSignature | null>(null)

  function resetForm() {
    setSignerName('')
    setSignerTitle('')
    setIsDefault(false)
    setFile(null)
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleFileChange(next: File | null) {
    if (!next) {
      setFile(null)
      setPreview(null)
      return
    }
    const error = validateSignatureFile(next)
    if (error) {
      toast.error(error)
      return
    }
    setFile(next)
    setPreview(URL.createObjectURL(next))
  }

  async function handleUpload() {
    if (!signerName.trim() || !signerTitle.trim()) {
      toast.error('Enter signer name and title.')
      return
    }
    if (!file) {
      toast.error('Select a signature image.')
      return
    }

    setUploading(true)
    try {
      const id = crypto.randomUUID()
      const imagePath = await uploadCertificateSignatureImage(file, id)
      await createCertificateSignature({
        id,
        signerName: signerName.trim(),
        signerTitle: signerTitle.trim(),
        imagePath,
        isDefault,
        createdBy,
      })
      toast.success('Signature saved.')
      resetForm()
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save signature.')
    } finally {
      setUploading(false)
    }
  }

  async function handleToggleActive(sig: CertificateSignature, active: boolean) {
    try {
      await updateCertificateSignature(sig.id, { is_active: active })
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update signature.')
    }
  }

  async function handleSetDefault(sig: CertificateSignature) {
    try {
      await updateCertificateSignature(sig.id, { is_default: true, is_active: true })
      toast.success(`${sig.signer_name} set as default signature.`)
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to set default.')
    }
  }

  async function handleReplace(sig: CertificateSignature, next: File) {
    const error = validateSignatureFile(next)
    if (error) {
      toast.error(error)
      return
    }
    try {
      const imagePath = await uploadCertificateSignatureImage(next, sig.id)
      await updateCertificateSignature(sig.id, { image_url: imagePath })
      toast.success('Signature image replaced.')
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to replace image.')
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteCertificateSignature(deleteTarget)
      toast.success('Signature deleted.')
      setDeleteTarget(null)
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete signature.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border p-4 space-y-3 bg-muted/20">
        <p className="text-sm font-medium">Add signature</p>
        <p className="text-xs text-muted-foreground">
          Upload a transparent PNG signature (JPG also accepted). Recommended max height when printed: 0.4 inches.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sig-lib-name">Signer name</Label>
            <Input
              id="sig-lib-name"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="e.g. Brenda Kariuki"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sig-lib-title">Signer title / role</Label>
            <Input
              id="sig-lib-title"
              value={signerTitle}
              onChange={(e) => setSignerTitle(e.target.value)}
              placeholder="e.g. KIGH President / Chairperson"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_SIGNATURE_TYPES}
            className="hidden"
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <ImagePlus className="h-4 w-4 mr-1.5" />
            Choose image
          </Button>
          {preview ? (
            <img src={preview} alt="Signature preview" className="h-10 max-w-[140px] object-contain border rounded bg-white px-2" />
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={isDefault} onCheckedChange={setIsDefault} />
            Set as default
          </label>
          <Button type="button" size="sm" onClick={() => void handleUpload()} disabled={uploading}>
            <Upload className="h-4 w-4 mr-1.5" />
            {uploading ? 'Saving…' : 'Save signature'}
          </Button>
        </div>
      </div>

      {signatures.length > 0 ? (
        <div className="rounded-md border divide-y">
          {signatures.map((sig) => (
            <div key={sig.id} className="flex flex-wrap items-center gap-3 p-3">
              <img
                src={getSignaturePublicUrl(sig.image_url)}
                alt=""
                className="h-9 max-w-[120px] object-contain border rounded bg-white px-2"
              />
              <div className="flex-1 min-w-[160px]">
                <p className="text-sm font-medium">{sig.signer_name}</p>
                <p className="text-xs text-muted-foreground">{sig.signer_title}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {sig.is_default ? (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="h-3 w-3" />
                    Default
                  </Badge>
                ) : (
                  <Button type="button" size="sm" variant="ghost" onClick={() => void handleSetDefault(sig)}>
                    Set default
                  </Button>
                )}
                <label className="flex items-center gap-2 text-xs">
                  <Switch
                    checked={sig.is_active}
                    onCheckedChange={(v) => void handleToggleActive(sig, v)}
                  />
                  Active
                </label>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept={ACCEPTED_SIGNATURE_TYPES}
                    className="hidden"
                    onChange={(e) => {
                      const next = e.target.files?.[0]
                      if (next) void handleReplace(sig, next)
                      e.target.value = ''
                    }}
                  />
                  <Button type="button" size="sm" variant="outline" asChild>
                    <span>Replace</span>
                  </Button>
                </label>
                <Button type="button" size="sm" variant="ghost" onClick={() => setDeleteTarget(sig)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No saved signatures yet.</p>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete signature?"
        description={
          deleteTarget
            ? `Remove the signature for ${deleteTarget.signer_name}? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}
