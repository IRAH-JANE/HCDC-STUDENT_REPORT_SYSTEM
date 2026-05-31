import { supabase } from "@/lib/supabase";

export async function notifyDepartmentStaff(reportId: string, message: string) {
  const { error } = await supabase.rpc("notify_department_staff", {
    p_report_id: reportId,
    p_message: message,
  });

  if (error) {
    console.error("Department notification error:", error.message);
  }
}

export async function notifyReportStudent(reportId: string, message: string) {
  const { error } = await supabase.rpc("notify_report_student", {
    p_report_id: reportId,
    p_message: message,
  });

  if (error) {
    console.error("Student notification error:", error.message);
  }
}
