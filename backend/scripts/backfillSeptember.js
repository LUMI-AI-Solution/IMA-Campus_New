const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('Fetching settings & businesses...');
  const crmSettings = await prisma.crmSettings.findMany();
  const bizSettingsMap = {};
  for (const s of crmSettings) {
    if (s.businessId) bizSettingsMap[s.businessId] = s;
  }

  const ratesSetting = await prisma.appSetting.findUnique({
    where: { key: 'WHATSAPP_BILLING_CONFIG' }
  });
  const rates = ratesSetting ? JSON.parse(ratesSetting.value) : {
    MARKETING: 0.0528, UTILITY: 0.0150, AUTHENTICATION: 0.0154, SERVICE: 0.0125, USD_TO_LKR: 305.00
  };

  console.log('Fetching September outgoing chat messages...');
  const msgs = await prisma.chatMessage.findMany({
    where: {
      createdAt: { gte: new Date('2026-09-01T00:00:00Z'), lt: new Date('2026-10-01T00:00:00Z') },
      direction: { in: ['outgoing', 'outbound', 'OUTGOING', 'OUTBOUND'] },
      metaMessageId: { not: null }
    },
    include: {
      lead: {
        select: {
          id: true, phone: true,
          batch: { select: { businessId: true } }
        }
      }
    }
  });
  console.log('Found September messages:', msgs.length);

  const existing = await prisma.whatsAppBillingRecord.findMany({
    where: { createdAt: { gte: new Date('2026-09-01T00:00:00Z'), lt: new Date('2026-10-01T00:00:00Z') } },
    select: { wamid: true }
  });
  const existingSet = new Set(existing.map(r => r.wamid));

  const toCreate = [];
  for (const m of msgs) {
    if (!m.metaMessageId || existingSet.has(m.metaMessageId)) continue;
    const l = m.lead;
    let bId = l?.batch?.businessId;
    if (!bId && l?.phone && l.phone.includes('_BIZ_')) {
      const match = l.phone.match(/_BIZ_(\d+)/);
      if (match) bId = parseInt(match[1]);
    }
    const setting = bId ? bizSettingsMap[bId] : null;
    const cleanPhone = l?.phone ? l.phone.split('_')[0] : null;

    let category = 'MARKETING';
    const text = (m.message || '').toLowerCase();
    if (text.includes('receipt') || text.includes('payment') || text.includes('bank') || text.includes('ගෙවීම්')) {
      category = 'UTILITY';
    }

    toCreate.push({
      businessId: bId || null,
      wabaId: setting?.waId || null,
      phoneNumberId: setting?.waNumId || null,
      displayPhoneNumber: setting?.waNumId || null,
      recipient: cleanPhone,
      wamid: m.metaMessageId,
      category,
      pricingModel: 'PMP',
      pricingType: 'regular',
      costUsd: rates[category] || rates.MARKETING,
      billable: true,
      status: 'sent',
      eventTimestamp: m.createdAt,
      createdAt: m.createdAt
    });
    existingSet.add(m.metaMessageId);
  }

  console.log('Inserting', toCreate.length, 'records...');
  const batchSize = 2000;
  for (let i = 0; i < toCreate.length; i += batchSize) {
    const chunk = toCreate.slice(i, i + batchSize);
    await prisma.whatsAppBillingRecord.createMany({
      data: chunk,
      skipDuplicates: true
    });
    console.log(`Progress: ${Math.min(i + batchSize, toCreate.length)} / ${toCreate.length}`);
  }
  console.log('September backfill complete!');
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
