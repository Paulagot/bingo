// server/mgtsystem/services/FeedbackService.js

export class FeedbackService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Insert a feedback row.
   * @param {import('../types/feedback').SubmitFeedbackPayload} payload
   * @returns {Promise<import('../types/feedback').SubmitFeedbackResult>}
   */
async submitFeedback(payload) {
  const { feedback_type = 'player', room_id, game_type = null,
          enjoyed_game = null, play_again = null, recommend = null } = payload;

  if (!room_id) {
    return { ok: false, error: 'room_id is required' };
  }

  // Look up club_id from the room
  const [rows] = await this.db.query(
    `SELECT club_id FROM fundraisely_web2_quiz_rooms WHERE room_id = ? LIMIT 1`,
    [room_id]
  );

  if (!rows.length) {
    return { ok: false, error: 'Room not found' };
  }

  const club_id = rows[0].club_id;

  const [result] = await this.db.query(
    `INSERT INTO fundraisely_feedback
       (feedback_type, room_id, club_id, game_type, enjoyed_game, play_again, recommend)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [feedback_type, room_id, club_id, game_type, enjoyed_game, play_again, recommend]
  );

  return { ok: true, id: result.insertId };
}

  /**
   * Aggregate summary for a room — useful for host dashboard later.
   * @param {string} roomId
   */
  async getRoomFeedbackSummary(roomId) {
    const [rows] = await this.db.query(
      `SELECT
         COUNT(*)                                              AS total,
         SUM(enjoyed_game = 1)                                AS enjoyed_yes,
         SUM(play_again   = 1)                                AS play_again_yes,
         SUM(recommend    = 1)                                AS recommend_yes
       FROM fundraisely_feedback
       WHERE room_id = ? AND feedback_type = 'player'`,
      [roomId]
    );

    const row = rows[0];
    return {
      total:          parseInt(row.total,          10) || 0,
      enjoyed_yes:    parseInt(row.enjoyed_yes,    10) || 0,
      play_again_yes: parseInt(row.play_again_yes, 10) || 0,
      recommend_yes:  parseInt(row.recommend_yes,  10) || 0,
    };
  }
}