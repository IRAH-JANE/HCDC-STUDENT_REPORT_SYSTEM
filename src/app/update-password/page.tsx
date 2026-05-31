"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function UpdatePasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [checking, setChecking] = useState(true);
  const [canUpdate, setCanUpdate] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        setCanUpdate(true);
      }

      setChecking(false);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setCanUpdate(true);
        setChecking(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess("Password updated successfully. Please login again.");

    await supabase.auth.signOut();

    setTimeout(() => {
      router.push("/login");
    }, 1200);

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
            Create a New Password
          </h1>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-600">
            Enter a new password for your account. After updating, you will be
            asked to login again.
          </p>

          <div className="mt-6 border-l-4 border-[#b00000] bg-white p-4">
            <p className="text-sm font-bold text-black">Password rule</p>
            <p className="mt-1 text-sm text-gray-600">
              Use at least 6 characters.
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
              Update Password
            </h1>

            <p className="mt-1 text-sm hcdc-muted">
              Set a new password for your account.
            </p>
          </div>

          {checking ? (
            <div className="mt-6 text-center">
              <span className="loading loading-spinner loading-md"></span>
              <p className="mt-3 text-sm hcdc-muted">
                Checking reset session...
              </p>
            </div>
          ) : !canUpdate ? (
            <div className="mt-6">
              <div className="alert alert-error">
                <span>
                  Reset session not found. Please open the password reset link
                  from your email again.
                </span>
              </div>

              <Link
                href="/forgot-password"
                className="btn hcdc-btn-primary mt-4 w-full"
              >
                Request New Reset Link
              </Link>
            </div>
          ) : (
            <>
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

              <form onSubmit={handleUpdatePassword} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-bold">
                    New Password
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

                <div>
                  <label className="mb-1 block text-sm font-bold">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    className="input input-bordered w-full"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>

                <button
                  className="btn hcdc-btn-primary w-full"
                  disabled={loading}
                >
                  {loading ? "Updating password..." : "Update Password"}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
