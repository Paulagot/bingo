// src/chains/evm/config/gbcharities.ts

/** A charity the host can pick in the UI.
 *  id === The Giving Block orgId (stable key)
 */
export type Charity = {
  id: number;          // TGB orgId (stable key)
  name: string;          // display name
  logoUrl?: string;      // optional, improves UI if you have it
  blurb?: string;        // optional small description for UI
};

// NOTE: Fill this list once from TGB and commit to your repo.
// You can keep ~20 entries for your allowlist.
export const CHARITIES: Charity[] = [
  { id: 12345, name: 'Bright Horizons Foundation', logoUrl: '' },  // no quotes
  { id: 67890, name: "Little Oaks Children's Fund", logoUrl: '' }, // no quotes
  { id: 11111, name: 'RiverAid Clean Water', logoUrl: '' },        // no quotes
];

// convenience lookups
export const getCharityById = (id?: number | null) =>
  CHARITIES.find(c => c.id === id);

export const getOrgIdByName = (name?: string | null) => {
  if (!name) return undefined;
  const norm = name.trim().toLowerCase();
  return CHARITIES.find(c => c.name.trim().toLowerCase() === norm)?.id;
};

// simple typeahead helper (case-insensitive substring match)
export const searchCharities = (query: string, limit = 10) => {
  const q = query.trim().toLowerCase();
  if (!q) return CHARITIES.slice(0, limit);
  return CHARITIES.filter(c => c.name.toLowerCase().includes(q)).slice(0, limit);
};
