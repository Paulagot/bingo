import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SqCard } from '../components/shared/SqFormPrimitives';
import { SqButton } from '../components/shared/SqButton';
import { SqLoadingState, SqErrorBanner } from '../components/shared/SqStateComponents';
import { SqBottomNav } from '../components/shared/SqBottomNav';
import { getNutritionContent, acknowledgeNutritionGuide, NutritionContent } from '../api/sqProgressApi';
import { useSummerQuestAuthGuard } from '../api/useSqAuthGuard';

// Spec section 8.8. Read-only. No food diary, no calorie/weight talk,
// no check-in required — the acknowledge button just unlocks Hydration
// Hero, it doesn't log what the child ate.

const FOODS_TO_LIMIT = ['Sugary or fizzy drinks', 'Sweets and chocolate', 'Crisps and processed snacks', 'Fast food', 'Energy drinks'];

const SECTIONS: { key: keyof NutritionContent; title: string; icon: string }[] = [
  { key: 'hydration', title: 'Hydration', icon: '💧' },
  { key: 'before_training', title: 'Before Training', icon: '🍌' },
  { key: 'after_training', title: 'After Training', icon: '🥪' },
  { key: 'everyday', title: 'Everyday Food Habits', icon: '🥗' },
  { key: 'parent_tip', title: 'Parent Tips', icon: '👋' },
];

export default function NutritionPage() {
  const navigate = useNavigate();
  const { handleApiError } = useSummerQuestAuthGuard('/summer-quest/player-login');
  const [data, setData] = useState<NutritionContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acknowledged, setAcknowledged] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await getNutritionContent());
    } catch (err) {
      if (!handleApiError(err)) setError('Couldn\u2019t load the nutrition guide.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAcknowledge() {
    try {
      await acknowledgeNutritionGuide();
      setAcknowledged(true);
    } catch (err) {
      handleApiError(err);
    }
  }

  return (
    <div className="sq-root sq-page-with-nav sq-nutrition-page">
      <header className="sq-nutrition-header">
        <button className="sq-log-back" onClick={() => navigate('/summer-quest/player/dashboard')}>← Back</button>
        <h1>Fuel &amp; Hydration Guide</h1>
        <p>Just for reading \u2014 no need to log anything.</p>
      </header>

      {loading && <SqLoadingState label="Loading the guide…" />}
      {error && <SqErrorBanner message={error} onRetry={load} />}

      {data && (
        <>
          {SECTIONS.map((section) => {
            const tips = data[section.key];
            if (!tips || tips.length === 0) return null;
            return (
              <SqCard key={section.key} className="sq-nutrition-section">
                <h2><span>{section.icon}</span> {section.title}</h2>
                {tips.map((tip) => (
                  <div key={tip.id} className="sq-nutrition-tip-row">
                    <strong>{tip.title}</strong>
                    <p>{tip.body}</p>
                  </div>
                ))}
              </SqCard>
            );
          })}

          <SqCard className="sq-nutrition-section sq-nutrition-limit-card">
            <h2><span>🚫</span> Foods to Limit</h2>
            <ul>
              {FOODS_TO_LIMIT.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </SqCard>

          <SqButton fullWidth variant="secondary" disabled={acknowledged} onClick={handleAcknowledge}>
            {acknowledged ? 'Thanks for reading! 💧' : "I've read this"}
          </SqButton>
        </>
      )}

      <SqBottomNav />
    </div>
  );
}

export const SQ_NUTRITION_PAGE_CSS = `
.sq-nutrition-page { padding: 16px 16px 24px; max-width: 480px; margin: 0 auto; }
.sq-nutrition-header { margin-bottom: 16px; }
.sq-nutrition-header h1 { font-size: 22px; font-weight: 800; margin: 0; }
.sq-nutrition-header p { font-size: 13px; color: var(--sq-grey); margin: 4px 0 0; }

.sq-nutrition-section { margin-bottom: 14px; }
.sq-nutrition-section h2 { font-size: 16px; font-weight: 800; margin: 0 0 10px; display: flex; align-items: center; gap: 8px; }
.sq-nutrition-tip-row { margin-bottom: 10px; }
.sq-nutrition-tip-row:last-child { margin-bottom: 0; }
.sq-nutrition-tip-row strong { font-size: 14px; display: block; margin-bottom: 2px; }
.sq-nutrition-tip-row p { font-size: 13px; color: var(--sq-grey); margin: 0; line-height: 1.4; }

.sq-nutrition-limit-card { background: var(--sq-cream); }
.sq-nutrition-limit-card ul { margin: 0; padding-left: 20px; font-size: 13px; color: var(--sq-charcoal); }
.sq-nutrition-limit-card li { margin-bottom: 4px; }
`;
