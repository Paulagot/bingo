export type EntityType = 'club' | 'school' | 'charity' | 'cause';

export const MAX_IMPACT_AREAS_PER_CAMPAIGN = 3 as const;

export const IMPACT_AREAS = [
  {
    id: 'community_inclusion',
    label: 'Community & Inclusion',
    description: 'Local community supports, inclusion, access, and belonging.',
    sdgGoals: [10, 11],
    entityTypes: ['club', 'school', 'charity', 'cause'],
    sortOrder: 10,
  },
  {
    id: 'children_youth',
    label: 'Children & Youth',
    description: 'Youth development, kids programmes, family supports.',
    sdgGoals: [3, 4],
    entityTypes: ['club', 'school', 'charity', 'cause'],
    sortOrder: 20,
  },
  {
    id: 'education_learning',
    label: 'Education & Learning',
    description: 'Learning resources, training, school supports, educational trips.',
    sdgGoals: [4],
    entityTypes: ['club', 'school', 'charity', 'cause'],
    sortOrder: 30,
  },
  {
    id: 'sport_health_wellbeing',
    label: 'Sport, Health & Wellbeing',
    description: 'Sport participation, mental health, wellbeing, disability sport.',
    sdgGoals: [3],
    entityTypes: ['club', 'school', 'charity', 'cause'],
    sortOrder: 40,
  },
  {
    id: 'health_medical_support',
    label: 'Health & Medical Support',
    description: 'Medical support, treatment-related costs, patient/family support.',
    sdgGoals: [3],
    entityTypes: ['club', 'school', 'charity', 'cause'],
    sortOrder: 50,
  },
  {
    id: 'poverty_basic_needs',
    label: 'Poverty & Basic Needs',
    description: 'Food, clothing, shelter, fuel poverty, essential supports.',
    sdgGoals: [1, 2],
    entityTypes: ['club', 'school', 'charity', 'cause'],
    sortOrder: 60,
  },
  {
    id: 'emergency_crisis_response',
    label: 'Emergency & Crisis Response',
    description: 'Urgent appeals, crisis response, emergency supports.',
    sdgGoals: [1, 3],
    entityTypes: ['club', 'school', 'charity', 'cause'],
    sortOrder: 70,
  },
  {
    id: 'environment_climate',
    label: 'Environment & Climate',
    description: 'Clean-ups, biodiversity, tree planting, climate action.',
    sdgGoals: [13, 15],
    entityTypes: ['club', 'school', 'charity', 'cause'],
    sortOrder: 80,
  },
  {
    id: 'volunteering_civic_action',
    label: 'Volunteering & Civic Action',
    description: 'Volunteer-led initiatives and civic participation.',
    sdgGoals: [16, 17],
    entityTypes: ['club', 'school', 'charity'],
    sortOrder: 90,
  },
  {
    id: 'arts_culture_heritage',
    label: 'Arts, Culture & Heritage',
    description: 'Arts programmes, culture, music/drama, heritage projects.',
    sdgGoals: [11],
    entityTypes: ['club', 'school', 'charity'],
    sortOrder: 100,
  },
  {
    id: 'equality_diversity_rights',
    label: 'Equality, Diversity & Rights',
    description: 'Equality and inclusion initiatives, disability supports, advocacy.',
    sdgGoals: [5, 10],
    entityTypes: ['club', 'school', 'charity'],
    sortOrder: 110,
  },
  {
    id: 'international_aid_development',
    label: 'International Aid & Development',
    description: 'Overseas aid, development projects, global partnerships.',
    sdgGoals: [1, 2, 17],
    entityTypes: ['club', 'school', 'charity', 'cause'],
    sortOrder: 120,
  },
  {
    id: 'personal_life_events',
    label: 'Personal Causes & Life Events',
    description: 'Peer-to-peer fundraising for personal situations and life events.',
    sdgGoals: [3],
    entityTypes: ['cause'],
    sortOrder: 130,
  },
] as const;

export type ImpactAreaId = typeof IMPACT_AREAS[number]['id'];

export type ImpactArea = {
  id: ImpactAreaId;
  label: string;
  description: string;
  sdgGoals: readonly number[];
  entityTypes: readonly EntityType[];
  sortOrder: number;
};

export const IMPACT_AREA_MAP = Object.fromEntries(
  IMPACT_AREAS.map(a => [a.id, a])
) as unknown as Record<ImpactAreaId, ImpactArea>;

export function isValidImpactAreaId(id: string): id is ImpactAreaId {
  return Object.prototype.hasOwnProperty.call(IMPACT_AREA_MAP, id);
}
