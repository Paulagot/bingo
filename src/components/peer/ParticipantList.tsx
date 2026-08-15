// src/components/peer/ParticipantList.tsx
//
// Participant roster with:
//   - Search by name
//   - Cards collapsed by default (name + confirmed total only)
//   - Expand to see QR code, link, copy/edit/remove buttons
//   - Print all QR codes (6 per A4 page, name beneath each)
//   - Scrollable list (inherits drawer scroll)

import { useState, useMemo, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { ChevronDown, ChevronUp, Printer, Search } from 'lucide-react';
import type { PeerParticipant } from '../../services/PeerService';
import { brand } from '../dashboard/branding';

type Props = {
  participants: PeerParticipant[];
  base:         string;
  onEdit:       (p: PeerParticipant) => void;
  onRemove:     (p: PeerParticipant) => void;
};

export default function ParticipantList({ participants, base, onEdit, onRemove }: Props) {
  const [search,      setSearch]      = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const printRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo((): PeerParticipant[] => {
    const q = search.trim().toLowerCase();
    if (!q) return participants;
    return participants.filter(p =>
      p.participant_name.toLowerCase().includes(q),
    );
  }, [participants, search]);

  const toggleExpand = (id: string) =>
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handlePrint = () => {
    window.print();
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
            placeholder="Search participants…"
            className="w-full rounded-lg border pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#157f85] focus:border-transparent"
            style={{ borderColor: brand.border, background: '#fff' }}
          />
        </div>
        <button
          type="button"
          onClick={handlePrint}
          title="Print all QR codes"
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold flex-shrink-0"
          style={{ borderColor: brand.border, color: brand.navy }}
        >
          <Printer className="h-3.5 w-3.5" />
          Print QR codes
        </button>
      </div>

      {/* No results */}
      {filtered.length === 0 && (
        <p className="text-sm text-center py-6" style={{ color: brand.slate }}>
          No participants match "{search}"
        </p>
      )}

      {/* ── Participant cards (screen) ── */}
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
                  ? <ChevronUp className="h-4 w-4 flex-shrink-0" style={{ color: brand.slate }} />
                  : <ChevronDown className="h-4 w-4 flex-shrink-0" style={{ color: brand.slate }} />
                }
              </button>

              {/* Expanded detail */}
              {expanded && (
                <div
                  className="px-4 pb-4 border-t"
                  style={{ borderColor: brand.border }}
                >
                  <div className="flex items-start gap-4 mt-4">
                    <QRCodeCanvas value={url} size={96} />
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-xs truncate font-mono"
                        style={{ color: brand.slate }}
                      >
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

      {/* ── Print layout (hidden on screen, shown on print) ── */}
      {/*
        CSS in <style> is injected via a global style tag so it applies
        to the whole document during print. The div is always in the DOM
        so QRCodeCanvas renders real canvases that the browser can print.
        We use all participants (not filtered) for the print sheet.
      */}
      <style>{`
        @media print {
          /* Hide everything except the print sheet */
          body > * { display: none !important; }
          #peer-qr-print-sheet { display: grid !important; }

          /* Also hide screen-only list if it somehow appears */
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

          .qr-cell canvas {
            width: 70mm !important;
            height: 70mm !important;
          }

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

        @media screen {
          #peer-qr-print-sheet { display: none; }
        }
      `}</style>

      <div id="peer-qr-print-sheet" ref={printRef}>
        {participants.map(p => {
          const url = `${base}/${p.participant_slug}`;
          return (
            <div key={p.id} className="qr-cell">
              {/* size=264 ≈ 70mm at 96dpi — large enough to scan easily */}
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