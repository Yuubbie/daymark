export const MAX_FILE_SIZE_MB = 5
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function validateCrest(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'Please choose a JPG, PNG, or WEBP image.'
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `Image must be under ${MAX_FILE_SIZE_MB}MB.`
  }
  return null
}
