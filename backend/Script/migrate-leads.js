const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("🚀 Starting Lead Migration Script...");

    // 🔥 පියවර 1: ටෙස්ට් කරන්න ඕන නම්බර්ස් මෙතනට දාන්න
    const testPhoneNumbers = ['94741241272'];

    console.log(`\n🔍 Running TEST MIGRATION for: ${testPhoneNumbers.join(', ')}`);

    try {
        // =========================================================
        // 1. TEST MIGRATION 
        // =========================================================
        const testResult = await prisma.lead.updateMany({
            where: {
                // 🔥 FIX: Database එකේ _BIZ_ කෑල්ල තියෙන නිසා exact match නැතුව contains පාවිච්චි කරනවා
                OR: testPhoneNumbers.map(num => ({ phone: { contains: num } })),
                coordinationRound: 1,            // Round 1 එකේ තියෙන
                enrollmentStatus: 'NON_ENROLLED',// Enroll වෙලා නැති
                callStatus: { in: ['answered', 'reject'] }, // අනිවාර්යයෙන් Answered හෝ Reject වෙලා තියෙන්න ඕනේ
                inquiryType: { in: ['NEW_INQ', 'OPEN_SEMINAR', 'NORMAL'] } 
            },
            data: {
                coordinationRound: 2,   // Round 2 එකට දානවා
                phase: 1,               // Phase 1 කරනවා
                callStatus: 'pending',  // ආයෙත් Pending කරනවා
                callAttempt: 1,         // Attempt එක 1 කරනවා
                updatedAt: new Date()   // අද දවසට (Today) වැටෙන්න date එක අලුත් කරනවා
            }
        });

        console.log(`✅ Test Migration Successful! ${testResult.count} leads moved to Round 2.`);

        // =========================================================
        // 2. FULL BULK MIGRATION
        // (ටෙස්ට් එක හරි කියලා තහවුරු වුනාට පස්සේ, මේ පල්ලෙහා තියෙන කෑල්ලේ /* සහ */ අයින් කරලා ආයෙත් Run කරන්න)
        // =========================================================
        
        /*
        console.log("\n⚠️ RUNNING FULL BULK MIGRATION...");
        const bulkResult = await prisma.lead.updateMany({
            where: {
                coordinationRound: 1,
                enrollmentStatus: 'NON_ENROLLED',
                callStatus: { in: ['answered', 'reject'] }, 
                inquiryType: { in: ['NEW_INQ', 'OPEN_SEMINAR', 'NORMAL'] }
            },
            data: {
                coordinationRound: 2,
                phase: 1,
                callStatus: 'pending',
                callAttempt: 1,
                updatedAt: new Date()
            }
        });
        console.log(`✅ Bulk Migration Successful! ${bulkResult.count} total leads moved to Round 2 safely.`);
        */

    } catch (error) {
        console.error("❌ Error running migration:", error);
    }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("\n🛑 Script finished and database disconnected.");
  });