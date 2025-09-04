// client/src/components/auth/LoginForm.tsx
import React, { useState } from 'react';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useAuth, useUI } from '../../stores/authStore';
import { useLocation, useNavigate } from 'react-router-dom';

interface LoginFormProps {
  onSwitchToRegister?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  // ✅ hooks must be inside the component
  const navigate = useNavigate();
  const location = useLocation();

  const { login } = useAuth();
  const { isLoading, error, clearError } = useUI();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) return;

    try {
      // ✅ your store expects a single object with both fields
      await login({ email: formData.email, password: formData.password });

      // ✅ redirect after success
      const params = new URLSearchParams(location.search);
      const returnTo = params.get('returnTo');
      navigate(returnTo || '/quiz', { replace: true });
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) clearError();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-muted w-full max-w-md rounded-xl p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-fg mb-2 text-3xl font-bold">Welcome Back</h1>
          <p className="text-fg/70">Sign in to your fundraising club</p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="text-fg/80 mb-2 block text-sm font-medium">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-transparent focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="text-fg/80 mb-2 block text-sm font-medium">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 transition-colors focus:border-transparent focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-fg/60 hover:text-fg/80 absolute right-3 top-1/2 -translate-y-1/2 transform"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !formData.email || !formData.password}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-blue-400"
          >
            {isLoading ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Signing in...
              </>
            ) : (
              <>
                <LogIn className="h-5 w-5" />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-fg/70">
            Don't have an account?{' '}
            <button onClick={onSwitchToRegister} className="font-semibold text-blue-600 hover:text-blue-700">
              Register your club
            </button>
          </p>
        </div>

        <div className="border-border mt-6 border-t pt-6">
          <div className="text-center">
            <h3 className="text-fg mb-3 text-sm font-medium">Test Account</h3>
            <div className="text-fg/70 space-y-1 text-xs">
              <p>Email: test@example.com</p>
              <p>Password: password123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
