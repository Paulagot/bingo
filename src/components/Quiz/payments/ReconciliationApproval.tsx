// src/components/Quiz/payments/ReconciliationApproval.tsx
// IMPROVED: Better error logging and debugging

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { CheckCircle2, Clock, AlertCircle, Loader } from 'lucide-react';
import { calculateReconciliationTotals } from './reconciliationUtils';

type Props = { compact?: boolean };

export default function ReconciliationApproval({ compact = false }: Props) {
  const { roomId } = useParams();
  const { socket } = useQuizSocket();
  const { config } = useQuizConfig();

  const rec = (config?.reconciliation as any) || {};
  const [approvedBy, setApprovedBy] = useState(rec.approvedBy || '');
  const [notes, setNotes] = useState(rec.notes || '');
  const [approvedAt, setApprovedAt] = useState<string | null>(rec.approvedAt || null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setApprovedBy(rec.approvedBy || '');
    setNotes(rec.notes || '');
    setApprovedAt(rec.approvedAt || null);
  }, [config?.reconciliation]);

  const queue = useRef<number | null>(null);
  const save = (patch: any) => {
    if (!socket || !roomId) return;
    if (queue.current) window.clearTimeout(queue.current);
    queue.current = window.setTimeout(() => {
      socket.emit('update_reconciliation', { roomId, patch });
    }, 300);
  };

  const onApprove = async () => {
    const ts = new Date().toISOString();
    const totals = calculateReconciliationTotals(config);
    const clubId = (config as any)?.clubId || '';

console.log('🔍 Payment Ledger Debug:', {
  hasPaymentLedger: !!(config as any)?.paymentLedger,
  ledgerLength: (config as any)?.paymentLedger?.length || 0,
  ledgerSample: (config as any)?.paymentLedger?.slice(0, 3),
  confirmedCount: (config as any)?.paymentLedger?.filter((p: any) => p.status === 'confirmed')?.length || 0,
  allStatuses: [...new Set((config as any)?.paymentLedger?.map((p: any) => p.status) || [])]
});
    
    console.log('🔍 Approval Debug Info:', {
      roomId,
      clubId,
      hasConfig: !!config,
      totals,
      approvedBy
    });
    
    if (!clubId) {
      setSaveError('Missing club ID - cannot save to database');
      return;
    }
    
    // 1. Save to memory first (existing functionality)
    setApprovedAt(ts);
    save({ approvedAt: ts, approvedBy });
    
    // 2. Save to database
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    
    try {
      const adjustments = (config?.reconciliation as any)?.ledger || [];
      
      // Get auth token
      const authToken = localStorage.getItem('auth_token');
      
      if (!authToken) {
        throw new Error('Not authenticated - please log in again');
      }
      
      const payload = {
        roomId,
        clubId,
        approvedBy,
        notes,
        approvedAt: ts,
        startingEntryFees: totals.totalEntryReceived,
        startingExtras: totals.totalExtrasAmount,
        startingTotal: totals.startingReceived,
        adjustmentsNet: totals.netAdjustments,
        finalTotal: totals.reconciledTotal,
        adjustments
      };
      
      const url = `/api/quiz-reconciliation/room/${roomId}/approve`;
      
      console.log('📤 Sending reconciliation approval:', {
        url,
        method: 'POST',
        payload,
        hasToken: !!authToken,
        tokenPreview: authToken ? `${authToken.substring(0, 20)}...` : 'none'
      });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });
      
      console.log('📥 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (!response.ok) {
        let errorData;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
          console.error('❌ JSON Error response:', errorData);
        } else {
          const textResponse = await response.text();
          console.error('❌ Non-JSON response:', textResponse);
          throw new Error(`Server error: ${response.status} - ${textResponse.substring(0, 200)}`);
        }
        
        throw new Error(errorData.error || errorData.message || `Server error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Reconciliation saved to database:', result);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5000);
      
    } catch (error) {
      console.error('❌ Error saving reconciliation:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      setSaveError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsSaving(false);
    }
  };

  const retryApproval = async () => {
    setSaveError(null);
    await onApprove();
  };

  const isApproved = !!approvedAt;
  const canApprove = !isApproved && approvedBy.trim().length > 0 && !isSaving;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isApproved ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <Clock className="h-5 w-5 text-amber-600" />
            )}
            <div>
              <h3 className="text-base font-semibold text-gray-900">Approval & Sign-Off</h3>
              <p className="text-xs text-gray-600 mt-0.5">Confirm all amounts are correct and finalize</p>
            </div>
          </div>
          {isApproved ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-green-300 bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
              <CheckCircle2 className="h-3 w-3" />
              Approved
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              <Clock className="h-3 w-3" />
              Pending
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        {/* Loading State */}
        {isSaving && (
          <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 p-3">
            <div className="flex items-center gap-2">
              <Loader className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm text-blue-900 font-medium">
                Saving reconciliation to database...
              </span>
            </div>
          </div>
        )}

        {/* Success State */}
        {saveSuccess && !isSaving && (
          <div className="mb-4 rounded-lg bg-green-50 border-2 border-green-200 p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-900 font-medium">
                ✓ Reconciliation saved to database successfully
              </span>
            </div>
          </div>
        )}

        {/* Error State */}
        {saveError && !isSaving && (
          <div className="mb-4 rounded-lg bg-red-50 border-2 border-red-300 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-bold text-red-900 mb-1">
                  ⚠️ Failed to save to database
                </div>
                <p className="text-sm text-red-800 mb-2">
                  {saveError}
                </p>
                <div className="rounded-md bg-red-100 border border-red-300 p-2 mb-3">
                  <p className="text-xs font-semibold text-red-900">
                    ⚠️ IMPORTANT: Your data is only saved locally and will be lost when the quiz ends.
                  </p>
                  <p className="text-xs text-red-800 mt-1">
                    You must retry saving to the database before downloading the archive.
                  </p>
                  <p className="text-xs text-red-700 mt-2 font-mono">
                    Check browser console (F12) for detailed error logs
                  </p>
                </div>
                <button
                  onClick={retryApproval}
                  className="rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all inline-flex items-center gap-2"
                >
                  <Loader className="h-4 w-4" />
                  Retry Save to Database
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Approved By <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
              value={approvedBy}
              disabled={isApproved || isSaving}
              onChange={(e) => {
                setApprovedBy(e.target.value);
                save({ approvedBy: e.target.value });
              }}
              placeholder="Enter your name or role (required)..."
            />
            
            {!isApproved && (
              <div className="mt-3">
                <button
                  onClick={onApprove}
                  disabled={!canApprove}
                  className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all inline-flex items-center justify-center gap-2 ${
                    canApprove
                      ? 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'
                      : 'bg-gray-400 cursor-not-allowed opacity-50'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Mark as Approved
                    </>
                  )}
                </button>
                {!canApprove && approvedBy.trim().length === 0 && !isSaving && (
                  <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg p-2">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>Enter your name above to enable approval</span>
                  </div>
                )}
              </div>
            )}

            {isApproved && approvedAt && (
              <div className="mt-2 rounded-lg bg-green-50 border border-green-200 p-2 text-xs text-green-800">
                <span className="font-medium">Approved on:</span>{' '}
                {new Date(approvedAt).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Comments / Notes (Optional)
          </label>
          <textarea
            rows={compact ? 2 : 4}
            className="w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all resize-none"
            disabled={isApproved || isSaving}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              save({ notes: e.target.value });
            }}
            placeholder="Any discrepancies, explanations, or final notes..."
          />
          {isApproved && (
            <p className="mt-1.5 text-xs text-gray-500 italic">
              Approval is final - edits are locked
            </p>
          )}
        </div>

        {!isApproved && !saveError && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="flex gap-2 text-xs text-blue-900">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Important:</strong> Once approved, you cannot make further changes. 
                Make sure all adjustments are correct before approving.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
