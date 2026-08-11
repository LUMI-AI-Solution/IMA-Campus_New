const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const businessId = 17; // අවුරුදු 2න් ARTS with IMA
  const settings = {
    metaApiKey: "EAAZAqcbObykgBSOwd3VRsafnLCI8CIs6DJpZB5g2CJoF5cMReZBLhC5hEnGTbpZBDINZB43qFIofy11YYAysc3cvU2Jwv5nwbZBqNM07NoZCANZBFEY5CqrTZApLi2YPDiiRIEvgsSsm2QFHpynt9ilvMZC10uD1aFq51EVqmIzfE822W3eVE6kuXlyQvpj3l8HXSarwZDZD",
    waNumId: "1208424262355917",
    waId: "1478042197693029",
  };

  const existingAfterSem = await prisma.crmSettings.findFirst({ where: { businessId, campaignType: 'AFTER_SEMINAR' } });
  
  if (existingAfterSem) {
    await prisma.crmSettings.update({
      where: { id: existingAfterSem.id },
      data: settings
    });
    console.log("Updated existing AFTER_SEMINAR settings for businessId 17!");
  } else {
    await prisma.crmSettings.create({
      data: {
        businessId,
        campaignType: 'AFTER_SEMINAR',
        ...settings
      }
    });
    console.log("Created new AFTER_SEMINAR settings for businessId 17!");
  }
}
main().finally(() => prisma.$disconnect());
