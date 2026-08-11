import re

with open('/root/IMA-Campus/frontend/src/components/admin/AISlipVerification.jsx', 'r') as f:
    content = f.read()

# 1. Add stopBatchVerification logic
stop_logic = """
  const stopBatchVerification = async () => {
    try {
        const res = await api.post('/ai-verification/bulk-stop');
        toast.success(res.data.message || "Bulk verification stopped");
        // pollBulkStatus will naturally catch the stopped state in its next tick
    } catch (err) {
        toast.error(err.response?.data?.error || "Failed to stop bulk verification");
    }
  };
"""
# Insert after startBatchVerification
content = content.replace("const pollBulkStatus", stop_logic + "\n  const pollBulkStatus")

# 2. Main Navigation State
tab_state = """
  // Main View Tab
  const [mainTab, setMainTab] = useState('slips'); // 'slips' | 'vault'
"""
content = content.replace("const [activeTab, setActiveTab] = useState('pending');", "const [activeTab, setActiveTab] = useState('pending');\n" + tab_state)

# 3. Restructure Render
# Find the start of BULK VERIFICATION DASHBOARD
ui_start = content.find('{/* BULK VERIFICATION DASHBOARD */}')
# Find the start of BOTTOM PANEL: BANK STATEMENT VAULT
vault_start = content.find('{/* BOTTOM PANEL: BANK STATEMENT VAULT */}')

# We will extract the Vault and wrap both sections in a conditional render based on `mainTab`
vault_content_start = content.find('<div className="flex flex-col gap-6 mt-6">', vault_start)
# We need to find the end of the return statement to correctly close things. But this file ends with the modal.
# Instead of doing that, I'll just regex replace the parts I need.

# First, modify the button area in Bulk Dashboard to add the Stop button
old_button_area = """<button 
                    onClick={startBatchVerification}
                    disabled={bulkStatus?.isRunning || pendingSlips.length === 0}
                    className={`py-3 px-8 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition whitespace-nowrap ${bulkStatus?.isRunning ? 'bg-blue-900/50 border border-blue-500/30 cursor-not-allowed' : pendingSlips.length === 0 ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]'}`}
                >
                    {bulkStatus?.isRunning ? (
                        <><Loader className="animate-spin" size={20} /> Verifying Background...</>
                    ) : (
                        <><Search size={20} /> Start Bulk Auto-Verify</>
                    )}
                </button>"""

new_button_area = """<div className="flex gap-4">
                    {bulkStatus?.isRunning && (
                        <button 
                            onClick={stopBatchVerification}
                            className="py-3 px-8 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition whitespace-nowrap bg-red-600/80 hover:bg-red-500 shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                        >
                            <XCircle size={20} /> Stop
                        </button>
                    )}
                    <button 
                        onClick={startBatchVerification}
                        disabled={bulkStatus?.isRunning || pendingSlips.length === 0}
                        className={`py-3 px-8 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition whitespace-nowrap ${bulkStatus?.isRunning ? 'bg-blue-900/50 border border-blue-500/30 cursor-not-allowed' : pendingSlips.length === 0 ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]'}`}
                    >
                        {bulkStatus?.isRunning ? (
                            <><Loader className="animate-spin" size={20} /> Verifying...</>
                        ) : (
                            <><Search size={20} /> Start Bulk Auto-Verify</>
                        )}
                    </button>
                </div>"""

content = content.replace(old_button_area, new_button_area)

# Modify image rendering: object-cover -> object-contain and height h-48 -> h-64
content = content.replace('<div className="h-48 bg-black/50 relative overflow-hidden', '<div className="h-64 bg-black/50 relative overflow-hidden')
content = content.replace('w-full h-full object-cover group-hover:scale-105', 'w-full h-full object-contain group-hover:scale-105')

# Now add Main Tabs right after HEADER SECTION
header_end = content.find('</div>\n\n        {/* BULK VERIFICATION DASHBOARD */}')
main_tabs_ui = """
        {/* MAIN NAVIGATION TABS */}
        <div className="flex gap-4 mb-6 border-b border-gray-800 pb-2">
            <button onClick={() => setMainTab('slips')} className={`pb-2 px-6 font-bold text-lg transition-colors ${mainTab==='slips' ? 'text-blue-400 border-b-4 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>
                <Activity className="inline mr-2 mb-1" size={20}/>Collected Slips
            </button>
            <button onClick={() => setMainTab('vault')} className={`pb-2 px-6 font-bold text-lg transition-colors ${mainTab==='vault' ? 'text-emerald-400 border-b-4 border-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}>
                <Database className="inline mr-2 mb-1" size={20}/>Google Sheet Vault
            </button>
        </div>

        {mainTab === 'slips' ? (
            <>
"""
if header_end != -1:
    content = content[:header_end] + '</div>\n' + main_tabs_ui + content[header_end+6:]
else:
    print("Could not find header end")

# Find where Vault starts and close the slips section
vault_section_start = content.find('{/* BOTTOM PANEL: BANK STATEMENT VAULT */}')
if vault_section_start != -1:
    content = content[:vault_section_start] + "            </>\n        ) : (\n            <>\n" + content[vault_section_start:]
    
    # We need to close the `) : (<>` at the very end of the main view before modal.
    # The main view ends right before `{/* AI SLIP DATABASE BUILDER & CONFIG CENTER */}`
    settings_modal_start = content.find('{/* AI SLIP DATABASE BUILDER & CONFIG CENTER */}')
    content = content[:settings_modal_start] + "            </>\n        )}\n\n" + content[settings_modal_start:]
    
with open('/root/IMA-Campus/frontend/src/components/admin/AISlipVerification.jsx', 'w') as f:
    f.write(content)

