/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

function isHcdcEmail(email: string) {
  return email.trim().toLowerCase().endsWith("@hcdc.edu.ph");
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("verified") === "true") {
      setNotice("Email verified successfully. You may now log in.");
    }

    if (params.get("registered") === "true") {
      setNotice("Please check your HCDC email to verify your account.");
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setNotice("");

    const cleanedEmail = email.trim().toLowerCase();

    if (!isHcdcEmail(cleanedEmail)) {
      setError(
        "Only official HCDC email accounts ending in @hcdc.edu.ph are allowed.",
      );
      setLoading(false);
      return;
    }

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: cleanedEmail,
      password,
    });

    if (loginError) {
      const message = loginError.message.toLowerCase();

      if (message.includes("email not confirmed")) {
        setError(
          "Please verify your HCDC email first. Check your inbox for the confirmation link.",
        );
      } else {
        setError(loginError.message);
      }

      setLoading(false);
      return;
    }

    const user = data.user;

    if (!user) {
      setError("Login failed. Please try again.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      setError(
        "Profile not found. Please contact the system admin or try again later.",
      );
      setLoading(false);
      return;
    }

    if (profile.role === "student") {
      router.push("/student/dashboard");
    } else if (profile.role === "department_staff") {
      router.push("/department/dashboard");
    } else if (profile.role === "admin") {
      router.push("/admin/dashboard");
    } else {
      setError("Invalid user role.");
      setLoading(false);
      return;
    }

    router.refresh();
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#f4f4f4] px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-2">
        <section className="hidden lg:block">
          <p className="text-xs font-black uppercase tracking-wide text-[#b00000]">
            Holy Cross of Davao College
          </p>

          <h1 className="mt-3 text-4xl font-black leading-tight text-black">
            Student Concern Reporting System
          </h1>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-600">
            Access your dashboard using your verified official HCDC email.
            Students can submit concerns, department staff can respond to
            assigned reports, and admins can monitor the system.
          </p>

          <div className="mt-6 border-l-4 border-[#b00000] bg-white p-4">
            <p className="text-sm font-bold text-black">Login policy</p>
            <p className="mt-1 text-sm text-gray-600">
              Your HCDC email must be verified before accessing the system.
            </p>
          </div>
        </section>

        <section className="hcdc-card mx-auto w-full max-w-md p-6 md:p-8">
          <div className="text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-gray-200 bg-white">
              <img
                src="/hcdc-logo.png"
                alt="HCDC Logo"
                className="h-20 w-20 object-contain"
              />
            </div>

            <h1 className="mt-5 text-2xl font-black text-black">Login</h1>

            <p className="mt-1 text-sm hcdc-muted">
              Access your reporting dashboard.
            </p>
          </div>

          {notice && (
            <div className="alert alert-success mt-5">
              <span>{notice}</span>
            </div>
          )}

          {error && (
            <div className="alert alert-error mt-5">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-bold">HCDC Email</label>
              <input
                type="email"
                className="input input-bordered w-full"
                placeholder="yourname@hcdc.edu.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <p className="mt-1 text-xs text-gray-500">
                Use your verified official HCDC email account only.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold">Password</label>
              <input
                type="password"
                className="input input-bordered w-full"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <div className="mt-2 text-right">
                <Link
                  href="/forgot-password"
                  className="text-sm font-bold text-[#b00000] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <button className="btn hcdc-btn-primary w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-600">
            No account yet?{" "}
            <Link
              href="/register"
              className="font-bold text-[#b00000] hover:underline"
            >
              Register
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
