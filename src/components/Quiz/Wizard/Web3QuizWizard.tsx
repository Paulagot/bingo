// src/components/Quiz/Wizard/Web3QuizWizard.tsx
import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useQuizSetupStore } from '../hooks/useQuizSetupStore';
import type { SupportedChain } from '../../../chains/types';
import { useMiniAppContext } from '../../../context/MiniAppContext';

// ✅ IMPORT Web3Provider directly (not lazy)
import { Web3Provider } from '../../Web3Provider';

// Regular imports for steps 1-5 (no Web3 needed)
import StepFundraisingOptions from './StepFundraisingOptions';
import StepWeb3Prizes from './StepWeb3Prizes';
import StepCombinedRounds from './StepCombinedRounds';
import StepQuizTemplates from './StepQuizTemplates';
import StepWeb3QuizSetup from './StepWeb3QuizSetup';

// ✅ Only lazy load Step 6 (not the provider)
const StepWeb3ReviewLaunch = lazy(() => import('./StepWeb3ReviewLaunch'));

const DEBUG = true;

const debugLog = (src: string, msg: string, data?: any) => {
  if (DEBUG) console.log(`🧙 [${src}] ${msg}`, data ?? '');
};

interface QuizWizardProps {
  onComplete?: () => void;
  onChainUpdate?: (chain: SupportedChain) => void;
  selectedChain?: SupportedChain | null;
}

const steps = ['setup','templates','rounds','fundraising','stepPrizes','review'] as const;

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="text-center">
      <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-300 border-t-indigo-600" />
      <p className="text-indigo-700 text-sm font-medium">Loading Web3 capabilities...</p>
    </div>
  </div>
);

export default function QuizWeb3Wizard({ onComplete, onChainUpdate }: QuizWizardProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const { setupConfig, setStep, setFlow } = useQuizSetupStore();
  const { isMiniApp } = useMiniAppContext();
  const [hasReachedReview, setHasReachedReview] = useState(false);

  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  useEffect(() => { setFlow('web3'); }, [setFlow]);

  const currentStep = steps[currentStepIndex];
  const isReviewStep = currentStep === 'review';

  useEffect(() => {
    if (isReviewStep && !hasReachedReview) {
      debugLog('Web3Wizard', '🌐 First time reaching review step - mounting Web3Provider permanently');
      setHasReachedReview(true);
    }
  }, [isReviewStep, hasReachedReview]);

  const goNext = () => {
    if (currentStep === 'templates' && setupConfig.skipRoundConfiguration) {
      setCurrentStepIndex((p) => Math.min(p + 2, steps.length - 1));
    } else if (currentStepIndex >= steps.length - 1) {
      onComplete?.();
    } else {
      setCurrentStepIndex((p) => Math.min(p + 1, steps.length - 1));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    if (currentStep === 'fundraising' && setupConfig.skipRoundConfiguration) {
      setCurrentStepIndex((p) => Math.max(p - 2, 0));
    } else {
      setCurrentStepIndex((p) => Math.max(p - 1, 0));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetToFirst = () => {
    setFlow('web3');
    setStep('setup');
    setCurrentStepIndex(0);
    setHasReachedReview(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderStepContent = () => {
    debugLog('Web3Wizard', '⚡ Rendering step:', currentStep);

    switch (currentStep) {
      case 'setup':
        return <StepWeb3QuizSetup onNext={goNext} onChainUpdate={onChainUpdate} onResetToFirst={resetToFirst} />;
      case 'templates':
        return <StepQuizTemplates onNext={goNext} onBack={goBack} onResetToFirst={resetToFirst} />;
      case 'rounds':
        return <StepCombinedRounds onNext={goNext} onBack={goBack} onResetToFirst={resetToFirst} />;
      case 'fundraising':
        return <StepFundraisingOptions onNext={goNext} onBack={goBack} onResetToFirst={resetToFirst} />;
      case 'stepPrizes':
        return <StepWeb3Prizes onNext={goNext} onBack={goBack} onResetToFirst={resetToFirst} />;
      case 'review':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <StepWeb3ReviewLaunch
              onNext={goNext}
              onBack={goBack}
              onResetToFirst={resetToFirst}
            />
          </Suspense>
        );
      default:
        return null;
    }
  };

  const inner = (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 text-center">
        <h1 className="heading-1">Create Web3 Impact Quiz</h1>
      </div>
      <div className="bg-muted rounded-xl p-6 shadow-lg">
        {renderStepContent()}
      </div>
    </div>
  );

  // 🔥 Mini app: Web3Provider already mounted above us in the tree
  if (isMiniApp) {
    debugLog('Web3Wizard', '🎯 Mini app - no Web3Provider wrapper needed');
    return inner;
  }

  // 🔥 Always render Web3Provider in the same position in the tree.
  // Before review: force=false so it only mounts if config says web3 is needed.
  // After review: force=true to ensure it stays mounted.
  // This prevents WalletProvider from remounting on every render.
  debugLog('Web3Wizard', '🌐 Rendering with Web3Provider wrapper', {
    hasReachedReview,
    isReviewStep,
    force: hasReachedReview || isReviewStep,
  });
return (
  <Web3Provider 
    force={hasReachedReview || isReviewStep}
    roomConfig={{
      web3Chain: setupConfig.web3Chain,
      evmNetwork: (setupConfig as any).evmNetwork,
      solanaCluster: (setupConfig as any).solanaCluster,
      stellarNetwork: setupConfig.stellarNetwork,
    }}
  >
    {inner}
  </Web3Provider>
);
}



