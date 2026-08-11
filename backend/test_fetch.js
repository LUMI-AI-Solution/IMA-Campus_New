const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const aiVerificationController = require('./controllers/aiVerificationController');
  const req = { query: { batchId: 26 } };
  const res = { 
      status: (c) => ({ json: (d) => console.log("Response:", c, d) }) 
  };
  await aiVerificationController.getBankTransactions(req, res);
}
run().finally(() => prisma.$disconnect());
