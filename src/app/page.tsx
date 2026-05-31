/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function redirectIfLoggedIn() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setChecking(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role === "student") {
        router.replace("/student/dashboard");
        return;
      }

      if (profile?.role === "department_staff") {
        router.replace("/department/dashboard");
        return;
      }

      if (profile?.role === "admin") {
        router.replace("/admin/dashboard");
        return;
      }

      setChecking(false);
    }

    redirectIfLoggedIn();
  }, [router]);

  if (checking) {
    return (
      <main className="min-h-screen bg-[#f4f4f4] flex items-center justify-center p-6">
        <div className="hcdc-card w-full max-w-sm p-6 text-center">
          <span className="loading loading-spinner loading-md"></span>
          <p className="mt-3 text-sm hcdc-muted">Checking account...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f4f4] px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-2">
        <section>
          <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
            Holy Cross of Davao College
          </p>

          <h1 className="mt-3 text-4xl font-black leading-tight text-black md:text-5xl">
            Student Concern Reporting System
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-gray-600">
            A department-based platform for submitting, tracking, and managing
            school concerns within HCDC.
          </p>

          <div className="mt-6 border-l-4 border-[#b00000] bg-white p-4">
            <p className="text-sm font-bold text-black">Account policy</p>
            <p className="mt-1 text-sm text-gray-600">
              Students may register using their official HCDC email. Department
              staff and admin accounts are created by the system administrator.
            </p>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className="btn hcdc-btn-primary">
              Login
            </Link>

            <Link href="/register" className="btn hcdc-btn-outline">
              Create Student Account
            </Link>
          </div>
        </section>

        <section className="hcdc-card p-6 md:p-8">
          <div className="text-center">
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-gray-200 bg-white">
              <img
                src="/hcdc-logo.png"
                alt="HCDC Logo"
                className="h-24 w-24 object-contain"
              />
            </div>

            <h2 className="mt-6 text-2xl font-black text-black">
              HCDC Report Portal
            </h2>

            <p className="mt-2 text-sm hcdc-muted">
              Submit concerns, monitor progress, receive updates, and
              communicate with the assigned department.
            </p>
          </div>

          <div className="mt-8 grid gap-3">
            <div className="border border-gray-200 bg-white p-4">
              <p className="font-black text-black">For Students</p>
              <p className="mt-1 text-sm text-gray-600">
                Submit school-related concerns and track report status.
              </p>
            </div>

            <div className="border border-gray-200 bg-white p-4">
              <p className="font-black text-black">For Departments</p>
              <p className="mt-1 text-sm text-gray-600">
                Receive assigned reports, update status, and reply to students.
              </p>
            </div>

            <div className="border border-gray-200 bg-white p-4">
              <p className="font-black text-black">For Admins</p>
              <p className="mt-1 text-sm text-gray-600">
                Manage users, departments, reports, and platform activity.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
