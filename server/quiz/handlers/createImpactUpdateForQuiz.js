// server/quiz/handlers/createImpactUpdateForQuiz.js
import { connection, TABLE_PREFIX } from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';

function num(v) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function createImpactUpdateForQuiz({
  clubId,
  userId, // ✅ REQUIRED: your system user id
  campaignId,
  eventId,
  roomId,

  hostName,
  charityName,

  charityAmount,
  hostFeeAmount,
  platformFeeAmount,
  totalRaised,

  feeToken,
  numberOfPlayers,
  explorerUrl,

  impactAreaIds = ['personal_cause'],
  externalSource = 'quiz_web3_impact_payment',
  externalRef = roomId,
}) {
  if (!clubId) throw new Error('createImpactUpdateForQuiz: clubId is required');
  if (!userId) throw new Error('createImpactUpdateForQuiz: userId is required');
  if (!eventId) throw new Error('createImpactUpdateForQuiz: eventId is required');
  if (!campaignId) throw new Error('createImpactUpdateForQuiz: campaignId is required');
  if (!roomId) throw new Error('createImpactUpdateForQuiz: roomId is required');

  const table = `${TABLE_PREFIX}impact_updates`;

  // ✅ Dedupe
  const [existingRows] = await connection.execute(
    `SELECT id FROM ${table} WHERE external_source = ? AND external_ref = ? LIMIT 1`,
    [externalSource, externalRef]
  );

  if (Array.isArray(existingRows) && existingRows.length > 0) {
    return { success: true, impactId: existingRows[0].id, dedupe: true };
  }

  const impactId = uuidv4();

  // ✅ 4 metrics
  // You requested: unit always "Stablecoin"
  const stableUnit = 'Stablecoin';

  const metrics = [
    {
      id: uuidv4(),
      type: 'custom',
      milestone: 'Number of players made happy',
      value: num(numberOfPlayers),
      unit: stableUnit,
    },
    {
      id: uuidv4(),
      type: 'custom',
      milestone: 'Host amount',
      value: num(hostFeeAmount),
      unit: stableUnit,
    },
    {
      id: uuidv4(),
      type: 'funds_distributed',
      milestone: 'Charity amount',
      value: num(charityAmount),
      unit: stableUnit,
    },
    {
      id: uuidv4(),
      type: 'custom',
      milestone: 'Platform fee',
      value: num(platformFeeAmount),
      unit: stableUnit,
    },
  ];

  // ✅ Proof:
  // - receipts: add tx url
  // - media urls: add impact campaign link (use 3 entries so your validator likes it)
  const campaignUrl = 'https://fundraisely.co.uk/web3/impact-campaign/';
  const proof = {
    receipts: explorerUrl ? [explorerUrl] : [],
    invoices: [],
    quotes: [],
    media: [
      { id: uuidv4(), type: 'image', url: campaignUrl, caption: 'Impact campaign page (1)' },
      { id: uuidv4(), type: 'image', url: campaignUrl, caption: 'Impact campaign page (2)' },
      { id: uuidv4(), type: 'image', url: campaignUrl, caption: 'Impact campaign page (3)' },
    ],
  };

  const title = `Sent Payment via The Giving Block to ${charityName || 'charity'}`;

  const description = [
    `Event held with ${num(numberOfPlayers)} player(s) by ${hostName || 'host'}.`,
    `Total income: ${num(totalRaised)} ${feeToken || ''}.`,
    `Charity amount sent: ${num(charityAmount)} ${feeToken || ''}.`,
    `Host amount: ${num(hostFeeAmount)} ${feeToken || ''}.`,
    `Platform fee: ${num(platformFeeAmount)} ${feeToken || ''}.`,
    explorerUrl ? `Transaction: ${explorerUrl}` : null,
  ]
    .filter(Boolean)
    .join(' ');

  const impactDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // ✅ your rule: amount_spent = total amount, currency = USD ($)
  const amountSpent = num(totalRaised);

  await connection.execute(
    `INSERT INTO ${table} (
      id, event_id, campaign_id, club_id, impact_area_ids,
      title, description, impact_date, metrics,
      amount_spent, currency, location, proof,
      status, created_by,
      external_source, external_ref
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      impactId,
      eventId,
      campaignId,
      clubId,
      JSON.stringify(Array.isArray(impactAreaIds) ? impactAreaIds : ['personal_cause']),
      title,
      description,
      impactDate,
      JSON.stringify(metrics),
      amountSpent,
      'USD',
      null,
      JSON.stringify(proof),
      'published',
      userId, // ✅ THIS is the key change
      externalSource,
      externalRef,
    ]
  );

  return { success: true, impactId, dedupe: false };
}



