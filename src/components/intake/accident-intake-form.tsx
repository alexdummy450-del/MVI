"use client";

import { useState, useTransition } from "react";
import { VehicleField } from "./vehicle-field";
import { createAccident, type VehicleEntryInput } from "@/lib/actions/accidents";

const NATURE_OPTIONS: { value: string; label: string }[] = [
  { value: "fatal", label: "Fatal" },
  { value: "serious", label: "Serious" },
  { value: "slight", label: "Slight" },
  { value: "non_injury", label: "Non-injury" },
];

function nowLocalDatetime() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function AccidentIntakeForm() {
  const [primaryVehicle, setPrimaryVehicle] = useState<VehicleEntryInput>({ mode: "new" });
  const [otherVehicles, setOtherVehicles] = useState<VehicleEntryInput[]>([]);
  const [occurredAt, setOccurredAt] = useState(nowLocalDatetime());
  const [locationText, setLocationText] = useState("");
  const [nature, setNature] = useState("slight");
  const [trafficBase, setTrafficBase] = useState("");
  const [narrative, setNarrative] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  // Injury counts mapping: category -> personType -> count
  const [injuryCounts, setInjuryCounts] = useState({
    fatal: { driver_rider: 0, passenger: 0, pedestrian: 0 },
    serious: { driver_rider: 0, passenger: 0, pedestrian: 0 },
    slight: { driver_rider: 0, passenger: 0, pedestrian: 0 },
  });

  const [isPending, startTransition] = useTransition();

  const handleInjuryChange = (category: 'fatal'|'serious'|'slight', person: 'driver_rider'|'passenger'|'pedestrian', val: string) => {
    const num = parseInt(val, 10) || 0;
    setInjuryCounts(prev => ({
      ...prev,
      [category]: { ...prev[category], [person]: num }
    }));
  };

  const getRowTotal = (category: 'fatal'|'serious'|'slight') => {
    const c = injuryCounts[category];
    return c.driver_rider + c.passenger + c.pedestrian;
  };

  const getColTotal = (person: 'driver_rider'|'passenger'|'pedestrian') => {
    return injuryCounts.fatal[person] + injuryCounts.serious[person] + injuryCounts.slight[person];
  };

  const getTotalVictims = () => {
    return getRowTotal('fatal') + getRowTotal('serious') + getRowTotal('slight');
  };

  function addVehicle() {
    setOtherVehicles((v) => [...v, { mode: "new" }]);
  }

  function updateOtherVehicle(idx: number, entry: VehicleEntryInput) {
    setOtherVehicles((v) => v.map((item, i) => (i === idx ? entry : item)));
  }

  function removeVehicle(idx: number) {
    setOtherVehicles((v) => v.filter((_, i) => i !== idx));
  }

  function submit(continueToInspection: boolean) {
    setError(null);

    if (!primaryVehicle.plateNumber && primaryVehicle.mode !== "existing") {
      setError("Primary vehicle plate number is required.");
      return;
    }
    if (!trafficBase.trim()) {
      setError("Traffic base is required.");
      return;
    }

    startTransition(async () => {
      try {
        await createAccident({
          primaryVehicle,
          vehiclesInvolved: otherVehicles,
          occurredAt: new Date(occurredAt).toISOString(),
          locationText,
          latitude: null,
          longitude: null,
          nature: nature as any,
          trafficBase,
          narrative,
          injuryCounts,
          photos: [],
          continueToInspection,
        });
      } catch (e: any) {
        setError(e.message ?? "Something went wrong saving this accident.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="card space-y-4 p-5">
        <h2 className="font-display text-lg font-semibold text-forest-800">Primary vehicle</h2>
        <VehicleField label="Vehicle in this accident" value={primaryVehicle} onChange={setPrimaryVehicle} />
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-display text-lg font-semibold text-forest-800">Accident details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Date & time</label>
            <input
              type="datetime-local"
              className="field-input"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Nature of accident</label>
            <select className="field-input" value={nature} onChange={(e) => setNature(e.target.value)}>
              {NATURE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">Location</label>
            <div className="flex gap-2">
              <input
                className="field-input"
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="field-label">Traffic base</label>
            <input
              className="field-input"
              value={trafficBase}
              onChange={(e) => setTrafficBase(e.target.value)}
            />
          </div>
        </div>
      </section>

      {nature === "fatal" && (
        <section className="card space-y-4 p-5">
          <h2 className="font-display text-lg font-semibold text-forest-800">Nature of Injuries</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-forest-50 border-b border-forest-200">
                  <th className="p-2 font-semibold text-forest-800">CATEGORY</th>
                  <th className="p-2 font-semibold text-forest-800 text-center">DRIVER/RIDER</th>
                  <th className="p-2 font-semibold text-forest-800 text-center">PASSENGERS</th>
                  <th className="p-2 font-semibold text-forest-800 text-center">PEDESTRIAN</th>
                  <th className="p-2 font-semibold text-forest-800 text-center">TOTAL VICTIMS</th>
                </tr>
              </thead>
              <tbody>
                {(['fatal', 'serious', 'slight'] as const).map(category => (
                  <tr key={category} className="border-b border-forest-100">
                    <td className="p-2 capitalize font-medium">{category}</td>
                    <td className="p-2 text-center">
                      <input type="number" min="0" className="field-input w-20 mx-auto text-center" value={injuryCounts[category].driver_rider || ''} onChange={e => handleInjuryChange(category, 'driver_rider', e.target.value)} />
                    </td>
                    <td className="p-2 text-center">
                      <input type="number" min="0" className="field-input w-20 mx-auto text-center" value={injuryCounts[category].passenger || ''} onChange={e => handleInjuryChange(category, 'passenger', e.target.value)} />
                    </td>
                    <td className="p-2 text-center">
                      <input type="number" min="0" className="field-input w-20 mx-auto text-center" value={injuryCounts[category].pedestrian || ''} onChange={e => handleInjuryChange(category, 'pedestrian', e.target.value)} />
                    </td>
                    <td className="p-2 font-semibold text-forest-700 bg-forest-50 text-center">{getRowTotal(category)}</td>
                  </tr>
                ))}
                <tr className="bg-forest-100 font-semibold text-forest-900 border-t-2 border-forest-300">
                  <td className="p-2">Total</td>
                  <td className="p-2 text-center">{getColTotal('driver_rider')}</td>
                  <td className="p-2 text-center">{getColTotal('passenger')}</td>
                  <td className="p-2 text-center">{getColTotal('pedestrian')}</td>
                  <td className="p-2 text-center">{getTotalVictims()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="card space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-forest-800">Other vehicles involved</h2>
          <button type="button" onClick={addVehicle} className="btn-ghost">
            + Add vehicle
          </button>
        </div>
        {otherVehicles.length === 0 && (
          <p className="text-sm text-forest-400">Only the primary vehicle so far. Add others if this was a multi-vehicle accident.</p>
        )}
        <div className="space-y-3">
          {otherVehicles.map((v, idx) => (
            <div key={idx} className="relative">
              <VehicleField
                label={`Vehicle ${idx + 2}`}
                value={v}
                onChange={(entry) => updateOtherVehicle(idx, entry)}
                allowUnidentified
              />
              <button
                type="button"
                onClick={() => removeVehicle(idx)}
                className="absolute right-3 top-3 text-xs text-rust-500 underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-display text-lg font-semibold text-forest-800">Narrative</h2>
        <textarea
          className="field-input min-h-[100px]"
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
        />
      </section>

      {error && (
        <p className="rounded-md bg-rust-100 px-4 py-2 text-sm text-rust-500">{error}</p>
      )}

      <div className="flex justify-end gap-3 pb-8">
        <button type="button" disabled={isPending} onClick={() => submit(false)} className="btn-secondary">
          Save as draft
        </button>
        <button type="button" disabled={isPending} onClick={() => submit(true)} className="btn-primary">
          {isPending ? "Saving…" : "Continue to inspection"}
        </button>
      </div>
    </div>
  );
}
