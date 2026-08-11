const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const ids = ["745611518641246", "936064226267021", "856685987538287", "1094003013802671"];
  for (const id of ids) {
    const s = await prisma.crmSettings.findFirst({ where: { waNumId: id } });
    if (s) {
      console.log(`${id} -> FOUND: BIZ ${s.businessId} ${s.campaignType}`);
    } else {
      console.log(`${id} -> NOT FOUND IN DATABASE!`);
    }
  }
}
run();
