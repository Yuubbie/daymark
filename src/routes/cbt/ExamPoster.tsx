import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { PrintChrome } from '../../components/PrintChrome'
import { QrCode } from '../../components/QrCode'
import { SchoolBrand } from '../../components/SchoolBrand'
import { Alert, Empty, Spinner } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { fetchExamById, type ExamRow } from '../../lib/cbt'
import { getClass } from '../../lib/queries'

export default function ExamPoster() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const { school } = useAuth()
  const [exam, setExam] = useState<ExamRow | null>(null)
  const [className, setClassName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const e = await fetchExamById(id)
        setExam(e)
        if (e?.class_id) {
          const c = await getClass(e.class_id)
          setClassName((c?.name as string) ?? '')
        }
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  const url = token ? `${window.location.origin}/sit/${token}` : ''

  return (
    <PrintChrome
      backTo="/cbt/exams"
      backLabel="Exams"
      title={exam?.title ?? 'Exam'}
      sub="Poster"
      onPrint={exam && token ? () => window.print() : undefined}
      max="max-w-3xl"
    >
      {loading ? (
        <Spinner />
      ) : error ? (
        <Alert>{error}</Alert>
      ) : !exam ? (
        <Empty line="That paper is not in this school." />
      ) : !token ? (
        <Empty line="No link for this poster yet. Open Exams, press Poster, and the link is minted for you." />
      ) : (
        <div className="poster-sheet print:max-w-none">
          <section className="border-2 border-ink rounded-lg p-8 print:border-ink">
            <header className="flex items-center gap-4 pb-6 border-b border-rule">
              <SchoolBrand
                name={school?.name ?? ''}
                logoUrl={school?.logo_url}
                size="md"
                className="text-ink"
              />
              <div className="ml-auto text-right">
                <span className="eyebrow block">{exam.kind}</span>
                {className && <span className="eyebrow block">{className}</span>}
              </div>
            </header>

            <div className="pt-6 text-center">
              <span className="eyebrow">Sit this paper on your phone</span>
              <h1 className="text-[34px] leading-tight mt-2">{exam.title}</h1>
              <p className="mt-2 text-[15px] text-ink-soft">
                {[exam.subject, className].filter(Boolean).join(' · ') || 'Open to the class'}
              </p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">
                {exam.duration_minutes ? `${exam.duration_minutes} minutes` : 'Untimed'}
                {exam.closes_at ? ` · closes ${new Date(exam.closes_at).toLocaleDateString()}` : ''}
              </p>
            </div>

            <div className="mt-7 flex flex-col sm:flex-row items-center gap-7 sm:gap-10 justify-center">
              <QrCode value={url} size={230} className="shrink-0" />
              <div className="text-center sm:text-left max-w-[38ch]">
                <span className="eyebrow block mb-1">Scan or type the address</span>
                <p className="font-mono text-[13px] break-all text-ink">{url}</p>
                <p className="mt-3 text-[13px] text-ink-soft">
                  No Daymaark account. No app to install. Works on any phone with a camera.
                </p>
              </div>
            </div>

            <div className="mt-7 border-t border-rule pt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <span className="eyebrow block mb-2">How to sit it</span>
                <ol className="text-[13px] text-ink-soft space-y-1.5 list-decimal list-inside">
                  <li>Point the camera at the code, or type the address.</li>
                  <li>Type your full name exactly as it is on the class register.</li>
                  <li>Answer every question, then press Submit once.</li>
                </ol>
              </div>
              <div>
                <span className="eyebrow block mb-2">Before you start</span>
                <ul className="text-[13px] text-ink-soft space-y-1.5 list-disc list-inside">
                  <li>One attempt per name. Sit it once and stay on the page.</li>
                  <li>Borrowed phone? Ask the owner before you begin.</li>
                  <li>A full battery and data, or the offline download if the teacher set it up.</li>
                </ul>
              </div>
            </div>

            {exam.instructions && (
              <p className="mt-6 bg-brass-wash px-4 py-3 rounded-md text-[13px] text-ink leading-relaxed">
                {exam.instructions}
              </p>
            )}

            <footer className="mt-7 pt-4 border-t border-rule flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                {school?.name ?? ''}
                {school?.phone ? ` · ${school.phone}` : ''}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                Code {token.slice(0, 6).toUpperCase()}
              </span>
            </footer>
          </section>

          <p className="print:hidden mt-4 text-[13px] text-ink-faint">
            Print or photocopy one poster for the classroom door. Students sit from their own
            phones. Keep the register to match names on the day.
          </p>
        </div>
      )}
    </PrintChrome>
  )
}
