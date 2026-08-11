import re

with open('/root/IMA-Campus/frontend/src/pages/student/StudentDashboard.jsx', 'r') as f:
    content = f.read()

parts = content.split('  if (loading) return ')
if len(parts) == 2:
    new_return = """<div className="flex h-screen items-center justify-center bg-gray-900">
          <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-white rounded-full border-t-transparent animate-spin"></div>
          </div>
      </div>
  );

  return (
    <div 
        className="min-h-screen w-full relative overflow-hidden bg-cover bg-center bg-fixed font-sans text-white transition-all duration-700 ease-in-out"
        style={{ backgroundImage: `url(${getSecureImageUrl(bgImage)})` }}
    >
      {/* Overlay changes based on glass mode */}
      <div className={`absolute inset-0 z-0 transition-all duration-700 ${glassMode === 'dark' ? 'bg-black/60 backdrop-blur-[2px]' : 'bg-black/30 backdrop-blur-sm'}`}></div>

      <div className="flex h-screen w-full relative z-10 overflow-hidden">
          
          {glassMode === 'dark' ? (
              <Sidebar 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                sidebarOpen={sidebarOpen} 
                setSidebarOpen={setSidebarOpen} 
                handleLogout={handleLogout} 
                bgImage={getSecureImageUrl(bgImage)}
                setBgImage={setBgImage} 
              />
          ) : (
              <SidebarV2 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                sidebarOpen={sidebarOpen} 
                setSidebarOpen={setSidebarOpen} 
                handleLogout={handleLogout} 
                bgImage={getSecureImageUrl(bgImage)}
                setBgImage={setBgImage} 
              />
          )}

          <main className={`flex-1 flex flex-col h-full overflow-hidden relative z-10 w-full transition-all duration-700 ${glassMode === 'light' ? 'lg:py-[20px] lg:pr-[20px] lg:pl-[20px]' : ''}`}>
            
            <header className={`flex items-center justify-between sticky top-0 lg:top-auto z-30 transition-all duration-700 ${
                glassMode === 'light' 
                ? 'bg-white/10 backdrop-blur-2xl border-b lg:border border-white/20 lg:rounded-3xl px-6 py-4 lg:mb-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.1)]' 
                : 'h-20 bg-black/20 border-b border-white/10 px-6 shrink-0'
            }`}>
              <div className="flex items-center gap-4">
                  <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-white hover:bg-white/20 p-2 rounded-full transition-all">
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
                  {/* Glass Mode Toggle */}
                  <button 
                      onClick={() => setGlassMode(prev => prev === 'light' ? 'dark' : 'light')} 
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all shadow-md ${
                          glassMode === 'dark' ? 'bg-black/40 border-white/20 hover:bg-black/60' : 'bg-white/20 border-white/30 hover:bg-white/30 text-white'
                      }`}
                  >
                      {glassMode === 'dark' ? '🌙 Dark UI' : '☀️ Light UI'}
                  </button>

                  {/* Notifications Bell */}
                  <div className="relative group cursor-pointer hidden sm:block">
                      <div className={`p-3 rounded-full transition-all shadow-sm ${glassMode === 'light' ? 'bg-white/10 hover:bg-white/20 border border-white/20' : 'bg-white/5 hover:bg-white/10 border border-white/10'}`}>
                          <Bell size={20} className="text-white" />
                      </div>
                      {alerts.length > 0 && (
                          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-transparent animate-pulse shadow-lg"></div>
                      )}
                  </div>

                  <div className="h-10 w-px bg-white/20 hidden sm:block"></div>

                  <div className="flex items-center gap-4">
                      <div className="hidden sm:block text-right">
                          <p className="text-base font-bold text-white drop-shadow-sm">Student Portal</p>
                          <p className="text-[11px] text-white/70 uppercase tracking-[0.15em] font-semibold">IMA Campus</p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center shadow-lg border-2 border-white/20">
                          <span className="text-white font-bold text-lg">ST</span>
                      </div>
                  </div>
              </div>
            </header>

            <div className={`flex-1 overflow-y-auto relative w-full custom-scrollbar transition-all duration-700 ${
                glassMode === 'light'
                ? 'lg:rounded-3xl bg-white/10 backdrop-blur-2xl border-x border-t lg:border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.2)]'
                : 'bg-black/20'
            }`}>
              <div className="w-full h-full p-4 md:p-8 lg:p-10 mx-auto transition-all duration-500">
                
                {activeTab !== 'home' && alerts.length > 0 && (
                    <div className="mb-10 space-y-4">
                        {alerts.map((alert, idx) => (
                            <div key={idx} className={`p-5 rounded-2xl flex items-start gap-4 backdrop-blur-xl border shadow-lg relative overflow-hidden
                                ${alert.type === 'danger' ? 'bg-red-500/20 border-red-500/30' : alert.type === 'locked' ? 'bg-rose-500/20 border-rose-500/30' : 'bg-amber-500/20 border-amber-500/30'}`}>
                                
                                <div className={`p-3 rounded-xl shrink-0 shadow-sm ${glassMode === 'light' ? 'bg-white/10' : 'bg-black/20'} ${alert.type === 'danger' ? 'text-red-300' : alert.type === 'locked' ? 'text-rose-300' : 'text-amber-300'}`}>
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

                <div className="w-full h-full relative">
                    <div className={`transition-all duration-500 ease-in-out ${activeTab === 'home' ? 'opacity-100 translate-y-0 visible h-full' : 'opacity-0 translate-y-4 invisible h-0 overflow-hidden absolute'}`}>
                        <StudentOverview />
                    </div>

                    <div className={`transition-all duration-500 ease-in-out ${activeTab === 'courses' ? 'opacity-100 translate-y-0 visible h-full' : 'opacity-0 translate-y-4 invisible h-0 overflow-hidden absolute'}`}>
                        <EnrollmentTab businesses={businesses} setActiveTab={setActiveTab} />
                    </div>

                    <div className={`transition-all duration-500 ease-in-out ${activeTab === 'history' ? 'opacity-100 translate-y-0 visible h-full' : 'opacity-0 translate-y-4 invisible h-0 overflow-hidden absolute'}`}>
                        <PaymentHistory />
                    </div>

                    <div className={`transition-all duration-500 ease-in-out ${activeTab === 'mycourses' ? 'opacity-100 translate-y-0 visible h-full' : 'opacity-0 translate-y-4 invisible h-0 overflow-hidden absolute'}`}>
                        <MyClassroom setActiveTab={setActiveTab} />
                    </div>

                    <div className={`transition-all duration-500 ease-in-out ${activeTab === 'delivery' ? 'opacity-100 translate-y-0 visible h-full' : 'opacity-0 translate-y-4 invisible h-0 overflow-hidden absolute'}`}>
                        <DeliveryHub />
                    </div>

                    <div className={`transition-all duration-500 ease-in-out ${activeTab === 'profile' ? 'opacity-100 translate-y-0 visible h-full' : 'opacity-0 translate-y-4 invisible h-0 overflow-hidden absolute'}`}>
                        <ProfileSettings />
                    </div>
                </div>

              </div>
            </div>
          </main>
      </div>
    </div>
  );
};

export default StudentDashboard;
"""
    final_content = parts[0] + '  if (loading) return (\n      ' + new_return
    with open('/root/IMA-Campus/frontend/src/pages/student/StudentDashboard.jsx', 'w') as f:
        f.write(final_content)
    print("Done applying real changes")
else:
    print("Failed to split")
