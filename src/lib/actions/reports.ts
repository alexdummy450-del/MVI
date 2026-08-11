"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function submitFinalReport(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const accidentId = formData.get("accidentId") as string;
  const isDraft = formData.get("isDraft") === "true";

  const { data: existing } = await supabase.from("reports").select("id, status, submitted_at").eq("accident_id", accidentId).maybeSingle();

  const payload: any = {
    accident_id: accidentId,
    inspector_id: user.id,
    recipient_office: formData.get("recipientOffice") as string,
    subject_line: formData.get("subjectLine") as string,
    road_condition: formData.get("roadCondition") as string,
    traffic_condition: formData.get("trafficCondition") as string,
    weather: formData.get("weather") as string,
    visibility: formData.get("visibility") as string,
    reconstruction_narrative: formData.get("reconstructionNarrative") as string,
    point_of_impact: formData.get("pointOfImpact") as string,
    cause_code: formData.get("causeCode") as string,
    status: isDraft ? "draft" : "submitted" as const,
  };

  if (isDraft) {
    payload.submitted_at = null;
  } else if (!existing || existing.status !== "submitted") {
    // Only set submitted_at to now if it's the first time being submitted
    payload.submitted_at = new Date().toISOString();
  } else {
    // Preserve existing submitted_at if already submitted
    payload.submitted_at = existing.submitted_at;
  }

  let error;
  if (existing) {
    const { error: updateError } = await supabase.from("reports").update(payload).eq("id", existing.id);
    error = updateError;
  } else {
    const { error: insertError } = await supabase.from("reports").insert(payload);
    error = insertError;
  }

  if (error) {
    console.error("Failed to save report", error);
    throw new Error("Failed to save report: " + error.message);
  }

  // Refresh the dashboard so it instantly reflects the new status
  revalidatePath("/dashboard");
  revalidatePath(`/accidents/${accidentId}`);
  
  redirect("/dashboard");
}
