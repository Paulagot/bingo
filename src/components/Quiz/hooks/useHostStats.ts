// src/components/Quiz/hooks/useHostStats.ts
import { useState, useEffect, useCallback } from 'react';
import { ActivityItem } from '../host-controls/components/ActivityTicker';
import { RoundStats } from '../host-controls/components/RoundStatsDisplay';

interface UseHostStatsParams {
  socket: any;
  roomId: string;
  debug?: boolean;
}

interface HostStatsState {
  activities: ActivityItem[];
  currentRoundStats: RoundStats | null;
  allRoundsStats: RoundStats[];
  isLoading: boolean;
}

export const useHostStats = ({ socket, roomId, debug = false }: UseHostStatsParams) => {
  const [state, setState] = useState<HostStatsState>({
    activities: [],
    currentRoundStats: null,
    allRoundsStats: [],
    isLoading: false
  });

  // Generate unique activity ID
  const generateActivityId = useCallback(() => {
    return `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Add new activity to the feed
  const addActivity = useCallback((activityData: Omit<ActivityItem, 'id' | 'timestamp'>) => {
    const newActivity: ActivityItem = {
      ...activityData,
      id: generateActivityId(),
      timestamp: Date.now()
    };

    setState(prev => ({
      ...prev,
      activities: [...prev.activities, newActivity].slice(-20) // Keep only last 20 activities
    }));

    if (debug) {
      console.log('[HostStats] 🎬 New activity added:', newActivity);
    }
  }, [generateActivityId, debug]);

  // Clear specific activity
  const clearActivity = useCallback((activityId: string) => {
    setState(prev => ({
      ...prev,
      activities: prev.activities.filter(activity => activity.id !== activityId)
    }));
  }, []);

  // Clear all activities
  const clearAllActivities = useCallback(() => {
    setState(prev => ({
      ...prev,
      activities: []
    }));
  }, []);

  // Update current round stats
  const updateCurrentRoundStats = useCallback((roundStats: RoundStats) => {
    setState(prev => ({
      ...prev,
      currentRoundStats: roundStats
    }));

    if (debug) {
      console.log('[HostStats] 📊 Current round stats updated:', roundStats);
    }
  }, [debug]);

  // Add completed round stats to history
  const addRoundStats = useCallback((roundStats: RoundStats) => {
    setState(prev => ({
      ...prev,
      allRoundsStats: [
        ...prev.allRoundsStats.filter(r => r.roundNumber !== roundStats.roundNumber),
        roundStats
      ].sort((a, b) => a.roundNumber - b.roundNumber)
    }));

    if (debug) {
      console.log('[HostStats] 📈 Round stats added to history:', roundStats);
    }
  }, [debug]);

  // Reset stats for new quiz
  const resetStats = useCallback(() => {
    setState({
      activities: [],
      currentRoundStats: null,
      allRoundsStats: [],
      isLoading: false
    });

    if (debug) {
      console.log('[HostStats] 🔄 Stats reset for new quiz');
    }
  }, [debug]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !roomId) return;

    // Listen for host-specific activity updates
    const handleHostActivityUpdate = (data: any) => {
      if (debug) {
        console.log('[HostStats] 📡 Received host activity update:', data);
      }

      addActivity({
        type: data.type,
        playerName: data.playerName,
        targetName: data.targetName,
        context: data.context,
        round: data.round,
        questionNumber: data.questionNumber
      });
    };

    // Listen for round stats updates
    const handleHostRoundStats = (data: RoundStats) => {
      if (debug) {
        console.log('[HostStats] 📊 Received round stats:', data);
      }
      
      updateCurrentRoundStats(data);
      addRoundStats(data);
    };

    // Listen for final quiz stats
    const handleHostFinalStats = (data: RoundStats[]) => {
      if (debug) {
        console.log('[HostStats] 📈 Received final stats:', data);
      }

      setState(prev => ({
        ...prev,
        allRoundsStats: data.sort((a, b) => a.roundNumber - b.roundNumber)
      }));
    };

    // Listen for current round stats updates (during active round)
    const handleHostCurrentRoundStats = (data: RoundStats) => {
      if (debug) {
        console.log('[HostStats] 📊 Received current round stats update:', data);
      }
      
      updateCurrentRoundStats(data);
    };

    // Register socket listeners
    socket.on('host_activity_update', handleHostActivityUpdate);
    socket.on('host_round_stats', handleHostRoundStats);
    socket.on('host_final_stats', handleHostFinalStats);
    socket.on('host_current_round_stats', handleHostCurrentRoundStats);

    // Cleanup listeners
    return () => {
      socket.off('host_activity_update', handleHostActivityUpdate);
      socket.off('host_round_stats', handleHostRoundStats);
      socket.off('host_final_stats', handleHostFinalStats);
      socket.off('host_current_round_stats', handleHostCurrentRoundStats);
    };
  }, [socket, roomId, debug, addActivity, updateCurrentRoundStats, addRoundStats]);

  // Auto-cleanup old activities
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => ({
        ...prev,
        activities: prev.activities.filter(activity => 
          Date.now() - activity.timestamp < 30000 // Keep activities for 30 seconds
        )
      }));
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    // State
    activities: state.activities,
    currentRoundStats: state.currentRoundStats,
    allRoundsStats: state.allRoundsStats,
    isLoading: state.isLoading,
    
    // Actions
    addActivity,
    clearActivity,
    clearAllActivities,
    updateCurrentRoundStats,
    addRoundStats,
    resetStats,
    
    // Computed values
    hasActivities: state.activities.length > 0,
    hasRoundStats: state.currentRoundStats !== null,
    hasFinalStats: state.allRoundsStats.length > 0,
    totalRounds: state.allRoundsStats.length
  };
};