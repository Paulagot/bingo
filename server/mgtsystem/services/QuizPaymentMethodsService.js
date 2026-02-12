import database from '../../config/database.js';

class QuizPaymentMethodsService {
  async _assertQuizRoomOwned({ roomId, clubId }) {
    const [rows] = await database.connection.execute(
      `SELECT room_id, club_id FROM fundraisely_web2_quiz_rooms WHERE room_id = ? LIMIT 1`,
      [roomId]
    );

    if (!rows?.length) throw new Error('Quiz room not found');
    if (rows[0].club_id !== clubId) throw new Error('Access denied');
    return rows[0];
  }

  async listClubPaymentMethods({ clubId }) {
    const [rows] = await database.connection.execute(
      `SELECT 
        id,
        club_id,
        method_category,
        provider_name,
        method_label,
        display_order,
        is_enabled,
        player_instructions,
        method_config,
        is_official_club_account,
        created_at,
        updated_at
      FROM fundraisely_club_payment_methods
      WHERE club_id = ?
      ORDER BY display_order ASC, method_label ASC`,
      [clubId]
    );

    return rows || [];
  }

  async getQuizPaymentMethods({ roomId, clubId }) {
    await this._assertQuizRoomOwned({ roomId, clubId });

    const availableMethods = await this.listClubPaymentMethods({ clubId });

    const [quizRows] = await database.connection.execute(
      `SELECT linked_payment_methods_json 
       FROM fundraisely_web2_quiz_rooms 
       WHERE room_id = ? AND club_id = ?
       LIMIT 1`,
      [roomId, clubId]
    );

    let linkedMethodIds = [];
    
    if (quizRows?.[0]?.linked_payment_methods_json) {
      const linkedData = quizRows[0].linked_payment_methods_json;
      linkedMethodIds = linkedData.payment_method_ids || [];
    }

    return {
      available_methods: availableMethods,
      linked_method_ids: linkedMethodIds,
      total_available: availableMethods.length
    };
  }

  async updateLinkedPaymentMethods({ roomId, clubId, paymentMethodIds, userId }) {
    await this._assertQuizRoomOwned({ roomId, clubId });

    if (paymentMethodIds.length > 0) {
      const placeholders = paymentMethodIds.map(() => '?').join(',');
      const [validMethods] = await database.connection.execute(
        `SELECT id FROM fundraisely_club_payment_methods 
         WHERE club_id = ? AND id IN (${placeholders})`,
        [clubId, ...paymentMethodIds]
      );

      if (validMethods.length !== paymentMethodIds.length) {
        throw new Error('Invalid payment method IDs - some methods do not belong to this club');
      }
    }

    const linkedData = {
      payment_method_ids: paymentMethodIds,
      updated_at: new Date().toISOString(),
      updated_by: userId || null
    };

    await database.connection.execute(
      `UPDATE fundraisely_web2_quiz_rooms 
       SET linked_payment_methods_json = ?,
           updated_at = NOW()
       WHERE room_id = ? AND club_id = ?`,
      [JSON.stringify(linkedData), roomId, clubId]
    );

    return linkedData;
  }

  /**
 * Get available payment methods for a room (PUBLIC - for players joining)
 * Returns only enabled methods that are linked to this room
 * Does NOT require authentication
 */
async getAvailablePaymentMethodsForRoom({ roomId }) {
  const [quizRows] = await database.connection.execute(
    `SELECT 
      room_id, 
      club_id, 
      linked_payment_methods_json 
     FROM fundraisely_web2_quiz_rooms 
     WHERE room_id = ?
     LIMIT 1`,
    [roomId]
  );

  if (!quizRows?.length) {
    throw new Error('Quiz room not found');
  }

  const room = quizRows[0];
  const clubId = room.club_id;
  
  let linkedMethodIds = [];
  if (room.linked_payment_methods_json) {
    const linkedData = room.linked_payment_methods_json;
    linkedMethodIds = linkedData.payment_method_ids || [];
  }

  if (linkedMethodIds.length === 0) {
    return {
      ok: true,
      paymentMethods: [],
      total: 0,
      hasLinkedMethods: false
    };
  }

  const placeholders = linkedMethodIds.map(() => '?').join(',');
  
  const [methods] = await database.connection.execute(
    `SELECT 
      id,
      club_id,
      method_category,
      provider_name,
      method_label,
      display_order,
      is_enabled,
      player_instructions,
      method_config,
      is_official_club_account
    FROM fundraisely_club_payment_methods
    WHERE club_id = ? 
      AND id IN (${placeholders})
      AND is_enabled = 1
    ORDER BY display_order ASC, method_label ASC`,
    [clubId, ...linkedMethodIds]
  );

  // ✅ Transform snake_case to camelCase for frontend
  const transformedMethods = (methods || []).map(method => ({
    id: method.id,
    clubId: method.club_id,
    methodCategory: method.method_category,
    providerName: method.provider_name,
    methodLabel: method.method_label, // ✅ Transform to camelCase
    displayOrder: method.display_order,
    isEnabled: method.is_enabled === 1,
    playerInstructions: method.player_instructions,
    methodConfig: method.method_config,
    isOfficialClubAccount: method.is_official_club_account === 1,
  }));

  return {
    ok: true,
    paymentMethods: transformedMethods,
    total: transformedMethods.length,
    hasLinkedMethods: true
  };
}
}

export default QuizPaymentMethodsService;