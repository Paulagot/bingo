import React from 'react';

interface PuzzlePrimaryButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  fullWidth?: boolean;
}

export default function PuzzlePrimaryButton({
  children,
  className = '',
  fullWidth = false,
  ...props
}: PuzzlePrimaryButtonProps) {
  return (
    <button
      {...props}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-full',
        'bg-[#071A44] px-6 py-3 text-sm font-semibold text-white',
        'shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50',
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}