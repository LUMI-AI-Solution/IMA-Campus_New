const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const businessId = 17; // අවුරුදු 2න් ARTS with IMA
  const settings = {
    accessToken: "EAAZAqcbObykgBSOwd3VRsafnLCI8CIs6DJpZB5g2CJoF5cMReZBLhC5hEnGTbpZBDINZB43qFIofy11YYAysc3cvU2Jwv5nwbZBqNM07NoZCANZBFEY5CqrTZApLi2YPDiiRIEvgsSsm2QFHpynt9ilvMZC10uD1aFq51EVqmIzfE822W3eVE6kuXlyQvpj3l8HXSarwZDZD",
    phoneNumberId: "1208424262355917",
    whatsappBusinessAccountId: "1478042197693029",
  };

  const existing = await prisma.whatsAppSettings.findFirst({ where: { businessId } });
  
  if (existing) {
    await prisma.whatsAppSettings.update({
      where: { id: existing.id },
      data: settings
    });
    console.log("Updated existing settings!");
  } else {
    await prisma.whatsAppSettings.create({
      data: {
        businessId,
        ...settings
      }
    });
    console.log("Created new settings!");
  }
}
main().finally(() => prisma.$disconnect());
