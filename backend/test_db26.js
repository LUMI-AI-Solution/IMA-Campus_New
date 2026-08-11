const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const lead = await prisma.lead.findUnique({ where: { id: 64501 } });
  let existingLead = lead;
  const isExplicitAction = true;
  
  if (isExplicitAction) {
      let dataToUpdate = {};
      if (existingLead.isOptedOut) {
          dataToUpdate.isOptedOut = false;
          existingLead.isOptedOut = false;
      }
      if (existingLead.autoReplyStep === -1) {
          dataToUpdate.autoReplyStep = 0;
          existingLead.autoReplyStep = 0;
      }
      if (Object.keys(dataToUpdate).length > 0) {
          existingLead = await prisma.lead.update({ where: { id: existingLead.id }, data: dataToUpdate });
      }
  }
  console.log("Existing Lead AutoReplyStep:", existingLead.autoReplyStep);
}
main().finally(() => prisma.$disconnect());
