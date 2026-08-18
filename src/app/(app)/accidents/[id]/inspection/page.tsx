import { InspectionForm } from "./inspection-form";

export default function InspectionPage({ params }: { params: { id: string } }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="mb-6">
        <p className="id-tag text-forest-400">CASE {params.id.slice(0, 8).toUpperCase()}</p>
        <h1 className="mt-1 text-3xl font-semibold text-forest-800 tracking-tight">Vehicle Inspection</h1>
        <p className="mt-2 text-forest-500">
          Record the inspection details for the vehicles involved in this accident.
        </p>
      </div>

      <InspectionForm accidentId={params.id} />
    </div>
  );
}
