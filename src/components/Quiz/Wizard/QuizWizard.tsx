// src/components/Quiz/Wizard/QuizWizard.tsx
import { useState } from 'react';
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
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const { setupConfig } = useQuizSetupStore();

  const goNext = () => {
    // Check if we should skip the rounds step for preconfigured quizzes
    if (currentStep === 'templates' && setupConfig.skipRoundConfiguration) {
      // Skip the rounds step, go directly to fundraising
      setCurrentStepIndex((prev) => Math.min(prev + 2, steps.length - 1));
    } else if (currentStepIndex >= steps.length - 1) {
      if (onComplete) onComplete();
    } else {
      setCurrentStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    // Check if we're coming back from a step that was reached by skipping rounds
    if (currentStep === 'fundraising' && setupConfig.skipRoundConfiguration) {
      // Go back to templates step, skipping rounds
      setCurrentStepIndex((prev) => Math.max(prev - 2, 0));
    } else {
      setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentStep = steps[currentStepIndex];

  const renderStep = () => {
    switch (currentStep) {
      case 'setup':
        return <StepQuizSetup onNext={goNext} />;
      
      case 'templates':
        return <StepQuizTemplates onNext={goNext} onBack={goBack} />;
      
      case 'rounds':
        return <StepCombinedRounds onNext={goNext} onBack={goBack} />;
      
      case 'fundraising':
        return <StepFundraisingOptions onNext={goNext} onBack={goBack} />;
        
      case 'stepPrizes':
        return <StepPrizes onNext={goNext} onBack={goBack} />;
     
      case 'review':
        return <StepReviewLaunch onNext={goNext} onBack={goBack} />;
        
      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-indigo-800">Create Your Fundraising Quiz</h1>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">{renderStep()}</div>
    </div>
  );
}


