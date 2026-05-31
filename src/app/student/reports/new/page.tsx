"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { notifyDepartmentStaff } from "@/lib/notifications";
import { createActivityLog } from "@/lib/activityLogs";

type Department = {
  id: string;
  name: string;
  type: string | null;
};

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function NewReportPage() {
  const router = useRouter();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [urgency, setUrgency] = useState("low");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function fetchDepartments() {
      setPageLoading(true);

      const { data, error } = await supabase
        .from("departments")
        .select("id, name, type")
        .eq("is_active", true)
        .order("type", { ascending: true })
        .order("name", { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setDepartments((data as Department[]) || []);
      }

      setPageLoading(false);
    }

    fetchDepartments();
  }, []);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");

    const file = e.target.files?.[0];

    if (!file) {
      setPhoto(null);
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Only JPG, PNG, and WEBP photos are allowed.");
      e.target.value = "";
      setPhoto(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Photo must be 5MB or smaller.");
      e.target.value = "";
      setPhoto(null);
      return;
    }

    setPhoto(file);
  }

  function getFileExtension(file: File) {
    if (file.type === "image/png") return "png";
    if (file.type === "image/webp") return "webp";
    return "jpg";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("You must be logged in to submit a report.");
      setLoading(false);
      return;
    }

    if (photo) {
      if (!ALLOWED_IMAGE_TYPES.includes(photo.type)) {
        setError("Only JPG, PNG, and WEBP photos are allowed.");
        setLoading(false);
        return;
      }

      if (photo.size > MAX_FILE_SIZE) {
        setError("Photo must be 5MB or smaller.");
        setLoading(false);
        return;
      }
    }

    const { data: reportData, error: insertError } = await supabase
      .from("reports")
      .insert({
        student_id: user.id,
        department_id: departmentId,
        title,
        description,
        category,
        location,
        urgency,
        is_anonymous: isAnonymous,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError || !reportData) {
      setError(insertError?.message || "Failed to submit report.");
      setLoading(false);
      return;
    }

    await createActivityLog({
      reportId: reportData.id,
      action: "report_submitted",
      description: `Student submitted report: ${title}`,
    });

    if (photo) {
      const extension = getFileExtension(photo);
      const filePath = `reports/${user.id}/${reportData.id}-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("report-photos")
        .upload(filePath, photo, {
          contentType: photo.type,
          upsert: false,
        });

      if (uploadError) {
        setError(uploadError.message);
        setLoading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("report-photos")
        .getPublicUrl(filePath);

      const { error: attachmentError } = await supabase
        .from("report_attachments")
        .insert({
          report_id: reportData.id,
          file_url: publicUrlData.publicUrl,
          file_name: photo.name,
          file_type: photo.type,
        });

      if (attachmentError) {
        setError(attachmentError.message);
        setLoading(false);
        return;
      }
    }

    await notifyDepartmentStaff(
      reportData.id,
      `New report submitted: ${title}`,
    );

    setSuccess("Report submitted successfully!");
    setLoading(false);

    setTimeout(() => {
      router.push("/student/reports");
    }, 1000);
  }

  return (
    <>
      <div className="mb-4">
        <h1 className="hcdc-page-title mt-3 text-2xl md:text-3xl">
          Submit a Report
        </h1>
        <p className="mt-1 text-sm hcdc-muted">
          Choose the office, department, program, or laboratory that should
          receive your concern.
        </p>
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

      <div className="hcdc-card p-4 md:p-6">
        {pageLoading ? (
          <p className="text-sm hcdc-muted">Loading form...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-bold text-black">
                Report Title
              </label>
              <input
                type="text"
                className="input input-bordered w-full bg-white text-black"
                placeholder="Example: Broken projector in Room 301"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-black">
                Description
              </label>
              <textarea
                className="textarea textarea-bordered min-h-32 w-full bg-white text-black"
                placeholder="Describe the problem clearly..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-black">
                Send Report To
              </label>
              <select
                className="select select-bordered w-full bg-white text-black"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                required
              >
                <option value="">Choose department / office</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-bold text-black">
                  Category
                </label>
                <select
                  className="select select-bordered w-full bg-white text-black"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  <option value="">Choose category</option>
                  <option value="academic">Academic Concern</option>
                  <option value="facility">Facility Concern</option>
                  <option value="technical">Technical / ICT Concern</option>
                  <option value="security">Security Concern</option>
                  <option value="health">Health / Medical Concern</option>
                  <option value="student_service">
                    Student Service Concern
                  </option>
                  <option value="discipline">Discipline Concern</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-black">
                  Urgency
                </label>
                <select
                  className="select select-bordered w-full bg-white text-black"
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-black">
                Location
              </label>
              <input
                type="text"
                className="input input-bordered w-full bg-white text-black"
                placeholder="Example: Room 301, Library, CCL Lab"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-black">
                Attach Photo Evidence
              </label>
              <input
                type="file"
                className="file-input file-input-bordered w-full bg-white text-black"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
              />

              <p className="mt-2 text-sm hcdc-muted">
                Only JPG, PNG, or WEBP photos are allowed. Maximum size: 5MB.
              </p>

              {photo && (
                <p className="mt-2 text-sm text-black">
                  Selected photo: <strong>{photo.name}</strong>
                </p>
              )}
            </div>

            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                className="checkbox checkbox-primary"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
              />
              <span className="text-sm text-black">
                Submit as anonymous report
              </span>
            </label>

            <button className="btn hcdc-btn-primary w-full" disabled={loading}>
              {loading ? "Submitting..." : "Submit Report"}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
