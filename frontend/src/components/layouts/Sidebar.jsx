import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { physicalCrmService } from '../../api/physicalCrm';
import {
  LayoutDashboard, Users, MonitorPlay, LogOut, HeadphonesIcon,
  Wallet, MessageCircle, Database, Truck, Package, Clock, CheckCircle,
  Archive, HardDrive, CalendarDays, CalendarCheck, CheckSquare, History,
  Music, Palette, ChevronLeft, ChevronRight, Megaphone, X, BarChart, PieChart, Calendar, Menu,
  PhoneCall, UserPlus, Repeat, GraduationCap, TrendingUp, Box, Activity, ShieldCheck, RefreshCw, Layers, Mic, Upload, Video, Sun, Moon, Sparkles, Wand2, Send,
  BrainCircuit, MessageSquareText
} from 'lucide-react';

export default function Sidebar({ userRole, loggedInUser, handleLogout, isSidebarOpen, setIsSidebarOpen, currentBg, setBgImage, isSpotifyOpen, setIsSpotifyOpen, isSocialMedia, isDarkMode, toggleThemeMode }) {
  const location = useLocation();
  const displayName = loggedInUser?.firstName || 'User';
  const roleName = loggedInUser?.role || 'Staff';

  const isSocialRoute = isSocialMedia || location.pathname.includes('/social-media') || location.pathname.includes('/workspace/social-media-delegation');

  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [todayClasses, setTodayClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [profilePic, setProfilePic] = useState(null);
  const fileInputRef = useRef(null);

  const [uploadingImage, setUploadingImage] = useState(false);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      // Show local preview immediately
      const imageUrl = URL.createObjectURL(file);
      setProfilePic(imageUrl);
      
      // Upload to server
      const formData = new FormData();
      formData.append('image', file);
      
      try {
        setUploadingImage(true);
        const res = await api.post('/admin/staff/profile-picture', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (res.data.success) {
          toast.success("Profile picture updated successfully!");
          // Update the loggedInUser context or local state with actual server URL
          let baseApiUrl = (api.defaults && api.defaults.baseURL) 
              ? api.defaults.baseURL.replace('/api', '') 
              : (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000');
          if (!baseApiUrl || baseApiUrl === '') {
              baseApiUrl = 'http://localhost:5000'; // fallback
          }
          const serverUrl = baseApiUrl + res.data.image;
          setProfilePic(serverUrl);

          // IMPORTANT: Update local storage so the image persists on page refresh
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              parsedUser.image = res.data.image;
              localStorage.setItem('user', JSON.stringify(parsedUser));
            } catch (e) {
              console.error('Error updating user in local storage', e);
            }
          }
        }
      } catch (err) {
        console.error("Profile picture upload failed", err);
        toast.error("Failed to upload profile picture");
      } finally {
        setUploadingImage(false);
      }
    }
  };

  useEffect(() => {
    const fetchTodayClasses = async () => {
      try {
        const teachersRes = await physicalCrmService.getTeachers();
        const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long' });

        const slots = [];
        teachersRes.forEach(teacher => {
          if (teacher.timetables) {
            teacher.timetables.forEach(slot => {
              if (slot.dayOfWeek === todayStr) {
                // Determine class names from multiple classes
                let classNameStr = 'Unassigned Class';
                if (teacher.classes && teacher.classes.length > 0) {
                  classNameStr = teacher.classes.map(c => c.name).join(', ');
                }
                slots.push({
                  startTime: slot.startTime,
                  endTime: slot.endTime,
                  teacherName: teacher.name,
                  className: classNameStr,
                });
              }
            });
          }
        });

        slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
        setTodayClasses(slots);
      } catch (err) {
        console.error('Failed to load classes', err);
      } finally {
        setLoadingClasses(false);
      }
    };
    if (loggedInUser?.department === 'Physical' && (loggedInUser?.role === 'MANAGER' || loggedInUser?.role === 'Manager' || loggedInUser?.role === 'ASS MANAGER' || loggedInUser?.role === 'ASS_MANAGER')) {
      fetchTodayClasses();
    }
    
    if (loggedInUser?.image) {
        let baseApiUrl = (api.defaults && api.defaults.baseURL) 
            ? api.defaults.baseURL.replace('/api', '') 
            : (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000');
        if (!baseApiUrl || baseApiUrl === '') {
            baseApiUrl = 'http://localhost:5000'; // fallback
        }
        setProfilePic(baseApiUrl + loggedInUser.image);
    }
  }, [loggedInUser]);

  const getNavLinkClass = ({ isActive }) => 
    isActive 
      ? "w-full flex items-center space-x-3 px-3 py-2 rounded-lg bg-white/20 border border-white/30 backdrop-blur-md text-white font-bold transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] scale-[1.02]"
      : "w-full flex items-center space-x-3 px-3 py-2 rounded-lg bg-white/5 border border-white/5 text-gray-300 hover:bg-white/10 hover:border-white/10 transition-all font-medium mb-1";

  const getQueryNavLinkClass = (mode) => {
    const isActive = location.pathname === '/coordinator/dashboard' && location.search.includes(`mode=${mode}`);
    return isActive 
      ? "w-full flex items-center space-x-3 px-3 py-2 rounded-lg bg-white/20 border border-white/30 backdrop-blur-md text-white font-bold transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] scale-[1.02]"
      : "w-full flex items-center space-x-3 px-3 py-2 rounded-lg bg-white/5 border border-white/5 text-gray-300 hover:bg-white/10 hover:border-white/10 transition-all font-medium mb-1";
  };

  const getTabLinkClass = (tabName) => {
    const queryParams = new URLSearchParams(location.search);
    let defaultTab = 'overview';
    if (location.pathname.includes('/social-media/staff')) defaultTab = 'tasks';
    const activeTab = queryParams.get('tab') || defaultTab;
    const isDelivery = location.pathname.includes('/delivery/dashboard');
    const isSocialMedia = location.pathname.includes('/social-media/');
    const isPhysical = location.pathname.includes('/physical/');

    return activeTab === tabName && (isDelivery || isSocialMedia || isPhysical) 
      ? "w-full flex items-center space-x-3 px-3 py-2 rounded-lg bg-white/20 border border-white/30 backdrop-blur-md text-white font-bold transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] scale-[1.02]"
      : "w-full flex items-center space-x-3 px-3 py-2 rounded-lg bg-white/5 border border-white/5 text-gray-300 hover:bg-white/10 hover:border-white/10 transition-all font-medium mb-1";
  };

  const isSystemAdmin = roleName === 'SYSTEM_ADMIN' || roleName === 'System Admin' || roleName === 'Director' || roleName === 'SUPER' || roleName === 'ADMIN';
  const isDeliveryDept = loggedInUser?.department === 'Delivery';
  const isFinanceDept = loggedInUser?.department === 'Finance';
  const isPhysicalDept = loggedInUser?.department === 'Physical';
  const isManager = (roleName === 'MANAGER' || roleName === 'Manager' || roleName === 'ASS MANAGER' || roleName === 'ASS_MANAGER') && !isDeliveryDept && !isFinanceDept && !isPhysicalDept;
  const isCallCenterDept = loggedInUser?.department === 'Call Center';
  const isCallCenterManager = isManager && isCallCenterDept;

  const isSocialMediaManager = roleName === 'SOCIAL_MEDIA_MANAGER' || roleName === 'SOCIAL MEDIA MANAGER' || roleName === 'Social Media Manager' || (isManager && loggedInUser?.department === 'Social Media');
  const isSocialMediaStaff = roleName === 'SOCIAL_MEDIA_STAFF' || roleName === 'SOCIAL MEDIA STAFF' || roleName === 'Social Media Staff' || (roleName === 'STAFF' && loggedInUser?.department === 'Social Media');

  const isGeneralManager = isManager && !isCallCenterDept && !isSocialMediaManager;
  const isClassCoordinatorManager = isManager && loggedInUser?.department === 'Class Coordination';
  const isPhysicalManager = (roleName === 'MANAGER' || roleName === 'Manager' || roleName === 'ASS MANAGER' || roleName === 'Ass Manager' || roleName === 'ASS_MANAGER') && isPhysicalDept;
  const isAnyManager = (roleName === 'MANAGER' || roleName === 'Manager' || roleName === 'ASS MANAGER' || roleName === 'Ass Manager' || roleName === 'ASS_MANAGER') && !isCallCenterManager && !isSocialMediaManager;
  const isHeadManager = (roleName === 'MANAGER' || roleName === 'Manager') && !isCallCenterManager && !isSocialMediaManager;
  const isCaller = roleName === 'CALLER' || roleName === 'Caller';
  const isCallCenterAgent = roleName === 'CALL_CENTER_AGENT' || roleName === 'Call Center Agent';
  const isStaff = !isSystemAdmin && !isManager && !isPhysicalManager && !isDeliveryDept && !isFinanceDept && !isCaller && !isCallCenterAgent && !isSocialMediaManager && !isSocialMediaStaff && roleName !== 'STUDENT' && roleName !== 'user';
  const isStudent = roleName === 'STUDENT' || roleName === 'user';

  return (
    <>
      {/* MOBILE FLOATING MENU BUTTON */}
      {!isSidebarOpen && (
        <button 
          onClick={() => setIsSidebarOpen(true)} 
          className="lg:hidden fixed top-3 left-3 z-[80] bg-brand-accent/90 hover:bg-brand-accent text-white px-3 py-2 rounded-xl border border-white/20 shadow-xl flex items-center gap-2 transition-all active:scale-95 outline-none backdrop-blur-md"
          title="Open Menu"
        >
          <Menu size={18} />
          <span className="text-xs font-extrabold uppercase tracking-wider">Menu</span>
        </button>
      )}

      {/* MOBILE BACKDROP OVERLAY */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[90] lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR CONTAINER */}
      <aside className={`bg-black/10 border-r border-white/20 transition-all duration-300 flex flex-col h-full
        fixed inset-y-0 left-0 z-[100] w-64 bg-[#090E17]/95 backdrop-blur-2xl shadow-2xl lg:shadow-none lg:backdrop-blur-none lg:bg-black/10 lg:static lg:z-20
        ${isSidebarOpen ? 'translate-x-0 lg:w-64' : '-translate-x-full lg:translate-x-0 lg:w-20'}
      `}>

        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-6 bg-brand-accent/90 lg:bg-white/10 border border-white/20 backdrop-blur-md text-white p-1.5 lg:p-1 rounded-full z-50 hover:bg-white/20 transition-colors shadow-lg"
        >
          {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        <div className="h-14 flex items-center px-4 space-x-2 w-full absolute top-0 left-0 z-30">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E] shadow-sm cursor-pointer hover:opacity-80"></div>
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123] shadow-sm cursor-pointer hover:opacity-80"></div>
          <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29] shadow-sm cursor-pointer hover:opacity-80"></div>
        </div>

        <div className={`h-16 mt-10 mb-4 flex items-center justify-center w-full relative z-10 transition-all`}>
          {isSidebarOpen ? (
            <img src="/logo.png" alt="Company Logo" className="w-35 h-auto object-contain drop-shadow-lg" />
          ) : (
            <img src="/favicon.svg" alt="Icon" className="w-8 h-8 object-contain drop-shadow-md" />
          )}
        </div>

        <nav onClick={() => { if (window.innerWidth < 1024) setIsSidebarOpen(false); }} className="flex-1 px-3 py-2 space-y-1 overflow-y-auto custom-scrollbar">
        {isSystemAdmin && (
          <>
            {isSidebarOpen && <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-2">Administration</p>}
            <NavLink to="/admin/dashboard" className={getNavLinkClass}><LayoutDashboard size={18} className="text-blue-400" /> {isSidebarOpen && <span className="truncate text-sm">Overview</span>}</NavLink>
            <NavLink to="/admin/stats-hub" className={getNavLinkClass}><BrainCircuit size={18} className="text-cyan-400" /> {isSidebarOpen && <span className="truncate text-sm font-bold text-cyan-300">LUMI AI Analyser</span>}</NavLink>
            <NavLink to="/admin/ai-image-generator" className={getNavLinkClass}><Palette size={18} className="text-rose-400" /> {isSidebarOpen && <span className="truncate text-sm font-bold text-rose-300">LUMI Image Generator</span>}</NavLink>
            <NavLink to="/admin/staff" className={getNavLinkClass}><Users size={18} className="text-orange-400" /> {isSidebarOpen && <span className="truncate text-sm">Staff Management</span>}</NavLink>
            <NavLink to="/admin/announcements" className={getNavLinkClass}><Megaphone size={18} className="text-yellow-400" /> {isSidebarOpen && <span className="truncate text-sm">Announcements & Events</span>}</NavLink>
            <NavLink to="/admin/content-hub" className={getNavLinkClass}><MonitorPlay size={18} className="text-purple-400" /> {isSidebarOpen && <span className="truncate text-sm">Content Hub</span>}</NavLink>
            <NavLink to="/admin/payments" className={getNavLinkClass}><Wallet size={18} className="text-emerald-400" /> {isSidebarOpen && <span className="truncate text-sm">Manage Payments</span>}</NavLink>

            <NavLink to="/admin/data-export" className={getNavLinkClass}><BarChart size={18} className="text-cyan-400" /> {isSidebarOpen && <span className="truncate text-sm">Data Analytics</span>}</NavLink>
            <NavLink to="/admin/student-center" className={getNavLinkClass}><Database size={18} className="text-teal-400" /> {isSidebarOpen && <span className="truncate text-sm">Student Data Center</span>}</NavLink>
            <NavLink to="/admin/crm-setup" className={getNavLinkClass}><HeadphonesIcon size={18} className="text-pink-400" /> {isSidebarOpen && <span className="truncate text-sm">CRM Setup</span>}</NavLink>
            <NavLink to="/admin/database" className={getNavLinkClass}><HardDrive size={18} className="text-slate-400" /> {isSidebarOpen && <span className="truncate text-sm">Database Manager</span>}</NavLink>
            <NavLink to="/admin/system-tasks" className={getNavLinkClass}><CheckSquare size={18} className="text-red-400" /> {isSidebarOpen && <span className="truncate text-sm">System Tasks & Issues</span>}</NavLink>
            <NavLink to="/admin/finance-matrix" className={getNavLinkClass}><TrendingUp size={18} className="text-amber-400" /> {isSidebarOpen && <span className="truncate text-sm">Finance Matrix</span>}</NavLink>
            {isSidebarOpen && <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4">Logistics</p>}
            <NavLink to="/manager/tute-stock" className={getNavLinkClass}><Box size={18} className="text-amber-400" /> {isSidebarOpen && <span className="truncate text-sm font-bold text-amber-300">Tute Stock & Calendar 📦</span>}</NavLink>
            <NavLink to="/delivery/dashboard?tab=overview" className={getNavLinkClass}><Truck size={18} className="text-blue-300" /> {isSidebarOpen && <span className="truncate text-sm">Delivery Hub</span>}</NavLink>
            <NavLink to="/delivery/dashboard?tab=reports" className={getNavLinkClass}><BarChart size={18} className="text-pink-400" /> {isSidebarOpen && <span className="truncate text-sm">Stock Reports</span>}</NavLink>

            {isSidebarOpen && <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4">Development</p>}
            <NavLink to="/workspace/social-media-delegation" className={getNavLinkClass}><Send size={18} className="text-indigo-400" /> {isSidebarOpen && <span className="truncate text-sm">Social Media Job Cards</span>}</NavLink>
            <NavLink to="/admin/paid-campaign" className={getNavLinkClass}><Layers size={18} className="text-indigo-400" /> {isSidebarOpen && <span className="truncate text-sm">Paid Campaign</span>}</NavLink>
            <NavLink to="/admin/call-campaign-data-center" className={getNavLinkClass}><Database size={18} className="text-emerald-400" /> {isSidebarOpen && <span className="truncate text-sm">Call Campaign Data Center</span>}</NavLink>
            <NavLink to="/social-media/manager/dashboard?tab=ai_video" className={getNavLinkClass}><Wand2 size={18} className="text-fuchsia-400 animate-pulse" /> {isSidebarOpen && <span className="truncate text-sm font-bold text-fuchsia-300">AI Video Creator 🎬</span>}</NavLink>
            <NavLink to="/admin/whatsapp-call-test" className={getNavLinkClass}><PhoneCall size={18} className="text-green-400" /> {isSidebarOpen && <span className="truncate text-sm">WhatsApp Call Test</span>}</NavLink>
          </>
        )}

        {(isHeadManager && !isSystemAdmin) && (
          <>
            {isSidebarOpen && <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4">Team Management</p>}
            <NavLink to="/admin/staff" className={getNavLinkClass}><Users size={18} className="text-orange-400" /> {isSidebarOpen && <span className="truncate text-sm">Staff Management</span>}</NavLink>
            <NavLink to="/workspace/social-media-delegation" className={getNavLinkClass}><Send size={18} className="text-indigo-400" /> {isSidebarOpen && <span className="truncate text-sm">Social Media Job Cards</span>}</NavLink>
            <NavLink to="/admin/finance-matrix" className={getNavLinkClass}><TrendingUp size={18} className="text-amber-400" /> {isSidebarOpen && <span className="truncate text-sm">Finance Matrix</span>}</NavLink>
          </>
        )}

        {isFinanceDept && !isSystemAdmin && (
          <>
            {isSidebarOpen && <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-2">Finance Department</p>}
            <NavLink to="/finance/dashboard" className={getNavLinkClass}><LayoutDashboard size={18} className="text-blue-400" /> {isSidebarOpen && <span className="truncate text-sm">Finance Overview</span>}</NavLink>
            <NavLink to="/admin/payments" className={getNavLinkClass}><Wallet size={18} className="text-emerald-400" /> {isSidebarOpen && <span className="truncate text-sm">Manage Payments</span>}</NavLink>

            <NavLink to="/admin/finance-matrix" className={getNavLinkClass}><TrendingUp size={18} className="text-amber-400" /> {isSidebarOpen && <span className="truncate text-sm">Finance Matrix</span>}</NavLink>
          </>
        )}



        {isDeliveryDept && !isSystemAdmin && (
          <>
            {isSidebarOpen && <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-2">Delivery</p>}
            <NavLink to="/delivery/dashboard?tab=overview" className={() => getTabLinkClass('overview')}><Package size={18} className="text-blue-400" /> {isSidebarOpen && <span className="truncate text-sm">Overview</span>}</NavLink>
            <NavLink to="/delivery/dashboard?tab=pending" className={() => getTabLinkClass('pending')}><Clock size={18} className="text-orange-400" /> {isSidebarOpen && <span className="truncate text-sm">Pending & Holds</span>}</NavLink>
            <NavLink to="/delivery/dashboard?tab=delivered" className={() => getTabLinkClass('delivered')}><CheckCircle size={18} className="text-emerald-400" /> {isSidebarOpen && <span className="truncate text-sm">Delivered</span>}</NavLink>
            <NavLink to="/delivery/dashboard?tab=history" className={() => getTabLinkClass('history')}><History size={18} className="text-purple-400" /> {isSidebarOpen && <span className="truncate text-sm">History</span>}</NavLink>
            <NavLink to="/delivery/dashboard?tab=payment_details" className={() => getTabLinkClass('payment_details')}><Wallet size={18} className="text-indigo-400" /> {isSidebarOpen && <span className="truncate text-sm">Payment Details</span>}</NavLink>
            <NavLink to="/delivery/dashboard?tab=stock" className={() => getTabLinkClass('stock')}><Archive size={18} className="text-slate-400" /> {isSidebarOpen && <span className="truncate text-sm">Tute Stock</span>}</NavLink>
            <NavLink to="/delivery/dashboard?tab=reports" className={() => getTabLinkClass('reports')}><BarChart size={18} className="text-pink-400" /> {isSidebarOpen && <span className="truncate text-sm">Stock Reports</span>}</NavLink>
          </>
        )}

        {isGeneralManager && (
          <>
            {isSidebarOpen && <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-2">Management</p>}
            <NavLink to="/manager/dashboard" className={getNavLinkClass}><LayoutDashboard size={18} className="text-blue-400" /> {isSidebarOpen && <span className="truncate text-sm">Branch Overview</span>}</NavLink>
            <NavLink to="/workspace/social-media-delegation" className={getNavLinkClass}><Send size={18} className="text-indigo-400" /> {isSidebarOpen && <span className="truncate text-sm">Social Media Job Cards</span>}</NavLink>
            <NavLink to="/admin/stats-hub" className={getNavLinkClass}><Sparkles size={18} className="text-cyan-400" /> {isSidebarOpen && <span className="truncate text-sm font-bold text-cyan-300">LUMI AI Analyser</span>}</NavLink>
            <NavLink to="/admin/announcements" className={getNavLinkClass}><Megaphone size={18} className="text-yellow-400" /> {isSidebarOpen && <span className="truncate text-sm">Announcements</span>}</NavLink>
            <NavLink to="/admin/content-hub" className={getNavLinkClass}><MonitorPlay size={18} className="text-purple-400" /> {isSidebarOpen && <span className="truncate text-sm">Content Hub</span>}</NavLink>
            {isClassCoordinatorManager && (
              <NavLink to="/admin/crm-setup" className={getNavLinkClass}><HeadphonesIcon size={18} className="text-pink-400" /> {isSidebarOpen && <span className="truncate text-sm">CRM Setup</span>}</NavLink>
            )}
            <NavLink to="/admin/payments" className={getNavLinkClass}><Wallet size={18} className="text-emerald-400" /> {isSidebarOpen && <span className="truncate text-sm">Manage Payments</span>}</NavLink>

            <NavLink to="/admin/data-export" className={getNavLinkClass}><BarChart size={18} className="text-cyan-400" /> {isSidebarOpen && <span className="truncate text-sm">Data Analytics</span>}</NavLink>
            <NavLink to="/admin/student-center" className={getNavLinkClass}><Database size={18} className="text-teal-400" /> {isSidebarOpen && <span className="truncate text-sm">Student Data Center</span>}</NavLink>
            <NavLink to="/admin/finance-matrix" className={getNavLinkClass}><TrendingUp size={18} className="text-amber-400" /> {isSidebarOpen && <span className="truncate text-sm">Finance Matrix</span>}</NavLink>
            {isSidebarOpen && <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4">Logistics & Tutes</p>}
            <NavLink to="/manager/tute-stock" className={getNavLinkClass}><Box size={18} className="text-amber-400" /> {isSidebarOpen && <span className="truncate text-sm font-bold text-amber-300">Tute Stock & Calendar 📦</span>}</NavLink>
            <NavLink to="/delivery/dashboard?tab=pending" className={() => getTabLinkClass('pending')}><Clock size={18} className="text-orange-400" /> {isSidebarOpen && <span className="truncate text-sm">Pending & Holds</span>}</NavLink>
            <NavLink to="/delivery/dashboard?tab=delivered" className={() => getTabLinkClass('delivered')}><CheckCircle size={18} className="text-emerald-400" /> {isSidebarOpen && <span className="truncate text-sm">Delivered</span>}</NavLink>
            <NavLink to="/delivery/dashboard?tab=history" className={() => getTabLinkClass('history')}><Activity size={18} className="text-purple-400" /> {isSidebarOpen && <span className="truncate text-sm">Delivery History</span>}</NavLink>
            <NavLink to="/delivery/dashboard?tab=payment_details" className={() => getTabLinkClass('payment_details')}><Wallet size={18} className="text-indigo-400" /> {isSidebarOpen && <span className="truncate text-sm">Payment Details</span>}</NavLink>
            <NavLink to="/delivery/dashboard?tab=reports" className={() => getTabLinkClass('reports')}><BarChart size={18} className="text-pink-400" /> {isSidebarOpen && <span className="truncate text-sm">Stock Reports</span>}</NavLink>
          </>
        )}


        {isCallCenterManager && (
          <>
            {isSidebarOpen && <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-2">Call Center Hub</p>}
            <NavLink to="/call-center/dashboard/overview" className={getNavLinkClass}><LayoutDashboard size={18} className="text-red-400" /> {isSidebarOpen && <span className="truncate text-sm">Overview</span>}</NavLink>
            <NavLink to="/call-center/dashboard/free-sem" className={getNavLinkClass}><PhoneCall size={18} className="text-emerald-400" /> {isSidebarOpen && <span className="truncate text-sm">Free Sem Stats</span>}</NavLink>
            <NavLink to="/call-center/dashboard/after-sem" className={getNavLinkClass}><BarChart size={18} className="text-amber-400" /> {isSidebarOpen && <span className="truncate text-sm">After Sem Stats</span>}</NavLink>
            <NavLink to="/call-center/dashboard/bridge-handovers" className={getNavLinkClass}><Repeat size={18} className="text-indigo-400" /> {isSidebarOpen && <span className="truncate text-sm">Bridge Hand Overs</span>}</NavLink>

            {isSidebarOpen && <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4">Team & Performance</p>}
            <NavLink to="/call-center/dashboard/staff" className={getNavLinkClass}><Users size={18} className="text-blue-400" /> {isSidebarOpen && <span className="truncate text-sm">Staff Manage</span>}</NavLink>
            <NavLink to="/call-center/dashboard/progress" className={getNavLinkClass}><Activity size={18} className="text-pink-400" /> {isSidebarOpen && <span className="truncate text-sm">Callers Progress</span>}</NavLink>
          </>
        )}

        {isPhysicalManager && (
          <>
            {isSidebarOpen && <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-2">Physical Hub</p>}
            <NavLink to="/physical/dashboard/overview" className={getNavLinkClass}><LayoutDashboard size={18} className="text-red-400" /> {isSidebarOpen && <span className="truncate text-sm">Physical Dashboard</span>}</NavLink>

            {/* Today's Classes Widget */}
            {isSidebarOpen && (
              <div className="mt-4 mx-2 bg-black/20 border border-white/10 rounded-xl overflow-hidden flex flex-col max-h-64 shadow-inner">
                <div className="bg-gradient-to-r from-red-500/20 to-transparent p-2.5 border-b border-white/5 flex items-center gap-2 shrink-0">
                  <Calendar size={14} className="text-red-400" />
                  <h3 className="text-white font-bold tracking-wider text-[10px]">TODAY'S CLASSES</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar flex flex-col gap-1.5">
                  {loadingClasses ? (
                    <div className="flex justify-center p-4">
                      <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : todayClasses.length === 0 ? (
                    <div className="text-center p-4 text-white/30">
                      <Clock size={16} className="mx-auto mb-1 opacity-50" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">No Classes</span>
                    </div>
                  ) : (
                    todayClasses.map((slot, idx) => (
                      <div key={idx} className="bg-white/5 p-2 rounded-lg border border-white/5 hover:border-red-400/30 transition-colors">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Clock size={10} className="text-red-400" />
                          <span className="text-[10px] font-black text-white/90">{slot.startTime} - {slot.endTime}</span>
                        </div>
                        <p className="text-[10px] font-bold text-gray-300 truncate">{slot.className}</p>
                        <p className="text-[9px] text-gray-500 truncate">{slot.teacherName}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {isCallCenterAgent && (
          <>
            {isSidebarOpen && <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4">Workspace</p>}
            <NavLink to="/call-center/agent/overview" className={getNavLinkClass}><PieChart size={18} className="text-emerald-400" /> {isSidebarOpen && <span className="truncate text-sm">Overview</span>}</NavLink>
            <NavLink to="/call-center/agent/free-sem" className={getNavLinkClass}><Megaphone size={18} className="text-blue-400" /> {isSidebarOpen && <span className="truncate text-sm">Free Seminar</span>}</NavLink>
            <NavLink to="/call-center/agent/after-sem" className={getNavLinkClass}><Calendar size={18} className="text-purple-400" /> {isSidebarOpen && <span className="truncate text-sm">After Seminar</span>}</NavLink>
            <NavLink to="/call-center/agent/bridge" className={getNavLinkClass}><Repeat size={18} className="text-indigo-400" /> {isSidebarOpen && <span className="truncate text-sm">Bridge Campaign</span>}</NavLink>
          </>
        )}

        {(isSystemAdmin || isGeneralManager || isStaff || isCaller) && (
          <>
            {isSidebarOpen && <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4">Workspace</p>}
            {(!isSystemAdmin && !isManager) && (
              <NavLink to="/coordinator/dashboard?mode=OVERVIEW" className={() => getQueryNavLinkClass('OVERVIEW')}><LayoutDashboard size={18} className="text-blue-400" /> {isSidebarOpen && <span className="truncate text-sm">Overview</span>}</NavLink>
            )}
            <NavLink to="/workspace/timetable" className={getNavLinkClass}><CalendarDays size={18} /> {isSidebarOpen && <span className="truncate text-sm">Class Timetable</span>}</NavLink>
            <NavLink to="/workspace/tasks" className={getNavLinkClass}><CheckSquare size={18} /> {isSidebarOpen && <span className="truncate text-sm">Task Center</span>}</NavLink>
            <NavLink to="/workspace/roster" className={getNavLinkClass}><CalendarCheck size={18} className="text-pink-400" />{isSidebarOpen && <span className="truncate text-sm">My Roster</span>}</NavLink>

            {isSidebarOpen && <p className="px-3 text-xs font-semibold text-emerald-400/80 uppercase tracking-wider mb-2 mt-4">Free Seminar</p>}
            <NavLink to="/workspace/crm" className={getNavLinkClass}><MessageCircle size={18} /> {isSidebarOpen && <span className="truncate text-sm">Free Seminar CRM</span>}</NavLink>

            {(!isSystemAdmin && !isManager) && (
              <NavLink to="/coordinator/dashboard?mode=CALL_CAMPAIGN" className={() => getQueryNavLinkClass('CALL_CAMPAIGN')}><HeadphonesIcon size={18} className="text-emerald-400" /> {isSidebarOpen && <span className="truncate text-sm">Call Campaign</span>}</NavLink>
            )}

            {(isSystemAdmin || isManager) && (
              <NavLink to="/coordinator/dashboard?mode=STATS" className={() => getQueryNavLinkClass('STATS')}><BarChart size={18} className="text-orange-400" /> {isSidebarOpen && <span className="truncate text-sm">Free Sem Stats</span>}</NavLink>
            )}

            {isSidebarOpen && <p className="px-3 text-xs font-semibold text-emerald-400/80 uppercase tracking-wider mb-2 mt-4">Lumi Services</p>}
            
            <NavLink to="/admin/stats-hub" className={({ isActive }) => `lumi-nav-item lumi-analyser mb-2 ${isActive ? 'active ring-1 ring-cyan-400/50' : ''}`}>
               <span className="lumi-nav-icon"><BrainCircuit size={17} /></span>
               {isSidebarOpen && <span className="lumi-nav-text">LUMI AI Analyser</span>}
            </NavLink>

            <NavLink to="/workspace/web-inquiries" className={({ isActive }) => `lumi-nav-item lumi-chat mb-2 ${isActive ? 'active ring-1 ring-sky-400/50' : ''}`}>
               <span className="lumi-nav-icon"><MessageSquareText size={17} /></span>
               {isSidebarOpen && <span className="lumi-nav-text">LUMI Chat</span>}
            </NavLink>

            <NavLink to="/lumi-caller/dashboard" className={({ isActive }) => `lumi-nav-item lumi-caller mb-2 ${isActive ? 'active ring-1 ring-emerald-400/50' : ''}`}>
               <span className="lumi-nav-icon"><PhoneCall size={17} /></span>
               {isSidebarOpen && <span className="lumi-nav-text">LUMI Caller</span>}
            </NavLink>

            {isSystemAdmin && (
              <NavLink to="/admin/ai-image-generator" className={({ isActive }) => `lumi-nav-item lumi-image mb-2 ${isActive ? 'active ring-1 ring-rose-400/50' : ''}`}>
                 <span className="lumi-nav-icon"><Palette size={17} /></span>
                 {isSidebarOpen && <span className="lumi-nav-text">LUMI Image Generator</span>}
              </NavLink>
            )}

            {isSidebarOpen && <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4">Other Services</p>}
            <NavLink to="/workspace/after-seminar-crm" className={getNavLinkClass}><HeadphonesIcon size={18} /> {isSidebarOpen && <span className="truncate text-sm">After Seminar CRM</span>}</NavLink>
            <NavLink to="/admin/content-hub" className={getNavLinkClass}><MonitorPlay size={18} className="text-purple-400" /> {isSidebarOpen && <span className="truncate text-sm">Content Hub</span>}</NavLink>
            <NavLink to="/admin/payments" className={getNavLinkClass}><Wallet size={18} className="text-emerald-400" /> {isSidebarOpen && <span className="truncate text-sm">Payment Management</span>}</NavLink>

            {/* 🔥 ALUTH CAMPAIGNS TABS 4 🔥 */}
            {isSidebarOpen && <p className="px-3 text-xs font-semibold text-emerald-400/80 uppercase tracking-wider mb-2 mt-4">Call Campaigns</p>}

            {(isSystemAdmin || isManager) && (
              <NavLink to="/workspace/campaign/overview" className={getNavLinkClass}><LayoutDashboard size={18} className="text-red-400" /> {isSidebarOpen && <span className="truncate text-sm">Campaign Overview</span>}</NavLink>
            )}
            <NavLink to="/workspace/campaign/open-seminar" className={getNavLinkClass}><PhoneCall size={18} className="text-indigo-400" /> {isSidebarOpen && <span className="truncate text-sm">Open Seminar Leads</span>}</NavLink>
            <NavLink to="/workspace/campaign/new-inquiries" className={getNavLinkClass}><UserPlus size={18} className="text-blue-400" /> {isSidebarOpen && <span className="truncate text-sm">New Inquiries</span>}</NavLink>
            <NavLink to="/workspace/campaign/bridge-transfers" className={getNavLinkClass}><Repeat size={18} className="text-amber-400" /> {isSidebarOpen && <span className="truncate text-sm">Bridge Transfers</span>}</NavLink>
            <NavLink to="/workspace/campaign/paid-students" className={getNavLinkClass}><GraduationCap size={18} className="text-emerald-400" /> {isSidebarOpen && <span className="truncate text-sm">Enrolled (Paid)</span>}</NavLink>
            {(isSystemAdmin || isManager) && (
              <NavLink to="/workspace/campaign/coordinator-progress" className={getNavLinkClass}><Activity size={18} className="text-pink-400" /> {isSidebarOpen && <span className="truncate text-sm">Coordinator Progress</span>}</NavLink>
            )}

            {!isSystemAdmin && !isManager && !isCaller && (
              <NavLink to="/admin/student-center" className={getNavLinkClass}><Database size={18} /> {isSidebarOpen && <span className="truncate text-sm">Student Data Center</span>}</NavLink>
            )}
          </>
        )}

        {isSocialMediaManager && (
          <>
            {isSidebarOpen && <p className="px-3 text-xs font-semibold text-brand-accent/80 uppercase tracking-wider mb-2 mt-4">Social Media Hub</p>}
            <NavLink to="/social-media/manager/dashboard?tab=overview" className={() => getTabLinkClass('overview')}><LayoutDashboard size={18} className="text-blue-400" /> {isSidebarOpen && <span className="truncate text-sm font-semibold">Overview</span>}</NavLink>
            <NavLink to="/social-media/manager/dashboard?tab=team" className={() => getTabLinkClass('team')}><Users size={18} className="text-orange-400" /> {isSidebarOpen && <span className="truncate text-sm font-semibold">Staff Manager</span>}</NavLink>
            <NavLink to="/social-media/manager/dashboard?tab=calendar" className={() => getTabLinkClass('calendar')}><Calendar size={18} className="text-emerald-400" /> {isSidebarOpen && <span className="truncate text-sm font-semibold">Content Calendar</span>}</NavLink>
            
            {isSidebarOpen && <p className="px-3 text-[11px] font-semibold text-fuchsia-400/80 uppercase tracking-wider mb-1.5 mt-3">Creative Tools</p>}
            <NavLink to="/social-media/manager/dashboard?tab=ai_video" className={() => getTabLinkClass('ai_video')}><Wand2 size={18} className="text-fuchsia-400" /> {isSidebarOpen && <span className="truncate text-sm font-bold text-fuchsia-300">AI Video Generator 🎬</span>}</NavLink>
            <NavLink to="/social-media/manager/dashboard?tab=ai_music_matcher" className={() => getTabLinkClass('ai_music_matcher')}><Music size={18} className="text-amber-400" /> {isSidebarOpen && <span className="truncate text-sm font-bold text-amber-300">AI Reel Music Finder 🎵</span>}</NavLink>
            <NavLink to="/social-media/manager/dashboard?tab=video_editor" className={() => getTabLinkClass('video_editor')}><Video size={18} className="text-pink-400" /> {isSidebarOpen && <span className="truncate text-sm">AI Subtitle Video Editor</span>}</NavLink>
          </>
        )}

        {isSocialMediaStaff && (
          <>
            {isSidebarOpen && <p className="px-3 text-xs font-semibold text-brand-accent/80 uppercase tracking-wider mb-2 mt-4">Workspace</p>}
            <NavLink to="/social-media/staff/dashboard?tab=tasks" className={() => getTabLinkClass('tasks')}><CheckSquare size={18} className="text-blue-400" /> {isSidebarOpen && <span className="truncate text-sm font-semibold">My Assigned Tasks</span>}</NavLink>
            <NavLink to="/social-media/staff/dashboard?tab=calendar" className={() => getTabLinkClass('calendar')}><Calendar size={18} className="text-emerald-400" /> {isSidebarOpen && <span className="truncate text-sm font-semibold">Content Calendar</span>}</NavLink>

            {isSidebarOpen && <p className="px-3 text-[11px] font-semibold text-fuchsia-400/80 uppercase tracking-wider mb-1.5 mt-3">Creative Tools</p>}
            <NavLink to="/social-media/staff/dashboard?tab=ai_video" className={() => getTabLinkClass('ai_video')}><Wand2 size={18} className="text-fuchsia-400" /> {isSidebarOpen && <span className="truncate text-sm font-bold text-fuchsia-300">AI Video Generator 🎬</span>}</NavLink>
            <NavLink to="/social-media/staff/dashboard?tab=ai_music_matcher" className={() => getTabLinkClass('ai_music_matcher')}><Music size={18} className="text-amber-400" /> {isSidebarOpen && <span className="truncate text-sm font-bold text-amber-300">AI Reel Music Finder 🎵</span>}</NavLink>
            <NavLink to="/social-media/staff/dashboard?tab=video_editor" className={() => getTabLinkClass('video_editor')}><Video size={18} className="text-pink-400" /> {isSidebarOpen && <span className="truncate text-sm">AI Subtitle Video Editor</span>}</NavLink>
          </>
        )}

        {isStudent && (
          <>
            {isSidebarOpen && <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-2">Student Portal</p>}
            <NavLink to="/student/dashboard" className={getNavLinkClass}><LayoutDashboard size={18} /> {isSidebarOpen && <span className="truncate text-sm">My Dashboard</span>}</NavLink>
            <NavLink to="/student/delivery" className={getNavLinkClass}><Truck size={18} /> {isSidebarOpen && <span className="truncate text-sm">My Deliveries</span>}</NavLink>
          </>
        )}
      </nav>

      {/* Theme Popup & Profile Section */}
      <div className={`px-3 py-3 border-t border-white/20 flex ${isSidebarOpen ? 'flex-row items-center justify-between' : 'flex-col items-center'} gap-2 shrink-0 bg-transparent relative`}>
        <div className={`flex ${isSidebarOpen ? 'flex-row' : 'flex-col'} items-center gap-2`}>
          <button 
            onClick={toggleThemeMode} 
            className={`p-2.5 rounded-full transition-all flex items-center justify-center outline-none border ${
              isDarkMode 
                ? 'bg-slate-800 text-amber-400 border-slate-700 hover:bg-slate-700' 
                : 'bg-slate-200 text-slate-900 border-slate-300 hover:bg-slate-300'
            }`} 
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={() => setIsThemeOpen(!isThemeOpen)} className={`p-2.5 rounded-full transition-all flex items-center justify-center outline-none border ${isThemeOpen ? 'bg-white/20 text-white border-white/30 shadow-[0_4px_15px_rgba(0,0,0,0.2)]' : 'text-gray-300 border-transparent hover:bg-white/10'}`} title="Themes">
            <Palette size={16} className={isThemeOpen ? 'text-brand-accent' : ''} />
          </button>
          <button onClick={() => setIsSpotifyOpen(!isSpotifyOpen)} className={`p-2.5 rounded-full transition-all flex items-center justify-center outline-none border ${isSpotifyOpen ? 'bg-white/20 text-white border-white/30 shadow-[0_4px_15px_rgba(0,0,0,0.2)]' : 'text-gray-300 border-transparent hover:bg-white/10'}`} title="Music Player">
            <Music size={16} className={isSpotifyOpen ? 'animate-pulse text-[#1DB954]' : ''} />
          </button>
        </div>

        <button onClick={handleLogout} className={`flex items-center justify-center gap-2 rounded-lg text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all font-medium border border-transparent ${isSidebarOpen ? 'px-3 py-2 flex-1 ml-1' : 'p-2 w-full'}`} title="Logout">
          <LogOut size={16} />
          {isSidebarOpen && <span className="truncate text-sm">Logout</span>}
        </button>

        {isThemeOpen && (
          <div className={`absolute bottom-full left-0 mb-3 bg-[#0B1120]/95 backdrop-blur-2xl border border-white/10 p-4 rounded-2xl shadow-2xl z-50 transition-all ${isSidebarOpen ? 'w-[260px]' : 'w-[220px] left-16 mb-0 bottom-12'}`}>
            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
              <p className="text-xs font-bold text-gray-300 uppercase tracking-widest flex items-center gap-1.5">
                <Palette size={14} /> Backgrounds
              </p>
              <button onClick={() => setIsThemeOpen(false)} className="text-gray-500 hover:text-white transition-colors"><X size={16} /></button>
            </div>

            <p className="text-[10px] text-gray-400 mb-2">Solid & Gradients</p>
            <div className="flex gap-2 flex-wrap mb-4">
              <button onClick={() => setBgImage('color1')} title="Light Blue" className={`w-6 h-6 rounded-full border-2 ${currentBg === 'color1' ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'border-transparent'} bg-[#60A5FA] transition-all`}></button>
              <button onClick={() => setBgImage('color2')} title="Purple" className={`w-6 h-6 rounded-full border-2 ${currentBg === 'color2' ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'border-transparent'} bg-[#A78BFA] transition-all`}></button>
              <button onClick={() => setBgImage('color3')} title="Plum Mix" className={`w-6 h-6 rounded-full border-2 ${currentBg === 'color3' ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'border-transparent'} bg-[#D946EF] transition-all`}></button>
              <button onClick={() => setBgImage('grad1')} title="Blue-Red Mix" className={`w-6 h-6 rounded-full border-2 ${currentBg === 'grad1' ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'border-transparent'} bg-gradient-to-br from-[#1E40AF] to-[#B91C1C] transition-all`}></button>
              <button onClick={() => setBgImage('grad2')} title="Green Gradient" className={`w-6 h-6 rounded-full border-2 ${currentBg === 'grad2' ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'border-transparent'} bg-gradient-to-br from-[#065F46] to-[#10B981] transition-all`}></button>
              <button onClick={() => setBgImage('grad3')} title="Ash-Red Mix" className={`w-6 h-6 rounded-full border-2 ${currentBg === 'grad3' ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'border-transparent'} bg-gradient-to-br from-[#374151] to-[#EF4444] transition-all`}></button>
            </div>

            <p className="text-[10px] text-gray-400 mb-2">Live Animations</p>
            <div className="flex gap-2 flex-wrap mb-4">
              <button onClick={() => setBgImage('anim1')} title="Live Sky" className={`w-6 h-6 rounded-full border-2 ${currentBg === 'anim1' ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'border-transparent'} bg-gradient-to-b from-blue-400 to-orange-300 transition-all flex items-center justify-center overflow-hidden`}><span className="text-[10px]">⛅</span></button>
              <button onClick={() => setBgImage('anim2')} title="Slow Color Shift" className={`w-6 h-6 rounded-full border-2 ${currentBg === 'anim2' ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'border-transparent'} bg-gradient-to-r from-blue-500 via-red-500 to-yellow-400 transition-all flex items-center justify-center`}><span className="text-[10px]">🌈</span></button>
              <button onClick={() => setBgImage('anim3')} title="Floating Balls" className={`w-6 h-6 rounded-full border-2 ${currentBg === 'anim3' ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'border-transparent'} bg-blue-900 transition-all flex items-center justify-center`}><span className="text-[10px]">🎾</span></button>
            </div>

            <p className="text-[10px] text-gray-400 mb-2">Wallpapers</p>
            <div className="flex gap-2 flex-wrap">
              {['wall1', 'wall2', 'wall3', 'wall4', 'wall5'].map((theme, i) => (
                <button
                  key={i}
                  onClick={() => setBgImage(theme)}
                  className={`w-7 h-7 rounded-full border bg-cover bg-center transition-all flex items-center justify-center outline-none ${currentBg === theme ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border-white/20 hover:border-white/50'}`}
                  style={{ backgroundImage: `url('/bg${i + 1}.jpg')` }}
                  title={`Wallpaper ${i + 1}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>


      <div className="p-3 border-t border-white/20 shrink-0 bg-transparent">
        <button
          onClick={(e) => {
            const icon = e.currentTarget.querySelector('svg');
            if (icon) {
              icon.classList.add('animate-spin');
              setTimeout(() => icon.classList.remove('animate-spin'), 1000);
            }
            window.dispatchEvent(new Event('global-refresh'));
            toast.success('Live Data Refreshed!', { position: 'top-right' });
          }}
          className={`w-full flex items-center ${isSidebarOpen ? 'justify-start space-x-3 px-3' : 'justify-center'} py-2 rounded-lg text-emerald-400 hover:bg-white/10 hover:text-emerald-300 transition-colors font-bold border border-emerald-500/30 bg-emerald-900/20`}
        >
          <RefreshCw size={18} className="shrink-0" />
          {isSidebarOpen && <span className="text-sm">Refresh System</span>}
        </button>
      </div>

      <div className="p-3 border-t border-white/20 shrink-0 bg-transparent">
        <div className={`flex items-center ${isSidebarOpen ? 'space-x-3 p-2' : 'justify-center p-1'} rounded-lg hover:bg-white/10 transition-colors cursor-pointer border border-transparent`}>
          <div className="relative group shrink-0" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
            <div className={`rounded-full bg-gradient-to-br from-emerald-500/80 to-teal-600/80 transition-colors flex items-center justify-center text-white font-bold shadow-sm backdrop-blur-md border-2 border-emerald-400/50 ring-2 ring-emerald-500/30 ring-offset-1 ring-offset-transparent overflow-hidden ${isSidebarOpen ? 'w-10 h-10 text-base' : 'w-8 h-8 text-sm'}`}>
              {profilePic ? (
                <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full">
              <Upload size={isSidebarOpen ? 16 : 14} className="text-white" />
            </div>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange} 
              disabled={uploadingImage}
            />
          </div>
          {isSidebarOpen && (
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{displayName}</p>
              <p className="text-[10px] text-gray-300 uppercase tracking-wide truncate">{roleName}</p>
            </div>
          )}
        </div>
      </div>

    </aside>
    </>
  );
}