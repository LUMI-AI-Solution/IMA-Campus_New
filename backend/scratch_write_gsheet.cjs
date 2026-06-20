const fs = require('fs');
const filePath = '/root/IMA-Campus/backend/controllers/aiVerificationController.js';

let content = fs.readFileSync(filePath, 'utf8');

const verifyStart = content.indexOf('exports.verifySinglePayment');
const writeBackStart = content.indexOf('// Write back to GSheet', verifyStart);
const verifyEnd = content.indexOf('res.status(200).json', writeBackStart);

if (writeBackStart !== -1 && verifyEnd !== -1) {
    console.log("Found write back block.");
    const oldWriteBack = content.slice(writeBackStart, verifyEnd);
    const newWriteBack = `// Write back to GSheet
            if (spreadsheetId) {
                try {
                    // Fetch headers to find column indices
                    const { google } = require('googleapis');
                    const sheets = google.sheets({ version: 'v4', auth: 'AIzaSyDUfpDVy946hS3mxESKmgByMpS3UoZk6nw' });
                    
                    const response = await sheets.spreadsheets.values.get({
                        spreadsheetId,
                        range: '1:1', // first row
                    });
                    
                    if (response.data.values && response.data.values.length > 0) {
                        const headers = response.data.values[0];
                        const sysHeaders = ['[Sys] Status', '[Sys] Actioned By', '[Sys] Business', '[Sys] Batch', '[Sys] Group', '[Sys] Subjects'];
                        
                        // Check if sys headers exist, if not we will just append them to the end of the existing row length
                        let startColIndex = headers.length;
                        
                        // We will update the matchedRowIndex row
                        // Google sheets columns: A=0, B=1, ... 
                        // To write to specific columns without overriding others, we need the A1 notation
                        // We can just fetch the whole row, update it, and write it back.
                        const rowResponse = await sheets.spreadsheets.values.get({
                            spreadsheetId,
                            range: \`A\${matchedRowIndex}:Z\${matchedRowIndex}\`,
                        });
                        
                        if (rowResponse.data.values && rowResponse.data.values.length > 0) {
                            let rowData = rowResponse.data.values[0];
                            
                            // Extend rowData if needed
                            while (rowData.length < startColIndex) {
                                rowData.push('');
                            }
                            
                            const fullPayment = await prisma.payment.findUnique({
                                where: { id: payment.id },
                                include: {
                                    actionedUser: true,
                                    business: true,
                                    batch: true,
                                    group: true,
                                    student: { include: { subjects: { include: { subject: true } } } }
                                }
                            });
                            
                            const statusStr = 'Verified';
                            const actionedByStr = fullPayment.actionedUser ? \`\${fullPayment.actionedUser.firstName} \${fullPayment.actionedUser.lastName}\` : 'AI System';
                            const businessStr = fullPayment.business ? fullPayment.business.name : 'N/A';
                            const batchStr = fullPayment.batch ? fullPayment.batch.name : 'N/A';
                            const groupStr = fullPayment.group ? fullPayment.group.name : 'N/A';
                            const subjectsStr = fullPayment.student && fullPayment.student.subjects ? fullPayment.student.subjects.map(s => s.subject.name).join(', ') : 'N/A';
                            
                            // For simplicity, we just push these to the end if they don't exist in headers,
                            // or update them if they do exist.
                            sysHeaders.forEach((sh, idx) => {
                                const hIdx = headers.indexOf(sh);
                                const vals = [statusStr, actionedByStr, businessStr, batchStr, groupStr, subjectsStr];
                                if (hIdx !== -1) {
                                    rowData[hIdx] = vals[idx];
                                } else {
                                    rowData.push(vals[idx]);
                                    // if it's the first time writing, we should ideally also write the header!
                                    // But since API key can't write, this code is for when service account is added.
                                }
                            });
                            
                            // Write row back
                            await sheets.spreadsheets.values.update({
                                spreadsheetId,
                                range: \`A\${matchedRowIndex}\`,
                                valueInputOption: 'USER_ENTERED',
                                requestBody: {
                                    values: [rowData]
                                }
                            });
                            console.log('Successfully wrote back to GSheet (if authorized).');
                        }
                    }
                } catch (gErr) {
                    console.log('Google Sheets API write failed (likely due to API Key auth limitation):', gErr.message);
                }
            }

            `;
    content = content.replace(oldWriteBack, newWriteBack);
    fs.writeFileSync(filePath, content);
    console.log("Successfully updated verifySinglePayment");
} else {
    console.log("Could not find verifySinglePayment write block");
}

