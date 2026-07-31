import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import authenticateToken from '../../middleware/auth.js';
import * as svc from '../services/peerCoreService.js';
import * as donations from '../services/peerDonationService.js';
import {
  confirmPeerOrderForClub,
  rejectPeerOrder,
  retryPeerOrderFulfilment,
} from '../services/peerOrderCompletionService.js';
import { getAvailableMethodsForClub, getPublicMethods } from '../services/peerPaymentMethodsService.js';

const router=Router();
const limiter=rateLimit({windowMs:10*60*1000,max:60,standardHeaders:true,legacyHeaders:false});
const send=(res,p)=>res.json({ok:true,...p});
const fail=(res,e)=>res.status(e.status||500).json({ok:false,error:e.message||'internal_error'});
const actor=req=>({
  id:req.user?.id||req.club_id,
  name:req.user?.name||req.user?.email||'Admin',
  role:req.user?.role==='host'?'host':'admin',
});

router.get('/peer-fundraisers',authenticateToken,async(req,res)=>{try{send(res,await svc.listFundraisers(req.club_id));}catch(e){fail(res,e);}});
router.post('/peer-fundraisers',authenticateToken,async(req,res)=>{try{res.status(201).json({ok:true,...await svc.createFundraiser(req.club_id,req.body,req.reporting_currency)});}catch(e){fail(res,e);}});
router.get('/peer-fundraisers/available-payment-methods',authenticateToken,async(req,res)=>{try{send(res,await getAvailableMethodsForClub(req.club_id));}catch(e){fail(res,e);}});
router.get('/peer-fundraisers/:id',authenticateToken,async(req,res)=>{try{send(res,await svc.getFundraiser(req.params.id,req.club_id));}catch(e){fail(res,e);}});
router.patch('/peer-fundraisers/:id',authenticateToken,async(req,res)=>{try{send(res,await svc.updateFundraiser(req.params.id,req.club_id,req.body));}catch(e){fail(res,e);}});
router.get('/peer-fundraisers/:id/available-rooms',authenticateToken,async(req,res)=>{try{send(res,await svc.availableRooms(req.params.id,req.club_id));}catch(e){fail(res,e);}});
router.get('/peer-fundraisers/:id/available-sponsored-rooms',authenticateToken,async(req,res)=>{try{send(res,await svc.availableSponsoredRooms(req.params.id,req.club_id));}catch(e){fail(res,e);}});
router.get('/peer-fundraisers/:id/sponsorship-summary',authenticateToken,async(req,res)=>{try{send(res,await svc.getPeerSponsorshipSummary(req.params.id,req.club_id));}catch(e){fail(res,e);}});
router.get('/peer-fundraisers/:id/sponsorships',authenticateToken,async(req,res)=>{try{send(res,await svc.listPeerSponsorships(req.params.id,req.club_id));}catch(e){fail(res,e);}});
router.patch('/peer-fundraisers/:id/sponsorships/:contributionId/confirm',authenticateToken,async(req,res)=>{try{send(res,await svc.confirmPeerSponsorship(req.params.id,req.club_id,req.params.contributionId,actor(req)));}catch(e){fail(res,e);}});
router.patch('/peer-fundraisers/:id/sponsorships/:contributionId/dispute',authenticateToken,async(req,res)=>{try{send(res,await svc.disputePeerSponsorship(req.params.id,req.club_id,req.params.contributionId,req.body?.reason,actor(req)));}catch(e){fail(res,e);}});
router.get('/peer-fundraisers/:id/payment-report',authenticateToken,async(req,res)=>{try{send(res,await svc.getPeerPaymentReport(req.params.id,req.club_id));}catch(e){fail(res,e);}});
router.get('/peer-fundraisers/:id/donations',authenticateToken,async(req,res)=>{try{send(res,await donations.listPeerDonations(req.params.id,req.club_id));}catch(e){fail(res,e);}});
router.patch('/peer-fundraisers/:id/donations/:donationId/confirm',authenticateToken,async(req,res)=>{try{send(res,await donations.confirmPeerDonationForClub(req.params.id,req.club_id,req.params.donationId));}catch(e){fail(res,e);}});
router.patch('/peer-fundraisers/:id/donations/:donationId/reject',authenticateToken,async(req,res)=>{try{send(res,await donations.rejectPeerDonationForClub(req.params.id,req.club_id,req.params.donationId));}catch(e){fail(res,e);}});
router.get('/peer-fundraisers/:id/participants',authenticateToken,async(req,res)=>{try{send(res,await svc.listParticipants(req.params.id,req.club_id));}catch(e){fail(res,e);}});
router.post('/peer-fundraisers/:id/participants',authenticateToken,async(req,res)=>{try{res.status(201).json({ok:true,...await svc.createParticipant(req.params.id,req.club_id,req.body)});}catch(e){fail(res,e);}});
router.patch('/peer-fundraisers/:id/participants/:participantId',authenticateToken,async(req,res)=>{try{send(res,await svc.updateParticipant(req.params.id,req.club_id,req.params.participantId,req.body));}catch(e){fail(res,e);}});
router.delete('/peer-fundraisers/:id/participants/:participantId',authenticateToken,async(req,res)=>{try{send(res,await svc.deleteParticipant(req.params.id,req.club_id,req.params.participantId));}catch(e){fail(res,e);}});
router.get('/peer-fundraisers/:id/packs',authenticateToken,async(req,res)=>{try{send(res,await svc.listPacks(req.params.id,req.club_id));}catch(e){fail(res,e);}});
router.post('/peer-fundraisers/:id/packs',authenticateToken,async(req,res)=>{try{res.status(201).json({ok:true,...await svc.savePack(req.params.id,req.club_id,null,req.body)});}catch(e){fail(res,e);}});
router.patch('/peer-fundraisers/:id/packs/:packId',authenticateToken,async(req,res)=>{try{send(res,await svc.savePack(req.params.id,req.club_id,req.params.packId,req.body));}catch(e){fail(res,e);}});
router.post('/peer-fundraisers/:id/packs/:packId/hide',authenticateToken,async(req,res)=>{try{send(res,await svc.hidePack(req.params.id,req.club_id,req.params.packId));}catch(e){fail(res,e);}});
router.post('/peer-fundraisers/:id/packs/:packId/duplicate',authenticateToken,async(req,res)=>{try{res.status(201).json({ok:true,...await svc.duplicatePack(req.params.id,req.club_id,req.params.packId)});}catch(e){fail(res,e);}});
router.get('/peer-fundraisers/:id/orders',authenticateToken,async(req,res)=>{try{send(res,await svc.listOrders(req.params.id,req.club_id));}catch(e){fail(res,e);}});
router.post('/peer-fundraisers/:id/orders/:orderId/confirm',authenticateToken,async(req,res)=>{try{send(res,await confirmPeerOrderForClub(req.params.orderId,req.params.id,req.club_id));}catch(e){fail(res,e);}});
router.post('/peer-fundraisers/:id/orders/:orderId/reject',authenticateToken,async(req,res)=>{try{send(res,await rejectPeerOrder(req.params.orderId,req.params.id,req.club_id,req.body?.reason));}catch(e){fail(res,e);}});
router.post('/peer-fundraisers/:id/orders/:orderId/retry-fulfilment',authenticateToken,async(req,res)=>{try{send(res,await retryPeerOrderFulfilment(req.params.orderId,req.params.id,req.club_id));}catch(e){fail(res,e);}});

router.get('/peer-support/fundraiser/:id/payment-methods',limiter,async(req,res)=>{try{send(res,await getPublicMethods(req.params.id));}catch(e){fail(res,e);}});
router.get('/peer-support/orders/:orderId/summary',limiter,async(req,res)=>{try{send(res,await svc.getPublicOrderSummary(req.params.orderId));}catch(e){fail(res,e);}});

router.get('/peer-support/:clubSlug/:fundraiserSlug',limiter,async(req,res)=>{try{send(res,await svc.publicPayload(req.params.clubSlug,req.params.fundraiserSlug));}catch(e){fail(res,e);}});
router.get('/peer-support/:clubSlug/:fundraiserSlug/:participantSlug',limiter,async(req,res)=>{try{send(res,await svc.publicPayload(req.params.clubSlug,req.params.fundraiserSlug,req.params.participantSlug));}catch(e){fail(res,e);}});
router.post('/peer-support/:fundraiserId/orders',limiter,async(req,res)=>{try{res.status(201).json({ok:true,...await svc.createOrder(req.params.fundraiserId,req.body)});}catch(e){fail(res,e);}});
router.post('/peer-support/orders/:orderId/claim',limiter,async(req,res)=>{try{send(res,await svc.claimOrder(req.params.orderId,req.body));}catch(e){fail(res,e);}});

export default router;
