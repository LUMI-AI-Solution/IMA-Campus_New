with open('/root/IMA-Campus/frontend/src/components/layouts/Sidebar.jsx', 'r') as f:
    content = f.read()

# 1. Update the icon import
if 'RefreshCw' not in content:
    # We need to add RefreshCw to the lucide-react import
    # It might look like: import { LayoutDashboard, ..., Activity, ShieldCheck } from 'lucide-react';
    import_match = "import { \n  LayoutDashboard, Users, MonitorPlay, LogOut, HeadphonesIcon, \n  Wallet, MessageCircle, Database, Truck, Package, Clock, CheckCircle, \n  Archive, HardDrive, CalendarDays, CalendarCheck, CheckSquare, History, \n  Music, Palette, ChevronLeft, ChevronRight, Megaphone, X, BarChart, PieChart, Calendar,  \n  PhoneCall, UserPlus, Repeat, GraduationCap, TrendingUp, Box, Activity, ShieldCheck // <-- Meka add karanna\n} from 'lucide-react';"
    if import_match in content:
        new_import = import_match.replace("Activity, ShieldCheck", "Activity, ShieldCheck, RefreshCw")
        content = content.replace(import_match, new_import)
    else:
        # Fallback: Just insert it if we can find the import line
        import_start = content.find("from 'lucide-react';")
        if import_start != -1:
            # Not easy to parse safely without regex, let's just use regex
            import re
            content = re.sub(r"(import \{[^}]+) \} from 'lucide-react';", r"\1, RefreshCw } from 'lucide-react';", content)

# 2. Update the Activity icon to RefreshCw
content = content.replace('<Activity size={18} className="shrink-0" />', '<RefreshCw size={18} className="shrink-0" />')

# 3. Update the toast position to top-left (or just remove override if they want default, but user specifically asked for left side top corner)
content = content.replace("toast.success('Live Data Refreshed!', { position: 'bottom-right' });", "toast.success('Live Data Refreshed!', { position: 'top-left' });")

with open('/root/IMA-Campus/frontend/src/components/layouts/Sidebar.jsx', 'w') as f:
    f.write(content)
