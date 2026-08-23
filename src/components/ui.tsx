import { useEffect } from 'react'
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react'

/* ---------------------------------------------------------------------------
   Primitives. Flat, ruled, squared. No shadows anywhere in this file, depth
   in Daymark comes from hairlines, not elevation.
--------------------------------------------------------------------------- */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  full?: boolean
  loading?: boolean
}

export function Button({
  variant = 'primary',
  full,
  loading,
  children,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-md text-[14px] font-semibold ' +
    'transition-colors disabled:opacity-45 disabled:cursor-not-allowed select-none'

  const variants: Record<string, string> = {
    primary: 'bg-brass text-ink hover:bg-brass-dark hover:text-ink-invert',
    secondary: 'bg-surface text-ink border border-rule-strong hover:bg-surface-alt',
    ghost: 'bg-transparent text-ink-soft hover:text-ink hover:bg-surface-alt',
    danger: 'bg-surface text-absent border border-absent/35 hover:bg-absent hover:text-ink-invert',
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${full ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? 'Working...' : children}
    </button>
  )
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
  error?: string
  mono?: boolean
}

export function Field({ label, hint, error, mono, className = '', ...rest }: FieldProps) {
  return (
    <label className="block">
      <span className="eyebrow block mb-1.5">{label}</span>
      <input
        className={`w-full h-11 px-3 bg-surface border rounded-md text-[15px] text-ink
          placeholder:text-ink-faint transition-colors
          ${error ? 'border-absent' : 'border-rule-strong focus:border-brass'}
          ${mono ? 'font-mono tracking-[0.12em] uppercase' : ''} ${className}`}
        {...rest}
      />
      {error ? (
        <span className="block mt-1.5 text-[12px] text-absent">{error}</span>
      ) : hint ? (
        <span className="block mt-1.5 text-[12px] text-ink-faint">{hint}</span>
      ) : null}
    </label>
  )
}

/** A ruled panel. The horizontal rule under the header is the whole aesthetic. */
export function Panel({
  title,
  action,
  children,
  className = '',
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`bg-surface border border-rule rounded-lg ${className}`}>
      {title && (
        <header className="flex items-center justify-between px-4 h-11 border-b border-rule">
          <span className="eyebrow">{title}</span>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

export function StatusPill({ status }: { status: 'present' | 'absent' | 'late' | 'excused' }) {
  const map = {
    present: 'text-present border-present/30 bg-present/8',
    absent: 'text-absent border-absent/30 bg-absent/8',
    late: 'text-late border-late/35 bg-late/10',
    excused: 'text-excused border-excused/30 bg-excused/8',
  }
  return (
    <span
      className={`inline-flex items-center h-6 px-2 rounded-sm border text-[11px] font-mono
        uppercase tracking-[0.1em] ${map[status]}`}
    >
      {status}
    </span>
  )
}

/** Empty states are an invitation to act, never an apology. */
export function Empty({ line, action }: { line: string; action?: ReactNode }) {
  return (
    <div className="py-10 text-center">
      <p className="text-[14px] text-ink-faint max-w-[32ch] mx-auto">{line}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-5 w-5 rounded-full border-2 border-rule-strong border-t-brass animate-spin" />
    </div>
  )
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <div className="border border-absent/35 bg-absent/6 text-absent text-[13px] px-3 py-2.5 rounded-md">
      {children}
    </div>
  )
}

type AreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
  hint?: string
  error?: string
}

export function TextArea({ label, hint, error, className = '', ...rest }: AreaProps) {
  return (
    <label className="block">
      <span className="eyebrow block mb-1.5">{label}</span>
      <textarea
        className={`w-full px-3 py-2.5 bg-surface border rounded-md text-[15px] text-ink
          placeholder:text-ink-faint transition-colors resize-y min-h-[96px]
          ${error ? 'border-absent' : 'border-rule-strong focus:border-brass'} ${className}`}
        {...rest}
      />
      {error ? (
        <span className="block mt-1.5 text-[12px] text-absent">{error}</span>
      ) : hint ? (
        <span className="block mt-1.5 text-[12px] text-ink-faint">{hint}</span>
      ) : null}
    </label>
  )
}

/** Sheet on phones, centred dialog on desktop. */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', h)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-ink/45" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full sm:max-w-[440px] bg-surface border-t sm:border border-rule
                   sm:rounded-lg max-h-[92dvh] overflow-y-auto"
      >
        <header className="sticky top-0 bg-surface flex items-center justify-between px-4 h-12
                           border-b border-rule">
          <span className="eyebrow">{title}</span>
          <button
            onClick={onClose}
            className="text-ink-faint hover:text-ink text-[18px] leading-none px-1"
            aria-label="Close"
          >
            &times;
          </button>
        </header>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

/** A ruled list row. The register aesthetic applied to tabular data. */
export function Row({
  left,
  right,
  onClick,
}: {
  left: ReactNode
  right?: ReactNode
  onClick?: () => void
}) {
  const inner = (
    <>
      <div className="min-w-0">{left}</div>
      {right && <div className="ml-auto shrink-0 flex items-center gap-2">{right}</div>}
    </>
  )
  return onClick ? (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 py-3 text-left hover:bg-surface-alt
                 -mx-4 px-4 transition-colors"
    >
      {inner}
    </button>
  ) : (
    <div className="flex items-center gap-3 py-3">{inner}</div>
  )
}

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div>
      <div className="tnum text-[28px] leading-none font-semibold text-ink">{value}</div>
      <div className="eyebrow mt-1.5">{label}</div>
    </div>
  )
}
