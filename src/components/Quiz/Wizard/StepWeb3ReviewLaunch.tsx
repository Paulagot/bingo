// src/components/Quiz/Wizard/StepWeb3ReviewLaunch.tsx

import { FC } from "react";


import { useQuizSetupStore } from "../hooks/useQuizSetupStore";

import { useQuizChainIntegration } from "../../../hooks/useQuizChainIntegration";
import { useWalletActions } from "../../../hooks/useWalletActions";

import ReviewHostEventSection from "./web3setup/ReviewHostEventSection";
import ReviewPaymentPrizeSection from "./web3setup/ReviewPaymentPrizeSection";
import ReviewQuizStructureSection from "./web3setup/ReviewQuizStructureSection";
import BlockchainWalletSection from "./web3setup/BlockchainWalletSection";

import { useWeb3Launch } from "./web3setup/useWeb3Launch";

import StellarLaunchSection from "./StellarLaunchSection";
import ClearSetupButton from "./ClearSetupButton";

import {
  ChevronLeft,
  Rocket,
} from "lucide-react";

import type { WizardStepProps } from "./WizardStepProps";

const StepWeb3ReviewLaunch: FC<WizardStepProps> = ({ onBack, onResetToFirst }) => {

  const { setupConfig } = useQuizSetupStore();
  const { selectedChain, getNetworkDisplayName, isWalletConnected, currentWallet } = useQuizChainIntegration(); // ✅ Get ALL values here
 const walletActions = useWalletActions();
  const {
    // state
    launchState,
 
    canLaunch,
    isLaunching,
    resolvedRoomId,
    resolvedHostId,
    contractAddress,
    txHash,
    explorerUrl,

    // UI message
    currentMessage,

    // event handlers
    handleLaunch,
    handleWalletConnect,
    handleWalletDisconnect,

    // for Stellar section
    deployTrigger,
    setDeploymentStep,
    setContractAddress,
    setTxHash,
    setExplorerUrl,
    setLaunchState,
    setLaunchError,
  } = useWeb3Launch({ onBack, onResetToFirst });

    const networkInfo = walletActions.getNetworkInfo();
  const isOnCorrectNetwork = walletActions.isOnCorrectNetwork();

  const Character = ({ expression, message }: { expression: string; message: string }) => {
    const base =
      "w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-2xl md:text-3xl transition-all duration-300";
    const style =
      expression === "ready"
        ? "bg-gradient-to-br from-green-400 to-emerald-500"
        : expression === "warning"
        ? "bg-gradient-to-br from-yellow-400 to-orange-500 animate-pulse"
        : expression === "generating"
        ? "bg-gradient-to-br from-cyan-400 to-blue-500 animate-pulse"
        : expression === "deploying"
        ? "bg-gradient-to-br from-purple-400 to-pink-500 animate-bounce"
        : expression === "creating"
        ? "bg-gradient-to-br from-indigo-400 to-purple-500 animate-spin"
        : expression === "success"
        ? "bg-gradient-to-br from-green-400 to-emerald-500 animate-bounce"
        : expression === "error"
        ? "bg-gradient-to-br from-red-400 to-pink-500 animate-pulse"
        : "bg-gradient-to-br from-indigo-400 to-purple-500";

    const emoji =
      expression === "ready"
        ? "🚀"
        : expression === "warning"
        ? "⚠️"
        : expression === "generating"
        ? "🆔"
        : expression === "deploying"
        ? "⚡"
        : expression === "creating"
        ? "🔄"
        : expression === "success"
        ? "🎉"
        : expression === "error"
        ? "❌"
        : "💳";

    return (
      <div className="mb-6 flex items-start space-x-3 md:space-x-4">
        <div className={`${base} ${style}`}>{emoji}</div>
        <div className="bg-muted border-border relative max-w-sm flex-1 rounded-2xl border-2 p-3 shadow-lg md:max-w-lg md:p-4">
          <div className="absolute left-0 top-6 h-0 w-0 -translate-x-2 transform border-b-8 border-r-8 border-t-8 border-b-transparent border-r-white border-t-transparent"></div>
          <div className="absolute left-0 top-6 h-0 w-0 -translate-x-1 transform border-b-8 border-r-8 border-t-8 border-b-transparent border-r-gray-200 border-t-transparent"></div>
          <p className="text-fg/80 text-sm md:text-base">{message}</p>
        </div>
      </div>
    );
  };
   

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="heading-2">Review & Deploy</h2>
          <p className="text-fg/70 mt-0.5 text-xs md:text-sm">
            Final blockchain deployment check
          </p>
        </div>

        <ClearSetupButton
          label="Start Over"
          variant="ghost"
          size="sm"
          keepIds={false}
          flow="web3"
          onCleared={onResetToFirst ?? (() => {})}
        />
      </div>

      {/* Character bubble */}
      <Character {...currentMessage} />

      {/* Sections */}
      <ReviewHostEventSection setupConfig={setupConfig} />
      <ReviewPaymentPrizeSection setupConfig={setupConfig} />
      <ReviewQuizStructureSection setupConfig={setupConfig} />

      {/* Stellar-only deploy block */}
      {selectedChain === "stellar" && (
        <StellarLaunchSection
          deployTrigger={deployTrigger}
          roomId={resolvedRoomId}
          hostId={resolvedHostId}
          setupConfig={setupConfig}
          onDeploymentProgress={setDeploymentStep}
          onDeployed={({ contractAddress, txHash, explorerUrl }) => {
            setContractAddress(contractAddress);
            setTxHash(txHash);
            setExplorerUrl(explorerUrl ?? null);
            setLaunchState("creating-room");
          }}
          onError={(msg) => {
            setLaunchError(msg);
            setLaunchState("error");
          }}
        />
      )}

      {/* Wallet + blockchain summary */}
      <BlockchainWalletSection
        setupConfig={setupConfig}
        launchState={launchState}
        contractAddress={contractAddress}
        txHash={txHash}
        explorerUrl={explorerUrl}
        handleWalletConnect={handleWalletConnect}
        handleWalletDisconnect={handleWalletDisconnect}
         isWalletConnected={isWalletConnected}  // ✅ Pass this
        walletAddress={currentWallet?.address ?? null}  // ✅ Pass this
        networkName={getNetworkDisplayName()}
          isOnCorrectNetwork={isOnCorrectNetwork}
        actualNetwork={networkInfo.currentNetwork}
        expectedNetwork={networkInfo.expectedNetwork}
      />

      {/* Navigation */}
      <div className="border-border flex items-center justify-between border-t pt-6">
        <button
          type="button"
          onClick={onBack}
          disabled={isLaunching}
          className={`flex items-center space-x-2 transition-colors ${
            isLaunching ? "cursor-not-allowed text-gray-400" : "text-fg/70 hover:text-fg"
          }`}
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back</span>
        </button>

        <button
          type="button"
          onClick={handleLaunch}
          disabled={!canLaunch}
          className={`flex items-center space-x-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-lg font-medium text-white transition-all duration-200 md:px-8 md:py-4 ${
            !canLaunch
              ? "cursor-not-allowed opacity-50"
              : "transform shadow-lg hover:scale-105 hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl"
          }`}
        >
          <Rocket className="h-5 w-5" />
          <span>
            {isLaunching
              ? launchState === "generating-ids"
                ? "Generating IDs…"
                : launchState === "deploying-contract"
                ? "Deploying Contract…"
                : launchState === "creating-room"
                ? "Creating Room…"
                : "Launching…"
              : "Deploy Web3 Quiz"}
          </span>
        </button>
      </div>
    </div>
  );
};

export default StepWeb3ReviewLaunch;


