const SIZE = {
  xs: { img: 'h-7 max-w-[88px]', text: 'text-[15px]' },
  sm: { img: 'h-8 max-w-[160px]', text: 'text-[17px]' },
  md: { img: 'h-10 max-w-[200px]', text: 'text-[21px]' },
} as const

export function SchoolBrand({
  name,
  logoUrl,
  size = 'sm',
  className = '',
}: {
  name?: string | null
  logoUrl?: string | null
  size?: keyof typeof SIZE
  className?: string
}) {
  const s = SIZE[size]
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name ?? ''}
        className={`${s.img} w-auto object-contain object-left shrink-0 ${className}`}
      />
    )
  }
  return (
    <span
      className={`font-display font-bold tracking-[-0.035em] leading-none truncate ${s.text} ${className}`}
    >
      {name || ''}
    </span>
  )
}
