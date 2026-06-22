import React from 'react';

interface SqCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function SqCard({ children, className = '', ...rest }: SqCardProps) {
  return <div className={`sq-card ${className}`.trim()} {...rest}>{children}</div>;
}

interface SqInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function SqInput({ label, error, id, ...rest }: SqInputProps) {
  const inputId = id || `sq-input-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="sq-field">
      <label htmlFor={inputId} className="sq-label">{label}</label>
      <input id={inputId} className={`sq-input ${error ? 'sq-input-error' : ''}`} {...rest} />
      {error && <p className="sq-field-error">{error}</p>}
    </div>
  );
}

interface SqCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function SqCheckbox({ label, id, ...rest }: SqCheckboxProps) {
  const inputId = id || `sq-check-${label.slice(0, 12).replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <label htmlFor={inputId} className="sq-checkbox-row">
      <input type="checkbox" id={inputId} className="sq-checkbox" {...rest} />
      <span>{label}</span>
    </label>
  );
}

export const SQ_FORM_CSS = `
.sq-card {
  background: var(--sq-white);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(17, 17, 17, 0.06);
}

.sq-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.sq-label { font-weight: 700; font-size: 14px; color: var(--sq-charcoal); }
.sq-input {
  border: 2px solid var(--sq-border);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 16px;
  font-family: 'Nunito', 'Inter', sans-serif;
  background: var(--sq-cream);
}
.sq-input:focus { outline: none; border-color: var(--sq-orange); }
.sq-input-error { border-color: var(--sq-red); }
.sq-field-error { color: var(--sq-red); font-size: 13px; margin: 0; }

.sq-checkbox-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 14px;
  line-height: 1.4;
  padding: 8px 0;
  cursor: pointer;
}
.sq-checkbox { width: 20px; height: 20px; margin-top: 1px; accent-color: var(--sq-orange); flex-shrink: 0; }
`;
