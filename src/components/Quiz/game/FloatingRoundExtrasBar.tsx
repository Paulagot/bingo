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
        icon: <Lightbulb className="w-5 h-5" />, 
        color: 'from-yellow-500 to-orange-500',
        needsTarget: false,
        description: 'Get a helpful hint for this question'
      },
      'freezeOutTeam': { 
        name: 'Freeze Opponent', 
        icon: <Snowflake className="w-5 h-5" />, 
        color: 'from-blue-500 to-cyan-500',
        needsTarget: true,
        description: 'Freeze an opponent for one question'
      }
    };
    
    return extraMap[extraId] || { 
      name: extraId, 
      icon: <Target className="w-5 h-5" />, 
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
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-30">
        <div className="bg-white/95 backdrop-blur-sm border-2 border-indigo-300 rounded-full shadow-xl px-6 py-4">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-indigo-700 whitespace-nowrap">
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
                    w-12 h-12 rounded-full flex items-center justify-center
                    transition-all duration-200 transform hover:scale-110 active:scale-95
                    relative group text-lg
                    ${shouldDisable 
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                      : `bg-gradient-to-r ${extraDetails.color} text-white hover:shadow-lg`
                    }
                  `}
                  title={`${extraDetails.name}${statusText}`}
                >
                  {extraDetails.icon}
                  
                  {/* Targeting indicator */}
                  {extraDetails.needsTarget && !shouldDisable && (
                    <Target className="absolute -top-1 -right-1 w-4 h-4 bg-white text-indigo-500 rounded-full p-0.5" />
                  )}
                  
                  {/* Status indicator - only for answer submitted case */}
                  {shouldDisable && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">
                      ✓
                    </div>
                  )}

                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap max-w-48 text-center">
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