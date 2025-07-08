// src/components/Quiz/game/GlobalExtrasDuringLeaderboard.tsx

import  { useState } from 'react';
import { fundraisingExtraDefinitions } from '../../../constants/quizMetadata';
import { useGlobalExtras } from '../hooks/useGlobalExtras';
import UseExtraModal from './UseExtraModal';

interface Props {
  availableExtras: string[];
  usedExtras: Record<string, boolean>;
  onUseExtra: (extraId: string, targetPlayerId?: string) => void;
  leaderboard: { id: string; name: string; score: number }[];
  currentPlayerId: string;
  cumulativeNegativePoints?: number; // ✅ NEW: For restore points logic
  pointsRestored?: number; // ✅ NEW: For restore points logic
}

const debug = true;

const GlobalExtrasDuringLeaderboard = ({ 
  availableExtras, 
  usedExtras, 
  onUseExtra, 
  leaderboard, 
  currentPlayerId,
  cumulativeNegativePoints = 0,
  pointsRestored = 0
}: Props) => {
  // ✅ Modal state for robPoints
  const [robPointsModalOpen, setRobPointsModalOpen] = useState(false);

  // ✅ Use the new global extras hook
  const { globalExtras, restorablePoints, robPointsTargets } = useGlobalExtras({
    allPlayerExtras: availableExtras,
    currentPlayerId,
    leaderboard,
    cumulativeNegativePoints,
    pointsRestored,
    debug: true
  });

  // ✅ Get extra definitions for display
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
  // ✅ Special handling for restorePoints
  if (extraId === 'restorePoints') {
    if (restorablePoints <= 0) {
      alert('No points available to restore');
      return;
    }
  } else if (usedExtras[extraId]) {
    alert(`You have already used ${extraId}`);
    return;
  }

  if (extraId === 'robPoints') {
    // ✅ Check if any eligible targets exist
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
      <div className="bg-blue-50 p-4 mt-6 rounded-xl shadow">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">🌍 Global Fundraising Extras</h3>
        <p className="text-sm text-blue-600 mb-3">Use these before the next round starts, or wait for the next leaderboard review.  Be Strategic!:</p>
        <div className="space-y-2">
          {globalExtraDefinitions.map(extra => {
            const isUsed = usedExtras[extra.id];
            const isRobPoints = extra.id === 'robPoints';
            const isRestorePoints = extra.id === 'restorePoints';
            const noEligibleTargets = isRobPoints && robPointsTargets.length === 0;
            
            // ✅ FIXED: Proper disable logic for each extra type
            let shouldDisable = false;
            let disableReason = '';
            
            if (isRestorePoints) {
              shouldDisable = restorablePoints <= 0;
              disableReason = shouldDisable ? '(No points to restore)' : '';
            } else if (isRobPoints) {
              shouldDisable = isUsed || noEligibleTargets;
              disableReason = isUsed ? '(Used)' : noEligibleTargets ? '(No valid targets)' : '';
            } else {
              shouldDisable = isUsed;
              disableReason = isUsed ? '(Used)' : '';
            }
            
            return (
              <button
                key={extra.id}
                onClick={() => handleExtraClick(extra.id)}
                disabled={shouldDisable}
                className={`w-full text-left px-4 py-2 rounded-lg transition font-medium ${
                  shouldDisable
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {extra.icon} {extra.label}
                {/* ✅ FIXED: Show available points for restore, status for others */}
                {isRestorePoints && !shouldDisable && ` (${restorablePoints} available)`}
                {disableReason && ` ${disableReason}`}
                
                <span className={`block text-xs opacity-80 ${
                  shouldDisable ? 'text-gray-500' : 'text-white'
                }`}>
                  {extra.description || 'No description available.'}
                  {isRobPoints && !shouldDisable && (
                    <span className="block mt-1">
                      Eligible targets: {robPointsTargets.length}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ✅ Rob Points Modal */}
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


