"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type UploadedPhoto = { storagePath: string; caption: string; previewUrl: string };

export function PhotoSlot({
  label,
  photo,
  onChange,
}: {
  label: string;
  photo: UploadedPhoto | null;
  onChange: (photo: UploadedPhoto | null) => void;
}) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const path = `intake/${crypto.randomUUID()}-${file.name.replace(/\s+/g, "_")}`;
      const { error: uploadError } = await supabase.storage
        .from("accident-photos")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      onChange({ storagePath: path, caption: label, previewUrl: URL.createObjectURL(file) });
    } catch (e: any) {
      setError(e.message ?? "Upload failed — will retry when back online.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-md border border-dashed border-forest-200 p-3 text-center">
      {photo ? (
        <div className="space-y-2">
          <img src={photo.previewUrl} alt={label} className="mx-auto h-28 w-full rounded object-cover" />
          <input
            className="field-input text-xs"
            value={photo.caption}
            onChange={(e) => onChange({ ...photo, caption: e.target.value })}
            placeholder="Caption"
          />
          <button type="button" className="text-xs text-rust-500 underline" onClick={() => onChange(null)}>
            Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="flex h-28 w-full flex-col items-center justify-center gap-1 text-forest-400 hover:text-forest-600"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <span className="text-2xl">📷</span>
          <span className="text-xs">{uploading ? "Uploading…" : label}</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {error && <p className="mt-1 text-xs text-rust-500">{error}</p>}
    </div>
  );
}
