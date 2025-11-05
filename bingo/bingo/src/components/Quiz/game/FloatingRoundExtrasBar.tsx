// FloatingRoundExtrasBar.tsx - Simplified version

import React, { useState } from 'react';
import { Target, Lightbulb, Snowflake } from 'lucide-react';
import { ExtrasPanelProps } from '../types/quiz';
import UseExtraModal from './UseExtraModal';

interface FloatingRoundExtrasBarProps extends ExtrasPanelProps {
  playersInRoom?: { id: string; name: string }[];
  currentPlayerId: string;
}

const FloatingRoundExtrasBar: React.FC<FloatingRoundExtrasBarProps> = ({ 
  availableExtras, 
   
  onUseExtra,
  answerSubmitted = false,
  playersInRoom = [],
  currentPlayerId
}) => {
  const [freezeModalOpen, setFreezeModalOpen] = useState(false);

  // Helper function to get extra details for round extras
  const getRoundExtraDetails = (extraId: string) => {
    const extraMap: Record<string, { 
      name: string; 
      icon: JSX.Element; 
      color: string; 
      needsTarget: boolean;
      description: string;
    }> = {
      'buyHint': { 
        name: 'Use Hint', 
        icon: <Lightbulb className="h-5 w-5" />, 
        color: 'from-yellow-500 to-orange-500',
        needsTarget: false,
        description: 'Get a helpful hint for this question'
      },
      'freezeOutTeam': { 
        name: 'Freeze Opponent', 
        icon: <Snowflake className="h-5 w-5" />, 
        color: 'from-blue-500 to-cyan-500',
        needsTarget: true,
        description: 'Freeze an opponent for one question'
      }
    };
    
    return extraMap[extraId] || { 
      name: extraId, 
      icon: <Target className="h-5 w-5" />, 
      color: 'from-purple-500 to-pink-500',
      needsTarget: false,
      description: 'Unknown extra'
    };
  };

  const handleExtraClick = (extraId: string) => {
    if (extraId === 'freezeOutTeam') {
      if (playersInRoom.filter(p => p.id !== currentPlayerId).length === 0) {
        alert('No other players to target');
        return;
      }
      setFreezeModalOpen(true);
    } else {
      onUseExtra(extraId);
    }
  };

  const handleFreezeConfirm = (targetPlayerId: string) => {
    console.log('🐛 [FloatingBar] handleFreezeConfirm called with:', targetPlayerId);
    setFreezeModalOpen(false);
    onUseExtra('freezeOutTeam', targetPlayerId);
  };

  // ✅ UPDATED: Don't show if no extras available (now they're filtered out at hook level)
  if (availableExtras.length === 0) return null;

  return (
    <>
      {/* Freeze Modal */}
      <UseExtraModal
        visible={freezeModalOpen}
        players={playersInRoom.filter(p => p.id !== currentPlayerId)}
        onCancel={() => setFreezeModalOpen(false)}
        onConfirm={handleFreezeConfirm}
        extraType="freezeOutTeam"
      />

      {/* Floating Round Extras Bar */}
      <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 transform">
        <div className="bg-muted/95 rounded-full border-2 border-indigo-300 px-6 py-4 shadow-xl backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <span className="whitespace-nowrap text-sm font-medium text-indigo-700">
              Round Actions:
            </span>
            
            {availableExtras.map((extraId) => {
              const extraDetails = getRoundExtraDetails(extraId);
              
              // ✅ SIMPLIFIED: Since used extras are filtered out at hook level,
              // we only need to check for answer submitted (for hints)
              const isHintAfterSubmit = extraId === 'buyHint' && answerSubmitted;
              const shouldDisable = isHintAfterSubmit;
              
              // Status for tooltip
              let statusText = '';
              if (isHintAfterSubmit) {
                statusText = ' (Answer submitted)';
              }
              
              return (
                <button
                  key={extraId}
                  onClick={() => handleExtraClick(extraId)}
                  disabled={shouldDisable}
                  className={`
                    group relative flex h-12 w-12 transform
                    items-center justify-center rounded-full text-lg transition-all
                    duration-200 hover:scale-110 active:scale-95
                    ${shouldDisable 
                      ? 'cursor-not-allowed bg-gray-200 text-gray-400' 
                      : `bg-gradient-to-r ${extraDetails.color} text-white hover:shadow-lg`
                    }
                  `}
                  title={`${extraDetails.name}${statusText}`}
                >
                  {extraDetails.icon}
                  
                  {/* Targeting indicator */}
                  {extraDetails.needsTarget && !shouldDisable && (
                    <Target className="bg-muted absolute -right-1 -top-1 h-4 w-4 rounded-full p-0.5 text-indigo-500" />
                  )}
                  
                  {/* Status indicator - only for answer submitted case */}
                  {shouldDisable && (
                    <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                      ✓
                    </div>
                  )}

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 mb-2 max-w-48 -translate-x-1/2 transform whitespace-nowrap rounded bg-black px-2 py-1 text-center text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="font-medium">{extraDetails.name}</div>
                    <div className="text-xs text-gray-300">{extraDetails.description}</div>
                    {statusText && (
                      <div className="text-xs text-red-300">{statusText.trim()}</div>
                    )}
                    {extraDetails.needsTarget && !shouldDisable && (
                      <div className="text-xs text-gray-300">Click to target player</div>
                    )}
                    {isHintAfterSubmit && (
                      <div className="text-xs text-red-300">Cannot use after submitting</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default FloatingRoundExtrasBar;