import type { FAQItem } from "../sections/FAQSection";
import type { LinkItem, VideoSlot } from "../../content/types";
import { getMarketConfig } from "../../config/marketConfig";

const UK_DOMAIN = import.meta.env.VITE_UK_DOMAIN || "https://fundraisely.co.uk";
const IE_DOMAIN = import.meta.env.VITE_IE_DOMAIN || "https://fundraisely.ie";

function baseUrl() {
  return getMarketConfig().code === "ie" ? IE_DOMAIN : UK_DOMAIN;
}

function youtubeEmbedUrl(url?: string) {
  if (!url) return undefined;

  const shortMatch = url.match(/youtu\.be\/([A-Za-z0-9_-]+)/);
  if (shortMatch?.[1]) return `https://www.youtube.com/embed/${shortMatch[1]}`;

  const watchMatch = url.match(/[?&]v=([A-Za-z0-9_-]+)/);
  if (watchMatch?.[1]) return `https://www.youtube.com/embed/${watchMatch[1]}`;

  const embedMatch = url.match(/youtube\.com\/embed\/([A-Za-z0-9_-]+)/);
  if (embedMatch?.[1]) return url;

  return undefined;
}

export function webPageJsonLd(path: string, name: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url: `${baseUrl()}${path}`,
    isPartOf: {
      "@type": "WebSite",
      name: "FundRaisely",
      url: baseUrl(),
    },
  };
}

export function collectionPageJsonLd(
  path: string,
  name: string,
  description: string,
  items: LinkItem[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: `${baseUrl()}${path}`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.label,
        url: `${baseUrl()}${item.to}`,
      })),
    },
  };
}

export function faqJsonLd(items: FAQItem[]) {
  if (!items.length) return undefined;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function videoJsonLd(video: VideoSlot | undefined, path: string) {
  if (!video) return undefined;

  const envEmbedUrl = import.meta.env.VITE_DEMO_VIDEO_YT_ID
    ? `https://www.youtube.com/embed/${import.meta.env.VITE_DEMO_VIDEO_YT_ID}`
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: video.transcript ?? video.text,
    thumbnailUrl: [`${baseUrl()}/images/video-placeholder.jpg`],
    uploadDate: import.meta.env.VITE_DEMO_UPLOAD_DATE || "2026-01-01",
    embedUrl: youtubeEmbedUrl(video.videoUrl) ?? envEmbedUrl,
    url: video.videoUrl ?? `${baseUrl()}${path}`,
  };
}

export function compactStructuredData(
  items: Array<Record<string, unknown> | undefined>,
) {
  return items.filter(Boolean) as Record<string, unknown>[];
}
