// SupportLayout.tsx
// The page shell. Below lg it's exactly the single mobile column the app already
// used (so the loved mobile feel is untouched). At lg+ it becomes a CSS grid:
// a scrolling content column on the left and a ~340px sticky rail on the right.
// The rail only renders at lg+; on mobile its job is done by the bottom bar.

import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  rail?: ReactNode;
};

export default function SupportLayout({ children, rail }: Props) {
  return (
    <div className="mx-auto min-h-[100dvh] w-full max-w-[430px] overflow-x-hidden px-3 pb-36 pt-3 sm:max-w-lg sm:px-4 lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6 lg:px-6 lg:pb-20">
      <div className="min-w-0">{children}</div>
      {rail && (
        <aside className="hidden lg:block">
          <div className="sticky top-6">{rail}</div>
        </aside>
      )}
    </div>
  );
}