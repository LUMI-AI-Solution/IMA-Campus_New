const fs = require('fs');
let code = fs.readFileSync('backend/scratch_ui.jsx', 'utf8');

// Replace the Radar Rings (col-span-6) section with the terminal
const oldMiddle = `{/* CENTER COL: RADAR & MAIN STATS */}`;
const newMiddle = `{/* CENTER COL: TERMINAL & PROGRESS */}`;

const replacement = `      {/* CENTER COL: TERMINAL & PROGRESS */}
      <div className="col-span-6 flex flex-col items-center justify-center relative border border-cyan-900/30 bg-[#02080c]/90 p-6 overflow-hidden">
        {/* Gear icons rotating slowly on the sides */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20 flex flex-col gap-12 pointer-events-none">
            <Settings className="text-cyan-600 animate-[spin_8s_linear_infinite]" size={48} strokeWidth={1}/>
            <Settings className="text-blue-500 animate-[spin_12s_linear_infinite_reverse]" size={32} strokeWidth={1.5}/>
        </div>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 flex flex-col gap-12 pointer-events-none">
            <Settings className="text-cyan-600 animate-[spin_8s_linear_infinite_reverse]" size={48} strokeWidth={1}/>
            <Settings className="text-blue-500 animate-[spin_12s_linear_infinite]" size={32} strokeWidth={1.5}/>
        </div>

        {/* Central Terminal Window */}
        <div className="w-full max-w-md bg-black/80 border border-cyan-800/50 rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col h-80 relative z-10 overflow-hidden">
            <div className="h-6 bg-cyan-950/60 border-b border-cyan-900/50 flex items-center px-3 gap-2">
                <Terminal size={12} className="text-cyan-500" />
                <span className="text-[9px] text-cyan-400 tracking-widest font-bold">SECURE_VERIFICATION_NODE</span>
            </div>
            
            <div className="flex-1 p-4 font-mono text-[10px] text-cyan-300 flex flex-col gap-1 overflow-hidden relative">
                {animStep >= 1 && <div className="animate-[typeWriter_0.2s_steps(40,end)_forwards] overflow-hidden whitespace-nowrap text-blue-400">0x00A1: INIT NEURAL_NET_V9</div>}
                {animStep >= 1 && <div className="animate-[typeWriter_0.2s_steps(40,end)_0.1s_forwards] overflow-hidden whitespace-nowrap opacity-0" style={{ animationFillMode: 'forwards', animationDelay: '0.1s' }}>0x00A2: EXTRACTING VALUES...</div>}
                
                {animStep >= 2 && (
                    <>
                        <div className="animate-[typeWriter_0.2s_steps(40,end)_forwards] overflow-hidden whitespace-nowrap text-cyan-300">0x00A3: FOUND [LKR {currentVerifyingSlip.amount}]</div>
                        <div className="animate-[typeWriter_0.2s_steps(40,end)_forwards] overflow-hidden whitespace-nowrap text-orange-400" style={{ animationFillMode: 'forwards', animationDelay: '0.05s' }}>0x00A4: UPLINKING TO MAINFRAME...</div>
                    </>
                )}
                
                {animStep >= 3 && (
                    <div className="animate-[typeWriter_0.2s_steps(40,end)_forwards] overflow-hidden whitespace-nowrap text-cyan-300">0x00A5: RUNNING MATCH ALGORITHM</div>
                )}

                {animStep >= 4 && (
                    <div className="animate-[typeWriter_0.2s_steps(40,end)_forwards] overflow-hidden whitespace-nowrap text-black font-bold mt-2 pt-2 border-t border-cyan-900/50 bg-cyan-500 inline-block px-1">0x00A6: SEQUENCE COMPLETE. MATCH FOUND.</div>
                )}

                {animStep < 4 && (
                    <div className="mt-2 text-cyan-600 animate-pulse">Processing<span className="animate-[ping_1.5s_infinite]">...</span></div>
                )}
            </div>

            {/* Progress Bar moving fast */}
            <div className="h-1 bg-gray-900 w-full relative overflow-hidden">
                <div className="absolute top-0 left-0 h-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] transition-all duration-300 ease-out" 
                     style={{ width: animStep === 1 ? '25%' : animStep === 2 ? '50%' : animStep === 3 ? '75%' : '100%' }}></div>
                {animStep < 4 && (
                     <div className="absolute top-0 left-0 h-full w-[20%] bg-white/40 skew-x-12 animate-[radarSweep_1s_linear_infinite]"></div>
                )}
            </div>
        </div>
      </div>`;

// Replace from {/\* CENTER COL: RADAR & MAIN STATS \*/} up to {/\* RIGHT COL: DATABASE & LOGS \*/}
const startIndex = code.indexOf(oldMiddle);
const endIndex = code.indexOf('{/* RIGHT COL: DATABASE & LOGS */}');

if (startIndex !== -1 && endIndex !== -1) {
    code = code.substring(0, startIndex) + replacement + '\n\n      ' + code.substring(endIndex);
    fs.writeFileSync('backend/scratch_ui.jsx', code);
    console.log("Middle replaced");
} else {
    console.log("Could not find blocks");
}
