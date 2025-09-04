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
      default: return 'text-fg/70';
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
    <div className="bg-muted/95 border-border fixed bottom-0 left-0 right-0 z-30 h-14 overflow-hidden border-t shadow-lg backdrop-blur">
      <div className="flex h-full items-center px-4">
        {/* Header */}
        <div className="text-fg/80 mr-4 flex-shrink-0 text-sm font-medium">
          Live Activity:
        </div>
        
        {/* Scrolling Activity Feed */}
        <div className="flex flex-1 items-center space-x-6 overflow-hidden">
          <div className="animate-scroll-left flex items-center space-x-6 whitespace-nowrap">
            {visibleActivities.map((activity) => (
              <div 
                key={activity.id}
                className={`flex items-center space-x-2 text-sm font-medium ${getActivityColor(activity.type)} bg-muted/80 border-border rounded-full border px-3 py-1 shadow-sm`}
              >
                <span>{getActivityIcon(activity.type)}</span>
                <span>{formatActivityMessage(activity)}</span>
                {onClearActivity && (
                  <button
                    onClick={() => onClearActivity(activity.id)}
                    className="hover:text-fg/70 ml-2 text-gray-400 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Activity Counter */}
        <div className="text-fg/60 ml-4 flex-shrink-0 text-xs">
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