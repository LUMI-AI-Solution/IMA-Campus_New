const distinctMonthlyGroups = [
  { name: 'JULY', ids: [ 10 ] },
  { name: 'MAY', ids: [ 8 ] },
  { name: 'JUNE', ids: [ 9 ] }
];
const coordinationMonths = [{ name: 'JULY' }];
const targetGroupIndex = 0;

const p = { groupId: 8 }; // paid for MAY

let earliestGroupIndex = -1;
const gIndex = distinctMonthlyGroups.findIndex(g => g.ids.includes(p.groupId));
if (gIndex !== -1) {
    const groupName = distinctMonthlyGroups[gIndex].name;
    console.log("groupName:", groupName);
    const coordIndex = coordinationMonths.findIndex(c => c.name === groupName);
    console.log("coordIndex:", coordIndex);
    if (coordIndex !== -1 && (earliestGroupIndex === -1 || coordIndex < earliestGroupIndex)) {
        earliestGroupIndex = coordIndex;
    }
}
console.log("earliestGroupIndex:", earliestGroupIndex);

let joinMonthIndex = 0;
if (earliestGroupIndex !== -1) {
    joinMonthIndex = earliestGroupIndex;
} else {
    const joinMonthName = 'MAY';
    const foundIndex = coordinationMonths.findIndex(g => g.name === joinMonthName);
    console.log("foundIndex:", foundIndex);
    if (foundIndex !== -1) joinMonthIndex = foundIndex;
}

console.log("joinMonthIndex:", joinMonthIndex);
console.log("targetGroupIndex === joinMonthIndex:", targetGroupIndex === joinMonthIndex);
