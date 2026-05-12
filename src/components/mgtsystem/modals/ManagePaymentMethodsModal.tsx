// src/components/mgtsystem/modals/ManagePaymentMethodsModal.tsx

import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Edit,
  Trash2,
  CreditCard,
  AlertCircle,
  Building2,
  User,
  Wallet,
  Banknote,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';

import PaymentMethodForm from './PaymentMethodForm';
import PaymentMethodsService from '../services/PaymentMethodsService';
import StripeConnectService from '../services/StripeConnectService';

import type {
  ClubPaymentMethodWithMeta,
  PaymentMethodFormData,
} from '../../../shared/types/paymentMethods';

import type { PaymentMethodCategory } from '../../../shared/types/payment';

interface ManagePaymentMethodsModalProps {
  clubId: string;
  onClose: () => void;
}

type View = 'list' | 'add_manual' | 'add_solana' | 'edit';

const toMethodIdNumber = (id: string | number) => {
  const numericId = Number(id);
  return Number.isFinite(numericId) ? numericId : NaN;
};

function formatProviderName(providerName?: string | null) {
  if (!providerName) return '';
  return providerName.replace(/_/g, ' ');
}

type PayAtDoorProvider = 'cash' | 'card_tap';

function isPayAtDoorMethod(method: ClubPaymentMethodWithMeta) {
  return (
    method.methodCategory === 'instant_payment' &&
    (method.providerName === 'cash' || method.providerName === 'card_tap')
  );
}

function getPayAtDoorDefaults(providerName: PayAtDoorProvider) {
  if (providerName === 'card_tap') {
    return {
      methodLabel: 'CardTap on the night',
      playerInstructions:
        'Pay by card tap to the host or club admin on the night.',
      methodConfig: {
        verificationMode: 'manual',
        collectionInstructions:
          'CardTap payment collected by host/admin on the night.',
      },
      displayOrder: 1,
    };
  }

  return {
    methodLabel: 'Cash on the night',
    playerInstructions:
      'Pay cash to the host or club admin on the night.',
    methodConfig: {
      verificationMode: 'manual',
      collectionInstructions:
        'Cash payment collected by host/admin on the night.',
    },
    displayOrder: 0,
  };
}

function formatCategoryName(category?: PaymentMethodCategory | null) {
  if (!category) return '';

  if (category === 'instant_payment') return 'manual payment';
  if (category === 'crypto') return 'crypto';
  if (category === 'stripe') return 'stripe';
  if (category === 'card') return 'card';

  return category.replace(/_/g, ' ');
}

function getVerificationLabel(method: ClubPaymentMethodWithMeta) {
  const config = (method.methodConfig || {}) as Record<string, any>;

  if (method.methodCategory === 'stripe' || method.methodCategory === 'card') {
    return 'Auto verified';
  }

  if (method.methodCategory === 'crypto') {
    return config.verificationMode === 'manual'
      ? 'Manual crypto check'
      : 'Crypto verified';
  }

  if (method.methodCategory === 'instant_payment') {
    return 'Manual confirmation';
  }

  return 'Verification depends on setup';
}

function getAccountLabel(method: ClubPaymentMethodWithMeta) {
  return method.isOfficialClubAccount
    ? 'Official club account'
    : 'Member personal account';
}

function filterVisibleMethods(
  methods: ClubPaymentMethodWithMeta[],
  showDisabled: boolean
) {
  if (showDisabled) return methods;
  return methods.filter((method) => method.isEnabled);
}

function PaymentMethodCard({
  method,
  loading,
  deleteConfirm,
  onEdit,
  onAskDelete,
  onDelete,
  onCancelDelete,
}: {
  method: ClubPaymentMethodWithMeta;
  loading: boolean;
  deleteConfirm: string | null;
  onEdit: (method: ClubPaymentMethodWithMeta) => void;
  onAskDelete: (id: string) => void;
  onDelete: (id: string) => void;
  onCancelDelete: () => void;
}) {
  const methodId = String(method.id);
  const config = (method.methodConfig || {}) as Record<string, any>;

  return (
    <div
      className={`p-4 rounded-lg border transition-all ${
        method.isEnabled
          ? 'border-gray-200 bg-white'
          : 'border-gray-200 bg-gray-50 opacity-70'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-gray-900 truncate">
              {method.methodLabel}
            </h3>

            {!method.isEnabled && (
              <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-semibold rounded">
                Disabled
              </span>
            )}

            {method.isOfficialClubAccount ? (
              <span title="Official club account">
                <Building2 className="h-4 w-4 text-indigo-600" />
              </span>
            ) : (
              <span title="Member personal account">
                <User className="h-4 w-4 text-orange-600" />
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
            <span className="px-2 py-1 bg-gray-100 rounded font-medium capitalize">
              {formatCategoryName(method.methodCategory)}
            </span>

            {method.providerName && (
              <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded font-medium capitalize">
                {formatProviderName(method.providerName)}
              </span>
            )}

            <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded font-medium">
              {getVerificationLabel(method)}
            </span>

            <span
              className={`px-2 py-1 rounded font-medium ${
                method.isOfficialClubAccount
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-orange-50 text-orange-700'
              }`}
            >
              {getAccountLabel(method)}
            </span>
          </div>

          {method.playerInstructions && (
            <p className="text-xs text-gray-500 mt-2 line-clamp-2">
              {method.playerInstructions}
            </p>
          )}

          {method.methodCategory === 'crypto' &&
            method.providerName === 'solana_wallet' &&
            config.walletAddress && (
              <p className="text-xs text-gray-500 mt-2 font-mono break-all">
                {config.walletAddress}
              </p>
            )}

          {method.providerName === 'cash' && (
            <p className="text-xs text-amber-700 mt-2">
              Cash payments must be confirmed manually by the host/admin.
            </p>
          )}

          {method.addedBy && (
            <p className="text-xs text-gray-500 mt-2">
              Added by: {method.addedBy}
              {method.editedBy && ` • Last edited by: ${method.editedBy}`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => onEdit(method)}
            disabled={loading}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors disabled:opacity-50"
            title="Edit"
          >
            <Edit className="h-4 w-4 text-gray-700" />
          </button>

          {deleteConfirm === methodId ? (
            <>
              <button
                type="button"
                onClick={() => onDelete(methodId)}
                disabled={loading}
                className="px-3 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                Confirm
              </button>

              <button
                type="button"
                onClick={onCancelDelete}
                disabled={loading}
                className="px-3 py-2 bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onAskDelete(methodId)}
              disabled={loading}
              className="p-2 rounded-lg border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
              title="Delete"
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ManagePaymentMethodsModal({
  clubId,
  onClose,
}: ManagePaymentMethodsModalProps) {
  const [view, setView] = useState<View>('list');
  const [methods, setMethods] = useState<ClubPaymentMethodWithMeta[]>([]);
  const [selectedMethod, setSelectedMethod] =
    useState<ClubPaymentMethodWithMeta | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showDisabledMethods, setShowDisabledMethods] = useState(false);

  const [stripeBusy, setStripeBusy] = useState(false);
  const [stripeStatusMsg, setStripeStatusMsg] = useState<string | null>(null);

  const loadMethods = async () => {
    try {
      setLoadingList(true);
      setError(null);

      const response = await PaymentMethodsService.getAllForManagement(clubId);
      setMethods(response.paymentMethods || []);
    } catch (err: any) {
      console.error('Failed to load payment methods:', err);
      setError(err?.message || 'Failed to load payment methods');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadMethods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeParam = params.get('stripe');

    if (!stripeParam) return;
    if (stripeParam !== 'return' && stripeParam !== 'refresh') return;

    const handleStripeReturn = async () => {
      try {
        setStripeBusy(true);
        setStripeStatusMsg('Checking Stripe connection…');

        const status = await StripeConnectService.getStatus();

        if (!status?.ok) {
          setStripeStatusMsg(null);
          setError(
            status?.message ||
              status?.error ||
              'Failed to verify Stripe status'
          );
          return;
        }

        await loadMethods();

        const ready = !!(
          status.detailsSubmitted &&
          status.chargesEnabled &&
          status.payoutsEnabled
        );

        setStripeStatusMsg(
          ready ? 'Stripe connected ✅' : 'Stripe setup needs attention'
        );

        params.delete('stripe');

        const newQueryString = params.toString();
        const newUrl = `${window.location.pathname}${
          newQueryString ? `?${newQueryString}` : ''
        }${window.location.hash || ''}`;

        window.history.replaceState({}, '', newUrl);
      } catch (err: any) {
        console.error('Stripe return handling failed:', err);
        setError(err?.message || 'Stripe return handling failed');
      } finally {
        setStripeBusy(false);
        window.setTimeout(() => setStripeStatusMsg(null), 4000);
      }
    };

    void handleStripeReturn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stripeMethod = useMemo(() => {
    return (
      methods.find(
        (method) =>
          method.methodCategory === 'stripe' || method.methodCategory === 'card'
      ) || null
    );
  }, [methods]);

  const cashMethod = useMemo(() => {
  return (
    methods.find(
      (method) =>
        method.methodCategory === 'instant_payment' &&
        method.providerName === 'cash'
    ) || null
  );
}, [methods]);

const cardTapMethod = useMemo(() => {
  return (
    methods.find(
      (method) =>
        method.methodCategory === 'instant_payment' &&
        method.providerName === 'card_tap'
    ) || null
  );
}, [methods]);

const allManualMethods = useMemo(
  () =>
    methods.filter(
      (method) =>
        method.methodCategory === 'instant_payment' &&
        !isPayAtDoorMethod(method)
    ),
  [methods]
);

  const allCryptoMethods = useMemo(
    () => methods.filter((method) => method.methodCategory === 'crypto'),
    [methods]
  );

  const allOtherMethods = useMemo(
    () =>
      methods.filter(
        (method) =>
          method.methodCategory !== 'instant_payment' &&
          method.methodCategory !== 'crypto' &&
          method.methodCategory !== 'stripe' &&
          method.methodCategory !== 'card'
      ),
    [methods]
  );

  const manualMethods = useMemo(
    () => filterVisibleMethods(allManualMethods, showDisabledMethods),
    [allManualMethods, showDisabledMethods]
  );

  const cryptoMethods = useMemo(
    () => filterVisibleMethods(allCryptoMethods, showDisabledMethods),
    [allCryptoMethods, showDisabledMethods]
  );

  const otherMethods = useMemo(
    () => filterVisibleMethods(allOtherMethods, showDisabledMethods),
    [allOtherMethods, showDisabledMethods]
  );

  const hiddenDisabledCount = useMemo(() => {
    if (showDisabledMethods) return 0;

    return methods.filter((method) => !method.isEnabled).length;
  }, [methods, showDisabledMethods]);

  const stripeEnabled = !!stripeMethod?.isEnabled;
  const showStripeCard = showDisabledMethods || !stripeMethod || stripeEnabled;

  const stripeConnect = useMemo(() => {
    const config: any = stripeMethod?.methodConfig || {};
    return config?.connect || null;
  }, [stripeMethod]);

  const stripeReady = !!(
    stripeConnect?.detailsSubmitted &&
    stripeConnect?.chargesEnabled &&
    stripeConnect?.payoutsEnabled
  );

  const handleStripeConnect = async () => {
    try {
      setStripeBusy(true);
      setError(null);
      setStripeStatusMsg(null);

      const appOrigin = window.location.origin;
      const response = await StripeConnectService.startConnect(appOrigin);

      if (!response?.ok || !response.url) {
        setError(
          response?.message || response?.error || 'Failed to start Stripe Connect'
        );
        return;
      }

      window.location.href = response.url;
    } catch (err: any) {
      console.error('Stripe Connect start failed:', err);
      setError(err?.message || 'Stripe Connect start failed');
    } finally {
      setStripeBusy(false);
    }
  };

  const refreshStripeStatus = async () => {
    try {
      setStripeBusy(true);
      setError(null);

      const status = await StripeConnectService.getStatus();

      if (!status?.ok) {
        setError(
          status?.message || status?.error || 'Failed to refresh Stripe status'
        );
      }

      await loadMethods();
    } catch (err: any) {
      setError(err?.message || 'Failed to refresh Stripe status');
    } finally {
      setStripeBusy(false);
    }
  };

  const setStripeEnabled = async (enabled: boolean) => {
    if (!stripeMethod) return;

    const methodIdNum = toMethodIdNumber(stripeMethod.id);

    if (!Number.isFinite(methodIdNum)) {
      setError('Stripe method id is not numeric, cannot update.');
      return;
    }

    try {
      setStripeBusy(true);
      setError(null);

      await PaymentMethodsService.update(clubId, methodIdNum, {
        methodCategory: stripeMethod.methodCategory,
        providerName: stripeMethod.providerName || 'stripe',
        methodLabel: stripeMethod.methodLabel,
        playerInstructions: stripeMethod.playerInstructions || '',
        methodConfig: stripeMethod.methodConfig || {},
        isEnabled: enabled,
        displayOrder: stripeMethod.displayOrder ?? 0,
        isOfficialClubAccount: !!stripeMethod.isOfficialClubAccount,
      } as any);

      await loadMethods();
    } catch (err: any) {
      console.error('Failed to toggle Stripe enabled:', err);
      setError(err?.message || 'Failed to update Stripe enabled state');
    } finally {
      setStripeBusy(false);
    }
  };

  const handleTogglePayAtDoorMethod = async (
  providerName: PayAtDoorProvider,
  enabled: boolean
) => {
  const existingMethod = providerName === 'cash' ? cashMethod : cardTapMethod;

  // If disabling and it does not exist yet, there is nothing to do.
  if (!enabled && !existingMethod) return;

  const defaults = getPayAtDoorDefaults(providerName);

  try {
    setLoading(true);
    setError(null);

    if (existingMethod) {
      const methodIdNum = toMethodIdNumber(existingMethod.id);

      if (!Number.isFinite(methodIdNum)) {
        setError('Payment method id is not numeric, cannot update.');
        return;
      }

      await PaymentMethodsService.update(clubId, methodIdNum, {
        methodCategory: 'instant_payment',
        providerName,
        methodLabel: existingMethod.methodLabel || defaults.methodLabel,
        playerInstructions:
          existingMethod.playerInstructions || defaults.playerInstructions,
        methodConfig: existingMethod.methodConfig || defaults.methodConfig,
        isEnabled: enabled,
        displayOrder: existingMethod.displayOrder ?? defaults.displayOrder,
        isOfficialClubAccount: false,
      } as any);
    } else {
      await PaymentMethodsService.create(clubId, {
        methodCategory: 'instant_payment',
        providerName,
        methodLabel: defaults.methodLabel,
        playerInstructions: defaults.playerInstructions,
        methodConfig: defaults.methodConfig,
        isEnabled: true,
        displayOrder: defaults.displayOrder,
        isOfficialClubAccount: false,
      } as any);
    }

    await loadMethods();
  } catch (err: any) {
    console.error('Failed to update on-the-night payment method:', err);
    setError(err?.message || 'Failed to update on-the-night payment method');
  } finally {
    setLoading(false);
  }
};

  const handleAddManual = () => {
    setSelectedMethod(null);
    setError(null);
    setView('add_manual');
  };

  const handleAddSolana = () => {
    setSelectedMethod(null);
    setError(null);
    setView('add_solana');
  };

  const handleEdit = (method: ClubPaymentMethodWithMeta) => {
    setSelectedMethod(method);
    setError(null);
    setView('edit');
  };

  const handleSave = async (data: PaymentMethodFormData) => {
    try {
      setLoading(true);
      setError(null);

      if (view === 'edit' && selectedMethod) {
        const methodIdNum = toMethodIdNumber(selectedMethod.id);

        if (!Number.isFinite(methodIdNum)) {
          setError('Payment method id is not numeric, cannot update.');
          return;
        }

        await PaymentMethodsService.update(clubId, methodIdNum, {
          ...data,
          id: selectedMethod.id,
        } as any);
      } else {
        await PaymentMethodsService.create(clubId, data as any);
      }

      await loadMethods();
      setView('list');
      setSelectedMethod(null);
    } catch (err: any) {
      console.error('Failed to save payment method:', err);
      setError(err?.message || 'Failed to save payment method');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (methodIdStr: string) => {
    const methodIdNum = toMethodIdNumber(methodIdStr);

    if (!Number.isFinite(methodIdNum)) {
      setError('Payment method id is not numeric, cannot delete.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await PaymentMethodsService.delete(clubId, methodIdNum);
      await loadMethods();
      setDeleteConfirm(null);
    } catch (err: any) {
      console.error('Failed to delete payment method:', err);
      setError(err?.message || 'Failed to delete payment method');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setView('list');
    setSelectedMethod(null);
    setError(null);
  };

  const title =
    view === 'list'
      ? 'Payment Methods'
      : view === 'add_manual'
        ? 'Add Manual Payment Method'
        : view === 'add_solana'
          ? 'Add Solana Wallet'
          : 'Edit Payment Method';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-100">
              <CreditCard className="h-5 w-5 text-indigo-600" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-600">
                {view === 'list'
                  ? 'Set up the payment methods this club can use for events.'
                  : 'Configure the details players and admins will use.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />

            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>

            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {view === 'list' ? (
            <div className="space-y-6">
        

              {/* Disabled Toggle */}
              <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Disabled payment methods
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Disabled methods are hidden by default.
                    {hiddenDisabledCount > 0 &&
                      ` ${hiddenDisabledCount} disabled method${
                        hiddenDisabledCount === 1 ? '' : 's'
                      } hidden.`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowDisabledMethods((previousValue) => !previousValue)
                  }
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                    showDisabledMethods
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {showDisabledMethods ? (
                    <>
                      <EyeOff className="h-4 w-4" />
                      Hide disabled
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      Show disabled
                    </>
                  )}
                </button>
              </div>

              {/* Stripe Connect Card */}
              {showStripeCard && (
                <section className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                    Card payments
                  </h3>

                  <div
                    className={`p-4 rounded-lg border ${
                      stripeMethod && !stripeEnabled
                        ? 'border-gray-200 bg-gray-50 opacity-70'
                        : 'border-indigo-200 bg-indigo-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">
                            Card payments via Stripe
                          </h3>

                          {!stripeMethod ? (
                            <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded">
                              Not connected
                            </span>
                          ) : !stripeEnabled ? (
                            <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded">
                              Disabled
                            </span>
                          ) : stripeReady ? (
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded">
                              Connected
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                              Setup incomplete
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-700 mt-1">
                          Let players pay by card. These payments are verified
                          through Stripe and funds go directly to the club’s
                          connected Stripe account.
                        </p>

                        {stripeStatusMsg && (
                          <p className="text-xs text-gray-700 mt-2">
                            {stripeStatusMsg}
                          </p>
                        )}

                        {stripeConnect?.accountId && (
                          <p className="text-xs text-gray-600 mt-2">
                            Account:{' '}
                            <span className="font-mono">
                              {stripeConnect.accountId}
                            </span>
                          </p>
                        )}

                        {stripeMethod && stripeReady && stripeEnabled && (
                          <p className="text-xs text-green-700 mt-2 font-medium flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Ready to take card payments
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {!stripeReady ? (
                          <button
                            type="button"
                            onClick={handleStripeConnect}
                            disabled={stripeBusy}
                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {stripeMethod
                              ? 'Continue Stripe setup'
                              : 'Connect Stripe'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={refreshStripeStatus}
                            disabled={stripeBusy}
                            className="px-4 py-2 bg-white border border-indigo-300 text-indigo-700 text-sm font-semibold rounded-lg hover:bg-indigo-100 disabled:opacity-50"
                            title="Re-check Stripe connection"
                          >
                            Refresh status
                          </button>
                        )}

                        {stripeMethod && (
                          <button
                            type="button"
                            onClick={() => setStripeEnabled(!stripeEnabled)}
                            disabled={stripeBusy}
                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-100 disabled:opacity-50"
                          >
                            {stripeEnabled
                              ? 'Disable card payments'
                              : 'Enable card payments'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* On-the-night payments */}
<section className="space-y-3">
  <div>
    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
      On-the-night payments
    </h3>
    <p className="text-xs text-gray-500">
      These enable the “Pay at the Door” option for players joining on the night.
      They are not shown as public ticket-sale methods.
    </p>
  </div>

  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
        cashMethod?.isEnabled
          ? 'border-emerald-300 bg-emerald-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <input
        type="checkbox"
        checked={!!cashMethod?.isEnabled}
        disabled={loading}
        onChange={(event) =>
          handleTogglePayAtDoorMethod('cash', event.target.checked)
        }
        className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
      />

      <div>
        <p className="text-sm font-semibold text-gray-900">
          Enable cash on the night payments
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Lets players join as unpaid and pay the host/admin in cash.
        </p>
      </div>
    </label>

    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
        cardTapMethod?.isEnabled
          ? 'border-emerald-300 bg-emerald-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <input
        type="checkbox"
        checked={!!cardTapMethod?.isEnabled}
        disabled={loading}
        onChange={(event) =>
          handleTogglePayAtDoorMethod('card_tap', event.target.checked)
        }
        className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
      />

      <div>
        <p className="text-sm font-semibold text-gray-900">
          Enable CardTap on the night payments
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Lets players join as unpaid and pay by card tap with the host/admin.
        </p>
      </div>
    </label>
  </div>
</section>

              {/* Manual Payments */}
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                      Manual payments
                    </h3>
                    <p className="text-xs text-gray-500">
                      Cash, Revolut, Monzo, bank transfer and ZippyPay methods
                      that require host/admin confirmation.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddManual}
                    className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-indigo-300 rounded-lg text-indigo-600 text-sm font-semibold hover:bg-indigo-50 hover:border-indigo-400 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Manual Method
                  </button>
                </div>

                {!loadingList && manualMethods.length === 0 && (
                  <div className="text-center py-8 rounded-lg border border-dashed border-gray-300">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                      <Banknote className="h-6 w-6 text-gray-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">
                      No manual payment methods shown
                    </h3>
                    <p className="text-sm text-gray-600">
                      Add cash, Revolut, Monzo, bank transfer or ZippyPay.
                      {!showDisabledMethods && hiddenDisabledCount > 0
                        ? ' Disabled methods are currently hidden.'
                        : ''}
                    </p>
                  </div>
                )}

                {!loadingList &&
                  manualMethods.map((method) => (
                    <PaymentMethodCard
                      key={method.id}
                      method={method}
                      loading={loading}
                      deleteConfirm={deleteConfirm}
                      onEdit={handleEdit}
                      onAskDelete={setDeleteConfirm}
                      onDelete={handleDelete}
                      onCancelDelete={() => setDeleteConfirm(null)}
                    />
                  ))}
              </section>

              {/* Crypto Wallets */}
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                      Crypto payments
                    </h3>
                    <p className="text-xs text-gray-500">
                      Verified crypto payment methods. Current setup supports
                      Solana wallet payments.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddSolana}
                    className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-purple-300 rounded-lg text-purple-700 text-sm font-semibold hover:bg-purple-50 hover:border-purple-400 transition-colors"
                  >
                    <Wallet className="h-4 w-4" />
                    Add Solana Wallet
                  </button>
                </div>

                {!loadingList && cryptoMethods.length === 0 && (
                  <div className="text-center py-8 rounded-lg border border-dashed border-gray-300">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                      <Wallet className="h-6 w-6 text-gray-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">
                      No crypto payment methods shown
                    </h3>
                    <p className="text-sm text-gray-600">
                      Add a Solana wallet to support crypto payments.
                      {!showDisabledMethods && hiddenDisabledCount > 0
                        ? ' Disabled methods are currently hidden.'
                        : ''}
                    </p>
                  </div>
                )}

                {!loadingList &&
                  cryptoMethods.map((method) => (
                    <PaymentMethodCard
                      key={method.id}
                      method={method}
                      loading={loading}
                      deleteConfirm={deleteConfirm}
                      onEdit={handleEdit}
                      onAskDelete={setDeleteConfirm}
                      onDelete={handleDelete}
                      onCancelDelete={() => setDeleteConfirm(null)}
                    />
                  ))}
              </section>

              {/* Other Methods */}
              {!loadingList && otherMethods.length > 0 && (
                <section className="space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                      Other payment methods
                    </h3>
                    <p className="text-xs text-gray-500">
                      Existing methods that do not fit the standard groups.
                    </p>
                  </div>

                  {otherMethods.map((method) => (
                    <PaymentMethodCard
                      key={method.id}
                      method={method}
                      loading={loading}
                      deleteConfirm={deleteConfirm}
                      onEdit={handleEdit}
                      onAskDelete={setDeleteConfirm}
                      onDelete={handleDelete}
                      onCancelDelete={() => setDeleteConfirm(null)}
                    />
                  ))}
                </section>
              )}

              {/* Loading State */}
              {loadingList && (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                  <p className="mt-2 text-sm text-gray-600">
                    Loading payment methods...
                  </p>
                </div>
              )}
            </div>
          ) : (
            <PaymentMethodForm
              method={selectedMethod}
              defaultMethodCategory={
                view === 'add_solana' ? 'crypto' : 'instant_payment'
              }
              defaultProviderName={
                view === 'add_solana' ? 'solana_wallet' : null
              }
              onSave={handleSave}
              onCancel={handleCancel}
              loading={loading}
            />
          )}
        </div>

        {view === 'list' && (
          <div className="p-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}