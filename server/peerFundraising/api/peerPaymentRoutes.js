import { Router } from 'express';
import authenticateToken from '../../middleware/auth.js';
import * as methods from '../services/peerPaymentMethodsService.js';
import { createPeerStripeSession } from '../services/peerStripeCheckoutService.js';
import { report } from '../services/peerReportingService.js';

const router=Router();
const fail=(res,e)=>res.status(e.status||500).json({ok:false,error:e.message||'internal_error'});
router.get('/peer-fundraisers/:id/payment-methods',authenticateToken,async(req,res)=>{try{res.json({ok:true,...await methods.getManagementMethods(req.params.id,req.club_id)});}catch(e){fail(res,e);}});
router.post('/peer-fundraisers/:id/payment-methods',authenticateToken,async(req,res)=>{try{res.json({ok:true,...await methods.updateMethods(req.params.id,req.club_id,req.body?.paymentMethodIds||[],req.user?.id||null)});}catch(e){fail(res,e);}});
router.get('/peer-fundraisers/:id/report',authenticateToken,async(req,res)=>{try{res.json({ok:true,...await report(req.params.id,req.club_id)});}catch(e){fail(res,e);}});
// NOTE: this used to be GET /peer-support/:id/payment-methods - the exact
// same 2-segment shape as GET /peer-support/:clubSlug/:fundraiserSlug in
// peerRoutes.js. Since they live in different router files, whichever one
// gets app.use()'d first in the server wins for EVERY request matching that
// shape, including ones meant for the other route. A fundraiser id was
// getting treated as a club slug and "payment-methods" as a fundraiser
// slug, producing "club_not_found". Adding a literal 'fundraiser' segment
// makes this a 3-segment path, which can never match the 2-segment club/
// fundraiser-slug route regardless of registration order.
// The public payment-methods lookup (GET /peer-support/fundraiser/:id/payment-methods)
// now lives in peerRoutes.js, registered ahead of the wildcard
// :clubSlug/:fundraiserSlug[/:participantSlug] routes it would otherwise
// collide with - see the comment there for why. `methods` (getManagementMethods,
// updateMethods) is still used below for the auth-gated management routes.
router.post('/peer-support/orders/:orderId/stripe-checkout',async(req,res)=>{try{res.json({ok:true,...await createPeerStripeSession({orderId:req.params.orderId,origin:req.get('origin')||`${req.protocol}://${req.get('host')}`})});}catch(e){fail(res,e);}});
// NOTE: the old /orders/:orderId/confirm-and-expand route lived here and took
// no fundraiser/club ownership check at all - any authenticated club user
// could confirm ANY order in the system by orderId alone. Confirm now lives
// as /peer-fundraisers/:id/orders/:orderId/confirm in peerRoutes.js, checked
// against both :id (fundraiser) and req.club_id before touching anything.
export default router;
