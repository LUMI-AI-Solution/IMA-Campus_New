const itemType = 'live';
const contentTab = 'live';
const getTypeInt = (tabStr) => { switch(tabStr) { case 'live': return 1; case 'recording': return 2; case 'document': return 3; case 'sPaper': return 4; case 'paper': return 5; default: return 1; } };

console.log(itemType !== null && (parseInt(itemType) === getTypeInt(contentTab) || itemType.toString() === contentTab));
