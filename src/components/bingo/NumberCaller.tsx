import { motion, AnimatePresence } from 'framer-motion';
import { getLetterForNumber } from './utils/gameLogic';


interface NumberCallerProps {
  currentNumber: number | null;
  calledNumbers: number[];
  autoPlay: boolean;
}

export function NumberCaller({ currentNumber, calledNumbers, autoPlay }: NumberCallerProps) {
  return (
    <div className="bg-muted space-y-4 rounded-2xl p-6 text-center shadow-lg">
      <h2 className="mb-2 bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-xl font-bold text-transparent">Current Number</h2>
      
      <div className="flex min-h-24 items-center justify-center">
        <AnimatePresence mode="wait">
          {currentNumber ? (
            <motion.div
              key={currentNumber}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="flex flex-col items-center"
            >
              <div className="text-xl font-medium text-indigo-600 sm:text-2xl">
                {getLetterForNumber(currentNumber)}
              </div>
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-4xl font-bold text-transparent sm:text-5xl md:text-6xl">
                {currentNumber}
              </div>
            </motion.div>
          ) : (
            <div className="italic text-gray-400">Waiting for numbers...</div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="flex justify-center">
        <div className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1.5">
          <span className="mr-2 text-sm font-medium text-indigo-800">Auto-Play:</span>
          <div className="flex items-center gap-1">
            {autoPlay ? (
              <>
                <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                <span className="text-xs font-medium text-green-600">ON</span>
              </>
            ) : (
              <>
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <span className="text-xs font-medium text-red-600">OFF</span>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="border-t border-gray-100 pt-4">
        <h3 className="text-fg/60 mb-3 text-sm font-medium">Last 10 Numbers</h3>
        <div className="mx-auto flex max-w-xl flex-wrap justify-center gap-2">
          {calledNumbers.length > 0 ? (
            calledNumbers.slice(-10).map((number) => (
              <div
                key={number}
                className="flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-indigo-50 text-sm shadow-sm sm:h-12 sm:w-12"
              >
                <span className="text-xs text-indigo-600">{getLetterForNumber(number)}</span>
                <span className="font-medium text-indigo-900">{number}</span>
              </div>
            ))
          ) : (
            <div className="text-sm italic text-gray-400">No numbers called yet</div>
          )}
        </div>
      </div>
    </div>
  );
}