"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type VehicleEntryInput = {
  mode: "existing" | "new" | "unidentified";
  vehicleId?: string;
  plateNumber?: string;
  make?: string;
  model?: string;
  year?: number;
  photoBase64?: string;
  registeredOwner?: string;
  sacco?: string;
  damages?: string;
  speedGovernorStatus?: string;
  ks372Compliance?: string;
  insuranceDetails?: string;
  preAccidentCondition?: string;
  driverName?: string;
  driverIdNo?: string;
  driverDlNo?: string;
};

export type PhotoInput = {
  storagePath: string;
  caption?: string;
  vehicleKey?: string; // index into vehiclesInvolved, resolved to vehicleId server-side
};

export type CreateAccidentInput = {
  primaryVehicle: VehicleEntryInput;
  vehiclesInvolved: VehicleEntryInput[]; // additional vehicles, primary excluded
  occurredAt: string;
  locationText?: string;
  latitude?: number | null;
  longitude?: number | null;
  nature: "fatal" | "serious" | "slight" | "non_injury";
  trafficBase: string;
  narrative?: string;
  injuryCounts?: Record<string, Record<string, number>>;
  photos: PhotoInput[];
  continueToInspection: boolean;
};

async function resolveVehicle(
  supabase: ReturnType<typeof createClient>,
  entry: VehicleEntryInput,
  userId: string
): Promise<string | null> {
  if (entry.mode === "unidentified") return null;

  if (entry.mode === "existing" && entry.vehicleId) {
    return entry.vehicleId;
  }

  if (!entry.plateNumber) {
    throw new Error("Plate number is required for a new vehicle.");
  }

  // Upsert by plate_number to avoid duplicate vehicle records.
  const { data: existing } = await supabase
    .from("vehicles")
    .select("id")
    .eq("plate_number", entry.plateNumber.trim().toUpperCase())
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("vehicles")
    .insert({
      plate_number: entry.plateNumber.trim().toUpperCase(),
      make: entry.make || null,
      model: entry.model || null,
      year: entry.year || null,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) throw error;
  return created.id;
}

export async function createAccident(input: CreateAccidentInput) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated.");

  const primaryVehicleId = await resolveVehicle(supabase, input.primaryVehicle, user.id);
  if (!primaryVehicleId) {
    throw new Error("Primary vehicle cannot be unidentified.");
  }

  const { data: accident, error: accidentError } = await supabase
    .from("accidents")
    .insert({
      primary_vehicle_id: primaryVehicleId,
      occurred_at: input.occurredAt,
      location_text: input.locationText || null,
      nature: input.nature,
      traffic_base: input.trafficBase,
      narrative: input.narrative || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (accidentError) throw accidentError;

  // Primary vehicle is always accident_vehicles row #0
  const accidentVehicleRows = [
    { accident_id: accident.id, vehicle_id: primaryVehicleId, is_unidentified: false, is_primary: true, sort_order: 0 },
  ];

  for (const [idx, entry] of input.vehiclesInvolved.entries()) {
    const vehicleId = await resolveVehicle(supabase, entry, user.id);
    accidentVehicleRows.push({
      accident_id: accident.id,
      vehicle_id: vehicleId,
      is_unidentified: entry.mode === "unidentified",
      is_primary: false,
      sort_order: idx + 1,
    });
  }

  const { data: insertedAccidentVehicles, error: avError } = await supabase
    .from("accident_vehicles")
    .insert(accidentVehicleRows)
    .select("id, sort_order");

  if (avError) throw avError;

  // Always create a draft report to hold vehicle details and injury counts
  const { data: report, error: reportError } = await supabase
    .from("reports")
    .insert({
      accident_id: accident.id,
      inspector_id: user.id,
      status: 'draft',
    })
    .select("id")
    .single();

  if (reportError) throw reportError;

  if (input.nature === "fatal" && input.injuryCounts) {
    const injuryRows = [];
    for (const category of ['fatal', 'serious', 'slight'] as const) {
      for (const person of ['driver_rider', 'passenger', 'pedestrian'] as const) {
        const count = input.injuryCounts[category]?.[person] || 0;
        if (count > 0) {
          injuryRows.push({
            report_id: report.id,
            category,
            person_type: person,
            count,
          });
        }
      }
    }
    
    if (injuryRows.length > 0) {
      const { error: injuryError } = await supabase.from("report_injury_counts").insert(injuryRows);
      if (injuryError) throw injuryError;
    }
  }

  // Insert report_vehicle_details
  const vehicleDetailsRows = [];
  const allInputs = [input.primaryVehicle, ...input.vehiclesInvolved];
  for (const [idx, vInput] of allInputs.entries()) {
    const avId = insertedAccidentVehicles[idx]?.id;
    if (avId && (vInput.registeredOwner || vInput.damages || vInput.preAccidentCondition)) {
      vehicleDetailsRows.push({
        report_id: report.id,
        accident_vehicle_id: avId,
        registered_owner: vInput.registeredOwner || null,
        sacco: vInput.sacco || null,
        make_model_type: vInput.make ? `${vInput.make} ${vInput.model || ''}` : null,
        damages: vInput.damages || null,
        speed_governor_status: vInput.speedGovernorStatus || null,
        ks372_compliance: vInput.ks372Compliance || null,
        insurance_details: vInput.insuranceDetails || null,
        pre_accident_condition: vInput.preAccidentCondition || null,
      });
    }
  }
  
  if (vehicleDetailsRows.length > 0) {
    const { error: detailsError } = await supabase.from("report_vehicle_details").insert(vehicleDetailsRows);
    if (detailsError) throw detailsError;
  }

  // Insert report_driver_details
  const driverDetailsRows = [];
  for (const [idx, vInput] of allInputs.entries()) {
    const avId = insertedAccidentVehicles[idx]?.id;
    if (avId && (vInput.driverName || vInput.driverIdNo || vInput.driverDlNo)) {
      driverDetailsRows.push({
        report_id: report.id,
        accident_vehicle_id: avId,
        driver_name: vInput.driverName || 'Pending',
        driver_id_no: vInput.driverIdNo || 'Pending',
        driver_dl_no: vInput.driverDlNo || 'Pending',
      });
    }
  }

  if (driverDetailsRows.length > 0) {
    const { error: driverError } = await supabase.from("report_driver_details").insert(driverDetailsRows);
    if (driverError) throw driverError;
  }

  // Collect photos from vehicle inputs
  const photosToUpload: { vehicleId: string, base64: string }[] = [];
  if (input.primaryVehicle.photoBase64 && primaryVehicleId) {
    photosToUpload.push({ vehicleId: primaryVehicleId, base64: input.primaryVehicle.photoBase64 });
  }
  for (const [idx, entry] of input.vehiclesInvolved.entries()) {
    if (entry.photoBase64) {
      const vId = accidentVehicleRows[idx + 1].vehicle_id;
      if (vId) {
        photosToUpload.push({ vehicleId: vId, base64: entry.photoBase64 });
      }
    }
  }

  if (photosToUpload.length > 0 || input.photos.length > 0) {
    const photoRows = input.photos.map((p) => ({
      accident_id: accident.id,
      stage: "intake" as const,
      storage_path: p.storagePath,
      caption: p.caption || null,
      uploaded_by: user.id,
      vehicle_id: null as string | null,
    }));

    for (const p of photosToUpload) {
      const match = p.base64.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
      if (match) {
        const ext = match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, "base64");
        const fileName = `${accident.id}/${p.vehicleId}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("accident-photos")
          .upload(fileName, buffer, { contentType: `image/${ext}` });
        
        if (uploadError) console.error("Error uploading photo:", uploadError);
        else {
          photoRows.push({
            accident_id: accident.id,
            stage: "intake",
            storage_path: fileName,
            caption: "Vehicle Photo",
            uploaded_by: user.id,
            vehicle_id: p.vehicleId,
          });
        }
      }
    }

    if (photoRows.length > 0) {
      const { error: photoError } = await supabase.from("photos").insert(photoRows);
      if (photoError) throw photoError;
    }
  }

  revalidatePath("/dashboard");

  if (input.continueToInspection) {
    redirect(`/accidents/${accident.id}?step=inspection`);
  } else {
    redirect(`/accidents/${accident.id}`);
  }
}

export async function searchVehiclesByPlate(query: string) {
  const supabase = createClient();
  if (!query || query.length < 2) return [];
  const { data, error } = await supabase
    .from("vehicles")
    .select("id, plate_number, make, model, year")
    .ilike("plate_number", `%${query}%`)
    .limit(8);
  if (error) throw error;
  return data;
}
