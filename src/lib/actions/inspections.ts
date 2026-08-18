"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createInspection(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const accidentId = formData.get("accidentId") as string;
  const vtNumber = formData.get("vtNumber") as string;
  const inspectedAt = formData.get("inspectedAt") as string;
  const vtbImagePath = formData.get("vtbImagePath") as string | null;

  const { error } = await supabase.from("inspections").insert({
    accident_id: accidentId,
    vt_number: vtNumber,
    inspected_at: new Date(inspectedAt).toISOString(),
    inspector_id: user.id,
    vtb_image_path: vtbImagePath || null,
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
