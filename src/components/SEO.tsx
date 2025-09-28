import { useEffect } from 'react';

type OgType = 'website' | 'article' | 'event' | 'blog' | 'update';

interface ArticleMeta {
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];
}

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  ukKeywords?: string; // UK-specific keywords
  ieKeywords?: string; // Ireland-specific keywords
  image?: string;
  type?: OgType;
  domainStrategy?: 'uk-primary' | 'geographic' | 'ireland-primary';
  // Optional JSON-LD. You can pass an object or array of objects.
  structuredData?: Record<string, any> | Record<string, any>[];
  // Optional article details when type === 'article' or blog/update
  article?: ArticleMeta;
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  ukKeywords,
  ieKeywords,
  image = '/fundraisely-og-image.png',
  type = 'website',
  domainStrategy = 'geographic',
  structuredData,
  article
}) => {
  useEffect(() => {
    const siteTitle = 'FundRaisely';
    const fullTitle = title === siteTitle ? title : `${title} | ${siteTitle}`;

    const currentUrl = window.location.href;
    const currentDomain = window.location.hostname;
    const path = window.location.pathname;

    // Env-configured domains (fallbacks provided)
    const UK_DOMAIN = import.meta.env.VITE_UK_DOMAIN || 'https://fundraisely.co.uk';
    const IE_DOMAIN = import.meta.env.VITE_IE_DOMAIN || 'https://fundraisely.ie';
    const X_DEFAULT = import.meta.env.VITE_SEO_X_DEFAULT_DOMAIN || UK_DOMAIN;

    // Helpers
    const setMetaTag = (name: string, content: string, useProperty = false, id?: string) => {
      const attr = useProperty ? 'property' : 'name';
      const selector = id ? `meta#${id}` : `meta[${attr}="${name}"]`;
      let el = document.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        if (id) el.id = id;
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    const setLinkTag = (rel: string, href: string, hreflang?: string, id?: string) => {
      const selector = id ? `link#${id}` : (hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]`);
      let link = document.querySelector(selector) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        if (id) link.id = id;
        link.rel = rel;
        if (hreflang) link.hreflang = hreflang;
        document.head.appendChild(link);
      }
      link.href = href;
    };

    const removeAll = (selector: string) => {
      document.querySelectorAll(selector).forEach((n) => n.remove());
    };

    // Compute domain-specific keywords
    const getKeywords = () => {
      if (currentDomain.includes('co.uk') && ukKeywords) return ukKeywords;
      if (currentDomain.includes('.ie') && ieKeywords) return ieKeywords;
      return keywords;
    };

    // Canonical URL per strategy
    const getCanonicalUrl = () => {
      switch (domainStrategy) {
        case 'uk-primary':
          return `${UK_DOMAIN}${path}`;
        case 'ireland-primary':
          return `${IE_DOMAIN}${path}`;
        case 'geographic':
        default:
          return currentUrl; // canonical to itself
      }
    };

    // ===== BASIC TAGS =====
    document.title = fullTitle;
    setMetaTag('description', description, false, 'meta-description');
    const finalKeywords = getKeywords();
    if (finalKeywords) setMetaTag('keywords', finalKeywords, false, 'meta-keywords');

    // ===== OPEN GRAPH =====
    const ogType: OgType = (type === 'blog' || type === 'update') ? 'article' : type;
    setMetaTag('og:title', fullTitle, true, 'og-title');
    setMetaTag('og:description', description, true, 'og-description');
    setMetaTag('og:image', image, true, 'og-image');
    setMetaTag('og:url', getCanonicalUrl(), true, 'og-url');
    setMetaTag('og:type', ogType, true, 'og-type');
    setMetaTag('og:site_name', siteTitle, true, 'og-site');

    // Geographic targeting signal via og:locale
    if (currentDomain.includes('co.uk')) setMetaTag('og:locale', 'en_GB', true, 'og-locale');
    if (currentDomain.includes('.ie')) setMetaTag('og:locale', 'en_IE', true, 'og-locale');

    // ===== TWITTER =====
    setMetaTag('twitter:card', 'summary_large_image', false, 'tw-card');
    setMetaTag('twitter:title', fullTitle, false, 'tw-title');
    setMetaTag('twitter:description', description, false, 'tw-description');
    setMetaTag('twitter:image', image, false, 'tw-image');

    // ===== CANONICAL =====
    setLinkTag('canonical', getCanonicalUrl(), undefined, 'link-canonical');

    // ===== HREFLANGS (ensure uniqueness + x-default) =====
    // Clean previous alternates to prevent duplicates on SPA navigations
    removeAll('link[rel="alternate"][hreflang]');
    setLinkTag('alternate', `${UK_DOMAIN}${path}`, 'en-GB');
    setLinkTag('alternate', `${IE_DOMAIN}${path}`, 'en-IE');
    setLinkTag('alternate', `${X_DEFAULT}${path}`, 'x-default');

    // ===== ROBOTS (with allowlist for /quiz/demo) =====
    const privatePatterns = [
      /^\/game\//,
      /^\/quiz\//,
      /^\/admin\//,
      /^\/dashboard\//,
      /^\/user\//,
      /^\/api\//,
      /^\/pitch-deck/
    ];
    const allowlist = ['/quiz/demo'];

    const isAllowlisted = allowlist.includes(path);
    const isPrivate = privatePatterns.some((re) => re.test(path));
    const robotsValue = isPrivate && !isAllowlisted ? 'noindex, nofollow' : 'index, follow';
    setMetaTag('robots', robotsValue, false, 'meta-robots');

    // ===== ARTICLE META (when applicable) =====
    if (ogType === 'article' && article) {
      if (article.publishedTime) setMetaTag('article:published_time', article.publishedTime, true, 'og-published');
      if (article.modifiedTime) setMetaTag('article:modified_time', article.modifiedTime, true, 'og-modified');
      if (article.author) setMetaTag('article:author', article.author, true, 'og-author');
      if (article.section) setMetaTag('article:section', article.section, true, 'og-section');
      if (article.tags?.length) setMetaTag('article:tag', article.tags.join(','), true, 'og-tags');
    }

    // ===== JSON-LD STRUCTURED DATA =====
    // Remove any previous JSON-LD we added
    removeAll('script[data-seo-jsonld="true"]');

    const addJsonLd = (obj: Record<string, any>) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.seoJsonld = 'true';
      script.textContent = JSON.stringify(obj);
      document.head.appendChild(script);
    };

    // Organization + WebSite (safe to include on every page)
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'FundRaisely',
      url: getCanonicalUrl(),
      logo: `${currentDomain.includes('co.uk') ? UK_DOMAIN : IE_DOMAIN}/fundraisely-og-image.png`,
      areaServed: currentDomain.includes('co.uk') ? 'United Kingdom' : 'Ireland'
    });

    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'FundRaisely',
      url: getCanonicalUrl(),
      potentialAction: {
        '@type': 'SearchAction',
        target: `${currentDomain.includes('co.uk') ? UK_DOMAIN : IE_DOMAIN}/search?q={query}`,
        'query-input': 'required name=query'
      }
    });

    // Page-level JSON-LD if provided
    if (structuredData) {
      const items = Array.isArray(structuredData) ? structuredData : [structuredData];
      items.forEach(addJsonLd);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, keywords, ukKeywords, ieKeywords, image, type, domainStrategy]);

  return null;
};
