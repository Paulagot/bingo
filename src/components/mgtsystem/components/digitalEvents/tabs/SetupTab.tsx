// src/components/mgtsystem/components/digitalEvents/tabs/SetupTab.tsx
//
// Setup tab for the digital event drawer.
//
// Quiz rooms:        shows personalised round editor (scheduled only)
// Elimination rooms: shows Edit Game button → ScheduleEliminationModal
// Ticketed events:   shows neither — no personalised questions, no edit modal
//                    (ticketed event config is managed via ScheduleTicketedEventModal)

import { useEffect, useRef, useState } from 'react';
import { Settings, PlusCircle, Trash2, Save, AlertCircle, CheckCircle, Loader2, Edit3 } from 'lucide-react';
import type { Web2RoomListItem as Room } from '../../../../../shared/api/quiz.api';
import type { Event } from '../../../types/event';
import { quizPersonalisedRoundsService } from '../../../services/QuizPersonalisedRoundsService';
import ScheduleEliminationModal from '../../../modals/ScheduleEliminationModal';
import type { EliminationRoomListItem } from '../../../services/EliminationMgmtService';
import ScheduleTicketedEventModal from '../../../modals/ScheduleTicketedEventModal';
import type { TicketedEventRoomListItem } from '../../../services/TicketedEventMgmtService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditableQuestion {
  id?: number;
  questionText: string;
  answers: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
}

const MAX_QUESTIONS = 6;

const emptyQuestion = (): EditableQuestion => ({
  questionText: '', answers: ['', '', '', ''], correctIndex: 0,
});

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  room: Room;
  linkedEvent?: Event;       // passed to elimination edit modal
  isTicketedEvent?: boolean; // hides personalised questions section entirely
  onEditQuiz: () => void;    // opens ScheduleQuizModal (quiz only)
  onSaved?: () => void;      // called after elimination edit saved
  onEditTicketedEvent?: () => void; // called after ticketed event edit saved
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SetupTab({
  room,
  linkedEvent,
  isTicketedEvent = false,
  onEditQuiz,
  onSaved,
  onEditTicketedEvent,
}: Props) {
  const isScheduled   = room.status === 'scheduled';
  const isElimination = (room as any).game_type === 'elimination';

  const [showEditModal, setShowEditModal] = useState(false);

  // ── Personalised round state (quiz only — hidden for elimination & ticketed) ──
  const [roundLoading,  setRoundLoading]  = useState(false);
  const [roundSaving,   setRoundSaving]   = useState(false);
  const [roundDeleting, setRoundDeleting] = useState(false);
  const [roundError,    setRoundError]    = useState<string | null>(null);
  const [roundDetails,  setRoundDetails]  = useState<string[] | null>(null);
  const [hasExisting,   setHasExisting]   = useState(false);
  const [roundTitle,    setRoundTitle]    = useState('');
  const [position,      setPosition]      = useState<'first' | 'last'>('last');
  const [isEnabled,     setIsEnabled]     = useState(true);
  const [questions,     setQuestions]     = useState<EditableQuestion[]>([emptyQuestion()]);
  const [originalSnap,  setOriginalSnap]  = useState('');
  const [scrollToEnd,   setScrollToEnd]   = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const canAddMore  = questions.length < MAX_QUESTIONS;
  const currentSnap = JSON.stringify({ roundTitle: roundTitle.trim(), position, isEnabled, questions });
  const hasUnsaved  = currentSnap !== originalSnap;
  const filledCount = questions.filter(q => q.questionText.trim()).length;

  const resetRound = () => {
    setRoundTitle('');
    setPosition('last');
    setIsEnabled(true);
    const init = [emptyQuestion()];
    setQuestions(init);
    setHasExisting(false);
    setRoundDetails(null);
    setOriginalSnap(JSON.stringify({ roundTitle: '', position: 'last', isEnabled: true, questions: init }));
  };

  // ── Load personalised round — quiz only, not ticketed events ──────────────
  useEffect(() => {
    // Skip for elimination, ticketed events, and non-scheduled rooms
    if (!isScheduled || isElimination || isTicketedEvent) return;
    (async () => {
      setRoundLoading(true);
      setRoundError(null);
      try {
        const res = await quizPersonalisedRoundsService.getRound(room.room_id);
        if (!res.round) { resetRound(); return; }
        const qs: EditableQuestion[] = (res.round.questions || []).map((q: any) => ({
          id:           typeof q.id === 'number' ? q.id : undefined,
          questionText: q.questionText,
          answers:      q.answers,
          correctIndex: q.correctIndex,
        }));
        const t = res.round.title || '';
        const p = res.round.position as 'first' | 'last';
        const e = res.round.isEnabled as boolean;
        const nextQs = qs.length ? qs : [emptyQuestion()];
        setRoundTitle(t);
        setPosition(p);
        setIsEnabled(e);
        setQuestions(nextQs);
        setHasExisting(true);
        setRoundDetails(null);
        setOriginalSnap(JSON.stringify({ roundTitle: t, position: p, isEnabled: e, questions: nextQs }));
      } catch (e: any) {
        setRoundError(e?.message || 'Failed to load personalised round');
        resetRound();
      } finally {
        setRoundLoading(false);
      }
    })();
  }, [room.room_id, isScheduled, isElimination, isTicketedEvent]);

  useEffect(() => {
    if (scrollToEnd && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
      setScrollToEnd(false);
    }
  }, [questions, scrollToEnd]);

  const handleAddQuestion = () => {
    if (!canAddMore) return;
    setQuestions(prev => [...prev, emptyQuestion()]);
    setScrollToEnd(true);
  };

  const handleRemoveQuestion = (i: number) => {
    setQuestions(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);
  };

  const updateQuestion = (i: number, patch: Partial<EditableQuestion>) => {
    setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, ...patch } : q));
  };

  const handleSave = async () => {
    if (roundSaving) return;
    setRoundSaving(true);
    setRoundError(null);
    try {
      const payload = {
        title:     roundTitle.trim() || 'Personalised Round',
        position,
        isEnabled,
        questions: questions
          .filter(q => q.questionText.trim())
          .map(q => ({
            id:           typeof q.id === 'number' ? q.id : null,
            questionText: q.questionText.trim(),
            answers:      q.answers as string[],
            correctIndex: q.correctIndex as number,
          })),
      };
      if (payload.questions.length === 0) {
        setRoundError('Add at least one question with text before saving.');
        return;
      }
      await quizPersonalisedRoundsService.saveRound(room.room_id, payload);
      setHasExisting(true);
      setOriginalSnap(currentSnap);
    } catch (e: any) {
      setRoundError(e?.message || 'Failed to save round');
    } finally {
      setRoundSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!hasExisting || roundDeleting) return;
    if (!window.confirm('Delete the personalised round? This cannot be undone.')) return;
    setRoundDeleting(true);
    setRoundError(null);
    try {
      await quizPersonalisedRoundsService.deleteRound(room.room_id);
      resetRound();
    } catch (e: any) {
      setRoundError(e?.message || 'Failed to delete round');
    } finally {
      setRoundDeleting(false);
    }
  };

  // ── Ticketed event — simple info card ─────────────────────────────────────
   if (isTicketedEvent) {
    return (
      <div className="p-5 space-y-4">
        <div className="rounded-xl border border-[#dce1df] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="h-4 w-4 text-[#52636f]" />
            <h3 className="text-sm font-bold text-[#102532]">Ticketed Event Setup</h3>
          </div>
          {isScheduled ? (
            <button
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition"
              style={{ background: '#157f85' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#0e6268')}
              onMouseLeave={e => (e.currentTarget.style.background = '#157f85')}
            >
              <Edit3 className="h-4 w-4" /> Edit Event Settings
            </button>
          ) : (
            <p className="text-sm text-[#8a9bab]">
              Event settings can only be edited before the event starts.
            </p>
          )}
        </div>
 
        {showEditModal && (
          <ScheduleTicketedEventModal
            event={linkedEvent!}
            existingRoom={room as unknown as TicketedEventRoomListItem}
            onClose={() => setShowEditModal(false)}
            onSaved={() => {
              setShowEditModal(false);
              onSaved?.();
            }}
          />
        )}
      </div>
    );
  }

  // ── Elimination — edit button only ─────────────────────────────────────────
  if (isElimination) {
    return (
      <div className="p-5 space-y-4">
        <div className="rounded-xl border border-[#dce1df] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="h-4 w-4 text-[#52636f]" />
            <h3 className="text-sm font-bold text-[#102532]">Elimination Game Setup</h3>
          </div>
          {isScheduled ? (
            <button
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition"
              style={{ background: '#157f85' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#0e6268')}
              onMouseLeave={e => (e.currentTarget.style.background = '#157f85')}
            >
              <Edit3 className="h-4 w-4" /> Edit Game Settings
            </button>
          ) : (
            <p className="text-sm text-[#8a9bab]">Game settings can only be edited before the event starts.</p>
          )}
        </div>

        {showEditModal && (
          <ScheduleEliminationModal
            event={linkedEvent}
            existingRoom={room as unknown as EliminationRoomListItem}
            onClose={() => setShowEditModal(false)}
            onSaved={() => {
              setShowEditModal(false);
              onSaved?.();
            }}
          />
        )}
      </div>
    );
  }

  // ── Quiz — personalised round editor ──────────────────────────────────────
  return (
    <div className="p-5 space-y-4">

      {/* Edit quiz config button */}
      {isScheduled && (
        <div className="rounded-xl border border-[#dce1df] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#102532]">Quiz Configuration</h3>
              <p className="text-xs text-[#52636f] mt-0.5">Edit rounds, entry fee, and payment settings.</p>
            </div>
            <button
              onClick={onEditQuiz}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition"
              style={{ background: 'rgba(21,127,133,0.1)', color: '#157f85' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(21,127,133,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(21,127,133,0.1)')}
            >
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </button>
          </div>
        </div>
      )}

      {/* Personalised round — quiz + scheduled only */}
      {isScheduled && !isElimination && !isTicketedEvent && (
        <div className="rounded-xl border border-[#dce1df] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <PlusCircle className="h-4 w-4 text-[#52636f]" />
            <h3 className="text-sm font-bold text-[#102532]">Personalised Questions</h3>
            {hasExisting && (
              <span className="ml-auto text-[10px] font-semibold rounded-full bg-[rgba(21,127,133,0.12)] text-[#157f85] px-2 py-0.5">
                Saved
              </span>
            )}
          </div>
          <p className="text-xs text-[#52636f] mb-4">
            Add a custom round with questions specific to your group — team trivia, local knowledge, etc.
          </p>

          {roundLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-[#52636f]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="space-y-4">
              {/* Round title */}
              <div>
                <label className="block text-xs font-semibold text-[#52636f] mb-1">Round title</label>
                <input
                  type="text"
                  value={roundTitle}
                  onChange={e => setRoundTitle(e.target.value)}
                  placeholder="e.g. Team Trivia"
                  className="w-full rounded-lg border border-[#dce1df] px-3 py-1.5 text-sm text-[#102532] focus:border-[#157f85] focus:outline-none focus:ring-2 focus:ring-[rgba(21,127,133,0.2)]"
                />
              </div>

              {/* Position */}
              <div>
                <label className="block text-xs font-semibold text-[#52636f] mb-1">Position in quiz</label>
                <div className="flex gap-2">
                  {(['first', 'last'] as const).map(pos => (
                    <button key={pos} onClick={() => setPosition(pos)}
                      className="flex-1 rounded-lg border py-1.5 text-xs font-semibold transition"
                      style={position === pos
                        ? { background: '#157f85', color: '#fff', borderColor: '#157f85' }
                        : { background: '#fafafa', color: '#52636f', borderColor: '#dce1df' }}>
                      {pos === 'first' ? 'First round' : 'Last round'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Enabled toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#52636f]">Include in quiz</span>
                <button onClick={() => setIsEnabled(p => !p)}
                  className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${isEnabled ? 'bg-[#157f85]' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform mt-0.5 ${isEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Questions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#52636f]">
                    Questions ({filledCount}/{MAX_QUESTIONS})
                  </label>
                  {canAddMore && (
                    <button onClick={handleAddQuestion}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#157f85] hover:text-[#0e6268]">
                      <PlusCircle className="h-3.5 w-3.5" /> Add
                    </button>
                  )}
                </div>

                {questions.map((q, i) => (
                  <div key={i} className="rounded-lg border border-[#dce1df] bg-[#fbf8f2] p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-bold text-[#8a9bab] pt-1.5 shrink-0">Q{i + 1}</span>
                      <input
                        type="text"
                        value={q.questionText}
                        onChange={e => updateQuestion(i, { questionText: e.target.value })}
                        placeholder="Question text…"
                        className="flex-1 rounded border border-[#dce1df] bg-white px-2 py-1.5 text-xs text-[#102532] focus:border-[#157f85] focus:outline-none"
                      />
                      {questions.length > 1 && (
                        <button onClick={() => handleRemoveQuestion(i)}
                          className="p-1 rounded text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 ml-5">
                      {q.answers.map((ans, ai) => (
                        <div key={ai} className="flex items-center gap-1.5">
                          <input
                            type="radio"
                            name={`correct-${i}`}
                            checked={q.correctIndex === ai}
                            onChange={() => updateQuestion(i, { correctIndex: ai as 0 | 1 | 2 | 3 })}
                            className="accent-[#157f85] shrink-0"
                          />
                          <input
                            type="text"
                            value={ans}
                            onChange={e => {
                              const next = [...q.answers] as [string, string, string, string];
                              next[ai] = e.target.value;
                              updateQuestion(i, { answers: next });
                            }}
                            placeholder={`Answer ${ai + 1}${q.correctIndex === ai ? ' (correct)' : ''}`}
                            className="flex-1 rounded border border-[#dce1df] bg-white px-2 py-1 text-xs text-[#102532] focus:border-[#157f85] focus:outline-none min-w-0"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              {/* Error / details */}
              {roundError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  {roundError}
                </div>
              )}
              {roundDetails && roundDetails.length > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
                  <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <ul className="list-disc list-inside space-y-0.5">
                    {roundDetails.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={roundSaving || !hasUnsaved}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold text-white transition disabled:opacity-40"
                  style={{ background: '#157f85' }}
                  onMouseEnter={e => { if (!roundSaving && hasUnsaved) e.currentTarget.style.background = '#0e6268'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#157f85'; }}
                >
                  {roundSaving
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                    : <><Save className="h-4 w-4" /> {hasExisting ? 'Update round' : 'Save round'}</>}
                </button>
                {hasExisting && (
                  <button onClick={handleDelete} disabled={roundDeleting}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40 transition">
                    {roundDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Non-scheduled quiz */}
      {!isScheduled && !isElimination && !isTicketedEvent && (
        <div className="rounded-xl border border-dashed border-[#dce1df] bg-[#fbf8f2] p-6 text-center">
          <p className="text-sm text-[#8a9bab]">Setup options are only available for scheduled events.</p>
        </div>
      )}
    </div>
  );
}