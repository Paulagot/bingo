// src/components/mgtsystem/modals/ManagePaymentMethodsModal.tsx
import { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, CreditCard, AlertCircle, Building2, User } from 'lucide-react';
import PaymentMethodForm from './PaymentMethodForm';
import PaymentMethodsService from '../services/PaymentMethodsService';
import type { ClubPaymentMethodWithMeta, PaymentMethodFormData } from '../../../shared/types/paymentMethods';

interface ManagePaymentMethodsModalProps {
  clubId: string;
  onClose: () => void;
}

type View = 'list' | 'add' | 'edit';

export default function ManagePaymentMethodsModal({ clubId, onClose }: ManagePaymentMethodsModalProps) {
  const [view, setView] = useState<View>('list');
  const [methods, setMethods] = useState<ClubPaymentMethodWithMeta[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<ClubPaymentMethodWithMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    loadMethods();
  }, [clubId]);

  const loadMethods = async () => {
    try {
      setLoadingList(true);
      setError(null);
      
      const response = await PaymentMethodsService.getAllForManagement(clubId);
      setMethods(response.paymentMethods);
    } catch (err: any) {
      console.error('Failed to load payment methods:', err);
      setError(err?.message || 'Failed to load payment methods');
    } finally {
      setLoadingList(false);
    }
  };

  const handleAdd = () => {
    setSelectedMethod(null);
    setView('add');
  };

  const handleEdit = (method: ClubPaymentMethodWithMeta) => {
    setSelectedMethod(method);
    setView('edit');
  };

  const handleSave = async (data: PaymentMethodFormData) => {
    try {
      setLoading(true);
      setError(null);

      if (view === 'edit' && selectedMethod) {
        await PaymentMethodsService.update(clubId, selectedMethod.id, {
          ...data,
          id: selectedMethod.id,
        });
      } else {
        await PaymentMethodsService.create(clubId, data);
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

  const handleDelete = async (methodId: number) => {
    try {
      setLoading(true);
      setError(null);

      await PaymentMethodsService.delete(clubId, methodId);
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
              <h2 className="text-xl font-bold text-gray-900">
                {view === 'list' ? 'Payment Methods' : view === 'add' ? 'Add Payment Method' : 'Edit Payment Method'}
              </h2>
              <p className="text-sm text-gray-600">
                {view === 'list' ? 'Manage how players can pay' : 'Configure payment details'}
              </p>
            </div>
          </div>
          <button
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
            <div className="space-y-4">
              {/* Add Button */}
              <button
                onClick={handleAdd}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-indigo-300 rounded-lg text-indigo-600 font-semibold hover:bg-indigo-50 hover:border-indigo-400 transition-colors"
              >
                <Plus className="h-5 w-5" />
                Add Payment Method
              </button>

              {/* Loading State */}
              {loadingList && (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading payment methods...</p>
                </div>
              )}

              {/* Empty State */}
              {!loadingList && methods.length === 0 && (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <CreditCard className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No payment methods yet</h3>
                  <p className="text-sm text-gray-600">Add your first payment method to get started</p>
                </div>
              )}

              {/* Methods List */}
              {!loadingList && methods.map((method) => (
                <div
                  key={method.id}
                  className={`p-4 rounded-lg border transition-all ${
                    method.isEnabled
                      ? 'border-gray-200 bg-white'
                      : 'border-gray-200 bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 truncate">{method.methodLabel}</h3>
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
                        <span className="px-2 py-1 bg-gray-100 rounded font-medium">
                          {method.methodCategory.replace('_', ' ')}
                        </span>
                        {method.providerName && (
                          <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded font-medium">
                            {method.providerName}
                          </span>
                        )}
                      </div>

                      {method.addedBy && (
                        <p className="text-xs text-gray-500 mt-2">
                          Added by: {method.addedBy}
                          {method.editedBy && ` • Last edited by: ${method.editedBy}`}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(method)}
                        disabled={loading}
                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors disabled:opacity-50"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4 text-gray-700" />
                      </button>
                      
                      {deleteConfirm === method.id ? (
                        <>
                          <button
                            onClick={() => handleDelete(method.id)}
                            disabled={loading}
                            className="px-3 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            disabled={loading}
                            className="px-3 py-2 bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(method.id)}
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
              ))}
            </div>
          ) : (
            <PaymentMethodForm
              method={selectedMethod}
              onSave={handleSave}
              onCancel={handleCancel}
              loading={loading}
            />
          )}
        </div>

        {/* Footer - Only show on list view */}
        {view === 'list' && (
          <div className="p-6 border-t border-gray-200">
            <button
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