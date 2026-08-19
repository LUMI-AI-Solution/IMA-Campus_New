import React, { useState, useEffect } from 'react';
import axios from "../../../api/axios";
import {
    Loader2, Bell, AlertTriangle, CheckCircle, Calendar, Clock,
    User, X, Smartphone, Download, AlertCircle, Apple,
    Video, Play, Radio, CalendarDays, Lock, BookOpen
} from 'lucide-react';
import UpgradeOfferWidget from './UpgradeOfferWidget';

import { useNavigate } from 'react-router-dom';

export default function StudentOverview() {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [selectedImage, setSelectedImage] = useState(null);

    // Popup State
    const [showAppPopup, setShowAppPopup] = useState(true);

    const user = JSON.parse(localStorage.getItem('user') || '{}') || {};
    const backendBaseUrl = axios.defaults.baseURL ? axios.defaults.baseURL.replace('/api', '') : 'https://imacampus.online';

    const profilePic = user.image && user.image !== 'default.png' && user.image !== 'null'
        ? `${backendBaseUrl}/storage/images/${user.image}`
        : null;

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

            {/* 🔥 COMPACT GREETING CARD 🔥 */}
            <div className="glass-card flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] border-white/20">
                <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto text-center sm:text-left">
                    <div className="relative w-12 h-12 md:w-14 md:h-14 flex items-center justify-center shrink-0 mx-auto sm:mx-0">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-red-600 to-orange-500 animate-pulse"></div>
                        <div className="absolute inset-0.5 bg-black/20 backdrop-blur-xl rounded-full z-10"></div>
                        {profilePic ? <img src={profilePic} alt="Profile" className="absolute inset-1 w-[calc(100%-8px)] h-[calc(100%-8px)] rounded-full object-cover z-20" /> : <User size={20} className="text-white/80 font-medium relative z-20" />}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-lg md:text-2xl font-extrabold text-white leading-tight break-words">
                            {getGreeting()}, <span className="text-red-500">{user.fName}</span> 👋
                        </h1>
                        <p className="text-white/80 font-medium text-[10px] md:text-xs font-medium mt-0.5 flex items-center justify-center sm:justify-start gap-1.5">
                            <Calendar size={12} /> {currentTime.toLocaleDateString()} <span className="mx-1">•</span> <Clock size={12} /> {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 w-full sm:w-auto">


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

            {/* 🔥 NEW: ENROLLED SUBJECTS UI EXACTLY LIKE ENROLLMENT TAB 🔥 */}
            {data?.enrolledCourses && data.enrolledCourses.length > 0 && (
                <div className="mb-6 space-y-4">
                    <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2.5 px-2">
                        <BookOpen className="text-red-500 w-5 h-5" /> My Enrolled Subjects
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {data.enrolledCourses.map(course => (
                            <div key={course.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 md:p-5 rounded-2xl border transition-all gap-4 w-full bg-red-600/10 border-red-500 shadow-lg shadow-red-500/5 hover:border-red-400">

                                <div className="flex items-center gap-4 flex-1 min-w-0 w-full md:w-auto">
                                    <div className="relative flex items-center justify-center shrink-0">
                                        <div className="shrink-0 w-5 h-5 rounded border-2 border-transparent bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-500/30">
                                            <CheckCircle size={14} strokeWidth={3} />
                                        </div>
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="block font-bold text-white text-base md:text-lg truncate w-full md:w-auto md:max-w-[300px]" title={course.name}>{course.name}</span>
                                            {course.code && <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 font-bold uppercase tracking-widest shrink-0">{course.code}</span>}
                                        </div>
                                        <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
                                            <CheckCircle size={10} /> Active Enrollment
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 flex-1 min-w-0 w-full md:w-auto md:border-l md:border-white/20 md:pl-4 pl-8 md:pl-0 pt-3 md:pt-0 border-t border-white/20 md:border-t-0 mt-3 md:mt-0">
                                    {course.lecturerImage && course.lecturerImage !== 'default.png' && course.lecturerImage !== 'null' ? (
                                        <img src={`${backendBaseUrl}/storage/icons/${course.lecturerImage}`} alt="Lecturer" className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-white/20 shrink-0" />
                                    ) : (
                                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/20 backdrop-blur-xl flex items-center justify-center border border-white/20 shrink-0 text-white/80 font-medium">
                                            <User size={18} />
                                        </div>
                                    )}
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[10px] text-white/70 font-medium uppercase tracking-widest font-bold">Lecturer</span>
                                        <span className="text-sm md:text-base text-white font-semibold truncate" title={course.lecturerName || 'TBA'}>{course.lecturerName || 'TBA'}</span>
                                    </div>
                                </div>

                            </div>
                        ))}
                    </div>
                </div>
            )}

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