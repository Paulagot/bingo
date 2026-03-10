// src/components/Quiz/modals/QuizPaymentMethodsModal.tsx

import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle2, CreditCard } from 'lucide-react';
import { 
  quizPaymentMethodsService, 
  PaymentMethod 
} from '../services/QuizPaymentMethodsService';

interface QuizPaymentMethodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomTitle?: string;
  onSuccess?: () => void;
}

export const QuizPaymentMethodsModal: React.FC<QuizPaymentMethodsModalProps> = ({
  isOpen,
  onClose,
  roomId,
  roomTitle,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [availableMethods, setAvailableMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodIds, setSelectedMethodIds] = useState<number[]>([]);
  const [originalMethodIds, setOriginalMethodIds] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen && roomId) {
      loadPaymentMethods();
    }
  }, [isOpen, roomId]);

  const loadPaymentMethods = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await quizPaymentMethodsService.getQuizPaymentMethods(roomId);
      
      setAvailableMethods(response.available_methods);
      setSelectedMethodIds(response.linked_method_ids);
      setOriginalMethodIds(response.linked_method_ids);
    } catch (err: any) {
      console.error('Failed to load payment methods:', err);
      setError(err.message || 'Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMethod = (methodId: number) => {
    setSelectedMethodIds(prev => {
      if (prev.includes(methodId)) {
        return prev.filter(id => id !== methodId);
      } else {
        return [...prev, methodId];
      }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      await quizPaymentMethodsService.updateLinkedPaymentMethods(
        roomId,
        selectedMethodIds
      );
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
    } catch (err: any) {
      console.error('Failed to update payment methods:', err);
      setError(err.message || 'Failed to update payment methods');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    return JSON.stringify([...selectedMethodIds].sort()) !== 
           JSON.stringify([...originalMethodIds].sort());
  };

  const groupedMethods = availableMethods.reduce((acc, method) => {
    const category = method.method_category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(method);
    return acc;
  }, {} as Record<string, PaymentMethod[]>);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Link Payment Methods</h2>
              {roomTitle && <p className="text-sm text-gray-500 mt-1">Quiz: {roomTitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <span className="ml-3 text-gray-600">Loading payment methods...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {!loading && availableMethods.length === 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                No payment methods available. Please add payment methods in your club settings first.
              </p>
            </div>
          )}

          {!loading && availableMethods.length > 0 && (
            <div className="space-y-6">
              <p className="text-sm text-gray-600">
                Select which payment methods players can use for this quiz room.
              </p>

              {Object.entries(groupedMethods).map(([category, methods]) => (
                <div key={category} className="space-y-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-2">
                    {category.replace('_', ' ')}
                  </h4>
                  
                  <div className="space-y-2">
                    {methods.map((method) => (
                      <label
                        key={method.id}
                        className={`flex items-start p-3 rounded-lg border-2 transition-all cursor-pointer ${
                          selectedMethodIds.includes(method.id)
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                        } ${!method.is_enabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedMethodIds.includes(method.id)}
                          onChange={() => handleToggleMethod(method.id)}
                          disabled={!method.is_enabled}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                        />
                        
                        <div className="ml-3 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900">
                              {method.method_label}
                            </span>
                            
                            {method.provider_name && (
                              <span className="text-sm text-gray-500">
                                ({method.provider_name})
                              </span>
                            )}
                            
                            {!method.is_enabled && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Disabled
                              </span>
                            )}
                            
                            {/* {method.is_official_club_account && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Official
                              </span>
                            )} */}
                          </div>
                          
                          {/* {method.player_instructions && (
                            <p className="text-sm text-gray-600 mt-1 italic">
                              {method.player_instructions}
                            </p>
                          )} */}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-gray-600" />
                  <span className="font-semibold text-gray-900">
                    Selected: {selectedMethodIds.length} payment method{selectedMethodIds.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges() || loading}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};