import React from 'react';

interface PuzzleBrandHeaderProps {
  rightContent?: React.ReactNode;
}

export default function PuzzleBrandHeader({
  rightContent,
}: PuzzleBrandHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#157F85] text-white text-xl font-bold shadow-sm">
          F
        </div>

        <div>
          <p className="text-[28px] leading-none font-extrabold tracking-tight text-[#071A44]">
            FundRaisely
          </p>
        </div>
      </div>

      {rightContent ? <div className="shrink-0">{rightContent}</div> : null}
    </div>
  );
}