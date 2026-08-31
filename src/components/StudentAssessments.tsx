// StudentAssessments.tsx
//
// Student-facing screen: see published assessments for their class,
// answer the MCQs, submit, and get their score immediately.
//
// SECURITY NOTE: this component never fetches `correct_option` from
// question_bank. Grading happens entirely inside the `submit_assessment`
// Postgres function (see the schema file), so the answer key never
// reaches the browser at all — not even hidden in a network response.
//
// ASSUMPTIONS TO ADJUST BEFORE DROPPING THIS IN:
// - Supabase client imported from '../lib/supabase' as `supabase`.
// - `studentId`, `classId`, `term` passed in as props from wherever the
//   student's session/context already knows these (e.g. their dashboard).

import { useState, useEffect, useCallback } from "react";
import { supabase } from '../lib/supabase';

type Option = "a" | "b" | "c" | "d";

interface AssessmentSummary {
  id: string;
  title: string;
  subject: string;
  component: "assessment_1" | "assessment_2" | "exam";
  already_taken: boolean;
  prior_score?: number;
  prior_total?: number;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
}

interface StudentAssessmentsProps {
  studentId: string;
  classId: string;
  term: string;
}

const COMPONENT_LABELS: Record<AssessmentSummary["component"], string> = {
  assessment_1: "Assessment 1",
  assessment_2: "Assessment 2",
  exam: "Exam",
};

export default function StudentAssessments({ studentId, classId, term }: StudentAssessmentsProps) {
  const [list, setList] = useState<AssessmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // active quiz state
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, Option>>({});
  const [quizLoading, setQuizLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);

  const loadAssessments = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: assessments, error: aErr } = await supabase
      .from("assessments")
      .select("id, title, subject, component")
      .eq("class_id", classId)
      .eq("term", term)
      .eq("is_published", true)
      .order("published_at", { ascending: false });

    if (aErr) {
      setError(aErr.message);
      setLoading(false);
      return;
    }

    const { data: submissions, error: sErr } = await supabase
      .from("student_submissions")
      .select("assessment_id, score, total_questions")
      .eq("student_id", studentId);

    if (sErr) {
      setError(sErr.message);
      setLoading(false);
      return;
    }

    const submissionMap = new Map(
      (submissions ?? []).map((s) => [s.assessment_id, s])
    );

    setList(
      (assessments ?? []).map((a) => {
        const sub = submissionMap.get(a.id);
        return {
          ...a,
          already_taken: !!sub,
          prior_score: sub?.score,
          prior_total: sub?.total_questions,
        };
      })
    );
    setLoading(false);
  }, [classId, term, studentId]);

  useEffect(() => {
    loadAssessments();
  }, [loadAssessments]);

  async function startQuiz(assessmentId: string) {
    setActiveAssessmentId(assessmentId);
    setResult(null);
    setAnswers({});
    setQuizLoading(true);
    setError(null);

    // Explicitly excludes correct_option — see security note at top of file.
    const { data, error: qErr } = await supabase
      .from("assessment_questions")
      .select("position, question_bank(id, question_text, option_a, option_b, option_c, option_d)")
      .eq("assessment_id", assessmentId)
      .order("position", { ascending: true });

    setQuizLoading(false);

    if (qErr) {
      setError(qErr.message);
      return;
    }

    const flattened: QuizQuestion[] = (data ?? [])
      .map((row: any) => row.question_bank)
      .filter(Boolean);

    setQuestions(flattened);
  }

  function selectAnswer(questionId: string, option: Option) {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  }

  async function handleSubmit() {
    if (!activeAssessmentId) return;
    if (Object.keys(answers).length < questions.length) {
      setError("Answer every question before submitting.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const { data: score, error: subErr } = await supabase.rpc("submit_assessment", {
      p_assessment_id: activeAssessmentId,
      p_student_id: studentId,
      p_answers: answers,
    });

    setSubmitting(false);

    if (subErr) {
      setError(subErr.message);
      return;
    }

    setResult({ score: score as number, total: questions.length });
    loadAssessments(); // refresh the list so it now shows as taken
  }

  function backToList() {
    setActiveAssessmentId(null);
    setQuestions([]);
    setAnswers({});
    setResult(null);
  }

  // ─── Quiz-taking view ───
  if (activeAssessmentId) {
    const current = list.find((a) => a.id === activeAssessmentId);

    return (
      <div className="max-w-2xl mx-auto p-4">
        <button onClick={backToList} className="text-sm text-blue-600 mb-4">
          ← Back to assessments
        </button>

        <h1 className="text-xl font-semibold mb-1">{current?.title}</h1>
        <p className="text-sm text-gray-500 mb-4">
          {current && COMPONENT_LABELS[current.component]} · {current?.subject}
        </p>

        {error && (
          <div className="mb-4 rounded bg-red-50 border border-red-200 text-red-700 text-sm p-3">
            {error}
          </div>
        )}

        {result ? (
          <div className="rounded bg-green-50 border border-green-200 p-4 text-center">
            <p className="text-3xl font-bold text-green-700">
              {result.score} / {result.total}
            </p>
            <p className="text-sm text-green-700 mt-1">Submitted — your score is recorded.</p>
          </div>
        ) : quizLoading ? (
          <p className="text-sm text-gray-400">Loading questions...</p>
        ) : (
          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={q.id} className="border rounded p-3">
                <p className="font-medium text-sm mb-2">
                  {i + 1}. {q.question_text}
                </p>
                <div className="space-y-1">
                  {(["a", "b", "c", "d"] as Option[]).map((opt) => (
                    <label key={opt} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === opt}
                        onChange={() => selectAnswer(q.id, opt)}
                      />
                      <span>{q[`option_${opt}` as keyof QuizQuestion]}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <button
              onClick={handleSubmit}
              disabled={submitting || questions.length === 0}
              className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit answers"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── Assessment list view ───
  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4">Your assessments</h1>

      {error && (
        <div className="mb-4 rounded bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-gray-400">Nothing published yet — check back later.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((a) => (
            <li key={a.id} className="border rounded p-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{a.title}</p>
                <p className="text-xs text-gray-500">
                  {COMPONENT_LABELS[a.component]} · {a.subject}
                </p>
              </div>
              {a.already_taken ? (
                <span className="text-sm font-semibold text-green-700">
                  {a.prior_score} / {a.prior_total}
                </span>
              ) : (
                <button
                  onClick={() => startQuiz(a.id)}
                  className="bg-blue-600 text-white text-sm font-medium px-3 py-1.5 rounded"
                >
                  Take now
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
