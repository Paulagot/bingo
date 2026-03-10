// src/components/Quiz/utils/prizeWorkflow.ts
import type { QuizConfig } from '../types/quiz';

type PrizeAward = { place?: number; status?: string };
type Prize = { place?: number };

export function getPrizeWorkflowStatus(config?: Partial<QuizConfig> | null) {
  const awards = ((config as any)?.reconciliation?.prizeAwards || []) as PrizeAward[];
  const prizes = ((config as any)?.prizes || []) as Prize[];

  const prizePlaces = new Set(
    prizes
      .map((p) => p.place)
      .filter((x): x is number => typeof x === 'number')
  );

  const finalStatuses = new Set(['collected', 'delivered', 'unclaimed', 'refused', 'canceled']);

  const declaredByPlace = new Map<number, PrizeAward>();
  for (const a of awards) {
    if (typeof a?.place === 'number') declaredByPlace.set(a.place, a);
  }

const hasPrizes = prizePlaces.size > 0;

const allDeclared =
  !hasPrizes || [...prizePlaces].every((pl) => declaredByPlace.has(pl));

const allResolved =
  !hasPrizes || [...prizePlaces].every((pl) => finalStatuses.has(String(declaredByPlace.get(pl)?.status || '')));

const prizeWorkflowComplete = allDeclared && allResolved;

  return {
    prizeWorkflowComplete,
    prizePlaces,
    awards,
    declaredByPlace,
    finalStatuses,
    allDeclared,
    allResolved,
  };
}

