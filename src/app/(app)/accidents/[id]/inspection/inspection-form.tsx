"use client";

import { useState, useTransition } from "react";
import { PhotoSlot, UploadedPhoto } from "@/components/intake/photo-slot";
import { createInspection } from "@/lib/actions/inspections";

export function InspectionForm({ accidentId }: { accidentId: string }) {
  const [isPending, startTransition] = useTransition();
  const [vtbPhoto, setVtbPhoto] = useState<UploadedPhoto | null>(null);

  const defaultDate = new Date();
  defaultDate.setMinutes(defaultDate.getMinutes() - defaultDate.getTimezoneOffset());
  const defaultDateString = defaultDate.toISOString().slice(0, 16);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("accidentId", accidentId);
    if (vtbPhoto) {
      formData.append("vtbImagePath", vtbPhoto.storagePath);
    }
    
    startTransition(async () => {
      try {
        await createInspection(formData);
      } catch (error: any) {
        alert(error.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-6 shadow-sm border border-forest-100">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="vtNumber" className="block text-sm font-medium text-forest-800">
            VT Number
          </label>
          <input
            type="text"
            id="vtNumber"
            name="vtNumber"
            required
            placeholder="e.g. VT-2026-089"
            className="w-full px-4 py-2 rounded-lg border border-forest-200 bg-white focus:outline-none focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500 transition-all duration-200"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="inspectedAt" className="block text-sm font-medium text-forest-800">
            Inspection Date & Time
          </label>
          <input
            type="datetime-local"
            id="inspectedAt"
            name="inspectedAt"
            required
            defaultValue={defaultDateString}
            className="w-full px-4 py-2 rounded-lg border border-forest-200 bg-white focus:outline-none focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500 transition-all duration-200"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="block text-sm font-medium text-forest-800">
            VTB Report Image (Optional)
          </label>
          <PhotoSlot 
            label="Upload VTB Report" 
            photo={vtbPhoto}
            onChange={setVtbPhoto}
          />
          <p className="text-xs text-forest-500 mt-1">Upload a clear photo or scan of the finalized VTB report document.</p>
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 bg-forest-800 hover:bg-forest-900 text-white font-medium rounded-lg shadow-sm hover:shadow transition-all duration-200 active:scale-95 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Saving...
            </>
          ) : "Save Inspection"}
        </button>
      </div>
    </form>
  );
}
