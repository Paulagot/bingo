// src/components/mgtsystem/components/digitalEvents/tabs/SetupTab.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, Trash2, Loader2, CheckCircle2, AlertTriangle,
  Link2, Unlink, Edit,
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

// ─── Types ────────────────────────────────────────────────────────────────────

type EditableQuestion = {
  id?: number;
  questionText: string;
  answers: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
};

const MAX_QUESTIONS = 6;
const emptyQuestion = (): EditableQuestion => ({ questionText: '', answers: ['', '', '', ''], correctIndex: 0 });

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
  onEditQuiz: () => void;          // triggers full-screen wizard in parent
  onLinked: () => void;
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
  confirmUnlink,
  unlinkLoading,
}: Props) {
  const isScheduled = room.status === 'scheduled';
  const isLinked    = !!linkedEventId;

  // ── Personalised round state ──
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

  const canAddMore = questions.length < MAX_QUESTIONS;
  const currentSnap = JSON.stringify({ roundTitle: roundTitle.trim(), position, isEnabled, questions });
  const hasUnsaved  = currentSnap !== originalSnap;
  const filledCount = questions.filter(q => q.questionText.trim()).length;

  // ── Link state ──
  const [events,        setEvents]        = useState<ClubEventOption[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError,   setEventsError]   = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [linkLoading,   setLinkLoading]   = useState(false);
  const [linkError,     setLinkError]     = useState<string | null>(null);
  const [unlinkConfirm, setUnlinkConfirm] = useState(false);

  // Load personalised round
  useEffect(() => {
    if (!isScheduled) return;
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
  }, [room.room_id, isScheduled]);

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
    const t = setTimeout(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); setScrollToEnd(false); }, 80);
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
    setQuestions(prev => { const n = prev.filter((_, i) => i !== idx); return n.length ? n : [emptyQuestion()]; });
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
    catch (e: any) { setRoundError(e.message || 'Failed to save'); if (Array.isArray(e.details)) setRoundDetails(e.details); }
    finally { setRoundSaving(false); }
  }

  async function handleAddQuestion() {
    if (!canAddMore || roundSaving || roundDeleting || roundLoading) return;
    setRoundSaving(true); setRoundError(null);
    try {
      const saved = await saveRound();
      const savedQs: EditableQuestion[] = saved.questions.map(q => ({ id: q.id, questionText: q.questionText, answers: q.answers, correctIndex: q.correctIndex }));
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
      await eventIntegrationsService.link(selectedEvent, { integration_type: 'quiz_web2', external_ref: room.room_id });
      onLinked();
    } catch (e: any) { setLinkError(e?.message || 'Failed to link'); }
    finally { setLinkLoading(false); }
  }

  async function handleUnlink() {
    await confirmUnlink();
    setUnlinkConfirm(false);
  }

  const sortedEvents = useMemo(() => [...events], [events]);

  return (
    <div className="p-5 space-y-6">

      {/* ── Edit Quiz ──────────────────────────────────────────────────────── */}
      {isScheduled && (
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Quiz Setup</h3>
          <button
            type="button"
            onClick={onEditQuiz}
            className="w-full flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-left hover:bg-indigo-100 transition-colors"
          >
            <Edit className="h-5 w-5 text-indigo-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-indigo-900">Edit Quiz</div>
              <div className="mt-0.5 text-xs text-gray-500">Change schedule, rounds, extras, prizes and settings</div>
            </div>
          </button>
        </section>
      )}

      {/* ── Link / Unlink Event ────────────────────────────────────────────── */}
      {showEventLinking && (
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Event Link</h3>

          {isLinked ? (
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Link2 className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                <span className="font-medium text-gray-900">{linkedEventTitle}</span>
              </div>
              {!unlinkConfirm ? (
                <button type="button" onClick={() => setUnlinkConfirm(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors">
                  <Unlink className="h-3.5 w-3.5" /> Unlink from event
                </button>
              ) : (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
                  <p className="text-xs font-semibold text-red-800">Remove this event link?</p>
                  <div className="flex gap-2">
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
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
              <select value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}
                disabled={eventsLoading || linkLoading}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50">
                <option value="">{eventsLoading ? 'Loading events…' : 'Choose an event…'}</option>
                {sortedEvents.map(ev => <option key={ev.id} value={ev.id}>{formatEventOption(ev)}</option>)}
              </select>
              {eventsError && <p className="text-xs text-red-600">{eventsError}</p>}
              {linkError   && <p className="text-xs text-red-600">{linkError}</p>}
              <button type="button" onClick={handleLink} disabled={linkLoading || eventsLoading || !selectedEvent}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                <Link2 className="h-4 w-4" />
                {linkLoading ? 'Linking…' : 'Link to Event'}
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── Personalised Round ─────────────────────────────────────────────── */}
      {isScheduled && (
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Personalised Round</h3>

          {roundLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
              <span className="ml-2 text-sm text-gray-600">Loading…</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status banner */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm text-emerald-900">
                    Add up to {MAX_QUESTIONS} custom multiple-choice questions. Appears at the start or end of the quiz.
                  </p>
                  <div className="flex gap-2 text-xs font-medium">
                    <span className="rounded-full bg-white px-3 py-1 text-emerald-800 shadow-sm">{questions.length}/{MAX_QUESTIONS}</span>
                    <span className="rounded-full bg-white px-3 py-1 text-emerald-800 shadow-sm">{filledCount} filled</span>
                    {hasUnsaved && <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">Unsaved</span>}
                  </div>
                </div>
              </div>

              {roundError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                    <div>
                      <p className="text-sm font-medium text-red-900">{roundError}</p>
                      {roundDetails?.map((d, i) => <p key={i} className="mt-1 text-sm text-red-700">• {d}</p>)}
                    </div>
                  </div>
                </div>
              )}

              {/* Round settings */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
                <h4 className="text-sm font-semibold text-gray-900">Round settings</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-1">
                    <label className="mb-1 block text-xs font-medium text-gray-700">Title <span className="text-gray-400">(optional)</span></label>
                    <input value={roundTitle} onChange={e => setRoundTitle(e.target.value)}
                      placeholder="e.g. Club Legends Round"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Position</label>
                    <select value={position} onChange={e => setPosition(e.target.value === 'first' ? 'first' : 'last')}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none">
                      <option value="first">First round</option>
                      <option value="last">Last round</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={isEnabled} onChange={e => setIsEnabled(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                      Enabled
                    </label>
                  </div>
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-4">
                {questions.map((q, qi) => (
                  <div key={q.id ?? `new-${qi}`} className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">Question {qi + 1}</h4>
                        <p className="mt-0.5 text-xs text-gray-500">Write the question, then mark the correct answer.</p>
                      </div>
                      <button type="button" onClick={() => removeQuestion(qi)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Question text</label>
                      <textarea value={q.questionText} onChange={e => setQuestionField(qi, { questionText: e.target.value })}
                        rows={2} placeholder="Type your question…"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none" />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {([0, 1, 2, 3] as const).map(ai => {
                        const isCorrect = q.correctIndex === ai;
                        return (
                          <div key={ai} className={`rounded-xl border p-3 transition-colors ${isCorrect ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}>
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Answer {ai + 1}</span>
                              {isCorrect && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Correct</span>}
                            </div>
                            <input value={q.answers[ai]} onChange={e => setAnswer(qi, ai, e.target.value)}
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none"
                              placeholder={`Option ${ai + 1}`} />
                            <label className="mt-2 flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
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

              {/* Add question / max reached */}
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
                {canAddMore ? (
                  <>
                    <p className="text-sm font-medium text-gray-800">Ready for the next question?</p>
                    <p className="mt-1 text-xs text-gray-500">Saves current questions first. You can add {MAX_QUESTIONS - questions.length} more.</p>
                    <button type="button" onClick={handleAddQuestion} disabled={!canAddMore || roundSaving || roundDeleting || roundLoading}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                      {roundSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Save & add question
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Maximum of {MAX_QUESTIONS} questions reached.</p>
                )}
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  {hasExisting && (
                    <button type="button" onClick={handleDeleteRound} disabled={roundSaving || roundDeleting || roundLoading}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">
                      {roundDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Delete round
                    </button>
                  )}
                </div>
                <button type="button" onClick={handleSaveRound} disabled={roundSaving || roundDeleting || roundLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                  {roundSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><CheckCircle2 className="h-4 w-4" /> Save round</>}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {!isScheduled && (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-400">Setup options are not available for {room.status} events.</p>
        </div>
      )}
    </div>
  );
}