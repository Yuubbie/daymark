/* ---------------------------------------------------------------------------
   Daymark identity.

   A daymark is an unlit marker you steer by in daylight. Read the other way,
   it is one mark per day, which is exactly what the register strip draws.

   The mark is a tally of five: four uprights and a strike. It is the counting
   notation of every classroom register, it cannot be misread as a falling
   chart, and it is literally one week of the product.
--------------------------------------------------------------------------- */

export function Mark({
  className = '',
  accent = 'text-brass',
}: {
  className?: string
  accent?: string
}) {
  return (
    <svg viewBox="0 0 34 26" fill="none" className={className} aria-hidden="true">
      <g fill="currentColor">
        <rect x="2.6" y="3.4" width="3.4" height="19.2" rx="1.7" />
        <rect x="9.3" y="3.4" width="3.4" height="19.2" rx="1.7" />
        <rect x="16" y="3.4" width="3.4" height="19.2" rx="1.7" />
        <rect x="22.7" y="3.4" width="3.4" height="19.2" rx="1.7" />
      </g>
      <path
        d="M1.9 21.1 L31.4 4.9"
        className={accent}
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

const SIZES = {
  xs: { mark: 'h-3.5 w-[18px]', text: 'text-[15px]', gap: 'gap-2' },
  sm: { mark: 'h-4 w-[21px]', text: 'text-[17px]', gap: 'gap-2' },
  md: { mark: 'h-5 w-[26px]', text: 'text-[21px]', gap: 'gap-2.5' },
  lg: { mark: 'h-7 w-[37px]', text: 'text-[29px]', gap: 'gap-3' },
  xl: { mark: 'h-10 w-[52px]', text: 'text-[41px]', gap: 'gap-4' },
} as const

export function Wordmark({
  className = '',
  size = 'md',
  accent = 'text-brass',
}: {
  className?: string
  size?: keyof typeof SIZES
  accent?: string
}) {
  const s = SIZES[size]
  return (
    <span className={`inline-flex items-center ${s.gap} ${className}`}>
      <Mark className={s.mark} accent={accent} />
      <span
        className={`font-display font-bold tracking-[-0.035em] ${s.text}`}
        style={{ lineHeight: 1 }}
      >
        Daymark
      </span>
    </span>
  )
}

/** Stacked lockup with the strapline. Auth screens, print, pitch deck. */
export function Lockup({
  className = '',
  accent = 'text-brass',
}: {
  className?: string
  accent?: string
}) {
  return (
    <span className={`inline-flex flex-col gap-3 ${className}`}>
      <Wordmark size="lg" accent={accent} />
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-55">
        Every school day, marked
      </span>
    </span>
  )
}
