// src/components/Quiz/JoinRoom/RoomVerificationStep.tsx
import React, { useState } from 'react';
import { nanoid } from 'nanoid';
import { ChevronRight, AlertCircle } from 'lucide-react';
import { useQuizSocket } from '../sockets/QuizSocketProvider';

interface RoomVerificationStepProps {
  onVerified: (config: any, roomId: string, playerName: string) => void;
  onClose: () => void;
}

export const RoomVerificationStep: React.FC<RoomVerificationStepProps> = ({
  onVerified,
  onClose
}) => {
  const { socket } = useQuizSocket();
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = () => {
    if (!roomId.trim() || !playerName.trim()) {
      setError('Please enter both Room ID and your name.');
      return;
    }

     // Add these debug logs:
  console.log('Socket connection state:', socket?.connected);
  console.log('Socket object:', socket);
  console.log('About to emit verify_quiz_room with:', { roomId: roomId.trim() });
    
    setError('');
    setLoading(true);

    socket?.emit('verify_quiz_room', { roomId: roomId.trim() });
    
    socket?.once('quiz_room_verification_result', (data: any) => {
      console.log('🔍 Room verification response:', data)
      setLoading(false);
      
      if (!data.exists) {
        setError('Room not found. Please check the Room ID.');
        return;
      }
      
      // Pass the room config and user input to parent
      onVerified(data, roomId.trim(), playerName.trim());
    });
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-center space-x-3 py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-indigo-600"></div>
          <span className="text-fg/80">Verifying room...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center space-x-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-lg text-white sm:h-12 sm:w-12 sm:text-xl">
          🎯
        </div>
        <div>
          <h2 className="text-fg text-xl font-bold sm:text-2xl">Join Quiz Game</h2>
          <p className="text-fg/70 text-sm sm:text-base">Enter your details to join the fun!</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-fg/80 mb-2 block text-sm font-medium">Room ID</label>
          <input
            value={roomId}
            onChange={e => setRoomId(e.target.value)}
            placeholder="Enter the room ID"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:px-4 sm:py-3 sm:text-base"
          />
        </div>
        <div>
          <label className="text-fg/80 mb-2 block text-sm font-medium">Your Name</label>
          <input
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            placeholder="Enter your display name"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:px-4 sm:py-3 sm:text-base"
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center space-x-2 rounded-lg border border-red-200 bg-red-50 p-3 sm:p-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
          <p className="text-sm text-red-700 sm:text-base">{error}</p>
        </div>
      )}

      <div className="border-border mt-6 flex flex-col justify-end space-y-3 border-t pt-6 sm:flex-row sm:space-x-3 sm:space-y-0">
        <button 
          onClick={onClose} 
          className="text-fg/80 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-200 sm:px-6 sm:py-3 sm:text-base"
        >
          Cancel
        </button>
        <button 
          onClick={handleVerify} 
          className="flex items-center justify-center space-x-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 sm:px-6 sm:py-3 sm:text-base"
        >
          <span>Continue</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};