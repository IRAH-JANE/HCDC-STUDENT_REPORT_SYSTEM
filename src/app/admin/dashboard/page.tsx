"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Check,
  CircleAlert,
  Clock3,
  FileText,
  History,
  UsersRound,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import StatCard from "@/components/StatCard";
import { StatusBadge, UrgencyBadge } from "@/components/ReportBadges";

type Stats = {
  totalReports: number;
  pendingReports: number;
  inProgressReports: number;
  resolvedReports: number;
  rejectedReports: number;
  highUrgencyReports: number;
  totalStudents: number;
  totalDepartments: number;
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

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalReports: 0,
    pendingReports: 0,
    inProgressReports: 0,
    resolvedReports: 0,
    rejectedReports: 0,
    highUrgencyReports: 0,
    totalStudents: 0,
    totalDepartments: 0,
  });

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

      const [
        totalReports,
        pendingReports,
        inProgressReports,
        resolvedReports,
        rejectedReports,
        highUrgencyReports,
        totalStudents,
        totalDepartments,
        recentReportsResult,
      ] = await Promise.all([
        supabase.from("reports").select("*", { count: "exact", head: true }),

        supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),

        supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .eq("status", "in_progress"),

        supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .eq("status", "resolved"),

        supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .eq("status", "rejected"),

        supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .eq("urgency", "high"),

        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "student"),

        supabase
          .from("departments")
          .select("*", { count: "exact", head: true }),

        supabase
          .from("reports")
          .select("id, title, status, urgency, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      setStats({
        totalReports: totalReports.count || 0,
        pendingReports: pendingReports.count || 0,
        inProgressReports: inProgressReports.count || 0,
        resolvedReports: resolvedReports.count || 0,
        rejectedReports: rejectedReports.count || 0,
        highUrgencyReports: highUrgencyReports.count || 0,
        totalStudents: totalStudents.count || 0,
        totalDepartments: totalDepartments.count || 0,
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
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm hcdc-muted">
            Monitor student concerns, departments, and user assignments.
          </p>
        </div>

        <Link href="/admin/reports" className="btn hcdc-btn-primary">
          View All Reports
        </Link>
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
          Student Concern Monitoring
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-relaxed hcdc-muted">
          View submitted reports, monitor pending concerns, manage department
          routing, and maintain user role assignments.
        </p>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          label="Pending Reports"
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
          label="Resolved Reports"
          value={loading ? "..." : stats.resolvedReports}
          icon={
            <MinimalIcon>
              <Check className="h-6 w-6 text-black" strokeWidth={2.6} />
            </MinimalIcon>
          }
        />

        <StatCard
          label="Rejected Reports"
          value={loading ? "..." : stats.rejectedReports}
          icon={
            <MinimalIcon>
              <CircleAlert className="h-6 w-6 text-black" strokeWidth={2.4} />
            </MinimalIcon>
          }
        />

        <StatCard
          label="High Urgency"
          value={loading ? "..." : stats.highUrgencyReports}
          icon={
            <MinimalIcon>
              <CircleAlert className="h-6 w-6 text-black" strokeWidth={2.4} />
            </MinimalIcon>
          }
        />

        <StatCard
          label="Total Students"
          value={loading ? "..." : stats.totalStudents}
          icon={
            <MinimalIcon>
              <UsersRound className="h-6 w-6 text-black" strokeWidth={2.4} />
            </MinimalIcon>
          }
        />

        <StatCard
          label="Total Departments"
          value={loading ? "..." : stats.totalDepartments}
          icon={
            <MinimalIcon>
              <Building2 className="h-6 w-6 text-black" strokeWidth={2.4} />
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
                Latest submitted school concerns.
              </p>
            </div>

            <Link
              href="/admin/reports"
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
                Submitted reports will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {recentReports.map((report) => (
                <Link
                  key={report.id}
                  href={`/admin/reports/${report.id}`}
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
        </section>

        <section className="hcdc-card p-5">
          <h2 className="text-xl font-black text-black">System Summary</h2>
          <p className="mt-1 text-sm hcdc-muted">
            Quick overview of current system activity.
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
                Department Coverage
              </span>
              <span className="text-lg font-black text-black">
                {loading ? "..." : stats.totalDepartments}
              </span>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <section className="hcdc-card p-5">
          <h3 className="text-lg font-black text-black">Reports</h3>
          <p className="mt-2 text-sm hcdc-muted">
            View, filter, and inspect all submitted student concerns.
          </p>

          <Link
            href="/admin/reports"
            className="btn btn-sm hcdc-btn-outline mt-4"
          >
            Manage Reports
          </Link>
        </section>

        <section className="hcdc-card p-5">
          <h3 className="text-lg font-black text-black">Departments</h3>
          <p className="mt-2 text-sm hcdc-muted">
            Add, edit, activate, or deactivate offices and departments.
          </p>

          <Link
            href="/admin/departments"
            className="btn btn-sm hcdc-btn-outline mt-4"
          >
            Manage Departments
          </Link>
        </section>

        <section className="hcdc-card p-5">
          <h3 className="text-lg font-black text-black">Users</h3>
          <p className="mt-2 text-sm hcdc-muted">
            Manage students, department staff, and admin accounts.
          </p>

          <Link
            href="/admin/users"
            className="btn btn-sm hcdc-btn-outline mt-4"
          >
            Manage Users
          </Link>
        </section>
      </div>
    </>
  );
}
