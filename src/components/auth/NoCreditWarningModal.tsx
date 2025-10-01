// client/src/components/auth/NoCreditWarningModal.tsx
import React from 'react';
import { AlertCircle, CreditCard, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NoCreditWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NoCreditWarningModal: React.FC<NoCreditWarningModalProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleGoToPricing = () => {
    onClose();
    navigate('/pricing');
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Icon */}
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-amber-100 p-3">
              <AlertCircle className="h-8 w-8 text-amber-600" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center">
            <h2 className="mb-2 text-2xl font-bold text-gray-900">
              No Credits Remaining
            </h2>
            <p className="mb-6 text-gray-600">
              You have <strong>0 credits left</strong> in your account. 
              To create and launch new quizzes, you'll need to purchase more credits.
            </p>

            {/* Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleGoToPricing}
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <CreditCard className="h-5 w-5" />
                View Pricing Plans
              </button>
              
              <button
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                I'll do this later
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default NoCreditWarningModal;