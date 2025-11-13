/**
 * Review Sections Components
 *
 * UI components for displaying quiz configuration review sections.
 */

import { FC } from 'react';
import {
  User,
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  DollarSign,
  Wallet,
  Target,
  Trophy,
  Heart,
} from 'lucide-react';
import type { QuizConfig, RoundDefinition } from '@/components/Quiz/types/quiz';
import { roundTypeMap } from '@/components/Quiz/constants/quiztypeconstants';
import { fundraisingExtraDefinitions } from '@/components/Quiz/constants/quizMetadata';
import { HeaderTile } from './HeaderTile';
import type { FormattedEventDateTime } from '../utils/formatting';

export interface HostEventSectionProps {
  setupConfig: Partial<QuizConfig>;
  eventDateTime: FormattedEventDateTime | null;
  hasHostName: boolean;
}

export const HostEventSection: FC<HostEventSectionProps> = ({
  setupConfig,
  eventDateTime,
  hasHostName,
}) => {
  return (
    <div className="bg-muted rounded-lg border-2 border-border p-3 shadow-sm sm:p-6">
      <div className="mb-3 flex items-center gap-3 sm:mb-4">
        <HeaderTile />
        <div className="min-w-0 flex-1">
          <h3 className="text-fg text-sm font-semibold sm:text-base">Host & Event</h3>
          <p className="text-fg/70 text-xs sm:text-sm">Basic event information</p>
        </div>
        {hasHostName && <CheckCircle className="h-5 w-5 text-green-600" />}
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <User className="text-fg/60 h-4 w-4" />
          <div>
            <p className="text-fg/80 text-xs font-medium sm:text-sm">Host</p>
            <p className="text-fg text-sm sm:text-base">{setupConfig.hostName || 'Not provided'}</p>
          </div>
        </div>

        {setupConfig.eventDateTime && eventDateTime ? (
          <div className="flex items-start gap-3">
            <Calendar className="text-fg/60 mt-0.5 h-4 w-4" />
            <div>
              <p className="text-fg/80 text-xs font-medium sm:text-sm">Scheduled</p>
              <p className="text-fg text-sm sm:text-base">{eventDateTime.date}</p>
              <div className="mt-1 flex items-center gap-2">
                <Clock className="h-3 w-3 text-fg/50" />
                <span className="text-fg/70 text-xs sm:text-sm">{eventDateTime.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3 text-fg/50" />
                <span className="text-fg/60 text-xs">{setupConfig.timeZone || 'Unknown timezone'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <Calendar className="text-fg/60 h-4 w-4" />
            <div>
              <p className="text-fg/80 text-xs font-medium sm:text-sm">Event Date</p>
              <p className="text-fg text-sm sm:text-base">Not scheduled</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export interface PaymentSectionProps {
  setupConfig: Partial<QuizConfig>;
  currency: string;
}

export const PaymentSection: FC<PaymentSectionProps> = ({ setupConfig, currency }) => {
  return (
    <div className="bg-muted rounded-lg border-2 border-border p-3 shadow-sm sm:p-6">
      <div className="mb-3 flex items-center gap-3 sm:mb-4">
        <HeaderTile />
        <div className="min-w-0 flex-1">
          <h3 className="text-fg text-sm font-semibold sm:text-base">Payment Setup</h3>
          <p className="text-fg/70 text-xs sm:text-sm">Entry fee and collection method</p>
        </div>
        <CheckCircle className="h-5 w-5 text-green-600" />
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <DollarSign className="text-fg/60 h-4 w-4" />
          <div>
            <p className="text-fg/80 text-xs font-medium sm:text-sm">Entry Fee</p>
            <p className="text-fg text-sm font-semibold sm:text-base">
              {setupConfig.entryFee ? `${currency}${setupConfig.entryFee}` : 'Free'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Wallet className="text-fg/60 h-4 w-4" />
          <div>
            <p className="text-fg/80 text-xs font-medium sm:text-sm">Payment Method</p>
            <p className="text-fg text-sm sm:text-base">
              {setupConfig.paymentMethod === 'web3' ? 'Web3 Wallet' : 'Cash / Card'}
            </p>
          </div>
        </div>

        {setupConfig.paymentMethod === 'web3' && (
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="text-purple-700">Chain</span>
                <span className="font-medium text-purple-900">{setupConfig.web3Chain || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-700">Currency</span>
                <span className="font-medium text-purple-900">{setupConfig.web3Currency || 'USDGLO'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-700">Charity</span>
                <span className="font-medium text-purple-900">{setupConfig.web3Charity || 'Not selected'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export interface QuizStructureSectionProps {
  roundDefinitions: RoundDefinition[];
  hasRounds: boolean;
}

export const QuizStructureSection: FC<QuizStructureSectionProps> = ({ roundDefinitions, hasRounds }) => {
  return (
    <div className="bg-muted rounded-lg border-2 border-border p-3 shadow-sm sm:p-6">
      <div className="mb-3 flex items-center gap-3 sm:mb-4">
        <HeaderTile />
        <div className="min-w-0 flex-1">
          <h3 className="text-fg text-sm font-semibold sm:text-base">Quiz Structure</h3>
          <p className="text-fg/70 text-xs sm:text-sm">{roundDefinitions.length} rounds configured</p>
        </div>
        {hasRounds && <CheckCircle className="h-5 w-5 text-green-600" />}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {roundDefinitions.map((round: RoundDefinition, idx: number) => (
          <div key={idx} className="rounded-lg border border-border bg-card p-3">
            <div className="mb-1.5 flex items-center gap-2">
              <Target className="h-4 w-4 text-indigo-600" />
              <span className="text-fg text-sm font-medium">Round {idx + 1}</span>
            </div>
            <div className="space-y-0.5 text-xs sm:text-sm">
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

export interface PrizesSectionProps {
  setupConfig: Partial<QuizConfig>;
  currency: string;
}

export const PrizesSection: FC<PrizesSectionProps> = ({ setupConfig, currency }) => {
  const hasPrizes = (setupConfig.prizes && setupConfig.prizes.length > 0) || setupConfig.prizeSplits;

  if (!hasPrizes) return null;

  return (
    <div className="bg-muted rounded-lg border-2 border-border p-3 shadow-sm sm:p-6">
      <div className="mb-3 flex items-center gap-3 sm:mb-4">
        <HeaderTile />
        <div className="min-w-0 flex-1">
          <h3 className="text-fg text-sm font-semibold sm:text-base">Prizes</h3>
          <p className="text-fg/70 text-xs sm:text-sm">Winner rewards</p>
        </div>
        <CheckCircle className="h-5 w-5 text-green-600" />
      </div>

      <div className="space-y-3">
        {setupConfig.prizes && setupConfig.prizes.length > 0 && (
          <div>
            <h4 className="text-fg/80 mb-2 text-xs font-medium sm:text-sm">Defined Prizes</h4>
            <div className="space-y-2">
              {setupConfig.prizes.map((prize, idx) => (
                <div key={idx} className="flex items-center gap-3 rounded border border-border bg-card p-2">
                  <Trophy className="h-4 w-4 text-yellow-600" />
                  <div className="min-w-0">
                    <p className="text-fg text-sm font-medium">
                      {prize.place === 1
                        ? '1st'
                        : prize.place === 2
                        ? '2nd'
                        : prize.place === 3
                        ? '3rd'
                        : `${prize.place}th`}{' '}
                      Place
                    </p>
                    <p className="text-fg/70 text-xs">
                      {prize.description || 'No description'}
                      {prize.value ? ` • ${currency}${prize.value}` : ''}
                      {prize.sponsor ? ` • ${prize.sponsor}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {setupConfig.prizeSplits && (
          <div>
            <h4 className="text-fg/80 mb-2 text-xs font-medium sm:text-sm">Prize Pool Splits</h4>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(setupConfig.prizeSplits).map(([place, pct]) => (
                <div key={place} className="rounded border border-yellow-200 bg-yellow-50 p-2 text-center">
                  <div className="font-bold text-yellow-700">{pct}%</div>
                  <div className="text-xs text-yellow-700">
                    {place === '1' ? '1st' : place === '2' ? '2nd' : place === '3' ? '3rd' : `${place}th`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export interface FundraisingSectionProps {
  setupConfig: Partial<QuizConfig>;
  currency: string;
}

export const FundraisingSection: FC<FundraisingSectionProps> = ({ setupConfig, currency }) => {
  const hasExtras =
    setupConfig.fundraisingOptions &&
    Object.entries(setupConfig.fundraisingOptions).some(([, enabled]) => enabled);

  return (
    <div className="bg-muted rounded-lg border-2 border-border p-3 shadow-sm sm:p-6">
      <div className="mb-3 flex items-center gap-3 sm:mb-4">
        <HeaderTile />
        <div className="min-w-0 flex-1">
          <h3 className="text-fg text-sm font-semibold sm:text-base">Fundraising Extras</h3>
          <p className="text-fg/70 text-xs sm:text-sm">Additional fundraising options</p>
        </div>
        <CheckCircle className="h-5 w-5 text-green-600" />
      </div>

      <div className="space-y-2">
        {hasExtras ? (
          Object.entries(setupConfig.fundraisingOptions || {}).map(([key, enabled]) =>
            enabled ? (
              <div
                key={key}
                className="flex items-center justify-between rounded border border-green-200 bg-green-50 p-2"
              >
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    {fundraisingExtraDefinitions[key as keyof typeof fundraisingExtraDefinitions]?.label || key}
                  </span>
                </div>
                <span className="text-sm font-semibold text-green-900">
                  {currency}
                  {setupConfig.fundraisingPrices?.[key] ?? '0.00'}
                </span>
              </div>
            ) : null
          )
        ) : (
          <div className="text-fg/60 py-4 text-center">
            <Heart className="mx-auto mb-2 h-8 w-8 text-fg/30" />
            <p className="text-sm">No additional fundraising options selected</p>
          </div>
        )}
      </div>
    </div>
  );
};

