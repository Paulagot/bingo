// src/chains/evm/config/charities.ts
export type Charity = {
  id: string;              // stable key (slug)
  name: string;            // display
  wallet: `0x${string}`;   // EVM address
  blurb?: string;          // optional small description for UI
};

export const CHARITIES: Charity[] = [
  { id: 'bright-horizons', name: 'Bright Horizons Foundation', wallet: '0xb7ACd1159dBed96B955C4d856fc001De9be59844' },
  { id: 'little-oaks', name: 'Little Oaks Children's Fund',    wallet: '0xb7ACd1159dBed96B955C4d856fc001De9be59844' },
  { id: 'riveraid', name: 'RiverAid Clean Water',               wallet: '0xb7ACd1159dBed96B955C4d856fc001De9be59844' },
  { id: 'green-step', name: 'Green Step Environmental Trust',   wallet: '0xD4e5F6a7B80901234567890ABCDEfAbcdef32104' },
  { id: 'harbor-hope', name: 'Harbor Hope Homeless Support',    wallet: '0xE5f6a7B80901A234567890abCdefABcdef432105' },
  { id: 'warm-meals', name: 'Warm Meals Community Kitchen',     wallet: '0xF6a7B80901A2B34567890AbcdEFAbcDEF5432106' },
  { id: 'careline', name: 'CareLine Elder Outreach',            wallet: '0xb7ACd1159dBed96B955C4d856fc001De9be59844' },
  { id: 'book-bridge', name: 'Book Bridge Literacy',            wallet: '0x18C901A2B3C4D567890AbcdefABCDef765432108' },
  { id: 'hope-runners', name: 'Hope Runners Cancer Support',    wallet: '0x29D01A2B3C4D5E67890abcdefAbcDEF876543209' },
  { id: 'seaside-smiles', name: 'Seaside Smiles Children's Care', wallet: '0x3AE11A2B3C4D5E6F890ABCDEfAbcdef987654310' },
  { id: 'shelter-paws', name: 'Shelter Paws Animal Rescue',     wallet: '0x4BF21A2B3C4D5E6F7090abCDefABCDEF09876511' },
  { id: 'mindful-steps', name: 'Mindful Steps Mental Health',   wallet: '0x5C032A2B3C4D5E6F7010AbcdefABCDEF10987612' },
  { id: 'girls-code', name: 'Girls Code Collective',            wallet: '0x6D142A2B3C4D5E6F7012abcdefABCDEF21098713' },
  { id: 'rural-reach', name: 'Rural Reach Medical Access',      wallet: '0x7E252A2B3C4D5E6F70123AbcdefAbcDEF32109814' },
  { id: 'food-first', name: 'Food First Pantry Network',        wallet: '0x8F362A2B3C4D5E6F701234abcdefABCDEF432109' },
  { id: 'youth-rise', name: 'Youth Rise Sports & Arts',         wallet: '0x90372A2B3C4D5E6F7012345AbcdefAbcDEF543210' },
  { id: 'tech4good', name: 'Tech4Good Education',               wallet: '0xA1482A2B3C4D5E6F70123456abcdefABCDEF65432' },
  { id: 'island-aid', name: 'Island Aid Disaster Relief',       wallet: '0xB2592A2B3C4D5E6F701234567AbcdefAbcDEF7654' },
  { id: 'arts-all', name: 'Arts for All Foundation',            wallet: '0xC36A2A2B3C4D5E6F7012345678abcdefABCDEF876' },
  { id: 'clean-skies', name: 'Clean Skies Air Quality',         wallet: '0xD47B2A2B3C4D5E6F70123456789AbcdefAbcDEF98' },
];

// convenience lookup
export const getCharityById = (id?: string | null) =>
  CHARITIES.find(c => c.id === id);
