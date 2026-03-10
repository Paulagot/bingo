// types/reconciliation.ts
// TypeScript types matching the database schema for Phase 3

/**
 * Type for adjustment types in the reconciliation ledger
 */
export type AdjustmentType = 
  | 'received'        // Additional money received after initial collection
  | 'refund'          // Money returned to participants
  | 'fee'             // Additional fees or charges
  | 'cash_over_short' // Cash counting discrepancies (over or short)
  | 'prize_payout';   // Prize money distributed

/**
 * Type for payment methods used in adjustments
 */
export type PaymentMethod = 
  | 'cash'
  | 'card'
  | 'instant_payment'
  | 'web3'
  | 'other';

/**
 * Type for reason codes explaining adjustments
 */
export type ReasonCode = 
  | 'complimentary'           // Free entry or discount
  | 'cash_over'               // Cash drawer has more than expected
  | 'cash_short'              // Cash drawer has less than expected
  | 'late_payment'            // Payment received after quiz started
  | 'refund'                  // Refund issued to player
  | 'prize_award_delivered'   // Prize money paid out
  | 'data_entry_error'        // Correction of data entry mistake
  | 'method_mismatch'         // Payment method was recorded incorrectly
  | 'other';                  // Other reason (explain in note)

/**
 * Database row for fundraisely_quiz_reconciliation table
 * Represents the complete reconciliation summary for a quiz
 */
export interface QuizReconciliation {
  id: bigint;
  room_id: string;
  club_id: string;
  
  // Starting totals (from payment ledger)
  starting_entry_fees: number;
  starting_extras: number;
  starting_total: number;
  
  // Adjustment totals
  adjustments_net: number;
  
  // Final reconciled amount
  final_total: number;
  
  // Approval metadata
  approved_by: string | null;
  approved_at: Date | null;
  notes: string | null;
  
  // Archive tracking
  archive_generated_at: Date | null;
  archive_sha256: string | null;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
}

/**
 * Prize metadata stored in JSON for prize-related adjustments
 */
export interface PrizeMetadata {
  prizeAwardId?: string;
  prizeName?: string;
  prizeValue?: number;
  place?: number;
  status?: string;
}

/**
 * Database row for fundraisely_reconciliation_adjustments table
 * Represents individual adjustment entries in the reconciliation ledger
 */
export interface ReconciliationAdjustment {
  id: bigint;
  room_id: string;
  
  // Adjustment details
  ts: Date;
  adjustment_type: AdjustmentType;
  amount: number;
  currency: string;
  payment_method: PaymentMethod | null;
  
  // Context
  reason_code: ReasonCode | null;
  payer_id: string | null;
  note: string | null;
  created_by: string;
  
  // Prize linkage (for prize_payout adjustments)
  prize_award_id: string | null;
  prize_metadata: PrizeMetadata | null;
  
  // Timestamps
  created_at: Date;
}

/**
 * Payload for creating/updating a reconciliation summary
 * Used when submitting approval in the frontend
 */
export interface ReconciliationApprovalPayload {
  roomId: string;
  clubId: string;
  approvedBy: string;
  notes?: string;
  approvedAt: string; // ISO timestamp
  
  // Calculated totals
  startingEntryFees: number;
  startingExtras: number;
  startingTotal: number;
  adjustmentsNet: number;
  finalTotal: number;
  
  // Adjustment ledger entries
  adjustments: AdjustmentLedgerEntry[];
}

/**
 * Frontend representation of an adjustment entry
 * Matches the structure used in ReconciliationLedger component
 */
export interface AdjustmentLedgerEntry {
  id: string;
  ts: string; // ISO timestamp
  type: AdjustmentType;
  method: PaymentMethod;
  payerId?: string;
  amount: number;
  currency: string;
  reasonCode: ReasonCode;
  note?: string;
  createdBy: string;
  meta?: {
    prizeAwardId?: string;
    [key: string]: any;
  };
}

/**
 * Response type for fetching reconciliation export data
 * Used when regenerating reports from database
 */
export interface ReconciliationExportResponse {
  ok: boolean;
  
  // Payment ledger (from fundraisely_quiz_payment_ledger table)
  paymentLedger: PaymentLedgerEntry[];
  
  // Reconciliation summary (from fundraisely_quiz_reconciliation table)
  reconciliation: {
    approvedBy: string;
    approvedAt: string;
    notes: string | null;
    startingTotal: number;
    adjustmentsNet: number;
    finalTotal: number;
  };
  
  // Adjustments ledger (from fundraisely_reconciliation_adjustments table)
  adjustments: ReconciliationAdjustment[];
  
  // Player data (still from memory during quiz, or cached)
  players: any[];
  
  // Game stats (still from memory during quiz, or cached)
  allRoundsStats: any[];
}

/**
 * Payment ledger entry (from Phase 1 & 2)
 * Referenced here for completeness
 */
export interface PaymentLedgerEntry {
  id: bigint;
  player_id: string;
  player_name: string;
  ledger_type: 'entry_fee' | 'extra_purchase';
  amount: number;
  currency: string;
  status: 'expected' | 'claimed' | 'confirmed';
  payment_method: string | null;
  payment_reference: string | null;
  club_payment_method_id: string | null;
  claimed_at: Date | null;
  confirmed_at: Date | null;
  created_at: Date;
}

/**
 * Summary statistics for reconciliation display
 */
export interface ReconciliationSummary {
  // From payment ledger
  totalEntryFees: number;
  totalExtras: number;
  startingTotal: number;
  
  // From adjustment ledger
  adjustmentsIn: number;   // Money received
  adjustmentsOut: number;  // Money paid out
  adjustmentsNet: number;  // Net adjustment
  
  // Final reconciled amount
  reconciledTotal: number;
  
  // Approval status
  isApproved: boolean;
  approvedBy: string | null;
  approvedAt: Date | null;
}