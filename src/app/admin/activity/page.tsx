"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type ActivityLog = {
  id: string;
  report_id: string;
  actor_id: string | null;
  actor_role: string;
  action: string;
  description: string;
  created_at: string;
};

type ReportRecord = {
  id: string;
  title: string;
  status: string;
};

type ProfileRecord = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatRole(role: string) {
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
  if (action === "admin_activity") return "Admin Activity";

  return action
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function roleBadgeClass(role: string) {
  if (role === "student") return "border-green-200 bg-green-50 text-green-800";
  if (role === "department_staff")
    return "border-blue-200 bg-blue-50 text-blue-800";
  if (role === "admin") return "border-red-200 bg-red-50 text-[#b00000]";
  return "border-gray-300 bg-gray-50 text-gray-700";
}

function actionBadgeClass(action: string) {
  if (action === "report_submitted")
    return "border-gray-300 bg-white text-black";
  if (action === "status_changed")
    return "border-yellow-200 bg-yellow-50 text-yellow-800";
  if (action.includes("comment"))
    return "border-blue-200 bg-blue-50 text-blue-800";
  return "border-gray-300 bg-gray-50 text-gray-700";
}

function getActorName(profile?: ProfileRecord | null) {
  if (!profile) return "Unknown User";
  return profile.full_name || profile.email || "Unknown User";
}

export default function AdminActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [reports, setReports] = useState<Record<string, ReportRecord>>({});
  const [profiles, setProfiles] = useState<Record<string, ProfileRecord>>({});

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchActivityLogs() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in.");
      setLoading(false);
      return;
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (adminProfile?.role !== "admin") {
      setError("Only admins can view activity logs.");
      setLoading(false);
      return;
    }

    const { data: logsData, error: logsError } = await supabase
      .from("report_activity_logs")
      .select(
        "id, report_id, actor_id, actor_role, action, description, created_at",
      )
      .order("created_at", { ascending: false });

    if (logsError) {
      setError(logsError.message);
      setLoading(false);
      return;
    }

    const fixedLogs = (logsData as ActivityLog[]) || [];
    setLogs(fixedLogs);

    const reportIds = Array.from(
      new Set(fixedLogs.map((log) => log.report_id)),
    );

    const actorIds = Array.from(
      new Set(fixedLogs.map((log) => log.actor_id).filter(Boolean) as string[]),
    );

    if (reportIds.length > 0) {
      const { data: reportsData } = await supabase
        .from("reports")
        .select("id, title, status")
        .in("id", reportIds);

      const reportMap: Record<string, ReportRecord> = {};

      ((reportsData as ReportRecord[]) || []).forEach((report) => {
        reportMap[report.id] = report;
      });

      setReports(reportMap);
    } else {
      setReports({});
    }

    if (actorIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .in("id", actorIds);

      const profileMap: Record<string, ProfileRecord> = {};

      ((profilesData as ProfileRecord[]) || []).forEach((profile) => {
        profileMap[profile.id] = profile;
      });

      setProfiles(profileMap);
    } else {
      setProfiles({});
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchActivityLogs();
  }, []);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeModal();
      }
    }

    if (modalOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [modalOpen]);

  function openModal(log: ActivityLog) {
    setSelectedLog(log);
    setModalOpen(true);
  }

  function closeModal() {
    setSelectedLog(null);
    setModalOpen(false);
  }

  const uniqueActions = useMemo(() => {
    return Array.from(new Set(logs.map((log) => log.action)));
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const value = search.trim().toLowerCase();

    return logs.filter((log) => {
      const report = reports[log.report_id];
      const actor = log.actor_id ? profiles[log.actor_id] : null;

      const actorName = actor?.full_name || actor?.email || "";
      const reportTitle = report?.title || "";

      const matchesSearch =
        !value ||
        log.description.toLowerCase().includes(value) ||
        log.action.toLowerCase().includes(value) ||
        log.actor_role.toLowerCase().includes(value) ||
        actorName.toLowerCase().includes(value) ||
        reportTitle.toLowerCase().includes(value);

      const matchesRole = roleFilter === "all" || log.actor_role === roleFilter;

      const matchesAction =
        actionFilter === "all" || log.action === actionFilter;

      return matchesSearch && matchesRole && matchesAction;
    });
  }, [logs, reports, profiles, search, roleFilter, actionFilter]);

  const totalStatusUpdates = logs.filter(
    (log) => log.action === "status_changed",
  ).length;

  const totalReplies = logs.filter((log) =>
    log.action.includes("comment"),
  ).length;

  const totalSubmitted = logs.filter(
    (log) => log.action === "report_submitted",
  ).length;

  function clearFilters() {
    setSearch("");
    setRoleFilter("all");
    setActionFilter("all");
  }

  const selectedReport = selectedLog ? reports[selectedLog.report_id] : null;
  const selectedActor =
    selectedLog && selectedLog.actor_id ? profiles[selectedLog.actor_id] : null;

  return (
    <>
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="hcdc-page-title text-3xl md:text-4xl">
            Activity Logs
          </h1>
          <p className="mt-1 text-sm hcdc-muted">
            Monitor report submissions, replies, and status changes across the
            system.
          </p>
        </div>

        <button onClick={fetchActivityLogs} className="btn hcdc-btn-outline">
          Refresh Logs
        </button>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      <section className="mb-4 grid gap-3 md:grid-cols-4">
        <div className="hcdc-card p-5">
          <p className="text-sm font-bold text-gray-600">Total Activity</p>
          <p className="mt-2 text-4xl font-black text-black">
            {loading ? "..." : logs.length}
          </p>
        </div>

        <div className="hcdc-card p-5">
          <p className="text-sm font-bold text-gray-600">Reports Submitted</p>
          <p className="mt-2 text-4xl font-black text-black">
            {loading ? "..." : totalSubmitted}
          </p>
        </div>

        <div className="hcdc-card p-5">
          <p className="text-sm font-bold text-gray-600">Status Updates</p>
          <p className="mt-2 text-4xl font-black text-black">
            {loading ? "..." : totalStatusUpdates}
          </p>
        </div>

        <div className="hcdc-card p-5">
          <p className="text-sm font-bold text-gray-600">Replies</p>
          <p className="mt-2 text-4xl font-black text-black">
            {loading ? "..." : totalReplies}
          </p>
        </div>
      </section>

      <section className="hcdc-card mb-4 p-5">
        <h2 className="text-xl font-black text-black">Filters</h2>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="Search activity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="select select-bordered w-full"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="student">Student</option>
            <option value="department_staff">Department Staff</option>
            <option value="admin">Admin</option>
          </select>

          <select
            className="select select-bordered w-full"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="all">All Actions</option>
            {uniqueActions.map((action) => (
              <option key={action} value={action}>
                {formatAction(action)}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={clearFilters}
          className="btn btn-sm hcdc-btn-outline mt-4"
        >
          Clear Filters
        </button>
      </section>

      <section className="hcdc-card p-5">
        <div className="mb-4 flex flex-col justify-between gap-2 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-black text-black">System Activity</h2>
            <p className="mt-1 text-sm hcdc-muted">
              Showing {filteredLogs.length} of {logs.length} activity logs.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm hcdc-muted">Loading activity logs...</p>
        ) : filteredLogs.length === 0 ? (
          <div className="border border-dashed border-gray-300 p-6 text-center">
            <p className="font-bold text-black">No activity found</p>
            <p className="mt-1 text-sm hcdc-muted">
              Try changing the filters or search keyword.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="hcdc-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Report</th>
                  <th>Description</th>
                  <th>View</th>
                </tr>
              </thead>

              <tbody>
                {filteredLogs.map((log) => {
                  const report = reports[log.report_id];
                  const actor = log.actor_id ? profiles[log.actor_id] : null;

                  return (
                    <tr key={log.id}>
                      <td className="whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </td>

                      <td>
                        <span
                          className={`inline-flex border px-2 py-1 text-xs font-black ${actionBadgeClass(
                            log.action,
                          )}`}
                        >
                          {formatAction(log.action)}
                        </span>
                      </td>

                      <td>
                        <p className="font-bold text-black">
                          {getActorName(actor)}
                        </p>

                        <span
                          className={`mt-1 inline-flex border px-2 py-1 text-xs font-black ${roleBadgeClass(
                            log.actor_role,
                          )}`}
                        >
                          {formatRole(log.actor_role)}
                        </span>
                      </td>

                      <td>
                        <p className="font-bold text-black">
                          {report?.title || "Unknown Report"}
                        </p>

                        {report?.status && (
                          <p className="mt-1 text-xs text-gray-500">
                            Status: {report.status.replace("_", " ")}
                          </p>
                        )}
                      </td>

                      <td className="min-w-80">{log.description}</td>

                      <td>
                        <button
                          type="button"
                          onClick={() => openModal(log)}
                          className="btn btn-sm hcdc-btn-primary"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen && selectedLog && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={closeModal}
            aria-label="Close activity details"
          />

          <section className="relative z-[81] flex max-h-[88vh] w-full max-w-3xl flex-col border border-gray-300 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
                  Activity Details
                </p>

                <h2 className="mt-1 text-2xl font-black text-black">
                  {formatAction(selectedLog.action)}
                </h2>

                <div className="mt-2 flex flex-wrap gap-2">
                  <span
                    className={`inline-flex border px-2 py-1 text-xs font-black ${actionBadgeClass(
                      selectedLog.action,
                    )}`}
                  >
                    {formatAction(selectedLog.action)}
                  </span>

                  <span
                    className={`inline-flex border px-2 py-1 text-xs font-black ${roleBadgeClass(
                      selectedLog.actor_role,
                    )}`}
                  >
                    {formatRole(selectedLog.actor_role)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="btn btn-sm hcdc-btn-outline"
              >
                Close
              </button>
            </div>

            <div className="overflow-y-auto p-5">
              <section className="border border-gray-200 bg-white p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                      Date and Time
                    </p>
                    <p className="mt-1 font-bold text-black">
                      {formatDate(selectedLog.created_at)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                      Actor Role
                    </p>
                    <p className="mt-1 font-bold text-black">
                      {formatRole(selectedLog.actor_role)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                      Actor
                    </p>
                    <p className="mt-1 font-bold text-black">
                      {getActorName(selectedActor)}
                    </p>

                    {selectedActor?.email && (
                      <p className="mt-1 text-sm text-gray-600">
                        {selectedActor.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                      Related Report
                    </p>
                    <p className="mt-1 font-bold text-black">
                      {selectedReport?.title || "Unknown Report"}
                    </p>

                    {selectedReport?.status && (
                      <p className="mt-1 text-sm text-gray-600">
                        Status: {selectedReport.status.replace("_", " ")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 border-t border-gray-200 pt-4">
                  <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                    Activity Description
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                    {selectedLog.description}
                  </p>
                </div>
              </section>

              <div className="mt-4 border-l-4 border-[#b00000] bg-gray-50 p-4">
                <p className="text-sm font-black text-black">Admin Note</p>
                <p className="mt-1 text-sm hcdc-muted">
                  This popup shows the selected activity only. Open the full
                  report page to review complete report details, comments, and
                  full activity history.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 bg-white px-5 py-4">
              <button
                type="button"
                onClick={closeModal}
                className="btn hcdc-btn-outline"
              >
                Close
              </button>

              <Link
                href={`/admin/reports/${selectedLog.report_id}`}
                className="btn hcdc-btn-primary"
              >
                Open Full Report Page
              </Link>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
