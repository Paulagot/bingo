import { useEffect, useState } from 'react';
import type { ActiveRound, RoundResult } from './types/elimination';
import { getRoundColour } from './utils/designTokens';
import { formatScore, roundTypeLabel } from './utils/eliminationHelpers';

interface Props {
  activeRound: ActiveRound | null;
  results: RoundResult[];
  players: any[];
  onContinue: () => void;
  autoAdvanceMs?: number;
}

export const EliminationHostReveal: React.FC<Props> = ({
  activeRound, results, players, onContinue, autoAdvanceMs = 10000,
}) => {
  const [countdown, setCountdown] = useState(Math.ceil(autoAdvanceMs / 1000));
  const [visible, setVisible] = useState(false);

  const roundNumber = activeRound?.roundNumber ?? 0;
  const rc = getRoundColour(roundNumber);
  const playerMap = Object.fromEntries(players.map((p: any) => [p.playerId, p]));

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); onContinue(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onContinue]);

  // Get the correct answer description based on round type
  const getCorrectAnswer = (reveal: any): string => {
    if (!reveal) return '—';
    switch (reveal.roundType) {
      case 'true_centre': return `Centre: (${(reveal.trueCentre?.x * 100).toFixed(0)}%, ${(reveal.trueCentre?.y * 100).toFixed(0)}%)`;
      case 'midpoint_split': return `Midpoint: (${(reveal.actualMidpoint?.x * 100).toFixed(0)}%, ${(reveal.actualMidpoint?.y * 100).toFixed(0)}%)`;
      case 'stop_the_bar': return `Target: ${(reveal.targetPosition * 100).toFixed(1)}%`;
      case 'draw_angle': return `${reveal.targetAngle}°`;
      case 'quick_count': return `${reveal.actualCount} dots`;
      case 'flash_maths': return `= ${reveal.actualSum}`;
      case 'line_length': return `${(reveal.targetLength * 100).toFixed(0)}% length`;
      case 'balance_point': return `${(reveal.centreOfMass * 100).toFixed(1)}% along beam`;
      case 'flash_grid': return `${reveal.flashCells?.length} cells`;
      case 'pattern_align': return `At (${(reveal.targetX * 100).toFixed(0)}%, ${(reveal.targetY * 100).toFixed(0)}%) · ${reveal.targetRotation}°`;
      default: return '—';
    }
  };

  const getPlayerAnswer = (reveal: any): string => {
    if (!reveal) return 'No answer';
    switch (reveal.roundType) {
      case 'true_centre': return reveal.playerTap ? `(${(reveal.playerTap.x * 100).toFixed(0)}%, ${(reveal.playerTap.y * 100).toFixed(0)}%)` : '—';
      case 'midpoint_split': return reveal.playerMarker ? `(${(reveal.playerMarker.x * 100).toFixed(0)}%, ${(reveal.playerMarker.y * 100).toFixed(0)}%)` : '—';
      case 'stop_the_bar': return reveal.playerStopPosition != null ? `${(reveal.playerStopPosition * 100).toFixed(1)}%` : '—';
      case 'draw_angle': return reveal.playerAngle != null ? `${reveal.playerAngle}°` : '—';
      case 'quick_count': return reveal.playerGuess != null ? String(reveal.playerGuess) : '—';
      case 'flash_maths': return reveal.playerAnswer != null ? String(reveal.playerAnswer) : '—';
      case 'line_length': return reveal.playerLength != null ? `${(reveal.playerLength * 100).toFixed(0)}%` : '—';
      case 'balance_point': return reveal.playerX != null ? `${(reveal.playerX * 100).toFixed(1)}%` : '—';
      case 'flash_grid': return reveal.playerTaps ? `${reveal.playerTaps.length} tapped` : '—';
      case 'pattern_align': return reveal.playerX != null ? `(${(reveal.playerX * 100).toFixed(0)}%, ${(reveal.playerY * 100).toFixed(0)}%) · ${reveal.playerRotation?.toFixed(0)}°` : '—';
      default: return '—';
    }
  };

  const firstReveal = results.find(r => r.revealData)?.revealData;

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      background: `radial-gradient(ellipse at 50% 0%, ${rc.tint} 0%, #0a0b0f 55%)`,
      color: '#ffffff', padding: '0 0 24px',
      opacity: visible ? 1 : 0, transition: 'opacity 0.3s',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 12px' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontFamily: 'Inter', marginBottom: '4px' }}>
          Host View · Round {roundNumber} · {roundTypeLabel(activeRound?.roundType ?? '')}
        </div>
        <h2 style={{ fontSize: '28px', fontFamily: "'Bebas Neue', Impact, sans-serif", margin: 0, letterSpacing: '0.04em' }}>
          Answer Reveal
        </h2>
      </div>

      {/* Correct answer banner */}
      {firstReveal && (
        <div style={{
          margin: '0 20px 12px',
          padding: '12px 16px',
          borderRadius: '10px',
          background: `${rc.primary}15`,
          border: `1px solid ${rc.primary}40`,
        }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.15em', color: `${rc.primary}88`, fontFamily: 'Inter', textTransform: 'uppercase', marginBottom: '4px' }}>
            Correct Answer
          </div>
          <div style={{ fontSize: '18px', fontFamily: "'Bebas Neue', Impact, sans-serif", color: rc.primary, letterSpacing: '0.06em' }}>
            {getCorrectAnswer(firstReveal)}
          </div>
        </div>
      )}

      {/* All players results */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {results.map((r, i) => {
          const name = playerMap[r.playerId]?.name ?? '—';
          const answer = getPlayerAnswer(r.revealData);
          const errorPct = r.revealData?.errorDistance != null
            ? `${(r.revealData.errorDistance * 100).toFixed(1)}% off`
            : r.didSubmit ? '' : 'No answer';

          return (
            <div key={r.playerId} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 14px', borderRadius: '8px',
              background: i === 0 ? `${rc.primary}10` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${i === 0 ? rc.primary + '30' : 'rgba(255,255,255,0.06)'}`,
            }}>
              <span style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '18px', minWidth: '28px',
                color: i < 3 ? rc.primary : 'rgba(255,255,255,0.3)' }}>
                #{r.rank}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Inter', fontSize: '14px', fontWeight: 600 }}>{name}</div>
                <div style={{ fontFamily: 'Inter', fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>
                  {answer}{errorPct ? ` · ${errorPct}` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '20px',
                  color: r.didSubmit ? '#ffffff' : 'rgba(255,255,255,0.2)' }}>
                  {formatScore(r.score)}
                </div>
                {(r.speedBonus ?? 0) > 0 && (
                  <div style={{ fontFamily: 'Inter', fontSize: '10px', color: '#30d158' }}>+{r.speedBonus} speed</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <button onClick={onContinue} style={{
          width: '100%', padding: '14px', background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
          color: '#ffffff', fontSize: '14px', fontWeight: 600,
          fontFamily: 'Inter', cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase' as const,
        }}>
          See Scores
        </button>
        <div style={{ fontFamily: 'Inter', fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>
          Auto-advancing in <span style={{ color: countdown <= 5 ? '#ff3b5c' : 'rgba(255,255,255,0.5)' }}>{countdown}s</span>
        </div>
      </div>
    </div>
  );
};