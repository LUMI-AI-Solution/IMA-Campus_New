import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Layout & Pages
import Home from './pages/web/pages/Home';
import AboutUs from './pages/web/pages/AboutUs';
import ContactUs from './pages/web/pages/ContactUs';
import PrivacyPolicy from './pages/web/pages/PrivacyPolicy';
import Terms from './pages/web/pages/Terms';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import GhostAuth from './pages/auth/GhostAuth';
import MainLayout from "./components/layouts/MainLayout";
import CallCampaignModule from './components/CoordinatorCRM/CallCampaignModule';
import { ThemeProvider } from './contexts/ThemeContext';
import MonthlyRoster from './pages/class_coordinator/staff/MonthlyRoster';
import AnnouncementsManager from './pages/admin/AnnouncementsManager';
import SystemTasksAdmin from './pages/admin/SystemTasksAdmin';

// Dashboards & Modules
import AdminDashboard from './pages/admin/AdminDashboard';
import ContentHub from './components/common/contenthub/ContentHub';
import StaffManagement from './components/common/StaffManagement';
import PaymentManagement from './components/common/PaymentManagement';
import AISlipVerification from './components/admin/AISlipVerification';
import StudentDataCenter from './components/common/StudentDataCenter';
import ClassTimetable from './components/common/ClassTimetable';
import TaskCenter from './components/common/TaskCenter';
import AfterSeminarDashboard from './components/AfterSeminarCRM/AfterSeminarDashboard';

// 🔥 අලුත් Campaign Dashboard Component එක Import කරන තැන 🔥
import CallCampaignDashboard from './components/AfterSeminarCRM/CallCampaignDashboard';
import GlobalReminderWidget from './components/GlobalReminderWidget';
import GlobalSystemTaskWidget from './components/GlobalSystemTaskWidget';
import FinanceMatrix from './components/DataExport/FinanceMatrix';

import ThemeShowcase from './components/ThemeShowcase';

// System Admin CRM Setup
import CrmManagement from './components/admin/CrmManagement';
import DatabaseManager from './components/admin/DatabaseManager';
import ModuleOneMatrix from './components/DataExport/ModuleOneMatrix';
import DataExportDashboard from './components/DataExport/DataExportDashboard';
import ZoomAccountManager from './pages/admin/ZoomAccountManager';

// Coordinator CRM Dashboard (For Manager & Staff)
import CoordinatorDashboard from './pages/ClassCoordinator/CoordinatorDashboard';

// Department Dashboards (Mangers & Staff)
import ManagerDashboard from './pages/class_coordinator/manager/ManagerDashboard';
import TechnicalDashboard from './pages/technical/TechnicalDashboard';
import DeliveryDashboard from './pages/delivery/DeliveryDashboard';
import CallCenterManagerDashboard from './pages/call_center/CallCenterManagerDashboard';
import CallCenterAgentDashboard from './pages/call_center/CallCenterAgentDashboard';
import PhysicalManagerDashboard from './pages/physical/PhysicalManagerDashboard';

// Finance Dashboard Import
import FinanceOverview from './pages/finance/FinanceOverview';

// Student
import StudentDashboard from './pages/student/StudentDashboard';
import StudentDeliveryHub from './pages/student/components/DeliveryHub';

// 🔥 GHOST MODE BANNER COMPONENT 🔥
const GhostModeBanner = () => {
  const isAdminGhosting = localStorage.getItem('admin_token');

  if (!isAdminGhosting) return null;

  const handleExitGhostMode = () => {
    localStorage.setItem('token', localStorage.getItem('admin_token'));
    localStorage.setItem('user', localStorage.getItem('admin_user'));

    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');

    window.location.href = '/login';
  };

  return (
    <div className="fixed top-0 left-0 w-full z-[9999] bg-red-600/90 backdrop-blur-md border-b border-red-500 text-white py-2 px-6 flex justify-between items-center shadow-2xl">
      <div className="font-bold text-sm flex items-center gap-2">
        <span className="animate-pulse">🔴</span>
        You are currently in GHOST MODE (Viewing as a staff member)
      </div>
      <button
        onClick={handleExitGhostMode}
        className="bg-white text-red-600 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors shadow-sm"
      >
        Return to Admin
      </button>
    </div>
  );
};

export default function App() {
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setLoggedInUser(JSON.parse(storedUser));
    }
    setAuthChecked(true);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setLoggedInUser(null);
    window.location.href = '/login';
  };

  const getDashboardLink = (user) => {
    if (!user) return '/login';

    const role = user?.role?.toUpperCase();
    const dept = user?.department;

    if (role === 'STUDENT' || role === 'USER') return '/student/dashboard';

    if (role === 'CALLER') return '/workspace/crm';
    if (role === 'CALL_CENTER_AGENT' || role === 'CALL CENTER AGENT') return '/call-center/agent/overview';
    
    if (role === 'COORDINATOR') return '/coordinator/dashboard';

    if (dept === 'Call Center') {
      return (role === 'MANAGER' || role === 'ASS MANAGER' || role === 'SUPER') ? '/call-center/dashboard' : '/call-center/agent/overview';
    }

    if (role === 'MANAGER' || role === 'ASS MANAGER' || role === 'STAFF') {
      if (dept === 'Finance') return '/finance/dashboard';
      if (dept === 'Class Coordination') return '/coordinator/dashboard';
      if (dept === 'Technical') return '/technical/dashboard';
      if (dept === 'Delivery') return '/delivery/dashboard';
      if (dept === 'Physical') return '/physical/dashboard/overview';

      return '/manager/dashboard';
    }

    return '/admin/dashboard';
  };

  if (!authChecked) return <div className="min-h-screen bg-[#0a0f1c]"></div>;

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Toaster position="top-right" />

        <GhostModeBanner />
        {loggedInUser && loggedInUser.role.toUpperCase() !== 'STUDENT' && loggedInUser.role.toUpperCase() !== 'USER' && (
          <>
            <GlobalReminderWidget />
            <GlobalSystemTaskWidget loggedInUser={loggedInUser} />
          </>
        )}

        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home loggedInUser={loggedInUser} />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/contact-us" element={<ContactUs />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Home loggedInUser={loggedInUser} />} />

          {/* 🔥 NEW: Ghost Login Route 🔥 */}
          <Route path="/ghost-auth" element={<GhostAuth />} />

          <Route
            path="/login"
            element={loggedInUser ? <Navigate to={getDashboardLink(loggedInUser)} /> : <Login setLoggedInUser={setLoggedInUser} />}
          />

          {/* ✅ ADMIN & STAFF ROUTES ✅ */}
          <Route element={loggedInUser && loggedInUser.role.toUpperCase() !== 'STUDENT' && loggedInUser.role.toUpperCase() !== 'USER' ? <MainLayout loggedInUser={loggedInUser} handleLogout={handleLogout} /> : <Navigate to="/login" />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/system-tasks" element={<SystemTasksAdmin />} />
            <Route path="/manager/dashboard" element={<ManagerDashboard />} />
            <Route path="/admin/announcements" element={<AnnouncementsManager loggedInUser={loggedInUser} />} />
            <Route path="/coordinator/dashboard" element={<CoordinatorDashboard loggedInUser={loggedInUser} />} />
            <Route path="/finance/dashboard" element={<FinanceOverview />} />
            <Route path="/call-center/dashboard/:tab?" element={<CallCenterManagerDashboard />} />
            <Route path="/call-center/agent/:tab?" element={<CallCenterAgentDashboard />} />
            <Route path="/technical/dashboard" element={<TechnicalDashboard />} />
            <Route path="/workspace/call-campaign" element={<CallCampaignModule loggedInUser={loggedInUser} />} />
            <Route path="/delivery/dashboard" element={<DeliveryDashboard loggedInUser={loggedInUser} />} />

            <Route path="/admin/finance-matrix" element={<FinanceMatrix loggedInUser={loggedInUser} />} />

            <Route path="/theme-showcase" element={<ThemeShowcase />} />

            {/* Common Panels */}
            <Route path="/admin/content-hub" element={<ContentHub loggedInUser={loggedInUser} />} />
            <Route path="/admin/staff" element={<StaffManagement loggedInUser={loggedInUser} />} />
            <Route path="/admin/payments" element={<PaymentManagement loggedInUser={loggedInUser} />} />
            <Route path="/admin/ai-verification" element={<AISlipVerification loggedInUser={loggedInUser} />} />
            <Route path="/admin/student-center" element={<StudentDataCenter loggedInUser={loggedInUser} />} />
            <Route path="/workspace/timetable" element={<ClassTimetable />} />
            <Route path="/workspace/tasks" element={<TaskCenter loggedInUser={loggedInUser} />} />
            <Route path="/workspace/roster" element={<MonthlyRoster loggedInUser={loggedInUser} />} />
            <Route path="/admin/data-export" element={<DataExportDashboard loggedInUser={loggedInUser} />} />

            {/* System Admin CRM Configuration */}
            <Route path="/admin/crm-setup" element={<CrmManagement loggedInUser={loggedInUser} />} />
            <Route path="/admin/database" element={<DatabaseManager />} />
            <Route path="/admin/zoom-accounts" element={<ZoomAccountManager />} />
            {/* Note: theme-showcase route duplicated, removed one instance implicitly */}

            {/* Active CRM Interface for Staff & Managers */}
            <Route path="/workspace/crm" element={<CoordinatorDashboard loggedInUser={loggedInUser} />} />
            <Route path="/workspace/after-seminar-crm" element={<AfterSeminarDashboard loggedInUser={loggedInUser} />} />

            {/* 🔥 අලුත් CALL CAMPAIGN ROUTES 4 🔥 */}
            <Route path="/workspace/campaign/overview" element={<CallCampaignDashboard campaignType="OVERALL" loggedInUser={loggedInUser} />} />
            <Route path="/workspace/campaign/open-seminar" element={<CallCampaignDashboard campaignType="OPEN_SEM" loggedInUser={loggedInUser} />} />
            <Route path="/workspace/campaign/new-inquiries" element={<CallCampaignDashboard campaignType="NEW_INQ" loggedInUser={loggedInUser} />} />
            <Route path="/workspace/campaign/bridge-transfers" element={<CallCampaignDashboard campaignType="BRIDGE" loggedInUser={loggedInUser} />} />
            <Route path="/workspace/campaign/paid-students" element={<CallCampaignDashboard campaignType="PAID" loggedInUser={loggedInUser} />} />
            <Route path="/workspace/campaign/coordinator-progress" element={<CallCampaignDashboard campaignType="COORD_PROGRESS" loggedInUser={loggedInUser} />} />
            
            {/* Physical CRM Routes */}
            <Route path="/physical/dashboard/:tab?" element={<PhysicalManagerDashboard loggedInUser={loggedInUser} />} />
          </Route>

          {/* ✅ STUDENT ROUTES ✅ */}
          <Route
            path="/student/dashboard"
            element={loggedInUser && (loggedInUser.role.toUpperCase() === 'STUDENT' || loggedInUser.role.toUpperCase() === 'USER') ? <StudentDashboard /> : <Navigate to="/login" />}
          />
          <Route
            path="/student/delivery"
            element={loggedInUser && (loggedInUser.role.toUpperCase() === 'STUDENT' || loggedInUser.role.toUpperCase() === 'USER') ? <StudentDeliveryHub /> : <Navigate to="/login" />}
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}