// services/FeedbackService.ts (frontend)
// Plain fetch — no auth headers. Players are not logged in.

export interface FeedbackAnswers {
  enjoyed_game?: boolean | null;
  play_again?: boolean | null;
  recommend?: boolean | null;
}

export interface SubmitFeedbackOptions extends FeedbackAnswers {
  room_id: string;
  game_type?: string;
  feedback_type?: 'player' | 'club';
}

export interface SubmitFeedbackResult {
  ok: boolean;
  id?: number;
  error?: string;
}

export interface FeedbackSummary {
  ok: boolean;
  total: number;          // players who answered at least one question
  enjoyed_yes: number;
  play_again_yes: number;
  recommend_yes: number;
  error?: string;
}

class FeedbackService {
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL ?? '';
  }

  async submitFeedback(options: SubmitFeedbackOptions): Promise<SubmitFeedbackResult> {
    const payload = {
      feedback_type: options.feedback_type ?? 'player',
      room_id:       options.room_id,
      game_type:     options.game_type ?? null,
      enjoyed_game:  options.enjoyed_game ?? null,
      play_again:    options.play_again   ?? null,
      recommend:     options.recommend    ?? null,
    };

    const res = await fetch(`${this.baseURL}/api/feedback`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    return res.json();
  }

  async getRoomFeedbackSummary(roomId: string): Promise<FeedbackSummary> {
    const res = await fetch(`${this.baseURL}/api/feedback/${encodeURIComponent(roomId)}`);
    return res.json();
  }
}

export const feedbackService = new FeedbackService();