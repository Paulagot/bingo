import React from 'react';

interface PuzzleBrandHeaderProps {
  rightContent?: React.ReactNode;
  clubName?: string;
  logoUrl?: string | null;
}

export default function PuzzleBrandHeader({
  rightContent,
  clubName,
  logoUrl,
}: PuzzleBrandHeaderProps) {
  const displayName = clubName?.trim() || 'FundRaisely';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={displayName}
            className="h-11 w-11 rounded-2xl object-cover shadow-sm"
          />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--puzzle-primary)] text-[var(--puzzle-text-on-primary)] text-xl font-bold shadow-sm">
            {initial}
          </div>
        )}

        <div>
          <p className="text-[28px] leading-none font-extrabold tracking-tight text-[#071A44]">
            {displayName}
          </p>
        </div>
      </div>

      {rightContent ? <div className="shrink-0">{rightContent}</div> : null}
    </div>
  );
}