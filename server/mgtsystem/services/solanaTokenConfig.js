/**
 * solanaTokenConfig.js  (backend — Node.js ESM)
 *
 * Plain JS mirror of the frontend solanaTokenConfig.ts.
 * Kept in sync manually — if you add a token to the TS file, add it here too.
 *
 * Used by: tokenPriceService.js
 */

export const SOLANA_TOKENS = {

  SOL: {
    code: 'SOL',
    name: 'Solana',
    mint: null,
    decimals: 9,
    isNative: true,
    tgbCode: 'SOL',
    tgbMinDonation: 0.00001,
    minEntryFee: 0.01,
    logoUrl: 'https://static.tgbwidget.com/currency_images%2F1dffe878-2164-4a11-902c-04ec7df9cca9.png',
    coingeckoId: 'solana',
  },

  USDG: {
    code: 'USDG',
    name: 'Global Dollar',
    mint: '2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH',
    decimals: 6,
    isNative: false,
    tgbCode: 'USDG',
    tgbMinDonation: 0.1,
    minEntryFee: 0.5,
    logoUrl: 'https://static.tgbwidget.com/currency_images/e39e781c-7917-4ad8-b34e-9e037c4b4b1c.png',
    coingeckoId: 'global-dollar',
  },

  JUP: {
    code: 'JUP',
    name: 'Jupiter',
    mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    decimals: 6,
    isNative: false,
    tgbCode: 'JUP',
    tgbMinDonation: 0.3,
    minEntryFee: 1,
    logoUrl: 'https://static.tgbwidget.com/currency_images/0b318f9a-18b0-48fe-a423-59b145e6971b.png',
    coingeckoId: 'jupiter-exchange-solana',
  },

  BONK: {
    code: 'BONK',
    name: 'Bonk',
    mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    decimals: 5,
    isNative: false,
    tgbCode: 'BONK',
    tgbMinDonation: 4000,
    minEntryFee: 10000,
    logoUrl: 'https://static.tgbwidget.com/currency_images/47c4992a-b4b8-4bd3-aae3-64173629844d.png',
    coingeckoId: 'bonk',
  },

  WIF: {
    code: 'WIF',
    name: 'dogwifhat',
    mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
    decimals: 6,
    isNative: false,
    tgbCode: 'WIF',
    tgbMinDonation: 0.07,
    minEntryFee: 0.5,
    logoUrl: 'https://static.tgbwidget.com/currency_images/49e34fff-e9c2-4127-8fb3-286360fac3ac.png',
    coingeckoId: 'dogwifcoin',
  },

  JTO: {
    code: 'JTO',
    name: 'JITO',
    mint: 'jtojtomepa8b1E2XlyriygzsChXTrqE73RM4BdWUGEm',
    decimals: 9,
    isNative: false,
    tgbCode: 'JTO',
    tgbMinDonation: 0.05,
    minEntryFee: 0.5,
    logoUrl: 'https://static.tgbwidget.com/currency_images/985fdb8e-d90c-4fe6-b7e7-35a33a4f3943.png',
    coingeckoId: 'jito-governance-token',
  },

  KMNO: {
    code: 'KMNO',
    name: 'Kamino',
    mint: 'KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS',
    decimals: 6,
    isNative: false,
    tgbCode: 'KMNO',
    tgbMinDonation: 1,
    minEntryFee: 5,
    logoUrl: 'https://static.tgbwidget.com/currency_images/24085e62-0663-4467-a423-1341d232a1da.png',
    coingeckoId: 'kamino',
  },


  TRUMP: {
    code: 'TRUMP',
    name: 'Trump',
    mint: '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN',
    decimals: 6,
    isNative: false,
    tgbCode: 'TRUMP',
    tgbMinDonation: 0.01,
    minEntryFee: 0.1,
    logoUrl: 'https://static.tgbwidget.com/currency_images/bf24a293-6f19-4ed5-8a40-ba032f45fb18.png',
    coingeckoId: 'official-trump',
  },

  MEW: {
    code: 'MEW',
    name: 'cat in a dogs world',
    mint: 'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5',
    decimals: 5,
    isNative: false,
    tgbCode: 'MEW',
    tgbMinDonation: 10,
    minEntryFee: 50,
    logoUrl: 'https://static.tgbwidget.com/currency_images/ac8bcaa4-2245-4bc3-a2ca-daa7c7d9bc53.png',
    coingeckoId: 'cat-in-a-dogs-world',
  },

  PYTH: {
    code: 'PYTH',
    name: 'Pyth Network',
    mint: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
    decimals: 6,
    isNative: false,
    tgbCode: 'PYTH',
    tgbMinDonation: 0.2,
    minEntryFee: 1,
    logoUrl: 'https://static.tgbwidget.com/currency_images/f761d7a6-986a-45e3-950d-b23fdb4b627b.png',
    coingeckoId: 'pyth-network',
  },
};

export const SOLANA_TOKEN_LIST = [
  'SOL', 'USDG', 'JUP', 'JTO', 'PYTH',
  'KMNO', 'WIF', 'BONK', 'MEW', 'TRUMP', ,
];

export const EVM_TOKENS = {
  USDC: {
    code: 'USDC',
    coingeckoId: 'usd-coin',
    mint: null,
  },
  USDGLO: {
    code: 'USDGLO',
    coingeckoId: 'usd-coin',  // treat as $1 stablecoin
    mint: null,
  },
};