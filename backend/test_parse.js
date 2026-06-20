const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const courses = await prisma.course.findMany({ select: { id: true, name: true } });
  const courseMap = {};
  courses.forEach(c => courseMap[c.id] = c.name);
  console.log("Course map sample:", Object.keys(courseMap).slice(0, 5).map(k => courseMap[k]));
  
  let val = "[133,134,136]";
  let ids = JSON.parse(val);
  let mapped = ids.map(id => (courseMap && courseMap[id]) ? courseMap[id] : id).join(', ');
  console.log("Mapped:", mapped);
  
}
test().catch(console.error).finally(() => prisma.$disconnect());
