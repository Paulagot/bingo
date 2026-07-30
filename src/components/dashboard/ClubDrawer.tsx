// src/components/dashboard/ClubDrawer.tsx
//
// Club-level slide-in panel (from the LEFT).
//
// All three modals follow the same pattern:
//   1. Plain trigger button INSIDE the drawer.
//   2. Click → onClose() drawer, then requestAnimationFrame → set flag.
//   3. Modal renders OUTSIDE the drawer's stacking context.
//
// TotalIncomeReportButton now accepts `defaultOpen` and `onClose` props,
// so we mount it outside the drawer with defaultOpen=true. It opens
// immediately and calls onClose when dismissed, which unmounts it cleanly.

import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BarChart3, Building2, CreditCard, Gift, LogOut, X } from 'lucide-react';

import { useAuthStore }              from '../../features/auth';
import { quizApi }                   from '../../shared/api';
import ManagePaymentMethodsModal     from '../mgtsystem/modals/ManagePaymentMethodsModal';
import ManageDonationButtonModal     from '../mgtsystem/modals/ManageDonationButtonModal';
import TotalIncomeReportButton       from '../mgtsystem/components/dashboard/TotalIncomeReportButton';
import { brand }                     from './branding';

function getFeatureAccess(ents: any) {
  const f = ents?.quiz_features || ents?.quizFeatures || {};
  return {
    eventLinking: f?.eventLinking === true,
    quizPayments: f?.quizPayments === true,
    ticketing:    f?.ticketing    === true,
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
    s.club?.name      || s.club?.club_name  ||
    s.user?.club_name || s.user?.clubName   || 'Your Club'
  );
  const logout = useAuthStore((s: any) => s.logout);

  const [ents, setEnts]           = useState<any>(null);
  const featureAccess             = useMemo(() => getFeatureAccess(ents), [ents]);
  const [incomeOpen,   setIncomeOpen]   = useState(false);
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [donationOpen, setDonationOpen] = useState(false);

  useEffect(() => {
    if (!clubId) return;
    let alive = true;
    quizApi.getEntitlements().then(e => { if (alive) setEnts(e); }).catch(() => {});
    return () => { alive = false; };
  }, [clubId]);

  useEffect(() => {
    if (!clubId) return;
    const p = searchParams.get('stripe');
    if (p === 'return' || p === 'refresh') setPaymentsOpen(true);
  }, [clubId, searchParams]);

  const handleLogout = () => { logout(); navigate('/'); };

  // Close drawer first, then open the relevant modal on the next frame
  // so it renders outside the drawer's stacking context.
  const openIncome   = () => { onClose(); requestAnimationFrame(() => setIncomeOpen(true));   };
  const openPayments = () => { onClose(); requestAnimationFrame(() => setPaymentsOpen(true)); };
  const openDonation = () => { onClose(); requestAnimationFrame(() => setDonationOpen(true)); };

  return (
    <>
      {/* ── Backdrop + panel ── */}
      <div
        className={`fixed inset-0 z-[9998] ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!open}
      >
        <div
          className={`absolute inset-0 bg-black/30 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
          onClick={onClose}
        />
        <aside
          role="dialog"
          aria-label="Club settings"
          className={`absolute left-0 top-0 h-full w-full max-w-sm overflow-y-auto shadow-2xl transition-transform duration-200 ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{ background: brand.surface }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${brand.border}` }}>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: brand.teal }}>
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: brand.slate }}>Club Settings</p>
                <h2 className="text-base font-bold leading-tight" style={{ color: brand.navy }}>{clubName}</h2>
              </div>
            </div>
            <button
              type="button" onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full"
              style={{ background: brand.bg, color: brand.slate }}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Menu */}
          <div className="p-5 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest pb-1" style={{ color: brand.slate }}>
              Reports
            </p>
            <MenuButton icon={<BarChart3 className="h-4 w-4" />}  label="Income Report"    onClick={openIncome}   />

            {featureAccess.quizPayments && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-widest pt-4 pb-1" style={{ color: brand.slate }}>
                  Money In
                </p>
                <MenuButton icon={<CreditCard className="h-4 w-4" />} label="Payment Methods" onClick={openPayments} />
                <MenuButton icon={<Gift className="h-4 w-4" />}       label="Donation Button"  onClick={openDonation} />
              </>
            )}

            <div className="pt-5" style={{ borderTop: `1px solid ${brand.borderSoft}` }}>
              <button
                type="button" onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition"
                style={{ background: brand.surface, borderColor: brand.dangerBorder, color: brand.danger }}
                onMouseEnter={e => (e.currentTarget.style.background = brand.dangerHover)}
                onMouseLeave={e => (e.currentTarget.style.background = brand.surface)}
              >
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* ── Modals - outside the drawer's stacking context ── */}

      {/* Income report: mounted with defaultOpen=true so the modal opens
          immediately. onClose unmounts the whole component, resetting state. */}
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
    </>
  );
}

// ── Shared menu button ────────────────────────────────────────────────────────

function MenuButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition"
      style={{ background: brand.tan, color: brand.navy }}
      onMouseEnter={e => (e.currentTarget.style.background = brand.tanStrong)}
      onMouseLeave={e => (e.currentTarget.style.background = brand.tan)}
    >
      {icon} {label}
    </button>
  );
}