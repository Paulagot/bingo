import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import QuizPaymentMethodsService from '../services/QuizPaymentMethodsService.js';

const router = express.Router();
const svc = new QuizPaymentMethodsService();

/**
 * GET /api/quiz-rooms/:roomId/available-payment-methods
 * Get only the payment methods linked to this specific quiz room
 * PUBLIC ROUTE - No auth needed for players joining
 */
router.get('/quiz-rooms/:roomId/available-payment-methods', async (req, res) => {
  try {
    const { roomId } = req.params;

    console.log('[quiz-available-payment-methods] GET request for roomId:', roomId);

    const data = await svc.getAvailablePaymentMethodsForRoom({ roomId });
    
    console.log('[quiz-available-payment-methods] Returning:', data);
    res.json(data);
  } catch (err) {
    if (err?.message === 'Quiz room not found') {
      return res.status(404).json({ error: 'Quiz room not found' });
    }

    console.error('[quiz-available-payment-methods] error:', err);
    res.status(500).json({ error: 'Failed to fetch available payment methods' });
  }
});

/**
 * GET /api/club-payment-methods
 * List all payment methods for the logged-in club
 */
router.get('/club-payment-methods', authenticateToken, async (req, res) => {  // ✅ Remove /api prefix
  try {
    const clubId = req.club_id;
    const paymentMethods = await svc.listClubPaymentMethods({ clubId });
    
    res.json({ 
      payment_methods: paymentMethods, 
      total: paymentMethods.length 
    });
  } catch (err) {
    console.error('[club-payment-methods] list error:', err);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

/**
 * GET /api/quiz-rooms/:roomId/payment-methods
 * Get linked payment methods for a quiz room + all available methods
 */
router.get('/quiz-rooms/:roomId/payment-methods', authenticateToken, async (req, res) => {  // ✅ Remove /api prefix
  try {
    const { roomId } = req.params;
    const clubId = req.club_id;

    console.log(`[quiz-payment-methods] GET request for roomId: ${roomId}, clubId: ${clubId}`);

    const data = await svc.getQuizPaymentMethods({ roomId, clubId });
    
    console.log(`[quiz-payment-methods] Returning data:`, data);
    res.json(data);
  } catch (err) {
    if (err?.message === 'Quiz room not found') {
      return res.status(404).json({ error: 'Quiz room not found' });
    }
    if (err?.message === 'Access denied') {
      return res.status(403).json({ error: 'Access denied' });
    }

    console.error('[quiz-payment-methods] get error:', err);
    res.status(500).json({ error: 'Failed to fetch quiz payment methods' });
  }
});

/**
 * POST /api/quiz-rooms/:roomId/payment-methods
 * Update linked payment methods for a quiz room
 * Body: { payment_method_ids: number[] }
 */
router.post('/quiz-rooms/:roomId/payment-methods', authenticateToken, async (req, res) => {  // ✅ Remove /api prefix
  try {
    const { roomId } = req.params;
    const clubId = req.club_id;
    const userId = req.user_id;
    const { payment_method_ids } = req.body || {};

    console.log(`[quiz-payment-methods] POST request for roomId: ${roomId}, clubId: ${clubId}`);
    console.log(`[quiz-payment-methods] Payment method IDs:`, payment_method_ids);

    if (!Array.isArray(payment_method_ids)) {
      return res.status(400).json({ 
        error: 'payment_method_ids must be an array' 
      });
    }

    const result = await svc.updateLinkedPaymentMethods({ 
      roomId, 
      clubId, 
      paymentMethodIds: payment_method_ids,
      userId 
    });

    console.log(`[quiz-payment-methods] Update successful:`, result);
    res.json({ 
      message: 'Payment methods updated successfully',
      linked_payment_methods: result 
    });
  } catch (err) {
    if (err?.message === 'Quiz room not found') {
      return res.status(404).json({ error: 'Quiz room not found' });
    }
    if (err?.message === 'Access denied') {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (err?.message?.includes('Invalid payment method')) {
      return res.status(400).json({ error: err.message });
    }

    console.error('[quiz-payment-methods] update error:', err);
    res.status(500).json({ error: 'Failed to update payment methods' });
  }
});

export default router;