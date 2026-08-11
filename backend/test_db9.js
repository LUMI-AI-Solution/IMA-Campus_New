const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const futureReplies = await prisma.autoReply.findMany({
      where: {
          businessId: 13,
          campaignType: 'AFTER_SEMINAR',
          stepOrder: 1
      }
  });
  console.log("Future Replies for step 1:", futureReplies.length);
  if (futureReplies.length > 0) {
      console.log(futureReplies[0]);
  }
}
main().finally(() => prisma.$disconnect());
