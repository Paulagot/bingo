// SupportLayout.tsx
// A single, centered reading column at every breakpoint. Mobile is unchanged
// from the original app column; on desktop it simply centers and caps the width
// (rather than a wide left column + right rail, which left everything looking
// off-centre). The running selection lives in the sticky bottom bar at all
// sizes, so there's no rail here.

import type { ReactNode } from 'react';

export default function SupportLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-[100dvh] w-full max-w-[430px] overflow-x-hidden px-3 pb-36 pt-3 sm:max-w-lg sm:px-4 lg:max-w-2xl lg:pb-28">
      {children}
    </div>
  );
}