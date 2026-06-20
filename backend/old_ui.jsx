        </div>      {/* VERIFICATION ANIMATION OVERLAY - PREMIUM MILITARY HUD */}
      {isVerifying && currentVerifyingSlip && (
        <div className="fixed inset-0 z-[100] bg-[#010603] text-emerald-500 font-mono overflow-hidden flex flex-col select-none">
          {/* Global Background Effects */}
          <div className="absolute inset-0 pointer-events-none opacity-20" style={{ 
            backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.4) 1px, transparent 1px)', 
            backgroundSize: '30px 30px'
          }}></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05)_0%,transparent_100%)] pointer-events-none"></div>

          {/* TOP HUD HEADER */}
          <div className="h-12 border-b border-emerald-900/60 flex justify-between items-center px-6 text-[10px] tracking-[0.2em] relative z-10 bg-[#020a05]/80 backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-4">
              <span className="w-2 h-2 bg-red-500 animate-pulse rounded-full shadow-[0_0_8px_#ef4444]"></span>
              <span>SYS.DEF.NODE // 0x4A9</span>
              <span className="px-2 py-0.5 border border-emerald-800 bg-emerald-950/50 text-emerald-400">ACTIVE</span>
            </div>
            <div className="text-emerald-300 font-bold tracking-[0.4em] text-xs">
              <span className="animate-glitch" data-text="TACTICAL VERIFICATION PROTOCOL">TACTICAL VERIFICATION PROTOCOL</span>
            </div>
            <div className="flex items-center gap-4 text-emerald-600">
              <span>SAT-LINK: SECURE</span>
              <span>ENC: AES-256-GCM</span>
              <span>LATENCY: 14ms</span>
            </div>
          </div>

          {/* MAIN GRID */}
          <div className="flex-1 grid grid-cols-12 gap-6 p-6 relative z-10">
            
            {/* LEFT COL: TARGET INTEL */}
            <div className="col-span-3 flex flex-col gap-6">
              {/* TARGET ID PANEL */}
              <div className="h-24 border border-emerald-900/50 bg-[#030d07]/60 p-4 relative">
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-emerald-400"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-emerald-400"></div>
                <div className="text-[9px] text-emerald-600 mb-2">TARGET CLASSIFICATION</div>
                <div className="text-xl font-bold text-emerald-300 tracking-widest mb-1">SLIP_{currentVerifyingSlip.id.toString().padStart(6, '0')}</div>
                <div className="text-[10px] text-emerald-500/70">{currentVerifyingSlip.student?.firstName} {currentVerifyingSlip.student?.lastName} // AUTH_PENDING</div>
              </div>

              {/* IMAGE SCANNER PANEL */}
              <div className="flex-1 border border-emerald-800/40 bg-[#010804] relative p-1">
                {/* HUD Corner brackets */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-emerald-400 z-10"></div>
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-emerald-400 z-10"></div>
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-emerald-400 z-10"></div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-emerald-400 z-10"></div>

                <div className="absolute top-2 left-2 text-[8px] bg-black/60 px-1 border border-emerald-900 z-10">OPTICAL_SENSOR_01</div>
                <div className="absolute bottom-2 right-2 flex gap-1 z-10">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                  <span className="text-[8px]">REC</span>
                </div>

                <div className="w-full h-full relative overflow-hidden bg-black/80 flex items-center justify-center">
                  {currentVerifyingSlip.slip_image ? (
                      <img 
                        src={
                          import.meta.env.VITE_API_URL
                            ? import.meta.env.VITE_API_URL.replace('/api', '') + `/api/storage/documents/${currentVerifyingSlip.slip_image.split(',')[0]}`
                            : (window.location.protocol === 'https:' ? `https://${window.location.hostname}` : `http://${window.location.hostname}:5000`) + `/api/storage/documents/${currentVerifyingSlip.slip_image.split(',')[0]}`
                        } 
                        alt="slip" 
                        className={`w-full h-full object-contain filter ${animStep === 1 ? 'contrast-150 brightness-110 sepia-[0.3] hue-rotate-15' : 'grayscale brightness-50'}`} 
                      />
                  ) : (
                      <FileText size={40} className="text-gray-800" />
                  )}
                  
                  {/* Scanline */}
                  {animStep >= 1 && animStep < 4 && (
                      <div className="absolute left-0 w-full h-[20px] bg-gradient-to-b from-transparent via-emerald-400/80 to-transparent animate-[cyberScan_2s_linear_infinite] mix-blend-screen shadow-[0_0_20px_rgba(16,185,129,0.8)]"></div>
                  )}
                  
                  {/* Crosshairs */}
                  {animStep === 1 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-[80%] h-[80%] border border-emerald-500/20 rounded-full relative animate-[spin_10s_linear_infinite]">
                              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-full bg-emerald-500/20"></div>
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[1px] bg-emerald-500/20"></div>
                          </div>
                          <div className="absolute w-24 h-24 border-2 border-emerald-400/60 rounded-full"></div>
                          <div className="absolute w-1 h-1 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_red]"></div>
                      </div>
                  )}
                </div>
              </div>

              {/* OCR DECODE PANEL */}
              <div className="h-40 border border-emerald-900/50 bg-[#030d07]/60 p-3 overflow-hidden relative">
                <div className="text-[8px] text-emerald-700 border-b border-emerald-900/50 mb-2 pb-1">DECRYPTED_PAYLOAD</div>
                <div className="font-mono text-[9px] text-emerald-500/80 leading-relaxed">
                  {animStep >= 1 ? (
                    <>
                      <div className="animate-[typeWriter_0.5s_steps(40,end)_forwards] overflow-hidden whitespace-nowrap">0x00A1: INIT NEURAL_NET_V9</div>
                      <div className="animate-[typeWriter_0.5s_steps(40,end)_0.2s_forwards] overflow-hidden whitespace-nowrap opacity-0">0x00A2: EXTRACTING VALUES...</div>
                      {animStep >= 2 && (
                        <>
                          <div className="animate-[typeWriter_0.5s_steps(40,end)_forwards] overflow-hidden whitespace-nowrap text-emerald-300">0x00A3: FOUND [LKR {currentVerifyingSlip.amount}]</div>
                          <div className="animate-[typeWriter_0.5s_steps(40,end)_0.2s_forwards] overflow-hidden whitespace-nowrap">0x00A4: UPLINKING TO MAINFRAME...</div>
                        </>
                      )}
                      {animStep >= 3 && (
                        <div className="animate-[typeWriter_0.5s_steps(40,end)_forwards] overflow-hidden whitespace-nowrap text-emerald-300">0x00A5: RUNNING MATCH ALGORITHM</div>
                      )}
                      {animStep >= 4 && (
                        <div className="animate-[typeWriter_0.5s_steps(40,end)_forwards] overflow-hidden whitespace-nowrap text-white font-bold bg-emerald-600/30">0x00A6: MATCH SECURED.</div>
                      )}
                      
                      {/* Random Matrix Code falling */}
                      <div className="absolute bottom-2 right-2 text-[8px] opacity-40 text-right animate-[matrixFade_1s_infinite_alternate]">
                        E8 2F A1 44<br/>1B 9C 00 F2
                      </div>
                    </>
                  ) : (
                    <div className="animate-pulse">AWAITING INTEL...</div>
                  )}
                </div>
              </div>
            </div>

            {/* CENTER COL: RADAR & MAIN STATS */}
            <div className="col-span-6 flex flex-col items-center justify-center relative border border-emerald-900/30 bg-[#020603]/80 p-6 overflow-hidden">
              {/* Decorative Center HUD markings */}
              <div className="absolute top-4 left-4 text-[8px] text-emerald-700">AZIMUTH: 144.2<br/>ELEV: -12.4</div>
              <div className="absolute bottom-4 right-4 text-[8px] text-emerald-700 text-right">FREQ: 840.2 MHz<br/>BAND: X-RAY</div>

              {/* MASSIVE RADAR */}
              <div className="relative w-80 h-80 flex items-center justify-center">
                  {/* Background grids */}
                  <div className="absolute inset-0 border border-emerald-900/60 rounded-full"></div>
                  <div className="absolute w-[80%] h-[80%] border border-emerald-800/40 rounded-full"></div>
                  <div className="absolute w-[60%] h-[60%] border border-emerald-700/30 rounded-full"></div>
                  <div className="absolute w-[40%] h-[40%] border border-emerald-600/20 rounded-full"></div>
                  <div className="absolute w-full h-[1px] bg-emerald-900/50"></div>
                  <div className="absolute h-full w-[1px] bg-emerald-900/50"></div>
                  
                  {/* Rotating elements */}
                  <div className={`absolute inset-0 border-[4px] border-dashed border-emerald-500/20 rounded-full transition-all duration-1000 ${animStep >= 2 ? 'animate-[spin_10s_linear_infinite]' : ''}`}></div>
                  <div className={`absolute w-[70%] h-[70%] border-[2px] border-dashed border-emerald-400/30 rounded-full transition-all duration-1000 ${animStep >= 2 ? 'animate-[spin_7s_linear_infinite_reverse]' : ''}`}></div>
                  
                  {/* Radar Sweep */}
                  {animStep >= 2 && animStep < 4 && (
                      <div className="absolute inset-0 rounded-full overflow-hidden mix-blend-screen opacity-60">
                          <div className="absolute top-1/2 left-1/2 w-full h-full origin-top-left animate-[spin_3s_linear_infinite] bg-gradient-to-br from-emerald-400/40 to-transparent"></div>
                      </div>
                  )}

                  {/* Target Pings */}
                  {animStep >= 3 && (
                      <>
                          <div className="absolute top-[30%] left-[60%] w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_10px_#34d399] animate-ping"></div>
                          <div className="absolute top-[60%] left-[30%] w-1.5 h-1.5 bg-emerald-600 rounded-full opacity-50"></div>
                          <div className="absolute top-[45%] left-[45%] w-1 h-1 bg-red-500 rounded-full animate-ping"></div>
                      </>
                  )}

                  {/* Center Status text */}
                  <div className="absolute flex flex-col items-center justify-center bg-[#020603]/80 p-4 rounded-full border border-emerald-900 shadow-[0_0_30px_#000]">
                      {animStep === 1 && <><Activity className="text-emerald-500 animate-pulse mb-2" size={32}/><span className="text-[10px] tracking-widest text-emerald-400 animate-pulse">EXTRACTING</span></>}
                      {animStep === 2 && <><Database className="text-emerald-400 animate-pulse mb-2" size={32}/><span className="text-[10px] tracking-widest text-emerald-300 animate-pulse">UPLINKING</span></>}
                      {animStep === 3 && <><Search className="text-red-400 animate-[spin_2s_linear_infinite] mb-2" size={32}/><span className="text-[10px] tracking-widest text-red-400 font-bold">TARGETING</span></>}
                      {animStep === 4 && <><CheckCircle className="text-emerald-400 mb-2 drop-shadow-[0_0_10px_#34d399]" size={32}/><span className="text-[10px] tracking-widest text-white font-bold bg-emerald-600 px-2 py-0.5 rounded shadow-[0_0_10px_#34d399]">VERIFIED</span></>}
                  </div>
              </div>

              {/* BOTTOM CHARTS (Fake Telemetry) */}
              <div className="absolute bottom-6 left-6 right-6 h-20 border-t border-emerald-900/60 pt-3 flex gap-6">
                  <div className="flex-1 flex flex-col justify-end gap-0.5 opacity-60">
                      <div className="text-[8px] text-emerald-600 mb-1">CONFIDENCE MATRIX</div>
                      <div className="flex items-end h-full gap-[2px]">
                          {[...Array(30)].map((_, i) => (
                              <div key={i} className="flex-1 bg-emerald-500/40 transition-all duration-300" style={{ height: `${animStep >= 3 ? (Math.sin(i) * 30 + 60) : (Math.random() * 40 + 10)}%` }}></div>
                          ))}
                      </div>
                  </div>
                  <div className="w-40 flex flex-col justify-end opacity-60">
                      <div className="text-[8px] text-emerald-600 mb-1">NETWORK STABILITY</div>
                      <svg className="w-full h-10" viewBox="0 0 100 40" preserveAspectRatio="none">
                          <polyline points={animStep >= 2 ? "0,20 10,10 20,30 30,15 40,25 50,5 60,35 70,20 80,10 90,25 100,15" : "0,35 10,35 20,35 30,35 40,35 50,35"} fill="none" stroke="#10b981" strokeWidth="1" className="animate-pulse" />
                      </svg>
                  </div>
              </div>
            </div>

            {/* RIGHT COL: DATABASE & LOGS */}
            <div className="col-span-3 flex flex-col gap-6">
              
              {/* SECTOR GRID DB TABLE */}
              <div className="flex-1 border border-emerald-900/50 bg-[#030d07]/60 flex flex-col overflow-hidden relative">
                  <div className="h-8 border-b border-emerald-900/50 bg-emerald-950/30 flex items-center justify-between px-3 text-[9px] text-emerald-500 tracking-widest">
                      <span>MAINFRAME DB SCAN</span>
                      <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div> LIVE</span>
                  </div>
                  
                  <div className="flex-1 p-3 flex flex-col gap-2 justify-center relative z-10">
                      {[1,2,3,4,5,6].map(i => {
                          const isMatchRow = animStep >= 3 && i === 3;
                          const isScanningRow = animStep === 2 && i === Math.floor(Date.now() / 100) % 6 + 1;
                          return (
                          <div key={i} className={`h-10 rounded-sm px-3 flex items-center justify-between font-mono text-[9px] transition-all duration-200 border-l-2 ${
                              isMatchRow ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-[inset_0_0_20px_rgba(16,185,129,0.3)] z-20 scale-105' : 
                              isScanningRow ? 'bg-emerald-900/40 text-emerald-300 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 
                              'bg-black/40 text-emerald-700 border-emerald-900 hover:bg-emerald-950/20'
                          }`}>
                              <div className="flex flex-col">
                                  <span className={`${isMatchRow ? 'font-bold text-emerald-300 tracking-wider' : ''}`}>
                                      {isMatchRow ? '>> TARGET_LOCKED <<' : `REF_${10000 + i * 821}`}
                                  </span>
                                  <span className="text-[7px] text-emerald-600">{selectedMonth.toUpperCase()} SCTOR_{i}</span>
                              </div>
                              <div className="flex flex-col items-end">
                                  <span className={`${isMatchRow ? 'text-white text-xs font-bold' : ''}`}>
                                      {isMatchRow ? 'LKR ' + currentVerifyingSlip.amount.toLocaleString() : 'LKR ' + (Math.random() * 10000).toFixed(0)}
                                  </span>
                                  <span className={`text-[7px] tracking-widest ${
                                      isMatchRow ? 'text-emerald-400 animate-pulse' : 
                                      isScanningRow ? 'text-yellow-400' : 'text-emerald-800'
                                  }`}>
                                      {isMatchRow ? '[ SECURED ]' : isScanningRow ? 'SCANNING' : 'WAITING'}
                                  </span>
                              </div>
                          </div>
                      )})}
                  </div>
              </div>

              {/* SYSTEM LOGS TERMINAL */}
              <div className="h-48 border border-emerald-900/50 bg-[#010804] p-3 relative font-mono text-[8px] leading-relaxed overflow-hidden">
                  <div className="absolute top-0 right-0 px-2 py-0.5 bg-emerald-950 border-b border-l border-emerald-900/50 text-emerald-600">SYS_LOGS</div>
                  <div className="text-emerald-600 mb-1 border-b border-emerald-900/30 pb-1">KERNEL STDOUT &gt;</div>
                  <div className="text-emerald-400/70 space-y-1">
                      {animStep >= 1 && <div className="animate-[slideIn_0.3s_ease-out]">&gt; Booting tactical interface... OK</div>}
                      {animStep >= 1 && <div className="animate-[slideIn_0.3s_ease-out_0.2s_both]">&gt; Loading Neural Core v9.4... OK</div>}
                      {animStep >= 2 && <div className="animate-[slideIn_0.3s_ease-out]">&gt; Initiating encrypted handshake...</div>}
                      {animStep >= 2 && <div className="animate-[slideIn_0.3s_ease-out_0.2s_both] text-yellow-400">&gt; WARNING: High traffic detected on node.</div>}
                      {animStep >= 2 && <div className="animate-[slideIn_0.3s_ease-out_0.4s_both]">&gt; Bypassing firewall proxy... SUCCESS</div>}
                      {animStep >= 3 && <div className="animate-[slideIn_0.3s_ease-out]">&gt; Executing DeepMatch algo... RUNNING</div>}
                      {animStep >= 3 && <div className="animate-[slideIn_0.3s_ease-out_0.3s_both] text-emerald-300">&gt; Pattern identified in sector 3.</div>}
                      {animStep >= 4 && <div className="animate-[slideIn_0.3s_ease-out] font-bold text-white bg-emerald-600/30">&gt; MISSION ACCOMPLISHED. SYSTEM OVERRIDE.</div>}
                  </div>
                  {animStep < 4 && <div className="w-2 h-3 bg-emerald-500 mt-1 animate-pulse"></div>}
              </div>
            </div>
          </div>
          
          <style>{`
            @keyframes cyberScan { 0% { top: -20px; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
            @keyframes gridMove { 0% { background-position: 0 0; } 100% { background-position: 0 30px; } }
            @keyframes typeWriter { from { width: 0; opacity: 1; } to { width: 100%; opacity: 1; } }
            @keyframes slideIn { from { transform: translateX(-10px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @keyframes matrixFade { 0% { opacity: 0.1; } 100% { opacity: 0.5; } }
            .animate-glitch { position: relative; }
            .animate-glitch::before, .animate-glitch::after { content: attr(data-text); position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
            .animate-glitch::before { left: 2px; text-shadow: -1px 0 red; clip: rect(24px, 550px, 90px, 0); animation: glitch-anim-2 3s infinite linear alternate-reverse; }
            .animate-glitch::after { left: -2px; text-shadow: -1px 0 blue; clip: rect(85px, 550px, 140px, 0); animation: glitch-anim 2.5s infinite linear alternate-reverse; }
            @keyframes glitch-anim { 0% { clip: rect(66px, 9999px, 83px, 0); } 5% { clip: rect(100px, 9999px, 4px, 0); } 10% { clip: rect(85px, 9999px, 84px, 0); } 15% { clip: rect(27px, 9999px, 2px, 0); } 20% { clip: rect(31px, 9999px, 86px, 0); } 25% { clip: rect(100px, 9999px, 42px, 0); } 30% { clip: rect(34px, 9999px, 84px, 0); } 35% { clip: rect(14px, 9999px, 14px, 0); } 40% { clip: rect(23px, 9999px, 77px, 0); } 45% { clip: rect(81px, 9999px, 64px, 0); } 50% { clip: rect(8px, 9999px, 60px, 0); } 55% { clip: rect(93px, 9999px, 58px, 0); } 60% { clip: rect(6px, 9999px, 98px, 0); } 65% { clip: rect(3px, 9999px, 7px, 0); } 70% { clip: rect(41px, 9999px, 66px, 0); } 75% { clip: rect(16px, 9999px, 74px, 0); } 80% { clip: rect(15px, 9999px, 41px, 0); } 85% { clip: rect(15px, 9999px, 85px, 0); } 90% { clip: rect(63px, 9999px, 55px, 0); } 95% { clip: rect(4px, 9999px, 12px, 0); } 100% { clip: rect(11px, 9999px, 32px, 0); } }
            @keyframes glitch-anim-2 { 0% { clip: rect(47px, 9999px, 76px, 0); } 5% { clip: rect(60px, 9999px, 12px, 0); } 10% { clip: rect(11px, 9999px, 50px, 0); } 15% { clip: rect(69px, 9999px, 77px, 0); } 20% { clip: rect(22px, 9999px, 30px, 0); } 25% { clip: rect(39px, 9999px, 40px, 0); } 30% { clip: rect(67px, 9999px, 40px, 0); } 35% { clip: rect(83px, 9999px, 45px, 0); } 40% { clip: rect(87px, 9999px, 81px, 0); } 45% { clip: rect(42px, 9999px, 86px, 0); } 50% { clip: rect(39px, 9999px, 9px, 0); } 55% { clip: rect(34px, 9999px, 39px, 0); } 60% { clip: rect(25px, 9999px, 5px, 0); } 65% { clip: rect(74px, 9999px, 20px, 0); } 70% { clip: rect(76px, 9999px, 74px, 0); } 75% { clip: rect(84px, 9999px, 48px, 0); } 80% { clip: rect(60px, 9999px, 80px, 0); } 85% { clip: rect(17px, 9999px, 93px, 0); } 90% { clip: rect(49px, 9999px, 39px, 0); } 95% { clip: rect(76px, 9999px, 23px, 0); } 100% { clip: rect(11px, 9999px, 12px, 0); } }
          `}</style>
        </div>
      )}

