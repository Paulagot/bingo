// src/pages/peer/PeerDashboard.tsx
//
// Peer fundraising dashboard. Visual language matches the events dashboard
// (teal/cream/navy palette from branding.ts). Cards open a right-side
// drawer instead of navigating to a new page, and "New peer fundraiser"
// opens a wizard modal instead of /peer-dashboard/new.

import { useEffect, useState } from 'react';
import {
  ExternalLink,
  Loader2,
  PlusCircle,
  RefreshCw,
  TrendingUp,
  Users,
  Package,
  CheckCircle,
} from 'lucide-react';
import svc from '../../services/PeerService';
import type { PeerFundraiser } from '../../services/PeerService';
import { brand } from '../../components/dashboard/branding';
import PeerFundraiserDrawer from '../../components/peer/PeerFundraiserDrawer';
import CreatePeerFundraiserModal from '../../components/peer/CreatePeerFundraiserModal';

// Status pill colours matching the events dashboard pattern (inline styles
// rather than Tailwind dynamic classes so JIT doesn't need to see them).
function statusStyle(status: string): React.CSSProperties {
  if (status === 'published') return { background: 'rgba(21,127,133,0.12)', color: '#157f85' };
  if (status === 'draft')     return { background: 'rgba(210,181,130,0.25)', color: '#8a6d2f' };
  if (status === 'closed')    return { background: '#f1f0ee', color: '#52636f' };
  return { background: '#f1f0ee', color: '#52636f' };
}

function fmt(n: number) {
  return `€${Number(n || 0).toFixed(0)}`;
}

export default function PeerDashboard() {
  const [rows, setRows]         = useState<PeerFundraiser[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const r = await svc.list();
      setRows(r.fundraisers);
    } catch (e: any) {
      setError(e?.message || 'Failed to load fundraisers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const activeFundraiser = rows.find(r => r.id === activeId) ?? null;

  // Summary stats for the header stat row
  const totalRaised     = rows.reduce((s, r) => s + Number(r.confirmed_total || 0), 0);
  const totalPublished  = rows.filter(r => r.status === 'published').length;
  const totalPeople     = rows.reduce((s, r) => s + (r.participant_count || 0), 0);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 sm:py-8">
      {/* ── Header ── */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: brand.navy }}>
            Peer Fundraising
          </h1>
          <p className="mt-1 text-sm font-semibold" style={{ color: brand.slate }}>
            Build packs, add participants and track every order.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition"
          style={{ background: brand.teal }}
          onMouseEnter={e => (e.currentTarget.style.background = brand.tealDark)}
          onMouseLeave={e => (e.currentTarget.style.background = brand.teal)}
        >
          <PlusCircle className="h-4 w-4" /> New Fundraiser
        </button>
      </div>

      {/* ── Stats row ── */}
      {rows.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {[
            { label: 'Fundraisers',  value: rows.length,      Icon: Package,      color: 'indigo' },
            { label: 'Published',    value: totalPublished,   Icon: CheckCircle,  color: 'green'  },
            { label: 'Participants', value: totalPeople,      Icon: Users,        color: 'blue'   },
            { label: 'Total Raised', value: fmt(totalRaised), Icon: TrendingUp,   color: 'amber'  },
          ].map(({ label, value, Icon, color }) => (
            <div
              key={label}
              className="rounded-xl p-3 sm:p-4 shadow-sm"
              style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
            >
              <div className="flex items-center gap-3">
                <div className={`flex-shrink-0 p-2 rounded-lg bg-${color}-100`}>
                  <Icon className={`h-4 w-4 sm:h-5 sm:w-5 text-${color}-600`} />
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: brand.slate }}>{label}</p>
                  <p className={`text-lg sm:text-xl font-bold text-${color}-600`}>{value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Cards / states ── */}
      {loading ? (
        <div
          className="flex items-center justify-center py-16 rounded-xl"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
        >
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: brand.teal }} />
          <span className="ml-3 text-sm" style={{ color: brand.slate }}>Loading fundraisers…</span>
        </div>
      ) : error ? (
        <div
          className="py-12 text-center rounded-xl"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
        >
          <p className="text-sm font-semibold" style={{ color: '#e9574f' }}>
            Failed to load fundraisers
          </p>
          <p className="mt-1 text-xs" style={{ color: brand.slate }}>{error}</p>
          <button
            onClick={load}
            className="mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: brand.teal }}
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div
          className="py-16 text-center rounded-xl"
          style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
        >
          <Users className="mx-auto mb-4 h-10 w-10" style={{ color: '#b8c6b0' }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: brand.navy }}>
            No peer fundraisers yet
          </h3>
          <p className="text-sm mb-4" style={{ color: brand.slate }}>
            Create your first peer fundraiser, add packs and participants,
            then share the link.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
            style={{ background: brand.teal }}
          >
            <PlusCircle className="h-4 w-4" /> Create Your First Fundraiser
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(fundraiser => (
            <PeerFundraiserCard
              key={fundraiser.id}
              fundraiser={fundraiser}
              onOpen={() => setActiveId(fundraiser.id)}
            />
          ))}
        </div>
      )}

      {/* ── Drawer (open when a card is clicked) ── */}
      {activeId && (
        <PeerFundraiserDrawer
          open={!!activeId}
          fundraiserId={activeId}
          onClose={() => setActiveId(null)}
          onChanged={load}
        />
      )}

      {/* ── Create wizard modal ── */}
      {showCreate && (
        <CreatePeerFundraiserModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false);
            load();
            // Open the new fundraiser's drawer immediately
            setActiveId(id);
          }}
        />
      )}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

interface CardProps {
  fundraiser: PeerFundraiser;
  onOpen: () => void;
}

function PeerFundraiserCard({ fundraiser: f, onOpen }: CardProps) {
  const raised = Number(f.confirmed_total || 0);
  const target = Number(f.target_amount || 0);
  const progress = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : null;
  const publicUrl = `${window.location.origin}/fundraise/${f.club_slug || 'club'}/${f.public_slug}`;

  return (
    <article
      className="group relative rounded-xl overflow-hidden cursor-pointer transition-shadow hover:shadow-md"
      style={{ background: brand.surface, border: `1px solid ${brand.border}` }}
      onClick={onOpen}
    >
      {/* Coloured top strip */}
      <div className="h-1.5 w-full" style={{ background: brand.teal }} />

      <div className="p-5">
        {/* Status + name */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span
              className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide mb-2"
              style={statusStyle(f.status)}
            >
              {f.status}
            </span>
            <h2
              className="text-base font-bold leading-snug truncate"
              style={{ color: brand.navy }}
            >
              {f.name}
            </h2>
            <p className="text-xs mt-0.5 truncate" style={{ color: brand.slate }}>
              /{f.public_slug}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        {progress !== null && (
          <div className="mt-4">
            <div className="flex justify-between text-xs font-semibold mb-1" style={{ color: brand.slate }}>
              <span>€{raised.toFixed(0)} raised</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: brand.bg }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progress}%`, background: brand.teal }}
              />
            </div>
            <p className="text-xs mt-1" style={{ color: brand.slate }}>
              Target: €{target.toFixed(0)}
            </p>
          </div>
        )}

        {/* Stats */}
        <div
          className="mt-4 grid grid-cols-3 gap-2 rounded-lg p-3"
          style={{ background: brand.bg }}
        >
          <Stat label="People" value={f.participant_count || 0} />
          <Stat label="Packs"  value={f.pack_count || 0} />
          <Stat label="Raised" value={`€${raised.toFixed(0)}`} />
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={e => { e.stopPropagation(); window.open(publicUrl, '_blank'); }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold transition hover:opacity-70"
            style={{ color: brand.slate }}
          >
            <ExternalLink className="h-3.5 w-3.5" /> Public page
          </button>
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white transition"
            style={{ background: brand.teal }}
            onMouseEnter={e => (e.currentTarget.style.background = brand.tealDark)}
            onMouseLeave={e => (e.currentTarget.style.background = brand.teal)}
          >
            Manage
          </button>
        </div>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <p className="text-sm font-bold" style={{ color: brand.navy }}>{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: brand.slate }}>
        {label}
      </p>
    </div>
  );
}