// client/src/components/auth/ConfirmPasswordReset.tsx
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Lock, CheckCircle, AlertCircle } from "lucide-react";

export default function ConfirmPasswordReset() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();

  const token = sp.get("token") || "";
  const [pw, setPw] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pw) return;

    setStatus("sending");
    try {
      const res = await fetch("/api/auth/reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: pw }),
      });
      if (!res.ok) throw new Error("Reset failed");
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }

  // After success, navigate to /auth after a short delay
  useEffect(() => {
    if (status === "ok") {
      const timer = setTimeout(() => {
        navigate("/auth");
      }, 2000); // 2s so they see the success message
      return () => clearTimeout(timer);
    }
  }, [status, navigate]);

  // If token is missing/invalid in URL
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white shadow-lg rounded-2xl p-8 border border-gray-100 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-red-100 mb-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Invalid or missing link
          </h1>
          <p className="text-gray-600 mb-4">
            The password reset link is invalid or has expired. Please request a new one.
          </p>
          <a
            href="/reset-password"
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
          >
            Request a new reset link
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full">
        <div className="relative bg-white rounded-2xl p-8 md:p-10 shadow-lg border border-gray-100">
          {/* Background gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 opacity-40 rounded-2xl" />

          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg mb-4">
                <Lock className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-indigo-900 mb-3">
                Choose a New Password
              </h1>
              <p className="text-indigo-800/70">
                Enter a new password for your account. You&apos;ll be redirected
                to the sign-in page after saving.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-6">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-bold text-indigo-900 mb-2"
                >
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-indigo-900 placeholder:text-indigo-800/40 shadow-sm transition-all duration-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 hover:border-gray-300"
                  placeholder="Enter a new password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  disabled={status === "sending" || status === "ok"}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={status === "sending" || status === "ok"}
                  className="group inline-flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-white font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {status === "sending" ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Saving...</span>
                    </>
                  ) : status === "ok" ? (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      <span>Password updated</span>
                    </>
                  ) : (
                    <span>Set new password</span>
                  )}
                </button>
              </div>

              {status === "ok" && (
                <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-green-50 to-teal-50 p-4 flex items-start gap-3">
                  <div className="mt-1">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-indigo-900">
                      Password updated
                    </p>
                    <p className="text-sm text-indigo-800/70">
                      You&apos;ll be redirected to the sign-in page in a moment…
                    </p>
                  </div>
                </div>
              )}

              {status === "error" && (
                <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-orange-50 to-red-50 p-4 flex items-start gap-3">
                  <div className="mt-1">
                    <AlertCircle className="h-6 w-6 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-indigo-900">
                      Invalid or expired link
                    </p>
                    <p className="text-sm text-indigo-800/70">
                      Please request a new password reset link and try again.
                    </p>
                  </div>
                </div>
              )}
            </form>

            <div className="mt-6 text-center">
              <a
                href="/auth"
                className="text-indigo-600 hover:text-indigo-800 font-medium text-sm transition-colors duration-300"
              >
                ← Back to sign in
              </a>
            </div>
          </div>

          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/0 to-white/5 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}

