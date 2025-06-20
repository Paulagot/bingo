// src/components/Quiz/game/GlobalExtrasDuringLeaderboard.tsx

import React, { useState } from 'react';
import { fundraisingExtraDefinitions } from '../../../constants/quizMetadata';
import UseExtraModal from './UseExtraModal';

interface Props {
  availableExtras: string[];
  usedExtras: Record<string, boolean>;
  onUseExtra: (extraId: string, targetPlayerId?: string) => void; // ✅ Updated signature
  leaderboard: { id: string; name: string; score: number }[]; // ✅ NEW: Access to leaderboard
  currentPlayerId: string; // ✅ NEW: To filter out self
}

const debug = true;

const GlobalExtrasDuringLeaderboard = ({ 
  availableExtras, 
  usedExtras, 
  onUseExtra, 
  leaderboard, 
  currentPlayerId 
}: Props) => {
  // ✅ Modal state for robPoints
  const [robPointsModalOpen, setRobPointsModalOpen] = useState(false);

  const globalExtras = Object.values(fundraisingExtraDefinitions).filter(
    (extra) => extra.applicableTo === 'global' && availableExtras.includes(extra.id)
  );

  // ✅ Filter eligible targets for robPoints (players with ≥2 points, excluding self)
  const eligibleTargetsForRob = leaderboard.filter(
    player => player.id !== currentPlayerId && player.score >= 2
  );

  if (debug) {
    console.log('[GlobalExtras] availableExtras:', availableExtras);
    console.log('[GlobalExtras] usedExtras:', usedExtras);
    console.log('[GlobalExtras] filtered global extras:', globalExtras);
    console.log('[GlobalExtras] eligibleTargetsForRob:', eligibleTargetsForRob);
  }

  if (globalExtras.length === 0) return null;

  const handleExtraClick = (extraId: string) => {
    if (usedExtras[extraId]) {
      alert(`You have already used ${extraId}`);
      return;
    }

    if (extraId === 'robPoints') {
      // ✅ Check if any eligible targets exist
      if (eligibleTargetsForRob.length === 0) {
        alert('No players have enough points to rob from (need 2+ points)');
        return;
      }
      setRobPointsModalOpen(true);
    } else {
      // ✅ Handle other global extras directly
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
          {globalExtras.map(extra => {
            const isUsed = usedExtras[extra.id];
            const isRobPoints = extra.id === 'robPoints';
            const noEligibleTargets = isRobPoints && eligibleTargetsForRob.length === 0;
            
            return (
              <button
                key={extra.id}
                onClick={() => handleExtraClick(extra.id)}
                disabled={isUsed || noEligibleTargets}
                className={`w-full text-left px-4 py-2 rounded-lg transition font-medium
                  ${isUsed || noEligibleTargets
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
              >
                {extra.icon} {extra.label} 
                {isUsed && ' (Used)'}
                {noEligibleTargets && !isUsed && ' (No valid targets)'}
                <span className="block text-xs text-white opacity-80">
                  {extra.description || 'No description available.'}
                  {isRobPoints && !isUsed && !noEligibleTargets && (
                    <span className="block mt-1">
                      Eligible targets: {eligibleTargetsForRob.length}
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
        players={eligibleTargetsForRob}
        onCancel={() => setRobPointsModalOpen(false)}
        onConfirm={handleRobPointsConfirm}
        extraType="robPoints"
      />
    </>
  );
};

export default GlobalExtrasDuringLeaderboard;


