/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { notifyDepartmentStaff } from "@/lib/notifications";
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

type Attachment = {
  id: string;
  file_url: string;
  file_name: string | null;
  file_type: string | null;
};

export default function StudentReportDetailsPage() {
  const params = useParams();
  const reportId = params.id as string;

  const [currentUserId, setCurrentUserId] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [departmentName, setDepartmentName] = useState("N/A");
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newComment, setNewComment] = useState("");

  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);
  const [error, setError] = useState("");
  const [timelineRefreshKey, setTimelineRefreshKey] = useState(0);

  async function fetchComments() {
    const { data, error } = await supabase
      .from("report_comments")
      .select("id, report_id, user_id, comment, created_at")
      .eq("report_id", reportId)
      .order("created_at", { ascending: true });

    if (!error) {
      setComments((data as Comment[]) || []);
    }
  }

  async function fetchAttachments(reportIdValue: string) {
    const { data, error } = await supabase
      .from("report_attachments")
      .select("id, file_url, file_name, file_type")
      .eq("report_id", reportIdValue);

    if (!error) {
      setAttachments((data as Attachment[]) || []);
    }
  }

  useEffect(() => {
    async function fetchReport() {
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

      const { data, error } = await supabase
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
        .eq("student_id", user.id)
        .single();

      if (error || !data) {
        setError("Report not found or you do not have access to this report.");
        setLoading(false);
        return;
      }

      const reportData = data as Report;
      setReport(reportData);

      const { data: departmentData } = await supabase
        .from("departments")
        .select("name")
        .eq("id", reportData.department_id)
        .single();

      setDepartmentName(departmentData?.name || "N/A");

      await fetchComments();
      await fetchAttachments(reportData.id);

      setLoading(false);
    }

    fetchReport();
  }, [reportId]);

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();

    if (!newComment.trim()) return;

    setCommentLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in.");
      setCommentLoading(false);
      return;
    }

    const { error } = await supabase.from("report_comments").insert({
      report_id: reportId,
      user_id: user.id,
      comment: newComment.trim(),
    });

    if (error) {
      setError(error.message);
      setCommentLoading(false);
      return;
    }

    await createActivityLog({
      reportId,
      action: "student_comment",
      description: "Student added a reply.",
    });

    setTimelineRefreshKey((value) => value + 1);

    if (report) {
      await notifyDepartmentStaff(
        report.id,
        `Student replied to report: ${report.title}`,
      );
    }

    setNewComment("");
    await fetchComments();
    setCommentLoading(false);
  }

  if (loading) {
    return (
      <>
        <div className="mb-4">
          <h1 className="hcdc-page-title text-2xl md:text-3xl">
            Report Details
          </h1>
          <p className="mt-1 text-sm hcdc-muted">Loading report...</p>
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

  return (
    <>
      <div className="mb-4">
        <Link
          href="/student/reports"
          className="text-sm font-bold text-[#b00000] hover:underline"
        >
          ← Back to My Reports
        </Link>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      {report && (
        <div className="grid gap-4">
          <section className="hcdc-card p-4 md:p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <h1 className="hcdc-page-title text-2xl md:text-3xl">
                  {report.title}
                </h1>

                <p className="mt-2 text-sm hcdc-muted">
                  Sent to:{" "}
                  <span className="font-semibold">{departmentName}</span>
                </p>
              </div>

              <div className="flex gap-2">
                <UrgencyBadge urgency={report.urgency} />
                <StatusBadge status={report.status} />
              </div>
            </div>

            <div className="my-5 border-t border-gray-200"></div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <p className="text-sm font-bold text-black">Category</p>
                <p className="mt-1 text-sm text-gray-700">
                  {report.category || "N/A"}
                </p>
              </div>

              <div>
                <p className="text-sm font-bold text-black">Location</p>
                <p className="mt-1 text-sm text-gray-700">
                  {report.location || "N/A"}
                </p>
              </div>

              <div>
                <p className="text-sm font-bold text-black">Anonymous</p>
                <p className="mt-1 text-sm text-gray-700">
                  {report.is_anonymous ? "Yes" : "No"}
                </p>
              </div>

              <div>
                <p className="text-sm font-bold text-black">Date Submitted</p>
                <p className="mt-1 text-sm text-gray-700">
                  {new Date(report.created_at).toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-sm font-bold text-black">Last Updated</p>
                <p className="mt-1 text-sm text-gray-700">
                  {report.updated_at
                    ? new Date(report.updated_at).toLocaleString()
                    : "No update yet"}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-sm font-bold text-black">Description</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                {report.description}
              </p>
            </div>

            {attachments.length > 0 && (
              <div className="mt-5">
                <p className="text-sm font-bold text-black">Photo Evidence</p>

                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={attachment.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block border border-gray-200 bg-white p-2 hover:border-[#b00000]"
                    >
                      {attachment.file_type?.startsWith("image/") ? (
                        <img
                          src={attachment.file_url}
                          alt={attachment.file_name || "Report attachment"}
                          className="h-48 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-48 items-center justify-center bg-gray-100 text-sm font-semibold text-gray-600">
                          View Attachment
                        </div>
                      )}

                      <p className="mt-2 truncate text-xs text-gray-600">
                        {attachment.file_name || "Attachment"}
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              Your report is currently marked as{" "}
              <strong>{report.status.replace("_", " ")}</strong>.
            </div>
          </section>

          <ReportTimeline
            reportId={report.id}
            refreshKey={timelineRefreshKey}
          />

          <section className="hcdc-card p-4 md:p-6">
            <h2 className="text-xl font-bold text-black">Comments / Replies</h2>

            <div className="mt-4 space-y-4">
              {comments.length === 0 ? (
                <p className="text-sm hcdc-muted">
                  No comments or replies yet.
                </p>
              ) : (
                comments.map((comment) => {
                  const isMine = comment.user_id === currentUserId;

                  return (
                    <div
                      key={comment.id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-xl border p-3 ${
                          isMine
                            ? "border-[#b00000]/20 bg-red-50"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        <p className="text-xs font-bold text-gray-600">
                          {isMine ? "You" : "Department Staff"}
                        </p>

                        <p className="mt-1 whitespace-pre-wrap text-sm text-black">
                          {comment.comment}
                        </p>

                        <p className="mt-2 text-xs text-gray-500">
                          {new Date(comment.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleAddComment} className="mt-5 space-y-3">
              <textarea
                className="textarea textarea-bordered min-h-24 w-full bg-white text-black"
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />

              <button
                className="btn hcdc-btn-primary"
                disabled={commentLoading || !newComment.trim()}
              >
                {commentLoading ? "Sending..." : "Send Comment"}
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
