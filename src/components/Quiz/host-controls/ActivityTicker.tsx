// src/components/Quiz/host-controls/ActivityTicker.tsx
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export interface ActivityItem {
  id: string;
  timestamp: number;
  type: 'hint' | 'freeze' | 'rob' | 'restore';
  playerName: string;
  targetName?: string;
  context?: string;
  round?: number;
  questionNumber?: number;
}

interface ActivityTickerProps {
  activities: ActivityItem[];
  onClearActivity?: (id: string) => void;
  maxVisible?: number;
}

const ActivityTicker: React.FC<ActivityTickerProps> = ({ 
  activities, 
  onClearActivity,
  maxVisible = 8 
}) => {
  const [visibleActivities, setVisibleActivities] = useState<ActivityItem[]>([]);

  // Auto-fade activities after 15 seconds
  useEffect(() => {
    const now = Date.now();
    const filtered = activities
      .filter(activity => now - activity.timestamp < 15000) // 15 seconds
      .slice(-maxVisible); // Keep only the most recent items
    
    setVisibleActivities(filtered);
  }, [activities, maxVisible]);

  // Auto-cleanup timer
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setVisibleActivities(prev => 
        prev.filter(activity => now - activity.timestamp < 15000)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getActivityIcon = (type: ActivityItem['type']): string => {
    switch (type) {
      case 'hint': return '🧪';
      case 'freeze': return '❄️';
      case 'rob': return '💰';
      case 'restore': return '🎯';
      default: return '🔧';
    }
  };

  const getActivityColor = (type: ActivityItem['type']): string => {
    switch (type) {
      case 'hint': return 'text-blue-600';
      case 'freeze': return 'text-red-600';
      case 'rob': return 'text-purple-600';
      case 'restore': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const formatActivityMessage = (activity: ActivityItem): string => {
    const { type, playerName, targetName, questionNumber } = activity;
    
    switch (type) {
      case 'hint':
        return `${playerName} used Hint${questionNumber ? ` (Q${questionNumber})` : ''}`;
      case 'freeze':
        return `${playerName} froze ${targetName || 'someone'}`;
      case 'rob':
        return `${playerName} robbed ${targetName || 'someone'}`;
      case 'restore':
        return `${playerName} restored points`;
      default:
        return `${playerName} used ${type}`;
    }
  };

  if (visibleActivities.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 h-14 overflow-hidden z-30 shadow-lg">
      <div className="flex items-center h-full px-4">
        {/* Header */}
        <div className="flex-shrink-0 mr-4 text-sm font-medium text-gray-700">
          Live Activity:
        </div>
        
        {/* Scrolling Activity Feed */}
        <div className="flex-1 flex items-center space-x-6 overflow-hidden">
          <div className="flex items-center space-x-6 animate-scroll-left whitespace-nowrap">
            {visibleActivities.map((activity) => (
              <div 
                key={activity.id}
                className={`flex items-center space-x-2 text-sm font-medium ${getActivityColor(activity.type)} bg-white/80 px-3 py-1 rounded-full border border-gray-200 shadow-sm`}
              >
                <span>{getActivityIcon(activity.type)}</span>
                <span>{formatActivityMessage(activity)}</span>
                {onClearActivity && (
                  <button
                    onClick={() => onClearActivity(activity.id)}
                    className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Activity Counter */}
        <div className="flex-shrink-0 ml-4 text-xs text-gray-500">
          {visibleActivities.length} active
        </div>
      </div>

      {/* CSS for animation */}
      <div style={{ display: 'none' }}>
        <style>
          {`
            @keyframes scroll-left {
              0% { transform: translateX(100%); }
              100% { transform: translateX(-100%); }
            }
            
            .animate-scroll-left {
              animation: scroll-left 20s linear infinite;
            }
            
            .animate-scroll-left:hover {
              animation-play-state: paused;
            }
          `}
        </style>
      </div>
    </div>
  );
};

export default ActivityTicker;