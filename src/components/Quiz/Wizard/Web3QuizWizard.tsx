// src/components/Quiz/Wizard/QuizWeb3Wizard.tsx
import { useState, useEffect, useRef } from 'react';
import { useQuizSetupStore } from '../hooks/useQuizSetupStore';
import { DynamicChainProvider } from '../../chains/DynamicChainProvider';
import type { SupportedChain } from '../../../chains/types';

import StepFundraisingOptions from './StepFundraisingOptions';
import StepWeb3Prizes from './StepWeb3Prizes';
// Import the NEW Web3-specific review step
import StepWeb3ReviewLaunch from './StepWeb3ReviewLaunch';

import StepCombinedRounds from './StepCombinedRounds';
import StepQuizTemplates from './StepQuizTemplates';
import StepWeb3QuizSetup from './StepWeb3QuizSetup';

// ✅ Debug toggle
const DEBUG = false;

const debugLog = (source: string, message: string, data?: any) => {
  if (DEBUG) {
    console.log(`🧙‍♂️ [${source}] ${message}`, data ? data : '');
  }
};

interface QuizWizardProps {
  onComplete?: () => void;
  onChainUpdate?: (chain: SupportedChain) => void;
  selectedChain?: SupportedChain | null;
}

const steps = [
  'setup',        // Combined: Host Info + Payment + Schedule
  'templates',    // Select round types
  'rounds',
  'fundraising',  // Fundraising options
  'stepPrizes',   // Web3 prizes
  'review',       // Final review & Web3 deployment
] as const;

export default function QuizWeb3Wizard({ onComplete, onChainUpdate, selectedChain }: QuizWizardProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const { setupConfig, setStep, setFlow } = useQuizSetupStore();
  const renderCountRef = useRef(0);

  // Track render count
  renderCountRef.current += 1;
  debugLog('Web3Wizard', `Render #${renderCountRef.current}`, {
    currentStepIndex,
    currentStep: steps[currentStepIndex],
    selectedChain: selectedChain,
    propsReceived: { hasOnComplete: !!onComplete, hasOnChainUpdate: !!onChainUpdate }
  });

  useEffect(() => {
  setFlow('web3');
}, [setFlow]);

  const currentStep = steps[currentStepIndex];

  const goNext = () => {
    debugLog('Web3Wizard', 'goNext called', { 
      from: currentStep, 
      fromIndex: currentStepIndex,
      toIndex: currentStepIndex + 1,
      maxIndex: steps.length - 1
    });

    // Check if we should skip the rounds step for preconfigured quizzes
    if (currentStep === 'templates' && setupConfig.skipRoundConfiguration) {
      debugLog('Web3Wizard', 'Skipping rounds step due to skipRoundConfiguration');
      // Skip the rounds step, go directly to fundraising
      setCurrentStepIndex((prev) => {
        const newIndex = Math.min(prev + 2, steps.length - 1);
        debugLog('Web3Wizard', 'Step index updated (skip)', { from: prev, to: newIndex });
        return newIndex;
      });
    } else if (currentStepIndex >= steps.length - 1) {
      debugLog('Web3Wizard', 'At final step, calling onComplete');
      // Only call onComplete when we're ACTUALLY at the final step (review)
      // This should only happen from StepWeb3ReviewLaunch after successful deployment
      if (onComplete) {
        debugLog('Web3Wizard', 'Calling onComplete callback');
        onComplete();
      } else {
        debugLog('Web3Wizard', 'No onComplete callback provided');
      }
    } else {
      setCurrentStepIndex((prev) => {
        const newIndex = Math.min(prev + 1, steps.length - 1);
        debugLog('Web3Wizard', 'Step index updated (normal)', { from: prev, to: newIndex, newStep: steps[newIndex] });
        return newIndex;
      });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    debugLog('Web3Wizard', 'goBack called', { 
      from: currentStep, 
      fromIndex: currentStepIndex 
    });

    // Check if we're coming back from a step that was reached by skipping rounds
    if (currentStep === 'fundraising' && setupConfig.skipRoundConfiguration) {
      debugLog('Web3Wizard', 'Going back with skip logic');
      // Go back to templates step, skipping rounds
      setCurrentStepIndex((prev) => {
        const newIndex = Math.max(prev - 2, 0);
        debugLog('Web3Wizard', 'Step index updated (back skip)', { from: prev, to: newIndex });
        return newIndex;
      });
    } else {
      setCurrentStepIndex((prev) => {
        const newIndex = Math.max(prev - 1, 0);
        debugLog('Web3Wizard', 'Step index updated (back normal)', { from: prev, to: newIndex, newStep: steps[newIndex] });
        return newIndex;
      });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Track step changes
  useEffect(() => {
    debugLog('Web3Wizard', 'Current step changed', {
      stepIndex: currentStepIndex,
      stepName: currentStep,
      totalSteps: steps.length
    });
  }, [currentStepIndex, currentStep]);

  // Track setup config changes
  useEffect(() => {
    debugLog('Web3Wizard', 'Setup config changed', {
      web3Chain: setupConfig.web3Chain,
      hostName: setupConfig.hostName,
      entryFee: setupConfig.entryFee,
      skipRoundConfiguration: setupConfig.skipRoundConfiguration
    });
  }, [setupConfig]);

  const renderStep = () => {
    debugLog('Web3Wizard', 'Rendering step', { currentStep: currentStep, selectedChain: selectedChain });

    // inside QuizWeb3Wizard component
const resetToFirst = () => {
  setFlow('web3');     // ensure flow stays web3 after a hard reset
  setStep('setup');
  setCurrentStepIndex(0);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

    
    const stepContent = (() => {
      switch (currentStep) {
        case 'setup':
          debugLog('Web3Wizard', 'Rendering StepWeb3QuizSetup');
          return (
            <StepWeb3QuizSetup 
              onNext={goNext} 
              onChainUpdate={onChainUpdate}
               onResetToFirst={resetToFirst}
            />
          );
        case 'templates':
          debugLog('Web3Wizard', 'Rendering StepQuizTemplates');
          return <StepQuizTemplates onNext={goNext} onBack={goBack} onResetToFirst={resetToFirst}   />;
        case 'rounds':
          debugLog('Web3Wizard', 'Rendering StepCombinedRounds');
          return <StepCombinedRounds onNext={goNext} onBack={goBack} onResetToFirst={resetToFirst} />;
        case 'fundraising':
          debugLog('Web3Wizard', 'Rendering StepFundraisingOptions');
          return <StepFundraisingOptions onNext={goNext} onBack={goBack} onResetToFirst={resetToFirst} />;
        case 'stepPrizes':
          debugLog('Web3Wizard', 'Rendering StepWeb3Prizes');
          return <StepWeb3Prizes onNext={goNext} onBack={goBack} onResetToFirst={resetToFirst} />;
        case 'review':
          debugLog('Web3Wizard', 'Rendering StepWeb3ReviewLaunch');
          return <StepWeb3ReviewLaunch onNext={goNext} onBack={goBack} onResetToFirst={resetToFirst} />;
        default:
          debugLog('Web3Wizard', 'Unknown step, returning null', { currentStep: currentStep });
          return null;
      }
    })();

    // Only wrap wallet-dependent steps with DynamicChainProvider
    const walletDependentSteps = ['review']; // Add more steps that need wallet access
    if (selectedChain && walletDependentSteps.includes(currentStep)) {
      debugLog('Web3Wizard', 'Wrapping step with DynamicChainProvider', { currentStep: currentStep, selectedChain: selectedChain });
      return (
        <DynamicChainProvider selectedChain={selectedChain} key={`provider-${currentStep}`}>
          {stepContent}
        </DynamicChainProvider>
      );
    }

    return stepContent;
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Debug info */}
      {DEBUG && (
        <div className="fixed right-4 top-16 z-50 max-w-xs rounded bg-purple-900 p-2 font-mono text-xs text-white">
          <div>Wizard Render: #{renderCountRef.current}</div>
          <div>Step: {currentStepIndex + 1}/{steps.length}</div>
          <div>Current: {currentStep}</div>
          <div>Chain: {selectedChain || 'null'}</div>
        </div>
      )}

      <div className="mb-6 text-center">
        <h1 className="heading-1">Create Web3 Impact Quiz</h1>
        
      </div>

      <div className="bg-muted rounded-xl p-6 shadow-lg">{renderStep()}</div>
    </div>
  );
}

