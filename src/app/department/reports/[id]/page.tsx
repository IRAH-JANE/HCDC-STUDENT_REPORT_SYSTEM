/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { notifyReportStudent } from "@/lib/notifications";
import { createActivityLog } from "@/lib/activityLogs";
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

type Comment = {
  id: string;
  report_id: string;
  user_id: string;
  comment: string;
  created_at: string;
};

type Department = {
  id: string;
  name: string;
  type: string | null;
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

type StudentProfile = {
  full_name: string | null;
  id_number: string | null;
  email: string | null;
  course: string | null;
  academic_department: string | null;
  gender: string | null;
};

type TransferRecord = {
  id: string;
  report_id: string;
  from_department_id: string;
  to_department_id: string;
  transferred_by: string;
  reason: string;
  created_at: string;
};

type TransferResult = {
  report_id: string;
  report_title: string;
  old_department_id: string;
  old_department_name: string;
  new_department_id: string;
  new_department_name: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function getCommentAuthor(
  comment: Comment,
  currentUserId: string,
  report: Report | null,
  studentName: string,
  profiles: Record<string, ProfileRecord>,
) {
  if (comment.user_id === currentUserId) return "You";

  if (report && comment.user_id === report.student_id) {
    return report.is_anonymous ? "Anonymous Student" : studentName || "Student";
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

export default function DepartmentReportDetailsPage() {
  const params = useParams();
  const reportId = String(params.id);

  const [currentUserId, setCurrentUserId] = useState("");
  const [currentDepartmentId, setCurrentDepartmentId] = useState("");

  const [report, setReport] = useState<Report | null>(null);
  const [reportDepartmentName, setReportDepartmentName] = useState("");
  const [studentName, setStudentName] = useState("Student");
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(
    null,
  );

  const [departments, setDepartments] = useState<Department[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentProfiles, setCommentProfiles] = useState<
    Record<string, ProfileRecord>
  >({});
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);

  const [status, setStatus] = useState("");
  const [newComment, setNewComment] = useState("");

  const [canManageReport, setCanManageReport] = useState(false);

  const [transferDepartmentId, setTransferDepartmentId] = useState("");
  const [transferReason, setTransferReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [timelineRefreshKey, setTimelineRefreshKey] = useState(0);

  function getDepartmentName(id: string | null | undefined) {
    if (!id) return "Unknown Department";

    return (
      departments.find((department) => department.id === id)?.name ||
      "Unknown Department"
    );
  }

  const transferDepartmentOptions = useMemo(() => {
    return departments.filter(
      (department) => department.id !== currentDepartmentId,
    );
  }, [departments, currentDepartmentId]);

  const latestTransferFromThisDepartment = useMemo(() => {
    return transfers.find(
      (transfer) => transfer.from_department_id === currentDepartmentId,
    );
  }, [transfers, currentDepartmentId]);

  async function fetchComments(targetReportId: string) {
    const { data, error } = await supabase
      .from("report_comments")
      .select("id, report_id, user_id, comment, created_at")
      .eq("report_id", targetReportId)
      .order("created_at", { ascending: true });

    if (error) return;

    const fixedComments = (data as Comment[]) || [];
    setComments(fixedComments);

    const userIds = Array.from(
      new Set(fixedComments.map((comment) => comment.user_id)),
    );

    if (userIds.length === 0) {
      setCommentProfiles({});
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

    setCommentProfiles(profileMap);
  }

  async function loadReportDetails() {
    setLoading(true);
    setError("");
    setSuccess("");
    setStudentProfile(null);

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

    const { data: departmentsData } = await supabase
      .from("departments")
      .select("id, name, type")
      .eq("is_active", true)
      .order("name", { ascending: true });

    const fixedDepartments = (departmentsData as Department[]) || [];
    setDepartments(fixedDepartments);

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
      setError("Report not found, or you do not have permission to view it.");
      setLoading(false);
      return;
    }

    const fixedReport = reportData as Report;

    const { data: transferData } = await supabase
      .from("report_transfers")
      .select(
        "id, report_id, from_department_id, to_department_id, transferred_by, reason, created_at",
      )
      .eq("report_id", reportId)
      .order("created_at", { ascending: false });

    const fixedTransfers = (transferData as TransferRecord[]) || [];
    setTransfers(fixedTransfers);

    const isCurrentDepartment =
      fixedReport.department_id === profile.department_id;

    const isRelatedByTransfer = fixedTransfers.some(
      (transfer) =>
        transfer.from_department_id === profile.department_id ||
        transfer.to_department_id === profile.department_id,
    );

    if (!isCurrentDepartment && !isRelatedByTransfer) {
      setError("Report not found, or you do not have permission to view it.");
      setLoading(false);
      return;
    }

    setCanManageReport(isCurrentDepartment);
    setReport(fixedReport);
    setStatus(fixedReport.status);

    const assignedDepartmentName =
      fixedDepartments.find(
        (department) => department.id === fixedReport.department_id,
      )?.name || "Current Department";

    setReportDepartmentName(assignedDepartmentName);

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
        setStudentProfile(firstStudentProfile);
        setStudentName(firstStudentProfile.full_name || "Student");
      } else {
        setStudentName("Student");
      }
    } else {
      setStudentName("Anonymous Student");
      setStudentProfile(null);
    }

    const { data: attachmentsData, error: attachmentsError } = await supabase
      .from("report_attachments")
      .select("id, file_url, file_name, file_type")
      .eq("report_id", fixedReport.id);

    if (!attachmentsError) {
      setAttachments((attachmentsData as Attachment[]) || []);
    }

    await fetchComments(fixedReport.id);

    setLoading(false);
  }

  useEffect(() => {
    loadReportDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  async function handleUpdateStatus(e: React.FormEvent) {
    e.preventDefault();

    if (!report || !canManageReport) return;

    setUpdating(true);
    setError("");
    setSuccess("");

    const previousStatus = report.status;
    const updatedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("reports")
      .update({
        status,
        updated_at: updatedAt,
      })
      .eq("id", report.id)
      .eq("department_id", currentDepartmentId);

    if (updateError) {
      setError(updateError.message);
      setUpdating(false);
      return;
    }

    setReport({
      ...report,
      status,
      updated_at: updatedAt,
    });

    if (previousStatus !== status) {
      await createActivityLog({
        reportId: report.id,
        action: "status_changed",
        description: `Department staff changed status from ${previousStatus.replace(
          "_",
          " ",
        )} to ${status.replace("_", " ")}.`,
      });

      await notifyReportStudent(
        report.id,
        `Your report "${report.title}" was updated to ${status.replace(
          "_",
          " ",
        )}.`,
      );

      setTimelineRefreshKey((value) => value + 1);
    }

    setSuccess("Report status updated successfully.");
    setUpdating(false);
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();

    if (!report || !canManageReport || !newComment.trim()) return;

    setCommentLoading(true);
    setError("");
    setSuccess("");

    const { error: commentError } = await supabase
      .from("report_comments")
      .insert({
        report_id: report.id,
        user_id: currentUserId,
        comment: newComment.trim(),
      });

    if (commentError) {
      setError(commentError.message);
      setCommentLoading(false);
      return;
    }

    await createActivityLog({
      reportId: report.id,
      action: "department_comment",
      description: "Department staff replied to the report.",
    });

    await notifyReportStudent(
      report.id,
      `Department staff replied to your report: ${report.title}`,
    );

    setNewComment("");
    await fetchComments(report.id);
    setTimelineRefreshKey((value) => value + 1);

    setSuccess("Reply sent successfully.");
    setCommentLoading(false);
  }

  async function handleTransferReport(e: React.FormEvent) {
    e.preventDefault();

    if (!report || !canManageReport) return;

    setTransferring(true);
    setError("");
    setSuccess("");

    const cleanedReason = transferReason.trim();

    if (!transferDepartmentId) {
      setError("Please choose the receiving department.");
      setTransferring(false);
      return;
    }

    if (!cleanedReason) {
      setError("Please enter the reason for transferring this report.");
      setTransferring(false);
      return;
    }

    const { data, error: transferError } = await supabase.rpc(
      "transfer_report_department",
      {
        p_report_id: report.id,
        p_new_department_id: transferDepartmentId,
        p_reason: cleanedReason,
      },
    );

    if (transferError) {
      setError(transferError.message);
      setTransferring(false);
      return;
    }

    const transferData = data as TransferResult;
    const updatedAt = new Date().toISOString();

    setReport({
      ...report,
      department_id: transferData.new_department_id,
      updated_at: updatedAt,
    });

    setReportDepartmentName(transferData.new_department_name);
    setCanManageReport(false);
    setTransferDepartmentId("");
    setTransferReason("");

    setTransfers((currentTransfers) => [
      {
        id: `temp-${Date.now()}`,
        report_id: report.id,
        from_department_id: transferData.old_department_id,
        to_department_id: transferData.new_department_id,
        transferred_by: currentUserId,
        reason: cleanedReason,
        created_at: updatedAt,
      },
      ...currentTransfers,
    ]);

    setTimelineRefreshKey((value) => value + 1);

    setSuccess(
      `You successfully transferred this report to ${transferData.new_department_name}.`,
    );

    setTransferring(false);
  }

  if (loading) {
    return <p className="text-sm hcdc-muted">Loading report...</p>;
  }

  if (error && !report) {
    return (
      <>
        <Link href="/department/reports" className="font-bold text-[#b00000]">
          ← Back to Reports
        </Link>

        <div className="alert alert-error mt-4">
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
        <Link href="/department/reports" className="font-bold text-[#b00000]">
          ← Back to Reports
        </Link>
      </div>

      {success && (
        <div className="alert alert-success mb-4">
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      {!canManageReport && (
        <div className="mb-4 border-l-4 border-[#b00000] bg-red-50 p-5">
          <p className="font-black text-black">
            This report no longer belongs to your department.
          </p>

          <p className="mt-1 text-sm text-gray-700">
            Current assigned department:{" "}
            <span className="font-bold">{reportDepartmentName}</span>
          </p>

          {latestTransferFromThisDepartment && (
            <p className="mt-2 text-sm text-gray-700">
              You transferred this report to{" "}
              <span className="font-bold">
                {getDepartmentName(
                  latestTransferFromThisDepartment.to_department_id,
                )}
              </span>
              . Reason:{" "}
              <span className="font-bold">
                {latestTransferFromThisDepartment.reason}
              </span>
            </p>
          )}

          <p className="mt-2 text-sm text-gray-700">
            You can still view the report details, comments, and activity
            history, but only the current department can update or reply to it.
          </p>
        </div>
      )}

      <section className="hcdc-card p-5">
        <div className="flex flex-col justify-between gap-3 border-b border-gray-200 pb-4 md:flex-row md:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
              Department Report
            </p>

            <h1 className="mt-1 text-3xl font-black text-black">
              {report.title}
            </h1>

            <p className="mt-2 text-sm hcdc-muted">
              Current department:{" "}
              <span className="font-bold text-black">
                {reportDepartmentName}
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
            <p className="font-bold text-black">Student Information</p>

            {report.is_anonymous ? (
              <p className="mt-1">Anonymous Student</p>
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
            <p className="font-bold text-black">Department / Office</p>
            <p className="mt-1">{reportDepartmentName}</p>
          </div>

          <div>
            <p className="font-bold text-black">Category</p>
            <p className="mt-1">{report.category || "N/A"}</p>
          </div>

          <div>
            <p className="font-bold text-black">Location</p>
            <p className="mt-1">{report.location || "N/A"}</p>
          </div>

          <div>
            <p className="font-bold text-black">Date Submitted</p>
            <p className="mt-1">{formatDate(report.created_at)}</p>
          </div>

          <div>
            <p className="font-bold text-black">Last Updated</p>
            <p className="mt-1">
              {report.updated_at
                ? formatDate(report.updated_at)
                : "Not updated yet"}
            </p>
          </div>
        </div>

        <div className="mt-5 border-t border-gray-200 pt-4">
          <p className="font-bold text-black">Description</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
            {report.description}
          </p>
        </div>

        {attachments.length > 0 && (
          <div className="mt-5 border-t border-gray-200 pt-4">
            <p className="font-bold text-black">Photo Evidence</p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {attachments.map((file) => (
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
                      alt={file.file_name || "Report photo evidence"}
                      className="h-44 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-44 items-center justify-center bg-gray-100 text-sm font-semibold text-gray-600">
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

      {canManageReport && (
        <>
          <section className="hcdc-card mt-4 p-5">
            <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
              Transfer Report
            </p>

            <h2 className="mt-1 text-2xl font-black text-black">
              Send to Another Department
            </h2>

            <p className="mt-1 text-sm hcdc-muted">
              Use this if another department should handle this report.
            </p>

            <form onSubmit={handleTransferReport} className="mt-4 space-y-3">
              <select
                className="select select-bordered w-full"
                value={transferDepartmentId}
                onChange={(e) => setTransferDepartmentId(e.target.value)}
              >
                <option value="">Choose receiving department</option>
                {transferDepartmentOptions.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
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

          <section className="hcdc-card mt-4 p-5">
            <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
              Status Update
            </p>

            <h2 className="mt-1 text-2xl font-black text-black">
              Update Status
            </h2>

            <form
              onSubmit={handleUpdateStatus}
              className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]"
            >
              <select
                className="select select-bordered w-full"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
              </select>

              <button className="btn hcdc-btn-primary" disabled={updating}>
                {updating ? "Updating..." : "Update Status"}
              </button>
            </form>
          </section>
        </>
      )}

      <div className="mt-4">
        <ReportTimeline reportId={report.id} refreshKey={timelineRefreshKey} />
      </div>

      <section className="hcdc-card mt-4 p-5">
        <div className="mb-5">
          <h2 className="text-2xl font-black text-black">Comments / Replies</h2>

          <p className="mt-1 text-sm hcdc-muted">
            Conversation between the student and the assigned department.
          </p>
        </div>

        {comments.length === 0 ? (
          <div className="border border-dashed border-gray-300 p-5 text-center">
            <p className="font-bold text-black">No comments yet</p>
            <p className="mt-1 text-sm hcdc-muted">
              Replies will appear here once the conversation starts.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => {
              const isMine = comment.user_id === currentUserId;

              return (
                <div
                  key={comment.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
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
                          report,
                          studentName,
                          commentProfiles,
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

        {canManageReport ? (
          <form onSubmit={handleAddComment} className="mt-5 space-y-3">
            <textarea
              className="textarea textarea-bordered min-h-24 w-full bg-white text-black"
              placeholder="Write a reply to the student..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />

            <button
              className="btn hcdc-btn-primary"
              disabled={commentLoading || !newComment.trim()}
            >
              {commentLoading ? "Sending..." : "Send Reply"}
            </button>
          </form>
        ) : (
          <div className="mt-5 border-l-4 border-gray-300 bg-gray-50 p-4">
            <p className="text-sm font-bold text-black">Read-only report</p>
            <p className="mt-1 text-sm hcdc-muted">
              Your department can no longer reply because this report has been
              transferred to another department.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
