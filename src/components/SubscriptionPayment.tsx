import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button, Panel, Alert, Spinner } from './ui'
import { useAuth } from '../lib/auth'
import {
  BILLING_PLANS,
  naira,
  schoolBillingQuote,
  type BillingQuote,
} from '../lib/billing'
import type { BillingPlanKey } from '../lib/types'

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

type Props = {
  schoolId: string
  schoolEmail: string
  onPaymentVerified: () => void
}

type Status = 'loading' | 'ready' | 'processing' | 'verifying' | 'error'

export default function SubscriptionPayment({
  schoolId,
  schoolEmail,
  onPaymentVerified,
}: Props) {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('loading')
  const [quote, setQuote] = useState<BillingQuote | null>(null)
  const [plan, setPlan] = useState<BillingPlanKey>('term')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const q = await schoolBillingQuote()
        if (cancelled) return
        setQuote(q)
        await loadPaystackScript()
        if (cancelled) return
        setStatus('ready')
      } catch (err) {
        if (cancelled) return
        setErrorMessage(err instanceof Error ? err.message : 'Could not load payment details')
        setStatus('error')
      }
    }
    void init()
    return () => {
      cancelled = true
    }
  }, [schoolId])

  const chosen = quote?.plans[plan]
  const amount = chosen?.naira ?? 0

  async function handlePay() {
    if (!chosen || !window.PaystackPop) return
    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY
    if (!publicKey) {
      setErrorMessage('Payment is not configured (missing public key)')
      setStatus('error')
      return
    }
    setStatus('processing')
    const handler = window.PaystackPop.setup({
      key: publicKey,
      email: schoolEmail,
      amount: chosen.kobo,
      currency: 'NGN',
      metadata: {
        school_id: schoolId,
        plan: BILLING_PLANS.find((p) => p.key === plan)?.plan,
        student_count: quote?.student_count,
      },
      callback: (response: { reference: string }) => {
        void verifyOnServer(response.reference)
      },
      onClose: () => setStatus('ready'),
    })
    handler.openIframe()
  }

  async function verifyOnServer(reference: string) {
    setStatus('verifying')
    try {
      const { data, error } = await supabase.functions.invoke('verify-paystack-payment', {
        body: {
          reference,
          school_id: schoolId,
          plan: BILLING_PLANS.find((p) => p.key === plan)?.plan,
        },
      })
      if (error) throw error
      if (!data?.success) {
        throw new Error(data?.message ?? data?.error ?? 'Payment could not be verified')
      }
      onPaymentVerified()
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Payment was received but verification failed — contact the office before retrying.',
      )
      setStatus('error')
    }
  }

  if (status === 'loading') return <Spinner />

  return (
    <div className="min-h-dvh bg-paper flex items-center justify-center px-6">
      <div className="w-full max-w-[440px]">
        <span className="eyebrow">Subscription</span>
        <h1 className="text-[26px] mt-1.5">The school pays</h1>
        <p className="mt-3 text-[14px] text-ink-soft leading-relaxed">
          Price is the number of active students times the plan. Parents and students are not billed for Daymaark.
          {quote ? ` ${quote.student_count} student${quote.student_count === 1 ? '' : 's'} on the roll.` : ''}
        </p>

        {status === 'error' && errorMessage && (
          <div className="mt-5">
            <Alert>{errorMessage}</Alert>
          </div>
        )}

        {!quote ? (
          <div className="mt-6 space-y-3">
            <Button full onClick={() => window.location.reload()}>
              Try again
            </Button>
            <button
              type="button"
              className="w-full text-center text-[12px] text-ink-faint hover:text-ink underline"
              onClick={() => void signOut().then(() => navigate('/login', { replace: true }))}
            >
              Sign out
            </button>
          </div>
        ) : (
          <>
            <div className="mt-5 space-y-2">
              {BILLING_PLANS.map((p) => {
                const row = quote.plans[p.key]
                const on = plan === p.key
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPlan(p.key)}
                    className={`w-full text-left border rounded-lg px-4 py-3 transition-colors ${
                      on ? 'border-brass bg-brass-wash' : 'border-rule bg-surface hover:border-rule-strong'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[15px] font-semibold">{p.label}</span>
                      <span className="tnum text-[16px] font-semibold">{naira(row.naira)}</span>
                    </div>
                    <div className="eyebrow mt-1">
                      {naira(p.nairaPerStudent)} {p.unit}
                    </div>
                  </button>
                )
              })}
            </div>

            <Panel className="mt-4">
              <p className="text-[13px] text-ink-soft leading-relaxed">
                Due now: <span className="tnum font-semibold text-ink">{naira(amount)}</span>
                {' · '}
                {quote.student_count} × {naira(chosen?.naira_per_student ?? 0)}
              </p>
            </Panel>

            <div className="mt-6 space-y-3">
              <Button
                full
                onClick={() => void handlePay()}
                loading={status === 'processing' || status === 'verifying'}
              >
                {status === 'processing' && 'Opening payment window...'}
                {status === 'verifying' && 'Confirming payment...'}
                {(status === 'ready' || status === 'error') && `Pay ${naira(amount)}`}
              </Button>
              <button
                type="button"
                className="w-full text-center text-[12px] text-ink-faint hover:text-ink underline"
                onClick={() => void signOut().then(() => navigate('/login', { replace: true }))}
              >
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
