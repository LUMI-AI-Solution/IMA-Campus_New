import re

with open('/root/IMA-Campus/frontend/src/components/layouts/Sidebar.jsx', 'r') as f:
    content = f.read()

# 1. Add Box, Activity to imports
content = re.sub(r'TrendingUp // <-- Meka add karanna', r'TrendingUp, Box, Activity // <-- Meka add karanna', content)

# 2. Change Admin Delivery Hub link to use pending
content = re.sub(r'<NavLink to="/delivery/dashboard\?tab=overview" className={getNavLinkClass}><Truck size={18} /> {isSidebarOpen && <span className="truncate text-sm">Delivery Hub</span>}</NavLink>', r'<NavLink to="/delivery/dashboard?tab=pending" className={getNavLinkClass}><Truck size={18} /> {isSidebarOpen && <span className="truncate text-sm">Delivery Hub</span>}</NavLink>', content)

# 3. Add Manager links (Finance Matrix, Delivery Pending, Delivered, History)
manager_links = """            <NavLink to="/admin/data-export" className={getNavLinkClass}><BarChart size={18} /> {isSidebarOpen && <span className="truncate text-sm">Data Analytics</span>}</NavLink>
            <NavLink to="/admin/student-center" className={getNavLinkClass}><Database size={18} /> {isSidebarOpen && <span className="truncate text-sm">Student Data Center</span>}</NavLink>
            <NavLink to="/admin/finance-matrix" className={getNavLinkClass}><TrendingUp size={18} /> {isSidebarOpen && <span className="truncate text-sm">Finance Matrix</span>}</NavLink>
            {isSidebarOpen && <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4">Logistics</p>}
            <NavLink to="/delivery/dashboard?tab=pending" className={() => getTabLinkClass('pending')}><Clock size={18} /> {isSidebarOpen && <span className="truncate text-sm">Pending & Holds</span>}</NavLink>
            <NavLink to="/delivery/dashboard?tab=delivered" className={() => getTabLinkClass('delivered')}><CheckCircle size={18} /> {isSidebarOpen && <span className="truncate text-sm">Delivered</span>}</NavLink>
            <NavLink to="/delivery/dashboard?tab=history" className={() => getTabLinkClass('history')}><Activity size={18} /> {isSidebarOpen && <span className="truncate text-sm">Delivery History</span>}</NavLink>
"""
content = re.sub(r'            <NavLink to="/admin/data-export" className={getNavLinkClass}><BarChart size={18} /> \{isSidebarOpen && <span className="truncate text-sm">Data Analytics</span>\}</NavLink>\s*<NavLink to="/admin/student-center" className={getNavLinkClass}><Database size={18} /> \{isSidebarOpen && <span className="truncate text-sm">Student Data Center</span>\}</NavLink>', manager_links.strip(), content)

# 4. Remove Delivery Dept overview
content = re.sub(r'\s*<NavLink to="/delivery/dashboard\?tab=overview" className=\{\(\) => getTabLinkClass\(\'overview\'\)\}><Package size={18} /> \{isSidebarOpen && <span className="truncate text-sm">Overview</span>\}</NavLink>', '', content)

# 5. Change default activeTab
content = re.sub(r"const activeTab = queryParams.get\('tab'\) \|\| 'overview';", r"const activeTab = queryParams.get('tab') || 'pending';", content)

with open('/root/IMA-Campus/frontend/src/components/layouts/Sidebar.jsx', 'w') as f:
    f.write(content)

