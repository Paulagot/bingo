// src/pages/blog/BlogAndResources.tsx
import type React from 'react';
import { useState } from 'react';
import { SEO } from '../components/SEO';
import { Header } from '../components/GeneralSite2/Header';
import SiteFooter from '../components/GeneralSite2/SiteFooter';
import { BookOpen, FileText, Megaphone, ArrowRight, Sparkles, Calendar, Tag, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { allPostsMeta } from '../components/posts/registry';

/**
 * Blog & Resources hub
 * - Indexable (unlike legal pages)
 * - JSON-LD: CollectionPage + ItemList
 */

// Category color schemes matching brand
const categoryColors: Record<string, {
  iconBg: string;
  iconColor: string;
  borderColor: string;
  hoverBg: string;
  badgeBg: string;
  badgeText: string;
}> = {
  guides: {
    iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-500',
    iconColor: 'text-white',
    borderColor: 'border-blue-100',
    hoverBg: 'hover:bg-blue-50',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700'
  },
  articles: {
    iconBg: 'bg-gradient-to-br from-green-500 to-emerald-500',
    iconColor: 'text-white',
    borderColor: 'border-green-100',
    hoverBg: 'hover:bg-green-50',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-700'
  },
  updates: {
    iconBg: 'bg-gradient-to-br from-purple-500 to-pink-500',
    iconColor: 'text-white',
    borderColor: 'border-purple-100',
    hoverBg: 'hover:bg-purple-50',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-700'
  },
  'r&d, tech innovation': {
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-500',
    iconColor: 'text-white',
    borderColor: 'border-amber-100',
    hoverBg: 'hover:bg-amber-50',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700'
  },
  all: {
    iconBg: 'bg-gradient-to-br from-indigo-500 to-purple-500',
    iconColor: 'text-white',
    borderColor: 'border-indigo-100',
    hoverBg: 'hover:bg-indigo-50',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-700'
  }
};

// Helper function to get colors for any category (with fallback)
const getCategoryColors = (category: string | undefined) => {
  const normalizedCategory = category?.toLowerCase() || 'articles';
  return categoryColors[normalizedCategory] || categoryColors['articles'];
};

const BlogAndResources: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Build "Latest Posts" from registry (sorted newest → oldest)
  const latestPosts = [...allPostsMeta].sort((a, b) => b.date.localeCompare(a.date));

  // Extract unique categories from posts
  const uniqueCategories = Array.from(
    new Set(latestPosts.map(post => post.category?.toLowerCase()).filter(Boolean))
  );

  // Build category list with counts - combine predefined and dynamic categories
  const predefinedCategories = [
    { id: 'all', label: 'All Posts', icon: Sparkles },
    { id: 'guides', label: 'Guides', icon: BookOpen },
    { id: 'articles', label: 'Articles', icon: FileText },
    { id: 'updates', label: 'Updates', icon: Megaphone },
  ];

  // Add dynamic categories that aren't in predefined list
  const dynamicCategories = uniqueCategories
    .filter(cat => !['guides', 'articles', 'updates'].includes(cat as string))
    .map(cat => ({
      id: cat as string,
      label: (cat as string).split(',')[0].trim(), // Use first part if comma-separated
      icon: Tag,
    }));

  const categories = [
    ...predefinedCategories,
    ...dynamicCategories,
  ].map(cat => ({
    ...cat,
    count: cat.id === 'all' 
      ? latestPosts.length 
      : latestPosts.filter(post => post.category?.toLowerCase() === cat.id).length,
  })).filter(cat => cat.id === 'all' || cat.count > 0); // Only show categories with posts

  // Content sections for placeholder
  const sections = [
    {
      id: 'guides',
      title: 'In-Depth Guides',
      icon: BookOpen,
      blurb:
        'Step-by-step playbooks for planning, running, and optimizing your fundraising events—from first quiz to advanced strategies.',
      items: [
        { title: 'The Ultimate Checklist for a Flawless Quiz Night', href: '#', comingSoon: true, category: 'guides' },
        { title: 'How to Promote Your Fundraiser and Maximize Turnout', href: '#', comingSoon: true, category: 'guides' },
        { title: 'Understanding "Games of Skill" and UK Fundraising Compliance', href: '#', comingSoon: true, category: 'guides' },
        { title: 'Reconciling Cash, Card, and Crypto Payments — A Practical Guide', href: '#', comingSoon: true, category: 'guides' },
      ],
    },
    {
      id: 'articles',
      title: 'Insightful Articles & Case Studies',
      icon: FileText,
      blurb:
        'Trends, best practices, and real stories from schools, clubs, and charities—plus lessons from our own journey.',
      items: [
        { title: 'From Hackathon Win to Community Impact: The FundRaisely Story', href: '#', comingSoon: true, category: 'articles' },
        { title: '5 Ways to Boost Engagement at Your Next Fundraising Event', href: '#', comingSoon: true, category: 'articles' },
        { title: 'Case Study: How a Local School Raised €1,200 in a Single Night', href: '#', comingSoon: true, category: 'articles' },
        { title: 'The Future of Giving: How Web3 is Transforming Philanthropy', href: '#', comingSoon: true, category: 'articles' },
      ],
    },
    {
      id: 'updates',
      title: 'Platform News & Updates',
      icon: Megaphone,
      blurb:
        'New features, improvements, and announcements—so you never miss what\'s shipping across games, reporting, and compliance.',
      items: [
        { title: 'Announcing the First Annual Web3 Impact Campaign', href: '/whats-new#update-15', comingSoon: false, category: 'updates' },
        { title: 'Web3 Impact Chains for 2025: Base, Solana & Avalanche', href: '/whats-new#update-14', comingSoon: false, category: 'updates' },
        { title: 'Leaderboard Extras & Scoring: robPoints + Wipeout Restores', href: '/whats-new#update-12', comingSoon: false, category: 'updates' },
        { title: 'Admin-Only Flow, Template Gating & Hardening', href: '/whats-new#update-10', comingSoon: false, category: 'updates' },
      ],
    },
  ];

  // JSON-LD (CollectionPage + ItemList)
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'FundRaisely Blog & Resources',
      description:
        'Guides, articles, case studies, and platform updates to help schools, clubs, and charities run transparent, compliant, high-impact fundraisers.',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'FundRaisely Blog & Resources — Sections',
      itemListElement: sections.map((section, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: section.title,
        url: `/blog#${section.id}`,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: '/' },
        { '@type': 'ListItem', position: 2, name: 'Blog & Resources', item: '/blog' },
      ],
    },
  ];

  // Mock featured post (first post if exists)
  const featuredPost = latestPosts.length > 0 ? latestPosts[0] : null;
  const regularPosts = latestPosts.slice(1);

  // Filter logic
  const filteredPosts = regularPosts.filter(post => {
    const postCategory = post.category?.toLowerCase() || 'articles';
    const matchesCategory = activeCategory === 'all' || postCategory === activeCategory.toLowerCase();
    const matchesSearch = searchQuery === '' || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.description && post.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <SEO
        title="FundRaisely Blog & Resources: Your Guide to Impactful Fundraising"
        description="Guides, articles, case studies, and platform updates to help schools, clubs, and charities fundraise simply, transparently, and compliantly."
        keywords="fundraising guides, fundraising tips, charity quiz resources, community fundraising best practices"
        type="website"
        structuredData={structuredData}
      />

      <Header />

      {/* Hero Section */}
      <section className="relative px-4 pt-12 pb-8">
        <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-purple-300/30 blur-2xl" />
        <div className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-indigo-300/30 blur-2xl" />
        <div className="container relative z-10 mx-auto max-w-6xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-indigo-700 text-sm font-medium">
            <Sparkles className="h-4 w-4" /> Knowledge Hub
          </span>
          <h1 className="mt-4 bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent text-4xl md:text-6xl font-bold">
            Blog &amp; Resources
          </h1>
          <p className="mx-auto mt-4 max-w-4xl text-indigo-900/70 text-lg md:text-xl leading-relaxed">
            Your complete guide to impactful fundraising. Discover expert guides, inspiring case studies, and the latest platform updates to help your mission succeed.
          </p>
        </div>
      </section>

      {/* Category Filter & Search */}
      <section className="px-4 pb-8">
        <div className="container mx-auto max-w-6xl">
          {/* Category Pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            {categories.map(category => {
              const Icon = category.icon;
              const colors = categoryColors[category.id];
              const isActive = activeCategory === category.id;
              
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 font-semibold transition-all duration-300 ${
                    isActive
                      ? `${colors.iconBg} text-white shadow-lg scale-105`
                      : `bg-white ${colors.badgeText} border ${colors.borderColor} hover:shadow-md hover:scale-102`
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{category.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    isActive ? 'bg-white/20 text-white' : `${colors.badgeBg} ${colors.badgeText}`
                  }`}>
                    {category.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-400" />
              <input
                type="text"
                placeholder="Search articles, guides, and updates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-indigo-100 bg-white pl-12 pr-4 py-3 text-indigo-900 placeholder-indigo-400 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Featured Post Section */}
      {featuredPost && (
        <section className="px-4 pb-8">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-indigo-900 text-2xl font-bold mb-6 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-indigo-600" />
              Featured Post
            </h2>
            <Link
              to={`/blog/${featuredPost.slug}`}
              className="group block rounded-2xl border border-indigo-100 bg-white overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
            >
              <div className="grid md:grid-cols-2 gap-6 p-8">
                {/* Left side - Content */}
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                      getCategoryColors(featuredPost.category).badgeBg
                    } ${getCategoryColors(featuredPost.category).badgeText}`}>
                      <Tag className="h-3 w-3" />
                      {featuredPost.category || 'Article'}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-indigo-900/60">
                      <Calendar className="h-3 w-3" />
                      {new Date(featuredPost.date).toLocaleDateString('en-GB', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-indigo-900 group-hover:text-indigo-700 transition-colors mb-3">
                    {featuredPost.title}
                  </h3>
                  {featuredPost.description && (
                    <p className="text-indigo-900/70 text-lg leading-relaxed mb-4">
                      {featuredPost.description}
                    </p>
                  )}
                  <div className="inline-flex items-center gap-2 text-indigo-700 font-semibold group-hover:gap-3 transition-all">
                    Read Full Article
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </div>

                {/* Right side - Visual */}
                <div className="flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl p-12">
                  <div className={`inline-flex h-32 w-32 items-center justify-center rounded-full ${
                    getCategoryColors(featuredPost.category).iconBg
                  } shadow-2xl group-hover:scale-110 transition-transform duration-300`}>
                    <Sparkles className="h-16 w-16 text-white" />
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Latest Posts Grid */}
      <section className="px-4 pb-12">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-indigo-900 text-2xl font-bold mb-6">Latest Posts</h2>

          {filteredPosts.length === 0 ? (
            <div className="rounded-2xl border border-indigo-100 bg-white p-12 text-center shadow-sm">
              <BookOpen className="h-12 w-12 text-indigo-300 mx-auto mb-4" />
              <p className="text-indigo-900/70 text-lg">
                {searchQuery ? 'No posts match your search.' : 'New articles are coming soon.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredPosts.map((post) => {
                const colors = getCategoryColors(post.category);
                
                return (
                  <article
                    key={post.slug}
                    className={`group rounded-2xl border ${colors.borderColor} bg-white p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 flex flex-col`}
                  >
                    {/* Category Badge & Date */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${colors.badgeBg} ${colors.badgeText}`}>
                        <Tag className="h-3 w-3" />
                        {post.category || 'Article'}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-indigo-900/60">
                        <Calendar className="h-3 w-3" />
                        {new Date(post.date).toLocaleDateString('en-GB', { 
                          day: 'numeric', 
                          month: 'short' 
                        })}
                      </span>
                    </div>

                    {/* Icon */}
                    <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full ${colors.iconBg} ${colors.iconColor} shadow-md group-hover:shadow-lg transition-all`}>
                      <FileText className="h-5 w-5" />
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-semibold text-indigo-900 group-hover:text-indigo-700 transition-colors mb-2 line-clamp-2 flex-grow">
                      {post.title}
                    </h3>

                    {/* Description */}
                    {post.description && (
                      <p className="text-sm text-indigo-900/70 mb-4 line-clamp-3">
                        {post.description}
                      </p>
                    )}

                    {/* Read More Link */}
                    <Link
                      to={`/blog/${post.slug}`}
                      className={`inline-flex items-center gap-2 text-sm font-semibold ${colors.badgeText} group-hover:gap-3 transition-all mt-auto`}
                    >
                      Read More
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Coming Soon Content Sections */}
      <section className="px-4 py-12 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-indigo-900 text-3xl md:text-4xl font-bold mb-4">More Content Coming Soon</h2>
            <p className="text-indigo-900/70 text-lg max-w-3xl mx-auto leading-relaxed">
              We're working hard to bring you comprehensive guides, inspiring case studies, and platform updates. Check back regularly for new content.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {sections.map((section) => {
              const Icon = section.icon;
              const colors = categoryColors[section.id];
              
              return (
                <div
                  key={section.id}
                  className={`rounded-2xl border ${colors.borderColor} bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${colors.iconBg} ${colors.iconColor} shadow-lg`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="text-indigo-900 text-xl font-semibold">{section.title}</h3>
                    </div>
                    {section.id === 'updates' && (
                      <a
                        href="/whats-new"
                        className={`text-xs font-semibold ${colors.badgeText} hover:underline flex items-center gap-1`}
                      >
                        View All
                        <ArrowRight className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <p className="text-indigo-900/70 text-sm mb-4">{section.blurb}</p>
                  
                  <ul className="space-y-2">
                    {section.items.map((item, idx) => (
                      <li key={idx} className={`rounded-lg border ${colors.borderColor} bg-gradient-to-r ${colors.hoverBg.replace('hover:', '')} p-3`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-indigo-900 mb-1">{item.title}</div>
                            {item.comingSoon ? (
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${colors.badgeBg} ${colors.badgeText}`}>
                                <Sparkles className="h-3 w-3" />
                                Coming Soon
                              </span>
                            ) : (
                              <a
                                href={item.href}
                                className={`inline-flex items-center gap-1 text-xs font-semibold ${colors.badgeText} hover:underline`}
                              >
                                Read More
                                <ArrowRight className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Newsletter/CTA Section */}
      <section className="px-4 py-12">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-700 to-purple-600 p-8 md:p-12 shadow-lg text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Stay Updated with Our Latest Content</h2>
            <p className="text-lg max-w-3xl mx-auto leading-relaxed mb-8 text-indigo-100">
              Join our community and be the first to know when we publish new guides, case studies, and platform updates. We're committed to helping you achieve your fundraising goals.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/contact"
                className="rounded-xl bg-white px-8 py-4 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50 transition-colors text-lg"
              >
                Suggest a Topic
              </Link>
              <Link
                to="/free-trial"
                className="rounded-xl bg-indigo-800 px-8 py-4 text-white font-semibold shadow-md hover:bg-indigo-900 border border-indigo-600 transition-colors text-lg"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default BlogAndResources;
