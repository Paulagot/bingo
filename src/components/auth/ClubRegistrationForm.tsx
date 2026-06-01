// client/src/components/auth/ClubRegistrationForm.tsx
import React, { useState, useCallback } from 'react';
import {
  Users, User, Mail, Lock, Eye, EyeOff,
  CheckCircle, AlertCircle, DollarSign,
} from 'lucide-react';
import { useAuth, useAuthUI } from '@/features/auth';
import { useLocation } from 'react-router-dom';
import CurrencySelect from '../mgtsystem/shared/CurrencySelect';
import { currencyISO } from '@/services/currency';

interface ClubRegisterFormProps {
  onSwitchToLogin?: () => void;
}

// ── InputField ────────────────────────────────────────────────────────────────
interface InputFieldProps {
  label: string; name: string; type?: string; icon: React.ElementType;
  placeholder: string; autoComplete?: string; showToggle?: boolean;
  showPassword?: boolean; onToggleShow?: () => void; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void; error?: string; touched?: boolean; disabled?: boolean;
}

const inputBase = (hasError?: boolean) =>
  `w-full rounded-lg border pl-10 pr-4 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-[#157f85] focus:border-transparent hover:border-[#b8c6b0] disabled:opacity-50 disabled:cursor-not-allowed text-[#102532] placeholder:text-[#8a9bab] bg-white ${
    hasError ? 'border-[#e9574f] bg-red-50' : 'border-[#dce1df]'
  }`;

const InputField = React.memo(({
  label, name, type = 'text', icon: Icon, placeholder, autoComplete,
  showToggle = false, showPassword: isPasswordVisible = false,
  onToggleShow, value, onChange, onBlur, error, touched, disabled,
}: InputFieldProps) => (
  <div>
    <label htmlFor={name} className="block text-sm font-semibold mb-1.5" style={{ color: '#102532' }}>
      {label} <span style={{ color: '#e9574f' }}>*</span>
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Icon className="h-4 w-4" style={{ color: '#8a9bab' }} />
      </div>
      <input
        type={showToggle ? (isPasswordVisible ? 'text' : 'password') : type}
        id={name} name={name} autoComplete={autoComplete}
        value={value} onChange={onChange} onBlur={onBlur}
        placeholder={placeholder} disabled={disabled}
        className={`${inputBase(!!(error && touched))} ${showToggle ? 'pr-10' : ''}`}
      />
      {showToggle && onToggleShow && (
        <button type="button" onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
          style={{ color: '#8a9bab' }} tabIndex={-1}>
          {isPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      )}
    </div>
    {error && touched && (
      <p className="mt-1.5 flex items-center gap-1 text-xs" style={{ color: '#e9574f' }}>
        <AlertCircle className="h-3 w-3 flex-shrink-0" />{error}
      </p>
    )}
  </div>
));

// ── GDPRCheckbox ──────────────────────────────────────────────────────────────
interface GDPRCheckboxProps {
  id: string; checked: boolean; onChange: (checked: boolean) => void;
  required?: boolean; error?: string; children: React.ReactNode;
}

const GDPRCheckbox = React.memo(({ id, checked, onChange, required, error, children }: GDPRCheckboxProps) => (
  <div className="space-y-1">
    <div className="flex items-start gap-3">
      <div className="flex h-5 items-center pt-0.5 flex-shrink-0">
        <input id={id} type="checkbox" checked={checked}
          onChange={e => onChange(e.target.checked)}
          className={`h-4 w-4 rounded transition ${error ? 'border-red-300' : 'border-[#dce1df]'}`}
          style={{ accentColor: '#157f85' }} />
      </div>
      <label htmlFor={id} className="text-sm leading-relaxed"
        style={{ color: error ? '#dc2626' : '#52636f' }}>
        {children}
        {required && <span className="ml-1" style={{ color: '#e9574f' }}>*</span>}
      </label>
    </div>
    {error && (
      <p className="ml-7 flex items-center gap-1 text-xs" style={{ color: '#e9574f' }}>
        <AlertCircle className="h-3 w-3" />{error}
      </p>
    )}
  </div>
));

// ── SuccessOverlay ────────────────────────────────────────────────────────────
const SuccessOverlay = ({ visible }: { visible: boolean }) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(16,37,50,0.55)', backdropFilter: 'blur(2px)' }}>
      <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-8 shadow-2xl text-center"
        style={{ border: '1px solid #dce1df' }}>
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full mb-4"
          style={{ background: '#157f85' }}>
          <CheckCircle className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-xl font-bold mb-2" style={{ color: '#102532' }}>You're all set! 🎉</h3>
        <p className="text-sm mb-6" style={{ color: '#52636f' }}>
          Your club account has been created. Redirecting you to login…
        </p>
        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: '#f1f0ee' }}>
          <div className="h-1.5 rounded-full" style={{ background: '#157f85', animation: 'drainBar 2.5s linear forwards' }} />
        </div>
        <style>{`@keyframes drainBar { from { width: 100%; } to { width: 0%; } }`}</style>
      </div>
    </div>
  );
};

// ── Section wrapper ───────────────────────────────────────────────────────────
const Section: React.FC<{ title: string; children: React.ReactNode; first?: boolean }> = ({ title, children, first }) => (
  <div className={`space-y-4 ${first ? '' : 'border-t pt-5'}`} style={{ borderColor: '#f1f0ee' }}>
    <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: '#8a9bab' }}>{title}</h3>
    {children}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
interface RegisterPayload {
  clubName: string; personName: string; email: string; password: string;
  reportingCurrency: string; gdprConsent: boolean;
  privacyPolicyAccepted: boolean; marketingConsent: boolean;
}

export default function ClubRegisterForm({ onSwitchToLogin }: ClubRegisterFormProps) {
  const { register } = useAuth();
  const { isLoading, error, successMessage, clearError, clearSuccessMessage } = useAuthUI();
  const location = useLocation();
  const detectedCurrency = currencyISO();

  const [formData, setFormData] = useState({
    clubName: '', personName: '', email: '', password: '', confirmPassword: '',
  });
  const [reportingCurrency, setReportingCurrency] = useState<string>(detectedCurrency);
  const [gdprConsent,           setGdprConsent]           = useState(false);
  const [privacyPolicyAccepted, setPrivacyPolicyAccepted] = useState(false);
  const [marketingConsent,      setMarketingConsent]      = useState(false);
  const [showPassword,          setShowPassword]          = useState(false);
  const [showConfirmPassword,   setShowConfirmPassword]   = useState(false);
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showSuccess, setShowSuccess] = useState(false);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => { const c = { ...prev }; delete c[name]; return c; });
    if (error) clearError();
    if (successMessage) clearSuccessMessage();
  }, [errors, error, clearError, successMessage, clearSuccessMessage]);

  const handleGdprConsentChange = useCallback((checked: boolean) => {
    setGdprConsent(checked);
    if (errors.gdprConsent) setErrors(prev => { const c = { ...prev }; delete c.gdprConsent; return c; });
  }, [errors.gdprConsent]);

  const handlePrivacyPolicyChange = useCallback((checked: boolean) => {
    setPrivacyPolicyAccepted(checked);
    if (errors.privacyPolicy) setErrors(prev => { const c = { ...prev }; delete c.privacyPolicy; return c; });
  }, [errors.privacyPolicy]);

  const validateField = useCallback((field: string, data = formData): Record<string, string> => {
    const out: Record<string, string> = {};
    switch (field) {
      case 'clubName':
        if (!data.clubName.trim()) out.clubName = 'Club name is required';
        else if (data.clubName.trim().length < 2) out.clubName = 'Club name must be at least 2 characters';
        break;
      case 'personName':
        if (!data.personName.trim()) out.personName = 'Your name is required';
        else if (data.personName.trim().length < 2) out.personName = 'Name must be at least 2 characters';
        break;
      case 'email':
        if (!data.email) out.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) out.email = 'Please enter a valid email address';
        break;
      case 'password':
        if (!data.password) out.password = 'Password is required';
        else if (data.password.length < 8) out.password = 'Password must be at least 8 characters';
        else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.password)) out.password = 'Password must contain uppercase, lowercase, and a number';
        break;
      case 'confirmPassword':
        if (!data.confirmPassword) out.confirmPassword = 'Please confirm your password';
        else if (data.password !== data.confirmPassword) out.confirmPassword = 'Passwords do not match';
        break;
    }
    return out;
  }, [formData]);

  const createBlurHandler = (field: string) => () => {
    setTouched(prev => ({ ...prev, [field]: true }));
    setErrors(prev => ({ ...prev, ...validateField(field, formData) }));
  };

  const validateForm = (): boolean => {
    const allErrors: Record<string, string> = {};
    ['clubName', 'personName', 'email', 'password', 'confirmPassword'].forEach(f => Object.assign(allErrors, validateField(f)));
    if (!gdprConsent) allErrors.gdprConsent = 'You must consent to data processing';
    if (!privacyPolicyAccepted) allErrors.privacyPolicy = 'You must accept the privacy policy';
    setErrors(allErrors);
    return Object.keys(allErrors).length === 0;
  };

  const isFormValid = (): boolean => {
    const { clubName, personName, email, password, confirmPassword } = formData;
    return Boolean(
      clubName.trim() && personName.trim() && email.trim() && password && confirmPassword &&
      password === confirmPassword && password.length >= 8 &&
      /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password) &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
      gdprConsent && privacyPolicyAccepted
    );
  };

  const getPasswordStrength = (): number => {
    let s = 0;
    if (formData.password.length >= 8)           s++;
    if (/[a-z]/.test(formData.password))         s++;
    if (/[A-Z]/.test(formData.password))         s++;
    if (/\d/.test(formData.password))            s++;
    if (/[^A-Za-z0-9]/.test(formData.password)) s++;
    return s;
  };

  const strengthMeta = () => {
    const s = getPasswordStrength();
    if (s < 2) return { text: 'Weak',   color: '#e9574f', bar: '#e9574f' };
    if (s < 4) return { text: 'Medium', color: '#d97706', bar: '#f59e0b' };
    return       { text: 'Strong', color: '#16a34a', bar: '#22c55e' };
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading || !validateForm()) return;
    try {
      const payload: RegisterPayload = {
        clubName: formData.clubName.trim(), personName: formData.personName.trim(),
        email: formData.email.trim(), password: formData.password,
        reportingCurrency, gdprConsent, privacyPolicyAccepted, marketingConsent,
      };
      const result = await register(payload);
      if (result.success) {
        setShowSuccess(true);
        const params   = new URLSearchParams(location.search);
        const returnTo = params.get('returnTo') || '/quiz/eventdashboard';
        setTimeout(() => { window.location.href = `/auth?mode=login&returnTo=${encodeURIComponent(returnTo)}`; }, 2500);
      }
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  return (
    <>
      <SuccessOverlay visible={showSuccess} />

      <div className="flex min-h-screen items-center justify-center p-4"
        style={{ background: '#f6f1e8' }}>
        <div className="w-full max-w-xl">

          {/* Brand mark */}
          <div className="text-center mb-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl shadow-sm mb-3"
              style={{ background: '#157f85' }}>
              <Users className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: '#102532' }}>Join Fundraisely</h1>
            <p className="text-sm" style={{ color: '#52636f' }}>
              Register your club and start fundraising today
            </p>
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

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>

              {/* ── About your club ── */}
              <Section title="About your club" first>
                <InputField label="Club / Organisation Name" name="clubName" icon={Users}
                  placeholder="e.g. Greenfield Community Club" autoComplete="organization"
                  value={formData.clubName} onChange={handleInputChange}
                  onBlur={createBlurHandler('clubName')} error={errors.clubName}
                  touched={touched.clubName} disabled={isLoading} />

                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: '#102532' }}>
                    Reporting Currency <span style={{ color: '#e9574f' }}>*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-4 w-4" style={{ color: '#8a9bab' }} />
                    </div>
                    <div className="pl-9">
                      <CurrencySelect id="reporting-currency" value={reportingCurrency}
                        onChange={setReportingCurrency} disabled={isLoading} />
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs" style={{ color: '#8a9bab' }}>
                    Pre-selected based on your region — changeable any time in settings.
                  </p>
                </div>
              </Section>

              {/* ── Your account ── */}
              <Section title="Your account">
                <InputField label="Your Full Name" name="personName" icon={User}
                  placeholder="e.g. Jane Smith" autoComplete="name"
                  value={formData.personName} onChange={handleInputChange}
                  onBlur={createBlurHandler('personName')} error={errors.personName}
                  touched={touched.personName} disabled={isLoading} />

                <InputField label="Email Address" name="email" type="email" icon={Mail}
                  placeholder="you@example.com" autoComplete="email"
                  value={formData.email} onChange={handleInputChange}
                  onBlur={createBlurHandler('email')} error={errors.email}
                  touched={touched.email} disabled={isLoading} />

                {/* Password + strength */}
                <div>
                  <InputField label="Password" name="password" icon={Lock}
                    placeholder="Create a strong password" autoComplete="new-password"
                    showToggle showPassword={showPassword}
                    onToggleShow={() => setShowPassword(v => !v)}
                    value={formData.password} onChange={handleInputChange}
                    onBlur={createBlurHandler('password')} error={errors.password}
                    touched={touched.password} disabled={isLoading} />
                  {formData.password && (
                    <div className="mt-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs" style={{ color: '#8a9bab' }}>Strength:</span>
                        <span className="text-xs font-semibold" style={{ color: strengthMeta().color }}>
                          {strengthMeta().text}
                        </span>
                      </div>
                      <div className="h-1 w-full rounded-full" style={{ background: '#f1f0ee' }}>
                        <div className="h-1 rounded-full transition-all duration-300"
                          style={{ width: `${(getPasswordStrength() / 5) * 100}%`, background: strengthMeta().bar }} />
                      </div>
                    </div>
                  )}
                </div>

                <InputField label="Confirm Password" name="confirmPassword" icon={Lock}
                  placeholder="Confirm your password" autoComplete="new-password"
                  showToggle showPassword={showConfirmPassword}
                  onToggleShow={() => setShowConfirmPassword(v => !v)}
                  value={formData.confirmPassword} onChange={handleInputChange}
                  onBlur={createBlurHandler('confirmPassword')} error={errors.confirmPassword}
                  touched={touched.confirmPassword} disabled={isLoading} />
              </Section>

              {/* ── Privacy & Consent ── */}
              <Section title="Privacy & Consent">
                <GDPRCheckbox id="gdpr-consent" checked={gdprConsent}
                  onChange={handleGdprConsentChange} required error={errors.gdprConsent}>
                  I consent to the processing of my personal data (name, email, and club
                  information) for the purpose of creating and managing my Fundraisely account.
                </GDPRCheckbox>
                <GDPRCheckbox id="privacy-policy" checked={privacyPolicyAccepted}
                  onChange={handlePrivacyPolicyChange} required error={errors.privacyPolicy}>
                  I have read and agree to the{' '}
                  <a href="/privacy-policy" target="_blank" className="font-semibold transition-colors hover:opacity-80"
                    style={{ color: '#157f85' }}>Privacy Policy</a>{' '}
                  and{' '}
                  <a href="/terms" target="_blank" className="font-semibold transition-colors hover:opacity-80"
                    style={{ color: '#157f85' }}>Terms of Service</a>.
                </GDPRCheckbox>
                <GDPRCheckbox id="marketing-consent" checked={marketingConsent}
                  onChange={setMarketingConsent}>
                  I'd like to receive updates about new features, fundraising tips, and
                  promotional content via email. You can unsubscribe at any time.
                </GDPRCheckbox>
              </Section>

              {/* Submit */}
              <button type="submit" disabled={isLoading || !isFormValid()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: '#157f85' }}>
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Creating Account…
                  </>
                ) : (
                  <><CheckCircle className="h-4 w-4" /> Create Club Account</>
                )}
              </button>
            </form>

            {/* What you get */}
            <div className="mt-6 rounded-xl p-4" style={{ background: '#f6f1e8', border: '1px solid #dce1df' }}>
              <h3 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#8a9bab' }}>What you get</h3>
              <ul className="space-y-2">
                {[
                  '3 free quiz event credits to get started',
                  'Full selection of quiz templates or create your own',
                  '20 connected players/teams per event',
                  'Reconcile payments and download audit-ready reports',
                ].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm" style={{ color: '#52636f' }}>
                    <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-green-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {onSwitchToLogin && (
              <p className="mt-5 text-center text-sm" style={{ color: '#52636f' }}>
                Already have an account?{' '}
                <button type="button" onClick={onSwitchToLogin}
                  className="font-semibold transition-colors hover:opacity-80"
                  style={{ color: '#157f85' }}>
                  Sign in here
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
