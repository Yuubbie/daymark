import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { Alert, Button, Empty, Panel, Row, Spinner } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { currentTerm, listChildren, type Child, type TermBounds } from '../../lib/parent'
import { supabase } from '../../lib/supabase'

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: Record<string, unknown>) => { openIframe: () => void }
    }
  }
}

const PAYSTACK_SCRIPT_SRC = 'https://js.paystack.co/v1/inline.js'

function loadPaystackScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) {
      resolve()
      return
    }
    const existing = document.querySelector(`script[src="${PAYSTACK_SCRIPT_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Paystack script failed to load')))
      return
    }
    const script = document.createElement('script')
    script.src = PAYSTACK_SCRIPT_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Paystack script failed to load'))
    document.body.appendChild(script)
  })
}

type Line = {
  studentId: string
  name: string
  className: string | null
  label: string
  amount: number
  installmentId: string | null
  paid: boolean
}

export default function ParentFeesRoute() {
  const { session, school } = useAuth()
  const [kids, setKids] = useState<Child[]>([])
  const [term, setTerm] = useState<TermBounds>(null)
  const [lines, setLines] = useState<Line[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'ready' | 'processing' | 'verifying'>('ready')
  const [notice, setNotice] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [cs, t] = await Promise.all([listChildren(), currentTerm()])
      setKids(cs)
      setTerm(t)
      const termName = t?.name ?? ''
      const next: Line[] = []
      for (const child of cs) {
        if (!child.class_id || !termName) {
          next.push({
            studentId: child.id,
            name: `${child.first_name} ${child.last_name}`,
            className: child.class_name,
            label: termName || 'This term',
            amount: 0,
            installmentId: null,
            paid: false,
          })
          continue
        }
        const { data: structure, error: sErr } = await supabase
          .from('fee_structures')
          .select('id')
          .eq('class_id', child.class_id)
          .eq('term', termName)
          .maybeSingle()
        if (sErr && !/does not exist|schema cache/i.test(sErr.message)) throw sErr
        if (!structure) {
          next.push({
            studentId: child.id,
            name: `${child.first_name} ${child.last_name}`,
            className: child.class_name,
            label: termName,
            amount: 0,
            installmentId: null,
            paid: false,
          })
          continue
        }
        const { data: inst } = await supabase
          .from('fee_installments')
          .select('id, label, amount_naira, sequence_order')
          .eq('fee_structure_id', structure.id)
          .order('sequence_order')
        const { data: paidRows } = await supabase
          .from('fee_payments')
          .select('fee_installment_id')
          .eq('student_id', child.id)
          .eq('status', 'success')
        const paidSet = new Set((paidRows ?? []).map((p) => p.fee_installment_id))
        const unpaid = (inst ?? []).filter((i) => !paidSet.has(i.id))
        const due = unpaid[0]
        next.push({
          studentId: child.id,
          name: `${child.first_name} ${child.last_name}`,
          className: child.class_name,
          label: due ? due.label : 'Cleared',
          amount: due ? (due.amount_naira as number) : 0,
          installmentId: due ? (due.id as string) : null,
          paid: !due,
        })
      }
      setLines(next)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const due = useMemo(() => lines.filter((l) => !l.paid && l.amount > 0), [lines])
  const total = due.reduce((n, l) => n + l.amount, 0)

  async function payHousehold() {
    if (due.length === 0) return
    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY
    if (!publicKey) {
      setError('Payment is not configured.')
      return
    }
    setError(null)
    setNotice(null)
    try {
      await loadPaystackScript()
    } catch (e) {
      setError((e as Error).message)
      return
    }
    if (!window.PaystackPop) return
    setStatus('processing')
    const handler = window.PaystackPop.setup({
      key: publicKey,
      email: session?.user.email ?? '',
      amount: total * 100,
      currency: 'NGN',
      metadata: {
        school_id: school?.id,
        household: true,
        items: due.map((l) => ({ student_id: l.studentId, fee_installment_id: l.installmentId })),
      },
      callback: (response: { reference: string }) => {
        void (async () => {
          setStatus('verifying')
          try {
            for (const line of due) {
              if (!line.installmentId) continue
              await supabase.functions.invoke('verify-fee-payment', {
                body: {
                  reference: response.reference,
                  student_id: line.studentId,
                  fee_installment_id: line.installmentId,
                },
              })
            }
            setNotice('Payment sent. The office will mark fees cleared on the class list.')
            await load()
          } catch (e) {
            setError((e as Error).message)
          } finally {
            setStatus('ready')
          }
        })()
      },
      onClose: () => setStatus('ready'),
    })
    handler.openIframe()
  }

  return (
    <AppShell>
      <span className="eyebrow">Fees</span>
      <h1 className="text-[26px] mt-1">Household</h1>
      <p className="mt-2 text-[14px] text-ink-soft max-w-[48ch]">
        Every child on this login, one statement. Pay once. You do not open a portal per child.
      </p>

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}
      {notice && !error && (
        <p className="mt-4 text-[13px] text-present font-semibold">{notice}</p>
      )}

      {loading ? (
        <Spinner />
      ) : kids.length === 0 ? (
        <Empty line="No children linked yet. Ask the school for a claim code." />
      ) : (
        <div className="mt-6 space-y-4">
          <Panel title={term?.name ?? 'This term'}>
            <div className="divide-y divide-rule -my-3">
              {lines.map((l) => (
                <Row
                  key={l.studentId}
                  left={
                    <>
                      <div className="text-[15px] font-semibold">{l.name}</div>
                      <div className="text-[12px] text-ink-faint">
                        {l.className ?? 'Unassigned'} · {l.label}
                      </div>
                    </>
                  }
                  right={
                    l.paid ? (
                      <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-present">
                        Paid
                      </span>
                    ) : l.amount > 0 ? (
                      <span className="tnum text-[15px] font-semibold">
                        N{l.amount.toLocaleString('en-NG')}
                      </span>
                    ) : (
                      <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint">
                        Ask office
                      </span>
                    )
                  }
                />
              ))}
            </div>
          </Panel>

          {total > 0 && (
            <Button
              full
              loading={status !== 'ready'}
              onClick={() => void payHousehold()}
            >
              {status === 'processing' && 'Opening payment…'}
              {status === 'verifying' && 'Confirming…'}
              {status === 'ready' && `Pay N${total.toLocaleString('en-NG')} for ${due.length === 1 ? due[0].name : `${due.length} children`}`}
            </Button>
          )}
          {total === 0 && (
            <p className="text-[13px] text-ink-faint">
              Nothing billed on this statement yet. If fees are due, the school marks them on the class list.
            </p>
          )}
        </div>
      )}
    </AppShell>
  )
}
