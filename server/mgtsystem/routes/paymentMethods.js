// server/mgtsystem/routes/paymentMethods.js
import express from 'express';
import { 
  getClubPaymentMethods,
  getAllClubPaymentMethods,
  getPaymentMethodById,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  updateDisplayOrders,
} from '../services/paymentMethodsService.js';
import { authenticateToken } from '../../middleware/auth.js';

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
    
    console.log(`📋 Fetching enabled payment methods for club: ${clubId}`);
    
    const paymentMethods = await getClubPaymentMethods(clubId);
    
    console.log(`✅ Found ${paymentMethods.length} enabled payment methods for club ${clubId}`);
    
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

/**
 * GET /api/payment-methods/:clubId/manage
 * Fetch ALL payment methods for management (enabled + disabled)
 * Protected endpoint - requires auth
 */
router.get('/:clubId/manage', authenticateToken, async (req, res) => {
  try {
    const { clubId } = req.params;
    
    // Verify user has access to this club
    if (req.user.club_id !== clubId) {
      return res.status(403).json({ 
        ok: false, 
        error: 'Not authorized to manage this club\'s payment methods' 
      });
    }
    
    console.log(`📋 Fetching all payment methods for club management: ${clubId}`);
    
    const paymentMethods = await getAllClubPaymentMethods(clubId);
    
    console.log(`✅ Found ${paymentMethods.length} total payment methods for club ${clubId}`);
    
    res.json({ 
      ok: true, 
      paymentMethods 
    });
    
  } catch (error) {
    console.error('❌ Error fetching payment methods for management:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to fetch payment methods',
      message: error.message 
    });
  }
});

/**
 * POST /api/payment-methods/:clubId
 * Create new payment method
 * Protected endpoint - requires auth
 */
router.post('/:clubId', authenticateToken, async (req, res) => {
  try {
    const { clubId } = req.params;
    
    // Verify user has access to this club
    if (req.user.club_id !== clubId) {
      return res.status(403).json({ 
        ok: false, 
        error: 'Not authorized to create payment methods for this club' 
      });
    }
    
    const {
      methodCategory,
      providerName,
      methodLabel,
      playerInstructions,
      methodConfig,
      isEnabled,
      displayOrder,
      isOfficialClubAccount,
    } = req.body;
    
    // Validation
    if (!methodCategory || !methodLabel) {
      return res.status(400).json({
        ok: false,
        error: 'methodCategory and methodLabel are required'
      });
    }
    
    console.log(`➕ Creating payment method for club ${clubId}:`, methodLabel);
    
    const newId = await createPaymentMethod({
      clubId,
      methodCategory,
      providerName,
      methodLabel,
      playerInstructions,
      methodConfig,
      isEnabled: isEnabled !== undefined ? isEnabled : true,
      displayOrder: displayOrder || 0,
      addedBy: req.user.name || req.user.email,
      isOfficialClubAccount: isOfficialClubAccount !== undefined ? isOfficialClubAccount : true,
    });
    
    console.log(`✅ Created payment method with ID: ${newId}`);
    
    // Fetch the created method to return full data
    const created = await getPaymentMethodById(newId, clubId);
    
    res.json({ 
      ok: true, 
      paymentMethod: created 
    });
    
  } catch (error) {
    console.error('❌ Error creating payment method:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to create payment method',
      message: error.message 
    });
  }
});

/**
 * PUT /api/payment-methods/:clubId/:methodId
 * Update existing payment method
 * Protected endpoint - requires auth
 */
router.put('/:clubId/:methodId', authenticateToken, async (req, res) => {
  try {
    const { clubId, methodId } = req.params;
    
    // Verify user has access to this club
    if (req.user.club_id !== clubId) {
      return res.status(403).json({ 
        ok: false, 
        error: 'Not authorized to update this club\'s payment methods' 
      });
    }
    
    const {
      methodCategory,
      providerName,
      methodLabel,
      playerInstructions,
      methodConfig,
      isEnabled,
      displayOrder,
      isOfficialClubAccount,
    } = req.body;
    
    // Validation
    if (!methodCategory || !methodLabel) {
      return res.status(400).json({
        ok: false,
        error: 'methodCategory and methodLabel are required'
      });
    }
    
    console.log(`✏️ Updating payment method ${methodId} for club ${clubId}`);
    
    const updated = await updatePaymentMethod({
      id: methodId,
      clubId,
      methodCategory,
      providerName,
      methodLabel,
      playerInstructions,
      methodConfig,
      isEnabled: isEnabled !== undefined ? isEnabled : true,
      displayOrder: displayOrder !== undefined ? displayOrder : 0,
      editedBy: req.user.name || req.user.email,
      isOfficialClubAccount: isOfficialClubAccount !== undefined ? isOfficialClubAccount : true,
    });
    
    if (!updated) {
      return res.status(404).json({
        ok: false,
        error: 'Payment method not found'
      });
    }
    
    console.log(`✅ Updated payment method ${methodId}`);
    
    // Fetch updated method to return full data
    const updatedMethod = await getPaymentMethodById(methodId, clubId);
    
    res.json({ 
      ok: true, 
      paymentMethod: updatedMethod 
    });
    
  } catch (error) {
    console.error('❌ Error updating payment method:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to update payment method',
      message: error.message 
    });
  }
});

/**
 * DELETE /api/payment-methods/:clubId/:methodId
 * Delete payment method
 * Protected endpoint - requires auth
 */
router.delete('/:clubId/:methodId', authenticateToken, async (req, res) => {
  try {
    const { clubId, methodId } = req.params;
    
    // Verify user has access to this club
    if (req.user.club_id !== clubId) {
      return res.status(403).json({ 
        ok: false, 
        error: 'Not authorized to delete this club\'s payment methods' 
      });
    }
    
    console.log(`🗑️ Deleting payment method ${methodId} for club ${clubId}`);
    
    const deleted = await deletePaymentMethod(clubId, methodId);
    
    if (!deleted) {
      return res.status(404).json({
        ok: false,
        error: 'Payment method not found'
      });
    }
    
    console.log(`✅ Deleted payment method ${methodId}`);
    
    res.json({ 
      ok: true, 
      message: 'Payment method deleted successfully' 
    });
    
  } catch (error) {
    console.error('❌ Error deleting payment method:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to delete payment method',
      message: error.message 
    });
  }
});

/**
 * PATCH /api/payment-methods/:clubId/reorder
 * Update display order for multiple methods
 * Protected endpoint - requires auth
 */
router.patch('/:clubId/reorder', authenticateToken, async (req, res) => {
  try {
    const { clubId } = req.params;
    const { orders } = req.body;
    
    // Verify user has access to this club
    if (req.user.club_id !== clubId) {
      return res.status(403).json({ 
        ok: false, 
        error: 'Not authorized to reorder this club\'s payment methods' 
      });
    }
    
    // Validation
    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'orders array is required'
      });
    }
    
    console.log(`🔄 Reordering ${orders.length} payment methods for club ${clubId}`);
    
    await updateDisplayOrders(clubId, orders);
    
    console.log(`✅ Reordered payment methods`);
    
    res.json({ 
      ok: true, 
      message: 'Display order updated successfully' 
    });
    
  } catch (error) {
    console.error('❌ Error reordering payment methods:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to update display order',
      message: error.message 
    });
  }
});

export default router;