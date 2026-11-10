// READ-ONLY diagnostic for the 10 Nov staff reports. Writes nothing.
// Prints IDs and counts only (no student names / phones).
//   node scripts/diag-nov10.js
const prisma = require('../src/core/db');
const { misfileReason } = require('../src/modules/content/rules');

const DAYS = 45;
const since = new Date(Date.now() - DAYS * 86400000);
const count = (arr, key) => arr.reduce((m, x) => { const k = key(x); m[k] = (m[k] || 0) + 1; return m; }, {});
const roleOf = (u) => {
    if (!u) return 'none';
    const r = String(u.role || '').toUpperCase(); const d = String(u.department || '').toUpperCase();
    if (d.includes('CLASS_COORDINATION') || d.includes('CLASS COORDINATION') || r.includes('COORDINAT')) return `coordinator(${u.role}/${u.department || '-'})`;
    if (r.includes('CALLER') || r.includes('CALL_CENTER') || d.includes('CALL')) return `callcenter(${u.role}/${u.department || '-'})`;
    return `other(${u.role}/${u.department || '-'})`;
};

(async () => {
    // ---------- 1. Uncategorized recordings ----------
    console.log(`\n=== 1. CONTENT (last ${DAYS} days) ===`);
    const contents = await prisma.content.findMany({
        where: { createdAt: { gte: since }, contentType: { in: ['recording', '2', 'live', '1', 'document', '3'] } },
        select: { id: true, contentType: true, batchId: true, additionalBatchIds: true, contentGroupId: true, courseId: true, createdAt: true,
            group: { select: { id: true, type: true, classType: true, batchId: true, additionalBatchIds: true } } },
    });
    const courseIds = [...new Set(contents.map((c) => c.courseId).filter(Boolean))];
    const courses = await prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, courseType: true } });
    const ctype = new Map(courses.map((c) => [c.id, Number(c.courseType || 1)]));
    const rows = contents.map((c) => {
        let state = 'ok';
        if (!c.contentGroupId) state = 'no-folder';
        else if (!c.group) state = 'folder-deleted';
        else {
            const r = misfileReason(c, c.group);
            if (r) state = r;
            else if (ctype.has(c.courseId) && Number(c.group.classType || 1) !== ctype.get(c.courseId)) state = 'folder-theory/paper-mismatch';
        }
        return { ...c, state, week: c.createdAt.toISOString().slice(0, 10) };
    });
    console.log('BY STATE', JSON.stringify(count(rows, (r) => r.state)));
    const bad = rows.filter((r) => r.state !== 'ok');
    console.log('NOT-OK BY TYPE', JSON.stringify(count(bad, (r) => `${r.contentType}:${r.state}`)));
    console.log('NOT-OK BY BATCH', JSON.stringify(count(bad, (r) => r.batchId)));
    console.log('NOT-OK BY DAY (created)', JSON.stringify(count(bad, (r) => r.week)));
    console.log('SAMPLE IDS', bad.slice(0, 25).map((r) => `${r.id}:${r.state}:b${r.batchId}:g${r.contentGroupId}`).join(' '));

    // ---------- 3/4. Bridge leads ----------
    console.log('\n=== 3/4. BRIDGE LEADS ===');
    const bridge = await prisma.lead.findMany({
        where: { campaignType: 'AFTER_SEMINAR', source: 'bridge_transfer', isCallCenter: true },
        select: { id: true, phone: true, assignedTo: true, callStatus: true, callCenterStatus: true, feedback: true, coordinationRound: true, enrollmentStatus: true, updatedAt: true, batchId: true },
    });
    const userIds = [...new Set(bridge.map((l) => l.assignedTo).filter(Boolean))];
    const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, role: true, department: true } });
    const uById = new Map(users.map((u) => [u.id, u]));
    const biz = (l) => (String(l.phone).match(/_BIZ_(\d+)/) || [])[1] || '?';
    const businesses = await prisma.business.findMany({ select: { id: true, name: true } });
    const bizName = new Map(businesses.map((b) => [String(b.id), b.name]));
    const byBiz = {};
    for (const l of bridge) {
        const k = `${biz(l)} ${bizName.get(biz(l)) || ''}`;
        byBiz[k] = byBiz[k] || { total: 0, approvalPending: 0, assignedTo: {} };
        byBiz[k].total++;
        if (l.callCenterStatus === 'pending_approval') byBiz[k].approvalPending++;
        const who = l.assignedTo ? roleOf(uById.get(l.assignedTo)) : 'unassigned';
        byBiz[k].assignedTo[who] = (byBiz[k].assignedTo[who] || 0) + 1;
    }
    for (const [k, v] of Object.entries(byBiz)) console.log('BIZ', k, JSON.stringify(v));

    const caller = await prisma.user.findMany({ where: { phone: { contains: '774032018' } }, select: { id: true, role: true, department: true } });
    console.log('CALLER (Sakunthala) accounts', JSON.stringify(caller));
    for (const c of caller) {
        const mine = bridge.filter((l) => l.assignedTo === c.id);
        const withNotes = mine.filter((l) => (l.feedback || '').trim() && !/^\[B2B/.test((l.feedback || '').trim()));
        console.log(` caller ${c.id}: leads=${mine.length} status=${JSON.stringify(count(mine, (l) => String(l.callStatus).toUpperCase()))}`);
        console.log(`   has remarks but status PENDING: ${withNotes.filter((l) => String(l.callStatus).toUpperCase() === 'PENDING').length} / with remarks ${withNotes.length}`);
        console.log(`   coordinationRound: ${JSON.stringify(count(mine, (l) => l.coordinationRound))}`);
        const allMine = await prisma.lead.count({ where: { assignedTo: c.id } });
        console.log(`   all leads assigned to this account (any campaign): ${allMine}`);
    }

    // ---------- 5. Master tutes ----------
    console.log('\n=== 5. MASTER TUTES ===');
    const s = await prisma.appSetting.findUnique({ where: { key: 'MASTER_TUTES' } });
    let list = []; try { list = JSON.parse(s?.value || '[]'); } catch (e) { console.log('MASTER_TUTES not valid JSON'); }
    const names = count(list, (l) => String(l.name || '').trim().toLowerCase());
    console.log(`lecturers=${list.length} tutes=${list.reduce((n, l) => n + (l.tutes || []).length, 0)} size=${(s?.value || '').length} bytes`);
    console.log('DUPLICATE LECTURER NAMES', JSON.stringify(Object.entries(names).filter(([, n]) => n > 1)));
    console.log('LECTURERS WITH 0 TUTES', list.filter((l) => !(l.tutes || []).length).length);

    await prisma.$disconnect();
})().catch(async (e) => { console.error('DIAG FAILED', e.message); process.exit(1); });
