// src/components/mgtsystem/modals/QuizPersonalisedRoundModal.tsx

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Loader2,
  CheckCircle2,
  Plus,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import {
  quizPersonalisedRoundsService,
  PersonalisedRound,
  UpsertPersonalisedRoundPayload,
} from '../../mgtsystem/services/QuizPersonalisedRoundsService';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomTitle?: string;
  onSuccess?: (round: PersonalisedRound) => void;
};

type EditableQuestion = {
  id?: number;
  questionText: string;
  answers: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
};

type RoundFormSnapshot = {
  title: string;
  position: 'first' | 'last';
  isEnabled: boolean;
  questions: EditableQuestion[];
};

const MAX_QUESTIONS = 6;

const emptyQuestion = (): EditableQuestion => ({
  questionText: '',
  answers: ['', '', '', ''],
  correctIndex: 0,
});

const createSnapshot = (
  title: string,
  position: 'first' | 'last',
  isEnabled: boolean,
  questions: EditableQuestion[]
): RoundFormSnapshot => ({
  title,
  position,
  isEnabled,
  questions: questions.map((q) => ({
    id: q.id,
    questionText: q.questionText,
    answers: [...q.answers] as [string, string, string, string],
    correctIndex: q.correctIndex,
  })),
});

const normaliseSnapshot = (snapshot: RoundFormSnapshot) =>
  JSON.stringify({
    title: snapshot.title.trim(),
    position: snapshot.position,
    isEnabled: snapshot.isEnabled,
    questions: snapshot.questions.map((q) => ({
      id: q.id ?? null,
      questionText: q.questionText.trim(),
      answers: q.answers.map((answer) => answer.trim()),
      correctIndex: q.correctIndex,
    })),
  });

export const PersonalisedRoundModal: React.FC<Props> = ({
  isOpen,
  onClose,
  roomId,
  roomTitle,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<string[] | null>(null);

  const [hasExistingRound, setHasExistingRound] = useState(false);
  const [title, setTitle] = useState<string>('');
  const [position, setPosition] = useState<'first' | 'last'>('last');
  const [isEnabled, setIsEnabled] = useState(true);
  const [questions, setQuestions] = useState<EditableQuestion[]>([emptyQuestion()]);

  const [originalSnapshot, setOriginalSnapshot] = useState<RoundFormSnapshot>(() =>
    createSnapshot('', 'last', true, [emptyQuestion()])
  );

  const [shouldScrollToEnd, setShouldScrollToEnd] = useState(false);
  const endOfQuestionsRef = useRef<HTMLDivElement | null>(null);

  const canAddMore = questions.length < MAX_QUESTIONS;

  const currentSnapshot = useMemo(
    () => createSnapshot(title, position, isEnabled, questions),
    [title, position, isEnabled, questions]
  );

  const hasUnsavedChanges = useMemo(() => {
    return normaliseSnapshot(currentSnapshot) !== normaliseSnapshot(originalSnapshot);
  }, [currentSnapshot, originalSnapshot]);

  const summary = useMemo(() => {
    const filled = questions.filter((q) => q.questionText.trim()).length;

    return {
      filled,
      total: questions.length,
      remaining: MAX_QUESTIONS - questions.length,
    };
  }, [questions]);

  useEffect(() => {
    if (isOpen && roomId) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, roomId]);

  useEffect(() => {
    if (!shouldScrollToEnd) return;

    const timeout = window.setTimeout(() => {
      endOfQuestionsRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      });

      setShouldScrollToEnd(false);
    }, 80);

    return () => window.clearTimeout(timeout);
  }, [questions.length, shouldScrollToEnd]);

  const resetToEmptyRound = () => {
    const emptyQuestions = [emptyQuestion()];

    setHasExistingRound(false);
    setTitle('');
    setPosition('last');
    setIsEnabled(true);
    setQuestions(emptyQuestions);
    setOriginalSnapshot(createSnapshot('', 'last', true, emptyQuestions));
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    setDetails(null);

    try {
      const res = await quizPersonalisedRoundsService.getRound(roomId);
      const round = res.round;

      if (!round) {
        resetToEmptyRound();
        return;
      }

      const mappedQuestions: EditableQuestion[] = (round.questions || []).map((q) => ({
        id: q.id,
        questionText: q.questionText,
        answers: q.answers,
        correctIndex: q.correctIndex,
      }));

      const nextTitle = round.title || '';
      const nextPosition = round.position;
      const nextEnabled = round.isEnabled;
      const nextQuestions = mappedQuestions.length ? mappedQuestions : [emptyQuestion()];

      setHasExistingRound(true);
      setTitle(nextTitle);
      setPosition(nextPosition);
      setIsEnabled(nextEnabled);
      setQuestions(nextQuestions);
      setOriginalSnapshot(
        createSnapshot(nextTitle, nextPosition, nextEnabled, nextQuestions)
      );
    } catch (e: any) {
      console.error('Failed to load personalised round:', e);
      setError(e.message || 'Failed to load personalised round');
    } finally {
      setLoading(false);
    }
  };

  const requestClose = () => {
    if (saving || deleting) return;

    if (hasUnsavedChanges) {
      const shouldClose = window.confirm(
        'You have unsaved personalised round changes. Close without saving?'
      );

      if (!shouldClose) return;
    }

    onClose();
  };

  const setQuestionField = (idx: number, patch: Partial<EditableQuestion>) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, ...patch } : q))
    );
  };

  const setAnswer = (qIdx: number, aIdx: 0 | 1 | 2 | 3, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;

        const nextAnswers = [...q.answers] as [string, string, string, string];
        nextAnswers[aIdx] = value;

        return {
          ...q,
          answers: nextAnswers,
        };
      })
    );
  };

  const removeQuestion = (idx: number) => {
    setQuestions((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length ? next : [emptyQuestion()];
    });
  };

  const clientValidate = (): { ok: boolean; msg?: string } => {
    if (!roomId) {
      return { ok: false, msg: 'Missing roomId' };
    }

    if (questions.length > MAX_QUESTIONS) {
      return { ok: false, msg: `Max ${MAX_QUESTIONS} questions allowed` };
    }

    for (const [questionIndex, question] of questions.entries()) {
      if (!question.questionText.trim()) {
        return {
          ok: false,
          msg: `Question ${questionIndex + 1} text is required`,
        };
      }

      for (const answerIndex of [0, 1, 2, 3] as const) {
        if (!question.answers[answerIndex].trim()) {
          return {
            ok: false,
            msg: `Question ${questionIndex + 1}: answer ${
              answerIndex + 1
            } is required`,
          };
        }
      }
    }

    return { ok: true };
  };

  const buildPayload = (): UpsertPersonalisedRoundPayload => ({
    title: title.trim() ? title.trim() : null,
    position,
    isEnabled,
    questions: questions.map((q) => ({
      id: q.id ?? null,
      questionText: q.questionText.trim(),
      answers: q.answers.map((answer) => answer.trim()) as [
        string,
        string,
        string,
        string
      ],
      correctIndex: q.correctIndex,
    })),
  });

  const saveRound = async (): Promise<PersonalisedRound> => {
    const validation = clientValidate();

    if (!validation.ok) {
      throw new Error(validation.msg || 'Please fix validation errors');
    }

    const payload = buildPayload();
    const res = await quizPersonalisedRoundsService.saveRound(roomId, payload);

    const savedQuestions: EditableQuestion[] = res.round.questions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      answers: q.answers,
      correctIndex: q.correctIndex,
    }));

    const nextTitle = res.round.title || '';
    const nextPosition = res.round.position;
    const nextEnabled = res.round.isEnabled;

    setHasExistingRound(true);
    setTitle(nextTitle);
    setPosition(nextPosition);
    setIsEnabled(nextEnabled);
    setQuestions(savedQuestions.length ? savedQuestions : [emptyQuestion()]);
    setOriginalSnapshot(
      createSnapshot(
        nextTitle,
        nextPosition,
        nextEnabled,
        savedQuestions.length ? savedQuestions : [emptyQuestion()]
      )
    );

    onSuccess?.(res.round);

    return res.round;
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setDetails(null);

    try {
      await saveRound();
      onClose();
    } catch (e: any) {
      console.error('Failed to save personalised round:', e);
      setError(e.message || 'Failed to save personalised round');

      if (Array.isArray(e.details)) {
        setDetails(e.details);
      }
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = async () => {
    if (!canAddMore || saving || deleting || loading) return;

    setSaving(true);
    setError(null);
    setDetails(null);

    try {
      const savedRound = await saveRound();

      const savedQuestions: EditableQuestion[] = savedRound.questions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        answers: q.answers,
        correctIndex: q.correctIndex,
      }));

      const nextQuestions = [...savedQuestions, emptyQuestion()];

      setQuestions(nextQuestions);
      setOriginalSnapshot(createSnapshot(title, position, isEnabled, nextQuestions));
      setShouldScrollToEnd(true);
    } catch (e: any) {
      console.error('Could not auto-save before adding question:', e);
      setError(
        e.message || 'Please complete the current question before adding another one.'
      );

      if (Array.isArray(e.details)) {
        setDetails(e.details);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!hasExistingRound) return;

    const confirmed = window.confirm(
      'Delete this personalised round? This will remove all personalised questions for this quiz.'
    );

    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    setDetails(null);

    try {
      await quizPersonalisedRoundsService.deleteRound(roomId);
      resetToEmptyRound();
      onClose();
    } catch (e: any) {
      console.error('Failed to delete personalised round:', e);
      setError(e.message || 'Failed to delete personalised round');
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={requestClose}
    >
      <div
        className="
          flex max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl
          sm:max-h-[92vh] sm:max-w-5xl sm:rounded-2xl
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-200 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                </div>

                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">
                    Personalised round
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Add up to {MAX_QUESTIONS} custom multiple-choice questions.
                    {roomTitle ? (
                      <>
                        {' '}
                        Quiz:{' '}
                        <span className="font-medium text-gray-700">
                          {roomTitle}
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={requestClose}
              disabled={saving || deleting}
              className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close personalised round modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {loading && (
            <div className="flex items-center justify-center py-14">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <span className="ml-3 text-sm text-gray-600">
                Loading personalised round...
              </span>
            </div>
          )}

          {!loading && (
            <div className="space-y-5">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />

                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900">{error}</p>

                      {details?.length ? (
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-800">
                          {details.map((detail, idx) => (
                            <li key={idx}>{detail}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-emerald-950">
                      This round can appear at the start or end of the quiz.
                    </p>
                    <p className="mt-1 text-sm text-emerald-800">
                      Each question needs 4 answers and 1 correct answer selected.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs font-medium">
                    <span className="rounded-full bg-white px-3 py-1 text-emerald-800 shadow-sm">
                      {summary.total}/{MAX_QUESTIONS} questions
                    </span>

                    <span className="rounded-full bg-white px-3 py-1 text-emerald-800 shadow-sm">
                      {summary.filled} filled
                    </span>

                    {hasUnsavedChanges && (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">
                        Unsaved changes
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Round settings */}
              <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-gray-900">
                    Round settings
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Name the round and choose where it appears in the quiz.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                  <div className="lg:col-span-7">
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Round title
                      <span className="font-normal text-gray-400"> optional</span>
                    </label>

                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Club Legends Round"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="lg:col-span-3">
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Position
                    </label>

                    <select
                      value={position}
                      onChange={(e) =>
                        setPosition(e.target.value === 'first' ? 'first' : 'last')
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="first">First round</option>
                      <option value="last">Last round</option>
                    </select>
                  </div>

                  <div className="flex items-end lg:col-span-2">
                    <label className="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => setIsEnabled(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      Enabled
                    </label>
                  </div>
                </div>
              </section>

              {/* Questions */}
              <section className="space-y-4">
                <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      Questions
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Fill in the current question, then use “Save & add question”
                      to create the next one.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addQuestion}
                    disabled={!canAddMore || saving || deleting || loading}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Save & add question
                  </button>
                </div>

                <div className="space-y-4">
                  {questions.map((question, questionIndex) => (
                    <div
                      key={question.id ?? `new-${questionIndex}`}
                      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            Question {questionIndex + 1}
                          </h4>
                          <p className="mt-1 text-sm text-gray-500">
                            Write the question, then mark the correct answer.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeQuestion(questionIndex)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          title="Remove question"
                          aria-label={`Remove question ${questionIndex + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-4">
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Question text
                        </label>

                        <textarea
                          value={question.questionText}
                          onChange={(e) =>
                            setQuestionField(questionIndex, {
                              questionText: e.target.value,
                            })
                          }
                          rows={2}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                          placeholder="Type your question..."
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                        {([0, 1, 2, 3] as const).map((answerIndex) => {
                          const isCorrect = question.correctIndex === answerIndex;

                          return (
                            <div
                              key={answerIndex}
                              className={`rounded-xl border p-3 transition-colors ${
                                isCorrect
                                  ? 'border-emerald-300 bg-emerald-50'
                                  : 'border-gray-200 bg-gray-50'
                              }`}
                            >
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                                  Answer {answerIndex + 1}
                                </label>

                                {isCorrect && (
                                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                                    Correct
                                  </span>
                                )}
                              </div>

                              <input
                                value={question.answers[answerIndex]}
                                onChange={(e) =>
                                  setAnswer(questionIndex, answerIndex, e.target.value)
                                }
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                                placeholder={`Option ${answerIndex + 1}`}
                              />

                              <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
                                <input
                                  type="radio"
                                  name={`correct_${questionIndex}`}
                                  checked={isCorrect}
                                  onChange={() =>
                                    setQuestionField(questionIndex, {
                                      correctIndex: answerIndex,
                                    })
                                  }
                                  className="h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                Mark as correct answer
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div ref={endOfQuestionsRef} />

                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
                  {canAddMore ? (
                    <>
                      <p className="text-sm font-medium text-gray-800">
                        Ready for the next question?
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        This will save your current questions first. You can add{' '}
                        {summary.remaining} more.
                      </p>

                      <button
                        type="button"
                        onClick={addQuestion}
                        disabled={!canAddMore || saving || deleting || loading}
                        className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        Save & add another question
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-800">
                        Maximum number of questions reached
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        This personalised round can include up to {MAX_QUESTIONS}{' '}
                        questions.
                      </p>
                    </>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-h-[2.5rem] items-center">
              {hasExistingRound ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving || deleting || loading}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Delete personalised round for this quiz"
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete round
                </button>
              ) : (
                <p className="text-sm text-gray-500">
                  This personalised round has not been saved yet.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-end">
              <button
                type="button"
                onClick={requestClose}
                disabled={saving || deleting}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || deleting || loading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Save round
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};