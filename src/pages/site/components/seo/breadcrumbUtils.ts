import type { BreadcrumbItem } from './SEO';

const segmentLabels: Record<string, string> = {
  features: 'Features',
  'event-formats': 'Event Formats',
  quiz: 'Quiz',
  demo: 'Demo',
  pricing: 'Pricing',
  'how-it-works': 'How it works',
  about: 'About',
  contact: 'Contact',
  'use-cases': 'Use cases',
  'sports-clubs': 'Sports clubs',
  'schools-ptas': 'Schools & PTAs',
  charities: 'Charities',
  'community-groups': 'Community groups',
  resources: 'Resources',
  blog: 'Blog',
  'fundraising-ideas': 'Fundraising ideas',
  guides: 'Guides',
  legal: 'Legal',
  privacy: 'Privacy policy',
  terms: 'Terms',
  cookies: 'Cookie policy',
  dashboard: 'Dashboard',
  'event-manager': 'Event Manager',
  payments: 'Payments',
  ticketing: 'Ticketing',
  reports: 'Reports',
  compliance: 'Compliance',
  elimination: 'Elimination game',
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
