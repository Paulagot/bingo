// client/src/components/common/ConfirmModal.tsx
import React from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isProcessing?: boolean;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  itemName?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isProcessing = false,
  variant = 'warning',
  itemName,
}) => {
  if (!isOpen) return null;

  const variants = {
    danger: {
      icon: AlertTriangle,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      highlightBg: 'bg-red-50',
      highlightBorder: 'border-red-200',
      highlightText: 'text-red-800',
      buttonBg: 'bg-red-600 hover:bg-red-700',
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      highlightBg: 'bg-yellow-50',
      highlightBorder: 'border-yellow-200',
      highlightText: 'text-yellow-800',
      buttonBg: 'bg-yellow-600 hover:bg-yellow-700',
    },
    info: {
      icon: Info,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      highlightBg: 'bg-blue-50',
      highlightBorder: 'border-blue-200',
      highlightText: 'text-blue-800',
      buttonBg: 'bg-blue-600 hover:bg-blue-700',
    },
    success: {
      icon: CheckCircle,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      highlightBg: 'bg-green-50',
      highlightBorder: 'border-green-200',
      highlightText: 'text-green-800',
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
            onClick={onCancel}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-600 mb-4">{message}</p>
          {itemName && (
            <div className={`${style.highlightBg} border ${style.highlightBorder} rounded-lg p-3`}>
              <p className={`text-sm ${style.highlightText}`}>
                <span className="font-semibold">"{itemName}"</span>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${style.buttonBg}`}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;