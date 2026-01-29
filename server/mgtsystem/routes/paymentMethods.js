// server/mgtsystem/api/payment-methods.js
import express from 'express';
import { getClubPaymentMethods } from '../services/paymentMethodsService.js';

const router = express.Router();

/**
 * GET /api/payment-methods/:clubId
 * Fetch enabled instant payment methods for a club
 * Public endpoint (no auth) - players need this during join flow
 */
router.get('/:clubId', async (req, res) => {
  try {
    const { clubId } = req.params;
    
    if (!clubId) {
      return res.status(400).json({ 
        ok: false, 
        error: 'clubId is required' 
      });
    }
    
    console.log(`📋 Fetching payment methods for club: ${clubId}`);
    
    const paymentMethods = await getClubPaymentMethods(clubId);
    
    console.log(`✅ Found ${paymentMethods.length} payment methods for club ${clubId}`);
    
    res.json({ 
      ok: true, 
      paymentMethods 
    });
    
  } catch (error) {
    console.error('❌ Error fetching payment methods:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to fetch payment methods',
      message: error.message 
    });
  }
});

export default router;