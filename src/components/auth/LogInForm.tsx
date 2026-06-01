// src/components/auth/LoginForm.tsx
import React, { useState } from 'react';
import { Eye, EyeOff, LogIn, AlertCircle, Building2, Mail, Lock } from 'lucide-react';
import { useAuth, useAuthUI, useCreditWarning } from '@features/auth';
import { useLocation, useNavigate } from 'react-router-dom';
import { NoCreditWarningModal } from './NoCreditWarningModal';

interface LoginFormProps {
  onSwitchToRegister?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const [formData, setFormData] = useState({ club: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const navigate  = useNavigate();
  const location  = useLocation();

  const { login } = useAuth();
  const { isLoading, error, clearError } = useAuthUI();
  const { showNoCreditWarning, dismissNoCreditWarning } = useCreditWarning();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.club || !formData.email || !formData.password) return;
    try {
      await login({
        club:     formData.club.trim(),
        email:    formData.email.trim(),
        password: formData.password,
      });
      const params   = new URLSearchParams(location.search);
      const returnTo = params.get('returnTo');
      if (!showNoCreditWarning) navigate(returnTo || '/quiz/eventdashboard', { replace: true });
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) clearError();
  };

  const handleCloseWarning = () => {
    dismissNoCreditWarning();
    const params   = new URLSearchParams(location.search);
    const returnTo = params.get('returnTo');
    navigate(returnTo || '/quiz/eventdashboard', { replace: true });
  };

  const inputCls = (hasVal?: boolean) =>
    `w-full rounded-lg border px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-[#157f85] focus:border-transparent hover:border-[#b8c6b0] disabled:opacity-50 disabled:cursor-not-allowed`
    + ' border-[#dce1df] bg-white text-[#102532] placeholder:text-[#8a9bab]';

  return (
    <>
      <div className="flex min-h-screen items-center justify-center p-4"
        style={{ background: '#f6f1e8' }}>
        <div className="w-full max-w-md">

          {/* Brand mark */}
          <div className="text-center mb-8">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl shadow-sm mb-4"
              style={{ background: '#157f85' }}>
              <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-white" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: '#102532' }}>Welcome back</h1>
            <p className="text-sm" style={{ color: '#52636f' }}>Sign in to your fundraising club</p>
          </div>

          {/* Card */}
          <div className="rounded-xl shadow-sm p-8" style={{ background: '#ffffff', border: '1px solid #dce1df' }}>

            {/* Error */}
            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-lg border px-4 py-3"
                style={{ background: '#fef2f2', borderColor: '#fca5a5' }}>
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-500" />
                <p className="text-sm" style={{ color: '#dc2626' }}>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Club */}
              <div>
                <label htmlFor="club" className="block text-sm font-semibold mb-1.5" style={{ color: '#102532' }}>
                  Club Name (or ID)
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: '#8a9bab' }} />
                  <input type="text" id="club" name="club" value={formData.club}
                    onChange={handleChange} required placeholder="Your club name"
                    disabled={isLoading} className={`${inputCls()} pl-9`} />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold mb-1.5" style={{ color: '#102532' }}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: '#8a9bab' }} />
                  <input type="email" id="email" name="email" value={formData.email}
                    onChange={handleChange} required placeholder="your.email@example.com"
                    disabled={isLoading} className={`${inputCls()} pl-9`} />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-sm font-semibold" style={{ color: '#102532' }}>
                    Password
                  </label>
                  <a href="/forgot-password" className="text-xs font-medium transition-colors hover:opacity-80"
                    style={{ color: '#157f85' }}>
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: '#8a9bab' }} />
                  <input type={showPassword ? 'text' : 'password'} id="password" name="password"
                    value={formData.password} onChange={handleChange} required
                    placeholder="Enter your password" disabled={isLoading}
                    className={`${inputCls()} pl-9 pr-10`} />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:opacity-80"
                    style={{ color: '#8a9bab' }} tabIndex={-1}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-1">
                <button type="submit"
                  disabled={isLoading || !formData.club || !formData.email || !formData.password}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: '#157f85' }}>
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Signing in…
                    </>
                  ) : (
                    <>Sign In <LogIn className="h-4 w-4" /></>
                  )}
                </button>
              </div>
            </form>

            {/* Switch */}
            <p className="mt-6 text-center text-sm" style={{ color: '#52636f' }}>
              Don't have an account?{' '}
              <button onClick={onSwitchToRegister}
                className="font-semibold transition-colors hover:opacity-80"
                style={{ color: '#157f85' }}>
                Register your club
              </button>
            </p>
          </div>
        </div>
      </div>

      <NoCreditWarningModal isOpen={showNoCreditWarning} onClose={handleCloseWarning} />
    </>
  );
};

export default LoginForm;
