import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { IconBack } from './Icons'
import { Button } from './ui'

export function PrintChrome({
  backTo,
  backLabel = 'Back',
  title,
  sub,
  onPrint,
  extra,
  children,
  max = 'max-w-4xl',
}: {
  backTo: string
  backLabel?: string
  title: string
  sub?: string
  onPrint?: () => void
  extra?: ReactNode
  children: ReactNode
  max?: string
}) {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="print:hidden sticky top-0 z-10 border-b border-rule bg-surface">
        <div className={`mx-auto ${max} px-4 h-14 flex items-center gap-3`}>
          <Link
            to={backTo}
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink hover:text-brass shrink-0"
          >
            <IconBack className="h-3.5 w-3.5" />
            {backLabel}
          </Link>
          <span className="h-5 w-px bg-rule shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold truncate">{title}</div>
            {sub && <div className="eyebrow truncate">{sub}</div>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {extra}
            {onPrint && (
              <Button variant="secondary" onClick={onPrint}>
                Print
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className={`mx-auto ${max} px-4 py-6 print:max-w-none print:px-0 print:py-0`}>
        {children}
      </main>
    </div>
  )
}
