const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

async function testApi() {
    // We can simulate the controller logic or just call the controller logic directly.
    // It's easier to copy the controller logic for a single student.
    const prisma = new PrismaClient();
    
    // Find lead
    const lead = await prisma.lead.findFirst({
        where: { phone: { contains: '773114092' } }
    });
    
    if (!lead) return console.log("Lead not found");
    
    // Let's print the actual status from DB
    console.log("DB Lead Status:", lead.enrollmentStatus);
    console.log("Lead assigned subjects:", lead.assignedSubjects);
}
testApi();
