const fs = require('fs');

function updateLeadCard(filePath) {
    if (!fs.existsSync(filePath)) return;
    let code = fs.readFileSync(filePath, 'utf8');

    const targetSelect = /<select disabled=\{isLocked\} value=\{localData\.enrollmentStatus\}[\s\S]*?<\/select>/;
    const newSelect = \`<select disabled value={localData.enrollmentStatus} onChange={(e) => setLocalData({...localData, enrollmentStatus: e.target.value})} className="w-full bg-white/5 border border-white/10 text-slate-200 text-xs font-semibold rounded-lg px-2 py-1.5 outline-none opacity-80 cursor-not-allowed">
                                <option value="NON_ENROLLED" className="bg-slate-800">Non-Enrolled</option>
                                <option value="PAYMENT_PROCESSING" className="bg-slate-800 text-yellow-400">Payment Processing</option>
                                <option value="ENROLLED" className="bg-slate-800 text-emerald-400">Enrolled</option>
                            </select>\`;

    code = code.replace(targetSelect, newSelect);
    fs.writeFileSync(filePath, code);
    console.log("Updated: " + filePath);
}

updateLeadCard('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/LeadCard.jsx');
updateLeadCard('/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemOpen/LeadCard.jsx');
