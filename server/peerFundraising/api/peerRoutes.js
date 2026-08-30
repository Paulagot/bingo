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
import { verifyAndRecordSolanaDonation } from '../../donations/services/cryptoSolanaDonationVerificationService.js';
import { getPublicFundraiserImpact } from '../services/peerImpactService.js';

const router=Router();
const limiter=rateLimit({windowMs:10*60*1000,max:60,standardHeaders:true,legacyHeaders:false});
const cryptoLimiter=rateLimit({windowMs:10*60*1000,max:10,standardHeaders:true,legacyHeaders:false,message:{ok:false,error:'Too many crypto payment attempts. Please wait a few minutes.'}});
const send=(res,p)=>res.json({ok:true,...p});
const fail=(res,e)=>res.status(e.status||e.statusCode||500).json({ok:false,error:e.message||'internal_error'});
const actor=req=>({
  id:req.user?.id||req.club_id,
  name:req.user?.name||req.user?.email||'Admin',
  role:req.user?.role==='host'?'host':'admin',
});

// ─── Management routes (auth-gated) ──────────────────────────────────────────

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

// ─── Public support routes - specific paths MUST come before wildcards ────────

router.get('/peer-support/fundraiser/:id/payment-methods',limiter,async(req,res)=>{try{send(res,await getPublicMethods(req.params.id));}catch(e){fail(res,e);}});
router.get('/peer-support/orders/:orderId/summary',limiter,async(req,res)=>{try{send(res,await svc.getPublicOrderSummary(req.params.orderId));}catch(e){fail(res,e);}});
router.get('/peer-support/donations/status',limiter,async(req,res)=>{try{send(res,await donations.getPublicPeerDonationStatus({sessionId:req.query.sessionId}));}catch(e){fail(res,e);}});
router.get('/peer-support/fundraiser/:fundraiserId/impact', limiter, async (req, res) => {
  try {
    send(res, await getPublicFundraiserImpact(req.params.fundraiserId));
  } catch(e) { fail(res, e); }
});
// Crypto donation confirm - uses /donations/:donationId/... so must be before
// the /:fundraiserId/donations/... wildcard routes below.
router.post('/peer-support/donations/:donationId/crypto-confirm',cryptoLimiter,async(req,res)=>{
  try{
    const{donationId}=req.params;
    // CryptoFixedFeeStep sends entryFeeRaw + extrasRaw + cryptoDisplayAmount,
    // not rawAmount/displayAmount. Sum the raw values for on-chain verification.
    const{network='mainnet',txHash,senderWallet,recipientWallet,tokenCode,tokenMint=null,entryFeeRaw,extrasRaw='0',cryptoDisplayAmount}=req.body??{};
    const rawAmount=(BigInt(String(entryFeeRaw||'0'))+BigInt(String(extrasRaw||'0'))).toString();
    const displayAmount=cryptoDisplayAmount;
    if(!txHash||!senderWallet||!recipientWallet)return res.status(400).json({ok:false,error:'txHash, senderWallet and recipientWallet are required'});
    const verification=await verifyAndRecordSolanaDonation({donationId,network,txHash,senderWallet,recipientWallet,tokenCode,tokenMint,rawAmount,displayAmount});
    await donations.confirmPublicPeerCryptoDonation({donationId,txHash});
    console.log(`[PeerRoutes] ✅ Crypto donation ${donationId} confirmed via txHash ${txHash.slice(0,16)}...`);
    res.json({ok:true,donationId,txHash,ledgerAmount:verification.donationAmount,ledgerCurrency:verification.donationCurrency});
  }catch(e){fail(res,e);}
});

// ─── Public wildcard routes - these must stay LAST in this block ─────────────
// Any new specific /peer-support/... routes must go ABOVE these lines.

router.get('/peer-support/:clubSlug/:fundraiserSlug',limiter,async(req,res)=>{try{send(res,await svc.publicPayload(req.params.clubSlug,req.params.fundraiserSlug));}catch(e){fail(res,e);}});
router.get('/peer-support/:clubSlug/:fundraiserSlug/:participantSlug',limiter,async(req,res)=>{try{send(res,await svc.publicPayload(req.params.clubSlug,req.params.fundraiserSlug,req.params.participantSlug));}catch(e){fail(res,e);}});
router.post('/peer-support/:fundraiserId/orders',limiter,async(req,res)=>{try{res.status(201).json({ok:true,...await svc.createOrder(req.params.fundraiserId,req.body)});}catch(e){fail(res,e);}});
router.post('/peer-support/orders/:orderId/claim',limiter,async(req,res)=>{try{send(res,await svc.claimOrder(req.params.orderId,req.body));}catch(e){fail(res,e);}});
router.post('/peer-support/:fundraiserId/donations/manual',limiter,async(req,res)=>{try{res.status(201).json({ok:true,...await donations.createPublicPeerManualDonation({fundraiserId:req.params.fundraiserId,...req.body})});}catch(e){fail(res,e);}});
router.post('/peer-support/:fundraiserId/donations/stripe-checkout',limiter,async(req,res)=>{try{res.status(201).json({ok:true,...await donations.createPublicPeerStripeDonation({fundraiserId:req.params.fundraiserId,...req.body})});}catch(e){fail(res,e);}});

// Crypto checkout - /:fundraiserId/donations/crypto-checkout. Placed here
// (after the GET wildcards, alongside the other /:fundraiserId/donations/...
// routes) because POST /:fundraiserId/... is a different verb from
// GET /:clubSlug/:fundraiserSlug so there is no conflict.
router.post('/peer-support/:fundraiserId/donations/crypto-checkout',cryptoLimiter,async(req,res)=>{
  try{
    const{fundraiserId}=req.params;
    const{clubPaymentMethodId,donorName,donorEmail,amount,participantId=null}=req.body??{};
    if(!clubPaymentMethodId)return res.status(400).json({ok:false,error:'clubPaymentMethodId is required'});
    res.status(201).json({ok:true,...await donations.createPublicPeerCryptoDonation({fundraiserId,participantId,clubPaymentMethodId,donorName,donorEmail,amount})});
  }catch(e){fail(res,e);}
});

export default router;
