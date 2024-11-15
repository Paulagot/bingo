import React from 'react';
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
      className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
    >
      <div className="flex items-center gap-3 px-6 py-4 bg-red-100 text-red-800 rounded-lg shadow-lg">
        <AlertCircle className="w-5 h-5" />
        <p className="font-medium">{message}</p>
        <button
          onClick={onClose}
          className="ml-4 text-sm text-red-600 hover:text-red-800"
        >
          Close
        </button>
      </div>
    </motion.div>
  );
}