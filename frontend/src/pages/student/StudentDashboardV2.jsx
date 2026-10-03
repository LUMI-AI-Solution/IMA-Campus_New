import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { Menu, LogOut, AlertTriangle, Info, Lock, Bell } from 'lucide-react';
import SidebarV2 from './components/SidebarV2';
import EnrollmentTab from './components/EnrollmentTab';
import PaymentHistory from './components/PaymentHistory';
import MyClassroom from './components/MyClassroom'; 
import StudentOverview from './components/StudentOverview';
import DeliveryHub from './components/DeliveryHub';
import ProfileSettings from './components/ProfileSettings';
import WebInquiryWidget from './components/WebInquiryWidget';

const urlParams = new URLSearchParams(window.location.search);
const ghostToken = urlParams.get('token');
const isGhostMode = urlParams.get('embedded') === 'true';

if (isGhostMode && ghostToken) {
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function(key) {
        if (key === 'token' || key === 'userToken') return ghostToken;
        return originalGetItem.apply(this, arguments);
    };
    axios.defaults.headers.common['Authorization'] = `Bearer ${ghostToken}`;
}

const getSecureImageUrl = (url) => {
    if (!url) return '';
    return url.replace('http://72.62.249.211:5000', 'https://imacampus.online');
};

const StudentDashboardV2 = () => {

  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate(); 

  const urlBusinessId = searchParams.get('businessId');

  useEffect(() => {
    if (!isGhostMode && ghostToken) {
        localStorage.setItem('token', ghostToken);
        localStorage.setItem('userToken', ghostToken); 
    }

    if (urlBusinessId && !isGhostMode) {
        localStorage.setItem('selectedBusiness', urlBusinessId); 
        localStorage.setItem('businessId', urlBusinessId); 
    }

    if (ghostToken || urlBusinessId) {
        const cleanUrl = isGhostMode ? `${location.pathname}?embedded=true` : location.pathname;
        navigate(cleanUrl, { replace: true });
    }
  }, [ghostToken, urlBusinessId, location.pathname, navigate]);
  
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'home'); 
  
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}') || {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const handleUserUpdate = () => {
      try {
        setCurrentUser(JSON.parse(localStorage.getItem('user') || '{}') || {});
      } catch (e) {}
    };
    window.addEventListener('user-updated', handleUserUpdate);
    window.addEventListener('storage', handleUserUpdate);
    return () => {
      window.removeEventListener('user-updated', handleUserUpdate);
      window.removeEventListener('storage', handleUserUpdate);
    };
  }, []);

  const backendBaseUrl = axios.defaults.baseURL ? axios.defaults.baseURL.replace('/api', '') : 'https://imacampus.online';
  const headerProfilePic = currentUser.image && currentUser.image !== 'default.png' && currentUser.image !== 'null'
      ? `${backendBaseUrl}/storage/images/${currentUser.image}`
      : null;

  useEffect(() => {
      if (location.state?.activeTab) {
          setActiveTab(location.state.activeTab);
      }
  }, [location.state?.activeTab]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [businesses, setBusinesses] = useState([]);
  const [alerts, setAlerts] = useState([]); 

  const [bgImage, setBgImage] = useState('/student-bg.jpg');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const enrollRes = await axios.get('/student/available-enrollments');
        setBusinesses(enrollRes.data.businesses || []);
        const dashRes = await axios.get('/student/dashboard');
        setAlerts(dashRes.data?.alerts || []);
      } catch (error) {
        console.error('API Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
  };

  if (loading) return (
      <div className="flex h-[100dvh] items-center justify-center bg-gray-900">
          <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-white rounded-full border-t-transparent animate-spin"></div>
          </div>
      </div>
  );

  return (
    <div 
        className="min-h-[100dvh] w-full relative overflow-hidden bg-cover bg-center bg-fixed font-sans text-white transition-all duration-700 ease-in-out"
        style={{ backgroundImage: `url(${getSecureImageUrl(bgImage)})` }}
    >
      {/* Clean overlay to ensure text readability without making it muddy */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm z-0"></div>

      <div className="flex h-[100dvh] w-full relative z-10 overflow-hidden">
          
          <SidebarV2 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            sidebarOpen={sidebarOpen} 
            setSidebarOpen={setSidebarOpen} 
            handleLogout={handleLogout} 
            bgImage={getSecureImageUrl(bgImage)}
            setBgImage={setBgImage} 
          />

          <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10 w-full lg:py-[20px] lg:pr-[20px] lg:pl-[20px]">
            
            {/* Top Navigation Bar - Clean Frosted Glass */}
            <header className="bg-black/20 backdrop-blur-2xl border-b lg:border border-white/20 lg:rounded-3xl px-6 py-4 lg:mb-[20px] flex items-center justify-between sticky top-0 lg:top-auto z-30 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
              <div className="flex items-center gap-4">
                  <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-white hover:bg-white/10 p-2 rounded-full transition-all">
                      <Menu size={24} />
                  </button>
                  <div className="hidden lg:block">
                      <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-md">
                          Welcome Back
                      </h1>
                      <p className="text-sm text-white/80 font-medium">Let's continue your learning journey.</p>
                  </div>
              </div>

              <div className="flex items-center gap-5">
                  {/* Notifications Bell */}
                  <div className="relative group cursor-pointer">
                      <div className="p-3 bg-white/10 hover:bg-white/10 border border-white/20 rounded-full transition-all shadow-sm">
                          <Bell size={20} className="text-white" />
                      </div>
                      {alerts.length > 0 && (
                          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-transparent animate-pulse shadow-lg"></div>
                      )}
                  </div>

                  <div className="h-10 w-px bg-white/10 hidden sm:block"></div>

                  {/* Profile Summary */}
                  <div 
                      onClick={() => setActiveTab('profile')}
                      className="flex items-center gap-4 cursor-pointer hover:opacity-90 transition-opacity"
                      title="View Profile Settings"
                  >
                      <div className="hidden sm:block text-right">
                          <p className="text-base font-bold text-white drop-shadow-sm">{currentUser.fName ? `${currentUser.fName} ${currentUser.lName || ''}`.trim() : 'Student Portal'}</p>
                          <p className="text-[11px] text-white/70 uppercase tracking-[0.15em] font-semibold">IMA Campus</p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 p-[2px] shadow-lg">
                          <div className="w-full h-full rounded-full bg-[#0a0f1d] flex items-center justify-center overflow-hidden">
                              {headerProfilePic ? (
                                  <img src={headerProfilePic} alt="Profile" className="w-full h-full object-cover" />
                              ) : (
                                  <span className="text-white font-bold text-lg">
                                      {currentUser.fName ? currentUser.fName.substring(0, 2).toUpperCase() : 'ST'}
                                  </span>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
            </header>

            {/* Main Content Area - Massive Clean Glass Panel */}
            <div className="flex-1 overflow-y-auto lg:rounded-3xl bg-black/20 backdrop-blur-2xl border-x border-t lg:border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative w-full custom-scrollbar">
              <div className="w-full min-h-full p-4 md:p-8 lg:p-10 mx-auto transition-all duration-500">
                
                {activeTab !== 'home' && alerts.length > 0 && (
                    <div className="mb-10 space-y-4">
                        {alerts.map((alert, idx) => (
                            <div key={idx} className={`p-5 rounded-2xl flex items-start gap-4 backdrop-blur-xl border shadow-lg relative overflow-hidden
                                ${alert.type === 'danger' ? 'bg-red-500/20 border-red-500/30' : alert.type === 'locked' ? 'bg-rose-500/20 border-rose-500/30' : 'bg-amber-500/20 border-amber-500/30'}`}>
                                
                                <div className={`p-3 rounded-xl shrink-0 bg-white/10 shadow-sm ${alert.type === 'danger' ? 'text-red-300' : alert.type === 'locked' ? 'text-rose-300' : 'text-amber-300'}`}>
                                  {alert.type === 'danger' && <AlertTriangle size={24} />}
                                  {alert.type === 'locked' && <Lock size={24} />}
                                  {alert.type === 'warning' && <Info size={24} />}
                                </div>
                                <div className="pt-0.5">
                                    <h4 className={`font-bold uppercase tracking-wider text-sm mb-1 ${alert.type === 'locked' ? 'text-rose-200' : alert.type === 'danger' ? 'text-red-200' : 'text-amber-200'}`}>
                                        {alert.type === 'locked' ? 'Action Required' : 'Notice'}
                                    </h4>
                                    <p className="text-base font-medium text-white/90 leading-relaxed">{alert.msg}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="w-full min-h-full relative">
                    
                    <div className={`transition-all duration-500 ease-in-out ${activeTab === 'home' ? 'opacity-100 translate-y-0 visible' : 'opacity-0 translate-y-4 invisible h-0 overflow-hidden absolute'}`}>
                        <StudentOverview setActiveTab={setActiveTab} />
                    </div>

                    <div className={`transition-all duration-500 ease-in-out ${activeTab === 'courses' ? 'opacity-100 translate-y-0 visible' : 'opacity-0 translate-y-4 invisible h-0 overflow-hidden absolute'}`}>
                        <EnrollmentTab businesses={businesses} setActiveTab={setActiveTab} />
                    </div>

                    <div className={`transition-all duration-500 ease-in-out ${activeTab === 'history' ? 'opacity-100 translate-y-0 visible' : 'opacity-0 translate-y-4 invisible h-0 overflow-hidden absolute'}`}>
                        <PaymentHistory />
                    </div>

                    <div className={`transition-all duration-500 ease-in-out ${activeTab === 'mycourses' ? 'opacity-100 translate-y-0 visible' : 'opacity-0 translate-y-4 invisible h-0 overflow-hidden absolute'}`}>
                        <MyClassroom setActiveTab={setActiveTab} />
                    </div>

                    <div className={`transition-all duration-500 ease-in-out ${activeTab === 'delivery' ? 'opacity-100 translate-y-0 visible' : 'opacity-0 translate-y-4 invisible h-0 overflow-hidden absolute'}`}>
                        <DeliveryHub />
                    </div>

                    <div className={`transition-all duration-500 ease-in-out ${activeTab === 'profile' ? 'opacity-100 translate-y-0 visible' : 'opacity-0 translate-y-4 invisible h-0 overflow-hidden absolute'}`}>
                        <ProfileSettings />
                    </div>

                </div>
                
              </div>
            </div>
          </main>
      </div>
      <WebInquiryWidget businesses={businesses} />
    </div>
  );
};

export default StudentDashboardV2;
