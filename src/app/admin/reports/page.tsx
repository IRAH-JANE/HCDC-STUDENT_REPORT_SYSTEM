/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
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

type StudentProfile = {
  full_name: string | null;
  id_number: string | null;
  email: string | null;
  course: string | null;
  academic_department: string | null;
  gender: string | null;
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
  selectedReport: ReportDetails | null,
  studentName: string,
  profiles: Record<string, ProfileRecord>,
) {
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

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const [selectedReport, setSelectedReport] = useState<ReportDetails | null>(
    null,
  );
  const [selectedDepartmentName, setSelectedDepartmentName] = useState("N/A");
  const [selectedStudentName, setSelectedStudentName] = useState("N/A");
  const [selectedStudentProfile, setSelectedStudentProfile] =
    useState<StudentProfile | null>(null);

  const [selectedAttachments, setSelectedAttachments] = useState<Attachment[]>(
    [],
  );
  const [selectedComments, setSelectedComments] = useState<Comment[]>([]);
  const [selectedCommentProfiles, setSelectedCommentProfiles] = useState<
    Record<string, ProfileRecord>
  >({});

  async function fetchData() {
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      setError("Only admins can access this page.");
      setLoading(false);
      return;
    }

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

  useEffect(() => {
    fetchData();
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

  const categories = useMemo(() => {
    const unique = new Set<string>();

    reports.forEach((report) => {
      if (report.category) {
        unique.add(report.category);
      }
    });

    return Array.from(unique).sort();
  }, [reports]);

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

      const matchesDepartment =
        departmentFilter === "all" || report.department_id === departmentFilter;

      const matchesStatus =
        statusFilter === "all" || report.status === statusFilter;

      const matchesUrgency =
        urgencyFilter === "all" || report.urgency === urgencyFilter;

      const matchesCategory =
        categoryFilter === "all" || report.category === categoryFilter;

      return (
        matchesSearch &&
        matchesDepartment &&
        matchesStatus &&
        matchesUrgency &&
        matchesCategory
      );
    });
  }, [
    reports,
    departments,
    search,
    departmentFilter,
    statusFilter,
    urgencyFilter,
    categoryFilter,
  ]);

  function clearFilters() {
    setSearch("");
    setDepartmentFilter("all");
    setStatusFilter("all");
    setUrgencyFilter("all");
    setCategoryFilter("all");
  }

  function closeModal() {
    setModalOpen(false);
    setModalLoading(false);
    setModalError("");
    setSelectedReport(null);
    setSelectedDepartmentName("N/A");
    setSelectedStudentName("N/A");
    setSelectedStudentProfile(null);
    setSelectedAttachments([]);
    setSelectedComments([]);
    setSelectedCommentProfiles({});
  }

  async function openReportModal(reportId: string) {
    setModalOpen(true);
    setModalLoading(true);
    setModalError("");
    setSelectedReport(null);
    setSelectedDepartmentName("N/A");
    setSelectedStudentName("N/A");
    setSelectedStudentProfile(null);
    setSelectedAttachments([]);
    setSelectedComments([]);
    setSelectedCommentProfiles({});

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
      .single();

    if (reportError || !reportData) {
      setModalError("Report not found.");
      setModalLoading(false);
      return;
    }

    const fixedReport = reportData as ReportDetails;
    setSelectedReport(fixedReport);

    const [departmentResult, attachmentsResult, commentsResult] =
      await Promise.all([
        supabase
          .from("departments")
          .select("name")
          .eq("id", fixedReport.department_id)
          .single(),

        supabase
          .from("report_attachments")
          .select("id, file_url, file_name, file_type")
          .eq("report_id", fixedReport.id),

        supabase
          .from("report_comments")
          .select("id, report_id, user_id, comment, created_at")
          .eq("report_id", fixedReport.id)
          .order("created_at", { ascending: true }),
      ]);

    setSelectedDepartmentName(departmentResult.data?.name || "N/A");

    if (!fixedReport.is_anonymous) {
      const { data: studentData } = await supabase
        .from("profiles")
        .select(
          "full_name, id_number, email, course, academic_department, gender",
        )
        .eq("id", fixedReport.student_id)
        .single();

      const fixedStudentProfile = studentData as StudentProfile | null;

      setSelectedStudentProfile(fixedStudentProfile);
      setSelectedStudentName(fixedStudentProfile?.full_name || "Student");
    } else {
      setSelectedStudentName("Anonymous Student");
      setSelectedStudentProfile(null);
    }

    if (!attachmentsResult.error) {
      setSelectedAttachments((attachmentsResult.data as Attachment[]) || []);
    }

    const fixedComments = commentsResult.error
      ? []
      : (commentsResult.data as Comment[]) || [];

    setSelectedComments(fixedComments);

    const userIds = Array.from(
      new Set(fixedComments.map((comment) => comment.user_id)),
    );

    if (userIds.length > 0) {
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

    setModalLoading(false);
  }

  return (
    <>
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="hcdc-page-title text-3xl md:text-4xl">All Reports</h1>
          <p className="mt-1 text-sm hcdc-muted">
            Search, filter, and review all submitted student concern reports.
          </p>
        </div>

        <button onClick={fetchData} className="btn hcdc-btn-outline">
          Refresh Reports
        </button>
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

          <h2 className="mt-2 text-2xl font-black text-black">Find Reports</h2>

          <p className="mt-1 text-sm hcdc-muted">
            Filter by department, status, urgency, category, or title.
          </p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

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

      <section id="report-list" className="hcdc-card p-5">
        <div className="mb-4">
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

          <section className="relative z-[81] flex max-h-[88vh] w-full max-w-6xl flex-col border border-gray-300 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
                  Admin Report Review
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
                          Department / Office
                        </p>
                        <p className="mt-2 font-bold text-black">
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

                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                          Anonymous
                        </p>
                        <p className="mt-1 text-black">
                          {selectedReport.is_anonymous ? "Yes" : "No"}
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
                    <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
                          Comments Preview
                        </p>

                        <h3 className="mt-1 text-xl font-black text-black">
                          Recent Comments / Replies
                        </h3>

                        <p className="mt-1 text-sm hcdc-muted">
                          Conversation between the student and assigned
                          department.
                        </p>
                      </div>

                      <Link
                        href={`/admin/reports/${selectedReport.id}`}
                        className="btn btn-sm hcdc-btn-outline"
                      >
                        Open Full Page
                      </Link>
                    </div>

                    {selectedComments.length === 0 ? (
                      <div className="border border-dashed border-gray-300 p-4 text-center">
                        <p className="font-bold text-black">No comments yet</p>
                        <p className="mt-1 text-sm hcdc-muted">
                          Student and department replies will appear here.
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
                        {selectedComments.map((comment) => {
                          const isStudent =
                            selectedReport &&
                            comment.user_id === selectedReport.student_id;

                          return (
                            <div
                              key={comment.id}
                              className={`flex ${
                                isStudent ? "justify-start" : "justify-end"
                              }`}
                            >
                              <div
                                className={`w-full max-w-xl border p-4 ${
                                  isStudent
                                    ? "border-gray-200 bg-white"
                                    : "border-[#b00000]/20 bg-red-50"
                                }`}
                              >
                                <div className="flex flex-col justify-between gap-1 md:flex-row md:items-center">
                                  <p className="font-bold text-black">
                                    {getCommentAuthor(
                                      comment,
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
                  href={`/admin/reports/${selectedReport.id}`}
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
