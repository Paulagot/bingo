// src/components/mgtsystem/components/digitalEvents/tabs/SetupTab.tsx

import { useEffect, useRef, useState } from 'react';
import {
  Plus, Trash2, Loader2, CheckCircle2, AlertTriangle, Edit, Trophy,
} from 'lucide-react';
import type { Web2RoomListItem as Room } from '../../../../../shared/api/quiz.api';
import type { Event } from '../../../types/event';
import {
  quizPersonalisedRoundsService,
  type PersonalisedRound,
  type UpsertPersonalisedRoundPayload,
} from '../../../services/QuizPersonalisedRoundsService';
import ScheduleEliminationModal from '../../../modals/ScheduleEliminationModal';
import type { EliminationRoomListItem } from '../../../services/EliminationMgmtService';

// ─── Types ────────────────────────────────────────────────────────────────────

type EditableQuestion = {
  id?: number;
  questionText: string;
  answers: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
};

const MAX_QUESTIONS = 6;
const emptyQuestion = (): EditableQuestion => ({
  questionText: '', answers: ['', '', '', ''], correctIndex: 0,
});

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  room: Room;
  linkedEvent?: Event;          // full event — passed to elimination edit modal only
  onEditQuiz: () => void;       // opens ScheduleQuizModal (quiz only)
  onSaved?: () => void;         // called after elimination edit saved
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SetupTab({ room, linkedEvent, onEditQuiz, onSaved }: Props) {
  const isScheduled   = room.status === 'scheduled';
  const isElimination = (room as any).game_type === 'elimination';

  const [showEditModal, setShowEditModal] = useState(false);

  // ── Personalised round state (quiz only) ───────────────────────────────────
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

  // ── Load personalised round (quiz only) ───────────────────────────────────
  useEffect(() => {
    if (!isScheduled || isElimination) return;
    (async () => {
      setRoundLoading(true); setRoundError(null);
      try {
        const res = await quizPersonalisedRoundsService.getRound(room.room_id);
        if (!res.round) { resetRound(); return; }
        const qs: EditableQuestion[] = (res.round.questions || []).map(q => ({
          id: q.id, questionText: q.questionText, answers: q.answers, correctIndex: q.correctIndex,
        }));
        const t = res.round.title || '';
        const p = res.round.position;
        const e = res.round.isEnabled;
        const nextQs = qs.length ? qs : [emptyQuestion()];
        setHasExisting(true); setRoundTitle(t); setPosition(p); setIsEnabled(e); setQuestions(nextQs);
        setOriginalSnap(JSON.stringify({ roundTitle: t.trim(), position: p, isEnabled: e, questions: nextQs }));
      } catch (e: any) { setRoundError(e.message || 'Failed to load'); }
      finally { setRoundLoading(false); }
    })();
  }, [room.room_id, isScheduled, isElimination]);

  // ── Scroll to new question ─────────────────────────────────────────────────
  useEffect(() => {
    if (!scrollToEnd) return;
    const t = setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      setScrollToEnd(false);
    }, 80);
    return () => clearTimeout(t);
  }, [questions.length, scrollToEnd]);

  // ── Personalised round helpers ─────────────────────────────────────────────
  function resetRound() {
    const qs = [emptyQuestion()];
    setHasExisting(false); setRoundTitle(''); setPosition('last'); setIsEnabled(true); setQuestions(qs);
    setOriginalSnap(JSON.stringify({ roundTitle: '', position: 'last', isEnabled: true, questions: qs }));
  }

  function setQuestionField(idx: number, patch: Partial<EditableQuestion>) {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, ...patch } : q));
  }

  function setAnswer(qIdx: number, aIdx: 0 | 1 | 2 | 3, value: string) {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const next = [...q.answers] as [string, string, string, string];
      next[aIdx] = value;
      return { ...q, answers: next };
    }));
  }

  function removeQuestion(idx: number) {
    setQuestions(prev => {
      const n = prev.filter((_, i) => i !== idx);
      return n.length ? n : [emptyQuestion()];
    });
  }

  function validate(): { ok: boolean; msg?: string } {
    for (const [qi, q] of questions.entries()) {
      if (!q.questionText.trim()) return { ok: false, msg: `Question ${qi + 1} text is required` };
      for (const ai of [0, 1, 2, 3] as const) {
        if (!q.answers[ai].trim()) return { ok: false, msg: `Question ${qi + 1}: answer ${ai + 1} is required` };
      }
    }
    return { ok: true };
  }

  function buildPayload(): UpsertPersonalisedRoundPayload {
    return {
      title: roundTitle.trim() || null,
      position,
      isEnabled,
      questions: questions.map(q => ({
        id: q.id ?? null,
        questionText: q.questionText.trim(),
        answers: q.answers.map(a => a.trim()) as [string, string, string, string],
        correctIndex: q.correctIndex,
      })),
    };
  }

  async function saveRound(): Promise<PersonalisedRound> {
    const v = validate();
    if (!v.ok) throw new Error(v.msg);
    const res = await quizPersonalisedRoundsService.saveRound(room.room_id, buildPayload());
    const savedQs: EditableQuestion[] = res.round.questions.map(q => ({
      id: q.id, questionText: q.questionText, answers: q.answers, correctIndex: q.correctIndex,
    }));
    const t = res.round.title || ''; const p = res.round.position; const e = res.round.isEnabled;
    setHasExisting(true); setRoundTitle(t); setPosition(p); setIsEnabled(e);
    const nextQs = savedQs.length ? savedQs : [emptyQuestion()];
    setQuestions(nextQs);
    setOriginalSnap(JSON.stringify({ roundTitle: t.trim(), position: p, isEnabled: e, questions: nextQs }));
    return res.round;
  }

  async function handleSaveRound() {
    setRoundSaving(true); setRoundError(null); setRoundDetails(null);
    try { await saveRound(); }
    catch (e: any) {
      setRoundError(e.message || 'Failed to save');
      if (Array.isArray(e.details)) setRoundDetails(e.details);
    }
    finally { setRoundSaving(false); }
  }

  async function handleAddQuestion() {
    if (!canAddMore || roundSaving || roundDeleting || roundLoading) return;
    setRoundSaving(true); setRoundError(null);
    try {
      const saved = await saveRound();
      const savedQs: EditableQuestion[] = saved.questions.map(q => ({
        id: q.id, questionText: q.questionText, answers: q.answers, correctIndex: q.correctIndex,
      }));
      setQuestions([...savedQs, emptyQuestion()]);
      setScrollToEnd(true);
    } catch (e: any) { setRoundError(e.message || 'Save current question first'); }
    finally { setRoundSaving(false); }
  }

  async function handleDeleteRound() {
    if (!hasExisting || !window.confirm('Delete this personalised round?')) return;
    setRoundDeleting(true); setRoundError(null);
    try { await quizPersonalisedRoundsService.deleteRound(room.room_id); resetRound(); }
    catch (e: any) { setRoundError(e.message || 'Failed to delete'); }
    finally { setRoundDeleting(false); }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="space-y-6 p-5">

        {/* ── Setup hero ── */}
        {isElimination ? (
          <section className={`rounded-2xl border p-5 ${
            isScheduled
              ? 'border-[rgba(233,87,79,0.2)] bg-gradient-to-r from-red-50 via-white to-orange-50'
              : 'border-[#dce1df] bg-[#fbf8f2]'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
                isScheduled ? 'bg-[rgba(233,87,79,0.15)] text-[#c8423b]' : 'bg-[#dce1df] text-[#52636f]'
              }`}>
                <Trophy className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-black text-[#102532]">Elimination setup</h3>
                <p className="mt-1 text-sm text-[#52636f]">
                  {isScheduled
                    ? 'Update the entry fee and prize details.'
                    : `This game is ${room.status}. Setup details are shown for reference only.`}
                </p>
                {isScheduled && (
                  <button
                    type="button"
                    onClick={() => setShowEditModal(true)}
                    className="mt-4 inline-flex w-full items-center justify-between gap-3 rounded-2xl border border-[rgba(233,87,79,0.3)] bg-white px-4 py-3 text-left shadow-sm transition-colors hover:bg-[rgba(233,87,79,0.08)] sm:w-auto sm:min-w-[280px]"
                  >
                    <span>
                      <span className="block text-sm font-bold text-red-950">Edit elimination details</span>
                      <span className="mt-0.5 block text-xs text-[#52636f]">Entry fee · prize</span>
                    </span>
                    <Edit className="h-4 w-4 flex-shrink-0 text-[#c8423b]" />
                  </button>
                )}
              </div>
            </div>
          </section>
        ) : isScheduled ? (
          <section className="rounded-2xl border border-[rgba(21,127,133,0.2)] bg-gradient-to-r from-[rgba(21,127,133,0.06)] via-white to-purple-50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[rgba(21,127,133,0.15)] text-[#157f85]">
                <Edit className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-black text-[#102532]">Quiz setup</h3>
                <p className="mt-1 text-sm text-[#52636f]">
                  Update the pricing, template, rounds, extras and prizes before the quiz starts.
                </p>
                <button
                  type="button"
                  onClick={onEditQuiz}
                  className="mt-4 inline-flex w-full items-center justify-between gap-3 rounded-2xl border border-[rgba(21,127,133,0.3)] bg-white px-4 py-3 text-left shadow-sm transition-colors hover:bg-[rgba(21,127,133,0.08)] sm:w-auto sm:min-w-[280px]"
                >
                  <span>
                    <span className="block text-sm font-bold text-indigo-950">Edit quiz details</span>
                    <span className="mt-0.5 block text-xs text-[#52636f]">Pricing · template · rounds · prizes</span>
                  </span>
                  <Edit className="h-4 w-4 flex-shrink-0 text-[#157f85]" />
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-[#dce1df] bg-[#fbf8f2] p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#dce1df] text-[#52636f]">
                <Edit className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#102532]">Setup</h3>
                <p className="mt-1 text-sm text-[#52636f]">
                  This event is {room.status}. Setup details are kept for reference - editing is only available while scheduled.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ── Personalised round — quiz only, scheduled only ── */}
        {isScheduled && !isElimination && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-[rgba(21,127,133,0.2)] bg-gradient-to-r from-emerald-50 via-white to-green-50 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#102532]">Personalised round</h3>
                    <p className="mt-1 text-sm text-[#52636f]">
                      Add a custom round for club trivia, sponsor questions or local community questions.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-full bg-white px-3 py-1 text-[#0e6268] shadow-sm ring-1 ring-[rgba(21,127,133,0.2)]">
                    {questions.length}/{MAX_QUESTIONS} questions
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-[#0e6268] shadow-sm ring-1 ring-[rgba(21,127,133,0.2)]">
                    {filledCount} filled
                  </span>
                  {hasUnsaved && (
                    <span className="rounded-full bg-[rgba(210,181,130,0.18)] px-3 py-1 text-[#8a6d2f]">Unsaved</span>
                  )}
                </div>
              </div>
            </div>

            {roundLoading ? (
              <div className="flex items-center justify-center rounded-2xl border border-[#dce1df] bg-white py-10">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                <span className="ml-2 text-sm text-[#52636f]">Loading personalised round…</span>
              </div>
            ) : (
              <div className="space-y-4">
                {roundError && (
                  <div className="rounded-2xl border border-[rgba(233,87,79,0.3)] bg-[rgba(233,87,79,0.08)] p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#c8423b]" />
                      <div>
                        <p className="text-sm font-medium text-[#8b1c1c]">{roundError}</p>
                        {roundDetails?.map((d, i) => (
                          <p key={i} className="mt-1 text-sm text-[#c8423b]">• {d}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Round settings */}
                <div className="rounded-2xl border border-[#dce1df] bg-white p-4 shadow-sm">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-black text-[#102532]">Round settings</h4>
                      <p className="mt-0.5 text-xs text-[#52636f]">Choose where this round appears and whether it is active.</p>
                    </div>
                    {hasExisting && (
                      <span className="rounded-full bg-[rgba(21,127,133,0.06)] px-3 py-1 text-xs font-bold text-emerald-700">Saved</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-1">
                      <label className="mb-1 block text-xs font-semibold text-[#52636f]">
                        Title <span className="text-[#8a9bab]">(optional)</span>
                      </label>
                      <input
                        value={roundTitle}
                        onChange={e => setRoundTitle(e.target.value)}
                        placeholder="e.g. Club Legends Round"
                        className="w-full rounded-xl border border-[#dce1df] px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-[rgba(21,127,133,0.2)]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#52636f]">Position</label>
                      <select
                        value={position}
                        onChange={e => setPosition(e.target.value === 'first' ? 'first' : 'last')}
                        className="w-full rounded-xl border border-[#dce1df] bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-[rgba(21,127,133,0.2)]"
                      >
                        <option value="first">First round</option>
                        <option value="last">Last round</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <label className="flex w-full cursor-pointer items-center gap-2 rounded-xl border border-[#dce1df] bg-[#fbf8f2] px-3 py-2 text-sm font-medium text-[#52636f]">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={e => setIsEnabled(e.target.checked)}
                          className="h-4 w-4 rounded border-[#dce1df] text-emerald-600 focus:ring-emerald-500"
                        />
                        Enabled in quiz
                      </label>
                    </div>
                  </div>
                </div>

                {/* Questions */}
                <div className="space-y-4">
                  {questions.map((q, qi) => (
                    <div key={q.id ?? `new-${qi}`} className="rounded-2xl border border-[#dce1df] bg-white p-4 shadow-sm">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-black text-[#102532]">Question {qi + 1}</h4>
                          <p className="mt-0.5 text-xs text-[#52636f]">Write the question, then mark the correct answer.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeQuestion(qi)}
                          className="rounded-xl p-2 text-[#8a9bab] transition-colors hover:bg-[rgba(233,87,79,0.08)] hover:text-[#c8423b]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-[#52636f]">Question text</label>
                        <textarea
                          value={q.questionText}
                          onChange={e => setQuestionField(qi, { questionText: e.target.value })}
                          rows={2}
                          placeholder="Type your question…"
                          className="w-full rounded-xl border border-[#dce1df] px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-[rgba(21,127,133,0.2)]"
                        />
                      </div>
                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {([0, 1, 2, 3] as const).map(ai => {
                          const isCorrect = q.correctIndex === ai;
                          return (
                            <div key={ai} className={`rounded-2xl border p-3 transition-colors ${
                              isCorrect ? 'border-emerald-300 bg-[rgba(21,127,133,0.06)]' : 'border-[#dce1df] bg-[#fbf8f2]'
                            }`}>
                              <div className="mb-2 flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-[#52636f]">Answer {ai + 1}</span>
                                {isCorrect && (
                                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-[#0e6268]">Correct</span>
                                )}
                              </div>
                              <input
                                value={q.answers[ai]}
                                onChange={e => setAnswer(qi, ai, e.target.value)}
                                placeholder={`Option ${ai + 1}`}
                                className="w-full rounded-xl border border-[#dce1df] bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-[rgba(21,127,133,0.2)]"
                              />
                              <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs font-medium text-[#52636f]">
                                <input
                                  type="radio"
                                  name={`correct_${qi}`}
                                  checked={isCorrect}
                                  onChange={() => setQuestionField(qi, { correctIndex: ai })}
                                  className="h-4 w-4 border-[#dce1df] text-emerald-600 focus:ring-emerald-500"
                                />
                                Mark as correct
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div ref={endRef} />
                </div>

                {/* Add question / max reached */}
                <div className="rounded-2xl border border-dashed border-[#dce1df] bg-[#fbf8f2] p-4 text-center">
                  {canAddMore ? (
                    <>
                      <p className="text-sm font-bold text-[#1e3040]">Add another personalised question?</p>
                      <p className="mt-1 text-xs text-[#52636f]">
                        Your current questions are saved first. You can add {MAX_QUESTIONS - questions.length} more.
                      </p>
                      <button
                        type="button"
                        onClick={handleAddQuestion}
                        disabled={!canAddMore || roundSaving || roundDeleting || roundLoading}
                        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#157f85] px-4 py-2 text-sm font-bold text-white hover:bg-[#0e6268] disabled:opacity-50"
                      >
                        {roundSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Save & add question
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-[#52636f]">Maximum of {MAX_QUESTIONS} questions reached.</p>
                  )}
                </div>

                {/* Save / delete actions */}
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    {hasExisting && (
                      <button
                        type="button"
                        onClick={handleDeleteRound}
                        disabled={roundSaving || roundDeleting || roundLoading}
                        className="inline-flex items-center gap-2 rounded-xl border border-[rgba(233,87,79,0.3)] bg-white px-4 py-2 text-sm font-bold text-[#c8423b] hover:bg-[rgba(233,87,79,0.08)] disabled:opacity-50"
                      >
                        {roundDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        Delete round
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveRound}
                    disabled={roundSaving || roundDeleting || roundLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#157f85] px-4 py-2 text-sm font-bold text-white hover:bg-[#0e6268] disabled:opacity-50"
                  >
                    {roundSaving
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                      : <><CheckCircle2 className="h-4 w-4" /> Save personalised round</>}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

      </div>

      {/* ── Elimination edit modal ── */}
      {showEditModal && isElimination && (
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
    </>
  );
}