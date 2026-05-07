import BaseService from './BaseService';

export type UnpaidPlayerRow = {
  playerId: string;
  playerName: string;
  statuses?: string;
  paymentMethod?: string | null;
  clubPaymentMethodId?: number | string | null;
  paymentReference?: string | null;
  existingNotes?: string | null;
  entryFeeOutstanding: number;
  extrasOutstanding: number;
  totalOutstanding: number;
  lastUpdatedAt?: string;
};

export type MarkLatePaidPayload = {
  roomId: string;
  playerId: string;
  paymentMethod?: string | null;         // canonical: cash / instant_payment / pay_admin / card / stripe / other
  clubPaymentMethodId?: number | null;
  adminNotes?: string | null;

   entryFeeAmount?: number;
  extrasAmount?: number;

  // identity (until you wire auth → server derives this)
  confirmedBy: string;
  confirmedByName?: string | null;
  confirmedByRole?: 'host' | 'admin' | null;
};

class QuizLatePaymentsService extends BaseService {
  async getUnpaidPlayers(roomId: string): Promise<{ ok: true; players: UnpaidPlayerRow[] }> {
    const qs = this.buildQueryString({ roomId });
    return this.request(`/mgtsystem/quiz-late-payments/unpaid?${qs}`);
  }

  async markLatePaid(payload: MarkLatePaidPayload): Promise<{ ok: true; updated: number }> {
    return this.request(`/mgtsystem/quiz-late-payments/mark-late-paid`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
 async writeOffPayment(payload: {
  roomId: string;
  playerId: string;
  adminNotes?: string | null;
  confirmedBy: string;
  confirmedByName?: string | null;
  confirmedByRole?: 'host' | 'admin' | null;
}) {
  return this.request('/mgtsystem/quiz-late-payments/write-off', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
}


export default new QuizLatePaymentsService();
