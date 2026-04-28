// src/components/Quiz/shared/StepWrapper.tsx
import React from 'react';

type StepMode = 'modal' | 'page' | 'embedded';

interface StepWrapperProps {
  children: React.ReactNode;
  mode: StepMode;
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

if (mode === 'embedded') {
  return (
    <div className="w-full overflow-hidden rounded-3xl border border-white/30 bg-white text-gray-900 shadow-2xl">
      <div className="h-[82vh] min-h-[680px] w-full overflow-hidden">
        {children}
      </div>
    </div>
  );
}

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-4 sm:py-8">
      <div className="mx-auto max-w-4xl">
        <div className="h-[95vh] w-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl sm:h-[90vh]">
          {children}
        </div>
      </div>
    </div>
  );
};

export const StepHeader: React.FC<StepHeaderProps> = ({ icon, title, subtitle }) => {
  return (
    <div className="border-b border-gray-200 p-4 sm:p-6">
      <div className="flex items-center space-x-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-lg text-white sm:h-12 sm:w-12 sm:text-xl">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold text-gray-950 sm:text-2xl">
            {title}
          </h2>

          {subtitle && (
            <p className="truncate text-sm text-gray-600 sm:text-base">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export const StepContent: React.FC<{
  children: React.ReactNode;
  noPadding?: boolean;
}> = ({ children, noPadding = false }) => {
  return (
    <div className={`flex-1 overflow-y-auto ${noPadding ? '' : 'p-4 pb-36 sm:p-6'}`}>
      {children}
    </div>
  );
};

export const StepFooter: React.FC<StepFooterProps> = ({ children }) => {
  return (
    <div className="sticky bottom-0 border-t border-gray-200 bg-white p-4 shadow-lg">
      {children}
    </div>
  );
};

export const StepLayout: React.FC<{
  mode: StepMode;
  icon: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  onClose?: () => void;
  contentNoPadding?: boolean;
}> = ({
  mode,
  icon,
  title,
  subtitle,
  children,
  footer,
  onClose,
  contentNoPadding,
}) => {
  return (
    <StepWrapper mode={mode} onClose={onClose}>
      <div className="flex h-full flex-col">
        <StepHeader icon={icon} title={title} subtitle={subtitle} />
        <StepContent noPadding={contentNoPadding}>{children}</StepContent>
        <StepFooter>{footer}</StepFooter>
      </div>
    </StepWrapper>
  );
};