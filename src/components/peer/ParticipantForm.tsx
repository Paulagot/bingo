// src/components/peer/ParticipantForm.tsx
//
// Add / edit form for a peer participant.
// Owns its own field state and submit; the drawer tells it which participant
// is being edited (or null to add) and reacts to onSaved / onCancel.
// Now uses PeerParticipant type instead of any.

import { useEffect, useState } from 'react';
import svc from '../../services/PeerService';
import type { PeerParticipant, CreatePeerParticipantPayload } from '../../services/PeerService';
import { brand } from '../dashboard/branding';

const field =
  'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ' +
  'focus:ring-[#157f85] focus:border-transparent transition ' +
  'border-[#dce1df] bg-white hover:border-[#b8c6b0]';

type Props = {
  fundraiserId: string;
  editing:      PeerParticipant | null;
  onSaved:      () => void;
  onCancel:     () => void;
};

export default function ParticipantForm({
  fundraiserId,
  editing,
  onSaved,
  onCancel,
}: Props) {
  const [name,    setName]    = useState('');
  const [target,  setTarget]  = useState('');
  const [message, setMessage] = useState('');
  const [photo,   setPhoto]   = useState('');
  const [video,   setVideo]   = useState('');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Repopulate when edit target changes (or clears back to "add")
  useEffect(() => {
    setError(null);
    setName(editing?.participant_name ?? '');
    setTarget(
      editing?.personal_target != null ? String(editing.personal_target) : '',
    );
    setMessage(editing?.personal_message ?? '');
    setPhoto(editing?.profile_image_url ?? '');
    setVideo(editing?.video_url ?? '');
  }, [editing]);

  const submit = async () => {
    if (!name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError(null);

    const body: CreatePeerParticipantPayload = {
      participantName:  name.trim(),
      personalTarget:   target ? Number(target) : null,
      personalMessage:  message.trim() || null,
      profileImageUrl:  photo.trim()   || null,
      videoUrl:         video.trim()   || null,
    };

    try {
      if (editing) {
        await svc.updateParticipant(fundraiserId, editing.id, body);
      } else {
        await svc.addParticipant(fundraiserId, body);
      }
      // Reset form on successful add (not on edit — drawer will close the form)
      if (!editing) {
        setName(''); setTarget(''); setMessage(''); setPhoto(''); setVideo('');
      }
      onSaved();
    } catch (e: any) {
      setError(e?.message || 'Could not save participant.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="rounded-xl p-4 mb-5"
      style={{ border: `1px solid ${brand.border}` }}
    >
      <h3 className="text-sm font-bold mb-3" style={{ color: brand.navy }}>
        {editing ? `Editing ${editing.participant_name}` : 'Add a participant'}
      </h3>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className={field}
          value={name}
          onChange={e => { setName(e.target.value); setError(null); }}
          placeholder="Participant name *"
          autoFocus={!editing}
        />
        <input
          className={field}
          type="number"
          min="0"
          step="1"
          value={target}
          onChange={e => setTarget(e.target.value)}
          placeholder="Personal target (optional)"
        />
        <input
          className={field}
          value={photo}
          onChange={e => setPhoto(e.target.value)}
          placeholder="Photo URL (optional)"
        />
        <input
          className={field}
          value={video}
          onChange={e => setVideo(e.target.value)}
          placeholder="Video URL — YouTube (optional)"
        />
        <textarea
          className={`${field} resize-none sm:col-span-2`}
          rows={2}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Personal message (optional)"
        />
      </div>

      {error && (
        <p className="mt-2 text-xs font-semibold text-red-700">{error}</p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          onClick={submit}
          disabled={saving || !name.trim()}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: brand.teal }}
        >
          {saving ? 'Saving…' : editing ? 'Save changes' : 'Add participant'}
        </button>
        {editing && (
          <button
            onClick={onCancel}
            className="rounded-lg border px-4 py-2 text-sm font-semibold"
            style={{ borderColor: brand.border, color: brand.slate }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}