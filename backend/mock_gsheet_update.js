const headers = ['Date', 'Referance', 'Amount', 'Verified by', 'Student Name', 'Number', 'Business', 'Batch', 'Subjects', 'Status'];
const sysHeaders = ['Status', 'Verified by', 'Student Name', 'Number', 'Business', 'Batch', 'Subjects'];
let rowData = ['06/07/2026', 'PABASARA...', '5,500.00'];
let startColIndex = headers.length;

const getHeaderAliases = (sh) => {
    const s = sh.toLowerCase();
    if (s === 'student name') return ['student name', 'name', 'student'];
    if (s === 'number') return ['number', 'phone', 'mobile', 'contact', 'whatsapp', 'phone number'];
    if (s === 'batch') return ['batch', 'stream', 'course'];
    if (s === 'business') return ['business', 'company', 'institute'];
    if (s === 'subjects') return ['subjects', 'subject', 'class', 'classes'];
    if (s === 'verified by') return ['verified by', 'actioned by', 'checked by'];
    return [s];
};

while (rowData.length < startColIndex) {
    rowData.push('');
}

const statusStr = 'Verified';
const actionedByStr = 'AI System';
const studentNameStr = 'Pabasara Vidumini';
const numberStr = '725636266';
const businessStr = 'IMA Campus';
const batchStr = '2027 July Intake';
const subjectsStr = 'Media, Geography';

sysHeaders.forEach((sh, idx) => {
    const aliases = getHeaderAliases(sh);
    const hIdx = headers.findIndex(h => h && aliases.includes(h.toString().trim().toLowerCase()));
    const vals = [statusStr, actionedByStr, studentNameStr, numberStr, businessStr, batchStr, subjectsStr];
    
    console.log(`Processing ${sh} (idx: ${idx}): hIdx = ${hIdx}, val = ${vals[idx]}`);
    
    if (hIdx !== -1) {
        rowData[hIdx] = vals[idx];
    } else {
        rowData.push(vals[idx]);
    }
});

console.log("Final rowData:", rowData);
