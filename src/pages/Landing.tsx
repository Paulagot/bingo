import React, { useState, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Dices, ArrowRight, Gamepad2 } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

export function Landing() {
  const [roomCode, setRoomCode] = useState('');
  const [name, setName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const navigate = useNavigate();
  const setPlayerName = useGameStore(state => state.setPlayerName);

  const generateRoomCode = () => {
    if (!name.trim()) return;
    
    setIsGenerating(true);
    setPlayerName(name);
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    navigate(`/game/${code}`);
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim() && name.trim()) {
      setPlayerName(name);
      navigate(`/game/${roomCode.toUpperCase()}`);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && name.trim()) {
      generateRoomCode();
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8 md:mb-16"
      >
        <div className="flex justify-center mb-6">
          <Gamepad2 className="h-16 w-16 md:h-20 md:w-20 text-blue-600" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-blue-900 mb-4">
          Multiplayer Bingo
        </h1>
        <p className="text-lg md:text-xl text-blue-700 opacity-80">
          Create a room or join your friends for an exciting game of Bingo!
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-xl p-6 md:p-8"
        >
          <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6 mx-auto">
            <Dices className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-center mb-6">Create Room</h2>
          <div className="space-y-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter Your Name"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
              maxLength={20}
            />
            <button
              onClick={generateRoomCode}
              disabled={isGenerating || !name.trim()}
              className="w-full py-4 px-6 bg-blue-600 text-white rounded-xl font-semibold
                       hover:bg-blue-700 transform transition
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Generate New Room
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-xl p-6 md:p-8"
        >
          <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6 mx-auto">
            <Users className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-center mb-6">Join Room</h2>
          <form onSubmit={joinRoom} className="space-y-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter Your Name"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
              maxLength={20}
            />
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Enter Room Code"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
              maxLength={6}
            />
            <button
              type="submit"
              disabled={!roomCode.trim() || !name.trim()}
              className="w-full py-4 px-6 bg-green-600 text-white rounded-xl font-semibold
                       hover:bg-green-700 transform transition
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
            >
              Join Room
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}