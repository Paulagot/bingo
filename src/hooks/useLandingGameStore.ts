// src/hooks/useLandingGameStore.ts - Safe wrapper for Landing page
// This uses your existing bingo store but only imports the parts needed for Landing

// Simple localStorage utility (no Web3 dependencies)
export const clearAllRoomData = () => {
  try {
    const keysToRemove = [
      'roomId', 
      'playerName', 
      'roomCreation', 
      'roomJoining',
      'paymentProof',
      'contractAddress',
      'wagmi.store',
      '@appkit/portfolio_cache',
      'lace-wallet-mode',
      'debug'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('✅ Room data cleared for Landing page');
  } catch (error) {
    console.error('Error clearing room data:', error);
  }
};

// Simple reset function that doesn't import the full bingo store
export const resetGameStateForLanding = () => {
  // Just clear localStorage - don't import the zustand store
  clearAllRoomData();
  
  // Clear any game-related state that might be in localStorage
  try {
    localStorage.removeItem('gameStarted');
    localStorage.removeItem('currentGame');
  } catch (error) {
    console.error('Error resetting game state:', error);
  }
};