import React, { useState, useEffect } from 'react';
import { FaWhatsapp, FaHeadset, FaChartBar, FaEnvelopeOpen, FaPhoneAlt, FaFolderOpen, FaExchangeAlt, FaGraduationCap, FaCircle, FaSpinner } from 'react-icons/fa';
import axios from '../../api/axios';

export default function CoordinatorOverview({ loggedInUser, setActiveMode, selectedBusiness, selectedBatch }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOverviewStats();
    }, [selectedBusiness, selectedBatch]);

    const fetchOverviewStats = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/coordinator-crm/overview-stats', {
                params: {
                    businessId: selectedBusiness,
                    batchId: selectedBatch
                }
            });
            setStats(res.data);
        } catch (error) {
            console.error("Failed to fetch coordinator overview stats:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="w-full min-h-[60vh] flex items-center justify-center">
                <FaSpinner className="animate-spin text-4xl text-rose-500" />
            </div>
        );
    }

    const { unreads = { freeSeminar: 0, afterSeminar: 0, total: 0 }, campaigns = {} } = stats || {};

    const handleRedirectCampaign = (path) => {
        window.location.href = path;
    };

    return (
        <div className="space-y-8 animate-fade-in text-left pb-10">
            {/* Header greeting */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-lg">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                        Welcome Back, {loggedInUser?.firstName || 'Coordinator'}! 👋
                    </h2>
                    <p className="text-sm font-medium text-slate-400 mt-1">
                        Here's your personal operational stats and follow-up campaign checklist for today.
                    </p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black tracking-widest uppercase border border-emerald-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                        <FaCircle className="text-[7px] animate-pulse" /> Active Session
                    </span>
                    <span className="bg-white/10 text-gray-300 text-[10px] font-black tracking-widest uppercase border border-white/10 px-3 py-1.5 rounded-xl">
                        {loggedInUser?.department || 'Coordination'}
                    </span>
                </div>
            </div>

            {/* 🔥 Row 1: Unread WhatsApp Notifications 🔥 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Free Seminar Unreads Card */}
                <div 
                    onClick={() => setActiveMode('CRM')}
                    className="cursor-pointer relative overflow-hidden bg-gradient-to-br from-emerald-500/10 to-teal-500/5 backdrop-blur-xl p-6 rounded-3xl border border-emerald-500/20 shadow-lg hover:shadow-emerald-500/20 hover:border-emerald-500/40 transition-all hover:-translate-y-1 group"
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-black text-emerald-400 uppercase tracking-widest">Free Seminar Unreads</p>
                            <h3 className="text-4xl font-black text-white mt-3 flex items-baseline gap-2">
                                {unreads.freeSeminar}
                                <span className="text-xs font-medium text-slate-400 uppercase tracking-normal">Messages</span>
                            </h3>
                        </div>
                        <div className={`p-4 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 group-hover:scale-110 transition-transform ${unreads.freeSeminar > 0 ? 'animate-pulse' : ''}`}>
                            <FaWhatsapp size={26} />
                        </div>
                    </div>
                    {unreads.freeSeminar > 0 ? (
                        <p className="text-xs font-bold text-emerald-400 mt-5 flex items-center gap-1.5">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                            Attention: Reply pending chats in Free Seminar workspace.
                        </p>
                    ) : (
                        <p className="text-xs font-medium text-slate-500 mt-5">All chat messages caught up. Excellent!</p>
                    )}
                </div>

                {/* After Seminar Unreads Card */}
                <div 
                    onClick={() => handleRedirectCampaign('/workspace/campaign/overview')}
                    className="cursor-pointer relative overflow-hidden bg-gradient-to-br from-indigo-500/10 to-purple-500/5 backdrop-blur-xl p-6 rounded-3xl border border-indigo-500/20 shadow-lg hover:shadow-indigo-500/20 hover:border-indigo-500/40 transition-all hover:-translate-y-1 group"
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-black text-indigo-400 uppercase tracking-widest">After Seminar Unreads</p>
                            <h3 className="text-4xl font-black text-white mt-3 flex items-baseline gap-2">
                                {unreads.afterSeminar}
                                <span className="text-xs font-medium text-slate-400 uppercase tracking-normal">Messages</span>
                            </h3>
                        </div>
                        <div className={`p-4 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 group-hover:scale-110 transition-transform ${unreads.afterSeminar > 0 ? 'animate-pulse' : ''}`}>
                            <FaEnvelopeOpen size={26} />
                        </div>
                    </div>
                    {unreads.afterSeminar > 0 ? (
                        <p className="text-xs font-bold text-indigo-400 mt-5 flex items-center gap-1.5">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                            </span>
                            Attention: Unread messages awaiting response in Call campaigns.
                        </p>
                    ) : (
                        <p className="text-xs font-medium text-slate-500 mt-5">No unread campaign inquiries. All caught up!</p>
                    )}
                </div>
            </div>

            {/* 🔥 Row 2: Campaign Follow-Up Stats checklist 🔥 */}
            <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2">My Call Campaigns Checklist</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Free Seminar Leads */}
                <CampaignOverviewCard 
                    title="Free Seminar Leads"
                    icon={<FaWhatsapp size={22} />}
                    color="emerald"
                    stats={campaigns.freeSeminar}
                    onClick={() => setActiveMode('CRM')}
                />

                {/* Open Seminar Leads */}
                <CampaignOverviewCard 
                    title="Open Seminar Leads"
                    icon={<FaPhoneAlt size={20} />}
                    color="indigo"
                    stats={campaigns.openSeminar}
                    onClick={() => handleRedirectCampaign('/workspace/campaign/open-seminar')}
                />

                {/* New Inquiries */}
                <CampaignOverviewCard 
                    title="New Inquiries"
                    icon={<FaFolderOpen size={20} />}
                    color="blue"
                    stats={campaigns.newInquiries}
                    onClick={() => handleRedirectCampaign('/workspace/campaign/new-inquiries')}
                />

                {/* Bridge Transfers */}
                <CampaignOverviewCard 
                    title="Bridge Transfers"
                    icon={<FaExchangeAlt size={20} />}
                    color="amber"
                    stats={campaigns.bridgeTransfers}
                    onClick={() => handleRedirectCampaign('/workspace/campaign/bridge-transfers')}
                />

                {/* Enrolled Students */}
                <CampaignOverviewCard 
                    title="Enrolled (Paid)"
                    icon={<FaGraduationCap size={22} />}
                    color="pink"
                    stats={campaigns.paidStudents}
                    onClick={() => handleRedirectCampaign('/workspace/campaign/paid-students')}
                />

            </div>
        </div>
    );
}

// Sub-component for individual Campaign cards
function CampaignOverviewCard({ title, icon, color, stats = { assigned: 0, covered: 0, pending: 0 }, onClick }) {
    const rate = stats.assigned > 0 ? Math.round((stats.covered / stats.assigned) * 100) : 0;

    const themeColors = {
        emerald: {
            border: 'border-emerald-500/20 hover:border-emerald-500/40',
            glow: 'hover:shadow-emerald-500/10',
            bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            progress: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
            text: 'text-emerald-400'
        },
        indigo: {
            border: 'border-indigo-500/20 hover:border-indigo-500/40',
            glow: 'hover:shadow-indigo-500/10',
            bg: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
            progress: 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]',
            text: 'text-indigo-400'
        },
        blue: {
            border: 'border-blue-500/20 hover:border-blue-500/40',
            glow: 'hover:shadow-blue-500/10',
            bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            progress: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]',
            text: 'text-blue-400'
        },
        amber: {
            border: 'border-amber-500/20 hover:border-amber-500/40',
            glow: 'hover:shadow-amber-500/10',
            bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
            progress: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
            text: 'text-amber-400'
        },
        pink: {
            border: 'border-pink-500/20 hover:border-pink-500/40',
            glow: 'hover:shadow-pink-500/10',
            bg: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
            progress: 'bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]',
            text: 'text-pink-400'
        }
    };

    const currentStyle = themeColors[color] || themeColors['emerald'];

    return (
        <div 
            onClick={onClick}
            className={`cursor-pointer bg-black/20 border backdrop-blur-xl p-5 rounded-3xl shadow-md transition-all hover:bg-black/30 hover:-translate-y-1 group flex flex-col justify-between ${currentStyle.border} ${currentStyle.glow}`}
        >
            <div className="flex justify-between items-start mb-4">
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{title}</span>
                <div className={`p-2.5 rounded-xl transition-all group-hover:scale-110 ${currentStyle.bg}`}>
                    {icon}
                </div>
            </div>

            {/* Counts segment */}
            <div className="grid grid-cols-3 gap-2 py-3 border-b border-white/5 relative z-10 text-center">
                <div>
                    <p className="text-lg font-black text-white">{stats.assigned}</p>
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Assigned</p>
                </div>
                <div>
                    <p className={`text-lg font-black ${currentStyle.text}`}>{stats.covered}</p>
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Covered</p>
                </div>
                <div>
                    <p className="text-lg font-black text-rose-400">{stats.pending}</p>
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Pending</p>
                </div>
            </div>

            {/* Progress bar conversion rate */}
            <div className="mt-4 relative z-10">
                <div className="flex justify-between items-center mb-1.5 text-[10px] font-extrabold text-gray-400">
                    <span>CALL RESOLUTION RATIO</span>
                    <span className="text-white">{rate}%</span>
                </div>
                <div className="w-full bg-black/40 border border-white/5 h-2 rounded-full overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all duration-1000 ${currentStyle.progress}`}
                        style={{ width: `${rate}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
}
