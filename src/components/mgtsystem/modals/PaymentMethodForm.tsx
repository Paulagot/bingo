// src/components/mgtsystem/modals/PaymentMethodForm.tsx

import { useMemo, useState } from 'react';
import { Building2, User, QrCode, Info } from 'lucide-react';
import type { PaymentMethodCategory, InstantPaymentProvider } from '../../../shared/types/payment';
import type { ClubPaymentMethodWithMeta, PaymentMethodFormData } from '../../../shared/types/paymentMethods';

interface PaymentMethodFormProps {
  method?: ClubPaymentMethodWithMeta | null;
  onSave: (data: PaymentMethodFormData) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

const CATEGORIES: { value: PaymentMethodCategory; label: string }[] = [
  { value: 'instant_payment', label: 'Instant Payment' },
];

const PROVIDERS: { value: InstantPaymentProvider; label: string; category: PaymentMethodCategory }[] = [
  { value: 'revolut', label: 'Revolut', category: 'instant_payment' },
  { value: 'bank_transfer', label: 'Bank Transfer (Faster Payments / IBAN)', category: 'instant_payment' },
  { value: 'paypal', label: 'PayPal', category: 'instant_payment' },
  { value: 'monzo', label: 'Monzo', category: 'instant_payment' },
  { value: 'starling', label: 'Starling', category: 'instant_payment' },
  { value: 'wise', label: 'Wise', category: 'instant_payment' },
  { value: 'cashapp', label: 'Cash App', category: 'instant_payment' },
  { value: 'zippypay', label: 'ZippyPay', category: 'instant_payment' },
  { value: 'other', label: 'Other', category: 'instant_payment' },
];

type Config = Record<string, any>;
type LinkPreset = { linkLabel: string; linkPlaceholder: string };

const PROVIDER_PRESETS: Record<string, LinkPreset> = {
  revolut: { linkLabel: 'Revolut payment link', linkPlaceholder: 'https://revolut.me/yourhandle' },
  paypal: { linkLabel: 'PayPal link', linkPlaceholder: 'https://paypal.me/yourhandle' },
  monzo: { linkLabel: 'Monzo link', linkPlaceholder: 'https://monzo.me/yourhandle' },
  starling: { linkLabel: 'Starling payment link', linkPlaceholder: 'https://...' },
  wise: { linkLabel: 'Wise payment link', linkPlaceholder: 'https://...' },
  cashapp: { linkLabel: 'Cash App link', linkPlaceholder: 'https://cash.app/$yourcashtag' },
  zippypay: { linkLabel: 'ZippyPay link', linkPlaceholder: 'https://...' },
  other: { linkLabel: 'Payment link', linkPlaceholder: 'https://...' },
};

const DEFAULT_LINK_PRESET: LinkPreset = {
  linkLabel: 'Payment link',
  linkPlaceholder: 'https://...',
};

const getLinkPreset = (key: string): LinkPreset => PROVIDER_PRESETS[key] ?? DEFAULT_LINK_PRESET;

function isTruthyString(v: any): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function sanitizeConfigForProvider(providerKey: string, config: Config): Config {
  // Prevent stale fields from other providers being saved
  if (providerKey === 'revolut') {
    const next: Config = {};
    if (isTruthyString(config?.link)) next.link = String(config.link).trim();
    return next;
  }
  return { ...(config || {}) };
}

export default function PaymentMethodForm({ method, onSave, onCancel, loading }: PaymentMethodFormProps) {
  const isEdit = !!method;

  const [formData, setFormData] = useState<PaymentMethodFormData>({
    methodCategory: method?.methodCategory || 'instant_payment',
    providerName: method?.providerName || null,
    methodLabel: method?.methodLabel || '',
    playerInstructions: method?.playerInstructions || '',
    methodConfig: (method?.methodConfig as any) || {},
    isEnabled: method?.isEnabled ?? true,
    displayOrder: method?.displayOrder || 0,
    isOfficialClubAccount: method?.isOfficialClubAccount ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const availableProviders = useMemo(
    () => PROVIDERS.filter(p => p.category === formData.methodCategory),
    [formData.methodCategory]
  );

  const providerKey = String(formData.providerName || '');
  const config = (formData.methodConfig || {}) as Config;

  const isBankTransfer = providerKey === 'bank_transfer';
  const isZippyPay = providerKey === 'zippypay';
  const isRevolut = providerKey === 'revolut';

  // For most providers we support link/QR. Bank transfer uses bank fields.
  const supportsLinkQr = !!providerKey && !isBankTransfer;

  const shouldShowInstantFields =
    formData.methodCategory === 'instant_payment' && !!formData.providerName;

  const linkPreset = getLinkPreset(providerKey);

  const updateConfig = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      methodConfig: {
        ...(prev.methodConfig as any),
        [key]: value,
      },
    }));
  };

  const resetConfigForProvider = (nextProvider: string | null) => {
    setFormData(prev => ({
      ...prev,
      providerName: (nextProvider as any) || null,
      methodConfig: {},
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.methodLabel.trim()) {
      newErrors.methodLabel = 'Label is required';
    }

    if (formData.methodCategory === 'instant_payment') {
      if (!formData.providerName) {
        newErrors.providerName = 'Please select a provider';
      } else {
        if (isBankTransfer) {
          if (!isTruthyString(config?.iban) && !isTruthyString(config?.accountNumber)) {
            newErrors.config = 'IBAN or Account Number is required';
          }

          if (isTruthyString(config?.accountNumber) && !isTruthyString(config?.sortCode)) {
            newErrors.config = 'Sort Code is recommended when using an Account Number';
          }
        } else if (isRevolut) {
          // ✅ Revolut: link only (no QR)
          if (!isTruthyString(config?.link)) {
            newErrors.config = 'A Revolut payment link is required';
          }
        } else {
          // Other providers: link OR QR
          if (!isTruthyString(config?.link) && !isTruthyString(config?.qrCodeUrl)) {
            newErrors.config = 'At least a payment link or QR code URL is required';
          }
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const sanitized = sanitizeConfigForProvider(providerKey, config);

    try {
      await onSave({
        ...formData,
        methodConfig: sanitized,
      });
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  // ✅ FIXED: remove those `//` lines that were rendering as "///"
  const renderInstantCommonFields = () => {
    if (!shouldShowInstantFields) return null;
    return null;
  };

  const renderRevolutHelp = () => {
    if (!shouldShowInstantFields || !isRevolut) return null;

    return (
      <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3 flex items-start gap-2">
        <Info className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-indigo-900">
          <div className="font-semibold mb-1">How to get your Revolut payment link</div>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Open Revolut</li>
            <li>Go to <span className="font-medium">Payments</span> → <span className="font-medium">Request</span></li>
            <li>Select <span className="font-medium">Payment link</span> / <span className="font-medium">Share link</span></li>
            <li>Copy the link and paste it here</li>
          </ol>
          <p className="text-xs text-indigo-800 mt-2">
            Don’t set a fixed amount — players may add extras, so the amount can vary.
          </p>
        </div>
      </div>
    );
  };

 const renderLinkQrFields = () => {
  if (!shouldShowInstantFields) return null;

  // ✅ Bank transfer should NOT show payment link / QR fields
  if (isBankTransfer) return null;

  // For all other non-bank providers:
  if (!supportsLinkQr) return null;

  return (
    <>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {linkPreset.linkLabel}
        </label>
        <input
          type="url"
          value={config?.link || ''}
          onChange={(e) => updateConfig('link', e.target.value)}
          placeholder={linkPreset.linkPlaceholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        {isRevolut && (
          <p className="text-xs text-gray-500 mt-1">
            Paste your Revolut payment link (e.g. revolut.me). We don’t use QR for Revolut to keep it simple.
          </p>
        )}
      </div>

      {/* ✅ QR stays available for other providers, but not Revolut */}
      {!isRevolut && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            QR Code URL (Optional)
          </label>
          <input
            type="url"
            value={config?.qrCodeUrl || ''}
            onChange={(e) => updateConfig('qrCodeUrl', e.target.value)}
            placeholder="https://example.com/qr-code.png"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      )}
    </>
  );
};

  const renderBankTransferFields = () => {
    if (!shouldShowInstantFields || !isBankTransfer) return null;

    return (
      <>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Account Name
          </label>
          <input
            type="text"
            value={config?.accountName || ''}
            onChange={(e) => updateConfig('accountName', e.target.value)}
            placeholder="Example Sports Club"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Bank Name (Optional)
          </label>
          <input
            type="text"
            value={config?.bankName || ''}
            onChange={(e) => updateConfig('bankName', e.target.value)}
            placeholder="e.g., AIB / Bank of Ireland / Lloyds"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              IBAN (IE/EU)
            </label>
            <input
              type="text"
              value={config?.iban || ''}
              onChange={(e) => updateConfig('iban', e.target.value)}
              placeholder="IE29AIBK93115212345678"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              BIC/SWIFT (IE/EU)
            </label>
            <input
              type="text"
              value={config?.bic || ''}
              onChange={(e) => updateConfig('bic', e.target.value)}
              placeholder="AIBKIE2D"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Account Number (UK)
            </label>
            <input
              type="text"
              value={config?.accountNumber || ''}
              onChange={(e) => updateConfig('accountNumber', e.target.value)}
              placeholder="12345678"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Sort Code (UK)
            </label>
            <input
              type="text"
              value={config?.sortCode || ''}
              onChange={(e) => updateConfig('sortCode', e.target.value)}
              placeholder="93-11-52"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
      </>
    );
  };

  const renderZippyPayFields = () => {
    if (!shouldShowInstantFields || !isZippyPay) return null;

    return (
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Merchant ID (Optional)
        </label>
        <input
          type="text"
          value={config?.merchantId || ''}
          onChange={(e) => updateConfig('merchantId', e.target.value)}
          placeholder="Your merchant identifier"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>
    );
  };

  const renderInstantConfigFields = () => {
    if (formData.methodCategory !== 'instant_payment') return null;
    if (!formData.providerName) return null;

    return (
      <div className="space-y-4">
        {renderLinkQrFields()}
        {renderBankTransferFields()}
        {renderZippyPayFields()}
        {renderInstantCommonFields()}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Category */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
        <select
          value={formData.methodCategory}
          onChange={(e) =>
            setFormData(prev => ({
              ...prev,
              methodCategory: e.target.value as PaymentMethodCategory,
              providerName: null,
              methodConfig: {},
            }))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          {CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Provider */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Provider</label>
        <select
          value={(formData.providerName as any) || ''}
          onChange={(e) => resetConfigForProvider(e.target.value || null)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
            errors.providerName ? 'border-red-300' : 'border-gray-300'
          }`}
        >
          <option value="">Select a provider...</option>
          {availableProviders.map(prov => (
            <option key={prov.value} value={prov.value}>
              {prov.label}
            </option>
          ))}
        </select>

        {errors.providerName && <p className="text-xs text-red-600 mt-1">{errors.providerName}</p>}

        {/* ✅ Revolut help under dropdown */}
        {renderRevolutHelp()}
      </div>

      {/* Label */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Display Label *</label>
        <input
          type="text"
          value={formData.methodLabel}
          onChange={(e) => setFormData(prev => ({ ...prev, methodLabel: e.target.value }))}
          placeholder="e.g., Revolut - Main Account"
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
            errors.methodLabel ? 'border-red-300' : 'border-gray-300'
          }`}
        />
        {errors.methodLabel && <p className="text-xs text-red-600 mt-1">{errors.methodLabel}</p>}
      </div>

      {/* Config Fields */}
      {renderInstantConfigFields()}
      {errors.config && <p className="text-xs text-red-600">{errors.config}</p>}

      {/* Player Instructions */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Instructions for Players</label>
        <textarea
          value={formData.playerInstructions}
          onChange={(e) => setFormData(prev => ({ ...prev, playerInstructions: e.target.value }))}
          rows={4}
          placeholder="Enter instructions that players will see during payment..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Account Type */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <button
          type="button"
          onClick={() => setFormData(prev => ({ ...prev, isOfficialClubAccount: true }))}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
            formData.isOfficialClubAccount
              ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
              : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
          }`}
        >
          <Building2 className="h-5 w-5" />
          <span className="font-semibold">Official Club Account</span>
        </button>

        <button
          type="button"
          onClick={() => setFormData(prev => ({ ...prev, isOfficialClubAccount: false }))}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
            !formData.isOfficialClubAccount
              ? 'border-orange-600 bg-orange-50 text-orange-700'
              : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
          }`}
        >
          <User className="h-5 w-5" />
          <span className="font-semibold">Member Personal Account</span>
        </button>
      </div>

      {/* Enabled Toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div>
          <p className="font-semibold text-gray-900">Enable this payment method</p>
          <p className="text-xs text-gray-600 mt-1">Players will see this option when joining</p>
        </div>
        <button
          type="button"
          onClick={() => setFormData(prev => ({ ...prev, isEnabled: !prev.isEnabled }))}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            formData.isEnabled ? 'bg-indigo-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              formData.isEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Payment Method'}
        </button>
      </div>
    </form>
  );
}

