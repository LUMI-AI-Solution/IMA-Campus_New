const fs = require('fs');

let code = fs.readFileSync('frontend/src/components/admin/AISlipVerification.jsx', 'utf8');

// 1. Remove ScanningAnimation usage
code = code.replace(
    /\{isVerifying && <ScanningAnimation targetSlipConfig=\{targetSlipConfig\} banksConfig=\{banksConfig\} \/>\}/g,
    ''
);

// 2. We need to insert the HUD at the end of the component return, right before the last `</div>` or similar
const hudOverlay = `
      {/* VERIFICATION ANIMATION OVERLAY - PREMIUM MILITARY HUD */}
      {isVerifying && showAnimation && currentVerifyingSlip && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,1)] animate-[scan_2s_linear_infinite]"></div>
                <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyan-400"></div>
                <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-cyan-400"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-cyan-400"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-cyan-400"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vh] border border-blue-900/30 rounded-full opacity-20 animate-[spin_10s_linear_infinite]"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vh] border border-cyan-900/30 rounded-full opacity-20 animate-[spin_7s_linear_infinite_reverse]"></div>
            </div>

            <div className="relative z-10 max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-gray-950/80 p-8 rounded-2xl border border-blue-500/30 shadow-[0_0_50px_rgba(59,130,246,0.15)]">
                
                <div className="flex flex-col items-center justify-center border border-cyan-500/20 rounded-xl p-4 bg-black/50 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
                    <div className="text-cyan-400 font-mono text-xs mb-4 uppercase tracking-widest flex items-center gap-2">
                        <Search size={14} className="animate-[spin_3s_linear_infinite]" /> TARGET LOCK
                    </div>
                    {currentVerifyingSlip.slip_image ? (
                        <div className="relative w-full aspect-square md:aspect-auto md:h-64 rounded-lg overflow-hidden border border-cyan-500/30 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
                            <img src={
                                currentVerifyingSlip.slip_image.startsWith('http') ? currentVerifyingSlip.slip_image : 
                                (import.meta.env.VITE_API_URL
                                    ? import.meta.env.VITE_API_URL.replace('/api', '') + '/storage/' + currentVerifyingSlip.slip_image
                                    : (window.location.protocol === 'https:' ? \`https://\${window.location.hostname}\` : \`http://\${window.location.hostname}:5000\`) + '/storage/' + currentVerifyingSlip.slip_image)
                            } alt="Scanning" className="w-full h-full object-contain filter contrast-125 opacity-80 mix-blend-screen" />
                            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent animate-[scan_1.5s_ease-in-out_infinite_alternate]"></div>
                        </div>
                    ) : (
                        <div className="w-full h-64 flex flex-col items-center justify-center text-cyan-900 border border-cyan-900/30 rounded-lg">
                            <Image size={40} className="mb-2 opacity-50" />
                            <span className="text-xs font-mono tracking-widest">NO TARGET IMAGE</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col text-left font-mono text-xs sm:text-sm space-y-3 bg-black/60 p-6 rounded-xl border border-gray-800 h-full justify-center relative shadow-inner">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600 opacity-50"></div>
                    
                    <div className="text-gray-500 mb-2 border-b border-gray-800 pb-2">
                        <Terminal size={12} className="inline mr-2" />
                        SECURE_TERM_v9.4.2 // SYS_AUTH_OK
                    </div>

                    <div className="animate-[typeWriter_0.5s_steps(40,end)_forwards] overflow-hidden whitespace-nowrap text-blue-400">0x00A1: INIT NEURAL_NET_V9</div>
                    <div className="animate-[typeWriter_0.5s_steps(40,end)_0.2s_forwards] overflow-hidden whitespace-nowrap opacity-0" style={{ animationFillMode: 'forwards', animationDelay: '0.2s' }}>0x00A2: EXTRACTING VALUES...</div>
                    
                    {animStep >= 2 && (
                        <>
                            <div className="animate-[typeWriter_0.5s_steps(40,end)_forwards] overflow-hidden whitespace-nowrap text-cyan-300">0x00A3: FOUND [LKR {currentVerifyingSlip.amount}]</div>
                            <div className="animate-[typeWriter_0.5s_steps(40,end)_forwards] overflow-hidden whitespace-nowrap text-orange-400" style={{ animationFillMode: 'forwards', animationDelay: '0.1s' }}>0x00A4: UPLINKING TO MAINFRAME...</div>
                        </>
                    )}
                    
                    {animStep >= 3 && (
                        <div className="animate-[typeWriter_0.5s_steps(40,end)_forwards] overflow-hidden whitespace-nowrap text-cyan-300">0x00A5: RUNNING MATCH ALGORITHM</div>
                    )}

                    {animStep >= 4 && (
                        <div className="animate-[typeWriter_0.5s_steps(40,end)_forwards] overflow-hidden whitespace-nowrap text-emerald-400 font-bold mt-4 pt-4 border-t border-gray-800">0x00A6: SEQUENCE COMPLETE.</div>
                    )}
                    
                    <div className="mt-auto pt-4 flex items-center justify-between text-[10px] text-gray-600 border-t border-gray-900">
                        <span>CPU: {Math.floor(Math.random() * 20 + 80)}%</span>
                        <span>MEM: 0x{Math.floor(Math.random() * 10000).toString(16).toUpperCase()}</span>
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> LINK_STABLE</span>
                    </div>
                </div>
            </div>
        </div>,
        document.body
      )}
`;

// Insert before the last `</div>`
const lastDivIndex = code.lastIndexOf('</div>');
code = code.substring(0, lastDivIndex) + hudOverlay + code.substring(lastDivIndex);

// Add createPortal to imports if missing
if (!code.includes('createPortal')) {
    code = code.replace(
        "import React, { useState, useEffect, useRef } from 'react';",
        "import React, { useState, useEffect, useRef } from 'react';\nimport { createPortal } from 'react-dom';"
    );
}

fs.writeFileSync('frontend/src/components/admin/AISlipVerification.jsx', code);
