// client/src/services/ReconciliationService.ts
import BaseService from './BaseService';

class ReconciliationService extends BaseService {
  async getFinancialReport(roomId: string) {
    return this.request(`/quiz-reconciliation/room/${roomId}/financial-report`);
  }
}

export default new ReconciliationService();