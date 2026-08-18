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

  // Fetch all vehicles associated with the crash
  const { data: accidentVehicles } = await supabase
    .from("accident_vehicles")
    .select("id, is_primary, vehicle:vehicles(id, plate_number, make, model)")
    .eq("accident_id", params.id);

  // Fetch all photos for this accident
  const { data: photos } = await supabase
    .from("photos")
    .select("*")
    .eq("accident_id", params.id);

  const vehiclesData = (accidentVehicles || []).map((av: any) => {
    const v = Array.isArray(av.vehicle) ? av.vehicle[0] : av.vehicle;
    const photo = photos?.find((p: any) => p.vehicle_id === v?.id);
    
    // For existing photos, construct the public URL for the preview.
    // Ensure NEXT_PUBLIC_SUPABASE_URL is properly used.
    const previewUrl = photo 
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/accident-photos/${photo.storage_path}`
      : "";

    return {
      avId: av.id,
      vehicleId: v?.id,
      plateNumber: v?.plate_number || "UNKNOWN",
      makeModel: `${v?.make || ""} ${v?.model || ""}`.trim(),
      isPrimary: av.is_primary,
      photo: photo ? {
        storagePath: photo.storage_path,
        caption: photo.caption || "Vehicle Photo",
        previewUrl
      } : null
    };
  });

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
    causeCode: report?.cause_code || "",
    contributingFactors: report?.contributing_factors || "",
    recommendations: report?.recommendations || "",
  };

  return <ReportForm accidentId={params.id} initialData={initialData} vehiclesData={vehiclesData} />;
}
