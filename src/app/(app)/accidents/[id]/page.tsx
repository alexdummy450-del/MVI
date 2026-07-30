import { notFound } from "next/navigation";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { NatureBadge } from "@/components/nature-badge";

export default async function AccidentDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: accident } = await supabase
    .from("accidents")
    .select(
      `*, primary_vehicle:vehicles!accidents_primary_vehicle_id_fkey(plate_number, make, model),
       accident_vehicles(id, is_primary, is_unidentified, sort_order, vehicle:vehicles(plate_number, make, model)),
       inspections(id, vt_number, inspected_at),
       reports(id, status, submitted_at)`
    )
    .eq("id", params.id)
    .single();

  if (!accident) notFound();

  const inspection = accident.inspections?.[0];
  const report = accident.reports?.[0];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="id-tag text-forest-400">CASE {accident.id.slice(0, 8).toUpperCase()}</p>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-forest-800">
            {accident.primary_vehicle?.plate_number}
          </h1>
          <NatureBadge nature={accident.nature} />
        </div>
        <p className="mt-1 text-sm text-forest-400">
          {format(new Date(accident.occurred_at), "d MMM yyyy, HH:mm")} · {accident.location_text ?? "location not recorded"}
        </p>
      </div>

      <ProgressTrack hasInspection={!!inspection} reportStatus={report?.status ?? null} />

      <section className="card space-y-3 p-5">
        <h2 className="font-display text-lg font-semibold text-forest-800">Vehicles involved</h2>
        <ul className="space-y-2">
          {accident.accident_vehicles
            ?.sort((a: any, b: any) => a.sort_order - b.sort_order)
            .map((av: any) => (
              <li key={av.id} className="flex items-center justify-between rounded-md border border-forest-50 px-3 py-2 text-sm">
                <span className="id-tag">
                  {av.is_unidentified ? "UNIDENTIFIED" : av.vehicle?.plate_number}
                </span>
                <span className="text-forest-500">
                  {av.is_primary && <span className="mr-2 rounded bg-forest-100 px-1.5 py-0.5 text-xs text-forest-700">Primary</span>}
                  {[av.vehicle?.make, av.vehicle?.model].filter(Boolean).join(" ")}
                </span>
              </li>
            ))}
        </ul>
      </section>

      {accident.narrative && (
        <section className="card space-y-2 p-5">
          <h2 className="font-display text-lg font-semibold text-forest-800">Narrative</h2>
          <p className="text-sm text-forest-700">{accident.narrative}</p>
        </section>
      )}

      <section className="card flex items-center justify-between p-5">
        <div>
          <h2 className="font-display text-lg font-semibold text-forest-800">Inspection</h2>
          <p className="text-sm text-forest-400">
            {inspection ? (
              <>
                VT <span className="id-tag">{inspection.vt_number}</span> · {format(new Date(inspection.inspected_at), "d MMM yyyy")}
              </>
            ) : (
              "Not yet linked"
            )}
          </p>
        </div>
        <a href={`/accidents/${accident.id}/inspection`} className="btn-secondary">
          {inspection ? "View" : "Start inspection"}
        </a>
      </section>

      <section className="card flex items-center justify-between p-5">
        <div>
          <h2 className="font-display text-lg font-semibold text-forest-800">Report</h2>
          <p className="text-sm text-forest-400">
            {report ? `Status: ${report.status}` : "Not started"}
          </p>
        </div>
        <div className="flex gap-3">
          {report?.status === "submitted" && (
            <a href={`/api/export-docx?id=${accident.id}`} className="btn-secondary flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Download Final .docx
            </a>
          )}
          {report?.status !== "submitted" && (
            <a href={`/accidents/${accident.id}/report`} className="btn-primary">
              {report ? "Continue report" : "Start report"}
            </a>
          )}
        </div>
      </section>
    </div>
  );
}

function ProgressTrack({
  hasInspection,
  reportStatus,
}: {
  hasInspection: boolean;
  reportStatus: "draft" | "submitted" | null;
}) {
  const steps = [
    { label: "Intake", done: true },
    { label: "Inspection", done: hasInspection },
    { label: "Report", done: reportStatus === "submitted" },
  ];
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
              s.done ? "bg-forest-500 text-white" : "bg-forest-50 text-forest-400"
            }`}
          >
            {i + 1}
          </div>
          <span className={`text-sm ${s.done ? "text-forest-700" : "text-forest-400"}`}>{s.label}</span>
          {i < steps.length - 1 && <div className="h-px w-8 bg-forest-100" />}
        </div>
      ))}
    </div>
  );
}
