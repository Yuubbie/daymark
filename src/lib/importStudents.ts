export interface ParsedStudent {
  first: string
  last: string
  admission_number?: string
}

/**
 * Splits a single "Surname Firstname" style name the same way the existing
 * paste-a-list flow already does, so both entry paths produce identical
 * results for the same input.
 */
function splitName(raw: string): { first: string; last: string } {
  const clean = raw.trim().replace(/^\d+[.)]\s*/, '')
  const parts = clean.split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return { first: parts[0] ?? '', last: '' }
  return { last: parts[0].replace(/,$/, ''), first: parts.slice(1).join(' ') }
}

function normalizeHeader(h: unknown): string {
  return String(h ?? '').trim().toLowerCase()
}

/**
 * Real school spreadsheets vary a lot: some have a header row with columns
 * like "Surname" / "First Name" / "Admission No", others are just a bare
 * list of names with no header at all. This handles both rather than
 * forcing one exact template on every school.
 *
 * `xlsx` is a large library and only ever needed by an admin opening this
 * one import screen — importing it dynamically here, rather than at the
 * top of the file, keeps it out of the bundle every parent and teacher
 * downloads on every page load.
 */
export async function parseStudentSheet(file: ArrayBuffer): Promise<{
  students: ParsedStudent[]
  usedHeader: boolean
}> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(file, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[firstSheetName]
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    blankrows: false,
    defval: '',
  })

  if (rows.length === 0) return { students: [], usedHeader: false }

  const headerRow = rows[0].map(normalizeHeader)
  const firstIdx = headerRow.findIndex((h) => /^first/.test(h))
  const lastIdx = headerRow.findIndex((h) => /^(last|surname)/.test(h))
  const fullNameIdx = headerRow.findIndex((h) => /^(full ?name|name|student)/.test(h))
  const admissionIdx = headerRow.findIndex((h) => /(admission|adm\b|reg(istration)?)/.test(h))

  const hasHeader = firstIdx !== -1 || lastIdx !== -1 || fullNameIdx !== -1
  const dataRows = hasHeader ? rows.slice(1) : rows

  const students: ParsedStudent[] = dataRows
    .filter((r) => r.some((cell) => String(cell ?? '').trim() !== ''))
    .map((r) => {
      const admission =
        hasHeader && admissionIdx !== -1 ? String(r[admissionIdx] ?? '').trim() : undefined

      if (hasHeader && (firstIdx !== -1 || lastIdx !== -1)) {
        return {
          first: String(r[firstIdx] ?? '').trim(),
          last: String(r[lastIdx] ?? '').trim(),
          admission_number: admission || undefined,
        }
      }
      if (hasHeader && fullNameIdx !== -1) {
        return { ...splitName(String(r[fullNameIdx] ?? '')), admission_number: admission || undefined }
      }

      // No recognisable header: treat column A as the name, and column B
      // (if present) as an admission number rather than a second name.
      const name = splitName(String(r[0] ?? ''))
      const maybeAdmission = String(r[1] ?? '').trim()
      return {
        ...name,
        admission_number: maybeAdmission || undefined,
      }
    })
    .filter((s) => s.first || s.last)

  return { students, usedHeader: hasHeader }
}

