import BaseService from './BaseService';

export type PersonalisedQuestion = {
  id?: number;
  questionOrder: number; // 1..6
  questionText: string;
  answers: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
};

export type PersonalisedRound = {
  id: number;
  clubId: string;
  roomId: string;
  title: string | null;
  position: 'first' | 'last';
  isEnabled: boolean;
  questions: Array<{
    id: number;
    questionOrder: number;
    questionText: string;
    answers: [string, string, string, string];
    correctIndex: 0 | 1 | 2 | 3;
  }>;
  createdAt?: string;
  updatedAt?: string;
};

export type UpsertPersonalisedRoundPayload = {
  title?: string | null;
  position: 'first' | 'last';
  isEnabled?: boolean;
  questions: Array<{
    id?: number | null;
    questionText: string;
    answers: string[];
    correctIndex: number;
  }>;
};

class QuizPersonalisedRoundsService extends BaseService {
  getRound(roomId: string) {
    return this.request<{ ok: true; round: PersonalisedRound | null }>(
      `/quiz/personalised-round/${roomId}`,
      { method: 'GET' }
    );
  }

  saveRound(roomId: string, payload: UpsertPersonalisedRoundPayload) {
    return this.request<{ ok: true; round: PersonalisedRound }>(
      `/quiz/personalised-round/${roomId}`,
      { method: 'PUT', body: JSON.stringify(payload) }
    );
  }

  deleteRound(roomId: string) {
    return this.request<{ ok: true; deleted: boolean }>(
      `/quiz/personalised-round/${roomId}`,
      { method: 'DELETE' }
    );
  }
}

export const quizPersonalisedRoundsService = new QuizPersonalisedRoundsService();