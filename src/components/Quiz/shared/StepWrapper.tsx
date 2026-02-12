// src/components/Quiz/shared/StepWrapper.tsx
import React from 'react';

interface StepWrapperProps {
  children: React.ReactNode;
  mode: 'modal' | 'page';
  onClose?: () => void;
}

interface StepHeaderProps {
  icon: string;
  title: string;
  subtitle?: string;
}

interface StepFooterProps {
  children: React.ReactNode;
}

// Main wrapper component
export const StepWrapper: React.FC<StepWrapperProps> = ({ children, mode }) => {
  if (mode === 'modal') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 p-2 sm:p-4">
        <div className="bg-white max-h-[95vh] w-full max-w-4xl overflow-hidden rounded-xl shadow-xl sm:max-h-[90vh]">
          {children}
        </div>
      </div>
    );
  }

  // Page mode - similar constraint but not fixed/overlay
  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4 sm:py-8">
      <div className="mx-auto max-w-4xl">
        <div className="bg-white h-[95vh] sm:h-[90vh] w-full overflow-hidden rounded-xl shadow-xl border border-gray-100">
          {children}
        </div>
      </div>
    </div>
  );
};

// Header component
export const StepHeader: React.FC<StepHeaderProps> = ({ icon, title, subtitle }) => {
  return (
    <div className="border-b border-gray-200 p-4 sm:p-6">
      <div className="flex items-center space-x-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-lg text-white sm:h-12 sm:w-12 sm:text-xl">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold sm:text-2xl truncate">{title}</h2>
          {subtitle && (
            <p className="text-gray-600 text-sm sm:text-base truncate">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Content area - scrollable
export const StepContent: React.FC<{ children: React.ReactNode; noPadding?: boolean }> = ({ 
  children,
  noPadding = false 
}) => {
  return (
    <div className={`flex-1 overflow-y-auto ${noPadding ? '' : 'p-4 sm:p-6 pb-36'}`}>
      {children}
    </div>
  );
};

// Footer - sticky at bottom
export const StepFooter: React.FC<StepFooterProps> = ({ children }) => {
  return (
    <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg">
      {children}
    </div>
  );
};

// Complete step layout helper
export const StepLayout: React.FC<{
  mode: 'modal' | 'page';
  icon: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  onClose?: () => void;
  contentNoPadding?: boolean;
}> = ({ mode, icon, title, subtitle, children, footer, onClose, contentNoPadding }) => {
  return (
    <StepWrapper mode={mode} onClose={onClose}>
      <div className="flex flex-col h-full">
        <StepHeader icon={icon} title={title} subtitle={subtitle} />
        <StepContent noPadding={contentNoPadding}>{children}</StepContent>
        <StepFooter>{footer}</StepFooter>
      </div>
    </StepWrapper>
  );
};