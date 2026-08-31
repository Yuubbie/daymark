// StudentReport.tsx
//
// Report card view for a single student, for a given subject + term.
// Scores auto-populate from student_submissions where available, but a
// teacher can override any field (CA1, CA2, Exam, Attendance) — e.g. for
// paper-based assessments, corrections, or discretionary attendance marks.
// A "manually adjusted" tag appears whenever a saved value no longer
// matches what the raw submission would produce, so overrides stay
// visible/auditable rather than silently diverging from the source data.
//
// ASSUMPTIONS TO ADJUST BEFORE DROPPING THIS IN:
// - Supabase client imported from "../lib/supabase" as `supabase`.
// - `studentId`, `classId`, `subject`, `term` passed in as props.
// - Student's name/photo come from your existing `students` table
//   (assumes columns: first_name, last_name, photo_url — adjust to match).

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

interface StudentInfo {
  id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
}

interface RawSubmissionScores {
  assessment_1?: number;
  assessment_2?: number;
  exam?: number;
}

interface ResultRow {
  id: string | null; // null if no result_components row exists yet
  ca1_score: number;
  ca2_score: number;
  exam_score: number;
  attendance_score: number;
  ca1_weight: number;
  ca2_weight: number;
  exam_weight: number;
  attendance_weight: number;
  computed_total: number | null;
}

const DEFAULT_ROW: ResultRow = {
  id: null,
  ca1_score: 0,
  ca2_score: 0,
  exam_score: 0,
  attendance_score: 0,
  ca1_weight: 20,
  ca2_weight: 20,
  exam_weight: 60,
  attendance_weight: 0,
  computed_total: null,
};

interface StudentReportProps {
  studentId: string;
  classId: string;
  subject: string;
  term: string;
  canEdit: boolean; // pass true for teacher view, false for parent/read-only view
}

export default function StudentReport({
  studentId,
  classId,
  subject,
  term,
  canEdit,
}: StudentReportProps) {
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [result, setResult] = useState<ResultRow>(DEFAULT_ROW);
  const [rawFromSubmissions, setRawFromSubmissions] = useState<RawSubmissionScores>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: studentData, error: studentErr } = await supabase
      .from("students")
      .select("id, first_name, last_name, photo_url")
      .eq("id", studentId)
      .single();

    if (studentErr) {
      setError(studentErr.message);
      setLoading(false);
      return;
    }
    setStudent(studentData);

    // Pull raw scores from actual submissions, joined through assessments
    // so we know which component (assessment_1/2/exam) each score belongs to.
    const { data: submissions, error: subErr } = await supabase
      .from("student_submissions")
      .select("score, total_questions, assessments(component, subject, term, class_id)")
      .eq("student_id", studentId);

    if (subErr) {
      setError(subErr.message);
      setLoading(false);
      return;
    }

    const raw: RawSubmissionScores = {};
    (submissions ?? []).forEach((s: any) => {
      const a = s.assessments;
      if (!a || a.subject !== subject || a.term !== term || a.class_id !== classId) return;
      // normalize raw score to a percentage of that component's weight later;
      // for now store the raw percentage (score/total_questions * 100)
      const pct = s.total_questions > 0 ? (s.score / s.total_questions) * 100 : 0;
      raw[a.component as keyof RawSubmissionScores] = pct;
    });
    setRawFromSubmissions(raw);

    // Existing result_components row, if any
    const { data: existing, error: resultErr } = await supabase
      .from("result_components")
      .select("*")
      .eq("student_id", studentId)
      .eq("subject", subject)
      .eq("term", term)
      .maybeSingle();

    if (resultErr) {
      setError(resultErr.message);
      setLoading(false);
      return;
    }

    if (existing) {
      setResult(existing);
    } else {
      // No row yet — seed from raw submission percentages converted to
      // weighted points, so the first view already looks populated.
      setResult({
        ...DEFAULT_ROW,
        ca1_score: raw.assessment_1 != null ? (raw.assessment_1 / 100) * DEFAULT_ROW.ca1_weight : 0,
        ca2_score: raw.assessment_2 != null ? (raw.assessment_2 / 100) * DEFAULT_ROW.ca2_weight : 0,
        exam_score: raw.exam != null ? (raw.exam / 100) * DEFAULT_ROW.exam_weight : 0,
      });
    }

    setLoading(false);
  }, [studentId, classId, subject, term]);

  useEffect(() => {
    load();
  }, [load]);

  function isOverridden(field: "ca1_score" | "ca2_score" | "exam_score", componentKey: keyof RawSubmissionScores) {
    const raw = rawFromSubmissions[componentKey];
    if (raw == null) return false; // nothing to compare against — no submission exists
    const weight = result[`${field.split("_")[0]}_weight` as keyof ResultRow] as number;
    const expected = (raw / 100) * weight;
    return Math.abs(expected - result[field]) > 0.01;
  }

  function updateField(field: keyof ResultRow, value: number) {
    setResult((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSavedMsg(null);

    const payload = {
      student_id: studentId,
      class_id: classId,
      subject,
      term,
      ca1_score: result.ca1_score,
      ca2_score: result.ca2_score,
      exam_score: result.exam_score,
      attendance_score: result.attendance_score,
      ca1_weight: result.ca1_weight,
      ca2_weight: result.ca2_weight,
      exam_weight: result.exam_weight,
      attendance_weight: result.attendance_weight,
    };

    const { data, error: saveErr } = await supabase
      .from("result_components")
      .upsert(payload, { onConflict: "student_id,subject,term" })
      .select()
      .single();

    setSaving(false);

    if (saveErr) {
      setError(saveErr.message);
      return;
    }

    setResult(data);
    setSavedMsg("Saved.");
  }

  if (loading) return <p className="text-sm text-gray-400 p-4">Loading report...</p>;

  const total = result.computed_total ?? result.ca1_score + result.ca2_score + result.exam_score + result.attendance_score;

  return (
    <div className="max-w-xl mx-auto p-4">
      <div className="flex items-center gap-4 mb-6">
        {student?.photo_url ? (
          <img
            src={student.photo_url}
            alt=""
            className="w-16 h-16 rounded-full object-cover border"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-100 border flex items-center justify-center text-xs text-gray-400">
            No photo
          </div>
        )}
        <div>
          <h1 className="text-lg font-semibold">
            {student?.first_name} {student?.last_name}
          </h1>
          <p className="text-sm text-gray-500">
            {subject} · {term}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <ScoreRow
          label="CA1"
          value={result.ca1_score}
          weight={result.ca1_weight}
          overridden={isOverridden("ca1_score", "assessment_1")}
          editable={canEdit}
          onChange={(v) => updateField("ca1_score", v)}
        />
        <ScoreRow
          label="CA2"
          value={result.ca2_score}
          weight={result.ca2_weight}
          overridden={isOverridden("ca2_score", "assessment_2")}
          editable={canEdit}
          onChange={(v) => updateField("ca2_score", v)}
        />
        <ScoreRow
          label="Exam"
          value={result.exam_score}
          weight={result.exam_weight}
          overridden={isOverridden("exam_score", "exam")}
          editable={canEdit}
          onChange={(v) => updateField("exam_score", v)}
        />
        <ScoreRow
          label="Attendance (discretionary)"
          value={result.attendance_score}
          weight={result.attendance_weight}
          overridden={result.attendance_weight > 0}
          editable={canEdit}
          onChange={(v) => updateField("attendance_score", v)}
          weightEditable={canEdit}
          onWeightChange={(w) => updateField("attendance_weight", w)}
        />
      </div>

      <div className="mt-6 border-t pt-4 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600">Total</span>
        <span className="text-2xl font-bold">{total.toFixed(1)} / 100</span>
      </div>

      {canEdit && (
        <div className="mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
          {savedMsg && <span className="ml-3 text-sm text-green-700">{savedMsg}</span>}
        </div>
      )}
    </div>
  );
}

function ScoreRow({
  label,
  value,
  weight,
  overridden,
  editable,
  onChange,
  weightEditable,
  onWeightChange,
}: {
  label: string;
  value: number;
  weight: number;
  overridden: boolean;
  editable: boolean;
  onChange: (v: number) => void;
  weightEditable?: boolean;
  onWeightChange?: (w: number) => void;
}) {
  return (
    <div className="flex items-center justify-between border rounded p-3">
      <div>
        <p className="text-sm font-medium">
          {label}
          {overridden && (
            <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
              manually adjusted
            </span>
          )}
        </p>
        <p className="text-xs text-gray-400">out of {weight}</p>
      </div>
      <div className="flex items-center gap-2">
        {editable ? (
          <input
            type="number"
            className="w-20 border rounded p-1 text-sm text-right"
            value={value}
            min={0}
            max={weight}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        ) : (
          <span className="text-sm font-semibold">{value.toFixed(1)}</span>
        )}
        {weightEditable && onWeightChange && (
          <>
            <span className="text-xs text-gray-400">/ weight</span>
            <input
              type="number"
              className="w-16 border rounded p-1 text-sm text-right"
              value={weight}
              min={0}
              onChange={(e) => onWeightChange(Number(e.target.value))}
            />
          </>
        )}
      </div>
    </div>
  );
}
