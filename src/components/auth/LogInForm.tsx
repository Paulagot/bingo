// src/components/auth/LoginForm.tsx
import React, { useState } from 'react';
import { Eye, EyeOff, LogIn, AlertCircle, Sparkles, Building2 } from 'lucide-react';
import { useAuth, useUI, useCreditWarning } from '../../stores/authStore';
import { useLocation, useNavigate } from 'react-router-dom';
import { NoCreditWarningModal } from './NoCreditWarningModal';

interface LoginFormProps {
  onSwitchToRegister?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const [formData, setFormData] = useState({ club: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const { login } = useAuth();
  const { isLoading, error, clearError } = useUI();
  const { showNoCreditWarning, dismissNoCreditWarning } = useCreditWarning();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.club || !formData.email || !formData.password) return;

    try {
      await login({
        club: formData.club.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });

      const params = new URLSearchParams(location.search);
      const returnTo = params.get('returnTo');

      if (!showNoCreditWarning) {
        navigate(returnTo || '/quiz/create-fundraising-quiz', { replace: true });
      }
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) clearError();
  };

  const handleCloseWarning = () => {
    dismissNoCreditWarning();
    const params = new URLSearchParams(location.search);
    const returnTo = params.get('returnTo');
    navigate(returnTo || '/quiz/create-fundraising-quiz', { replace: true });
  };

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-indigo-50 to-white p-4">
        <div className="w-full max-w-md">
          <div className="relative bg-white rounded-2xl p-8 md:p-10 shadow-lg border border-gray-100">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 opacity-40 rounded-2xl" />
            <div className="relative z-10">
              <div className="text-center mb-8">
                <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-2 text-indigo-700 text-sm font-medium mb-4">
                  <Sparkles className="h-4 w-4" /> Fundraising Platform
                </span>

                <h1 className="text-3xl font-bold text-indigo-900 mb-3">Welcome Back</h1>
                <p className="text-indigo-800/70 leading-relaxed">Sign in to your fundraising club</p>
              </div>

              {error && (
                <div className="mb-6 rounded-2xl border border-gray-100 bg-gradient-to-br from-orange-50 to-red-50 p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-white" />
                    </div>
                    <div className="pt-1">
                      <p className="text-sm text-indigo-900 font-medium leading-relaxed">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* ✅ Club */}
                <div>
                  <label htmlFor="club" className="block text-sm font-bold text-indigo-900 mb-2">
                    Club Name (or ID)
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-800/40" />
                    <input
                      type="text"
                      id="club"
                      name="club"
                      value={formData.club}
                      onChange={handleChange}
                      required
                      className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-3 text-indigo-900 placeholder:text-indigo-800/40 shadow-sm transition-all duration-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Your club name"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-bold text-indigo-900 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-indigo-900 placeholder:text-indigo-800/40 shadow-sm transition-all duration-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="your.email@example.com"
                    disabled={isLoading}
                  />
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="password" className="block text-sm font-bold text-indigo-900">
                      Password
                    </label>
                    <a
                      href="/forgot-password"
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors duration-300"
                    >
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-12 text-indigo-900 placeholder:text-indigo-800/40 shadow-sm transition-all duration-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Enter your password"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transform text-indigo-800/60 hover:text-indigo-900 transition-colors duration-300"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading || !formData.club || !formData.email || !formData.password}
                    className="group inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-white font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 w-full justify-center"
                  >
                    {isLoading ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <LogIn className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-8 text-center">
                <p className="text-indigo-800/70">
                  Don't have an account?{' '}
                  <button
                    onClick={onSwitchToRegister}
                    className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors duration-300"
                  >
                    Register your club
                  </button>
                </p>
              </div>
            </div>

            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/0 to-white/5 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          </div>
        </div>
      </div>

      <NoCreditWarningModal isOpen={showNoCreditWarning} onClose={handleCloseWarning} />
    </>
  );
};

export default LoginForm;
