import React from 'react';

interface SqButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  fullWidth?: boolean;
}

export function SqButton({ variant = 'primary', fullWidth, className = '', children, ...rest }: SqButtonProps) {
  const base = 'sq-btn';
  const variantClass = `sq-btn-${variant}`;
  const widthClass = fullWidth ? 'sq-btn-full' : '';

  return (
    <button className={`${base} ${variantClass} ${widthClass} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}

export const SQ_BUTTON_CSS = `
.sq-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: 14px;
  padding: 14px 22px;
  font-size: 16px;
  font-weight: 800;
  font-family: 'Nunito', 'Inter', sans-serif;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.sq-btn:active { transform: scale(0.97); }
.sq-btn:focus-visible { outline: 3px solid var(--sq-blue); outline-offset: 2px; }
.sq-btn-full { width: 100%; }

.sq-btn-primary {
  background: var(--sq-orange);
  color: var(--sq-white);
  box-shadow: 0 4px 0 var(--sq-orange-dark);
}
.sq-btn-primary:hover { background: var(--sq-orange-dark); }

.sq-btn-secondary {
  background: var(--sq-black);
  color: var(--sq-white);
}
.sq-btn-secondary:hover { background: var(--sq-charcoal); }

.sq-btn-ghost {
  background: transparent;
  color: var(--sq-black);
  border: 2px solid var(--sq-border);
}
.sq-btn-ghost:hover { background: var(--sq-soft-orange); }

.sq-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}
`;
