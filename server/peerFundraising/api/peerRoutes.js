import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import authenticateToken from '../../middleware/auth.js';
import * as svc from '../services/peerCoreService.js';
import { confirmPeerOrderForClub, rejectPeerOrder } from '../services/peerOrderCompletionService.js';
import { getAvailableMethodsForClub, getPublicMethods } from '../services/peerPaymentMethodsService.js';

const router=Router();
const limiter=rateLimit({windowMs:10*60*1000,max:60,standardHeaders:true,legacyHeaders:false});
const send=(res,p)=>res.json({ok:true,...p});
const fail=(res,e)=>res.status(e.status||500).json({ok:false,error:e.message||'internal_error'});

router.get('/peer-fundraisers',authenticateToken,async(req,res)=>{try{send(res,await svc.listFundraisers(req.club_id));}catch(e){fail(res,e);}});
router.post('/peer-fundraisers',authenticateToken,async(req,res)=>{try{res.status(201).json({ok:true,...await svc.createFundraiser(req.club_id,req.body,req.reporting_currency)});}catch(e){fail(res,e);}});
// Must be registered before GET /peer-fundraisers/:id - otherwise Express
// matches "available-payment-methods" as the :id param and this 404s
// (or worse, silently hits getFundraiser with a garbage id) depending on
// route registration order elsewhere.
router.get('/peer-fundraisers/available-payment-methods',authenticateToken,async(req,res)=>{try{send(res,await getAvailableMethodsForClub(req.club_id));}catch(e){fail(res,e);}});
router.get('/peer-fundraisers/:id',authenticateToken,async(req,res)=>{try{send(res,await svc.getFundraiser(req.params.id,req.club_id));}catch(e){fail(res,e);}});
router.patch('/peer-fundraisers/:id',authenticateToken,async(req,res)=>{try{send(res,await svc.updateFundraiser(req.params.id,req.club_id,req.body));}catch(e){fail(res,e);}});
router.get('/peer-fundraisers/:id/available-rooms',authenticateToken,async(req,res)=>{try{send(res,await svc.availableRooms(req.params.id,req.club_id));}catch(e){fail(res,e);}});
router.get('/peer-fundraisers/:id/participants',authenticateToken,async(req,res)=>{try{send(res,await svc.listParticipants(req.params.id,req.club_id));}catch(e){fail(res,e);}});
router.post('/peer-fundraisers/:id/participants',authenticateToken,async(req,res)=>{try{res.status(201).json({ok:true,...await svc.createParticipant(req.params.id,req.club_id,req.body)});}catch(e){fail(res,e);}});
router.patch('/peer-fundraisers/:id/participants/:participantId',authenticateToken,async(req,res)=>{try{send(res,await svc.updateParticipant(req.params.id,req.club_id,req.params.participantId,req.body));}catch(e){fail(res,e);}});
router.delete('/peer-fundraisers/:id/participants/:participantId',authenticateToken,async(req,res)=>{try{send(res,await svc.deleteParticipant(req.params.id,req.club_id,req.params.participantId));}catch(e){fail(res,e);}});
router.get('/peer-fundraisers/:id/packs',authenticateToken,async(req,res)=>{try{send(res,await svc.listPacks(req.params.id,req.club_id));}catch(e){fail(res,e);}});
router.post('/peer-fundraisers/:id/packs',authenticateToken,async(req,res)=>{try{res.status(201).json({ok:true,...await svc.savePack(req.params.id,req.club_id,null,req.body)});}catch(e){fail(res,e);}});
router.patch('/peer-fundraisers/:id/packs/:packId',authenticateToken,async(req,res)=>{try{send(res,await svc.savePack(req.params.id,req.club_id,req.params.packId,req.body));}catch(e){fail(res,e);}});
router.post('/peer-fundraisers/:id/packs/:packId/hide',authenticateToken,async(req,res)=>{try{send(res,await svc.hidePack(req.params.id,req.club_id,req.params.packId));}catch(e){fail(res,e);}});
router.post('/peer-fundraisers/:id/packs/:packId/duplicate',authenticateToken,async(req,res)=>{try{res.status(201).json({ok:true,...await svc.duplicatePack(req.params.id,req.club_id,req.params.packId)});}catch(e){fail(res,e);}});
router.post('/peer-fundraisers/:id/packs/apply-template',authenticateToken,async(req,res)=>{try{res.status(201).json({ok:true,...await svc.applyTemplate(req.params.id,req.club_id,req.body?.templateKey)});}catch(e){fail(res,e);}});
router.get('/peer-fundraisers/:id/orders',authenticateToken,async(req,res)=>{try{send(res,await svc.listOrders(req.params.id,req.club_id));}catch(e){fail(res,e);}});
// Confirm now runs the full expansion (creates peer_entries + quiz_tickets + join links).
// Previously this route flipped payment_status only and never expanded.
router.post('/peer-fundraisers/:id/orders/:orderId/confirm',authenticateToken,async(req,res)=>{try{send(res,await confirmPeerOrderForClub(req.params.orderId,req.params.id,req.club_id));}catch(e){fail(res,e);}});
router.post('/peer-fundraisers/:id/orders/:orderId/reject',authenticateToken,async(req,res)=>{try{send(res,await rejectPeerOrder(req.params.orderId,req.params.id,req.club_id,req.body?.reason));}catch(e){fail(res,e);}});

// Must be registered before the wildcard :clubSlug/:fundraiserSlug[/:participantSlug]
// routes below. Both are GET routes with the same segment count as this one,
// and Express has no literal-vs-wildcard precedence rule - whichever route
// is registered first wins. This previously lived in a separate file
// (peerPaymentRoutes.js), which meant its precedence depended on which file
// got app.use()'d first in the server - fragile, and the actual cause of
// two rounds of "club_not_found" errors (first as a 2-segment collision
// with :clubSlug/:fundraiserSlug, then again as a 3-segment collision with
// :clubSlug/:fundraiserSlug/:participantSlug after the first attempted fix).
// Keeping it in the SAME router as the wildcards, ahead of them, guarantees
// correct precedence no matter what else is mounted or in what order.
router.get('/peer-support/fundraiser/:id/payment-methods',limiter,async(req,res)=>{try{send(res,await getPublicMethods(req.params.id));}catch(e){fail(res,e);}});

// Same fix, same reasoning as payment-methods above - this is ALSO a
// 3-segment GET route (orders/:orderId/summary) that was sitting AFTER
// the :clubSlug/:fundraiserSlug/:participantSlug wildcard, meaning it was
// silently vulnerable to the identical collision (an orderId would get
// treated as a fundraiserSlug, "summary" as a participantSlug). This is
// exactly the route the thank-you screen and Stripe-success polling
// depend on - moved here proactively rather than waiting for it to
// surface as a third round of "club_not_found".
router.get('/peer-support/orders/:orderId/summary',limiter,async(req,res)=>{try{send(res,await svc.getPublicOrderSummary(req.params.orderId));}catch(e){fail(res,e);}});

router.get('/peer-support/:clubSlug/:fundraiserSlug',limiter,async(req,res)=>{try{send(res,await svc.publicPayload(req.params.clubSlug,req.params.fundraiserSlug));}catch(e){fail(res,e);}});
router.get('/peer-support/:clubSlug/:fundraiserSlug/:participantSlug',limiter,async(req,res)=>{try{send(res,await svc.publicPayload(req.params.clubSlug,req.params.fundraiserSlug,req.params.participantSlug));}catch(e){fail(res,e);}});
router.post('/peer-support/:fundraiserId/orders',limiter,async(req,res)=>{try{res.status(201).json({ok:true,...await svc.createOrder(req.params.fundraiserId,req.body)});}catch(e){fail(res,e);}});
router.post('/peer-support/orders/:orderId/claim',limiter,async(req,res)=>{try{send(res,await svc.claimOrder(req.params.orderId,req.body));}catch(e){fail(res,e);}});

export default router;
