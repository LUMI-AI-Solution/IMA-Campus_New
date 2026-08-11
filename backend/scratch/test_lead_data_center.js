const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const controller = require('./controllers/leadDataCenterController');

async function test() {
    console.log("Testing Lead Data Center Controller...");
    const req = {
        query: {
            businessId: 'ALL',
            batchId: 'ALL',
            campaignType: 'ALL',
            assignmentFilter: 'ALL',
            statusFilter: 'ALL',
            page: 1,
            limit: 5
        }
    };

    const res = {
        status: function(code) {
            this.statusCode = code;
            return this;
        },
        json: function(data) {
            console.log("Response status:", this.statusCode);
            console.log("Success:", data.success);
            console.log("Total records found:", data.pagination?.total);
            console.log("Sample stats:", data.stats);
            if (data.records && data.records.length > 0) {
                console.log("Sample record:", {
                    name: data.records[0].name,
                    phone: data.records[0].phone,
                    campaignType: data.records[0].campaignType,
                    coordinatorName: data.records[0].coordinatorName,
                    currentRoundLabel: data.records[0].currentRoundLabel,
                    isPaid: data.records[0].isPaid
                });
            }
        }
    };

    await controller.getLeadDataCenterRecords(req, res);
}

test().catch(console.error).finally(() => prisma.$disconnect());
