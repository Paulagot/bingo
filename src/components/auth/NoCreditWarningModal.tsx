// client/src/components/auth/NoCreditWarningModal.tsx
import React from 'react';
import { AlertCircle, CreditCard, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NoCreditWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NoCreditWarningModal: React.FC<NoCreditWarningModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleGoToPricing = () => {
    onClose();
    navigate('/pricing');
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 backdrop-blur-sm" style={{ background: 'rgba(16,37,50,0.55)' }}
        onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-sm rounded-xl shadow-2xl p-6"
          style={{ background: '#ffffff', border: '1px solid #dce1df' }}
          onClick={e => e.stopPropagation()}>

          {/* Close */}
          <button onClick={onClose}
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-gray-100"
            style={{ color: '#8a9bab' }}>
            <X className="h-4 w-4" />
          </button>

          {/* Icon */}
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl"
              style={{ background: 'rgba(210,181,130,0.15)', border: '1px solid rgba(210,181,130,0.4)' }}>
              <AlertCircle className="h-7 w-7 text-amber-600" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center">
            <h2 className="mb-2 text-xl font-bold" style={{ color: '#102532' }}>
              No Credits Remaining
            </h2>
            <p className="mb-6 text-sm" style={{ color: '#52636f' }}>
              You have <strong>0 credits</strong> left. To create and launch new quizzes,
              you'll need to purchase more credits.
            </p>

            <div className="flex flex-col gap-3">
              <button onClick={handleGoToPricing}
                className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ background: '#157f85' }}>
                <CreditCard className="h-4 w-4" />
                View Pricing Plans
              </button>
              <button onClick={onClose}
                className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-gray-50"
                style={{ borderColor: '#dce1df', color: '#52636f' }}>
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