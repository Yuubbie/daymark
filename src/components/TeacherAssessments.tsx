// TeacherAssessments.tsx
//
// Teacher-facing screen: add MCQ questions to the bank (one at a time,
// or in bulk via an Excel/CSV upload), then group selected bank questions
// into an Assessment 1 / Assessment 2 / Exam and publish it.
//
// FILE UPLOAD FORMAT (Excel .xlsx/.xls or .csv), first row = headers:
//   Question | Option A | Option B | Option C | Option D | Correct
// "Correct" must be one of: A, B, C, D (case-insensitive).
//
// IMPORTANT — SheetJS install: per the Daymark handover notes, the plain
// npm registry "xlsx" package is a known-vulnerable version. Install the
// patched CDN build instead:
//   npm install "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"
// Never run a plain `npm install xlsx`.
//
// ASSUMPTIONS:
// - Supabase client imported from "../lib/supabase" as `supabase`.
// - `teacherId`, `classId`, `subject`, `term` passed in as props.

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import * as XLSX from "xlsx";

type Option = "a" | "b" | "c" | "d";
type Component = "assessment_1" | "assessment_2" | "exam";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: Option;
  created_at: string;
}

interface ParsedRow {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: Option | null; // null means invalid — flagged in preview
  rowNumber: number;
}

interface TeacherAssessmentsProps {
  teacherId: string;
  classId: string;
  subject: string;
  term: string; // e.g. "term_1"
}

const COMPONENT_LABELS: Record<Component, string> = {
  assessment_1: "Assessment 1",
  assessment_2: "Assessment 2",
  exam: "Exam",
};

// Accepts common header spellings so a teacher's slightly different
// wording (e.g. "Option A" vs "OptionA" vs "A") still matches.
function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z]/g, "");
}

function findColumn(headers: string[], candidates: string[]): number {
  const normalized = headers.map(normalizeHeader);
  for (const candidate of candidates) {
    const idx = normalized.indexOf(candidate);
    if (idx !== -1) return idx;
  }
  return -1;
}

export default function TeacherAssessments({
  teacherId,
  classId,
  subject,
  term,
}: TeacherAssessmentsProps) {
  const [tab, setTab] = useState<"bank" | "upload" | "build">("bank");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- new question form state ---
  const [qText, setQText] = useState("");
  const [optA, setOptA] = useState("");
  const [optB, setOptB] = useState("");
  const [optC, setOptC] = useState("");
  const [optD, setOptD] = useState("");
  const [correct, setCorrect] = useState<Option>("a");
  const [saving, setSaving] = useState(false);

  // --- file upload state ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importedMsg, setImportedMsg] = useState<string | null>(null);

  // --- assessment builder state ---
  const [assessmentTitle, setAssessmentTitle] = useState("");
  const [component, setComponent] = useState<Component>("assessment_1");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [publishing, setPublishing] = useState(false);
  const [publishedMsg, setPublishedMsg] = useState<string | null>(null);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("question_bank")
      .select("*")
      .eq("class_id", classId)
      .eq("subject", subject)
      .eq("term", term)
      .order("created_at", { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      setQuestions(data ?? []);
    }
    setLoading(false);
  }, [classId, subject, term]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  function resetForm() {
    setQText("");
    setOptA("");
    setOptB("");
    setOptC("");
    setOptD("");
    setCorrect("a");
  }

  async function handleAddQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!qText.trim() || !optA.trim() || !optB.trim() || !optC.trim() || !optD.trim()) {
      setError("Fill in the question and all four options before saving.");
      return;
    }
    setSaving(true);
    setError(null);

    const { error: err } = await supabase.from("question_bank").insert({
      teacher_id: teacherId,
      class_id: classId,
      subject,
      term,
      question_text: qText.trim(),
      option_a: optA.trim(),
      option_b: optB.trim(),
      option_c: optC.trim(),
      option_d: optD.trim(),
      correct_option: correct,
    });

    setSaving(false);

    if (err) {
      setError(err.message);
      return;
    }

    resetForm();
    loadQuestions();
  }

  // ─── File upload / parsing ───

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError(null);
    setImportedMsg(null);
    setParsedRows([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });

        if (rows.length < 2) {
          setParseError("The file has no data rows below the header.");
          return;
        }

        const headers = rows[0].map((h: any) => String(h ?? ""));
        const qCol = findColumn(headers, ["question", "questiontext"]);
        const aCol = findColumn(headers, ["optiona", "a"]);
        const bCol = findColumn(headers, ["optionb", "b"]);
        const cCol = findColumn(headers, ["optionc", "c"]);
        const dCol = findColumn(headers, ["optiond", "d"]);
        const correctCol = findColumn(headers, ["correct", "correctoption", "answer"]);

        if ([qCol, aCol, bCol, cCol, dCol, correctCol].some((c) => c === -1)) {
          setParseError(
            "Could not find all required columns. Expected headers: Question, Option A, Option B, Option C, Option D, Correct."
          );
          return;
        }

        const parsed: ParsedRow[] = rows.slice(1).map((row, i) => {
          const rawCorrect = String(row[correctCol] ?? "").trim().toLowerCase();
          const correctOption: Option | null = ["a", "b", "c", "d"].includes(rawCorrect)
            ? (rawCorrect as Option)
            : null;

          return {
            question_text: String(row[qCol] ?? "").trim(),
            option_a: String(row[aCol] ?? "").trim(),
            option_b: String(row[bCol] ?? "").trim(),
            option_c: String(row[cCol] ?? "").trim(),
            option_d: String(row[dCol] ?? "").trim(),
            correct_option: correctOption,
            rowNumber: i + 2,
          };
        });

        setParsedRows(parsed);
      } catch (err: any) {
        setParseError(err?.message ?? "Could not read this file. Is it a valid Excel or CSV file?");
      }
    };
    reader.onerror = () => setParseError("Could not read the file.");
    reader.readAsBinaryString(file);
  }

  function isRowValid(row: ParsedRow): boolean {
    return (
      row.question_text !== "" &&
      row.option_a !== "" &&
      row.option_b !== "" &&
      row.option_c !== "" &&
      row.option_d !== "" &&
      row.correct_option !== null
    );
  }

  async function handleImport() {
    const validRows = parsedRows.filter(isRowValid);
    if (validRows.length === 0) {
      setParseError("No valid rows to import — fix the flagged rows or check your file's columns.");
      return;
    }

    setImporting(true);
    setParseError(null);
    setImportedMsg(null);

    const inserts = validRows.map((row) => ({
      teacher_id: teacherId,
      class_id: classId,
      subject,
      term,
      question_text: row.question_text,
      option_a: row.option_a,
      option_b: row.option_b,
      option_c: row.option_c,
      option_d: row.option_d,
      correct_option: row.correct_option,
    }));

    const { error: err } = await supabase.from("question_bank").insert(inserts);

    setImporting(false);

    if (err) {
      setParseError(err.message);
      return;
    }

    const skipped = parsedRows.length - validRows.length;
    setImportedMsg(
      `Imported ${validRows.length} question${validRows.length === 1 ? "" : "s"}.` +
        (skipped > 0 ? ` Skipped ${skipped} row${skipped === 1 ? "" : "s"} with missing/invalid data.` : "")
    );
    setParsedRows([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    loadQuestions();
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handlePublish() {
    if (!assessmentTitle.trim()) {
      setError("Give the assessment a title before publishing.");
      return;
    }
    if (selectedIds.size === 0) {
      setError("Select at least one question from the bank first.");
      return;
    }

    setPublishing(true);
    setError(null);
    setPublishedMsg(null);

    const { data: assessment, error: createErr } = await supabase
      .from("assessments")
      .insert({
        teacher_id: teacherId,
        class_id: classId,
        subject,
        term,
        component,
        title: assessmentTitle.trim(),
        is_published: true,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createErr || !assessment) {
      setError(createErr?.message ?? "Could not create the assessment.");
      setPublishing(false);
      return;
    }

    const rows = Array.from(selectedIds).map((question_id, index) => ({
      assessment_id: assessment.id,
      question_id,
      position: index,
    }));

    const { error: linkErr } = await supabase.from("assessment_questions").insert(rows);

    setPublishing(false);

    if (linkErr) {
      setError(linkErr.message);
      return;
    }

    setPublishedMsg(
      `"${assessmentTitle}" published with ${rows.length} question${rows.length === 1 ? "" : "s"}. Students in this class can now see it.`
    );
    setAssessmentTitle("");
    setSelectedIds(new Set());
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-xl font-semibold mb-1">Question bank — {subject}</h1>
      <p className="text-sm text-gray-500 mb-4">{COMPONENT_LABELS[component]} · this class</p>

      <div className="flex gap-2 mb-6 border-b flex-wrap">
        <button
          className={`px-3 py-2 text-sm font-medium border-b-2 ${
            tab === "bank" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"
          }`}
          onClick={() => setTab("bank")}
        >
          Add questions
        </button>
        <button
          className={`px-3 py-2 text-sm font-medium border-b-2 ${
            tab === "upload" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"
          }`}
          onClick={() => setTab("upload")}
        >
          Upload a file
        </button>
        <button
          className={`px-3 py-2 text-sm font-medium border-b-2 ${
            tab === "build" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"
          }`}
          onClick={() => setTab("build")}
        >
          Build assessment ({questions.length} in bank)
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error}
        </div>
      )}

      {tab === "bank" && (
        <form onSubmit={handleAddQuestion} className="space-y-3 mb-8">
          <textarea
            className="w-full border rounded p-2 text-sm"
            placeholder="Question text"
            value={qText}
            onChange={(e) => setQText(e.target.value)}
            rows={2}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(
              [
                ["a", optA, setOptA],
                ["b", optB, setOptB],
                ["c", optC, setOptC],
                ["d", optD, setOptD],
              ] as const
            ).map(([key, value, setter]) => (
              <label key={key} className="flex items-center gap-2 text-sm border rounded p-2">
                <input
                  type="radio"
                  name="correct"
                  checked={correct === key}
                  onChange={() => setCorrect(key)}
                />
                <span className="uppercase text-gray-400 w-4">{key}</span>
                <input
                  className="flex-1 outline-none"
                  placeholder={`Option ${key.toUpperCase()}`}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                />
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500">Select the radio button next to the correct option.</p>
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save to question bank"}
          </button>

          <hr className="my-4" />

          <h2 className="text-sm font-medium text-gray-700 mb-2">Questions saved so far</h2>
          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : questions.length === 0 ? (
            <p className="text-sm text-gray-400">No questions yet — add one above.</p>
          ) : (
            <ul className="space-y-2">
              {questions.map((q) => (
                <li key={q.id} className="border rounded p-2 text-sm">
                  <p className="font-medium">{q.question_text}</p>
                  <p className="text-gray-500">
                    Correct: {q.correct_option.toUpperCase()} — {q[`option_${q.correct_option}` as keyof Question]}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </form>
      )}

      {tab === "upload" && (
        <div className="space-y-4">
          <div className="rounded bg-blue-50 border border-blue-200 text-blue-800 text-sm p-3">
            Upload an Excel (.xlsx) or CSV file with these column headers in the first row:
            <br />
            <code className="text-xs">Question | Option A | Option B | Option C | Option D | Correct</code>
            <br />
            "Correct" should contain A, B, C, or D — whichever option is right.
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelected}
            className="text-sm"
          />

          {parseError && (
            <div className="rounded bg-red-50 border border-red-200 text-red-700 text-sm p-3">
              {parseError}
            </div>
          )}

          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Preview — {parsedRows.filter(isRowValid).length} of {parsedRows.length} rows look valid:
              </p>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {parsedRows.map((row) => {
                  const valid = isRowValid(row);
                  return (
                    <div
                      key={row.rowNumber}
                      className={`border rounded p-2 text-sm ${
                        valid ? "border-gray-200" : "border-red-300 bg-red-50"
                      }`}
                    >
                      <p className="font-medium">
                        Row {row.rowNumber}: {row.question_text || <em className="text-red-500">missing question</em>}
                      </p>
                      <p className="text-xs text-gray-500">
                        A: {row.option_a || "—"} · B: {row.option_b || "—"} · C: {row.option_c || "—"} · D:{" "}
                        {row.option_d || "—"} · Correct:{" "}
                        {row.correct_option ? row.correct_option.toUpperCase() : (
                          <span className="text-red-600 font-medium">invalid</span>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleImport}
                disabled={importing}
                className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded disabled:opacity-50"
              >
                {importing ? "Importing..." : `Import ${parsedRows.filter(isRowValid).length} valid questions`}
              </button>
            </div>
          )}

          {importedMsg && (
            <div className="rounded bg-green-50 border border-green-200 text-green-700 text-sm p-3">
              {importedMsg}
            </div>
          )}
        </div>
      )}

      {tab === "build" && (
        <div className="space-y-4">
          <input
            className="w-full border rounded p-2 text-sm"
            placeholder="Assessment title (e.g. Mid-term Mathematics Test)"
            value={assessmentTitle}
            onChange={(e) => setAssessmentTitle(e.target.value)}
          />
          <select
            className="w-full border rounded p-2 text-sm"
            value={component}
            onChange={(e) => setComponent(e.target.value as Component)}
          >
            {Object.entries(COMPONENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <p className="text-sm text-gray-600">
            Select questions from the bank ({selectedIds.size} selected):
          </p>

          {questions.length === 0 ? (
            <p className="text-sm text-gray-400">
              No questions in the bank yet — add some in the "Add questions" or "Upload a file" tab first.
            </p>
          ) : (
            <ul className="space-y-2 max-h-96 overflow-y-auto">
              {questions.map((q) => (
                <li key={q.id}>
                  <label className="flex items-start gap-2 border rounded p-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(q.id)}
                      onChange={() => toggleSelect(q.id)}
                      className="mt-1"
                    />
                    <span>{q.question_text}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={handlePublish}
            disabled={publishing}
            className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded disabled:opacity-50"
          >
            {publishing ? "Publishing..." : "Publish assessment"}
          </button>

          {publishedMsg && (
            <div className="rounded bg-green-50 border border-green-200 text-green-700 text-sm p-3">
              {publishedMsg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
