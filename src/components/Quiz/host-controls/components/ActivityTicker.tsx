// src/components/Quiz/host-controls/components/ActivityTicker.tsx
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
  maxVisible = 6 
}) => {
  const [visibleActivities, setVisibleActivities] = useState<ActivityItem[]>([]);
  const [fadingOut, setFadingOut] = useState<Set<string>>(new Set());

  // Filter and limit activities
  useEffect(() => {
    const now = Date.now();
    const filtered = activities
      .filter(activity => now - activity.timestamp < 10000) // 10 seconds visibility
      .slice(-maxVisible);
    
    setVisibleActivities(filtered);
  }, [activities, maxVisible]);

  // Auto-cleanup timer with fade out effect
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      
      // Mark activities that are about to expire for fade out
      setVisibleActivities(prev => {
        const toFade = prev.filter(activity => 
          now - activity.timestamp >= 9000 && now - activity.timestamp < 10000
        );
        
        if (toFade.length > 0) {
          setFadingOut(current => {
            const newSet = new Set(current);
            toFade.forEach(a => newSet.add(a.id));
            return newSet;
          });
        }
        
        return prev.filter(activity => now - activity.timestamp < 10000);
      });
      
      // Clean up fading set
      setFadingOut(current => {
        const newSet = new Set(current);
        visibleActivities.forEach(a => {
          if (Date.now() - a.timestamp >= 10000) {
            newSet.delete(a.id);
          }
        });
        return newSet;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [visibleActivities]);

  const getActivityIcon = (type: ActivityItem['type']): string => {
    switch (type) {
      case 'hint': return '🧪';
      case 'freeze': return '❄️';
      case 'rob': return '💰';
      case 'restore': return '🎯';
      default: return '⚡';
    }
  };

  const getActivityBorderColor = (type: ActivityItem['type']): string => {
    switch (type) {
      case 'hint': return 'border-l-blue-500';
      case 'freeze': return 'border-l-red-500';
      case 'rob': return 'border-l-purple-500';
      case 'restore': return 'border-l-green-500';
      default: return 'border-l-gray-500';
    }
  };

  const formatActionText = (activity: ActivityItem): string => {
    const { type, targetName, questionNumber } = activity;
    
    switch (type) {
      case 'hint':
        return questionNumber ? `Used Hint on Q${questionNumber}` : 'Used Hint';
      case 'freeze':
        return targetName ? `Froze ${targetName}` : 'Froze a player';
      case 'rob':
        return targetName ? `Robbed ${targetName}` : 'Robbed points';
      case 'restore':
        return 'Restored points';
      default:
        return `Used ${type}`;
    }
  };

  const getTimeSince = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    return `${seconds}s`;
  };

  const handleRemove = (id: string) => {
    setFadingOut(current => new Set(current).add(id));
    setTimeout(() => {
      onClearActivity?.(id);
      setFadingOut(current => {
        const newSet = new Set(current);
        newSet.delete(id);
        return newSet;
      });
    }, 300);
  };

  if (visibleActivities.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-40 w-72 space-y-2">
      {visibleActivities.map((activity) => (
        <div 
          key={activity.id}
          className={`
            bg-white rounded-lg shadow-lg border-l-4 p-3
            transform transition-all duration-300 ease-out
            ${getActivityBorderColor(activity.type)}
            ${fadingOut.has(activity.id) 
              ? 'opacity-0 translate-x-4' 
              : 'opacity-100 translate-x-0 animate-slide-in'
            }
          `}
        >
          <div className="flex items-center space-x-2">
            <span className="text-lg flex-shrink-0">{getActivityIcon(activity.type)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {activity.playerName}
              </p>
              <p className="text-xs text-gray-600 truncate">
                {formatActionText(activity)}
              </p>
            </div>
            <div className="flex items-center space-x-1 flex-shrink-0">
              <span className="text-xs text-gray-400">
                {getTimeSince(activity.timestamp)}
              </span>
              {onClearActivity && (
                <button
                  onClick={() => handleRemove(activity.id)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-0.5"
                  title="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      <style>
        {`
          @keyframes slide-in {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          
          .animate-slide-in {
            animation: slide-in 0.3s ease-out;
          }
        `}
      </style>
    </div>
  );
};

export default ActivityTicker;