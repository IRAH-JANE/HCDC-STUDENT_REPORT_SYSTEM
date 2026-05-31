/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

function isHcdcEmail(email: string) {
  return email.trim().toLowerCase().endsWith("@hcdc.edu.ph");
}

function looksLikeEmail(value: string) {
  return value.includes("@");
}

function isValidStudentId(value: string) {
  return /^\d{1,8}$/.test(value);
}

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [course, setCourse] = useState("");
  const [academicDepartment, setAcademicDepartment] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function checkDuplicateRegistration(
    cleanedEmail: string,
    cleanedStudentId: string,
  ) {
    const response = await fetch("/api/auth/check-student-registration", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: cleanedEmail,
        studentId: cleanedStudentId,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Unable to check registration details.");
    }

    return result as {
      exists: boolean;
      field?: "email" | "studentId";
      message?: string;
    };
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    const cleanedFullName = fullName.trim();
    const cleanedStudentId = studentId.trim();
    const cleanedCourse = course.trim();
    const cleanedAcademicDepartment = academicDepartment.trim();
    const cleanedGender = gender.trim();
    const cleanedEmail = email.trim().toLowerCase();

    if (!cleanedFullName) {
      setError("Full name is required.");
      setLoading(false);
      return;
    }

    if (looksLikeEmail(cleanedFullName)) {
      setError("Please enter your real full name, not your email address.");
      setLoading(false);
      return;
    }

    if (!cleanedStudentId) {
      setError("Student ID number is required.");
      setLoading(false);
      return;
    }

    if (!isValidStudentId(cleanedStudentId)) {
      setError("Student ID must contain numbers only, maximum of 8 digits.");
      setLoading(false);
      return;
    }

    if (!cleanedCourse) {
      setError("Course is required.");
      setLoading(false);
      return;
    }

    if (!cleanedAcademicDepartment) {
      setError("Department / College is required.");
      setLoading(false);
      return;
    }

    if (!cleanedGender) {
      setError("Gender is required.");
      setLoading(false);
      return;
    }

    if (!isHcdcEmail(cleanedEmail)) {
      setError(
        "Only official HCDC email accounts ending in @hcdc.edu.ph are allowed.",
      );
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    try {
      const duplicateResult = await checkDuplicateRegistration(
        cleanedEmail,
        cleanedStudentId,
      );

      if (duplicateResult.exists) {
        setError(
          duplicateResult.message ||
            "This account is already registered. Please login instead.",
        );
        setLoading(false);
        return;
      }

      const emailRedirectTo = `${window.location.origin}/login?verified=true`;

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanedEmail,
        password,
        options: {
          emailRedirectTo,
          data: {
            account_source: "student_register",
            full_name: cleanedFullName,
            id_number: cleanedStudentId,
            course: cleanedCourse,
            academic_department: cleanedAcademicDepartment,
            gender: cleanedGender,
          },
        },
      });

      if (signUpError) {
        const message = signUpError.message.toLowerCase();

        if (
          message.includes("already") ||
          message.includes("registered") ||
          message.includes("exists")
        ) {
          setError(
            "This HCDC email is already registered. Please login instead.",
          );
        } else {
          setError(signUpError.message);
        }

        setLoading(false);
        return;
      }

      if (!data.user) {
        setError("Registration failed. Please try again.");
        setLoading(false);
        return;
      }

      await supabase.auth.signOut();

      setSuccess(
        "Account created. Please check your HCDC email and verify your account before logging in.",
      );

      setFullName("");
      setStudentId("");
      setCourse("");
      setAcademicDepartment("");
      setGender("");
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Registration failed. Please check your connection and try again.",
      );
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen overflow-y-auto bg-[#f4f4f4] px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-2">
        <section className="hidden lg:block">
          <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
            Holy Cross of Davao College
          </p>

          <h1 className="mt-3 text-4xl font-black leading-tight text-black">
            Student Concern Reporting System
          </h1>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-600">
            Create your student account using your official HCDC email. After
            registration, verify your email before accessing the dashboard.
          </p>

          <div className="mt-6 border-l-4 border-[#b00000] bg-white p-4">
            <p className="text-sm font-bold text-black">Registration policy</p>
            <p className="mt-1 text-sm text-gray-600">
              Only HCDC email accounts ending in @hcdc.edu.ph are accepted.
              Personal Gmail accounts are not allowed.
            </p>
          </div>
        </section>

        <section className="hcdc-card mx-auto w-full max-w-2xl p-5 md:p-6">
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-gray-200 bg-white">
              <img
                src="/hcdc-logo.png"
                alt="HCDC Logo"
                className="h-16 w-16 object-contain"
              />
            </div>

            <h1 className="mt-3 text-2xl font-black text-black">
              Create Student Account
            </h1>

            <p className="mt-1 text-sm hcdc-muted">
              Complete your student information.
            </p>
          </div>

          {error && (
            <div className="alert alert-error mt-4 py-2 text-sm">
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success mt-4 py-2 text-sm">
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-bold">Full Name</label>
              <input
                type="text"
                className="input input-bordered h-10 w-full"
                placeholder="Example: Juan Dela Cruz"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-bold">
                  Student ID Number
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  className="input input-bordered h-10 w-full"
                  placeholder="Example: 59833402"
                  value={studentId}
                  onChange={(e) => {
                    const numbersOnly = e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 8);

                    setStudentId(numbersOnly);
                  }}
                  required
                />

                <p className="mt-1 text-xs text-gray-500">
                  Numbers only. Maximum of 8 digits.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold">Gender</label>

                <select
                  className="select select-bordered h-10 min-h-10 w-full"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  required
                >
                  <option value="">Choose gender</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-bold">Course</label>

                <input
                  type="text"
                  className="input input-bordered h-10 w-full"
                  placeholder="Example: BSIT, BSCS, BSA"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold">
                  Department / College
                </label>

                <input
                  type="text"
                  className="input input-bordered h-10 w-full"
                  placeholder="Example: CET"
                  value={academicDepartment}
                  onChange={(e) => setAcademicDepartment(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold">HCDC Email</label>

              <input
                type="email"
                className="input input-bordered h-10 w-full"
                placeholder="yourname@hcdc.edu.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <p className="mt-1 text-xs text-gray-500">
                Only @hcdc.edu.ph email accounts are allowed.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold">Password</label>

              <input
                type="password"
                className="input input-bordered h-10 w-full"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <button
              className="btn hcdc-btn-primary min-h-10 w-full"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Register"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600">
            Already registered?{" "}
            <Link
              href="/login"
              className="font-bold text-[#b00000] hover:underline"
            >
              Login
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
