//src/pages/site/components/seo/SEO.tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { defaultSeo } from '../../config/seoConfig';
import { getMarketConfig } from '../../config/marketConfig';
import { siteBrand, socialLinks } from '../../config/siteBrand';

export type OgType = 'website' | 'article';
export type RobotsValue = 'index, follow' | 'noindex, nofollow' | 'noindex, follow' | 'index, nofollow';

export type BreadcrumbItem = {
  name: string;
  item: string;
};

type SEOProps = {
  title: string;
  description: string;
  canonicalPath?: string;
  noindex?: boolean;
  robotsOverride?: RobotsValue;
  ogTitle?: string;
  ogDescription?: string;
  image?: string;
  type?: OgType;
  breadcrumbs?: BreadcrumbItem[];
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
};

function setMeta(nameOrProperty: string, content: string, property = false, id?: string) {
  const attr = property ? 'property' : 'name';
  const selector = id ? `meta#${id}` : `meta[${attr}="${nameOrProperty}"]`;
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement('meta');
    if (id) tag.id = id;
    tag.setAttribute(attr, nameOrProperty);
    document.head.appendChild(tag);
  }
  tag.content = content;
}

function setLink(rel: string, href: string, id?: string, hreflang?: string) {
  const selector = id
    ? `link#${id}`
    : hreflang
      ? `link[rel="${rel}"][hreflang="${hreflang}"]`
      : `link[rel="${rel}"]`;
  let link = document.head.querySelector<HTMLLinkElement>(selector);
  if (!link) {
    link = document.createElement('link');
    if (id) link.id = id;
    link.rel = rel;
    if (hreflang) link.hreflang = hreflang;
    document.head.appendChild(link);
  }
  link.href = href;
}

function removeAll(selector: string) {
  document.querySelectorAll(selector).forEach((node) => node.remove());
}

export function SEO({
  title,
  description,
  canonicalPath,
  noindex = false,
  robotsOverride,
  ogTitle,
  ogDescription,
  image,
  type = 'website',
  breadcrumbs = [],
  structuredData,
}: SEOProps) {
  const location = useLocation();
  const market = getMarketConfig();

  useEffect(() => {
    const UK_DOMAIN = import.meta.env.VITE_UK_DOMAIN || 'https://fundraisely.co.uk';
    const IE_DOMAIN = import.meta.env.VITE_IE_DOMAIN || 'https://fundraisely.ie';
    const X_DEFAULT = import.meta.env.VITE_SEO_X_DEFAULT_DOMAIN || UK_DOMAIN;
    const path = canonicalPath ?? location.pathname;
    const baseUrl = market.code === 'ie' ? IE_DOMAIN : UK_DOMAIN;
    const canonical = `${baseUrl}${path}`;
    const fullTitle = defaultSeo.titleTemplate.replace('%s', title);
    const ogImage = image?.startsWith('http') ? image : `${baseUrl}${image ?? siteBrand.defaultShareImage}`;

    document.title = fullTitle;
    document.documentElement.lang = market.locale;

    setMeta('description', description, false, 'meta-description');
    setMeta('robots', robotsOverride ?? (noindex ? 'noindex, nofollow' : 'index, follow'), false, 'meta-robots');

    setMeta('og:title', ogTitle ?? fullTitle, true, 'og-title');
    setMeta('og:description', ogDescription ?? description, true, 'og-description');
    setMeta('og:type', type, true, 'og-type');
    setMeta('og:url', canonical, true, 'og-url');
    setMeta('og:image', ogImage, true, 'og-image');
    setMeta('og:site_name', defaultSeo.siteName, true, 'og-site-name');
    setMeta('og:locale', market.code === 'ie' ? 'en_IE' : 'en_GB', true, 'og-locale');

    setMeta('twitter:card', 'summary_large_image', false, 'twitter-card');
    setMeta('twitter:title', ogTitle ?? fullTitle, false, 'twitter-title');
    setMeta('twitter:description', ogDescription ?? description, false, 'twitter-description');
    setMeta('twitter:image', ogImage, false, 'twitter-image');

    setLink('canonical', canonical, 'canonical-link');
    removeAll('link[rel="alternate"][hreflang]');
    setLink('alternate', `${UK_DOMAIN}${path}`, undefined, 'en-GB');
    setLink('alternate', `${IE_DOMAIN}${path}`, undefined, 'en-IE');
    setLink('alternate', `${X_DEFAULT}${path}`, undefined, 'x-default');

    removeAll('script[data-seo-jsonld="true"]');
    const addJsonLd = (obj: Record<string, unknown>) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.seoJsonld = 'true';
      script.textContent = JSON.stringify(obj);
      document.head.appendChild(script);
    };

    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: defaultSeo.siteName,
      url: baseUrl,
      logo: `${baseUrl}${siteBrand.logoSrc ?? siteBrand.defaultShareImage}`,
      areaServed: market.countryName,
      sameAs: socialLinks.map((link) => link.href),
    });

    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: defaultSeo.siteName,
      url: baseUrl,
    });

    if (breadcrumbs.length > 0) {
      addJsonLd({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.name,
          item: crumb.item.startsWith('http') ? crumb.item : `${baseUrl}${crumb.item}`,
        })),
      });
    }

    const dataItems = structuredData ? (Array.isArray(structuredData) ? structuredData : [structuredData]) : [];
    dataItems.forEach((item) => addJsonLd(item));
  }, [title, description, canonicalPath, location.pathname, noindex, robotsOverride, ogTitle, ogDescription, image, type, market, breadcrumbs, structuredData]);

  return null;
}
