const fs = require('fs');
const file = '/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemOpen/LeadCard.jsx';
let content = fs.readFileSync(file, 'utf8');

const oldLocked = `    const isLocked = false; 
    const invalidPending = false;`;

const newLocked = `    const isLocked = lead?.locked || false; 
    const unlocksInDays = lead?.unlocksInDays || 0;
    const invalidPending = false;`;

content = content.replace(oldLocked, newLocked);

const oldRemark = `                    <div className="flex-1 flex flex-col min-h-[70px]">
                        <label className="text-[10px] font-bold text-slate-400 mb-1 flex justify-between items-center">
                            Remarks 
                            {typingMode === 'si-phonetic' && <span className="text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded text-[9px]">SIN</span>}
                        </label>
                        <textarea 
                            disabled={isLocked}
                            value={currentRemark} onChange={(e) => handleRemarkTyping(lead.id, e.target.value)} 
                            placeholder="Add your notes..." 
                            className={\`flex-1 w-full bg-black/30 border border-white/10 focus:border-indigo-500 rounded-lg p-2 text-xs font-medium text-slate-200 outline-none resize-none custom-scrollbar transition-colors\`} 
                        />
                    </div>`;

const newRemark = `                    <div className="flex-1 flex flex-col min-h-[70px]">
                        {lead?.r1Feedback && lead.coordinationRound === 2 && (
                            <div className="mb-2 p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-md">
                                <p className="text-[9px] font-bold text-indigo-400 uppercase mb-0.5">Round 1 Remark</p>
                                <p className="text-xs text-slate-300 whitespace-pre-wrap">{lead.r1Feedback}</p>
                            </div>
                        )}
                        <label className="text-[10px] font-bold text-slate-400 mb-1 flex justify-between items-center">
                            {lead?.coordinationRound === 2 ? 'Round 2 Remarks' : 'Remarks'}
                            {typingMode === 'si-phonetic' && <span className="text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded text-[9px]">SIN</span>}
                        </label>
                        <textarea 
                            disabled={isLocked}
                            value={currentRemark} onChange={(e) => handleRemarkTyping(lead.id, e.target.value)} 
                            placeholder="Add your notes..." 
                            className={\`flex-1 w-full \${isLocked ? 'bg-black/50 opacity-60' : 'bg-black/30'} border border-white/10 focus:border-indigo-500 rounded-lg p-2 text-xs font-medium text-slate-200 outline-none resize-none custom-scrollbar transition-colors\`} 
                        />
                    </div>`;

content = content.replace(oldRemark, newRemark);

const oldHeader = `{lead?.phone} {isLocked && <FaLock size={10} className="text-rose-500"/>}`;
const newHeader = `{lead?.phone} {isLocked && <div className="flex items-center gap-1 bg-rose-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold text-rose-400 ml-2 border border-rose-500/30"><FaLock size={8}/> Frozen: {unlocksInDays} Days</div>}`;

content = content.replace(oldHeader, newHeader);

fs.writeFileSync(file, content);
console.log('LeadCard.jsx updated');
