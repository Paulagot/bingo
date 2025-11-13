/**
 * Review Sections Components
 *
 * UI components for displaying quiz configuration review sections in the Web3 launch step.
 * These components break down the review into logical sections:
 * - Host & Event information
 * - Payment & Prize model
 * - Quiz structure (rounds)
 * - Blockchain configuration
 *
 * ## Components
 *
 * - `HostEventSection`: Displays host name, event date/time, template info
 * - `PaymentPrizeSection`: Displays payment method, prize distribution, extras
 * - `QuizStructureSection`: Displays configured rounds
 * - `BlockchainConfigSection`: Displays blockchain and wallet information
 *
 * Used by StepWeb3ReviewLaunch component to display configuration review.
 */

import { FC, useMemo } from 'react';
import {
  User,
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  Layers,
  Users,
  Trophy,
  Gift,
  Target,
  Shield,
  Wallet,
  ExternalLink,
} from 'lucide-react';
import type { QuizConfig } from '@/components/Quiz/types/quiz';
import type { RoundDefinition } from '@/components/Quiz/types/quiz';
import { roundTypeMap } from '@/components/Quiz/constants/quiztypeconstants';
import type { FormattedEventDateTime } from '../types';
import { formatEventDateTime } from '../utils/formatting';

/**
 * Host & Event Section Props
 */
export interface HostEventSectionProps {
  /** Setup configuration */
  setupConfig: Partial<QuizConfig>;
  /** Whether host name is provided */
  hasHostName: boolean;
}

/**
 * Host & Event Section
 *
 * Displays host information, event date/time, template selection, and max players.
 *
 * @param props - Component props
 * @returns Host & Event section component
 */
export const HostEventSection: FC<HostEventSectionProps> = ({
  setupConfig,
  hasHostName,
}) => {
  const eventDateTime = formatEventDateTime(setupConfig.eventDateTime || '');

  return (
    <div className="bg-muted border-border rounded-xl border-2 p-4 shadow-sm md:p-6">
      <div className="mb-4 flex items-center space-x-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-2xl">👤</div>
        <div className="flex-1">
          <h3 className="text-fg text-lg font-semibold">Host & Event</h3>
          <p className="text-fg/70 text-sm">Basic event information</p>
        </div>
        {hasHostName && <CheckCircle className="h-5 w-5 text-green-600" />}
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex items-center space-x-3">
          <User className="text-fg/60 h-4 w-4" />
          <div>
            <p className="text-fg">{setupConfig.hostName || 'Not provided'}</p>
          </div>
        </div>

        {eventDateTime ? (
          <div className="flex items-start space-x-3">
            <Calendar className="text-fg/60 mt-1 h-4 w-4" />
            <div>
              <p className="text-fg/80 text-xs font-medium">Scheduled</p>
              <p className="text-fg">{eventDateTime.date}</p>
              <div className="mt-1 flex items-center space-x-2">
                <Clock className="h-3 w-3 text-gray-400" />
                <span className="text-fg/70">{eventDateTime.time}</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-3 w-3 text-gray-400" />
                <span className="text-fg/60 text-xs">{setupConfig.timeZone || 'Unknown timezone'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <Calendar className="text-fg/60 h-4 w-4" />
            <div>
              <p className="text-fg/80 text-xs font-medium">Event Date</p>
              <p className="text-fg">Not scheduled</p>
            </div>
          </div>
        )}

        {(setupConfig.selectedTemplate || setupConfig.skipRoundConfiguration !== undefined) && (
          <div className="flex items-center space-x-3">
            <Layers className="text-fg/60 h-4 w-4" />
            <div>
              <p className="text-fg/80 text-xs font-medium">Template</p>
              <p className="text-fg">
                {setupConfig.selectedTemplate ? String(setupConfig.selectedTemplate) : 'Custom'}{' '}
                {setupConfig.skipRoundConfiguration ? '(rounds auto-configured)' : ''}
              </p>
            </div>
          </div>
        )}

        {(setupConfig as any).maxPlayers && (
          <div className="flex items-center space-x-3">
            <Users className="text-fg/60 h-4 w-4" />
            <div>
              <p className="text-fg/80 text-xs font-medium">Max Players</p>
              <p className="text-fg">{(setupConfig as any).maxPlayers}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Payment & Prize Section Props
 */
export interface PaymentPrizeSectionProps {
  /** Setup configuration */
  setupConfig: Partial<QuizConfig>;
  /** Currency symbol */
  currency: string;
  /** Platform fee percentage */
  platformPct: number;
}

/**
 * Payment & Prize Section
 *
 * Displays payment method, prize distribution percentages, prize splits, asset prizes,
 * and fundraising extras.
 *
 * @param props - Component props
 * @returns Payment & Prize section component
 */
export const PaymentPrizeSection: FC<PaymentPrizeSectionProps> = ({
  setupConfig,
  currency,
  platformPct,
}) => {
  const prizeMode = (setupConfig.prizeMode as 'split' | 'assets' | undefined) || 'split';
  const splits = setupConfig.web3PrizeSplit || undefined;
  const hasPool = prizeMode === 'split' && splits && (splits.prizes ?? 0) > 0;
  const hasAssets = prizeMode === 'assets' && (setupConfig.prizes?.length ?? 0) > 0;

  // Calculate enabled extras
  const enabledExtrasEntries = useMemo(
    () => Object.entries(setupConfig.fundraisingOptions || {}).filter(([, v]) => v),
    [setupConfig.fundraisingOptions]
  );

  const totalExtrasPerPlayer = useMemo(
    () =>
      enabledExtrasEntries.reduce((acc, [k]) => {
        const price = setupConfig.fundraisingPrices?.[k];
        return acc + (typeof price === 'number' ? price : 0);
      }, 0),
    [enabledExtrasEntries, setupConfig.fundraisingPrices]
  );

  return (
    <div className="bg-muted border-border rounded-xl border-2 p-4 shadow-sm md:p-6">
      <div className="mb-4 flex items-center space-x-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-2xl">💰</div>
        <div className="flex-1">
          <h3 className="text-fg text-lg font-semibold">Web3 Payments & Prize Model</h3>
          <p className="text-fg/70 text-sm">Entry fee & distribution</p>
        </div>
        <CheckCircle className="h-5 w-5 text-green-600" />
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex items-center space-x-2">
          <span className="text-fg/80">Payment Method:</span>
          <span className="text-fg font-medium">
            {setupConfig.paymentMethod === 'web3' ? 'Web3 Wallet' : 'Cash / Card'}
          </span>
        </div>

        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
          <div className="mb-2 font-medium text-indigo-900">Prize Distribution (overview)</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded border bg-gray-50 p-2">
              <div className="text-xs text-fg/70">Charity</div>
              <div className="text-fg font-semibold">{splits?.charity ?? '—'}%</div>
            </div>
            <div className="rounded border bg-gray-50 p-2">
              <div className="text-xs text-fg/70">Personal</div>
              <div className="text-fg font-semibold">{splits?.host ?? 0}%</div>
            </div>
            <div className="rounded border bg-gray-50 p-2">
              <div className="text-xs text-fg/70">Prizes</div>
              <div className="text-fg font-semibold">{splits?.prizes ?? 0}%</div>
            </div>
            <div className="rounded border bg-gray-50 p-2">
              <div className="text-xs text-fg/70">Platform</div>
              <div className="text-fg font-semibold">{platformPct}%</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-fg/60">
            Totals reflect your selections in the Web3 prizes step.
          </div>
        </div>

        {hasPool && setupConfig.prizeSplits && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
            <div className="mb-2 font-medium text-yellow-800">Prize Pool Splits</div>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(setupConfig.prizeSplits).map(([place, pct]) => (
                <div key={place} className="rounded border border-yellow-200 bg-white p-2 text-center">
                  <div className="font-bold text-yellow-700">{pct}%</div>
                  <div className="text-xs text-yellow-700">
                    {place === '1' ? '1st' : place === '2' ? '2nd' : place === '3' ? '3rd' : `${place}th`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasAssets && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3">
            <div className="mb-2 font-medium text-green-800">External Asset Prizes</div>
            <div className="space-y-2">
              {setupConfig.prizes!.map((prize: any, i: number) => (
                <div key={i} className="flex items-start gap-3 rounded border border-green-200 bg-white p-2">
                  <Trophy className="h-4 w-4 text-green-700" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-fg">
                      {prize.place === 1 ? '1st' : prize.place === 2 ? '2nd' : prize.place === 3 ? '3rd' : `${prize.place}th`} Place
                    </div>
                    <div className="text-xs text-fg/70">{prize.description || 'No description'}</div>
                    {prize.tokenAddress && (
                      <div className="text-xs font-mono text-fg/70 break-all">{prize.tokenAddress}</div>
                    )}
                    {prize.value ? <div className="text-xs text-fg/70">Qty/ID: {prize.value}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
          <div className="mb-2 flex items-center gap-2 font-medium text-purple-900">
            <Gift className="h-4 w-4" />
            Fundraising Extras
          </div>
          {enabledExtrasEntries.length === 0 ? (
            <div className="text-xs text-fg/60">No extras enabled.</div>
          ) : (
            <div className="space-y-2">
              {enabledExtrasEntries.map(([key]) => {
                const price = setupConfig.fundraisingPrices?.[key];
                return (
                  <div key={key} className="flex items-center justify-between rounded bg-white p-2">
                    <span className="text-xs text-fg/80">{key}</span>
                    <span className="text-xs font-medium text-fg">
                      {typeof price === 'number' ? `${price} ${currency}` : '—'}
                    </span>
                  </div>
                );
              })}
              <div className="mt-1 text-right text-xs text-fg/70">
                Potential extras per player: <span className="font-semibold">{totalExtrasPerPlayer} {currency}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Quiz Structure Section Props
 */
export interface QuizStructureSectionProps {
  /** Round definitions */
  roundDefinitions: RoundDefinition[];
  /** Whether rounds are configured */
  hasRounds: boolean;
}

/**
 * Quiz Structure Section
 *
 * Displays configured quiz rounds with their types, question counts, categories, and difficulties.
 *
 * @param props - Component props
 * @returns Quiz Structure section component
 */
export const QuizStructureSection: FC<QuizStructureSectionProps> = ({
  roundDefinitions,
  hasRounds,
}) => {
  return (
    <div className="bg-muted border-border rounded-xl border-2 p-4 shadow-sm md:p-6">
      <div className="mb-4 flex items-center space-x-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 text-2xl">🎯</div>
        <div className="flex-1">
          <h3 className="text-fg text-lg font-semibold">Quiz Structure</h3>
          <p className="text-fg/70 text-sm">{roundDefinitions.length} rounds configured</p>
        </div>
        {hasRounds && <CheckCircle className="h-5 w-5 text-green-600" />}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {roundDefinitions.map((round, idx) => (
          <div key={idx} className="border-border rounded-lg border bg-gray-50 p-3">
            <div className="mb-2 flex items-center space-x-2">
              <Target className="h-4 w-4 text-indigo-600" />
              <span className="text-fg font-medium">Round {idx + 1}</span>
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-fg font-medium">{roundTypeMap[round.roundType]?.name || round.roundType}</p>
              <p className="text-fg/70">{round.config.questionsPerRound} questions</p>
              {round.category && (
                <span className="inline-block rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                  {round.category}
                </span>
              )}{' '}
              {round.difficulty && (
                <span
                  className={`inline-block rounded px-2 py-0.5 text-xs ${
                    round.difficulty === 'easy'
                      ? 'bg-green-100 text-green-700'
                      : round.difficulty === 'medium'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {round.difficulty.charAt(0).toUpperCase() + round.difficulty.slice(1)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Blockchain Config Section Props
 */
export interface BlockchainConfigSectionProps {
  /** Setup configuration */
  setupConfig: Partial<QuizConfig>;
  /** Currency symbol */
  currency: string;
  /** Wallet readiness status */
  walletReadiness: { status: string; message: string };
  /** Whether wallet is connected */
  isWalletConnected: boolean;
  /** Current wallet information */
  currentWallet: { address?: string; isDisconnecting?: boolean } | null;
  /** Function to get formatted address */
  getFormattedAddress: () => string;
  /** Function to get network display name */
  getNetworkDisplayName: () => string;
  /** Function to connect wallet */
  onConnect: () => Promise<void>;
  /** Function to disconnect wallet */
  onDisconnect: () => Promise<void>;
  /** Deployed contract address */
  contractAddress: string | null;
  /** Deployment transaction hash */
  txHash: string | null;
  /** Block explorer URL */
  explorerUrl: string | null;
}

/**
 * Blockchain Configuration Section
 *
 * Displays blockchain configuration, wallet connection status, and deployment information.
 *
 * @param props - Component props
 * @returns Blockchain Config section component
 */
export const BlockchainConfigSection: FC<BlockchainConfigSectionProps> = ({
  setupConfig,
  currency,
  walletReadiness,
  isWalletConnected,
  currentWallet,
  getFormattedAddress,
  getNetworkDisplayName,
  onConnect,
  onDisconnect,
  contractAddress,
  txHash,
  explorerUrl,
}) => {
  return (
    <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-purple-600" />
          <span className="font-medium text-purple-800">Blockchain Configuration</span>
        </div>
        <div
          className={`flex items-center space-x-2 ${
            walletReadiness.status === 'ready'
              ? 'text-green-600'
              : walletReadiness.status === 'error'
              ? 'text-red-600'
              : 'text-yellow-600'
          }`}
        >
          <div
            className={`h-2 w-2 rounded-full ${
              walletReadiness.status === 'ready'
                ? 'bg-green-500'
                : walletReadiness.status === 'error'
                ? 'bg-red-500'
                : 'bg-yellow-500'
            }`}
          />
          <span className="text-sm font-medium">{walletReadiness.message}</span>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-purple-700">Blockchain:</span>
          <span className="ml-2 font-medium text-purple-900">{getNetworkDisplayName()}</span>
        </div>
        <div>
          <span className="text-purple-700">Token:</span>
          <span className="ml-2 font-medium text-purple-900">{setupConfig.web3Currency || 'USDGLO'}</span>
        </div>
        <div>
          <span className="text-purple-700">Charity:</span>
          <span className="ml-2 font-medium text-purple-900">{setupConfig.web3Charity || 'Not selected'}</span>
        </div>
        <div>
          <span className="text-purple-700">Entry Fee:</span>
          <span className="ml-2 font-medium text-purple-900">
            {setupConfig.entryFee ? `${setupConfig.entryFee} ${currency}` : 'Free'}
          </span>
        </div>
        {isWalletConnected && (
          <div className="col-span-2">
            <span className="text-purple-700">Host Wallet:</span>
            <span className="ml-2 font-mono text-purple-900 break-all">{getFormattedAddress()}</span>
          </div>
        )}
      </div>

      {/* Wallet connect/disconnect */}
      {!isWalletConnected ? (
        <div className="mb-3">
          <button
            onClick={onConnect}
            disabled={walletReadiness.status === 'connecting'}
            className="flex w-full items-center justify-center space-x-2 rounded-lg bg-purple-600 px-4 py-3 font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {walletReadiness.status === 'connecting' ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Connecting {getNetworkDisplayName()} Wallet...</span>
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4" />
                <span>Connect {getNetworkDisplayName()} Wallet</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="mb-3 rounded-lg border border-green-200 bg-green-50 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <div>
                <div className="text-sm font-medium text-green-800">
                  {getNetworkDisplayName()} Wallet Connected
                </div>
                <div className="font-mono text-xs text-green-600">{getFormattedAddress()}</div>
              </div>
            </div>
            <button
              onClick={onDisconnect}
              disabled={!!currentWallet?.isDisconnecting}
              className="rounded border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
            >
              {currentWallet?.isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
            </button>
          </div>
        </div>
      )}

      {/* Deployment info */}
      {contractAddress && (
        <div className="bg-muted mt-3 rounded-lg border border-purple-200 p-3">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-purple-700">Smart Contract:</span>
              <span className="font-mono text-xs text-purple-900">{contractAddress}</span>
            </div>
            {txHash && (
              <div className="flex items-center justify-between">
                <span className="text-purple-700">Deployment Tx:</span>
                <a
                  href={explorerUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 font-mono text-xs text-purple-900 hover:underline"
                >
                  <span>
                    {txHash.slice(0, 8)}…{txHash.slice(-8)}
                  </span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

