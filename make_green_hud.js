const fs = require('fs');

let hudCode = fs.readFileSync('backend/scratch_ui.jsx', 'utf-8');

// Replace colors to make it Emerald Green!
hudCode = hudCode.replace(/cyan/g, 'emerald');
// Replace specific text
hudCode = hudCode.replace(/TACTICAL VERIFICATION PROTOCOL/g, 'TACTICAL VERIFICATION PROTOCOLS');
hudCode = hudCode.replace(/SYS\.DEF\.NODE \/\/ 0x4A9/g, 'SYS.DEP.NODE // VERIFICATION_PROTOCOL_V9.4');

// Replace the TypeWriter console logs
hudCode = hudCode.replace(
    /<div className="animate-\[typeWriter_0\.5s_steps\(40,end\)_forwards\] overflow-hidden whitespace-nowrap text-blue-400">0x00A1: INIT NEURAL_NET_V9<\/div>/g,
    '<div className="animate-[typeWriter_0.5s_steps(40,end)_forwards] overflow-hidden whitespace-nowrap text-blue-400">&gt; Initializing Core Engine... OK</div>'
);
hudCode = hudCode.replace(
    /<div className="animate-\[typeWriter_0\.5s_steps\(40,end\)_0\.2s_forwards\] overflow-hidden whitespace-nowrap opacity-0">0x00A2: EXTRACTING VALUES\.\.\.<\/div>/g,
    '<div className="animate-[typeWriter_0.5s_steps(40,end)_0.2s_forwards] overflow-hidden whitespace-nowrap opacity-0">&gt; Fetching Neural Weights... DONE</div>'
);
hudCode = hudCode.replace(
    /<div className="animate-\[typeWriter_0\.5s_steps\(40,end\)_forwards\] overflow-hidden whitespace-nowrap text-emerald-300">0x00A3: FOUND \[LKR \{currentVerifyingSlip.amount\}\]<\/div>/g,
    '<div className="animate-[typeWriter_0.5s_steps(40,end)_forwards] overflow-hidden whitespace-nowrap text-emerald-300">&gt; Bypassing local proxy... DONE\\n&gt; FOUND [LKR {currentVerifyingSlip.amount}]</div>'
);
hudCode = hudCode.replace(
    /<div className="animate-\[typeWriter_0\.5s_steps\(40,end\)_0\.2s_forwards\] overflow-hidden whitespace-nowrap text-orange-400">0x00A4: UPLINKING TO MAINFRAME\.\.\.<\/div>/g,
    '<div className="animate-[typeWriter_0.5s_steps(40,end)_0.2s_forwards] overflow-hidden whitespace-nowrap text-orange-400">&gt; Decrypting Payload... SUCCESS</div>'
);
hudCode = hudCode.replace(
    /<div className="animate-\[typeWriter_0\.5s_steps\(40,end\)_forwards\] overflow-hidden whitespace-nowrap text-emerald-300">0x00A5: RUNNING MATCH ALGORITHM<\/div>/g,
    '<div className="animate-[typeWriter_0.5s_steps(40,end)_forwards] overflow-hidden whitespace-nowrap text-emerald-300">&gt; Injecting matching algorithms...</div>'
);

// We need to insert this into frontend/src/components/admin/AISlipVerification.jsx
let mainCode = fs.readFileSync('frontend/src/components/admin/AISlipVerification.jsx', 'utf-8');

// Find the start of the HUD overlay in mainCode
const startIndex = mainCode.indexOf('{/* VERIFICATION ANIMATION OVERLAY - PREMIUM MILITARY HUD */}');
if (startIndex !== -1) {
    const endStr = '</div>\n  );\n}';
    const endIndex = mainCode.lastIndexOf(endStr);
    
    if (endIndex !== -1) {
        // Prepare the new HUD
        const newOverlay = hudCode;
        
        mainCode = mainCode.substring(0, startIndex) + newOverlay + '\n' + endStr;
        fs.writeFileSync('frontend/src/components/admin/AISlipVerification.jsx', mainCode);
        console.log("HUD replaced successfully!");
    } else {
        console.log("Could not find end of component.");
    }
} else {
    console.log("Could not find HUD overlay start marker.");
}
