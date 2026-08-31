// StudentPhotoUpload.tsx
//
// Small, reusable component: teacher picks an image for a student,
// it's uploaded to a Supabase Storage bucket, and the resulting public
// URL is written to students.photo_url (used by StudentReport.tsx).
//
// SETUP REQUIRED IN SUPABASE (one-time, do this before using this component):
// 1. Storage → Create bucket named "student-photos", set it to PUBLIC
//    (report cards need to display the image without an auth token).
// 2. Add a storage policy allowing authenticated users (teachers) to
//    INSERT into that bucket, e.g.:
//
//    create policy "teachers upload student photos"
//      on storage.objects for insert
//      to authenticated
//      with check (bucket_id = 'student-photos');
//
//    create policy "anyone can view student photos"
//      on storage.objects for select
//      using (bucket_id = 'student-photos');
//
// ASSUMPTIONS TO ADJUST:
// - Supabase client imported from '../lib/supabase' as `supabase`.
// - `studentId` and `currentPhotoUrl` passed in as props; `onUploaded`
//   callback lets the parent component (e.g. a student profile page)
//   refresh its own state after a successful upload.

import { useState, useRef } from "react";
import { supabase } from '../lib/supabase';

const MAX_FILE_SIZE_MB = 5;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface StudentPhotoUploadProps {
  studentId: string;
  currentPhotoUrl?: string | null;
  onUploaded?: (url: string) => void;
}

export default function StudentPhotoUpload({
  studentId,
  currentPhotoUrl,
  onUploaded,
}: StudentPhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function validate(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Please choose a JPG, PNG, or WEBP image.";
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `Image must be under ${MAX_FILE_SIZE_MB}MB.`;
    }
    return null;
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validate(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploading(true);

    // Local preview while the upload is in flight
    const localPreviewUrl = URL.createObjectURL(file);
    setPreview(localPreviewUrl);

    const ext = file.name.split(".").pop();
    const path = `${studentId}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("student-photos")
      .upload(path, file, { upsert: true });

    if (uploadErr) {
      setUploading(false);
      setError(uploadErr.message);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("student-photos").getPublicUrl(path);
    const publicUrl = publicUrlData.publicUrl;

    const { error: updateErr } = await supabase
      .from("students")
      .update({ photo_url: publicUrl })
      .eq("id", studentId);

    setUploading(false);

    if (updateErr) {
      setError(updateErr.message);
      return;
    }

    setPreview(publicUrl);
    onUploaded?.(publicUrl);
  }

  return (
    <div className="flex items-center gap-4">
      <div className="w-20 h-20 rounded-full overflow-hidden border bg-gray-50 flex items-center justify-center">
        {preview ? (
          <img src={preview} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs text-gray-400">No photo</span>
        )}
      </div>

      <div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-sm font-medium border rounded px-3 py-1.5 disabled:opacity-50"
        >
          {uploading ? "Uploading..." : preview ? "Change photo" : "Upload photo"}
        </button>
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        <p className="text-xs text-gray-400 mt-1">JPG, PNG, or WEBP · up to {MAX_FILE_SIZE_MB}MB</p>
      </div>
    </div>
  );
}
