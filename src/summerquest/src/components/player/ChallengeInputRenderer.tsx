import React from 'react';
import { WeeklyChallengeConfig } from '../../config/weeklyChallenges';

// Spec section 8.4. Nine distinct input shapes for 12 weeks (a couple
// of weeks share a shape). Each renderer is a small controlled
// component; the page holds the actual form state and passes it down,
// so this file has no state of its own — just inputs and onChange.

export type ChallengeFormValue = Record<string, unknown>;

interface RendererProps {
  config: WeeklyChallengeConfig;
  value: ChallengeFormValue;
  onChange: (next: ChallengeFormValue) => void;
}

function NumberInput({ value, onChange, unit }: { value: ChallengeFormValue; onChange: (v: ChallengeFormValue) => void; unit?: string }) {
  return (
    <div className="sq-challenge-input-row">
      <input
        type="number"
        inputMode="numeric"
        value={(value.value as string) ?? ''}
        onChange={(e) => onChange({ ...value, value: e.target.value })}
        placeholder="0"
      />
      {unit && <span className="sq-challenge-unit">{unit}</span>}
    </div>
  );
}

function DecimalInput({ value, onChange, unit }: { value: ChallengeFormValue; onChange: (v: ChallengeFormValue) => void; unit?: string }) {
  return (
    <div className="sq-challenge-input-row">
      <input
        type="number"
        step="0.01"
        inputMode="decimal"
        value={(value.value as string) ?? ''}
        onChange={(e) => onChange({ ...value, value: e.target.value })}
        placeholder="0.00"
      />
      {unit && <span className="sq-challenge-unit">{unit}</span>}
    </div>
  );
}

function NumberOrTextInput({ value, onChange }: { value: ChallengeFormValue; onChange: (v: ChallengeFormValue) => void }) {
  return (
    <input
      type="text"
      value={(value.value as string) ?? ''}
      onChange={(e) => onChange({ ...value, value: e.target.value })}
      placeholder="e.g. 8/10 or 'mostly accurate'"
      className="sq-challenge-text-input"
    />
  );
}

function YesNoNoteInput({ value, onChange }: { value: ChallengeFormValue; onChange: (v: ChallengeFormValue) => void }) {
  const completed = Boolean(value.completed);
  return (
    <>
      <div className="sq-yesno-row">
        <button type="button" className={`sq-yesno-pill ${completed ? 'sq-yesno-pill-active' : ''}`} onClick={() => onChange({ ...value, completed: true })}>Yes</button>
        <button type="button" className={`sq-yesno-pill ${!completed && value.completed !== undefined ? 'sq-yesno-pill-active' : ''}`} onClick={() => onChange({ ...value, completed: false })}>Not yet</button>
      </div>
      <textarea
        className="sq-challenge-note-input"
        rows={2}
        value={(value.note as string) ?? ''}
        onChange={(e) => onChange({ ...value, note: e.target.value })}
        placeholder="Optional note…"
      />
    </>
  );
}

const ONE_V_ONE_OPTIONS = ['Parent', 'Sibling', 'Friend', 'Teammate', 'Other'];

function SelectNoteInput({ value, onChange }: { value: ChallengeFormValue; onChange: (v: ChallengeFormValue) => void }) {
  return (
    <>
      <div className="sq-feeling-options">
        {ONE_V_ONE_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`sq-feeling-pill ${value.selection === opt ? 'sq-feeling-pill-active' : ''}`}
            onClick={() => onChange({ ...value, selection: opt })}
          >
            {opt}
          </button>
        ))}
      </div>
      <textarea
        className="sq-challenge-note-input"
        rows={2}
        value={(value.note as string) ?? ''}
        onChange={(e) => onChange({ ...value, note: e.target.value })}
        placeholder="How did it go?"
      />
    </>
  );
}

const SKILL_OPTIONS = ['Passing', 'Dribbling', 'Scanning', 'Tackling', 'Shooting', 'Movement'];

function SkillFocusInput({ value, onChange }: { value: ChallengeFormValue; onChange: (v: ChallengeFormValue) => void }) {
  return (
    <>
      <div className="sq-feeling-options">
        {SKILL_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`sq-feeling-pill ${value.skill === opt ? 'sq-feeling-pill-active' : ''}`}
            onClick={() => onChange({ ...value, skill: opt })}
          >
            {opt}
          </button>
        ))}
      </div>
      <textarea
        className="sq-challenge-note-input"
        rows={2}
        value={(value.note as string) ?? ''}
        onChange={(e) => onChange({ ...value, note: e.target.value })}
        placeholder="How did the match go?"
      />
    </>
  );
}

function ThreeTextFieldsInput({ value, onChange }: { value: ChallengeFormValue; onChange: (v: ChallengeFormValue) => void }) {
  return (
    <div className="sq-three-fields">
      {['move1', 'move2', 'move3'].map((key, i) => (
        <input
          key={key}
          type="text"
          className="sq-challenge-text-input"
          value={(value[key] as string) ?? ''}
          onChange={(e) => onChange({ ...value, [key]: e.target.value })}
          placeholder={`Move ${i + 1}`}
        />
      ))}
    </div>
  );
}

const BENCHMARK_FIELDS: { key: string; label: string; unit: string }[] = [
  { key: 'sprint_10m', label: '10m sprint', unit: 'seconds' },
  { key: 'sprint_20m', label: '20m sprint', unit: 'seconds' },
  { key: 'sprint_40m', label: '40m sprint', unit: 'seconds' },
  { key: 'sprint_10m_with_ball', label: '10m sprint with ball', unit: 'seconds' },
  { key: 'cone_slalom', label: 'Cone slalom', unit: 'seconds' },
  { key: 'keepy_uppy', label: 'Keepy-uppy', unit: 'juggles' },
];

function BenchmarkSetInput({ value, onChange }: { value: ChallengeFormValue; onChange: (v: ChallengeFormValue) => void }) {
  const benchmarks = (value.benchmarks as Record<string, { value: string; unit: string }>) || {};

  function updateField(key: string, unit: string, val: string) {
    onChange({ ...value, benchmarks: { ...benchmarks, [key]: { value: val, unit } } });
  }

  return (
    <div className="sq-benchmark-grid">
      {BENCHMARK_FIELDS.map((field) => (
        <div key={field.key} className="sq-benchmark-field">
          <label>{field.label}</label>
          <div className="sq-challenge-input-row">
            <input
              type="number"
              step="0.01"
              value={benchmarks[field.key]?.value ?? ''}
              onChange={(e) => updateField(field.key, field.unit, e.target.value)}
              placeholder="0"
            />
            <span className="sq-challenge-unit">{field.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function FinalAssessmentInput({ value, onChange }: { value: ChallengeFormValue; onChange: (v: ChallengeFormValue) => void }) {
  return (
    <div className="sq-final-assessment">
      <label>Weeks completed out of 12</label>
      <input type="number" min={0} max={12} value={(value.weeksCompleted as string) ?? ''} onChange={(e) => onChange({ ...value, weeksCompleted: e.target.value })} />

      <label>Best keepy-uppy score</label>
      <input type="number" value={(value.bestKeepyUppy as string) ?? ''} onChange={(e) => onChange({ ...value, bestKeepyUppy: e.target.value })} />

      <div className="sq-yesno-row">
        <span>Did your 10m sprint improve?</span>
        <button type="button" className={`sq-yesno-pill ${value.sprint10Improved ? 'sq-yesno-pill-active' : ''}`} onClick={() => onChange({ ...value, sprint10Improved: !value.sprint10Improved })}>
          {value.sprint10Improved ? 'Yes' : 'Tap if yes'}
        </button>
      </div>
      <div className="sq-yesno-row">
        <span>Did your 20m sprint improve?</span>
        <button type="button" className={`sq-yesno-pill ${value.sprint20Improved ? 'sq-yesno-pill-active' : ''}`} onClick={() => onChange({ ...value, sprint20Improved: !value.sprint20Improved })}>
          {value.sprint20Improved ? 'Yes' : 'Tap if yes'}
        </button>
      </div>

      <label>What skill improved most?</label>
      <input type="text" className="sq-challenge-text-input" value={(value.skillImprovedMost as string) ?? ''} onChange={(e) => onChange({ ...value, skillImprovedMost: e.target.value })} />

      <label>What do you want to improve next?</label>
      <textarea rows={2} className="sq-challenge-note-input" value={(value.wantToImproveNext as string) ?? ''} onChange={(e) => onChange({ ...value, wantToImproveNext: e.target.value })} />

      <label>Did you enjoy the programme?</label>
      <div className="sq-feeling-options">
        {['Yes!', 'It was okay', 'Not really'].map((opt) => (
          <button key={opt} type="button" className={`sq-feeling-pill ${value.enjoyedProgramme === opt ? 'sq-feeling-pill-active' : ''}`} onClick={() => onChange({ ...value, enjoyedProgramme: opt })}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ChallengeInputRenderer({ config, value, onChange }: RendererProps) {
  switch (config.inputType) {
    case 'number':
      return <NumberInput value={value} onChange={onChange} unit={config.unit} />;
    case 'decimal':
      return <DecimalInput value={value} onChange={onChange} unit={config.unit} />;
    case 'number_or_text':
      return <NumberOrTextInput value={value} onChange={onChange} />;
    case 'yes_no_note':
      return <YesNoNoteInput value={value} onChange={onChange} />;
    case 'select_note':
      return <SelectNoteInput value={value} onChange={onChange} />;
    case 'skill_focus':
      return <SkillFocusInput value={value} onChange={onChange} />;
    case 'three_text_fields':
      return <ThreeTextFieldsInput value={value} onChange={onChange} />;
    case 'benchmark_set':
      return <BenchmarkSetInput value={value} onChange={onChange} />;
    case 'final_assessment':
      return <FinalAssessmentInput value={value} onChange={onChange} />;
    default:
      return <p>Unknown challenge type.</p>;
  }
}

export const SQ_CHALLENGE_INPUT_CSS = `
.sq-challenge-input-row { display: flex; align-items: center; gap: 8px; }
.sq-challenge-input-row input {
  flex: 1;
  border: 2px solid var(--sq-border);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 18px;
  font-weight: 700;
  background: var(--sq-cream);
}
.sq-challenge-unit { font-size: 13px; color: var(--sq-grey); font-weight: 700; }

.sq-challenge-text-input {
  width: 100%;
  border: 2px solid var(--sq-border);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 15px;
  background: var(--sq-cream);
  margin-bottom: 8px;
}
.sq-challenge-note-input {
  width: 100%;
  border: 2px solid var(--sq-border);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
  background: var(--sq-cream);
  margin-top: 10px;
  resize: vertical;
}

.sq-yesno-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.sq-yesno-pill {
  border: 2px solid var(--sq-border);
  background: var(--sq-white);
  border-radius: 999px;
  padding: 8px 16px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
}
.sq-yesno-pill-active { background: var(--sq-green); border-color: var(--sq-green); color: var(--sq-white); }

.sq-three-fields { display: flex; flex-direction: column; gap: 8px; }

.sq-benchmark-grid { display: flex; flex-direction: column; gap: 12px; }
.sq-benchmark-field label { font-size: 12px; font-weight: 700; color: var(--sq-grey); display: block; margin-bottom: 4px; }

.sq-final-assessment { display: flex; flex-direction: column; gap: 4px; }
.sq-final-assessment label { font-size: 12px; font-weight: 700; color: var(--sq-grey); margin-top: 10px; }
.sq-final-assessment input[type="text"], .sq-final-assessment input[type="number"] {
  border: 2px solid var(--sq-border);
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 14px;
  background: var(--sq-cream);
}
`;
