import {
  randomBetween,
  errorToScore,
  clamp,
  lerp,
} from '../../utils/eliminationHelpers.js';
import { ROUND_TYPE, ROUND_DURATION, GAME_RULES } from '../../utils/eliminationConstants.js';

// ─── Template difficulty pools ────────────────────────────────────────────────
// Easy rounds get simple smooth curves. Hard rounds introduce zigzags,
// stepped bends and S-curves that are harder to memorise and trace precisely.
const TEMPLATE_POOLS = {
  easy:   ['curve'],
  medium: ['curve', 'zigzag'],
  hard:   ['curve', 'zigzag', 'stepped_bend', 'mirrored_s'],
};

const samplePolyline = (points, sampleCount) => {
  if (!Array.isArray(points) || points.length === 0) return [];
  if (points.length === 1) return Array.from({ length: sampleCount }, () => ({ ...points[0] }));

  const segmentLengths = [];
  let totalLength = 0;

  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    segmentLengths.push(len);
    totalLength += len;
  }

  if (totalLength <= 0) {
    return Array.from({ length: sampleCount }, () => ({ ...points[0] }));
  }

  const result = [];
  for (let s = 0; s < sampleCount; s += 1) {
    const targetDistance = (s / Math.max(sampleCount - 1, 1)) * totalLength;
    let walked = 0;
    let found = false;

    for (let i = 1; i < points.length; i += 1) {
      const segLen = segmentLengths[i - 1];
      if (walked + segLen >= targetDistance) {
        const localT = segLen <= 0 ? 0 : (targetDistance - walked) / segLen;
        result.push({
          x: points[i - 1].x + (points[i].x - points[i - 1].x) * localT,
          y: points[i - 1].y + (points[i].y - points[i - 1].y) * localT,
        });
        found = true;
        break;
      }
      walked += segLen;
    }

    if (!found) result.push({ ...points[points.length - 1] });
  }

  return result;
};

const buildTemplatePath = (template, orientation, scale, origin) => {
  const templates = {
    curve: [
      { x: 0.0, y: 0.1 },
      { x: 0.2, y: 0.25 },
      { x: 0.45, y: 0.4 },
      { x: 0.7, y: 0.62 },
      { x: 1.0, y: 0.82 },
    ],
    zigzag: [
      { x: 0.0, y: 0.25 },
      { x: 0.2, y: 0.7 },
      { x: 0.4, y: 0.22 },
      { x: 0.65, y: 0.72 },
      { x: 1.0, y: 0.3 },
    ],
    stepped_bend: [
      { x: 0.0, y: 0.2 },
      { x: 0.26, y: 0.2 },
      { x: 0.26, y: 0.52 },
      { x: 0.66, y: 0.52 },
      { x: 0.66, y: 0.82 },
      { x: 1.0, y: 0.82 },
    ],
    mirrored_s: [
      { x: 0.0, y: 0.25 },
      { x: 0.18, y: 0.08 },
      { x: 0.42, y: 0.44 },
      { x: 0.62, y: 0.8 },
      { x: 0.82, y: 0.5 },
      { x: 1.0, y: 0.28 },
    ],
  };

  const base = templates[template] ?? templates.curve;

  return base.map((point) => {
    const rx = point.x - 0.5;
    const ry = point.y - 0.5;
    const cos = Math.cos(orientation);
    const sin = Math.sin(orientation);
    const x = (rx * cos) - (ry * sin);
    const y = (rx * sin) + (ry * cos);
    return {
      x: clamp(origin.x + x * scale, 0.06, 0.94),
      y: clamp(origin.y + y * scale, 0.06, 0.94),
    };
  });
};

export const generateRoundConfig = ({ difficulty = 1, totalRounds } = {}) => {
  const safeTotalRounds = totalRounds ?? GAME_RULES.TOTAL_ROUNDS;
  const maxDifficulty = 1 + (safeTotalRounds - 1) * 0.15;
  const t = Math.min(1, Math.max(0, (difficulty - 1) / (maxDifficulty - 1)));

  // Template pool scales with difficulty — easy rounds only get smooth curves,
  // hard rounds introduce zigzags and S-curves that are harder to memorise.
  const templatePool = t < 0.33
    ? TEMPLATE_POOLS.easy
    : t < 0.66
      ? TEMPLATE_POOLS.medium
      : TEMPLATE_POOLS.hard;

  const template = templatePool[Math.floor(randomBetween(0, templatePool.length))] ?? 'curve';

  // Preview time: more time at low difficulty to memorise the path
  const previewDurationMs = Math.round(lerp(4500, 2000, t));

  // Lane width: wider at low difficulty = more forgiving trace
  const laneWidth = lerp(0.13, 0.07, t);

  // Path scale: larger at low difficulty so the path is easier to see and trace.
  // Round 1 fills ~72% of the arena. Round 8 fills ~52% — still substantial
  // but combined with narrower lane, less preview time and harder shapes.
  const scale = lerp(0.72, 0.52, t);

  // Origin margin: keep origin closer to centre at high scale so the large
  // path doesn't get clipped by the arena edges.
  const originMargin = lerp(0.18, 0.28, t);
  const origin = {
    x: randomBetween(originMargin, 1 - originMargin),
    y: randomBetween(originMargin, 1 - originMargin),
  };

  const orientation = randomBetween(-Math.PI * 0.28, Math.PI * 0.28);
  const pathPoints = buildTemplatePath(template, orientation, scale, origin);

  return {
    roundType: ROUND_TYPE.PATH_TRACE,
    durationMs: ROUND_DURATION[ROUND_TYPE.PATH_TRACE],
    previewDurationMs,
    laneWidth,
    template,
    pathPoints,
    startAnchor: pathPoints[0],
    finishAnchor: pathPoints[pathPoints.length - 1],
    scoringSampleCount: 32,
    maxPointCount: 180,
  };
};

export const validateSubmission = (submission, config) => {
  if (!submission) return { valid: false, error: 'No submission provided' };
  if (submission.roundType !== ROUND_TYPE.PATH_TRACE) {
    return { valid: false, error: 'Round type mismatch' };
  }
  if (!Array.isArray(submission.points)) {
    return { valid: false, error: 'Missing points array' };
  }
  if (submission.points.length < 2) {
    return { valid: false, error: 'Trace too short' };
  }
  if (submission.points.length > (config.maxPointCount ?? 180)) {
    return { valid: false, error: 'Trace too long' };
  }
  for (const point of submission.points) {
    if (
      typeof point?.x !== 'number' ||
      typeof point?.y !== 'number' ||
      point.x < 0 || point.x > 1 ||
      point.y < 0 || point.y > 1
    ) {
      return { valid: false, error: 'Invalid trace point' };
    }
  }
  return { valid: true };
};

export const scoreSubmission = (submission, config) => {
  const sampleCount = config.scoringSampleCount ?? 32;
  const ideal = samplePolyline(config.pathPoints, sampleCount);
  const actual = samplePolyline(submission.points, sampleCount);

  if (ideal.length === 0 || actual.length === 0) {
    return {
      score: 0,
      precisionScore: 0,
      speedBonus: 0,
      errorDistance: 1,
      completionRatio: 0,
      averageDeviation: 1,
    };
  }

  // Average deviation: how far the player's trace was from the ideal path
  let totalDeviation = 0;
  for (let i = 0; i < sampleCount; i += 1) {
    const dx = actual[i].x - ideal[i].x;
    const dy = actual[i].y - ideal[i].y;
    totalDeviation += Math.sqrt(dx * dx + dy * dy);
  }
  const averageDeviation = totalDeviation / sampleCount;

  // Completion: measured by how close the player's last point is to the
  // finish anchor — not by point count. This is robust to the throttling
  // that caps point density, and rewards players who traced to the end.
  // Within 30% of arena from finish = full completion. Further = partial.
  const lastPoint = submission.points[submission.points.length - 1];
  const finishAnchor = config.pathPoints[config.pathPoints.length - 1];
  const completionRatio = (lastPoint && finishAnchor)
    ? clamp(1 - (Math.sqrt(
        (lastPoint.x - finishAnchor.x) ** 2 +
        (lastPoint.y - finishAnchor.y) ** 2,
      ) / 0.3), 0, 1)
    : 0;

  const completionPenalty = 1 - completionRatio;

  // errorDistance: 80% deviation quality, 20% completion
  const errorDistance = clamp(
    (averageDeviation / Math.max(config.laneWidth, 0.0001)) * 0.8 + completionPenalty * 0.2,
    0,
    1,
  );

  const precisionScore = errorToScore(errorDistance, 1);

  // Speed bonus: small reward for tracing the full path with high accuracy
  const speedBonus = completionRatio >= 0.55 && errorDistance < 0.15
    ? Math.round((1 - errorDistance / 0.15) * 60)
    : 0;

  return {
    score: precisionScore + speedBonus,
    precisionScore,
    speedBonus,
    errorDistance,
    averageDeviation,
    completionRatio,
  };
};

export const formatRevealData = (submission, config, scoringResult) => ({
  roundType: ROUND_TYPE.PATH_TRACE,
  pathPoints: config.pathPoints,
  playerPoints: submission.points,
  laneWidth: config.laneWidth,
  completionRatio: scoringResult.completionRatio,
  averageDeviation: scoringResult.averageDeviation,
  errorDistance: scoringResult.errorDistance,
  score: scoringResult.score,
});