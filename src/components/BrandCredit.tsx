export const CARE_WHATSAPP = '2347032352158'
export const CARE_DISPLAY = '0703 235 2158'
export const CARE_URL = `https://wa.me/${CARE_WHATSAPP}?text=${encodeURIComponent('Hello Daymaark, I need help.')}`

export function WhatsAppCare({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href={CARE_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="Customer care on WhatsApp"
      className={
        compact
          ? 'inline-flex items-center gap-2 h-9 px-3 rounded-md bg-[#25D366] text-white text-[12px] font-semibold'
          : 'fixed z-40 bottom-[4.5rem] lg:bottom-6 right-4 h-12 px-4 rounded-md bg-[#25D366] text-white text-[13px] font-semibold shadow-none flex items-center gap-2 print:hidden'
      }
    >
      <span aria-hidden className="tnum text-[14px]">
        WA
      </span>
      {compact ? 'Chat' : 'Customer care'}
    </a>
  )
}
