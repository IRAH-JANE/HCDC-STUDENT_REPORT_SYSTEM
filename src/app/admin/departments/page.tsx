"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Department = {
  id: string;
  name: string;
  description: string | null;
  type: string | null;
  is_active: boolean | null;
  created_at: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function formatType(value: string | null) {
  if (!value) return "Office";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function typeBadgeClass(type: string | null) {
  if (type === "executive") return "border-red-200 bg-red-50 text-[#b00000]";
  if (type === "center") return "border-blue-200 bg-blue-50 text-blue-800";
  if (type === "program") return "border-green-200 bg-green-50 text-green-800";
  if (type === "laboratory")
    return "border-yellow-200 bg-yellow-50 text-yellow-800";

  return "border-gray-300 bg-white text-gray-800";
}

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("office");

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

  async function fetchDepartments() {
    setLoading(true);
    setError("");

    const isAdmin = await checkAdmin();

    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("departments")
      .select("id, name, description, type, is_active, created_at")
      .order("name", { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setDepartments((data as Department[]) || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeModal();
      }
    }

    if (modalOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [modalOpen]);

  const activeCount = departments.filter((dept) => dept.is_active).length;
  const inactiveCount = departments.filter((dept) => !dept.is_active).length;

  const filteredDepartments = useMemo(() => {
    const value = search.toLowerCase().trim();

    return departments.filter((dept) => {
      const matchesSearch =
        dept.name.toLowerCase().includes(value) ||
        (dept.description || "").toLowerCase().includes(value) ||
        (dept.type || "").toLowerCase().includes(value);

      const matchesType =
        typeFilter === "all" || (dept.type || "office") === typeFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && dept.is_active) ||
        (statusFilter === "inactive" && !dept.is_active);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [departments, search, typeFilter, statusFilter]);

  function resetForm() {
    setName("");
    setDescription("");
    setType("office");
    setEditingId(null);
    setModalError("");
  }

  function openAddModal() {
    resetForm();
    setSuccess("");
    setError("");
    setModalOpen(true);
  }

  function openEditModal(dept: Department) {
    setEditingId(dept.id);
    setName(dept.name);
    setDescription(dept.description || "");
    setType(dept.type || "office");
    setSuccess("");
    setError("");
    setModalError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSaving(false);
    resetForm();
  }

  function clearFilters() {
    setSearch("");
    setTypeFilter("all");
    setStatusFilter("all");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);
    setModalError("");
    setSuccess("");

    const cleanedName = name.trim();
    const cleanedDescription = description.trim();

    if (!cleanedName) {
      setModalError("Department name is required.");
      setSaving(false);
      return;
    }

    const payload = {
      name: cleanedName,
      description: cleanedDescription || null,
      type,
    };

    if (editingId) {
      const { error } = await supabase
        .from("departments")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        setModalError(error.message);
        setSaving(false);
        return;
      }

      setSuccess("Department updated successfully.");
    } else {
      const { error } = await supabase.from("departments").insert({
        ...payload,
        is_active: true,
      });

      if (error) {
        setModalError(error.message);
        setSaving(false);
        return;
      }

      setSuccess("Department added successfully.");
    }

    await fetchDepartments();
    closeModal();
  }

  async function toggleActive(dept: Department) {
    setError("");
    setSuccess("");

    const { error } = await supabase
      .from("departments")
      .update({
        is_active: !dept.is_active,
      })
      .eq("id", dept.id);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(
      dept.is_active
        ? "Department deactivated successfully."
        : "Department activated successfully.",
    );

    await fetchDepartments();
  }

  return (
    <>
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="hcdc-page-title text-3xl md:text-4xl">
            Manage Departments
          </h1>

          <p className="mt-1 text-sm hcdc-muted">
            Add, edit, activate, or deactivate offices, departments, programs,
            and laboratories.
          </p>
        </div>

        <button onClick={openAddModal} className="btn hcdc-btn-primary">
          Add Department
        </button>
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

      <section className="mb-4 grid gap-3 md:grid-cols-3">
        <div className="hcdc-card p-5">
          <p className="text-sm font-bold text-gray-600">Total Departments</p>
          <p className="mt-2 text-4xl font-black text-black">
            {loading ? "..." : departments.length}
          </p>
        </div>

        <div className="hcdc-card p-5">
          <p className="text-sm font-bold text-gray-600">Active</p>
          <p className="mt-2 text-4xl font-black text-black">
            {loading ? "..." : activeCount}
          </p>
        </div>

        <div className="hcdc-card p-5">
          <p className="text-sm font-bold text-gray-600">Inactive</p>
          <p className="mt-2 text-4xl font-black text-black">
            {loading ? "..." : inactiveCount}
          </p>
        </div>
      </section>

      <section className="mb-4 hcdc-card p-5">
        <div className="border-b border-gray-200 pb-4">
          <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
            Filters
          </p>

          <h2 className="mt-2 text-2xl font-black text-black">
            Find Departments
          </h2>

          <p className="mt-1 text-sm hcdc-muted">
            Search by department name, type, description, or status.
          </p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="Search departments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="select select-bordered w-full"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="executive">Executive</option>
            <option value="center">Center</option>
            <option value="office">Office</option>
            <option value="dean">Dean</option>
            <option value="program">Program</option>
            <option value="laboratory">Laboratory</option>
          </select>

          <select
            className="select select-bordered w-full"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        <button
          type="button"
          onClick={clearFilters}
          className="btn btn-sm hcdc-btn-outline mt-4"
        >
          Clear Filters
        </button>
      </section>

      <section className="hcdc-card p-5">
        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
              Department List
            </p>

            <h2 className="mt-2 text-2xl font-black text-black">
              Routing Destinations
            </h2>

            <p className="mt-1 text-sm hcdc-muted">
              Showing {filteredDepartments.length} of {departments.length}{" "}
              departments.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchDepartments}
            className="btn hcdc-btn-outline"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-sm hcdc-muted">Loading departments...</p>
        ) : filteredDepartments.length === 0 ? (
          <div className="border border-dashed border-gray-300 p-6 text-center">
            <p className="font-bold text-black">No departments found</p>
            <p className="mt-1 text-sm hcdc-muted">
              Try changing your search or filters.
            </p>

            <button
              onClick={openAddModal}
              className="btn hcdc-btn-primary mt-4"
            >
              Add Department
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="hcdc-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Date Created</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredDepartments.map((dept) => (
                  <tr key={dept.id}>
                    <td>
                      <p className="font-black text-black">{dept.name}</p>
                      <p className="mt-1 max-w-xl text-sm text-gray-600">
                        {dept.description || "No description provided."}
                      </p>
                    </td>

                    <td>
                      <span
                        className={`inline-flex border px-2 py-1 text-xs font-black ${typeBadgeClass(
                          dept.type,
                        )}`}
                      >
                        {formatType(dept.type)}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`inline-flex border px-2 py-1 text-xs font-black ${
                          dept.is_active
                            ? "border-green-200 bg-green-50 text-green-800"
                            : "border-red-200 bg-red-50 text-[#b00000]"
                        }`}
                      >
                        {dept.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="whitespace-nowrap">
                      {formatDate(dept.created_at)}
                    </td>

                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn btn-sm hcdc-btn-outline"
                          onClick={() => openEditModal(dept)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className={
                            dept.is_active
                              ? "btn btn-sm hcdc-btn-primary"
                              : "btn btn-sm hcdc-btn-outline"
                          }
                          onClick={() => toggleActive(dept)}
                        >
                          {dept.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={closeModal}
            aria-label="Close department editor"
          />

          <section className="relative z-[81] flex max-h-[94vh] w-full max-w-4xl flex-col border border-gray-300 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
                  Department Editor
                </p>

                <h2 className="mt-1 text-2xl font-black text-black">
                  {editingId ? "Edit Department" : "Add Department"}
                </h2>

                <p className="mt-1 text-sm hcdc-muted">
                  {editingId
                    ? "Update the selected routing destination."
                    : "Create a new routing destination for student reports."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="btn btn-sm hcdc-btn-outline"
              >
                Close
              </button>
            </div>

            <div className="overflow-y-auto p-5 md:p-6">
              {modalError && (
                <div className="alert alert-error mb-4">
                  <span>{modalError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <section className="border border-gray-200 bg-white p-5">
                  <div className="grid gap-4 md:grid-cols-1">
                    <div>
                      <label className="mb-1 block text-sm font-bold">
                        Department / Office Name
                      </label>

                      <input
                        type="text"
                        className="input input-bordered w-full"
                        placeholder="Example: Office: ICT"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="md:col-span-1">
                      <label className="mb-1 block text-sm font-bold">
                        Description
                      </label>

                      <textarea
                        className="textarea textarea-bordered min-h-20 w-full"
                        placeholder="Short description of this department or office"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-bold">
                        Type
                      </label>

                      <select
                        className="select select-bordered w-full"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                      >
                        <option value="executive">Executive</option>
                        <option value="center">Center</option>
                        <option value="office">Office</option>
                        <option value="dean">Dean</option>
                        <option value="program">Program</option>
                        <option value="laboratory">Laboratory</option>
                      </select>
                    </div>
                  </div>
                </section>

                <div className="border-l-4 border-[#b00000] bg-gray-50 p-3">
                  <p className="text-sm font-black text-black">Reminder</p>
                  <p className="mt-1 text-sm hcdc-muted">
                    Departments and offices are used as routing destinations for
                    student reports. Use clear names so students and staff can
                    choose the correct destination.
                  </p>
                </div>

                <div className="flex justify-end gap-2 border-t border-gray-200 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="btn hcdc-btn-outline"
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button className="btn hcdc-btn-primary" disabled={saving}>
                    {saving
                      ? "Saving..."
                      : editingId
                        ? "Save Changes"
                        : "Add Department"}
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
