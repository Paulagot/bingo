// src/posts/registry.ts
import type { ComponentType } from "react";

export type PostMeta = {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO
  canonical?: string;
  image?: string;
  keywords?: string;
};

export type PostEntry = {
  meta: PostMeta;
  loader: () => Promise<{ default: ComponentType<any> }>;
};

export const posts: Record<string, PostEntry> = {
  "anonymous-donations-privacy-preserving-digital-giving": {
    meta: {
      slug: "anonymous-donations-privacy-preserving-digital-giving",
      title:
        "Anonymous Donations in 2025: How FundRaisely Brings Cash-Like Privacy to Digital Giving",
      description:
        "Cash is fading, but dignity in giving shouldn’t. See how FundRaisely’s hackathon prototype uses privacy-preserving receipts to protect donors while keeping charities confident and compliant.",
      date: "2025-10-25",
      canonical: "/blog/anonymous-donations-privacy-preserving-digital-giving",
      image: "/images/blog/privacy/hero-privacy-preserving-donations.jpg",
      keywords:
        "anonymous donations, privacy-preserving donations, donor privacy, privacy receipts, MPC receipts, Solana privacy, charity compliance, cash-like discretion, how to donate anonymously, private donations blockchain",
    },
    loader: () =>
      import("../blogs/privacy-preserving-donations.tsx").then((m) => ({
        default: m.default,
      })),
  },
};

export const allPostsMeta: PostMeta[] = Object.values(posts).map((p) => p.meta);

