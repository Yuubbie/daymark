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

type StudentRow = { id: string; first_name: string; last_name: string; class_id: string }

type InstallmentFlat = { id: string; fee_structure_id: string; label: string; amount_naira: number }

type OverrideRow = {
  id: string
  student_id: string
  fee_installment_id: string
  override_amount_naira: number
  reason: string | null
}

const NAIRA = '\u20A6'

export default function AdminFees() {
  const { profile } = useAuth()
  const schoolId = profile?.school_id ?? ''

  const [classes, setClasses] = useState<ClassRow[]>([])
  const [existing, setExisting] = useState<ExistingStructure[]>([])
  const [students, setStudents] = useState<StudentRow[]>([])
  const [installmentsFlat, setInstallmentsFlat] = useState<InstallmentFlat[]>([])
  const [overrides, setOverrides] = useState<OverrideRow[]>([])
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

  // --- student fee override form state ---
  const [overrideStudentId, setOverrideStudentId] = useState('')
  const [overrideInstallmentId, setOverrideInstallmentId] = useState('')
  const [overrideAmount, setOverrideAmount] = useState('')
  const [overrideReason, setOverrideReason] = useState('')
  const [overrideSaving, setOverrideSaving] = useState(false)
  const [overrideError, setOverrideError] = useState<string | null>(null)
  const [overrideSavedMsg, setOverrideSavedMsg] = useState<string | null>(null)

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

    setInstallmentsFlat(installmentRows)

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

    // Students and any existing overrides, for the discounts panel below.
    const { data: studentRows, error: studentErr } = await supabase
      .from('students')
      .select('id, first_name, last_name, class_id')
      .eq('school_id', schoolId)
      .order('first_name')

    if (studentErr) {
      setError(studentErr.message)
      setLoading(false)
      return
    }
    setStudents(studentRows ?? [])

    if (installmentRows.length > 0) {
      const { data: overrideRows, error: overrideErr } = await supabase
        .from('student_fee_overrides')
        .select('id, student_id, fee_installment_id, override_amount_naira, reason')
        .in(
          'fee_installment_id',
          installmentRows.map((i: any) => i.id)
        )
      if (overrideErr) {
        setError(overrideErr.message)
        setLoading(false)
        return
      }
      setOverrides(overrideRows ?? [])
    } else {
      setOverrides([])
    }

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
        "A fee structure already exists for this class and term. Editing an existing one isn't supported here yet - contact support to change it."
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
      `Fees set for this class and term - ${NAIRA}${totalAmount.toLocaleString('en-NG')} across ${installmentInserts.length} instalment${installmentInserts.length === 1 ? '' : 's'}.`
    )
    resetForm()
    void loadEverything()
  }

  // --- overrides: derived data ---
  const selectedOverrideStudent = students.find((s) => s.id === overrideStudentId)

  const availableInstallmentsForOverride = selectedOverrideStudent
    ? existing
        .filter((s) => s.class_id === selectedOverrideStudent.class_id)
        .flatMap((s) =>
          s.installments.map((i) => ({
            id: i.id,
            label: i.label,
            amount_naira: i.amount_naira,
            term: s.term,
            className: s.className,
          }))
        )
    : []

  function studentName(id: string) {
    const s = students.find((x) => x.id === id)
    return s ? `${s.first_name} ${s.last_name}` : 'Unknown student'
  }

  function installmentInfo(id: string) {
    const i = installmentsFlat.find((x) => x.id === id)
    if (!i) return { label: 'Unknown instalment', term: '', className: '' }
    const structure = existing.find((s) => s.id === i.fee_structure_id)
    return { label: i.label, term: structure?.term ?? '', className: structure?.className ?? '' }
  }

  function resetOverrideForm() {
    setOverrideStudentId('')
    setOverrideInstallmentId('')
    setOverrideAmount('')
    setOverrideReason('')
  }

  async function handleAddOverride(e: React.FormEvent) {
    e.preventDefault()
    setOverrideError(null)
    setOverrideSavedMsg(null)

    if (!overrideStudentId) {
      setOverrideError('Choose a student first.')
      return
    }
    if (!overrideInstallmentId) {
      setOverrideError('Choose which instalment this discount applies to.')
      return
    }
    const amount = Number(overrideAmount)
    if (overrideAmount === '' || Number.isNaN(amount) || amount < 0) {
      setOverrideError(`Enter a valid override amount (${NAIRA}0 or more).`)
      return
    }

    setOverrideSaving(true)

    const { error: insertErr } = await supabase.from('student_fee_overrides').insert({
      student_id: overrideStudentId,
      fee_installment_id: overrideInstallmentId,
      override_amount_naira: amount,
      reason: overrideReason.trim() || null,
    })

    setOverrideSaving(false)

    if (insertErr) {
      setOverrideError(insertErr.message)
      return
    }

    setOverrideSavedMsg(
      `Override saved - ${studentName(overrideStudentId)} now owes ${NAIRA}${amount.toLocaleString('en-NG')} for that instalment.`
    )
    resetOverrideForm()
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
                        placeholder={`Amount (${NAIRA})`}
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
                        {s.className} - {s.term}
                      </div>
                      <div className="text-[12px] text-ink-faint mt-0.5">
                        {s.installments
                          .map((i) => `${i.label}: ${NAIRA}${i.amount_naira.toLocaleString('en-NG')}`)
                          .join(' - ')}
                      </div>
                    </>
                  }
                  right={
                    <span className="tnum text-[15px] font-semibold">
                      {NAIRA}{s.total_amount_naira.toLocaleString('en-NG')}
                    </span>
                  }
                />
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Student discounts">
          {students.length === 0 ? (
            <Empty line="No students yet. Add students to a class before setting up a discount." />
          ) : existing.length === 0 ? (
            <Empty line="Set up a fee structure for a class first, then come back here to give an individual student a discount on one of its instalments." />
          ) : (
            <>
              {overrideError && (
                <div className="mb-3">
                  <Alert>{overrideError}</Alert>
                </div>
              )}
              {overrideSavedMsg && !overrideError && (
                <div className="mb-3 text-[13px] text-present font-semibold">{overrideSavedMsg}</div>
              )}

              <form onSubmit={handleAddOverride} className="space-y-3.5">
                <label className="block">
                  <span className="eyebrow block mb-1.5">Student</span>
                  <select
                    className="w-full h-11 px-3 bg-surface border border-rule-strong rounded-md text-[15px] text-ink"
                    value={overrideStudentId}
                    onChange={(e) => {
                      setOverrideStudentId(e.target.value)
                      setOverrideInstallmentId('')
                    }}
                  >
                    <option value="">Choose a student</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.first_name} {s.last_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="eyebrow block mb-1.5">Instalment</span>
                  <select
                    className="w-full h-11 px-3 bg-surface border border-rule-strong rounded-md text-[15px] text-ink"
                    value={overrideInstallmentId}
                    onChange={(e) => setOverrideInstallmentId(e.target.value)}
                    disabled={!overrideStudentId}
                  >
                    <option value="">
                      {overrideStudentId
                        ? availableInstallmentsForOverride.length === 0
                          ? "No fee structure set for this student's class yet"
                          : 'Choose an instalment'
                        : 'Choose a student first'}
                    </option>
                    {availableInstallmentsForOverride.map((i) => (
                      <option key={i.id} value={i.id}>
                        {`${i.className} - ${i.term} - ${i.label} (normally ${NAIRA}${i.amount_naira.toLocaleString('en-NG')})`}
                      </option>
                    ))}
                  </select>
                </label>

                <Field
                  label={`Override amount (${NAIRA})`}
                  placeholder="e.g. 0 for a full waiver, or a reduced amount"
                  inputMode="numeric"
                  value={overrideAmount}
                  onChange={(e) => setOverrideAmount(e.target.value)}
                  hint="This replaces the normal amount for this student on this instalment only."
                />

                <Field
                  label="Reason (optional)"
                  placeholder="e.g. Staff child discount, scholarship"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                />

                <Button type="submit" loading={overrideSaving} full>
                  Save discount
                </Button>
              </form>

              {overrides.length > 0 && (
                <div className="mt-5 pt-4 border-t border-rule divide-y divide-rule -my-3">
                  {overrides.map((o) => {
                    const info = installmentInfo(o.fee_installment_id)
                    return (
                      <Row
                        key={o.id}
                        left={
                          <>
                            <div className="text-[15px] font-semibold">{studentName(o.student_id)}</div>
                            <div className="text-[12px] text-ink-faint mt-0.5">
                              {`${info.className} - ${info.term} - ${info.label}${o.reason ? ' - ' + o.reason : ''}`}
                            </div>
                          </>
                        }
                        right={
                          <span className="tnum text-[15px] font-semibold">
                            {NAIRA}{o.override_amount_naira.toLocaleString('en-NG')}
                          </span>
                        }
                      />
                    )
                  })}
                </div>
              )}
            </>
          )}
        </Panel>
      </div>
    </AppShell>
  )
}