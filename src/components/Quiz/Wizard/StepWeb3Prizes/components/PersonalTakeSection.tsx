/**
 * Personal Take Section Component
 *
 * Allows user to configure their personal percentage (0-5%).
 */

import { FC } from 'react';
import { User } from 'lucide-react';

export interface PersonalTakeSectionProps {
  personalTake: number;
  onPersonalTakeChange: (value: number) => void;
}

export const PersonalTakeSection: FC<PersonalTakeSectionProps> = ({
  personalTake,
  onPersonalTakeChange,
}) => {
  return (
    <div className="bg-muted border-border rounded-xl border-2 p-4 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md md:p-6">
      <div className="mb-4 flex items-center space-x-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-2xl">💰</div>
        <div className="flex-1">
          <h3 className="text-fg text-lg font-semibold">Personal Take</h3>
          <p className="text-fg/70 text-sm">How much do you want for yourself? (Optional)</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <label className="text-fg/80 flex items-center justify-between text-sm font-medium">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-blue-500" />
              <span>Personal Percentage</span>
            </div>
            <span className="text-lg font-bold text-blue-600">{personalTake}%</span>
          </label>
          <div className="relative">
            <input
              type="range"
              min={0}
              max={5}
              step={1}
              value={personalTake}
              onChange={(e) => onPersonalTakeChange(parseFloat(e.target.value))}
              className="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
              style={{
                background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${
                  (personalTake / 5) * 100
                }%, #E5E7EB ${(personalTake / 5) * 100}%, #E5E7EB 100%)`,
              }}
            />
            <div className="text-fg/60 mt-1 flex justify-between text-xs">
              <span>0%</span>
              <span>2.5%</span>
              <span>5%</span>
            </div>
          </div>
          <p className="text-fg/60 text-xs">Drag to select your personal take (0–5%)</p>
        </div>
      </div>
    </div>
  );
};

