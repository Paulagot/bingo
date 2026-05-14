// src/components/mgtsystem/components/digitalEvents/tabs/SetupTab.tsx
//
// For quiz rooms: shows edit wizard button + personalised round + event linking.
// For elimination rooms: shows edit details button (opens modal prefilled) + event linking.
// Personalised round section is quiz-only and hidden for elimination.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, Trash2, Loader2, CheckCircle2, AlertTriangle,
  Link2, Unlink, Edit, Trophy,
} from 'lucide-react';
import type { Web2RoomListItem as Room } from '../../../../../shared/api/quiz.api';
import {
  quizPersonalisedRoundsService,
  type PersonalisedRound,
  type UpsertPersonalisedRoundPayload,
} from '../../../services/QuizPersonalisedRoundsService';
import {
  eventIntegrationsService,
  type ClubEventOption,
} from '../../../services/EventIntegrationsService';
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

function formatEventOption(ev: ClubEventOption) {
  const dt = ev.start_datetime || ev.event_date || null;
  let suffix = '';
  if (dt) {
    const d = new Date(dt);
    if (!Number.isNaN(d.getTime()))
      suffix = ` — ${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }
  return `${ev.title}${suffix}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  room: Room;
  linkedEventTitle?: string | null;
  linkedEventId?: string | null;
  showEventLinking?: boolean;
  onEditQuiz: () => void;
  onLinked: () => void;
  onSaved?: () => void;          // called after elimination edit saved
  confirmUnlink: () => Promise<void>;
  unlinkLoading?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SetupTab({
  room,
  linkedEventTitle,
  linkedEventId,
  showEventLinking,
  onEditQuiz,
  onLinked,
  onSaved,
  confirmUnlink,
  unlinkLoading,
}: Props) {
  const isScheduled   = room.status === 'scheduled';
  const isLinked      = !!linkedEventId;
  const isElimination = (room as any).game_type === 'elimination';

  // ── Elimination edit modal state ───────────────────────────────────────────
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

  // ── Link state ─────────────────────────────────────────────────────────────
  const [events,        setEvents]        = useState<ClubEventOption[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError,   setEventsError]   = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [linkLoading,   setLinkLoading]   = useState(false);
  const [linkError,     setLinkError]     = useState<string | null>(null);
  const [unlinkConfirm, setUnlinkConfirm] = useState(false);

  // Load personalised round (quiz only)
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

  // Load events for linking
  useEffect(() => {
    if (!showEventLinking || isLinked) return;
    (async () => {
      try {
        setEventsLoading(true);
        const res = await eventIntegrationsService.listClubEvents();
        setEvents(res.events || []);
      } catch (e: any) { setEventsError(e?.message || 'Failed to load events'); }
      finally { setEventsLoading(false); }
    })();
  }, [showEventLinking, isLinked]);

  // Scroll to new question
  useEffect(() => {
    if (!scrollToEnd) return;
    const t = setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      setScrollToEnd(false);
    }, 80);
    return () => clearTimeout(t);
  }, [questions.length, scrollToEnd]);

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

  async function handleLink() {
    if (!selectedEvent.trim()) { setLinkError('Please select an event'); return; }
    try {
      setLinkLoading(true); setLinkError(null);
      await eventIntegrationsService.link(selectedEvent, {
        integration_type: 'quiz_web2', external_ref: room.room_id,
      });
      onLinked();
    } catch (e: any) { setLinkError(e?.message || 'Failed to link'); }
    finally { setLinkLoading(false); }
  }

  async function handleUnlink() {
    await confirmUnlink();
    setUnlinkConfirm(false);
  }

  const sortedEvents = useMemo(() => [...events], [events]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="space-y-6 p-5">

        {/* ── Setup hero ──────────────────────────────────────────────────── */}
        {isElimination ? (
          // ── ELIMINATION: clean setup card with edit button ──
          <section className={`rounded-2xl border p-5 ${
            isScheduled
              ? 'border-red-100 bg-gradient-to-r from-red-50 via-white to-orange-50'
              : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
                isScheduled ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-500'
              }`}>
                <Trophy className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-black text-gray-950">Elimination setup</h3>
                <p className="mt-1 text-sm text-gray-600">
                  {isScheduled
                    ? 'Update the schedule, entry fee, player cap and prize details.'
                    : `This game is ${room.status}. Setup details are shown for reference only.`}
                </p>

                {isScheduled && (
                  <button
                    type="button"
                    onClick={() => setShowEditModal(true)}
                    className="mt-4 inline-flex w-full items-center justify-between gap-3 rounded-2xl border border-red-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:bg-red-50 sm:w-auto sm:min-w-[280px]"
                  >
                    <span>
                      <span className="block text-sm font-bold text-red-950">Edit elimination details</span>
                      <span className="mt-0.5 block text-xs text-gray-500">
                        Schedule · entry fee · max players · prize
                      </span>
                    </span>
                    <Edit className="h-4 w-4 flex-shrink-0 text-red-600" />
                  </button>
                )}
              </div>
            </div>
          </section>

        ) : (
          // ── QUIZ: existing setup card with wizard button ──
          isScheduled ? (
            <section className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-purple-50 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                  <Edit className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-black text-gray-950">Quiz setup</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Update the schedule, pricing, quiz template, rounds, extras and prizes before the quiz starts.
                  </p>
                  <button
                    type="button"
                    onClick={onEditQuiz}
                    className="mt-4 inline-flex w-full items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:bg-indigo-50 sm:w-auto sm:min-w-[280px]"
                  >
                    <span>
                      <span className="block text-sm font-bold text-indigo-950">Edit quiz details</span>
                      <span className="mt-0.5 block text-xs text-gray-500">Schedule · pricing · template · rounds</span>
                    </span>
                    <Edit className="h-4 w-4 flex-shrink-0 text-indigo-600" />
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-200 text-gray-500">
                  <Edit className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-950">Setup</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    This event is {room.status}. Setup details are kept here for reference, but editing is only available while the quiz is scheduled.
                  </p>
                </div>
              </div>
            </section>
          )
        )}

        {/* ── Personalised round — quiz only ─────────────────────────────── */}
        {isScheduled && !isElimination && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-green-50 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-950">Personalised round</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Add a custom round for club trivia, sponsor questions or local community questions.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-full bg-white px-3 py-1 text-emerald-800 shadow-sm ring-1 ring-emerald-100">
                    {questions.length}/{MAX_QUESTIONS} questions
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-emerald-800 shadow-sm ring-1 ring-emerald-100">
                    {filledCount} filled
                  </span>
                  {hasUnsaved && (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">Unsaved</span>
                  )}
                </div>
              </div>
            </div>

            {roundLoading ? (
              <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white py-10">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                <span className="ml-2 text-sm text-gray-600">Loading personalised round…</span>
              </div>
            ) : (
              <div className="space-y-4">
                {roundError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                      <div>
                        <p className="text-sm font-medium text-red-900">{roundError}</p>
                        {roundDetails?.map((d, i) => (
                          <p key={i} className="mt-1 text-sm text-red-700">• {d}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-black text-gray-950">Round settings</h4>
                      <p className="mt-0.5 text-xs text-gray-500">Choose where this round appears and whether it is active.</p>
                    </div>
                    {hasExisting && (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Saved</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-1">
                      <label className="mb-1 block text-xs font-semibold text-gray-700">
                        Title <span className="text-gray-400">(optional)</span>
                      </label>
                      <input value={roundTitle} onChange={e => setRoundTitle(e.target.value)}
                        placeholder="e.g. Club Legends Round"
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700">Position</label>
                      <select value={position} onChange={e => setPosition(e.target.value === 'first' ? 'first' : 'last')}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">
                        <option value="first">First round</option>
                        <option value="last">Last round</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <label className="flex w-full cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
                        <input type="checkbox" checked={isEnabled} onChange={e => setIsEnabled(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                        Enabled in quiz
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {questions.map((q, qi) => (
                    <div key={q.id ?? `new-${qi}`} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-black text-gray-950">Question {qi + 1}</h4>
                          <p className="mt-0.5 text-xs text-gray-500">Write the question, then mark the correct answer.</p>
                        </div>
                        <button type="button" onClick={() => removeQuestion(qi)}
                          className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          aria-label={`Remove question ${qi + 1}`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">Question text</label>
                        <textarea value={q.questionText} onChange={e => setQuestionField(qi, { questionText: e.target.value })}
                          rows={2} placeholder="Type your question…"
                          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                      </div>
                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {([0, 1, 2, 3] as const).map(ai => {
                          const isCorrect = q.correctIndex === ai;
                          return (
                            <div key={ai} className={`rounded-2xl border p-3 transition-colors ${isCorrect ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}>
                              <div className="mb-2 flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Answer {ai + 1}</span>
                                {isCorrect && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">Correct</span>}
                              </div>
                              <input value={q.answers[ai]} onChange={e => setAnswer(qi, ai, e.target.value)}
                                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                                placeholder={`Option ${ai + 1}`} />
                              <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-700">
                                <input type="radio" name={`correct_${qi}`} checked={isCorrect}
                                  onChange={() => setQuestionField(qi, { correctIndex: ai })}
                                  className="h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500" />
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

                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
                  {canAddMore ? (
                    <>
                      <p className="text-sm font-bold text-gray-800">Add another personalised question?</p>
                      <p className="mt-1 text-xs text-gray-500">
                        Your current questions are saved first. You can add {MAX_QUESTIONS - questions.length} more.
                      </p>
                      <button type="button" onClick={handleAddQuestion}
                        disabled={!canAddMore || roundSaving || roundDeleting || roundLoading}
                        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                        {roundSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Save & add question
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">Maximum of {MAX_QUESTIONS} questions reached.</p>
                  )}
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    {hasExisting && (
                      <button type="button" onClick={handleDeleteRound}
                        disabled={roundSaving || roundDeleting || roundLoading}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">
                        {roundDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        Delete round
                      </button>
                    )}
                  </div>
                  <button type="button" onClick={handleSaveRound}
                    disabled={roundSaving || roundDeleting || roundLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                    {roundSaving
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                      : <><CheckCircle2 className="h-4 w-4" /> Save personalised round</>}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Link / Unlink Event ─────────────────────────────────────────── */}
        {showEventLinking && (
          <section className="space-y-3">
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-indigo-50 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Link2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-950">
                    Link this {isElimination ? 'elimination' : 'quiz'} to an event
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Connect the {isElimination ? 'elimination game' : 'quiz'} to your main event record so reporting, campaign totals and event management stay together.
                  </p>
                </div>
              </div>
            </div>

            {isLinked ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                    <Link2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Currently linked to</p>
                    <p className="mt-0.5 truncate text-sm font-bold text-gray-950">{linkedEventTitle}</p>
                  </div>
                </div>
                {!unlinkConfirm ? (
                  <button type="button" onClick={() => setUnlinkConfirm(true)}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition-colors hover:bg-red-100">
                    <Unlink className="h-3.5 w-3.5" /> Unlink from event
                  </button>
                ) : (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
                    <p className="text-xs font-bold text-red-800">Remove this event link?</p>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => setUnlinkConfirm(false)} disabled={unlinkLoading}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                        Cancel
                      </button>
                      <button type="button" onClick={handleUnlink} disabled={unlinkLoading}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                        {unlinkLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
                        {unlinkLoading ? 'Unlinking…' : 'Confirm unlink'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <label className="mb-1 block text-xs font-semibold text-gray-700">Choose event</label>
                <select value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}
                  disabled={eventsLoading || linkLoading || !isScheduled}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-50">
                  <option value="">{eventsLoading ? 'Loading events…' : 'Choose an event…'}</option>
                  {sortedEvents.map(ev => (
                    <option key={ev.id} value={ev.id}>{formatEventOption(ev)}</option>
                  ))}
                </select>
                {eventsError && <p className="mt-2 text-xs text-red-600">{eventsError}</p>}
                {linkError   && <p className="mt-2 text-xs text-red-600">{linkError}</p>}
                {!isScheduled && (
                  <p className="mt-2 text-xs text-gray-500">
                    Event linking can only be changed while the {isElimination ? 'game' : 'quiz'} is scheduled.
                  </p>
                )}
                <button type="button" onClick={handleLink}
                  disabled={linkLoading || eventsLoading || !selectedEvent || !isScheduled}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                  <Link2 className="h-4 w-4" />
                  {linkLoading ? 'Linking…' : 'Link to event'}
                </button>
              </div>
            )}
          </section>
        )}

      </div>

      {/* ── Elimination edit modal — rendered outside the scrollable div ── */}
      {showEditModal && isElimination && (
        <ScheduleEliminationModal
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