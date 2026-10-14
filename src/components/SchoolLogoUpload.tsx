import { useRef, useState } from 'react'
import { Button } from './ui'
import { uploadSchoolCrest, updateSchoolLogo } from '../lib/queries'
import { ACCEPTED_TYPES, MAX_FILE_SIZE_MB, validateCrest } from '../lib/crest'

export function CrestPicker({
  preview,
  onPick,
  onClear,
  error,
  compact,
}: {
  preview: string | null
  onPick: (file: File) => void
  onClear?: () => void
  error?: string | null
  compact?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const box = compact ? 'h-12 w-12' : 'h-16 w-16'

  return (
    <div className="flex items-start gap-4">
      <div
        className={`${box} rounded-md border border-rule bg-surface-alt overflow-hidden flex items-center justify-center shrink-0`}
      >
        {preview ? (
          <img src={preview} alt="" className="h-full w-full object-contain" />
        ) : (
          <span className="text-[10px] text-ink-faint text-center px-1">No crest</span>
        )}
      </div>
      <div className="min-w-0">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onPick(file)
            e.target.value = ''
          }}
          className="hidden"
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" type="button" onClick={() => inputRef.current?.click()}>
            {preview ? 'Change crest' : 'Upload crest'}
          </Button>
          {preview && onClear && (
            <Button variant="ghost" type="button" onClick={onClear}>
              Remove
            </Button>
          )}
        </div>
        {error && <p className="text-[12px] text-absent mt-1.5">{error}</p>}
        <p className="text-[12px] text-ink-faint mt-1.5">
          JPG, PNG, or WEBP · up to {MAX_FILE_SIZE_MB}MB
        </p>
      </div>
    </div>
  )
}

export function SchoolLogoUpload({
  schoolId,
  currentUrl,
  onSaved,
}: {
  schoolId: string
  currentUrl?: string | null
  onSaved: (url: string | null) => void
}) {
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function pick(file: File) {
    const validationError = validateCrest(file)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setUploading(true)
    const local = URL.createObjectURL(file)
    setPreview(local)
    try {
      const url = await uploadSchoolCrest(schoolId, file)
      setPreview(url)
      onSaved(url)
    } catch (err) {
      setPreview(currentUrl ?? null)
      setError((err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  async function remove() {
    setError(null)
    setUploading(true)
    try {
      await updateSchoolLogo(schoolId, null)
      setPreview(null)
      onSaved(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={uploading ? 'opacity-60 pointer-events-none' : ''}>
      <CrestPicker preview={preview} onPick={(f) => void pick(f)} onClear={() => void remove()} error={error} />
    </div>
  )
}
