/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { notifyReportStudent } from "@/lib/notifications";
import { createActivityLog } from "@/lib/activityLogs";
import { StatusBadge, UrgencyBadge } from "@/components/ReportBadges";
import ReportTimeline from "@/components/ReportTimeline";

type Report = {
  id: string;
  title: string;
  category: string | null;
  location: string | null;
  urgency: string;
  status: string;
  is_anonymous: boolean;
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
  type: string | null;
};

type StudentProfile = {
  full_name: string | null;
  id_number: string | null;
  email: string | null;
  course: string | null;
  academic_department: string | null;
  gender: string | null;
};

type Comment = {
  id: string;
  report_id: string;
  user_id: string;
  comment: string;
  created_at: string;
};

type Attachment = {
  id: string;
  file_url: string;
  file_name: string | null;
  file_type: string | null;
};

type ProfileRecord = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
};

type TransferResult = {
  report_id: string;
  report_title: string;
  old_department_id: string;
  old_department_name: string;
  new_department_id: string;
  new_department_name: string;
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
  selectedReport: ReportDetails | null,
  studentName: string,
  profiles: Record<string, ProfileRecord>,
) {
  if (comment.user_id === currentUserId) return "You";

  if (selectedReport && comment.user_id === selectedReport.student_id) {
    return selectedReport.is_anonymous
      ? "Anonymous Student"
      : studentName || "Student";
  }

  const profile = profiles[comment.user_id];

  if (!profile) return "Unknown User";

  if (profile.role === "department_staff") {
    return profile.full_name || profile.email || "Department Staff";
  }

  if (profile.role === "admin") {
    return `${profile.full_name || profile.email || "Admin"} - Admin`;
  }

  return profile.full_name || profile.email || "Student";
}

export default function DepartmentReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentName, setDepartmentName] = useState("Your Department");
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentDepartmentId, setCurrentDepartmentId] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");

  const [selectedReport, setSelectedReport] = useState<ReportDetails | null>(
    null,
  );

  const [selectedStudentName, setSelectedStudentName] = useState("Student");
  const [selectedStudentProfile, setSelectedStudentProfile] =
    useState<StudentProfile | null>(null);

  const [selectedAttachments, setSelectedAttachments] = useState<Attachment[]>(
    [],
  );

  const [selectedComments, setSelectedComments] = useState<Comment[]>([]);
  const [selectedCommentProfiles, setSelectedCommentProfiles] = useState<
    Record<string, ProfileRecord>
  >({});

  const [modalStatus, setModalStatus] = useState("");
  const [newComment, setNewComment] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);

  const [transferDepartmentId, setTransferDepartmentId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [transferring, setTransferring] = useState(false);

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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, department_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      setError("Profile not found.");
      setLoading(false);
      return;
    }

    if (profile.role !== "department_staff") {
      setError("Only department staff can access this page.");
      setLoading(false);
      return;
    }

    if (!profile.department_id) {
      setError("Your account is not assigned to a department yet.");
      setLoading(false);
      return;
    }

    setCurrentDepartmentId(profile.department_id);

    const [departmentResult, departmentsResult, reportsResult] =
      await Promise.all([
        supabase
          .from("departments")
          .select("name")
          .eq("id", profile.department_id)
          .single(),

        supabase
          .from("departments")
          .select("id, name, type")
          .eq("is_active", true)
          .order("name", { ascending: true }),

        supabase
          .from("reports")
          .select(
            `
            id,
            title,
            category,
            location,
            urgency,
            status,
            is_anonymous,
            created_at
          `,
          )
          .eq("department_id", profile.department_id)
          .order("created_at", { ascending: false }),
      ]);

    setDepartmentName(departmentResult.data?.name || "Your Department");

    if (!departmentsResult.error) {
      setDepartments((departmentsResult.data as Department[]) || []);
    }

    if (reportsResult.error) {
      setError(reportsResult.error.message);
    } else {
      setReports((reportsResult.data as Report[]) || []);
    }

    setLoading(false);
  }

  async function fetchModalComments(reportId: string) {
    const { data: commentsData, error: commentsError } = await supabase
      .from("report_comments")
      .select("id, report_id, user_id, comment, created_at")
      .eq("report_id", reportId)
      .order("created_at", { ascending: true });

    if (commentsError) return;

    const fixedComments = (commentsData as Comment[]) || [];
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

  const transferDepartmentOptions = useMemo(() => {
    return departments.filter((dept) => dept.id !== currentDepartmentId);
  }, [departments, currentDepartmentId]);

  const categories = useMemo(() => {
    const unique = new Set<string>();

    reports.forEach((report) => {
      if (report.category) unique.add(report.category);
    });

    return Array.from(unique).sort();
  }, [reports]);

  const filteredReports = useMemo(() => {
    const searchValue = search.toLowerCase().trim();

    return reports.filter((report) => {
      const matchesSearch =
        report.title.toLowerCase().includes(searchValue) ||
        (report.category || "").toLowerCase().includes(searchValue) ||
        (report.location || "").toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "all" || report.status === statusFilter;

      const matchesUrgency =
        urgencyFilter === "all" || report.urgency === urgencyFilter;

      const matchesCategory =
        categoryFilter === "all" || report.category === categoryFilter;

      return (
        matchesSearch && matchesStatus && matchesUrgency && matchesCategory
      );
    });
  }, [reports, search, statusFilter, urgencyFilter, categoryFilter]);

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setUrgencyFilter("all");
    setCategoryFilter("all");
  }

  function closeModal() {
    setModalOpen(false);
    setModalLoading(false);
    setModalError("");
    setModalSuccess("");
    setSelectedReport(null);
    setSelectedStudentName("Student");
    setSelectedStudentProfile(null);
    setSelectedAttachments([]);
    setSelectedComments([]);
    setSelectedCommentProfiles({});
    setModalStatus("");
    setNewComment("");
    setTransferDepartmentId("");
    setTransferReason("");
    setUpdatingStatus(false);
    setSendingComment(false);
    setTransferring(false);
  }

  async function openReportModal(reportId: string) {
    setModalOpen(true);
    setModalLoading(true);
    setModalError("");
    setModalSuccess("");
    setSelectedReport(null);
    setSelectedStudentName("Student");
    setSelectedStudentProfile(null);
    setSelectedAttachments([]);
    setSelectedComments([]);
    setSelectedCommentProfiles({});
    setNewComment("");
    setTransferDepartmentId("");
    setTransferReason("");

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
      .eq("department_id", currentDepartmentId)
      .single();

    if (reportError || !reportData) {
      setModalError("Report not found or you do not have access.");
      setModalLoading(false);
      return;
    }

    const fixedReport = reportData as ReportDetails;
    setSelectedReport(fixedReport);
    setModalStatus(fixedReport.status);

    if (!fixedReport.is_anonymous) {
      const { data: studentProfileData } = await supabase.rpc(
        "get_report_student_profile",
        {
          p_report_id: fixedReport.id,
        },
      );

      const firstStudentProfile = Array.isArray(studentProfileData)
        ? (studentProfileData[0] as StudentProfile | undefined)
        : null;

      if (firstStudentProfile) {
        setSelectedStudentProfile(firstStudentProfile);
        setSelectedStudentName(firstStudentProfile.full_name || "Student");
      }
    } else {
      setSelectedStudentName("Anonymous Student");
      setSelectedStudentProfile(null);
    }

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

  async function handleUpdateStatus(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedReport) return;

    setUpdatingStatus(true);
    setModalError("");
    setModalSuccess("");

    const previousStatus = selectedReport.status;
    const updatedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("reports")
      .update({
        status: modalStatus,
        updated_at: updatedAt,
      })
      .eq("id", selectedReport.id)
      .eq("department_id", currentDepartmentId);

    if (updateError) {
      setModalError(updateError.message);
      setUpdatingStatus(false);
      return;
    }

    setSelectedReport({
      ...selectedReport,
      status: modalStatus,
      updated_at: updatedAt,
    });

    setReports((currentReports) =>
      currentReports.map((report) =>
        report.id === selectedReport.id
          ? {
              ...report,
              status: modalStatus,
            }
          : report,
      ),
    );

    if (previousStatus !== modalStatus) {
      await createActivityLog({
        reportId: selectedReport.id,
        action: "status_changed",
        description: `Department staff changed status from ${previousStatus.replace(
          "_",
          " ",
        )} to ${modalStatus.replace("_", " ")}.`,
      });

      await notifyReportStudent(
        selectedReport.id,
        `Your report "${selectedReport.title}" was updated to ${modalStatus.replace(
          "_",
          " ",
        )}.`,
      );

      setTimelineRefreshKey((value) => value + 1);
    }

    setModalSuccess("Report status updated successfully.");
    setUpdatingStatus(false);
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
      action: "department_comment",
      description: "Department staff replied to the report.",
    });

    await notifyReportStudent(
      selectedReport.id,
      `Department staff replied to your report: ${selectedReport.title}`,
    );

    setNewComment("");
    await fetchModalComments(selectedReport.id);
    setTimelineRefreshKey((value) => value + 1);
    setModalSuccess("Reply sent successfully.");
    setSendingComment(false);
  }

  async function handleTransferReport(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedReport) return;

    setTransferring(true);
    setModalError("");
    setModalSuccess("");

    const cleanedReason = transferReason.trim();

    if (!transferDepartmentId) {
      setModalError("Please choose the receiving department.");
      setTransferring(false);
      return;
    }

    if (!cleanedReason) {
      setModalError("Please enter the reason for transferring this report.");
      setTransferring(false);
      return;
    }

    const { data, error: transferError } = await supabase.rpc(
      "transfer_report_department",
      {
        p_report_id: selectedReport.id,
        p_new_department_id: transferDepartmentId,
        p_reason: cleanedReason,
      },
    );

    if (transferError) {
      setModalError(transferError.message);
      setTransferring(false);
      return;
    }

    const transferData = data as TransferResult;

    setReports((currentReports) =>
      currentReports.filter((report) => report.id !== selectedReport.id),
    );

    setModalSuccess(
      `Report transferred to ${transferData.new_department_name}. It will now appear in their department reports.`,
    );

    setTimelineRefreshKey((value) => value + 1);
    setTransferring(false);

    setTimeout(() => {
      closeModal();
    }, 1200);
  }

  return (
    <>
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="hcdc-page-title text-3xl md:text-4xl">
            Department Reports
          </h1>
          <p className="mt-1 text-sm hcdc-muted">
            Reports assigned to {departmentName}.
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      <section className="mb-4 hcdc-card p-5">
        <div className="border-b border-gray-200 pb-4">
          <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
            Filters
          </p>

          <h2 className="mt-2 text-2xl font-black text-black">
            Find Assigned Reports
          </h2>

          <p className="mt-1 text-sm hcdc-muted">
            Search by title, category, location, urgency, or status.
          </p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="Search title, category, location..."
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
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
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
        <div className="mb-4">
          <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
            Assigned Report List
          </p>

          <h2 className="mt-2 text-2xl font-black text-black">
            Department Reports
          </h2>

          <p className="mt-1 text-sm hcdc-muted">
            Showing {filteredReports.length} of {reports.length} reports.
          </p>
        </div>

        {loading ? (
          <p className="text-sm hcdc-muted">Loading reports...</p>
        ) : filteredReports.length === 0 ? (
          <div className="border border-dashed border-gray-300 p-6 text-center">
            <p className="font-bold text-black">No reports found</p>
            <p className="mt-1 text-sm hcdc-muted">
              Try changing your filters or search keyword.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="hcdc-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Location</th>
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
                    <td>{report.category || "N/A"}</td>
                    <td>{report.location || "N/A"}</td>
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

          <section className="relative z-[81] flex max-h-[88vh] w-full max-w-6xl flex-col border border-gray-300 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
                  Department Report
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
                    <div className="border-b border-gray-200 pb-4">
                      <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
                        Report Information
                      </p>
                      <h3 className="mt-1 text-xl font-black text-black">
                        Full Report Details
                      </h3>
                    </div>

                    <div className="mt-5 grid gap-5 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                          Student Information
                        </p>

                        {selectedReport.is_anonymous ? (
                          <p className="mt-2 font-bold text-black">
                            Anonymous Student
                          </p>
                        ) : (
                          <div className="mt-2 space-y-1 text-sm text-gray-700">
                            <p className="text-base font-black text-black">
                              {selectedStudentProfile?.full_name ||
                                selectedStudentName ||
                                "Student"}
                            </p>

                            <p>
                              Student ID:{" "}
                              <span className="font-semibold">
                                {selectedStudentProfile?.id_number || "N/A"}
                              </span>
                            </p>

                            <p>
                              Course:{" "}
                              <span className="font-semibold">
                                {selectedStudentProfile?.course || "N/A"}
                              </span>
                            </p>

                            <p>
                              HCDC Email:{" "}
                              <span className="font-semibold">
                                {selectedStudentProfile?.email || "N/A"}
                              </span>
                            </p>
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                          Current Department
                        </p>
                        <p className="mt-2 font-bold text-black">
                          {departmentName}
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

                    {selectedAttachments.length > 0 && (
                      <div className="mt-5 border-t border-gray-200 pt-4">
                        <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                          Photo Evidence
                        </p>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                    <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
                      Transfer Report
                    </p>

                    <h3 className="mt-1 text-xl font-black text-black">
                      Send to Another Department
                    </h3>

                    <p className="mt-1 text-sm hcdc-muted">
                      Use this if another department should handle this report.
                    </p>

                    <form
                      onSubmit={handleTransferReport}
                      className="mt-4 space-y-3"
                    >
                      <select
                        className="select select-bordered w-full"
                        value={transferDepartmentId}
                        onChange={(e) =>
                          setTransferDepartmentId(e.target.value)
                        }
                      >
                        <option value="">Choose receiving department</option>
                        {transferDepartmentOptions.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>

                      <textarea
                        className="textarea textarea-bordered min-h-20 w-full"
                        placeholder="Reason for transfer..."
                        value={transferReason}
                        onChange={(e) => setTransferReason(e.target.value)}
                      />

                      <button
                        className="btn hcdc-btn-secondary"
                        disabled={transferring}
                      >
                        {transferring ? "Transferring..." : "Transfer Report"}
                      </button>
                    </form>
                  </section>

                  <section className="border border-gray-200 bg-white p-5">
                    <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
                      Status Update
                    </p>

                    <h3 className="mt-1 text-xl font-black text-black">
                      Mark Report Progress
                    </h3>

                    <form
                      onSubmit={handleUpdateStatus}
                      className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]"
                    >
                      <select
                        className="select select-bordered w-full"
                        value={modalStatus}
                        onChange={(e) => setModalStatus(e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="rejected">Rejected</option>
                      </select>

                      <button
                        className="btn hcdc-btn-primary"
                        disabled={updatingStatus}
                      >
                        {updatingStatus ? "Updating..." : "Update Status"}
                      </button>
                    </form>
                  </section>

                  <section className="border border-gray-200 bg-white p-5">
                    <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
                          Comments Preview
                        </p>
                        <h3 className="mt-1 text-xl font-black text-black">
                          Recent Comments / Replies
                        </h3>
                        <p className="mt-1 text-sm hcdc-muted">
                          Conversation between the student and the assigned
                          department.
                        </p>
                      </div>

                      <Link
                        href={`/department/reports/${selectedReport.id}`}
                        className="btn btn-sm hcdc-btn-outline"
                      >
                        Open Full Page
                      </Link>
                    </div>

                    {selectedComments.length === 0 ? (
                      <div className="border border-dashed border-gray-300 p-4 text-center">
                        <p className="font-bold text-black">No comments yet</p>
                        <p className="mt-1 text-sm hcdc-muted">
                          Replies between the student and department will appear
                          here.
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
                        {selectedComments.map((comment) => {
                          const isMine = comment.user_id === currentUserId;

                          return (
                            <div
                              key={comment.id}
                              className={`flex ${
                                isMine ? "justify-end" : "justify-start"
                              }`}
                            >
                              <div
                                className={`w-full max-w-xl border p-4 ${
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
                                      selectedReport,
                                      selectedStudentName,
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
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <form
                      onSubmit={handleAddComment}
                      className="mt-5 space-y-3"
                    >
                      <textarea
                        className="textarea textarea-bordered min-h-24 w-full bg-white text-black"
                        placeholder="Write a reply to the student..."
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
                      limit={5}
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
                  href={`/department/reports/${selectedReport.id}`}
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
