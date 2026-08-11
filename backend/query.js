const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const contents = await prisma.content.findMany({
    where: { title: { contains: 'සන්නිවේදන පදනම' } },
    select: { id: true, title: true, link: true, meetingId: true, youtubeLink: true }
  });
  console.log(contents);
}
main().catch(console.error).finally(() => prisma.$disconnect());
