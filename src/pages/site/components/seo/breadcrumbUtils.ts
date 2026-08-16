//src/pages/site/components/seo/breadcrumbUtils.ts

import type { BreadcrumbItem } from './SEO';

const segmentLabels: Record<string, string> = {
  features: 'Features',
  'event-formats': 'Event Formats',
  quiz: 'Quiz',

  pricing: 'Pricing',
 
  about: 'About',
  contact: 'Contact',
  'use-cases': 'Use cases',
  'sports-clubs': 'Sports clubs',
  'schools-ptas': 'Schools & PTAs',
  charities: 'Charities',
  'community-groups': 'Community groups',
  resources: 'Resources',
  blog: 'Blog',

  legal: 'Legal',
  privacy: 'Privacy policy',
  terms: 'Terms',
  cookies: 'Cookie policy',
  dashboard: 'Dashboard',
  'event-manager': 'Event Manager',

  ticketing: 'Ticketing',

  compliance: 'Compliance',
  elimination: 'Elimination game',
  'weekly-puzzle-challenge': 'Weekly Puzzle Challenge',
'puzzle-drop': 'Puzzle Drop',
'sponsored-events': 'Sponsored Events',
'peer-fundraising': 'Peer Fundraising',
'donations-widget': 'Donations Widget',
'ticketed-events': 'Ticketed Events',
'impact-reports': 'Impact Reports',
'ai-prize-finder': 'AI Prize Finder',
'financial-records': 'Payments and Reports',
};

export function breadcrumbsForPath(path: string, currentLabel?: string): BreadcrumbItem[] {
  if (path === '/') return [{ name: 'Home', item: '/' }];

  const segments = path.split('/').filter(Boolean);
  const crumbs: BreadcrumbItem[] = [{ name: 'Home', item: '/' }];
  let currentPath = '';

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;
    crumbs.push({
      name: isLast && currentLabel ? currentLabel : segmentLabels[segment] ?? titleCase(segment),
      item: currentPath,
    });
  });

  return crumbs;
}

function titleCase(value: string) {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
