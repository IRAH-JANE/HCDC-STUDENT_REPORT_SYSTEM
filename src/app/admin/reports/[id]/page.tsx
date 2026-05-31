/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { StatusBadge, UrgencyBadge } from "@/components/ReportBadges";
import ReportTimeline from "@/components/ReportTimeline";

type Report = {
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

type StudentProfile = {
  full_name: string | null;
  id_number: string | null;
  email: string | null;
  course: string | null;
  academic_department: string | null;
  gender: string | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
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

function formatDate(value: string | null) {
  if (!value) return "Not updated yet";
  return new Date(value).toLocaleString();
}

function getCommentAuthor(
  comment: Comment,
  report: Report | null,
  studentName: string,
  profiles: Profile[],
) {
  if (report && comment.user_id === report.student_id) {
    return report.is_anonymous ? "Anonymous Student" : studentName || "Student";
  }

  const profile = profiles.find((item) => item.id === comment.user_id);

  if (!profile) return "Unknown User";

  if (profile.role === "department_staff") {
    return profile.full_name || profile.email || "Department Staff";
  }

  if (profile.role === "admin") {
    return `${profile.full_name || profile.email || "Admin"} - Admin`;
  }

  return profile.full_name || profile.email || "Student";
}

export default function AdminReportDetailsPage() {
  const params = useParams();
  const reportId = params.id as string;

  const [report, setReport] = useState<Report | null>(null);
  const [departmentName, setDepartmentName] = useState("N/A");
  const [studentName, setStudentName] = useState("N/A");
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(
    null,
  );
  const [comments, setComments] = useState<Comment[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchReportDetails() {
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
        setError("Only admins can access this page.");
        setLoading(false);
        return;
      }

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
        setError("Report not found.");
        setLoading(false);
        return;
      }

      const fixedReport = reportData as Report;
      setReport(fixedReport);

      const [
        departmentResult,
        commentsResult,
        attachmentsResult,
        profilesResult,
      ] = await Promise.all([
        supabase
          .from("departments")
          .select("name")
          .eq("id", fixedReport.department_id)
          .single(),

        supabase
          .from("report_comments")
          .select("id, report_id, user_id, comment, created_at")
          .eq("report_id", fixedReport.id)
          .order("created_at", { ascending: true }),

        supabase
          .from("report_attachments")
          .select("id, file_url, file_name, file_type")
          .eq("report_id", fixedReport.id),

        supabase.from("profiles").select("id, full_name, email, role"),
      ]);

      setDepartmentName(departmentResult.data?.name || "N/A");

      if (!fixedReport.is_anonymous) {
        const { data: studentData } = await supabase
          .from("profiles")
          .select(
            "full_name, id_number, email, course, academic_department, gender",
          )
          .eq("id", fixedReport.student_id)
          .single();

        const fixedStudentProfile = studentData as StudentProfile | null;

        setStudentProfile(fixedStudentProfile);
        setStudentName(fixedStudentProfile?.full_name || "Student");
      } else {
        setStudentProfile(null);
        setStudentName("Anonymous Student");
      }

      if (!commentsResult.error) {
        setComments((commentsResult.data as Comment[]) || []);
      }

      if (!attachmentsResult.error) {
        setAttachments((attachmentsResult.data as Attachment[]) || []);
      }

      if (!profilesResult.error) {
        setProfiles((profilesResult.data as Profile[]) || []);
      }

      setLoading(false);
    }

    fetchReportDetails();
  }, [reportId]);

  if (loading) {
    return (
      <>
        <div className="mb-4">
          <Link
            href="/admin/reports"
            className="text-sm font-bold text-[#b00000] hover:underline"
          >
            ← Back to All Reports
          </Link>

          <h1 className="hcdc-page-title mt-3 text-2xl md:text-3xl">
            Report Details
          </h1>

          <p className="mt-1 text-sm hcdc-muted">Loading report details...</p>
        </div>

        <div className="hcdc-card p-6">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      </>
    );
  }

  if (error && !report) {
    return (
      <>
        <div className="mb-4">
          <Link
            href="/admin/reports"
            className="text-sm font-bold text-[#b00000] hover:underline"
          >
            ← Back to All Reports
          </Link>

          <h1 className="hcdc-page-title mt-3 text-2xl md:text-3xl">
            Report Details
          </h1>
        </div>

        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      </>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <>
      <div className="mb-4">
        <Link
          href="/admin/reports"
          className="text-sm font-bold text-[#b00000] hover:underline"
        >
          ← Back to All Reports
        </Link>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-4">
        <section className="hcdc-card p-5 md:p-6">
          <div className="flex flex-col justify-between gap-4 border-b border-gray-200 pb-5 md:flex-row md:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
                Admin Report Review
              </p>

              <h1 className="hcdc-page-title mt-2 text-2xl md:text-3xl">
                {report.title}
              </h1>

              <p className="mt-2 text-sm hcdc-muted">
                Sent to:{" "}
                <span className="font-bold text-gray-800">
                  {departmentName}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <UrgencyBadge urgency={report.urgency} />
              <StatusBadge status={report.status} />
            </div>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                Student Information
              </p>

              {report.is_anonymous ? (
                <p className="mt-2 font-bold text-black">Anonymous Student</p>
              ) : (
                <div className="mt-2 space-y-1 text-sm text-gray-700">
                  <p className="text-base font-black text-black">
                    {studentProfile?.full_name || studentName || "Student"}
                  </p>

                  <p>
                    Student ID:{" "}
                    <span className="font-semibold">
                      {studentProfile?.id_number || "N/A"}
                    </span>
                  </p>

                  <p>
                    Course:{" "}
                    <span className="font-semibold">
                      {studentProfile?.course || "N/A"}
                    </span>
                  </p>

                  <p>
                    HCDC Email:{" "}
                    <span className="font-semibold">
                      {studentProfile?.email || "N/A"}
                    </span>
                  </p>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                Department / Office
              </p>
              <p className="mt-2 font-bold text-black">{departmentName}</p>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                Category
              </p>
              <p className="mt-1 text-black">{report.category || "N/A"}</p>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                Location
              </p>
              <p className="mt-1 text-black">{report.location || "N/A"}</p>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                Date Submitted
              </p>
              <p className="mt-1 text-black">{formatDate(report.created_at)}</p>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                Last Updated
              </p>
              <p className="mt-1 text-black">{formatDate(report.updated_at)}</p>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                Anonymous
              </p>
              <p className="mt-1 text-black">
                {report.is_anonymous ? "Yes" : "No"}
              </p>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4">
            <p className="text-xs font-black uppercase tracking-wide text-gray-500">
              Description
            </p>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
              {report.description}
            </p>
          </div>

          {attachments.length > 0 && (
            <div className="mt-6 border-t border-gray-200 pt-4">
              <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                Photo Evidence
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {attachments.map((file) => (
                  <a
                    key={file.id}
                    href={file.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block border border-gray-200 bg-white p-2 transition hover:border-[#b00000]"
                  >
                    {file.file_type?.startsWith("image/") ? (
                      <img
                        src={file.file_url}
                        alt={file.file_name || "Report photo evidence"}
                        className="h-48 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-48 items-center justify-center bg-gray-100 text-sm font-semibold text-gray-600">
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

          <div className="mt-6 border-l-4 border-[#b00000] bg-gray-50 p-4">
            <p className="text-sm text-gray-700">
              This report is currently marked as{" "}
              <strong>{report.status.replace("_", " ")}</strong>.
            </p>
          </div>
        </section>

        <ReportTimeline reportId={report.id} />

        <section className="hcdc-card p-5 md:p-6">
          <div className="border-b border-gray-200 pb-4">
            <h2 className="text-xl font-black text-black">
              Comments / Replies
            </h2>
            <p className="mt-1 text-sm hcdc-muted">
              Full conversation history between the student and assigned
              department.
            </p>
          </div>

          {comments.length === 0 ? (
            <div className="mt-5 border border-dashed border-gray-300 p-6 text-center">
              <p className="font-bold text-black">No comments yet</p>
              <p className="mt-1 text-sm hcdc-muted">
                Replies from students or department staff will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {comments.map((comment) => {
                const isStudent = comment.user_id === report.student_id;

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
                            report,
                            studentName,
                            profiles,
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
      </div>
    </>
  );
}
