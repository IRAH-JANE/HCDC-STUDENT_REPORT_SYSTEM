/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import LogoutButton from "@/components/LogoutButton";
import { supabase } from "@/lib/supabase";

type UserRole = "student" | "department" | "admin";

type NavItem = {
  label: string;
  href: string;
  icon: string;
};

type DashboardLayoutProps = {
  role: UserRole;
  children: React.ReactNode;
};

type Profile = {
  full_name: string | null;
  id_number: string | null;
  employee_id: string | null;
  course: string | null;
  academic_department: string | null;
  department_id: string | null;
};

function getRoleLabel(role: UserRole) {
  if (role === "student") return "Student Portal";
  if (role === "department") return "Department Portal";
  return "Admin Portal";
}

function getFallbackName(role: UserRole) {
  if (role === "student") return "Student";
  if (role === "department") return "Department Staff";
  return "Admin User";
}

function looksLikeEmail(value: string | null | undefined) {
  return !!value && value.includes("@");
}

function safeDisplayName(
  profileName: string | null | undefined,
  authName: string | null | undefined,
  fallback: string,
) {
  if (profileName && !looksLikeEmail(profileName)) return profileName;
  if (authName && !looksLikeEmail(authName)) return authName;
  return fallback;
}

function getNavItems(role: UserRole): NavItem[] {
  if (role === "student") {
    return [
      { label: "Dashboard", href: "/student/dashboard", icon: "▣" },
      { label: "Submit Report", href: "/student/reports/new", icon: "+" },
      { label: "My Reports", href: "/student/reports", icon: "▤" },
      { label: "Notifications", href: "/student/notifications", icon: "●" },
      { label: "Profile", href: "/student/profile", icon: "○" },
    ];
  }

  if (role === "department") {
    return [
      { label: "Dashboard", href: "/department/dashboard", icon: "▣" },
      { label: "Reports", href: "/department/reports", icon: "▤" },
      { label: "Notifications", href: "/department/notifications", icon: "●" },
      { label: "Profile", href: "/department/profile", icon: "○" },
    ];
  }

  return [
    { label: "Dashboard", href: "/admin/dashboard", icon: "▣" },
    { label: "Reports", href: "/admin/reports", icon: "▤" },
    { label: "Departments", href: "/admin/departments", icon: "◇" },
    { label: "Users", href: "/admin/users", icon: "▥" },
    { label: "Activity Logs", href: "/admin/activity", icon: "◌" },
    { label: "Profile", href: "/admin/profile", icon: "○" },
  ];
}

export default function DashboardLayout({
  role,
  children,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [departmentName, setDepartmentName] = useState("");
  const [authFullName, setAuthFullName] = useState("");

  const roleLabel = getRoleLabel(role);
  const navItems = getNavItems(role);

  const activeHref =
    navItems
      .filter(
        (item) =>
          pathname === item.href || pathname.startsWith(`${item.href}/`),
      )
      .sort((a, b) => b.href.length - a.href.length)[0]?.href || "";

  useEffect(() => {
    async function fetchProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const metadataName = user.user_metadata?.full_name;

      if (typeof metadataName === "string") {
        setAuthFullName(metadataName);
      }

      const { data } = await supabase
        .from("profiles")
        .select(
          "full_name, id_number, employee_id, course, academic_department, department_id",
        )
        .eq("id", user.id)
        .single();

      if (!data) return;

      setProfile(data as Profile);

      if (data.department_id) {
        const { data: department } = await supabase
          .from("departments")
          .select("name")
          .eq("id", data.department_id)
          .single();

        if (department?.name) {
          setDepartmentName(department.name);
        }
      }
    }

    fetchProfile();
  }, []);

  const displayName = safeDisplayName(
    profile?.full_name,
    authFullName,
    getFallbackName(role),
  );

  const displayId =
    role === "student"
      ? profile?.id_number || "No Student ID"
      : profile?.employee_id || "No Employee ID";

  const displayInfo =
    role === "student"
      ? profile?.course || profile?.academic_department || roleLabel
      : role === "department"
        ? departmentName || "Department Staff"
        : "System Administrator";

  return (
    <main className="min-h-screen bg-[#f4f4f4]">
      {mobileOpen && (
        <button
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#102327] text-white transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-white/10 px-5 py-6 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white p-3">
            <img
              src="/hcdc-logo.png"
              alt="HCDC Logo"
              className="h-full w-full object-contain"
            />
          </div>

          <h2 className="mx-auto mt-4 max-w-full break-words text-base font-black leading-tight">
            {displayName}
          </h2>

          <div className="mx-auto mt-2 inline-flex max-w-full break-words border border-white/20 px-3 py-1 text-xs font-black text-white">
            {displayId}
          </div>

          <p className="mx-auto mt-2 max-w-full break-words text-xs leading-relaxed text-white/75">
            {displayInfo}
          </p>

          <p className="mt-1 text-xs text-white/55">{roleLabel}</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const active = item.href === activeHref;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-6 py-3 text-sm font-bold transition ${
                      active
                        ? "bg-[#b00000] text-white"
                        : "text-white/85 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="w-5 text-center">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-white/10 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-white/70">
            System
          </p>

          <p className="mt-2 text-sm font-black">Student Concern Reporting</p>

          <p className="mt-1 text-xs leading-relaxed text-white/70">
            Department-based school issue tracking.
          </p>

          <div className="mt-4">
            <LogoutButton />
          </div>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-[#b00000] px-4 text-white lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-2xl font-bold"
            aria-label="Open menu"
          >
            ☰
          </button>

          <span className="font-black tracking-wide">HCDC</span>

          <span className="w-8" />
        </header>

        <section className="min-h-screen bg-[#f4f4f4] px-4 py-6 sm:px-6 lg:px-8">
          <div className="w-full">{children}</div>
        </section>
      </div>
    </main>
  );
}
