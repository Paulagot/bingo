// src/utils/urlHelpers.ts
export const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin; // picks up .ie or .co.uk automatically
  }
  return import.meta.env.VITE_SITE_ORIGIN || 'http://localhost:3001';
};

export const getFullImageUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  const baseUrl = getBaseUrl();
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};