// src/components/peer/PeerFundraiserDrawer.tsx
//
// All the content that used to live on /peer-dashboard/:id (PeerManagePage)
// is now a right-side drawer that opens from the peer dashboard card.
// The six tabs (Overview, Participants, Sales Options, Orders, Payments, Report)
// are unchanged in logic — just relocated into the drawer chrome and
// re-skinned to match the events dashboard palette.
//
// PeerManagePage is kept as a redirect shim so any existing bookmarks
// still work. No API calls or service imports have changed.

import { useEffect, useState } from 'react';
import { X, Globe, AlertCircle, Loader2 } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import svc from '../../services/PeerService';
import type { PeerFundraiserFormat } from '../../services/PeerService';
import PeerPackEditor from './PeerPackEditor';
import PeerPaymentsTab from './PeerPaymentsTab';
import PeerPaymentReportTab from './PeerPaymentReportTab';
import { brand } from '../dashboard/branding';

type Tab = 'overview' | 'participants' | 'packs' | 'orders' | 'donations' | 'payments' | 'report';

const FORMAT_OPTIONS: { value: PeerFundraiserFormat; label: string }[] = [
  { value: 'door_to_door', label: 'Sell activities' },
  { value: 'sponsored', label: 'Sponsored fundraising' },
];

const ITEM_TYPE_LABELS: Record<string, string> = {
  game_entry: 'Quiz Entry + All Extras',
  elimination_entry: 'Elimination Entry',
  puzzle_entry: 'Puzzle Drop',
  event_ticket: 'Event Ticket',
  custom: 'Custom',
};

// Shared input class so the drawer fields match the events dashboard style.
const field = 'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#157f85] focus:border-transparent transition'
  + ' border-[#dce1df] bg-white hover:border-[#b8c6b0]';

interface Props {
  open:       boolean;
  fundraiserId: string;
  onClose:    () => void;
  onChanged?: () => void; // called after any mutation so the dashboard list refreshes
}

export default function PeerFundraiserDrawer({
  open,
  fundraiserId: id,
  onClose,
  onChanged,
}: Props) {
  const [tab, setTab] = useState<Tab>('overview');

  // ── Core data (mirrors PeerManagePage.load) ──
  const [f,            setF]            = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [packs,        setPacks]        = useState<any[]>([]);
  const [orders,       setOrders]       = useState<any[]>([]);
  const [rooms,        setRooms]        = useState<any[]>([]);
  const [sponsoredRooms, setSponsoredRooms] = useState<any[]>([]);
  const [sponsorshipSummary, setSponsorshipSummary] = useState<any>(null);
  const [sponsorships, setSponsorships] = useState<any[]>([]);
  const [directDonations, setDirectDonations] = useState<any[]>([]);
  const [savingSponsoredRoom, setSavingSponsoredRoom] = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);

  // ── Participant form ──
  const [person,          setPerson]          = useState('');
  const [personTarget,    setPersonTarget]    = useState('');
  const [personMessage,   setPersonMessage]   = useState('');
  const [personPhoto,     setPersonPhoto]     = useState('');
  const [editingParticipant, setEditingParticipant] = useState<any>(null);

  // ── Sales option editor (pack naming remains internal) ──
  const [editorOpen,   setEditorOpen]   = useState(false);
  const [editingPack,  setEditingPack]  = useState<any>(null);
  const [packSaving,   setPackSaving]   = useState(false);
  
  // ── Fundraiser edit ──
  const [editingF,      setEditingF]      = useState(false);
  const [editName,      setEditName]      = useState('');
  const [editDesc,      setEditDesc]      = useState('');
  const [editTarget,    setEditTarget]    = useState('');
  const [editFormat,    setEditFormat]    = useState<PeerFundraiserFormat>('door_to_door');

  const load = async () => {
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
        const [sponsored, totals, contributionRows] =
          await Promise.all([
            svc.availableSponsoredRooms(id),
            svc.sponsorshipSummary(id),
            svc.sponsorships(id),
          ]);

        setSponsoredRooms(sponsored.rooms);
        setSponsorshipSummary(totals);
        setSponsorships(contributionRows.contributions);
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
  };

  useEffect(() => {
    if (open && id) { setTab('overview'); load(); }
  }, [open, id]);

  if (!open) return null;

  const clubSlug = f?.club_slug || localStorage.getItem('club_slug') || 'your-club';
  const base = f ? `${window.location.origin}/fundraise/${clubSlug}/${f.public_slug}` : '';

  // ── Participant helpers ──
  const resetPersonForm = () => {
    setPerson(''); setPersonTarget(''); setPersonMessage('');
    setPersonPhoto(''); setEditingParticipant(null);
  };
  const addPerson = async () => {
    if (!person.trim()) return;
    await svc.addParticipant(id, {
      participantName:  person.trim(),
      personalTarget:   personTarget ? Number(personTarget) : null,
      personalMessage:  personMessage.trim() || null,
      profileImageUrl:  personPhoto.trim() || null,
    });
    resetPersonForm(); load(); onChanged?.();
  };
  const startEditPerson = (p: any) => {
    setEditingParticipant(p);
    setPerson(p.participant_name);
    setPersonTarget(p.personal_target != null ? String(p.personal_target) : '');
    setPersonMessage(p.personal_message || '');
    setPersonPhoto(p.profile_image_url || '');
  };
  const saveEditPerson = async () => {
    if (!editingParticipant || !person.trim()) return;
    await svc.updateParticipant(id, editingParticipant.id, {
      participantName:  person.trim(),
      personalTarget:   personTarget ? Number(personTarget) : null,
      personalMessage:  personMessage.trim() || null,
      profileImageUrl:  personPhoto.trim() || null,
    });
    resetPersonForm(); load(); onChanged?.();
  };
  const removePerson = async (p: any) => {
    if (!confirm(`Remove ${p.participant_name}? If they already have orders, they'll be deactivated instead of deleted.`)) return;
    await svc.deleteParticipant(id, p.id); load(); onChanged?.();
  };

  // ── Fundraiser edit helpers ──
  const startEditF = () => {
    setEditName(f.name); setEditDesc(f.description || '');
    setEditTarget(String(f.target_amount)); setEditFormat(f.format_type);
    setEditingF(true);
  };
  const saveF = async () => {
    if (!editName.trim()) return;
    const r = await svc.update(id, {
      name:        editName.trim(),
      description: editDesc.trim() || null,
      targetAmount: Number(editTarget || 0),
      formatType:  editFormat,
    });
    setF(r.fundraiser); setEditingF(false); onChanged?.();
  };

  // ── Publish ──
  const handlePublish = async () => {
    try {
      const pm = await svc.paymentMethods(id);
      if (!pm.linkedMethodIds?.length) {
        if (!confirm("No payment methods are linked yet — supporters won't be able to pay online. Publish anyway?")) return;
      }
    } catch { /* non-fatal */ }
    const r = await svc.update(id, { status: 'published' });
    setF(r.fundraiser); onChanged?.();
  };

  // ── Sales option helpers (pack naming remains internal) ──
  const savePack = async (payload: any) => {
    setPackSaving(true);
    try {
      if (editingPack) await svc.updatePack(id, editingPack.id, payload);
      else             await svc.addPack(id, payload);
      setEditorOpen(false); setEditingPack(null); load(); onChanged?.();
    } catch (e: any) { alert(`Save failed: ${e.message}`); }
    finally { setPackSaving(false); }
  };
  const hidePack = async (pack: any) => {
    if (!confirm(`Hide "${pack.name}"?`)) return;
    try { await svc.hidePack(id, pack.id); load(); onChanged?.(); }
    catch (e: any) { alert(`Failed: ${e.message}`); }
  };
  const duplicatePack = async (pack: any) => {
    try { await svc.duplicatePack(id, pack.id); load(); onChanged?.(); }
    catch (e: any) { alert(`Failed: ${e.message}`); }
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview',     label: 'Overview' },
    { key: 'participants', label: 'Participants' },
    { key: 'packs',        label: f?.format_type === 'sponsored' ? 'Sponsorship Setup' : 'Sales Options' },
    { key: 'orders',       label: f?.format_type === 'sponsored' ? 'Sponsorships' : 'Orders' },
    ...(f?.format_type === 'sponsored' ? [] : [{ key: 'donations' as Tab, label: 'Donations' }]),
    { key: 'payments',     label: 'Payments' },
    { key: 'report',       label: 'Report' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9990] bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Drawer panel — right side, wider than ClubDrawer */}
      <aside
        role="dialog"
        aria-label="Peer fundraiser details"
        className="fixed right-0 top-0 z-[9991] h-full w-full max-w-2xl overflow-y-auto shadow-2xl flex flex-col"
        style={{ background: brand.surface }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Drawer header ── */}
        <div
          className="flex-shrink-0 sticky top-0 z-10 flex items-center justify-between px-5 py-4"
          style={{ background: brand.surface, borderBottom: `1px solid ${brand.border}` }}
        >
          {loading || !f ? (
            <div className="h-5 w-40 rounded animate-pulse" style={{ background: brand.bg }} />
          ) : (
            <div className="min-w-0 flex-1 pr-4">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: brand.slate }}>
                Peer Fundraiser
              </p>
              <h2 className="text-lg font-bold leading-tight truncate" style={{ color: brand.navy }}>
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
            </div>
          )}
          <div className="flex items-center gap-2 flex-shrink-0">
            {f && f.status !== 'published' && (
              <button
                type="button"
                onClick={handlePublish}
                className="rounded-lg px-3 py-1.5 text-xs font-bold text-white"
                style={{ background: brand.teal }}
              >
                Publish
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

        {/* ── Tabs ── */}
        <div
          className="flex-shrink-0 flex items-center gap-0 px-5 overflow-x-auto"
          style={{ borderBottom: `1px solid ${brand.border}` }}
        >
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex-shrink-0 px-4 py-3 text-xs font-semibold transition-colors whitespace-nowrap"
              style={tab === key
                ? { color: brand.teal, borderBottom: `2px solid ${brand.teal}`, marginBottom: '-1px' }
                : { color: brand.slate }}
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
            <div className="flex items-center gap-2 rounded-lg p-4" style={{ background: '#fef2f2', border: '1px solid #fca5a5' }}>
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
              <button onClick={load} className="ml-auto text-xs font-bold text-red-700 underline">Retry</button>
            </div>
          ) : (
            <>
              {/* OVERVIEW */}
              {tab === 'overview' && (
                editingF ? (
                  <div className="space-y-4 max-w-lg">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: brand.navy }}>Name</label>
                      <input className={field} value={editName} onChange={e => setEditName(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: brand.navy }}>Description</label>
                      <textarea className={field} rows={3} value={editDesc} onChange={e => setEditDesc(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: brand.navy }}>Overall target (€)</label>
                      <input className={field} type="number" value={editTarget} onChange={e => setEditTarget(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: brand.navy }}>Format</label>
                      <select className={field} value={editFormat} onChange={e => setEditFormat(e.target.value as PeerFundraiserFormat)}>
                        {FORMAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveF} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: brand.teal }}>
                        Save changes
                      </button>
                      <button onClick={() => setEditingF(false)} className="rounded-lg border px-4 py-2 text-sm font-semibold" style={{ borderColor: brand.border, color: brand.slate }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <InfoCard label="Status"  value={f.status} />
                      <InfoCard label="Target"  value={`€${Number(f.target_amount).toFixed(2)}`} />
                      <InfoCard label="Format"  value={f.format_type?.replaceAll('_', ' ')} />
                    </div>
                    {f.description && (
                      <p className="mt-4 text-sm font-semibold" style={{ color: brand.slate }}>{f.description}</p>
                    )}
                    <button
                      onClick={startEditF}
                      className="mt-4 rounded-lg border px-4 py-2 text-sm font-semibold transition"
                      style={{ borderColor: brand.border, color: brand.navy }}
                    >
                      Edit details
                    </button>
                  </div>
                )
              )}

              {/* PARTICIPANTS */}
              {tab === 'participants' && (
                <div>
                  {/* Add / edit form */}
                  <div className="rounded-xl p-4 mb-5" style={{ border: `1px solid ${brand.border}` }}>
                    <h3 className="text-sm font-bold mb-3" style={{ color: brand.navy }}>
                      {editingParticipant ? `Editing ${editingParticipant.participant_name}` : 'Add a participant'}
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input className={field} value={person} onChange={e => setPerson(e.target.value)} placeholder="Participant name" />
                      <input className={field} type="number" value={personTarget} onChange={e => setPersonTarget(e.target.value)} placeholder="Personal target (optional)" />
                      <input className={field} value={personPhoto} onChange={e => setPersonPhoto(e.target.value)} placeholder="Photo URL (optional)" />
                      <textarea className={`${field} resize-none`} rows={2} value={personMessage} onChange={e => setPersonMessage(e.target.value)} placeholder="Personal message (optional)" />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={editingParticipant ? saveEditPerson : addPerson}
                        className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                        style={{ background: brand.teal }}
                      >
                        {editingParticipant ? 'Save changes' : 'Add'}
                      </button>
                      {editingParticipant && (
                        <button onClick={resetPersonForm} className="rounded-lg border px-4 py-2 text-sm font-semibold" style={{ borderColor: brand.border, color: brand.slate }}>
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  {/* List */}
                  <div className="space-y-3">
                    {participants.map(p => {
                      const url = `${base}/${p.participant_slug}`;
                      return (
                        <div
                          key={p.id}
                          className={`flex items-center gap-4 rounded-xl p-4 ${p.is_active === 0 ? 'opacity-50' : ''}`}
                          style={{ border: `1px solid ${brand.border}` }}
                        >
                          <QRCodeCanvas value={url} size={64} />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm" style={{ color: brand.navy }}>
                              {p.participant_name}
                              {p.is_active === 0 && (
                                <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: brand.bg, color: brand.slate }}>
                                  Inactive
                                </span>
                              )}
                            </p>
                            <p className="text-xs truncate mt-0.5" style={{ color: brand.slate }}>{url}</p>
                            {p.personal_target != null && (
                              <p className="text-xs font-bold mt-0.5" style={{ color: brand.slate }}>
                                Target: €{Number(p.personal_target).toFixed(2)}
                              </p>
                            )}
                            <p className="text-sm font-bold mt-0.5" style={{ color: brand.teal }}>
                              €{Number(p.confirmed_total || 0).toFixed(2)} confirmed
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            <button
                              onClick={() => navigator.clipboard.writeText(url)}
                              className="rounded-lg border px-3 py-1.5 text-xs font-bold"
                              style={{ borderColor: brand.border, color: brand.navy }}
                            >
                              Copy
                            </button>
                            <button
                              onClick={() => startEditPerson(p)}
                              className="rounded-lg border px-3 py-1.5 text-xs font-bold"
                              style={{ borderColor: brand.border, color: brand.navy }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => removePerson(p)}
                              className="rounded-lg border px-3 py-1.5 text-xs font-bold"
                              style={{ borderColor: '#f2c5c2', color: '#b42318' }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {participants.length === 0 && (
                      <p className="text-sm py-4 text-center" style={{ color: brand.slate }}>
                        No participants yet — add one above.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* SALES OPTIONS / SPONSORSHIP SETUP */}
              {tab === 'packs' && (
                f?.format_type === 'sponsored' ? (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-base font-bold" style={{ color: brand.navy }}>
                        Sponsorship Setup
                      </h2>
                      <p className="mt-1 text-xs" style={{ color: brand.slate }}>
                        Link this fundraiser to the Sponsored Activity room that
                        receives sponsorship payments.
                      </p>
                    </div>

                    {sponsorshipSummary && (
                      <div className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="rounded-2xl border border-gray-200 bg-white p-4">
                            <p className="text-xs font-semibold" style={{ color: brand.slate }}>
                              Confirmed sponsorship
                            </p>
                            <p className="mt-1 text-xl font-black" style={{ color: brand.navy }}>
                              {f.currency || 'EUR'} {Number(
                                sponsorshipSummary.summary.confirmedTotal || 0,
                              ).toFixed(2)}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-gray-200 bg-white p-4">
                            <p className="text-xs font-semibold" style={{ color: brand.slate }}>
                              Sponsors
                            </p>
                            <p className="mt-1 text-xl font-black" style={{ color: brand.navy }}>
                              {Number(sponsorshipSummary.summary.confirmedCount || 0)}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-gray-200 bg-white p-4">
                            <p className="text-xs font-semibold" style={{ color: brand.slate }}>
                              Manual awaiting confirmation
                            </p>
                            <p className="mt-1 text-xl font-black" style={{ color: brand.navy }}>
                              {f.currency || 'EUR'} {Number(
                                sponsorshipSummary.summary.claimedTotal || 0,
                              ).toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {sponsorshipSummary.participants?.length > 0 && (
                          <div className="rounded-2xl border border-gray-200 bg-white p-4">
                            <p className="mb-3 text-sm font-bold" style={{ color: brand.navy }}>
                              Sponsorship by participant
                            </p>
                            <div className="space-y-2">
                              {sponsorshipSummary.participants.map((person: any) => (
                                <div
                                  key={person.id}
                                  className="flex items-center justify-between gap-4 text-sm"
                                >
                                  <span style={{ color: brand.slate }}>{person.name}</span>
                                  <span className="font-bold" style={{ color: brand.navy }}>
                                    {f.currency || 'EUR'} {Number(person.confirmedTotal || 0).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {sponsoredRooms.length === 0 ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        No active Sponsored Activity rooms are available. Create
                        the activity in Event Manager, then return here.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sponsoredRooms.map((room: any) => {
                          const settings =
                            typeof f.settings_json === 'string'
                              ? (() => {
                                  try { return JSON.parse(f.settings_json); }
                                  catch { return {}; }
                                })()
                              : (f.settings_json || {});
                          const selected = settings.sponsoredRoomId === room.room_id;

                          return (
                            <button
                              key={room.room_id}
                              type="button"
                              disabled={savingSponsoredRoom}
                              onClick={async () => {
                                setSavingSponsoredRoom(true);
                                try {
                                  const result = await svc.update(id, {
                                    settings: {
                                      ...settings,
                                      sponsoredRoomId: room.room_id,
                                    },
                                  });
                                  setF(result.fundraiser);
                                  onChanged?.();
                                } finally {
                                  setSavingSponsoredRoom(false);
                                }
                              }}
                              className="w-full rounded-2xl border p-4 text-left"
                              style={{
                                borderColor: selected ? brand.teal : '#dce1df',
                                background: selected ? '#ecfdf5' : '#ffffff',
                              }}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <p className="font-bold" style={{ color: brand.navy }}>
                                    {room.name}
                                  </p>
                                  <p className="mt-1 text-xs capitalize" style={{ color: brand.slate }}>
                                    {String(room.activity_kind).replace(/_/g, ' ')}
                                    {' · '}{room.status}
                                  </p>
                                  {room.suggested_amounts?.length > 0 && (
                                    <p className="mt-2 text-xs" style={{ color: brand.slate }}>
                                      Suggested amounts: {room.suggested_amounts
                                        .map((amount: number) => `${room.currency} ${amount}`)
                                        .join(', ')}
                                    </p>
                                  )}
                                </div>
                                <span
                                  className="rounded-full px-3 py-1 text-xs font-bold"
                                  style={{
                                    background: selected ? brand.teal : brand.bg,
                                    color: selected ? '#ffffff' : brand.slate,
                                  }}
                                >
                                  {selected ? 'Linked' : 'Link'}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                      <div>
                        <h2 className="text-base font-bold" style={{ color: brand.navy }}>
                          Sales Options
                        </h2>
                        <p className="text-xs mt-0.5" style={{ color: brand.slate }}>
                          Choose the activities, entries or ticket types supporters can buy.
                          Combine options when you want to sell a bundle.
                        </p>
                      </div>
                      <button
                        onClick={() => { setEditingPack(null); setEditorOpen(true); }}
                        className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                        style={{ background: brand.teal }}
                      >
                        + Create sales option
                      </button>
                    </div>

                    {packs.filter((p: any) => p.is_active !== 0).length === 0 && (
                      <p className="text-sm py-4 text-center" style={{ color: brand.slate }}>
                        No sales options yet — create the first option supporters can buy.
                      </p>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                      {packs.filter((p: any) => p.is_active !== 0).map((p: any) => (
                        <div
                          key={p.id}
                          className="rounded-xl p-4"
                          style={{ border: `1px solid ${brand.border}` }}
                        >
                          <div className="flex justify-between">
                            <p className="font-bold text-sm" style={{ color: brand.navy }}>{p.name}</p>
                            <p className="font-bold text-sm" style={{ color: brand.navy }}>€{Number(p.price).toFixed(2)}</p>
                          </div>
                          {p.is_featured && (
                            <span
                              className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                              style={{ background: 'rgba(210,181,130,0.25)', color: '#8a6d2f' }}
                            >
                              {p.badge_label || 'Featured'}
                            </span>
                          )}
                          <ul className="mt-3 space-y-1">
                            {p.items.map((i: any) => {
                              const room = rooms.find((r: any) => r.room_id === i.target_room_id);
                              return (
                                <li key={i.id} className="text-xs" style={{ color: brand.slate }}>
                                  {i.quantity} × {ITEM_TYPE_LABELS[i.item_type] || i.item_type}
                                  {room ? ` · ${room.name}` : ''}
                                </li>
                              );
                            })}
                          </ul>
                          <div className="mt-3 flex gap-2">
                            <button onClick={() => { setEditingPack(p); setEditorOpen(true); }} className="rounded-lg border px-3 py-1.5 text-xs font-bold" style={{ borderColor: brand.border, color: brand.navy }}>Edit</button>
                            <button onClick={() => duplicatePack(p)} className="rounded-lg border px-3 py-1.5 text-xs font-bold" style={{ borderColor: brand.border, color: brand.navy }}>Duplicate</button>
                            <button onClick={() => hidePack(p)} className="rounded-lg border px-3 py-1.5 text-xs font-bold" style={{ borderColor: '#f2c5c2', color: '#b42318' }}>Hide</button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {editorOpen && (
                      <PeerPackEditor
                        pack={editingPack}
                        rooms={rooms}
                        defaultCurrency={f?.currency || 'EUR'}
                        saving={packSaving}
                        onSave={savePack}
                        onClose={() => { setEditorOpen(false); setEditingPack(null); }}
                      />
                    )}
                  </div>
                )
              )}

              {/* ORDERS / SPONSORSHIPS */}
              {tab === 'orders' && f.format_type === 'sponsored' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: brand.navy }}>
                      Sponsorships
                    </h3>
                    <p className="mt-1 text-sm" style={{ color: brand.slate }}>
                      Confirmed sponsorships and manual payments awaiting confirmation.
                      Unfinished Stripe and crypto attempts are not shown.
                    </p>
                  </div>

                  {!sponsorships.length ? (
                    <div className="rounded-xl border border-dashed p-8 text-center" style={{ borderColor: brand.border }}>
                      <p className="text-sm font-semibold" style={{ color: brand.slate }}>
                        No confirmed or claimed sponsorships yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sponsorships.map((contribution: any) => (
                        <div
                          key={contribution.id}
                          className="rounded-xl border bg-white p-4"
                          style={{ borderColor: brand.border }}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-bold" style={{ color: brand.navy }}>
                                {contribution.isAnonymous
                                  ? 'Anonymous'
                                  : contribution.displayName ||
                                    contribution.sponsorName ||
                                    'Sponsor'}
                              </p>
                              <p className="mt-1 text-xs" style={{ color: brand.slate }}>
                                {contribution.participantName
                                  ? `For ${contribution.participantName}`
                                  : 'General fundraiser'}
                                {' · '}
                                {contribution.paymentMethodLabel ||
                                  contribution.paymentMethodCategory}
                              </p>
                              {contribution.paymentReference && (
                                <p className="mt-1 text-xs" style={{ color: brand.slate }}>
                                  Ref: {contribution.paymentReference}
                                </p>
                              )}
                              {contribution.message && (
                                <p className="mt-2 text-sm italic" style={{ color: brand.slate }}>
                                  “{contribution.message}”
                                </p>
                              )}
                              {contribution.disputeReason && (
                                <p className="mt-2 text-xs font-semibold text-red-700">
                                  Dispute: {contribution.disputeReason}
                                </p>
                              )}
                            </div>

                            <div className="text-right">
                              <p className="font-black" style={{ color: brand.navy }}>
                                {contribution.currency} {Number(contribution.amount || 0).toFixed(2)}
                              </p>
                              <span
                                className="mt-1 inline-block rounded-full px-2 py-1 text-[10px] font-bold uppercase"
                                style={{
                                  background:
                                    contribution.status === 'confirmed'
                                      ? '#dcfce7'
                                      : contribution.status === 'claimed'
                                        ? '#fef3c7'
                                        : '#fee2e2',
                                  color:
                                    contribution.status === 'confirmed'
                                      ? '#166534'
                                      : contribution.status === 'claimed'
                                        ? '#92400e'
                                        : '#991b1b',
                                }}
                              >
                                {contribution.status}
                              </span>
                            </div>
                          </div>

                          {contribution.status === 'claimed' && (
                            <div className="mt-4 flex flex-wrap gap-2 border-t pt-3" style={{ borderColor: brand.border }}>
                              <button
                                onClick={async () => {
                                  await svc.confirmSponsorship(id, contribution.id);
                                  await load();
                                  onChanged?.();
                                }}
                                className="rounded-lg px-3 py-2 text-xs font-bold text-white"
                                style={{ background: '#16a34a' }}
                              >
                                Confirm payment
                              </button>
                              <button
                                onClick={async () => {
                                  const reason = window.prompt(
                                    'Why is this payment being disputed?',
                                  );
                                  if (!reason?.trim()) return;
                                  await svc.disputeSponsorship(
                                    id,
                                    contribution.id,
                                    reason.trim(),
                                  );
                                  await load();
                                  onChanged?.();
                                }}
                                className="rounded-lg px-3 py-2 text-xs font-bold text-white"
                                style={{ background: '#dc2626' }}
                              >
                                Dispute
                              </button>
                            </div>
                          )}

                          {contribution.status === 'disputed' && (
                            <div className="mt-4 border-t pt-3" style={{ borderColor: brand.border }}>
                              <button
                                onClick={async () => {
                                  await svc.confirmSponsorship(id, contribution.id);
                                  await load();
                                  onChanged?.();
                                }}
                                className="rounded-lg px-3 py-2 text-xs font-bold text-white"
                                style={{ background: '#16a34a' }}
                              >
                                Resolve and confirm
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === 'orders' && f.format_type !== 'sponsored' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: brand.navy }}>
                      Orders
                    </h3>
                    <p className="mt-1 text-sm" style={{ color: brand.slate }}>
                      Confirmed orders and claimed manual payments awaiting confirmation.
                      Unfinished Stripe and crypto attempts are not shown.
                    </p>
                  </div>

                  {!orders.length ? (
                    <div className="rounded-xl border border-dashed p-8 text-center" style={{ borderColor: brand.border }}>
                      <p className="text-sm font-semibold" style={{ color: brand.slate }}>
                        No confirmed or claimed orders yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.map((o: any) => (
                        <div
                          key={o.id}
                          className="rounded-xl border bg-white p-4"
                          style={{ borderColor: brand.border }}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-bold" style={{ color: brand.navy }}>
                                {o.supporter_name}
                              </p>
                              <p className="mt-1 text-xs" style={{ color: brand.slate }}>
                                {o.participant_name || 'General link'}
                                {' · '}
                                {o.payment_provider || o.payment_method_category}
                              </p>
                              {o.payment_reference && (
                                <p className="mt-1 text-xs" style={{ color: brand.slate }}>
                                  Ref: {o.payment_reference}
                                </p>
                              )}
                              {o.payment_status === 'confirmed' && (
                                <div className="mt-2 space-y-1 text-xs" style={{ color: brand.slate }}>
                                  <p>
                                    Entries: {Number(o.confirmed_entry_count || 0)}/{Number(o.entry_count || 0)} fulfilled
                                  </p>
                                  {o.allocation_check && (
                                    <p>
                                      Ledger {Number(o.allocation_check.ledgerTotal || 0).toFixed(2)}
                                      {' / '}
                                      order {Number(o.allocation_check.orderTotal || o.total_amount || 0).toFixed(2)}
                                    </p>
                                  )}
                                  {Number(o.ticket_entry_count || 0) > 0 && (
                                    <p
                                      className={
                                        Number(o.ticket_email_sent_count || 0) >=
                                        Number(o.ticket_entry_count || 0)
                                          ? 'font-semibold text-green-700'
                                          : Number(o.ticket_email_failed_count || 0) > 0
                                            ? 'font-semibold text-red-700'
                                            : 'font-semibold text-amber-700'
                                      }
                                    >
                                      Ticket emails:{' '}
                                      {Number(o.ticket_email_sent_count || 0)}/
                                      {Number(o.ticket_entry_count || 0)} sent
                                    </p>
                                  )}
                                  {o.fulfilment_error && (
                                    <p className="font-semibold text-red-700">
                                      {o.fulfilment_error}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="text-right">
                              <p className="font-black" style={{ color: brand.navy }}>
                                {o.currency || 'EUR'} {Number(o.total_amount || 0).toFixed(2)}
                              </p>
                              <span
                                className="mt-1 inline-block rounded-full px-2 py-1 text-[10px] font-bold uppercase"
                                style={{
                                  background:
                                    o.payment_status === 'confirmed'
                                      ? '#dcfce7'
                                      : '#fef3c7',
                                  color:
                                    o.payment_status === 'confirmed'
                                      ? '#166534'
                                      : '#92400e',
                                }}
                              >
                                {o.payment_status}
                              </span>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2 border-t pt-3" style={{ borderColor: brand.border }}>
                            {o.payment_status === 'claimed' && (
                              <>
                                <button
                                  onClick={async () => {
                                    await svc.confirm(id, o.id);
                                    await load();
                                    onChanged?.();
                                  }}
                                  className="rounded-lg px-3 py-2 text-xs font-bold text-white"
                                  style={{ background: '#16a34a' }}
                                >
                                  Confirm payment
                                </button>
                                <button
                                  onClick={async () => {
                                    const reason = window.prompt(
                                      'Why is this payment being rejected?',
                                    ) || undefined;
                                    await svc.rejectOrder(id, o.id, reason);
                                    await load();
                                    onChanged?.();
                                  }}
                                  className="rounded-lg px-3 py-2 text-xs font-bold text-white"
                                  style={{ background: '#dc2626' }}
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {o.payment_status === 'confirmed' &&
                              Number(o.entry_count || 0) > 0 &&
                              (
                                Number(o.pending_entry_count || 0) > 0 ||
                                Number(o.failed_entry_count || 0) > 0 ||
                                Number(o.confirmed_entry_count || 0) <
                                  Number(o.entry_count || 0)
                              ) && (
                              <button
                                onClick={async () => {
                                  await svc.retryFulfilment(id, o.id);
                                  await load();
                                  onChanged?.();
                                }}
                                className="rounded-lg px-3 py-2 text-xs font-bold text-white"
                                style={{ background: '#d97706' }}
                              >
                                Retry fulfilment
                              </button>
                            )}

                            {o.payment_status === 'confirmed' &&
                              Number(o.ticket_entry_count || 0) > 0 &&
                              Number(o.ticket_email_sent_count || 0) <
                                Number(o.ticket_entry_count || 0) && (
                              <button
                                onClick={async () => {
                                  await svc.retryFulfilment(id, o.id);
                                  await load();
                                  onChanged?.();
                                }}
                                className="rounded-lg px-3 py-2 text-xs font-bold text-white"
                                style={{ background: '#0284c7' }}
                              >
                                {Number(o.ticket_email_failed_count || 0) > 0
                                  ? 'Retry ticket email'
                                  : 'Send ticket email'}
                              </button>
                            )}

                            {o.payment_status === 'confirmed' && (
                              <button
                                onClick={async () => {
                                  if (!confirm(
                                    'This order is confirmed and may have active tickets or entitlements. Undo confirmation?',
                                  )) return;
                                  const reason = window.prompt(
                                    'Reason for undoing confirmation (optional):',
                                  ) || undefined;
                                  await svc.rejectOrder(id, o.id, reason);
                                  await load();
                                  onChanged?.();
                                }}
                                className="rounded-lg px-3 py-2 text-xs font-bold text-white"
                                style={{ background: '#dc2626' }}
                              >
                                Undo confirmation
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* DIRECT DONATIONS — SELL ACTIVITIES ONLY */}
              {tab === 'donations' && f.format_type !== 'sponsored' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: brand.navy }}>
                      Direct donations
                    </h3>
                    <p className="mt-1 text-sm" style={{ color: brand.slate }}>
                      Donations are separate from activity-sale income. Confirmed donations count in the combined report; claimed manual donations wait for club confirmation.
                    </p>
                  </div>

                  {!directDonations.length ? (
                    <div className="rounded-xl border border-dashed p-8 text-center" style={{ borderColor: brand.border }}>
                      <p className="text-sm font-semibold" style={{ color: brand.slate }}>
                        No confirmed or claimed direct donations yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {directDonations.map((donation: any) => (
                        <div key={donation.id} className="rounded-xl border bg-white p-4" style={{ borderColor: brand.border }}>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-bold" style={{ color: brand.navy }}>
                                {donation.donor_name || 'Donor'}
                              </p>
                              <p className="mt-1 text-xs" style={{ color: brand.slate }}>
                                {donation.participant_name ? `Attributed to ${donation.participant_name}` : 'General fundraiser'}
                                {' · '}
                                {donation.payment_method_label_snapshot || donation.payment_method_category_snapshot}
                              </p>
                              {donation.peer_order_id && (
                                <p className="mt-1 text-xs" style={{ color: brand.slate }}>
                                  Added to order {String(donation.peer_order_id).slice(0, 8)}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-black" style={{ color: brand.navy }}>
                                {donation.currency} {Number(donation.amount || 0).toFixed(2)}
                              </p>
                              <span className="mt-1 inline-block rounded-full px-2 py-1 text-[10px] font-bold uppercase" style={{
                                background: donation.status === 'confirmed' ? '#dcfce7' : donation.status === 'claimed' ? '#fef3c7' : '#fee2e2',
                                color: donation.status === 'confirmed' ? '#166534' : donation.status === 'claimed' ? '#92400e' : '#991b1b',
                              }}>
                                {donation.status}
                              </span>
                            </div>
                          </div>

                          {donation.status === 'claimed' && (
                            <div className="mt-4 flex gap-2 border-t pt-3" style={{ borderColor: brand.border }}>
                              <button
                                onClick={async () => {
                                  await svc.confirmDonation(id, donation.id);
                                  await load();
                                  onChanged?.();
                                }}
                                className="rounded-lg px-3 py-2 text-xs font-bold text-white"
                                style={{ background: '#16a34a' }}
                              >
                                Confirm donation
                              </button>
                              <button
                                onClick={async () => {
                                  if (!confirm('Reject this claimed donation?')) return;
                                  await svc.rejectDonation(id, donation.id);
                                  await load();
                                  onChanged?.();
                                }}
                                className="rounded-lg px-3 py-2 text-xs font-bold text-white"
                                style={{ background: '#dc2626' }}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PAYMENTS */}
              {tab === 'payments' && <PeerPaymentsTab fundraiserId={id} />}

              {/* REPORT */}
              {tab === 'report' && <PeerPaymentReportTab fundraiserId={id} />}
            </>
          )}
        </div>
      </aside>
    </>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: brand.bg }}>
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: brand.slate }}>{label}</p>
      <p className="mt-2 text-base font-bold capitalize" style={{ color: brand.navy }}>{value}</p>
    </div>
  );
}