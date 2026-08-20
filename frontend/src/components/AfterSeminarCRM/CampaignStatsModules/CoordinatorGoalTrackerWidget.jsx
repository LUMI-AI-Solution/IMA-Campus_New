import React, { useState } from 'react';
import { FaBullseye, FaUsers, FaTrophy, FaFire, FaCrown, FaRocket, FaCheckCircle, FaBolt, FaAward, FaMedal } from 'react-icons/fa';

export default function CoordinatorGoalTrackerWidget({ 
    myAssigned = 0, 
    myEnrolled = 0, 
    totalGroupAssigned = 0, 
    totalGroupEnrolled = 0, 
    targetIndividualGoal = 40, 
    targetGroupGoal = 50,
    staffBreakdown = []
}) {
    // Single Goal Calculations
    const myRate = myAssigned > 0 ? Math.round((myEnrolled / myAssigned) * 100) : 0;
    const requiredSingleCount = Math.ceil((targetIndividualGoal / 100) * myAssigned);
    const neededSingle = Math.max(0, requiredSingleCount - myEnrolled);
    const singleProgress = Math.min(100, Math.round((myRate / targetIndividualGoal) * 100));

    // Group Goal Calculations
    const groupRate = totalGroupAssigned > 0 ? Math.round((totalGroupEnrolled / totalGroupAssigned) * 100) : 0;
    const requiredGroupCount = Math.ceil((targetGroupGoal / 100) * totalGroupAssigned);
    const neededGroup = Math.max(0, requiredGroupCount - totalGroupEnrolled);
    const groupProgress = Math.min(100, Math.round((groupRate / targetGroupGoal) * 100));

    // Sort coordinators by enrolled count for top team drivers
    const topTeamDrivers = [...staffBreakdown].sort((a, b) => {
        const enrolledA = a.overall?.enrolled || 0;
        const enrolledB = b.overall?.enrolled || 0;
        return enrolledB - enrolledA;
    }).slice(0, 3);

    // Level badge styling
    let levelBadge = { label: "Level 1 • Starter", color: "from-slate-700 to-slate-800 text-slate-300 border-slate-600" };
    if (singleProgress >= 100) {
        levelBadge = { label: "Level 4 • Champion 👑", color: "from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-black border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.4)]" };
    } else if (singleProgress >= 75) {
        levelBadge = { label: "Level 3 • Performer 🌟", color: "from-cyan-500 to-blue-600 text-white font-bold border-cyan-400/50 shadow-[0_0_12px_rgba(34,211,238,0.3)]" };
    } else if (singleProgress >= 40) {
        levelBadge = { label: "Level 2 • On Track ⚡", color: "from-indigo-500 to-purple-600 text-white font-bold border-indigo-400/50" };
    }

    // Helper to get backend base URL for images
    const getBackendBase = () => {
        if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');
        const host = window.location.hostname;
        const protocol = window.location.protocol;
        if (protocol === 'https:') return `https://${host}`;
        if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:5000';
        return `http://${host}:5000`;
    };

    // Helper to get full avatar image URL
    const getAvatarSrc = (driver) => {
        const img = driver.image || driver.appChatDp;
        if (!img) return null;
        if (img.startsWith('http') || img.startsWith('data:')) return img;
        const clean = img.replace(/^\/?(storage\/users\/)?/, '');
        return `${getBackendBase()}/storage/users/${clean}`;
    };

    // Clean name from "undefined"
    const getCleanName = (name) => {
        if (!name) return 'Coordinator';
        return name.replace(/\bundefined\b/gi, '').trim() || 'Coordinator';
    };

    const getInitials = (name) => {
        const cleaned = getCleanName(name);
        const parts = cleaned.split(' ').filter(Boolean);
        if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        return cleaned.substring(0, 2).toUpperCase();
    };

    return (
        <div className="w-full mb-7 font-sans">
            {/* Main Outer Container: Glassmorphic Banner */}
            <div className="bg-gradient-to-r from-[#0D1527] via-[#111A33] to-[#0D1527] border border-slate-700/50 rounded-3xl p-5 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
                
                {/* Background ambient light */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 relative z-10 items-stretch">
                    
                    {/* ========================================================= */}
                    {/* LEFT PANEL: SINGLE & GROUP GOAL METRICS (8 cols) */}
                    {/* ========================================================= */}
                    <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* --- MODULE 1: INDIVIDUAL GOAL --- */}
                        <div className="bg-slate-900/70 border border-indigo-500/25 rounded-2xl p-4 backdrop-blur-md shadow-lg flex flex-col justify-between hover:border-indigo-400/40 transition-all group">
                            <div>
                                {/* Header */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-cyan-300 shadow-inner group-hover:scale-105 transition-transform">
                                            <FaBullseye size={18} className="drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 block">Personal Target</span>
                                            <h4 className="text-sm font-black text-white tracking-wide">Single Conversion Goal</h4>
                                        </div>
                                    </div>
                                    <span className={`px-2.5 py-0.5 text-[10px] uppercase font-black rounded-xl border bg-gradient-to-r ${levelBadge.color}`}>
                                        {levelBadge.label}
                                    </span>
                                </div>

                                {/* Score & Target Line */}
                                <div className="flex items-end justify-between my-2.5 bg-slate-950/70 p-3 rounded-xl border border-white/5">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">My Conversion</span>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-2xl font-black text-white tracking-tight">{myRate}%</span>
                                            <span className="text-xs font-bold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-500/30">
                                                {myEnrolled} / {myAssigned} Enrolled
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Goal Line</span>
                                        <span className="text-xs font-black text-white bg-gradient-to-r from-indigo-600 to-blue-600 px-3 py-1 rounded-xl border border-indigo-400/40 shadow-md inline-block">
                                            {targetIndividualGoal}%
                                        </span>
                                    </div>
                                </div>

                                {/* Animated Progress Bar */}
                                <div className="space-y-1 my-2">
                                    <div className="flex justify-between items-center text-[11px] font-bold">
                                        <span className="text-slate-300 flex items-center gap-1.5"><FaBolt className="text-cyan-400" size={12} /> Progress</span>
                                        <span className="text-cyan-300 font-black">{singleProgress}% <span className="text-slate-400 text-[10px] font-normal">of goal</span></span>
                                    </div>
                                    <div className="w-full h-2.5 bg-slate-950 rounded-full p-0.5 border border-white/10 overflow-hidden shadow-inner">
                                        <div 
                                            className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(34,211,238,0.5)]"
                                            style={{ width: `${Math.max(4, Math.min(100, singleProgress))}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            {/* Status Callout Banner */}
                            <div className="mt-2 pt-2 border-t border-white/5">
                                {neededSingle > 0 ? (
                                    <div className="bg-amber-500/10 border border-amber-500/30 p-2 rounded-xl flex items-center gap-2 text-xs text-amber-200">
                                        <FaFire className="text-amber-400 shrink-0" size={13} />
                                        <span>Need <strong className="text-white font-black text-xs bg-amber-500/30 px-1.5 py-0.5 rounded border border-amber-400/40">{neededSingle}</strong> more enrollments for goal ({targetIndividualGoal}%) 🎯</span>
                                    </div>
                                ) : (
                                    <div className="bg-emerald-500/10 border border-emerald-500/30 p-2 rounded-xl flex items-center gap-2 text-xs text-emerald-200">
                                        <FaCheckCircle className="text-emerald-400 shrink-0" size={13} />
                                        <span className="font-bold">Individual Goal Achieved! ({myRate}%) 🎯</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* --- MODULE 2: GROUP INTAKE GOAL --- */}
                        <div className="bg-slate-900/70 border border-emerald-500/25 rounded-2xl p-4 backdrop-blur-md shadow-lg flex flex-col justify-between hover:border-emerald-400/40 transition-all group">
                            <div>
                                {/* Header */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-inner group-hover:scale-105 transition-transform">
                                            <FaUsers size={18} className="drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">Batch Target</span>
                                            <h4 className="text-sm font-black text-white tracking-wide">Group Intake Goal</h4>
                                        </div>
                                    </div>
                                    <span className="px-2.5 py-0.5 text-[10px] uppercase font-black rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
                                        Team Challenge 🚀
                                    </span>
                                </div>

                                {/* Score & Target Line */}
                                <div className="flex items-end justify-between my-2.5 bg-slate-950/70 p-3 rounded-xl border border-white/5">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Team Conversion</span>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-2xl font-black text-white tracking-tight">{groupRate}%</span>
                                            <span className="text-xs font-bold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30">
                                                {totalGroupEnrolled} / {totalGroupAssigned} Total
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Batch Goal</span>
                                        <span className="text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1 rounded-xl border border-emerald-400/40 shadow-md inline-block">
                                            {targetGroupGoal}%
                                        </span>
                                    </div>
                                </div>

                                {/* Animated Progress Bar */}
                                <div className="space-y-1 my-2">
                                    <div className="flex justify-between items-center text-[11px] font-bold">
                                        <span className="text-slate-300 flex items-center gap-1.5"><FaRocket className="text-emerald-400" size={12} /> Intake Progress</span>
                                        <span className="text-emerald-300 font-black">{groupProgress}% <span className="text-slate-400 text-[10px] font-normal">of goal</span></span>
                                    </div>
                                    <div className="w-full h-2.5 bg-slate-950 rounded-full p-0.5 border border-white/10 overflow-hidden shadow-inner">
                                        <div 
                                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-300 rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(52,211,153,0.5)]"
                                            style={{ width: `${Math.max(4, Math.min(100, groupProgress))}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            {/* Status Callout Banner */}
                            <div className="mt-2 pt-2 border-t border-white/5">
                                {neededGroup > 0 ? (
                                    <div className="bg-purple-500/10 border border-purple-500/30 p-2 rounded-xl flex items-center gap-2 text-xs text-purple-200">
                                        <FaRocket className="text-purple-400 shrink-0" size={13} />
                                        <span>Team needs <strong className="text-white font-black text-xs bg-purple-500/30 px-1.5 py-0.5 rounded border border-purple-400/40">{neededGroup}</strong> more intake enrollments ({targetGroupGoal}%) 🚀</span>
                                    </div>
                                ) : (
                                    <div className="bg-emerald-500/10 border border-emerald-500/30 p-2 rounded-xl flex items-center gap-2 text-xs text-emerald-200">
                                        <FaTrophy className="text-amber-400 shrink-0" size={13} />
                                        <span className="font-bold">Group Goal Achieved! ({groupRate}%) 🏆</span>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* ========================================================= */}
                    {/* RIGHT PANEL: TOP GOAL DRIVERS WITH CRISP AVATARS (4 cols) */}
                    {/* ========================================================= */}
                    <div className="lg:col-span-4 bg-slate-900/80 border border-amber-500/25 rounded-2xl p-4 backdrop-blur-md shadow-lg flex flex-col justify-between">
                        <div>
                            {/* Header */}
                            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2.5">
                                <div className="flex items-center gap-2">
                                    <FaTrophy size={15} className="text-amber-400" />
                                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">
                                        Top Goal Drivers
                                    </h4>
                                </div>
                                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Share of Goal</span>
                            </div>

                            {/* Driver Cards Stack */}
                            {topTeamDrivers.length > 0 ? (
                                <div className="space-y-2.5">
                                    {topTeamDrivers.map((driver, idx) => {
                                        const enrolled = driver.overall?.enrolled || 0;
                                        const sharePct = totalGroupEnrolled > 0 ? Math.round((enrolled / totalGroupEnrolled) * 100) : 0;
                                        const avatarUrl = getAvatarSrc(driver);
                                        const cleanName = getCleanName(driver.name);
                                        const initials = getInitials(driver.name);

                                        let rankBadge = "LEADER";
                                        let badgeStyle = "bg-amber-500/20 text-amber-300 border-amber-400/40";
                                        let ringStyle = "border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.4)]";
                                        let rankIcon = <FaCrown className="text-amber-400" size={11} />;

                                        if (idx === 1) {
                                            rankBadge = "DRIVER";
                                            badgeStyle = "bg-cyan-500/20 text-cyan-300 border-cyan-400/40";
                                            ringStyle = "border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.4)]";
                                            rankIcon = <FaMedal className="text-cyan-300" size={11} />;
                                        }
                                        if (idx === 2) {
                                            rankBadge = "ANCHOR";
                                            badgeStyle = "bg-purple-500/20 text-purple-300 border-purple-400/40";
                                            ringStyle = "border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.4)]";
                                            rankIcon = <FaAward className="text-purple-300" size={11} />;
                                        }

                                        return (
                                            <div key={idx} className="flex items-center justify-between gap-3 bg-slate-950/80 p-2 rounded-xl border border-white/5 hover:border-slate-700 transition-all">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    {/* Ultra Crisp Staff Avatar */}
                                                    <div className="relative shrink-0">
                                                        <CrispStaffAvatar 
                                                            src={avatarUrl} 
                                                            initials={initials} 
                                                            ringStyle={ringStyle} 
                                                        />
                                                        <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5 border border-slate-700 shadow-sm">
                                                            {rankIcon}
                                                        </div>
                                                    </div>

                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="font-extrabold text-white text-xs truncate max-w-[110px]">{cleanName}</span>
                                                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.2 rounded border ${badgeStyle}`}>
                                                                {rankBadge}
                                                            </span>
                                                        </div>
                                                        <span className="text-[11px] font-bold text-emerald-400 block">{enrolled} <span className="text-[10px] text-slate-400 font-normal">enrolled</span></span>
                                                    </div>
                                                </div>

                                                <div className="shrink-0 text-right">
                                                    <span className="bg-emerald-500/15 text-emerald-300 text-xs font-black px-2.5 py-1 rounded-lg border border-emerald-500/30 inline-block">
                                                        {sharePct}%
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-6 text-xs text-slate-500 font-medium">
                                    No driver data available
                                </div>
                            )}
                        </div>

                        <div className="mt-2.5 pt-2.5 border-t border-white/5 text-[10px] font-bold text-slate-400 flex items-center justify-between">
                            <span>Top Performance Breakdown</span>
                            <span className="text-emerald-400 font-black">{totalGroupEnrolled} Total Enrolled</span>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

// Subcomponent to render CRISP staff avatar inside fixed aspect-square container
function CrispStaffAvatar({ src, initials, ringStyle }) {
    const [failed, setFailed] = useState(false);

    if (src && !failed) {
        return (
            <div className={`w-10 h-10 rounded-full border-2 ${ringStyle} overflow-hidden shrink-0 aspect-square bg-slate-800 flex items-center justify-center`}>
                <img 
                    src={src} 
                    alt="Coordinator Profile" 
                    className="w-full h-full object-cover object-center aspect-square"
                    onError={() => setFailed(true)}
                />
            </div>
        );
    }

    return (
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 border-2 ${ringStyle} flex items-center justify-center text-white font-black text-xs shrink-0 aspect-square shadow-sm`}>
            {initials}
        </div>
    );
}
