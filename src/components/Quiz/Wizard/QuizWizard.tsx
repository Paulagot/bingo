// src/components/Quiz/Wizard/QuizWizard.tsx
import { useMemo, useEffect } from 'react';
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
  hideEntitlements?: boolean;
  titleOverride?: string;
  isEditMode?: boolean;
}

const steps = ['setup', 'templates', 'rounds', 'fundraising', 'stepPrizes', 'review'] as const;
type StepKey = typeof steps[number];

function clampIndex(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getStepSafe(i: number): StepKey {
  const idx = clampIndex(i, 0, steps.length - 1);
  return steps[idx] ?? 'setup';
}

export default function QuizWizard({
  onComplete,
  hideEntitlements,
  titleOverride,
  isEditMode,
}: QuizWizardProps) {
  const { setupConfig, currentStep, setStep, setFlow } = useQuizSetupStore();
  const { ents } = useEntitlements();

  useEffect(() => {
    setFlow('web2');
  }, [setFlow]);

  const isDonationMode = setupConfig.fundraisingMode === 'donation';

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
    let offset = 1;

    // Skip rounds if template says so
    if (currentStep === 'templates' && setupConfig.skipRoundConfiguration) {
      offset += 1;
    }

    // Skip fundraising step entirely for donation mode
    if (
      (currentStep === 'rounds' && isDonationMode) ||
      (currentStep === 'templates' && setupConfig.skipRoundConfiguration && isDonationMode)
    ) {
      offset += 1;
    }

    if (atLast) {
      onComplete?.();
      return;
    }

    setStep(getStepSafe(index + offset) as unknown as WizardStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    let offset = 1;

    // From prizes, skip fundraising if donation mode
    if (currentStep === 'stepPrizes' && isDonationMode) {
      offset += 1;
    }

    // From fundraising, skip rounds if template says so
    if (currentStep === 'fundraising' && setupConfig.skipRoundConfiguration) {
      offset += 1;
    }

    // From prizes, if both fundraising is skipped (donation) and rounds were skipped (template),
    // go all the way back to templates
    if (currentStep === 'stepPrizes' && isDonationMode && setupConfig.skipRoundConfiguration) {
      offset += 1;
    }

    setStep(getStepSafe(index - offset) as unknown as WizardStep);
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
        return (
          <StepReviewLaunch
            onNext={goNext}
            onBack={goBack}
            onResetToFirst={resetToFirst}
            isEditMode={isEditMode}
          />
        );

      default:
        return <StepQuizSetup onNext={goNext} onResetToFirst={resetToFirst} />;
    }
  };

  return (
    <div className={isEditMode ? '' : 'mx-auto max-w-3xl px-4 py-10'}>
      {!isEditMode && (
        <div className="mb-6 text-center">
          <h1 className="heading-1">{titleOverride ?? 'Create Your Fundraising Quiz'}</h1>
          {!hideEntitlements && <EntitlementsBar ents={ents} className="inline-block" />}
        </div>
      )}

      <div className={isEditMode ? '' : 'bg-muted rounded-xl p-6 shadow-lg'}>
        {renderStep()}
      </div>
    </div>
  );
}

