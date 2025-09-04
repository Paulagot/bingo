import { motion } from 'framer-motion';
import type { BingoCell } from './types/game';
import { cn } from './utils/cn';

interface BingoCardProps {
  cells: BingoCell[];
  onCellClick: (index: number) => void;
}

export function BingoCard({ cells, onCellClick }: BingoCardProps) {
  const getColumnCells = (colIndex: number) =>
    Array.from({ length: 5 }, (_, row) => cells[row * 5 + colIndex]);
  
  return (
    <div className="bg-muted mx-auto grid max-w-2xl grid-cols-5 gap-1 rounded-2xl p-4 shadow-xl sm:gap-2 sm:p-6">
      {['B', 'I', 'N', 'G', 'O'].map((letter) => (
        <div
          key={letter}
          className="flex h-10 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-lg font-bold text-white sm:h-12 sm:text-xl md:h-16 md:text-2xl"
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
                "h-10 rounded-lg text-base font-semibold shadow transition-colors duration-200 sm:h-12 sm:text-lg md:h-16 md:text-xl",
                cell.marked
                  ? "bg-gradient-to-r from-green-500 to-teal-500 text-white"
                  : "text-fg bg-gray-100 hover:bg-gray-200"
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