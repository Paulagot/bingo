import { useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Footprints,
  Info,
  Lock,
  Pencil,
  Play,
  ShieldAlert,
} from 'lucide-react';
import type { Web2RoomListItem as Room } from '../../../../../shared/api/quiz.api';
import sponsoredActivityMgmtService from '../../../services/SponsoredActivityMgmtService';

interface Props {
  room: Room;
  config?: any;
  endedAt: string | null;
  onEditFundraiser: () => void;
  onStatusChanged: () => void | Promise<void>;
}

export default function ManageSponsoredActivityTab({
  room,
  config,
  endedAt,
  onEditFundraiser,
  onStatusChanged,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [copied, setCopied] = useState(false);

  const editable = room.status === 'scheduled';
  const isCompleted = room.status === 'completed';
  const shareUrl = `${window.location.origin}/sponsor/${room.room_id}`;

  const formatDate = (value: string | null) =>
    value
      ? new Date(value).toLocaleString('en-IE', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : 'Not set';

  const activityLabel = config?.activityKind === 'other'
    ? config?.customActivityLabel
    : config?.activityKind;

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const openNow = async () => {
    setBusy(true);
    setError(null);
    try {
      await sponsoredActivityMgmtService.openNow(room.room_id);
      await onStatusChanged();
    } catch (e: any) {
      setError(e?.message || 'Could not open sponsorship');
    } finally {
      setBusy(false);
    }
  };

  const close = async () => {
    setBusy(true);
    setError(null);
    try {
      await sponsoredActivityMgmtService.close(room.room_id);
      setConfirmClose(false);
      await onStatusChanged();
    } catch (e: any) {
      setError(e?.message || 'Could not close sponsorship');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 p-5">
      {error && (
        <div className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div
        className={`flex items-start justify-between gap-3 rounded-xl border p-4 ${
          editable
            ? 'border-[rgba(21,127,133,.3)] bg-[rgba(21,127,133,.06)]'
            : 'border-amber-200 bg-amber-50'
        }`}
      >
        <div className="flex gap-2">
          {editable ? (
            <Footprints className="h-4 w-4 flex-shrink-0 text-[#157f85]" />
          ) : (
            <Lock className="h-4 w-4 flex-shrink-0 text-amber-700" />
          )}
          <p className="text-xs text-[#52636f]">
            {editable
              ? 'The activity, sponsorship window, suggested amounts and payment methods can be edited before sponsorship opens.'
              : 'Setup is locked because sponsorship has opened or closed. Existing contributions and reconciliation remain available.'}
          </p>
        </div>
        {editable && (
          <button
            type="button"
            onClick={onEditFundraiser}
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-[#157f85] px-3 py-1.5 text-xs font-semibold text-white"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        )}
      </div>

      <div className="rounded-xl border border-[#dce1df] bg-white p-5">
        <h3 className="font-bold text-[#102532]">Activity settings</h3>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-[#8a9bab]">Activity</dt>
            <dd className="font-semibold capitalize text-[#102532]">{activityLabel || '-'}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#8a9bab]">Currency</dt>
            <dd className="font-semibold text-[#102532]">{config?.currency || 'EUR'}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#8a9bab]">Suggested amounts</dt>
            <dd className="font-semibold text-[#102532]">
              {(config?.suggestedAmounts || []).join(', ') || '-'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#8a9bab]">Other amount</dt>
            <dd className="font-semibold text-[#102532]">Allowed</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border border-[#dce1df] bg-white p-5">
        <h3 className="font-bold text-[#102532]">Sponsorship window</h3>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-[#52636f]">Opens</p>
            <p className="font-semibold text-[#102532]">{formatDate(room.scheduled_at)}</p>
          </div>
          <div>
            <p className="text-xs text-[#52636f]">Closes</p>
            <p className="font-semibold text-[#102532]">{formatDate(endedAt)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#dce1df] bg-white p-5">
        <h3 className="text-sm font-bold text-[#102532]">Public sponsorship link</h3>
        <p className="mt-1 text-xs text-[#52636f]">
          This URL is reserved for the public sponsor page. The link shape will not change.
        </p>
        <div className="relative mt-4 break-all rounded-xl bg-[#0d1117] p-4 pr-24 text-xs text-[#c9d1d9]">
          <code>{shareUrl}</code>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="absolute right-3 top-2.5 inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 font-semibold text-[#157f85]"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        {room.status !== 'open' && (
          <div className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <Info className="h-4 w-4 flex-shrink-0" />
            The public page should only accept sponsorships while the activity is open.
          </div>
        )}
        <a
          href={shareUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#157f85]"
        >
          Preview route
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {isCompleted ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-green-700" />
          <h3 className="mt-2 font-bold text-[#102532]">Sponsorship is closed</h3>
          <p className="mt-1 text-sm text-[#52636f]">
            No new contributions can be created. Payments, impact and reconciliation remain available.
          </p>
        </div>
      ) : (
        <>
          {room.status === 'scheduled' && (
            <div className="rounded-xl border border-[rgba(21,127,133,.3)] bg-[rgba(21,127,133,.06)] p-5">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 flex-shrink-0 text-[#157f85]" />
                <div className="flex-1">
                  <h4 className="font-bold text-[#102532]">Open sponsorship early</h4>
                  <p className="mt-1 text-xs text-[#52636f]">
                    This allows manual contributions immediately and prevents further setup edits.
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void openNow()}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#157f85] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    <Play className="h-4 w-4" />
                    {busy ? 'Opening…' : 'Open now'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {room.status === 'open' && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-5">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 flex-shrink-0 text-rose-700" />
                <div className="flex-1">
                  <h4 className="font-bold text-rose-900">Close sponsorship</h4>
                  <p className="mt-1 text-xs text-rose-800">
                    This stops new contributions. Existing payment records and reconciliation remain available.
                  </p>
                  {!confirmClose ? (
                    <button
                      type="button"
                      onClick={() => setConfirmClose(true)}
                      className="mt-4 rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700"
                    >
                      Close sponsorship
                    </button>
                  ) : (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void close()}
                        className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {busy ? 'Closing…' : 'Yes, close it'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClose(false)}
                        className="rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
