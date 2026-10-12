export type IdStudent = {
  id: string
  first_name: string
  last_name: string
  admission_number: string | null
  photo_url?: string | null
}

export function StudentIdCard({
  school,
  className,
  student,
  term,
}: {
  school: string
  className: string
  student: IdStudent
  term?: string | null
}) {
  const name = `${student.first_name} ${student.last_name}`

  return (
    <article className="id-card bg-surface border border-rule rounded-md overflow-hidden break-inside-avoid">
      <div className="bg-ink text-ink-invert px-3 py-2">
        <div className="font-display font-bold text-[13px] leading-tight tracking-[-0.02em] truncate">
          {school}
        </div>
      </div>
      <div className="flex gap-3 p-3">
        {student.photo_url ? (
          <img
            src={student.photo_url}
            alt=""
            className="h-[72px] w-[72px] rounded-md object-cover border border-rule shrink-0"
          />
        ) : (
          <div className="h-[72px] w-[72px] rounded-md border border-rule bg-surface-alt shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold leading-tight truncate">{name}</div>
          <div className="mt-1 text-[12px] text-ink-soft truncate">{className}</div>
          <div className="mt-1.5 tnum text-[12px] tracking-[0.08em]">
            {student.admission_number ?? 'No admission no.'}
          </div>
          {term && <div className="eyebrow mt-2 truncate">{term}</div>}
        </div>
      </div>
    </article>
  )
}
