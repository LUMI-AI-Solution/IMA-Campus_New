import re

with open('/root/IMA-Campus/frontend/src/components/layouts/Sidebar.jsx', 'r') as f:
    content = f.read()

btn_code = """
      <div className="p-3 border-t border-white/20 shrink-0 bg-transparent">
        <button 
          onClick={() => {
            window.dispatchEvent(new Event('global-refresh'));
            // Optional: you can show a toast here if toast is imported, but let's just dispatch
          }}
          className={`w-full flex items-center ${isSidebarOpen ? 'justify-start space-x-3 px-3' : 'justify-center'} py-2 rounded-lg text-emerald-400 hover:bg-white/10 hover:text-emerald-300 transition-colors font-bold border border-emerald-500/30 bg-emerald-900/20`}
        >
          <Activity size={18} className="shrink-0" />
          {isSidebarOpen && <span className="text-sm">Refresh System</span>}
        </button>
      </div>
"""

content = content.replace('<div className="p-3 border-t border-white/20 shrink-0 bg-transparent">', btn_code + '\n      <div className="p-3 border-t border-white/20 shrink-0 bg-transparent">')

with open('/root/IMA-Campus/frontend/src/components/layouts/Sidebar.jsx', 'w') as f:
    f.write(content)
