import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  type?: 'website' | 'article' | 'event' | 'blog' | 'update';
  domainStrategy?: 'uk-primary' | 'geographic' | 'ireland-primary';
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  image = '/fundraisely-og-image.png',
  type = 'website',
  domainStrategy = 'geographic'
}) => {
  useEffect(() => {
    console.log('🔍 SEO Component running for:', title);
    
    const siteTitle = 'FundRaisely';
    const fullTitle = title === siteTitle ? title : `${title} | ${siteTitle}`;
    const currentUrl = window.location.href;
    const currentDomain = window.location.hostname;
    
    // Update document title
    document.title = fullTitle;
    console.log('📝 Title updated to:', fullTitle);
    
    // Helper function to set meta tag
    const setMetaTag = (name: string, content: string, useProperty = false) => {
      const attribute = useProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;
      
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };
    
    // Helper function to set link tag
    const setLinkTag = (rel: string, href: string, hreflang?: string) => {
      const selector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]`;
      let link = document.querySelector(selector) as HTMLLinkElement;
      
      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        if (hreflang) link.hreflang = hreflang;
        document.head.appendChild(link);
      }
      link.href = href;
    };
    
    // Basic meta tags
    setMetaTag('description', description);
    if (keywords) setMetaTag('keywords', keywords);
    
    // Open Graph
    setMetaTag('og:title', fullTitle, true);
    setMetaTag('og:description', description, true);
    setMetaTag('og:image', image, true);
    setMetaTag('og:url', currentUrl, true);
    setMetaTag('og:type', type === 'blog' || type === 'update' ? 'article' : type, true);
    setMetaTag('og:site_name', siteTitle, true);
    
    // Twitter
    setMetaTag('twitter:title', fullTitle);
    setMetaTag('twitter:description', description);
    setMetaTag('twitter:image', image);
    
    // Geographic targeting
    if (domainStrategy === 'geographic') {
      if (currentDomain.includes('co.uk')) {
        setMetaTag('og:locale', 'en_GB', true);
      }
      if (currentDomain.includes('.ie')) {
        setMetaTag('og:locale', 'en_IE', true);
      }
    }
    
    // Canonical URL
    const getCanonicalUrl = () => {
      const path = window.location.pathname;
      
      switch (domainStrategy) {
        case 'uk-primary':
          return `https://fundraisely.co.uk${path}`;
        case 'ireland-primary':
          return `https://fundraisely.ie${path}`;
        case 'geographic':
          return currentUrl; // Each domain canonical for itself
        default:
          return currentUrl;
      }
    };
    
    setLinkTag('canonical', getCanonicalUrl());
    
    // Hreflang tags for geographic strategy
    if (domainStrategy === 'geographic') {
      const path = window.location.pathname;
      setLinkTag('alternate', `https://fundraisely.co.uk${path}`, 'en-GB');
      setLinkTag('alternate', `https://fundraisely.ie${path}`, 'en-IE');
      setLinkTag('alternate', `https://fundraisely.co.uk${path}`, 'en'); // Default
    }
    
    // Robots for sensitive pages
    if (currentUrl.includes('/game/') || currentUrl.includes('/quiz/')) {
      setMetaTag('robots', 'noindex, nofollow');
    } else {
      setMetaTag('robots', 'index, follow');
    }
    
    console.log('✅ SEO meta tags updated');
    
  }, [title, description, keywords, image, type, domainStrategy]);

  return null;
};