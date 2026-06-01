// server/src/services/ImpactService.js

import { v4 as uuidv4 } from 'uuid';
import { connection, TABLE_PREFIX } from '../../config/database.js';
class ImpactService {
  constructor() {
    this.prefix = TABLE_PREFIX;
  }

  // ---- Helpers ----
  _safeJsonParse(value, fallback = null) {
    if (!value) return fallback;
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch (e) {
      return fallback;
    }
  }

  _safeJsonParseArray(value, fallback = []) {
    if (!value) return fallback;
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (e) {
      return fallback;
    }
  }

  _normalizeStringArray(arr) {
    if (!Array.isArray(arr)) return [];
    return arr
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .filter(Boolean);
  }

  _hydrateImpactRow(row) {
    if (!row) return row;

    // Parse JSON fields
    row.impact_area_ids = this._safeJsonParseArray(row.impact_area_ids, []);
    row.metrics = this._safeJsonParseArray(row.metrics, []);
    row.location = this._safeJsonParse(row.location, null);
    row.proof = this._safeJsonParse(row.proof, {
      receipts: [],
      invoices: [],
      quotes: [],
      media: [],
    });

    return row;
  }

  _normalizeMetrics(metrics) {
    if (!Array.isArray(metrics)) return [];
    
    return metrics
      .map((metric) => {
        if (!metric || typeof metric !== 'object') return null;
        
        return {
          id: metric.id || uuidv4(),
          type: metric.type || 'custom',
          milestone: metric.milestone ? String(metric.milestone).trim() : '',
          value: parseFloat(metric.value) || 0,
          unit: metric.unit ? String(metric.unit).trim() : undefined,
        };
      })
      .filter((m) => m && m.milestone && m.value > 0);
  }

  _normalizeProof(proof) {
    if (!proof || typeof proof !== 'object') {
      return {
        receipts: [],
        invoices: [],
        quotes: [],
        media: [],
      };
    }

    return {
      receipts: Array.isArray(proof.receipts) ? proof.receipts.filter(Boolean) : [],
      invoices: Array.isArray(proof.invoices) ? proof.invoices.filter(Boolean) : [],
      quotes: Array.isArray(proof.quotes)
        ? proof.quotes
            .map((q) => ({
              id: q.id || uuidv4(),
              text: q.text ? String(q.text).trim() : '',
              attribution: q.attribution ? String(q.attribution).trim() : undefined,
              role: q.role ? String(q.role).trim() : undefined,
              date: q.date || undefined,
            }))
            .filter((q) => q.text)
        : [],
      media: Array.isArray(proof.media)
        ? proof.media
            .map((m) => ({
              id: m.id || uuidv4(),
              type: m.type === 'video' ? 'video' : 'image',
              url: m.url ? String(m.url).trim() : '',
              caption: m.caption ? String(m.caption).trim() : undefined,
              takenAt: m.takenAt || undefined,
            }))
            .filter((m) => m.url)
        : [],
    };
  }

  _normalizeLocation(location) {
    if (!location || typeof location !== 'object') return null;
    
    const lat = parseFloat(location.lat);
    const lng = parseFloat(location.lng);
    
    if (isNaN(lat) || isNaN(lng)) return null;

    return {
      lat,
      lng,
      address: location.address ? String(location.address).trim() : undefined,
      placeName: location.placeName ? String(location.placeName).trim() : undefined,
    };
  }

  // ---- Validation ----
  validateProof(proof, amountSpent, metrics = []) {
    const missing = [];
    let score = 0;

    const mediaCount = proof.media.length;
    const validMetrics = metrics.filter(m => m.value > 0).length;
    const receiptsCount = proof.receipts.length > 0 ? 1 : 0;
    const invoicesCount = proof.invoices.length > 0 ? 1 : 0;
    const quotesCount = proof.quotes.length;

    // Media - 15 points each, max 4 counted (60 points max)
    const mediaCounted = Math.min(mediaCount, 4);
    score += mediaCounted * 15;
    
    if (mediaCount < 3) {
      missing.push(`Need ${3 - mediaCount} more photo(s)/video(s) (minimum 3 required)`);
    }

    // Metrics - 20 points each, max 4 counted (80 points max)
    const metricsCounted = Math.min(validMetrics, 4);
    score += metricsCounted * 20;
    
    if (validMetrics < 1) {
      missing.push('At least 1 impact metric with value > 0 required');
    }

    // Financial proof - 40 points each type, max 1 of each (120 points max)
    // Receipts, invoices, and other documents count separately
    let financialProofCount = 0;
    if (receiptsCount > 0) {
      score += 40;
      financialProofCount++;
    }
    if (invoicesCount > 0) {
      score += 40;
      financialProofCount++;
    }
    // Note: "other documents" would be a separate array if we add it later
    
    if (amountSpent && amountSpent > 0 && financialProofCount === 0) {
      missing.push('At least one receipt, invoice, or proof document required when money spent');
    } else if (!amountSpent || amountSpent === 0) {
      // No money spent, no financial proof needed - this is fine
    }

    // Testimonials - 10 points each, max 5 counted (50 points max)
    // These are optional and added later by admin approval
    const testimonialsCounted = Math.min(quotesCount, 5);
    score += testimonialsCounted * 10;

    return {
      hasReceipts: receiptsCount > 0,
      hasInvoices: invoicesCount > 0,
      hasQuotes: quotesCount > 0,
      hasMedia: mediaCount > 0,
      mediaCount,
      mediaCounted,
      metricsCount: validMetrics,
      metricsCounted,
      financialProofCount,
      testimonialsCount: quotesCount,
      testimonialsCounted,
      score,
      missingElements: missing,
    };
  }

  canPublishImpact(impactUpdate) {
    const validation = this.validateProof(
      impactUpdate.proof, 
      impactUpdate.amount_spent,
      impactUpdate.metrics
    );

    // For basic publishing, be VERY lenient
    // Must have at least 1 photo/video OR 1 metric
    const hasContent = validation.hasMedia || validation.metricsCount > 0;
    
    if (!hasContent) {
      return { allowed: false, reason: 'At least one photo/video OR one impact metric is required' };
    }

    // Must have receipts if money was spent in THIS update
    if (impactUpdate.amount_spent && impactUpdate.amount_spent > 0 && !validation.hasReceipts && !validation.hasInvoices) {
      return { allowed: false, reason: 'Receipt or invoice required when reporting expenditure' };
    }

    // That's it! No score requirement for publishing
    return { allowed: true };
  }

  /**
   * Validate aggregate proof across all updates for marking as final
   */
  validateAggregateProof(allUpdates) {
    const missing = [];
    let score = 0;

    // Aggregate counts
    let totalMedia = 0;
    let totalMetrics = 0;
    let totalQuotes = 0;
    let hasReceipts = false;
    let hasInvoices = false;
    let hasOtherDocs = false;
    let anyMoneySpent = false;

    allUpdates.forEach(update => {
      totalMedia += update.proof.media.length;
      totalQuotes += update.proof.quotes.length;
      totalMetrics += update.metrics.filter(m => m.value > 0).length;
      
      if (update.proof.receipts.length > 0) {
        hasReceipts = true;
      }
      if (update.proof.invoices.length > 0) {
        hasInvoices = true;
      }
      // Note: other_documents would be checked here when added
      
      if (update.amount_spent && update.amount_spent > 0) {
        anyMoneySpent = true;
      }
    });

    // Media - 15 points each, max 4 counted (60 points max)
    const mediaCounted = Math.min(totalMedia, 4);
    score += mediaCounted * 15;
    
    if (totalMedia < 3) {
      missing.push(`Need ${3 - totalMedia} more photo(s)/video(s) (currently have ${totalMedia}, minimum 3 required)`);
    }

    // Metrics - 20 points each, max 4 counted (80 points max)
    const metricsCounted = Math.min(totalMetrics, 4);
    score += metricsCounted * 20;
    
    if (totalMetrics < 1) {
      missing.push('At least 1 impact metric with value > 0 required');
    }

    // Financial proof - 40 points each type (120 points max)
    let financialProofCount = 0;
    if (hasReceipts) {
      score += 40;
      financialProofCount++;
    }
    if (hasInvoices) {
      score += 40;
      financialProofCount++;
    }
    if (hasOtherDocs) {
      score += 40;
      financialProofCount++;
    }
    
    if (anyMoneySpent && financialProofCount === 0) {
      missing.push('At least one receipt, invoice, or proof document required as money was spent');
    }

    // Testimonials - 10 points each, max 5 counted (50 points max)
    const testimonialsCounted = Math.min(totalQuotes, 5);
    score += testimonialsCounted * 10;

    return {
      totalMedia,
      mediaCounted,
      totalMetrics,
      metricsCounted,
      totalQuotes,
      testimonialsCounted,
      hasReceipts,
      hasInvoices,
      hasOtherDocs,
      financialProofCount,
      anyMoneySpent,
      score,
      missingElements: missing,
      meetsRequirements: missing.length === 0 && score >= 80,
    };
  }

  /**
   * Check if an impact can be marked as final
   */
  async canMarkAsFinal(impactId, clubId) {
    const impact = await this.getImpactById(impactId, clubId);
    if (!impact) {
      return { allowed: false, reason: 'Impact update not found' };
    }

    if (impact.status !== 'published') {
      return { allowed: false, reason: 'Only published updates can be marked as final' };
    }

    // Check if this is for an event or campaign
    const entityType = impact.event_id ? 'event' : 'campaign';
    const entityId = impact.event_id || impact.campaign_id;

    // Check if already has a final update
    const existingFinal = await this.checkExistingFinal(entityType, entityId, clubId);
    if (existingFinal) {
      return { 
        allowed: false, 
        reason: 'This event/campaign already has a final impact update marked' 
      };
    }

    // Get all published updates for this entity
    const allUpdates = entityType === 'event'
      ? await this.getImpactByEvent(entityId, clubId, 'published')
      : await this.getImpactByCampaign(entityId, clubId, 'published');

    // Validate aggregate
    const validation = this.validateAggregateProof(allUpdates);

    if (!validation.meetsRequirements) {
      return {
        allowed: false,
        reason: `Requirements not met. Missing: ${validation.missingElements.join(', ')}`,
        validation,
      };
    }

    return { allowed: true, validation };
  }

  /**
   * Check if entity already has a final update
   */
  async checkExistingFinal(entityType, entityId, clubId) {
    const field = entityType === 'event' ? 'event_id' : 'campaign_id';
    const [rows] = await database.connection.execute(
      `SELECT id FROM ${this.prefix}impact_updates 
       WHERE ${field} = ? AND club_id = ? AND is_final = 1 LIMIT 1`,
      [entityId, clubId]
    );
    return rows && rows.length > 0;
  }

  /**
   * Mark an impact update as final
   */
  async markAsFinal(impactId, clubId, userId) {
    // Validate can mark as final
    const validation = await this.canMarkAsFinal(impactId, clubId);
    if (!validation.allowed) {
      throw new Error(validation.reason);
    }

    const impact = await this.getImpactById(impactId, clubId);
    
    // Check ownership
    if (impact.created_by !== userId) {
      throw new Error('Only the creator can mark this as final');
    }

    // Mark as final
    await database.connection.execute(
      `UPDATE ${this.prefix}impact_updates SET is_final = 1 WHERE id = ? AND club_id = ?`,
      [impactId, clubId]
    );

    // Update entity status to complete
    const entityType = impact.event_id ? 'event' : 'campaign';
    const entityId = impact.event_id || impact.campaign_id;
    const table = entityType === 'event' ? 'events' : 'campaigns';

    await database.connection.execute(
      `UPDATE ${this.prefix}${table} SET impact_status = 'complete' WHERE id = ?`,
      [entityId]
    );

    return await this.getImpactById(impactId, clubId);
  }

  // ---- CRUD Operations ----
  async createImpact(clubId, userId, impactData) {
    const {
      event_id,
      campaign_id,
      impact_area_ids,
      title,
      description,
      impact_date,
      metrics,
      amount_spent,
      currency,
      location,
      proof,
      status,
    } = impactData;

    const impactId = uuidv4();

    const normalizedMetrics = this._normalizeMetrics(metrics);
    const normalizedProof = this._normalizeProof(proof);
    const normalizedLocation = this._normalizeLocation(location);
    const normalizedImpactAreas = this._normalizeStringArray(impact_area_ids);

    const metricsJson = JSON.stringify(normalizedMetrics);
    const proofJson = JSON.stringify(normalizedProof);
    const locationJson = normalizedLocation ? JSON.stringify(normalizedLocation) : null;
    const impactAreasJson = JSON.stringify(normalizedImpactAreas);

    await database.connection.execute(
      `INSERT INTO ${this.prefix}impact_updates (
        id, event_id, campaign_id, club_id, impact_area_ids,
        title, description, impact_date, metrics,
        amount_spent, currency, location, proof,
        status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        impactId,
        event_id,
        campaign_id || null,
        clubId,
        impactAreasJson,
        title,
        description,
        impact_date,
        metricsJson,
        amount_spent || null,
        currency || 'EUR',
        locationJson,
        proofJson,
        status || 'draft',
        userId,
      ]
    );

    const [rows] = await database.connection.execute(
      `SELECT * FROM ${this.prefix}impact_updates WHERE id = ?`,
      [impactId]
    );

    const impact = Array.isArray(rows) ? rows[0] : null;
    return this._hydrateImpactRow(impact);
  }

  async getImpactById(impactId, clubId) {
    const [rows] = await database.connection.execute(
      `SELECT * FROM ${this.prefix}impact_updates WHERE id = ? AND club_id = ?`,
      [impactId, clubId]
    );

    const impact = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    return this._hydrateImpactRow(impact);
  }

  async getImpactByEvent(eventId, clubId, status = null) {
    let query = `SELECT * FROM ${this.prefix}impact_updates WHERE event_id = ? AND club_id = ?`;
    const params = [eventId, clubId];

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }

    query += ` ORDER BY impact_date DESC, created_at DESC`;

    const [rows] = await database.connection.execute(query, params);

    return (rows || []).map((row) => this._hydrateImpactRow(row));
  }

  async getImpactByCampaign(campaignId, clubId, status = null) {
    // Get direct campaign impact + impact from events in the campaign
    let query = `SELECT * FROM ${this.prefix}impact_updates WHERE campaign_id = ? AND club_id = ?`;
    const params = [campaignId, clubId];

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }

    query += ` ORDER BY impact_date DESC, created_at DESC`;

    const [rows] = await database.connection.execute(query, params);

    return (rows || []).map((row) => this._hydrateImpactRow(row));
  }

  async getImpactByClub(clubId, filters = {}) {
    let query = `SELECT * FROM ${this.prefix}impact_updates WHERE club_id = ?`;
    const params = [clubId];

    if (filters.status) {
      query += ` AND status = ?`;
      params.push(filters.status);
    }

    if (filters.event_id) {
      query += ` AND event_id = ?`;
      params.push(filters.event_id);
    }

    if (filters.campaign_id) {
      query += ` AND campaign_id = ?`;
      params.push(filters.campaign_id);
    }

    query += ` ORDER BY impact_date DESC, created_at DESC`;

    const [rows] = await database.connection.execute(query, params);

    return (rows || []).map((row) => this._hydrateImpactRow(row));
  }

  async updateImpact(impactId, clubId, userId, updateData) {
    // First check if impact exists and is in draft status
    const existing = await this.getImpactById(impactId, clubId);
    if (!existing) {
      return null;
    }

    if (existing.status !== 'draft') {
      throw new Error('Only draft impact updates can be edited');
    }

    if (existing.created_by !== userId) {
      throw new Error('Only the creator can edit this impact update');
    }

    const allowedFields = [
      'title',
      'description',
      'impact_date',
      'metrics',
      'amount_spent',
      'currency',
      'location',
      'proof',
      'impact_area_ids',
    ];

    const updateFields = Object.keys(updateData).filter(
      (key) => allowedFields.includes(key) && updateData[key] !== undefined
    );

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    const processedData = { ...updateData };

    // Normalize complex fields
    if (processedData.metrics !== undefined) {
      processedData.metrics = JSON.stringify(this._normalizeMetrics(processedData.metrics));
    }

    if (processedData.proof !== undefined) {
      processedData.proof = JSON.stringify(this._normalizeProof(processedData.proof));
    }

    if (processedData.location !== undefined) {
      const normalized = this._normalizeLocation(processedData.location);
      processedData.location = normalized ? JSON.stringify(normalized) : null;
    }

    if (processedData.impact_area_ids !== undefined) {
      processedData.impact_area_ids = JSON.stringify(
        this._normalizeStringArray(processedData.impact_area_ids)
      );
    }

    const setClause = updateFields.map((field) => `${field} = ?`).join(', ');
    const values = updateFields.map((field) => processedData[field]);
    values.push(impactId, clubId);

    const [result] = await database.connection.execute(
      `UPDATE ${this.prefix}impact_updates SET ${setClause} WHERE id = ? AND club_id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return null;
    }

    return await this.getImpactById(impactId, clubId);
  }

  async deleteImpact(impactId, clubId, userId) {
    // Check if impact exists and is draft
    const existing = await this.getImpactById(impactId, clubId);
    if (!existing) {
      return false;
    }

    if (existing.status !== 'draft') {
      throw new Error('Only draft impact updates can be deleted');
    }

    if (existing.created_by !== userId) {
      throw new Error('Only the creator can delete this impact update');
    }

    const [result] = await database.connection.execute(
      `DELETE FROM ${this.prefix}impact_updates WHERE id = ? AND club_id = ?`,
      [impactId, clubId]
    );

    return result.affectedRows > 0;
  }

  async publishImpact(impactId, clubId, userId) {
    const impact = await this.getImpactById(impactId, clubId);
    if (!impact) {
      return null;
    }

    if (impact.status !== 'draft') {
      throw new Error('Only draft impact updates can be published');
    }

    if (impact.created_by !== userId) {
      throw new Error('Only the creator can publish this impact update');
    }

    // Validate before publishing
    const validation = this.canPublishImpact(impact);
    if (!validation.allowed) {
      throw new Error(validation.reason);
    }

    const [result] = await database.connection.execute(
      `UPDATE ${this.prefix}impact_updates 
       SET status = 'published', published_at = NOW() 
       WHERE id = ? AND club_id = ?`,
      [impactId, clubId]
    );

    if (result.affectedRows === 0) {
      return null;
    }

    // Update entity impact_status to 'in_progress' (has some impact but not final)
    await this.updateImpactStatus(impact.event_id, impact.campaign_id);

    return await this.getImpactById(impactId, clubId);
  }

  async updateImpactStatus(eventId, campaignId) {
    // Mark event as having impact in progress
    if (eventId) {
      await database.connection.execute(
        `UPDATE ${this.prefix}events 
         SET impact_status = 'in_progress' 
         WHERE id = ? AND impact_status = 'pending'`,
        [eventId]
      );
    }

    // Mark campaign as having impact in progress
    if (campaignId) {
      await database.connection.execute(
        `UPDATE ${this.prefix}campaigns 
         SET impact_status = 'in_progress' 
         WHERE id = ? AND impact_status = 'pending'`,
        [campaignId]
      );
    }
  }

  // ---- Aggregation ----
  async getEventImpactSummary(eventId, clubId) {
    const updates = await this.getImpactByEvent(eventId, clubId, 'published');

    return this._aggregateImpactUpdates('event', eventId, updates);
  }

  async getCampaignImpactSummary(campaignId, clubId) {
    const updates = await this.getImpactByCampaign(campaignId, clubId, 'published');

    return this._aggregateImpactUpdates('campaign', campaignId, updates);
  }

  _aggregateImpactUpdates(entityType, entityId, updates) {
    const metricsMap = new Map();
    const impactAreas = new Set();
    const locations = [];
    let totalAmountSpent = 0;
    let totalProofScore = 0;

    updates.forEach((update) => {
      // Aggregate metrics by milestone
      update.metrics.forEach((metric) => {
        const current = metricsMap.get(metric.milestone) || 0;
        metricsMap.set(metric.milestone, current + metric.value);
      });

      // Collect impact areas
      update.impact_area_ids.forEach((areaId) => impactAreas.add(areaId));

      // Collect locations
      if (update.location) {
        locations.push(update.location);
      }

      // Sum financial
      if (update.amount_spent) {
        totalAmountSpent += parseFloat(update.amount_spent);
      }

      // Average proof completeness
      const validation = this.validateProof(update.proof, update.amount_spent);
      totalProofScore += validation.score;
    });

    const avgProofCompleteness = updates.length > 0 ? totalProofScore / updates.length : 0;

    const latestUpdate =
      updates.length > 0
        ? new Date(Math.max(...updates.map((u) => new Date(u.impact_date).getTime())))
        : null;

    // Convert Map to object for JSON serialization
    const aggregatedMetrics = {};
    metricsMap.forEach((value, key) => {
      aggregatedMetrics[key] = value;
    });

    return {
      entityType,
      entityId,
      totalUpdates: updates.length,
      totalAmountSpent: Math.round(totalAmountSpent * 100) / 100,
      aggregatedMetrics,
      impactAreaIds: Array.from(impactAreas),
      locations,
      latestUpdate,
      proofCompleteness: Math.round(avgProofCompleteness),
    };
  }

  /**
   * Calculate aggregate score for display purposes
   */
  calculateAggregateScore(allUpdates) {
    let totalMedia = 0;
    let totalMetrics = 0;
    let totalQuotes = 0;
    let hasReceipts = false;
    let hasInvoices = false;

    allUpdates.forEach(update => {
      totalMedia += update.proof.media.length;
      totalQuotes += update.proof.quotes.length;
      totalMetrics += update.metrics.filter(m => m.value > 0).length;
      
      if (update.proof.receipts.length > 0) hasReceipts = true;
      if (update.proof.invoices.length > 0) hasInvoices = true;
    });

    // Calculate points
    const mediaCounted = Math.min(totalMedia, 4);
    const mediaPoints = mediaCounted * 15;

    const metricsCounted = Math.min(totalMetrics, 4);
    const metricsPoints = metricsCounted * 20;

    let financialPoints = 0;
    if (hasReceipts) financialPoints += 40;
    if (hasInvoices) financialPoints += 40;

    const testimonialsCounted = Math.min(totalQuotes, 5);
    const testimonialPoints = testimonialsCounted * 10;

    const totalScore = mediaPoints + metricsPoints + financialPoints + testimonialPoints;

    return {
      score: totalScore,
      breakdown: {
        mediaPoints,
        metricsPoints,
        financialPoints,
        testimonialPoints,
      },
      counts: {
        media: totalMedia,
        metrics: totalMetrics,
        testimonials: totalQuotes,
        hasReceipts,
        hasInvoices,
      },
    };
  }

  // ---- Trust Status ----
  async checkTrustStatus(clubId) {
    // Find completed events in last 90 days without complete impact
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');

    const [eventRows] = await database.connection.execute(
      `SELECT id, event_date 
       FROM ${this.prefix}events 
       WHERE club_id = ? 
       AND status = 'ended' 
       AND (impact_status = 'pending' OR impact_status = 'in_progress')
       AND event_date >= ?`,
      [clubId, ninetyDaysAgo]
    );

    const outstandingCount = eventRows?.length || 0;

    // Calculate most overdue
    const mostOverdue =
      eventRows?.reduce((max, event) => {
        const daysSince = Math.floor(
          (Date.now() - new Date(event.event_date).getTime()) / (24 * 60 * 60 * 1000)
        );
        return daysSince > max ? daysSince : max;
      }, 0) || 0;

    // Block if more than 2 outstanding OR overdue by 30+ days
    const shouldBlock = outstandingCount > 2 || mostOverdue > 30;

    return {
      canCreateCampaign: !shouldBlock,
      canCreateEvent: !shouldBlock,
      outstandingImpactReports: outstandingCount,
      overdueDays: mostOverdue,
      reason: shouldBlock
        ? `${outstandingCount} event(s) need complete impact reports. Most overdue by ${mostOverdue} days.`
        : undefined,
    };
  }

  async getOutstandingImpactReports(clubId) {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');

    const [rows] = await database.connection.execute(
      `SELECT id, title, event_date, campaign_id 
       FROM ${this.prefix}events 
       WHERE club_id = ? 
       AND status = 'ended' 
       AND (impact_status = 'pending' OR impact_status = 'in_progress')
       AND event_date >= ?
       ORDER BY event_date ASC`,
      [clubId, ninetyDaysAgo]
    );

    return rows || [];
  }
}

export default ImpactService;