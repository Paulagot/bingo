import BaseService from './BaseService';

export type UnpaidPlayerRow = {
  playerId: string;
  playerName: string;
  entryFeeOutstanding: number | string;
  extrasOutstanding: number | string;
  totalOutstanding: number | string;
  lastUpdatedAt: string;
};

export type MarkLatePaidPayload = {
  roomId: string;
  playerId: string;
  paymentMethod?: string | null;         // canonical: cash / instant_payment / pay_admin / card / stripe / other
  clubPaymentMethodId?: number | null;
  adminNotes?: string | null;

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
}

export default new QuizLatePaymentsService();
