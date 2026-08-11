const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'controllers', 'studentController.js');
let code = fs.readFileSync(filePath, 'utf8');

const regex = /const paymentTypeEnum = \(parseInt\((.*?)\) === 1\) \? 1 : 2;\s*const tuteStocks = await prisma\.tuteStock\.findMany\(\{\s*where: \{\s*course: \{\s*lecturerName: course\.lecturerName,\s*group: \{ type: paymentTypeEnum \}\s*\}\s*\}\s*\}\);\s*for \(const stock of tuteStocks\) \{\s*const key = \`\$\{course\.id\}_\$\{stock\.tuteName\}\`;\s*if \(\!deliverableCoursesMap\.has\(key\)\) \{\s*deliverableCoursesMap\.set\(key, \{\s*courseId: course\.id,\s*tuteName: stock\.tuteName \|\| course\.name \|\| "Tute",\s*quantity: 1\s*\}\);\s*\}\s*\}/gs;

const replacement = `
                                let deliverTute = false;
                                let tuteName = course.name || "Tute";
                                let parsedPType = parseInt($1);

                                if (parsedPType === 1) {
                                    // For Monthly payments, strictly check groupPrices
                                    // Make sure we have the groupId. Depending on context, it could be updatedPayment.groupId, newPayment.groupId, etc.
                                    // Let's deduce groupId from the context variables
                                    let currentGroupId = null;
                                    if (typeof updatedPayment !== 'undefined' && updatedPayment.groupId) currentGroupId = updatedPayment.groupId;
                                    else if (typeof newPayment !== 'undefined' && newPayment.groupId) currentGroupId = newPayment.groupId;
                                    else if (typeof payRecord !== 'undefined' && payRecord.groupId) currentGroupId = payRecord.groupId;
                                    
                                    if (course.groupPrices && currentGroupId) {
                                        try {
                                            const gps = JSON.parse(course.groupPrices);
                                            const match = gps.find(g => g.groupId == currentGroupId);
                                            if (match && (match.deliverTute === true || match.deliverTute === 'true')) {
                                                deliverTute = true;
                                                if (match.tuteName) tuteName = match.tuteName;
                                            }
                                        } catch(e) {}
                                    }
                                    
                                    if (deliverTute) {
                                        const key = \`\${course.id}_\${tuteName}\`;
                                        if (!deliverableCoursesMap.has(key)) {
                                            deliverableCoursesMap.set(key, { courseId: course.id, tuteName: tuteName, quantity: 1 });
                                        }
                                    }
                                } else {
                                    // For Installment/Full, use TuteStock fallback
                                    const tuteStocks = await prisma.tuteStock.findMany({
                                        where: {
                                            course: {
                                                lecturerName: course.lecturerName,
                                                group: { type: 2 }
                                            }
                                        }
                                    });
                                    
                                    for (const stock of tuteStocks) {
                                        const key = \`\${course.id}_\${stock.tuteName}\`;
                                        if (!deliverableCoursesMap.has(key)) {
                                            deliverableCoursesMap.set(key, {
                                                courseId: course.id,
                                                tuteName: stock.tuteName || course.name || "Tute",
                                                quantity: 1
                                            });
                                        }
                                    }
                                }
`;

let matches = 0;
const newCode = code.replace(regex, (match, p1) => {
    matches++;
    return replacement.replace(/\$1/g, p1);
});

console.log(`Found ${matches} occurrences to replace.`);
fs.writeFileSync(filePath, newCode, 'utf8');
console.log('studentController.js patched successfully!');
