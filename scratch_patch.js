const fs = require('fs');

const opensemPath = '/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemOpen/AfterSeminarOpenSem.jsx';
const newinqPath = '/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/AfterSeminarNewInq.jsx';

const osContent = fs.readFileSync(opensemPath, 'utf8');
let niContent = fs.readFileSync(newinqPath, 'utf8');

// 1. Extract table UI from OpenSem (from <div className="w-full overflow-x-auto to </table></div>)
const tableStartMatch = osContent.match(/<div className="w-full overflow-x-auto bg-\[#1e1b4b\]\/80 backdrop-blur-md rounded-2xl border border-indigo-500\/20 shadow-xl">/);
const tableEndMatch = osContent.match(/<\/table>\s*<\/div>/);

if (!tableStartMatch || !tableEndMatch) {
    console.error("Could not find table chunk in OpenSem");
    process.exit(1);
}

const tableChunk = osContent.substring(tableStartMatch.index, tableEndMatch.index + tableEndMatch[0].length);

// 2. Modify niContent to support viewMode
niContent = niContent.replace(/const \[viewMode, setViewMode\] = useState\('TILE'\);/, "const [viewMode, setViewMode] = useState('TILE');\n    const [draftStatus, setDraftStatus] = useState({});\n    const [draftAttempt, setDraftAttempt] = useState({});\n    const [draftMethod, setDraftMethod] = useState({});");

// 3. Inject viewMode toggle logic if not present
if (!niContent.includes("viewMode === 'TILE' ? (")) {
    niContent = niContent.replace(
        /<div className="space-y-8 pb-10">/,
        `{viewMode === 'TILE' ? (\n                            <div className="space-y-8 pb-10">`
    );
    
    // Replace the end of groupedLeads map loop to close the TILE view and add the TABLE view
    niContent = niContent.replace(
        /<\/div>\n\s*\)\)}\n\s*<\/div>\n\s*\)\)}/,
        `</div>\n                                ))}\n                            </div>\n                        ) : (\n${tableChunk.split('\n').map(l => '                            ' + l).join('\n')}\n                        )}\n                    )}`
    );
}

// 4. Update the SAVE PROGRESS button text in TILE view
niContent = niContent.replace(/SAVE PROGRESS/g, "SAVE");

fs.writeFileSync(newinqPath, niContent);
console.log("Successfully patched NewInq with TABLE view and draft states.");
