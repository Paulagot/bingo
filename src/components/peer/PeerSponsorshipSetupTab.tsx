// src/components/peer/PeerSponsorshipSetupTab.tsx
//
// Sponsorship Setup tab for sponsored-format peer fundraisers.
// Rules:
//   - If a room is already linked, all other rooms are hidden - only the
//     linked room is shown with an Unlink button (pre-publish only)
//   - If published, the linked room is shown read-only with no unlink option
//   - If nothing is linked, all available rooms are shown and any can be linked
//   - Once linked and published, zero changes are possible

import { useState } from 'react';
import { Lock } from 'lucide-react';
import type { PeerFundraiser, AvailableSponsoredRoom } from '../../services/PeerService';
import svc from '../../services/PeerService';
import { brand } from '../dashboard/branding';

interface Props {
  f:                   PeerFundraiser;
  sponsoredRooms:      AvailableSponsoredRoom[];
  sponsorshipSummary:  any;
  currency:            string;
  isPublished:         boolean;
  onChanged:           () => void;
  onFundraiserUpdated: (updated: PeerFundraiser) => void;
}

export default function PeerSponsorshipSetupTab({
  f,
  sponsoredRooms,
  sponsorshipSummary,
  currency,
  isPublished,
  onChanged,
  onFundraiserUpdated,
}: Props) {
  const [saving, setSaving] = useState(false);

  const settingsOf = (fund: PeerFundraiser): Record<string, any> => {
    const raw = fund.settings_json;
    if (typeof raw === 'string') { try { return JSON.parse(raw) || {}; } catch { return {}; } }
    return raw || {};
  };

  const settings        = settingsOf(f);
  const linkedRoomId    = settings.sponsoredRoomId as string | undefined;
  const linkedRoom      = linkedRoomId
    ? sponsoredRooms.find(r => r.room_id === linkedRoomId)
    : null;

  const linkRoom = async (roomId: string) => {
    setSaving(true);
    try {
      const r = await svc.update(f.id, {
        settings: { ...settings, sponsoredRoomId: roomId },
      });
      onFundraiserUpdated(r.fundraiser);
      onChanged();
    } catch (e: any) {
      alert(`Unable to link sponsored activity: ${e?.message || 'unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const unlinkRoom = async () => {
    if (!confirm('Unlink this activity? You can link a different one before publishing.')) return;
    setSaving(true);
    try {
      const newSettings = { ...settings };
      delete newSettings.sponsoredRoomId;
      const r = await svc.update(f.id, { settings: newSettings });
      onFundraiserUpdated(r.fundraiser);
      onChanged();
    } catch (e: any) {
      alert(`Unable to unlink: ${e?.message || 'unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold" style={{ color: brand.navy }}>
            Sponsorship Setup
          </h2>
          <p className="mt-1 text-xs" style={{ color: brand.slate }}>
            {isPublished
              ? 'This fundraiser is published. The linked activity cannot be changed.'
              : linkedRoomId
              ? 'An activity is linked. You can unlink and choose a different one before publishing.'
              : 'Link this fundraiser to a Sponsored Activity room. Supporters will contribute via that activity.'}
          </p>
        </div>
        {isPublished && (
          <span
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold flex-shrink-0"
            style={{ background: brand.bg, color: brand.slate }}
          >
            <Lock className="h-3.5 w-3.5" /> Locked
          </span>
        )}
      </div>

      {/* Sponsorship summary stats (shown when a room is linked) */}
      {sponsorshipSummary && linkedRoomId && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                label: 'Confirmed sponsorship',
                value: `${currency} ${Number(sponsorshipSummary.summary?.confirmedTotal || 0).toFixed(2)}`,
              },
              {
                label: 'Sponsors',
                value: Number(sponsorshipSummary.summary?.confirmedCount || 0),
              },
              {
                label: 'Awaiting confirmation',
                value: `${currency} ${Number(sponsorshipSummary.summary?.claimedTotal || 0).toFixed(2)}`,
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-2xl border bg-white p-4"
                style={{ borderColor: brand.border }}
              >
                <p className="text-xs font-semibold" style={{ color: brand.slate }}>{label}</p>
                <p className="mt-1 text-xl font-black" style={{ color: brand.navy }}>{value}</p>
              </div>
            ))}
          </div>

          {(sponsorshipSummary.participants ?? []).length > 0 && (
            <div className="rounded-2xl border bg-white p-4" style={{ borderColor: brand.border }}>
              <p className="mb-3 text-sm font-bold" style={{ color: brand.navy }}>By participant</p>
              <div className="space-y-2">
                {sponsorshipSummary.participants.map((person: any) => (
                  <div key={person.id} className="flex items-center justify-between gap-4 text-sm">
                    <span style={{ color: brand.slate }}>{person.name}</span>
                    <span className="font-bold" style={{ color: brand.navy }}>
                      {currency} {Number(person.confirmedTotal || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Linked room card ── */}
      {linkedRoom && (
        <div>
          <p
            className="mb-2 text-[10px] font-bold uppercase tracking-widest"
            style={{ color: brand.slate }}
          >
            Linked activity
          </p>
          <div
            className="rounded-2xl border p-4"
            style={{ borderColor: brand.teal, background: '#eef8f7' }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-bold" style={{ color: brand.navy }}>{linkedRoom.name}</p>
                <p className="mt-1 text-xs capitalize" style={{ color: brand.slate }}>
                  {String(linkedRoom.activity_kind).replace(/_/g, ' ')} · {linkedRoom.status}
                </p>
                {(linkedRoom.suggested_amounts ?? []).length > 0 && (
                  <p className="mt-2 text-xs" style={{ color: brand.slate }}>
                    Suggested:{' '}
                    {linkedRoom.suggested_amounts
                      .map((a: number) => `${linkedRoom.currency} ${a}`)
                      .join(', ')}
                  </p>
                )}
              </div>
              <span
                className="rounded-full px-3 py-1 text-xs font-bold flex-shrink-0"
                style={{ background: brand.teal, color: '#ffffff' }}
              >
                Linked ✓
              </span>
            </div>

            {!isPublished && (
              <div className="mt-4 pt-3 border-t" style={{ borderColor: 'rgba(21,127,133,0.2)' }}>
                <button
                  type="button"
                  onClick={unlinkRoom}
                  disabled={saving}
                  className="rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                  style={{ borderColor: '#f2c5c2', color: '#b42318' }}
                >
                  {saving ? 'Unlinking…' : 'Unlink activity'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Linked room ID exists but not in available list ── */}
      {linkedRoomId && !linkedRoom && (
        <div
          className="rounded-xl border p-4 text-sm"
          style={{ borderColor: brand.border, background: '#fff', color: brand.slate }}
        >
          <p className="font-semibold" style={{ color: brand.navy }}>
            Linked activity (room ID: <code className="font-mono text-xs">{linkedRoomId}</code>)
          </p>
          <p className="mt-1 text-xs">
            This activity is not in the list of available rooms - it may be closed or archived.
          </p>
          {!isPublished && (
            <button
              type="button"
              onClick={unlinkRoom}
              disabled={saving}
              className="mt-3 rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-50"
              style={{ borderColor: '#f2c5c2', color: '#b42318' }}
            >
              {saving ? 'Unlinking…' : 'Unlink and choose another'}
            </button>
          )}
        </div>
      )}

      {/* ── Room picker (only when nothing linked and not published) ── */}
      {!linkedRoomId && !isPublished && (
        <>
          {sponsoredRooms.length === 0 ? (
            <div
              className="rounded-xl border p-4 text-sm"
              style={{ borderColor: '#fde68a', background: '#fffbeb', color: '#92400e' }}
            >
              No active Sponsored Activity rooms are available. Create the activity in Event
              Manager, then return here.
            </div>
          ) : (
            <div>
              <p
                className="mb-2 text-[10px] font-bold uppercase tracking-widest"
                style={{ color: brand.slate }}
              >
                Available activities
              </p>
              <div className="space-y-3">
                {sponsoredRooms.map(room => (
                  <button
                    key={room.room_id}
                    type="button"
                    disabled={saving}
                    onClick={() => linkRoom(room.room_id)}
                    className="w-full rounded-2xl border p-4 text-left transition hover:shadow-sm disabled:opacity-50"
                    style={{ borderColor: brand.border, background: '#ffffff' }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-bold" style={{ color: brand.navy }}>{room.name}</p>
                        <p className="mt-1 text-xs capitalize" style={{ color: brand.slate }}>
                          {String(room.activity_kind).replace(/_/g, ' ')} · {room.status}
                        </p>
                        {(room.suggested_amounts ?? []).length > 0 && (
                          <p className="mt-2 text-xs" style={{ color: brand.slate }}>
                            Suggested:{' '}
                            {room.suggested_amounts
                              .map((a: number) => `${room.currency} ${a}`)
                              .join(', ')}
                          </p>
                        )}
                      </div>
                      <span
                        className="rounded-full px-3 py-1 text-xs font-bold flex-shrink-0"
                        style={{ background: brand.bg, color: brand.slate }}
                      >
                        {saving ? '…' : 'Link'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Published + nothing linked edge case ── */}
      {!linkedRoomId && isPublished && (
        <div
          className="rounded-xl border p-4 text-sm font-semibold"
          style={{ borderColor: '#fde68a', background: '#fffbeb', color: '#92400e' }}
        >
          ⚠️ No activity linked. This fundraiser is published but has no sponsorship activity
          connected - supporters cannot contribute.
        </div>
      )}
    </div>
  );
}