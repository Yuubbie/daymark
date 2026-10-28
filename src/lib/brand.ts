export const DEFAULT_ACCENT = '#C9922B'

export const ACCENT_PRESETS: { label: string; hex: string }[] = [
  { label: 'Brass', hex: '#C9922B' },
  { label: 'Green', hex: '#2F7D5C' },
  { label: 'Navy', hex: '#1E3A5F' },
  { label: 'Maroon', hex: '#8B2942' },
  { label: 'Purple', hex: '#5B3A8C' },
  { label: 'Ink', hex: '#143A2B' },
]

function hexParts(hex: string): [number, number, number] | null {
  const m = /^#([0-9A-Fa-f]{6})$/.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function toHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join('')}`
}

export function darkenHex(hex: string, amount: number) {
  const p = hexParts(hex)
  if (!p) return hex
  return toHex(
    Math.round(p[0] * (1 - amount)),
    Math.round(p[1] * (1 - amount)),
    Math.round(p[2] * (1 - amount)),
  )
}

export function washHex(hex: string) {
  const p = hexParts(hex)
  if (!p) return '#FAF3E4'
  return toHex(
    Math.round(p[0] * 0.12 + 255 * 0.88),
    Math.round(p[1] * 0.12 + 255 * 0.88),
    Math.round(p[2] * 0.12 + 255 * 0.88),
  )
}

export function applySchoolAccent(hex: string | null | undefined) {
  const root = document.documentElement
  if (!hex || !hexParts(hex)) {
    root.style.removeProperty('--color-brass')
    root.style.removeProperty('--color-brass-dark')
    root.style.removeProperty('--color-brass-wash')
    return
  }
  root.style.setProperty('--color-brass', hex)
  root.style.setProperty('--color-brass-dark', darkenHex(hex, 0.18))
  root.style.setProperty('--color-brass-wash', washHex(hex))
}
