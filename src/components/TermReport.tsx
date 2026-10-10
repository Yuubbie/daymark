import { AttendanceSummary, RegisterLegend } from './RegisterStrip'
import { Empty, Panel, Row } from './ui'
import type { ReportSubject, TermReport } from '../lib/report'
import { overallAverage } from '../lib/report'

function kindLabel(kind: string) {
  if (kind === 'exam') return 'Exam'
  if (kind === 'interview') return 'Interview'
  return 'Test'
}

function scoreLine(subject: ReportSubject) {
  if (subject.average == null) return '—'
  return `${subject.average.toFixed(1)}%`
}

export function TermReportCard({ report }: { report: TermReport }) {
  const name = `${report.student.first_name} ${report.student.last_name}`
  const overall = overallAverage(report.subjects)
  const att = report.attendance

  return (
    <article className="report-sheet space-y-4">
      <header className="bg-surface border border-rule rounded-lg p-5">
        <div className="flex items-start gap-4">
          {report.student.photo_url ? (
            <img
              src={report.student.photo_url}
              alt=""
              className="h-16 w-16 rounded-md object-cover border border-rule shrink-0"
            />
          ) : (
            <div className="h-16 w-16 rounded-md border border-rule bg-surface-alt shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <span className="eyebrow">{report.school.name}</span>
            <h1 className="text-[26px] mt-1">{name}</h1>
            <p className="mt-1 text-[13px] text-ink-soft">
              {report.class?.name ?? 'Unassigned'}
              {report.student.admission_number ? ` · ${report.student.admission_number}` : ''}
            </p>
            <p className="eyebrow mt-2">{report.term?.name ?? 'No current term set'}</p>
          </div>
          <div className="hidden sm:block text-right shrink-0">
            <div className="tnum text-[28px] leading-none font-semibold">
              {overall == null ? '—' : overall.toFixed(0)}
            </div>
            <div className="eyebrow mt-1.5">Overall</div>
          </div>
        </div>
      </header>

      <Panel title="Attendance">
        <AttendanceSummary
          pct={att.percent}
          marks={att.marks}
          caption={report.term?.name}
        />
        <div className="mt-4 pt-4 border-t border-rule grid grid-cols-4 gap-3">
          <Mini n={att.present} label="Present" />
          <Mini n={att.late} label="Late" />
          <Mini n={att.absent} label="Absent" />
          <Mini n={att.excused} label="Excused" />
        </div>
        <div className="mt-4">
          <RegisterLegend />
        </div>
      </Panel>

      <Panel title="Subjects">
        {report.subjects.length === 0 ? (
          <Empty line="No approved papers this term yet. Marks appear here after a teacher publishes a paper and the school approves the result." />
        ) : (
          <div className="divide-y divide-rule -my-3">
            {report.subjects.map((s) => (
              <div key={s.subject} className="py-3">
                <Row
                  left={
                    <>
                      <div className="text-[15px] font-semibold">{s.subject}</div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint mt-0.5">
                        {s.papers.length} paper{s.papers.length === 1 ? '' : 's'}
                      </div>
                    </>
                  }
                  right={<span className="tnum text-[15px] font-semibold">{scoreLine(s)}</span>}
                />
                <ul className="mt-1 space-y-1">
                  {s.papers.map((p) => (
                    <li key={p.exam_id} className="flex items-baseline justify-between gap-3 text-[13px]">
                      <span className="text-ink-soft min-w-0 truncate">
                        {kindLabel(p.kind)} · {p.title}
                      </span>
                      <span className="tnum shrink-0">
                        {p.score ?? '—'} / {p.total ?? '—'}
                        {p.percent != null ? ` · ${p.percent.toFixed(0)}%` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <p className="text-[12px] text-ink-faint print:block">
        Only approved CBT papers and the marked register for this term appear on this card.
        Outstanding fees lock the parent view until the school clears them.
      </p>
    </article>
  )
}

function Mini({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div className="tnum text-[18px] leading-none font-semibold">{n}</div>
      <div className="eyebrow mt-1">{label}</div>
    </div>
  )
}
