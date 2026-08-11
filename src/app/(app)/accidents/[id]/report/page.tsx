import { createClient } from "@/lib/supabase/server";
import { ReportForm } from "./report-form";

export default async function ReportPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  
  // Fetch accident and primary vehicle to construct default values
  const { data: accident } = await supabase
    .from("accidents")
    .select("*, primary_vehicle:vehicles!accidents_primary_vehicle_id_fkey(plate_number, make, model)")
    .eq("id", params.id)
    .single();

  // Fetch report if it already exists (draft)
  const { data: report } = await supabase
    .from("reports")
    .select("*")
    .eq("accident_id", params.id)
    .maybeSingle();

  let defaultSubjectLine = "";
  if (accident) {
    const dateStr = accident.occurred_at ? new Date(accident.occurred_at).toLocaleDateString() : "UNKNOWN DATE";
    const plate = accident.primary_vehicle?.plate_number || "UNKNOWN";
    defaultSubjectLine = `${(accident.nature || "").toUpperCase()} ROAD TRAFFIC ACCIDENT INVOLVING MOTOR VEHICLE REG NO. ${plate} ALONG ${accident.location_text || "UNKNOWN"} ON ${dateStr}`;
  }

  const initialData = {
    status: report?.status || "draft",
    recipientOffice: report?.recipient_office || (accident?.traffic_base ? `${accident.traffic_base.toUpperCase()} TRAFFIC BASE` : ""),
    subjectLine: report?.subject_line || defaultSubjectLine,
    roadCondition: report?.road_condition || "",
    trafficCondition: report?.traffic_condition || "",
    weather: report?.weather || "",
    visibility: report?.visibility || "",
    reconstructionNarrative: report?.reconstruction_narrative || accident?.narrative || "",
    pointOfImpact: report?.point_of_impact || "",
    causeCode: report?.cause_code || "Speeding",
  };

  return <ReportForm accidentId={params.id} initialData={initialData} />;
}
