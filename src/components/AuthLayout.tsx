import type { ReactNode } from 'react'
import { Wordmark } from './Logo'
import { RegisterStrip } from './RegisterStrip'
import type { AttendanceMark, AttendanceStatus } from '../lib/types'

/* ---------------------------------------------------------------------------
   Split auth layout.

   Desktop: ink panel proves the product before anyone types a password.
   Phone: the panel condenses to a band, the form takes the screen.
--------------------------------------------------------------------------- */

function demoTerm(seed: number, days = 50): AttendanceMark[] {
  const out: AttendanceMark[] = []
  let n = seed
  for (let i = 0; i < days; i++) {
    n = (n * 1103515245 + 12345) % 2147483648
    const r = (n / 2147483648) * 100
    const status: AttendanceStatus | null =
      i > days - 3 ? null : r > 93 ? 'absent' : r > 86 ? 'late' : r > 83 ? 'excused' : 'present'
    const d = new Date(2026, 0, 12 + Math.floor(i / 5) * 7 + (i % 5))
    out.push({ date: d.toISOString().slice(0, 10), status })
  }
  return out
}

export function AuthLayout({
  children,
  headline,
  sub,
}: {
  children: ReactNode
  headline: ReactNode
  sub: string
}) {
  const term = demoTerm(19)

  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[1.05fr_1fr]">
      <aside className="bg-ink text-ink-invert flex flex-col">
        <div className="px-6 pt-6 lg:px-12 lg:pt-12">
          <Wordmark size="md" className="text-ink-invert" />
        </div>

        {/* Desktop panel */}
        <div className="hidden lg:flex flex-1 flex-col justify-center px-12 py-10">
          <h1 className="text-[44px] leading-[1.05] max-w-[13ch]">{headline}</h1>
          <p className="mt-5 text-[15px] leading-relaxed text-ink-invert/65 max-w-[38ch]">{sub}</p>

          <div className="mt-12 border border-ink-invert/15 rounded-lg p-5 max-w-[420px]">
            <div className="flex items-baseline justify-between">
              <span className="text-[14px] font-semibold">Ada Okafor</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-invert/45">
                JSS 1A
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="tnum text-[32px] leading-none font-semibold">94</span>
              <span className="tnum text-[13px] text-ink-invert/50">%</span>
              <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-ink-invert/45">
                First term
              </span>
            </div>
            <div className="mt-4">
              <RegisterStrip marks={term} height="sm" />
            </div>
            <p className="mt-4 text-[12px] text-ink-invert/45">
              Every school day this term, one mark each.
            </p>
          </div>
        </div>

        {/* Phone band */}
        <div className="lg:hidden px-6 pb-6 pt-5">
          <h1 className="text-[26px] leading-[1.1] max-w-[16ch]">{headline}</h1>
          <div className="mt-4">
            <RegisterStrip marks={term.slice(0, 30)} height="sm" />
          </div>
        </div>

        <div className="hidden lg:block px-12 pb-10">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-invert/35">
            Every school day, marked
          </span>
        </div>
      </aside>

      <main className="flex items-center justify-center px-6 py-10 lg:py-12">
        <div className="w-full max-w-[368px]">{children}</div>
      </main>
    </div>
  )
}
