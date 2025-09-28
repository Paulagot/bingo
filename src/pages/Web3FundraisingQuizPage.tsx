
// src/pages/Web3FundraisingQuizPage.tsx - NEW: Web3 and Join options (public)
import { useState, useCallback, useRef, useEffect } from 'react';

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

const Web3FundraisingQuizPage = () => {
  const [showWeb3Wizard, setShowWeb3Wizard] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const navigate = useNavigate();
  
const [detectedChain, setDetectedChain] = useState<SupportedChain | null>(null);
  
  // Track the selected chain for wallet provider
  const [selectedChain, setSelectedChain] = useState<SupportedChain | null>(null);
  
  // Use ref to prevent re-renders from affecting wizard step navigation
  const chainUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const renderCountRef = useRef(0);

  // Track render count
  renderCountRef.current += 1;
  debugLog('Web3FundraisingQuizPage', `Render #${renderCountRef.current}`, {
    showWeb3Wizard,
    showJoinModal,
    selectedChain,
  });

  // Handler to update selected chain with debouncing to prevent interference
  const handleChainUpdate = useCallback((newChain: SupportedChain) => {
    debugLog('Web3FundraisingQuizPage', 'handleChainUpdate called', { newChain, currentChain: selectedChain });
    
    // Clear any pending updates
    if (chainUpdateTimeoutRef.current) {
      clearTimeout(chainUpdateTimeoutRef.current);
      debugLog('Web3FundraisingQuizPage', 'Cleared pending chain update');
    }
    
    // Debounce chain updates to prevent interference with wizard navigation
    chainUpdateTimeoutRef.current = setTimeout(() => {
      debugLog('Web3FundraisingQuizPage', 'Executing delayed chain update', { newChain });
      setSelectedChain(newChain);
    }, 100); // Small delay to let wizard navigation complete first
  }, [selectedChain]);

  // Handler for Web3 wizard - DON'T call this until StepWeb3ReviewLaunch finishes
  const handleWeb3WizardComplete = () => {
    debugLog('Web3FundraisingQuizPage', 'handleWeb3WizardComplete called');
    setShowWeb3Wizard(false);
    setSelectedChain(null); // Clean up
    if (chainUpdateTimeoutRef.current) {
      clearTimeout(chainUpdateTimeoutRef.current);
      debugLog('Web3FundraisingQuizPage', 'Cleared chain update timeout on completion');
    }
    // StepWeb3ReviewLaunch will handle navigation to host dashboard after blockchain deployment
  };

  // Debug effect to track state changes
  useEffect(() => {
    debugLog('Web3FundraisingQuizPage', 'State changed', {
      showWeb3Wizard,
      showJoinModal,
      selectedChain,
    });
  }, [showWeb3Wizard, showJoinModal, selectedChain]);

  // Track selected chain changes
  useEffect(() => {
    debugLog('Web3FundraisingQuizPage', 'Selected chain changed', { 
      from: 'previous', 
      to: selectedChain 
    });
  }, [selectedChain]);

  const isAnyModalOpen = showWeb3Wizard || showJoinModal;
  debugLog('Web3FundraisingQuizPage', 'Modal state', { isAnyModalOpen });
   if (DEBUG) console.log('🔗 Web3FundraisingQuizPage detectedChain:', detectedChain);

  return (
    <div className={isAnyModalOpen ? "" : "mx-auto max-w-4xl p-8"}>
      {!isAnyModalOpen && (
        <>
          <h1 className="mb-6 text-4xl font-bold">🌐 Web3 Fundraising & Quiz Hub</h1>
          <p className="text-fg/80 mb-8">
            Experience the future of fundraising with blockchain technology, or join existing quiz events.
          </p>

          <div className="mb-8 grid gap-8 md:grid-cols-2">
            {/* Web3 Impact Events */}
            <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-100 p-6">
              <h2 className="mb-4 text-2xl font-semibold text-green-800">🌟 Web3 Events</h2>
              <ul className="mb-6 space-y-2 text-green-700">
                <li className="flex items-start">
                  <span className="mr-2 text-green-500">✓</span>
                  <span>Blockchain-powered transparent fundraising</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-green-500">✓</span>
                  <span>Smart contract prize distribution</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-green-500">✓</span>
                  <span>Crypto payments and donations</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-green-500">✓</span>
                  <span>NFT prizes and collectibles</span>
                </li>
              </ul>
              <button
                className="w-full rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow transition-all duration-200 hover:bg-green-700"
                onClick={() => {
                  debugLog('Web3FundraisingQuizPage', 'Web3 wizard button clicked');
                  setShowWeb3Wizard(true);
                }}
              >
                🌐 Create Web3 Quiz Fundraising Event
              </button>
            </div>

            {/* Join Quiz */}
            <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
              <h2 className="mb-4 text-2xl font-semibold text-indigo-800">🙋 Join Existing Quiz</h2>
              <ul className="mb-6 space-y-2 text-indigo-700">
                <li className="flex items-start">
                  <span className="mr-2 text-indigo-500">✓</span>
                  <span>Join any live quiz with a room code</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-indigo-500">✓</span>
                  <span>Play on your phone or computer</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-indigo-500">✓</span>
                  <span>Support fundraising causes</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-indigo-500">✓</span>
                  <span>Win prizes and have fun!</span>
                </li>
              </ul>
              <button
                className="bg-muted w-full rounded-xl border-2 border-indigo-600 px-6 py-3 font-semibold text-indigo-600 transition-all duration-200 hover:bg-indigo-50"
                onClick={() => {
                  debugLog('Web3FundraisingQuizPage', 'Join modal button clicked');
                  setShowJoinModal(true);
                }}
              >
                🙋 Join a Quiz
              </button>
            </div>
          </div>

          {/* Traditional Quiz Hosting */}
          <div className="bg-muted border-border rounded-xl border p-6 shadow-lg">
            <div className="text-center">
              <h3 className="heading-2">Join the Web3 Impact Campaign</h3>
              <p className="text-fg/70 mb-4">
                We are inviting all Web3 Communities, DAOs, NFT Projects & Crypto Enthusiasts to host quiz nights with their communities during our campaign periods. Our Target is $100K
              </p>
              <button
                onClick={() => navigate('/Web3-Impact-Event')}
                className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow transition-all duration-200 hover:bg-indigo-700"
              >
                🎤 Find out More!
              </button>
            </div>
          </div>
        </>
      )}

      {/* Debug info */}
      {DEBUG && (
        <div className="fixed right-4 top-4 z-50 max-w-xs rounded bg-black p-2 font-mono text-xs text-white">
          <div>Web3 Page Render: #{renderCountRef.current}</div>
          <div>Chain: {selectedChain || 'null'}</div>
          <div>Web3 Wizard: {showWeb3Wizard ? 'open' : 'closed'}</div>
        </div>
      )}

      {/* ✅ Web3 Wizard with external chain provider */}
      {showWeb3Wizard && (
        <>
          {debugLog('Web3FundraisingQuizPage', 'Rendering Web3Wizard with external provider')}
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
    {/* Remove DynamicChainProvider completely */}
    <JoinRoomFlow 
      key="stable-join-flow"
      onClose={() => setShowJoinModal(false)}
      onChainDetected={(chain: SupportedChain) => {
        if (DEBUG) console.log('Chain detected:', chain);
        setDetectedChain(chain);
      }}
    />
  </QuizSocketProvider>
)}
    </div>
  );
};

export default Web3FundraisingQuizPage;