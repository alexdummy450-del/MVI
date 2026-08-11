import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DashboardFilters } from "@/components/dashboard-filters";
import { NatureBadge } from "@/components/nature-badge";
import { ExportMonthly } from "@/components/export-monthly";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

type SearchParams = {
  plate?: string;
  vt?: string;
  doa?: string;
  doi?: string;
  inspector?: string;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    // Profiles are auto-provisioned via the database trigger.
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role === "admin") {
      isAdmin = true;
    }
  }

  const [{ count: draftCount }, { count: submittedThisMonthCount }, profilesResponse] =
    await Promise.all([
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "draft"),
      supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "submitted")
        .gte("submitted_at", startOfMonthISO()),
      supabase.from("profiles").select("id, full_name, role, reports(id, status)").order("full_name"),
    ]);

  const inspectors = profilesResponse.data;
  if (profilesResponse.error) {
    console.error("PROFILES ERROR:", profilesResponse.error);
    try {
      require('fs').writeFileSync('C:\\Users\\user\\.gemini\\antigravity\\brain\\d7e102c5-c4ca-4e8d-b888-86a843cfb228\\scratch\\profiles_error.json', JSON.stringify(profilesResponse.error));
    } catch(e) {}
  }

  let query = supabase
    .from("accidents")
    .select(
      `id, occurred_at, nature, location_text, traffic_base, created_by,
       primary_vehicle:vehicles!accidents_primary_vehicle_id_fkey(plate_number),
       inspections(vt_number, inspected_at),
       reports(status, profiles(full_name))`
    )
    .order("occurred_at", { ascending: false })
    .limit(50);

  if (searchParams.doa) {
    const start = new Date(searchParams.doa);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    query = query.gte("occurred_at", start.toISOString()).lt("occurred_at", end.toISOString());
  }
  if (searchParams.inspector) query = query.eq("created_by", searchParams.inspector);

  const { data: accidents, error } = await query;

  // Client-side narrowing for plate / VT since they live on joined tables
  const filtered = (accidents ?? []).filter((a: any) => {
    const plateOk =
      !searchParams.plate ||
      a.primary_vehicle?.plate_number
        ?.toLowerCase()
        .includes(searchParams.plate.toLowerCase());
    const vtOk =
      !searchParams.vt ||
      a.inspections?.some((i: any) =>
        i.vt_number?.toLowerCase().includes(searchParams.vt!.toLowerCase())
      );
    const doiOk =
      !searchParams.doi ||
      a.inspections?.some((i: any) =>
        i.inspected_at?.startsWith(searchParams.doi!)
      );
    return plateOk && vtOk && doiOk;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-forest-800">Dashboard</h1>
        <p className="mt-1 text-sm text-forest-400">
          Overview of accident cases across intake, inspection and reporting.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Draft reports" value={draftCount ?? 0} tone="amber" />
        <StatCard label="Submitted this month" value={submittedThisMonthCount ?? 0} tone="forest" />
        <StatCard label="Open cases" value={filtered.length} tone="ink" />
        <StatCard label="Inspectors" value={inspectors?.length ?? 0} tone="ink" />
      </div>

      {isAdmin && <ExportMonthly />}

      <div className="card p-4">
        <h2 className="text-lg font-semibold text-forest-800 mb-4">Inspectors & Activity</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {inspectors?.map((inspector: any) => {
            const drafts = inspector.reports?.filter((r: any) => r.status === "draft").length ?? 0;
            const submitted = inspector.reports?.filter((r: any) => r.status === "submitted").length ?? 0;
            return (
              <div key={inspector.id} className="border border-forest-100 rounded-md p-3 flex flex-col gap-2 bg-forest-50/30 hover:bg-forest-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-forest-800">{inspector.full_name}</p>
                    <p className="text-xs text-forest-500 uppercase">{inspector.role}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-semibold text-forest-700">{inspector.reports?.length ?? 0}</p>
                    <p className="text-xs text-forest-500">Total Reports</p>
                  </div>
                </div>
                <div className="flex gap-4 text-xs mt-1 pt-2 border-t border-forest-100/50">
                  <span className="text-amber-600 font-medium">{drafts} Pending</span>
                  <span className="text-forest-600 font-medium">{submitted} Submitted</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="dash-divider" />

      <DashboardFilters inspectors={inspectors ?? []} />

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-forest-100 bg-forest-50 text-xs uppercase tracking-wide text-forest-500">
            <tr>
              <th className="px-4 py-3">Plate</th>
              <th className="px-4 py-3">Nature</th>
              <th className="px-4 py-3">Occurred</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">VT No.</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {error && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-rust-500">
                  Could not load accidents: {error.message}
                </td>
              </tr>
            )}
            {!error && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-forest-400">
                  No cases match these filters yet.
                </td>
              </tr>
            )}
            {filtered.map((a: any) => {
              const status: string | undefined = a.reports?.[0]?.status;
              return (
                <tr key={a.id} className="border-b border-forest-50 last:border-0 hover:bg-forest-50/50">
                  <td className="px-4 py-3">
                    <Link href={`/accidents/${a.id}`} className="id-tag hover:underline">
                      {a.primary_vehicle?.plate_number ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <NatureBadge nature={a.nature} />
                  </td>
                  <td className="px-4 py-3 text-forest-700">
                    {format(new Date(a.occurred_at), "d MMM yyyy, HH:mm")}
                  </td>
                  <td className="px-4 py-3 text-forest-600">{a.location_text ?? "—"}</td>
                  <td className="px-4 py-3">
                    {a.inspections?.length
                      ? a.inspections.map((i: any) => (
                          <span key={i.vt_number} className="id-tag mr-2">
                            {i.vt_number}
                          </span>
                        ))
                      : <span className="text-forest-300">not linked</span>}
                  </td>
                  <td className="px-4 py-3">
                    {a.nature === 'fatal' ? (
                      status ? (
                        <div className="flex items-center gap-2">
                          <Link href={`/accidents/${a.id}/report`} className={`status-pill hover:ring-2 hover:ring-forest-200 transition-all ${status === "draft" ? "status-pill-draft" : "status-pill-submitted"}`}>
                            {status}
                          </Link>
                          {a.reports?.[0]?.profiles?.full_name && (
                            <span className="text-xs text-forest-500 whitespace-nowrap">
                              by {a.reports[0].profiles.full_name}
                            </span>
                          )}
                          {status === "submitted" && (
                            <div className="flex items-center gap-1">
                              <Link href={`/accidents/${a.id}/report`} className="p-1.5 text-forest-500 hover:text-forest-800 hover:bg-forest-100 rounded-md transition-colors" title="Edit Report">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </Link>
                              <a href={`/api/export-docx?id=${a.id}`} className="p-1.5 text-forest-500 hover:text-forest-800 hover:bg-forest-100 rounded-md transition-colors" title="Download Final Report">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                              </a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <Link href={`/accidents/${a.id}/report`} className="status-pill bg-forest-50 text-forest-600 hover:bg-forest-100 transition-colors border border-forest-200/50">
                          + create report
                        </Link>
                      )
                    ) : (
                      a.inspections?.length ? (
                        <span className="status-pill bg-forest-100 text-forest-700 border border-forest-200">
                          inspection done
                        </span>
                      ) : (
                        <span className="status-pill bg-amber-50 text-amber-600 border border-amber-200/50">
                          pending inspection
                        </span>
                      )
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "forest" | "ink";
}) {
  const toneClass =
    tone === "amber" ? "text-amber-500" : tone === "forest" ? "text-forest-600" : "text-ink";
  return (
    <div className="card p-4">
      <p className={`font-display text-3xl font-semibold ${toneClass}`}>{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-forest-400">{label}</p>
    </div>
  );
}

function startOfMonthISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}
