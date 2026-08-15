// src/components/dashboard/ClubDrawer.tsx
import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BarChart3, Building2, CreditCard, Gift,
  LogOut, Palette, X,
} from 'lucide-react';

import { useAuthStore }           from '../../features/auth';
import { quizApi }                from '../../shared/api';
import ManagePaymentMethodsModal  from '../mgtsystem/modals/ManagePaymentMethodsModal';
import ManageDonationButtonModal  from '../mgtsystem/modals/ManageDonationButtonModal';
import TotalIncomeReportButton    from '../mgtsystem/components/dashboard/TotalIncomeReportButton';
import ClubBrandingModal          from './ClubBrandingModal';
import { brand }                  from './branding';
import type { ClubBranding }      from '../../services/ClubBrandingService';

function getFeatureAccess(ents: any) {
  const f = ents?.quiz_features || ents?.quizFeatures || {};
  return {
    quizPayments: f?.quizPayments === true,
  };
}

interface Props {
  open:    boolean;
  onClose: () => void;
}

export default function ClubDrawer({ open, onClose }: Props) {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();

  const clubId   = useAuthStore((s: any) => s.club?.id || s.user?.club_id);
  const clubName = useAuthStore((s: any) =>
    s.club?.name || s.club?.club_name ||
    s.user?.club_name || s.user?.clubName || 'Your Club'
  );
  const userName = useAuthStore((s: any) =>
    s.user?.name || s.user?.full_name || s.user?.first_name || ''
  );
  const logout = useAuthStore((s: any) => s.logout);

  const [ents, setEnts]             = useState<any>(null);
  const featureAccess               = useMemo(() => getFeatureAccess(ents), [ents]);

  const [incomeOpen,   setIncomeOpen]   = useState(false);
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [donationOpen, setDonationOpen] = useState(false);
  const [brandingOpen, setBrandingOpen] = useState(false);

  useEffect(() => {
    if (!clubId) return;
    let alive = true;
    quizApi.getEntitlements()
      .then(e => { if (alive) setEnts(e); })
      .catch(() => {});
    return () => { alive = false; };
  }, [clubId]);

  useEffect(() => {
    if (!clubId) return;
    const p = searchParams.get('stripe');
    if (p === 'return' || p === 'refresh') setPaymentsOpen(true);
  }, [clubId, searchParams]);

  const handleLogout = () => { logout(); navigate('/'); };

  const openIncome   = () => { onClose(); requestAnimationFrame(() => setIncomeOpen(true));   };
  const openPayments = () => { onClose(); requestAnimationFrame(() => setPaymentsOpen(true)); };
  const openDonation = () => { onClose(); requestAnimationFrame(() => setDonationOpen(true)); };
  const openBranding = () => { onClose(); requestAnimationFrame(() => setBrandingOpen(true)); };

  const handleBrandingSaved = (saved: ClubBranding) => {
    // Optionally update auth store club object here in future
    // For now the modal shows success feedback itself
  };

  return (
    <>
      {/* ── Backdrop + panel ── */}
      <div
        className={`fixed inset-0 z-[9998] ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!open}
      >
        <div
          className={`absolute inset-0 bg-black/30 transition-opacity duration-200 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={onClose}
        />

        <aside
          role="dialog"
          aria-label="Club menu"
          className={`absolute left-0 top-0 h-full w-full max-w-sm overflow-y-auto shadow-2xl transition-transform duration-200 ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{ background: '#ffffff' }}
        >
          {/* ── Header: club name + user, close button ── */}
          <div
            className="flex items-start justify-between px-5 py-5"
            style={{ borderBottom: `1px solid ${brand.border}` }}
          >
            <div>
              <h2 className="text-xl font-bold leading-tight" style={{ color: brand.navy }}>
                {clubName}
              </h2>
              {userName && (
                <p className="mt-0.5 text-sm" style={{ color: brand.slate }}>
                  Signed in as {userName}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-gray-100 flex-shrink-0 ml-3"
              style={{ color: brand.slate }}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* ── Menu items ── */}
          <nav className="p-4 space-y-1">

            {/* Reports section */}
            <p
              className="px-3 pt-2 pb-1 text-xs font-bold uppercase tracking-widest"
              style={{ color: brand.slate }}
            >
              Reports
            </p>
            <MenuItem
              icon={<BarChart3 className="h-5 w-5" />}
              label="Income Report"
              onClick={openIncome}
            />

            {/* Branding section — always visible */}
            <p
              className="px-3 pt-4 pb-1 text-xs font-bold uppercase tracking-widest"
              style={{ color: brand.slate }}
            >
              Club
            </p>
            <MenuItem
              icon={<Palette className="h-5 w-5" />}
              label="Branding"
              onClick={openBranding}
            />

            {/* Money In — only if feature enabled */}
            {featureAccess.quizPayments && (
              <>
                <p
                  className="px-3 pt-4 pb-1 text-xs font-bold uppercase tracking-widest"
                  style={{ color: brand.slate }}
                >
                  Money In
                </p>
                <MenuItem
                  icon={<CreditCard className="h-5 w-5" />}
                  label="Payment Methods"
                  onClick={openPayments}
                />
                <MenuItem
                  icon={<Gift className="h-5 w-5" />}
                  label="Donation Button"
                  onClick={openDonation}
                />
              </>
            )}
          </nav>

          {/* ── Footer: logout ── */}
          <div
            className="absolute bottom-0 left-0 right-0 p-4"
            style={{ borderTop: `1px solid ${brand.border}`, background: '#ffffff' }}
          >
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition"
              style={{ background: '#c0392b' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#a93226')}
              onMouseLeave={e => (e.currentTarget.style.background = '#c0392b')}
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>

          {/* Bottom padding so content isn't hidden behind the fixed logout button */}
          <div className="h-20" />
        </aside>
      </div>

      {/* ── Modals outside drawer stacking context ── */}

      {incomeOpen && clubId && (
        <TotalIncomeReportButton
          clubId={clubId}
          clubName={clubName}
          defaultOpen
          onClose={() => setIncomeOpen(false)}
        />
      )}

      {paymentsOpen && clubId && (
        <ManagePaymentMethodsModal
          clubId={clubId}
          onClose={() => setPaymentsOpen(false)}
        />
      )}

      {donationOpen && clubId && (
        <ManageDonationButtonModal
          clubId={clubId}
          onClose={() => setDonationOpen(false)}
          onOpenPaymentMethods={() => { setDonationOpen(false); setPaymentsOpen(true); }}
        />
      )}

      {brandingOpen && clubId && (
        <ClubBrandingModal
          clubId={clubId}
          onClose={() => setBrandingOpen(false)}
          onSaved={handleBrandingSaved}
        />
      )}
    </>
  );
}

// ── Menu item ────────────────────────────────────────────────────────────────

function MenuItem({
  icon, label, onClick, soon = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  soon?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={soon}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition text-left ${
        soon ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
      }`}
      style={{ color: brand.navy }}
    >
      <span style={{ color: brand.slate }}>{icon}</span>
      <span className="flex-1">{label}</span>
      {soon && (
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold"
          style={{ background: brand.tan, color: brand.slate }}
        >
          Soon
        </span>
      )}
    </button>
  );
}