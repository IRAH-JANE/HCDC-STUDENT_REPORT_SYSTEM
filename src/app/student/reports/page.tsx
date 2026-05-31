/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { notifyDepartmentStaff } from "@/lib/notifications";
import { createActivityLog } from "@/lib/activityLogs";
import { StatusBadge, UrgencyBadge } from "@/components/ReportBadges";
import ReportTimeline from "@/components/ReportTimeline";

type Report = {
  id: string;
  department_id: string;
  title: string;
  category: string | null;
  urgency: string;
  status: string;
  created_at: string;
};

type ReportDetails = {
  id: string;
  student_id: string;
  department_id: string;
  title: string;
  description: string;
  category: string | null;
  location: string | null;
  urgency: string;
  status: string;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string | null;
};

type Department = {
  id: string;
  name: string;
};

type Attachment = {
  id: string;
  file_url: string;
  file_name: string | null;
  file_type: string | null;
};

type Comment = {
  id: string;
  report_id: string;
  user_id: string;
  comment: string;
  created_at: string;
};

type ProfileRecord = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
};

function formatDate(value: string | null) {
  if (!value) return "Not updated yet";
  return new Date(value).toLocaleString();
}

function formatDateOnly(value: string) {
  return new Date(value).toLocaleDateString();
}

function getCommentAuthor(
  comment: Comment,
  currentUserId: string,
  profiles: Record<string, ProfileRecord>,
) {
  if (comment.user_id === currentUserId) return "You";

  const profile = profiles[comment.user_id];

  if (!profile) return "Department Staff";

  if (profile.role === "department_staff") {
    return `${profile.full_name || profile.email || "Department Staff"} - Department Staff`;
  }

  if (profile.role === "admin") {
    return `${profile.full_name || profile.email || "Admin"} - Admin`;
  }

  return profile.full_name || profile.email || "Student";
}

export default function MyReportsPage() {
  const [currentUserId, setCurrentUserId] = useState("");

  const [reports, setReports] = useState<Report[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");

  const [selectedReport, setSelectedReport] = useState<ReportDetails | null>(
    null,
  );
  const [selectedDepartmentName, setSelectedDepartmentName] = useState("N/A");
  const [selectedAttachments, setSelectedAttachments] = useState<Attachment[]>(
    [],
  );
  const [selectedComments, setSelectedComments] = useState<Comment[]>([]);
  const [selectedCommentProfiles, setSelectedCommentProfiles] = useState<
    Record<string, ProfileRecord>
  >({});

  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [timelineRefreshKey, setTimelineRefreshKey] = useState(0);

  async function fetchReports() {
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

    setCurrentUserId(user.id);

    const [reportsResult, departmentsResult] = await Promise.all([
      supabase
        .from("reports")
        .select(
          `
          id,
          department_id,
          title,
          category,
          urgency,
          status,
          created_at
        `,
        )
        .eq("student_id", user.id)
        .order("created_at", { ascending: false }),

      supabase.from("departments").select("id, name").order("name"),
    ]);

    if (reportsResult.error) {
      setError(reportsResult.error.message);
    } else {
      setReports((reportsResult.data as Report[]) || []);
    }

    if (!departmentsResult.error) {
      setDepartments((departmentsResult.data as Department[]) || []);
    }

    setLoading(false);
  }

  async function fetchModalComments(reportId: string) {
    const { data: commentsData, error: commentsError } = await supabase
      .from("report_comments")
      .select("id, report_id, user_id, comment, created_at")
      .eq("report_id", reportId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (commentsError) return;

    const fixedComments = ((commentsData as Comment[]) || []).reverse();
    setSelectedComments(fixedComments);

    const userIds = Array.from(
      new Set(fixedComments.map((comment) => comment.user_id)),
    );

    if (userIds.length === 0) {
      setSelectedCommentProfiles({});
      return;
    }

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .in("id", userIds);

    const profileMap: Record<string, ProfileRecord> = {};

    ((profilesData as ProfileRecord[]) || []).forEach((profile) => {
      profileMap[profile.id] = profile;
    });

    setSelectedCommentProfiles(profileMap);
  }

  useEffect(() => {
    fetchReports();
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

  function getDepartmentName(id: string) {
    return departments.find((dept) => dept.id === id)?.name || "N/A";
  }

  const filteredReports = useMemo(() => {
    const searchValue = search.toLowerCase().trim();

    return reports.filter((report) => {
      const departmentName = getDepartmentName(
        report.department_id,
      ).toLowerCase();

      const matchesSearch =
        report.title.toLowerCase().includes(searchValue) ||
        (report.category || "").toLowerCase().includes(searchValue) ||
        departmentName.includes(searchValue);

      const matchesStatus =
        statusFilter === "all" || report.status === statusFilter;

      const matchesUrgency =
        urgencyFilter === "all" || report.urgency === urgencyFilter;

      const matchesDepartment =
        departmentFilter === "all" || report.department_id === departmentFilter;

      return (
        matchesSearch && matchesStatus && matchesUrgency && matchesDepartment
      );
    });
  }, [
    reports,
    departments,
    search,
    statusFilter,
    urgencyFilter,
    departmentFilter,
  ]);

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setUrgencyFilter("all");
    setDepartmentFilter("all");
  }

  function closeModal() {
    setModalOpen(false);
    setModalLoading(false);
    setModalError("");
    setModalSuccess("");
    setSelectedReport(null);
    setSelectedDepartmentName("N/A");
    setSelectedAttachments([]);
    setSelectedComments([]);
    setSelectedCommentProfiles({});
    setNewComment("");
    setSendingComment(false);
  }

  async function openReportModal(reportId: string) {
    setModalOpen(true);
    setModalLoading(true);
    setModalError("");
    setModalSuccess("");
    setSelectedReport(null);
    setSelectedDepartmentName("N/A");
    setSelectedAttachments([]);
    setSelectedComments([]);
    setSelectedCommentProfiles({});
    setNewComment("");

    const { data: reportData, error: reportError } = await supabase
      .from("reports")
      .select(
        `
        id,
        student_id,
        department_id,
        title,
        description,
        category,
        location,
        urgency,
        status,
        is_anonymous,
        created_at,
        updated_at
      `,
      )
      .eq("id", reportId)
      .eq("student_id", currentUserId)
      .single();

    if (reportError || !reportData) {
      setModalError("Report not found or you do not have access.");
      setModalLoading(false);
      return;
    }

    const fixedReport = reportData as ReportDetails;
    setSelectedReport(fixedReport);
    setSelectedDepartmentName(getDepartmentName(fixedReport.department_id));

    const { data: attachmentsData, error: attachmentsError } = await supabase
      .from("report_attachments")
      .select("id, file_url, file_name, file_type")
      .eq("report_id", fixedReport.id);

    if (!attachmentsError) {
      setSelectedAttachments((attachmentsData as Attachment[]) || []);
    }

    await fetchModalComments(fixedReport.id);

    setModalLoading(false);
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedReport || !newComment.trim()) return;

    setSendingComment(true);
    setModalError("");
    setModalSuccess("");

    const { error: commentError } = await supabase
      .from("report_comments")
      .insert({
        report_id: selectedReport.id,
        user_id: currentUserId,
        comment: newComment.trim(),
      });

    if (commentError) {
      setModalError(commentError.message);
      setSendingComment(false);
      return;
    }

    await createActivityLog({
      reportId: selectedReport.id,
      action: "student_comment",
      description: "Student replied to the report.",
    });

    await notifyDepartmentStaff(
      selectedReport.id,
      `Student replied to report: ${selectedReport.title}`,
    );

    setNewComment("");
    await fetchModalComments(selectedReport.id);
    setTimelineRefreshKey((value) => value + 1);
    setModalSuccess("Reply sent successfully.");
    setSendingComment(false);
  }

  return (
    <>
      <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="hcdc-page-title text-2xl md:text-3xl">My Reports</h1>
          <p className="mt-1 text-sm hcdc-muted">
            Search, filter, and track all concerns you submitted.
          </p>
        </div>

        <Link href="/student/reports/new" className="btn hcdc-btn-primary">
          Submit New Report
        </Link>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      <section className="hcdc-card mb-4 p-5">
        <div className="border-b border-gray-200 pb-4">
          <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
            Filters
          </p>

          <h2 className="mt-2 text-2xl font-black text-black">Find Reports</h2>

          <p className="mt-1 text-sm hcdc-muted">
            Filter by department, status, urgency, category, or title.
          </p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="select select-bordered w-full"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            className="select select-bordered w-full"
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
          >
            <option value="all">All Urgency</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          <select
            className="select select-bordered w-full"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        <button
          className="btn btn-sm hcdc-btn-outline mt-4"
          onClick={clearFilters}
          type="button"
        >
          Clear Filters
        </button>
      </section>

      <section className="hcdc-card p-5">
        <div className="mb-4 flex flex-col justify-between gap-2 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
              Report List
            </p>

            <h2 className="mt-2 text-2xl font-black text-black">
              Submitted Reports
            </h2>

            <p className="mt-1 text-sm hcdc-muted">
              Showing {filteredReports.length} of {reports.length} reports.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm hcdc-muted">Loading reports...</p>
        ) : filteredReports.length === 0 ? (
          <div className="border border-dashed border-gray-300 p-6 text-center">
            <p className="font-bold text-black">No reports found</p>
            <p className="mt-1 text-sm hcdc-muted">
              Try changing your filters or submit a new report.
            </p>

            <Link
              href="/student/reports/new"
              className="btn hcdc-btn-primary mt-4"
            >
              Submit Report
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="hcdc-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Department / Office</th>
                  <th>Category</th>
                  <th>Urgency</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report.id}>
                    <td className="font-black text-black">{report.title}</td>

                    <td>{getDepartmentName(report.department_id)}</td>

                    <td>{report.category || "N/A"}</td>

                    <td>
                      <UrgencyBadge urgency={report.urgency} />
                    </td>

                    <td>
                      <StatusBadge status={report.status} />
                    </td>

                    <td>{formatDateOnly(report.created_at)}</td>

                    <td>
                      <button
                        type="button"
                        onClick={() => openReportModal(report.id)}
                        className="btn btn-sm hcdc-btn-primary"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={closeModal}
            aria-label="Close report details"
          />

          <section className="relative z-[81] flex max-h-[88vh] w-full max-w-5xl flex-col border border-gray-300 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
                  Report Details
                </p>

                <h2 className="mt-1 text-2xl font-black text-black">
                  {selectedReport?.title || "Loading report..."}
                </h2>

                {selectedReport && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <UrgencyBadge urgency={selectedReport.urgency} />
                    <StatusBadge status={selectedReport.status} />
                  </div>
                )}
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
              {modalLoading ? (
                <div className="flex min-h-60 items-center justify-center">
                  <div className="text-center">
                    <span className="loading loading-spinner loading-md"></span>
                    <p className="mt-3 text-sm hcdc-muted">
                      Loading report details...
                    </p>
                  </div>
                </div>
              ) : modalError ? (
                <div className="alert alert-error">
                  <span>{modalError}</span>
                </div>
              ) : selectedReport ? (
                <div className="grid gap-4">
                  {modalSuccess && (
                    <div className="alert alert-success">
                      <span>{modalSuccess}</span>
                    </div>
                  )}

                  <section className="border border-gray-200 bg-white p-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                          Department / Office
                        </p>
                        <p className="mt-1 font-bold text-black">
                          {selectedDepartmentName}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                          Category
                        </p>
                        <p className="mt-1 text-black">
                          {selectedReport.category || "N/A"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                          Location
                        </p>
                        <p className="mt-1 text-black">
                          {selectedReport.location || "N/A"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                          Anonymous
                        </p>
                        <p className="mt-1 text-black">
                          {selectedReport.is_anonymous ? "Yes" : "No"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                          Date Submitted
                        </p>
                        <p className="mt-1 text-black">
                          {formatDate(selectedReport.created_at)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                          Last Updated
                        </p>
                        <p className="mt-1 text-black">
                          {formatDate(selectedReport.updated_at)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 border-t border-gray-200 pt-4">
                      <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                        Description
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                        {selectedReport.description}
                      </p>
                    </div>

                    <div className="mt-5 border-t border-gray-200 pt-4">
                      <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                        Current Status
                      </p>

                      <div className="mt-2 border-l-4 border-[#b00000] bg-gray-50 p-4">
                        <p className="text-sm text-gray-700">
                          Your report is currently marked as{" "}
                          <span className="font-black text-black">
                            {selectedReport.status.replace("_", " ")}
                          </span>
                          .
                        </p>
                      </div>
                    </div>

                    {selectedAttachments.length > 0 && (
                      <div className="mt-5 border-t border-gray-200 pt-4">
                        <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                          Photo Evidence
                        </p>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {selectedAttachments.map((file) => (
                            <a
                              key={file.id}
                              href={file.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="block border border-gray-200 bg-white p-2 hover:border-[#b00000]"
                            >
                              {file.file_type?.startsWith("image/") ? (
                                <img
                                  src={file.file_url}
                                  alt={
                                    file.file_name || "Report photo evidence"
                                  }
                                  className="h-40 w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-40 items-center justify-center bg-gray-100 text-sm font-semibold text-gray-600">
                                  View Attachment
                                </div>
                              )}

                              <p className="mt-2 truncate text-xs text-gray-600">
                                {file.file_name || "Attachment"}
                              </p>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>

                  <section className="border border-gray-200 bg-white p-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
                          Comments Preview
                        </p>

                        <h3 className="mt-1 text-xl font-black text-black">
                          Recent Comments / Replies
                        </h3>
                      </div>

                      <Link
                        href={`/student/reports/${selectedReport.id}`}
                        className="btn btn-sm hcdc-btn-outline"
                      >
                        Open Full Page
                      </Link>
                    </div>

                    {selectedComments.length === 0 ? (
                      <div className="border border-dashed border-gray-300 p-4 text-center">
                        <p className="font-bold text-black">No comments yet</p>
                        <p className="mt-1 text-sm hcdc-muted">
                          Replies from the assigned department will appear here.
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                        {selectedComments.map((comment) => {
                          const isMine = comment.user_id === currentUserId;

                          return (
                            <div
                              key={comment.id}
                              className={`border p-4 ${
                                isMine
                                  ? "border-[#b00000]/20 bg-red-50"
                                  : "border-gray-200 bg-white"
                              }`}
                            >
                              <div className="flex flex-col justify-between gap-1 md:flex-row md:items-center">
                                <p className="font-bold text-black">
                                  {getCommentAuthor(
                                    comment,
                                    currentUserId,
                                    selectedCommentProfiles,
                                  )}
                                </p>

                                <p className="text-xs text-gray-500">
                                  {formatDate(comment.created_at)}
                                </p>
                              </div>

                              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                                {comment.comment}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <form
                      onSubmit={handleAddComment}
                      className="mt-4 space-y-3"
                    >
                      <textarea
                        className="textarea textarea-bordered min-h-24 w-full"
                        placeholder="Write a reply to the department..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                      />

                      <button
                        className="btn hcdc-btn-primary"
                        disabled={sendingComment || !newComment.trim()}
                      >
                        {sendingComment ? "Sending..." : "Send Reply"}
                      </button>
                    </form>
                  </section>

                  <section className="border border-gray-200 bg-white p-5">
                    <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
                      Timeline Preview
                    </p>

                    <h3 className="mt-1 text-xl font-black text-black">
                      Recent Activity
                    </h3>

                    <ReportTimeline
                      reportId={selectedReport.id}
                      refreshKey={timelineRefreshKey}
                      compact
                      limit={3}
                    />
                  </section>
                </div>
              ) : null}
            </div>

            {selectedReport && (
              <div className="flex justify-end gap-2 border-t border-gray-200 bg-white px-5 py-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn hcdc-btn-outline"
                >
                  Close
                </button>

                <Link
                  href={`/student/reports/${selectedReport.id}`}
                  className="btn hcdc-btn-primary"
                >
                  Open Full Report Page
                </Link>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
