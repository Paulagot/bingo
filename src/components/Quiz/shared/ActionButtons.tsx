// src/components/Quiz/shared/ActionButtons.tsx
import React from 'react';
import { ChevronLeft, ChevronRight, Loader } from 'lucide-react';

interface ActionButtonsProps {
  onBack?: () => void;
  onContinue?: () => void;
  backLabel?: string;
  continueLabel?: string;
  continueDisabled?: boolean;
  continueLoading?: boolean;
  layout?: 'row' | 'column';
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onBack,
  onContinue,
  backLabel = 'Back',
  continueLabel = 'Continue',
  continueDisabled = false,
  continueLoading = false,
  layout = 'row',
}) => {
  const containerClass = layout === 'row'
    ? 'flex flex-col space-y-3 sm:flex-row sm:space-x-3 sm:space-y-0'
    : 'flex flex-col space-y-3';

  return (
    <div className={containerClass}>
      {onBack && (
        <button
          onClick={onBack}
          disabled={continueLoading}
          className="flex items-center justify-center space-x-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 sm:px-6 sm:py-3 sm:text-base"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>{backLabel}</span>
        </button>
      )}

      {onContinue && (
        <button
          onClick={onContinue}
          disabled={continueDisabled || continueLoading}
          className="flex flex-1 items-center justify-center space-x-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed sm:px-6 sm:py-3 sm:text-base"
        >
          {continueLoading ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <span>{continueLabel}</span>
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
};

// Specialized button for payment confirmation
export const PaymentConfirmButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  hasCopiedReference?: boolean;
}> = ({ onClick, disabled, loading, hasCopiedReference }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-white font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <Loader className="h-4 w-4 animate-spin" />
          <span>Joining...</span>
        </>
      ) : (
        <>
          <span>{hasCopiedReference ? "I've completed payment" : 'Confirm Payment'}</span>
        </>
      )}
    </button>
  );
};

// Specialized button for pay admin flow
export const PayAdminButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}> = ({ onClick, disabled, loading }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="flex flex-1 items-center justify-center space-x-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 sm:px-6 sm:py-3 sm:text-base"
    >
      {loading ? (
        <>
          <Loader className="h-4 w-4 animate-spin" />
          <span>Joining...</span>
        </>
      ) : (
        <>
          <span>Join & Pay Host</span>
        </>
      )}
    </button>
  );
};