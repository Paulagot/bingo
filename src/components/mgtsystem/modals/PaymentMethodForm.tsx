// src/components/mgtsystem/modals/PaymentMethodForm.tsx

import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Building2, User, Info, Wallet, Banknote } from 'lucide-react';

import type {
  PaymentMethodCategory,
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

type Config = Record<string, any>;

type ProviderOption = {
  value: PaymentProvider;
  label: string;
  category: PaymentMethodCategory;
  helper?: string;
};

type LinkPreset = {
  linkLabel: string;
  linkPlaceholder: string;
};

const CATEGORIES: {
  value: PaymentMethodCategory;
  label: string;
  helper: string;
}[] = [
  {
    value: 'instant_payment',
    label: 'Manual Payment',
   helper:
  'Revolut, Monzo, bank transfer payments confirmed by a host/admin.',
  },
  {
    value: 'crypto',
    label: 'Crypto Payment',
    helper: 'Verified crypto payment methods, currently Solana wallet payments.',
  },
];

const PROVIDERS: ProviderOption[] = [
  {
    value: 'revolut',
    label: 'Revolut',
    category: 'instant_payment',
    helper: 'Can be an official club Revolut or a member/coach Revolut.',
  },
  {
    value: 'monzo',
    label: 'Monzo',
    category: 'instant_payment',
    helper: 'Can be an official club Monzo or a member/coach Monzo.',
  },
  {
    value: 'bank_transfer',
    label: 'Bank Transfer (IBAN / account number)',
    category: 'instant_payment',
  },
  {
    value: 'zippypay',
    label: 'ZippyPay',
    category: 'instant_payment',
    helper: 'Can be an official club ZippyPay or a member/coach ZippyPay.',
  },
  {
    value: 'solana_wallet',
    label: 'Solana Wallet',
    category: 'crypto',
    helper: 'Use a public Solana wallet address only. this can be an official club wallet or a member/coach wallet.',
  },
];

const PROVIDER_PRESETS: Record<string, LinkPreset> = {
  revolut: {
    linkLabel: 'Revolut payment link',
    linkPlaceholder: 'https://revolut.me/yourhandle',
  },
  monzo: {
    linkLabel: 'Monzo link',
    linkPlaceholder: 'https://monzo.me/yourhandle',
  },
  zippypay: {
    linkLabel: 'ZippyPay link',
    linkPlaceholder: 'https://...',
  },
};

const DEFAULT_LINK_PRESET: LinkPreset = {
  linkLabel: 'Payment link',
  linkPlaceholder: 'https://...',
};

function getLinkPreset(key: string): LinkPreset {
  return PROVIDER_PRESETS[key] ?? DEFAULT_LINK_PRESET;
}

function isTruthyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Lightweight Solana public key validation.
 * Checks base58-style length/characters.
 * It does not prove the wallet exists on-chain.
 */
function isValidSolanaAddress(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value.trim())
  );
}

function getProviderOption(providerName?: PaymentProvider | null) {
  if (!providerName) return null;
  return PROVIDERS.find((p) => String(p.value) === String(providerName)) || null;
}

function getDefaultLabel(providerName?: PaymentProvider | null): string {
  switch (providerName) {
    case 'cash':
      return 'Cash at the door';
    case 'revolut':
      return 'Revolut';
    case 'monzo':
      return 'Monzo';
    case 'bank_transfer':
      return 'Club bank transfer';
    case 'zippypay':
      return 'ZippyPay';
    case 'solana_wallet':
      return 'Solana Wallet';
    default:
      return '';
  }
}

function getDefaultInstructions(providerName?: PaymentProvider | null): string {
  switch (providerName) {
    case 'cash':
      return 'Pay cash to the host or club admin on the night.';
    case 'revolut':
      return 'Send payment using the Revolut details shown. The host/admin will confirm once received.';
    case 'monzo':
      return 'Send payment using the Monzo details shown. The host/admin will confirm once received.';
    case 'bank_transfer':
      return 'Send payment by bank transfer. The host/admin will confirm once received.';
    case 'zippypay':
      return 'Send payment using the ZippyPay details shown. The host/admin will confirm once received.';
    case 'solana_wallet':
      return 'Send payment to the Solana wallet shown. Crypto payments are verified by the app.';
    default:
      return '';
  }
}

function getDefaultConfig(providerName?: PaymentProvider | null): Config {
  switch (providerName) {
    case 'cash':
      return {
        verificationMode: 'manual',
      };
    case 'solana_wallet':
      return {
        chain: 'solana',
        verificationMode: 'onchain_verified',
      };
    case 'revolut':
    case 'monzo':
    case 'bank_transfer':
    case 'zippypay':
      return {
        verificationMode: 'manual',
      };
    default:
      return {};
  }
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
      verificationMode: 'onchain_verified',
    };
  }

  if (methodCategory === 'instant_payment' && providerKey === 'cash') {
    const next: Config = {
      verificationMode: 'manual',
    };

    if (isTruthyString(config?.collectionInstructions)) {
      next.collectionInstructions = String(config.collectionInstructions).trim();
    }

    return next;
  }

  if (methodCategory === 'instant_payment' && providerKey === 'bank_transfer') {
    const next: Config = {
      verificationMode: 'manual',
    };

    [
      'accountName',
      'bankName',
      'iban',
      'bic',
      'sortCode',
      'accountNumber',
    ].forEach((key) => {
      if (isTruthyString(config?.[key])) {
        next[key] = String(config[key]).trim();
      }
    });

    return next;
  }

  if (methodCategory === 'instant_payment') {
    const next: Config = {
      verificationMode: 'manual',
    };

    ['link', 'merchantId'].forEach((key) => {
      if (isTruthyString(config?.[key])) {
        next[key] = String(config[key]).trim();
      }
    });

    return next;
  }

  return { ...(config || {}) };
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
      (method?.methodConfig as Config) || getDefaultConfig(initialProvider),
    isEnabled: method?.isEnabled ?? true,
    displayOrder: method?.displayOrder || 0,
    isOfficialClubAccount: method?.isOfficialClubAccount ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const availableProviders = useMemo(
    () => PROVIDERS.filter((p) => p.category === formData.methodCategory),
    [formData.methodCategory]
  );

  const selectedProvider = useMemo(
    () => getProviderOption(formData.providerName),
    [formData.providerName]
  );

  const providerKey = String(formData.providerName || '');
  const config = (formData.methodConfig || {}) as Config;

  const isCash = providerKey === 'cash';
  const isBankTransfer = providerKey === 'bank_transfer';
  const isZippyPay = providerKey === 'zippypay';
  const isRevolut = providerKey === 'revolut';
  const isSolanaWallet = providerKey === 'solana_wallet';
  const isManualCategory = formData.methodCategory === 'instant_payment';
  const isCryptoCategory = formData.methodCategory === 'crypto';

  const shouldShowManualFields = isManualCategory && !!formData.providerName;
  const supportsPaymentLink =
    shouldShowManualFields && !isBankTransfer && !isCash;
  const linkPreset = getLinkPreset(providerKey);

  const updateConfig = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      methodConfig: {
        ...(prev.methodConfig as Config),
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
        methodLabel: prev.methodLabel || getDefaultLabel(provider),
        playerInstructions:
          prev.playerInstructions || getDefaultInstructions(provider),
        methodConfig: getDefaultConfig(provider),
        isOfficialClubAccount:
          provider === 'cash' ? false : prev.isOfficialClubAccount,
      };
    });

    setErrors({});
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
        newErrors.providerName = 'Please select a manual payment provider';
      } else if (isCash) {
        // Cash can be instructions-only. No config required.
      } else if (isBankTransfer) {
        if (
          !isTruthyString(config?.iban) &&
          !isTruthyString(config?.accountNumber)
        ) {
          newErrors.config = 'IBAN or account number is required';
        }

        if (
          isTruthyString(config?.accountNumber) &&
          !isTruthyString(config?.sortCode)
        ) {
          newErrors.config =
            'Sort code is recommended when using an account number';
        }
      } else if (
        !isTruthyString(config?.link) &&
        !isTruthyString(formData.playerInstructions)
      ) {
        newErrors.config =
          'Add a payment link or clear player instructions';
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

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
      console.error('PaymentMethodForm submission error:', error);
    }
  };

  const renderCategoryHelp = () => {
    const category = CATEGORIES.find((c) => c.value === formData.methodCategory);
    if (!category) return null;

    return <p className="text-xs text-gray-600 mt-1">{category.helper}</p>;
  };

  const renderProviderHelp = () => {
    if (!selectedProvider?.helper) return null;

    return (
      <p className="text-xs text-gray-600 mt-1">{selectedProvider.helper}</p>
    );
  };

  const renderRevolutHelp = () => {
    if (!shouldShowManualFields || !isRevolut) return null;

    return (
      <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 flex items-start gap-2">
        <Info className="h-4 w-4 text-[#157f85] mt-0.5 flex-shrink-0" />

        <div className="text-sm text-gray-900">
          <div className="font-semibold mb-1">
            Revolut can be official or personal
          </div>

          <p className="text-xs text-green-700">
            If this is the club’s official Revolut account, choose Official Club
            Account below. If this belongs to a coach, host or admin, choose
            Member Personal Account.
          </p>

          <p className="text-xs text-green-700 mt-2">
            Don’t set a fixed amount on the link if players may add extras or
            donations.
          </p>
        </div>
      </div>
    );
  };

  const renderCashHelp = () => {
    if (!shouldShowManualFields || !isCash) return null;

    return (
      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
        <Banknote className="h-4 w-4 text-amber-700 mt-0.5 flex-shrink-0" />

        <div className="text-sm text-gray-900">
          <div className="font-semibold mb-1">
            Cash is a manual payment method
          </div>

          <p className="text-xs text-amber-700">
            Players can be marked as paid only after the host/admin confirms
            the cash was received. This replaces the old hardcoded “pay admin”
            behaviour.
          </p>
        </div>
      </div>
    );
  };

  const renderCryptoHelp = () => {
    if (!isCryptoCategory || !isSolanaWallet) return null;

    return (
      <div className="mt-3 rounded-lg border border-purple-200 bg-purple-50 p-3 flex items-start gap-2">
        <Wallet className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />

        <div className="text-sm text-gray-900">
          <div className="font-semibold mb-1">Verified crypto payments</div>

          <p className="text-xs text-gray-600">
            Players will be shown this public wallet address during the crypto
            payment flow. Only enter a public wallet address here — never a seed
            phrase or private key.
          </p>
        </div>
      </div>
    );
  };

  const renderCashFields = () => {
    if (!shouldShowManualFields || !isCash) return null;

    return (
      <div>
        <label className="block text-sm font-semibold text-gray-600 mb-2">
          Cash collection instructions optional
        </label>

        <input
          type="text"
          value={config?.collectionInstructions || ''}
          onChange={(e) => updateConfig('collectionInstructions', e.target.value)}
          placeholder="Example: Pay the host at the door before the quiz starts"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>
    );
  };

  const renderPaymentLinkField = () => {
    if (!supportsPaymentLink) return null;

    return (
      <div>
        <label className="block text-sm font-semibold text-gray-600 mb-2">
          {linkPreset.linkLabel}
        </label>

        <input
          type="url"
          value={config?.link || ''}
          onChange={(e) => updateConfig('link', e.target.value)}
          placeholder={linkPreset.linkPlaceholder}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
            errors.config ? 'border-red-300' : 'border-gray-200'
          }`}
        />

        <p className="text-xs text-gray-600 mt-1">
          Optional if you provide clear player instructions instead.
        </p>
      </div>
    );
  };

  const renderBankTransferFields = () => {
    if (!shouldShowManualFields || !isBankTransfer) return null;

    return (
      <>
        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-2">
            Account Name
          </label>

          <input
            type="text"
            value={config?.accountName || ''}
            onChange={(e) => updateConfig('accountName', e.target.value)}
            placeholder="Example Sports Club"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-2">
            Bank Name Optional
          </label>

          <input
            type="text"
            value={config?.bankName || ''}
            onChange={(e) => updateConfig('bankName', e.target.value)}
            placeholder="e.g., AIB / Bank of Ireland / Lloyds"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              IBAN IE/EU
            </label>

            <input
              type="text"
              value={config?.iban || ''}
              onChange={(e) => updateConfig('iban', e.target.value)}
              placeholder="IE29AIBK93115212345678"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                errors.config ? 'border-red-300' : 'border-gray-200'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              BIC/SWIFT IE/EU
            </label>

            <input
              type="text"
              value={config?.bic || ''}
              onChange={(e) => updateConfig('bic', e.target.value)}
              placeholder="AIBKIE2D"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              Account Number UK
            </label>

            <input
              type="text"
              value={config?.accountNumber || ''}
              onChange={(e) => updateConfig('accountNumber', e.target.value)}
              placeholder="12345678"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                errors.config ? 'border-red-300' : 'border-gray-200'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              Sort Code UK
            </label>

            <input
              type="text"
              value={config?.sortCode || ''}
              onChange={(e) => updateConfig('sortCode', e.target.value)}
              placeholder="93-11-52"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                errors.config ? 'border-red-300' : 'border-gray-200'
              }`}
            />
          </div>
        </div>
      </>
    );
  };

  const renderZippyPayFields = () => {
    if (!shouldShowManualFields || !isZippyPay) return null;

    return (
      <div>
        <label className="block text-sm font-semibold text-gray-600 mb-2">
          Merchant ID Optional
        </label>

        <input
          type="text"
          value={config?.merchantId || ''}
          onChange={(e) => updateConfig('merchantId', e.target.value)}
          placeholder="Your merchant identifier"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>
    );
  };

  const renderCryptoFields = () => {
    if (!isCryptoCategory || !isSolanaWallet) return null;

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-2">
            Network
          </label>

          <input
            type="text"
            value="Solana"
            disabled
            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-2">
            Solana Wallet Address *
          </label>

          <input
            type="text"
            value={config?.walletAddress || ''}
            onChange={(e) => updateConfig('walletAddress', e.target.value)}
            placeholder="Enter Solana public key"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
              errors.config ? 'border-red-300' : 'border-gray-200'
            }`}
          />

          <p className="text-xs text-gray-600 mt-1">
            This is the public wallet address used by the crypto payment flow.
            Do not enter a private key or seed phrase.
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
          {renderCashFields()}
          {renderPaymentLinkField()}
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

  const labelPlaceholder =
    formData.methodCategory === 'crypto'
      ? 'e.g., Solana Wallet'
      : providerKey === 'cash'
        ? 'e.g., Cash at the door'
        : providerKey === 'revolut'
          ? 'e.g., Official Club Revolut or Coach Paula Revolut'
          : providerKey === 'monzo'
            ? 'e.g., Club Monzo or Coach Monzo'
            : 'e.g., Club bank transfer';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Category */}
      <div>
        <label className="block text-sm font-semibold text-gray-600 mb-2">
          Payment Type *
        </label>

        <select
          value={formData.methodCategory}
          onChange={(e) =>
            handleCategoryChange(e.target.value as PaymentMethodCategory)
          }
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>

        {renderCategoryHelp()}
      </div>

      {/* Provider */}
      <div>
        <label className="block text-sm font-semibold text-gray-600 mb-2">
          Provider *
        </label>

        <select
          value={String(formData.providerName || '')}
          onChange={(e) => resetConfigForProvider(e.target.value || null)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
            errors.providerName ? 'border-red-300' : 'border-gray-200'
          }`}
        >
          <option value="">Select a provider...</option>

          {availableProviders.map((prov) => (
            <option key={String(prov.value)} value={String(prov.value)}>
              {prov.label}
            </option>
          ))}
        </select>

        {errors.providerName && (
          <p className="text-xs text-red-600 mt-1">{errors.providerName}</p>
        )}

        {renderProviderHelp()}
        {renderCashHelp()}
        {renderRevolutHelp()}
        {renderCryptoHelp()}
      </div>

      {/* Label */}
      <div>
        <label className="block text-sm font-semibold text-gray-600 mb-2">
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
          placeholder={labelPlaceholder}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
            errors.methodLabel ? 'border-red-300' : 'border-gray-200'
          }`}
        />

        <p className="text-xs text-gray-600 mt-1">
          This is what hosts/admins will see when choosing allowed payment
          methods for a quiz.
        </p>

        {errors.methodLabel && (
          <p className="text-xs text-red-600 mt-1">{errors.methodLabel}</p>
        )}
      </div>

      {/* Config Fields */}
      {renderConfigFields()}

      {errors.config && <p className="text-xs text-red-600">{errors.config}</p>}

      {/* Player Instructions */}
      <div>
        <label className="block text-sm font-semibold text-gray-600 mb-2">
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
              ? 'Example: Send payment to the Solana wallet shown. The app verifies crypto payments.'
              : 'Example: Send the payment using the details above. The host/admin will confirm once received.'
          }
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Account Type */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="mb-3">
          <p className="font-semibold text-gray-900">Where does the money go?</p>
          <p className="text-xs text-gray-600 mt-1">
            This matters for reporting. Official accounts belong to the club.
            Personal accounts belong to a host, coach, admin or member.
          </p>
        </div>

        <div className="flex items-center gap-4">
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
                ? 'border-[#157f85] bg-green-50 text-[#157f85]'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
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
                ? 'border-[#8a6d2f] bg-amber-50 text-amber-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
            }`}
          >
            <User className="h-5 w-5" />
            <span className="font-semibold">Member Personal Account</span>
          </button>
        </div>
      </div>

      {/* Enabled Toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div>
          <p className="font-semibold text-gray-900">
            Enable this payment method
          </p>

          <p className="text-xs text-gray-600 mt-1">
            Enabled methods can be selected for events and shown to players.
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
            formData.isEnabled ? 'bg-[#157f85]' : 'bg-[#c8d0cd]'
          }`}
          aria-label={
            formData.isEnabled
              ? 'Disable this payment method'
              : 'Enable this payment method'
          }
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
          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-[#157f85] text-white rounded-lg font-semibold hover:bg-[#0e6268] transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Payment Method'}
        </button>
      </div>
    </form>
  );
}

