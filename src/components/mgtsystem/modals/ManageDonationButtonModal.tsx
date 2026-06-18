// src/components/mgtsystem/modals/ManageDonationButtonModal.tsx

import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Gift,
  AlertCircle,
  Copy,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

import DonationButtonService from '../services/DonationButtonService';

import type {
  ClubDonationButtonWithPaymentMethod,
  EligibleDonationPaymentMethod,
} from '../../../shared/types/donationButton';

interface ManageDonationButtonModalProps {
  clubId: string;
  onClose: () => void;
  onOpenPaymentMethods: () => void;
}

function formatProviderName(providerName?: string | null) {
  if (!providerName) return '';
  return providerName.replace(/_/g, ' ');
}

export default function ManageDonationButtonModal({
  clubId,
  onClose,
  onOpenPaymentMethods,
}: ManageDonationButtonModalProps) {
  const [donationButton, setDonationButton] =
    useState<ClubDonationButtonWithPaymentMethod | null>(null);
  const [eligibleMethods, setEligibleMethods] = useState<EligibleDonationPaymentMethod[]>([]);

  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state — separate from donationButton so edits don't mutate
  // the last-saved snapshot until Save succeeds.
  const [isEnabled, setIsEnabled] = useState(false);
  const [buttonLabel, setButtonLabel] = useState('Donate now');
  const [buttonTitle, setButtonTitle] = useState('');
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');

  // Embed state
  const [embedHtml, setEmbedHtml] = useState<string | null>(null);
  const [embedError, setEmbedError] = useState<string | null>(null);
  const [loadingEmbed, setLoadingEmbed] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    try {
      setLoadingList(true);
      setError(null);
      const res = await DonationButtonService.getForManagement(clubId);
      setDonationButton(res.donationButton);
      setEligibleMethods(res.eligiblePaymentMethods || []);

      if (res.donationButton) {
        setIsEnabled(res.donationButton.isEnabled);
        setButtonLabel(res.donationButton.buttonLabel || 'Donate now');
        setButtonTitle(res.donationButton.buttonTitle || '');
        setSelectedMethodId(res.donationButton.clubPaymentMethodId);
      } else {
        setIsEnabled(false);
        setButtonLabel('Donate now');
        setButtonTitle('');
        setSelectedMethodId('');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load donation button settings');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  // Reset embed whenever the saved config changes, so a stale embed
  // never lingers after the underlying settings have moved on.
  useEffect(() => {
    setEmbedHtml(null);
    setEmbedError(null);
    setCopied(false);
  }, [donationButton]);

  const selectedMethodIsStale = useMemo(() => {
    if (!selectedMethodId) return false;
    return !eligibleMethods.some((m) => m.id === selectedMethodId && m.isEnabled);
  }, [selectedMethodId, eligibleMethods]);

  const savedMethodIsDisabled =
    !!donationButton?.paymentMethod && donationButton.paymentMethod.isEnabled === false;

  const hasAnyEligibleEnabledMethod = useMemo(
    () => eligibleMethods.some((m) => m.isEnabled),
    [eligibleMethods]
  );

  const handleSave = async () => {
    if (!selectedMethodId) {
      setError('Please select a payment method to power the donation button.');
      return;
    }
    if (!buttonLabel.trim()) {
      setError('Button label is required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const res = await DonationButtonService.save(clubId, {
        isEnabled,
        buttonLabel: buttonLabel.trim(),
        buttonTitle: buttonTitle.trim() || undefined,
        clubPaymentMethodId: selectedMethodId,
      });
      setDonationButton(res.donationButton);
      setEligibleMethods(res.eligiblePaymentMethods || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to save donation button');
    } finally {
      setSaving(false);
    }
  };

  const handleGetEmbed = async () => {
    try {
      setLoadingEmbed(true);
      setEmbedError(null);
      setCopied(false);
      const res = await DonationButtonService.getEmbed(clubId);
      setEmbedHtml(res.embedHtml);
    } catch (err: any) {
      setEmbedHtml(null);
      setEmbedError(
        err?.message ||
          'Could not generate the embed code. Make sure the donation button is enabled and the selected payment method is active.'
      );
    } finally {
      setLoadingEmbed(false);
    }
  };

  const handleCopy = async () => {
    if (!embedHtml) return;
    try {
      await navigator.clipboard.writeText(embedHtml);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setError('Could not copy to clipboard. Select the text and copy manually.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(16,37,50,0.55)', backdropFilter: 'blur(2px)' }}
    >
      <div
        className="flex flex-col w-full max-w-2xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden"
        style={{ background: '#ffffff' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '3px solid #157f85', background: '#ffffff' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0"
              style={{ background: 'rgba(21,127,133,0.12)', color: '#157f85' }}
            >
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#102532' }}>
                Website Donation Button
              </h2>
              <p className="text-xs mt-0.5" style={{ color: '#52636f' }}>
                Create a simple donation button for your club website.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-gray-100"
            style={{ color: '#8a9bab' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button type="button" onClick={() => setError(null)} className="text-red-600 hover:text-red-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ background: '#f6f1e8' }}>
          {loadingList ? (
            <div className="text-center py-12">
              <div
                className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-t-transparent"
                style={{ borderColor: '#157f85', borderTopColor: 'transparent' }}
              />
              <p className="mt-2 text-sm text-gray-600">Loading donation button settings...</p>
            </div>
          ) : !hasAnyEligibleEnabledMethod && eligibleMethods.length === 0 ? (
            // Empty state — no eligible methods exist at all yet
            <div
              className="rounded-xl p-6 text-center"
              style={{ background: '#ffffff', border: '1px dashed #dce1df' }}
            >
              <Gift className="mx-auto mb-3 h-8 w-8" style={{ color: '#b8c6b0' }} />
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                No link-based payment methods are available yet
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Add a manual payment method with a payment link, such as SumUp, Revolut, Monzo or
                ZippyPay, then return here to create your donation button.
              </p>
              <button
                type="button"
                onClick={onOpenPaymentMethods}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
                style={{ background: '#157f85' }}
              >
                Go to Payment Methods
              </button>
            </div>
          ) : (
            <>
              {/* Stale-selection banner — saved method now disabled */}
              {savedMethodIsDisabled && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-900">
                      Your selected payment method is disabled
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      The donation button is inactive until you re-enable{' '}
                      <strong>{donationButton?.paymentMethod?.methodLabel}</strong> in Payment
                      Methods, or choose a different eligible method below.
                    </p>
                    <button
                      type="button"
                      onClick={onOpenPaymentMethods}
                      className="text-xs font-semibold text-amber-800 underline mt-2 inline-block"
                    >
                      Go to Payment Methods
                    </button>
                  </div>
                </div>
              )}

              {/* Enable toggle */}
              <section
                className="rounded-xl p-4 flex items-center justify-between gap-4"
                style={{ background: '#ffffff', border: '1px solid #dce1df' }}
              >
                <div>
                  <p className="font-semibold text-gray-900">Enable donation button</p>
                  <p className="text-xs text-gray-600 mt-1">
                    When enabled, you can copy an embed snippet to paste into your website.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEnabled((p) => !p)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                    isEnabled ? 'bg-[#157f85]' : 'bg-[#c8d0cd]'
                  }`}
                  aria-label={isEnabled ? 'Disable donation button' : 'Enable donation button'}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </section>

              {/* Button text */}
              <section
                className="rounded-xl p-4 space-y-4"
                style={{ background: '#ffffff', border: '1px solid #dce1df' }}
              >
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2">
                    Button label *
                  </label>
                  <input
                    type="text"
                    value={buttonLabel}
                    onChange={(e) => setButtonLabel(e.target.value)}
                    maxLength={80}
                    placeholder="Donate now"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">{buttonLabel.length}/80</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2">
                    Optional heading <span className="text-gray-400">(shown above the button on this page only — not part of the embed)</span>
                  </label>
                  <input
                    type="text"
                    value={buttonTitle}
                    onChange={(e) => setButtonTitle(e.target.value)}
                    maxLength={160}
                    placeholder="Support our club"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">{buttonTitle.length}/160</p>
                </div>
              </section>

              {/* Payment method picker */}
              <section
                className="rounded-xl p-4 space-y-3"
                style={{ background: '#ffffff', border: '1px solid #dce1df' }}
              >
                <label className="block text-sm font-semibold text-gray-600">
                  Payment method *
                </label>

                <select
                  value={selectedMethodId}
                  onChange={(e) => setSelectedMethodId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select a payment method...</option>
                  {eligibleMethods.map((m) => (
                    <option key={m.id} value={m.id} disabled={!m.isEnabled}>
                      {m.methodLabel} ({formatProviderName(m.providerName)})
                      {!m.isEnabled ? ' — disabled' : ''}
                    </option>
                  ))}
                </select>

                {selectedMethodIsStale && (
                  <p className="text-xs text-amber-700">
                    This method is disabled and can't be used until it's re-enabled in Payment
                    Methods.
                  </p>
                )}

                <p className="text-xs text-gray-500">
                  Only manual payment methods with a payment link (SumUp, Revolut, Monzo,
                  ZippyPay) can power this button. Cash, card tap, bank transfer, Stripe and
                  crypto methods are not eligible.
                </p>
              </section>

              {/* Warning */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  External payment links are not auto-confirmed by FundRaisely. Use this button
                  for simple donations only — not for tickets, paid entries or anything that
                  needs automatic confirmation.
                </p>
              </div>

              {/* Save */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2 bg-[#157f85] text-white rounded-lg font-semibold hover:bg-[#0e6268] transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save donation button'}
                </button>
              </div>

              {/* Embed code */}
              {donationButton && (
                <section
                  className="rounded-xl p-4 space-y-3"
                  style={{ background: '#ffffff', border: '1px solid #dce1df' }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">Embed code</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Copy this and paste it into your website's HTML.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleGetEmbed}
                      disabled={loadingEmbed}
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-100 disabled:opacity-50 flex-shrink-0"
                    >
                      {loadingEmbed ? 'Generating...' : embedHtml ? 'Refresh' : 'Generate embed code'}
                    </button>
                  </div>

                  {embedError && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-700 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800">{embedError}</p>
                    </div>
                  )}

                  {embedHtml && (
                    <>
                      <textarea
                        readOnly
                        value={embedHtml}
                        rows={3}
                        onFocus={(e) => e.currentTarget.select()}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-xs font-mono resize-none"
                      />
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#157f85] text-white text-sm font-semibold rounded-lg hover:bg-[#0e6268] transition-colors"
                      >
                        {copied ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy embed code
                          </>
                        )}
                      </button>

                      {/* Live preview — rendered as a real React element from
                          typed fields, not from the raw embedHtml string, so
                          there's no HTML injection surface here at all. */}
                      {donationButton?.paymentMethod?.link && (
                        <div className="pt-2 border-t border-gray-100">
                          <p className="text-xs text-gray-500 mb-2">Preview:</p>
                          <a
                            href={donationButton.paymentMethod.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-block',
                              padding: '12px 18px',
                              borderRadius: '8px',
                              background: '#157f85',
                              color: '#ffffff',
                              textDecoration: 'none',
                              fontWeight: 700,
                              fontFamily: 'Arial, sans-serif',
                            }}
                          >
                            {donationButton.buttonLabel}
                          </a>
                        </div>
                      )}
                    </>
                  )}
                </section>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end px-6 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid #dce1df', background: '#fbf8f2' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-5 py-2 text-sm font-semibold transition hover:bg-gray-50"
            style={{ borderColor: '#dce1df', color: '#52636f' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}