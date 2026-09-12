import { useEffect, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { Alert, Button, Empty, Field, Panel, Row, Spinner } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

type ClassRow = { id: string; name: string; level: string | null }

type InstallmentDraft = {
  label: string
  amount: string // kept as string while editing, parsed to number on submit
}

type ExistingStructure = {
  id: string
  term: string
  total_amount_naira: number
  class_id: string
  className: string
  installments: { id: string; label: string; amount_naira: number; sequence_order: number }[]
}

export default function AdminFees() {
  const { profile } = useAuth()
  const schoolId = profile?.school_id ?? ''

  const [classes, setClasses] = useState<ClassRow[]>([])
  const [existing, setExisting] = useState<ExistingStructure[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // --- new fee structure form state ---
  const [classId, setClassId] = useState('')
  const [term, setTerm] = useState('')
  const [installments, setInstallments] = useState<InstallmentDraft[]>([
    { label: 'First Instalment', amount: '' },
  ])
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  async function loadEverything() {
    setLoading(true)
    setError(null)

    const [{ data: classRows, error: classErr }, { data: structureRows, error: structureErr }] =
      await Promise.all([
        supabase.from('classes').select('id, name, level').eq('school_id', schoolId).order('name'),
        supabase
          .from('fee_structures')
          .select('id, term, total_amount_naira, class_id, classes(name)')
          .eq('school_id', schoolId),
      ])

    if (classErr) {
      setError(classErr.message)
      setLoading(false)
      return
    }
    if (structureErr) {
      setError(structureErr.message)
      setLoading(false)
      return
    }

    setClasses(classRows ?? [])

    const structures = structureRows ?? []
    const structureIds = structures.map((s: any) => s.id)

    let installmentRows: any[] = []
    if (structureIds.length > 0) {
      const { data, error: instErr } = await supabase
        .from('fee_installments')
        .select('id, fee_structure_id, label, amount_naira, sequence_order')
        .in('fee_structure_id', structureIds)
        .order('sequence_order', { ascending: true })
      if (instErr) {
        setError(instErr.message)
        setLoading(false)
        return
      }
      installmentRows = data ?? []
    }

    const merged: ExistingStructure[] = structures.map((s: any) => ({
      id: s.id,
      term: s.term,
      total_amount_naira: s.total_amount_naira,
      class_id: s.class_id,
      className: s.classes?.name ?? 'Unknown class',
      installments: installmentRows
        .filter((i) => i.fee_structure_id === s.id)
        .map((i) => ({
          id: i.id,
          label: i.label,
          amount_naira: i.amount_naira,
          sequence_order: i.sequence_order,
        })),
    }))

    setExisting(merged)
    setLoading(false)
  }

  useEffect(() => {
    if (schoolId) void loadEverything()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId])

  function addInstallmentRow() {
    setInstallments((prev) => [...prev, { label: '', amount: '' }])
  }

  function removeInstallmentRow(index: number) {
    setInstallments((prev) => prev.filter((_, i) => i !== index))
  }

  function updateInstallment(index: number, field: keyof InstallmentDraft, value: string) {
    setInstallments((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    )
  }

  function resetForm() {
    setClassId('')
    setTerm('')
    setInstallments([{ label: 'First Instalment', amount: '' }])
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSavedMsg(null)

    if (!classId) {
      setError('Choose a class first.')
      return
    }
    if (!term.trim()) {
      setError('Enter a term (e.g. "First Term 2026/2027").')
      return
    }

    const parsedInstallments = installments.map((row) => ({
      label: row.label.trim(),
      amount: Number(row.amount),
    }))

    if (parsedInstallments.some((row) => !row.label || !row.amount || row.amount <= 0)) {
      setError('Every instalment needs a label and an amount greater than zero.')
      return
    }

    const alreadyExists = existing.some((s) => s.class_id === classId && s.term.trim() === term.trim())
    if (alreadyExists) {
      setError(
        "A fee structure already exists for this class and term. Editing an existing one isn't supported here yet — contact support to change it."
      )
      return
    }

    setSaving(true)

    const totalAmount = parsedInstallments.reduce((sum, row) => sum + row.amount, 0)

    const { data: structure, error: createErr } = await supabase
      .from('fee_structures')
      .insert({
        school_id: schoolId,
        class_id: classId,
        term: term.trim(),
        total_amount_naira: totalAmount,
      })
      .select()
      .single()

    if (createErr || !structure) {
      setError(createErr?.message ?? 'Could not create the fee structure.')
      setSaving(false)
      return
    }

    const installmentInserts = parsedInstallments.map((row, index) => ({
      fee_structure_id: structure.id,
      label: row.label,
      amount_naira: row.amount,
      sequence_order: index + 1,
    }))

    const { error: instErr } = await supabase.from('fee_installments').insert(installmentInserts)

    setSaving(false)

    if (instErr) {
      setError(
        `The fee structure was created, but adding instalments failed: ${instErr.message}. Contact support before this class's fees are used.`
      )
      return
    }

    setSavedMsg(
      `Fees set for this class and term — ₦${totalAmount.toLocaleString('en-NG')} across ${installmentInserts.length} instalment${installmentInserts.length === 1 ? '' : 's'}.`
    )
    resetForm()
    void loadEverything()
  }

  if (loading) return <AppShell><Spinner /></AppShell>

  return (
    <AppShell>
      <div className="mb-5">
        <span className="eyebrow">Finance</span>
        <h1 className="text-[26px] mt-1">School fees</h1>
        <p className="text-[13px] text-ink-soft mt-1">
          Set what each class owes per term, split into instalments. Parents will see and pay
          these directly.
        </p>
      </div>

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}
      {savedMsg && !error && (
        <div className="mb-4 text-[13px] text-present font-semibold">{savedMsg}</div>
      )}

      <div className="space-y-4">
        <Panel title="Set fees for a class">
          {classes.length === 0 ? (
            <Empty line="Create a class first, then come back here to set its fees." />
          ) : (
            <form onSubmit={handleCreate} className="space-y-3.5">
              <label className="block">
                <span className="eyebrow block mb-1.5">Class</span>
                <select
                  className="w-full h-11 px-3 bg-surface border border-rule-strong rounded-md text-[15px] text-ink"
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                >
                  <option value="">Choose a class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <Field
                label="Term"
                placeholder="e.g. First Term 2026/2027"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                hint="Must match the term parents will see elsewhere in the app, exactly."
              />

              <div>
                <span className="eyebrow block mb-1.5">Instalments</span>
                <div className="space-y-2">
                  {installments.map((row, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <input
                        className="flex-1 h-11 px-3 bg-surface border border-rule-strong rounded-md text-[14px] text-ink"
                        placeholder="Label (e.g. First Instalment)"
                        value={row.label}
                        onChange={(e) => updateInstallment(index, 'label', e.target.value)}
                      />
                      <input
                        className="w-40 h-11 px-3 bg-surface border border-rule-strong rounded-md text-[14px] text-ink"
                        placeholder="Amount (₦)"
                        inputMode="numeric"
                        value={row.amount}
                        onChange={(e) => updateInstallment(index, 'amount', e.target.value)}
                      />
                      {installments.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => removeInstallmentRow(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-2">
                  <Button type="button" variant="secondary" onClick={addInstallmentRow}>
                    Add another instalment
                  </Button>
                </div>
              </div>

              <Button type="submit" loading={saving} full>
                Save fee structure
              </Button>
            </form>
          )}
        </Panel>

        <Panel title="Already set up">
          {existing.length === 0 ? (
            <Empty line="No fees set yet for any class." />
          ) : (
            <div className="divide-y divide-rule -my-3">
              {existing.map((s) => (
                <Row
                  key={s.id}
                  left={
                    <>
                      <div className="text-[15px] font-semibold">
                        {s.className} — {s.term}
                      </div>
                      <div className="text-[12px] text-ink-faint mt-0.5">
                        {s.installments
                          .map((i) => `${i.label}: ₦${i.amount_naira.toLocaleString('en-NG')}`)
                          .join(' · ')}
                      </div>
                    </>
                  }
                  right={
                    <span className="tnum text-[15px] font-semibold">
                      ₦{s.total_amount_naira.toLocaleString('en-NG')}
                    </span>
                  }
                />
              ))}
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  )
}
