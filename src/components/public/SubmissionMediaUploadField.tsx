import { Loader2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { submissionMediaAcceptAttr, SUBMISSION_MEDIA_MAX_BYTES } from '@/lib/submissionMediaUpload'

export type SubmissionMediaUploadFieldProps = {
  inputId: string
  label: string
  selectedFileName: string | null
  uploadedUrl: string | null
  uploading: boolean
  error: string | null
  onPickFile: (file: File) => void | Promise<void>
  onClear: () => void
  disabled?: boolean
  className?: string
}

export function SubmissionMediaUploadField({
  inputId,
  label,
  selectedFileName,
  uploadedUrl,
  uploading,
  error,
  onPickFile,
  onClear,
  disabled,
  className,
}: SubmissionMediaUploadFieldProps) {
  const mb = Math.round(SUBMISSION_MEDIA_MAX_BYTES / (1024 * 1024))

  return (
    <div className={cn('form-field-stack', className)}>
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={disabled || uploading}
          onClick={() => document.getElementById(inputId)?.click()}
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? 'Uploading…' : 'Choose file'}
        </Button>
        <input
          id={inputId}
          type="file"
          accept={submissionMediaAcceptAttr}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          disabled={disabled || uploading}
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) void onPickFile(f)
          }}
        />
        {(selectedFileName || uploadedUrl) && !uploading && (
          <Button type="button" variant="ghost" size="sm" className="h-8 text-muted-foreground" onClick={onClear} disabled={disabled}>
            <X className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        )}
      </div>
      {uploading && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5" role="status" aria-live="polite">
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
          Uploading your file…
        </p>
      )}
      {selectedFileName && !uploading && <p className="text-xs text-muted-foreground truncate">{selectedFileName}</p>}
      {uploadedUrl && !uploading && !error && (
        <p className="text-xs text-green-700 dark:text-green-400">File uploaded — it will appear after review.</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        JPEG, PNG, WebP, or PDF up to {mb} MB.
      </p>
    </div>
  )
}
