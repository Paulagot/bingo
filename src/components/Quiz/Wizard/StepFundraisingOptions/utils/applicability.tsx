/**
 * Applicability Utilities
 */

import React from 'react';
import { Globe, Target } from 'lucide-react';
import type { FundraisingExtraDefinition } from '@/components/Quiz/constants/quizMetadata';
import { roundTypeDefinitions } from '@/components/Quiz/constants/quizMetadata';

export interface ApplicabilityInfo {
  text: string;
  icon: React.ReactNode;
  color: string;
}

/**
 * Get applicability information for a fundraising extra
 */
export function getApplicabilityInfo(rule: FundraisingExtraDefinition): ApplicabilityInfo {
  if (rule.applicableTo === 'global') {
    return { text: 'All Rounds', icon: <Globe className="h-3 w-3" />, color: 'text-purple-700 bg-purple-100' };
  }
  const roundTypeNames = (rule.applicableTo as string[])
    .map((type) => roundTypeDefinitions[type as keyof typeof roundTypeDefinitions]?.name || type)
    .join(', ');
  return { text: roundTypeNames, icon: <Target className="h-3 w-3" />, color: 'text-blue-700 bg-blue-100' };
}

