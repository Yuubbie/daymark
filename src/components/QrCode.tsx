import { useMemo } from 'react'
import qrcode from 'qrcode-generator'

/**
 * Minimal QR renderer. We draw our own SVG rather than use the library's
 * createSvgTag so the module squares stay crisp on print and inherit colour.
 * Error correction M tolerates a scuffed or half-shadowed poster.
 */
export function QrCode({
  value,
  size = 200,
  className = '',
  margin = 2,
}: {
  value: string
  size?: number
  className?: string
  margin?: number
}) {
  const { count, cells } = useMemo(() => {
    if (!value) return { count: 0, cells: [] as { row: number; col: number }[] }
    const qr = qrcode(0, 'M')
    qr.addData(value)
    qr.make()
    const n = qr.getModuleCount()
    const out: { row: number; col: number }[] = []
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) out.push({ row: r, col: c })
      }
    }
    return { count: n, cells: out }
  }, [value])

  if (!count) return null
  const span = count + margin * 2

  return (
    <svg
      viewBox={`0 0 ${span} ${span}`}
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Exam link QR code"
      shapeRendering="crispEdges"
    >
      <rect x="0" y="0" width={span} height={span} fill="#FFFFFF" />
      <g fill="#143A2B">
        {cells.map((c) => (
          <rect key={`${c.row}-${c.col}`} x={c.col + margin} y={c.row + margin} width="1" height="1" />
        ))}
      </g>
    </svg>
  )
}
