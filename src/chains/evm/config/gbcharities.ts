// src/chains/evm/config/gbcharities.ts

/** A charity the host can pick in the UI.
 *  id === The Giving Block orgId (stable key) for TGB charities.
 *  For direct-wallet charities fetched from the DB, id is 0 and
 *  direct === true. Never pass id to TGB when direct === true.
 */
export type Charity = {
  id: number;          // TGB orgId — only meaningful when direct !== true
  name: string;        // display name
  logoUrl?: string;
  blurb?: string;
  direct?: boolean;    // true = wallet stored in DB, no TGB org id
};

// NOTE: Fill this list once from TGB and commit to your repo.
export const CHARITIES: Charity[] = [
  { id: 1189134587, name: 'Identity Theft Resource Center', logoUrl: '' },
  { id: 1189132503, name: 'Clean International', logoUrl: '' },
  // add more TGB charities here...
];

// convenience lookups
export const getCharityById = (id?: number | null) =>
  CHARITIES.find(c => c.id === id);

export const getOrgIdByName = (name?: string | null) => {
  if (!name) return undefined;
  const norm = name.trim().toLowerCase();
  return CHARITIES.find(c => c.name.trim().toLowerCase() === norm)?.id;
};

export const searchCharities = (query: string, limit = 10) => {
  const q = query.trim().toLowerCase();
  if (!q) return CHARITIES.slice(0, limit);
  return CHARITIES.filter(c => c.name.toLowerCase().includes(q)).slice(0, limit);
};
