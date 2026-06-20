import React from 'react';

interface PuzzleStatPillProps {
  icon?: React.ReactNode;
  label: string;
  value: string;
}

export default function PuzzleStatPill({
  icon,
  label,
  value,
}: PuzzleStatPillProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#E8E0D3] bg-white px-4 py-3 shadow-sm">
      {icon ? (
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F6F1E8] text-base">
          {icon}
        </div>
      ) : null}

      <div className="min-w-0">
        <p className="text-xs font-medium text-[#6E6A63]">{label}</p>
        <p className="truncate text-sm font-semibold text-[#071A44]">{value}</p>
      </div>
    </div>
  );
}