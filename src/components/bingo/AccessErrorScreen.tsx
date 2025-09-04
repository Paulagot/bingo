// src/components/AccessErrorScreen.tsx
import type React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { GameAccessAlert } from './GameAccessAlert';

interface AccessErrorScreenProps {
  showAccessError: boolean;
  accessErrorMessage: string;
  onClose: () => void;
}

export const AccessErrorScreen: React.FC<AccessErrorScreenProps> = ({
  showAccessError,
  accessErrorMessage,
  onClose,
}) => {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-white">
      <AnimatePresence>
        {showAccessError && (
          <GameAccessAlert message={accessErrorMessage} onClose={onClose} />
        )}
      </AnimatePresence>
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
        <p className="text-lg font-medium text-indigo-800">Initializing game...</p>
      </div>
    </div>
  );
};
