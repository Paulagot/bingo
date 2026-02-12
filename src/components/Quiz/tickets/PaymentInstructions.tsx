// src/components/Quiz/tickets/PaymentInstructions.tsx
import React, { useMemo, useState } from 'react';
import { ChevronLeft, Copy, Check, ExternalLink, AlertCircle, CreditCard, Lock, Smartphone, Building2 } from 'lucide-react';
import type { ClubPaymentMethod } from './types';

interface PaymentInstructionsProps {
  method: ClubPaymentMethod;
  paymentReference: string;
  totalAmount: number;
  currencySymbol: string;
  onConfirmPaid: () => void;
  onBack: () => void;
  error: string | null;
}

function ProviderBadge({ providerName }: { providerName: string | null }) {
  const meta = useMemo(() => {
    const p = providerName?.toLowerCase();
    if (p === 'revolut') return { icon: <Smartphone className="h-4 w-4" />, label: 'Revolut', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (p === 'bank_transfer') return { icon: <Building2 className="h-4 w-4" />, label: 'Bank Transfer', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    return { icon: <CreditCard className="h-4 w-4" />, label: providerName || 'Payment', cls: 'bg-gray-50 text-gray-700 border-gray-200' };
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
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white ${
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
}) => {
  const [hasEverCopied, setHasEverCopied] = useState(false);

  const revolutLink = method.providerName?.toLowerCase() === 'revolut'
    ? method.methodConfig?.link
    : undefined;

  return (
    <div className="flex h-full max-h-[95vh] flex-col sm:max-h-[90vh]">
      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
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
            <ProviderBadge providerName={method.providerName} />
          </div>
        </div>

        {/* Reference (unlock) */}
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
              onCopied={() => setHasEverCopied(true)}
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
                    The “I’ve paid” button unlocks after you copy the reference.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pay now (primary action block) */}
        {method.providerName?.toLowerCase() === 'revolut' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-gray-900">Pay using Revolut</div>
                <div className="text-sm text-gray-600">Open the link or scan the QR code</div>
              </div>
            </div>

            {/* ✅ FIXED: valid <a href="..."> */}
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

            {method.methodConfig?.qrCodeUrl && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="mb-2 text-sm font-semibold text-gray-800">Scan QR</div>
                <img
                  src={method.methodConfig.qrCodeUrl}
                  alt="Revolut QR Code"
                  className="mx-auto h-48 w-48 rounded-lg border border-gray-200 bg-white"
                />
              </div>
            )}
          </div>
        )}

        {/* Bank transfer */}
        {method.providerName?.toLowerCase() === 'bank_transfer' && method.methodConfig && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-gray-900">Bank details</div>
              <CreditCard className="h-4 w-4 text-gray-500" />
            </div>

            {method.methodConfig.accountName && (
              <div className="flex items-center justify-between gap-3 border-t pt-3">
                <span className="text-sm text-gray-600">Account name</span>
                <span className="text-sm font-semibold text-gray-900">{method.methodConfig.accountName}</span>
              </div>
            )}

            {method.methodConfig.iban && (
              <div className="flex items-center justify-between gap-3 border-t pt-3">
                <span className="text-sm text-gray-600">IBAN</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-gray-900">{method.methodConfig.iban}</span>
                  <CopyButton value={method.methodConfig.iban} label="Copy" />
                </div>
              </div>
            )}

            {method.methodConfig.bic && (
              <div className="flex items-center justify-between gap-3 border-t pt-3">
                <span className="text-sm text-gray-600">BIC/SWIFT</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-gray-900">{method.methodConfig.bic}</span>
                  <CopyButton value={method.methodConfig.bic} label="Copy" />
                </div>
              </div>
            )}

            {(method.methodConfig.sortCode || method.methodConfig.accountNumber) && (
              <div className="grid grid-cols-1 gap-3 border-t pt-3 sm:grid-cols-2">
                {method.methodConfig.sortCode && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                    <span className="text-sm text-gray-600">Sort code</span>
                    <span className="font-mono text-sm font-semibold text-gray-900">{method.methodConfig.sortCode}</span>
                  </div>
                )}
                {method.methodConfig.accountNumber && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                    <span className="text-sm text-gray-600">Account #</span>
                    <span className="font-mono text-sm font-semibold text-gray-900">{method.methodConfig.accountNumber}</span>
                  </div>
                )}
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

        {/* Compact next steps (less “lecture”, more join-flow style) */}
        {/* <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
          <div className="text-sm font-bold text-gray-900">Checklist</div>
          <ul className="mt-2 space-y-2 text-sm text-gray-700">
            <li>1) Copy the reference</li>
            <li>2) Complete payment</li>
            <li>3) Include reference in the payment note</li>
            <li>4) Tap “I’ve paid” below</li>
          </ul>
        </div> */}
      </div>

      {/* Footer actions (join-flow style) */}
      <div className="border-t bg-white p-4 sm:p-6 space-y-3">
        <button
          onClick={onConfirmPaid}
          disabled={!hasEverCopied}
          className={`w-full rounded-xl px-6 py-3.5 font-bold transition-all ${
            hasEverCopied
              ? 'bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            {!hasEverCopied && <Lock className="h-4 w-4" />}
            <span>{hasEverCopied ? "I've completed payment" : 'Copy reference to continue'}</span>
          </div>
        </button>

        <button
          onClick={onBack}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
        >
          <ChevronLeft className="h-4 w-4" />
          Change payment method
        </button>
      </div>
    </div>
  );
};
