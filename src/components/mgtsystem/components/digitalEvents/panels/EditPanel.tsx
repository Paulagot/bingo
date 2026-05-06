// src/components/mgtsystem/components/drawer/QuizEventDrawer/panels/EditPanel.tsx
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { quizApi } from '../../../../../shared/api/quiz.api';
import type { UpdateWeb2RoomPatch } from '../../../../../shared/api/quiz.api';
import { useQuizSetupStore } from '../../../../Quiz/hooks/useQuizSetupStore';
import QuizWizard from '../../../../Quiz/Wizard/QuizWizard';

function safeJson<T>(v: any): T | null {
  if (!v) return null;
  if (typeof v === 'object') return v as T;
  try { return JSON.parse(v) as T; } catch { return null; }
}

interface EditPanelProps {
  roomId: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditPanel({ roomId, onClose, onSaved }: EditPanelProps) {
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
        setErr(e?.message || 'Failed to load room');
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
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
      const msg = e?.message || 'Failed to save';
      setErr(
        msg.includes('room_not_editable') || msg.includes('409')
          ? "This quiz can't be edited anymore (it may have gone live)."
          : msg
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        <span className="ml-3 text-sm text-gray-600">Loading quiz…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {err && (
        <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {/* Wizard content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <QuizWizard
          onComplete={handleSave}
          hideEntitlements
          titleOverride="Edit Your Fundraising Quiz"
          isEditMode={true}
        />
      </div>

      {/* Sticky footer */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white px-5 py-4">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}