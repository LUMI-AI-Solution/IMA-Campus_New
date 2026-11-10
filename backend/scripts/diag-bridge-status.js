// READ-ONLY. Why do saved bridge calls show as PENDING? Compares the status saved on the lead
// with the status the Bridge Hand Overs page reads (round progress rows). Counts only.
//   node scripts/diag-bridge-status.js 3455
const prisma = require('../src/core/db');

const cat = (s) => {
    const v = String(s || 'pending').toLowerCase();
    if (['answered', 'answer', 'completed'].includes(v)) return 'answered';
    if (['reject', 'rejected', 'not_interested'].includes(v)) return 'reject';
    if (['no_answer', 'no answer', 'busy'].includes(v)) return 'noAnswer';
    return 'pending';
};
const inc = (m, k) => { m[k] = (m[k] || 0) + 1; };

(async () => {
    const agentId = parseInt(process.argv[2], 10);
    const leads = await prisma.lead.findMany({
        where: { assignedTo: agentId, campaignType: 'AFTER_SEMINAR', source: 'bridge_transfer', isCallCenter: true },
        select: { id: true, phone: true, batchId: true, callStatus: true, roundProgress: { select: { roundNum: true, callStatus: true, campaignCategory: true, updatedAt: true } } },
    });
    const byBatch = {};
    const rows = {};
    for (const l of leads) {
        const r2 = l.roundProgress.find((r) => r.roundNum === 2);
        const r1 = l.roundProgress.find((r) => r.roundNum === 1);
        const pageReads = r2 || r1 || l.roundProgress[0];
        const saved = cat(l.callStatus);
        const shown = cat(pageReads ? pageReads.callStatus : l.callStatus);
        const key = `${(String(l.phone).match(/_BIZ_(\d+)/) || [])[1]}|batch ${l.batchId}`;
        byBatch[key] = byBatch[key] || { leads: 0, savedPending: 0, shownPending: 0, savedButShownPending: 0 };
        byBatch[key].leads++;
        if (saved === 'pending') byBatch[key].savedPending++;
        if (shown === 'pending') byBatch[key].shownPending++;
        if (saved !== 'pending' && shown === 'pending') byBatch[key].savedButShownPending++;
        inc(rows, `rounds=[${l.roundProgress.map((r) => `${r.roundNum}:${r.campaignCategory}:${cat(r.callStatus)}`).sort().join(',')}]`);
    }
    console.log('BY BUSINESS|BATCH', JSON.stringify(byBatch, null, 1));
    console.log('ROUND ROWS PATTERN (top 15)', JSON.stringify(Object.entries(rows).sort((a, b) => b[1] - a[1]).slice(0, 15)));
    await prisma.$disconnect();
})().catch((e) => { console.error('DIAG FAILED', e.message); process.exit(1); });
