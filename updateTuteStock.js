const fs = require('fs');

let content = fs.readFileSync('frontend/src/pages/delivery/components/TuteStock.jsx', 'utf8');

// 1. Group lecturers case-insensitively
content = content.replace(
    /const lecs = new Map\(\);\s*\/\/\s*Add all from globalStock\s*globalStock\.forEach\(s => \{/g,
    `const lecs = new Map();
        
        const normalizeLec = (name) => name.toLowerCase().trim().replace(/\\s+/g, ' ');
        
        // Add all from globalStock
        globalStock.forEach(s => {`
);

content = content.replace(
    /const lecName = s\.course\?\.lecturerName \|\| "Unknown Lecturer";/g,
    `const lecName = s.course?.lecturerName || "Unknown Lecturer";
            const lecKey = normalizeLec(lecName);`
);

content = content.replace(/if \(!lecs\.has\(lecName\)\)/g, 'if (!lecs.has(lecKey))');
content = content.replace(/lecs\.set\(lecName, \{/g, 'lecs.set(lecKey, {');
content = content.replace(/lecs\.get\(lecName\)\.businesses\.add/g, 'lecs.get(lecKey).businesses.add');
content = content.replace(/lecs\.get\(lecName\)\.subjects\.add/g, 'lecs.get(lecKey).subjects.add');

content = content.replace(
    /masterTutes\.forEach\(mt => \{\s*if \(lecs\.has\(mt\.name\)\)/g,
    `masterTutes.forEach(mt => {
            const mtKey = normalizeLec(mt.name);
            if (lecs.has(mtKey))`
);
content = content.replace(/const existing = lecs\.get\(mt\.name\);/g, 'const existing = lecs.get(mtKey);');
content = content.replace(/lecs\.set\(mt\.name,/g, 'lecs.set(mtKey,');

// paymentGroups and finalStocks
content = content.replace(
    /const paymentGroups = useMemo\(\(\) => \{\s*if \(viewLevel < 2 \|\| !selectedLecturer \|\| !globalStock\.length\) return \[\];\s*const pgs = new Set\(\);/g,
    `const paymentGroups = useMemo(() => {
        if (viewLevel < 2 || !selectedLecturer || !globalStock.length) return [];
        const normalizeLec = (name) => name.toLowerCase().trim().replace(/\\s+/g, ' ');
        const selectedKey = normalizeLec(selectedLecturer.name);
        const pgs = new Set();`
);
content = content.replace(
    /if \(lec === selectedLecturer\.name\)/g,
    `if (normalizeLec(lec) === selectedKey)`
);

content = content.replace(
    /const finalStocks = useMemo\(\(\) => \{\s*if \(viewLevel < 3 \|\| !selectedPaymentGroup \|\| !globalStock\.length\) return \[\];\s*return globalStock\.filter\(s => \{/g,
    `const finalStocks = useMemo(() => {
        if (viewLevel < 3 || !selectedPaymentGroup || !globalStock.length) return [];
        const normalizeLec = (name) => name.toLowerCase().trim().replace(/\\s+/g, ' ');
        const selectedKey = normalizeLec(selectedLecturer.name);
        return globalStock.filter(s => {`
);
content = content.replace(
    /return lec === selectedLecturer\.name && pg === selectedPaymentGroup;/g,
    `return normalizeLec(lec) === selectedKey && pg === selectedPaymentGroup;`
);

// 2. Move Master Tutes from Level 2 to Level 3

// The Master Tutes block starts with {/* SECTION 1: MASTER TUTES */}
// and ends right before {/* SECTION 2: ALLOCATED STOCK */}
const masterTutesMatch = content.match(/\{\/\*\s*SECTION 1: MASTER TUTES\s*\*\/\}[\s\S]*?(?=\{\/\*\s*SECTION 2: ALLOCATED STOCK\s*\*\/})/);

if (masterTutesMatch) {
    const masterTutesCode = masterTutesMatch[0];
    // Remove it from Level 2
    content = content.replace(masterTutesCode, '');
    
    // Inject it into Level 3
    const level3Start = /\{\/\*\s*LEVEL 3: STOCKS\s*\*\/}\s*\{viewLevel === 3 && \(\s*<>/;
    
    content = content.replace(level3Start, 
        `{/* LEVEL 3: STOCKS */}
                        {viewLevel === 3 && (() => {
                            const masterLec = masterTutes.find(m => m.name === selectedLecturer?.name);
                            return (
                            <div className="space-y-12">
                                ` + masterTutesCode.trim() + `
                                
                                <div>
                                    <div className="mb-6">
                                        <h3 className="text-xl font-black text-gray-900 dark:text-slate-100 flex items-center gap-2">
                                            <Box className="text-brand-accent" size={24}/> Allocated Stock Management
                                        </h3>
                                        <p className="text-sm font-bold text-gray-500 dark:text-slate-400 mt-1">Manage physical stock for tutes that have been allocated to subjects in Content Hub.</p>
                                    </div>
                                    `
    );
    
    // In original file, the end of viewLevel === 3 block was:
    //                             </div>
    //                         )}
    //                     </>
    //                 )}
    // 
    // We need to replace `</>\n                )}` with `</div>\n                            </div>\n                            );\n                        })()}`
    
    content = content.replace(
        /<\/div>\n\s*\)\}\n\s*<\/>\n\s*\)\}/,
        `                            </div>
                                </div>
                            </div>
                            );
                        })()}`
    );
    // Actually just string replace:
    let endStr = `                            </div>
                        )}
                    </>
                )}`;
    let replaceStr = `                            </div>
                        )}
                            </div>
                            </div>
                            );
                        })()}`;
    content = content.replace(endStr, replaceStr);
}

fs.writeFileSync('frontend/src/pages/delivery/components/TuteStock.jsx', content);
