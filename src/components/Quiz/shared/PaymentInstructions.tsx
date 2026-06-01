// src/components/Quiz/shared/PaymentInstructions.tsx
import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  CreditCard,
  Lock,
  Smartphone,
  Building2,
  HeartHandshake,
  CheckCircle2,
} from 'lucide-react';

export interface ClubPaymentMethod {
  id: string | number;
  methodLabel: string;
  methodCategory: string;
  providerName?: string | null | undefined;
  playerInstructions?: string | null | undefined;
  methodConfig?: any;
  clubId?: string;
  displayOrder?: number;
  isEnabled?: boolean;
}

interface PaymentInstructionsProps {
  method: ClubPaymentMethod;
  paymentReference: string;
  totalAmount: number;
  currencySymbol: string;
  onConfirmPaid: () => void;
  onBack: () => void;
  error?: string | null;
  confirming?: boolean;
  // Donation inline input
  isDonationRoom?: boolean;
  donationAmountInput?: string;
  onDonationAmountChange?: (val: string) => void;
  isDonationAmountValid?: boolean;
}

function ProviderBadge({ providerName }: { providerName: string | null | undefined }) {
  const meta = useMemo(() => {
    const p = providerName?.toLowerCase();
    if (p === 'revolut')
      return { icon: <Smartphone className="h-4 w-4" />, label: 'Revolut', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (p === 'bank_transfer')
      return { icon: <Building2 className="h-4 w-4" />, label: 'Bank Transfer', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    return { icon: <CreditCard className="h-4 w-4" />, label: providerName || 'Payment', cls: 'bg-gray-50 text-gray-700 border-gray-200' };
  }, [providerName]);

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${meta.cls}`}>
      {meta.icon}
      {meta.label}
    </span>
  );
}

function CopyButton({ value, label = 'Copy', onCopied }: { value: string; label?: string; onCopied?: () => void }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // silent
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white transition-colors ${
        copied ? 'bg-green-600' : 'bg-indigo-600 hover:bg-indigo-700'
      }`}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

function getStringConfig(config: any, key: string): string | undefined {
  if (!config) return undefined;
  const v = config?.[key];
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;
}

// ─── Stage indicator ────────────────────────────────────────────────────────

function StageIndicator({ stage }: { stage: 1 | 2 | 3 }) {
  const steps = [
    { label: 'Copy reference', num: 1 },
    { label: 'Open & pay', num: 2 },
    { label: 'Confirm', num: 3 },
  ];

  return (
    <div className="flex items-center gap-1 mb-5">
      {steps.map((s, i) => {
        const done = stage > s.num;
        const active = stage === s.num;
        return (
          <React.Fragment key={s.num}>
            <div className="flex items-center gap-1.5">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  done
                    ? 'bg-green-500 text-white'
                    : active
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {done ? <Check className="h-3 w-3" /> : s.num}
              </div>
              <span
                className={`text-xs font-medium hidden sm:inline ${
                  done ? 'text-green-600' : active ? 'text-indigo-700' : 'text-gray-400'
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px mx-1 ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Donation inline input ───────────────────────────────────────────────────

function DonationAmountInput({
  currencySymbol,
  value,
  onChange,
}: {
  currencySymbol: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-4 sm:p-5">
      <div className="flex items-start gap-3 mb-3">
        <HeartHandshake className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-bold text-indigo-900">How much would you like to donate?</div>
          <div className="text-sm text-indigo-700 mt-0.5">Enter your amount before completing payment.</div>
        </div>
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-indigo-600 text-lg">
          {currencySymbol}
        </span>
        <input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0.00"
          className="w-full rounded-xl border-2 border-indigo-200 bg-white py-3 pl-8 pr-4 text-xl font-bold text-indigo-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
      </div>
    </div>
  );
}

// ─── Main content ────────────────────────────────────────────────────────────

export const PaymentInstructionsContent: React.FC<{
  method: ClubPaymentMethod;
  paymentReference: string;
  totalAmount: number;
  currencySymbol: string;
  revolutLink?: string | null;
  error?: string | null;
  hasEverCopied: boolean;
  hasOpenedProviderLink: boolean;
  onCopied: () => void;
  onOpenedLink: () => void;
  isDonationRoom?: boolean;
  donationAmountInput?: string;
  onDonationAmountChange?: (val: string) => void;
  isDonationAmountValid?: boolean;
}> = ({
  method,
  paymentReference,
  totalAmount,
  currencySymbol,
  revolutLink,
  error,
  hasEverCopied,
  hasOpenedProviderLink,
  onCopied,
  onOpenedLink,
  isDonationRoom = false,
  donationAmountInput = '',
  onDonationAmountChange,
  // isDonationAmountValid intentionally omitted here — only used in PaymentInstructionsFooter
}) => {
  const providerKey = method.providerName?.toLowerCase();
  const isRevolut = providerKey === 'revolut';
  const isBankTransfer = providerKey === 'bank_transfer';
  const hasInlineProvider = isRevolut || isBankTransfer;

  // Determine current stage for the indicator
  const stage: 1 | 2 | 3 = !hasEverCopied ? 1 : !hasOpenedProviderLink && hasInlineProvider ? 2 : 3;

  // For bank transfer or methods without a link, stage 2 is skipped — copying is enough to unlock confirm
  const effectiveStage: 1 | 2 | 3 = hasInlineProvider ? stage : hasEverCopied ? 3 : 1;

  return (
    <div className="space-y-4">

      {/* Stage indicator — only for methods with a provider link/details */}
      {hasInlineProvider && (
        <StageIndicator stage={effectiveStage} />
      )}

      {/* Donation amount input — shown at top, must be filled before proceeding */}
      {isDonationRoom && onDonationAmountChange && (
        <DonationAmountInput
          currencySymbol={currencySymbol}
          value={donationAmountInput}
          onChange={onDonationAmountChange}
        />
      )}

      {/* Amount / method summary */}
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {isDonationRoom ? 'Donation amount' : 'Amount due'}
            </div>
            <div className="mt-1 text-3xl font-extrabold text-gray-900">
              {isDonationRoom
                ? `${currencySymbol}${parseFloat(donationAmountInput || '0') > 0 ? parseFloat(donationAmountInput!).toFixed(2) : '—'}`
                : `${currencySymbol}${totalAmount.toFixed(2)}`}
            </div>
            <div className="mt-1 text-sm text-gray-600">{method.methodLabel}</div>
          </div>
          <ProviderBadge providerName={method.providerName ?? null} />
        </div>
      </div>

      {/* STEP 1 — Copy reference */}
      <div
        className={`rounded-2xl border-2 p-4 sm:p-5 transition-all ${
          hasEverCopied ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {hasEverCopied
                ? <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                : <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />}
              <div className={`font-bold ${hasEverCopied ? 'text-green-900' : 'text-amber-900'}`}>
                {hasEverCopied ? 'Reference copied ✓' : 'Step 1 — Copy your payment reference'}
              </div>
            </div>
            <p className={`mt-1 text-sm ${hasEverCopied ? 'text-green-800' : 'text-amber-800'}`}>
              Include this in your payment note so the host can match your payment.
            </p>
          </div>
          <CopyButton value={paymentReference} label="Copy" onCopied={onCopied} />
        </div>

        <div className="mt-3 rounded-xl border border-gray-200 bg-white px-4 py-3 font-mono text-base font-extrabold text-gray-900 tracking-wider">
          {paymentReference}
        </div>

        {!hasEverCopied && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-white/60 p-3">
            <Lock className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-800">
              Copy the reference first — payment details will unlock once copied.
            </p>
          </div>
        )}
      </div>

      {/* STEP 2 — Provider link / bank details — only shown after reference is copied */}
      {hasEverCopied && (
        <>
          {/* Revolut link */}
          {isRevolut && (
            <div className={`rounded-2xl border-2 p-4 sm:p-5 space-y-3 transition-all ${
              hasOpenedProviderLink ? 'border-green-300 bg-green-50' : 'border-blue-300 bg-blue-50'
            }`}>
              <div className="flex items-center gap-2">
                {hasOpenedProviderLink
                  ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                  : <Smartphone className="h-5 w-5 text-blue-600" />}
                <div className={`font-bold ${hasOpenedProviderLink ? 'text-green-900' : 'text-blue-900'}`}>
                  {hasOpenedProviderLink ? 'Revolut opened ✓' : 'Step 2 — Open Revolut and pay'}
                </div>
              </div>

              {!hasOpenedProviderLink && (
                <p className="text-sm text-blue-800">
                  Paste the reference you copied into the payment note, then send the payment.
                </p>
              )}

              {revolutLink ? (
                <a
                  href={revolutLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onOpenedLink}
                  className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 font-semibold transition-colors ${
                    hasOpenedProviderLink
                      ? 'border-green-400 bg-white text-green-700 hover:bg-green-50'
                      : 'border-blue-500 bg-white text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  <span>{hasOpenedProviderLink ? 'Open Revolut again' : 'Open Revolut payment'}</span>
                  <ExternalLink className="h-5 w-5" />
                </a>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-700 mt-0.5" />
                    <p className="text-sm text-amber-900">
                      No Revolut link set up. Please contact the host directly.
                    </p>
                  </div>
                </div>
              )}

              {!hasOpenedProviderLink && revolutLink && (
                <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-white/60 p-3">
                  <Lock className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-800">
                    Open the Revolut link to unlock the confirmation button.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Bank transfer details */}
          {isBankTransfer && method.methodConfig && (
            <div className={`rounded-2xl border-2 p-4 sm:p-5 space-y-3 transition-all ${
              hasOpenedProviderLink ? 'border-green-300 bg-green-50' : 'border-emerald-300 bg-emerald-50'
            }`}>
              <div className="flex items-center gap-2">
                {hasOpenedProviderLink
                  ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                  : <Building2 className="h-5 w-5 text-emerald-600" />}
                <div className={`font-bold ${hasOpenedProviderLink ? 'text-green-900' : 'text-emerald-900'}`}>
                  {hasOpenedProviderLink ? 'Bank details noted ✓' : 'Step 2 — Bank transfer details'}
                </div>
              </div>

              {!hasOpenedProviderLink && (
                <p className="text-sm text-emerald-800">
                  Use these details to make your transfer. Include the reference in the payment description.
                </p>
              )}

              <div className="rounded-xl bg-white border border-gray-200 divide-y divide-gray-100">
                {'accountName' in method.methodConfig && method.methodConfig.accountName && (
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="text-sm text-gray-500">Account name</span>
                    <span className="text-sm font-semibold text-gray-900">{method.methodConfig.accountName}</span>
                  </div>
                )}
                {'iban' in method.methodConfig && method.methodConfig.iban && (
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="text-sm text-gray-500">IBAN</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-gray-900">{method.methodConfig.iban}</span>
                      <CopyButton value={method.methodConfig.iban} label="Copy" onCopied={onOpenedLink} />
                    </div>
                  </div>
                )}
                {'bic' in method.methodConfig && method.methodConfig.bic && (
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="text-sm text-gray-500">BIC/SWIFT</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-gray-900">{method.methodConfig.bic}</span>
                      <CopyButton value={method.methodConfig.bic} label="Copy" />
                    </div>
                  </div>
                )}
              </div>

              {!hasOpenedProviderLink && (
                <>
                  <button
                    type="button"
                    onClick={onOpenedLink}
                    className="w-full rounded-xl border-2 border-emerald-500 bg-white px-4 py-3 font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors"
                  >
                    I've noted the bank details
                  </button>
                  <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-white/60 p-3">
                    <Lock className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-emerald-800">
                      Confirm you've noted the bank details to unlock the confirmation button.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Other instant payment methods (PayPal, etc.) — no specific link, just show instructions */}
          {!isRevolut && !isBankTransfer && method.playerInstructions && (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
              <div className="text-sm font-bold text-gray-900 mb-2">Payment instructions</div>
              <div
                className="prose prose-sm max-w-none text-sm text-gray-700"
                dangerouslySetInnerHTML={{ __html: method.playerInstructions }}
              />
            </div>
          )}
        </>
      )}

      {/* Custom instructions — shown after copy for non revolut/bank methods */}
      {hasEverCopied && !isRevolut && !isBankTransfer && method.playerInstructions && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
          <div
            className="prose prose-sm max-w-none text-sm text-gray-700"
            dangerouslySetInnerHTML={{ __html: method.playerInstructions }}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Footer ──────────────────────────────────────────────────────────────────

export const PaymentInstructionsFooter: React.FC<{
  hasEverCopied: boolean;
  hasOpenedProviderLink: boolean;
  hasProviderStep: boolean;
  confirming?: boolean;
  onConfirmPaid: () => void;
  onBack: () => void;
  // Donation gating
  isDonationRoom?: boolean;
  isDonationAmountValid?: boolean;
}> = ({
  hasEverCopied,
  hasOpenedProviderLink,
  hasProviderStep,
  confirming,
  onConfirmPaid,
  onBack,
  isDonationAmountValid = true,
}) => {
  // For methods with a provider step (Revolut, bank transfer), require both copy AND opened
  // For other methods, only require copy
  const canConfirm = isDonationAmountValid &&
    hasEverCopied &&
    (!hasProviderStep || hasOpenedProviderLink);

  const lockReason = !isDonationAmountValid
    ? 'Enter a donation amount to continue'
    : !hasEverCopied
    ? 'Copy your reference first'
    : !canConfirm
    ? 'Open the payment link next and make the payment. Don\'t forget to include the reference in your payment note!'
    : null;

  return (
    <div className="space-y-3">
      <button
        onClick={onConfirmPaid}
        disabled={!canConfirm || confirming}
        className={`w-full rounded-xl px-6 py-3.5 font-bold transition-all ${
          canConfirm && !confirming
            ? 'bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg'
            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          {lockReason && !confirming && <Lock className="h-4 w-4" />}
          {confirming && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          <span>
            {confirming
              ? 'Processing...'
              : canConfirm
              ? "I've completed payment"
              : lockReason}
          </span>
        </div>
      </button>

      <button
        onClick={onBack}
        disabled={confirming}
        className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
      >
        <ChevronLeft className="h-4 w-4" />
        Change payment method
      </button>
    </div>
  );
};

// ─── Convenience wrapper (backwards-compatible for simple use) ────────────────

export const PaymentInstructions: React.FC<PaymentInstructionsProps> = ({
  method,
  paymentReference,
  totalAmount,
  currencySymbol,
  onConfirmPaid,
  onBack,
  error,
  confirming = false,
  isDonationRoom = false,
  donationAmountInput = '',
  onDonationAmountChange,
  isDonationAmountValid = true,
}) => {
  const [hasEverCopied, setHasEverCopied] = useState(false);
  const [hasOpenedProviderLink, setHasOpenedProviderLink] = useState(false);

  const providerKey = method.providerName?.toLowerCase();
  const isRevolut = providerKey === 'revolut';
  const isBankTransfer = providerKey === 'bank_transfer';
  const hasProviderStep = isRevolut || isBankTransfer;

  const revolutLink = isRevolut ? getStringConfig(method.methodConfig, 'link') : undefined;

  return (
    <>
      <PaymentInstructionsContent
        method={method}
        paymentReference={paymentReference}
        totalAmount={totalAmount}
        currencySymbol={currencySymbol}
        revolutLink={revolutLink}
        error={error}
        hasEverCopied={hasEverCopied}
        hasOpenedProviderLink={hasOpenedProviderLink}
        onCopied={() => setHasEverCopied(true)}
        onOpenedLink={() => setHasOpenedProviderLink(true)}
        isDonationRoom={isDonationRoom}
        donationAmountInput={donationAmountInput}
        onDonationAmountChange={onDonationAmountChange}
        isDonationAmountValid={isDonationAmountValid}
      />
      <PaymentInstructionsFooter
        hasEverCopied={hasEverCopied}
        hasOpenedProviderLink={hasOpenedProviderLink}
        hasProviderStep={hasProviderStep}
        confirming={confirming}
        onConfirmPaid={onConfirmPaid}
        onBack={onBack}
        isDonationRoom={isDonationRoom}
        isDonationAmountValid={isDonationAmountValid}
      />
    </>
  );
};