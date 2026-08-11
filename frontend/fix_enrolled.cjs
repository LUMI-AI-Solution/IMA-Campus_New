const fs = require('fs');

const files = [
    '/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemOpen/AfterSeminarOpenSem.jsx',
    '/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/AfterSeminarNewInq.jsx',
    '/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AftersemPaid/AfterSeminarPaidCampaign.jsx',
    '/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/BridgeStaffExecution.jsx',
    '/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CRM/AfterSeminarContactSidebar.jsx',
    '/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CampaignStatsModules/PaidCampaignPerformance.jsx',
    '/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/AfterSeminarDashboard.jsx',
    '/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/AfterSeminarManagerCampaignStats.jsx',
    '/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/LeadCard.jsx',
    '/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemOpen/LeadCard.jsx'
];

function isEnrolledString(str) {
    return `((${str} === 'ENROLLED' || ${str} === 'PAID' || (${str} && ${str}.startsWith('ENROLLED_'))))`;
}

function notEnrolledString(str) {
    return `(!(${str} === 'ENROLLED' || ${str} === 'PAID' || (${str} && ${str}.startsWith('ENROLLED_'))))`;
}

for (const file of files) {
    if (!fs.existsSync(file)) continue;
    
    let content = fs.readFileSync(file, 'utf8');

    // Add helper function if not there? No, we will just inline it to avoid scoping issues.

    // Replacements for common patterns
    
    // Pattern 1: l.enrollmentStatus === 'ENROLLED' || l.enrollmentStatus === 'PAID'
    content = content.replace(/([a-zA-Z0-9_\?\.]+enrollmentStatus)\s*===\s*'ENROLLED'\s*\|\|\s*\1\s*===\s*'PAID'/g, (match, p1) => {
        return isEnrolledString(p1);
    });

    // Pattern 2: l.enrollmentStatus !== 'ENROLLED' && l.enrollmentStatus !== 'PAID'
    content = content.replace(/([a-zA-Z0-9_\?\.]+enrollmentStatus)\s*!==\s*'ENROLLED'\s*&&\s*\1\s*!==\s*'PAID'/g, (match, p1) => {
        return notEnrolledString(p1);
    });

    // Pattern 3: lead.enrollmentStatus === 'ENROLLED'
    // But ONLY if it's not already covered by Pattern 1.
    // Also, don't replace inside strings or import statements.
    content = content.replace(/([a-zA-Z0-9_\?\.]+enrollmentStatus)\s*===\s*'ENROLLED'/g, (match, p1) => {
        // Just checking for 'ENROLLED' alone, let's replace it with the full check.
        // But wait, if it's part of the Pattern 1 we already replaced, the Regex won't match anymore because it's replaced.
        // So this will only catch the remaining ones!
        return isEnrolledString(p1);
    });
    
    // Pattern 4: lead.enrollmentStatus !== 'ENROLLED'
    content = content.replace(/([a-zA-Z0-9_\?\.]+enrollmentStatus)\s*!==\s*'ENROLLED'/g, (match, p1) => {
        return notEnrolledString(p1);
    });


    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated ' + file);
}
