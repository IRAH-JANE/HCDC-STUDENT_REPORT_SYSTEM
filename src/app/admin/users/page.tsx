"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, ShieldCheck, UsersRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import StatCard from "@/components/StatCard";

type UserRole = "student" | "department_staff" | "admin";

type Profile = {
  id: string;
  full_name: string | null;
  role: UserRole;
  department_id: string | null;
  id_number: string | null;
  employee_id: string | null;
  email: string | null;
  course: string | null;
  academic_department: string | null;
  gender: string | null;
  created_at: string;
};

type Department = {
  id: string;
  name: string;
  type: string | null;
  is_active: boolean | null;
};

function formatRole(role: string) {
  if (role === "department_staff") return "Department Staff";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function roleBadgeClass(role: string) {
  if (role === "admin") {
    return "border-[#b00000] bg-red-50 text-[#b00000]";
  }

  if (role === "department_staff") {
    return "border-gray-300 bg-gray-100 text-gray-800";
  }

  return "border-green-200 bg-green-50 text-green-800";
}

function looksLikeEmail(value: string | null | undefined) {
  return !!value && value.includes("@");
}

function isValidStudentId(value: string) {
  return /^\d{1,8}$/.test(value);
}

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [departmentId, setDepartmentId] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [course, setCourse] = useState("");
  const [academicDepartment, setAcademicDepartment] = useState("");
  const [gender, setGender] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [success, setSuccess] = useState("");

  async function checkAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in.");
      return false;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      setError("Only admins can access this page.");
      return false;
    }

    return true;
  }

  async function fetchData() {
    setLoading(true);
    setError("");

    const isAdmin = await checkAdmin();

    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const [profilesResult, departmentsResult] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, full_name, role, department_id, id_number, employee_id, email, course, academic_department, gender, created_at",
        )
        .order("full_name", { ascending: true }),

      supabase
        .from("departments")
        .select("id, name, type, is_active")
        .eq("is_active", true)
        .order("name", { ascending: true }),
    ]);

    if (profilesResult.error) {
      setError(profilesResult.error.message);
    } else {
      setProfiles((profilesResult.data as Profile[]) || []);
    }

    if (departmentsResult.error) {
      setError(departmentsResult.error.message);
    } else {
      setDepartments((departmentsResult.data as Department[]) || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeEditModal();
      }
    }

    if (editModalOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [editModalOpen]);

  function getDepartmentName(id: string | null) {
    if (!id) return "None";
    return departments.find((dept) => dept.id === id)?.name || "Unknown";
  }

  function getDisplayName(profile: Profile) {
    if (profile.full_name && !looksLikeEmail(profile.full_name)) {
      return profile.full_name;
    }

    return "Needs profile update";
  }

  const totalStudents = profiles.filter(
    (profile) => profile.role === "student",
  ).length;

  const totalDepartmentStaff = profiles.filter(
    (profile) => profile.role === "department_staff",
  ).length;

  const totalAdmins = profiles.filter(
    (profile) => profile.role === "admin",
  ).length;

  const assignedStaff = profiles.filter(
    (profile) => profile.role === "department_staff" && profile.department_id,
  ).length;

  const filteredProfiles = useMemo(() => {
    const value = search.toLowerCase().trim();

    return profiles.filter((profile) => {
      const departmentName = getDepartmentName(profile.department_id);
      const displayName = getDisplayName(profile);

      const matchesSearch =
        displayName.toLowerCase().includes(value) ||
        (profile.email || "").toLowerCase().includes(value) ||
        (profile.id_number || "").toLowerCase().includes(value) ||
        (profile.employee_id || "").toLowerCase().includes(value) ||
        (profile.course || "").toLowerCase().includes(value) ||
        (profile.academic_department || "").toLowerCase().includes(value) ||
        profile.role.toLowerCase().includes(value) ||
        departmentName.toLowerCase().includes(value);

      const matchesRole = roleFilter === "all" || profile.role === roleFilter;

      const matchesDepartment =
        departmentFilter === "all" ||
        profile.department_id === departmentFilter;

      return matchesSearch && matchesRole && matchesDepartment;
    });
  }, [profiles, departments, search, roleFilter, departmentFilter]);

  function openEditModal(profile: Profile) {
    setEditingUser(profile);
    setFullName(
      profile.full_name && !looksLikeEmail(profile.full_name)
        ? profile.full_name
        : "",
    );
    setRole(profile.role);
    setDepartmentId(profile.department_id || "");
    setIdNumber(profile.id_number || "");
    setEmployeeId(profile.employee_id || "");
    setCourse(profile.course || "");
    setAcademicDepartment(profile.academic_department || "");
    setGender(profile.gender || "");
    setError("");
    setModalError("");
    setSuccess("");
    setEditModalOpen(true);
  }

  function closeEditModal() {
    setEditModalOpen(false);
    setEditingUser(null);
    setFullName("");
    setRole("student");
    setDepartmentId("");
    setIdNumber("");
    setEmployeeId("");
    setCourse("");
    setAcademicDepartment("");
    setGender("");
    setModalError("");
    setSaving(false);
  }

  function clearFilters() {
    setSearch("");
    setRoleFilter("all");
    setDepartmentFilter("all");
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();

    if (!editingUser) return;

    setSaving(true);
    setModalError("");
    setSuccess("");

    const cleanedFullName = fullName.trim();
    const cleanedIdNumber = idNumber.trim();
    const cleanedEmployeeId = employeeId.trim();
    const cleanedCourse = course.trim();
    const cleanedAcademicDepartment = academicDepartment.trim();
    const cleanedGender = gender.trim();

    if (!cleanedFullName) {
      setModalError("Full name is required.");
      setSaving(false);
      return;
    }

    if (looksLikeEmail(cleanedFullName)) {
      setModalError("Full name cannot be an email address.");
      setSaving(false);
      return;
    }

    if (role === "student" && !cleanedIdNumber) {
      setModalError("Student ID number is required for students.");
      setSaving(false);
      return;
    }

    if (role === "student" && !isValidStudentId(cleanedIdNumber)) {
      setModalError(
        "Student ID must contain numbers only, maximum of 8 digits.",
      );
      setSaving(false);
      return;
    }

    if (role === "student" && !cleanedCourse) {
      setModalError("Course is required for students.");
      setSaving(false);
      return;
    }

    if (role === "student" && !cleanedAcademicDepartment) {
      setModalError("Department / College is required for students.");
      setSaving(false);
      return;
    }

    if (role === "student" && !cleanedGender) {
      setModalError("Gender is required for students.");
      setSaving(false);
      return;
    }

    if (role !== "student" && !cleanedEmployeeId) {
      setModalError("Employee ID is required for staff/admin accounts.");
      setSaving(false);
      return;
    }

    if (role === "department_staff" && !departmentId) {
      setModalError("Please assign a department for department staff.");
      setSaving(false);
      return;
    }

    const payload = {
      full_name: cleanedFullName,
      role,
      department_id: role === "department_staff" ? departmentId : null,
      id_number: role === "student" ? cleanedIdNumber : null,
      employee_id: role === "student" ? null : cleanedEmployeeId,
      course: role === "student" ? cleanedCourse : null,
      academic_department:
        role === "student" ? cleanedAcademicDepartment : null,
      gender: role === "student" ? cleanedGender : null,
    };

    const { error: updateError } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", editingUser.id);

    if (updateError) {
      setModalError(updateError.message);
      setSaving(false);
      return;
    }

    setSuccess("User profile updated successfully.");
    closeEditModal();
    await fetchData();
    setSaving(false);
  }

  return (
    <>
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="hcdc-page-title text-3xl md:text-4xl">Manage Users</h1>
          <p className="mt-1 text-sm hcdc-muted">
            View users, correct profile details, change roles, and assign
            department staff.
          </p>
        </div>

        <Link href="/admin/users/new" className="btn hcdc-btn-primary">
          Create Staff/Admin Account
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

      <section className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Users"
          value={loading ? "..." : profiles.length}
          icon={<UsersRound className="h-6 w-6 text-black" strokeWidth={2.4} />}
        />

        <StatCard
          label="Students"
          value={loading ? "..." : totalStudents}
          icon={<UsersRound className="h-6 w-6 text-black" strokeWidth={2.4} />}
        />

        <StatCard
          label="Department Staff"
          value={loading ? "..." : totalDepartmentStaff}
          icon={<Building2 className="h-6 w-6 text-black" strokeWidth={2.4} />}
        />

        <StatCard
          label="Admins"
          value={loading ? "..." : totalAdmins}
          icon={
            <ShieldCheck className="h-6 w-6 text-black" strokeWidth={2.4} />
          }
        />
      </section>

      <section className="hcdc-card p-5">
        <div className="border-b border-gray-200 pb-4">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
                User List
              </p>

              <h2 className="mt-2 text-2xl font-black text-black">
                System Users
              </h2>

              <p className="mt-1 text-sm hcdc-muted">
                Showing {filteredProfiles.length} of {profiles.length} users.
              </p>
            </div>

            <div className="text-sm hcdc-muted md:text-right">
              <p>
                Assigned staff:{" "}
                <span className="font-black text-black">
                  {loading ? "..." : assignedStaff}
                </span>
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="select select-bordered w-full"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="student">Students</option>
              <option value="department_staff">Department Staff</option>
              <option value="admin">Admins</option>
            </select>

            <select
              className="select select-bordered w-full"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="all">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="btn btn-sm hcdc-btn-outline mt-4"
          >
            Clear Filters
          </button>
        </div>

        <div className="mt-5">
          {loading ? (
            <p className="text-sm hcdc-muted">Loading users...</p>
          ) : filteredProfiles.length === 0 ? (
            <div className="border border-dashed border-gray-300 p-6 text-center">
              <p className="font-bold text-black">No users found</p>
              <p className="mt-1 text-sm hcdc-muted">
                Try changing the search or filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="hcdc-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>ID</th>
                    <th>Role</th>
                    <th>Course / Department</th>
                    <th>Email</th>
                    <th>Date Created</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredProfiles.map((profile) => {
                    const displayName = getDisplayName(profile);
                    const displayId =
                      profile.role === "student"
                        ? profile.id_number || "N/A"
                        : profile.employee_id || "N/A";

                    const displayDepartment =
                      profile.role === "student"
                        ? profile.course || profile.academic_department || "N/A"
                        : getDepartmentName(profile.department_id);

                    return (
                      <tr key={profile.id}>
                        <td>
                          <p className="font-black text-black">{displayName}</p>

                          {profile.full_name &&
                            looksLikeEmail(profile.full_name) && (
                              <p className="mt-1 text-xs font-bold text-[#b00000]">
                                Needs name correction
                              </p>
                            )}
                        </td>

                        <td>{displayId}</td>

                        <td>
                          <span
                            className={`inline-flex border px-2 py-1 text-xs font-black capitalize ${roleBadgeClass(
                              profile.role,
                            )}`}
                          >
                            {formatRole(profile.role)}
                          </span>
                        </td>

                        <td>{displayDepartment}</td>

                        <td className="break-words">
                          {profile.email || "N/A"}
                        </td>

                        <td className="whitespace-nowrap">
                          {formatDate(profile.created_at)}
                        </td>

                        <td>
                          <button
                            type="button"
                            className="btn btn-sm hcdc-btn-outline"
                            onClick={() => openEditModal(profile)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {editModalOpen && editingUser && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={closeEditModal}
            aria-label="Close user editor"
          />

          <section className="relative z-[81] flex max-h-[88vh] w-full max-w-3xl flex-col border border-gray-300 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
                  User Editor
                </p>

                <h2 className="mt-1 text-2xl font-black text-black">
                  Edit Profile
                </h2>

                <p className="mt-1 text-sm hcdc-muted">
                  Update the selected user&apos;s profile information.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditModal}
                className="btn btn-sm hcdc-btn-outline"
              >
                Close
              </button>
            </div>

            <div className="overflow-y-auto p-5">
              {modalError && (
                <div className="alert alert-error mb-4">
                  <span>{modalError}</span>
                </div>
              )}

              <form onSubmit={handleUpdateUser} className="space-y-4">
                <section className="border border-gray-200 bg-white p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-bold">
                        Full Name
                      </label>

                      <input
                        className="input input-bordered w-full"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter real full name"
                        required
                      />

                      {editingUser.full_name &&
                        looksLikeEmail(editingUser.full_name) && (
                          <p className="mt-1 text-xs font-bold text-[#b00000]">
                            This account currently has an email saved as the
                            full name. Please correct it.
                          </p>
                        )}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-bold">
                        Role
                      </label>

                      <select
                        className="select select-bordered w-full"
                        value={role}
                        onChange={(e) => {
                          const selectedRole = e.target.value as UserRole;
                          setRole(selectedRole);

                          if (selectedRole !== "department_staff") {
                            setDepartmentId("");
                          }
                        }}
                      >
                        <option value="student">Student</option>
                        <option value="department_staff">
                          Department Staff
                        </option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-bold">
                        HCDC Email
                      </label>

                      <input
                        className="input input-bordered w-full"
                        value={editingUser.email || "No email saved"}
                        disabled
                      />

                      <p className="mt-1 text-xs text-gray-500">
                        Email login is managed by Supabase Auth.
                      </p>
                    </div>

                    {role === "student" && (
                      <>
                        <div>
                          <label className="mb-1 block text-sm font-bold">
                            Student ID Number
                          </label>

                          <input
                            className="input input-bordered w-full"
                            value={idNumber}
                            maxLength={8}
                            inputMode="numeric"
                            onChange={(e) => {
                              const numbersOnly = e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 8);

                              setIdNumber(numbersOnly);
                            }}
                            required
                          />

                          <p className="mt-1 text-xs text-gray-500">
                            Numbers only. Maximum of 8 digits.
                          </p>
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-bold">
                            Gender
                          </label>

                          <select
                            className="select select-bordered w-full"
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                            required
                          >
                            <option value="">Choose gender</option>
                            <option value="Female">Female</option>
                            <option value="Male">Male</option>
                            <option value="Prefer not to say">
                              Prefer not to say
                            </option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-bold">
                            Course
                          </label>

                          <input
                            className="input input-bordered w-full"
                            value={course}
                            onChange={(e) => setCourse(e.target.value)}
                            placeholder="Example: BSIT"
                            required
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-bold">
                            Department / College
                          </label>

                          <input
                            className="input input-bordered w-full"
                            value={academicDepartment}
                            onChange={(e) =>
                              setAcademicDepartment(e.target.value)
                            }
                            placeholder="Example: CET"
                            required
                          />
                        </div>
                      </>
                    )}

                    {role !== "student" && (
                      <div>
                        <label className="mb-1 block text-sm font-bold">
                          Employee ID
                        </label>

                        <input
                          className="input input-bordered w-full"
                          value={employeeId}
                          onChange={(e) => setEmployeeId(e.target.value)}
                          placeholder="Example: EMP-2026-001"
                          required
                        />
                      </div>
                    )}

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
                          <option value="">Choose department</option>
                          {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </section>

                <div className="border-l-4 border-[#b00000] bg-gray-50 p-4">
                  <p className="text-sm font-black text-black">Reminder</p>
                  <p className="mt-1 text-sm hcdc-muted">
                    Use this editor to correct names, IDs, roles, course,
                    department/college, employee ID, gender, and assigned
                    department. Email login is still controlled by Supabase
                    Auth.
                  </p>
                </div>

                <div className="flex justify-end gap-2 border-t border-gray-200 pt-4">
                  <button
                    type="button"
                    className="btn hcdc-btn-outline"
                    onClick={closeEditModal}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button className="btn hcdc-btn-primary" disabled={saving}>
                    {saving ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
