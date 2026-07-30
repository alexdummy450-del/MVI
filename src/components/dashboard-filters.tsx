"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function DashboardFilters({
  inspectors,
}: {
  inspectors: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [plate, setPlate] = useState(params.get("plate") ?? "");
  const [vt, setVt] = useState(params.get("vt") ?? "");
  const [doa, setDoa] = useState(params.get("doa") ?? "");
  const [doi, setDoi] = useState(params.get("doi") ?? "");
  const [inspector, setInspector] = useState(params.get("inspector") ?? "");

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams();
    if (plate) next.set("plate", plate);
    if (vt) next.set("vt", vt);
    if (doa) next.set("doa", doa);
    if (doi) next.set("doi", doi);
    if (inspector) next.set("inspector", inspector);
    router.push(`/dashboard?${next.toString()}`);
  }

  function clearFilters() {
    setPlate("");
    setVt("");
    setDoa("");
    setDoi("");
    setInspector("");
    router.push("/dashboard");
  }

  return (
    <form onSubmit={applyFilters} className="card flex flex-wrap items-end gap-3 p-4">
      <div className="min-w-[140px]">
        <label className="field-label">Plate number</label>
        <input className="field-input" value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="KCK 898P" />
      </div>
      <div className="min-w-[140px]">
        <label className="field-label">VT number</label>
        <input className="field-input" value={vt} onChange={(e) => setVt(e.target.value)} placeholder="VT-2026-..." />
      </div>
      <div>
        <label className="field-label">DOA</label>
        <input type="date" className="field-input" value={doa} onChange={(e) => setDoa(e.target.value)} />
      </div>
      <div>
        <label className="field-label">DOI</label>
        <input type="date" className="field-input" value={doi} onChange={(e) => setDoi(e.target.value)} />
      </div>
      <div className="min-w-[160px]">
        <label className="field-label">Inspector</label>
        <select className="field-input" value={inspector} onChange={(e) => setInspector(e.target.value)}>
          <option value="">All inspectors</option>
          {inspectors.map((i) => (
            <option key={i.id} value={i.id}>
              {i.full_name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary">
          Search
        </button>
        <button type="button" onClick={clearFilters} className="btn-secondary">
          Clear
        </button>
      </div>
    </form>
  );
}
