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
  Unlink,
  Clock,
  RefreshCw,
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
      playerInstructions: 'Pay by card tap to the host or club admin on the night.',
      methodConfig: {
        verificationMode: 'manual',
        collectionInstructions: 'CardTap payment collected by host/admin on the night.',
      },
      displayOrder: 1,
    };
  }
  return {
    methodLabel: 'Cash on the night',
    playerInstructions: 'Pay cash to the host or club admin on the night.',
    methodConfig: {
      verificationMode: 'manual',
      collectionInstructions: 'Cash payment collected by host/admin on the night.',
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
  if (method.methodCategory === 'stripe' || method.methodCategory === 'card') return 'Auto verified';
  if (method.methodCategory === 'crypto') {
    return config.verificationMode === 'manual' ? 'Manual crypto check' : 'Crypto verified';
  }
  if (method.methodCategory === 'instant_payment') return 'Manual confirmation';
  return 'Verification depends on setup';
}

function getAccountLabel(method: ClubPaymentMethodWithMeta) {
  return method.isOfficialClubAccount ? 'Official club account' : 'Member personal account';
}

function filterVisibleMethods(methods: ClubPaymentMethodWithMeta[], showDisabled: boolean) {
  if (showDisabled) return methods;
  return methods.filter((m) => m.isEnabled);
}

function formatDate(isoString: string) {
  try {
    return new Date(isoString).toLocaleDateString('en-IE', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

function PaymentMethodCard({
  method, loading, deleteConfirm, onEdit, onAskDelete, onDelete, onCancelDelete,
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
    <div className={`p-4 rounded-lg border transition-all ${method.isEnabled ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-70'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-gray-900 truncate">{method.methodLabel}</h3>
            {!method.isEnabled && (
              <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-semibold rounded">Disabled</span>
            )}
            {method.isOfficialClubAccount
              ? <span title="Official club account"><Building2 className="h-4 w-4 text-indigo-600" /></span>
              : <span title="Member personal account"><User className="h-4 w-4 text-orange-600" /></span>}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
            <span className="px-2 py-1 bg-gray-100 rounded font-medium capitalize">{formatCategoryName(method.methodCategory)}</span>
            {method.providerName && (
              <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded font-medium capitalize">{formatProviderName(method.providerName)}</span>
            )}
            <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded font-medium">{getVerificationLabel(method)}</span>
            <span className={`px-2 py-1 rounded font-medium ${method.isOfficialClubAccount ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
              {getAccountLabel(method)}
            </span>
          </div>
          {method.playerInstructions && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{method.playerInstructions}</p>}
          {method.methodCategory === 'crypto' && method.providerName === 'solana_wallet' && config.walletAddress && (
            <p className="text-xs text-gray-500 mt-2 font-mono break-all">{config.walletAddress}</p>
          )}
          {method.providerName === 'cash' && (
            <p className="text-xs text-amber-700 mt-2">Cash payments must be confirmed manually by the host/admin.</p>
          )}
          {method.addedBy && (
            <p className="text-xs text-gray-500 mt-2">
              Added by: {method.addedBy}{method.editedBy && ` • Last edited by: ${method.editedBy}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button type="button" onClick={() => onEdit(method)} disabled={loading}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors disabled:opacity-50" title="Edit">
            <Edit className="h-4 w-4 text-gray-700" />
          </button>
          {deleteConfirm === methodId ? (
            <>
              <button type="button" onClick={() => onDelete(methodId)} disabled={loading}
                className="px-3 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
                Confirm
              </button>
              <button type="button" onClick={onCancelDelete} disabled={loading}
                className="px-3 py-2 bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50">
                Cancel
              </button>
            </>
          ) : (
            <button type="button" onClick={() => onAskDelete(methodId)} disabled={loading}
              className="p-2 rounded-lg border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50" title="Delete">
              <Trash2 className="h-4 w-4 text-red-600" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface StripeHistory {
  hasHistory:     boolean;
  accountId:      string | null;
  disconnectedAt: string | null;
  disconnectedBy: string | null;
}

export default function ManagePaymentMethodsModal({ clubId, onClose }: ManagePaymentMethodsModalProps) {
  const [view, setView] = useState<View>('list');
  const [methods, setMethods] = useState<ClubPaymentMethodWithMeta[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<ClubPaymentMethodWithMeta | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showDisabledMethods, setShowDisabledMethods] = useState(false);

  const [stripeBusy, setStripeBusy] = useState(false);
  const [stripeStatusMsg, setStripeStatusMsg] = useState<string | null>(null);
  const [disconnectConfirm, setDisconnectConfirm] = useState(false);
  const [disableConfirm, setDisableConfirm] = useState(false);

  // History — most recent stripe row including disconnected ones, for display only
  const [stripeHistory, setStripeHistory] = useState<StripeHistory | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // ─── Loaders ────────────────────────────────────────────────────────────────

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

  const loadStripeHistory = async () => {
    try {
      setLoadingHistory(true);
      const history = await StripeConnectService.getHistory();
      if (history?.ok) {
        setStripeHistory(history);
      } else {
        setStripeHistory(null);
      }
    } catch (err) {
      console.warn('Failed to load Stripe history:', err);
      setStripeHistory(null);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadMethods();
    loadStripeHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  // Handle return from Stripe onboarding
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeParam = params.get('stripe');
    if (!stripeParam || (stripeParam !== 'return' && stripeParam !== 'refresh')) return;

    const handleStripeReturn = async () => {
      try {
        setStripeBusy(true);
        setStripeStatusMsg('Checking Stripe connection…');
        const status = await StripeConnectService.getStatus();

        if (!status?.ok) {
          setStripeStatusMsg(null);
          setError(status?.message || status?.error || 'Failed to verify Stripe status');
          return;
        }

        await Promise.all([loadMethods(), loadStripeHistory()]);

        const ready = !!(status.detailsSubmitted && status.chargesEnabled && status.payoutsEnabled);
        setStripeStatusMsg(
          ready
            ? 'Stripe connected ✅'
            : 'Stripe setup incomplete — charges, payouts or details not yet confirmed by Stripe'
        );

        params.delete('stripe');
        const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash || ''}`;
        window.history.replaceState({}, '', newUrl);
      } catch (err: any) {
        setError(err?.message || 'Stripe return handling failed');
      } finally {
        setStripeBusy(false);
        window.setTimeout(() => setStripeStatusMsg(null), 6000);
      }
    };

    void handleStripeReturn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Derived lists ───────────────────────────────────────────────────────────

  const stripeMethod = useMemo(
    () => methods.find((m) => m.methodCategory === 'stripe' || m.methodCategory === 'card') || null,
    [methods]
  );
  const cashMethod    = useMemo(() => methods.find((m) => m.methodCategory === 'instant_payment' && m.providerName === 'cash')     || null, [methods]);
  const cardTapMethod = useMemo(() => methods.find((m) => m.methodCategory === 'instant_payment' && m.providerName === 'card_tap') || null, [methods]);

  const allManualMethods = useMemo(() => methods.filter((m) => m.methodCategory === 'instant_payment' && !isPayAtDoorMethod(m)), [methods]);
  const allCryptoMethods = useMemo(() => methods.filter((m) => m.methodCategory === 'crypto'), [methods]);
  const allOtherMethods  = useMemo(() => methods.filter((m) => !['instant_payment','crypto','stripe','card'].includes(m.methodCategory)), [methods]);

  const manualMethods = useMemo(() => filterVisibleMethods(allManualMethods, showDisabledMethods), [allManualMethods, showDisabledMethods]);
  const cryptoMethods = useMemo(() => filterVisibleMethods(allCryptoMethods, showDisabledMethods), [allCryptoMethods, showDisabledMethods]);
  const otherMethods  = useMemo(() => filterVisibleMethods(allOtherMethods,  showDisabledMethods), [allOtherMethods,  showDisabledMethods]);

  const hiddenDisabledCount = useMemo(
    () => (showDisabledMethods ? 0 : methods.filter((m) => !m.isEnabled).length),
    [methods, showDisabledMethods]
  );

  // ─── Stripe derived state ────────────────────────────────────────────────────

  const stripeConnect = useMemo(() => {
    const config: any = stripeMethod?.methodConfig || {};
    return config?.connect || null;
  }, [stripeMethod]);

  // All three Stripe flags must be true — mirrors backend getReadyStripeForClub
  const stripeReady = !!(
    stripeConnect?.detailsSubmitted &&
    stripeConnect?.chargesEnabled &&
    stripeConnect?.payoutsEnabled
  );

  // Admin's manual enable/disable toggle — only meaningful when stripeReady
  const stripeEnabled = !!stripeMethod?.isEnabled;

  // True when the stripe row has been disconnected.
  // Check disconnectedAt directly on stripeConnect — we cannot rely on stripeMethod
  // being null because getAllForManagement returns disabled rows too, so stripeMethod
  // is never null even after disconnect.
  const wasDisconnected = !!(stripeConnect?.disconnectedAt) || (!stripeMethod && !loadingHistory && !!stripeHistory?.disconnectedAt);

  const showStripeCard = wasDisconnected || showDisabledMethods || !stripeMethod || stripeEnabled || !stripeReady;

  // ─── Stripe actions ──────────────────────────────────────────────────────────

  const handleStripeConnect = async () => {
    try {
      setStripeBusy(true);
      setError(null);
      setStripeStatusMsg(null);
      const response = await StripeConnectService.startConnect(window.location.origin);
      if (!response?.ok || !response.url) {
        setError(response?.message || response?.error || 'Failed to start Stripe Connect');
        return;
      }
      window.location.href = response.url;
    } catch (err: any) {
      setError(err?.message || 'Stripe Connect start failed');
    } finally {
      setStripeBusy(false);
    }
  };

 // ManagePaymentMethodsModal.tsx — update the handler
const handleStripeReconnect = async () => {
  try {
    setStripeBusy(true);
    setError(null);

    const response = await StripeConnectService.reconnect();

    if (!response?.ok) {
      setError(response?.error || 'Failed to reconnect Stripe');
      return;
    }

    if (response.ready) {
      // Account still fully set up — just reload, no Stripe visit needed
      await Promise.all([loadMethods(), loadStripeHistory()]);
      setStripeStatusMsg('Stripe reconnected ✅');
      window.setTimeout(() => setStripeStatusMsg(null), 4000);
    } else if (response.url) {
      // Account needs re-onboarding
      window.location.href = response.url;
    }
  } catch (err: any) {
    setError(err?.message || 'Failed to reconnect Stripe');
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
        setError(status?.message || status?.error || 'Failed to refresh Stripe status');
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
    if (!Number.isFinite(methodIdNum)) { setError('Stripe method id is not numeric.'); return; }
    try {
      setStripeBusy(true);
      setError(null);
      await PaymentMethodsService.update(clubId, methodIdNum, {
        methodCategory:        stripeMethod.methodCategory,
        providerName:          stripeMethod.providerName || 'stripe',
        methodLabel:           stripeMethod.methodLabel,
        playerInstructions:    stripeMethod.playerInstructions || '',
        methodConfig:          stripeMethod.methodConfig || {},
        isEnabled:             enabled,
        displayOrder:          stripeMethod.displayOrder ?? 0,
        isOfficialClubAccount: !!stripeMethod.isOfficialClubAccount,
      } as any);
      await loadMethods();
    } catch (err: any) {
      setError(err?.message || 'Failed to update Stripe enabled state');
    } finally {
      setStripeBusy(false);
    }
  };

  const handleStripeDisconnect = async () => {
    try {
      setStripeBusy(true);
      setError(null);
      const response = await StripeConnectService.disconnect();
      if (!response?.ok) {
        setError(response?.error || 'Failed to disconnect Stripe');
        return;
      }
      setDisconnectConfirm(false);
      // Reload both — active methods list and history panel
      await Promise.all([loadMethods(), loadStripeHistory()]);
    } catch (err: any) {
      setError(err?.message || 'Failed to disconnect Stripe');
    } finally {
      setStripeBusy(false);
    }
  };

  // ─── Pay-at-door toggles ────────────────────────────────────────────────────

  const handleTogglePayAtDoorMethod = async (providerName: PayAtDoorProvider, enabled: boolean) => {
    const existingMethod = providerName === 'cash' ? cashMethod : cardTapMethod;
    if (!enabled && !existingMethod) return;
    const defaults = getPayAtDoorDefaults(providerName);
    try {
      setLoading(true);
      setError(null);
      if (existingMethod) {
        const methodIdNum = toMethodIdNumber(existingMethod.id);
        if (!Number.isFinite(methodIdNum)) { setError('Payment method id is not numeric.'); return; }
        await PaymentMethodsService.update(clubId, methodIdNum, {
          methodCategory: 'instant_payment', providerName,
          methodLabel:           existingMethod.methodLabel           || defaults.methodLabel,
          playerInstructions:    existingMethod.playerInstructions    || defaults.playerInstructions,
          methodConfig:          existingMethod.methodConfig          || defaults.methodConfig,
          isEnabled: enabled,
          displayOrder:          existingMethod.displayOrder          ?? defaults.displayOrder,
          isOfficialClubAccount: false,
        } as any);
      } else {
        await PaymentMethodsService.create(clubId, {
          methodCategory: 'instant_payment', providerName,
          methodLabel:           defaults.methodLabel,
          playerInstructions:    defaults.playerInstructions,
          methodConfig:          defaults.methodConfig,
          isEnabled:             true,
          displayOrder:          defaults.displayOrder,
          isOfficialClubAccount: false,
        } as any);
      }
      await loadMethods();
    } catch (err: any) {
      setError(err?.message || 'Failed to update on-the-night payment method');
    } finally {
      setLoading(false);
    }
  };

  // ─── Form actions ────────────────────────────────────────────────────────────

  const handleAddManual  = () => { setSelectedMethod(null); setError(null); setView('add_manual'); };
  const handleAddSolana  = () => { setSelectedMethod(null); setError(null); setView('add_solana'); };
  const handleEdit = (m: ClubPaymentMethodWithMeta) => { setSelectedMethod(m); setError(null); setView('edit'); };

  const handleSave = async (data: PaymentMethodFormData) => {
    try {
      setLoading(true);
      setError(null);
      if (view === 'edit' && selectedMethod) {
        const methodIdNum = toMethodIdNumber(selectedMethod.id);
        if (!Number.isFinite(methodIdNum)) { setError('Payment method id is not numeric.'); return; }
        await PaymentMethodsService.update(clubId, methodIdNum, { ...data, id: selectedMethod.id } as any);
      } else {
        await PaymentMethodsService.create(clubId, data as any);
      }
      await loadMethods();
      setView('list');
      setSelectedMethod(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to save payment method');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (methodIdStr: string) => {
    const methodIdNum = toMethodIdNumber(methodIdStr);
    if (!Number.isFinite(methodIdNum)) { setError('Payment method id is not numeric.'); return; }
    try {
      setLoading(true);
      setError(null);
      await PaymentMethodsService.delete(clubId, methodIdNum);
      await loadMethods();
      setDeleteConfirm(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete payment method');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => { setView('list'); setSelectedMethod(null); setError(null); };

  // ─── Stripe sub-components ───────────────────────────────────────────────────

  function StripeStatusBadge() {
    if (!stripeMethod) {
      if (wasDisconnected) return <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-semibold rounded">Disconnected</span>;
      return <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded">Not connected</span>;
    }
    if (!stripeReady)   return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">Setup incomplete</span>;
    if (!stripeEnabled) return <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-semibold rounded">Disabled</span>;
    return <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded">Connected</span>;
  }

  function StripeIncompleteHint() {
    if (!stripeMethod || stripeReady) return null;
    const missing: string[] = [];
    if (!stripeConnect?.detailsSubmitted) missing.push('business details');
    if (!stripeConnect?.chargesEnabled)   missing.push('charges');
    if (!stripeConnect?.payoutsEnabled)   missing.push('payouts');
    if (missing.length === 0) return null;
    return (
      <p className="text-xs text-yellow-700 mt-2">
        Still waiting on Stripe to enable: <strong>{missing.join(', ')}</strong>.
        Complete onboarding or contact Stripe support if this persists.
      </p>
    );
  }

  /**
   * Shown when the active Stripe row is gone (filtered out by disconnectedAt)
   * but history shows a previous account. Gives the admin two options:
   *   1. Reconnect the same account — reactivates the archived row
   *   2. Connect a new account — inserts a fresh row
   */
  function DisconnectedHistoryPanel() {
    if (!wasDisconnected) return null;

    // Prefer data from stripeConnect (already loaded in stripeMethod row)
    // Fall back to stripeHistory for when stripeMethod is null
    const accountId      = stripeConnect?.accountId      || stripeHistory?.accountId      || null;
    const disconnectedAt = stripeConnect?.disconnectedAt || stripeHistory?.disconnectedAt || null;
    const disconnectedBy = stripeConnect?.disconnectedBy || stripeHistory?.disconnectedBy || null;

    return (
      <div className="mt-3 p-3 rounded-lg border border-gray-200 bg-gray-50 space-y-2">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
          <p className="text-xs font-semibold text-gray-700">Previously connected account</p>
        </div>

        {accountId && (
          <p className="text-xs text-gray-600">
            Account: <span className="font-mono">{accountId}</span>
          </p>
        )}

        {disconnectedAt && (
          <p className="text-xs text-gray-500">
            Disconnected {formatDate(disconnectedAt)}
            {disconnectedBy && ` by ${disconnectedBy}`}
          </p>
        )}

        <p className="text-xs text-gray-500">
          Payment history for this account is preserved. You can reconnect the same
          account or link a completely new one.
        </p>

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={handleStripeReconnect}
            disabled={stripeBusy}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reconnect {accountId}
          </button>

          <button
            type="button"
            onClick={handleStripeConnect}
            disabled={stripeBusy}
            className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            Connect a different account
          </button>
        </div>
      </div>
    );
  }

  const title =
    view === 'list'        ? 'Payment Methods'
    : view === 'add_manual'  ? 'Add Manual Payment Method'
    : view === 'add_solana'  ? 'Add Solana Wallet'
    : 'Edit Payment Method';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(16,37,50,0.55)', backdropFilter: 'blur(2px)' }}>
      <div className="flex flex-col w-full max-w-3xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden"
        style={{ background: '#ffffff' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '3px solid #157f85', background: '#ffffff' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0"
              style={{ background: 'rgba(21,127,133,0.12)', color: '#157f85' }}>
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#102532' }}>{title}</h2>
              <p className="text-xs mt-0.5" style={{ color: '#52636f' }}>
                {view === 'list' ? 'Set up the payment methods this club can use for events.' : 'Configure the details players and admins will use.'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-gray-100"
            style={{ color: '#8a9bab' }}>
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
        <div className="flex-1 overflow-y-auto p-6" style={{ background: '#f6f1e8' }}>
          {view === 'list' ? (
            <div className="space-y-4">

              {/* Show/hide disabled toggle */}
              <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                style={{ background: '#ffffff', border: '1px solid #dce1df' }}>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Disabled payment methods</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Disabled methods are hidden by default.
                    {hiddenDisabledCount > 0 && ` ${hiddenDisabledCount} disabled method${hiddenDisabledCount === 1 ? '' : 's'} hidden.`}
                  </p>
                </div>
                <button type="button" onClick={() => setShowDisabledMethods((p) => !p)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                    showDisabledMethods ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'}`}>
                  {showDisabledMethods ? <><EyeOff className="h-4 w-4" />Hide disabled</> : <><Eye className="h-4 w-4" />Show disabled</>}
                </button>
              </div>

              {/* ── Stripe Connect Card ──────────────────────────────────────── */}
              {showStripeCard && (
                <section className="rounded-xl p-4 space-y-3" style={{ background: '#ffffff', border: '1px solid #dce1df' }}>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Card payments</h3>

                  <div className={`p-4 rounded-lg border ${stripeMethod && !stripeEnabled ? 'border-gray-200 bg-gray-50 opacity-70' : 'border-indigo-200 bg-indigo-50'}`}>
                    <div className="flex items-start justify-between gap-4">

                      {/* Left — info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">Card payments via Stripe</h3>
                          <StripeStatusBadge />
                        </div>

                        <p className="text-sm text-gray-700 mt-1">
                          Let players pay by card. Payments are verified through Stripe and funds go directly to the club's connected Stripe account.
                        </p>

                        {/* History panel — shown after disconnect */}
                        <DisconnectedHistoryPanel />

                        {/* Which flags are still pending */}
                        <StripeIncompleteHint />

                        {stripeStatusMsg && <p className="text-xs text-gray-700 mt-2">{stripeStatusMsg}</p>}

                        {stripeConnect?.accountId && !wasDisconnected && (
                          <p className="text-xs text-gray-600 mt-2">
                            Account: <span className="font-mono">{stripeConnect.accountId}</span>
                          </p>
                        )}

                        {stripeMethod && stripeReady && stripeEnabled && (
                          <p className="text-xs text-green-700 mt-2 font-medium flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Ready to take card payments
                          </p>
                        )}
                      </div>

                      {/* Right — action buttons (hidden when showing history panel) */}
                      {!wasDisconnected && (
                        <div className="flex flex-col gap-2 flex-shrink-0 min-w-[164px]">

                          {/* Connect / Continue setup */}
                          {!stripeReady && (
                            <button type="button" onClick={handleStripeConnect} disabled={stripeBusy}
                              className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                              {stripeMethod ? 'Continue setup' : 'Connect Stripe'}
                            </button>
                          )}

                          {/* Refresh — only when fully ready */}
                          {stripeMethod && stripeReady && (
                            <button type="button" onClick={refreshStripeStatus} disabled={stripeBusy}
                              className="px-4 py-2 bg-white border border-indigo-300 text-indigo-700 text-sm font-semibold rounded-lg hover:bg-indigo-100 disabled:opacity-50">
                              Refresh status
                            </button>
                          )}

                          {/* Enable / Disable — only when fully ready */}
                          {stripeMethod && stripeReady && (
                            stripeEnabled ? (
                              disableConfirm ? (
                                <div className="flex flex-col gap-1 rounded-lg border border-orange-200 bg-orange-50 p-2">
                                  <p className="text-xs text-orange-800 font-semibold text-center">Disable card payments?</p>
                                  <p className="text-xs text-orange-700 text-center mb-1">Players won't be able to pay by card until you re-enable this.</p>
                                  <button type="button" disabled={stripeBusy}
                                    onClick={async () => { await setStripeEnabled(false); setDisableConfirm(false); }}
                                    className="px-4 py-2 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 disabled:opacity-50">
                                    Yes, disable
                                  </button>
                                  <button type="button" onClick={() => setDisableConfirm(false)} disabled={stripeBusy}
                                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-100 disabled:opacity-50">
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button type="button" onClick={() => setDisableConfirm(true)} disabled={stripeBusy}
                                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-100 disabled:opacity-50">
                                  Disable card payments
                                </button>
                              )
                            ) : (
                              <button type="button" onClick={() => setStripeEnabled(true)} disabled={stripeBusy}
                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-100 disabled:opacity-50">
                                Enable card payments
                              </button>
                            )
                          )}

                          {/* Disconnect — only when an active row exists */}
                          {stripeMethod && (
                            disconnectConfirm ? (
                              <div className="flex flex-col gap-1 rounded-lg border border-red-200 bg-red-50 p-2">
                                <p className="text-xs text-red-700 font-semibold text-center">Disconnect this Stripe account?</p>
                                <p className="text-xs text-red-600 text-center mb-1">Payment history is preserved. You can reconnect afterwards.</p>
                                <button type="button" onClick={handleStripeDisconnect} disabled={stripeBusy}
                                  className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50">
                                  Yes, disconnect
                                </button>
                                <button type="button" onClick={() => setDisconnectConfirm(false)} disabled={stripeBusy}
                                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-100 disabled:opacity-50">
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => setDisconnectConfirm(true)} disabled={stripeBusy}
                                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-red-300 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-50 disabled:opacity-50">
                                <Unlink className="h-3.5 w-3.5" />
                                Disconnect
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* ── At the door ─────────────────────────────────────────────── */}
              <section className="rounded-xl p-4 space-y-3" style={{ background: '#ffffff', border: '1px solid #dce1df' }}>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">At the door payment methods</h3>
                  <p className="text-xs text-gray-500">These enable the "Pay at the Door" option. They are not shown as advanced public ticket-sale methods.</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${cashMethod?.isEnabled ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <input type="checkbox" checked={!!cashMethod?.isEnabled} disabled={loading}
                      onChange={(e) => handleTogglePayAtDoorMethod('cash', e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Enable cash on the night</p>
                      <p className="mt-1 text-xs text-gray-500">Lets players join as unpaid and pay the host/admin in cash.</p>
                    </div>
                  </label>
                  <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${cardTapMethod?.isEnabled ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <input type="checkbox" checked={!!cardTapMethod?.isEnabled} disabled={loading}
                      onChange={(e) => handleTogglePayAtDoorMethod('card_tap', e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Enable CardTap on the night</p>
                      <p className="mt-1 text-xs text-gray-500">Lets players join as unpaid and pay by card tap with the host/admin.</p>
                    </div>
                  </label>
                </div>
              </section>

              {/* ── Manual payments ─────────────────────────────────────────── */}
              <section className="rounded-xl p-4 space-y-3" style={{ background: '#ffffff', border: '1px solid #dce1df' }}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Manual payments</h3>
                    <p className="text-xs text-gray-500">Cash, Revolut, Monzo, bank transfer and ZippyPay methods that require host/admin confirmation.</p>
                  </div>
                  <button type="button" onClick={handleAddManual}
                    className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-indigo-300 rounded-lg text-indigo-600 text-sm font-semibold hover:bg-indigo-50 hover:border-indigo-400 transition-colors">
                    <Plus className="h-4 w-4" />Add Manual Method
                  </button>
                </div>
                {!loadingList && manualMethods.length === 0 && (
                  <div className="text-center py-8 rounded-lg border border-dashed border-gray-300">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                      <Banknote className="h-6 w-6 text-gray-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">No manual payment methods shown</h3>
                    <p className="text-sm text-gray-600">
                      Add cash, Revolut, Monzo, bank transfer or ZippyPay.
                      {!showDisabledMethods && hiddenDisabledCount > 0 ? ' Disabled methods are currently hidden.' : ''}
                    </p>
                  </div>
                )}
                {!loadingList && manualMethods.map((method) => (
                  <PaymentMethodCard key={method.id} method={method} loading={loading} deleteConfirm={deleteConfirm}
                    onEdit={handleEdit} onAskDelete={setDeleteConfirm} onDelete={handleDelete} onCancelDelete={() => setDeleteConfirm(null)} />
                ))}
              </section>

              {/* ── Crypto wallets ───────────────────────────────────────────── */}
              <section className="rounded-xl p-4 space-y-3" style={{ background: '#ffffff', border: '1px solid #dce1df' }}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Crypto payments</h3>
                    <p className="text-xs text-gray-500">Verified crypto payment methods. Current setup supports Solana wallet payments.</p>
                  </div>
                  <button type="button" onClick={handleAddSolana}
                    className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-purple-300 rounded-lg text-purple-700 text-sm font-semibold hover:bg-purple-50 hover:border-purple-400 transition-colors">
                    <Wallet className="h-4 w-4" />Add Solana Wallet
                  </button>
                </div>
                {!loadingList && cryptoMethods.length === 0 && (
                  <div className="text-center py-8 rounded-lg border border-dashed border-gray-300">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                      <Wallet className="h-6 w-6 text-gray-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">No crypto payment methods shown</h3>
                    <p className="text-sm text-gray-600">
                      Add a Solana wallet to support crypto payments.
                      {!showDisabledMethods && hiddenDisabledCount > 0 ? ' Disabled methods are currently hidden.' : ''}
                    </p>
                  </div>
                )}
                {!loadingList && cryptoMethods.map((method) => (
                  <PaymentMethodCard key={method.id} method={method} loading={loading} deleteConfirm={deleteConfirm}
                    onEdit={handleEdit} onAskDelete={setDeleteConfirm} onDelete={handleDelete} onCancelDelete={() => setDeleteConfirm(null)} />
                ))}
              </section>

              {/* ── Other methods ────────────────────────────────────────────── */}
              {!loadingList && otherMethods.length > 0 && (
                <section className="rounded-xl p-4 space-y-3" style={{ background: '#ffffff', border: '1px solid #dce1df' }}>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Other payment methods</h3>
                    <p className="text-xs text-gray-500">Existing methods that do not fit the standard groups.</p>
                  </div>
                  {otherMethods.map((method) => (
                    <PaymentMethodCard key={method.id} method={method} loading={loading} deleteConfirm={deleteConfirm}
                      onEdit={handleEdit} onAskDelete={setDeleteConfirm} onDelete={handleDelete} onCancelDelete={() => setDeleteConfirm(null)} />
                  ))}
                </section>
              )}

              {loadingList && (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-t-transparent"
                    style={{ borderColor: '#157f85', borderTopColor: 'transparent' }} />
                  <p className="mt-2 text-sm text-gray-600">Loading payment methods...</p>
                </div>
              )}
            </div>
          ) : (
            <PaymentMethodForm
              method={selectedMethod}
              defaultMethodCategory={view === 'add_solana' ? 'crypto' : 'instant_payment'}
              defaultProviderName={view === 'add_solana' ? 'solana_wallet' : null}
              onSave={handleSave}
              onCancel={handleCancel}
              loading={loading}
            />
          )}
        </div>

        {view === 'list' && (
          <div className="flex items-center justify-end px-6 py-4 flex-shrink-0"
            style={{ borderTop: '1px solid #dce1df', background: '#fbf8f2' }}>
            <button type="button" onClick={onClose}
              className="rounded-lg border px-5 py-2 text-sm font-semibold transition hover:bg-gray-50"
              style={{ borderColor: '#dce1df', color: '#52636f' }}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}