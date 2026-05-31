/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type UserRole = "student" | "department_staff" | "admin";

type Profile = {
  id: string;
  full_name: string | null;
  id_number: string | null;
  employee_id: string | null;
  email: string | null;
  role: UserRole;
  course: string | null;
  academic_department: string | null;
  gender: string | null;
  department_id: string | null;
  created_at: string;
};

type ProfileDetailsProps = {
  expectedRole: UserRole;
  dashboardPath: string;
};

function formatRole(role: string) {
  if (role === "department_staff") return "Department Staff";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatDate(value: string | null) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString();
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

function getFallbackName(role: UserRole) {
  if (role === "student") return "Student";
  if (role === "department_staff") return "Department Staff";
  return "Admin User";
}

export default function ProfileDetails({
  expectedRole,
  dashboardPath,
}: ProfileDetailsProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [departmentName, setDepartmentName] = useState("N/A");
  const [authEmail, setAuthEmail] = useState("");
  const [authFullName, setAuthFullName] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProfile() {
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

      setAuthEmail(user.email || "");

      const metadataName = user.user_metadata?.full_name;

      if (typeof metadataName === "string") {
        setAuthFullName(metadataName);
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
          id,
          full_name,
          id_number,
          employee_id,
          email,
          role,
          course,
          academic_department,
          gender,
          department_id,
          created_at
        `,
        )
        .eq("id", user.id)
        .single();

      if (error || !data) {
        setError("Profile not found.");
        setLoading(false);
        return;
      }

      const fixedProfile = data as Profile;

      if (fixedProfile.role !== expectedRole) {
        setError("You do not have access to this profile page.");
        setLoading(false);
        return;
      }

      setProfile(fixedProfile);

      if (fixedProfile.department_id) {
        const { data: department } = await supabase
          .from("departments")
          .select("name")
          .eq("id", fixedProfile.department_id)
          .single();

        setDepartmentName(department?.name || "N/A");
      }

      setLoading(false);
    }

    fetchProfile();
  }, [expectedRole]);

  if (loading) {
    return (
      <>
        <div className="mb-5">
          <h1 className="hcdc-page-title text-3xl md:text-4xl">My Profile</h1>
          <p className="mt-1 text-sm hcdc-muted">Loading profile details...</p>
        </div>

        <div className="hcdc-card p-6">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      </>
    );
  }

  if (error || !profile) {
    return (
      <>
        <div className="mb-5">
          <h1 className="hcdc-page-title text-3xl md:text-4xl">My Profile</h1>
        </div>

        <div className="alert alert-error">
          <span>{error || "Profile not found."}</span>
        </div>
      </>
    );
  }

  const profileName = safeDisplayName(
    profile.full_name,
    authFullName,
    getFallbackName(profile.role),
  );

  const displayEmail = profile.email || authEmail || "N/A";

  return (
    <>
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="hcdc-page-title text-3xl md:text-4xl">My Profile</h1>
          <p className="mt-1 text-sm hcdc-muted">
            View your account and school information.
          </p>
        </div>

        <Link href={dashboardPath} className="btn hcdc-btn-outline">
          Back to Dashboard
        </Link>
      </div>

      <section className="grid items-start gap-4 lg:grid-cols-3">
        <div className="hcdc-card p-6 text-center lg:sticky lg:top-6">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-gray-200 bg-white p-4">
            <img
              src="/hcdc-logo.png"
              alt="HCDC Logo"
              className="h-full w-full object-contain"
            />
          </div>

          <h2 className="mx-auto mt-5 max-w-full break-words text-2xl font-black leading-tight text-black">
            {profileName}
          </h2>

          <p className="mt-1 text-sm hcdc-muted">{formatRole(profile.role)}</p>

          <div className="mt-4 inline-flex max-w-full break-words border border-gray-300 bg-white px-4 py-2 text-sm font-black text-black">
            {profile.role === "student"
              ? profile.id_number || "No Student ID"
              : profile.employee_id || "No Employee ID"}
          </div>

          <div className="mt-5 border-t border-gray-200 pt-5 text-left">
            <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
              Account Type
            </p>
            <p className="mt-1 text-sm font-bold text-black">
              {formatRole(profile.role)}
            </p>
          </div>
        </div>

        <div className="hcdc-card p-6 lg:col-span-2">
          <div className="border-b border-gray-200 pb-4">
            <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
              Profile Information
            </p>

            <h2 className="mt-2 text-2xl font-black text-black">
              Account Details
            </h2>

            <p className="mt-1 text-sm hcdc-muted">
              These details are used for report tracking and account
              identification.
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="border border-gray-200 bg-white p-4">
              <p className="text-sm font-black text-black">Full Name</p>
              <p className="mt-1 break-words text-sm text-gray-700">
                {profileName}
              </p>
            </div>

            <div className="border border-gray-200 bg-white p-4">
              <p className="text-sm font-black text-black">HCDC Email</p>
              <p className="mt-1 break-words text-sm text-gray-700">
                {displayEmail}
              </p>
            </div>

            {profile.role === "student" && (
              <>
                <div className="border border-gray-200 bg-white p-4">
                  <p className="text-sm font-black text-black">
                    Student ID Number
                  </p>
                  <p className="mt-1 text-sm text-gray-700">
                    {profile.id_number || "N/A"}
                  </p>
                </div>

                <div className="border border-gray-200 bg-white p-4">
                  <p className="text-sm font-black text-black">Gender</p>
                  <p className="mt-1 text-sm text-gray-700">
                    {profile.gender || "N/A"}
                  </p>
                </div>

                <div className="border border-gray-200 bg-white p-4">
                  <p className="text-sm font-black text-black">Course</p>
                  <p className="mt-1 text-sm text-gray-700">
                    {profile.course || "N/A"}
                  </p>
                </div>

                <div className="border border-gray-200 bg-white p-4">
                  <p className="text-sm font-black text-black">
                    Department / College
                  </p>
                  <p className="mt-1 text-sm text-gray-700">
                    {profile.academic_department || "N/A"}
                  </p>
                </div>
              </>
            )}

            {profile.role !== "student" && (
              <>
                <div className="border border-gray-200 bg-white p-4">
                  <p className="text-sm font-black text-black">Employee ID</p>
                  <p className="mt-1 text-sm text-gray-700">
                    {profile.employee_id || "N/A"}
                  </p>
                </div>

                <div className="border border-gray-200 bg-white p-4">
                  <p className="text-sm font-black text-black">
                    Assigned Department
                  </p>
                  <p className="mt-1 text-sm text-gray-700">
                    {profile.role === "department_staff"
                      ? departmentName
                      : "System Administrator"}
                  </p>
                </div>
              </>
            )}

            <div className="border border-gray-200 bg-white p-4">
              <p className="text-sm font-black text-black">Role</p>
              <p className="mt-1 text-sm text-gray-700">
                {formatRole(profile.role)}
              </p>
            </div>

            <div className="border border-gray-200 bg-white p-4">
              <p className="text-sm font-black text-black">Date Created</p>
              <p className="mt-1 text-sm text-gray-700">
                {formatDate(profile.created_at)}
              </p>
            </div>
          </div>

          <div className="mt-5 border-l-4 border-[#b00000] bg-gray-50 p-4">
            <p className="text-sm font-black text-black">Profile Update Note</p>
            <p className="mt-1 text-sm hcdc-muted">
              If any information is incorrect, contact the system admin to
              update your profile details.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
