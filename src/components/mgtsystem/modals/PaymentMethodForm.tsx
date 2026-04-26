// src/components/mgtsystem/modals/PaymentMethodForm.tsx

import { useMemo, useState } from 'react';
import { Building2, User, QrCode, Info, Wallet } from 'lucide-react';

import type {
  PaymentMethodCategory,
  InstantPaymentProvider,
  CryptoPaymentProvider,
  PaymentProvider,
} from '../../../shared/types/payment';

import type {
  ClubPaymentMethodWithMeta,
  PaymentMethodFormData,
} from '../../../shared/types/paymentMethods';

interface PaymentMethodFormProps {
  method?: ClubPaymentMethodWithMeta | null;
  defaultMethodCategory?: PaymentMethodCategory;
  defaultProviderName?: PaymentProvider | null;
  onSave: (data: PaymentMethodFormData) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

type ProviderValue = InstantPaymentProvider | CryptoPaymentProvider;

const CATEGORIES: { value: PaymentMethodCategory; label: string }[] = [
  { value: 'instant_payment', label: 'Instant Payment' },
  { value: 'crypto', label: 'Crypto' },
];

const PROVIDERS: {
  value: ProviderValue;
  label: string;
  category: PaymentMethodCategory;
}[] = [
  { value: 'revolut', label: 'Revolut', category: 'instant_payment' },
  {
    value: 'bank_transfer',
    label: 'Bank Transfer (Faster Payments / IBAN)',
    category: 'instant_payment',
  },
  { value: 'paypal', label: 'PayPal', category: 'instant_payment' },
  { value: 'monzo', label: 'Monzo', category: 'instant_payment' },
  { value: 'starling', label: 'Starling', category: 'instant_payment' },
  { value: 'wise', label: 'Wise', category: 'instant_payment' },
  { value: 'cashapp', label: 'Cash App', category: 'instant_payment' },
  { value: 'zippypay', label: 'ZippyPay', category: 'instant_payment' },
  { value: 'other', label: 'Other', category: 'instant_payment' },

  { value: 'solana_wallet', label: 'Solana Wallet', category: 'crypto' },
];

type Config = Record<string, any>;

type LinkPreset = {
  linkLabel: string;
  linkPlaceholder: string;
};

const PROVIDER_PRESETS: Record<string, LinkPreset> = {
  revolut: {
    linkLabel: 'Revolut payment link',
    linkPlaceholder: 'https://revolut.me/yourhandle',
  },
  paypal: {
    linkLabel: 'PayPal link',
    linkPlaceholder: 'https://paypal.me/yourhandle',
  },
  monzo: {
    linkLabel: 'Monzo link',
    linkPlaceholder: 'https://monzo.me/yourhandle',
  },
  starling: {
    linkLabel: 'Starling payment link',
    linkPlaceholder: 'https://...',
  },
  wise: {
    linkLabel: 'Wise payment link',
    linkPlaceholder: 'https://...',
  },
  cashapp: {
    linkLabel: 'Cash App link',
    linkPlaceholder: 'https://cash.app/$yourcashtag',
  },
  zippypay: {
    linkLabel: 'ZippyPay link',
    linkPlaceholder: 'https://...',
  },
  other: {
    linkLabel: 'Payment link',
    linkPlaceholder: 'https://...',
  },
};

const DEFAULT_LINK_PRESET: LinkPreset = {
  linkLabel: 'Payment link',
  linkPlaceholder: 'https://...',
};

const getLinkPreset = (key: string): LinkPreset =>
  PROVIDER_PRESETS[key] ?? DEFAULT_LINK_PRESET;

function isTruthyString(v: any): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * Lightweight Solana public key validation.
 * Checks base58-style length/characters.
 * It does not prove the wallet exists on-chain.
 */
function isValidSolanaAddress(value: any): boolean {
  return (
    typeof value === 'string' &&
    /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value.trim())
  );
}

function sanitizeConfigForProvider(
  methodCategory: PaymentMethodCategory,
  providerKey: string,
  config: Config
): Config {
  if (methodCategory === 'crypto' && providerKey === 'solana_wallet') {
    return {
      chain: 'solana',
      walletAddress: String(config?.walletAddress || '').trim(),
    };
  }

  // Prevent stale fields from other providers being saved for Revolut.
  if (providerKey === 'revolut') {
    const next: Config = {};

    if (isTruthyString(config?.link)) {
      next.link = String(config.link).trim();
    }

    return next;
  }

  return { ...(config || {}) };
}

function getDefaultLabel(providerName?: PaymentProvider | null): string {
  if (providerName === 'solana_wallet') return 'Solana Donations Wallet';
  return '';
}

function getDefaultInstructions(providerName?: PaymentProvider | null): string {
  if (providerName === 'solana_wallet') {
    return 'Send your donation to the Solana wallet shown. The host may verify payment manually.';
  }

  return '';
}

function getDefaultConfig(providerName?: PaymentProvider | null): Config {
  if (providerName === 'solana_wallet') {
    return { chain: 'solana' };
  }

  return {};
}

export default function PaymentMethodForm({
  method,
  defaultMethodCategory = 'instant_payment',
  defaultProviderName = null,
  onSave,
  onCancel,
  loading,
}: PaymentMethodFormProps) {
  const isEdit = !!method;

  const initialCategory = method?.methodCategory || defaultMethodCategory;
  const initialProvider = method?.providerName || defaultProviderName;

  const [formData, setFormData] = useState<PaymentMethodFormData>({
    methodCategory: initialCategory,
    providerName: initialProvider,
    methodLabel: method?.methodLabel || getDefaultLabel(initialProvider),
    playerInstructions:
      method?.playerInstructions || getDefaultInstructions(initialProvider),
    methodConfig:
      (method?.methodConfig as any) || getDefaultConfig(initialProvider),
    isEnabled: method?.isEnabled ?? true,
    displayOrder: method?.displayOrder || 0,
    isOfficialClubAccount: method?.isOfficialClubAccount ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const availableProviders = useMemo(
    () => PROVIDERS.filter((p) => p.category === formData.methodCategory),
    [formData.methodCategory]
  );

  const providerKey = String(formData.providerName || '');
  const config = (formData.methodConfig || {}) as Config;

  const isBankTransfer = providerKey === 'bank_transfer';
  const isZippyPay = providerKey === 'zippypay';
  const isRevolut = providerKey === 'revolut';
  const isSolanaWallet = providerKey === 'solana_wallet';
  const isCryptoCategory = formData.methodCategory === 'crypto';

  const shouldShowInstantFields =
    formData.methodCategory === 'instant_payment' && !!formData.providerName;

  const supportsLinkQr = shouldShowInstantFields && !isBankTransfer;
  const linkPreset = getLinkPreset(providerKey);

  const updateConfig = (key: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      methodConfig: {
        ...(prev.methodConfig as any),
        [key]: value,
      },
    }));
  };

  const resetConfigForProvider = (nextProvider: string | null) => {
    setFormData((prev) => {
      const provider = (nextProvider as PaymentProvider | null) || null;

      return {
        ...prev,
        providerName: provider,
        methodLabel:
          prev.methodLabel || getDefaultLabel(provider),
        playerInstructions:
          prev.playerInstructions || getDefaultInstructions(provider),
        methodConfig: getDefaultConfig(provider),
      };
    });
  };

  const handleCategoryChange = (nextCategory: PaymentMethodCategory) => {
    setFormData((prev) => ({
      ...prev,
      methodCategory: nextCategory,
      providerName: null,
      methodConfig: {},
    }));

    setErrors({});
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.methodLabel.trim()) {
      newErrors.methodLabel = 'Label is required';
    }

    if (formData.methodCategory === 'instant_payment') {
      if (!formData.providerName) {
        newErrors.providerName = 'Please select a provider';
      } else if (isBankTransfer) {
        if (
          !isTruthyString(config?.iban) &&
          !isTruthyString(config?.accountNumber)
        ) {
          newErrors.config = 'IBAN or Account Number is required';
        }

        if (
          isTruthyString(config?.accountNumber) &&
          !isTruthyString(config?.sortCode)
        ) {
          newErrors.config = 'Sort Code is recommended when using an Account Number';
        }
      } else if (isRevolut) {
        if (!isTruthyString(config?.link)) {
          newErrors.config = 'A Revolut payment link is required';
        }
      } else if (
        !isTruthyString(config?.link) &&
        !isTruthyString(config?.qrCodeUrl)
      ) {
        newErrors.config = 'At least a payment link or QR code URL is required';
      }
    }

    if (formData.methodCategory === 'crypto') {
      if (!formData.providerName) {
        newErrors.providerName = 'Please select a crypto provider';
      } else if (isSolanaWallet) {
        if (!isTruthyString(config?.walletAddress)) {
          newErrors.config = 'A Solana wallet address is required';
        } else if (!isValidSolanaAddress(config.walletAddress)) {
          newErrors.config = 'Please enter a valid Solana wallet address';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const sanitized = sanitizeConfigForProvider(
      formData.methodCategory,
      providerKey,
      config
    );

    try {
      await onSave({
        ...formData,
        methodConfig: sanitized,
      });
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const renderRevolutHelp = () => {
    if (!shouldShowInstantFields || !isRevolut) return null;

    return (
      <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3 flex items-start gap-2">
        <Info className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0" />

        <div className="text-sm text-indigo-900">
          <div className="font-semibold mb-1">
            How to get your Revolut payment link
          </div>

          <ol className="list-decimal pl-5 space-y-1">
            <li>Open Revolut</li>
            <li>
              Go to <span className="font-medium">Payments</span> →{' '}
              <span className="font-medium">Request</span>
            </li>
            <li>
              Select <span className="font-medium">Payment link</span> /{' '}
              <span className="font-medium">Share link</span>
            </li>
            <li>Copy the link and paste it here</li>
          </ol>

          <p className="text-xs text-indigo-800 mt-2">
            Don’t set a fixed amount — players may add extras, so the amount can vary.
          </p>
        </div>
      </div>
    );
  };

  const renderCryptoHelp = () => {
    if (!isCryptoCategory || !isSolanaWallet) return null;

    return (
      <div className="mt-3 rounded-lg border border-purple-200 bg-purple-50 p-3 flex items-start gap-2">
        <Wallet className="h-4 w-4 text-purple-700 mt-0.5 flex-shrink-0" />

        <div className="text-sm text-purple-950">
          <div className="font-semibold mb-1">Solana wallet payments</div>

          <p className="text-xs text-purple-900">
            Players will be shown this public wallet address during the donation
            payment flow. Only enter a public wallet address here — never a seed
            phrase or private key.
          </p>
        </div>
      </div>
    );
  };

  const renderLinkQrFields = () => {
    if (!shouldShowInstantFields) return null;
    if (isBankTransfer) return null;
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
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
              errors.config ? 'border-red-300' : 'border-gray-300'
            }`}
          />

          {isRevolut && (
            <p className="text-xs text-gray-500 mt-1">
              Paste your Revolut payment link, for example revolut.me. We don’t
              use QR for Revolut to keep it simple.
            </p>
          )}
        </div>

        {!isRevolut && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              QR Code URL Optional
            </label>

            <input
              type="url"
              value={config?.qrCodeUrl || ''}
              onChange={(e) => updateConfig('qrCodeUrl', e.target.value)}
              placeholder="https://example.com/qr-code.png"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                errors.config ? 'border-red-300' : 'border-gray-300'
              }`}
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
            Bank Name Optional
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
              IBAN IE/EU
            </label>

            <input
              type="text"
              value={config?.iban || ''}
              onChange={(e) => updateConfig('iban', e.target.value)}
              placeholder="IE29AIBK93115212345678"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                errors.config ? 'border-red-300' : 'border-gray-300'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              BIC/SWIFT IE/EU
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
              Account Number UK
            </label>

            <input
              type="text"
              value={config?.accountNumber || ''}
              onChange={(e) => updateConfig('accountNumber', e.target.value)}
              placeholder="12345678"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                errors.config ? 'border-red-300' : 'border-gray-300'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Sort Code UK
            </label>

            <input
              type="text"
              value={config?.sortCode || ''}
              onChange={(e) => updateConfig('sortCode', e.target.value)}
              placeholder="93-11-52"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                errors.config ? 'border-red-300' : 'border-gray-300'
              }`}
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
          Merchant ID Optional
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

  const renderCryptoFields = () => {
    if (!isCryptoCategory || !isSolanaWallet) return null;

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Network
          </label>

          <input
            type="text"
            value="Solana"
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Solana Wallet Address *
          </label>

          <input
            type="text"
            value={config?.walletAddress || ''}
            onChange={(e) => updateConfig('walletAddress', e.target.value)}
            placeholder="Enter Solana public key"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
              errors.config ? 'border-red-300' : 'border-gray-300'
            }`}
          />

          <p className="text-xs text-gray-500 mt-1">
            This is the public wallet address where donation payments will be
            sent. Do not enter a private key or seed phrase.
          </p>
        </div>
      </div>
    );
  };

  const renderConfigFields = () => {
    if (!formData.providerName) return null;

    if (formData.methodCategory === 'instant_payment') {
      return (
        <div className="space-y-4">
          {renderLinkQrFields()}
          {renderBankTransferFields()}
          {renderZippyPayFields()}
        </div>
      );
    }

    if (formData.methodCategory === 'crypto') {
      return renderCryptoFields();
    }

    return null;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Category */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Category *
        </label>

        <select
          value={formData.methodCategory}
          onChange={(e) =>
            handleCategoryChange(e.target.value as PaymentMethodCategory)
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          {CATEGORIES.map((cat) => (
            <option key={String(cat.value)} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Provider */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Provider *
        </label>

        <select
          value={(formData.providerName as any) || ''}
          onChange={(e) => resetConfigForProvider(e.target.value || null)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
            errors.providerName ? 'border-red-300' : 'border-gray-300'
          }`}
        >
          <option value="">Select a provider...</option>

          {availableProviders.map((prov) => (
            <option key={prov.value} value={prov.value}>
              {prov.label}
            </option>
          ))}
        </select>

        {errors.providerName && (
          <p className="text-xs text-red-600 mt-1">{errors.providerName}</p>
        )}

        {renderRevolutHelp()}
        {renderCryptoHelp()}
      </div>

      {/* Label */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Display Label *
        </label>

        <input
          type="text"
          value={formData.methodLabel}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              methodLabel: e.target.value,
            }))
          }
          placeholder={
            formData.methodCategory === 'crypto'
              ? 'e.g., Solana Donations Wallet'
              : 'e.g., Revolut - Main Account'
          }
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
            errors.methodLabel ? 'border-red-300' : 'border-gray-300'
          }`}
        />

        {errors.methodLabel && (
          <p className="text-xs text-red-600 mt-1">{errors.methodLabel}</p>
        )}
      </div>

      {/* Config Fields */}
      {renderConfigFields()}

      {errors.config && (
        <p className="text-xs text-red-600">{errors.config}</p>
      )}

      {/* Player Instructions */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Instructions for Players
        </label>

        <textarea
          value={formData.playerInstructions}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              playerInstructions: e.target.value,
            }))
          }
          rows={4}
          placeholder={
            formData.methodCategory === 'crypto'
              ? 'Example: Send your donation to the Solana wallet shown. The host may verify payment manually.'
              : 'Enter instructions that players will see during payment...'
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Account Type */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <button
          type="button"
          onClick={() =>
            setFormData((prev) => ({
              ...prev,
              isOfficialClubAccount: true,
            }))
          }
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
          onClick={() =>
            setFormData((prev) => ({
              ...prev,
              isOfficialClubAccount: false,
            }))
          }
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
          <p className="font-semibold text-gray-900">
            Enable this payment method
          </p>

          <p className="text-xs text-gray-600 mt-1">
            Players will see this option when joining
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setFormData((prev) => ({
              ...prev,
              isEnabled: !prev.isEnabled,
            }))
          }
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

