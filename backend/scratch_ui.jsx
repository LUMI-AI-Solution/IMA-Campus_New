{/* VERIFICATION ANIMATION OVERLAY - PREMIUM MILITARY HUD */}
{isVerifying && currentVerifyingSlip && createPortal(
  <div className="fixed inset-0 z-[99999] bg-[#020608] text-cyan-500 font-mono overflow-hidden w-screen h-screen flex flex-col select-none box-border" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
    {/* Global Background Effects */}
    <div className="absolute inset-0 pointer-events-none opacity-20" style={{ 
      backgroundImage: 'linear-gradient(rgba(6, 182, 212, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.2) 1px, transparent 1px)', 
      backgroundSize: '40px 40px'
    }}></div>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.08)_0%,transparent_100%)] pointer-events-none"></div>

    {/* TOP HUD HEADER */}
    <div className="h-12 border-b border-cyan-900/60 flex justify-between items-center px-8 text-[10px] tracking-[0.2em] relative z-10 bg-[#040c12]/90 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.8)] overflow-hidden">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-orange-500 animate-pulse rounded-full shadow-[0_0_8px_#f97316]"></span>
            <span className="text-orange-400">SYS.DEF.NODE // 0x4A9</span>
        </div>
        <span className="px-3 py-0.5 border border-cyan-800 bg-cyan-950/50 text-cyan-400">UPLINK_ACTIVE</span>
      </div>
      <div className="text-cyan-300 font-bold tracking-[0.5em] text-xs absolute left-1/2 -translate-x-1/2 overflow-hidden flex items-center justify-center h-full w-96">
        <span className="animate-glitch" data-text="TACTICAL VERIFICATION PROTOCOL">TACTICAL VERIFICATION PROTOCOL</span>
      </div>
      <div className="flex items-center gap-6 text-cyan-600">
        <span className="text-blue-400">SAT-LINK: SECURE</span>
        <span>ENC: AES-256-GCM</span>
        <span>LATENCY: 14ms</span>
      </div>
    </div>

    {/* MAIN GRID */}
    <div className="flex-1 w-full h-[calc(100vh-3rem)] max-w-full overflow-hidden grid grid-cols-12 gap-6 p-6 relative z-10 box-border">
      
      {/* LEFT COL: TARGET INTEL */}
      <div className="col-span-3 flex flex-col gap-6 h-full overflow-hidden">
        {/* TARGET ID PANEL */}
        <div className="h-24 border border-cyan-900/50 bg-[#051016]/80 p-4 relative shrink-0">
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400"></div>
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400"></div>
          <div className="text-[9px] text-cyan-600 mb-2">TARGET CLASSIFICATION</div>
          <div className="text-xl font-bold text-cyan-300 tracking-widest mb-1 flex justify-between">
            <span>SLIP_{currentVerifyingSlip.id.toString().padStart(6, '0')}</span>
            <span className="text-[10px] text-orange-400 border border-orange-500/50 px-1 py-0.5 rounded-sm">PENDING</span>
          </div>
          <div className="text-[10px] text-cyan-500/70">{currentVerifyingSlip.student?.firstName} {currentVerifyingSlip.student?.lastName} // AUTH_REQ</div>
        </div>

        {/* IMAGE SCANNER PANEL */}
        <div className="h-64 border border-cyan-800/40 bg-[#02080c] relative p-1 shrink-0 flex items-center justify-center">
          <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-cyan-400 z-10"></div>
          <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-cyan-400 z-10"></div>
          <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-cyan-400 z-10"></div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-cyan-400 z-10"></div>

          <div className="absolute top-2 left-2 text-[8px] bg-black/60 px-1 border border-cyan-900 z-10 text-cyan-500">OPTICAL_SENSOR_01</div>
          <div className="absolute bottom-2 right-2 flex gap-1 z-10 items-center">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
            <span className="text-[8px] text-red-400">REC</span>
          </div>

          <div className="w-[85%] h-[85%] relative overflow-hidden bg-black/80 flex items-center justify-center border border-cyan-900/30">
            {currentVerifyingSlip.slip_image ? (
                <img 
                  src={
                    import.meta.env.VITE_API_URL
                      ? import.meta.env.VITE_API_URL.replace('/api', '') + `/api/storage/documents/${currentVerifyingSlip.slip_image.split(',')[0]}`
                      : (window.location.protocol === 'https:' ? `https://${window.location.hostname}` : `http://${window.location.hostname}:5000`) + `/api/storage/documents/${currentVerifyingSlip.slip_image.split(',')[0]}`
                  } 
                  alt="slip" 
                  className={`w-full h-full object-contain filter ${animStep === 1 ? 'contrast-150 brightness-110 sepia-[0.3] hue-rotate-15 saturate-200' : 'grayscale brightness-50'}`} 
                />
            ) : (
                <FileText size={40} className="text-gray-800" />
            )}
            
            {animStep >= 1 && animStep < 4 && (
                <div className="absolute left-0 w-full h-[30px] bg-gradient-to-b from-transparent via-cyan-400/50 to-transparent animate-[cyberScan_2s_linear_infinite] mix-blend-screen shadow-[0_0_20px_rgba(6,182,212,0.6)]"></div>
            )}
            
            {animStep === 1 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-full h-full border border-cyan-500/20 rounded-full relative animate-[spin_10s_linear_infinite] scale-150">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-full bg-cyan-500/30"></div>
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[1px] bg-cyan-500/30"></div>
                    </div>
                    <div className="absolute w-16 h-16 border-2 border-cyan-400/60 rounded-sm animate-pulse"></div>
                    <div className="absolute w-1 h-1 bg-red-500 rounded-full animate-ping shadow-[0_0_10px_red]"></div>
                </div>
            )}
          </div>
        </div>

        {/* OCR DECODE PANEL */}
        <div className="flex-1 border border-cyan-900/50 bg-[#051016]/80 p-3 overflow-hidden relative">
          <div className="text-[8px] text-cyan-700 border-b border-cyan-900/50 mb-2 pb-1 flex justify-between">
            <span>DECRYPTED_PAYLOAD</span>
            <span className="animate-pulse">_</span>
          </div>
          <div className="font-mono text-[9px] text-cyan-500/80 leading-relaxed flex flex-col gap-1">
            {animStep >= 1 ? (
              <>
                <div className="animate-[typeWriter_0.5s_steps(40,end)_forwards] overflow-hidden whitespace-nowrap text-blue-400">0x00A1: INIT NEURAL_NET_V9</div>
                <div className="animate-[typeWriter_0.5s_steps(40,end)_0.2s_forwards] overflow-hidden whitespace-nowrap opacity-0">0x00A2: EXTRACTING VALUES...</div>
                {animStep >= 2 && (
                  <>
                    <div className="animate-[typeWriter_0.5s_steps(40,end)_forwards] overflow-hidden whitespace-nowrap text-cyan-300">0x00A3: FOUND [LKR {currentVerifyingSlip.amount}]</div>
                    <div className="animate-[typeWriter_0.5s_steps(40,end)_0.2s_forwards] overflow-hidden whitespace-nowrap text-orange-400">0x00A4: UPLINKING TO MAINFRAME...</div>
                  </>
                )}
                {animStep >= 3 && (
                  <div className="animate-[typeWriter_0.5s_steps(40,end)_forwards] overflow-hidden whitespace-nowrap text-cyan-300">0x00A5: RUNNING MATCH ALGORITHM</div>
                )}
                {animStep >= 4 && (
                  <div className="animate-[typeWriter_0.5s_steps(40,end)_forwards] overflow-hidden whitespace-nowrap text-black font-bold bg-cyan-500 mt-2 p-1">0x00A6: MATCH SECURED.</div>
                )}
                
                <div className="absolute bottom-2 right-2 text-[8px] opacity-40 text-right animate-[matrixFade_1s_infinite_alternate] text-blue-500">
                  E8 2F A1 44<br/>1B 9C 00 F2<br/>FF AA 01 9B
                </div>
              </>
            ) : (
              <div className="animate-pulse">AWAITING INTEL...</div>
            )}
          </div>
        </div>
      </div>

            {/* CENTER COL: TERMINAL & PROGRESS */}
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
      </div>

      {/* RIGHT COL: DATABASE & LOGS */}
      <div className="col-span-3 flex flex-col gap-6 h-full overflow-hidden">
        
        {/* SECTOR GRID DB TABLE */}
        <div className="flex-[2] border border-cyan-900/50 bg-[#051016]/80 flex flex-col overflow-hidden relative">
            <div className="h-10 border-b border-cyan-900/50 bg-cyan-950/30 flex items-center justify-between px-4 text-[10px] text-cyan-400 tracking-widest font-bold shadow-[0_4px_10px_rgba(0,0,0,0.3)]">
                <span>MAINFRAME DB SCAN</span>
                <span className="flex items-center gap-2"><div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div> LIVE</span>
            </div>
            
            <div className="flex-1 p-3 flex flex-col gap-2 justify-center relative z-10 overflow-hidden">
                {[1,2,3,4,5,6,7].map(i => {
                    const isMatchRow = animStep >= 3 && i === 4;
                    const isScanningRow = animStep === 2 && i === Math.floor(Date.now() / 150) % 7 + 1;
                    return (
                    <div key={i} className={`h-11 rounded-sm px-3 flex items-center justify-between font-mono text-[9px] transition-all duration-150 border-l-2 ${
                        isMatchRow ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-[inset_0_0_20px_rgba(6,182,212,0.3)] z-20 scale-105' : 
                        isScanningRow ? 'bg-cyan-900/40 text-cyan-300 border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.2)]' : 
                        'bg-black/40 text-cyan-700 border-cyan-900 hover:bg-cyan-950/30'
                    }`}>
                        <div className="flex flex-col gap-0.5">
                            <span className={`${isMatchRow ? 'font-bold text-cyan-300 tracking-wider text-[10px]' : ''}`}>
                                {isMatchRow ? '>> TARGET_LOCKED <<' : `REF_${10000 + i * 821}`}
                            </span>
                            <span className="text-[7px] text-blue-500 tracking-widest">{selectedMonth.toUpperCase()} SCTOR_{i}</span>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                            <span className={`${isMatchRow ? 'text-white text-xs font-bold' : ''}`}>
                                {isMatchRow ? 'LKR ' + currentVerifyingSlip.amount.toLocaleString() : 'LKR ' + (Math.random() * 10000).toFixed(0)}
                            </span>
                            <span className={`text-[7px] tracking-widest px-1 ${
                                isMatchRow ? 'bg-cyan-500 text-black font-bold animate-pulse' : 
                                isScanningRow ? 'text-orange-400 border border-orange-500/50' : 'text-cyan-800'
                            }`}>
                                {isMatchRow ? 'SECURED' : isScanningRow ? 'SCANNING' : 'WAITING'}
                            </span>
                        </div>
                    </div>
                )})}
            </div>
        </div>

        {/* SYSTEM LOGS TERMINAL */}
        <div className="flex-1 border border-cyan-900/50 bg-[#02080c] p-4 relative font-mono text-[9px] leading-relaxed overflow-hidden flex flex-col">
            <div className="absolute top-0 right-0 px-2 py-0.5 bg-cyan-950 border-b border-l border-cyan-900/50 text-cyan-500 text-[8px]">SYS_LOGS</div>
            <div className="text-cyan-600 mb-2 border-b border-cyan-900/30 pb-1 font-bold">KERNEL STDOUT &gt;</div>
            <div className="text-cyan-400/70 space-y-1 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                {animStep >= 1 && <div className="animate-[slideIn_0.2s_ease-out] text-blue-400">&gt; Booting tactical interface... OK</div>}
                {animStep >= 1 && <div className="animate-[slideIn_0.2s_ease-out_0.1s_both] text-blue-400">&gt; Loading Neural Core v9.4... OK</div>}
                {animStep >= 2 && <div className="animate-[slideIn_0.2s_ease-out]">&gt; Initiating encrypted handshake...</div>}
                {animStep >= 2 && <div className="animate-[slideIn_0.2s_ease-out_0.2s_both] text-orange-400">&gt; WARNING: Anomalous traffic detected.</div>}
                {animStep >= 2 && <div className="animate-[slideIn_0.2s_ease-out_0.4s_both]">&gt; Bypassing proxy... SUCCESS</div>}
                {animStep >= 3 && <div className="animate-[slideIn_0.2s_ease-out]">&gt; Executing DeepMatch algo... RUNNING</div>}
                {animStep >= 3 && <div className="animate-[slideIn_0.2s_ease-out_0.3s_both] text-cyan-300">&gt; Signature identified in sector 4.</div>}
                {animStep >= 4 && <div className="animate-[slideIn_0.2s_ease-out] font-bold text-black bg-cyan-500 inline-block px-1 mt-1">&gt; MISSION ACCOMPLISHED. SYSTEM OVERRIDE.</div>}
                {animStep < 4 && <div className="w-2 h-3 bg-cyan-500 mt-2 animate-pulse"></div>}
            </div>
        </div>
      </div>
    </div>
    
    <style>{`
      @keyframes cyberScan { 0% { top: -20px; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
      @keyframes typeWriter { from { width: 0; opacity: 1; } to { width: 100%; opacity: 1; } }
      @keyframes slideIn { from { transform: translateX(-10px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      @keyframes matrixFade { 0% { opacity: 0.1; } 100% { opacity: 0.6; } }
      @keyframes dash { to { stroke-dashoffset: -10; } }
      
      .custom-scrollbar::-webkit-scrollbar { width: 4px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(6, 182, 212, 0.4); border-radius: 4px; }
      
      .animate-glitch { position: relative; }
      .animate-glitch::before, .animate-glitch::after { content: attr(data-text); position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
      .animate-glitch::before { left: 2px; text-shadow: -1px 0 red; clip: rect(0px, 400px, 30px, 0); animation: glitch-anim-2 3s infinite linear alternate-reverse; }
      .animate-glitch::after { left: -2px; text-shadow: -1px 0 blue; clip: rect(0px, 400px, 30px, 0); animation: glitch-anim 2.5s infinite linear alternate-reverse; }
      @keyframes glitch-anim { 0% { clip: rect(10px, 400px, 15px, 0); } 20% { clip: rect(20px, 400px, 25px, 0); } 40% { clip: rect(5px, 400px, 10px, 0); } 60% { clip: rect(15px, 400px, 20px, 0); } 80% { clip: rect(0px, 400px, 5px, 0); } 100% { clip: rect(10px, 400px, 15px, 0); } }
      @keyframes glitch-anim-2 { 0% { clip: rect(5px, 400px, 10px, 0); } 20% { clip: rect(15px, 400px, 20px, 0); } 40% { clip: rect(0px, 400px, 5px, 0); } 60% { clip: rect(20px, 400px, 25px, 0); } 80% { clip: rect(10px, 400px, 15px, 0); } 100% { clip: rect(5px, 400px, 10px, 0); } }
    `}</style>
  </div>
, document.body)}
