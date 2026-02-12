// src/components/Quiz/shared/PaymentInstructions.tsx
import React, { useState, useMemo } from 'react';
import { ChevronLeft, Copy, Check, ExternalLink, AlertCircle, CreditCard, Lock, Smartphone, Building2 } from 'lucide-react';

// Use a flexible type that works with both ticket and join flow types
export interface ClubPaymentMethod {
  id: string | number;
  methodLabel: string;
  methodCategory: string;
  providerName?: string | null | undefined;
  playerInstructions?: string | null | undefined;
  methodConfig?: any;
  // Optional fields that may be present in some implementations
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
}

function ProviderBadge({ providerName }: { providerName: string | null | undefined }) {
  const meta = useMemo(() => {
    const p = providerName?.toLowerCase();
    if (p === 'revolut') return { 
      icon: <Smartphone className="h-4 w-4" />, 
      label: 'Revolut', 
      cls: 'bg-blue-50 text-blue-700 border-blue-200' 
    };
    if (p === 'bank_transfer') return { 
      icon: <Building2 className="h-4 w-4" />, 
      label: 'Bank Transfer', 
      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' 
    };
    return { 
      icon: <CreditCard className="h-4 w-4" />, 
      label: providerName || 'Payment', 
      cls: 'bg-gray-50 text-gray-700 border-gray-200' 
    };
  }, [providerName]);

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${meta.cls}`}>
      {meta.icon}
      {meta.label}
    </span>
  );
}

function CopyButton({
  value,
  label = 'Copy',
  onCopied,
}: {
  value: string;
  label?: string;
  onCopied?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // silent; user can still manually select
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

export const PaymentInstructions: React.FC<PaymentInstructionsProps> = ({
  method,
  paymentReference,
  totalAmount,
  currencySymbol,
  onConfirmPaid,
  onBack,
  error,
  confirming = false,
}) => {
  const [hasEverCopied, setHasEverCopied] = useState(false);

  const revolutLink = method.providerName?.toLowerCase() === 'revolut' &&
    method.methodConfig &&
    'link' in method.methodConfig
    ? method.methodConfig.link
    : undefined;

  const revolutQR = method.providerName?.toLowerCase() === 'revolut' &&
    method.methodConfig &&
    'qrCodeUrl' in method.methodConfig
    ? method.methodConfig.qrCodeUrl
    : undefined;

  return (
    <>
      <PaymentInstructionsContent
        method={method}
        paymentReference={paymentReference}
        totalAmount={totalAmount}
        currencySymbol={currencySymbol}
        revolutLink={revolutLink}
        revolutQR={revolutQR}
        error={error}
        hasEverCopied={hasEverCopied}
        onCopied={() => setHasEverCopied(true)}
      />
      <PaymentInstructionsFooter
        hasEverCopied={hasEverCopied}
        confirming={confirming}
        onConfirmPaid={onConfirmPaid}
        onBack={onBack}
      />
    </>
  );
};

// Separate content component for use with StepLayout
export const PaymentInstructionsContent: React.FC<{
  method: ClubPaymentMethod;
  paymentReference: string;
  totalAmount: number;
  currencySymbol: string;
  revolutLink?: string | null;
  revolutQR?: string | null;
  error?: string | null;
  hasEverCopied: boolean;
  onCopied: () => void;
}> = ({
  method,
  paymentReference,
  totalAmount,
  currencySymbol,
  revolutLink,
  revolutQR,
  error,
  hasEverCopied,
  onCopied,
}) => {
  return (
    <div className="space-y-5">
      {/* Amount / method summary */}
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Amount due</div>
            <div className="mt-1 text-3xl font-extrabold text-gray-900">
              {currencySymbol}{totalAmount.toFixed(2)}
            </div>
            <div className="mt-1 text-sm text-gray-600">{method.methodLabel}</div>
          </div>
          <ProviderBadge providerName={method.providerName ?? null} />
        </div>
      </div>

      {/* Reference (copy-to-unlock) */}
      <div className={`rounded-2xl border-2 p-4 sm:p-5 transition-all ${
        hasEverCopied ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <AlertCircle className={`h-5 w-5 ${hasEverCopied ? 'text-green-700' : 'text-amber-700'}`} />
              <div className={`font-bold ${hasEverCopied ? 'text-green-900' : 'text-amber-900'}`}>
                {hasEverCopied ? 'Reference copied' : 'Copy this payment reference'}
              </div>
            </div>
            <p className={`mt-1 text-sm ${hasEverCopied ? 'text-green-800' : 'text-amber-800'}`}>
              You must include this reference so the host can match your payment.
            </p>
          </div>

          <CopyButton
            value={paymentReference}
            label="Copy"
            onCopied={onCopied}
          />
        </div>

        <div className="mt-4">
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 font-mono text-base font-extrabold text-gray-900">
            {paymentReference}
          </div>

          {!hasEverCopied && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-white/60 p-3">
              <div className="flex items-start gap-2">
                <Lock className="h-4 w-4 text-amber-700 mt-0.5" />
                <p className="text-xs text-amber-800">
                  The "I've paid" button unlocks after you copy the reference.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Revolut Payment */}
      {method.providerName?.toLowerCase() === 'revolut' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-gray-900">Pay using Revolut</div>
              <div className="text-sm text-gray-600">Open the link or scan the QR code</div>
            </div>
          </div>

          {revolutLink && (
            <a
              href={revolutLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border-2 border-blue-500 bg-blue-50 px-4 py-3 font-semibold text-blue-700 transition-colors hover:bg-blue-100"
            >
              <span>Open Revolut payment</span>
              <ExternalLink className="h-5 w-5" />
            </a>
          )}

          {revolutQR && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-2 text-sm font-semibold text-gray-800">Scan QR</div>
              <img
                src={revolutQR}
                alt="Revolut QR Code"
                className="mx-auto h-48 w-48 rounded-lg border border-gray-200 bg-white"
              />
            </div>
          )}
        </div>
      )}

      {/* Bank Transfer */}
      {method.providerName?.toLowerCase() === 'bank_transfer' && method.methodConfig && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-gray-900">Bank details</div>
            <CreditCard className="h-4 w-4 text-gray-500" />
          </div>

          {'accountName' in method.methodConfig && method.methodConfig.accountName && (
            <div className="flex items-center justify-between gap-3 border-t pt-3">
              <span className="text-sm text-gray-600">Account name</span>
              <span className="text-sm font-semibold text-gray-900">{method.methodConfig.accountName}</span>
            </div>
          )}

          {'iban' in method.methodConfig && method.methodConfig.iban && (
            <div className="flex items-center justify-between gap-3 border-t pt-3">
              <span className="text-sm text-gray-600">IBAN</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-gray-900">{method.methodConfig.iban}</span>
                <CopyButton value={method.methodConfig.iban} label="Copy" />
              </div>
            </div>
          )}

          {'bic' in method.methodConfig && method.methodConfig.bic && (
            <div className="flex items-center justify-between gap-3 border-t pt-3">
              <span className="text-sm text-gray-600">BIC/SWIFT</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-gray-900">{method.methodConfig.bic}</span>
                <CopyButton value={method.methodConfig.bic} label="Copy" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Custom instructions */}
      {method.playerInstructions && (
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

// Separate footer component for use with StepLayout
export const PaymentInstructionsFooter: React.FC<{
  hasEverCopied: boolean;
  confirming?: boolean;
  onConfirmPaid: () => void;
  onBack: () => void;
}> = ({ hasEverCopied, confirming, onConfirmPaid, onBack }) => {
  return (
    <div className="space-y-3">
      {/* Confirm Payment Button */}
      <button
        onClick={onConfirmPaid}
        disabled={!hasEverCopied || confirming}
        className={`w-full rounded-xl px-6 py-3.5 font-bold transition-all ${
          hasEverCopied && !confirming
            ? 'bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg'
            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          {!hasEverCopied && <Lock className="h-4 w-4" />}
          {confirming && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
          <span>
            {confirming ? 'Processing...' : hasEverCopied ? "I've completed payment" : 'Copy reference to continue'}
          </span>
        </div>
      </button>

      {/* Back button */}
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