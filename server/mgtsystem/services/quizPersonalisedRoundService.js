import { connection, TABLE_PREFIX } from '../../config/database.js';
import { getRoomConfig } from './quizTicketService.js'; // ✅ reuse: already loads room + club check helper

const ROUNDS_TABLE = `${TABLE_PREFIX}quiz_personalised_rounds`;
const QUESTIONS_TABLE = `${TABLE_PREFIX}quiz_personalised_questions`;

const DEBUG = true;

function normalizePosition(pos) {
  return pos === 'first' ? 'first' : 'last';
}

function validateRoundPayload(payload) {
  const errors = [];

  const title = (payload.title ?? '').toString().trim();
  const position = normalizePosition(payload.position);

  const questions = Array.isArray(payload.questions) ? payload.questions : [];
  if (questions.length > 6) errors.push('Max 6 questions allowed');

  questions.forEach((q, idx) => {
    const qNum = idx + 1;
    const text = (q.questionText ?? '').toString().trim();
    if (!text) errors.push(`Question ${qNum}: questionText required`);
    if (text.length > 500) errors.push(`Question ${qNum}: questionText too long (max 500)`);

    const answers = Array.isArray(q.answers) ? q.answers : [];
    if (answers.length !== 4) errors.push(`Question ${qNum}: must have exactly 4 answers`);

    answers.forEach((a, aIdx) => {
      const at = (a ?? '').toString().trim();
      if (!at) errors.push(`Question ${qNum}: answer ${aIdx + 1} required`);
      if (at.length > 255) errors.push(`Question ${qNum}: answer ${aIdx + 1} too long (max 255)`);
    });

    const correctIndex = Number(q.correctIndex);
    if (![0, 1, 2, 3].includes(correctIndex)) {
      errors.push(`Question ${qNum}: correctIndex must be 0..3`);
    }
  });

  return {
    ok: errors.length === 0,
    errors,
    cleaned: {
      title: title || null,
      position,
      isEnabled: payload.isEnabled === false ? 0 : 1,
      questions: questions.map((q, idx) => ({
        id: q.id ? Number(q.id) : null,
        questionOrder: idx + 1,
        questionText: (q.questionText ?? '').toString().trim(),
        answers: (Array.isArray(q.answers) ? q.answers : []).map((a) => (a ?? '').toString().trim()),
        correctIndex: Number(q.correctIndex),
      })),
    },
  };
}

/**
 * Ensures the room belongs to this club (host/admin auth context)
 */
async function assertRoomBelongsToClub(roomId, clubId) {
  const room = await getRoomConfig(roomId);
  if (!room) {
    const err = new Error('Room not found');
    err.status = 404;
    throw err;
  }
  if (room.clubId !== clubId) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }
  return room;
}

/**
 * GET round + questions for a room
 */
export async function getPersonalisedRoundByRoom({ roomId, clubId }) {
  await assertRoomBelongsToClub(roomId, clubId);

  const [roundRows] = await connection.execute(
    `SELECT * FROM ${ROUNDS_TABLE} WHERE room_id = ? LIMIT 1`,
    [roomId]
  );

  const round = roundRows?.[0] || null;
  if (!round) return null;

  const [qRows] = await connection.execute(
    `SELECT * FROM ${QUESTIONS_TABLE} WHERE round_id = ? ORDER BY question_order ASC`,
    [round.id]
  );

  return {
    id: round.id,
    clubId: round.club_id,
    roomId: round.room_id,
    title: round.title,
    position: round.position,
    isEnabled: !!round.is_enabled,
    createdAt: round.created_at,
    updatedAt: round.updated_at,
    questions: (qRows || []).map((q) => ({
      id: q.id,
      questionOrder: q.question_order,
      questionText: q.question_text,
      answers: [q.answer_a, q.answer_b, q.answer_c, q.answer_d],
      correctIndex: q.correct_index,
      createdAt: q.created_at,
      updatedAt: q.updated_at,
    })),
  };
}

/**
 * UPSERT round + replace questions (simple + safe)
 * - Creates round if missing
 * - Updates metadata
 * - Deletes existing questions and inserts new set (up to 6)
 */
export async function upsertPersonalisedRound({ roomId, clubId, payload }) {
  await assertRoomBelongsToClub(roomId, clubId);

  const { ok, errors, cleaned } = validateRoundPayload(payload);
  if (!ok) {
    const err = new Error('Validation failed');
    err.status = 400;
    err.details = errors;
    throw err;
  }

  // ✅ IMPORTANT: use a pooled connection for transactions
  const conn = await connection.getConnection();

  try {
    await conn.beginTransaction();

    // find existing round
    const [existingRows] = await conn.execute(
      `SELECT id FROM ${ROUNDS_TABLE} WHERE room_id = ? LIMIT 1`,
      [roomId]
    );
    const existing = existingRows?.[0] || null;

    let roundId;

    if (!existing) {
      const [ins] = await conn.execute(
        `INSERT INTO ${ROUNDS_TABLE} (club_id, room_id, title, position, is_enabled)
         VALUES (?, ?, ?, ?, ?)`,
        [clubId, roomId, cleaned.title, cleaned.position, cleaned.isEnabled]
      );
      roundId = ins.insertId;
      if (DEBUG) console.log('[PersonalisedRound] ✅ created round', { roomId, roundId });
    } else {
      roundId = existing.id;
      await conn.execute(
        `UPDATE ${ROUNDS_TABLE}
         SET title = ?, position = ?, is_enabled = ?, updated_at = NOW()
         WHERE id = ?`,
        [cleaned.title, cleaned.position, cleaned.isEnabled, roundId]
      );
      if (DEBUG) console.log('[PersonalisedRound] ✅ updated round', { roomId, roundId });
    }

    // replace questions
    await conn.execute(`DELETE FROM ${QUESTIONS_TABLE} WHERE round_id = ?`, [roundId]);

    for (const q of cleaned.questions) {
      const [a, b, c, d] = q.answers;
      await conn.execute(
        `INSERT INTO ${QUESTIONS_TABLE}
          (round_id, question_order, question_text, answer_a, answer_b, answer_c, answer_d, correct_index)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [roundId, q.questionOrder, q.questionText, a, b, c, d, q.correctIndex]
      );
    }

    await conn.commit();

    return await getPersonalisedRoundByRoom({ roomId, clubId });
  } catch (e) {
    try {
      await conn.rollback();
    } catch (rollbackErr) {
      console.error('[PersonalisedRound] ❌ rollback failed:', rollbackErr);
    }
    throw e;
  } finally {
    // ✅ ALWAYS release pooled connections
    conn.release();
  }
}

/**
 * DELETE whole personalised round for a room (cascades questions)
 */
export async function deletePersonalisedRound({ roomId, clubId }) {
  await assertRoomBelongsToClub(roomId, clubId);

  const [rows] = await connection.execute(
    `SELECT id FROM ${ROUNDS_TABLE} WHERE room_id = ? LIMIT 1`,
    [roomId]
  );
  const round = rows?.[0];
  if (!round) return { ok: true, deleted: false };

  // No transaction needed: FK cascade will delete questions.
  await connection.execute(`DELETE FROM ${ROUNDS_TABLE} WHERE id = ?`, [round.id]);
  return { ok: true, deleted: true };
}