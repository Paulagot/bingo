// src/components/Quiz/Wizard/StepQuizTemplates.tsx
import React, { useMemo, useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Trophy,
  CheckCircle as CheckCircle2,
  X,
  Filter as FilterIcon,
} from 'lucide-react';

import { useQuizSetupStore } from '../hooks/useQuizSetupStore';
import type { RoundTypeId, RoundConfig } from '../types/quiz';
import { roundTypeDefaults, roundTypeMap } from '../constants/quiztypeconstants';
import ClearSetupButton from './ClearSetupButton';
import type { WizardStepProps } from './WizardStepProps';
import quizTemplates, { type QuizTemplate } from '../constants/templates';
import { quizApi } from '@shared/api';
import { fundraisingExtraDefinitions } from '../constants/quizMetadata';

// shadcn/ui Select
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../Wizard/select';

const Debug = false;

// ───────────────────────────────────────────────────────────────────────────────
// Extras helper
// ───────────────────────────────────────────────────────────────────────────────
function buildEnabledExtrasForRound(roundType: RoundTypeId) {
  const enabledExtras: Record<string, boolean> = {};
  for (const [extraId, def] of Object.entries(fundraisingExtraDefinitions)) {
    const applicable = Array.isArray(def.applicableTo) ? def.applicableTo : [];
    if (applicable.includes(roundType)) {
      enabledExtras[extraId] = false;
    }
  }
  return enabledExtras;
}

if (Debug) {
  const ids = quizTemplates.map((t) => t.id);
  console.log('[Templates] All template IDs from constants:', ids);
}

// ───────────────────────────────────────────────────────────────────────────────
// Duration model + breaks
// ───────────────────────────────────────────────────────────────────────────────
type RoundLite = { type: RoundTypeId; customConfig?: Partial<RoundConfig> };

function computeRoundMinutes(round: RoundLite): number {
  const defaults = roundTypeDefaults[round.type];
  const cfg: RoundConfig = { ...defaults, ...(round.customConfig ?? {}) };

  if (round.type === 'speed_round' && cfg.totalTimeSeconds) {
    const seconds = cfg.totalTimeSeconds * 4;
    return Math.round((seconds / 60) * 10) / 10;
  }

  if (round.type === 'hidden_object') {
    const puzzles = cfg.questionsPerRound || 0;
    const timePerPuzzle = cfg.hiddenObject?.timeLimitSeconds || 45;
    const seconds = puzzles * timePerPuzzle * 1.5;
    return Math.round((seconds / 60) * 10) / 10;
  }

  const q = cfg.questionsPerRound || 0;
  const t = cfg.timePerQuestion || 0;
  const seconds = q * t * 3;
  return Math.round((seconds / 60) * 10) / 10;
}

const BREAK_MINUTES = 15;

function getBreakPositionsByStrategy(
  rounds: QuizTemplate['rounds'],
  difficulty: QuizTemplate['difficulty'],
  tags: string[]
) {
  const len = rounds.length;
  const isFamilyOrYouth = tags.some((t) =>
    ['Audience: Family Friendly', 'Audience: Kids', 'Audience: Teens', 'Audience: Mixed'].includes(t)
  );

  if (isFamilyOrYouth && len >= 5 && len <= 6) return [Math.round(len / 2)];

  if (difficulty === 'Hard' || len >= 7) {
    const b: number[] = [];
    for (let i = 2; i < len; i += 2) b.push(i);
    return b;
  }

  const b: number[] = [];
  for (let i = 3; i < len; i += 3) b.push(i);
  return b;
}

function calculateDuration(
  rounds: QuizTemplate['rounds'],
  difficulty: QuizTemplate['difficulty'],
  tags: string[]
): number {
  const quizMinutes = rounds.reduce(
    (total, r) => total + computeRoundMinutes({ type: r.type, customConfig: r.customConfig }),
    0
  );
  const breakPositions = getBreakPositionsByStrategy(rounds, difficulty, tags);
  const breakMinutes = breakPositions.length * BREAK_MINUTES;
  return Math.round(quizMinutes + breakMinutes);
}

// ───────────────────────────────────────────────────────────────────────────────
// Duration bucket helpers
// ───────────────────────────────────────────────────────────────────────────────
// Buckets are computed from the live calculateDuration() value, not from tags.
// This means the filter always reflects reality, regardless of what the tag says.

type DurationBucket = 'Under 45 min' | '45–60 min' | '60–75 min' | '75–90 min' | '90 min+';

const DURATION_BUCKETS: DurationBucket[] = [
  'Under 45 min',
  '45–60 min',
  '60–75 min',
  '75–90 min',
  '90 min+',
];

function getDurationBucket(minutes: number): DurationBucket {
  if (minutes < 45) return 'Under 45 min';
  if (minutes < 60) return '45–60 min';
  if (minutes < 75) return '60–75 min';
  if (minutes < 90) return '75–90 min';
  return '90 min+';
}

// ───────────────────────────────────────────────────────────────────────────────
// Character bubble
// ───────────────────────────────────────────────────────────────────────────────
const Character = ({ message }: { message: string }) => {
  const getBubbleColor = (): string => {
    if (message.includes('Perfect!') || message.includes('🎉')) return 'bg-green-50 border-green-200';
    if (message.includes('Excellent!') || message.includes('choice!')) return 'bg-blue-50 border-blue-200';
    if (message.includes('ready') || message.includes('configured')) return 'bg-indigo-50 border-indigo-200';
    if (message.includes('build')) return 'bg-orange-50 border-orange-200';
    return 'bg-muted border-border';
  };

  return (
    <div className="mb-3 flex items-center gap-2 sm:mb-6 sm:gap-4">
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-muted sm:h-16 sm:w-16">
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-300">
          <span className="text-fg/60 text-xs font-medium sm:text-sm">IMG</span>
        </div>
      </div>
      <div className={`relative flex-1 rounded-lg border p-2 shadow-lg sm:rounded-2xl sm:p-4 ${getBubbleColor()}`}>
        <p className="text-fg/80 text-xs leading-tight sm:text-sm sm:leading-normal">{message}</p>
      </div>
    </div>
  );
};

// ───────────────────────────────────────────────────────────────────────────────
// Filters
// ───────────────────────────────────────────────────────────────────────────────
type FilterState = {
  audience: string;       // 'All' | any Audience tag value
  topic: string;          // 'All' | any Topic tag value
  difficulty: string;     // 'All' | 'Easy' | 'Medium' | 'Hard'
  duration: string;       // 'All' | DurationBucket
};

function parseTagValue(tag: string, prefix: string): string | null {
  if (!tag.startsWith(prefix)) return null;
  return tag.slice(prefix.length).trim();
}

// Collect filter options.
// Duration is derived from live calculateDuration() values, NOT from Duration: tags.
// We pass pre-computed durations in so this stays a pure function.
function collectFilterOptions(
  templates: QuizTemplate[],
  computedDurations: Map<string, number>
) {
  const audiences = new Set<string>();
  const topics = new Set<string>();
  const difficulties = new Set<string>();
  const durationBuckets = new Set<DurationBucket>();

  templates.forEach((t) => {
    difficulties.add(t.difficulty);

    t.tags.forEach((tag) => {
      const a = parseTagValue(tag, 'Audience: ');
      if (a) audiences.add(a);

      const tp = parseTagValue(tag, 'Topic: ');
      // Exclude 'Format: Online' appearing in topics — it's not a topic
      if (tp) topics.add(tp);

      // Intentionally ignore 'Duration: ...' tags — we use computed buckets instead
    });

    const mins = computedDurations.get(t.id);
    if (mins !== undefined) {
      durationBuckets.add(getDurationBucket(mins));
    }
  });

  // Sort duration buckets in the canonical order
  const sortedDurationBuckets = DURATION_BUCKETS.filter((b) => durationBuckets.has(b));

  return {
    audiences: ['All', ...Array.from(audiences).sort()],
    topics: ['All', ...Array.from(topics).sort()],
    difficulties: ['All', ...Array.from(difficulties).sort()],
    durations: ['All', ...sortedDurationBuckets],
  };
}

// ───────────────────────────────────────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────────────────────────────────────
const StepQuizTemplates: React.FC<WizardStepProps> = ({ onNext, onBack, onResetToFirst }) => {
  const { setupConfig, setTemplate, updateSetupConfig, flow } = useQuizSetupStore();

  const [ents, setEnts] = useState<any | null>(null);
  const [_entsLoaded, setEntsLoaded] = useState(false);

  useEffect(() => {
    quizApi
      .getEntitlements()
      .then((e) => setEnts(e))
      .catch(() => setEnts(null))
      .finally(() => setEntsLoaded(true));
  }, []);

  const isDevPlan =
    ents?.plan_id === 2 ||
    ents?.plan_id === '2' ||
    (typeof ents?.plan_code === 'string' && ents.plan_code.toUpperCase() === 'DEV');

  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    audience: 'All',
    topic: 'All',
    difficulty: 'All',
    duration: 'All',
  });

  const selectedTemplate = setupConfig.selectedTemplate ?? null;

  // Base list — hide demo for non-devs
  const baseTemplates = useMemo(() => {
    let list = [...quizTemplates];
    if (!isDevPlan) list = list.filter((t) => t.id !== 'demo-quiz');
    list.sort((a, b) => (a.id === 'demo-quiz' ? -1 : b.id === 'demo-quiz' ? 1 : 0));
    if (Debug) console.log('[Templates] isDevPlan:', isDevPlan, 'baseTemplates ids:', list.map((t) => t.id));
    return list;
  }, [isDevPlan]);

  // Pre-compute all durations once. Keyed by template id.
  // This is the single source of truth for duration values across filtering AND display.
  const computedDurations = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of baseTemplates) {
      map.set(t.id, calculateDuration(t.rounds, t.difficulty, t.tags));
    }
    return map;
  }, [baseTemplates]);

  const filterOptions = useMemo(
    () => collectFilterOptions(baseTemplates, computedDurations),
    [baseTemplates, computedDurations]
  );

  const anyFilterActive =
    filters.audience !== 'All' ||
    filters.topic !== 'All' ||
    filters.difficulty !== 'All' ||
    filters.duration !== 'All';

  const filteredTemplates = useMemo(() => {
    const list = baseTemplates.filter((t) => {
      const hasAudience =
        filters.audience === 'All' || t.tags.some((tag) => tag === `Audience: ${filters.audience}`);

      const hasTopic =
        filters.topic === 'All' || t.tags.some((tag) => tag === `Topic: ${filters.topic}`);

      const hasDifficulty =
        filters.difficulty === 'All' || t.difficulty === filters.difficulty;

      // Duration: compare the computed bucket, not the tag string
      const hasDuration =
        filters.duration === 'All' ||
        getDurationBucket(computedDurations.get(t.id) ?? 0) === filters.duration;

      return hasAudience && hasTopic && hasDifficulty && hasDuration;
    });

    if (Debug) {
      console.log('[Templates] anyFilterActive:', anyFilterActive);
      console.log('[Templates] filteredTemplates ids:', list.map((t) => t.id));
    }

    return list;
  }, [filters, baseTemplates, computedDurations, anyFilterActive]);

  const totalAvailable = baseTemplates.length;
  const shownCount = filteredTemplates.length;

  const getRoundTypeInfo = (type: RoundTypeId, customConfig?: Partial<RoundConfig>) => {
    const roundType = roundTypeMap[type];
    const icon =
      type === 'general_trivia' ? '🧠'
      : type === 'wipeout'      ? '💀'
      : type === 'speed_round'  ? '⚡'
      : type === 'hidden_object'? '🔎'
      : type === 'order_image'  ? '🔢'
      : '❓';

    if (roundType) {
      const time = computeRoundMinutes({ type, customConfig });
      const defaults = roundTypeDefaults[type];
      const cfg = { ...defaults, ...(customConfig ?? {}) };
      const questionsCount =
        type === 'speed_round' ? undefined : (cfg.questionsPerRound ?? 6);

      return {
        icon,
        name: roundType.name,
        time: Math.round(time * 10) / 10,
        questionsCount,
        timed: type === 'speed_round' ? (cfg.totalTimeSeconds ?? 0) : undefined,
      };
    }
    return {
      icon: '❓',
      name: 'Unknown',
      time: 10,
      questionsCount: 6 as number | undefined,
      timed: undefined,
    };
  };

  const handleTemplateSelect = (templateId: string) => {
    if (templateId === 'demo-quiz' && !isDevPlan) {
      console.warn('[Templates] Blocked non-dev from selecting demo-quiz');
      return;
    }

    setTemplate(templateId);

    const template = baseTemplates.find((t) => t.id === templateId);
    if (!template) return;

    const roundDefinitions = template.rounds.map((round, index) => {
      const defaults = roundTypeDefaults[round.type] ?? ({} as RoundConfig);
      const cfg = { ...defaults, ...(round.customConfig ?? {}) } as RoundConfig;

      return {
        roundNumber: index + 1,
        roundType: round.type,
        category: round.category,
        difficulty: round.difficulty,
        config: cfg,
        enabledExtras: buildEnabledExtrasForRound(round.type),
      };
    });

    updateSetupConfig({
      roundDefinitions,
      skipRoundConfiguration: templateId !== 'custom',
    });
  };

  const getDifficultyBadge = (difficulty: 'Easy' | 'Medium' | 'Hard') => {
    switch (difficulty) {
      case 'Easy':   return 'bg-green-100 text-green-800 border-green-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Hard':   return 'bg-red-100 text-red-800 border-red-200';
      default:       return 'bg-muted text-fg border-border';
    }
  };

  const getCurrentMessage = () => {
    if (!selectedTemplate) return 'Choose a ready-made quiz to get started quickly.';
    if (selectedTemplate === 'custom')
      return "Perfect! You'll be able to build your quiz exactly how you want it.";
    const template = baseTemplates.find((t) => t.id === selectedTemplate);
    return `Excellent choice! "${template?.name}" is ready to go. Just a few more steps!`;
  };

  const clearFilters = () => {
    setFilters({ audience: 'All', topic: 'All', difficulty: 'All', duration: 'All' });
  };

  return (
    <div className="w-full space-y-3 px-2 pb-4 sm:space-y-6 sm:px-4">
      {/* Header */}
      <div className="px-1">
        <h2 className="heading-2">Step 2 of 4: Select Quiz</h2>
        <div className="text-fg/70 mt-0.5 text-xs sm:text-sm">
          Browse all templates below, or use filters to narrow by audience and time.
        </div>
      </div>

      <Character message={getCurrentMessage()} />

      {/* Filters Card */}
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3 shadow-sm sm:p-4">
        <div className="mb-2 flex items-center gap-2">
          <FilterIcon className="h-4 w-4 text-indigo-700" />
          <div className="text-sm font-medium text-indigo-900">Filters</div>

          {anyFilterActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-4 sm:gap-4">
          <SelectField
            label="Audience"
            value={filters.audience}
            options={filterOptions.audiences}
            onChange={(v) => setFilters((f) => ({ ...f, audience: v }))}
            leftIcon="👥"
          />
          <SelectField
            label="Topic"
            value={filters.topic}
            options={filterOptions.topics}
            onChange={(v) => setFilters((f) => ({ ...f, topic: v }))}
            leftIcon="🏷️"
          />
          <SelectField
            label="Difficulty"
            value={filters.difficulty}
            options={filterOptions.difficulties}
            onChange={(v) => setFilters((f) => ({ ...f, difficulty: v }))}
            leftIcon="🎯"
          />
          {/* Duration: uses computed buckets — not raw Duration: tags */}
          <SelectField
            label="Duration"
            value={filters.duration}
            options={filterOptions.durations}
            onChange={(v) => setFilters((f) => ({ ...f, duration: v }))}
            leftIcon="⏱️"
          />
        </div>
      </div>

      {/* Showing X of Y */}
      <div className="flex items-center justify-between px-1">
        <div className="text-fg/70 text-xs sm:text-sm">
          Showing <span className="font-semibold text-fg">{shownCount}</span> of{' '}
          <span className="font-semibold text-fg">{totalAvailable}</span> templates
          {anyFilterActive && (
            <span className="ml-2 text-fg/60">
              {shownCount === 0 ? '(No matches — try clearing filters)' : '(Filtered)'}
            </span>
          )}
        </div>

        {anyFilterActive && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs sm:text-sm font-medium text-indigo-700 hover:text-indigo-900"
          >
            View all →
          </button>
        )}
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {filteredTemplates.map((template) => {
          // Use the pre-computed value — no recalculation per render
          const totalMinutes = computedDurations.get(template.id) ?? 0;
          const breakPositions = getBreakPositionsByStrategy(
            template.rounds,
            template.difficulty,
            template.tags
          );

          return (
            <div
              key={template.id}
              onClick={() => handleTemplateSelect(template.id)}
              className={`select-card ${selectedTemplate === template.id ? 'select-card--selected' : ''}`}
            >
              {selectedTemplate === template.id && (
                <div className="absolute right-2 top-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
              )}

              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 text-lg sm:h-12 sm:w-12 sm:text-xl">
                  {template.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-fg mb-1 text-sm font-semibold sm:text-base">{template.name}</h3>
                  <p className="text-fg/70 text-xs leading-tight sm:text-sm">{template.description}</p>
                </div>
              </div>

              <div className="mb-3 grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-indigo-600 sm:h-4 sm:w-4" />
                  <span className="text-fg/80 text-xs sm:text-sm">{totalMinutes}min</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Trophy className="h-3 w-3 text-purple-600 sm:h-4 sm:w-4" />
                  <span className="text-fg/80 text-xs sm:text-sm">{template.rounds.length} rounds</span>
                </div>
              </div>

              <div className="mb-3">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${getDifficultyBadge(
                    template.difficulty
                  )}`}
                >
                  {template.difficulty}
                </span>
              </div>

              {/* Tags — filter out Duration: tags since we show computed time above */}
              <div className="mb-3 flex flex-wrap gap-1">
                {template.tags
                  .filter((tag) => !tag.startsWith('Duration: '))
                  .slice(0, 3)
                  .map((tag) => (
                    <span key={tag} className="text-fg/80 rounded bg-muted px-2 py-0.5 text-xs">
                      {tag}
                    </span>
                  ))}
                {template.tags.filter((tag) => !tag.startsWith('Duration: ')).length > 3 && (
                  <span className="text-fg/80 rounded bg-muted px-2 py-0.5 text-xs">
                    +{template.tags.filter((tag) => !tag.startsWith('Duration: ')).length - 3} more
                  </span>
                )}
              </div>

              <TemplateStructure
                template={template}
                expandedTemplate={expandedTemplate}
                setExpandedTemplate={setExpandedTemplate}
                getRoundTypeInfo={getRoundTypeInfo}
                breakPositions={breakPositions}
                totalMinutes={totalMinutes}
              />
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {filteredTemplates.length === 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 sm:p-4">
          <div className="text-sm font-medium text-orange-900">No templates match your filters.</div>
          <div className="mt-1 text-xs text-orange-800 sm:text-sm">
            Try clearing one or more filters to see more options.
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-800 hover:bg-orange-100"
          >
            <X className="h-4 w-4" />
            Clear filters
          </button>
        </div>
      )}

      {/* Help */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 sm:p-4">
        <h4 className="mb-2 text-sm font-medium text-blue-900 sm:text-base">💡 Quick Guide</h4>
        <ul className="space-y-1 text-xs text-blue-800 sm:text-sm">
          <li>• You are browsing the full library — use filters to narrow it down.</li>
          <li>• Times include question time, reviews, leaderboards, and breaks.</li>
          <li>• Duration filter uses actual calculated times, not estimates.</li>
        </ul>
      </div>

      {/* Nav */}
      <div className="border-border flex justify-between border-t pt-4">
        <button onClick={onBack} className="btn-muted">
          <ChevronLeft className="h-4 w-4" />
          <span>Back</span>
        </button>

        <ClearSetupButton
          label="Start Over"
          variant="ghost"
          size="sm"
          keepIds={false}
          flow={flow ?? (setupConfig.paymentMethod === 'web3' ? 'web3' : 'web2')}
          onCleared={onResetToFirst}
        />

        <button
          onClick={onNext}
          disabled={!selectedTemplate}
          className="btn-primary sm:rounded-xl sm:px-6 sm:py-3 sm:text-base"
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// ───────────────────────────────────────────────────────────────────────────────
// TemplateStructure (unchanged except receives pre-computed totalMinutes)
// ───────────────────────────────────────────────────────────────────────────────
function TemplateStructure({
  template,
  expandedTemplate,
  setExpandedTemplate,
  getRoundTypeInfo,
  breakPositions,
  totalMinutes,
}: {
  template: QuizTemplate;
  expandedTemplate: string | null;
  setExpandedTemplate: (id: string | null) => void;
  getRoundTypeInfo: (
    type: RoundTypeId,
    customConfig?: Partial<RoundConfig>
  ) => {
    icon: string;
    name: string;
    time: number;
    questionsCount?: number;
    timed?: number;
  };
  breakPositions: number[];
  totalMinutes: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-fg/80 text-xs font-medium">Quiz Structure:</div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpandedTemplate(expandedTemplate === template.id ? null : template.id);
          }}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
        >
          {expandedTemplate === template.id ? 'Show Less' : 'View All Rounds'}
        </button>
      </div>

      {expandedTemplate === template.id ? (
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {template.rounds.map((round, index) => {
            const roundInfo = getRoundTypeInfo(round.type, round.customConfig);
            const showBreakAfter = breakPositions.includes(index + 1);

            return (
              <div key={index}>
                <div className="flex items-center gap-2 rounded bg-muted p-2 text-xs">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-indigo-100 text-xs font-bold text-indigo-700">
                    {index + 1}
                  </span>
                  <span className="text-lg">{roundInfo.icon}</span>
                  <div className="flex-1">
                    <div className="text-fg font-medium">{round.category}</div>
                    <div className="text-fg/70">
                      {roundInfo.name} • {round.difficulty}
                      {roundInfo.questionsCount ? ` • ${roundInfo.questionsCount}Q` : ''}
                      {` • ~${roundInfo.time}min`}
                    </div>
                  </div>
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                      round.difficulty === 'easy'
                        ? 'bg-green-100 text-green-800 border-green-200'
                        : round.difficulty === 'medium'
                        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                        : 'bg-red-100 text-red-800 border-red-200'
                    }`}
                  >
                    {round.difficulty}
                  </span>
                </div>

                {showBreakAfter && (
                  <div className="my-2 flex items-center gap-2 rounded border border-border bg-muted px-3 py-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded bg-orange-200">☕</div>
                    <span className="text-xs font-medium text-fg/80">15 minute break</span>
                    <span className="ml-auto text-xs text-fg/60">Rest & refresh</span>
                  </div>
                )}
              </div>
            );
          })}

          <div className="mt-3 rounded border border-border bg-muted p-2">
            <div className="mb-1 text-xs font-medium text-fg">Time Breakdown:</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-fg/80">Quiz time: </span>
                <span className="font-medium">
                  {Math.round(
                    template.rounds.reduce(
                      (total, round) =>
                        total + getRoundTypeInfo(round.type, round.customConfig).time,
                      0
                    )
                  )}
                  min
                </span>
              </div>
              <div>
                <span className="text-fg/80">Breaks: </span>
                <span className="font-medium">{breakPositions.length * 15}min</span>
              </div>
            </div>
            <div className="mt-1 border-t border-border pt-1 text-xs font-bold text-fg">
              Total: {totalMinutes} minutes
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {template.rounds.slice(0, 3).map((round, index) => {
            const roundInfo = getRoundTypeInfo(round.type, round.customConfig);
            return (
              <div key={index} className="flex items-center gap-2 text-xs">
                <span className="flex h-4 w-4 items-center justify-center rounded bg-muted text-xs font-medium">
                  {index + 1}
                </span>
                <span>{roundInfo.icon}</span>
                <span className="text-fg/70">
                  {round.category} ({round.difficulty})
                  {roundInfo.questionsCount ? ` • ${roundInfo.questionsCount}Q` : ''}
                </span>
              </div>
            );
          })}
          {template.rounds.length > 3 && (
            <div className="text-fg/60 pl-6 text-xs">
              +{template.rounds.length - 3} more rounds
              {breakPositions.length > 0 &&
                ` • ${breakPositions.length} break${breakPositions.length > 1 ? 's' : ''}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default StepQuizTemplates;

// ───────────────────────────────────────────────────────────────────────────────
// SelectField
// ───────────────────────────────────────────────────────────────────────────────
function SelectField({
  label,
  value,
  options,
  onChange,
  leftIcon,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  leftIcon?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-fg/70 uppercase tracking-wide">{label}</span>

      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full rounded-full border border-border bg-white pl-3 pr-8 py-2 text-sm text-fg shadow-sm focus:outline-none">
          <div className="flex w-full items-center gap-2">
            {leftIcon && <span className="text-fg/60">{leftIcon}</span>}
            <SelectValue placeholder="All" />
          </div>
        </SelectTrigger>

        <SelectContent className="z-50 max-h-64 overflow-y-auto rounded-xl border border-border bg-white p-1 shadow-2xl">
          {options.map((opt) => (
            <SelectItem
              key={opt}
              value={opt}
              className="
                cursor-pointer rounded-lg px-3 py-2 text-sm
                data-[state=checked]:bg-indigo-50 data-[state=checked]:text-indigo-800
                hover:bg-gray-50
                focus:bg-indigo-50 focus:text-indigo-800
                outline-none
              "
            >
              <div className="flex items-center gap-2">
                <span className="text-fg">{opt}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}






