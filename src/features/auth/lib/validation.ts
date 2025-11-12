// src/features/auth/lib/validation.ts
// Authentication validation utilities

import { isValidEmail, isNotEmpty } from '@shared/lib';

/**
 * Validates email format
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!isNotEmpty(email)) {
    return { valid: false, error: 'Email is required' };
  }
  if (!isValidEmail(email)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }
  return { valid: true };
}

/**
 * Validates password strength
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!isNotEmpty(password)) {
    return { valid: false, error: 'Password is required' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  return { valid: true };
}

/**
 * Validates registration form data
 */
export function validateRegistration(data: {
  name: string;
  email: string;
  password: string;
  gdprConsent: boolean;
  privacyPolicyAccepted: boolean;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!isNotEmpty(data.name)) {
    errors.name = 'Name is required';
  }

  const emailValidation = validateEmail(data.email);
  if (!emailValidation.valid) {
    errors.email = emailValidation.error || 'Invalid email';
  }

  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.valid) {
    errors.password = passwordValidation.error || 'Invalid password';
  }

  if (!data.gdprConsent) {
    errors.gdprConsent = 'GDPR consent is required';
  }

  if (!data.privacyPolicyAccepted) {
    errors.privacyPolicyAccepted = 'Privacy policy acceptance is required';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates login form data
 */
export function validateLogin(data: { email: string; password: string }): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  const emailValidation = validateEmail(data.email);
  if (!emailValidation.valid) {
    errors.email = emailValidation.error || 'Invalid email';
  }

  if (!isNotEmpty(data.password)) {
    errors.password = 'Password is required';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

