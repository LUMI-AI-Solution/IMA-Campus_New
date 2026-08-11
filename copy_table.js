const fs = require('fs');
const newInqPath = 'frontend/src/components/AfterSeminarCRM/CampaignStatsModules/NewInquiriesPerformance.jsx';
const openSemPath = 'frontend/src/components/AfterSeminarCRM/CampaignStatsModules/OpenSeminarControls.jsx';

const newInqCode = fs.readFileSync(newInqPath, 'utf8');
const openSemCode = fs.readFileSync(openSemPath, 'utf8');

const startTag = '{/* ADVANCED STAFF BREAKDOWN TABLE */}';
const endTag = '{/* END OF ADVANCED STAFF BREAKDOWN TABLE */}';

// I need to find the start and end of the table in both files.
// Let's just find the exact block. 
