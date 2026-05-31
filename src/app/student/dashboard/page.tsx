"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, CircleAlert, Clock3, FileText, History } from "lucide-react";
import { supabase } from "@/lib/supabase";
import StatCard from "@/components/StatCard";

type StudentStats = {
  totalReports: number;
  pendingReports: number;
  inProgressReports: number;
  resolvedReports: number;
  rejectedReports: number;
};

type RecentReport = {
  id: string;
  title: string;
  status: string;
  urgency: string;
  created_at: string;
};

function MinimalIcon({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export default function StudentDashboardPage() {
  const [stats, setStats] = useState<StudentStats>({
    totalReports: 0,
    pendingReports: 0,
    inProgressReports: 0,
    resolvedReports: 0,
    rejectedReports: 0,
  });

  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [fullName, setFullName] = useState("Student");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchDashboardData() {
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
        .select("full_name")
        .eq("id", user.id)
        .single();

      setFullName(profile?.full_name || "Student");

      const [
        totalReports,
        pendingReports,
        inProgressReports,
        resolvedReports,
        rejectedReports,
        recentReportsResult,
      ] = await Promise.all([
        supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .eq("student_id", user.id),

        supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .eq("student_id", user.id)
          .eq("status", "pending"),

        supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .eq("student_id", user.id)
          .eq("status", "in_progress"),

        supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .eq("student_id", user.id)
          .eq("status", "resolved"),

        supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .eq("student_id", user.id)
          .eq("status", "rejected"),

        supabase
          .from("reports")
          .select("id, title, status, urgency, created_at")
          .eq("student_id", user.id)
          .order("created_at", { ascending: false })
          .limit(4),
      ]);

      setStats({
        totalReports: totalReports.count || 0,
        pendingReports: pendingReports.count || 0,
        inProgressReports: inProgressReports.count || 0,
        resolvedReports: resolvedReports.count || 0,
        rejectedReports: rejectedReports.count || 0,
      });

      if (!recentReportsResult.error) {
        setRecentReports((recentReportsResult.data as RecentReport[]) || []);
      }

      setLoading(false);
    }

    fetchDashboardData();
  }, []);

  return (
    <>
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="hcdc-page-title text-3xl md:text-4xl">
            Student Dashboard
          </h1>
          <p className="mt-1 text-sm hcdc-muted">
            Welcome, {fullName}. Submit and monitor your school concerns.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/student/reports/new" className="btn hcdc-btn-primary">
            Submit Report
          </Link>
          <Link href="/student/reports" className="btn hcdc-btn-outline">
            View My Reports
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      <div className="mb-4 hcdc-card p-5">
        <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
          Holy Cross of Davao College
        </p>

        <h2 className="mt-2 text-2xl font-black text-black">
          Student Concern Reporting
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-relaxed hcdc-muted">
          Submit school-related concerns, attach photo evidence when needed, and
          track responses from the assigned office, department, program, or
          laboratory.
        </p>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total Reports"
          value={loading ? "..." : stats.totalReports}
          icon={
            <MinimalIcon>
              <FileText className="h-6 w-6 text-black" strokeWidth={2.4} />
            </MinimalIcon>
          }
        />

        <StatCard
          label="Pending"
          value={loading ? "..." : stats.pendingReports}
          icon={
            <MinimalIcon>
              <Clock3 className="h-6 w-6 text-black" strokeWidth={2.4} />
            </MinimalIcon>
          }
        />

        <StatCard
          label="In Progress"
          value={loading ? "..." : stats.inProgressReports}
          icon={
            <MinimalIcon>
              <History className="h-6 w-6 text-black" strokeWidth={2.4} />
            </MinimalIcon>
          }
        />

        <StatCard
          label="Resolved"
          value={loading ? "..." : stats.resolvedReports}
          icon={
            <MinimalIcon>
              <Check className="h-6 w-6 text-black" strokeWidth={2.6} />
            </MinimalIcon>
          }
        />

        <StatCard
          label="Rejected"
          value={loading ? "..." : stats.rejectedReports}
          icon={
            <MinimalIcon>
              <CircleAlert className="h-6 w-6 text-black" strokeWidth={2.4} />
            </MinimalIcon>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="hcdc-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-black">Recent Reports</h2>
              <p className="mt-1 text-sm hcdc-muted">
                Latest concerns you submitted.
              </p>
            </div>

            <Link
              href="/student/reports"
              className="text-sm font-bold text-[#b00000] hover:underline"
            >
              View all
            </Link>
          </div>

          {loading ? (
            <p className="text-sm hcdc-muted">Loading recent reports...</p>
          ) : recentReports.length === 0 ? (
            <div className="border border-dashed border-gray-300 p-6 text-center">
              <p className="font-bold text-black">No reports yet</p>
              <p className="mt-1 text-sm hcdc-muted">
                Your submitted concerns will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {recentReports.map((report) => (
                <Link
                  key={report.id}
                  href={`/student/reports/${report.id}`}
                  className="flex flex-col justify-between gap-2 py-3 hover:bg-gray-50 md:flex-row md:items-center"
                >
                  <div>
                    <p className="font-bold text-black">{report.title}</p>
                    <p className="mt-1 text-xs hcdc-muted">
                      {new Date(report.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex gap-2 text-xs font-bold uppercase tracking-wide text-gray-700">
                    <span className="border border-gray-300 bg-white px-2 py-1">
                      {report.urgency}
                    </span>
                    <span className="border border-gray-300 bg-white px-2 py-1">
                      {report.status.replace("_", " ")}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="hcdc-card p-5">
          <h2 className="text-xl font-black text-black">How It Works</h2>
          <p className="mt-1 text-sm hcdc-muted">
            Follow these steps when submitting a concern.
          </p>

          <div className="mt-5 space-y-4">
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-gray-300 bg-white text-sm font-black text-black">
                1
              </div>
              <div>
                <p className="font-bold text-black">Choose recipient</p>
                <p className="text-sm hcdc-muted">
                  Select the correct office, department, program, or laboratory.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-gray-300 bg-white text-sm font-black text-black">
                2
              </div>
              <div>
                <p className="font-bold text-black">Describe clearly</p>
                <p className="text-sm hcdc-muted">
                  Add complete details and photo evidence if needed.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-gray-300 bg-white text-sm font-black text-black">
                3
              </div>
              <div>
                <p className="font-bold text-black">Track updates</p>
                <p className="text-sm hcdc-muted">
                  Monitor the status and reply to department messages.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
