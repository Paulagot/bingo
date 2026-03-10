// src/components/Quiz/payments/reconciliationUtils.ts

/**
 * Payment ledger entry type
 * Adjust these to match your actual QuizConfig types
 */
interface PaymentLedgerEntry {
  ledger_type: 'entry_fee' | 'extra_purchase';
  amount: number | string;
  status: 'expected' | 'claimed' | 'confirmed';
  [key: string]: any;
}

/**
 * Adjustment entry type
 */
interface AdjustmentEntry {
  type: 'received' | 'refund' | 'fee' | 'cash_over_short' | 'prize_payout';
  amount: number | string;
  reasonCode?: string;
  [key: string]: any;
}

/**
 * Reconciliation totals result
 */
export interface ReconciliationTotals {
  totalEntryReceived: number;
  totalExtrasAmount: number;
  startingReceived: number;
  adjustmentsIn: number;
  adjustmentsOut: number;
  netAdjustments: number;
  reconciledTotal: number;
}

/**
 * Calculate reconciliation totals from config
 * 
 * @param config - Quiz config object containing paymentLedger and reconciliation data
 * @returns Calculated totals for reconciliation
 */
export function calculateReconciliationTotals(
  config: any // Using any here since your QuizConfig type is complex
): ReconciliationTotals {
  // 1. Get payment ledger totals (from Phase 1 & 2)
  const paymentLedger = (config?.paymentLedger || []) as PaymentLedgerEntry[];
  
  const totalEntryReceived = paymentLedger
    .filter((p: PaymentLedgerEntry) => 
      p.ledger_type === 'entry_fee' && p.status === 'confirmed'
    )
    .reduce((sum: number, p: PaymentLedgerEntry) => 
      sum + Number(p.amount), 0
    );
  
  const totalExtrasAmount = paymentLedger
    .filter((p: PaymentLedgerEntry) => 
      p.ledger_type === 'extra_purchase' && p.status === 'confirmed'
    )
    .reduce((sum: number, p: PaymentLedgerEntry) => 
      sum + Number(p.amount), 0
    );
  
  const startingReceived = totalEntryReceived + totalExtrasAmount;
  
  // 2. Get adjustment totals from reconciliation ledger
  const adjustments = (config?.reconciliation?.ledger || []) as AdjustmentEntry[];
  let adjustmentsIn = 0;
  let adjustmentsOut = 0;
  
  for (const adj of adjustments) {
    const amt = Number(adj.amount || 0);
    
    switch (adj.type) {
      case 'received':
        adjustmentsIn += amt;
        break;
      
      case 'refund':
      case 'fee':
      case 'prize_payout':
        adjustmentsOut += amt;
        break;
      
      case 'cash_over_short':
        if (adj.reasonCode === 'cash_over') {
          adjustmentsIn += amt;
        } else if (adj.reasonCode === 'cash_short') {
          adjustmentsOut += amt;
        }
        break;
    }
  }
  
  const netAdjustments = adjustmentsIn - adjustmentsOut;
  const reconciledTotal = startingReceived + netAdjustments;
  
  return {
    totalEntryReceived,
    totalExtrasAmount,
    startingReceived,
    adjustmentsIn,
    adjustmentsOut,
    netAdjustments,
    reconciledTotal,
  };
}