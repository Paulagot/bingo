// client/src/components/auth/RequestPasswordReset.tsx
import { useState } from 'react';
import { Mail, Send, CheckCircle, AlertCircle, Lock } from 'lucide-react';

export default function RequestPasswordReset() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    try {
      await fetch('/api/auth/reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, captchaToken: 'TODO' }),
      });
      setStatus('done');
      setTimeout(() => setStatus('idle'), 8000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12"
      style={{ background: '#f6f1e8' }}>
      <div className="w-full max-w-md">

        {/* Brand mark */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl shadow-sm mb-4"
            style={{ background: '#157f85' }}>
            <Lock className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#102532' }}>Reset Your Password</h1>
          <p className="text-sm" style={{ color: '#52636f' }}>
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl shadow-sm p-8" style={{ background: '#ffffff', border: '1px solid #dce1df' }}>
          <form onSubmit={submit} className="space-y-4">

            <div>
              <label htmlFor="email" className="block text-sm font-semibold mb-1.5" style={{ color: '#102532' }}>
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                  style={{ color: '#8a9bab' }} />
                <input id="email" type="email" required placeholder="your.email@example.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  disabled={status === 'sending' || status === 'done'}
                  className="w-full rounded-lg border pl-9 pr-4 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-[#157f85] focus:border-transparent hover:border-[#b8c6b0] disabled:opacity-50 border-[#dce1df] bg-white text-[#102532] placeholder:text-[#8a9bab]" />
              </div>
            </div>

            <button type="submit" disabled={status === 'sending' || status === 'done'}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#157f85' }}>
              {status === 'sending' ? (
                <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Sending…</>
              ) : status === 'done' ? (
                <><CheckCircle className="h-4 w-4" />Link Sent</>
              ) : (
                <><Send className="h-4 w-4" />Send Reset Link</>
              )}
            </button>

            {/* Success */}
            {status === 'done' && (
              <div className="flex items-start gap-3 rounded-lg border px-4 py-3"
                style={{ background: '#f0fdf4', borderColor: '#86efac' }}>
                <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-green-600" />
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#166534' }}>Check your email</p>
                  <p className="text-xs mt-0.5" style={{ color: '#15803d' }}>
                    If an account exists with this address, you'll receive a reset link shortly.
                    Check your inbox and spam folder.
                  </p>
                </div>
              </div>
            )}

            {/* Error */}
            {status === 'error' && (
              <div className="flex items-start gap-3 rounded-lg border px-4 py-3"
                style={{ background: '#fef2f2', borderColor: '#fca5a5' }}>
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-500" />
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#991b1b' }}>Something went wrong</p>
                  <p className="text-xs mt-0.5" style={{ color: '#dc2626' }}>
                    We couldn't process your request. Please try again or contact support.
                  </p>
                </div>
              </div>
            )}
          </form>

          <div className="mt-6 text-center">
            <a href="/auth" className="text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: '#157f85' }}>
              ← Back to sign in
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
