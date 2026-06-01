// client/src/components/shared/SuccessModal.tsx
import React from 'react';
import { CheckCircle, X } from 'lucide-react';

interface SuccessModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  color?: 'blue' | 'green'; // Match form theme colors
}

const SuccessModal: React.FC<SuccessModalProps> = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  color = 'blue' 
}) => {
  if (!isOpen) return null;

  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'bg-blue-100',
      iconColor: 'text-blue-600',
      button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
      text: 'text-blue-800'
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200', 
      icon: 'bg-green-100',
      iconColor: 'text-green-600',
      button: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
      text: 'text-green-800'
    }
  };

  const styles = colorClasses[color];

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className={`px-6 py-4 border-b ${styles.border} ${styles.bg}`}>
          <div className="flex items-center">
            <div className={`p-2 ${styles.icon} rounded-lg mr-3`}>
              <CheckCircle className={`h-6 w-6 ${styles.iconColor}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-gray-700 mb-6">{message}</p>
          
          {/* Action Button */}
          <div className="flex justify-end">
            <button
              onClick={onConfirm}
              className={`px-6 py-2 text-white rounded-lg font-medium ${styles.button} focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors`}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;