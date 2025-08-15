// src/components/Quiz/Wizard/QuizWeb3Wizard.tsx
import { useState } from 'react';

import StepFundraisingOptions from './StepFundraisingOptions';
import StepWeb3Prizes from './StepWeb3Prizes';
import StepReviewLaunch from './StepReviewLaunch';

import StepQuizSetup from './StepQuizSetup';
import StepCombinedRounds from './StepCombinedRounds';

interface QuizWizardProps {
  onComplete?: () => void;
}

const steps = [
  'setup',        // Combined: Host Info + Payment + Schedule
  'rounds',         // Select round types
 
  'fundraising',  // Fundraising options
  'stepPrizes',   // Web3 prizes
  'review',       // Final review
] as const;

export default function QuizWeb3Wizard({ onComplete }: QuizWizardProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const goNext = () => {
    if (currentStepIndex >= steps.length - 1) {
      if (onComplete) onComplete();
    } else {
      setCurrentStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentStep = steps[currentStepIndex];

  const renderStep = () => {
    switch (currentStep) {
      case 'setup':
        return <StepQuizSetup onNext={goNext} />;
      case 'rounds':
        return <StepCombinedRounds onNext={goNext} onBack={goBack} />;
    
      case 'fundraising':
        return <StepFundraisingOptions onNext={goNext} onBack={goBack} />;
      case 'stepPrizes':
        return <StepWeb3Prizes onNext={goNext} onBack={goBack} />;
      case 'review':
        return <StepReviewLaunch onNext={goNext} onBack={goBack} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-indigo-800">Create Web3 Impact Quiz</h1>
        <p className="text-sm text-gray-600 mt-2">
          Step {currentStepIndex + 1} of {steps.length}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">{renderStep()}</div>
    </div>
  );
}

