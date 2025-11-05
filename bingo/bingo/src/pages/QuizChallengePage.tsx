// src/pages/QuizChallengePage.tsx
import { useState, useCallback, useRef, useEffect } from 'react';

import QuizWizard from '../components/Quiz/Wizard/QuizWizard';
import Web3QuizWizard from '../components/Quiz/Wizard/Web3QuizWizard';
import { useNavigate } from 'react-router-dom';
import type { SupportedChain } from '../chains/types';
import {JoinRoomFlow } from '../components/Quiz/joinroom/JoinRoomFlow';
import { QuizSocketProvider } from '../components/Quiz/sockets/QuizSocketProvider';

// ✅ Debug toggle - set to false for production
const DEBUG = false;

const debugLog = (source: string, message: string, data?: any) => {
  if (DEBUG) {
    console.log(`🐛 [${source}] ${message}`, data ? data : '');
  }
};

const QuizChallengePage = () => {
  const [showWizard, setShowWizard] = useState(false);
  const [showWeb3Wizard, setShowWeb3Wizard] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const navigate = useNavigate();
  
  // Track the selected chain for wallet provider
  const [selectedChain, setSelectedChain] = useState<SupportedChain | null>(null);
  
  // Use ref to prevent re-renders from affecting wizard step navigation
  const chainUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const renderCountRef = useRef(0);

  // Track render count
  renderCountRef.current += 1;
  debugLog('QuizChallengePage', `Render #${renderCountRef.current}`, {
    showWizard,
    showWeb3Wizard,
    showJoinModal,
    selectedChain,
  });

  // Handler to update selected chain with debouncing to prevent interference
  const handleChainUpdate = useCallback((newChain: SupportedChain) => {
    debugLog('QuizChallengePage', 'handleChainUpdate called', { newChain, currentChain: selectedChain });
    
    // Clear any pending updates
    if (chainUpdateTimeoutRef.current) {
      clearTimeout(chainUpdateTimeoutRef.current);
      debugLog('QuizChallengePage', 'Cleared pending chain update');
    }
    
    // Debounce chain updates to prevent interference with wizard navigation
    chainUpdateTimeoutRef.current = setTimeout(() => {
      debugLog('QuizChallengePage', 'Executing delayed chain update', { newChain });
      setSelectedChain(newChain);
    }, 100); // Small delay to let wizard navigation complete first
  }, [selectedChain]);

  // Handler for regular quiz wizard completion
  const handleWizardComplete = () => {
    debugLog('QuizChallengePage', 'handleWizardComplete called');
    setShowWizard(false);
    navigate('/quiz/dashboard');
  };

  // Handler for Web3 wizard - DON'T call this until StepWeb3ReviewLaunch finishes
  const handleWeb3WizardComplete = () => {
    debugLog('QuizChallengePage', 'handleWeb3WizardComplete called');
    setShowWeb3Wizard(false);
    setSelectedChain(null); // Clean up
    if (chainUpdateTimeoutRef.current) {
      clearTimeout(chainUpdateTimeoutRef.current);
      debugLog('QuizChallengePage', 'Cleared chain update timeout on completion');
    }
    // StepWeb3ReviewLaunch will handle navigation to host dashboard after blockchain deployment
  };

  // Debug effect to track state changes
  useEffect(() => {
    debugLog('QuizChallengePage', 'State changed', {
      showWizard,
      showWeb3Wizard,
      showJoinModal,
      selectedChain,
    });
  }, [showWizard, showWeb3Wizard, showJoinModal, selectedChain]);

  // Track selected chain changes
  useEffect(() => {
    debugLog('QuizChallengePage', 'Selected chain changed', { 
      from: 'previous', 
      to: selectedChain 
    });
  }, [selectedChain]);

  const isAnyModalOpen = showWizard || showWeb3Wizard || showJoinModal;
  debugLog('QuizChallengePage', 'Modal state', { isAnyModalOpen });

  return (
    <div className={isAnyModalOpen ? "" : "mx-auto max-w-3xl p-8"}>
      {!isAnyModalOpen && (
        <>
          <h1 className="mb-6 text-4xl font-bold">🧠 Quiz Challenge</h1>
          <p className="text-fg/80 mb-8">
            Welcome to the ultimate fundraising quiz! Choose an action below to get started.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row">
            <button
              className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow hover:bg-indigo-700"
              onClick={() => {
                debugLog('QuizChallengePage', 'Regular wizard button clicked');
                setShowWizard(true);
              }}
            >
              🎤 Host a Quiz
            </button>

            <button
              className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow hover:bg-green-700"
              onClick={() => {
                debugLog('QuizChallengePage', 'Web3 wizard button clicked');
                setShowWeb3Wizard(true);
              }}
            >
              🌐 Host Web3 Impact Event
            </button>

            <button
              className="bg-muted rounded-xl border border-indigo-600 px-6 py-3 font-semibold text-indigo-600 hover:bg-indigo-50"
              onClick={() => {
                debugLog('QuizChallengePage', 'Join modal button clicked');
                setShowJoinModal(true);
              }}
            >
              🙋 Join a Quiz
            </button>
          </div>
        </>
      )}

      {/* Debug info */}
      {DEBUG && (
        <div className="fixed right-4 top-4 z-50 max-w-xs rounded bg-black p-2 font-mono text-xs text-white">
          <div>Render: #{renderCountRef.current}</div>
          <div>Chain: {selectedChain || 'null'}</div>
          <div>Web3 Wizard: {showWeb3Wizard ? 'open' : 'closed'}</div>
        </div>
      )}

      {/* Modals */}
      {showWizard && (
        <QuizWizard onComplete={handleWizardComplete} />
      )}
      
      {/* ✅ Web3 Wizard with external chain provider */}
      {showWeb3Wizard && (
        <>
          {debugLog('QuizChallengePage', 'Rendering Web3Wizard with external provider')}
          <Web3QuizWizard 
            key="web3-wizard-stable"
            selectedChain={selectedChain}
            onComplete={handleWeb3WizardComplete}
            onChainUpdate={handleChainUpdate}
          />
        </>
      )}
      
{showJoinModal && (
  <QuizSocketProvider>
    <JoinRoomFlow onClose={() => setShowJoinModal(false)} />
  </QuizSocketProvider>
)}
    </div>
  );
};

export default QuizChallengePage;
