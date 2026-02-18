import React, { useEffect, useMemo, useState } from 'react';
import { X, Loader2, CheckCircle2, Plus, Trash2, AlertTriangle } from 'lucide-react';
import {
  quizPersonalisedRoundsService,
  PersonalisedRound,
  PersonalisedQuestion,
  UpsertPersonalisedRoundPayload
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

const emptyQuestion = (): EditableQuestion => ({
  questionText: '',
  answers: ['', '', '', ''],
  correctIndex: 0,
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

  const [title, setTitle] = useState<string>('');
  const [position, setPosition] = useState<'first' | 'last'>('last');
  const [isEnabled, setIsEnabled] = useState(true);
  const [questions, setQuestions] = useState<EditableQuestion[]>([emptyQuestion()]);

  const canAddMore = questions.length < 6;

  useEffect(() => {
    if (isOpen && roomId) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, roomId]);

  const load = async () => {
    setLoading(true);
    setError(null);
    setDetails(null);

    try {
      const res = await quizPersonalisedRoundsService.getRound(roomId);
      const round = res.round;

      if (!round) {
        // default empty
        setTitle('');
        setPosition('last');
        setIsEnabled(true);
        setQuestions([emptyQuestion()]);
        return;
      }

      setTitle(round.title || '');
      setPosition(round.position);
      setIsEnabled(round.isEnabled);

      const mapped: EditableQuestion[] = (round.questions || []).map(q => ({
        id: q.id,
        questionText: q.questionText,
        answers: q.answers,
        correctIndex: q.correctIndex,
      }));

      setQuestions(mapped.length ? mapped : [emptyQuestion()]);

    } catch (e: any) {
      console.error('Failed to load personalised round:', e);
      setError(e.message || 'Failed to load personalised round');
    } finally {
      setLoading(false);
    }
  };

  const setQuestionField = (idx: number, patch: Partial<EditableQuestion>) => {
    setQuestions(prev => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const setAnswer = (qIdx: number, aIdx: 0 | 1 | 2 | 3, value: string) => {
    setQuestions(prev =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const nextAnswers = [...q.answers] as [string, string, string, string];
        nextAnswers[aIdx] = value;
        return { ...q, answers: nextAnswers };
      })
    );
  };

  const addQuestion = () => {
    if (!canAddMore) return;
    setQuestions(prev => [...prev, emptyQuestion()]);
  };

  const removeQuestion = (idx: number) => {
    setQuestions(prev => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length ? next : [emptyQuestion()];
    });
  };

  const clientValidate = (): { ok: boolean; msg?: string } => {
    if (!roomId) return { ok: false, msg: 'Missing roomId' };
    if (questions.length > 6) return { ok: false, msg: 'Max 6 questions allowed' };

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) return { ok: false, msg: `Question ${i + 1} text is required` };
      for (let j = 0; j < 4; j++) {
        if (!q.answers[j].trim()) return { ok: false, msg: `Question ${i + 1}: answer ${j + 1} is required` };
      }
    }
    return { ok: true };
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setDetails(null);

    const v = clientValidate();
    if (!v.ok) {
      setSaving(false);
      setError(v.msg || 'Please fix validation errors');
      return;
    }

    const payload: UpsertPersonalisedRoundPayload = {
      title: title.trim() ? title.trim() : null,
      position,
      isEnabled,
      questions: questions.map(q => ({
        id: q.id ?? null,
        questionText: q.questionText,
        answers: [...q.answers],
        correctIndex: q.correctIndex,
      })),
    };

    try {
      const res = await quizPersonalisedRoundsService.saveRound(roomId, payload);
      if (onSuccess) onSuccess(res.round);
      onClose();
    } catch (e: any) {
      console.error('Failed to save personalised round:', e);
      setError(e.message || 'Failed to save');
      if (Array.isArray(e.details)) setDetails(e.details);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    setDetails(null);

    try {
      await quizPersonalisedRoundsService.deleteRound(roomId);
      // Reset local state
      setTitle('');
      setPosition('last');
      setIsEnabled(true);
      setQuestions([emptyQuestion()]);
      onClose();
    } catch (e: any) {
      console.error('Failed to delete personalised round:', e);
      setError(e.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const summary = useMemo(() => {
    const filled = questions.filter(q => q.questionText.trim()).length;
    return { filled, total: questions.length };
  }, [questions]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Personalised Round
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Add up to 6 multiple-choice questions (4 answers, 1 correct).
                {roomTitle ? ` Quiz: ${roomTitle}` : ''}
              </p>
            </div>

            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <span className="ml-3 text-gray-600">Loading personalised round...</span>
            </div>
          )}

          {!loading && (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-red-800 font-medium">{error}</p>
                      {details?.length ? (
                        <ul className="mt-2 text-sm text-red-800 list-disc pl-5 space-y-1">
                          {details.map((d, idx) => <li key={idx}>{d}</li>)}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}

              {/* Round settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Round title (optional)
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Club Legends Round"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value === 'first' ? 'first' : 'last')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="first">First round</option>
                    <option value="last">Last round</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                Enabled for this quiz
              </label>

              {/* Questions */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Questions: <span className="font-semibold text-gray-900">{summary.total}</span> (filled {summary.filled})
                </div>

                <button
                  onClick={addQuestion}
                  disabled={!canAddMore}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                  Add question
                </button>
              </div>

              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="font-semibold text-gray-900">
                        Question {idx + 1}
                      </h4>
                      <button
                        onClick={() => removeQuestion(idx)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Remove question"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Question text
                      </label>
                      <textarea
                        value={q.questionText}
                        onChange={(e) => setQuestionField(idx, { questionText: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="Type your question..."
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {([0, 1, 2, 3] as const).map((aIdx) => (
                        <div key={aIdx} className="border border-gray-200 rounded-lg p-3">
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                            Answer {aIdx + 1}
                          </label>

                          <input
                            value={q.answers[aIdx]}
                            onChange={(e) => setAnswer(idx, aIdx, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder={`Option ${aIdx + 1}`}
                          />

                          <label className="flex items-center gap-2 mt-2 text-sm text-gray-700">
                            <input
                              type="radio"
                              name={`correct_${idx}`}
                              checked={q.correctIndex === aIdx}
                              onChange={() => setQuestionField(idx, { correctIndex: aIdx })}
                              className="h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            Correct answer
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  This only saves the personalised content. Next step is linking it into your round engine
                  (injecting this round as first/last and loading questions from DB).
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-3">
          <button
            onClick={handleDelete}
            disabled={saving || deleting || loading}
            className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title="Delete personalised round for this quiz"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete
          </button>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={saving || deleting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={saving || deleting || loading}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};