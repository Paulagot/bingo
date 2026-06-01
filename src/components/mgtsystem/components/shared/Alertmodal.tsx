// client/src/components/common/AlertModal.tsx
import React from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  variant?: 'error' | 'warning' | 'info' | 'success';
  buttonText?: string;
}

const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  title,
  message,
  onClose,
  variant = 'info',
  buttonText = 'OK',
}) => {
  if (!isOpen) return null;

  const variants = {
    error: {
      icon: XCircle,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      buttonBg: 'bg-red-600 hover:bg-red-700',
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      buttonBg: 'bg-yellow-600 hover:bg-yellow-700',
    },
    info: {
      icon: Info,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      buttonBg: 'bg-blue-600 hover:bg-blue-700',
    },
    success: {
      icon: CheckCircle,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      buttonBg: 'bg-green-600 hover:bg-green-700',
    },
  };

  const style = variants[variant];
  const Icon = style.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`flex-shrink-0 w-10 h-10 ${style.iconBg} rounded-full flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${style.iconColor}`} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-600">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className={`px-4 py-2 text-white rounded-lg ${style.buttonBg}`}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;