// ParentChildPicker.tsx
//
// Since students have no login of their own, a parent logs in and picks
// which of their linked children they're acting on behalf of. Once picked,
// the existing StudentAssessments / StudentReport components render exactly
// as already built — this component's only job is supplying the right
// studentId (and classId/subject) into them.
//
// ASSUMPTIONS TO ADJUST:
// - Supabase client imported from '../lib/supabase' as `supabase`.
// - The logged-in parent's id is available via supabase.auth.getUser()
//   (standard Supabase Auth session) and matches parent_student_links.parent_id.

import { useState, useEffect, useCallback } from "react";
import { supabase } from '../lib/supabase';
import StudentAssessments from "./StudentAssessments";
import StudentReport from "./StudentReport";

interface LinkedChild {
  student_id: string;
  first_name: string;
  last_name: string;
  class_id: string;
  photo_url: string | null;
}

type View = "picker" | "assessments" | "report";

export default function ParentChildPicker({ term }: { term: string }) {
  const [children, setChildren] = useState<LinkedChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<LinkedChild | null>(null);
  const [view, setView] = useState<View>("picker");
  const [subject, setSubject] = useState<string>("");

  const loadChildren = useCallback(async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      setError("You need to be logged in to view your children's assessments.");
      setLoading(false);
      return;
    }

    // parent_student_links.parent_id is assumed to equal auth.uid() (standard
    // Supabase pattern where profiles.id = auth.users.id). Adjust the join
    // below if your parent_id actually points at profiles.id via a different
    // relationship.
    const { data, error: linkErr } = await supabase
      .from("parent_student_links")
      .select("student_id, students(id, first_name, last_name, class_id, photo_url)")
      .eq("parent_id", user.id);

    if (linkErr) {
      setError(linkErr.message);
      setLoading(false);
      return;
    }

    const mapped: LinkedChild[] = (data ?? [])
      .map((row: any) => row.students)
      .filter(Boolean)
      .map((s: any) => ({
        student_id: s.id,
        first_name: s.first_name,
        last_name: s.last_name,
        class_id: s.class_id,
        photo_url: s.photo_url,
      }));

    setChildren(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  function backToPicker() {
    setSelected(null);
    setView("picker");
    setSubject("");
  }

  if (loading) return <p className="text-sm text-gray-400 p-4">Loading your children...</p>;

  if (error) {
    return (
      <div className="max-w-md mx-auto p-4">
        <div className="rounded bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error}
        </div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="max-w-md mx-auto p-4">
        <p className="text-sm text-gray-400">No children linked to your account yet.</p>
      </div>
    );
  }

  // ─── Child picked, viewing their assessments ───
  if (selected && view === "assessments") {
    return (
      <div>
        <div className="max-w-2xl mx-auto pt-4 px-4">
          <button onClick={backToPicker} className="text-sm text-blue-600 mb-2">
            ← Back to my children
          </button>
        </div>
        <StudentAssessments studentId={selected.student_id} classId={selected.class_id} term={term} />
      </div>
    );
  }

  // ─── Child picked, viewing their report (needs a subject chosen) ───
  if (selected && view === "report") {
    return (
      <div className="max-w-xl mx-auto p-4">
        <button onClick={backToPicker} className="text-sm text-blue-600 mb-4">
          ← Back to my children
        </button>
        <input
          className="w-full border rounded p-2 text-sm mb-4"
          placeholder="Subject (e.g. Mathematics)"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        {subject ? (
          <StudentReport
            studentId={selected.student_id}
            classId={selected.class_id}
            subject={subject}
            term={term}
            canEdit={false}
          />
        ) : (
          <p className="text-sm text-gray-400">Enter a subject to view the report.</p>
        )}
      </div>
    );
  }

  // ─── Picker view ───
  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-lg font-semibold mb-4">Your children</h1>
      <ul className="space-y-2">
        {children.map((child) => (
          <li key={child.student_id} className="border rounded p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {child.photo_url ? (
                <img src={child.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                  —
                </div>
              )}
              <span className="text-sm font-medium">
                {child.first_name} {child.last_name}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelected(child);
                  setView("assessments");
                }}
                className="text-sm border rounded px-2 py-1"
              >
                Assessments
              </button>
              <button
                onClick={() => {
                  setSelected(child);
                  setView("report");
                }}
                className="text-sm border rounded px-2 py-1"
              >
                Report
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
