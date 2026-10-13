import { Mark } from './Logo'

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
    <article className="id-card bg-surface text-ink overflow-hidden flex flex-col">
      <header className="id-card-head bg-ink text-ink-invert flex items-center gap-[2mm] px-[3.5mm] py-[2.2mm]">
        <Mark className="h-[11px] w-[15px] shrink-0 text-ink-invert" accent="text-brass" />
        <div className="min-w-0 flex-1">
          <div className="font-display font-bold text-[9pt] leading-tight tracking-[-0.02em] truncate">
            {school}
          </div>
          <div className="font-mono text-[6pt] uppercase tracking-[0.16em] text-ink-invert/55 truncate">
            Student identity card
          </div>
        </div>
      </header>
      <div className="flex-1 flex gap-[3.2mm] px-[3.5mm] py-[2.8mm] min-h-0">
        {student.photo_url ? (
          <img src={student.photo_url} alt="" className="id-card-photo" />
        ) : (
          <div className="id-card-photo id-card-photo-empty" />
        )}
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <div className="font-display font-bold text-[11pt] leading-[1.15] tracking-[-0.03em] break-words">
            {name}
          </div>
          <dl className="mt-[1.6mm] space-y-[0.8mm]">
            <div>
              <dt className="font-mono text-[5.5pt] uppercase tracking-[0.14em] text-ink-faint">Class</dt>
              <dd className="text-[8pt] leading-tight truncate">{className || '—'}</dd>
            </div>
            <div>
              <dt className="font-mono text-[5.5pt] uppercase tracking-[0.14em] text-ink-faint">Admission</dt>
              <dd className="tnum text-[8pt] leading-tight tracking-[0.06em]">
                {student.admission_number ?? '—'}
              </dd>
            </div>
          </dl>
        </div>
      </div>
      <footer className="id-card-foot flex items-baseline justify-between gap-[2mm] px-[3.5mm] py-[1.6mm]">
        <span className="font-mono text-[6pt] uppercase tracking-[0.16em] text-brass-dark">Student</span>
        <span className="font-mono text-[6pt] uppercase tracking-[0.12em] text-ink-faint truncate">
          {term ?? 'Current term'}
        </span>
      </footer>
    </article>
  )
}

export function StudentIdCardBack({
  school,
  student,
  term,
  address,
  phone,
}: {
  school: string
  student: IdStudent
  term?: string | null
  address?: string | null
  phone?: string | null
}) {
  const found = [address, phone].filter(Boolean).join(' · ')
  return (
    <article className="id-card id-card-back bg-surface text-ink overflow-hidden flex flex-col">
      <header className="id-card-head bg-ink text-ink-invert px-[3.5mm] py-[2.2mm]">
        <div className="font-display font-bold text-[9pt] leading-tight tracking-[-0.02em] truncate">
          {school}
        </div>
      </header>
      <div className="flex-1 flex flex-col px-[3.5mm] py-[2.4mm] min-h-0">
        <p className="text-[7pt] text-ink-soft leading-snug">
          If found, return to the school office
          {found ? `. ${found}` : '.'} This card identifies the student named on the front. It is
          not a login.
        </p>
        <div className="mt-auto">
          <div className="font-mono text-[5.5pt] uppercase tracking-[0.14em] text-ink-faint">
            Valid
          </div>
          <div className="text-[8pt] leading-tight">{term ?? 'Current term'}</div>
          <div className="mt-[2.2mm] font-mono text-[5.5pt] uppercase tracking-[0.14em] text-ink-faint">
            Bearer signature
          </div>
          <div className="id-sign-line" />
        </div>
      </div>
      <footer className="id-card-foot px-[3.5mm] py-[1.6mm]">
        <div className="tnum text-[8pt] tracking-[0.18em] text-center">
          {student.admission_number ?? student.id.slice(0, 8).toUpperCase()}
        </div>
      </footer>
    </article>
  )
}

export function StudentIdPair(props: {
  school: string
  className: string
  student: IdStudent
  term?: string | null
  address?: string | null
  phone?: string | null
}) {
  return (
    <div className="id-pair">
      <StudentIdCard {...props} />
      <StudentIdCardBack
        school={props.school}
        student={props.student}
        term={props.term}
        address={props.address}
        phone={props.phone}
      />
    </div>
  )
}

export function ClaimSlip({
  school,
  student,
  code,
}: {
  school: string
  student: string
  code: string
}) {
  return (
    <article className="id-card id-slip bg-surface text-ink overflow-hidden flex flex-col">
      <header className="id-card-head bg-ink text-ink-invert flex items-center gap-[2mm] px-[3.5mm] py-[2.2mm]">
        <Mark className="h-[11px] w-[15px] shrink-0 text-ink-invert" accent="text-brass" />
        <div className="min-w-0 flex-1">
          <div className="font-display font-bold text-[9pt] leading-tight tracking-[-0.02em] truncate">
            {school}
          </div>
          <div className="font-mono text-[6pt] uppercase tracking-[0.16em] text-ink-invert/55">
            Parent claim code
          </div>
        </div>
      </header>
      <div className="flex-1 flex flex-col justify-center px-[3.5mm] py-[2.5mm] min-h-0">
        <div className="text-[10pt] font-semibold leading-tight">{student}</div>
        <div className="mt-[2.2mm] font-mono text-[16pt] tracking-[0.18em] font-semibold leading-none">
          {code}
        </div>
        <p className="mt-[2.4mm] text-[7pt] text-ink-soft leading-snug">
          Parent signs up, then enters this code once. One code per child.
        </p>
      </div>
    </article>
  )
}
