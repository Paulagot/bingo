
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

interface GameAccessAlertProps {
  message: string;
  onClose: () => void;
}

export function GameAccessAlert({ message, onClose }: GameAccessAlertProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className="fixed left-1/2 top-4 z-50 -translate-x-1/2 transform"
    >
      <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-100 px-6 py-4 text-red-800 shadow-lg">
        <AlertCircle className="h-5 w-5" />
        <p className="font-medium">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="ml-4 text-sm font-medium text-red-600 transition-colors hover:text-red-800"
        >
          Close
        </button>
      </div>
    </motion.div>
  );
}