import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function createInspection(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const accidentId = formData.get("accidentId") as string;
  const vtNumber = formData.get("vtNumber") as string;
  const inspectedAt = formData.get("inspectedAt") as string;

  const { error } = await supabase.from("inspections").insert({
    accident_id: accidentId,
    vt_number: vtNumber,
    inspected_at: new Date(inspectedAt).toISOString(),
    inspector_id: user.id,
  });

  if (error) {
    console.error(error);
    throw new Error("Failed to create inspection: " + error.message);
  }

  const { data: accident } = await supabase
    .from("accidents")
    .select("nature")
    .eq("id", accidentId)
    .single();

  revalidatePath(`/accidents/${accidentId}`);

  if (accident?.nature === "fatal") {
    redirect(`/accidents/${accidentId}/report`);
  } else {
    redirect(`/dashboard`);
  }
}

export default function InspectionPage({ params }: { params: { id: string } }) {
  const defaultDate = new Date();
  defaultDate.setMinutes(defaultDate.getMinutes() - defaultDate.getTimezoneOffset());
  const defaultDateString = defaultDate.toISOString().slice(0, 16);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="mb-6">
        <p className="id-tag text-forest-400">CASE {params.id.slice(0, 8).toUpperCase()}</p>
        <h1 className="mt-1 text-3xl font-semibold text-forest-800 tracking-tight">Vehicle Inspection</h1>
        <p className="mt-2 text-forest-500">
          Record the inspection details for the vehicles involved in this accident.
        </p>
      </div>

      <form action={createInspection} className="card p-6 space-y-6 shadow-sm border border-forest-100">
        <input type="hidden" name="accidentId" value={params.id} />

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
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-forest-800 hover:bg-forest-900 text-white font-medium rounded-lg shadow-sm hover:shadow transition-all duration-200 active:scale-95"
          >
            Save Inspection
          </button>
        </div>
      </form>
    </div>
  );
}
