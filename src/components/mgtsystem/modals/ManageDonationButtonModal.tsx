// src/components/mgtsystem/modals/ManageDonationButtonModal.tsx
//
// UPDATED:
//   - Keeps existing Manual link behaviour.
//   - Trackable donation buttons now generate a modal-launch embed snippet:
//       <button data-fundraisely-donate ...>Donate now</button>
//       <script src="/embed/donate.js" async></script>
//   - This means clubs paste a simple button into their website.
//   - When clicked, the FundRaisely donation iframe opens in a modal on their page.
//   - Existing save/load/payment-method logic is preserved.

import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Gift,
  AlertCircle,
  Copy,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Link2,
  Plus,
  Trash2,
  ExternalLink,
} from 'lucide-react';

import DonationButtonService from '../services/DonationButtonService';

import type {
  ClubDonationButtonWithPaymentMethod,
  EligibleDonationPaymentMethod,
} from '../../../shared/types/donationButton';
import type { EligibleTrackableMethod } from '../../../shared/types/donationCheckout';

interface ManageDonationButtonModalProps {
  clubId: string;
  onClose: () => void;
  onOpenPaymentMethods: () => void;
}

function formatProviderName(providerName?: string | null) {
  if (!providerName) return '';
  return providerName.replace(/_/g, ' ');
}

const MAX_PRESETS = 4;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getPublicBaseUrl(): string {
  return window.location.origin;
}

function buildTrackableModalEmbed({
  clubId,
  buttonLabel,
  buttonTitle,
}: {
  clubId: string;
  buttonLabel: string;
  buttonTitle?: string;
}) {
  const baseUrl = getPublicBaseUrl();
  const safeClubId = escapeHtml(clubId);
  const safeLabel = escapeHtml(buttonLabel || 'Donate now');
  const safeTitle = escapeHtml(buttonTitle || 'Donate');

  return `<button
  type="button"
  data-fundraisely-donate
  data-club-id="${safeClubId}"
  data-title="${safeTitle}"
  style="background:#157f85;color:#ffffff;border:none;border-radius:10px;padding:12px 18px;font-weight:700;cursor:pointer;"
>
  ${safeLabel}
</button>
<script src="${baseUrl}/embed/donate.js" async></script>`;
}

export default function ManageDonationButtonModal({
  clubId,
  onClose,
  onOpenPaymentMethods,
}: ManageDonationButtonModalProps) {
  const [donationButton, setDonationButton] =
    useState<ClubDonationButtonWithPaymentMethod | null>(null);
  const [eligibleManualMethods, setEligibleManualMethods] = useState<EligibleDonationPaymentMethod[]>([]);
  const [eligibleTrackableMethods, setEligibleTrackableMethods] = useState<EligibleTrackableMethod[]>([]);

  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isEnabled, setIsEnabled] = useState(false);
  const [buttonLabel, setButtonLabel] = useState('Donate now');
  const [buttonTitle, setButtonTitle] = useState('');

  // Mutually exclusive — only one of these two is ever non-empty.
  const [selectedManualMethodId, setSelectedManualMethodId] = useState<string>('');
  const [selectedTrackableMethodId, setSelectedTrackableMethodId] = useState<string>('');

  // Amount-tier config — only relevant when a trackable method is selected.
  const [allowCustomAmount, setAllowCustomAmount] = useState(true);
  const [presetAmounts, setPresetAmounts] = useState<number[]>([]);
  const [newPresetValue, setNewPresetValue] = useState('');

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
      setEligibleManualMethods(res.eligibleManualMethods || []);
      setEligibleTrackableMethods(res.eligibleTrackableMethods || []);
      setAllowCustomAmount(res.amountConfig?.allowCustomAmount ?? true);
      setPresetAmounts(res.amountConfig?.presetAmounts ?? []);

      if (res.donationButton) {
        setIsEnabled(res.donationButton.isEnabled);
        setButtonLabel(res.donationButton.buttonLabel || 'Donate now');
        setButtonTitle(res.donationButton.buttonTitle || '');

        const savedId = res.donationButton.clubPaymentMethodId;
        const isTrackable = (res.eligibleTrackableMethods || []).some(
          (m) => m.clubPaymentMethodId === savedId
        );

        if (isTrackable) {
          setSelectedTrackableMethodId(savedId);
          setSelectedManualMethodId('');
        } else {
          setSelectedManualMethodId(savedId);
          setSelectedTrackableMethodId('');
        }
      } else {
        setIsEnabled(false);
        setButtonLabel('Donate now');
        setButtonTitle('');
        setSelectedManualMethodId('');
        setSelectedTrackableMethodId('');
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

  useEffect(() => {
    setEmbedHtml(null);
    setEmbedError(null);
    setCopied(false);
  }, [donationButton]);

  useEffect(() => {
    setEmbedHtml(null);
    setEmbedError(null);
    setCopied(false);
  }, [selectedManualMethodId, selectedTrackableMethodId, buttonLabel, buttonTitle]);

  const handleSelectManual = (id: string) => {
    setSelectedManualMethodId(id);
    setSelectedTrackableMethodId('');
  };

  const handleSelectTrackable = (id: string) => {
    setSelectedTrackableMethodId(id);
    setSelectedManualMethodId('');
  };

  const selectedManualIsStale = useMemo(() => {
    if (!selectedManualMethodId) return false;
    return !eligibleManualMethods.some((m) => m.id === selectedManualMethodId && m.isEnabled);
  }, [selectedManualMethodId, eligibleManualMethods]);

  const selectedTrackableIsStale = useMemo(() => {
    if (!selectedTrackableMethodId) return false;
    return !eligibleTrackableMethods.some(
      (m) => m.clubPaymentMethodId === selectedTrackableMethodId && m.isEnabled
    );
  }, [selectedTrackableMethodId, eligibleTrackableMethods]);

  const handleAddPreset = () => {
    const value = Number(newPresetValue);
    if (!Number.isFinite(value) || value <= 0) return;
    if (presetAmounts.length >= MAX_PRESETS) return;
    if (presetAmounts.includes(value)) return;
    setPresetAmounts([...presetAmounts, value].sort((a, b) => a - b));
    setNewPresetValue('');
  };

  const handleRemovePreset = (value: number) => {
    setPresetAmounts(presetAmounts.filter((p) => p !== value));
  };

  const handleSave = async () => {
    const selectedMethodId = selectedTrackableMethodId || selectedManualMethodId;

    if (!selectedMethodId) {
      setError('Please select a payment method to power the donation button.');
      return;
    }

    if (!buttonLabel.trim()) {
      setError('Button label is required.');
      return;
    }

    if (selectedTrackableMethodId && !allowCustomAmount && presetAmounts.length === 0) {
      setError('Add at least one preset amount, or allow custom amounts.');
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
        ...(selectedTrackableMethodId
          ? { allowCustomAmount, presetAmounts }
          : {}),
      });

      setDonationButton(res.donationButton);
      setEligibleManualMethods(res.eligibleManualMethods || []);
      setEligibleTrackableMethods(res.eligibleTrackableMethods || []);
      setEmbedHtml(null);
      setEmbedError(null);
      setCopied(false);
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

      if (!donationButton) {
        setEmbedError('Save the donation button before generating the embed code.');
        return;
      }

      if (!isEnabled) {
        setEmbedError('Enable and save the donation button before generating the embed code.');
        return;
      }

      if (selectedTrackableMethodId) {
        setEmbedHtml(
          buildTrackableModalEmbed({
            clubId,
            buttonLabel: buttonLabel.trim() || 'Donate now',
            buttonTitle: buttonTitle.trim() || 'Donate',
          })
        );
        return;
      }

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

  const hasAnyEligibleMethod = eligibleManualMethods.length > 0 || eligibleTrackableMethods.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(16,37,50,0.55)', backdropFilter: 'blur(2px)' }}
    >
      <div
        className="flex flex-col w-full max-w-2xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden"
        style={{ background: '#ffffff' }}
      >
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
                Create a donation button for your club website.
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

        <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ background: '#f6f1e8' }}>
          {loadingList ? (
            <div className="text-center py-12">
              <div
                className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-t-transparent"
                style={{ borderColor: '#157f85', borderTopColor: 'transparent' }}
              />
              <p className="mt-2 text-sm text-gray-600">Loading donation button settings...</p>
            </div>
          ) : !hasAnyEligibleMethod ? (
            <div
              className="rounded-xl p-6 text-center"
              style={{ background: '#ffffff', border: '1px dashed #dce1df' }}
            >
              <Gift className="mx-auto mb-3 h-8 w-8" style={{ color: '#b8c6b0' }} />
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                No eligible payment methods yet
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Connect Stripe, add a crypto wallet, or add a manual payment link such as
                SumUp, Revolut, Monzo or ZippyPay, then return here to create your donation
                button.
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
                    Optional heading{' '}
                    <span className="text-gray-400">(used as the modal title for trackable buttons)</span>
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

              <section
                className="rounded-xl p-4 space-y-3"
                style={{ background: '#ffffff', border: '1px solid #dce1df' }}
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" style={{ color: '#157f85' }} />
                  <label className="block text-sm font-semibold text-gray-900">
                    Trackable card / crypto
                  </label>
                </div>

                <p className="text-xs text-gray-500">
                  Supporters see an amount picker in a FundRaisely modal and pay through a
                  checkout FundRaisely tracks. Donations appear in your reporting automatically.
                </p>

                {eligibleTrackableMethods.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">
                    No Stripe or crypto payment methods are connected yet.
                  </p>
                ) : (
                  <select
                    value={selectedTrackableMethodId}
                    onChange={(e) => handleSelectTrackable(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Not used for this button...</option>
                    {eligibleTrackableMethods.map((m) => (
                      <option key={m.clubPaymentMethodId} value={m.clubPaymentMethodId} disabled={!m.isEnabled}>
                        {m.methodLabel} ({formatProviderName(m.providerName)})
                        {!m.isEnabled ? ' — disabled' : ''}
                      </option>
                    ))}
                  </select>
                )}

                {selectedTrackableIsStale && (
                  <p className="text-xs text-amber-700">
                    This method is disabled and can't be used until it's re-enabled in Payment
                    Methods.
                  </p>
                )}

                {selectedTrackableMethodId && (
                  <div className="pt-3 border-t border-gray-100 space-y-3">
                    <p className="text-sm font-semibold text-gray-900">Donation amounts</p>

                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={allowCustomAmount}
                        onChange={(e) => setAllowCustomAmount(e.target.checked)}
                        className="rounded"
                      />
                      Let supporters enter their own amount
                    </label>

                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-2">
                        Preset amounts ({presetAmounts.length}/{MAX_PRESETS})
                      </p>

                      <div className="flex flex-wrap gap-2 mb-2">
                        {presetAmounts.map((amount) => (
                          <span
                            key={amount}
                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                            style={{ background: 'rgba(21,127,133,0.1)', color: '#157f85' }}
                          >
                            {amount}
                            <button
                              type="button"
                              onClick={() => handleRemovePreset(amount)}
                              aria-label={`Remove ${amount}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>

                      {presetAmounts.length < MAX_PRESETS && (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            step="0.01"
                            value={newPresetValue}
                            onChange={(e) => setNewPresetValue(e.target.value)}
                            placeholder="e.g. 10"
                            className="w-28 px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                          />
                          <button
                            type="button"
                            onClick={handleAddPreset}
                            className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-gray-50"
                            style={{ borderColor: '#dce1df', color: '#157f85' }}
                          >
                            <Plus className="h-3 w-3" /> Add
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>

              <section
                className="rounded-xl p-4 space-y-3"
                style={{ background: '#ffffff', border: '1px solid #dce1df' }}
              >
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" style={{ color: '#52636f' }} />
                  <label className="block text-sm font-semibold text-gray-900">
                    Manual link
                  </label>
                </div>

                <p className="text-xs text-gray-500">
                  Links straight to an external payment page such as SumUp, Revolut, Monzo or
                  ZippyPay. No amount picker and no automatic tracking.
                </p>

                {eligibleManualMethods.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">
                    No manual payment links are configured yet.
                  </p>
                ) : (
                  <select
                    value={selectedManualMethodId}
                    onChange={(e) => handleSelectManual(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Not used for this button...</option>
                    {eligibleManualMethods.map((m) => (
                      <option key={m.id} value={m.id} disabled={!m.isEnabled}>
                        {m.methodLabel} ({formatProviderName(m.providerName)})
                        {!m.isEnabled ? ' — disabled' : ''}
                      </option>
                    ))}
                  </select>
                )}

                {selectedManualIsStale && (
                  <p className="text-xs text-amber-700">
                    This method is disabled and can't be used until it's re-enabled in Payment
                    Methods.
                  </p>
                )}
              </section>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  Choose one method from either section above. A donation button uses exactly one
                  payment method at a time. Selecting a method in one section clears the other.
                </p>
              </div>

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

              {donationButton && (
                <section
                  className="rounded-xl p-4 space-y-3"
                  style={{ background: '#ffffff', border: '1px solid #dce1df' }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">Embed code</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Copy this and paste it into your website's HTML. Trackable buttons open
                        a FundRaisely donation modal on the page.
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
                        rows={selectedTrackableMethodId ? 9 : 3}
                        onFocus={(e) => e.currentTarget.select()}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-xs font-mono resize-none"
                      />

                      <div className="flex flex-wrap items-center gap-2">
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

                        {selectedTrackableMethodId && (
                          <button
                            type="button"
                            onClick={() => {
                              window.open(`/embed/donate/${clubId}`, '_blank', 'noopener,noreferrer');
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                            style={{ borderColor: '#157f85', color: '#157f85' }}
                          >
                            <ExternalLink className="h-4 w-4" />
                            Test donation page
                          </button>
                        )}
                      </div>

                      {selectedTrackableMethodId && (
                        <p className="text-xs text-gray-500">
                          The copied code creates a button on the club's website. When clicked,
                          it loads the FundRaisely donation form in a modal iframe.
                        </p>
                      )}
                    </>
                  )}
                </section>
              )}
            </>
          )}
        </div>

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