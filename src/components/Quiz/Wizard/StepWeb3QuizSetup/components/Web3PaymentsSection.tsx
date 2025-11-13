/**
 * Web3 Payments Section Component
 *
 * Configuration for blockchain, token, charity, and entry fee.
 */

import { FC } from 'react';
import { Wallet, DollarSign, Heart, Check, Sparkles, Trophy } from 'lucide-react';
import type { ChoiceValue } from '../types';
import { CHOICES } from '../types';
import { getCharityById } from '@/chains/evm/config/gbcharities';
import { CHARITIES as CHARITY_DIR } from '@/chains/evm/config/gbcharities';

export interface Web3PaymentsSectionProps {
  choice: ChoiceValue;
  currency: string;
  charityId: string;
  entryFee: string;
  availableTokens: Array<{ value: string; label: string }>;
  completed: boolean;
  setupConfig: any;
  onChoiceChange: (value: ChoiceValue) => void;
  onCurrencyChange: (value: string) => void;
  onCharityChange: (id: string) => void;
  onEntryFeeChange: (value: string) => void;
  onUpdateConfig: (config: any) => void;
}

export const Web3PaymentsSection: FC<Web3PaymentsSectionProps> = ({
  choice,
  currency,
  charityId,
  entryFee,
  availableTokens,
  completed,
  setupConfig,
  onChoiceChange,
  onCurrencyChange,
  onCharityChange,
  onEntryFeeChange,
  onUpdateConfig,
}) => {
  return (
    <div
      className={`bg-muted rounded-lg border-2 p-4 shadow-sm transition-all sm:rounded-xl sm:p-6 ${
        completed ? 'border-green-300 bg-green-50' : 'border-border'
      }`}
    >
      <div className="mb-3 flex items-start gap-3 sm:mb-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xl sm:h-12 sm:w-12 sm:text-2xl">
          🔗
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-fg text-sm font-semibold sm:text-base">Web3 Payments</h3>
            {completed && <Check className="h-4 w-4 text-green-600 sm:h-5 sm:w-5" />}
          </div>
          <p className="text-fg/70 text-xs sm:text-sm">Automated crypto payments with smart contracts</p>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50 p-3 md:p-4">
        <div className="mb-1 flex items-center space-x-2">
          <Wallet className="h-4 w-4 text-indigo-600" />
          <span className="text-sm font-medium text-indigo-800 md:text-base">Web3 Payment Collection</span>
        </div>
        <div className="text-xs text-indigo-700 md:text-sm">
          Select a blockchain, token, charity, and set your crypto entry fee. Smart contracts verify payments
          automatically.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-fg/80 flex items-center gap-2 text-xs font-medium sm:text-sm">
            <Wallet className="h-4 w-4" />
            <span>Blockchain</span>
          </label>
          <select
            value={choice}
            onChange={(e) => onChoiceChange(e.target.value as ChoiceValue)}
            className="border-border w-full rounded-lg border-2 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:px-4 sm:py-3 sm:text-base"
          >
            {CHOICES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <p className="text-fg/60 text-xs">{CHOICES.find((c) => c.value === choice)?.description}</p>
        </div>

        <div className="space-y-2">
          <label className="text-fg/80 flex items-center gap-2 text-xs font-medium sm:text-sm">
            <DollarSign className="h-4 w-4" />
            <span>Cryptocurrency</span>
          </label>
          <select
            value={currency}
            onChange={(e) => onCurrencyChange(e.target.value)}
            className="border-border w-full rounded-lg border-2 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:px-4 sm:py-3 sm:text-base"
          >
            {availableTokens.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <p className="text-fg/60 text-xs">Available tokens on {CHOICES.find((c) => c.value === choice)?.label}</p>
        </div>
      </div>

      {currency === 'USDGLO' && choice !== 'stellar' && (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3">
          <div className="mb-1 flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">About Glo Dollar</span>
          </div>
          <p className="text-xs text-green-700">
            Glo Dollar helps fund global public goods through their unique reserve model.
          </p>
        </div>
      )}

      {/* Charity */}
      <div className="mt-4 space-y-2">
        <label className="text-fg/80 flex items-center gap-2 text-xs font-medium sm:text-sm">
          <Heart className="h-4 w-4 text-red-500" />
          <span>
            Choose a Charity <span className="text-red-500">*</span>
          </span>
        </label>
        <select
          value={charityId}
          onChange={(e) => {
            const id = e.target.value || '';
            onCharityChange(id);
            const c = getCharityById(id || undefined);
            onUpdateConfig({
              web3CharityOrgId: id || null,
              web3CharityName: c?.name || null,
              web3CharityId: id || null,
              web3CharityAddress: null,
            } as any);
          }}
          className={`w-full rounded-lg border-2 px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-indigo-200 sm:px-4 sm:py-3 sm:text-base ${
            charityId ? 'border-green-300 bg-green-50 focus:border-green-500' : 'border-border focus:border-indigo-500'
          }`}
        >
          <option value="">Select a charity...</option>
          {CHARITY_DIR.map((ch) => (
            <option key={ch.id} value={ch.id}>
              {ch.name}
            </option>
          ))}
        </select>

        {charityId && (
          <div className="rounded-md border border-indigo-200 bg-indigo-50 p-2 text-[11px] text-indigo-800 break-words">
            TGB Org ID: {setupConfig.web3CharityOrgId}
          </div>
        )}

        <p className="text-fg/60 text-xs italic">Powered by The Giving Block and Coala Pay</p>
      </div>

      {/* Entry Fee */}
      <div className="mt-4">
        <div className="mb-3 flex items-start gap-3 sm:mb-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 text-xl sm:h-12 sm:w-12 sm:text-2xl">
            💰
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-fg text-sm font-semibold sm:text-base">Entry Fee Amount</h3>
            <p className="text-fg/70 text-xs sm:text-sm">Set the cryptocurrency entry fee</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-fg/80 flex items-center gap-2 text-xs font-medium sm:text-sm">
            <DollarSign className="h-4 w-4" />
            <span>
              Entry Fee ({currency}) <span className="text-red-500">*</span>
            </span>
          </label>
          <div className="relative">
            <span className="text-fg/60 absolute left-3 top-1/2 -translate-y-1/2 transform text-sm font-medium sm:text-base">
              {currency}
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={entryFee}
              onChange={(e) => onEntryFeeChange(e.target.value)}
              placeholder="5.00"
              className="border-border w-full rounded-lg border-2 py-2.5 pl-16 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:py-3 sm:pl-20 sm:pr-4 sm:text-base"
            />
          </div>
        </div>

        {entryFee && !isNaN(parseFloat(entryFee)) && parseFloat(entryFee) > 0 && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3">
            <div className="mb-1 flex items-center space-x-2">
              <Trophy className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Entry Fee Set</span>
            </div>
            <p className="text-sm text-green-700">
              Each participant will pay <strong>{currency} {entryFee}</strong> via smart contract
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

