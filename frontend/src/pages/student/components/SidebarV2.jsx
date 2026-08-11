import React from 'react';
import { LayoutDashboard, BookOpen, Wallet, Video, Settings, LogOut, X, Truck, Image as ImageIcon } from 'lucide-react';

const SidebarV2 = ({ activeTab, setActiveTab, sidebarOpen, setSidebarOpen, handleLogout, bgImage, setBgImage }) => {

    const menuItems = [
        { id: 'home', label: 'Overview', icon: LayoutDashboard },
        { id: 'courses', label: 'Explore Courses', icon: BookOpen },
        { id: 'mycourses', label: 'My Classroom', icon: Video },
        { id: 'delivery', label: 'Delivery Hub', icon: Truck },
        { id: 'history', label: 'Payments', icon: Wallet },
        { id: 'profile', label: 'Settings', icon: Settings },
    ];

    const themes = ['/student-bg.jpg', '/bg2.jpg', '/bg3.jpg'];

    return (
        <>
            {/* Mobile Overlay */}
            <div 
                className={`fixed inset-0 bg-black/40 backdrop-blur-md z-40 lg:hidden transition-opacity duration-300 ${sidebarOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`} 
                onClick={() => setSidebarOpen(false)}
            ></div>

            {/* Sidebar Container - Clean frosted glass */}
            <aside className={`fixed lg:static top-0 left-0 h-full lg:h-[calc(100vh-40px)] lg:my-[20px] lg:ml-[20px] w-72 lg:w-[280px] bg-black/20 backdrop-blur-2xl lg:rounded-3xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex flex-col z-50 transition-transform duration-500 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                
                {/* Logo Area */}
                <div className="pt-10 pb-6 px-8 flex flex-col items-center justify-center relative shrink-0">
                    <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/20 shadow-lg mb-3">
                        <img src="/logo.png" alt="Logo" className="w-24 h-auto object-contain" />
                    </div>
                    <span className="text-xs font-semibold text-white/80 tracking-widest uppercase">Student Portal</span>
                    
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/10 p-2 rounded-full transition-all">
                        <X size={18} />
                    </button>
                </div>

                {/* Navigation Menu */}
                <nav className="flex-1 overflow-y-auto py-4 px-5 space-y-2 custom-scrollbar">
                    {menuItems.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-medium transition-all duration-300 ${
                                    isActive 
                                    ? 'bg-white text-gray-900 shadow-[0_4px_20px_rgba(255,255,255,0.3)] scale-[1.02]' 
                                    : 'text-white hover:bg-white/10 hover:translate-x-1'
                                }`}
                            >
                                <item.icon 
                                    size={22} 
                                    strokeWidth={isActive ? 2.5 : 2} 
                                    className={isActive ? 'text-blue-600' : 'text-white/70'} 
                                />
                                <span className="text-sm tracking-wide">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* Footer / Controls */}
                <div className="p-6 shrink-0 mt-auto">
                    {/* Theme Selector */}
                    <div className="mb-6 bg-black/20 p-4 rounded-2xl border border-white/10">
                        <p className="text-xs font-semibold text-white/90 uppercase tracking-widest mb-3 flex items-center justify-center gap-2">
                            <ImageIcon size={14}/> Backgrounds
                        </p>
                        <div className="flex justify-center gap-3">
                            {themes.map((theme, i) => (
                                <button
                                    key={i}
                                    onClick={() => setBgImage(theme)} 
                                    className={`w-8 h-8 rounded-full border-2 bg-cover bg-center transition-all duration-300 ${bgImage === theme ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'border-white/30 hover:border-white/70 hover:scale-105'}`}
                                    style={{ backgroundImage: `url(${theme})` }}
                                ></button>
                            ))}
                        </div>
                    </div>

                    {/* Logout Button */}
                    <button 
                        onClick={handleLogout} 
                        className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-2xl font-semibold text-white hover:text-white bg-red-500/80 hover:bg-red-600 backdrop-blur-md transition-all duration-300 shadow-lg hover:shadow-red-500/50"
                    >
                        <LogOut size={20} strokeWidth={2.5} /> 
                        <span className="text-sm">Sign Out</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default SidebarV2;
