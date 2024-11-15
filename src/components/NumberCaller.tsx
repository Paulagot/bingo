import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getLetterForNumber } from '../utils/gameLogic';

interface NumberCallerProps {
  currentNumber: number | null;
  calledNumbers: number[];
  autoPlay: boolean;
}

export function NumberCaller({ currentNumber, calledNumbers, autoPlay }: NumberCallerProps) {
  return (
    <div className="text-center mb-8">
      <AnimatePresence mode="wait">
        {currentNumber && (
          <motion.div
            key={currentNumber}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="mb-4"
          >
            <div className="text-2xl text-blue-600 font-medium mb-1">
              {getLetterForNumber(currentNumber)}
            </div>
            <div className="text-6xl font-bold text-blue-600">
              {currentNumber}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="flex justify-center mb-4">
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-800">
          <span className="font-medium mr-2">Auto-Play:</span>
          <span className={`w-3 h-3 rounded-full ${autoPlay ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
        {calledNumbers.slice(-10).map((number) => (
          <div
            key={number}
            className="w-12 h-12 flex flex-col items-center justify-center bg-gray-200 rounded-lg text-sm"
          >
            <span className="text-xs text-gray-600">{getLetterForNumber(number)}</span>
            <span className="font-medium">{number}</span>
          </div>
        ))}
      </div>
    </div>
  );
}