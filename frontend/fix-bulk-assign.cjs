const fs = require('fs');
const fileBackend = '/root/IMA-Campus/backend/controllers/afterSeminarInquiryController.js';
let contentBackend = fs.readFileSync(fileBackend, 'utf8');

const targetStr = `            if (assignType === 'NEW_INQ') whereClause.inquiryType = 'NEW_INQ';
            else if (assignType === 'OPEN_SEMINAR') whereClause.inquiryType = 'OPEN_SEMINAR';
            else if (assignType === 'NORMAL') whereClause.inquiryType = 'NORMAL';`;

const replacementStr = `            const { sourceTab } = req.body;
            if (sourceTab === 'NEW_INQ') whereClause.inquiryType = 'NEW_INQ';
            else if (sourceTab === 'OPEN_SEM') whereClause.inquiryType = 'OPEN_SEMINAR';
            else if (sourceTab === 'IMPORTED') whereClause.inquiryType = 'NORMAL';
            else if (sourceTab === 'ALL') {
                // If they are on ALL tab, let's not filter by inquiry type so they can assign anything
            } else {
                // Fallback to original logic if sourceTab is not provided
                if (assignType === 'NEW_INQ') whereClause.inquiryType = 'NEW_INQ';
                else if (assignType === 'OPEN_SEMINAR') whereClause.inquiryType = 'OPEN_SEMINAR';
                else if (assignType === 'NORMAL') whereClause.inquiryType = 'NORMAL';
            }`;

contentBackend = contentBackend.replace(targetStr, replacementStr);
fs.writeFileSync(fileBackend, contentBackend);

const fileFrontend = '/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CRM/AfterSeminarContactSidebar.jsx';
let contentFrontend = fs.readFileSync(fileFrontend, 'utf8');

const targetFrontend = `            assignType: chosenInqType
        };
        setAssignConfirmation({
            type: 'bulk_form',`;

const replacementFrontend = `            assignType: chosenInqType,
            sourceTab: activeTab
        };
        setAssignConfirmation({
            type: 'bulk_form',`;

contentFrontend = contentFrontend.replace(targetFrontend, replacementFrontend);
fs.writeFileSync(fileFrontend, contentFrontend);
