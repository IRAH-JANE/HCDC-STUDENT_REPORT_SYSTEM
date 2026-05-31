"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type UserRole = "student" | "department_staff" | "admin";

type RoleGuardProps = {
  allowedRole: UserRole;
  children: React.ReactNode;
};

function getDashboardPath(role: string) {
  if (role === "student") return "/student/dashboard";
  if (role === "department_staff") return "/department/dashboard";
  if (role === "admin") return "/admin/dashboard";
  return "/login";
}

export default function RoleGuard({ allowedRole, children }: RoleGuardProps) {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function checkUserRole() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error || !profile) {
        router.replace("/login");
        return;
      }

      if (profile.role !== allowedRole) {
        router.replace(getDashboardPath(profile.role));
        return;
      }

      setAllowed(true);
      setChecking(false);
    }

    checkUserRole();
  }, [allowedRole, router]);

  if (checking) {
    return (
      <main className="min-h-screen bg-base-200 flex items-center justify-center p-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center">
            <span className="loading loading-spinner loading-lg mx-auto"></span>
            <p className="mt-4">Checking access...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}