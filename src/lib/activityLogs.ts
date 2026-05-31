import { supabase } from "@/lib/supabase";

type CreateActivityLogParams = {
  reportId: string;
  action: string;
  description: string;
};

export async function createActivityLog({
  reportId,
  action,
  description,
}: CreateActivityLogParams) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const actorRole = profile?.role || "unknown";

  const { error } = await supabase.from("report_activity_logs").insert({
    report_id: reportId,
    actor_id: user.id,
    actor_role: actorRole,
    action,
    description,
  });

  if (error) {
    console.error("Activity log error:", error.message);
  }
}
