"use client";

import { useEffect, useRef, useState } from "react";
import { searchVehiclesByPlate } from "@/lib/actions/accidents";
import type { VehicleEntryInput } from "@/lib/actions/accidents";

type Suggestion = { id: string; plate_number: string; make: string | null; model: string | null; year: number | null };

export function VehicleField({
  value,
  onChange,
  allowUnidentified = false,
  label,
}: {
  value: VehicleEntryInput;
  onChange: (v: VehicleEntryInput) => void;
  allowUnidentified?: boolean;
  label: string;
}) {
  const [query, setQuery] = useState(value.plateNumber ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (value.mode === "unidentified") return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (query.length < 2) {
        setSuggestions([]);
        return;
      }
      const results = await searchVehiclesByPlate(query);
      setSuggestions(results as Suggestion[]);
    }, 250);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function pickExisting(s: Suggestion) {
    onChange({
      mode: "existing",
      vehicleId: s.id,
      plateNumber: s.plate_number,
      make: s.make ?? undefined,
      model: s.model ?? undefined,
      year: s.year ?? undefined,
    });
    setQuery(s.plate_number);
    setOpen(false);
  }

  function markUnidentified() {
    onChange({ mode: "unidentified" });
    setQuery("");
    setOpen(false);
  }

  if (value.mode === "unidentified") {
    return (
      <div className="rounded-md border border-dashed border-forest-200 bg-forest-50 p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-forest-700">{label}: Unidentified vehicle</p>
          <button type="button" className="text-xs text-forest-500 underline" onClick={() => onChange({ mode: "new" })}>
            Identify instead
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-md border border-forest-100 p-3">
      <p className="mb-2 text-sm font-medium text-forest-700">{label}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
        <div className="relative sm:col-span-2">
          <label className="field-label">Plate number</label>
          <input
            className="field-input font-mono uppercase"
            value={query}
            placeholder="KCK 898P"
            onChange={(e) => {
              const v = e.target.value;
              setQuery(v);
              setOpen(true);
              onChange({ mode: "new", plateNumber: v });
            }}
            onFocus={() => setOpen(true)}
          />
          {open && suggestions.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full rounded-md border border-forest-100 bg-paper shadow-card">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-forest-50"
                    onClick={() => pickExisting(s)}
                  >
                    <span className="id-tag">{s.plate_number}</span>
                    <span className="text-forest-400">
                      {[s.make, s.model, s.year].filter(Boolean).join(" ") || "no details on file"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <label className="field-label">Make</label>
          <input
            className="field-input"
            value={value.make ?? ""}
            disabled={value.mode === "existing"}
            onChange={(e) => onChange({ ...value, mode: "new", make: e.target.value })}
          />
        </div>
        <div>
          <label className="field-label">Model</label>
          <input
            className="field-input"
            value={value.model ?? ""}
            disabled={value.mode === "existing"}
            onChange={(e) => onChange({ ...value, mode: "new", model: e.target.value })}
          />
        </div>
        <div className="sm:col-span-4 mt-2">
          <label className="field-label">Vehicle Photo (Optional)</label>
          <input
            type="file"
            accept="image/*"
            className="field-input text-sm file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-forest-50 file:text-forest-700 hover:file:bg-forest-100"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                  onChange({ ...value, photoBase64: reader.result as string });
                };
                reader.readAsDataURL(file);
              } else {
                onChange({ ...value, photoBase64: undefined });
              }
            }}
          />
          {value.photoBase64 && (
            <div className="mt-2">
              <img src={value.photoBase64} alt="Vehicle preview" className="h-20 w-auto rounded-md object-cover border border-forest-200" />
            </div>
          )}
        </div>
      </div>
      
      {value.mode === "new" && query.length >= 2 && (
        <p className="mt-2 text-xs text-forest-400">
          No match on file — this will be saved as a new vehicle record.
        </p>
      )}

      {/* Extended Vehicle Details */}
      <div className="mt-4 grid grid-cols-1 gap-4 border-t border-forest-100 pt-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="field-label">Registered Owner</label>
          <input className="field-input" value={value.registeredOwner ?? ""} onChange={e => onChange({...value, registeredOwner: e.target.value})} />
        </div>
        <div>
          <label className="field-label">SACCO Name (If applicable)</label>
          <input className="field-input" value={value.sacco ?? ""} onChange={e => onChange({...value, sacco: e.target.value})} />
        </div>
        <div>
          <label className="field-label">Speed Governor Functionality / N.A</label>
          <input className="field-input" value={value.speedGovernorStatus ?? ""} onChange={e => onChange({...value, speedGovernorStatus: e.target.value})} />
        </div>
        <div>
          <label className="field-label">KS 372 Compliance Status</label>
          <input className="field-input" value={value.ks372Compliance ?? ""} onChange={e => onChange({...value, ks372Compliance: e.target.value})} />
        </div>
        <div>
          <label className="field-label">Insurance Details / Expiry</label>
          <input className="field-input" value={value.insuranceDetails ?? ""} onChange={e => onChange({...value, insuranceDetails: e.target.value})} />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label">General Damages Due to Accident</label>
          <textarea className="field-input" value={value.damages ?? ""} onChange={e => onChange({...value, damages: e.target.value})} />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label">Pre-Accident Condition / Defects Noted</label>
          <textarea className="field-input" value={value.preAccidentCondition ?? ""} onChange={e => onChange({...value, preAccidentCondition: e.target.value})} />
        </div>
      </div>

      {/* Driver Details */}
      <div className="mt-4 grid grid-cols-1 gap-4 border-t border-forest-100 pt-4 sm:grid-cols-3">
        <h3 className="col-span-1 sm:col-span-3 text-sm font-semibold text-forest-700">Driver Details</h3>
        <div>
          <label className="field-label">Driver's Name</label>
          <input className="field-input" value={value.driverName ?? ""} onChange={e => onChange({...value, driverName: e.target.value})} />
        </div>
        <div>
          <label className="field-label">Driver's ID No</label>
          <input className="field-input" value={value.driverIdNo ?? ""} onChange={e => onChange({...value, driverIdNo: e.target.value})} />
        </div>
        <div>
          <label className="field-label">Driver's DL No</label>
          <input className="field-input" value={value.driverDlNo ?? ""} onChange={e => onChange({...value, driverDlNo: e.target.value})} />
        </div>
      </div>

      {allowUnidentified && (
        <button type="button" onClick={markUnidentified} className="mt-2 text-xs text-forest-500 underline">
          Mark as unidentified instead
        </button>
      )}
    </div>
  );
}
