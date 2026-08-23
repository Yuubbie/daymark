/** Hairline icons at 1.6 stroke to sit with the ruled aesthetic. */

type P = { className?: string }
const base = 'h-[18px] w-[18px]'

function S({ children, className = '' }: P & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${base} ${className}`}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const IconToday = (p: P) => (
  <S {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </S>
)

export const IconRegister = (p: P) => (
  <S {...p}>
    <path d="M6 4v16M11 4v16M16 4v16" />
    <path d="M4 18 20 7" />
  </S>
)

export const IconLesson = (p: P) => (
  <S {...p}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
    <path d="M8 8h7M8 12h5" />
  </S>
)

export const IconClass = (p: P) => (
  <S {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
    <path d="M16 6.5a3 3 0 0 1 0 6M17.5 20a5.6 5.6 0 0 0-2-4.3" />
  </S>
)

export const IconFlag = (p: P) => (
  <S {...p}>
    <path d="M5 21V4M5 4h11l-2 3.5L16 11H5" />
  </S>
)

export const IconNotice = (p: P) => (
  <S {...p}>
    <path d="M4 9v6h3l6 4V5L7 9z" />
    <path d="M17 9.5a4 4 0 0 1 0 5" />
  </S>
)

export const IconHomework = (p: P) => (
  <S {...p}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M8 8h8M8 12h8M8 16h4" />
  </S>
)

export const IconSignOut = (p: P) => (
  <S {...p}>
    <path d="M14 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8" />
    <path d="M17 15l3-3-3-3M20 12H10" />
  </S>
)
