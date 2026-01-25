// src/components/Quiz/Wizard/QuizWizard.tsx
import { useMemo } from 'react';
import { useQuizSetupStore } from '../hooks/useQuizSetupStore';

import StepFundraisingOptions from './StepFundraisingOptions';
import StepReviewLaunch from './StepReviewLaunch';
import StepPrizes from './StepPrizes';
import StepQuizSetup from './StepQuizSetup';
import StepQuizTemplates from './StepQuizTemplates';
import StepCombinedRounds from './StepCombinedRounds';
import EntitlementsBar from './EntitlementsBar';
import { useEntitlements } from '../hooks/useEntitlements';

// Keep in sync with your store WizardStep union
type WizardStep = 'setup' | 'templates' | 'rounds' | 'fundraising' | 'stepPrizes' | 'review';

interface QuizWizardProps {
  onComplete?: () => void;
  hideEntitlements?: boolean; // ✅ NEW
  titleOverride?: string;     // ✅ optional, nice for edit
}

const steps = ['setup', 'templates', 'rounds', 'fundraising', 'stepPrizes', 'review'] as const;
type StepKey = typeof steps[number];

function clampIndex(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getStepSafe(i: number): StepKey {
  const idx = clampIndex(i, 0, steps.length - 1);
return steps[idx] ?? 'setup'; // ✅ always defined
}

export default function QuizWizard({
  onComplete,
  hideEntitlements,
  titleOverride,
}: QuizWizardProps) {
  const { setupConfig, currentStep, setStep } = useQuizSetupStore();
  const { ents } = useEntitlements();

  // If currentStep is ever not found, treat it as first step
  const index = useMemo(() => {
    const i = steps.indexOf(currentStep as StepKey);
    return i >= 0 ? i : 0;
  }, [currentStep]);

  const atLast = index >= steps.length - 1;

  const resetToFirst = () => {
    setStep('setup');
    window.scrollTo({ top: 0 });
  };

  const goNext = () => {
    // Skip rounds if template says so
    if (currentStep === 'templates' && setupConfig.skipRoundConfiguration) {
      setStep(getStepSafe(index + 2) as unknown as WizardStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (atLast) {
      onComplete?.();
      return;
    }

    setStep(getStepSafe(index + 1) as unknown as WizardStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    if (currentStep === 'fundraising' && setupConfig.skipRoundConfiguration) {
      setStep(getStepSafe(index - 2) as unknown as WizardStep);
    } else {
      setStep(getStepSafe(index - 1) as unknown as WizardStep);
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
        // Fallback (shouldn’t happen, but keeps TS happy and UI resilient)
        return <StepQuizSetup onNext={goNext} onResetToFirst={resetToFirst} />;
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
<div className="mb-6 text-center">
  <h1 className="heading-1">
    {titleOverride ?? 'Create Your Fundraising Quiz'}
  </h1>

  {!hideEntitlements && (
    <EntitlementsBar ents={ents} className="inline-block" />
  )}
</div>



      <div className="bg-muted rounded-xl p-6 shadow-lg">{renderStep()}</div>
    </div>
  );
}

