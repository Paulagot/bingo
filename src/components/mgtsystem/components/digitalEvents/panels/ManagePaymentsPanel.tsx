// src/components/mgtsystem/components/drawer/QuizEventDrawer/panels/ManagePaymentsPanel.tsx
// Club-level payment methods management (Stripe, instant, crypto).
// This is a thin wrapper — the original ManagePaymentMethodsModal logic
// is preserved but stripped of its fixed-overlay wrapper.

import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, CreditCard, AlertCircle, Building2, User, Wallet } from 'lucide-react';
import PaymentMethodForm from '../../../modals/PaymentMethodForm';
import PaymentMethodsService from '../../../services/PaymentMethodsService';
import StripeConnectService from '../../../services/StripeConnectService';
import type {
  ClubPaymentMethodWithMeta,
  PaymentMethodFormData,
} from '../../../../../shared/types/paymentMethods';

type View = 'list' | 'add_instant' | 'add_solana' | 'edit';

function formatProvider(name?: string | null) {
  return name ? name.replace(/_/g, ' ') : '';
}

function MethodCard({
  method, loading, deleteConfirm, onEdit, onAskDelete, onDelete, onCancelDelete,
}: {
  method: ClubPaymentMethodWithMeta;
  loading: boolean;
  deleteConfirm: string | null;
  onEdit: (m: ClubPaymentMethodWithMeta) => void;
  onAskDelete: (id: string) => void;
  onDelete: (id: string) => void;
  onCancelDelete: () => void;
}) {
  const id = String(method.id);
  return (
    <div className={`rounded-lg border p-4 transition-all ${method.isEnabled ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate">{method.methodLabel}</h3>
            {!method.isEnabled && (
              <span className="rounded bg-gray-200 px-1.5 py-0.5 text-xs font-semibold text-gray-600">Disabled</span>
            )}
            {method.isOfficialClubAccount
              ? <span title="Official club account"><Building2 className="h-4 w-4 text-indigo-600" /></span>
              : <span title="Member account"><User className="h-4 w-4 text-orange-600" /></span>
            }
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-gray-600">
            <span className="rounded bg-gray-100 px-2 py-1 font-medium">{method.methodCategory.replace('_', ' ')}</span>
            {method.providerName && (
              <span className="rounded bg-indigo-50 px-2 py-1 font-medium text-indigo-700">{formatProvider(method.providerName)}</span>
            )}
          </div>
          {method.methodCategory === 'crypto' && method.providerName === 'solana_wallet' && (method.methodConfig as any)?.walletAddress && (
            <p className="mt-2 break-all font-mono text-xs text-gray-500">{(method.methodConfig as any).walletAddress}</p>
          )}
          {method.addedBy && (
            <p className="mt-2 text-xs text-gray-500">
              Added by: {method.addedBy}{method.editedBy && ` · Edited by: ${method.editedBy}`}
            </p>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <button onClick={() => onEdit(method)} disabled={loading} className="rounded-lg border border-gray-300 p-2 hover:bg-gray-100 disabled:opacity-50" title="Edit">
            <Edit className="h-4 w-4 text-gray-700" />
          </button>
          {deleteConfirm === id ? (
            <>
              <button onClick={() => onDelete(id)} disabled={loading} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">Confirm</button>
              <button onClick={onCancelDelete} disabled={loading} className="rounded-lg bg-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-300 disabled:opacity-50">Cancel</button>
            </>
          ) : (
            <button onClick={() => onAskDelete(id)} disabled={loading} className="rounded-lg border border-red-200 p-2 hover:bg-red-50 disabled:opacity-50" title="Delete">
              <Trash2 className="h-4 w-4 text-red-600" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface ManagePaymentsPanelProps {
  clubId: string;
  onClose: () => void;
}

export default function ManagePaymentsPanel({ clubId, onClose }: ManagePaymentsPanelProps) {
  const [view, setView] = useState<View>('list');
  const [methods, setMethods] = useState<ClubPaymentMethodWithMeta[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<ClubPaymentMethodWithMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [stripeBusy, setStripeBusy] = useState(false);
  const [stripeStatusMsg, setStripeStatusMsg] = useState<string | null>(null);
  const [stripeConnect, setStripeConnect] = useState<any>(null);

  useEffect(() => { loadMethods(); }, [clubId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeParam = params.get('stripe');
    if (!stripeParam) return;
    if (stripeParam === 'return' || stripeParam === 'refresh') {
      (async () => {
        try {
          setStripeBusy(true);
          setStripeStatusMsg('Checking Stripe connection…');
          const status = await StripeConnectService.getStatus();
          if (!status?.ok) { setError(status?.message || 'Failed to verify Stripe'); return; }
          await loadMethods();
          setStripeConnect(status);
        } catch (e: any) {
          setError(e.message || 'Stripe check failed');
        } finally {
          setStripeBusy(false);
          setStripeStatusMsg(null);
        }
      })();
    }
  }, []);

  const loadMethods = async () => {
    try {
      setLoadingList(true);
      const res = await PaymentMethodsService.getAllForManagement(clubId);
      setMethods(res.paymentMethods || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load payment methods');
    } finally {
      setLoadingList(false);
    }
  };

  const stripeMethod = useMemo(() => methods.find((m) => m.methodCategory === 'stripe'), [methods]);
  const instantMethods = useMemo(() => methods.filter((m) => m.methodCategory === 'instant_payment'), [methods]);
  const cryptoMethods = useMemo(() => methods.filter((m) => m.methodCategory === 'crypto'), [methods]);
  const stripeReady = !!(stripeConnect?.detailsSubmitted && stripeConnect?.chargesEnabled && stripeConnect?.payoutsEnabled);

  const handleEdit = (m: ClubPaymentMethodWithMeta) => { setSelectedMethod(m); setView('edit'); };
  const handleAddInstant = () => { setSelectedMethod(null); setView('add_instant'); };
  const handleAddSolana = () => { setSelectedMethod(null); setView('add_solana'); };
  const handleCancel = () => { setSelectedMethod(null); setView('list'); };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      await PaymentMethodsService.delete(clubId, Number(id));
      await loadMethods();
    } catch (e: any) {
      setError(e.message || 'Failed to delete');
    } finally {
      setLoading(false);
      setDeleteConfirm(null);
    }
  };

  const handleSave = async (data: PaymentMethodFormData) => {
    try {
      setLoading(true);
      if (selectedMethod) {
        await PaymentMethodsService.update(clubId, Number(selectedMethod.id), data);
      } else {
        await PaymentMethodsService.create(clubId, data);
      }
      await loadMethods();
      setView('list');
      setSelectedMethod(null);
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleStripeConnect = async () => {
    try {
      setStripeBusy(true);
      const res = await StripeConnectService.startConnect(window.location.origin);
      if (res?.url) window.location.href = res.url;
    } catch (e: any) {
      setError(e.message || 'Failed to connect Stripe');
    } finally {
      setStripeBusy(false);
    }
  };

  const refreshStripeStatus = async () => {
    try {
      setStripeBusy(true);
      const status = await StripeConnectService.getStatus();
      setStripeConnect(status);
    } catch (e: any) {
      setError(e.message || 'Failed to refresh Stripe status');
    } finally {
      setStripeBusy(false);
    }
  };

  if (view !== 'list') {
    return (
      <div className="p-5">
        <PaymentMethodForm
          method={selectedMethod}
          defaultMethodCategory={view === 'add_solana' ? 'crypto' : 'instant_payment'}
          defaultProviderName={view === 'add_solana' ? 'solana_wallet' : null}
          onSave={handleSave}
          onCancel={handleCancel}
          loading={loading}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {error && (
          <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Stripe */}
        <section className="space-y-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-900">Card Payments (Stripe)</h3>
            <p className="text-xs text-gray-500">Let players pay by card directly to your club Stripe account.</p>
          </div>
          <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-indigo-600" />
                <span className="text-sm font-semibold text-gray-900">Stripe</span>
                {stripeMethod && !stripeMethod.isEnabled
                  ? <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600">Disabled</span>
                  : stripeReady
                    ? <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">Connected</span>
                    : <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800">Setup incomplete</span>
                }
              </div>
              {stripeStatusMsg && <p className="mt-1.5 text-xs text-gray-600">{stripeStatusMsg}</p>}
              {stripeConnect?.accountId && (
                <p className="mt-1.5 text-xs text-gray-500 font-mono">{stripeConnect.accountId}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {!stripeReady ? (
                <button onClick={handleStripeConnect} disabled={stripeBusy} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                  {stripeMethod ? 'Continue setup' : 'Connect Stripe'}
                </button>
              ) : (
                <button onClick={refreshStripeStatus} disabled={stripeBusy} className="rounded-lg border border-indigo-300 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50">
                  Refresh status
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Instant Payments */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-900">Instant Payments</h3>
              <p className="text-xs text-gray-500">Revolut, bank transfer, PayPal and other manual methods.</p>
            </div>
            <button onClick={handleAddInstant} className="flex items-center gap-1.5 rounded-lg border-2 border-dashed border-indigo-300 px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50">
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
          {!loadingList && instantMethods.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-300 py-6 text-center">
              <CreditCard className="mx-auto mb-2 h-6 w-6 text-gray-300" />
              <p className="text-xs text-gray-500">No instant payment methods yet</p>
            </div>
          )}
          {instantMethods.map((m) => (
            <MethodCard key={m.id} method={m} loading={loading} deleteConfirm={deleteConfirm}
              onEdit={handleEdit} onAskDelete={setDeleteConfirm} onDelete={handleDelete} onCancelDelete={() => setDeleteConfirm(null)} />
          ))}
        </section>

        {/* Crypto */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-900">Crypto Wallets</h3>
              <p className="text-xs text-gray-500">Solana wallet for donation-only quiz payments.</p>
            </div>
            <button onClick={handleAddSolana} className="flex items-center gap-1.5 rounded-lg border-2 border-dashed border-purple-300 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50">
              <Wallet className="h-3.5 w-3.5" /> Add
            </button>
          </div>
          {!loadingList && cryptoMethods.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-300 py-6 text-center">
              <Wallet className="mx-auto mb-2 h-6 w-6 text-gray-300" />
              <p className="text-xs text-gray-500">No crypto wallets yet</p>
            </div>
          )}
          {cryptoMethods.map((m) => (
            <MethodCard key={m.id} method={m} loading={loading} deleteConfirm={deleteConfirm}
              onEdit={handleEdit} onAskDelete={setDeleteConfirm} onDelete={handleDelete} onCancelDelete={() => setDeleteConfirm(null)} />
          ))}
        </section>

        {loadingList && (
          <div className="py-12 text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-b-2 border-indigo-600" />
            <p className="mt-2 text-sm text-gray-600">Loading payment methods…</p>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 border-t border-gray-200 p-5">
        <button onClick={onClose} className="w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200">
          Close
        </button>
      </div>
    </div>
  );
}