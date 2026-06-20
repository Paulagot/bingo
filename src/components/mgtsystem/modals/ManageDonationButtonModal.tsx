// src/components/mgtsystem/modals/ManageDonationButtonModal.tsx
//
// PHASE 3b — MULTI-METHOD:
//   - Trackable (Tier B) section is now a checkbox multi-select instead
//     of a single <select> — an admin can attach Stripe AND crypto (and
//     later sumup_api) to the same button; the supporter picks one at
//     checkout.
//   - Manual link (Tier A) stays single-select — mutual exclusivity with
//     Tier B is preserved (selecting any Tier B checkbox clears the Tier A
//     selection, and vice versa), enforced here in the UI AND re-checked
//     by the backend (which rejects a mixed submission outright — see
//     donationButtonRoutes.js's resolveTierAndAssertNotMixed).
//   - handleSave now sends clubPaymentMethodIds: string[] instead of a
//     single clubPaymentMethodId.
//   - After a save, the backend may report droppedMethodIds — methods
//     that were selected but turned out to be invalid by the time the
//     save landed (disabled, deleted, or no longer eligible). These are
//     surfaced as a dismissable warning rather than silently vanishing
//     from the selection.
//   - The blue info box's copy has been rewritten to describe the new
//     model — see the JSX near the bottom.
//   - "Test donation page" button relabeled per the handoff doc section
//     4.2 — it cannot exercise the postMessage relay chain (no
//     opener/parent relationship when opened this way), so it's now
//     explicitly described as preview-only rather than implying it
//     tests the full modal-closing flow.
//
// PHASE 3c — BRANDING (this fix):
//   - UpsertClubDonationButtonRequest now requires a `branding` field on
//     every save, regardless of tier — see donationButton.ts. Color
//     picker UI (ColorField, below) lets the admin choose all three
//     colors directly, with a live preview of the resulting widget.
//   - The Manual link section and its accompanying info box had been
//     accidentally left commented out in JSX, which is why
//     handleSelectManual / selectedManualIsStale / the Link2 import were
//     flagged as unused by TypeScript — restored here unchanged.

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
  Palette,
} from 'lucide-react';

import DonationButtonService from '../services/DonationButtonService';

import type {
  ClubDonationButtonWithPaymentMethod,
  EligibleDonationPaymentMethod,
} from '../../../shared/types/donationButton';
import type {
  EligibleTrackableMethod,
  DroppedMethod,
  DonationBrandingConfig,
} from '../../../shared/types/donationCheckout';

interface ManageDonationButtonModalProps {
  clubId: string;
  onClose: () => void;
  onOpenPaymentMethods: () => void;
}

function formatProviderName(providerName?: string | null) {
  if (!providerName) return '';
  return providerName.replace(/_/g, ' ');
}

function formatDroppedReason(reason: DroppedMethod['reason']): string {
  switch (reason) {
    case 'not_found':
      return 'no longer exists';
    case 'disabled':
      return 'was disabled';
    case 'not_eligible':
      return 'is no longer eligible';
    default:
      return 'could not be saved';
  }
}

const MAX_PRESETS = 4;

// Initial/fallback branding shown before the real saved values load (or
// if a button doesn't exist yet) — matches the migration's column
// defaults exactly. Once load() runs, the color state below is
// overwritten with res.branding from the backend; this constant is
// only ever the starting point, never silently re-sent over real saved
// values.
const DEFAULT_BRANDING: DonationBrandingConfig = {
  primaryColor: '#157f85',
  backgroundColor: '#ffffff',
  textOnPrimaryColor: '#ffffff',
};

// Loose validation for the hex TEXT input specifically — allows the
// user to type freely (including incomplete values mid-edit) without
// the input fighting them, but flags when what's currently typed isn't
// a valid #rrggbb so handleSave can block on it. The native
// <input type="color"> alongside it always produces a valid value on
// its own, since the browser's own color picker UI only ever returns
// well-formed hex.
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

function isValidHexColor(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value.trim());
}

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
  primaryColor,
  textOnPrimaryColor,
}: {
  clubId: string;
  buttonLabel: string;
  buttonTitle?: string;
  primaryColor: string;
  textOnPrimaryColor: string;
}) {
  const baseUrl = getPublicBaseUrl();
  const safeClubId = escapeHtml(clubId);
  const safeLabel = escapeHtml(buttonLabel || 'Donate now');
  const safeTitle = escapeHtml(buttonTitle || 'Donate');
  // escapeHtml applied even though these are validated hex strings
  // (isValidHexColor already constrains the modal's own state to
  // #rrggbb before save) — cheap defense-in-depth since this string is
  // inserted directly into a style attribute the admin copies verbatim
  // onto their own site.
  const safePrimary = escapeHtml(primaryColor);
  const safeTextOnPrimary = escapeHtml(textOnPrimaryColor);

  return `<button
  type="button"
  data-fundraisely-donate
  data-club-id="${safeClubId}"
  data-title="${safeTitle}"
  style="background:${safePrimary};color:${safeTextOnPrimary};border:none;border-radius:10px;padding:12px 18px;font-weight:700;cursor:pointer;"
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
  const [droppedMethods, setDroppedMethods] = useState<DroppedMethod[]>([]);

  const [isEnabled, setIsEnabled] = useState(false);
  const [buttonLabel, setButtonLabel] = useState('Donate now');
  const [buttonTitle, setButtonTitle] = useState('');

  // Mutually exclusive — selectedManualMethodId is only ever non-empty
  // when selectedTrackableMethodIds is empty, and vice versa.
  const [selectedManualMethodId, setSelectedManualMethodId] = useState<string>('');
  const [selectedTrackableMethodIds, setSelectedTrackableMethodIds] = useState<string[]>([]);

  // Amount-tier config — only relevant when at least one trackable
  // method is selected.
  const [allowCustomAmount, setAllowCustomAmount] = useState(true);
  const [presetAmounts, setPresetAmounts] = useState<number[]>([]);
  const [newPresetValue, setNewPresetValue] = useState('');

  // Branding — applies regardless of tier (Tier A's static button and
  // Tier B's full widget card both render with these three colors).
  // Initialized to DEFAULT_BRANDING and overwritten by load() with the
  // button's actual saved values once the GET /manage response arrives.
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_BRANDING.primaryColor);
  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_BRANDING.backgroundColor);
  const [textOnPrimaryColor, setTextOnPrimaryColor] = useState(DEFAULT_BRANDING.textOnPrimaryColor);

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
      setPrimaryColor(res.branding?.primaryColor ?? DEFAULT_BRANDING.primaryColor);
      setBackgroundColor(res.branding?.backgroundColor ?? DEFAULT_BRANDING.backgroundColor);
      setTextOnPrimaryColor(res.branding?.textOnPrimaryColor ?? DEFAULT_BRANDING.textOnPrimaryColor);

      // linkedTrackableMethodIds is the authoritative "what's actually
      // checked" list from the backend — using it directly (rather than
      // re-deriving from donationButton.clubPaymentMethodIds) avoids
      // having to figure out client-side whether a button is Tier A or
      // Tier B before deciding what the checkboxes should show.
      const linkedTrackableIds = res.linkedTrackableMethodIds || [];

      if (res.donationButton && linkedTrackableIds.length > 0) {
        setSelectedTrackableMethodIds(linkedTrackableIds);
        setSelectedManualMethodId('');
      } else if (res.donationButton) {
        // Not Tier B (or Tier B but nothing currently eligible) — fall
        // back to treating the button's own id(s) as the Tier A
        // selection. A Tier A button always has exactly one id.
        const savedId = res.donationButton.clubPaymentMethodIds?.[0] ?? '';
        setSelectedManualMethodId(savedId);
        setSelectedTrackableMethodIds([]);
      } else {
        setIsEnabled(false);
        setButtonLabel('Donate now');
        setButtonTitle('');
        setSelectedManualMethodId('');
        setSelectedTrackableMethodIds([]);
      }

      if (res.donationButton) {
        setIsEnabled(res.donationButton.isEnabled);
        setButtonLabel(res.donationButton.buttonLabel || 'Donate now');
        setButtonTitle(res.donationButton.buttonTitle || '');
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
  }, [selectedManualMethodId, selectedTrackableMethodIds, buttonLabel, buttonTitle, primaryColor, textOnPrimaryColor]);

  const handleSelectManual = (id: string) => {
    setSelectedManualMethodId(id);
    setSelectedTrackableMethodIds([]);
  };

  const handleToggleTrackable = (id: string) => {
    setSelectedTrackableMethodIds((prev) =>
      prev.includes(id) ? prev.filter((existing) => existing !== id) : [...prev, id]
    );
    setSelectedManualMethodId('');
  };

  const selectedManualIsStale = useMemo(() => {
    if (!selectedManualMethodId) return false;
    return !eligibleManualMethods.some((m) => m.id === selectedManualMethodId && m.isEnabled);
  }, [selectedManualMethodId, eligibleManualMethods]);

  // Any selected trackable id that's no longer in the eligible list at
  // all (disabled, or deleted) — used to show the same kind of "this
  // is stale" hint the manual section already has, surfaced per-item
  // rather than as one blanket message.
  const staleTrackableIds = useMemo(() => {
    const eligibleIds = new Set(
      eligibleTrackableMethods.filter((m) => m.isEnabled).map((m) => m.clubPaymentMethodId)
    );
    return selectedTrackableMethodIds.filter((id) => !eligibleIds.has(id));
  }, [selectedTrackableMethodIds, eligibleTrackableMethods]);

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
    const isTrackableSelection = selectedTrackableMethodIds.length > 0;
    const selectedMethodIds = isTrackableSelection
      ? selectedTrackableMethodIds
      : selectedManualMethodId
      ? [selectedManualMethodId]
      : [];

    if (selectedMethodIds.length === 0) {
      setError('Please select at least one payment method to power the donation button.');
      return;
    }

    if (!buttonLabel.trim()) {
      setError('Button label is required.');
      return;
    }

    if (isTrackableSelection && !allowCustomAmount && presetAmounts.length === 0) {
      setError('Add at least one preset amount, or allow custom amounts.');
      return;
    }

    if (!isValidHexColor(primaryColor) || !isValidHexColor(backgroundColor) || !isValidHexColor(textOnPrimaryColor)) {
      setError('Each color must be a valid hex code (e.g. #157f85).');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setDroppedMethods([]);

      // branding is required on every save regardless of tier — see
      // UpsertClubDonationButtonRequest in donationButton.ts. Sends the
      // admin's actual chosen colors now, not a hardcoded placeholder.
      const res = await DonationButtonService.save(clubId, {
        isEnabled,
        buttonLabel: buttonLabel.trim(),
        buttonTitle: buttonTitle.trim() || undefined,
        clubPaymentMethodIds: selectedMethodIds,
        branding: {
          primaryColor: primaryColor.trim().toLowerCase(),
          backgroundColor: backgroundColor.trim().toLowerCase(),
          textOnPrimaryColor: textOnPrimaryColor.trim().toLowerCase(),
        },
        ...(isTrackableSelection ? { allowCustomAmount, presetAmounts } : {}),
      });

      setDonationButton(res.donationButton);
      setEligibleManualMethods(res.eligibleManualMethods || []);
      setEligibleTrackableMethods(res.eligibleTrackableMethods || []);
      if (res.branding) {
        setPrimaryColor(res.branding.primaryColor);
        setBackgroundColor(res.branding.backgroundColor);
        setTextOnPrimaryColor(res.branding.textOnPrimaryColor);
      }

      // After a Tier B save, re-sync the checkbox selection to exactly
      // what the backend actually kept — if anything was dropped, the
      // checkboxes shouldn't keep showing it as checked.
      if (isTrackableSelection) {
        setSelectedTrackableMethodIds(res.linkedTrackableMethodIds || []);
      }

      setDroppedMethods(res.droppedMethodIds || []);
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

      if (selectedTrackableMethodIds.length > 0) {
        setEmbedHtml(
          buildTrackableModalEmbed({
            clubId,
            buttonLabel: buttonLabel.trim() || 'Donate now',
            buttonTitle: buttonTitle.trim() || 'Donate',
            primaryColor,
            textOnPrimaryColor,
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
  const isTrackableSelectionActive = selectedTrackableMethodIds.length > 0;

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

        {droppedMethods.length > 0 && (
          <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">
                {droppedMethods.length === 1
                  ? 'One payment method was not saved'
                  : `${droppedMethods.length} payment methods were not saved`}
              </p>
              <ul className="text-sm text-amber-800 mt-1 list-disc list-inside">
                {droppedMethods.map((d) => {
                  const matched = eligibleTrackableMethods.find(
                    (m) => m.clubPaymentMethodId === d.clubPaymentMethodId
                  );
                  const label = matched?.methodLabel || `Method #${d.clubPaymentMethodId}`;
                  return (
                    <li key={d.clubPaymentMethodId}>
                      {label} — {formatDroppedReason(d.reason)}
                    </li>
                  );
                })}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setDroppedMethods([])}
              className="text-amber-700 hover:text-amber-800"
            >
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
                className="rounded-xl p-4 space-y-4"
                style={{ background: '#ffffff', border: '1px solid #dce1df' }}
              >
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4" style={{ color: '#157f85' }} />
                  <label className="block text-sm font-semibold text-gray-900">
                    Branding
                  </label>
                </div>

                <p className="text-xs text-gray-500">
                  Choose colors to match your club's brand. These apply to the donation widget
                  shown to supporters — both the trackable amount-picker card and the manual-link
                  button use these colors.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <ColorField
                    label="Primary"
                    hint="Button background, highlights"
                    value={primaryColor}
                    onChange={setPrimaryColor}
                  />
                  <ColorField
                    label="Background"
                    hint="Widget card background"
                    value={backgroundColor}
                    onChange={setBackgroundColor}
                  />
                  <ColorField
                    label="Text on primary"
                    hint="Text/icons on the primary color"
                    value={textOnPrimaryColor}
                    onChange={setTextOnPrimaryColor}
                  />
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Live preview</p>
                  <div
                    className="rounded-xl p-4 max-w-xs"
                    style={{
                      background: isValidHexColor(backgroundColor) ? backgroundColor : '#ffffff',
                      border: '1px solid #dce1df',
                    }}
                  >
                    <p className="text-xs font-semibold mb-3" style={{ color: '#102532' }}>
                      {buttonTitle.trim() || 'Make a donation'}
                    </p>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {[10, 25].map((amount, i) => (
                        <div
                          key={amount}
                          className="rounded-lg px-3 py-2 text-xs font-semibold text-center"
                          style={
                            i === 0
                              ? {
                                  background: isValidHexColor(primaryColor) ? primaryColor : '#157f85',
                                  color: isValidHexColor(textOnPrimaryColor) ? textOnPrimaryColor : '#ffffff',
                                }
                              : { background: '#f6f1e8', color: '#102532' }
                          }
                        >
                          ${amount}
                        </div>
                      ))}
                    </div>
                    <div
                      className="rounded-lg px-3 py-2 text-xs font-semibold text-center"
                      style={{
                        background: isValidHexColor(primaryColor) ? primaryColor : '#157f85',
                        color: isValidHexColor(textOnPrimaryColor) ? textOnPrimaryColor : '#ffffff',
                      }}
                    >
                      {buttonLabel.trim() || 'Donate now'}
                    </div>
                  </div>
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
                  Supporters see an amount picker in a FundRaisely modal, then choose which of
                  these methods to pay with. Donations appear in your reporting automatically.
                  You can select more than one.
                </p>

                {eligibleTrackableMethods.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">
                    No Stripe or crypto payment methods are connected yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {eligibleTrackableMethods.map((m) => {
                      const checked = selectedTrackableMethodIds.includes(m.clubPaymentMethodId);
                      return (
                        <label
                          key={m.clubPaymentMethodId}
                          className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                            !m.isEnabled ? 'opacity-60' : ''
                          }`}
                          style={{
                            borderColor: checked ? '#157f85' : '#dce1df',
                            background: checked ? 'rgba(21,127,133,0.06)' : '#ffffff',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!m.isEnabled}
                            onChange={() => handleToggleTrackable(m.clubPaymentMethodId)}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-900">
                            {m.methodLabel} ({formatProviderName(m.providerName)})
                            {!m.isEnabled ? ' — disabled' : ''}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {staleTrackableIds.length > 0 && (
                  <p className="text-xs text-amber-700">
                    {staleTrackableIds.length === 1
                      ? 'One previously selected method is disabled and will be dropped on save.'
                      : `${staleTrackableIds.length} previously selected methods are disabled and will be dropped on save.`}{' '}
                    Re-enable them in Payment Methods if you want to keep them attached.
                  </p>
                )}

                {isTrackableSelectionActive && (
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
                  ZippyPay. No amount picker and no automatic tracking. Only one manual link can
                  be used per button.
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
                  Choose either one or more trackable methods above, OR a single manual link — not
                  both. Selecting a trackable method clears the manual link, and selecting a
                  manual link clears any trackable selections. With multiple trackable methods,
                  supporters choose which to pay with at checkout.
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
                        rows={isTrackableSelectionActive ? 9 : 3}
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

                        {isTrackableSelectionActive && (
                          <button
                            type="button"
                            onClick={() => {
                              window.open(`/embed/donate/${clubId}`, '_blank', 'noopener,noreferrer');
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                            style={{ borderColor: '#157f85', color: '#157f85' }}
                          >
                            <ExternalLink className="h-4 w-4" />
                            Preview only (doesn't test modal close)
                          </button>
                        )}
                      </div>

                      {isTrackableSelectionActive && (
                        <p className="text-xs text-gray-500">
                          The copied code creates a button on the club's website. When clicked,
                          it loads the FundRaisely donation form in a modal iframe. The preview
                          link above opens the form directly with no opener — it's useful for
                          checking how the amount picker looks, but it can't show whether the
                          modal closes itself after a successful donation. Use the embed code on
                          a real test page for that.
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

/**
 * One color swatch + hex text input pair. The native color input
 * always produces a well-formed #rrggbb value on its own (the
 * browser's picker UI guarantees this), so its onChange always calls
 * onChange with something valid. The text input is looser — it allows
 * free typing (including transiently invalid/incomplete values while
 * the admin is mid-edit) and only feeds a value back up via onChange
 * once it's a complete, valid hex string; this avoids the input
 * fighting back against every keystroke while still never propagating
 * a malformed value to the parent's saved state.
 */
function ColorField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [textValue, setTextValue] = useState(value);

  // Keep the text field in sync if the parent value changes from
  // somewhere else (e.g. load() populating saved colors, or a save
  // response re-syncing state) — but not on every render, only when
  // the actual saved value changes.
  useEffect(() => {
    setTextValue(value);
  }, [value]);

  const handleTextChange = (next: string) => {
    setTextValue(next);
    if (isValidHexColor(next)) {
      onChange(next);
    }
  };

  const textIsInvalid = textValue.trim().length > 0 && !isValidHexColor(textValue);

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={isValidHexColor(value) ? value : '#000000'}
          onChange={(e) => {
            setTextValue(e.target.value);
            onChange(e.target.value);
          }}
          className="h-9 w-9 flex-shrink-0 rounded-lg border border-gray-200 cursor-pointer"
          aria-label={`${label} color picker`}
        />
        <input
          type="text"
          value={textValue}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="#157f85"
          maxLength={7}
          className="w-full px-2.5 py-1.5 border rounded-lg text-xs font-mono"
          style={{ borderColor: textIsInvalid ? '#dc2626' : '#dce1df' }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-1">{hint}</p>
      {textIsInvalid && (
        <p className="text-xs text-red-600 mt-1">Must be a hex code, e.g. #157f85</p>
      )}
    </div>
  );
}