// src/components/Quiz/Wizard/QuizWizard.tsx
import {  useMemo } from 'react';
import { useQuizSetupStore } from '../hooks/useQuizSetupStore';

import StepFundraisingOptions from './StepFundraisingOptions';
import StepReviewLaunch from './StepReviewLaunch';
import StepPrizes from './StepPrizes';
import StepQuizSetup from './StepQuizSetup';
import StepQuizTemplates from './StepQuizTemplates'; // NEW COMPONENT
import StepCombinedRounds from './StepCombinedRounds';

interface QuizWizardProps {
  onComplete?: () => void;
}

const steps = [
  'setup', 
  'templates',     // NEW STEP
  'rounds',
  'fundraising',
  'stepPrizes',
  'review',
] as const;

export default function QuizWizard({ onComplete }: QuizWizardProps) {
  const { setupConfig, currentStep, setStep } = useQuizSetupStore();

  const index = useMemo(() => steps.indexOf(currentStep), [currentStep]);
  const atLast = index >= steps.length - 1;

  const resetToFirst = () => {
    setStep('setup'); // <-- always the first step key for Web2 wizard
    window.scrollTo({ top: 0 });
  };

  const goNext = () => {
    if (currentStep === 'templates' && setupConfig.skipRoundConfiguration) {
      setStep(steps[Math.min(index + 2, steps.length - 1)]);
    } else if (atLast) {
      onComplete?.();
    } else {
      setStep(steps[index + 1]);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    if (currentStep === 'fundraising' && setupConfig.skipRoundConfiguration) {
      setStep(steps[Math.max(index - 2, 0)]);
    } else {
      setStep(steps[Math.max(index - 1, 0)]);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'setup':
        return <StepQuizSetup onNext={goNext} onResetToFirst={resetToFirst} />;
      case 'templates':
        return <StepQuizTemplates onNext={goNext} onBack={goBack} onResetToFirst={resetToFirst} />;
      case 'rounds':
        return <StepCombinedRounds onNext={goNext} onBack={goBack} onResetToFirst={resetToFirst} />;
      case 'fundraising':
        return <StepFundraisingOptions onNext={goNext} onBack={goBack} onResetToFirst={resetToFirst} />;
      case 'stepPrizes':
        return <StepPrizes onNext={goNext} onBack={goBack} onResetToFirst={resetToFirst} />;
      case 'review':
        return <StepReviewLaunch onNext={goNext} onBack={goBack} onResetToFirst={resetToFirst} />;
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 text-center">
        <h1 className="heading-1">Create Your Fundraising Quiz</h1>
      </div>
      <div className="bg-muted rounded-xl p-6 shadow-lg">{renderStep()}</div>
    </div>
  );
}