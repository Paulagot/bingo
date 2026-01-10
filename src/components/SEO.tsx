// src/components/SEO.tsx
import { useEffect } from 'react';

type OgType = 'website' | 'article' | 'event' | 'blog' | 'update' | 'legal' | 'about';
type RobotsValue = 'index, follow' | 'noindex, nofollow' | 'noindex, follow' | 'index, nofollow';

interface ArticleMeta {
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];
}

interface BreadcrumbItem {
  name: string;
  item: string; // absolute or path; we'll normalize
}

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  ukKeywords?: string; // UK-specific keywords
  ieKeywords?: string; // Ireland-specific keywords
  image?: string;       // absolute or site-root path
  type?: OgType;
  domainStrategy?: 'uk-primary' | 'geographic' | 'ireland-primary';

  /** Optional JSON-LD objects to append */
  structuredData?: Record<string, any> | Record<string, any>[];

  /** Article details when type === 'article' (or blog/update, which map to article) */
  article?: ArticleMeta;

  /** Optional: force robots for this page (e.g., on /about /legal pages) */
  robotsOverride?: RobotsValue;

  /** Optional: breadcrumbs for JSON-LD */
  breadcrumbs?: BreadcrumbItem[];
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  ukKeywords,
  ieKeywords,
  image = '/fundraisely.png',
  type = 'website',
  domainStrategy = 'geographic',
  structuredData,
  article,
  robotsOverride,
  breadcrumbs,
}) => {
  useEffect(() => {
    const siteTitle = 'FundRaisely';
    const fullTitle = title === siteTitle ? title : `${title} | ${siteTitle}`;

    // Runtime environment (client-only)
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
    const path = typeof window !== 'undefined' ? window.location.pathname : '/';

    // Env-configured domains (fallbacks provided)
    const UK_DOMAIN = (import.meta as any)?.env?.VITE_UK_DOMAIN || 'https://fundraisely.co.uk';
    const IE_DOMAIN = (import.meta as any)?.env?.VITE_IE_DOMAIN || 'https://fundraisely.ie';
    const X_DEFAULT = (import.meta as any)?.env?.VITE_SEO_X_DEFAULT_DOMAIN || UK_DOMAIN;

    // Helpers
    const setMetaTag = (name: string, content: string, useProperty = false, id?: string) => {
      if (!content) return;
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
      if (!href) return;
      const selector = id
        ? `link#${id}`
        : hreflang
          ? `link[rel="${rel}"][hreflang="${hreflang}"]`
          : `link[rel="${rel}"]`;
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

    const ensureAbsolute = (maybePath: string) => {
      if (!maybePath) return '';
      if (maybePath.startsWith('http://') || maybePath.startsWith('https://')) return maybePath;
      const base = currentDomain.includes('co.uk') ? UK_DOMAIN : IE_DOMAIN;
      const p = maybePath.startsWith('/') ? maybePath : `/${maybePath}`;
      return `${base}${p}`;
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
          return currentUrl || `${ensureAbsolute(path)}`;
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
    setMetaTag('og:image', ensureAbsolute(image), true, 'og-image');
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
    setMetaTag('twitter:image', ensureAbsolute(image), false, 'tw-image');

    // ===== CANONICAL =====
    setLinkTag('canonical', getCanonicalUrl(), undefined, 'link-canonical');

    // ===== HREFLANGS (ensure uniqueness + x-default) =====
    // Clean previous alternates to prevent duplicates on SPA navigations
    removeAll('link[rel="alternate"][hreflang]');
    setLinkTag('alternate', `${UK_DOMAIN}${path}`, 'en-GB');
    setLinkTag('alternate', `${IE_DOMAIN}${path}`, 'en-IE');
    setLinkTag('alternate', `${X_DEFAULT}${path}`, 'x-default');

    // ===== ROBOTS =====
    // Narrowly block private/app areas; allow marketing pages.
    const privatePatterns = [
      /^\/game\//,
      /^\/admin\//,
      /^\/dashboard\//,
      /^\/user\//,
      /^\/api\//,
      // Private, app-like quiz routes (adjust to your actual paths)
      /^\/quiz\/(host|room|rooms|play|join|sockets|session|live)(\/|$)/,
    ];

    // Marketing pages that MUST be indexable
    const marketingAllowlist = new Set<string>([
      '/',
      '/free-trial',
      '/pricing',
      '/quiz/demo',
      '/quiz/how-it-works',
      '/quiz/features',
      '/quiz/use-cases',
      '/quiz/use-cases/charities',
      '/quiz/use-cases/clubs',
      '/quiz/use-cases/schools',
      // Web3 hub
      '/web3',
      '/web3/how-it-works',
      '/web3/features',
      '/web3/partners',
      '/web3/testimonials',
      // Impact campaign
      '/web3/impact-campaign',
      '/web3/impact-campaign/join',
      '/web3/impact-campaign/leaderboard',
      //  campaigns
       '/campaigns',
        '/campaigns/clubs-league',
      // Company (public)
      '/blog',
      '/whats-new',
      // Testimonials (if you keep the non-web3 one)
      '/testimonials',
    ]);

    // Company/holder pages that should be noindex
    const forceNoindex = [
      /^\/about(\/|$)/,
      /^\/contact(\/|$)/,
      /^\/legal(\/|$)/,
      // geo holders (not built yet)
      /^\/ireland(\/|$)/,
      /^\/uk(\/|$)/,
    ];

    const isPrivate = privatePatterns.some((re) => re.test(path));
    const isForceNoindex = forceNoindex.some((re) => re.test(path));
    const isAllowlisted = marketingAllowlist.has(path);

    let robotsValue: RobotsValue = 'index, follow';
    if (robotsOverride) {
      robotsValue = robotsOverride;
    } else if (isAllowlisted) {
      robotsValue = 'index, follow';
    } else if (isForceNoindex || isPrivate) {
      robotsValue = 'noindex, nofollow';
    } else {
      // default: index marketing landing pages you haven't listed explicitly
      robotsValue = 'index, follow';
    }
    setMetaTag('robots', robotsValue, false, 'meta-robots');

    // ===== ARTICLE META (when applicable) =====
    if (ogType === 'article' && article) {
      if (article.publishedTime) setMetaTag('article:published_time', article.publishedTime, true, 'og-published');
      if (article.modifiedTime) setMetaTag('article:modified_time', article.modifiedTime, true, 'og-modified');
      if (article.author) setMetaTag('article:author', article.author, true, 'og-author');
      if (article.section) setMetaTag('article:section', article.section, true, 'og-section');
      if (article.tags?.length) setMetaTag('article:tag', article.tags.join(','), true, 'og-tags');
    }

    // ===== JSON-LD =====
    // Remove any previous JSON-LD we added to avoid duplicates on SPA navigation
    removeAll('script[data-seo-jsonld="true"]');

    const addJsonLd = (obj: Record<string, any>) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.seoJsonld = 'true';
      script.textContent = JSON.stringify(obj);
      document.head.appendChild(script);
    };

    // Organization
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'FundRaisely',
      url: getCanonicalUrl(),
      logo: ensureAbsolute('/fundraisely.png'),
      areaServed: currentDomain.includes('co.uk') ? 'United Kingdom' : 'Ireland',
    });

    // WebSite
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'FundRaisely',
      url: currentDomain.includes('co.uk') ? UK_DOMAIN : IE_DOMAIN,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${currentDomain.includes('co.uk') ? UK_DOMAIN : IE_DOMAIN}/search?q={query}`,
        'query-input': 'required name=query',
      },
    });

    // Breadcrumbs (if provided)
    if (Array.isArray(breadcrumbs) && breadcrumbs.length) {
      addJsonLd({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((b, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: b.name,
          item: b.item.startsWith('http') ? b.item : `${(currentDomain.includes('co.uk') ? UK_DOMAIN : IE_DOMAIN)}${b.item.startsWith('/') ? b.item : `/${b.item}`}`,
        })),
      });
    }

    // Page-level JSON-LD if provided
    if (structuredData) {
      const items = Array.isArray(structuredData) ? structuredData : [structuredData];
      items.forEach(addJsonLd);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    title,
    description,
    keywords,
    ukKeywords,
    ieKeywords,
    image,
    type,
    domainStrategy,
    robotsOverride,
    JSON.stringify(breadcrumbs),
    JSON.stringify(structuredData),
  ]);

  return null;
};

