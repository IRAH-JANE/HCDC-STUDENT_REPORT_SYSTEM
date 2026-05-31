"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  CircleAlert,
  Clock3,
  FileText,
  History,
  MessageSquare,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import StatCard from "@/components/StatCard";
import { StatusBadge, UrgencyBadge } from "@/components/ReportBadges";

type DepartmentStats = {
  totalReports: number;
  pendingReports: number;
  inProgressReports: number;
  resolvedReports: number;
  highUrgencyReports: number;
};

type RecentReport = {
  id: string;
  title: string;
  status: string;
  urgency: string;
  created_at: string;
};

export default function DepartmentDashboardPage() {
  const [stats, setStats] = useState<DepartmentStats>({
    totalReports: 0,
    pendingReports: 0,
    inProgressReports: 0,
    resolvedReports: 0,
    highUrgencyReports: 0,
  });

  const [departmentName, setDepartmentName] = useState("Your Department");
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const activeReports = useMemo(() => {
    return stats.pendingReports + stats.inProgressReports;
  }, [stats.pendingReports, stats.inProgressReports]);

  const resolutionRate = useMemo(() => {
    if (stats.totalReports === 0) return 0;
    return Math.round((stats.resolvedReports / stats.totalReports) * 100);
  }, [stats.resolvedReports, stats.totalReports]);

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

      if (!profile.department_id) {
        setError("Your account is not assigned to a department yet.");
        setLoading(false);
        return;
      }

      const departmentId = profile.department_id;

      const { data: department } = await supabase
        .from("departments")
        .select("name")
        .eq("id", departmentId)
        .single();

      setDepartmentName(department?.name || "Your Department");

      const [
        totalReports,
        pendingReports,
        inProgressReports,
        resolvedReports,
        highUrgencyReports,
        recentReportsResult,
      ] = await Promise.all([
        supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .eq("department_id", departmentId),

        supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .eq("department_id", departmentId)
          .eq("status", "pending"),

        supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .eq("department_id", departmentId)
          .eq("status", "in_progress"),

        supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .eq("department_id", departmentId)
          .eq("status", "resolved"),

        supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .eq("department_id", departmentId)
          .eq("urgency", "high"),

        supabase
          .from("reports")
          .select("id, title, status, urgency, created_at")
          .eq("department_id", departmentId)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      setStats({
        totalReports: totalReports.count || 0,
        pendingReports: pendingReports.count || 0,
        inProgressReports: inProgressReports.count || 0,
        resolvedReports: resolvedReports.count || 0,
        highUrgencyReports: highUrgencyReports.count || 0,
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
            Department Dashboard
          </h1>
          <p className="mt-1 text-sm hcdc-muted">
            Reports assigned to {departmentName}.
          </p>
        </div>

        <Link href="/department/reports" className="btn hcdc-btn-primary">
          Open Department Reports
        </Link>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      <section className="mb-4 hcdc-card p-5">
        <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
          Holy Cross of Davao College
        </p>

        <h2 className="mt-2 text-2xl font-black text-black">
          {departmentName}
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-relaxed hcdc-muted">
          View, reply to, and update student reports assigned only to your
          department. Use this dashboard to monitor pending concerns and track
          resolved cases.
        </p>
      </section>

      <section className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Assigned Reports"
          value={loading ? "..." : stats.totalReports}
          icon={<FileText className="h-6 w-6 text-black" strokeWidth={2.4} />}
        />

        <StatCard
          label="Pending"
          value={loading ? "..." : stats.pendingReports}
          icon={<Clock3 className="h-6 w-6 text-black" strokeWidth={2.4} />}
        />

        <StatCard
          label="In Progress"
          value={loading ? "..." : stats.inProgressReports}
          icon={<History className="h-6 w-6 text-black" strokeWidth={2.4} />}
        />

        <StatCard
          label="Resolved"
          value={loading ? "..." : stats.resolvedReports}
          icon={<Check className="h-6 w-6 text-black" strokeWidth={2.6} />}
        />

        <StatCard
          label="High Urgency"
          value={loading ? "..." : stats.highUrgencyReports}
          icon={
            <CircleAlert className="h-6 w-6 text-black" strokeWidth={2.4} />
          }
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="hcdc-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-black">
                Recent Assigned Reports
              </h2>
              <p className="mt-1 text-sm hcdc-muted">
                Latest concerns routed to your department.
              </p>
            </div>

            <Link
              href="/department/reports"
              className="text-sm font-bold text-[#b00000] hover:underline"
            >
              View all
            </Link>
          </div>

          {loading ? (
            <p className="text-sm hcdc-muted">Loading recent reports...</p>
          ) : recentReports.length === 0 ? (
            <div className="border border-dashed border-gray-300 p-6 text-center">
              <p className="font-bold text-black">No assigned reports yet</p>
              <p className="mt-1 text-sm hcdc-muted">
                Reports sent to your department will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {recentReports.map((report) => (
                <Link
                  key={report.id}
                  href={`/department/reports/${report.id}`}
                  className="flex flex-col justify-between gap-2 py-3 hover:bg-gray-50 md:flex-row md:items-center"
                >
                  <div>
                    <p className="font-bold text-black">{report.title}</p>
                    <p className="mt-1 text-xs hcdc-muted">
                      {new Date(report.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <UrgencyBadge urgency={report.urgency} />
                    <StatusBadge status={report.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="hcdc-card p-5">
          <h2 className="text-xl font-black text-black">Department Summary</h2>
          <p className="mt-1 text-sm hcdc-muted">
            Quick overview of your department workload.
          </p>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between border border-gray-200 bg-white p-3">
              <span className="text-sm font-bold text-gray-700">
                Active Reports
              </span>
              <span className="text-lg font-black text-black">
                {loading ? "..." : activeReports}
              </span>
            </div>

            <div className="flex items-center justify-between border border-gray-200 bg-white p-3">
              <span className="text-sm font-bold text-gray-700">
                Resolution Rate
              </span>
              <span className="text-lg font-black text-black">
                {loading ? "..." : `${resolutionRate}%`}
              </span>
            </div>

            <div className="flex items-center justify-between border border-gray-200 bg-white p-3">
              <span className="text-sm font-bold text-gray-700">
                High Urgency
              </span>
              <span className="text-lg font-black text-black">
                {loading ? "..." : stats.highUrgencyReports}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="hcdc-card p-5">
          <FileText className="h-7 w-7 text-black" strokeWidth={2.3} />
          <h3 className="mt-3 text-lg font-black text-black">
            Assigned Reports
          </h3>
          <p className="mt-2 text-sm hcdc-muted">
            Only reports sent to your department are visible to your account.
          </p>
        </div>

        <div className="hcdc-card p-5">
          <History className="h-7 w-7 text-black" strokeWidth={2.3} />
          <h3 className="mt-3 text-lg font-black text-black">Update Status</h3>
          <p className="mt-2 text-sm hcdc-muted">
            Mark reports as pending, in progress, resolved, or rejected.
          </p>
        </div>

        <div className="hcdc-card p-5">
          <MessageSquare className="h-7 w-7 text-black" strokeWidth={2.3} />
          <h3 className="mt-3 text-lg font-black text-black">
            Reply to Students
          </h3>
          <p className="mt-2 text-sm hcdc-muted">
            Communicate with students through the comment and reply section.
          </p>
        </div>
      </section>
    </>
  );
}
