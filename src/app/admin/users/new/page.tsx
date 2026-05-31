"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Department = {
  id: string;
  name: string;
};

type UserRole = "department_staff" | "admin";

function isHcdcEmail(email: string) {
  return email.trim().toLowerCase().endsWith("@hcdc.edu.ph");
}

export default function CreateAdminUserPage() {
  const [departments, setDepartments] = useState<Department[]>([]);

  const [fullName, setFullName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [role, setRole] = useState<UserRole>("department_staff");
  const [departmentId, setDepartmentId] = useState("");

  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function fetchDepartments() {
      setLoadingDepartments(true);

      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (!error) {
        setDepartments((data as Department[]) || []);
      }

      setLoadingDepartments(false);
    }

    fetchDepartments();
  }, []);

  function resetForm() {
    setFullName("");
    setEmployeeId("");
    setEmail("");
    setPassword("");
    setRole("department_staff");
    setDepartmentId("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    const cleanedFullName = fullName.trim();
    const cleanedEmployeeId = employeeId.trim();
    const cleanedEmail = email.trim().toLowerCase();

    if (!cleanedFullName) {
      setError("Full name is required.");
      setSaving(false);
      return;
    }

    if (!cleanedEmployeeId) {
      setError("Employee ID is required.");
      setSaving(false);
      return;
    }

    if (!isHcdcEmail(cleanedEmail)) {
      setError("Only @hcdc.edu.ph email accounts are allowed.");
      setSaving(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setSaving(false);
      return;
    }

    if (role === "department_staff" && !departmentId) {
      setError("Please choose the assigned department.");
      setSaving(false);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setError("Your session expired. Please log in again.");
      setSaving(false);
      return;
    }

    const response = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        fullName: cleanedFullName,
        employeeId: cleanedEmployeeId,
        email: cleanedEmail,
        password,
        role,
        departmentId: role === "department_staff" ? departmentId : null,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setError(result.error || "Failed to create account.");
      setSaving(false);
      return;
    }

    setSuccess("Account created successfully.");
    resetForm();
    setSaving(false);
  }

  return (
    <>
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="hcdc-page-title text-3xl md:text-4xl">
            Create Staff/Admin Account
          </h1>
          <p className="mt-1 text-sm hcdc-muted">
            Create department staff or admin accounts using official HCDC email.
          </p>
        </div>

        <Link href="/admin/users" className="btn hcdc-btn-outline">
          Back to Users
        </Link>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success mb-4">
          <span>{success}</span>
        </div>
      )}

      <section className="grid items-start gap-4 lg:grid-cols-3">
        <div className="hcdc-card p-5 lg:col-span-1">
          <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
            Account Policy
          </p>

          <h2 className="mt-2 text-2xl font-black text-black">
            Admin-created accounts only
          </h2>

          <p className="mt-3 text-sm leading-relaxed hcdc-muted">
            Department staff and admin accounts should not be created through
            public registration. Only admins can create these accounts and
            assign department access.
          </p>

          <div className="mt-5 border-l-4 border-[#b00000] bg-gray-50 p-4">
            <p className="text-sm font-black text-black">
              Required email domain
            </p>
            <p className="mt-1 text-sm hcdc-muted">
              Only accounts ending in @hcdc.edu.ph are accepted.
            </p>
          </div>
        </div>

        <div className="hcdc-card p-5 lg:col-span-2">
          <div className="border-b border-gray-200 pb-4">
            <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
              Account Details
            </p>

            <h2 className="mt-2 text-2xl font-black text-black">
              New User Information
            </h2>

            <p className="mt-1 text-sm hcdc-muted">
              Fill out the information for the staff or admin account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-bold">
                  Full Name
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="Example: Juan Dela Cruz"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold">
                  Employee ID
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="Example: EMP-2026-001"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-bold">
                  HCDC Email
                </label>
                <input
                  type="email"
                  className="input input-bordered w-full"
                  placeholder="name@hcdc.edu.ph"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <p className="mt-1 text-xs text-gray-500">
                  Gmail and other personal emails are not allowed.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold">
                  Temporary Password
                </label>
                <input
                  type="password"
                  className="input input-bordered w-full"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-bold">Role</label>
                <select
                  className="select select-bordered w-full"
                  value={role}
                  onChange={(e) => {
                    const selectedRole = e.target.value as UserRole;
                    setRole(selectedRole);

                    if (selectedRole === "admin") {
                      setDepartmentId("");
                    }
                  }}
                >
                  <option value="department_staff">Department Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {role === "department_staff" && (
                <div>
                  <label className="mb-1 block text-sm font-bold">
                    Assigned Department
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    required
                  >
                    <option value="">
                      {loadingDepartments
                        ? "Loading departments..."
                        : "Choose department"}
                    </option>

                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button className="btn hcdc-btn-primary w-full" disabled={saving}>
              {saving ? "Creating account..." : "Create Account"}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
