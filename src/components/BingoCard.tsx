import React from 'react';
import { motion } from 'framer-motion';
import { BingoCell } from '../types/game';
import { cn } from '../utils/cn';

interface BingoCardProps {
  cells: BingoCell[];
  onCellClick: (index: number) => void;
}

export function BingoCard({ cells, onCellClick }: BingoCardProps) {
  const getColumnCells = (colIndex: number) => 
    Array.from({ length: 5 }, (_, row) => cells[row * 5 + colIndex]);

  return (
    <div className="grid grid-cols-5 gap-2 p-4 bg-white rounded-lg shadow-xl max-w-2xl mx-auto">
      {['B', 'I', 'N', 'G', 'O'].map((letter) => (
        <div
          key={letter}
          className="flex items-center justify-center h-16 bg-blue-600 text-white text-2xl font-bold rounded"
        >
          {letter}
        </div>
      ))}
      {['B', 'I', 'N', 'G', 'O'].map((_, colIndex) => 
        getColumnCells(colIndex).map((cell, rowIndex) => {
          const index = rowIndex * 5 + colIndex;
          return (
            <motion.button
              key={index}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onCellClick(index)}
              className={cn(
                "h-16 rounded-lg text-xl font-semibold transition-colors duration-200",
                cell.marked
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-800"
              )}
            >
              {cell.number}
            </motion.button>
          );
        })
      )}
    </div>
  );
}