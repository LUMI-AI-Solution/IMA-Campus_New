const fs = require('fs');
// Mocking the data
const leads = [
    { inquiryType: 'NEW_INQ', enrollmentStatus: 'NON_ENROLLED', coordinationRound: 1, callStatus: 'pending' },
    { inquiryType: 'NEW_INQ', enrollmentStatus: 'NON_ENROLLED', coordinationRound: 2, callStatus: 'pending' },
    { inquiryType: 'NEW_INQ', enrollmentStatus: 'NON_ENROLLED', coordinationRound: 3, callStatus: 'pending' },
    { inquiryType: 'NEW_INQ', enrollmentStatus: 'ENROLLED', coordinationRound: 3, callStatus: 'answered' },
];

const openSemLeads = leads.filter(l => l?.inquiryType === 'NEW_INQ');
const activeRound = 'non_enrolled';
const activePhase = 'ALL';
const statusFilter = 'ALL';
const searchQuery = '';

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

console.log('Filtered Leads length:', filtered.length);

let baseLeads = openSemLeads;
const nonEnrolledLeads = baseLeads.filter(l => l?.enrollmentStatus !== 'ENROLLED' && l?.enrollmentStatus !== 'PAID' && l?.coordinationRound === 3);
let pendingStats = nonEnrolledLeads.filter(l => l.callStatus === 'pending' || !l.callStatus).length;

console.log('Stats length:', nonEnrolledLeads.length);
console.log('Stats pending:', pendingStats);
