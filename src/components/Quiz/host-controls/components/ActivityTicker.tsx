// src/components/Quiz/host-controls/ActivityTicker.tsx
import React, { useEffect, useState } from 'react';
import { X, ChevronUp, ChevronDown } from 'lucide-react';

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
  const [isMinimized, setIsMinimized] = useState(false);

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

  const getActivityBgColor = (type: ActivityItem['type']): string => {
    switch (type) {
      case 'hint': return 'bg-blue-50 border-blue-200';
      case 'freeze': return 'bg-red-50 border-red-200';
      case 'rob': return 'bg-purple-50 border-purple-200';
      case 'restore': return 'bg-green-50 border-green-200';
      default: return 'bg-muted/80 border-border';
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
    <div className={`
      fixed left-4 right-4 z-30 
      ${isMinimized ? 'bottom-4' : 'bottom-4'} 
      transition-all duration-300 ease-in-out
      bg-white/95 backdrop-blur-lg
      border-2 border-indigo-200 
      rounded-2xl shadow-2xl
      ${isMinimized ? 'h-16' : 'h-32'}
      overflow-hidden
    `}>
      <div className="flex h-full flex-col">
        {/* Header with minimize/maximize button */}
        <div className="flex items-center justify-between border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-3">
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white">
              ⚡
            </div>
            <div>
              <h3 className="text-lg font-bold text-indigo-800">Live Activity</h3>
              <p className="text-sm text-indigo-600">{visibleActivities.length} active events</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 transition-colors hover:bg-indigo-200"
              title={isMinimized ? "Expand activity ticker" : "Minimize activity ticker"}
            >
              {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Activity Content */}
        {!isMinimized && (
          <div className="flex flex-1 items-center px-6 py-2">
            {/* Scrolling Activity Feed */}
            <div className="flex flex-1 items-center overflow-hidden">
              <div className="animate-scroll-left flex items-center space-x-4 whitespace-nowrap">
                {visibleActivities.map((activity) => (
                  <div 
                    key={activity.id}
                    className={`
                      flex items-center space-x-3 rounded-xl border-2 px-4 py-3 shadow-sm
                      text-base font-semibold transition-transform hover:scale-105
                      ${getActivityBgColor(activity.type)} ${getActivityColor(activity.type)}
                    `}
                  >
                    <span className="text-2xl">{getActivityIcon(activity.type)}</span>
                    <span className="font-bold">{formatActivityMessage(activity)}</span>
                    {onClearActivity && (
                      <button
                        onClick={() => onClearActivity(activity.id)}
                        className="ml-2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-gray-500 transition-colors hover:bg-gray-300 hover:text-gray-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Minimized state - show condensed info */}
        {isMinimized && (
          <div className="flex flex-1 items-center justify-center px-6">
            <div className="flex items-center space-x-4">
              {visibleActivities.slice(-3).map((activity) => (
                <div key={activity.id} className="flex items-center space-x-2">
                  <span className="text-lg">{getActivityIcon(activity.type)}</span>
                  <span className={`text-sm font-medium ${getActivityColor(activity.type)}`}>
                    {activity.playerName}
                  </span>
                </div>
              ))}
              {visibleActivities.length > 3 && (
                <span className="text-sm text-gray-500">+{visibleActivities.length - 3} more</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced CSS for animation */}
      <style>
        {`
          @keyframes scroll-left {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
          
          .animate-scroll-left {
            animation: scroll-left 25s linear infinite;
          }
          
          .animate-scroll-left:hover {
            animation-play-state: paused;
          }
        `}
      </style>
    </div>
  );
};

export default ActivityTicker;