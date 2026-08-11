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
import WhatsAppPermissionPopup from './components/common/WhatsAppPermissionPopup';
import { ThemeProvider } from './contexts/ThemeContext';
import MonthlyRoster from './pages/class_coordinator/staff/MonthlyRoster';
import AnnouncementsManager from './pages/admin/AnnouncementsManager';
import SystemTasksAdmin from './pages/admin/SystemTasksAdmin';

// Call Handling Context & UI
import { CallProvider } from './contexts/CallContext';
import GlobalCallPopup from './components/common/GlobalCallPopup';
import ActiveCallSidebar from './components/common/ActiveCallSidebar';
import GlobalOutboundCallWidget from './components/common/GlobalOutboundCallWidget';
import HeadlessIvrBot from './components/common/HeadlessIvrBot';

// Dashboards & Modules
import AdminDashboard from './pages/admin/AdminDashboard';
import ContentHub from './components/common/contenthub/ContentHub';
import StaffManagement from './components/common/StaffManagement';
import PaymentManagement from './components/common/PaymentManagement';

import StudentDataCenter from './components/common/StudentDataCenter';
import ClassTimetable from './components/common/ClassTimetable';
import TaskCenter from './components/common/TaskCenter';
import AfterSeminarDashboard from './components/AfterSeminarCRM/AfterSeminarDashboard';

// 🔥 අලුත් Campaign Dashboard Component එක Import කරන තැන 🔥
import CallCampaignDashboard from './components/AfterSeminarCRM/CallCampaignDashboard';
import FinanceMatrix from './components/DataExport/FinanceMatrix';
import PaidCampaignDropMatrix from './components/DataExport/PaidCampaignDropMatrix';
import LeadDataCenter from './components/admin/LeadDataCenter';
import CallCampaignDataCenter from './pages/admin/CallCampaignDataCenter';

import ThemeShowcase from './components/ThemeShowcase';

// System Admin CRM Setup
import CrmManagement from './components/admin/CrmManagement';
import DatabaseManager from './components/admin/DatabaseManager';
import TestInjector from './components/admin/TestInjector';
import DataExportDashboard from './components/DataExport/DataExportDashboard';
import ZoomAccountManager from './pages/admin/ZoomAccountManager';
import WhatsAppCallTest from './pages/admin/WhatsAppCallTest';
import CallTreeManager from './pages/admin/CallTreeManager';

// Coordinator CRM Dashboard (For Manager & Staff)
import CoordinatorDashboard from './pages/ClassCoordinator/CoordinatorDashboard';
import WebInquiries from './components/CoordinatorCRM/WebInquiries';
import LumiCallerMain from './pages/LumiCaller/LumiCallerMain';

// Department Dashboards (Mangers & Staff)
import ManagerDashboard from './pages/class_coordinator/manager/ManagerDashboard';
import TechnicalDashboard from './pages/technical/TechnicalDashboard';
import DeliveryDashboard from './pages/delivery/DeliveryDashboard';
import CallCenterManagerDashboard from './pages/call_center/CallCenterManagerDashboard';
import CallCenterAgentDashboard from './pages/call_center/CallCenterAgentDashboard';
import PhysicalManagerDashboard from './pages/physical/PhysicalManagerDashboard';
import StudentRegistration from './pages/PhysicalCRM/StudentRegistration';
import ClassTeacherManagement from './pages/PhysicalCRM/ClassTeacherManagement';

// Finance Dashboard Import
import FinanceOverview from './pages/finance/FinanceOverview';

// Student
import StudentDashboard from './pages/student/StudentDashboard';
import StudentDashboardV2 from './pages/student/StudentDashboardV2';
import StudentDeliveryHub from './pages/student/components/DeliveryHub';
import PaycorpReturn from './pages/student/components/PaycorpReturn';

// Test
import SecureYoutubePlayerTest from './pages/test/SecureYoutubePlayerTest';

// Social Media Department
import SocialMediaManagerDashboard from './pages/social_media/SocialMediaManagerDashboard';
import SocialMediaStaffDashboard from './pages/social_media/SocialMediaStaffDashboard';
import VideoEditor from './pages/social_media/components/VideoEditor';

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
    <button
      onClick={handleExitGhostMode}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-red-600/90 backdrop-blur-md border border-red-500 text-white px-5 py-2.5 rounded-full shadow-2xl text-sm font-bold flex items-center gap-2 hover:bg-red-700 transition-all group"
    >
      <span className="animate-pulse">🔴</span>
      Ghost Mode Active 
      <span className="text-red-200 ml-2 group-hover:text-white">| Exit</span>
    </button>
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
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
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

    if (role === 'SOCIAL MEDIA MANAGER' || role === 'SOCIAL_MEDIA_MANAGER' || ((role === 'MANAGER' || role === 'ASS MANAGER') && dept === 'Social Media')) return '/social-media/manager/dashboard';
    if (role === 'SOCIAL MEDIA STAFF' || role === 'SOCIAL_MEDIA_STAFF' || (role === 'STAFF' && dept === 'Social Media')) return '/social-media/staff/dashboard';

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
      <CallProvider>
        <BrowserRouter>
          <Toaster position="top-right" />

          <GlobalCallPopup />
          <WhatsAppPermissionPopup />
          <ActiveCallSidebar />
          <GlobalOutboundCallWidget />

          <GhostModeBanner />

          <Routes>
            {/* Public Routes */}
          <Route path="/" element={<Home loggedInUser={loggedInUser} />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/contact-us" element={<ContactUs />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/register" element={<Register />} />
          <Route path="/test-youtube-player" element={<SecureYoutubePlayerTest />} />
          <Route path="/" element={<Home loggedInUser={loggedInUser} />} />
          <Route path="/headless-ivr/:callId" element={<HeadlessIvrBot />} />

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
            <Route path="/admin/paid-campaign" element={<PaidCampaignDropMatrix loggedInUser={loggedInUser} />} />
            <Route path="/admin/lead-data-center" element={<LeadDataCenter loggedInUser={loggedInUser} />} />
            <Route path="/admin/call-campaign-data-center" element={<CallCampaignDataCenter />} />

            <Route path="/theme-showcase" element={<ThemeShowcase />} />

            {/* Common Panels */}
            <Route path="/admin/content-hub" element={<ContentHub loggedInUser={loggedInUser} />} />
            <Route path="/admin/staff" element={<StaffManagement loggedInUser={loggedInUser} />} />
            <Route path="/admin/payments" element={<PaymentManagement loggedInUser={loggedInUser} />} />

            <Route path="/admin/student-center" element={<StudentDataCenter loggedInUser={loggedInUser} />} />
            <Route path="/workspace/timetable" element={<ClassTimetable />} />
            <Route path="/workspace/tasks" element={<TaskCenter loggedInUser={loggedInUser} />} />
            <Route path="/workspace/roster" element={<MonthlyRoster loggedInUser={loggedInUser} />} />
            <Route path="/admin/data-export" element={<DataExportDashboard loggedInUser={loggedInUser} />} />

            {/* System Admin CRM Configuration */}
            <Route path="/admin/crm-setup" element={<CrmManagement loggedInUser={loggedInUser} />} />
            <Route path="/admin/database" element={<DatabaseManager />} />
            <Route path="/admin/test-injector" element={<TestInjector />} />
            <Route path="/admin/zoom-accounts" element={<ZoomAccountManager />} />
            <Route path="/admin/whatsapp-call-test" element={<WhatsAppCallTest loggedInUser={loggedInUser} />} />
            <Route path="/admin/call-tree" element={<CallTreeManager loggedInUser={loggedInUser} />} />
            {/* Note: theme-showcase route duplicated, removed one instance implicitly */}

            {/* Active CRM Interface for Staff & Managers */}
            <Route path="/workspace/crm" element={<CoordinatorDashboard loggedInUser={loggedInUser} />} />
            <Route path="/workspace/web-inquiries" element={<WebInquiries loggedInUser={loggedInUser} />} />
            <Route path="/workspace/after-seminar-crm" element={<AfterSeminarDashboard loggedInUser={loggedInUser} />} />

            {/* Lumi Caller Hub */}
            <Route path="/lumi-caller/:tab" element={<LumiCallerMain loggedInUser={loggedInUser} />} />

            {/* 🔥 අලුත් CALL CAMPAIGN ROUTES 4 🔥 */}
            <Route path="/workspace/campaign/overview" element={<CallCampaignDashboard campaignType="OVERALL" loggedInUser={loggedInUser} />} />
            <Route path="/workspace/campaign/open-seminar" element={<CallCampaignDashboard campaignType="OPEN_SEM" loggedInUser={loggedInUser} />} />
            <Route path="/workspace/campaign/new-inquiries" element={<CallCampaignDashboard campaignType="NEW_INQ" loggedInUser={loggedInUser} />} />
            <Route path="/workspace/campaign/bridge-transfers" element={<CallCampaignDashboard campaignType="BRIDGE" loggedInUser={loggedInUser} />} />
            <Route path="/workspace/campaign/paid-students" element={<CallCampaignDashboard campaignType="PAID" loggedInUser={loggedInUser} />} />
            <Route path="/workspace/campaign/coordinator-progress" element={<CallCampaignDashboard campaignType="COORD_PROGRESS" loggedInUser={loggedInUser} />} />

            {/* Physical CRM Routes */}
            <Route path="/physical/dashboard/:tab?" element={<PhysicalManagerDashboard loggedInUser={loggedInUser} />} />
            <Route path="/physical/student-registration" element={<StudentRegistration />} />
            <Route path="/physical/staff-management" element={<ClassTeacherManagement />} />

            {/* Social Media Routes */}
            <Route path="/social-media/manager/dashboard" element={<SocialMediaManagerDashboard loggedInUser={loggedInUser} />} />
            <Route path="/social-media/staff/dashboard" element={<SocialMediaStaffDashboard loggedInUser={loggedInUser} />} />
            <Route path="/social-media/video-editor" element={<VideoEditor />} />
          </Route>

          {/* ✅ STUDENT ROUTES ✅ */}
          <Route
            path="/student/dashboard"
            element={loggedInUser && (loggedInUser.role.toUpperCase() === 'STUDENT' || loggedInUser.role.toUpperCase() === 'USER') ? <StudentDashboardV2 /> : <Navigate to="/login" />}
          />
          {/* New Route for V2 Dashboard Testing */}
          <Route
            path="/student/dashboard-v2"
            element={loggedInUser && (loggedInUser.role.toUpperCase() === 'STUDENT' || loggedInUser.role.toUpperCase() === 'USER') ? <StudentDashboardV2 /> : <Navigate to="/login" />}
          />
          <Route
            path="/student/delivery"
            element={loggedInUser && (loggedInUser.role.toUpperCase() === 'STUDENT' || loggedInUser.role.toUpperCase() === 'USER') ? <StudentDeliveryHub /> : <Navigate to="/login" />}
          />
          <Route path="/student/paycorp-return/:businessId?" element={<PaycorpReturn />} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
      </CallProvider>
    </ThemeProvider>
  );
}