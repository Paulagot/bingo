// src/components/Quiz/host-controls/SpeedRoundHostPanel.tsx
import React, { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';
import { useQuizSocket } from '../../sockets/QuizSocketProvider';

interface SpeedActivity {
  playerId: string;
  playerName: string;
  correct: boolean;
  wrong: boolean;
  skipped: boolean;
  questionId: string;
  submittedAnswer: string | null;
  correctAnswer: string | null;
  ts: number;
}

interface SpeedStats {
  totalAnswers: number;
  correct: number;
  wrong: number;
  skipped: number;
  answersPerSec: number;
}

interface SpeedRoundHostPanelProps {
  roomId: string;
  visible: boolean;
}

const SpeedRoundHostPanel: React.FC<SpeedRoundHostPanelProps> = ({  visible }) => {
  const { socket } = useQuizSocket();
  
  const [speedActivities, setSpeedActivities] = useState<SpeedActivity[]>([]);
  const [speedStats, setSpeedStats] = useState<SpeedStats>({ 
    totalAnswers: 0, 
    correct: 0, 
    wrong: 0, 
    skipped: 0, 
    answersPerSec: 0 
  });
  const [roundCountdown, setRoundCountdown] = useState<number | null>(null);
  const [activityFilter, setActivityFilter] = useState<'all' | 'correct' | 'wrong' | 'skipped'>('all');

  // Socket listeners for speed round events
  useEffect(() => {
    if (!socket || !visible) return;

    const handleTimeRemaining = ({ remaining }: { remaining: number }) => {
      setRoundCountdown(remaining);
    };

    const handleSpeedActivity = (activity: SpeedActivity) => {
      setSpeedActivities(prev => [activity, ...prev].slice(0, 50));
    };

    const handleSpeedStats = (stats: SpeedStats) => {
      setSpeedStats(stats);
    };

    socket.on('round_time_remaining', handleTimeRemaining);
    socket.on('host_speed_activity', handleSpeedActivity);
    socket.on('host_speed_stats', handleSpeedStats);

    return () => {
      socket.off('round_time_remaining', handleTimeRemaining);
      socket.off('host_speed_activity', handleSpeedActivity);
      socket.off('host_speed_stats', handleSpeedStats);
    };
  }, [socket, visible]);

  // Clear activities when component becomes invisible (round ends)
  useEffect(() => {
    if (!visible) {
      setSpeedActivities([]);
      setSpeedStats({ totalAnswers: 0, correct: 0, wrong: 0, skipped: 0, answersPerSec: 0 });
      setRoundCountdown(null);
      setActivityFilter('all');
    }
  }, [visible]);

  if (!visible) return null;

  // Filter activities based on selected filter
  const filteredActivities = speedActivities.filter(e => {
    switch (activityFilter) {
      case 'correct': return e.correct;
      case 'wrong': return e.wrong;
      case 'skipped': return e.skipped;
      default: return true;
    }
  });

  return (
    <div className="mb-6 rounded-xl border-2 border-blue-200 bg-white p-6 shadow-lg">
      {/* Header with countdown */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-fg text-lg font-bold">⚡ Speed Round — Live Dashboard</h3>
        {roundCountdown !== null && (
          <div className="flex items-center space-x-2">
            <Timer className="h-4 w-4 text-orange-600" />
            <span className={`text-lg font-bold ${
              roundCountdown <= 10 ? 'animate-pulse text-red-600' :
              roundCountdown <= 30 ? 'text-orange-600' : 'text-green-600'
            }`}>
              {roundCountdown}s remaining
            </span>
          </div>
        )}
      </div>

      {/* Enhanced Stats Grid */}
      <div className="mb-6 grid grid-cols-5 gap-3">
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-slate-500 text-sm">Total</div>
          <div className="text-2xl font-bold">{speedStats.totalAnswers}</div>
        </div>
        <div className="rounded-xl bg-emerald-50 p-4 border-2 border-emerald-200">
          <div className="text-emerald-600 text-sm font-medium">✅ Correct</div>
          <div className="text-2xl font-bold text-emerald-700">{speedStats.correct}</div>
        </div>
        <div className="rounded-xl bg-rose-50 p-4 border-2 border-rose-200">
          <div className="text-rose-600 text-sm font-medium">❌ Wrong</div>
          <div className="text-2xl font-bold text-rose-700">{speedStats.wrong}</div>
        </div>
        <div className="rounded-xl bg-amber-50 p-4 border-2 border-amber-200">
          <div className="text-amber-600 text-sm font-medium">⏭️ Skipped</div>
          <div className="text-2xl font-bold text-amber-700">{speedStats.skipped}</div>
        </div>
        <div className="rounded-xl bg-blue-50 p-4">
          <div className="text-blue-600 text-sm">Rate</div>
          <div className="text-lg font-bold text-blue-700">{speedStats.answersPerSec}/s</div>
        </div>
      </div>

      {/* Percentage Breakdown */}
      {speedStats.totalAnswers > 0 && (
        <div className="mb-4 rounded-lg bg-slate-50 p-3">
          <div className="text-sm text-slate-600 font-medium mb-2">Answer Breakdown</div>
          <div className="flex space-x-4 text-sm">
            <span className="text-emerald-600">
              {Math.round((speedStats.correct / speedStats.totalAnswers) * 100)}% correct
            </span>
            <span className="text-rose-600">
              {Math.round((speedStats.wrong / speedStats.totalAnswers) * 100)}% wrong
            </span>
            <span className="text-amber-600">
              {Math.round((speedStats.skipped / speedStats.totalAnswers) * 100)}% skipped
            </span>
          </div>
        </div>
      )}

      {/* Activity Filter Controls */}
      <div className="mb-3 flex space-x-2">
        <button
          onClick={() => setActivityFilter('all')}
          className={`px-3 py-1 rounded text-sm transition-colors ${
            activityFilter === 'all' 
              ? 'bg-blue-100 text-blue-800 font-medium' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All ({speedActivities.length})
        </button>
        <button
          onClick={() => setActivityFilter('correct')}
          className={`px-3 py-1 rounded text-sm transition-colors ${
            activityFilter === 'correct' 
              ? 'bg-emerald-100 text-emerald-800 font-medium' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          ✅ ({speedStats.correct})
        </button>
        <button
          onClick={() => setActivityFilter('wrong')}
          className={`px-3 py-1 rounded text-sm transition-colors ${
            activityFilter === 'wrong' 
              ? 'bg-rose-100 text-rose-800 font-medium' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          ❌ ({speedStats.wrong})
        </button>
        <button
          onClick={() => setActivityFilter('skipped')}
          className={`px-3 py-1 rounded text-sm transition-colors ${
            activityFilter === 'skipped' 
              ? 'bg-amber-100 text-amber-800 font-medium' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          ⏭️ ({speedStats.skipped})
        </button>
      </div>

      {/* Activity Feed */}
      <div className="rounded-xl border bg-white max-h-80 overflow-y-auto">
        <ul className="divide-y">
          {filteredActivities.map((activity, index) => (
            <li key={`${activity.playerId}-${activity.ts}-${index}`} className="flex items-center gap-3 p-3">
              <span className="text-xs text-slate-500 min-w-16">
                {new Date(activity.ts).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit', 
                  second: '2-digit' 
                })}
              </span>
              
              <span className="font-medium min-w-24 truncate" title={activity.playerName}>
                {activity.playerName}
              </span>
              
              {/* Enhanced answer status display */}
              {activity.skipped ? (
                <span className="flex items-center gap-1 text-amber-600 min-w-16">
                  <span>⏭️</span>
                  <span className="text-xs font-medium">Skip</span>
                </span>
              ) : activity.correct ? (
                <span className="flex items-center gap-1 text-green-600 min-w-16">
                  <span>✅</span>
                  <span className="text-xs font-medium">Correct</span>
                </span>
              ) : activity.wrong ? (
                <span className="flex items-center gap-1 text-red-600 min-w-16">
                  <span>❌</span>
                  <span className="text-xs font-medium">Wrong</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-gray-500 min-w-16">
                  <span>❓</span>
                  <span className="text-xs">Unknown</span>
                </span>
              )}
              
              <span className="text-sm text-slate-400 min-w-8">Q{activity.questionId}</span>
              
              {/* Show answer details for wrong answers */}
              {activity.wrong && activity.submittedAnswer && activity.correctAnswer && (
                <span className="text-xs text-slate-500 truncate max-w-32" 
                      title={`Submitted: "${activity.submittedAnswer}" | Correct: "${activity.correctAnswer}"`}>
                  "{activity.submittedAnswer}" → "{activity.correctAnswer}"
                </span>
              )}
            </li>
          ))}
          
          {filteredActivities.length === 0 && speedActivities.length === 0 && (
            <li className="p-4 text-center text-sm text-slate-500">
              Waiting for answers...
            </li>
          )}
          
          {filteredActivities.length === 0 && speedActivities.length > 0 && (
            <li className="p-4 text-center text-sm text-slate-500">
              No {activityFilter} answers yet
            </li>
          )}
        </ul>
      </div>
      
      {/* Activity summary at bottom */}
      {speedActivities.length > 0 && (
        <div className="mt-3 text-center text-xs text-slate-500">
          Showing {filteredActivities.length} of {speedActivities.length} total activities
          {activityFilter !== 'all' && (
            <button
              onClick={() => setActivityFilter('all')}
              className="ml-2 text-blue-600 hover:text-blue-800 underline"
            >
              Show all
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SpeedRoundHostPanel;