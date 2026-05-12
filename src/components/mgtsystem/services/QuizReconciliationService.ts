// src/components/mgtsystem/services/QuizReconciliationService.ts
import BaseService from './BaseService';

class ReconciliationService extends BaseService {
  async getFinancialReport(roomId: string) {
    return this.request(`/quiz-reconciliation/room/${roomId}/financial-report`);
  }

  async getAuditView(roomId: string) {
    return this.request<{ ok: boolean; view: any }>(
      `/quiz-reconciliation/room/${roomId}/audit-view`
    );
  }
}

export default new ReconciliationService();