const fs = require('fs');
const files = [
    '/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemOpen/LeadCard.jsx',
    '/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AftersemPaid/LeadCard.jsx',
    '/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/LeadCard.jsx'
];

const functionStr = `
    const handleSendCallRequest = async (e) => {
        e.preventDefault();
        const loadToast = toast.loading("Sending call request...");
        try {
            const token = localStorage.getItem('token');
            await axios.post('/leads/send-call-request', { leadId: lead.id }, { headers: { Authorization: \`Bearer \${token}\` } });
            toast.success("Request sent successfully!", { id: loadToast });
            if (typeof handleUpdateLocalLead === 'function') {
                handleUpdateLocalLead(lead.id, 'waCallPermissionStatus', 'PENDING');
            }
        } catch (error) {
            toast.error("Failed to send request.", { id: loadToast });
        }
    };

    return (`;

const replaceStr = `{lead.waCallPermissionStatus === 'ALLOWED' && lead.waCallPermissionExpiry && new Date(lead.waCallPermissionExpiry) > new Date() ? (
                            <button className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-lg py-1.5 text-xs font-bold flex flex-col items-center justify-center shadow-md shadow-emerald-500/20 transition-all leading-none border border-emerald-500/30">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <FaWhatsapp size={14} /> WhatsApp Call
                                </div>
                                <span className="text-[9px] font-mono text-emerald-100 bg-black/20 px-1.5 py-0.5 rounded">
                                    Ends: {Math.max(0, Math.ceil((new Date(lead.waCallPermissionExpiry) - new Date()) / (1000 * 60 * 60 * 24)))} Days
                                </span>
                            </button>
                        ) : lead.waCallPermissionStatus === 'PENDING' ? (
                            <button disabled className="flex-1 bg-slate-800 text-slate-400 rounded-lg py-1.5 text-[10px] font-bold flex flex-col items-center justify-center shadow-sm transition-all leading-none border border-slate-700 opacity-70 cursor-not-allowed">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <FaWhatsapp size={12} className="text-slate-500" /> Req. Permission
                                </div>
                                <span className="text-[8px] text-slate-500 font-medium">Sent (Pending)</span>
                            </button>
                        ) : lead.waCallPermissionStatus === 'DISALLOWED' ? (
                            <button disabled className="flex-1 bg-rose-900/40 text-rose-300 rounded-lg py-1.5 text-[10px] font-bold flex flex-col items-center justify-center shadow-sm transition-all leading-none border border-rose-800/50 opacity-80 cursor-not-allowed">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <FaTimes size={12} className="text-rose-500" /> Call Disallowed
                                </div>
                                <span className="text-[8px] text-rose-400/70 font-medium">Student Declined</span>
                            </button>
                        ) : (
                            <button onClick={handleSendCallRequest} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg py-1.5 text-[10px] font-bold flex flex-col items-center justify-center shadow-sm transition-all leading-none border border-slate-700">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <FaWhatsapp size={12} className="text-emerald-500" /> Req. Permission
                                </div>
                                <span className="text-[8px] text-slate-500 font-medium">Send Template</span>
                            </button>
                        )}`;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace `return (` with the function + `return (`
    if (!content.includes('handleSendCallRequest')) {
        content = content.replace('    return (', functionStr);
    }
    
    // Find the old button logic
    const oldButtonStart = '{lead.waCallPermissionExpiry && new Date(lead.waCallPermissionExpiry) > new Date() ? (';
    const oldButtonEnd = ')}';
    
    // We can just regex replace the whole block between oldButtonStart and the end of the block
    const regex = /\{lead\.waCallPermissionExpiry && new Date\(lead\.waCallPermissionExpiry\) > new Date\(\) \? \([\s\S]*?Req\. Permission[\s\S]*?Send Template[\s\S]*?<\/button>\s*\)\}/;
    
    content = content.replace(regex, replaceStr);
    
    fs.writeFileSync(file, content);
    console.log("Updated", file);
}
