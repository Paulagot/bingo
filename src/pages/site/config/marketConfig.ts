export type MarketCode = 'ie' | 'uk';

export type MarketConfig = {
  code: MarketCode;
  countryName: string;
  countryAdjective: string;
  currencySymbol: string;
  currencyCode: 'EUR' | 'GBP';
  locale: 'en-IE' | 'en-GB';
  canonicalBaseUrl: string;
  committeeTerm: string;
  commonOrganisationExamples: string;
};

export const markets: Record<MarketCode, MarketConfig> = {
  ie: {
    code: 'ie',
    countryName: 'Ireland',
    countryAdjective: 'Irish',
    currencySymbol: '€',
    currencyCode: 'EUR',
    locale: 'en-IE',
    canonicalBaseUrl: 'https://fundraisely.ie',
    committeeTerm: 'committee',
    commonOrganisationExamples: 'clubs, charities, schools, PTAs and community groups across Ireland',
  },
  uk: {
    code: 'uk',
    countryName: 'United Kingdom',
    countryAdjective: 'UK',
    currencySymbol: '£',
    currencyCode: 'GBP',
    locale: 'en-GB',
    canonicalBaseUrl: 'https://fundraisely.co.uk',
    committeeTerm: 'committee',
    commonOrganisationExamples: 'clubs, charities, schools, PTAs and community groups across the UK',
  },
};

export function getMarketConfig(hostname = typeof window !== 'undefined' ? window.location.hostname : ''): MarketConfig {
  const host = hostname.toLowerCase();
  if (host.includes('fundraisely.co.uk')) return markets.uk;
  return markets.ie;
}

export function formatCurrencyExample(amount: number, market = getMarketConfig()): string {
  return new Intl.NumberFormat(market.locale, {
    style: 'currency',
    currency: market.currencyCode,
    maximumFractionDigits: 0,
  }).format(amount);
}
