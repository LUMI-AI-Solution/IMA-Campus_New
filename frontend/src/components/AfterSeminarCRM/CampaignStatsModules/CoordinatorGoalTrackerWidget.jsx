import React from 'react';
import { FaBullseye, FaUsers, FaTrophy, FaRocket, FaFire, FaCrown, FaChartLine, FaCheckCircle, FaAward, FaMedal } from 'react-icons/fa';

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

    // Sort coordinators by enrolled count for team driver showcase
    const topTeamDrivers = [...staffBreakdown].sort((a, b) => {
        const enrolledA = a.overall?.enrolled || 0;
        const enrolledB = b.overall?.enrolled || 0;
        return enrolledB - enrolledA;
    }).slice(0, 3); // Top 3

    // Level determination for single goal
    let levelBadge = { name: "Level 1: Starter", color: "from-slate-700 to-slate-900 text-slate-300", border: "border-slate-700/50" };
    if (singleProgress >= 100) {
        levelBadge = { name: "Level 4: Champion 👑", color: "from-amber-400 via-yellow-300 to-amber-500 text-slate-950 font-black", border: "border-amber-400/80 shadow-[0_0_20px_rgba(251,191,36,0.5)]" };
    } else if (singleProgress >= 75) {
        levelBadge = { name: "Level 3: Performer 🌟", color: "from-cyan-400 to-blue-600 text-white font-bold", border: "border-cyan-400/50" };
    } else if (singleProgress >= 40) {
        levelBadge = { name: "Level 2: On Track ⚡", color: "from-indigo-500 to-purple-600 text-white font-bold", border: "border-indigo-500/50" };
    }

    return (
        <div className="w-full mb-6 font-sans">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* ========================================================= */}
                {/* 🎯 CARD 1: SINGLE GOAL (INDIVIDUAL CONVERSION) */}
                {/* ========================================================= */}
                <div className={`bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#0A0E1A] p-6 rounded-3xl border ${levelBadge.border} shadow-[0_16px_40px_rgba(0,0,0,0.6)] relative overflow-hidden group hover:border-indigo-400/60 transition-all duration-500 flex flex-col justify-between`}>
                    {/* Glowing background ambient lights */}
                    <div className="absolute -top-16 -right-16 w-56 h-56 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/35 transition-all duration-500 pointer-events-none"></div>
                    <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-blue-600/15 rounded-full blur-3xl group-hover:bg-blue-600/25 transition-all duration-500 pointer-events-none"></div>

                    <div>
                        {/* Top Bar */}
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-indigo-500/25 text-cyan-300 rounded-2xl border border-indigo-400/40 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                                    <FaBullseye size={22} className="animate-pulse" />
                                </div>
                                <div>
                                    <span className="text-[11px] font-black uppercase tracking-widest text-cyan-400 block">Individual Target</span>
                                    <h4 className="text-lg font-black text-white tracking-wide">
                                        Single Conversion Goal
                                    </h4>
                                </div>
                            </div>
                            <span className={`px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-xl bg-gradient-to-r ${levelBadge.color} shadow-lg border border-white/20`}>
                                {levelBadge.name}
                            </span>
                        </div>

                        {/* Rates Comparison */}
                        <div className="flex items-end justify-between my-5 relative z-10 bg-black/30 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">Current Conversion</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-white drop-shadow-[0_2px_12px_rgba(99,102,241,0.5)]">{myRate}%</span>
                                    <span className="text-xs font-bold text-cyan-300/90">({myEnrolled} / {myAssigned} Enrolled)</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300/80 block mb-1">Target Threshold</span>
                                <div className="bg-gradient-to-r from-indigo-600 to-blue-600 border border-cyan-400/40 px-4 py-1.5 rounded-xl text-white font-black text-base shadow-[0_0_15px_rgba(99,102,241,0.4)]">
                                    {targetIndividualGoal}%
                                </div>
                            </div>
                        </div>

                        {/* ANIMATED PROGRESS BAR */}
                        <div className="my-4 relative z-10">
                            <div className="flex justify-between items-center text-xs font-bold mb-2">
                                <span className="text-slate-300 flex items-center gap-2">
                                    <FaChartLine className="text-cyan-400" /> Goal Progress
                                </span>
                                <span className="text-cyan-400 font-black text-sm">{singleProgress}% <span className="text-slate-400 text-xs font-normal">of goal</span></span>
                            </div>
                            <div className="w-full h-4 bg-slate-950 rounded-full p-0.5 border border-white/10 relative overflow-hidden shadow-inner">
                                <div 
                                    className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-cyan-400 to-emerald-400 transition-all duration-1000 ease-out relative shadow-[0_0_20px_rgba(6,182,212,0.8)]"
                                    style={{ width: `${Math.max(4, Math.min(100, singleProgress))}%` }}
                                >
                                    <div className="absolute inset-0 bg-white/25 animate-pulse rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* DYNAMIC CALLOUT BANNER (ENGLISH ONLY) */}
                    <div className="mt-4 relative z-10">
                        {neededSingle > 0 ? (
                            <div className="bg-gradient-to-r from-amber-500/20 via-indigo-950/40 to-blue-950/40 border border-amber-500/40 p-3.5 rounded-2xl flex items-center gap-3 shadow-lg">
                                <div className="p-2.5 bg-amber-500/30 text-amber-300 rounded-xl flex-shrink-0 animate-bounce shadow-[0_0_12px_rgba(245,158,11,0.4)]">
                                    <FaFire size={16} />
                                </div>
                                <p className="text-xs font-bold text-amber-100 leading-snug">
                                    Need <strong className="text-white text-sm font-black bg-amber-500/40 px-2.5 py-0.5 rounded-lg border border-amber-400/50 mx-1 shadow-sm">{neededSingle}</strong> more enrollments to reach Individual Goal ({targetIndividualGoal}%) 🎯
                                </p>
                            </div>
                        ) : (
                            <div className="bg-gradient-to-r from-emerald-500/25 to-teal-500/25 border border-emerald-400/50 p-3.5 rounded-2xl flex items-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                                <div className="p-2.5 bg-emerald-500/40 text-emerald-200 rounded-xl flex-shrink-0">
                                    <FaCrown size={18} className="animate-pulse" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-emerald-200 tracking-wide flex items-center gap-1.5">
                                        <FaCheckCircle className="text-emerald-400" /> Individual Goal Achieved! 🎯
                                    </p>
                                    <p className="text-[11px] text-emerald-300 font-medium mt-0.5">
                                        Reached {myRate}% conversion ({myEnrolled} enrollments out of {myAssigned} assigned)!
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ========================================================= */}
                {/* 🚀 CARD 2: GROUP GOAL (TOTAL INTAKE CONVERSION + TEAM DRIVERS) */}
                {/* ========================================================= */}
                <div className="bg-gradient-to-br from-[#064E3B]/90 via-[#022C22] to-[#0F172A] p-6 rounded-3xl border border-emerald-500/40 shadow-[0_16px_40px_rgba(0,0,0,0.6)] relative overflow-hidden group hover:border-emerald-400/60 transition-all duration-500 flex flex-col justify-between">
                    {/* Glowing background ambient lights */}
                    <div className="absolute -top-16 -right-16 w-56 h-56 bg-emerald-500/20 rounded-full blur-3xl group-hover:bg-emerald-500/35 transition-all duration-500 pointer-events-none"></div>
                    <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-teal-600/15 rounded-full blur-3xl group-hover:bg-teal-600/25 transition-all duration-500 pointer-events-none"></div>

                    <div>
                        {/* Top Bar */}
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-emerald-500/25 text-emerald-300 rounded-2xl border border-emerald-400/40 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                                    <FaUsers size={22} className="animate-pulse" />
                                </div>
                                <div>
                                    <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 block">Total Intake Target</span>
                                    <h4 className="text-lg font-black text-white tracking-wide">
                                        Group Intake Goal
                                    </h4>
                                </div>
                            </div>
                            <span className="px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-xl bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 shadow-lg">
                                Team Challenge 🚀
                            </span>
                        </div>

                        {/* Rates Comparison */}
                        <div className="flex items-end justify-between my-5 relative z-10 bg-black/30 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">Current Group Conversion</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-white drop-shadow-[0_2px_12px_rgba(16,185,129,0.5)]">{groupRate}%</span>
                                    <span className="text-xs font-bold text-emerald-300/90">({totalGroupEnrolled} / {totalGroupAssigned} Total Intake)</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300/80 block mb-1">Batch Target</span>
                                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 border border-emerald-400/40 px-4 py-1.5 rounded-xl text-white font-black text-base shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                                    {targetGroupGoal}%
                                </div>
                            </div>
                        </div>

                        {/* ANIMATED PROGRESS BAR */}
                        <div className="my-4 relative z-10">
                            <div className="flex justify-between items-center text-xs font-bold mb-2">
                                <span className="text-slate-300 flex items-center gap-2">
                                    <FaRocket className="text-emerald-400" /> Intake Progress
                                </span>
                                <span className="text-emerald-400 font-black text-sm">{groupProgress}% <span className="text-slate-400 text-xs font-normal">of goal</span></span>
                            </div>
                            <div className="w-full h-4 bg-slate-950 rounded-full p-0.5 border border-white/10 relative overflow-hidden shadow-inner">
                                <div 
                                    className="h-full rounded-full bg-gradient-to-r from-teal-600 via-emerald-400 to-amber-300 transition-all duration-1000 ease-out relative shadow-[0_0_20px_rgba(52,211,153,0.8)]"
                                    style={{ width: `${Math.max(4, Math.min(100, groupProgress))}%` }}
                                >
                                    <div className="absolute inset-0 bg-white/25 animate-pulse rounded-full"></div>
                                </div>
                            </div>
                        </div>

                        {/* 🔥 TOP TEAM INTAKE DRIVERS SHOWCASE 🔥 */}
                        {topTeamDrivers.length > 0 && (
                            <div className="mt-4 relative z-10 bg-black/40 p-3.5 rounded-2xl border border-emerald-500/30 backdrop-blur-md">
                                <div className="flex items-center justify-between mb-2.5">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                                        <FaTrophy className="text-amber-400" size={12} /> Top Group Goal Drivers
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Share of Goal</span>
                                </div>
                                <div className="space-y-2">
                                    {topTeamDrivers.map((driver, idx) => {
                                        const enrolled = driver.overall?.enrolled || 0;
                                        const sharePct = totalGroupEnrolled > 0 ? Math.round((enrolled / totalGroupEnrolled) * 100) : 0;
                                        let rankBadge = "🥇 Leader";
                                        let badgeColor = "bg-amber-500/20 text-amber-300 border-amber-400/40";
                                        if (idx === 1) { rankBadge = "🥈 Driver"; badgeColor = "bg-cyan-500/20 text-cyan-300 border-cyan-400/40"; }
                                        if (idx === 2) { rankBadge = "🥉 Anchor"; badgeColor = "bg-purple-500/20 text-purple-300 border-purple-400/40"; }

                                        return (
                                            <div key={idx} className="flex items-center justify-between gap-3 text-xs bg-slate-900/60 p-2 rounded-xl border border-white/5">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${badgeColor}`}>
                                                        {rankBadge}
                                                    </span>
                                                    <span className="font-bold text-white truncate text-xs">{driver.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <span className="text-emerald-300 font-black text-xs">{enrolled} <span className="text-[10px] text-slate-400 font-normal">enrolled</span></span>
                                                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-md border border-emerald-400/30">{sharePct}%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* DYNAMIC CALLOUT BANNER (ENGLISH ONLY) */}
                    <div className="mt-4 relative z-10">
                        {neededGroup > 0 ? (
                            <div className="bg-gradient-to-r from-purple-500/20 via-emerald-950/40 to-teal-950/40 border border-purple-400/40 p-3.5 rounded-2xl flex items-center gap-3 shadow-lg">
                                <div className="p-2.5 bg-purple-500/30 text-purple-300 rounded-xl flex-shrink-0 animate-bounce shadow-[0_0_12px_rgba(168,85,247,0.4)]">
                                    <FaRocket size={16} />
                                </div>
                                <p className="text-xs font-bold text-purple-100 leading-snug">
                                    Need <strong className="text-white text-sm font-black bg-purple-500/40 px-2.5 py-0.5 rounded-lg border border-purple-400/50 mx-1 shadow-sm">{neededGroup}</strong> more enrollments across total intake for Group Goal ({targetGroupGoal}%) 🚀
                                </p>
                            </div>
                        ) : (
                            <div className="bg-gradient-to-r from-emerald-500/25 to-teal-500/25 border border-emerald-400/50 p-3.5 rounded-2xl flex items-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                                <div className="p-2.5 bg-emerald-500/40 text-emerald-200 rounded-xl flex-shrink-0">
                                    <FaTrophy size={18} className="animate-pulse" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-emerald-200 tracking-wide flex items-center gap-1.5">
                                        <FaCheckCircle className="text-emerald-400" /> Group Intake Goal Achieved! 🚀
                                    </p>
                                    <p className="text-[11px] text-emerald-300 font-medium mt-0.5">
                                        Entire batch reached {groupRate}% conversion ({totalGroupEnrolled} enrolled)!
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
