// src/components/peer/PeerFundraiserDrawer.tsx
//
// Peer fundraiser management drawer.
// Changes from original:
//   - Overview tab removed (name/status/link already in header)
//   - Payments tab removed (payment methods now live in the create modal)
//   - Format removed from edit form and display
//   - Target shown as actual vs target progress bar in header area
//   - Publish flow: shows confirmation modal with ordered sales options
//   - Tabs: Participants | Sales Options | Orders | Donations | Report
//   - All tab content extracted into dedicated components
//   - Each tab component receives only the data it needs
//   - load() is called at drawer open and after mutations that affect
//     cross-tab data; tab-level mutations call onChanged() to refresh
//     the dashboard card counts

import { useEffect, useState, useCallback } from 'react';
import { X, Globe, AlertCircle, Loader2, Check, ArrowRight } from 'lucide-react';
import svc from '../../services/PeerService';
import type {
  PeerFundraiser,
  PeerFundraiserFormat,
  PeerPack,
  PeerParticipant,
  PeerOrder,
  PeerDirectDonation,
  AvailableRoom,
  ClubPaymentMethod,
} from '../../services/PeerService';
import PeerSalesOptionsTab       from './PeerSalesOptionsTab';
import PeerOrdersTab             from './PeerOrdersTab';
import PeerDonationsTab          from './PeerDonationsTab';
import PeerReportsTab            from './PeerReportsTab';
import PeerSponsorshipSetupTab   from './PeerSponsorshipSetupTab';
import PeerSponsorshipsTab       from './PeerSponsorshipsTab';
import ParticipantForm           from './ParticipantForm';
import ParticipantList           from './ParticipantList';
import { brand }                 from '../dashboard/branding';

type Tab = 'overview' | 'participants' | 'packs' | 'orders' | 'donations' | 'report';

const field =
  'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ' +
  'focus:ring-[#157f85] focus:border-transparent transition ' +
  'border-[#dce1df] bg-white hover:border-[#b8c6b0]';

const FORMAT_LABEL: Record<PeerFundraiserFormat, string> = {
  door_to_door:         'Sell activities',
  sponsored:            'Sponsored fundraising',
  personal_fundraising: 'Personal fundraising',
  team_fundraising:     'Team fundraising',
  custom:               'Custom',
};

interface Props {
  open:         boolean;
  fundraiserId: string;
  onClose:      () => void;
  onChanged?:   () => void;
}

// ── Publish confirmation modal ────────────────────────────────────────────────

interface PublishModalProps {
  packs:      PeerPack[];
  currency:   string;
  onConfirm:  () => void;
  onCancel:   () => void;
  publishing: boolean;
}

function PublishConfirmModal({
  packs,
  currency,
  onConfirm,
  onCancel,
  publishing,
}: PublishModalProps) {
  const ordered = [...packs]
    .filter(p => p.is_active !== 0 && p.is_active !== false)
    .sort((a, b) => a.display_order - b.display_order);

  return (
    <div
      className="fixed inset-0 z-[10100] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-t-2xl sm:rounded-2xl shadow-2xl"
        style={{ background: brand.surface }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-5 py-4"
          style={{ borderBottom: `1px solid ${brand.border}` }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: brand.slate }}
          >
            Before you publish
          </p>
          <h2 className="text-lg font-bold mt-0.5" style={{ color: brand.navy }}>
            Confirm your sales options
          </h2>
          <p className="text-sm mt-1" style={{ color: brand.slate }}>
            Once published, sales options cannot be created, edited, duplicated or hidden.
            Check the order below is exactly how you want supporters to see them.
          </p>
        </div>

        {/* Sales options in their current display order */}
        <div className="px-5 py-4 space-y-2 max-h-72 overflow-y-auto">
          {ordered.length === 0 ? (
            <div
              className="rounded-lg p-3 text-sm font-semibold"
              style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}
            >
              ⚠️ You have no active sales options. Supporters won't be able to buy anything.
            </div>
          ) : (
            ordered.map((p, i) => {
              const badgeRaw  = p.badge_label;
              const badge     = p.is_featured && badgeRaw && badgeRaw.trim() !== '' && badgeRaw.trim() !== '0'
                ? badgeRaw.trim()
                : p.is_featured ? 'Featured' : null;

              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
                  style={{ borderColor: brand.border, background: '#fff' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="flex-shrink-0 h-6 w-6 rounded-full grid place-items-center text-xs font-bold"
                      style={{ background: brand.bg, color: brand.slate }}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: brand.navy }}>
                        {p.name}
                      </p>
                      {badge && (
                        <span
                          className="text-[10px] font-bold uppercase"
                          style={{ color: '#8a6d2f' }}
                        >
                          {badge}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm font-bold flex-shrink-0" style={{ color: brand.navy }}>
                    {currency}{Number(p.price).toFixed(2)}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-3 px-5 py-4"
          style={{ borderTop: `1px solid ${brand.border}` }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={publishing}
            className="rounded-lg border px-4 py-2 text-sm font-semibold"
            style={{ borderColor: brand.border, color: brand.slate }}
          >
            Go back
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={publishing}
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: brand.teal }}
          >
            {publishing ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Publishing…</>
            ) : (
              <><Check className="h-4 w-4" /> Yes, publish now</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Target progress bar ───────────────────────────────────────────────────────

function TargetProgress({
  confirmed,
  target,
  currency,
}: {
  confirmed: number;
  target:    number;
  currency:  string;
}) {
  if (target <= 0) {
    // No target: just show confirmed total
    return (
      <p className="text-xs font-semibold mt-1" style={{ color: brand.teal }}>
        {currency}{Number(confirmed).toFixed(0)} confirmed
      </p>
    );
  }

  const pct = Math.min(100, Math.round((confirmed / target) * 100));

  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs font-semibold mb-1" style={{ color: brand.slate }}>
        <span style={{ color: brand.teal }}>
          {currency}{Number(confirmed).toFixed(0)} raised
        </span>
        <span>{pct}% of {currency}{Number(target).toFixed(0)}</span>
      </div>
      <div
        className="h-1.5 w-full rounded-full overflow-hidden"
        style={{ background: brand.bg }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: brand.teal }}
        />
      </div>
    </div>
  );
}

// ── Edit fundraiser form ──────────────────────────────────────────────────────

interface EditFormProps {
  f:        PeerFundraiser;
  onSaved:  (updated: PeerFundraiser) => void;
  onCancel: () => void;
}

function EditFundraiserForm({ f, onSaved, onCancel }: EditFormProps) {
  const settingsOf = (fund: PeerFundraiser): Record<string, any> => {
    const raw = fund.settings_json;
    if (typeof raw === 'string') { try { return JSON.parse(raw) || {}; } catch { return {}; } }
    return raw || {};
  };

  const s = settingsOf(f);
  const [name,   setName]   = useState(f.name);
  const [desc,   setDesc]   = useState(f.description || '');
  const [target, setTarget] = useState(String(f.target_amount || ''));
  const [cover,  setCover]  = useState(typeof s.coverImageUrl === 'string' ? s.coverImageUrl : '');
  const [video,  setVideo]  = useState(typeof s.videoUrl === 'string' ? s.videoUrl : '');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  // Payment methods
  const [allMethods,      setAllMethods]      = useState<ClubPaymentMethod[]>([]);
  const [selectedIds,     setSelectedIds]     = useState<number[]>([]);
  const [methodsLoading,  setMethodsLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      svc.getAvailablePaymentMethods(),
      svc.paymentMethods(f.id),
    ]).then(([available, linked]) => {
      setAllMethods(available.availableMethods);
      setSelectedIds(linked.linkedMethodIds);
    }).catch(() => {
      // non-fatal - show empty list
    }).finally(() => setMethodsLoading(false));
  }, [f.id]);

  const toggleMethod = (id: number) =>
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id],
    );

  const save = async () => {
    if (!name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      const [r] = await Promise.all([
        svc.update(f.id, {
          name:         name.trim(),
          description:  desc.trim() || null,
          targetAmount: Number(target || 0),
          settings: {
            ...settingsOf(f),
            coverImageUrl: cover.trim() || null,
            videoUrl:      video.trim() || null,
          },
        }),
        svc.savePaymentMethods(f.id, selectedIds),
      ]);
      onSaved(r.fundraiser);
    } catch (e: any) {
      setError(e?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="rounded-xl border p-4 mb-5"
      style={{ borderColor: brand.border, background: '#fff' }}
    >
      <h3 className="text-sm font-bold mb-3" style={{ color: brand.navy }}>
        Edit fundraiser details
      </h3>
      <div className="space-y-3 max-w-lg">
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: brand.navy }}>
            Name <span style={{ color: '#e9574f' }}>*</span>
          </label>
          <input className={field} value={name} onChange={e => { setName(e.target.value); setError(null); }} />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: brand.navy }}>
            Description <span className="font-normal" style={{ color: brand.slate }}>(optional)</span>
          </label>
          <textarea
            className={`${field} resize-none`}
            rows={3}
            value={desc}
            onChange={e => setDesc(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: brand.navy }}>
            Overall target <span className="font-normal" style={{ color: brand.slate }}>(optional)</span>
          </label>
          <input
            className={field}
            type="number"
            min="0"
            step="1"
            value={target}
            onChange={e => setTarget(e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: brand.navy }}>
            Cover image URL <span className="font-normal" style={{ color: brand.slate }}>(optional)</span>
          </label>
          <input
            className={field}
            value={cover}
            onChange={e => setCover(e.target.value)}
            placeholder="https://…"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: brand.navy }}>
            Video URL <span className="font-normal" style={{ color: brand.slate }}>(optional)</span>
          </label>
          <input
            className={field}
            value={video}
            onChange={e => setVideo(e.target.value)}
            placeholder="YouTube link"
          />
        </div>

        {/* Payment methods */}
        <div>
          <label className="block text-xs font-semibold mb-2" style={{ color: brand.navy }}>
            Payment methods supporters can use
          </label>
          {methodsLoading ? (
            <div className="flex items-center gap-2 py-2" style={{ color: brand.slate }}>
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: brand.teal }} />
              <span className="text-xs">Loading…</span>
            </div>
          ) : allMethods.length === 0 ? (
            <p className="text-xs" style={{ color: brand.slate }}>
              No payment methods set up for your club yet.
            </p>
          ) : (
            <div className="space-y-2">
              {allMethods.map(m => {
                const isSelected = selectedIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMethod(m.id)}
                    className="flex w-full items-center justify-between rounded-xl border p-3 text-left transition"
                    style={
                      isSelected
                        ? { borderColor: brand.teal, background: 'rgba(21,127,133,0.06)' }
                        : { borderColor: brand.border, background: '#fff' }
                    }
                  >
                    <div>
                      <p className="text-sm font-bold" style={{ color: brand.navy }}>{m.methodLabel}</p>
                      <p className="text-xs mt-0.5" style={{ color: brand.slate }}>
                        {m.providerName || m.methodCategory}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 flex-shrink-0" style={{ color: brand.teal }} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: brand.teal }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button
            onClick={onCancel}
            className="rounded-lg border px-4 py-2 text-sm font-semibold"
            style={{ borderColor: brand.border, color: brand.slate }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main drawer ───────────────────────────────────────────────────────────────

export default function PeerFundraiserDrawer({
  open,
  fundraiserId: id,
  onClose,
  onChanged,
}: Props) {
  const [tab, setTab] = useState<Tab>('overview');

  const [f,               setF]               = useState<PeerFundraiser | null>(null);
  const [participants,    setParticipants]    = useState<PeerParticipant[]>([]);
  const [packs,           setPacks]           = useState<PeerPack[]>([]);
  const [orders,          setOrders]          = useState<PeerOrder[]>([]);
  const [rooms,           setRooms]           = useState<AvailableRoom[]>([]);
  const [directDonations, setDirectDonations] = useState<PeerDirectDonation[]>([]);

  // Sponsored-only
  const [sponsoredRooms,     setSponsoredRooms]     = useState<any[]>([]);
  const [sponsorshipSummary, setSponsorshipSummary] = useState<any>(null);
  const [sponsorships,       setSponsorships]       = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const [editingParticipant, setEditingParticipant] = useState<PeerParticipant | null>(null);
  const [editingF,           setEditingF]           = useState(false);

  // Publish flow
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishing,       setPublishing]       = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const fr = await svc.get(id);
      const fundraiser = fr.fundraiser;
      setF(fundraiser);

      const [ps, rs] = await Promise.all([
        svc.participants(id),
        svc.rooms(id),
      ]);
      setParticipants(ps.participants);
      setRooms(rs.rooms);

      if (fundraiser.format_type === 'sponsored') {
        const [sponsored, totals] = await Promise.all([
          svc.availableSponsoredRooms(id),
          svc.sponsorshipSummary(id),
        ]);

        let contributionRows: { contributions: any[] } = { contributions: [] };
        if (totals.roomId) {
          contributionRows = await svc.sponsorships(id);
        }

        setSponsoredRooms(sponsored.rooms);
        setSponsorshipSummary(totals);
        setSponsorships(contributionRows.contributions || []);
        setDirectDonations([]);
        setOrders([]);
        setPacks([]);
      } else {
        const [pks, os, ds] = await Promise.all([
          svc.packs(id),
          svc.orders(id),
          svc.donations(id),
        ]);
        setPacks(pks.packs);
        setOrders(os.orders);
        setDirectDonations(ds.donations);
        setSponsoredRooms([]);
        setSponsorshipSummary(null);
        setSponsorships([]);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (open && id) {
      setTab('overview');
      setEditingF(false);
      setEditingParticipant(null);
      load();
    }
  }, [open, id, load]);

  if (!open) return null;

  const clubSlug = f?.club_slug || localStorage.getItem('club_slug') || 'your-club';
  const base     = f ? `${window.location.origin}/fundraise/${clubSlug}/${f.public_slug}` : '';
  const isPublished = f?.status === 'published';
  const currency    = f?.currency || 'EUR';

  // ── Helpers ──────────────────────────────────────────────────────────────

  const removePerson = async (p: PeerParticipant) => {
    if (!confirm(
      `Remove ${p.participant_name}? If they already have orders, they'll be deactivated instead of deleted.`,
    )) return;
    await svc.deleteParticipant(id, p.id);
    load();
    onChanged?.();
  };

  const handlePublishClick = () => setShowPublishModal(true);

  const handlePublishConfirm = async () => {
    setPublishing(true);
    try {
      // Warn if no payment methods linked
      try {
        const pm = await svc.paymentMethods(id);
        if (!pm.linkedMethodIds?.length) {
          if (!confirm(
            "No payment methods are linked yet - supporters won't be able to pay online. Publish anyway?",
          )) {
            setPublishing(false);
            return;
          }
        }
      } catch { /* non-fatal */ }

      const r = await svc.update(id, { status: 'published' });
      setF(r.fundraiser);
      setShowPublishModal(false);
      onChanged?.();
    } catch (e: any) {
      alert(`Failed to publish: ${e?.message || 'Please try again.'}`);
    } finally {
      setPublishing(false);
    }
  };

  // ── Tab definitions (format-aware) ───────────────────────────────────────

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview',     label: 'Overview' },
    { key: 'participants', label: 'Participants' },
    {
      key:   'packs',
      label: f?.format_type === 'sponsored' ? 'Sponsorship Setup' : 'Sales Options',
    },
    {
      key:   'orders',
      label: f?.format_type === 'sponsored' ? 'Sponsorships' : 'Orders',
    },
    ...(f?.format_type === 'sponsored'
      ? []
      : [{ key: 'donations' as Tab, label: 'Donations' }]),
    { key: 'report', label: 'Report' },
  ];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <div
        className="fixed inset-0 z-[9990] bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-label="Peer fundraiser details"
        className="fixed right-0 top-0 z-[9991] h-full w-full max-w-2xl overflow-y-auto shadow-2xl flex flex-col"
        style={{ background: brand.surface }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Sticky header ── */}
        <div
          className="flex-shrink-0 sticky top-0 z-10 px-5 py-4"
          style={{ background: brand.surface, borderBottom: `1px solid ${brand.border}` }}
        >
          {loading || !f ? (
            <div className="flex items-center justify-between">
              <div className="h-5 w-40 rounded animate-pulse" style={{ background: brand.bg }} />
              <div className="h-9 w-9 rounded-full animate-pulse" style={{ background: brand.bg }} />
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p
                      className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: brand.slate }}
                    >
                      Peer Fundraiser
                    </p>
                    {/* Status pill */}
                    <span
                      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                      style={
                        isPublished
                          ? { background: 'rgba(21,127,133,0.12)', color: '#157f85' }
                          : f.status === 'closed'
                          ? { background: '#f1f0ee', color: '#52636f' }
                          : { background: 'rgba(210,181,130,0.25)', color: '#8a6d2f' }
                      }
                    >
                      {f.status}
                    </span>
                    <span
                      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ background: brand.bg, color: brand.slate }}
                    >
                      {FORMAT_LABEL[f.format_type] ?? f.format_type}
                    </span>
                  </div>

                  <h2 className="text-lg font-bold leading-tight truncate mt-0.5" style={{ color: brand.navy }}>
                    {f.name}
                  </h2>

                  {base && (
                    <a
                      href={base}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs mt-0.5 hover:underline"
                      style={{ color: brand.teal }}
                    >
                      <Globe className="h-3 w-3" /> {f.public_slug}
                    </a>
                  )}

                  {/* Target progress */}
                  <TargetProgress
                    confirmed={Number(f.confirmed_total || 0)}
                    target={Number(f.target_amount || 0)}
                    currency={currency}
                  />
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {!isPublished && (
                    <button
                      type="button"
                      onClick={handlePublishClick}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white"
                      style={{ background: brand.teal }}
                    >
                      Publish <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onClose}
                    className="grid h-9 w-9 place-items-center rounded-full"
                    style={{ background: brand.bg, color: brand.slate }}
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

            </>
          )}
        </div>

        {/* ── Tab bar ── */}
        <div
          className="flex-shrink-0 flex items-center gap-0 px-5 overflow-x-auto"
          style={{ borderBottom: `1px solid ${brand.border}` }}
        >
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex-shrink-0 px-4 py-3 text-xs font-semibold transition-colors whitespace-nowrap"
              style={
                tab === key
                  ? { color: brand.teal, borderBottom: `2px solid ${brand.teal}`, marginBottom: '-1px' }
                  : { color: brand.slate }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="flex-1 p-5 overflow-y-auto">
          {loading ? (
            <div className="flex items-center gap-3 py-8 justify-center" style={{ color: brand.slate }}>
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: brand.teal }} />
              Loading…
            </div>
          ) : error ? (
            <div
              className="flex items-center gap-2 rounded-lg p-4"
              style={{ background: '#fef2f2', border: '1px solid #fca5a5' }}
            >
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={load}
                className="ml-auto text-xs font-bold text-red-700 underline"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* ── Overview ── */}
              {tab === 'overview' && f && (
                <div className="space-y-4">
                  {/* Edit button */}
                  {!editingF && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setEditingF(true)}
                        className="rounded-lg border px-4 py-2 text-sm font-semibold"
                        style={{ borderColor: brand.border, color: brand.navy }}
                      >
                        Edit details
                      </button>
                    </div>
                  )}

                  {/* Description (read mode) */}
                  {f.description && !editingF && (
                    <div
                      className="rounded-xl border p-4"
                      style={{ borderColor: brand.border, background: '#fff' }}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: brand.slate }}>
                        Description
                      </p>
                      <p className="text-sm leading-relaxed" style={{ color: brand.navy }}>
                        {f.description}
                      </p>
                    </div>
                  )}

                  {/* Edit form */}
                  {editingF ? (
                    <EditFundraiserForm
                      f={f}
                      onSaved={updated => { setF(updated); setEditingF(false); onChanged?.(); }}
                      onCancel={() => setEditingF(false)}
                    />
                  ) : (
                    !f.description && (
                      <p className="text-sm" style={{ color: brand.slate }}>
                        No description set. Click <strong>Edit</strong> to add one.
                      </p>
                    )
                  )}

                  {/* Quick stats */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Participants', value: f.participant_count ?? participants.length },
                      { label: 'Sales options', value: f.pack_count ?? packs.length },
                      { label: 'Status', value: f.status },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="rounded-xl border p-3 text-center"
                        style={{ borderColor: brand.border, background: '#fff' }}
                      >
                        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: brand.slate }}>
                          {label}
                        </p>
                        <p className="mt-1 text-base font-black capitalize" style={{ color: brand.navy }}>
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Public link */}
                  {base && (
                    <div
                      className="rounded-xl border p-4"
                      style={{ borderColor: brand.border, background: '#fff' }}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: brand.slate }}>
                        Public fundraiser link
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm flex-1 truncate font-mono" style={{ color: brand.teal }}>
                          {base}
                        </p>
                        <button
                          onClick={() => navigator.clipboard.writeText(base)}
                          className="flex-shrink-0 rounded-lg border px-3 py-1.5 text-xs font-bold"
                          style={{ borderColor: brand.border, color: brand.navy }}
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Participants ── */}
              {tab === 'participants' && (
                <div>
                  <ParticipantForm
                    fundraiserId={id}
                    editing={editingParticipant}
                    onSaved={() => { setEditingParticipant(null); load(); onChanged?.(); }}
                    onCancel={() => setEditingParticipant(null)}
                  />
                  <ParticipantList
                    participants={participants}
                    base={base}
                    onEdit={setEditingParticipant}
                    onRemove={removePerson}
                  />
                </div>
              )}

              {/* ── Sales Options (door_to_door) ── */}
              {tab === 'packs' && f?.format_type !== 'sponsored' && (
                <PeerSalesOptionsTab
                  fundraiserId={id}
                  packs={packs}
                  rooms={rooms}
                  currency={currency}
                  isPublished={isPublished}
                  onChanged={() => { load(); onChanged?.(); }}
                />
              )}

              {/* ── Sponsorship Setup (sponsored) ── */}
              {tab === 'packs' && f?.format_type === 'sponsored' && (
                <PeerSponsorshipSetupTab
                  f={f}
                  sponsoredRooms={sponsoredRooms}
                  sponsorshipSummary={sponsorshipSummary}
                  currency={currency}
                  isPublished={isPublished}
                  onChanged={() => { load(); onChanged?.(); }}
                  onFundraiserUpdated={setF}
                />
              )}

              {/* ── Orders (door_to_door) ── */}
              {tab === 'orders' && f?.format_type !== 'sponsored' && (
                <PeerOrdersTab
                  fundraiserId={id}
                  orders={orders}
                  onChanged={() => { load(); onChanged?.(); }}
                />
              )}

              {/* ── Sponsorships (sponsored) ── */}
              {tab === 'orders' && f?.format_type === 'sponsored' && (
                <PeerSponsorshipsTab
                  fundraiserId={id}
                  sponsorships={sponsorships}
                  currency={currency}
                  onChanged={() => { load(); onChanged?.(); }}
                />
              )}

              {/* ── Donations ── */}
              {tab === 'donations' && f?.format_type !== 'sponsored' && (
                <PeerDonationsTab
                  fundraiserId={id}
                  donations={directDonations}
                  onChanged={() => { load(); onChanged?.(); }}
                />
              )}

              {/* ── Report ── */}
              {tab === 'report' && f && (
                <PeerReportsTab
                  fundraiserId={id}
                  currency={currency}
                  targetAmount={Number(f.target_amount || 0)}
                />
              )}
            </>
          )}
        </div>
      </aside>

      {/* ── Publish confirmation modal ── */}
      {showPublishModal && (
        <PublishConfirmModal
          packs={packs}
          currency={currency}
          onConfirm={handlePublishConfirm}
          onCancel={() => setShowPublishModal(false)}
          publishing={publishing}
        />
      )}
    </>
  );
}