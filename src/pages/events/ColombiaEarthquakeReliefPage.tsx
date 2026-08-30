// src/pages/events/ColombiaEarthquakeReliefPage.tsx
//
// Mobile-first fundraising event page for the Colombia Earthquake Relief event
// at Slane Castle, hosted during the Superteam Ireland founder residency.
//
// UPDATED: TicketPurchaseFlow replaced with peer pack checkout so supporters
// can buy Game One, Game Two, or Both Games in a single transaction.
// DonationModal replaced with peer donation flow so peer_fundraiser_id is
// recorded on every donation row.
//
// UPDATED: Irish Red Cross confirmed as beneficiary. Funds collected by
// FundRaisely on behalf of Superteam Ireland, then transferred directly to
// the Irish Red Cross Colombia Appeal after the event closes.
//
// ── CONFIG TO CHANGE PER ENVIRONMENT ────────────────────────────────────────
// PEER_FUNDRAISER_ID - swap for the production peer fundraiser ID before launch
// PACK_BOTH_ID / PACK_GAME_ONE_ID / PACK_GAME_TWO_ID - swap if packs are
// recreated in production
// DONATION_CLUB_PAYMENT_METHOD_ID - the club's payment method ID for donations
// ────────────────────────────────────────────────────────────────────────────

import React, { lazy, Suspense, useState, useCallback, useEffect,  } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock,
  CreditCard,
  Copy,
  ExternalLink,
  Facebook,
  Heart,
  HeartHandshake,
  Linkedin,
  Loader2,
  MapPin,
  Share2,
  Shield,
  Smartphone,
  Sparkles,
  Ticket,
  Trophy,
  Users,
  X,
} from "lucide-react";

import api from "../../services/PeerSupportService";
import type {
  PublicPeerPaymentMethod,
  PeerOrderSummary,
  PeerGeneratedEntry,
} from "../../services/PeerSupportService";
import PeerOrderThankYou from "../../components/peer/PeerOrderThankYou";
import {
  PaymentInstructionsContent,
  PaymentInstructionsFooter,
} from "../../components/Quiz/shared/PaymentInstructions";
import {
  isStripeMethod,
  isCryptoMethod,
  isCashMethod,
  
  hasProviderInstructionStep,
  methodDisplay,
  generateReference,
  friendlyOrderError,

  fmt,
  isValidEmail,
} from "../../pages/peer/support/peerSupporthelpers";

const CryptoFixedFeeStep = lazy(() =>
  import("../../components/Quiz/joinroom/crypto/CryptoFixedFeeStep").then(m => ({
    default: m.CryptoFixedFeeStep,
  })),
);

const Web3Provider = lazy(() =>
  import("../../components/Web3Provider").then(m => ({ default: m.Web3Provider })),
);

// -----------------------------------------------------------------------------
// EVENT CONFIG - update these per environment
// -----------------------------------------------------------------------------

// const PEER_FUNDRAISER_ID = "60AgXlG9-go1nEAvinmXh";

// const PACK_BOTH_ID     = "3n9bpfN_XcZ2blwoBZwl4"; // Both games - €16
// const PACK_GAME_ONE_ID = "VPnTbQo6aPtiEIADRRvoO"; // Game One - €10
// const PACK_GAME_TWO_ID = "0R38c9lye2XLChGVhrgY4"; // Game Two - €10

const PEER_FUNDRAISER_ID = "KqeRPYMJVHtO_71EcQq48";

const PACK_BOTH_ID     = "qezD2hbL_rz6lliWP2Elr"; // Both games - €16
const PACK_GAME_ONE_ID = "DPKwcy9yy-J0WuBO5JzUT"; // Game One - €10
const PACK_GAME_TWO_ID = "WSWoQ9eSg78xRY9eQ-svr"; // Game Two - €10

const BUNDLE_PRICE   = "€16";
const GAME_PRICE     = "€10";
const CURRENCY       = "EUR";

// -----------------------------------------------------------------------------
// EVENT METADATA
// -----------------------------------------------------------------------------

const EVENT_NAME         = "Colombia Earthquake Relief at Slane Castle";
const EVENT_DATE         = "Saturday 5 September 2026";
const EVENT_TIME         = "4pm (Irish time)";
const EVENT_LOCATION     = "Slane Castle";
const EVENT_ADDRESS      = "Slane, Co. Meath, Ireland";
const EVENT_FULL_ADDRESS = `${EVENT_LOCATION}, ${EVENT_ADDRESS}`;

const FOUNDER_VIDEO_URL = "";
const SUPERTEAM_URL     = "https://ie.superteam.fun/";
const CASTLE_DAO_URL    = "https://castledao.ie/";
const EVENT_PAGE_URL    = "https://fundraisely.ie/events/colombia-earthquake-relief";
const EVENT_SOCIAL_IMAGE = "https://fundraisely.ie/social/colombia-earthquake-og.png";

const MATCH_FUND_SPONSOR = "Alejandro Gutierrez";
const MATCH_FUND_LIMIT   = 1000;

const SHARE_TITLE = "Play for Colombia - Earthquake Relief Fundraiser";
const SHARE_TEXT  =
  "Help us support families affected by the earthquake in western Colombia. Join our FundRaisely Elimination fundraiser at Slane Castle, play from anywhere, donate, or simply share.";

const EARTHQUAKE_IMPACT = {
  deaths:       "300+",
  injured:      "4,500+",
  missing:      "400+",
  homesAffected:"164,000+",
};

const SUPERTEAM_LOGO   = "/partner/superteam_ireland_logo.jpeg";
const FUNDRAISELY_LOGO = "/logos/fundraisely-icon.svg";
const CASTLE_DAO_LOGO  = "/partner/castledao.jpg";
const IRC_LOGO         = "/partner/redcross.jpg";
const IRC_APPEAL_URL   = "https://www.redcross.ie/latest-appeals/colombia-appeal/";
const HERO_IMAGE_SRC   = "https://www.rte.ie/images/0024d35a-642.jpg";
const SECONDARY_IMAGE_SRC = "https://www.rte.ie/images/0024d32d-642.jpg";
const SLANE_VIDEO_URL  = "/videos/castle-dao-launch.mp4";
const ELIMINATION_GIF  = "/images/elimination.gif";

const MAP_EMBED_SRC = `https://www.google.com/maps?q=${encodeURIComponent(EVENT_FULL_ADDRESS)}&output=embed`;
const MAP_DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(EVENT_FULL_ADDRESS)}`;

// -----------------------------------------------------------------------------
// SEO
// -----------------------------------------------------------------------------

function useEventSeo() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const title = "Play for Colombia | Earthquake Relief Fundraiser at Slane Castle | FundRaisely";
    const description = "Play FundRaisely Elimination or donate to support families affected by the earthquake in western Colombia. Join two live €10 games from Slane Castle or play remotely on 5 September 2026.";
    document.title = title;
    const setMeta = (name: string, content: string) => {
      let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!tag) { tag = document.createElement("meta"); tag.setAttribute("name", name); document.head.appendChild(tag); }
      tag.setAttribute("content", content);
    };
    const setProp = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!tag) { tag = document.createElement("meta"); tag.setAttribute("property", property); document.head.appendChild(tag); }
      tag.setAttribute("content", content);
    };
    setMeta("description", description);
    setProp("og:title", title); setProp("og:description", description);
    setProp("og:type", "website"); setProp("og:url", EVENT_PAGE_URL);
    setProp("og:image", EVENT_SOCIAL_IMAGE); setProp("og:site_name", "FundRaisely");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title); setMeta("twitter:description", description);
    setMeta("twitter:image", EVENT_SOCIAL_IMAGE);
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) { canonical = document.createElement("link"); canonical.setAttribute("rel", "canonical"); document.head.appendChild(canonical); }
    canonical.setAttribute("href", EVENT_PAGE_URL);
  }, []);
}

// -----------------------------------------------------------------------------
// IMPACT DATA (backend placeholder)
// -----------------------------------------------------------------------------

type EventImpactData = {
  totalRaised: number | null;
  fundraisingTarget: number | null;
  ticketRevenue: number | null;
  directDonations: number | null;
  totalTicketsSold: number | null;
  gameOneTicketsSold: number | null;
  gameTwoTicketsSold: number | null;
};

function useEventImpact() {
  const [data, setData] = useState<EventImpactData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base = window.location.hostname === 'localhost'
      ? 'http://localhost:3001/api' : '/api';
    fetch(`${base}/peer-support/fundraiser/${PEER_FUNDRAISER_ID}/impact`)
      .then(r => r.json())
      .then(result => {
        if (!result.ok) return;
        // Map roomBreakdown to game-specific counts using known room IDs
        const game1 = result.roomBreakdown?.find(
          (r: any) => r.roomId === '5848007CBBD44647'
        )?.ticketsSold ?? null;
        const game2 = result.roomBreakdown?.find(
          (r: any) => r.roomId === '2A5D2A2B9FA3465F'
        )?.ticketsSold ?? null;
        setData({
          totalRaised:        result.totalRaised,
          fundraisingTarget:  result.fundraisingTarget,
          ticketRevenue:      result.ticketRevenue,
          directDonations:    result.directDonations,
          totalTicketsSold:   result.totalTicketsSold,
          gameOneTicketsSold: game1,
          gameTwoTicketsSold: game2,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

// -----------------------------------------------------------------------------
// PEER CHECKOUT TYPES
// -----------------------------------------------------------------------------

type CheckoutStep =
  | "pack-select"
  | "details"
  | "payment"
  | "payment-instructions"
  | "crypto-fixed-fee"
  | "confirm";

type PackOption = "both" | "game1" | "game2";

const PACK_MAP: Record<PackOption, { id: string; name: string; price: number; label: string }> = {
  both:  { id: PACK_BOTH_ID,     name: "Both Games",        price: 16, label: "€16 - save €4" },
  game1: { id: PACK_GAME_ONE_ID, name: "Game One",           price: 10, label: "€10" },
  game2: { id: PACK_GAME_TWO_ID, name: "Game Two",           price: 10, label: "€10" },
};

// -----------------------------------------------------------------------------
// PAGE
// -----------------------------------------------------------------------------

export default function ColombiaEarthquakeReliefPage() {
  useEventSeo();

  const { data, loading: impactLoading } = useEventImpact();
  const [searchParams] = useSearchParams();

  // ── Handle Stripe donation return ──────────────────────────────────────────
  // When Stripe redirects back to this page with ?donation=thanks&session_id=,
  // open the donation sheet and poll until the webhook confirms the payment.
  useEffect(() => {
    const donationReturn = searchParams.get('donation');
    const sessionId = searchParams.get('session_id');
    if (donationReturn !== 'thanks' || !sessionId) return;

    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    setIsDonateSheetOpen(true);
    setDonateStep('waiting-stripe' as any);

    const base = window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api';

    const poll = async () => {
      try {
        const res = await fetch(`${base}/peer-support/donations/status?sessionId=${encodeURIComponent(sessionId)}`);
        const result = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (result.status === 'confirmed') {
          setDonateConfirmed({ amount: Number(result.amount), currency: result.currency || CURRENCY });
          setDonateStep('confirm');
          // Clean up URL
          const clean = new URL(window.location.href);
          clean.searchParams.delete('donation');
          clean.searchParams.delete('session_id');
          window.history.replaceState({}, '', `${clean.pathname}${clean.search}`);
          return;
        }

        if (attempts < 12) {
          attempts += 1;
          timer = setTimeout(poll, 2000);
        } else {
          // Timed out but payment likely went through - show generic confirm
          setDonateConfirmed({ amount: 0, currency: CURRENCY });
          setDonateStep('confirm');
        }
      } catch {
        if (!cancelled && attempts < 12) {
          attempts += 1;
          timer = setTimeout(poll, 2000);
        }
      }
    };

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDonateSheetOpen, setIsDonateSheetOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const openTickets = useCallback((pack: PackOption = "both") => {
    setSelectedPack(pack);
    setCheckoutStep("pack-select");
    setIsSheetOpen(true);
  }, []);

  const openDonate = useCallback(() => {
    setDonateStep("details");
    setDonateError(null);
    setDonorName("");
    setDonorEmail("");
    setDonateAmount("");
    setIsDonateSheetOpen(true);
  }, []);

  // Prevent body scroll when sheet open
  useEffect(() => {
    if (!isSheetOpen && !isDonateSheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isSheetOpen, isDonateSheetOpen]);

  // Escape key closes sheets
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setIsSheetOpen(false); setIsDonateSheetOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const shareFundraiser = useCallback(async () => {
    if (navigator.share) {
      try { await navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url: EVENT_PAGE_URL }); return; }
      catch (e) { if ((e as DOMException)?.name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(EVENT_PAGE_URL); setShareCopied(true); setTimeout(() => setShareCopied(false), 1800); }
    catch { window.open(EVENT_PAGE_URL, "_blank", "noopener,noreferrer"); }
  }, []);

  const copyShareLink = useCallback(async () => {
    try { await navigator.clipboard.writeText(EVENT_PAGE_URL); setShareCopied(true); setTimeout(() => setShareCopied(false), 1800); }
    catch { window.open(EVENT_PAGE_URL, "_blank", "noopener,noreferrer"); }
  }, []);

  // ── Peer pack checkout state ───────────────────────────────────────────────
  const [selectedPack, setSelectedPack] = useState<PackOption>("both");
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("pack-select");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [methods, setMethods] = useState<PublicPeerPaymentMethod[]>([]);
  const [methodsLoading, setMethodsLoading] = useState(false);
  const [methodsError, setMethodsError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PublicPeerPaymentMethod | null>(null);
  const [reference] = useState(generateReference);
  const [hasCopiedRef, setHasCopiedRef] = useState(false);
  const [hasOpenedLink, setHasOpenedLink] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderSummary, setOrderSummary] = useState<PeerOrderSummary | null>(null);
  const [entries, setEntries] = useState<PeerGeneratedEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [cryptoOrderId, setCryptoOrderId] = useState<string | null>(null);

  const pack = PACK_MAP[selectedPack];

  useEffect(() => {
    if (checkoutStep !== "payment") return;
    setMethodsLoading(true);
    setMethodsError(null);
    api.paymentMethods(PEER_FUNDRAISER_ID)
      .then(result => {
        const available = (result.paymentMethods ?? []) as PublicPeerPaymentMethod[];
        setMethods(available);
        setSelectedMethod(available[0] ?? null);
      })
      .catch(err => setMethodsError(err?.message || "Could not load payment options."))
      .finally(() => setMethodsLoading(false));
  }, [checkoutStep]);

  async function loadOrderSummary(id: string) {
    const summary = await api.getOrderSummary(id);
    setOrderSummary(summary.order);
    setEntries(summary.entries ?? []);
    setCheckoutStep("confirm");
  }

  async function proceedToPayment() {
    if (!name.trim()) { setCheckoutError("Please enter your name."); return; }
    if (!isValidEmail(email)) { setCheckoutError("Please enter a valid email address."); return; }
    setCheckoutError(null);
    setCheckoutStep("payment");
  }

  async function createOrderAndProceed() {
    if (!selectedMethod) { setCheckoutError("Please select a payment method."); return; }
    setSubmitting(true);
    setCheckoutError(null);
    try {
      const result = await api.order(PEER_FUNDRAISER_ID, {
        supporterName:         name.trim(),
        supporterEmail:        email.trim(),
        paymentMethodCategory: selectedMethod.methodCategory,
        clubPaymentMethodId:   selectedMethod.id,
        paymentProvider:       selectedMethod.providerName || null,
        paymentReference:      reference,
        donationAmount:        0,
        items:                 [{ packId: pack.id, quantity: 1 }],
      } as any);
      setOrderId(result.orderId);
      if (isStripeMethod(selectedMethod)) {
        const checkout = await api.stripeCheckout(result.orderId);
        const url = checkout.url || checkout.checkoutUrl;
        if (!url) throw new Error("Could not start card checkout.");
        window.location.href = url;
        return;
      }
      if (isCashMethod(selectedMethod)) {
        await api.claim(result.orderId, { paymentReference: null, clubPaymentMethodId: selectedMethod.id });
        await loadOrderSummary(result.orderId);
        return;
      }
      if (isCryptoMethod(selectedMethod)) {
        setCryptoOrderId(result.orderId);
        setHasCopiedRef(false);
        setHasOpenedLink(false);
        setCheckoutStep("crypto-fixed-fee");
        return;
      }
      setHasCopiedRef(false);
      setHasOpenedLink(false);
      setCheckoutStep("payment-instructions");
    } catch (err: any) {
      setCheckoutError(friendlyOrderError(err?.message));
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmManualPayment() {
    if (!orderId || !selectedMethod) { setCheckoutError("Could not find your order. Please go back and try again."); return; }
    setSubmitting(true);
    setCheckoutError(null);
    try {
      await api.claim(orderId, { paymentReference: reference, clubPaymentMethodId: selectedMethod.id });
      await loadOrderSummary(orderId);
    } catch (err: any) {
      setCheckoutError(err?.message || "Could not confirm your payment.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Peer donation state ────────────────────────────────────────────────────
  type DonateStep = "details" | "payment" | "payment-instructions" | "crypto" | "confirm" | "waiting-stripe";
  const [donateStep, setDonateStep] = useState<DonateStep>("details");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donateAmount, setDonateAmount] = useState("");
  const [donateError, setDonateError] = useState<string | null>(null);
  const [donateMethods, setDonateMethods] = useState<PublicPeerPaymentMethod[]>([]);
  const [donateMethodsLoading, setDonateMethodsLoading] = useState(false);
  const [selectedDonateMethod, setSelectedDonateMethod] = useState<PublicPeerPaymentMethod | null>(null);
  const [donateSubmitting, setDonateSubmitting] = useState(false);
  const [donateReference] = useState(generateReference);
  const [donateHasCopiedRef, setDonateHasCopiedRef] = useState(false);
  const [donateHasOpenedLink, setDonateHasOpenedLink] = useState(false);
  const [cryptoDonationId, setCryptoDonationId] = useState<string | null>(null);
  const [donateConfirmed, setDonateConfirmed] = useState<{ amount: number; currency: string } | null>(null);

  const donateValue = Math.max(0, Number(donateAmount) || 0);

  useEffect(() => {
    if (donateStep !== "payment") return;
    setDonateMethodsLoading(true);
    api.paymentMethods(PEER_FUNDRAISER_ID)
      .then(result => {
        const available = (result.paymentMethods ?? []) as PublicPeerPaymentMethod[];
        setDonateMethods(available);
        setSelectedDonateMethod(available[0] ?? null);
      })
      .catch(() => {})
      .finally(() => setDonateMethodsLoading(false));
  }, [donateStep]);

  async function proceedDonateToPayment() {
    if (donateValue <= 0) { setDonateError("Please enter a donation amount."); return; }
    if (donorEmail.trim() && !isValidEmail(donorEmail)) { setDonateError("Please enter a valid email address."); return; }
    setDonateError(null);
    setDonateStep("payment");
  }

  async function publicPeerRequest(path: string, options: RequestInit = {}) {
    const base = window.location.hostname === "localhost" ? "http://localhost:3001/api" : "/api";
    const res = await fetch(`${base}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || payload.ok === false) throw new Error(payload.error || "request_failed");
    return payload;
  }

  async function createDonationAndProceed() {
    if (!selectedDonateMethod) { setDonateError("Please select a payment method."); return; }
    setDonateSubmitting(true);
    setDonateError(null);
    try {
      if (isStripeMethod(selectedDonateMethod)) {
        const result = await publicPeerRequest(`/peer-support/${PEER_FUNDRAISER_ID}/donations/stripe-checkout`, {
          method: "POST",
          body: JSON.stringify({ clubPaymentMethodId: selectedDonateMethod.id, donorName: donorName.trim() || null, donorEmail: donorEmail.trim() || null, amount: donateValue, appOrigin: window.location.origin, returnPath: '/events/colombia-earthquake-relief' }),
        });
        if (!result.redirectUrl) throw new Error("Could not start card checkout.");
        window.location.href = result.redirectUrl;
        return;
      }
      if (isCashMethod(selectedDonateMethod)) {
        await publicPeerRequest(`/peer-support/${PEER_FUNDRAISER_ID}/donations/manual`, {
          method: "POST",
          body: JSON.stringify({ clubPaymentMethodId: selectedDonateMethod.id, donorName: donorName.trim() || null, donorEmail: donorEmail.trim() || null, amount: donateValue, paymentReference: null }),
        });
        setDonateConfirmed({ amount: donateValue, currency: CURRENCY });
        setDonateStep("confirm");
        return;
      }
      if (isCryptoMethod(selectedDonateMethod)) {
        const result = await publicPeerRequest(`/peer-support/${PEER_FUNDRAISER_ID}/donations/crypto-checkout`, {
          method: "POST",
          body: JSON.stringify({ clubPaymentMethodId: selectedDonateMethod.id, donorName: donorName.trim() || null, donorEmail: donorEmail.trim() || null, amount: donateValue }),
        });
        setCryptoDonationId(result.donationId);
        setDonateStep("crypto");
        return;
      }
      setDonateHasCopiedRef(false);
      setDonateHasOpenedLink(false);
      setDonateStep("payment-instructions");
    } catch (err: any) {
      setDonateError(err?.message || "Could not process your donation.");
    } finally {
      setDonateSubmitting(false);
    }
  }

  async function confirmManualDonation() {
    if (!selectedDonateMethod) return;
    setDonateSubmitting(true);
    setDonateError(null);
    try {
      await publicPeerRequest(`/peer-support/${PEER_FUNDRAISER_ID}/donations/manual`, {
        method: "POST",
        body: JSON.stringify({ clubPaymentMethodId: selectedDonateMethod.id, donorName: donorName.trim() || null, donorEmail: donorEmail.trim() || null, amount: donateValue, paymentReference: donateReference }),
      });
      setDonateConfirmed({ amount: donateValue, currency: CURRENCY });
      setDonateStep("confirm");
    } catch (err: any) {
      setDonateError(err?.message || "Could not record your donation.");
    } finally {
      setDonateSubmitting(false);
    }
  }

  const totalRaised = data?.totalRaised ?? null;
  const target      = data?.fundraisingTarget ?? null;
  const progress    = totalRaised !== null && target && target > 0
    ? Math.min(100, Math.round((totalRaised / target) * 100)) : null;

  // Target milestone state.
  // The main fundraiser can continue beyond its target, while the matching fund
  // remains capped separately at MATCH_FUND_LIMIT.
  const targetReached =
    totalRaised !== null &&
    target !== null &&
    target > 0 &&
    totalRaised >= target;

  const amountBeyondTarget =
    targetReached && totalRaised !== null && target !== null
      ? totalRaised - target
      : 0;

  return (
    <div className="min-h-screen bg-[#f6f3ea] pb-28 text-[#10251c] lg:pb-24">

      {/* HERO */}
      <header className="relative overflow-hidden bg-[#006b43] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,221,0,0.10),transparent_30%)]" />
        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-4 sm:px-6 lg:px-8 lg:pb-20">
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex min-w-0 items-center gap-3 sm:gap-5">
              <img src={SUPERTEAM_LOGO} alt="Superteam Ireland" className="h-16 w-auto shrink-0 rounded-2xl bg-white/95 object-contain p-1.5 sm:h-20 lg:h-24" />
              <div className="inline-flex min-w-0 items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] backdrop-blur sm:px-4 sm:text-xs lg:text-sm">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#ffd600]" />
                <span className="truncate sm:whitespace-nowrap">Colombia Earthquake Relief</span>
              </div>
            </div>
            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              <button type="button" onClick={() => openTickets("both")} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-[#006b43] shadow-lg transition hover:-translate-y-0.5">
                <Ticket className="h-4 w-4" /> Buy tickets to Play for Colombia
              </button>
              <button type="button" onClick={openDonate} className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/12 px-5 py-3 text-sm font-black text-white backdrop-blur transition hover:bg-white/20">
                <Heart className="h-4 w-4" /> Donate without playing
              </button>
            </div>
          </div>

          {/* Mobile hero */}
          <div className="mt-7 lg:hidden">
            <h1 className="max-w-4xl text-4xl font-black leading-[0.96] tracking-[-0.04em] sm:text-6xl">
              Play for Colombia.<span className="block text-[#ffd600]">Help families rebuild.</span>
            </h1>
            <div className="mt-6 overflow-hidden rounded-[2rem] border border-white/20 bg-white/10 p-2 shadow-2xl backdrop-blur">
              <img src={HERO_IMAGE_SRC} alt="Earthquake damage in Colombia" className="h-[280px] w-full rounded-[1.55rem] object-cover sm:h-[430px]" />
              <p className="px-2 pb-1 pt-2 text-[10px] leading-4 text-white/55">Image: RTÉ</p>
            </div>
        <div className="mt-4 grid grid-cols-4 gap-2 rounded-[1.5rem] border border-white/20 bg-white/10 p-3 backdrop-blur">
  <HeroMetric value={formatCurrency(totalRaised)} label="Raised (donations and tickets)" loading={impactLoading} />
 <HeroMetric
  value={formatNumber(
    (data?.gameOneTicketsSold ?? 0) + (data?.gameTwoTicketsSold ?? 0) || null
  )}
  label="Tickets"
  loading={impactLoading}
/>
  <HeroMetric value={formatCurrency(data?.directDonations)} label="Donated" loading={impactLoading} />
  <HeroMetric value={formatCurrency(Math.min(totalRaised ?? 0, MATCH_FUND_LIMIT))} label="Matched" loading={impactLoading} highlight />
</div>
            {/* Beneficiary trust badge - mobile */}
            <a href={IRC_APPEAL_URL} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-black text-white/90 backdrop-blur">
              <Shield className="h-3.5 w-3.5 text-[#ffd600]" />
              Funds go to Irish Red Cross Colombia Appeal
              <ExternalLink className="h-3 w-3 text-white/50" />
            </a>
            <div className="mt-3 flex justify-center">
              <button type="button" onClick={shareFundraiser} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black text-white/90 backdrop-blur">
                <Share2 className="h-4 w-4" />{shareCopied ? "Link copied" : "Share this fundraiser"}
              </button>
            </div>
            <p className="mt-6 text-base font-medium leading-8 text-white/90">
              On <strong>{EVENT_DATE}</strong>, FundRaisely and Superteam Ireland are bringing the community together at <strong>Castle DAO, Slane Castle</strong> for two live Elimination games in support of families affected by the devastating earthquake in western Colombia.
            </p>
      <p className="mt-4 text-sm leading-7 text-white/78">
  This one is personal. Superteam Ireland&apos;s founder is Colombian, and while our founder community is gathered in Ireland, families thousands of kilometres away are facing the loss of homes, livelihoods and loved ones.
</p>
<div className="mt-4 flex items-start gap-3 rounded-2xl border border-[#ffd600]/30 bg-[#ffd600]/10 px-4 py-3">
  <span className="mt-0.5 text-lg">🤝</span>
  <p className="text-sm font-semibold leading-7 text-white">
    <span className="font-black text-[#ffd600]">Alejandro Gutierrez</span> will be matching the first{" "}
    <span className="font-black text-[#ffd600]">€1,000 raised</span> - so participate, donate, or share to double your impact and help families rebuild.
  </p>
</div>
            <div className="mt-6 grid grid-cols-3 gap-2">
              <HeroFact icon={<CalendarDays className="h-4 w-4 sm:h-5 sm:w-5" />} label="Date" value="5 Sep 2026" compact />
              <HeroFact icon={<Clock className="h-4 w-4 sm:h-5 sm:w-5" />} label="Time" value={EVENT_TIME} compact />
              <HeroFact icon={<MapPin className="h-4 w-4 sm:h-5 sm:w-5" />} label="Location" value={EVENT_LOCATION} compact />
            </div>
          </div>

          {/* Desktop hero */}
          <div className="mt-9 hidden gap-12 lg:grid lg:grid-cols-[minmax(0,1.03fr)_minmax(380px,0.97fr)] lg:items-center">
            <div className="min-w-0">
              <h1 className="max-w-4xl text-7xl font-black leading-[0.96] tracking-[-0.04em]">
                Play for Colombia.<span className="block text-[#ffd600]">Help families rebuild.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-white/90">
                On <strong>{EVENT_DATE}</strong>, FundRaisely and Superteam Ireland are bringing the community together at <strong>Castle DAO, Slane Castle</strong> for two live Elimination games in support of families affected by the devastating earthquake in western Colombia.
              </p>
                 <p className="mt-4 text-sm leading-7 text-white/78">
  This one is personal. Superteam Ireland&apos;s founder is Colombian, and while our founder community is gathered in Ireland, families thousands of kilometres away are facing the loss of homes, livelihoods and loved ones.
</p>
<div className="mt-4 flex items-start gap-3 rounded-2xl border border-[#ffd600]/30 bg-[#ffd600]/10 px-4 py-3">
  <span className="mt-0.5 text-lg">🤝</span>
  <p className="text-sm font-semibold leading-7 text-white">
    <span className="font-black text-[#ffd600]">Alejandro Gutierrez</span> will be matching the first{" "}
    <span className="font-black text-[#ffd600]">€1,000 raised</span> - so participate, donate, or share to double your impact and help families rebuild.
  </p>
</div>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <HeroFact icon={<CalendarDays className="h-5 w-5" />} label="Date" value="5 September 2026" />
                <HeroFact icon={<Clock className="h-5 w-5" />} label="Time" value={EVENT_TIME} />
                <HeroFact icon={<MapPin className="h-5 w-5" />} label="Location" value={EVENT_LOCATION} />
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={() => openTickets("both")} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ffd600] px-6 py-4 text-sm font-black text-[#10251c] shadow-xl transition hover:-translate-y-0.5 hover:bg-[#ffe33d]">
                  <Ticket className="h-5 w-5" /> Buy tickets to Play for Colombia <ArrowRight className="h-4 w-4" />
                </button>
                <button type="button" onClick={openDonate} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-black text-[#006b43] shadow-xl transition hover:-translate-y-0.5">
                  <Heart className="h-5 w-5" /> Donate without playing
                </button>
              </div>
            </div>
            <div className="min-w-0">
              <div className="overflow-hidden rounded-[2rem] border border-white/20 bg-white/10 p-2 shadow-2xl backdrop-blur">
                <img src={HERO_IMAGE_SRC} alt="Earthquake damage in Colombia" className="h-[500px] w-full rounded-[1.55rem] object-cover" />
                <p className="px-2 pb-1 pt-2 text-[10px] leading-4 text-white/55">Image: RTÉ</p>
              </div>
           <div className="mt-4 grid grid-cols-4 gap-2 rounded-[1.5rem] border border-white/20 bg-white/10 p-3 backdrop-blur">
  <HeroMetric value={formatCurrency(totalRaised)} label="Raised (donations and tickets)" loading={impactLoading} />
  <HeroMetric
  value={formatNumber(
    (data?.gameOneTicketsSold ?? 0) + (data?.gameTwoTicketsSold ?? 0) || null
  )}
  label="Tickets"
  loading={impactLoading}
/>
  <HeroMetric value={formatCurrency(data?.directDonations)} label="Donated" loading={impactLoading} />
  <HeroMetric value={formatCurrency(Math.min(totalRaised ?? 0, MATCH_FUND_LIMIT))} label="Matched" loading={impactLoading} highlight />
</div>
              {/* Beneficiary trust badge - desktop */}
              <div className="mt-3 flex items-center justify-between">
                <a href={IRC_APPEAL_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-black text-white/90 backdrop-blur transition hover:bg-white/15">
                  <Shield className="h-3.5 w-3.5 text-[#ffd600]" />
                  Funds go to Irish Red Cross Colombia Appeal
                  <ExternalLink className="h-3 w-3 text-white/50" />
                </a>
                <button type="button" onClick={shareFundraiser} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black text-white/90 backdrop-blur">
                  <Share2 className="h-4 w-4" />{shareCopied ? "Link copied" : "Share this fundraiser"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="space-y-8">

          {/* CRISIS STORY */}
          <SectionCard eyebrow="Why this matters" title="Colombia needs help now" intro="The earthquake changed thousands of lives in seconds. Behind every number is a person, a family and a community trying to work out where to begin again.">
            <div className={`grid gap-6 ${FOUNDER_VIDEO_URL ? "lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch" : "lg:grid-cols-1"}`}>
              {FOUNDER_VIDEO_URL ? (
                <div className="overflow-hidden rounded-[1.75rem] border border-[#d9e2dc] bg-black shadow-lg">
                  <div className="mx-auto aspect-[9/16] max-h-[620px] max-w-[350px]">
                    <iframe title="Message from Alejandro Gutierrez" src={FOUNDER_VIDEO_URL} className="h-full w-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                  </div>
                </div>
              ) : null}
              <div className="flex flex-col justify-center">
                <p className="text-base leading-8 text-[#526158]">Homes have been damaged or destroyed. Families have been displaced. Hospitals and emergency services are under enormous pressure. People are searching for loved ones while communities begin the difficult work of recovery.</p>
                <div className="mt-5 rounded-2xl border border-[#d7e2db] bg-[#f5f9f6] p-5">
                  <p className="text-lg font-black leading-8 text-[#10251c]">A parent waiting for news. A child whose home is gone. A family sleeping somewhere unfamiliar tonight.</p>
                </div>
                <p className="mt-5 text-base leading-8 text-[#526158]">Alejandro Gutierrez, founder of Superteam Ireland, is Colombian. This fundraiser is about turning one evening in Ireland into practical support for people who need help now.</p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <ImpactStat label="Confirmed deaths" value={EARTHQUAKE_IMPACT.deaths} />
              <ImpactStat label="People injured" value={EARTHQUAKE_IMPACT.injured} />
              <ImpactStat label="Reported missing" value={EARTHQUAKE_IMPACT.missing} />
              <ImpactStat label="Homes affected" value={EARTHQUAKE_IMPACT.homesAffected} />
            </div>
            <p className="mt-4 text-xs leading-6 text-[#69736d]">Figures may change as rescue and assessment work continues.</p>
            <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-[#d9e2dc] bg-[#f6f5f0]">
              <img src={SECONDARY_IMAGE_SRC} alt="Earthquake damage in Colombia" className="h-[240px] w-full object-cover sm:h-[360px]" />
              <p className="px-4 py-2 text-[10px] leading-4 text-[#8a918c]">Image: RTÉ</p>
            </div>
          </SectionCard>

          {/* FUNDRAISING PROGRESS */}
      <section className="overflow-hidden rounded-[2rem] bg-[#006b43] text-white shadow-[0_20px_60px_rgba(0,67,43,0.18)]">
  {/* Match fund banner */}
  <div className="flex items-center gap-3 border-b border-white/15 bg-white/10 px-6 py-3 sm:px-8 lg:px-10">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ffd600]">
      <HeartHandshake className="h-4 w-4 text-[#10251c]" />
    </div>
    <p className="text-sm font-black text-white">
      <span className="text-[#ffd600]">{MATCH_FUND_SPONSOR}</span> will match every euro raised, up to{" "}
      <span className="text-[#ffd600]">€{MATCH_FUND_LIMIT.toLocaleString()}</span>
    </p>
  </div>

  <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
    <div>
      <p className="text-xs font-black uppercase tracking-[0.2em] text-white/65">Together so far</p>
      <div className="mt-2 text-5xl font-black tracking-tight sm:text-6xl">
        {impactLoading ? "…" : formatCurrency(totalRaised)}
      </div>
      <p className="mt-2 text-base text-white/75">
        {targetReached
          ? "raised - and we're not stopping here"
          : `raised towards ${
              target !== null
                ? `${formatCurrency(target)} target`
                : "our relief target"
            }`}
      </p>

      {/* Main progress bar */}
      <div className="mt-6 h-4 overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full bg-[#ffd600] transition-all duration-700"
          style={{ width: `${progress ?? 0}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs font-bold text-white/65">
        <span>
          {progress !== null
            ? targetReached
              ? "Target reached 🎉"
              : `${progress}% funded`
            : "Target pending"}
        </span>
        <span>{formatCurrency(target)}</span>
      </div>

      {/* Target reached celebration */}
      {targetReached && (
        <div className="relative mt-6 overflow-hidden rounded-[1.75rem] border border-[#ffd600]/40 bg-[#ffd600]/10 p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#ffd600]/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 left-1/3 h-32 w-32 rounded-full bg-white/10 blur-3xl" />

          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ffd600] text-2xl shadow-lg">
              🎉
            </div>

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ffd600]">
                We did it
              </p>

              <h3 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
                We reached our {formatCurrency(target)} target!
              </h3>

              <p className="mt-3 text-sm font-medium leading-7 text-white/85 sm:text-base">
                Thanks to everyone who played, donated and shared, we&apos;ve reached
                our fundraising goal for Colombia.
              </p>

              {amountBeyondTarget > 0 && (
                <div className="mt-4 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-white/10 bg-white/10 px-4 py-3">
                  <span className="font-black text-white">
                    {formatCurrency(totalRaised)} raised
                  </span>
                  <span className="text-white/40">•</span>
                  <span className="font-black text-[#ffd600]">
                    {formatCurrency(amountBeyondTarget)} beyond our target
                  </span>
                </div>
              )}

              <p className="mt-4 text-sm leading-6 text-white/72">
                And we&apos;re not stopping here. Every additional euro raised will
                also go to the Irish Red Cross Colombia Appeal to help families
                affected by the earthquake.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Match fund progress bar */}
      <div className="mt-5 rounded-2xl border border-white/15 bg-white/10 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-white/70">
            {MATCH_FUND_SPONSOR} match
          </p>
          <p className="text-xs font-black text-[#ffd600]">
            {impactLoading ? "…" : formatCurrency(Math.min(totalRaised ?? 0, MATCH_FUND_LIMIT))}
            {" "}<span className="text-white/50">/ {formatCurrency(MATCH_FUND_LIMIT)}</span>
          </p>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-[#ffd600]/70 transition-all duration-700"
            style={{
              width: `${totalRaised !== null ? Math.min(100, Math.round((totalRaised / MATCH_FUND_LIMIT) * 100)) : 0}%`
            }}
          />
        </div>
        <p className="mt-2 text-[11px] leading-5 text-white/55">
          For every euro you raise, {MATCH_FUND_SPONSOR} adds another - up to €{MATCH_FUND_LIMIT.toLocaleString()} total.
        </p>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <ProgressMetric label="Ticket revenue" value={formatCurrency(data?.ticketRevenue)} />
      <ProgressMetric label="Direct donations" value={formatCurrency(data?.directDonations)} />
      <ProgressMetric label="Game 1 tickets" value={formatNumber(data?.gameOneTicketsSold)} />
      <ProgressMetric label="Game 2 tickets" value={formatNumber(data?.gameTwoTicketsSold)} />
    </div>
  </div>
</section>

          {/* PLAY / TICKETS - now with bundle option */}
          <SectionCard
  eyebrow="Play for Colombia"
  title="Two games. Two chances. One great cause."
  intro={`Buy a ticket for Game One, Game Two, or both in a single transaction at a saving. Every ticket purchased is matched by ${MATCH_FUND_SPONSOR} - up to €${MATCH_FUND_LIMIT.toLocaleString()} in total.`}
>
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Bundle */}
              <div className="relative overflow-hidden rounded-[1.75rem] border-2 border-[#006b43] bg-[#f0f8f4] p-5 sm:p-6">
                <div className="absolute right-4 top-4 rounded-full bg-[#006b43] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">Best value</div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#10251c] text-[#ffd600]">
                  <Sparkles className="h-6 w-6" />
                </div>
                <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-[#006b43]">Both Games</p>
                <h3 className="mt-1 text-3xl font-black tracking-tight text-[#10251c]">{BUNDLE_PRICE}</h3>
                <p className="mt-1 text-xs font-bold text-[#006b43]">Save €4 vs buying separately</p>
                <div className="mt-4 space-y-2 text-sm leading-6 text-[#5d6a62]">
                  <div className="flex items-start gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-[#006b43]" /><span>Game One entry</span></div>
                  <div className="flex items-start gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-[#006b43]" /><span>Game Two entry</span></div>
                  <div className="flex items-start gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-[#006b43]" /><span>Two chances to win a <strong className="text-[#10251c]">Solana Seeker</strong></span></div>
                  <div className="flex items-start gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-[#006b43]" /><span>Single payment</span></div>
                </div>
                <button type="button" onClick={() => openTickets("both")} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#006b43] px-5 py-4 text-sm font-black text-white transition active:scale-[0.99]">
                  <Ticket className="h-5 w-5" /> Buy both - {BUNDLE_PRICE}
                </button>
              </div>

              {/* Game One */}
              <div className="relative overflow-hidden rounded-[1.75rem] border border-[#e4ddd2] bg-[#fbfaf7] p-5 sm:p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#10251c] text-[#ffd600]">
                  <Trophy className="h-6 w-6" />
                </div>
                <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-[#006b43]">Elimination • Game One</p>
                <h3 className="mt-1 text-3xl font-black tracking-tight text-[#10251c]">{GAME_PRICE}</h3>
                <div className="mt-4 space-y-2 text-sm leading-6 text-[#5d6a62]">
                  <div className="flex items-start gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-[#006b43]" /><span>Separate live Elimination competition</span></div>
                  <div className="flex items-start gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-[#006b43]" /><span>Prize: <strong className="text-[#10251c]">Solana Seeker</strong></span></div>
                  <div className="flex items-start gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-[#006b43]" /><span>{formatNumber(data?.gameOneTicketsSold)} tickets sold</span></div>
                </div>
                <button type="button" onClick={() => openTickets("game1")} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#10251c] px-5 py-4 text-sm font-black text-white transition active:scale-[0.99]">
                  <Ticket className="h-5 w-5" /> Buy Game One - {GAME_PRICE}
                </button>
              </div>

              {/* Game Two */}
              <div className="relative overflow-hidden rounded-[1.75rem] border border-[#e4ddd2] bg-[#fbfaf7] p-5 sm:p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#10251c] text-[#ffd600]">
                  <Trophy className="h-6 w-6" />
                </div>
                <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-[#006b43]">Elimination • Game Two</p>
                <h3 className="mt-1 text-3xl font-black tracking-tight text-[#10251c]">{GAME_PRICE}</h3>
                <div className="mt-4 space-y-2 text-sm leading-6 text-[#5d6a62]">
                  <div className="flex items-start gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-[#006b43]" /><span>Separate live Elimination competition</span></div>
                  <div className="flex items-start gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-[#006b43]" /><span>Prize: <strong className="text-[#10251c]">Solana Seeker</strong></span></div>
                  <div className="flex items-start gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-[#006b43]" /><span>{formatNumber(data?.gameTwoTicketsSold)} tickets sold</span></div>
                </div>
                <button type="button" onClick={() => openTickets("game2")} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#10251c] px-5 py-4 text-sm font-black text-white transition active:scale-[0.99]">
                  <Ticket className="h-5 w-5" /> Buy Game Two - {GAME_PRICE}
                </button>
              </div>
            </div>
          </SectionCard>

          {/* DONATE */}
          <section className="rounded-[2rem] border border-[#e4dbd0] bg-white p-6 shadow-sm sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e7f3ec] text-[#006b43]"><HeartHandshake className="h-6 w-6" /></div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#6b7b72]">Not playing?</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-[#10251c]">You can still make a difference.</h2>
                <p className="mt-3 max-w-3xl text-base leading-8 text-[#526158]">You do not need to attend Slane Castle or enter the game to support the appeal. Give whatever you can and help families in Colombia facing the loss of homes, livelihoods and loved ones. All funds collected will be transferred to the Irish Red Cross Colombia Appeal after the event.</p>
              </div>
              <button type="button" onClick={openDonate} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#006b43] px-7 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#005737] lg:w-auto">
                <Heart className="h-5 w-5" /> Donate now  - without playing
              </button>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <DonationMethodCard icon={<CreditCard className="h-5 w-5" />} title="Card payments" text="Stripe, Apple Pay, Google Pay" />
              <DonationMethodCard icon={<SolanaMark />} title="Crypto donations" text="Accepted on Solana" darkIcon />
            </div>
          </section>

          {/* WHERE YOUR SUPPORT GOES - Irish Red Cross confirmed beneficiary */}
          <SectionCard eyebrow="Where your support goes" title="Every euro goes to the Irish Red Cross Colombia Appeal">
            {/* IRC identity block */}
            <a
              href={IRC_APPEAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-6 flex items-center gap-4 rounded-2xl border border-[#e4dbd0] bg-white p-4 transition hover:shadow-sm sm:p-5"
            >
              <div className="flex h-16 w-auto shrink-0 items-center justify-center rounded-xl bg-white p-2 ring-1 ring-[#e4dbd0]">
                <img src={IRC_LOGO} alt="Irish Red Cross" className="h-12 w-auto object-contain" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-black text-[#10251c]">Irish Red Cross - Colombia Appeal</p>
                <p className="mt-1 text-sm leading-6 text-[#526158]">
                  Funds are collected by FundRaisely on behalf of Superteam Ireland. After the event closes, the full gross proceeds will be transferred directly to the Irish Red Cross Colombia Appeal.
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-black text-[#c0392b]">
                  View the appeal <ExternalLink className="h-3 w-3" />
                </span>
              </div>
            </a>

            {/* How funds are used */}
            <p className="mb-4 text-sm leading-7 text-[#5b675f]">The Irish Red Cross, through the International Red Cross and Red Crescent Movement, is responding on the ground in Colombia. Your support helps fund:</p>

            {/* Relief categories */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SupportCard title="Emergency shelter" detail="Temporary housing and essential supplies for displaced families." />
              <SupportCard title="Food & clean water" detail="Emergency food parcels and safe drinking water in affected communities." />
              <SupportCard title="Medical support" detail="First aid, medicines and support for overwhelmed local health services." />
              <SupportCard title="Family tracing" detail="Helping separated families locate and reconnect with loved ones." />
            </div>

            {/* Transparency commitment */}
            <div className="mt-6 rounded-2xl border border-[#c8e6c9] bg-[#f1f8f1] p-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#006b43] text-white">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-black text-[#10251c]">Our transparency commitment</p>
                  <p className="mt-2 text-sm leading-7 text-[#526158]">
                    All funds are collected by FundRaisely on behalf of Superteam Ireland during the event. After the event closes on {EVENT_DATE}, the <strong>full gross proceeds</strong> - every euro from ticket sales and donations - will be transferred directly to the Irish Red Cross Colombia Appeal. We will publish the transfer receipt publicly so every supporter can verify where the money went.
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* EVENT */}
          <SectionCard eyebrow="The event" title="A founder community coming together for Colombia" intro="The fundraiser is being held during Castle DAO's two-week founder residency at Slane Castle hosted by Superteam Ireland. Those not in Slane Castle can still buy a ticket and play remotely, or donate without playing.">
            <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-start">
              <div className="self-start overflow-hidden rounded-[1.75rem] border border-[#d9e2dc] bg-black shadow-sm">
                <video src={SLANE_VIDEO_URL} controls playsInline preload="metadata" className="block aspect-video w-full object-cover">Your browser does not support the video tag.</video>
              </div>
              <div className="grid gap-3">
                <EventInfo icon={<CalendarDays className="h-5 w-5" />} label="When" value={`${EVENT_DATE} • ${EVENT_TIME}`} />
                <EventInfo icon={<MapPin className="h-5 w-5" />} label="Where" value={EVENT_FULL_ADDRESS} />
                <EventInfo icon={<Users className="h-5 w-5" />} label="Hosted during" value="Castle DAO 2-week Founder Residency" />
                <EventInfo icon={<Smartphone className="h-5 w-5" />} label="What you need" value="Your phone to play FundRaisely Elimination live" />
              </div>
            </div>
          </SectionCard>

          {/* MAP */}
          <SectionCard eyebrow="Location" title="Slane Castle, Co. Meath" intro="Use the map below for directions to the event venue.">
            <div className="overflow-hidden rounded-[1.75rem] border border-[#d9e2dc]">
              <iframe title="Map showing Slane Castle" src={MAP_EMBED_SRC} className="h-[320px] w-full border-0 sm:h-[420px]" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
            </div>
            <a href={MAP_DIRECTIONS_URL} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#10251c] px-5 py-3 text-sm font-black text-white transition hover:bg-[#263d32]">
              <MapPin className="h-4 w-4" /> Get directions <ExternalLink className="h-4 w-4" />
            </a>
          </SectionCard>

          {/* PARTNERS */}
          <SectionCard eyebrow="Made possible by" title="Community, technology and a place to come together">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <PartnerCard imgSrc={SUPERTEAM_LOGO} name="Superteam Ireland" role="Residency host" href={SUPERTEAM_URL} />
              <PartnerCard imgSrc={FUNDRAISELY_LOGO} name="FundRaisely" role="Fundraising & game platform" href="/" />
              <PartnerCard imgSrc={CASTLE_DAO_LOGO} name="CastleDAO" role="Community partner" href={CASTLE_DAO_URL} />
              <PartnerCard imgSrc={IRC_LOGO} name="Irish Red Cross" role="Beneficiary - Colombia Appeal" href={IRC_APPEAL_URL} />
            </div>
          </SectionCard>

          {/* SHARE */}
          <section className="rounded-[2rem] border border-[#dfe8e2] bg-[#f7faf8] p-6 shadow-sm sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#006b43]">Help us reach more people</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-[#10251c]">Share the fundraiser.</h2>
                <p className="mt-3 max-w-3xl text-base leading-8 text-[#5d6a62]">Can&apos;t play or donate today? Sharing the fundraiser can still help more people discover the event and support families in Colombia.</p>
              </div>
              <button type="button" onClick={shareFundraiser} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#006b43] px-6 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#005737] lg:hidden">
                <Share2 className="h-5 w-5" />{shareCopied ? "Link copied" : "Share this fundraiser"}
              </button>
            </div>
            <div className="mt-5 hidden flex-wrap gap-3 lg:flex">
              <SocialShareButton label="X / Twitter" icon={<span className="text-base font-black">𝕏</span>} href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${SHARE_TEXT} ${EVENT_PAGE_URL}`)}`} />
              <SocialShareButton label="LinkedIn" icon={<Linkedin className="h-4 w-4" />} href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(EVENT_PAGE_URL)}`} />
              <SocialShareButton label="Facebook" icon={<Facebook className="h-4 w-4" />} href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(EVENT_PAGE_URL)}`} />
              <button type="button" onClick={copyShareLink} className="inline-flex items-center gap-2 rounded-2xl border border-[#dce5df] bg-white px-4 py-3 text-sm font-black text-[#10251c] transition hover:-translate-y-0.5 hover:shadow-sm">
                <Copy className="h-4 w-4" />{shareCopied ? "Copied" : "Copy link"}
              </button>
            </div>
          </section>

          {/* FAQ */}
          <SectionCard eyebrow="Frequently asked questions" title="About Elimination and FundRaisely" intro="New to FundRaisely? Here is what to expect from the game and a little more about the fundraising platform behind the event.">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
              <div className="space-y-3">
                <FaqItem question="Who receives the funds raised?">
                  <p>
                    Funds are collected by FundRaisely during the event on behalf of Superteam Ireland. Once the event closes on {EVENT_DATE}, the full gross proceeds - every euro from ticket sales and donations - will be transferred directly to the{" "}
                    <a href={IRC_APPEAL_URL} target="_blank" rel="noopener noreferrer" className="font-black text-[#c0392b] underline decoration-2 underline-offset-2">
                      Irish Red Cross Colombia Earthquake Appeal
                    </a>
                    . The Irish Red Cross then distributes those funds through the International Red Cross and Red Crescent Movement&apos;s response on the ground in Colombia. We will publish the transfer receipt after the event so anyone can verify the payment was made.
                  </p>
                </FaqItem>
                <FaqItem question="What is FundRaisely Elimination?" answer="FundRaisely Elimination is a last-person-standing fundraising game. Players join on their phones, take part in quick challenge rounds and stay in the game until they are knocked out. The final remaining player wins." />
                <FaqItem question="How does the game work?" answer="Everyone starts in the game. Each round gives players a challenge. Lowest scoring players are eliminated, and the remaining players move forward. The game continues until one player is left standing." />
                <FaqItem question="How many rounds are in each game?" answer="Each Elimination game uses eight rounds, selected from a wider set of possible round types. This keeps the game simple to run while helping repeat games feel different." />
                <FaqItem question="Will every game be the same?" answer="No. FundRaisely can vary the round mix, difficulty and skill level, so supporters can play again without feeling like they are repeating the exact same game." />
                <FaqItem question="Can anyone run a fundraiser on FundRaisely?">
                  <p>Yes. If you are a club, charity, school, community group or organiser and would like to run a fundraiser, <a href="https://fundraisely.ie/contact" target="_blank" rel="noopener noreferrer" className="font-black text-[#006b43] underline decoration-2 underline-offset-2">reach out to us and let&apos;s chat</a>.</p>
                </FaqItem>
              </div>
              <div className="mx-auto w-full max-w-[260px] lg:sticky lg:top-24 lg:max-w-[300px]">
                <div className="overflow-hidden rounded-[1.75rem] border border-[#dfe8e2] bg-[#f7faf8] p-3 shadow-sm">
                  <img src={ELIMINATION_GIF} alt="FundRaisely Elimination game preview" className="mx-auto h-auto max-h-[420px] w-full rounded-[1.25rem] object-contain" loading="lazy" />
                </div>
                <p className="mt-3 text-center text-xs leading-5 text-[#78847c]">A quick look at FundRaisely Elimination in action.</p>
              </div>
            </div>
          </SectionCard>

          {/* FINAL CTA */}
          <section className="overflow-hidden rounded-[2rem] bg-[#10251c] p-6 text-white shadow-xl sm:p-10">
            <div className="mx-auto max-w-4xl text-center">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ffd600]">Together for Colombia</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">One night in Ireland can make a difference thousands of kilometres away.</h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-white/72">Play for Colombia. Donate for Colombia. Share for Colombia.</p>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-white/50">All proceeds go directly to the Irish Red Cross Colombia Appeal.</p>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <button type="button" onClick={() => openTickets("both")} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ffd600] px-6 py-4 text-sm font-black text-[#10251c]">
                  <Ticket className="h-5 w-5" /> Buy tickets to Play for Colombia
                </button>
                <button type="button" onClick={openDonate} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-black text-[#006b43]">
                  <Heart className="h-5 w-5" /> Donate now without playing
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* STICKY DOCK */}
      <div className="fixed inset-x-0 bottom-0 z-40 pointer-events-none">
        <div className="mx-auto max-w-3xl px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4 lg:pb-4">
          <div className="pointer-events-auto grid grid-cols-2 gap-2 rounded-[1.35rem] border border-black/10 bg-white/92 p-2 shadow-[0_-8px_40px_rgba(0,0,0,0.16)] backdrop-blur-xl lg:rounded-full">
            <button type="button" onClick={() => openTickets("both")} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#006b43] px-4 text-sm font-black text-white transition active:scale-[0.98] lg:rounded-full">
              <Ticket className="h-5 w-5" /> Buy tickets to Play for Colombia
            </button>
            <button type="button" onClick={openDonate} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#ffd600] px-4 text-sm font-black text-[#10251c] transition active:scale-[0.98] lg:rounded-full">
              <Heart className="h-5 w-5" /> Donate without playing
            </button>
          </div>
        </div>
      </div>

      {/* ── TICKET / PACK CHECKOUT SHEET ────────────────────────────────────── */}
      {isSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-[2px] lg:items-center lg:p-6"
          role="dialog" aria-modal="true" aria-label="Buy Colombia fundraiser tickets"
          onMouseDown={e => { if (e.currentTarget === e.target) setIsSheetOpen(false); }}>
          <div className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-[#f8f6ef] shadow-2xl lg:max-h-[90vh] lg:max-w-2xl lg:rounded-[2rem]">
            <div className="flex justify-center pt-2 lg:hidden"><div className="h-1.5 w-12 rounded-full bg-black/15" /></div>

            {/* Sheet header */}
            <div className="flex items-start justify-between gap-4 border-b border-[#e6e0d6] bg-white px-4 py-4 sm:px-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#006b43]">Play for Colombia</p>
                <h2 className="mt-1 text-2xl font-black text-[#10251c]">
                  {checkoutStep === "pack-select" ? "Choose your ticket" :
                   checkoutStep === "details"      ? "Your details" :
                   checkoutStep === "payment"      ? "How would you like to pay?" :
                   checkoutStep === "confirm"      ? "You're in!" :
                   "Complete your payment"}
                </h2>
              </div>
              {checkoutStep !== "confirm" && (
                <button type="button" onClick={() => setIsSheetOpen(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f2f1ec] text-[#10251c]" aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Pack selector tabs */}
            {checkoutStep === "pack-select" && (
              <div className="border-b border-[#e6e0d6] bg-white px-4 pb-4 sm:px-6">
                <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[#eff3f0] p-1.5">
                  {(["both", "game1", "game2"] as PackOption[]).map(opt => (
                    <button key={opt} type="button" onClick={() => setSelectedPack(opt)}
                      className={`rounded-xl px-2 py-3 text-left transition ${selectedPack === opt ? "bg-[#006b43] text-white shadow-sm" : "text-[#31463b] hover:bg-white"}`}>
                      <div className="flex items-center gap-1.5">
                        {selectedPack === opt && <Check className="h-3.5 w-3.5 shrink-0" />}
                        <span className="text-xs font-black">{PACK_MAP[opt].name}</span>
                      </div>
                      <div className={`mt-1 text-[11px] font-bold ${selectedPack === opt ? "text-white/70" : "text-[#7b887f]"}`}>{PACK_MAP[opt].label}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sheet body */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-6">

              {/* Pack select step */}
              {checkoutStep === "pack-select" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[#eadf9a] bg-[#fff9d8] p-4">
                    <div className="flex items-start gap-3">
                      <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-[#806c00]" />
                      <div>
                        <p className="font-black text-[#3f3500]">{pack.name} - {PACK_MAP[selectedPack].label}</p>
                        <p className="mt-1 text-sm leading-6 text-[#6e611c]">
                          {selectedPack === "both"
                            ? "Enter both Elimination games in one transaction. Two chances to win a Solana Seeker."
                            : `Enter ${pack.name} - a separate live Elimination competition. Prize: Solana Seeker.`}
                        </p>
                      </div>
                    </div>
                  </div>
                  {checkoutError && <div className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-100">{checkoutError}</div>}
                  <button type="button" onClick={() => { setCheckoutError(null); setCheckoutStep("details"); }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#006b43] px-5 py-4 text-sm font-black text-white">
                    Continue <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              )}

              {/* Details step */}
              {checkoutStep === "details" && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="w-full rounded-2xl border border-[#e6e0d6] bg-white px-4 py-3 text-base font-semibold outline-none focus:border-[#006b43]" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email for your entry links" className="w-full rounded-2xl border border-[#e6e0d6] bg-white px-4 py-3 text-base font-semibold outline-none focus:border-[#006b43]" />
                  </div>
                  <div className="rounded-2xl bg-[#f5f9f6] p-4 text-sm text-[#526158]">
                    <strong className="text-[#10251c]">{pack.name}</strong> - {PACK_MAP[selectedPack].label}
                  </div>
                  {checkoutError && <div className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-100">{checkoutError}</div>}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setCheckoutStep("pack-select")} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f2f1ec] text-[#10251c]">←</button>
                    <button type="button" onClick={proceedToPayment} disabled={!name.trim() || !isValidEmail(email)}
                      className="flex-1 rounded-2xl bg-[#006b43] px-5 py-3 text-sm font-black text-white disabled:opacity-50">
                      Continue to payment
                    </button>
                  </div>
                </div>
              )}

              {/* Payment method step */}
              {checkoutStep === "payment" && (
                <div className="space-y-3">
                  {methodsLoading && <div className="flex items-center gap-2 text-sm text-[#526158]"><Loader2 className="h-4 w-4 animate-spin" /> Loading payment options…</div>}
                  {!methodsLoading && methodsError && <div className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{methodsError}</div>}
                  {!methodsLoading && !methodsError && methods.map(method => {
                    const display = methodDisplay(method);
                    const selected = selectedMethod?.id === method.id;
                    return (
                      <button key={method.id} type="button" onClick={() => { setSelectedMethod(method); setCheckoutError(null); }}
                        className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${selected ? "border-[#006b43] bg-[#f0f8f4] ring-2 ring-[#006b43]/20" : "border-[#e6e0d6] bg-white hover:border-[#006b43]/30"}`}>
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-50 text-2xl">{display.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-base font-black text-[#10251c]">{display.label}</span>
                          <span className="mt-0.5 block text-sm text-[#657169]">{display.hint}</span>
                        </span>
                        {selected && <Check className="h-5 w-5 text-[#006b43]" />}
                      </button>
                    );
                  })}
                  {checkoutError && <div className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-100">{checkoutError}</div>}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setCheckoutStep("details")} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f2f1ec] text-[#10251c]">←</button>
                    <button type="button" onClick={createOrderAndProceed} disabled={!selectedMethod || submitting}
                      className="flex-1 rounded-2xl bg-[#006b43] px-5 py-3 text-sm font-black text-white disabled:opacity-50">
                      {submitting ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Processing…</span>
                        : selectedMethod && isStripeMethod(selectedMethod) ? "Pay by card"
                        : selectedMethod && isCryptoMethod(selectedMethod) ? "Pay with crypto"
                        : selectedMethod && isCashMethod(selectedMethod) ? "I've given the cash"
                        : "Continue"}
                    </button>
                  </div>
                </div>
              )}

              {/* Manual payment instructions */}
              {checkoutStep === "payment-instructions" && selectedMethod && orderId && (
                <div className="space-y-4">
                  <PaymentInstructionsContent
                    method={{ id: selectedMethod.id, methodLabel: selectedMethod.methodLabel, methodCategory: selectedMethod.methodCategory, providerName: selectedMethod.providerName ?? null, playerInstructions: (selectedMethod as any).playerInstructions ?? null, methodConfig: ((selectedMethod as any).methodConfig ?? {}) as any }}
                    paymentReference={reference}
                    totalAmount={pack.price}
                    currencySymbol="€"
                    revolutLink={String(selectedMethod.providerName || "").toLowerCase() === "revolut" && (selectedMethod as any).methodConfig?.link ? (selectedMethod as any).methodConfig.link : undefined}
                    error={checkoutError}
                    hasEverCopied={hasCopiedRef}
                    hasOpenedProviderLink={hasOpenedLink}
                    onCopied={() => setHasCopiedRef(true)}
                    onOpenedLink={() => setHasOpenedLink(true)}
                  />
                  <PaymentInstructionsFooter
                    hasEverCopied={hasCopiedRef}
                    hasOpenedProviderLink={hasOpenedLink}
                    hasProviderStep={hasProviderInstructionStep(selectedMethod)}
                    confirming={submitting}
                    onConfirmPaid={confirmManualPayment}
                    onBack={() => setCheckoutStep("payment")}
                  />
                </div>
              )}

              {/* Crypto step */}
              {checkoutStep === "crypto-fixed-fee" && selectedMethod && cryptoOrderId && (
                <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#006b43]" /></div>}>
                  <Web3Provider force>
                    <CryptoFixedFeeStep
                      mode="ticket"
                      roomId={GAME_ONE_ROOM_ID}
                      quoteEndpoint={`/api/peer-support/fundraiser/${PEER_FUNDRAISER_ID}/crypto-quote`}
                      purchaserName={name}
                      purchaserEmail={email}
                      playerName={name}
                      selectedMethod={selectedMethod}
                      totalFiatAmount={pack.price}
                      entryFeeAmount={pack.price}
                      extrasAmount={0}
                      selectedExtras={[]}
                      fiatCurrency={CURRENCY}
                      currencySymbol="€"
                      solanaCluster="mainnet"
                      skipInternalJoin
                      skipInternalNavigate
                      confirmEndpoint={`/api/peer-support/orders/${cryptoOrderId}/confirm-crypto`}
                      onBack={() => setCheckoutStep("payment")}
                      onSuccess={async () => { try { await loadOrderSummary(cryptoOrderId); } catch { setCheckoutError("Payment confirmed but could not load your entries. Please check your email."); setIsSheetOpen(false); } }}
                    />
                  </Web3Provider>
                </Suspense>
              )}

              {/* Confirm step */}
              {checkoutStep === "confirm" && orderSummary && (
                <div>
                  <PeerOrderThankYou
                    order={orderSummary}
                    entries={entries}
                    fundraiserName={EVENT_NAME}
                    clubName="Superteam Ireland"
                    primaryColor="#006b43"
                    textOnPrimaryColor="#ffffff"
                    orderId={orderId}
                    onBack={() => setIsSheetOpen(false)}
                    backLabel="Close"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── DONATION SHEET ───────────────────────────────────────────────────── */}
      {isDonateSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-[2px] lg:items-center lg:p-6"
          role="dialog" aria-modal="true" aria-label="Donate to Colombia relief"
          onMouseDown={e => { if (e.currentTarget === e.target && donateStep !== "confirm" && donateStep !== "waiting-stripe") setIsDonateSheetOpen(false); }}>
          <div className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-[#f8f6ef] shadow-2xl lg:max-h-[90vh] lg:max-w-lg lg:rounded-[2rem]">
            <div className="flex justify-center pt-2 lg:hidden"><div className="h-1.5 w-12 rounded-full bg-black/15" /></div>
            <div className="flex items-start justify-between gap-4 border-b border-[#e6e0d6] bg-white px-4 py-4 sm:px-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#006b43]">Colombia Relief</p>
                <h2 className="mt-1 text-2xl font-black text-[#10251c]">
                  {donateStep === "details" ? "Make a donation"
                    : donateStep === "payment" ? "How would you like to pay?"
                    : donateStep === "confirm" ? "Thank you"
                    : donateStep === "waiting-stripe" ? "Confirming payment…"
                    : "Complete your payment"}
                </h2>
              </div>
              {donateStep !== "confirm" && donateStep !== "waiting-stripe" && (
                <button type="button" onClick={() => setIsDonateSheetOpen(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f2f1ec] text-[#10251c]">
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-6">

              {donateStep === "details" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[#e6e0d6] bg-white p-4">
                    <label className="text-sm font-black text-[#10251c]">Donation amount</label>
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {[5, 10, 20, 50].map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setDonateAmount(String(preset))}
                          className={`rounded-2xl border py-3 text-sm font-black transition ${
                            donateAmount === String(preset)
                              ? 'border-[#006b43] bg-[#006b43] text-white'
                              : 'border-[#e6e0d6] bg-[#f8f6ef] text-[#10251c] hover:border-[#006b43] hover:text-[#006b43]'
                          }`}
                        >
                          €{preset}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center rounded-2xl border border-[#e6e0d6] px-4 py-3 focus-within:border-[#006b43]">
                      <span className="font-black text-[#657169]">€</span>
                      <input
                        value={donateAmount}
                        onChange={e => setDonateAmount(e.target.value)}
                        inputMode="decimal"
                        placeholder="Or enter your own amount"
                        className="min-w-0 flex-1 border-0 bg-transparent px-3 text-xl font-black outline-none"
                      />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#e6e0d6] bg-white p-4">
                    <p className="mb-3 text-sm font-black text-[#10251c]">Your details <span className="font-semibold text-[#8a9990]">(optional)</span></p>
                    <div className="space-y-3">
                      <input value={donorName} onChange={e => setDonorName(e.target.value)} placeholder="Screen name or leave blank to donate anonymously" className="w-full rounded-2xl border border-[#e6e0d6] bg-[#f8f6ef] px-4 py-3 text-sm font-semibold outline-none focus:border-[#006b43]" />
                      <input type="email" value={donorEmail} onChange={e => setDonorEmail(e.target.value)} placeholder="Email for confirmation (optional)" className="w-full rounded-2xl border border-[#e6e0d6] bg-[#f8f6ef] px-4 py-3 text-sm font-semibold outline-none focus:border-[#006b43]" />
                    </div>
                    <p className="mt-3 text-xs text-[#8a9990]">You can donate anonymously - no name or email required.</p>
                  </div>
                  {/* Beneficiary note in donation flow */}
                  <div className="flex items-center gap-2 rounded-2xl bg-[#f1f8f1] px-4 py-3 text-xs leading-5 text-[#3d6b4a]">
                    <Shield className="h-4 w-4 shrink-0 text-[#006b43]" />
                    <span>All donations will be transferred to the <strong>Irish Red Cross Colombia Appeal</strong> after the event.</span>
                  </div>
                  {donateError && <div className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{donateError}</div>}
                  <button type="button" onClick={proceedDonateToPayment} disabled={donateValue <= 0 || (!!donorEmail.trim() && !isValidEmail(donorEmail))}
                    className="w-full rounded-2xl bg-[#006b43] px-5 py-4 text-sm font-black text-white disabled:opacity-50">
                    Continue
                  </button>
                </div>
              )}

              {donateStep === "payment" && (
                <div className="space-y-3">
                  {donateMethodsLoading && <div className="flex items-center gap-2 text-sm text-[#526158]"><Loader2 className="h-4 w-4 animate-spin" /> Loading payment options…</div>}
                  {!donateMethodsLoading && donateMethods.map(method => {
                    const display = methodDisplay(method);
                    const selected = selectedDonateMethod?.id === method.id;
                    return (
                      <button key={method.id} type="button" onClick={() => { setSelectedDonateMethod(method); setDonateError(null); }}
                        className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${selected ? "border-[#006b43] bg-[#f0f8f4] ring-2 ring-[#006b43]/20" : "border-[#e6e0d6] bg-white hover:border-[#006b43]/30"}`}>
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-50 text-2xl">{display.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-base font-black text-[#10251c]">{display.label}</span>
                          <span className="mt-0.5 block text-sm text-[#657169]">{display.hint}</span>
                        </span>
                        {selected && <Check className="h-5 w-5 text-[#006b43]" />}
                      </button>
                    );
                  })}
                  {donateError && <div className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{donateError}</div>}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setDonateStep("details")} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f2f1ec] text-[#10251c]">←</button>
                    <button type="button" onClick={createDonationAndProceed} disabled={!selectedDonateMethod || donateSubmitting}
                      className="flex-1 rounded-2xl bg-[#006b43] px-5 py-3 text-sm font-black text-white disabled:opacity-50">
                      {donateSubmitting ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Processing…</span>
                        : selectedDonateMethod && isStripeMethod(selectedDonateMethod) ? "Pay by card"
                        : selectedDonateMethod && isCryptoMethod(selectedDonateMethod) ? "Pay with crypto"
                        : "Continue"}
                    </button>
                  </div>
                </div>
              )}

              {donateStep === "payment-instructions" && selectedDonateMethod && (
                <div className="space-y-4">
                  <PaymentInstructionsContent
                    method={{ id: selectedDonateMethod.id, methodLabel: selectedDonateMethod.methodLabel, methodCategory: selectedDonateMethod.methodCategory, providerName: selectedDonateMethod.providerName ?? null, playerInstructions: (selectedDonateMethod as any).playerInstructions ?? null, methodConfig: ((selectedDonateMethod as any).methodConfig ?? {}) as any }}
                    paymentReference={donateReference}
                    totalAmount={donateValue}
                    currencySymbol="€"
                    revolutLink={String(selectedDonateMethod.providerName || "").toLowerCase() === "revolut" && (selectedDonateMethod as any).methodConfig?.link ? (selectedDonateMethod as any).methodConfig.link : undefined}
                    error={donateError}
                    hasEverCopied={donateHasCopiedRef}
                    hasOpenedProviderLink={donateHasOpenedLink}
                    onCopied={() => setDonateHasCopiedRef(true)}
                    onOpenedLink={() => setDonateHasOpenedLink(true)}
                  />
                  <PaymentInstructionsFooter
                    hasEverCopied={donateHasCopiedRef}
                    hasOpenedProviderLink={donateHasOpenedLink}
                    hasProviderStep={hasProviderInstructionStep(selectedDonateMethod)}
                    confirming={donateSubmitting}
                    onConfirmPaid={confirmManualDonation}
                    onBack={() => setDonateStep("payment")}
                  />
                </div>
              )}

              {donateStep === "crypto" && selectedDonateMethod && cryptoDonationId && (
                <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#006b43]" /></div>}>
                  <Web3Provider force>
                    <CryptoFixedFeeStep
                      mode="ticket"
                      roomId={GAME_ONE_ROOM_ID}
                      quoteEndpoint={`/api/peer-support/fundraiser/${PEER_FUNDRAISER_ID}/crypto-quote`}
                      purchaserName={donorName || "Anonymous"}
                      purchaserEmail={donorEmail || ""}
                      playerName={donorName || "Anonymous"}
                      selectedMethod={selectedDonateMethod}
                      totalFiatAmount={donateValue}
                      entryFeeAmount={donateValue}
                      extrasAmount={0}
                      selectedExtras={[]}
                      fiatCurrency={CURRENCY}
                      currencySymbol="€"
                      solanaCluster="mainnet"
                      skipInternalJoin
                      skipInternalNavigate
                      confirmEndpoint={`/api/peer-support/donations/${cryptoDonationId}/crypto-confirm`}
                      onBack={() => setDonateStep("payment")}
                      onSuccess={() => { setDonateConfirmed({ amount: donateValue, currency: CURRENCY }); setDonateStep("confirm"); }}
                    />
                  </Web3Provider>
                </Suspense>
              )}

              {donateStep === "waiting-stripe" && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-[#006b43]" />
                  <h3 className="mt-4 text-xl font-black text-[#10251c]">Confirming your donation…</h3>
                  <p className="mt-2 text-sm font-semibold text-[#657169]">
                    Please keep this page open for a moment.
                  </p>
                </div>
              )}

              {donateStep === "confirm" && donateConfirmed && (
                <div className="space-y-5 text-center">
                  <div className="rounded-3xl bg-[#f0f8f4] p-8">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#006b43] text-white">
                      <Heart className="h-8 w-8 fill-white" />
                    </div>
                    <h3 className="mt-5 text-2xl font-black text-[#10251c]">Thank you for your donation</h3>
                    <p className="mt-2 text-4xl font-black text-[#006b43]">{fmt(donateConfirmed.amount, donateConfirmed.currency)}</p>
                    <p className="mt-3 text-sm leading-6 text-[#526158]">Your donation will be transferred to the Irish Red Cross Colombia Appeal after the event closes. We&apos;ll publish the receipt so you can verify it.</p>
                  </div>
                  <button type="button" onClick={() => setIsDonateSheetOpen(false)} className="w-full rounded-2xl bg-[#006b43] px-5 py-4 text-sm font-black text-white">
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// SMALL COMPONENTS
// -----------------------------------------------------------------------------

function SectionCard({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-[#e4ddd2] bg-white p-5 shadow-sm sm:p-8 lg:p-10">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#006b43]">{eyebrow}</p>
      <h2 className="mt-2 max-w-4xl text-3xl font-black tracking-tight text-[#10251c] sm:text-4xl">{title}</h2>
      {intro && <p className="mt-3 max-w-4xl text-base leading-8 text-[#5b675f]">{intro}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function HeroFact({ icon, label, value, compact = false }: { icon: React.ReactNode; label: string; value: string; compact?: boolean }) {
  return (
    <div className={`border border-white/18 bg-white/10 backdrop-blur ${compact ? "min-w-0 rounded-xl p-3 sm:rounded-2xl sm:p-4" : "rounded-2xl p-4"}`}>
      <div className="text-[#ffd600]">{icon}</div>
      <div className={`font-black uppercase text-white/55 ${compact ? "mt-2 text-[8px] tracking-[0.10em] sm:mt-3 sm:text-[10px]" : "mt-3 text-[10px] tracking-[0.15em]"}`}>{label}</div>
      <div className={`font-black leading-tight text-white ${compact ? "mt-1 break-words text-[11px] sm:text-sm" : "mt-1 text-sm"}`}>{value}</div>
    </div>
  );
}

function HeroMetric({ value, label, loading, highlight = false }: { value: string; label: string; loading?: boolean; highlight?: boolean }) {
  return (
    <div className={`min-w-0 rounded-xl px-2 py-3 text-center ${highlight ? "bg-[#ffd600]/20 ring-1 ring-[#ffd600]/40" : "bg-black/10"}`}>
      <div className={`truncate text-lg font-black sm:text-xl ${highlight ? "text-[#ffd600]" : ""}`}>
        {loading ? "…" : value}
      </div>
      <div className={`mt-1 text-[10px] font-black uppercase tracking-[0.12em] ${highlight ? "text-[#ffd600]/70" : "text-white/55"}`}>
        {label}
      </div>
    </div>
  );
}

function ImpactStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-[#10251c] p-4 text-white sm:p-5">
      <div className="text-3xl font-black tracking-tight text-[#ffd600]">{value}</div>
      <div className="mt-2 text-xs font-bold leading-5 text-white/65">{label}</div>
    </div>
  );
}

function ProgressMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <div className="text-xl font-black sm:text-2xl">{value}</div>
      <div className="mt-1 text-xs font-bold leading-5 text-white/60">{label}</div>
    </div>
  );
}

function SolanaMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 397 311" className={className} aria-hidden="true">
      <defs><linearGradient id="colombia-solana-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#00FFA3" /><stop offset="50%" stopColor="#03E1FF" /><stop offset="100%" stopColor="#DC1FFF" /></linearGradient></defs>
      <path fill="url(#colombia-solana-grad)" d="M64.6 237.9c2.4-2.4 5.7-3.8 9.1-3.8h316.6c5.7 0 8.6 6.9 4.5 10.9l-62.5 62.5c-2.4 2.4-5.7 3.8-9.1 3.8H6.6c-5.7 0-8.6-6.9-4.5-10.9l62.5-62.5Zm0-234.1C67 1.4 70.3 0 73.7 0h316.6c5.7 0 8.6 6.9 4.5 10.9l-62.5 62.5c-2.4 2.4-5.7 3.8-9.1 3.8H6.6C.9 77.2-2 70.3 2.1 66.3L64.6 3.8Zm267.7 116.6c-2.4-2.4-5.7-3.8-9.1-3.8H6.6c-5.7 0-8.6 6.9-4.5 10.9L64.6 190c2.4 2.4 5.7 3.8 9.1 3.8h316.6c5.7 0 8.6-6.9 4.5-10.9l-62.5-62.5Z" />
    </svg>
  );
}

function DonationMethodCard({ icon, title, text, darkIcon = false }: { icon: React.ReactNode; title: string; text: string; darkIcon?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#dfe8e2] bg-[#f7faf8] p-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${darkIcon ? "bg-[#10251c]" : "bg-white text-[#006b43] ring-1 ring-[#dfe8e2]"}`}>{icon}</div>
      <div className="min-w-0"><p className="text-sm font-black text-[#10251c]">{title}</p><p className="mt-0.5 text-xs leading-5 text-[#68756d]">{text}</p></div>
    </div>
  );
}

function SocialShareButton({ label, icon, href }: { label: string; icon: React.ReactNode; href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-[#dce5df] bg-white px-4 py-3 text-sm font-black text-[#10251c] transition hover:-translate-y-0.5 hover:shadow-sm">
      {icon}{label}
    </a>
  );
}

function FaqItem({ question, answer, children }: { question: string; answer?: string; children?: React.ReactNode }) {
  return (
    <details className="group overflow-hidden rounded-2xl border border-[#e1e8e3] bg-[#f9fbf9]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-left sm:px-5">
        <span className="text-sm font-black leading-6 text-[#10251c] sm:text-base">{question}</span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e7f3ec] text-xl font-black leading-none text-[#006b43] transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="border-t border-[#e1e8e3] px-4 py-4 text-sm leading-7 text-[#5d6a62] sm:px-5">{children ?? <p>{answer}</p>}</div>
    </details>
  );
}

function SupportCard({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="rounded-2xl border border-[#e1e8e3] bg-[#f5f9f6] p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#006b43] text-white"><HeartHandshake className="h-5 w-5" /></div>
      <h3 className="font-black text-[#10251c]">{title}</h3>
      {detail && <p className="mt-2 text-xs leading-5 text-[#62736b]">{detail}</p>}
    </div>
  );
}

function EventInfo({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-[#e1e6e2] bg-[#fafbf9] p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e7f3ec] text-[#006b43]">{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#78847c]">{label}</div>
        <div className="mt-1 text-sm font-black leading-6 text-[#10251c]">{value}</div>
      </div>
    </div>
  );
}

function PartnerCard({ imgSrc, name, role, href }: { imgSrc: string; name: string; role: string; href: string }) {
  const content = (
    <div className="rounded-2xl border border-[#e4ddd2] bg-[#fbfaf7] p-4 text-center transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm">
      <div className="flex min-h-[90px] items-center justify-center rounded-xl bg-white p-3">
        <img src={imgSrc} alt={name} className="max-h-14 max-w-[150px] object-contain" />
      </div>
      <div className="mt-3 text-sm font-black text-[#10251c]">{name}</div>
      <div className="mt-1 text-xs leading-5 text-[#788078]">{role}</div>
    </div>
  );
  return href.startsWith("/") ? <a href={href}>{content}</a> : <a href={href} target="_blank" rel="noopener noreferrer">{content}</a>;
}

// -----------------------------------------------------------------------------
// FORMATTERS
// -----------------------------------------------------------------------------

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "-";
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function formatNumber(value: number | null | undefined) {
  if (value == null) return "-";
  return new Intl.NumberFormat("en-IE", { maximumFractionDigits: 0 }).format(value);
}

// Needed for crypto steps - roomId anchor for quote endpoint
// const GAME_ONE_ROOM_ID = "361798C515F347BE";
const GAME_ONE_ROOM_ID = "5848007CBBD44647";
