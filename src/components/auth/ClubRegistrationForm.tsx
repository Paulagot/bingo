// client/src/components/auth/ClubRegistrationForm.tsx
import React, { useState, useCallback } from 'react';
import {
  Users,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { useAuth, useUI } from '../../stores/authStore';
import { useLocation, useNavigate } from 'react-router-dom';

interface ClubRegisterFormProps {
  onSwitchToLogin?: () => void;
}

/* -----------------------------------------------------------
   FIXED INPUT FIELD (TS Strict + exactOptionalPropertyTypes)
------------------------------------------------------------ */
interface InputFieldProps {
  label: string;
  name: string;
  type?: string;
  icon: any;
  placeholder: string;
  autoComplete?: string | undefined;
  showToggle?: boolean | undefined;
  showPassword?: boolean | undefined;
  onToggleShow?: (() => void) | undefined;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  error?: string | undefined;
  touched?: boolean | undefined;
  disabled?: boolean | undefined;
}

const InputField = React.memo(
  ({
    label,
    name,
    type = 'text',
    icon: Icon,
    placeholder,
    autoComplete,
    showToggle = false,
    showPassword: isPasswordVisible = false,
    onToggleShow,
    value,
    onChange,
    onBlur,
    error,
    touched,
    disabled
  }: InputFieldProps) => (
    <div>
      <label
        htmlFor={name}
        className="block text-sm font-bold text-indigo-900 mb-2"
      >
        {label} <span className="text-red-500">*</span>
      </label>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Icon className="h-5 w-5 text-indigo-800/40" />
        </div>

        <input
          type={showToggle ? (isPasswordVisible ? 'text' : 'password') : type}
          id={name}
          name={name}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full rounded-xl border ${
            error && touched ? 'border-red-300' : 'border-gray-200'
          } bg-white pl-12 ${showToggle ? 'pr-12' : 'pr-4'} py-3 text-indigo-900 placeholder:text-indigo-800/40 shadow-sm transition-all duration-300
          focus:outline-none focus:ring-2 ${
            error && touched
              ? 'focus:border-red-500 focus:ring-red-500/20'
              : 'focus:border-indigo-500 focus:ring-indigo-500/20'
          } hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed`}
        />

        {showToggle && onToggleShow && (
          <button
            type="button"
            onClick={onToggleShow}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-800/60 hover:text-indigo-900 transition-colors"
            tabIndex={-1}
          >
            {isPasswordVisible ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        )}
      </div>

      {error && touched && (
        <p className="mt-2 flex items-center text-sm text-red-600">
          <AlertCircle className="mr-1.5 h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  )
);

/* -----------------------------------------------------------
   FIXED GDPR CHECKBOX
------------------------------------------------------------ */
interface GDPRCheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  required?: boolean | undefined;
  error?: string | undefined;
  children: React.ReactNode;
}

const GDPRCheckbox = React.memo(
  ({ id, checked, onChange, required, error, children }: GDPRCheckboxProps) => (
    <div className="space-y-1">
      <div className="flex items-start space-x-3">
        <div className="flex h-5 items-center pt-0.5">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className={`h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 ${
              error ? 'border-red-300' : ''
            }`}
          />
        </div>

        <label
          htmlFor={id}
          className={`text-sm leading-relaxed ${
            error ? 'text-red-600' : 'text-indigo-800/70'
          }`}
        >
          {children}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      </div>

      {error && (
        <p className="ml-7 flex items-center text-sm text-red-600">
          <AlertCircle className="mr-1.5 h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  )
);

/* -----------------------------------------------------------
   MAIN COMPONENT
------------------------------------------------------------ */
export default function ClubRegisterForm({
  onSwitchToLogin
}: ClubRegisterFormProps) {
  const { register } = useAuth();
  const {
    isLoading,
    error,
    successMessage,
    clearError,
    clearSuccessMessage
  } = useUI();
  const location = useLocation();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [gdprConsent, setGdprConsent] = useState(false);
  const [privacyPolicyAccepted, setPrivacyPolicyAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  /* ---------- INPUT HANDLER ---------- */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));

      if (errors[name]) {
        setErrors((prev) => {
          const copy = { ...prev };
          delete copy[name];
          return copy;
        });
      }

      if (error) clearError();
      if (successMessage) clearSuccessMessage();
    },
    [errors, error, clearError, successMessage, clearSuccessMessage]
  );

  /* ---------- CONSENT HANDLERS ---------- */
  const handleGdprConsentChange = useCallback(
    (checked: boolean) => {
      setGdprConsent(checked);
      if (errors.gdprConsent) {
        setErrors((prev) => {
          const copy = { ...prev };
          delete copy.gdprConsent;
          return copy;
        });
      }
    },
    [errors.gdprConsent]
  );

  const handlePrivacyPolicyChange = useCallback(
    (checked: boolean) => {
      setPrivacyPolicyAccepted(checked);
      if (errors.privacyPolicy) {
        setErrors((prev) => {
          const copy = { ...prev };
          delete copy.privacyPolicy;
          return copy;
        });
      }
    },
    [errors.privacyPolicy]
  );

  /* ---------- VALIDATION ---------- */
  const validateField = useCallback(
    (field: string, currentFormData = formData) => {
      const out: Record<string, string> = {};

      switch (field) {
        case 'name':
          if (!currentFormData.name.trim())
            out.name = 'Club name is required';
          else if (currentFormData.name.trim().length < 2)
            out.name = 'Club name must be at least 2 characters';
          break;

        case 'email':
          if (!currentFormData.email)
            out.email = 'Email is required';
          else if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentFormData.email)
          )
            out.email = 'Please enter a valid email address';
          break;

        case 'password':
          if (!currentFormData.password)
            out.password = 'Password is required';
          else if (currentFormData.password.length < 8)
            out.password = 'Password must be at least 8 characters';
          else if (
            !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(
              currentFormData.password
            )
          )
            out.password =
              'Password must contain uppercase, lowercase, and number';
          break;

        case 'confirmPassword':
          if (!currentFormData.confirmPassword)
            out.confirmPassword = 'Please confirm your password';
          else if (
            currentFormData.password !== currentFormData.confirmPassword
          )
            out.confirmPassword = 'Passwords do not match';
          break;
      }
      return out;
    },
    [formData]
  );

  const createBlurHandler = (field: string) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const fieldErrors = validateField(field, formData);
    setErrors((prev) => ({ ...prev, ...fieldErrors }));
  };

  const isFormValid = () => {
    const hasAll =
      formData.name.trim() &&
      formData.email.trim() &&
      formData.password &&
      formData.confirmPassword;

    const passwordsMatch =
      formData.password === formData.confirmPassword;

    const passwordValid =
      formData.password.length >= 8 &&
      /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password);

    const emailValid =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);

    const consents = gdprConsent && privacyPolicyAccepted;

    return (
      hasAll && passwordsMatch && passwordValid && emailValid && consents
    );
  };

  const validateForm = () => {
    const allErrors: Record<string, string> = {};

    ['name', 'email', 'password', 'confirmPassword'].forEach((field) =>
      Object.assign(allErrors, validateField(field))
    );

    if (!gdprConsent)
      allErrors.gdprConsent = 'You must consent to data processing';

    if (!privacyPolicyAccepted)
      allErrors.privacyPolicy =
        'You must accept the privacy policy';

    setErrors(allErrors);
    return Object.keys(allErrors).length === 0;
  };

  /* ---------- SUBMIT ---------- */
  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    if (isLoading || !validateForm()) return;

    try {
      const result = await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        gdprConsent,
        privacyPolicyAccepted,
        marketingConsent
      });

      if (result.success) {
        const params = new URLSearchParams(location.search);
        const returnTo =
          params.get('returnTo') || '/quiz/create-fundraising-quiz';

        setTimeout(
          () =>
            navigate(
              `/auth?mode=login&returnTo=${encodeURIComponent(returnTo)}`,
              { replace: true }
            ),
          2000
        );
      }
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  /* ---------- PASSWORD STRENGTH ---------- */
  const getPasswordStrength = () => {
    let score = 0;
    if (formData.password.length >= 8) score++;
    if (/[a-z]/.test(formData.password)) score++;
    if (/[A-Z]/.test(formData.password)) score++;
    if (/\d/.test(formData.password)) score++;
    if (/[^A-Za-z0-9]/.test(formData.password)) score++;
    return score;
  };

  const getPasswordStrengthText = () => {
    const s = getPasswordStrength();
    if (s < 2) return { text: 'Weak', color: 'text-red-600' };
    if (s < 4) return { text: 'Medium', color: 'text-yellow-600' };
    return { text: 'Strong', color: 'text-green-600' };
  };

  /* ---------- RENDER ---------- */
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-indigo-50 to-white p-4">
      <div className="w-full max-w-xl">
        <div className="relative bg-white rounded-2xl p-8 md:p-10 shadow-lg border border-gray-100">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 opacity-40 rounded-2xl" />

          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-8">
              <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-2 text-indigo-700 text-sm font-medium mb-4">
                <Sparkles className="h-4 w-4" /> Fundraising Platform
              </span>

              <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg mb-4">
                <Users className="h-8 w-8 text-white" />
              </div>

              <h2 className="text-3xl font-bold text-indigo-900 mb-3">
                Join FundRaisely
              </h2>

              <p className="text-indigo-800/70 leading-relaxed">
                Register your club, community group or charity and
                start fundraising today AND be added to waitlist for our
                founding partners program!
              </p>
            </div>

            {/* Success */}
            {successMessage && (
              <div className="mb-6 rounded-2xl border border-gray-100 bg-gradient-to-br from-green-50 to-teal-50 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-teal-500 shadow-lg flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <div className="pt-1">
                    <p className="text-sm text-indigo-900 font-medium">
                      {successMessage}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-6 rounded-2xl border border-gray-100 bg-gradient-to-br from-orange-50 to-red-50 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-white" />
                  </div>
                  <div className="pt-1">
                    <p className="text-sm text-indigo-900 font-medium">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* FORM */}
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <InputField
                label="Club Name"
                name="name"
                icon={Users}
                placeholder="e.g., Greenfield Community Club"
                autoComplete="organization"
                value={formData.name}
                onChange={handleInputChange}
                onBlur={createBlurHandler('name')}
                error={errors.name}
                touched={touched.name}
                disabled={isLoading}
              />

              <InputField
                label="Email Address"
                name="email"
                type="email"
                icon={Mail}
                placeholder="club@example.com"
                autoComplete="email"
                value={formData.email}
                onChange={handleInputChange}
                onBlur={createBlurHandler('email')}
                error={errors.email}
                touched={touched.email}
                disabled={isLoading}
              />

              {/* Password */}
              <div>
                <InputField
                  label="Password"
                  name="password"
                  icon={Lock}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  showToggle={true}
                  showPassword={showPassword}
                  onToggleShow={() => setShowPassword((v) => !v)}
                  value={formData.password}
                  onChange={handleInputChange}
                  onBlur={createBlurHandler('password')}
                  error={errors.password}
                  touched={touched.password}
                  disabled={isLoading}
                />

                {formData.password && (
                  <div className="mt-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs text-indigo-800/70">
                        Password strength:
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          getPasswordStrengthText().color
                        }`}
                      >
                        {getPasswordStrengthText().text}
                      </span>
                    </div>

                    <div className="h-1.5 w-full rounded-full bg-gray-200">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          getPasswordStrength() < 2
                            ? 'bg-red-500'
                            : getPasswordStrength() < 4
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{
                          width: `${(getPasswordStrength() / 5) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <InputField
                label="Confirm Password"
                name="confirmPassword"
                icon={Lock}
                placeholder="Confirm your password"
                autoComplete="new-password"
                showToggle={true}
                showPassword={showConfirmPassword}
                onToggleShow={() =>
                  setShowConfirmPassword((v) => !v)
                }
                value={formData.confirmPassword}
                onChange={handleInputChange}
                onBlur={createBlurHandler('confirmPassword')}
                error={errors.confirmPassword}
                touched={touched.confirmPassword}
                disabled={isLoading}
              />

              {/* Privacy & Consent */}
              <div className="space-y-4 border-t border-gray-200 pt-5">
                <h3 className="text-sm font-bold text-indigo-900">
                  Privacy & Consent
                </h3>

                <GDPRCheckbox
                  id="gdpr-consent"
                  checked={gdprConsent}
                  onChange={handleGdprConsentChange}
                  required={true}
                  error={errors.gdprConsent}
                >
                  I consent to the processing of my personal data (name,
                  email, and club information) for the purpose of
                  creating and managing my FundRaisely account.
                </GDPRCheckbox>

                <GDPRCheckbox
                  id="privacy-policy"
                  checked={privacyPolicyAccepted}
                  onChange={handlePrivacyPolicyChange}
                  required={true}
                  error={errors.privacyPolicy}
                >
                  I have read and agree to the{' '}
                  <a
                    href="/privacy-policy"
                    target="_blank"
                    className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    Privacy Policy
                  </a>{' '}
                  and{' '}
                  <a
                    href="/terms"
                    target="_blank"
                    className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    Terms of Service
                  </a>
                  .
                </GDPRCheckbox>

                <GDPRCheckbox
                  id="marketing-consent"
                  checked={marketingConsent}
                  onChange={setMarketingConsent}
                >
                  I would like to receive updates about new features,
                  fundraising tips, and promotional content via email.
                  You can unsubscribe at any time.
                </GDPRCheckbox>
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || !isFormValid()}
                  className="group inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-white font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 w-full justify-center"
                >
                  {isLoading ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Club Account</span>
                      <CheckCircle className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* BENEFITS BOX */}
            <div className="mt-6 rounded-xl border border-gray-200 bg-gradient-to-br from-green-50 to-teal-50 opacity-80 p-5">
              <h3 className="text-sm font-bold text-indigo-900 mb-3">
                What you get:
              </h3>

              <ul className="space-y-2 text-sm text-indigo-800/70">
                <li className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-600 flex-shrink-0" />
                  3 free quiz event credits to get started
                </li>
                <li className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-600 flex-shrink-0" />
                  Full selection of quiz templates or create your own
                </li>
                <li className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-600 flex-shrink-0" />
                  20 connected players/teams per event
                </li>
                <li className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-600 flex-shrink-0" />
                  Reconcile payments with ease and download audit-ready
                  reports
                </li>
              </ul>
            </div>

            {/* Login Switch */}
            {onSwitchToLogin && (
              <div className="mt-6 text-center">
                <p className="text-indigo-800/70 text-sm">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={onSwitchToLogin}
                    className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors duration-300"
                  >
                    Sign in here
                  </button>
                </p>
              </div>
            )}
          </div>

          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/0 to-white/5 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
