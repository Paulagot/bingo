import React, { useEffect, useState } from 'react';
import { SqButton } from './SqButton';

// Spec section 8.6: "Unlocked badges animate lightly or show confetti.
// Keep animations lightweight." This is intentionally simple — a few
// CSS-only emoji bursts, not a JS confetti library — so it stays fast
// on whatever phone a kid is using and doesn't add a dependency.

const ICON_MAP: Record<string, string> = {
  first_mission: '🚩', three_day_streak: '🔥', full_week_hero: '⭐', comeback_player: '↩️',
  ball_mastery_builder: '⚽', passing_pro: '🎯', speed_star: '⚡', keepy_uppy_queen: '✨',
  weak_foot_warrior: '👣', halfway_hero: '📋', skills_showcaser: '✨', summer_finisher: '🏆',
  team_player: '👥', hydration_hero: '💧',
};

const NAME_MAP: Record<string, string> = {
  first_mission: 'First Mission', three_day_streak: '3-Day Streak', full_week_hero: 'Full Week Hero',
  comeback_player: 'Comeback Player', ball_mastery_builder: 'Ball Mastery Builder', passing_pro: 'Passing Pro',
  speed_star: 'Speed Star', keepy_uppy_queen: 'Keepy-Uppy Queen', weak_foot_warrior: 'Weak Foot Warrior',
  halfway_hero: 'Halfway Hero', skills_showcaser: 'Skills Showcaser', summer_finisher: 'Summer Finisher',
  team_player: 'Team Player', hydration_hero: 'Hydration Hero',
};

interface BadgeUnlockModalProps {
  badgeKeys: string[];
  onClose: () => void;
}

export function BadgeUnlockModal({ badgeKeys, onClose }: BadgeUnlockModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Mount in next frame so the CSS transition actually plays instead
    // of starting in its end state.
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (badgeKeys.length === 0) return null;

  return (
    <div className={`sq-badge-modal-backdrop ${visible ? 'sq-badge-modal-visible' : ''}`} onClick={onClose}>
      <div className="sq-badge-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="sq-badge-modal-burst" aria-hidden="true">
          <span>🎉</span><span>⭐</span><span>🎉</span><span>⭐</span><span>🎉</span>
        </div>
        <h2>{badgeKeys.length === 1 ? 'New badge unlocked!' : `${badgeKeys.length} new badges unlocked!`}</h2>
        <div className="sq-badge-modal-list">
          {badgeKeys.map((key) => (
            <div key={key} className="sq-badge-modal-item">
              <span className="sq-badge-modal-icon">{ICON_MAP[key] || '🏅'}</span>
              <span className="sq-badge-modal-name">{NAME_MAP[key] || key}</span>
            </div>
          ))}
        </div>
        <SqButton fullWidth onClick={onClose}>Nice!</SqButton>
      </div>
    </div>
  );
}

export const SQ_BADGE_MODAL_CSS = `
.sq-badge-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(17, 17, 17, 0);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 100;
  transition: background 0.25s ease;
}
.sq-badge-modal-visible { background: rgba(17, 17, 17, 0.55); }

.sq-badge-modal-card {
  background: var(--sq-white);
  border-radius: 24px;
  padding: 28px 24px;
  max-width: 340px;
  width: 100%;
  text-align: center;
  position: relative;
  transform: scale(0.85) translateY(12px);
  opacity: 0;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
}
.sq-badge-modal-visible .sq-badge-modal-card { transform: scale(1) translateY(0); opacity: 1; }

.sq-badge-modal-burst {
  font-size: 22px;
  margin-bottom: 4px;
  display: flex;
  justify-content: center;
  gap: 6px;
}
.sq-badge-modal-burst span {
  animation: sq-badge-pop 0.5s ease backwards;
}
.sq-badge-modal-burst span:nth-child(1) { animation-delay: 0s; }
.sq-badge-modal-burst span:nth-child(2) { animation-delay: 0.05s; }
.sq-badge-modal-burst span:nth-child(3) { animation-delay: 0.1s; }
.sq-badge-modal-burst span:nth-child(4) { animation-delay: 0.15s; }
.sq-badge-modal-burst span:nth-child(5) { animation-delay: 0.2s; }
@keyframes sq-badge-pop {
  0% { transform: scale(0) rotate(-20deg); opacity: 0; }
  60% { transform: scale(1.2) rotate(8deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}

.sq-badge-modal-card h2 { font-size: 19px; font-weight: 800; margin: 4px 0 16px; color: var(--sq-black); }

.sq-badge-modal-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.sq-badge-modal-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--sq-soft-orange);
  border-radius: 14px;
  padding: 10px 14px;
  text-align: left;
}
.sq-badge-modal-icon { font-size: 24px; }
.sq-badge-modal-name { font-weight: 800; font-size: 14px; color: var(--sq-black); }

@media (prefers-reduced-motion: reduce) {
  .sq-badge-modal-burst span { animation: none; }
  .sq-badge-modal-card { transition: opacity 0.15s ease; transform: none; }
}
`;
