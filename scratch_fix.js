const fs = require('fs');

const opensemPath = '/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemOpen/AfterSeminarOpenSem.jsx';
const newinqPath = '/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/AfterSeminarNewInq.jsx';

const osContent = fs.readFileSync(opensemPath, 'utf8');
let niContent = fs.readFileSync(newinqPath, 'utf8');

// The regex replacement failed because the closing tags were different.
// The TILE view ends around line 760 with:
// 758:                                     </div>
// 759:                                 ))}
// 760:                             </div>
// 761:                         )}

// We need to change line 761 from `)}` to `) : (\n <table chunk> \n)}`
const tableStartMatch = osContent.match(/<div className="w-full overflow-x-auto bg-\[#1e1b4b\]\/80 backdrop-blur-md rounded-2xl border border-indigo-500\/20 shadow-xl">/);
const tableEndMatch = osContent.match(/<\/table>\s*<\/div>/);

if (!tableStartMatch || !tableEndMatch) {
    console.error("Could not find table chunk in OpenSem");
    process.exit(1);
}

const tableChunk = osContent.substring(tableStartMatch.index, tableEndMatch.index + tableEndMatch[0].length);

// Replace line 761 correctly:
niContent = niContent.replace(
    /                                \)\)}\n                            <\/div>\n                        \)}/,
    `                                ))}\n                            </div>\n                        ) : (\n${tableChunk.split('\n').map(l => '                            ' + l).join('\n')}\n                        )}`
);

fs.writeFileSync(newinqPath, niContent);
console.log("Successfully appended table chunk.");
