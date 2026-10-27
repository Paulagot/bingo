// src/components/peer/ParticipantList.tsx
//
// Participant roster — updated to handle self-signup approvals.
// Now shows two tabs: "Active" (existing behaviour) and "Pending" (approval queue).

import { useState, useMemo, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { ChevronDown, ChevronUp, Printer, Search, Check, X } from 'lucide-react';
import type { PeerParticipant } from '../../services/PeerService';
import { brand } from '../dashboard/branding';

type Props = {
  participants:    PeerParticipant[];
  base:            string;
  onEdit:          (p: PeerParticipant) => void;
  onRemove:        (p: PeerParticipant) => void;
  onApprove:       (p: PeerParticipant) => Promise<void>;
  onReject:        (p: PeerParticipant) => Promise<void>;
};

type Tab = 'active' | 'pending';

export default function ParticipantList({
  participants,
  base,
  onEdit,
  onRemove,
  onApprove,
  onReject,
}: Props) {
  const [tab,         setTab]         = useState<Tab>('active');
  const [search,      setSearch]      = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [actioning,   setActioning]   = useState<Set<string>>(new Set());
  const printRef = useRef<HTMLDivElement>(null);

  // Split into pending vs everyone else
  const pending = useMemo(
    () => participants.filter(p => p.status === 'pending'),
    [participants]
  );
  const active = useMemo(
    () => participants.filter(p => p.status !== 'pending'),
    [participants]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = tab === 'pending' ? pending : active;
    if (!q) return list;
    return list.filter(p => p.participant_name.toLowerCase().includes(q));
  }, [tab, pending, active, search]);

  const toggleExpand = (id: string) =>
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleAction = async (
    p: PeerParticipant,
    action: 'approve' | 'reject'
  ) => {
    setActioning(prev => new Set(prev).add(p.id));
    try {
      await (action === 'approve' ? onApprove(p) : onReject(p));
    } finally {
      setActioning(prev => {
        const next = new Set(prev);
        next.delete(p.id);
        return next;
      });
    }
  };

  if (participants.length === 0) {
    return (
      <p className="text-sm py-4 text-center" style={{ color: brand.slate }}>
        No participants yet — add one above.
      </p>
    );
  }

  return (
    <>
      {/* ── Tabs ── */}
      <div
        className="flex mb-4 rounded-lg overflow-hidden border text-sm font-semibold"
        style={{ borderColor: brand.border }}
      >
        {(['active', 'pending'] as Tab[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => { setTab(t); setSearch(''); }}
            className="flex-1 py-2 flex items-center justify-center gap-1.5 transition"
            style={{
              background: tab === t ? brand.teal : '#fff',
              color:      tab === t ? '#fff'       : brand.slate,
            }}
          >
            {t === 'active' ? 'Participants' : 'Pending approval'}
            {t === 'pending' && pending.length > 0 && (
              <span
                className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-bold"
                style={{
                  background: tab === 'pending' ? 'rgba(255,255,255,0.25)' : brand.teal,
                  color:      tab === 'pending' ? '#fff' : '#fff',
                }}
              >
                {pending.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
            style={{ color: brand.slate }}
          />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={
              tab === 'pending'
                ? 'Search applications…'
                : 'Search participants…'
            }
            className="w-full rounded-lg border pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#157f85] focus:border-transparent"
            style={{ borderColor: brand.border, background: '#fff' }}
          />
        </div>
        {tab === 'active' && (
          <button
            type="button"
            onClick={() => window.print()}
            title="Print all QR codes"
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold flex-shrink-0"
            style={{ borderColor: brand.border, color: brand.navy }}
          >
            <Printer className="h-3.5 w-3.5" />
            Print QR codes
          </button>
        )}
      </div>

      {/* No results */}
      {filtered.length === 0 && (
        <p className="text-sm text-center py-6" style={{ color: brand.slate }}>
          {tab === 'pending'
            ? 'No pending applications.'
            : search
            ? `No participants match "${search}"`
            : 'No participants yet — add one above.'}
        </p>
      )}

      {/* ── Pending approval cards ── */}
      {tab === 'pending' && (
        <div className="space-y-2 screen-only">
          {filtered.map(p => {
            const busy = actioning.has(p.id);
            return (
              <div
                key={p.id}
                className="rounded-xl border bg-white overflow-hidden"
                style={{ borderColor: brand.border }}
              >
                {/* Summary row — always expanded for pending */}
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-sm" style={{ color: brand.navy }}>
                        {p.participant_name}
                      </p>
                      {p.email && (
                        <p className="text-xs mt-0.5" style={{ color: brand.slate }}>
                          {p.email}
                          {p.phone ? ` · ${p.phone}` : ''}
                        </p>
                      )}
                      {p.personal_target != null && (
                        <p className="text-xs mt-0.5 font-semibold" style={{ color: brand.teal }}>
                          Target: {Number(p.personal_target).toFixed(2)}
                        </p>
                      )}
                      {p.personal_message && (
                        <p
                          className="mt-1.5 text-xs leading-relaxed italic"
                          style={{ color: brand.slate }}
                        >
                          "{p.personal_message}"
                        </p>
                      )}
                    </div>

                    {/* Approve / Reject */}
                    <div className="flex gap-2 flex-shrink-0 mt-0.5">
                      <button
                        onClick={() => handleAction(p, 'approve')}
                        disabled={busy}
                        title="Approve"
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50 transition"
                        style={{ background: brand.teal }}
                      >
                        <Check className="h-3 w-3" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(p, 'reject')}
                        disabled={busy}
                        title="Reject"
                        className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-50 transition"
                        style={{ borderColor: '#f2c5c2', color: '#b42318' }}
                      >
                        <X className="h-3 w-3" />
                        Reject
                      </button>
                    </div>
                  </div>

                  {p.created_at && (
                    <p className="mt-2 text-[10px]" style={{ color: brand.slate }}>
                      Applied {new Date(p.created_at).toLocaleDateString('en-IE', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Active participant cards (existing behaviour, unchanged) ── */}
      {tab === 'active' && (
        <div className="space-y-2 screen-only">
          {filtered.map(p => {
            const url      = `${base}/${p.participant_slug}`;
            const expanded = expandedIds.has(p.id);
            const inactive = p.is_active === 0 || p.is_active === false;

            return (
              <div
                key={p.id}
                className={`rounded-xl border bg-white overflow-hidden ${inactive ? 'opacity-60' : ''}`}
                style={{ borderColor: brand.border }}
              >
                {/* Collapsed summary row */}
                <button
                  type="button"
                  onClick={() => toggleExpand(p.id)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm" style={{ color: brand.navy }}>
                        {p.participant_name}
                      </span>
                      {inactive && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                          style={{ background: brand.bg, color: brand.slate }}
                        >
                          Inactive
                        </span>
                      )}
                      {p.status === 'rejected' && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                          style={{ background: '#fef2f2', color: '#b42318' }}>
                          Rejected
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5 font-semibold" style={{ color: brand.teal }}>
                      €{Number(p.confirmed_total || 0).toFixed(2)} confirmed
                      {p.personal_target != null && (
                        <span style={{ color: brand.slate }}>
                          {' '}/ €{Number(p.personal_target).toFixed(2)} target
                        </span>
                      )}
                    </p>
                  </div>
                  {expanded
                    ? <ChevronUp   className="h-4 w-4 flex-shrink-0" style={{ color: brand.slate }} />
                    : <ChevronDown className="h-4 w-4 flex-shrink-0" style={{ color: brand.slate }} />
                  }
                </button>

                {/* Expanded detail */}
                {expanded && (
                  <div className="px-4 pb-4 border-t" style={{ borderColor: brand.border }}>
                    <div className="flex items-start gap-4 mt-4">
                      <QRCodeCanvas value={url} size={96} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs truncate font-mono" style={{ color: brand.slate }}>
                          {url}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() => navigator.clipboard.writeText(url)}
                            className="rounded-lg border px-3 py-1.5 text-xs font-bold"
                            style={{ borderColor: brand.border, color: brand.navy }}
                          >
                            Copy link
                          </button>
                          <button
                            onClick={() => onEdit(p)}
                            className="rounded-lg border px-3 py-1.5 text-xs font-bold"
                            style={{ borderColor: brand.border, color: brand.navy }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onRemove(p)}
                            className="rounded-lg border px-3 py-1.5 text-xs font-bold"
                            style={{ borderColor: '#f2c5c2', color: '#b42318' }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Print layout (unchanged) ── */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #peer-qr-print-sheet { display: grid !important; }
          .screen-only { display: none !important; }
          #peer-qr-print-sheet {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 0;
            width: 210mm;
            margin: 0 auto;
            padding: 10mm;
            box-sizing: border-box;
          }
          .qr-cell {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            padding: 8mm 6mm;
            border: 0.5px solid #e0e0e0;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .qr-cell canvas { width: 70mm !important; height: 70mm !important; }
          .qr-name {
            margin-top: 4mm;
            font-family: sans-serif;
            font-size: 13pt;
            font-weight: 700;
            text-align: center;
            color: #0f2a35;
            word-break: break-word;
          }
          .qr-url {
            margin-top: 2mm;
            font-family: monospace;
            font-size: 7pt;
            color: #52636f;
            text-align: center;
            word-break: break-all;
          }
        }
        @media screen { #peer-qr-print-sheet { display: none; } }
      `}</style>

      <div id="peer-qr-print-sheet" ref={printRef}>
        {active.map(p => {
          const url = `${base}/${p.participant_slug}`;
          return (
            <div key={p.id} className="qr-cell">
              <QRCodeCanvas value={url} size={264} />
              <p className="qr-name">{p.participant_name}</p>
              <p className="qr-url">{url}</p>
            </div>
          );
        })}
      </div>
    </>
  );
}