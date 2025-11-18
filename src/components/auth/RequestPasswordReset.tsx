// client/src/components/auth/RequestPasswordReset.tsx
import { useState } from "react";
import { Mail, Send, CheckCircle, AlertCircle, Lock } from "lucide-react";

export default function RequestPasswordReset() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle"|"sending"|"done"|"error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      await fetch("/api/auth/reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, captchaToken: "TODO" }),
      });
      setStatus("done"); // always OK (no enumeration)
      setTimeout(() => setStatus("idle"), 8000);
    } catch { 
      setStatus("error");
      setTimeout(() => setStatus("idle"), 5000);
    }
  }

  return (
    <div className="px-4 py-12">
      <div className="container mx-auto max-w-md">
        {/* Main Card Container */}
        <div className="relative bg-white rounded-2xl p-8 md:p-10 shadow-lg border border-gray-100">
          {/* Background gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 opacity-40 rounded-2xl" />
          
          {/* Content */}
          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-8">
              {/* Icon */}
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg mb-4">
                <Lock className="h-8 w-8 text-white" />
              </div>
              
              <h2 className="text-3xl font-bold text-indigo-900 mb-3">Reset Your Password</h2>
              <p className="text-indigo-800/70 leading-relaxed">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-6">
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-indigo-900 mb-2">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-indigo-800/40" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white pl-12 pr-4 py-3 text-indigo-900 placeholder:text-indigo-800/40 shadow-sm transition-all duration-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 hover:border-gray-300"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={status === "sending" || status === "done"}
                  />
                </div>
              </div>

              {/* Turnstile placeholder */}
              {/* <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-indigo-50 to-blue-50 opacity-50 p-4">
                <p className="text-sm text-indigo-800/70 text-center">
                  🔒 Cloudflare Turnstile verification will appear here
                </p>
              </div> */}

              {/* Submit Button */}
              <div className="text-center pt-2">
                <button
                  type="submit"
                  disabled={status === "sending" || status === "done"}
                  className="group inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-white font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 w-full justify-center"
                >
                  {status === "sending" ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Sending...</span>
                    </>
                  ) : status === "done" ? (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      <span>Link Sent</span>
                    </>
                  ) : (
                    <>
                      <span>Send Reset Link</span>
                      <Send className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                    </>
                  )}
                </button>
              </div>

              {/* Success Message */}
              {status === "done" && (
                <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-green-50 to-teal-50 p-6 shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-teal-500 shadow-lg flex-shrink-0">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-indigo-900 mb-2">Check Your Email</h4>
                      <p className="text-sm text-indigo-800/70 leading-relaxed">
                        If an account exists with this email address, you'll receive a password reset link shortly. Please check your inbox and spam folder.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {status === "error" && (
                <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-orange-50 to-red-50 p-6 shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg flex-shrink-0">
                      <AlertCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-indigo-900 mb-2">Something Went Wrong</h4>
                      <p className="text-sm text-indigo-800/70 leading-relaxed">
                        We couldn't process your request. Please try again or contact support if the problem persists.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </form>

            {/* Back to login link */}
            <div className="mt-6 text-center">
              <a 
                href="/login" 
                className="text-indigo-600 hover:text-indigo-800 font-medium text-sm transition-colors duration-300"
              >
                ← Back to login
              </a>
            </div>
          </div>

          {/* Hover effect overlay */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/0 to-white/5 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
