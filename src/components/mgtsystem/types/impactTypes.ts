// impactTypes.ts

import type { ImpactAreaId } from './impactAreas';

export type ImpactStatus = 'draft' | 'published' | 'verified' | 'flagged';

export type ImpactMetricType = 
  | 'people_helped'
  | 'items_delivered'
  | 'services_provided'
  | 'volunteer_hours'
  | 'meals_served'
  | 'supplies_purchased'
  | 'funds_distributed'
  | 'custom';

export type ImpactMetric = {
  id: string;
  type: ImpactMetricType;
  milestone: string; // "Families fed", "Volunteer hours", "Laptops distributed"
  value: number;
  unit?: string; // "families", "hours", "laptops" - optional for context
};

export type ImpactQuote = {
  id: string;
  text: string;
  attribution?: string; // "Sarah, volunteer coordinator"
  role?: string; // "Beneficiary", "Volunteer", "Parent"
  date?: Date;
};

export type ImpactMedia = {
  id: string;
  type: 'image' | 'video';
  url: string;
  caption?: string;
  takenAt?: Date;
};

export type ImpactLocation = {
  lat: number;
  lng: number;
  address?: string;
  placeName?: string; // "St. Mary's School, Tallaght"
};

export type ImpactProof = {
  receipts: string[]; // URLs to receipt images
  invoices: string[]; // URLs to invoice PDFs
  quotes: ImpactQuote[];
  media: ImpactMedia[];
};

export type ImpactUpdate = {
  id: string;
  
  // Ownership & hierarchy
  eventId: string;
  campaignId?: string; // Derived from event or direct if campaign-level
  organizationId: string; // The club/school/charity
  
  // Classification
  impactAreaIds: ImpactAreaId[]; // Max 3 based on your constant
  
  // Content
  title: string; // "Medical Supplies Delivered to Local Hospital"
  description: string; // Rich text story of the impact
  impactDate: Date; // When the impact actually occurred
  
  // Metrics - flexible array
  metrics: ImpactMetric[];
  
  // Financial tracking
  amountSpent?: number;
  currency?: string; // Default to EUR
  
  // Location
  location?: ImpactLocation;
  
  // Evidence (MANDATORY)
  proof: ImpactProof;
  
  // Status & verification
  status: ImpactStatus;
  verificationNotes?: string; // Admin notes on verification
  
  // Meta
  createdBy: string; // userId
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
};

// Helper type for campaign/event rollup
export type ImpactSummary = {
  entityType: 'campaign' | 'event';
  entityId: string;
  totalUpdates: number;
  totalAmountSpent: number;
  aggregatedMetrics: Map<string, number>; // milestone -> total value
  impactAreaIds: ImpactAreaId[];
  locations: ImpactLocation[];
  latestUpdate?: Date;
  proofCompleteness: number; // 0-100% based on evidence provided
};