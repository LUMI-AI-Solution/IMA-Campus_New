// One-time backfill for multi-batch allocation.
// Finds students with an APPROVED payment in a batch that is not their chat room's batch
// (same business) and adds that batch as an UNASSIGNED extra batch, so a manager can pick a coordinator.
//
//   node scripts/backfillExtraBatches.js                 -> dry run (shows what would be created)
//   node scripts/backfillExtraBatches.js --apply         -> creates the rows
//   node scripts/backfillExtraBatches.js --apply --business=1
require('dotenv').config();
const prisma = require('../lib/prisma');
const { backfillExtraBatches } = require('../utils/leadBatchAssignments');

(async () => {
    const apply = process.argv.includes('--apply');
    const bizArg = process.argv.find(a => a.startsWith('--business='));
    const businessId = bizArg ? bizArg.split('=')[1] : null;
    try {
        const result = await backfillExtraBatches({ businessId, dryRun: !apply });
        console.log(apply ? 'APPLIED' : 'DRY RUN (nothing written, use --apply)');
        console.log(`Extra batches found: ${result.found}, created: ${result.created}`);
        console.log('Sample:', JSON.stringify(result.sample, null, 2));
    } catch (e) {
        console.error('Backfill failed:', e);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
})();
