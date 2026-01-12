import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { useQuizSetupStore } from "../../hooks/useQuizSetupStore";
import { useQuizConfig } from "../../hooks/useQuizConfig";
import { useQuizSocket } from "../../sockets/QuizSocketProvider";
import { useQuizChainIntegration } from "../../../../hooks/useQuizChainIntegration";
import { useWalletActions } from "../../../../hooks/useWalletActions";
import { useContractActions } from "../../../../hooks/useContractActions";

import { generateRoomId, generateHostId } from "../../utils/idUtils";

import type { DeployParams } from "../../../../hooks/useContractActions";

// Move this outside component to prevent recreating on every render
const isInvalidTx = (tx?: string) =>
  !tx || tx === "pending" || tx === "transaction-submitted" || tx.length < 16;

// Storage key for quiz setup persistence (critical for mobile reloads)
const QUIZ_SETUP_STORAGE_KEY = "fundraisely-quiz-setup-draft";

const saveQuizDraft = (setup: any) => {
  try {
    localStorage.setItem(QUIZ_SETUP_STORAGE_KEY, JSON.stringify(setup));
    console.log("[useWeb3Launch] Saved quiz draft");
  } catch (e) {
    console.warn("[useWeb3Launch] Failed to save quiz draft", e);
  }
};



const clearQuizDraft = () => {
  localStorage.removeItem(QUIZ_SETUP_STORAGE_KEY);
  console.log("[useWeb3Launch] Cleared quiz draft");
};

export type Web3LaunchState =
  | "ready"
  | "generating-ids"
  | "deploying-contract"
  | "creating-room"
  | "success"
  | "error";

interface UseWeb3LaunchArgs {
  onResetToFirst?: () => void;
  onBack?: () => void;
}

export function useWeb3Launch({ onResetToFirst: _onResetToFirst, onBack: _onBack }: UseWeb3LaunchArgs) {
  // Only log on mount, not on every render
  const hasLoggedMount = useRef(false);
  if (!hasLoggedMount.current) {
    console.log("[useWeb3Launch] Hook initialized");
    hasLoggedMount.current = true;
  }
  
  const navigate = useNavigate();

  // Stores & hooks
  const {
    setupConfig,
    roomId,
    hostId,
    setRoomIds,
    clearRoomIds,
    hardReset,
    // Assuming your store has a method to restore/merge setupConfig
    // If not, add one like setSetupConfig or mergeSetupConfig in useQuizSetupStore
  } = useQuizSetupStore();

  const { setFullConfig } = useQuizConfig();
  const { socket, connected } = useQuizSocket();
  
  const {
    selectedChain,
    isWalletConnected,
    walletReadiness,
    currentWallet,
    getNetworkDisplayName,
  } = useQuizChainIntegration();

  const walletActions = useWalletActions();
  const contractActions = useContractActions();

  // Local state
  const [launchState, setLaunchState] = useState<Web3LaunchState>("ready");
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);
  const [deploymentStep, setDeploymentStep] = useState<string>("");
  const [deployTrigger, setDeployTrigger] = useState(0);


  // Memoize complex derived values
  const configCheck = useMemo(() => {
    const hasHostName = !!setupConfig.hostName;
    const hasRounds = !!(setupConfig.roundDefinitions?.length);
    const configComplete = hasHostName && hasRounds && !!selectedChain;
    
    return { hasHostName, hasRounds, configComplete };
  }, [
    setupConfig.hostName, 
    setupConfig.roundDefinitions?.length, 
    selectedChain
  ]);

  const launchCheck = useMemo(() => {
    const canLaunch =
      configCheck.configComplete &&
      isWalletConnected &&
      (launchState === "ready" || launchState === "error");

    const isLaunching = launchState !== "ready" && launchState !== "error";

    return { canLaunch, isLaunching };
  }, [configCheck.configComplete, isWalletConnected, launchState]);

  // Stable references for IDs
  const resolvedRoomId = useMemo(() => 
    roomId ?? localStorage.getItem("current-room-id") ?? generateRoomId(),
    [roomId]
  );

  const resolvedHostId = useMemo(() => 
    hostId ?? localStorage.getItem("current-host-id") ?? generateHostId(),
    [hostId]
  );

  // buildDeployParams deps
  const deployConfigDeps = useMemo(() => ({
    prizeMode: setupConfig.prizeMode,
    web3PrizeSplit: setupConfig.web3PrizeSplit,
    prizeSplits: setupConfig.prizeSplits,
    prizes: setupConfig.prizes,
    web3CharityAddress: (setupConfig as any)?.web3CharityAddress,
    web3Charity: (setupConfig as any)?.web3Charity,
    charityName: (setupConfig as any)?.charityName,
    hostName: setupConfig.hostName,
    eventDateTime: setupConfig.eventDateTime,
    roundDefinitions: setupConfig.roundDefinitions,
    web3Currency: setupConfig.web3Currency,
    currencySymbol: setupConfig.currencySymbol,
    entryFee: setupConfig.entryFee,
  }), [
    setupConfig.prizeMode,
    setupConfig.web3PrizeSplit,
    setupConfig.prizeSplits,
    setupConfig.prizes,
    (setupConfig as any)?.web3CharityAddress,
    (setupConfig as any)?.web3Charity,
    (setupConfig as any)?.charityName,
    setupConfig.hostName,
    setupConfig.eventDateTime,
    setupConfig.roundDefinitions,
    setupConfig.web3Currency,
    setupConfig.currencySymbol,
    setupConfig.entryFee,
  ]);

  const buildDeployParams = useCallback(
    (_roomId: string, _hostId: string, hostWallet: string): DeployParams => {
      const prizeMode: "split" | "assets" | undefined = deployConfigDeps.prizeMode as any;
      const splits = deployConfigDeps.web3PrizeSplit || undefined;

      const poolSplits: { first: number; second?: number; third?: number } = {
        first: Number(deployConfigDeps.prizeSplits?.[1] ?? 100),
      };
      if (deployConfigDeps.prizeSplits?.[2])
        poolSplits.second = Number(deployConfigDeps.prizeSplits[2]);
      if (deployConfigDeps.prizeSplits?.[3])
        poolSplits.third = Number(deployConfigDeps.prizeSplits[3]);

      const expectedPrizes =
        (deployConfigDeps.prizes || [])
          .filter((p: any) => p?.tokenAddress)
          .map((p: any) => ({
            place: p.place,
            tokenAddress: String(p.tokenAddress),
            tokenType: p.tokenType,
            amount: p.amount,
            tokenId: p.tokenId,
            isNFT: p.isNFT,
            description: p.description,
            sponsor: p.sponsor,
          })) || [];

      const resolvedCharityAddress = deployConfigDeps.web3CharityAddress ?? undefined;
      const resolvedCharityName =
        deployConfigDeps.web3Charity ?? deployConfigDeps.charityName ?? undefined;

      const hostMetadata: {
        hostName?: string;
        eventDateTime?: string;
        totalRounds?: number;
      } = {};

      if (deployConfigDeps.hostName) hostMetadata.hostName = deployConfigDeps.hostName;
      if (deployConfigDeps.eventDateTime) hostMetadata.eventDateTime = deployConfigDeps.eventDateTime;

      const roundCount = (deployConfigDeps.roundDefinitions || []).length;
      if (roundCount > 0) hostMetadata.totalRounds = roundCount;

      return {
        roomId: _roomId,
        hostId: _hostId,
        currency: deployConfigDeps.web3Currency || deployConfigDeps.currencySymbol || "XLM",
        entryFee: deployConfigDeps.entryFee ?? "1.0",
        hostFeePct: Number(splits?.host ?? 0),
        prizeMode,
        charityName: resolvedCharityName,
        charityAddress: resolvedCharityAddress,
        prizePoolPct: Number(splits?.prizes ?? 0),
        prizeSplits: poolSplits,
        expectedPrizes,
        hostWallet,
        hostMetadata,
      };
    },
    [deployConfigDeps]
  );

  // Improved: Save draft BEFORE connect
  const handleWalletConnect = useCallback(async () => {
    console.log("[useWeb3Launch] handleWalletConnect called");

    // Save current quiz setup before opening wallet modal (handles reloads)
    saveQuizDraft(setupConfig);

    try {
      const res = await walletActions.connect();
      
      if (!res.success) {
        console.error("[useWeb3Launch] Wallet connection failed:", res.error);
        throw new Error(res.error?.message || "Wallet connection failed");
      }
      
      console.log("[useWeb3Launch] Wallet connected successfully");
    } catch (err) {
      console.error("[useWeb3Launch] Wallet connection error:", err);
      setLaunchError(err instanceof Error ? err.message : "Wallet connection failed");
    }
  }, [walletActions.connect, setupConfig]);  // Depend on setupConfig for save

  const handleWalletDisconnect = useCallback(async () => {
    try {
      await walletActions.disconnect();
      clearQuizDraft();  // Clean up draft
      console.log("[useWeb3Launch] Wallet disconnected successfully");
    } catch (err) {
      console.error("[useWeb3Launch] Wallet disconnection error:", err);
    }
  }, [walletActions.disconnect]);

  // Socket listeners (unchanged)
  useEffect(() => {
    if (!connected || !socket) return;

    const handleCreated = ({ roomId }: { roomId: string }) => {
      console.log("[useWeb3Launch] Quiz room created:", roomId);
      setLaunchState("success");

      try {
        localStorage.removeItem("current-room-id");
        localStorage.removeItem("current-host-id");
        localStorage.removeItem("current-contract-address");
      } catch {}

      hardReset();
      clearQuizDraft();  // Clean up on full success

      setTimeout(() => {
        navigate(`/quiz/host-dashboard/${roomId}`);
      }, 600);
    };

    const handleError = ({ message }: { message: string }) => {
      console.error("[useWeb3Launch] Socket error:", message);
      setLaunchError(message);
      setLaunchState("error");
    };

    socket.on("quiz_room_created", handleCreated);
    socket.on("quiz_error", handleError);

    return () => {
      socket.off("quiz_room_created", handleCreated);
      socket.off("quiz_error", handleError);
    };
  }, [connected, socket, hardReset, navigate]);

  // handleLaunch (your full original logic + clear draft on success)
  const handleLaunch = useCallback(async () => {
    if (launchState !== "ready" && launchState !== "error") return;

    setLaunchError(null);

    try {
      localStorage.removeItem("current-room-id");
      localStorage.removeItem("current-host-id");
      localStorage.removeItem("current-contract-address");
    } catch {}
    
    clearRoomIds();

    if (!selectedChain) {
      setLaunchError("No blockchain selected.");
      setLaunchState("error");
      return;
    }

    const hostWalletMaybe =
      currentWallet?.address ?? walletActions.getAddress?.() ?? null;

    const connectedNow =
      walletReadiness?.status === "ready" ||
      walletActions.isConnected?.() === true ||
      !!hostWalletMaybe;

    if (!connectedNow || !hostWalletMaybe) {
      const errorMsg = `Connect your ${getNetworkDisplayName()} wallet first.`;
      setLaunchError(errorMsg);
      setLaunchState("error");
      return;
    }

    const hostWallet: string = hostWalletMaybe;
    setLaunchState("generating-ids");

    const newRoomId = generateRoomId();
    const newHostId = generateHostId();
    
    setRoomIds(newRoomId, newHostId);

    // Stellar handled externally
    if (selectedChain === "stellar") {
      setLaunchState("deploying-contract");
      setDeploymentStep("Deploying Stellar contract…");
      setDeployTrigger((n) => n + 1);
      return;
    }

    // EVM or Solana deployment
    try {
      setLaunchState("deploying-contract");
      setDeploymentStep(`Deploying ${getNetworkDisplayName()} contract…`);

      const deployParams = buildDeployParams(newRoomId, newHostId, hostWallet);
      let deployRes;

      try {
        deployRes = await contractActions.deploy(deployParams);
      } catch (err: any) {
        // Handle Solana duplicate signature
        if (err?.message?.includes("already been processed")) {
          console.warn("[useWeb3Launch] Duplicate signature; retrying...");
          await new Promise((r) => setTimeout(r, 2000));

          const retryRoomId = generateRoomId();
          const retryHostId = generateHostId();
          setRoomIds(retryRoomId, retryHostId);

          const retryParams = buildDeployParams(retryRoomId, retryHostId, hostWallet);
          deployRes = await contractActions.deploy(retryParams);
        } else {
          throw err;
        }
      }

      if (!deployRes?.success || !deployRes.contractAddress || isInvalidTx(deployRes.txHash)) {
        throw new Error("Blockchain deployment was not signed or confirmed.");
      }

      setContractAddress(deployRes.contractAddress);
      setTxHash(deployRes.txHash);
      setExplorerUrl(deployRes.explorerUrl || null);

      setLaunchState("creating-room");

      const web3RoomConfig = {
        ...setupConfig,
        deploymentTxHash: deployRes.txHash,
        hostWallet: hostWallet,
        hostWalletConfirmed: hostWallet,
        paymentMethod: "web3" as const,
        isWeb3Room: true,
        explorerUrl: deployRes.explorerUrl || null,
        web3PrizeStructure: {
          firstPlace: setupConfig.prizeSplits?.[1] || 100,
          secondPlace: setupConfig.prizeSplits?.[2] || 0,
          thirdPlace: setupConfig.prizeSplits?.[3] || 0,
        },
        web3Chain: selectedChain,
        evmNetwork: (setupConfig as any)?.evmNetwork,
        solanaCluster: (setupConfig as any)?.solanaCluster,
        roomContractAddress: deployRes.contractAddress,
        web3CharityId: (setupConfig as any)?.web3CharityId,
        web3CharityName: 
          (setupConfig as any)?.web3CharityName ||     // Try direct field
          (setupConfig as any)?.charityName ||         // Try alternate field
          (setupConfig as any)?.web3Charity ||         // Try legacy field
          null,
        web3CharityAddress: (setupConfig as any)?.web3CharityAddress,
      };

      delete (web3RoomConfig as any).maxPlayers;

      const response = await fetch("/quiz/api/create-web3-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: web3RoomConfig,
          roomId: newRoomId,
          hostId: newHostId,
        }),
      });

      let data: any = null;

      try {
        const text = await response.clone().text();
        if (!text || text.trim().length === 0) {
          throw new Error("Empty server response.");
        }
        data = JSON.parse(text);
      } catch (parseError) {
        throw new Error(`Invalid or empty server response (${response.status})`);
      }

      if (!response.ok) {
        throw new Error(data?.error || data?.details || "Server error");
      }

      if (!data.verified || !data.contractAddress) {
        throw new Error("Room creation not verified by server");
      }

      try {
        localStorage.setItem("current-room-id", data.roomId);
        localStorage.setItem("current-host-id", data.hostId);
        localStorage.setItem("current-contract-address", data.contractAddress);
      } catch {}

      setFullConfig({
        ...web3RoomConfig,
        roomId: data.roomId,
        hostId: data.hostId,
      });

      setLaunchState("success");
      clearQuizDraft();  // Clean up draft on success

      setTimeout(() => {
        navigate(`/quiz/host-dashboard/${data.roomId}`);
      }, 600);
    } catch (err: any) {
      console.error("[useWeb3Launch] Launch error:", err);

      try {
        localStorage.removeItem("current-room-id");
        localStorage.removeItem("current-host-id");
        localStorage.removeItem("current-contract-address");
      } catch {}

      clearRoomIds();
      setLaunchError(err?.message ?? "Unknown error");
      setLaunchState("error");
    }
  }, [
    launchState,
    selectedChain,
    currentWallet?.address,
    walletReadiness?.status,
    walletActions.getAddress,
    walletActions.isConnected,
    getNetworkDisplayName,
    setRoomIds,
    buildDeployParams,
    contractActions.deploy,
    setupConfig,
    clearRoomIds,
    setFullConfig,
    navigate,
  ]);

  // Message for UI (unchanged)
  const currentMessage = useMemo(() => {
    if (launchState === "generating-ids") {
      return {
        expression: "generating",
        message: "Generating unique room and host IDs…",
      };
    }
    
    if (launchState === "deploying-contract") {
      return {
        expression: "deploying",
        message: deploymentStep || `Deploying quiz contract on ${getNetworkDisplayName()}…`,
      };
    }
    
    if (launchState === "creating-room") {
      return {
        expression: "creating",
        message: "Creating your Web3 quiz room and finalizing…",
      };
    }
    
    if (launchState === "success") {
      return {
        expression: "success",
        message: "🎉 Deployed! Redirecting to your host dashboard…",
      };
    }
    
    if (launchState === "error") {
      return {
        expression: "error",
        message: `Web3 launch failed: ${launchError}. Check wallet + network and try again.`,
      };
    }
    
    if (!configCheck.configComplete) {
      return {
        expression: "warning",
        message: "Review your config. Ensure host, rounds, and Web3 payment settings are complete.",
      };
    }
    
    if (!isWalletConnected) {
      return {
        expression: "wallet",
        message: `Connect your ${getNetworkDisplayName()} wallet to deploy.`,
      };
    }
    
    return {
      expression: "ready",
      message: `All set! You're ready to deploy on ${getNetworkDisplayName()}. Review everything below, then deploy.`,
    };
  }, [
    launchState,
    deploymentStep,
    launchError,
    configCheck.configComplete,
    isWalletConnected,
    getNetworkDisplayName,
  ]);

  return {
    // State
    launchState,
    launchError,
    contractAddress,
    txHash,
    explorerUrl,
    deploymentStep,
    deployTrigger,

    // Helpers
    resolvedRoomId,
    resolvedHostId,
    canLaunch: launchCheck.canLaunch,
    isLaunching: launchCheck.isLaunching,
    currentMessage,

    // Handlers
    handleLaunch,
    handleWalletConnect,
    handleWalletDisconnect,

    // Setters (for Stellar)
    setDeploymentStep,
    setContractAddress,
    setTxHash,
    setExplorerUrl,
    setLaunchState,
    setLaunchError,
    setDeployTrigger,
  };
}
