// src/components/Quiz/Wizard/EditWeb2QuizWizardModal.tsx
import { useEffect, useState } from 'react';
import { quizApi } from '../../../shared/api/quiz.api';
import type { UpdateWeb2RoomPatch } from '../../../shared/api/quiz.api';
import { useQuizSetupStore } from '../hooks/useQuizSetupStore';
import QuizWizard from './QuizWizard'; // ✅ your current wizard component

function safeJson<T>(v: any): T | null {
  if (!v) return null;
  if (typeof v === 'object') return v as T;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}

export default function EditWeb2QuizWizardModal({
  roomId,
  onClose,
  onSaved,
}: {
  roomId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const beginEdit = useQuizSetupStore((s) => s.beginEditWeb2Room);
  const cancelEdit = useQuizSetupStore((s) => s.cancelEditSession);
  const commitEdit = useQuizSetupStore((s) => s.commitEditSession);

  const setupConfig = useQuizSetupStore((s) => s.setupConfig);
  const editingRoomId = useQuizSetupStore((s) => s.editingRoomId);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const res = await quizApi.getWeb2Room(roomId);
        // backend returns { room: row }
        const room = (res as any).room;

        const config = safeJson<any>(room.config_json) ?? {};
        const caps = safeJson<any>(room.room_caps_json) ?? null;

        beginEdit({
          roomId: room.room_id,
          hostId: room.host_id,
          timeZone: room.time_zone ?? null,
          scheduledAt: room.scheduled_at ?? null,
          config: { ...config, roomCaps: caps ?? config.roomCaps },
          roomCaps: caps ?? null,
        });

        if (mounted) setLoading(false);
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message || 'failed_to_load_room');
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [roomId, beginEdit]);

  const handleCancel = () => {
    cancelEdit();
    onClose();
  };

  const handleSave = async () => {
    if (saving) return;

    try {
      setSaving(true);
      setErr(null);

      // ✅ Build patch payload
      // TS FIX: cast config_json to any / UpdateWeb2RoomPatch
      // (because your QuizConfig types differ from ParsedConfig types in quiz.api.ts)
      const patch: UpdateWeb2RoomPatch = {
        scheduled_at: (setupConfig as any).eventDateTime ?? null,
        time_zone: (setupConfig as any).timeZone ?? null,
        config_json: setupConfig as any,
        room_caps_json: (setupConfig as any).roomCaps ?? null,
      };

      const idToPatch = editingRoomId ?? roomId;
      await quizApi.updateWeb2Room(idToPatch, patch);

      commitEdit();
      onSaved();
      onClose();
    } catch (e: any) {
      const msg = e?.message || 'failed_to_save';
      if (msg.includes('room_not_editable') || msg.includes('409')) {
        setErr('This quiz can’t be edited anymore (it may have gone live).');
      } else {
        setErr(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="rounded-xl bg-white px-4 py-3 shadow-lg">
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50"
      role="dialog"
      aria-modal="true"
    >
      {/* ✅ Overlay scroll container */}
      <div className="h-full w-full overflow-y-auto overscroll-contain p-0 sm:p-6">
        {/* ✅ Center on desktop, full width on mobile */}
        <div className="mx-auto flex min-h-full w-full items-stretch sm:items-center sm:justify-center">
          {/* ✅ Card: full screen on mobile, max card on desktop */}
          <div className="w-full bg-white sm:max-w-5xl sm:rounded-2xl sm:shadow-2xl">
            {/* ✅ Sticky header so buttons always accessible */}
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
                  Edit quiz setup
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Update schedule, rounds, extras, prizes and review.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCancel}
                className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                disabled={saving}
              >
                Close
              </button>
            </div>

            {/* ✅ Error banner */}
            {err && (
              <div className="px-4 pt-4 sm:px-6">
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {err}
                </div>
              </div>
            )}

            {/* ✅ Scrollable content region
                - On mobile, allow full page scroll
                - On desktop, constrain height to viewport */}
            <div className="px-2 pb-6 pt-4 sm:px-6">
              <div className="sm:max-h-[calc(100vh-180px)] sm:overflow-y-auto sm:pr-1">
                {/* Keep your existing wizard call */}
               <QuizWizard
  onComplete={handleSave}
  hideEntitlements
  titleOverride="Edit Your Fundraising Quiz"
/>

              </div>
            </div>

            {/* ✅ Sticky footer save bar (optional but recommended)
                - Always visible even when scrolled */}
            <div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
            {/* end footer */}
          </div>
          {/* end card */}
        </div>
      </div>
    </div>
  );
}