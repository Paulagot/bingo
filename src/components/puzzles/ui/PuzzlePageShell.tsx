import React from 'react';
import PuzzleBrandHeader from './PuzzleBrandHeader';
import {
  FUNDRAISELY_DEFAULT_THEME,
  themeCssVars,
  type PuzzleBrandTheme,
} from '../ui/puzzleTheme';

interface PuzzlePageShellProps {
  children: React.ReactNode;
  rightHeaderContent?: React.ReactNode;
  className?: string;
  theme?: PuzzleBrandTheme;
  clubName?: string;
}

export default function PuzzlePageShell({
  children,
  rightHeaderContent,
  className = '',
  theme = FUNDRAISELY_DEFAULT_THEME,
  clubName,
}: PuzzlePageShellProps) {
  return (
    <div
      className="min-h-screen bg-[#F6F1E8] px-4 py-6 sm:px-6 lg:px-8"
      style={themeCssVars(theme)}
    >
      <div className={`mx-auto max-w-6xl ${className}`}>
        <div className="mb-6 rounded-[28px] border border-[#E8E0D3] bg-[#FBF8F3] px-5 py-4 shadow-sm sm:px-6">
          <PuzzleBrandHeader
            rightContent={rightHeaderContent}
            clubName={clubName}
            logoUrl={theme.logoUrl}
          />
        </div>

        {children}
      </div>
    </div>
  );
}