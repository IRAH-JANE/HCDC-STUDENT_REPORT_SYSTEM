"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

function isHcdcEmail(email: string) {
  return email.trim().toLowerCase().endsWith("@hcdc.edu.ph");
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    const cleanedEmail = email.trim().toLowerCase();

    if (!isHcdcEmail(cleanedEmail)) {
      setError(
        "Only official HCDC email accounts ending in @hcdc.edu.ph are allowed.",
      );
      setLoading(false);
      return;
    }

    const redirectTo = `${window.location.origin}/update-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(cleanedEmail, {
      redirectTo,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess("Password reset link sent. Please check your HCDC email.");
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
            Reset Your Password
          </h1>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-600">
            Enter your official HCDC email address. We will send a secure
            password reset link to your account.
          </p>

          <div className="mt-6 border-l-4 border-[#b00000] bg-white p-4">
            <p className="text-sm font-bold text-black">Account policy</p>
            <p className="mt-1 text-sm text-gray-600">
              Only @hcdc.edu.ph email accounts are accepted.
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

            <h1 className="mt-5 text-2xl font-black text-black">
              Forgot Password
            </h1>

            <p className="mt-1 text-sm hcdc-muted">
              Send a reset link to your HCDC email.
            </p>
          </div>

          {error && (
            <div className="alert alert-error mt-5">
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success mt-5">
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleReset} className="mt-6 space-y-4">
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
                Use your official HCDC email account only.
              </p>
            </div>

            <button className="btn hcdc-btn-primary w-full" disabled={loading}>
              {loading ? "Sending reset link..." : "Send Reset Link"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-600">
            Remember your password?{" "}
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
