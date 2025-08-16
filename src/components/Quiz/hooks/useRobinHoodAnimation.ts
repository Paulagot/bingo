import { useState, useEffect } from 'react';

// Define the types for Robin Hood animation data
interface RobinHoodAnimationData {
  stolenPoints: number;
  fromTeam: string;
  toTeam: string;
  robberName: string;
}

// Define socket interface for the events we need
interface QuizSocket {
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback: (data: any) => void) => void;
}

export const useRobinHoodAnimation = (socket: QuizSocket | null) => {
  const [robinHoodData, setRobinHoodData] = useState<RobinHoodAnimationData | null>(null);
  const [isAnimationActive, setIsAnimationActive] = useState<boolean>(false);

  useEffect(() => {
    if (!socket) return;

    const handleRobinHoodAnimation = (data: any) => {
      console.log('Robin Hood animation triggered:', data);
      
      const animationData: RobinHoodAnimationData = {
        stolenPoints: data.stolenPoints,
        fromTeam: data.fromTeam,
        toTeam: data.toTeam,
        robberName: data.robberName
      };
      
      setRobinHoodData(animationData);
      setIsAnimationActive(true);
    };

    // Register the socket listener
    socket.on('robin_hood_animation', handleRobinHoodAnimation);

    // Cleanup
    return () => {
      socket.off('robin_hood_animation', handleRobinHoodAnimation);
    };
  }, [socket]);

  const handleAnimationComplete = () => {
    setIsAnimationActive(false);
    setRobinHoodData(null);
  };

  return {
    robinHoodData,
    isAnimationActive,
    handleAnimationComplete
  };
};