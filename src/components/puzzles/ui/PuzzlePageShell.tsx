import React from 'react';
import PuzzleBrandHeader from './PuzzleBrandHeader';

interface PuzzlePageShellProps {
  children: React.ReactNode;
  rightHeaderContent?: React.ReactNode;
  className?: string;
}

export default function PuzzlePageShell({
  children,
  rightHeaderContent,
  className = '',
}: PuzzlePageShellProps) {
  return (
    <div className="min-h-screen bg-[#F6F1E8] px-4 py-6 sm:px-6 lg:px-8">
      <div className={`mx-auto max-w-6xl ${className}`}>
        <div className="mb-6 rounded-[28px] border border-[#E8E0D3] bg-[#FBF8F3] px-5 py-4 shadow-sm sm:px-6">
          <PuzzleBrandHeader rightContent={rightHeaderContent} />
        </div>

        {children}
      </div>
    </div>
  );
}