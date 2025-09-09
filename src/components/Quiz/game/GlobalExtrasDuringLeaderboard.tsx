// src/components/Quiz/game/GlobalExtrasDuringLeaderboard.tsx

import { useState } from 'react';
import { fundraisingExtraDefinitions } from '../constants/quizMetadata';
import { useGlobalExtras } from '../hooks/useGlobalExtras';
import UseExtraModal from './UseExtraModal';

interface Props {
  availableExtras: string[];
  usedExtras: Record<string, boolean>;
  onUseExtra: (extraId: string, targetPlayerId?: string) => void;
  leaderboard: { id: string; name: string; score: number }[];
  currentPlayerId: string;
  cumulativeNegativePoints?: number;
  pointsRestored?: number;
}

const debug = false;

const GlobalExtrasDuringLeaderboard = ({ 
  availableExtras, 
  usedExtras, 
  onUseExtra, 
  leaderboard, 
  currentPlayerId,
  cumulativeNegativePoints = 0,
  pointsRestored = 0
}: Props) => {
  const [robPointsModalOpen, setRobPointsModalOpen] = useState(false);

  // ✅ UPDATED: Pass usedExtras to the hook for consistent filtering
  const { globalExtras, restorablePoints, robPointsTargets } = useGlobalExtras({
    allPlayerExtras: availableExtras,
    currentPlayerId,
    leaderboard,
    cumulativeNegativePoints,
    pointsRestored,
    usedExtras,
     // ✅ NEW: Pass usedExtras for filtering
    debug: true
  });

  // ✅ Get extra definitions for display (now pre-filtered by the hook)
  const globalExtraDefinitions = globalExtras.map(extraId => 
    fundraisingExtraDefinitions[extraId as keyof typeof fundraisingExtraDefinitions]
  ).filter(Boolean);

  if (debug) {
    console.log('[GlobalExtras] availableExtras:', availableExtras);
    console.log('[GlobalExtras] usedExtras:', usedExtras);
    console.log('[GlobalExtras] filtered global extras:', globalExtras);
    console.log('[GlobalExtras] robPointsTargets:', robPointsTargets);
    console.log('[GlobalExtras] cumulativeNegativePoints:', cumulativeNegativePoints);
    console.log('[GlobalExtras] pointsRestored:', pointsRestored);
    console.log('[GlobalExtras] restorablePoints:', restorablePoints);
  }

  if (globalExtraDefinitions.length === 0) return null;

  const handleExtraClick = (extraId: string) => {
    // ✅ SIMPLIFIED: Since used extras are filtered out at hook level,
    // we only need special validation for edge cases
    if (extraId === 'robPoints') {
      if (robPointsTargets.length === 0) {
        alert('No players have enough points to rob from (need 2+ points)');
        return;
      }
      setRobPointsModalOpen(true);
    } else {
      // ✅ Handle other global extras directly (including restorePoints)
      onUseExtra(extraId);
    }
  };

  const handleRobPointsConfirm = (targetPlayerId: string) => {
    onUseExtra('robPoints', targetPlayerId);
    setRobPointsModalOpen(false);
  };

  return (
    <>
      <div className="mt-6 rounded-xl bg-blue-50 p-4 shadow">
        <h3 className="mb-2 text-lg font-semibold text-blue-800">🌍 Global Fundraising Extras</h3>
        <p className="mb-3 text-sm text-blue-600">Use these before the next round starts, or wait for the next leaderboard review. Be Strategic!:</p>
        <div className="space-y-2">
          {globalExtraDefinitions.map(extra => {
            const isRobPoints = extra.id === 'robPoints';
            const noEligibleTargets = isRobPoints && robPointsTargets.length === 0;
            
            // ✅ SIMPLIFIED: Since used extras are filtered out at hook level,
            // we only need to check for edge cases
            const shouldDisable = noEligibleTargets;
            const disableReason = noEligibleTargets ? '(No valid targets)' : '';
            
            return (
              <button
                key={extra.id}
                onClick={() => handleExtraClick(extra.id)}
                disabled={shouldDisable}
                className={`w-full rounded-lg px-4 py-2 text-left font-medium transition ${
                  shouldDisable
                    ? 'text-fg/60 cursor-not-allowed bg-gray-200'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {extra.icon} {extra.label}
                {/* ✅ Show available points for restore */}
                {extra.id === 'restorePoints' && ` (${restorablePoints} available)`}
                {disableReason && ` ${disableReason}`}
                
                <span className={`block text-xs opacity-80 ${
                  shouldDisable ? 'text-fg/60' : 'text-white'
                }`}>
                  {extra.description || 'No description available.'}
                  {isRobPoints && !shouldDisable && (
                    <span className="mt-1 block">
                      Eligible targets: {robPointsTargets.length}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <UseExtraModal
        visible={robPointsModalOpen}
        players={robPointsTargets}
        onCancel={() => setRobPointsModalOpen(false)}
        onConfirm={handleRobPointsConfirm}
        extraType="robPoints"
      />
    </>
  );
};

export default GlobalExtrasDuringLeaderboard;


