import React, { useState, useEffect, useRef } from 'react';
import axios from "../../../api/axios";
import {
    Loader2, Bell, AlertTriangle, CheckCircle, Calendar, Clock,
    User, X, Smartphone, Download, AlertCircle, Apple,
    Video, Play, Radio, CalendarDays, Lock, BookOpen,
    Camera, Sparkles, Plus, Check
} from 'lucide-react';
import UpgradeOfferWidget from './UpgradeOfferWidget';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function StudentOverview({ setActiveTab }) {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [selectedImage, setSelectedImage] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    // Popup State
    const [showAppPopup, setShowAppPopup] = useState(true);

    const [currentUser, setCurrentUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('user') || '{}') || {};
        } catch {
            return {};
        }
    });

    const user = currentUser;
    const backendBaseUrl = axios.defaults.baseURL ? axios.defaults.baseURL.replace('/api', '') : 'https://imacampus.online';

    const profilePic = currentUser.image && currentUser.image !== 'default.png' && currentUser.image !== 'null'
        ? `${backendBaseUrl}/storage/images/${currentUser.image}`
        : null;

    useEffect(() => {
        const handleUserUpdate = () => {
            try {
                setCurrentUser(JSON.parse(localStorage.getItem('user') || '{}') || {});
            } catch (e) {}
        };
        window.addEventListener('storage', handleUserUpdate);
        window.addEventListener('user-updated', handleUserUpdate);
        return () => {
            window.removeEventListener('storage', handleUserUpdate);
            window.removeEventListener('user-updated', handleUserUpdate);
        };
    }, []);

    const handleDirectImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select a valid image file (PNG, JPG, WebP)');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size must be less than 5MB');
            return;
        }

        setIsUploading(true);
        const toastId = toast.loading('Uploading profile picture...');
        try {
            const formData = new FormData();
            formData.append('image', file);
            if (currentUser.addressHouseNo) formData.append('addressHouseNo', currentUser.addressHouseNo);
            if (currentUser.addressStreet) formData.append('addressStreet', currentUser.addressStreet);
            if (currentUser.city) formData.append('city', currentUser.city);
            if (currentUser.district) formData.append('district', currentUser.district);

            const res = await axios.post('/student/profile/update', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const newImage = res.data?.image || file.name;
            const updatedUser = { ...currentUser, image: newImage };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setCurrentUser(updatedUser);
            window.dispatchEvent(new Event('user-updated'));

            toast.success('Awesome! Profile picture updated! 🎉 Looking sharp!', { id: toastId, icon: '📸' });
        } catch (err) {
            console.error('Failed to upload profile picture:', err);
            toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to upload profile picture', { id: toastId });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        axios.get('/student/dashboard')
            .then(res => {
                setData(res.data);
                if (res.data?.alerts) {
                    res.data.alerts.forEach(alert => {
                        if (alert.type === 'locked') toast.error(alert.msg, { duration: 8000 });
                        else toast(alert.msg, { icon: '⚠️', duration: 5000 });
                    });
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
        return () => clearInterval(timer);
    }, []);

    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    // 🔥 Live Class Logic 🔥
    const getLiveClassInfo = (c) => {
        if (!c || !c.date) return null;

        const sDate = new Date(c.date);
        if (c.startTime) {
            const [h, m] = c.startTime.split(':');
            sDate.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
        }

        const eDate = new Date(sDate);
        if (c.endTime) {
            const [h, m] = c.endTime.split(':');
            eDate.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
        } else {
            eDate.setHours(sDate.getHours() + 2); // Default to 2 hours if no end time
        }

        return { ...c, startObj: sDate, endObj: eDate };
    };

    const renderLiveBanner = (c) => {
        const liveClass = getLiveClassInfo(c);
        if (!liveClass || liveClass.endObj <= currentTime) return null; // Hide if past

        const diff = liveClass.startObj - currentTime;
        const isLiveNow = diff <= 0 && liveClass.endObj > currentTime;
        // const isJoinable = diff <= 15 * 60 * 1000; // Joinable 15 mins before
        const isJoinable = true;
        const isUrgent = diff > 0 && diff < 10 * 60 * 1000; // Pulse animation 10 mins before

        let timeUI = null;
        if (isLiveNow) {
            timeUI = (
                <div className="flex items-center justify-center gap-2 md:gap-3 text-red-500 font-black animate-pulse px-4 py-2.5 bg-red-500/10 rounded-xl border border-red-500/30 w-full text-xs md:text-sm">
                    <Radio className="animate-ping shrink-0" size={18} />
                    CLASS IS LIVE NOW
                </div>
            );
        } else {
            const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const m = Math.floor((diff / 1000 / 60) % 60);
            const s = Math.floor((diff / 1000) % 60);
            const d = Math.floor(diff / (1000 * 60 * 60 * 24));

            timeUI = (
                <div className={`flex justify-center items-center gap-1 sm:gap-2 ${isUrgent ? 'text-red-400' : 'text-white'} transition-colors duration-500`}>
                    {d > 0 && <div className="flex flex-col items-center bg-black/20 backdrop-blur-xl border border-white/20 rounded-lg p-2 w-12 sm:w-14"><span className="text-lg sm:text-2xl font-black">{d}</span><span className="text-[9px] uppercase font-bold text-white/80 font-medium">Days</span></div>}
                    {d > 0 && <span className="text-base sm:text-xl font-bold opacity-30">:</span>}
                    <div className="flex flex-col items-center bg-black/20 backdrop-blur-xl border border-white/20 rounded-lg p-2 w-12 sm:w-14"><span className="text-lg sm:text-2xl font-black">{h.toString().padStart(2, '0')}</span><span className="text-[9px] uppercase font-bold text-white/80 font-medium">Hrs</span></div>
                    <span className="text-base sm:text-xl font-bold opacity-30">:</span>
                    <div className="flex flex-col items-center bg-black/20 backdrop-blur-xl border border-white/20 rounded-lg p-2 w-12 sm:w-14"><span className="text-lg sm:text-2xl font-black">{m.toString().padStart(2, '0')}</span><span className="text-[9px] uppercase font-bold text-white/80 font-medium">Min</span></div>
                    <span className={`text-base sm:text-xl font-bold opacity-30 ${isUrgent ? 'animate-pulse text-red-500' : ''}`}>:</span>
                    <div className={`flex flex-col items-center bg-black/20 backdrop-blur-xl border border-white/20 rounded-lg p-2 w-12 sm:w-14 ${isUrgent ? 'bg-red-500/10 border-red-500/30' : ''}`}>
                        <span className={`text-lg sm:text-2xl font-black ${isUrgent ? 'animate-bounce text-red-400' : ''}`}>{s.toString().padStart(2, '0')}</span>
                        <span className="text-[9px] uppercase font-bold text-white/80 font-medium">Sec</span>
                    </div>
                </div>
            );
        }

        return (
            <div className={`rounded-2xl md:rounded-[1.5rem] p-4 md:p-6 relative overflow-hidden flex flex-col lg:flex-row items-center lg:items-center justify-between gap-5 transition-all duration-700 w-full ${isJoinable ? 'bg-gradient-to-br from-red-600/20 via-[#0a0f1c] to-red-900/20 border border-red-500/50 shadow-[0_0_30px_rgba(220,38,38,0.15)]' : 'glass-card border-white/20'}`}>

                {/* Decorative Elements */}
                {isJoinable && <div className="absolute top-0 left-0 w-1.5 bg-red-500 h-full shadow-[0_0_20px_red]"></div>}
                <div className="absolute -top-32 -right-32 w-64 h-64 bg-red-600/10 blur-[120px] rounded-full pointer-events-none"></div>

                {/* Left side details */}
                <div className="flex-1 text-left z-10 w-full min-w-0">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 border w-max ${isJoinable ? 'bg-red-500/20 border-red-500/30' : 'bg-black/20 backdrop-blur-xl border-white/20'}`}>
                        <Video size={12} className={isJoinable ? "text-red-400 animate-pulse" : "text-white/90 font-bold"} />
                        <span className={`font-bold uppercase tracking-widest text-[9px] ${isJoinable ? "text-red-400" : "text-white/90 font-bold"}`}>Upcoming Live Class</span>
                    </div>

                    {/* Fixed Text Wrapping & Size Issue Here */}
                    <h2
                        className="text-lg md:text-xl font-black text-white mb-1.5 leading-snug break-words whitespace-normal"
                        title={liveClass.title}
                    >
                        {liveClass.title}
                    </h2>

                    <p className="text-white/70 font-medium text-xs md:text-sm font-medium mb-4 truncate">{liveClass.courseName || "Subject Name"}</p>

                    {liveClass.startTime && (
                        <div className="flex flex-row flex-wrap items-center gap-2.5">
                            <div className="flex items-center gap-2 bg-black/20 backdrop-blur-xl px-3 py-1.5 md:px-3 md:py-2 rounded-lg border border-white/20 w-max">
                                <CalendarDays size={12} className="text-blue-400 shrink-0" />
                                <span className="text-white/80 font-medium text-[10px] md:text-xs font-bold uppercase tracking-wider">{liveClass.startObj.toDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-black/20 backdrop-blur-xl px-3 py-1.5 md:px-3 md:py-2 rounded-lg border border-white/20 w-max">
                                <Clock size={12} className="text-yellow-400 shrink-0" />
                                <span className="text-white/80 font-medium text-[10px] md:text-xs font-bold uppercase tracking-wider">{liveClass.startTime} {liveClass.endTime ? `- ${liveClass.endTime}` : ''}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Side: Countdown Timer & Button (Grouped Together) */}
                <div className="z-10 flex flex-col items-center gap-3 shrink-0 w-full lg:w-auto mt-2 lg:mt-0">
                    <div className="bg-black/20 backdrop-blur-xl p-3 md:p-4 rounded-2xl border border-white/20 backdrop-blur-sm shadow-inner w-full flex justify-center">
                        {timeUI}
                    </div>

                    <a
                        href={liveClass.link}
                        target="_blank"
                        rel="noreferrer"
                        className={`w-full h-12 md:h-14 rounded-xl font-black flex items-center justify-center gap-2 uppercase tracking-widest transition-all duration-300 text-xs md:text-sm ${isJoinable ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)] animate-pulse hover:animate-none hover:scale-105 border border-red-400' : 'bg-black/20 backdrop-blur-xl text-white/70 font-medium cursor-not-allowed border border-white/20'} `}
                        onClick={(e) => !isJoinable && e.preventDefault()}
                    >
                        {isJoinable ? <><Play size={16} className="fill-white" /> Join Now</> : <><Lock size={14} /> Locked</>}
                    </a>
                </div>
            </div>
        );
    };

    if (loading) return <div className="flex justify-center items-center h-[50vh]"><Loader2 className="animate-spin text-red-500" size={40} /></div>;

    return (
        <div className="w-full max-w-6xl mx-auto pb-20 relative px-3 sm:px-0 custom-scrollbar">

            {/* 🔥 NEW APP DOWNLOAD BANNER (IN-PAGE) 🔥 */}
            <div className="bg-gradient-to-r from-[#0f172a] to-blue-900/30 border border-blue-500/30 rounded-2xl md:rounded-[1.5rem] p-5 mb-6 flex flex-col lg:flex-row items-center justify-between gap-5 shadow-[0_0_30px_rgba(59,130,246,0.1)] relative overflow-hidden">

                {/* Decorative background element */}
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none"></div>

                <div className="flex items-center gap-4 w-full lg:w-auto text-left z-10">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-3 md:p-4 rounded-xl md:rounded-2xl text-white shadow-lg shadow-blue-500/30 shrink-0">
                        <Smartphone size={28} className="md:w-8 md:h-8" />
                    </div>
                    <div>
                        <h4 className="text-white font-black text-base md:text-xl tracking-wide mb-1">Download the Official IMA Campus App</h4>
                        <p className="text-blue-200/70 text-[11px] md:text-sm font-medium">Experience seamless learning directly from your mobile device.</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto z-10">
                    {/* Android / Play Store Button */}
                    <a
                        href="https://play.google.com/store/apps/details?id=com.imaacademyapp&pcampaignid=web_share"
                        target="_blank"
                        rel="noreferrer"
                        className="w-full sm:w-auto flex items-center justify-center gap-3 bg-black/20 backdrop-blur-xl hover:bg-black border border-white/20 hover:border-blue-500/50 px-5 py-3 rounded-xl transition-all duration-300 group shadow-inner"
                    >
                        <img src="https://upload.wikimedia.org/wikipedia/commons/d/d0/Google_Play_Arrow_logo.svg" alt="Play Store" className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <div className="text-left flex flex-col justify-center">
                            <span className="text-[9px] text-white/80 font-medium font-bold uppercase tracking-wider leading-none mb-1">Get it on</span>
                            <span className="text-sm md:text-base font-black text-white leading-none tracking-wide">Play Store</span>
                        </div>
                    </a>

                    {/* iOS / App Store Button */}
                    <a
                        href="https://apps.apple.com/lk/app/ima-campus/id6759137655"
                        target="_blank"
                        rel="noreferrer"
                        className="w-full sm:w-auto flex items-center justify-center gap-3 bg-black/20 backdrop-blur-xl hover:bg-black border border-white/20 hover:border-white/200 px-5 py-3 rounded-xl transition-all duration-300 group shadow-inner"
                    >
                        <Apple size={26} className="text-white group-hover:scale-110 transition-transform" />
                        <div className="text-left flex flex-col justify-center">
                            <span className="text-[9px] text-white/80 font-medium font-bold uppercase tracking-wider leading-none mb-1">Download on the</span>
                            <span className="text-sm md:text-base font-black text-white leading-none tracking-wide">App Store</span>
                        </div>
                    </a>
                </div>
            </div>

            {/* Hidden Native File Input for Instant 1-Click Upload */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/jpg"
                className="hidden"
                onChange={handleDirectImageUpload}
            />

            {/* 🔥 COMPACT GREETING CARD WITH SOCIAL MEDIA STORY RING & PROFILE CTA 🔥 */}
            <div className="glass-card flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] border-white/20 relative overflow-hidden">
                {/* Subtle colorful ambient glow behind avatar */}
                <div className="absolute -top-12 -left-12 w-48 h-48 bg-gradient-to-br from-rose-500/15 via-purple-500/10 to-amber-500/5 blur-3xl rounded-full pointer-events-none"></div>

                <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 w-full sm:w-auto text-center sm:text-left z-10">
                    
                    {/* 🌟 SOCIAL MEDIA AVATAR & PROMPT CONTAINER (ENLARGED) 🌟 */}
                    <div className="flex flex-col items-center shrink-0">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="relative group cursor-pointer"
                            role="button"
                            tabIndex={0}
                            title={profilePic ? "Click to change your profile picture" : "Click to add your profile picture"}
                            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}
                        >
                            {/* 🔥 Intense Animated Blinking & Radar Waves when no profile picture 🔥 */}
                            {!profilePic && (
                                <>
                                    {/* Outward Expanding Ping Wave 1 */}
                                    <span className="absolute -inset-3 rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 opacity-70 blur-md animate-ping pointer-events-none"></span>
                                    {/* Breathing Neon Halo Wave 2 */}
                                    <span className="absolute -inset-2 rounded-full bg-gradient-to-tr from-rose-500 via-purple-600 to-amber-400 opacity-90 blur-sm animate-pulse pointer-events-none"></span>
                                </>
                            )}

                            {/* 📸 Social Media Story Gradient Ring - LARGER AREA */}
                            <div className={`relative w-20 h-20 sm:w-22 sm:h-22 md:w-24 md:h-24 rounded-full p-[3px] transition-all duration-300 ${
                                profilePic
                                    ? 'bg-gradient-to-tr from-emerald-400 via-cyan-500 to-blue-500 group-hover:scale-105 shadow-[0_0_20px_rgba(6,182,212,0.45)]'
                                    : 'bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 story-glow-active group-hover:scale-110'
                            }`}>
                                {/* Inner circle housing photo or placeholder */}
                                <div className="w-full h-full rounded-full bg-[#0a0f1d] p-0.5 flex items-center justify-center overflow-hidden relative">
                                    {isUploading ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm">
                                            <Loader2 className="animate-spin text-rose-400" size={30} />
                                        </div>
                                    ) : profilePic ? (
                                        <>
                                            <img
                                                src={profilePic}
                                                alt="Profile"
                                                className="w-full h-full rounded-full object-cover group-hover:scale-110 transition-transform duration-300"
                                            />
                                            {/* Hover Camera Overlay */}
                                            <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-full transition-opacity duration-200">
                                                <Camera size={24} className="text-white drop-shadow" />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-full h-full rounded-full bg-gradient-to-br from-rose-500/30 via-purple-500/20 to-amber-500/30 flex items-center justify-center group-hover:bg-rose-500/40 transition-colors">
                                            <User size={38} className="text-white group-hover:scale-110 transition-transform" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 🎯 Social Media Corner Badge */}
                            {isUploading ? null : !profilePic ? (
                                /* Instagram-style Bouncing Plus Badge */
                                <div className="absolute -bottom-1 -right-1 w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center border-2 border-[#0a0f1d] shadow-lg shadow-rose-500/50 animate-bounce group-hover:scale-125 transition-transform">
                                    <Plus size={16} className="stroke-[3]" />
                                </div>
                            ) : (
                                /* Verified / Edit Photo Badge */
                                <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 md:w-7 md:h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center border-2 border-[#0a0f1d] shadow-md group-hover:scale-110 transition-transform">
                                    <Camera size={13} className="stroke-[2.5]" />
                                </div>
                            )}
                        </div>

                        {/* 🔥 ONLY 1 BUTTON DIRECTLY UNDER AVATAR 🔥 */}
                        {!profilePic ? (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="mt-2.5 relative inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] md:text-xs font-black text-white bg-gradient-to-r from-rose-500 via-pink-600 to-amber-500 hover:from-rose-600 hover:to-amber-600 shadow-[0_0_20px_rgba(244,63,94,0.45)] hover:shadow-[0_0_28px_rgba(244,63,94,0.75)] hover:scale-105 active:scale-95 transition-all duration-300 border border-white/25 group cursor-pointer whitespace-nowrap"
                            >
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                </span>
                                <Camera size={13} className="group-hover:rotate-12 transition-transform shrink-0" />
                                <span>Add Your Profile Picture</span>
                                <Sparkles size={12} className="text-yellow-300 animate-pulse shrink-0" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-white/90 bg-white/10 hover:bg-white/20 border border-white/20 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                            >
                                <Camera size={12} />
                                <span>Change Photo</span>
                            </button>
                        )}
                    </div>

                    {/* Greeting & Details (Clean & Uncluttered) */}
                    <div className="flex-1 text-center sm:text-left">
                        <h1 className="text-xl md:text-3xl font-extrabold text-white leading-tight break-words">
                            {getGreeting()}{user.fName ? <>, <span className="text-red-500">{user.fName}</span></> : null} 👋
                        </h1>
                        <p className="text-white/80 font-medium text-xs md:text-sm mt-1 flex items-center justify-center sm:justify-start gap-1.5">
                            <Calendar size={13} /> {currentTime.toLocaleDateString()} <span className="mx-1">•</span> <Clock size={13} /> {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 w-full sm:w-auto z-10">
                    <div className="bg-black/20 backdrop-blur-xl border border-white/20 px-4 py-2 md:px-5 md:py-2.5 rounded-xl flex items-center justify-center gap-3 w-full sm:w-auto min-w-max">
                        <div className="bg-red-500/20 p-2 rounded-lg text-red-400 shrink-0">
                            <BookOpen size={18} />
                        </div>
                        <div className="text-left">
                            <p className="text-[9px] md:text-[10px] text-white/80 font-medium font-bold uppercase tracking-widest">Enrolled</p>
                            <p className="text-sm md:text-lg font-black text-white leading-none">{data?.enrolledCount || 0} <span className="text-[10px] md:text-xs font-bold text-white/90 font-bold">Subjects</span></p>
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN GRID LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LEFT COLUMN: Updates + Live Classes */}
                <div className="lg:col-span-2 flex flex-col gap-6">

                    {/* 🔥 LATEST UPDATES (MOVED TO TOP) 🔥 */}
                    <div className="glass-card rounded-[1.5rem] md:rounded-[2.5rem] p-5 md:p-8 bg-gradient-to-br from-[#0f172a]/90 to-[#1e293b]/90 border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                        <h3 className="text-lg md:text-xl font-black text-white mb-6 flex items-center gap-3">
                            <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400">
                                <Bell className="w-5 h-5" />
                            </div> 
                            Latest Announcements
                        </h3>
                        <div className="space-y-4 md:space-y-5">
                            {data?.posts?.length === 0 ? (
                                <div className="text-center text-white/70 font-medium py-8 text-xs md:text-sm font-medium bg-black/20 backdrop-blur-xl rounded-2xl border border-white/20">No updates yet.</div>
                            ) : data?.posts?.map((post) => {
                                const postImage = post.image && post.image !== 'default.png' && post.image !== 'null' ? `${backendBaseUrl}/storage/posts/${post.image}` : null;
                                return (
                                    <div key={post.id} className="bg-gradient-to-br from-white/10 to-transparent backdrop-blur-md border border-white/10 rounded-2xl p-4 md:p-5 hover:bg-white/10 hover:border-white/30 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.3)] transition-all duration-300 flex flex-col sm:flex-row gap-5">
                                        {postImage && (
                                            <img src={postImage} onClick={() => setSelectedImage(postImage)} alt="" className="w-full sm:w-48 md:w-56 h-48 sm:h-36 md:h-40 object-cover rounded-xl cursor-pointer hover:opacity-80 transition-opacity shrink-0 shadow-lg border border-white/10" />
                                        )}
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <h4 className="text-white font-bold text-base md:text-lg mb-2 break-words">{post.title}</h4>
                                            <p className="text-white/80 font-medium text-xs md:text-sm leading-relaxed mb-4 break-words">{post.caption || post.description}</p>
                                            <div className="flex items-center gap-3 text-[9px] md:text-[10px] text-white/70 font-medium font-bold uppercase tracking-widest mt-auto">
                                                <span className="flex items-center gap-1"><Calendar size={10} md:size={12} /> {new Date(post.created_at).toLocaleDateString()}</span>
                                                <span className="flex items-center gap-1"><Clock size={10} md:size={12} /> {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 🔥 LIVE CLASS BANNER (MOVED TO BOTTOM) 🔥 */}
                    <div className="flex flex-col gap-4">
                        {data?.upcomingLives?.map((c, index) => (
                            <React.Fragment key={index}>
                                {renderLiveBanner(c)}
                            </React.Fragment>
                        ))}
                    </div>

                </div>

                {/* RIGHT COLUMN: Due Payments */}
                <div className="flex flex-col gap-6">
                    <div className="glass-card rounded-[1.5rem] md:rounded-[2.5rem] p-5 md:p-8">
                        <h3 className="text-lg md:text-xl font-bold text-white mb-5 flex items-center gap-2.5">
                            <AlertTriangle className="text-red-500 w-5 h-5" /> Due Payments
                        </h3>
                        <div className="space-y-3">
                            {data?.duePayments?.length === 0 ? (
                                <div className="text-center py-8 bg-black/20 backdrop-blur-xl rounded-2xl border border-white/20">
                                    <CheckCircle className="text-green-500 mx-auto mb-2" size={28} />
                                    <p className="text-white/90 font-bold text-xs font-medium">All clear!</p>
                                </div>
                            ) : data?.duePayments?.map((p, idx) => (
                                <div key={idx} 
                                     onClick={() => {
                                         navigate('/student/dashboard-v2', { 
                                             state: { 
                                                 activeTab: 'courses', 
                                                 autoSelect: {
                                                     businessId: p.businessId,
                                                     batchId: p.batchId,
                                                     groupId: p.groupId
                                                 }
                                             } 
                                         });
                                     }}
                                     className={`p-4 rounded-xl bg-black/20 backdrop-blur-xl border cursor-pointer hover:bg-black/30 transition-all ${p.diffDays < 0 ? 'border-red-500/30 hover:border-red-500/50' : 'border-white/20 hover:border-white/40'}`}
                                >
                                    <h4 className="text-white font-bold text-xs md:text-sm mb-2 break-words line-clamp-2">{p.courseName}</h4>
                                    <div className="flex justify-between items-end mt-2">
                                        <div>
                                            <p className="text-[9px] text-white/70 font-medium uppercase font-bold tracking-widest mb-0.5">Amount</p>
                                            <p className="text-sm md:text-base font-black text-white">LKR {parseFloat(p.amount).toFixed(2)}</p>
                                        </div>
                                        <p className={`text-[9px] md:text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${p.diffDays < 0 ? 'bg-red-500/20 text-red-500 border border-red-500/20' : 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/20'}`}>
                                            {p.diffDays < 0 ? 'Overdue' : 'Upcoming'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <UpgradeOfferWidget compactMode={true} hideFloatingWidget={true} />
                </div>
            </div>

            {/* FULL SCREEN IMAGE VIEWER */}
            {selectedImage && (
                <div className="fixed inset-0 z-[400] bg-black/20 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedImage(null)}>
                    <button className="absolute top-4 right-4 md:top-6 md:right-6 text-white/80 font-medium hover:text-white bg-black/20 backdrop-blur-xl hover:bg-black/20 backdrop-blur-xl rounded-full p-2 transition-all"><X size={24} /></button>
                    <img src={selectedImage} alt="" className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300" />
                </div>
            )}
        </div>
    );
}