import { useState, useEffect, useRef } from 'react';
import { useQuizSetupStore } from '../hooks/useQuizSetupStore';
import { DynamicChainProvider } from '../../chains/DynamicChainProvider';
import type { SupportedChain } from '../../../chains/types';
import useQuizChainIntegration from '../../../hooks/useQuizChainIntegration';

import StepFundraisingOptions from './StepFundraisingOptions/index';
import StepWeb3Prizes from './StepWeb3Prizes/index';
import StepWeb3ReviewLaunch from './StepWeb3ReviewLaunch/index';
import StepCombinedRounds from './StepCombinedRounds/index';
import StepQuizTemplates from './StepQuizTemplates';
import StepWeb3QuizSetup from './StepWeb3QuizSetup/index';
import WalletDebugPanel from './WalletDebug';

const DEBUG = true;

const debugLog = (source: string, message: string, data?: any) => {
  if (DEBUG) console.log(`🧙‍♂️ [${source}] ${message}`, data ?? '');
};

interface QuizWizardProps {
  onComplete?: () => void;
  onChainUpdate?: (chain: SupportedChain) => void;
  selectedChain?: SupportedChain | null;
}

const steps = ['setup','templates','rounds','fundraising','stepPrizes','review'] as const;

export default function QuizWeb3Wizard({ onComplete, onChainUpdate, selectedChain }: QuizWizardProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const { setupConfig, setStep, setFlow } = useQuizSetupStore();
  const renderCountRef = useRef(0);

  renderCountRef.current += 1;
  debugLog('Web3Wizard', `Render #${renderCountRef.current}`, {
    currentStepIndex,
    currentStep: steps[currentStepIndex],
    selectedChain,
    propsReceived: { hasOnComplete: !!onComplete, hasOnChainUpdate: !!onChainUpdate }
  });

  useEffect(() => { setFlow('web3'); }, [setFlow]);

  // 👉 NEW: derive chain for provider from hook/props/setup (single source of truth)
  const { selectedChain: hookSelectedChain } = useQuizChainIntegration();
  const chainForProvider: SupportedChain | null =
    selectedChain ?? hookSelectedChain ?? (setupConfig.web3Chain as SupportedChain | null) ?? null;


  const currentStep = steps[currentStepIndex];

  const goNext = () => {
    // ... unchanged ...
    if (currentStep === 'templates' && setupConfig.skipRoundConfiguration) {
      setCurrentStepIndex((prev) => Math.min(prev + 2, steps.length - 1));
    } else if (currentStepIndex >= steps.length - 1) {
      onComplete?.();
    } else {
      setCurrentStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    // ... unchanged ...
    if (currentStep === 'fundraising' && setupConfig.skipRoundConfiguration) {
      setCurrentStepIndex((prev) => Math.max(prev - 2, 0));
    } else {
      setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    debugLog('Web3Wizard', 'Current step changed', { stepIndex: currentStepIndex, stepName: currentStep, totalSteps: steps.length });
  }, [currentStepIndex, currentStep]);

  useEffect(() => {
    debugLog('Web3Wizard', 'Setup config changed', {
      web3Chain: setupConfig.web3Chain,
      hostName: setupConfig.hostName,
      entryFee: setupConfig.entryFee,
      skipRoundConfiguration: setupConfig.skipRoundConfiguration
    });
  }, [setupConfig]);

  const renderStep = () => {
    const resetToFirst = () => {
      setFlow('web3');
      setStep('setup');
      setCurrentStepIndex(0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const stepContent = (() => {
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
          return <StepWeb3ReviewLaunch onNext={goNext} onBack={goBack} onResetToFirst={resetToFirst} />;
        default:
          return null;
      }
    })();

    // 👉 UPDATED: wrap based on derived chain, not only the prop
  const isWalletStep = currentStep === 'review';

if (chainForProvider && isWalletStep) {
  return (
    <DynamicChainProvider selectedChain={chainForProvider} key={`provider-${currentStep}`}>
     {chainForProvider === 'stellar' ? <WalletDebugPanel /> : null}
      {stepContent}
    </DynamicChainProvider>
  );
}

    return stepContent;
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* {DEBUG && (
        <div className="fixed right-4 top-16 z-50 max-w-xs rounded bg-purple-900 p-2 font-mono text-xs text-white">
          <div>Wizard Render: #{renderCountRef.current}</div>
          <div>Step: {currentStepIndex + 1}/{steps.length}</div>
          <div>Current: {currentStep}</div>
          <div>Prop Chain: {selectedChain || 'null'}</div>
          <div>Hook Chain: {hookSelectedChain || 'null'}</div>
          <div>Provider Chain: {chainForProvider || 'null'}</div>
        </div>
      )} */}

      {/* If you keep the panel here, it shows store state but NOT Stellar Context */}
      {/* <WalletDebugPanel /> */}

      <div className="mb-6 text-center">
        <h1 className="heading-1">Create Web3 Impact Quiz</h1>
      </div>

      <div className="bg-muted rounded-xl p-6 shadow-lg">{renderStep()}</div>
    </div>
  );
}


