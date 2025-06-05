import { useState } from 'react';
import StepHostInfo from './StepHostInfo';
import StepAddRounds from './StepAddRounds';
import StepFundraisingOptions from './StepFundraisingOptions';
import StepPaymentMethod from './StepPaymentMethod';
import StepReviewLaunch from './StepReviewLaunch';
import StepPrizes from './StepPrizes';

interface QuizWizardProps {
  onComplete?: () => void;   // ✅ add this
}

const steps = ['host', 'payment', 'type',  'fundraising', 'stepPrizes', 'review'] as const;

export default function QuizWizard({ onComplete }: QuizWizardProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const goNext = () => {
    if (currentStepIndex >= steps.length - 1) {
      // ✅ finished wizard
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
      case 'host':
        return <StepHostInfo onNext={goNext} />;
        case 'payment':
        return <StepPaymentMethod onNext={goNext} onBack={goBack} />;
      case 'type':
        return <StepAddRounds onNext={goNext} onBack={goBack} />;
      
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
        <p className="text-sm text-gray-600 mt-2">
          Step {currentStepIndex + 1} of {steps.length}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">{renderStep()}</div>
    </div>
  );
}

