const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfill() {
  console.log('Fetching settings & businesses...');
  const crmSettings = await prisma.crmSettings.findMany();
  const bizSettingsMap = {};
  for (const s of crmSettings) {
    if (s.businessId) {
      bizSettingsMap[s.businessId] = s;
    }
  }

  const phoneHealthMap = {};
  // Let's get phone numbers from settings
  for (const s of crmSettings) {
    if (s.waNumId) {
      phoneHealthMap[s.waNumId] = s.waNumId;
    }
  }

  const ratesSetting = await prisma.appSetting.findUnique({
    where: { key: 'WHATSAPP_BILLING_CONFIG' }
  });
  const rates = ratesSetting ? JSON.parse(ratesSetting.value) : {
    MARKETING: 0.0528,
    UTILITY: 0.0150,
    AUTHENTICATION: 0.0154,
    SERVICE: 0.0125,
    USD_TO_LKR: 305.00
  };

  console.log('Fetching October outgoing chat messages...');
  const msgs = await prisma.chatMessage.findMany({
    where: {
      createdAt: { gte: new Date('2026-10-01T00:00:00Z') },
      direction: { in: ['outgoing', 'outbound', 'OUTGOING', 'OUTBOUND'] },
      metaMessageId: { not: null }
    },
    include: {
      lead: {
        select: {
          id: true,
          phone: true,
          campaignType: true,
          batch: {
            select: { businessId: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Found ${msgs.length} outgoing messages in October.`);

  // Get existing wamids in WhatsAppBillingRecord
  const existingRecords = await prisma.whatsAppBillingRecord.findMany({
    select: { wamid: true }
  });
  const existingWamids = new Set(existingRecords.map(r => r.wamid));
  console.log(`Existing WhatsAppBillingRecords: ${existingWamids.size}`);

  const toCreate = [];
  for (const m of msgs) {
    if (!m.metaMessageId || existingWamids.has(m.metaMessageId)) {
      continue;
    }

    const l = m.lead;
    let bId = l?.batch?.businessId;
    if (!bId && l?.phone && l.phone.includes('_BIZ_')) {
      const match = l.phone.match(/_BIZ_(\d+)/);
      if (match) bId = parseInt(match[1]);
    }

    const setting = bId ? bizSettingsMap[bId] : null;
    const cleanPhone = l?.phone ? l.phone.split('_')[0] : null;

    // Category determination
    let category = 'MARKETING';
    const text = (m.message || '').toLowerCase();
    if (text.includes('receipt') || text.includes('payment') || text.includes('bank') || text.includes('ගෙවීම්')) {
      category = 'UTILITY';
    }

    const costUsd = rates[category] || rates.MARKETING;

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
      costUsd,
      billable: true,
      status: 'sent',
      eventTimestamp: m.createdAt,
      createdAt: m.createdAt
    });

    existingWamids.add(m.metaMessageId);
  }

  console.log(`Prepared ${toCreate.length} records to insert.`);
  
  // Insert in batches of 500
  const batchSize = 500;
  for (let i = 0; i < toCreate.length; i += batchSize) {
    const chunk = toCreate.slice(i, i + batchSize);
    await prisma.whatsAppBillingRecord.createMany({
      data: chunk,
      skipDuplicates: true
    });
    console.log(`Inserted chunk ${Math.floor(i / batchSize) + 1} / ${Math.ceil(toCreate.length / batchSize)}`);
  }

  console.log('Backfill completed successfully!');
  const totalCount = await prisma.whatsAppBillingRecord.count();
  const sumCost = await prisma.whatsAppBillingRecord.aggregate({
    _sum: { costUsd: true }
  });
  console.log(`Total WhatsAppBillingRecords now: ${totalCount}, Total Cost USD: $${sumCost._sum.costUsd?.toFixed(2)}`);
}

backfill()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
