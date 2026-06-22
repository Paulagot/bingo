import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SqCard } from '../../components/shared/SqFormPrimitives';
import { SqButton } from '../../components/shared/SqButton';
import { SqLoadingState, SqErrorBanner } from '../../components/shared/SqStateComponents';
import { SqBottomNav } from '../../components/shared/SqBottomNav';
import { getTodayLog, getLogForDate, saveDailyLog, DailyLogFields } from '../../api/sqPlayerApi';
import { useSummerQuestAuthGuard } from '../../api/useSqAuthGuard';
import { BadgeUnlockModal } from '../../components/shared/BadgeUnlockModal';
import { SummerQuestApiError } from '../../api/sqApiClient';

// Spec section 8.2. Three variants by day type, decided client-side
// from today's actual weekday (the server also computes day_type on
// save, so this is just for which form to show — the source of truth
// for what day_type got stored is the server).

type DayType = 'training' | 'free_play' | 'rest';

function getDayTypeFor(date: Date): DayType {
  const day = date.getDay(); // 0 Sun, 6 Sat
  if (day === 0) return 'rest';
  if (day === 6) return 'free_play';
  return 'training';
}

function formatDateOnly(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getLastSevenDays(): { dateStr: string; label: string; isToday: boolean }[] {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      dateStr: formatDateOnly(d),
      label: i === 0 ? 'Today' : d.toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric' }),
      isToday: i === 0,
    });
  }
  return days;
}

const ACTIVITIES: { key: 'ballMastery' | 'passing' | 'speedWork' | 'juggling'; label: string; target: number; blurb: string; colour: string }[] = [
  { key: 'ballMastery', label: 'Ball Mastery', target: 15, blurb: 'Close control, turns and first touch.', colour: 'orange' },
  { key: 'passing', label: 'Passing', target: 15, blurb: 'Wall passes, weight and accuracy.', colour: 'blue' },
  { key: 'speedWork', label: 'Speed Work', target: 10, blurb: 'Sprint drills and agility.', colour: 'green' },
  { key: 'juggling', label: 'Juggling', target: 5, blurb: 'Keepy-uppy practice.', colour: 'purple' },
];

const FREE_PLAY_OPTIONS = ['Played a match', 'Played in the garden', 'Played at the park', 'Practised with family/friends', 'Other'];
const REST_OPTIONS = ['I rested', 'I stretched', 'I drank water', "I\u2019m ready for tomorrow"];
const FEELING_OPTIONS: { value: NonNullable<DailyLogFields['effortFeeling']>; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'good', label: 'Good' },
  { value: 'hard', label: 'Hard' },
  { value: 'tried_my_best', label: 'I tried my best' },
];

export default function LogTodayPage() {
  const navigate = useNavigate();
  const { handleApiError } = useSummerQuestAuthGuard('/summer-quest/player-login');

  const todayStr = formatDateOnly(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const dayType = getDayTypeFor(new Date(selectedDate + 'T00:00:00'));
  const isToday = selectedDate === todayStr;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [newBadges, setNewBadges] = useState<string[]>([]);

  const [doneMap, setDoneMap] = useState<Record<string, boolean>>({});
  const [minutesMap, setMinutesMap] = useState<Record<string, string>>({});
  const [feeling, setFeeling] = useState<DailyLogFields['effortFeeling']>(null);
  const [note, setNote] = useState('');
  const [freePlayType, setFreePlayType] = useState('');
  const [restTaps, setRestTaps] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const { log } = isToday ? await getTodayLog() : await getLogForDate(selectedDate);
        if (log) {
          const l = log as Record<string, unknown>;
          setDoneMap({
            ballMastery: Boolean(l.ball_mastery_done),
            passing: Boolean(l.passing_done),
            speedWork: Boolean(l.speed_work_done),
            juggling: Boolean(l.juggling_done),
          });
          setMinutesMap({
            ballMastery: l.ball_mastery_minutes ? String(l.ball_mastery_minutes) : '',
            passing: l.passing_minutes ? String(l.passing_minutes) : '',
            speedWork: l.speed_work_minutes ? String(l.speed_work_minutes) : '',
            juggling: l.juggling_minutes ? String(l.juggling_minutes) : '',
          });
          setFeeling((l.effort_feeling as DailyLogFields['effortFeeling']) || null);
          setNote((l.note as string) || '');
          setFreePlayType((l.free_play_type as string) || '');
        } else {
          // No log for this date yet — reset the form to blank rather
          // than leaving the previous date's values showing.
          setDoneMap({});
          setMinutesMap({});
          setFeeling(null);
          setNote('');
          setFreePlayType('');
          setRestTaps({});
        }
        setSavedMessage(null);
      } catch (err) {
        handleApiError(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedDate]);

  function toggleActivity(key: string) {
    setDoneMap((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleRestTap(option: string) {
    setRestTaps((prev) => ({ ...prev, [option]: !prev[option] }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSavedMessage(null);

    const fields: DailyLogFields = { effortFeeling: feeling, note: note || null };

    if (dayType === 'training') {
      for (const activity of ACTIVITIES) {
        const doneKey = `${activity.key}Done` as keyof DailyLogFields;
        const minutesKey = `${activity.key}Minutes` as keyof DailyLogFields;
        (fields as Record<string, unknown>)[doneKey] = Boolean(doneMap[activity.key]);
        const minutesValue = minutesMap[activity.key];
        (fields as Record<string, unknown>)[minutesKey] = minutesValue ? Number(minutesValue) : null;
      }
    } else if (dayType === 'free_play') {
      fields.freePlayType = freePlayType || null;
    } else {
      fields.restAcknowledged = Object.values(restTaps).some(Boolean);
    }

    try {
      const result = await saveDailyLog(fields, selectedDate);
      const badgeNames = result.newlyUnlockedBadges;
      if (badgeNames.length > 0) {
        setNewBadges(badgeNames);
        setSavedMessage(null);
      } else {
        setSavedMessage('Saved! Great work today.');
      }
    } catch (err) {
      if (err instanceof SummerQuestApiError && err.status === 400) {
        setError(err.message);
      } else if (!handleApiError(err)) {
        setError('Couldn\u2019t save right now. Your answers are still here \u2014 try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="sq-root sq-page-with-nav">
        <SqLoadingState label="Loading today…" />
        <SqBottomNav />
      </div>
    );
  }

  return (
    <div className="sq-root sq-page-with-nav sq-log-page">
      <header className="sq-log-header">
        <button className="sq-log-back" onClick={() => navigate('/summer-quest/player/dashboard')}>← Back</button>
        <h1>{dayType === 'rest' ? 'Rest Day' : dayType === 'free_play' ? 'Free Play / Match Day' : 'Did you train today?'}</h1>
      </header>

      <div className="sq-day-picker">
        {getLastSevenDays().map((d) => (
          <button
            key={d.dateStr}
            className={`sq-day-pill ${d.dateStr === selectedDate ? 'sq-day-pill-active' : ''}`}
            onClick={() => setSelectedDate(d.dateStr)}
          >
            {d.label}
          </button>
        ))}
      </div>
      {!isToday && (
        <p className="sq-past-day-note">
          You're filling in a past day. That's fine \u2014 just save it like normal.
        </p>
      )}

      {error && <SqErrorBanner message={error} />}
      {savedMessage && <div className="sq-saved-banner">{savedMessage}</div>}

      {dayType === 'training' && (
        <>
          {ACTIVITIES.map((activity) => (
            <SqCard
              key={activity.key}
              className={`sq-activity-card ${doneMap[activity.key] ? 'sq-activity-card-done' : ''}`}
              onClick={() => toggleActivity(activity.key)}
            >
              <div className="sq-activity-card-top">
                <div>
                  <h3>{activity.label}</h3>
                  <p>{activity.blurb}</p>
                </div>
                <div className={`sq-activity-toggle ${doneMap[activity.key] ? 'sq-activity-toggle-on' : ''}`}>
                  {doneMap[activity.key] ? '✓' : ''}
                </div>
              </div>
              <div className="sq-activity-minutes" onClick={(e) => e.stopPropagation()}>
                <label>Minutes (optional · target {activity.target} min)</label>
                <input
                  type="number"
                  min={0}
                  value={minutesMap[activity.key] || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setMinutesMap((prev) => ({ ...prev, [activity.key]: value }));
                    // Entering a real minutes value means the activity
                    // was actually done — auto-mark it rather than
                    // requiring a separate tap for the same fact. Only
                    // auto-mark on a positive number; clearing the
                    // field back to empty doesn't un-mark it (a player
                    // might clear a typo without meaning to undo the tick).
                    if (value && Number(value) > 0 && !doneMap[activity.key]) {
                      setDoneMap((prev) => ({ ...prev, [activity.key]: true }));
                    }
                  }}
                  placeholder="0"
                />
              </div>
            </SqCard>
          ))}

          <SqCard className="sq-feeling-card">
            <h3>How did it feel?</h3>
            <div className="sq-feeling-options">
              {FEELING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`sq-feeling-pill ${feeling === opt.value ? 'sq-feeling-pill-active' : ''}`}
                  onClick={() => setFeeling(opt.value)}
                  type="button"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </SqCard>
        </>
      )}

      {dayType === 'free_play' && (
        <SqCard className="sq-feeling-card">
          <h3>What did you do?</h3>
          <div className="sq-feeling-options">
            {FREE_PLAY_OPTIONS.map((opt) => (
              <button
                key={opt}
                className={`sq-feeling-pill ${freePlayType === opt ? 'sq-feeling-pill-active' : ''}`}
                onClick={() => setFreePlayType(opt)}
                type="button"
              >
                {opt}
              </button>
            ))}
          </div>
        </SqCard>
      )}

      {dayType === 'rest' && (
        <SqCard className="sq-feeling-card">
          <p className="sq-rest-copy">Rest counts too. Recharge for the next mission.</p>
          <div className="sq-feeling-options">
            {REST_OPTIONS.map((opt) => (
              <button
                key={opt}
                className={`sq-feeling-pill ${restTaps[opt] ? 'sq-feeling-pill-active' : ''}`}
                onClick={() => toggleRestTap(opt)}
                type="button"
              >
                {opt}
              </button>
            ))}
          </div>
        </SqCard>
      )}

      <SqCard className="sq-note-card">
        <label htmlFor="sq-day-note">What went well today? (optional)</label>
        <textarea
          id="sq-day-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Anything you want to remember about today…"
        />
      </SqCard>

      <div className="sq-save-bar">
        <SqButton fullWidth disabled={saving} onClick={handleSave}>
          {saving ? 'Saving…' : dayType === 'rest' ? 'Save Rest Day' : 'Save Today\u2019s Mission'}
        </SqButton>
      </div>

      <SqBottomNav />

      <BadgeUnlockModal
        badgeKeys={newBadges}
        onClose={() => {
          setNewBadges([]);
          setSavedMessage('Saved! Great work today.');
        }}
      />
    </div>
  );
}

export const SQ_LOG_PAGE_CSS = `
.sq-log-page { padding: 16px 16px 0; max-width: 480px; margin: 0 auto; }
.sq-log-header { margin-bottom: 16px; }
.sq-log-back { background: none; border: none; color: var(--sq-orange-dark); font-weight: 700; padding: 0; margin-bottom: 8px; cursor: pointer; font-size: 14px; }
.sq-log-header h1 { font-size: 20px; font-weight: 800; margin: 0; }

.sq-day-picker { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 12px; }
.sq-day-pill {
  flex-shrink: 0;
  border: 2px solid var(--sq-border);
  background: var(--sq-white);
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}
.sq-day-pill-active { background: var(--sq-orange); border-color: var(--sq-orange); color: var(--sq-white); }
.sq-past-day-note { font-size: 12px; color: var(--sq-orange-dark); font-weight: 700; margin: 0 0 12px; }

.sq-saved-banner {
  background: #E8F5E9;
  border: 1px solid var(--sq-green);
  color: #1B5E20;
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 16px;
}

.sq-activity-card { margin-bottom: 12px; cursor: pointer; }
.sq-activity-card-done { background: var(--sq-soft-orange); }
.sq-activity-card-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.sq-activity-card-top h3 { margin: 0; font-size: 16px; font-weight: 800; }
.sq-activity-card-top p { margin: 2px 0 0; font-size: 13px; color: var(--sq-grey); }
.sq-activity-toggle {
  width: 32px; height: 32px;
  border-radius: 50%;
  border: 2px solid var(--sq-border);
  display: flex; align-items: center; justify-content: center;
  font-weight: 800;
  flex-shrink: 0;
}
.sq-activity-toggle-on { background: var(--sq-orange); border-color: var(--sq-orange); color: var(--sq-white); }
.sq-activity-minutes { margin-top: 12px; }
.sq-activity-minutes label { font-size: 12px; font-weight: 700; color: var(--sq-grey); display: block; margin-bottom: 4px; }
.sq-activity-minutes input {
  width: 100%;
  border: 1px solid var(--sq-border);
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 14px;
  background: var(--sq-white);
}

.sq-feeling-card h3 { margin: 0 0 12px; font-size: 15px; font-weight: 800; }
.sq-feeling-options { display: flex; flex-wrap: wrap; gap: 8px; }
.sq-feeling-pill {
  border: 2px solid var(--sq-border);
  background: var(--sq-white);
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.sq-feeling-pill-active { background: var(--sq-orange); border-color: var(--sq-orange); color: var(--sq-white); }
.sq-rest-copy { font-size: 15px; font-weight: 700; color: var(--sq-black); margin: 0 0 14px; }

.sq-note-card { margin: 12px 0 0; }
.sq-note-card label { font-size: 13px; font-weight: 700; color: var(--sq-charcoal); display: block; margin-bottom: 8px; }
.sq-note-card textarea {
  width: 100%;
  border: 2px solid var(--sq-border);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
  background: var(--sq-cream);
  resize: vertical;
}

.sq-save-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 76px;
  padding: 0 16px;
  max-width: 480px;
  margin: 0 auto;
  z-index: 30;
}
/* Spacer so content scrolled above the fixed save bar isn't hidden behind it. */
.sq-log-page { padding-bottom: 90px; }
`;
