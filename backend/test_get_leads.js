const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Create a mock token for Shamalka
// We need to know her ID. Let's query the DB first.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const user = await prisma.user.findFirst({ where: { firstName: { contains: 'Shamalka' } } });
    console.log("Shamalka user:", user);
    
    if(!user) {
        console.log("User not found");
        return;
    }
    
    // Simulate getLeads query exactly like the backend
    let whereClause = {};
    whereClause.campaignType = 'FREE_SEMINAR';
    // ASSIGNED tab
    whereClause.assignedTo = { not: null };
    whereClause.OR = [
        { callCenterRequestStatus: null },
        { callCenterRequestStatus: 'REJECTED' }
    ];
    whereClause.assignedTo = user.id;

    console.log("Where clause:", JSON.stringify(whereClause, null, 2));

    const leads = await prisma.lead.findMany({
        where: whereClause,
        include: {
            assignedUser: { select: { firstName: true, lastName: true, businessType: true } },
            batch: { select: { id: true, name: true, businessId: true } }
        }
    });

    console.log("Found leads length:", leads.length);
    if(leads.length > 0) {
        console.log("First lead batchId:", leads[0].batchId, "name:", leads[0].batch?.name);
    }
}
run().catch(console.error).finally(() => prisma.$disconnect());
