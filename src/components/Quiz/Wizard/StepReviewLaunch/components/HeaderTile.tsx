/**
 * Header Tile Component
 *
 * Small tile icon used in review sections.
 */

import { FC } from 'react';

export const HeaderTile: FC = () => (
  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border-2 border-border bg-card sm:h-12 sm:w-12">
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-300">
      <span className="text-fg/60 text-[10px] font-medium sm:text-xs">IMG</span>
    </div>
  </div>
);

