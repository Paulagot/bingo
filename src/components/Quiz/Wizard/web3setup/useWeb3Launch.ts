import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { useQuizSetupStore } from "../../hooks/useQuizSetupStore";
import { useQuizConfig } from "../../hooks/useQuizConfig";
import { useQuizSocket } from "../../sockets/QuizSocketProvider";
import { useChainWallet } from "../../../../hooks/useChainWallet";
import { useContractActions } from "../../../../hooks/useContractActions";
import { useWeb3ChainConfig } from "../../../Web3Provider";

import { generateRoomId, generateHostId } from "../../utils/idUtils";

import type { DeployParams } from "../../../../hooks/useContractActions";



const isInvalidTx = (tx?: string) =>
  !tx || tx === "pending" || tx === "transaction-submitted" || tx.length < 16;

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
  localStorage.removeItem("quiz-setup-v2");
  localStorage.removeItem("quiz-admins");
  console.log("[useWeb3Launch] Cleared quiz draft and setup data");
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
  const hasLoggedMount = useRef(false);
  if (!hasLoggedMount.current) {
    console.log("[useWeb3Launch] Hook initialized");
    hasLoggedMount.current = true;
  }

  const navigate = useNavigate();

  const {
    setupConfig,
    roomId,
    hostId,
    setRoomIds,
    clearRoomIds,
    hardReset,
  } = useQuizSetupStore();

  const { setFullConfig } = useQuizConfig();
  const { socket, connected } = useQuizSocket();

  // ── Single config source ──────────────────────────────────────────────────
  // Config flows down from setupConfig. No store reads inside the hooks.
const chainConfig = useWeb3ChainConfig();

  const {
    chainFamily: selectedChain,
    address,
    isConnected: isWalletConnected,
    networkInfo,
    connect,
    disconnect,
  } = useChainWallet(chainConfig);

  const { deploy } = useContractActions(chainConfig);
  // ─────────────────────────────────────────────────────────────────────────

  // Local state
  const [launchState, setLaunchState] = useState<Web3LaunchState>("ready");
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);
  const [deploymentStep, setDeploymentStep] = useState<string>("");
  const [deployTrigger, setDeployTrigger] = useState(0);

  const configCheck = useMemo(() => {
    const hasHostName = !!setupConfig.hostName;
    const hasRounds = !!(setupConfig.roundDefinitions?.length);
    const configComplete = hasHostName && hasRounds && !!selectedChain;
    return { hasHostName, hasRounds, configComplete };
  }, [setupConfig.hostName, setupConfig.roundDefinitions?.length, selectedChain]);

  const launchCheck = useMemo(() => {
    const canLaunch =
      configCheck.configComplete &&
      isWalletConnected &&
      (launchState === "ready" || launchState === "error");
    const isLaunching = launchState !== "ready" && launchState !== "error";
    return { canLaunch, isLaunching };
  }, [configCheck.configComplete, isWalletConnected, launchState]);

  const resolvedRoomId = useMemo(
    () => roomId ?? localStorage.getItem("current-room-id") ?? generateRoomId(),
    [roomId]
  );

  const resolvedHostId = useMemo(
    () => hostId ?? localStorage.getItem("current-host-id") ?? generateHostId(),
    [hostId]
  );

  // Helper: human-readable network name from networkInfo
  const getNetworkDisplayName = useCallback(() => {
    return networkInfo.expectedNetwork || selectedChain || "wallet";
  }, [networkInfo.expectedNetwork, selectedChain]);

  // Build deploy params — unchanged logic, just pulled from setupConfig directly
  const deployConfigDeps = useMemo(() => ({
    prizeMode: setupConfig.prizeMode,
    web3PrizeSplit: setupConfig.web3PrizeSplit,
    prizeSplits: setupConfig.prizeSplits,
    prizes: setupConfig.prizes,
    web3CharityAddress: (setupConfig as any)?.web3CharityAddress,
    web3CharityName: (setupConfig as any)?.web3CharityName,
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
    (setupConfig as any)?.web3CharityName,
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

  // ── Wallet handlers ───────────────────────────────────────────────────────
  const handleWalletConnect = useCallback(async () => {
    console.log("[useWeb3Launch] handleWalletConnect called");
    saveQuizDraft(setupConfig);

    try {
      const res = await connect();
      if (!res.success) {
        const errorMsg =
          res.error && typeof res.error === "object" && "message" in res.error
            ? (res.error as any).message
            : "Wallet connection failed";
        throw new Error(errorMsg);
      }
      console.log("[useWeb3Launch] Wallet connected successfully");
    } catch (err) {
      console.error("[useWeb3Launch] Wallet connection error:", err);
      setLaunchError(err instanceof Error ? err.message : "Wallet connection failed");
    }
  }, [connect, setupConfig]);

  const handleWalletDisconnect = useCallback(async () => {
    try {
      await disconnect();
      clearQuizDraft();
      console.log("[useWeb3Launch] Wallet disconnected");
    } catch (err) {
      console.error("[useWeb3Launch] Wallet disconnection error:", err);
    }
  }, [disconnect]);
  // ─────────────────────────────────────────────────────────────────────────

  // Socket listeners
  useEffect(() => {
    if (!connected || !socket) return;

    const handleCreated = ({ roomId }: { roomId: string }) => {
      console.log("[useWeb3Launch] Quiz room created:", roomId);
      setLaunchState("success");

      try {
        localStorage.removeItem("current-room-id");
        localStorage.removeItem("current-host-id");
        localStorage.removeItem("current-contract-address");
        localStorage.removeItem("quiz-setup-v2");
        localStorage.removeItem("quiz-admins");
      } catch {}

      hardReset();
      clearQuizDraft();

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

  // ── Main launch handler ───────────────────────────────────────────────────
  const handleLaunch = useCallback(async () => {
    if (launchState !== "ready" && launchState !== "error") return;

    console.log("[Launch] setupConfig charity fields:", {
      web3CharityName: (setupConfig as any)?.web3CharityName,
      web3Charity: (setupConfig as any)?.web3Charity,
      web3CharityId: (setupConfig as any)?.web3CharityId,
      web3CharityOrgId: (setupConfig as any)?.web3CharityOrgId,
    });

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

    // address comes from useChainWallet — no secondary sources needed
    const hostWallet = address ?? null;

    if (!isWalletConnected || !hostWallet) {
      setLaunchError(`Connect your ${getNetworkDisplayName()} wallet first.`);
      setLaunchState("error");
      return;
    }

    setLaunchState("generating-ids");

    const newRoomId = generateRoomId();
    const newHostId = generateHostId();
    setRoomIds(newRoomId, newHostId);

    // Stellar is handled externally via StellarLaunchSection
    if (selectedChain === "stellar") {
      setLaunchState("deploying-contract");
      setDeploymentStep("Deploying Stellar contract…");
      setDeployTrigger((n) => n + 1);
      return;
    }

    // EVM or Solana
    try {
      setLaunchState("deploying-contract");
      setDeploymentStep(`Deploying ${getNetworkDisplayName()} contract…`);

      const deployParams = buildDeployParams(newRoomId, newHostId, hostWallet);
      let deployRes;

      try {
        deployRes = await deploy(deployParams);
      } catch (err: any) {
        // Handle Solana duplicate signature
        if (err?.message?.includes("already been processed")) {
          console.warn("[useWeb3Launch] Duplicate signature; retrying...");
          await new Promise((r) => setTimeout(r, 2000));

          const retryRoomId = generateRoomId();
          const retryHostId = generateHostId();
          setRoomIds(retryRoomId, retryHostId);

          const retryParams = buildDeployParams(retryRoomId, retryHostId, hostWallet);
          deployRes = await deploy(retryParams);
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
        hostWallet,
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
          (setupConfig as any)?.web3CharityName ||
          (setupConfig as any)?.charityName ||
          (setupConfig as any)?.web3Charity ||
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
      } catch {
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
      clearQuizDraft();

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
    address,
    isWalletConnected,
    getNetworkDisplayName,
    setRoomIds,
    clearRoomIds,
    buildDeployParams,
    deploy,
    setupConfig,
    setFullConfig,
    navigate,
  ]);
  // ─────────────────────────────────────────────────────────────────────────

  const currentMessage = useMemo(() => {
    if (launchState === "generating-ids")
      return { expression: "generating", message: "Generating unique room and host IDs…" };
    if (launchState === "deploying-contract")
      return { expression: "deploying", message: deploymentStep || `Deploying quiz contract on ${getNetworkDisplayName()}…` };
    if (launchState === "creating-room")
      return { expression: "creating", message: "Creating your Web3 quiz room and finalizing…" };
    if (launchState === "success")
      return { expression: "success", message: "🎉 Deployed! Redirecting to your host dashboard…" };
    if (launchState === "error")
      return { expression: "error", message: `Web3 launch failed: ${launchError}. Check wallet + network and try again.` };
    if (!configCheck.configComplete)
      return { expression: "warning", message: "Review your config. Ensure host, rounds, and Web3 payment settings are complete." };
    if (!isWalletConnected)
      return { expression: "wallet", message: `Connect your ${getNetworkDisplayName()} wallet to deploy.` };
    return { expression: "ready", message: `All set! Ready to deploy on ${getNetworkDisplayName()}. Review everything, then deploy.` };
  }, [launchState, deploymentStep, launchError, configCheck.configComplete, isWalletConnected, getNetworkDisplayName]);

  return {
    launchState,
    launchError,
    contractAddress,
    txHash,
    explorerUrl,
    deploymentStep,
    deployTrigger,
    resolvedRoomId,
    resolvedHostId,
    canLaunch: launchCheck.canLaunch,
    isLaunching: launchCheck.isLaunching,
    currentMessage,
    handleLaunch,
    handleWalletConnect,
    handleWalletDisconnect,
    setDeploymentStep,
    setContractAddress,
    setTxHash,
    setExplorerUrl,
    setLaunchState,
    setLaunchError,
    setDeployTrigger,
  };
}
