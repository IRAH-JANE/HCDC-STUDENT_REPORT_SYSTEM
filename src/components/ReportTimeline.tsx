"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ActivityLog = {
  id: string;
  actor_role: string;
  action: string;
  description: string;
  created_at: string;
};

type ReportTimelineProps = {
  reportId: string;
  refreshKey?: number;
  compact?: boolean;
  limit?: number;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatActorRole(role: string) {
  if (role === "student") return "Student";
  if (role === "department_staff") return "Department Staff";
  if (role === "admin") return "Admin";
  return "System";
}

function formatAction(action: string) {
  if (action === "report_submitted") return "Report Submitted";
  if (action === "student_comment") return "Student Reply";
  if (action === "department_comment") return "Department Reply";
  if (action === "status_changed") return "Status Updated";
  if (action === "admin_viewed") return "Admin Viewed Report";
  if (action === "admin_activity") return "Admin Activity";

  return action
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function ReportTimeline({
  reportId,
  refreshKey = 0,
  compact = false,
  limit,
}: ReportTimelineProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);

      let query = supabase
        .from("report_activity_logs")
        .select("id, actor_role, action, description, created_at")
        .eq("report_id", reportId);

      if (limit) {
        query = query.order("created_at", { ascending: false }).limit(limit);
      } else {
        query = query.order("created_at", { ascending: true });
      }

      const { data, error } = await query;

      if (!error) {
        const fixedLogs = (data as ActivityLog[]) || [];
        setLogs(limit ? fixedLogs.reverse() : fixedLogs);
      }

      setLoading(false);
    }

    fetchLogs();
  }, [reportId, refreshKey, limit]);

  const content = (
    <div className={compact ? "mt-3" : "mt-5"}>
      {loading ? (
        <p className="text-sm hcdc-muted">Loading timeline...</p>
      ) : logs.length === 0 ? (
        <div className="border border-dashed border-gray-300 p-4 text-center">
          <p className="font-bold text-black">No activity yet</p>
          <p className="mt-1 text-sm hcdc-muted">
            Actions will appear here once updates are made.
          </p>
        </div>
      ) : (
        <div>
          {logs.map((log, index) => (
            <div key={log.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="mt-1 h-3 w-3 rounded-full border-2 border-black bg-white" />
                {index !== logs.length - 1 && (
                  <div className="h-full min-h-10 w-px bg-gray-300" />
                )}
              </div>

              <div className={compact ? "pb-3" : "pb-5"}>
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={
                      compact
                        ? "text-sm font-black text-black"
                        : "font-black text-black"
                    }
                  >
                    {formatAction(log.action)}
                  </p>

                  <span className="border border-gray-300 bg-white px-2 py-0.5 text-xs font-bold text-gray-700">
                    {formatActorRole(log.actor_role)}
                  </span>
                </div>

                <p className="mt-1 text-sm text-gray-700">{log.description}</p>

                <p className="mt-1 text-xs text-gray-500">
                  {formatDate(log.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (compact) {
    return content;
  }

  return (
    <section className="hcdc-card p-4 md:p-6">
      <div className="border-b border-gray-200 pb-4">
        <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
          Report Timeline
        </p>

        <h2 className="mt-2 text-xl font-black text-black md:text-2xl">
          Activity History
        </h2>

        <p className="mt-1 text-sm hcdc-muted">
          Track important actions made on this report.
        </p>
      </div>

      {content}
    </section>
  );
}
