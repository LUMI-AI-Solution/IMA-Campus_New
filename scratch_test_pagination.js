const fs = require('fs');
// Mocking the data
const leads = [];
for (let i = 0; i < 11; i++) {
    leads.push({ inquiryType: 'NEW_INQ', enrollmentStatus: 'NON_ENROLLED', coordinationRound: 3, callStatus: 'pending' });
}

const openSemLeads = leads.filter(l => l?.inquiryType === 'NEW_INQ');
const activeRound = 'non_enrolled';
const activePhase = 'ALL';
const statusFilter = 'ALL';
const searchQuery = '';
const currentPage = 1;
const ITEMS_PER_PAGE = 20;

const isLeadPending = (l) => {
    return !['answered', 'reject'].includes(l.callStatus);
};

let filtered = openSemLeads;

if (activeRound === 'enrolled') {
    filtered = filtered.filter(l => l?.enrollmentStatus === 'ENROLLED' || l?.enrollmentStatus === 'PAID');
} else if (activeRound === 'non_enrolled') {
    filtered = filtered.filter(l => l?.enrollmentStatus !== 'ENROLLED' && l?.enrollmentStatus !== 'PAID');
} else {
    filtered = filtered.filter(l => l?.enrollmentStatus !== 'ENROLLED' && l?.enrollmentStatus !== 'PAID' && l?.inquiryType === 'NEW_INQ');
    if (activeRound === 'r1') filtered = filtered.filter(l => (l?.coordinationRound || 1) === 1);
    if (activeRound === 'r2') filtered = filtered.filter(l => l?.coordinationRound === 2);
}

if (activePhase !== 'ALL') filtered = filtered.filter(l => l?.phase === activePhase);

if (statusFilter === 'PENDING') {
    filtered = filtered.filter(isLeadPending);
} 

filtered.sort((a, b) => {
    const aTime = new Date(a?.assignedAt || a?.createdAt || 0).getTime();
    const bTime = new Date(b?.assignedAt || b?.createdAt || 0).getTime();
    return bTime - aTime;
});

const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
const paginatedLeads = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

console.log('Filtered Leads length:', filtered.length);
console.log('Paginated Leads length:', paginatedLeads.length);
