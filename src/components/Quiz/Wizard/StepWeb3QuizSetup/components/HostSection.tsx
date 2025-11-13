/**
 * Host Section Component
 *
 * Configuration for host display name.
 */

import { FC } from 'react';
import { Users, Check } from 'lucide-react';

export interface HostSectionProps {
  hostName: string;
  completed: boolean;
  onHostNameChange: (value: string) => void;
}

export const HostSection: FC<HostSectionProps> = ({ hostName, completed, onHostNameChange }) => {
  return (
    <div
      className={`bg-muted rounded-lg border-2 p-4 shadow-sm transition-all sm:rounded-xl sm:p-6 ${
        completed ? 'border-green-300 bg-green-50' : 'border-border'
      }`}
    >
      <div className="mb-3 flex items-start gap-3 sm:mb-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xl sm:h-12 sm:w-12 sm:text-2xl">
          👤
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-fg text-sm font-semibold sm:text-base">Host Information</h3>
            {completed && <Check className="h-4 w-4 text-green-600 sm:h-5 sm:w-5" />}
          </div>
          <p className="text-fg/70 text-xs sm:text-sm">Choose how you want to appear to participants</p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-fg/80 flex items-center gap-2 text-xs font-medium sm:text-sm">
          <Users className="h-4 w-4" />
          <span>
            Host Display Name <span className="text-red-500">*</span>
          </span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={hostName}
            onChange={(e) => onHostNameChange(e.target.value)}
            placeholder="e.g., Quiz Master Sarah, The Pub Quiz"
            className={`w-full rounded-lg border-2 px-3 py-2.5 pr-12 text-sm outline-none transition focus:ring-2 focus:ring-indigo-200 sm:px-4 sm:py-3 sm:pr-16 sm:text-base ${
              completed
                ? 'border-green-300 bg-green-50 focus:border-green-500'
                : 'border-border focus:border-indigo-500'
            }`}
            maxLength={30}
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 transform items-center gap-1 sm:right-3 sm:gap-2">
            {completed && <Check className="h-3 w-3 text-green-600 sm:h-4 sm:w-4" />}
            <span className="text-xs text-gray-400">{hostName.length}/30</span>
          </div>
        </div>
        <p className="text-fg/60 text-xs">
          Minimum 2 characters. This is how participants will see you during the quiz.
        </p>
      </div>
    </div>
  );
};

