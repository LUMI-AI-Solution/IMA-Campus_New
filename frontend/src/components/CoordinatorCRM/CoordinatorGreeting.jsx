import React, { useEffect, useMemo, useState } from 'react';
import axios from '../../api/axios';
import GreetingScene from './GreetingScene';
import { RefreshCw, Sun, Sunrise, Sunset, Moon, Trophy, Target, Sparkles, Crown, TrendingUp } from 'lucide-react';

// 🔥 Coordinator greeting (replaces the "Coordinator Command Center" header + name / Total Pending card).
// Time-of-day greeting in Sri Lanka time, a small leaderboard rank pill, a live clock, and one motivation line
// built from the coordinator's OWN campaign numbers (same cached endpoint as the campaign tiles).

const colomboNow = () => {
    const now = new Date();
    return new Date(now.getTime() + (now.getTimezoneOffset() + 330) * 60000);
};

// 🎨 Each part of the day has its own illustrated scene (GreetingScene.jsx) + matching accent text and icon colour.
const THEMES = {
    morning: {
        en: 'Good morning', si: 'සුභ උදෑසනක්', icon: Sunrise,
        accent: 'from-amber-200 via-orange-300 to-rose-300',
        iconTone: 'text-amber-300', sub: 'text-amber-100/90',
    },
    afternoon: {
        en: 'Good afternoon', si: 'සුභ දහවලක්', icon: Sun,
        accent: 'from-yellow-200 via-amber-200 to-white',
        iconTone: 'text-yellow-300', sub: 'text-sky-100/90',
    },
    evening: {
        en: 'Good evening', si: 'සුභ සන්ධ්‍යාවක්', icon: Sunset,
        accent: 'from-orange-200 via-pink-300 to-fuchsia-300',
        iconTone: 'text-orange-300', sub: 'text-pink-100/90',
    },
    night: {
        en: 'Good night', si: 'සුභ රාත්‍රියක්', icon: Moon,
        accent: 'from-indigo-200 via-violet-200 to-sky-200',
        iconTone: 'text-indigo-200', sub: 'text-indigo-200/90',
    },
};

const partOfDay = (hour) => {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
};

// Preview helper for testing: add ?greetTheme=morning|afternoon|evening|night to the URL.
const forcedTheme = () => {
    try {
        const t = new URLSearchParams(window.location.search).get('greetTheme');
        return THEMES[t] ? t : null;
    } catch (e) { return null; }
};

const firstName = (u) => {
    const raw = String(u?.firstName || u?.name || '').trim();
    return raw.split(/\s+/)[0] || 'there';
};

// 🏆 Small rank pill above the greeting: the coordinator's own leaderboard position
// (Open Seminar first, else New Inquiries). Gold / silver / bronze tint for the top 3. No rank → no pill.
const PILL_TONES = {
    1: 'text-amber-300 border-amber-300/50',
    2: 'text-slate-100 border-slate-200/50',
    3: 'text-orange-300 border-orange-300/50',
    other: 'text-indigo-200 border-indigo-300/40',
};

const RankPill = ({ summary }) => {
    const os = summary?.openSeminar?.me;
    const ni = summary?.newInquiries?.me;
    const pick = os?.rank ? { me: os, label: 'Open Seminar' } : ni?.rank ? { me: ni, label: 'New Inquiries' } : null;
    if (!pick) return null;
    const { rank, totalRanked } = pick.me;
    const Icon = rank === 1 ? Crown : TrendingUp;
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border bg-black/30 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-black ${PILL_TONES[rank] || PILL_TONES.other}`}>
            <Icon size={12} /> #{rank}{totalRanked ? ` of ${totalRanked}` : ''} · {pick.label}
        </span>
    );
};

// One short, honest line from the coordinator's own numbers. Nothing is invented: if there is no data, no line.
const motivationLine = (summary) => {
    const os = summary?.openSeminar?.me;
    const ni = summary?.newInquiries?.me;
    if (os?.rank === 1) return { icon: Trophy, tone: 'text-amber-300', text: `You're #1 on the Open Seminar board. Keep the lead!` };
    if (ni?.rank === 1) return { icon: Trophy, tone: 'text-amber-300', text: `You're #1 on the New Inquiries board. Keep the lead!` };
    if (os?.toNextRank) return { icon: Sparkles, tone: 'text-emerald-300', text: `${os.toNextRank.needed} more enrolled to move up to #${os.toNextRank.rank} in Open Seminar.` };
    if (os?.single && !os.single.achieved && os.single.needed > 0) return { icon: Target, tone: 'text-cyan-300', text: `${os.single.needed} more enrolled to reach your ${os.single.goal}% Open Seminar goal.` };
    if (os?.single?.achieved) return { icon: Trophy, tone: 'text-emerald-300', text: `Open Seminar goal achieved. Amazing work!` };
    return null;
};

export default function CoordinatorGreeting({ user, businessId, batchId, onSync, syncing = false }) {
    const me = useMemo(() => {
        if (user) return user;
        try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch (e) { return null; }
    }, [user]);
    const [now, setNow] = useState(colomboNow());
    const [summary, setSummary] = useState(null);

    useEffect(() => {
        const t = setInterval(() => setNow(colomboNow()), 30000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        if (!businessId) return;
        axios.get('/after-seminar-crm/stats/campaign-summary', { params: { businessId, batchId: batchId || 'ALL', mine: 1 } })
            .then(r => setSummary(r.data))
            .catch(() => setSummary(null));
    }, [businessId, batchId]);

    const themeKey = forcedTheme() || partOfDay(now.getHours());
    const g = THEMES[themeKey];
    const GIcon = g.icon;
    const line = motivationLine(summary);
    const LIcon = line?.icon;
    const dateText = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const timeText = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    return (
        <div data-theme={themeKey} className={`relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0f172a] min-h-[150px] md:min-h-[170px] flex items-center px-6 py-6 md:px-8 md:py-7 shadow-2xl`}>
            <GreetingScene theme={themeKey} />

            <div className="relative z-10 w-full flex flex-col md:flex-row md:items-center gap-5">
                {/* Greeting */}
                <div className="flex-1 min-w-0">
                    <p className={`text-xs md:text-sm font-bold flex items-center gap-1.5 ${g.sub}`}>
                        <GIcon size={15} className={g.iconTone} /> {g.si}
                        <span className="ml-2"><RankPill summary={summary} /></span>
                    </p>
                    <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mt-0.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
                        {g.en}, <span className={`text-transparent bg-clip-text bg-gradient-to-r ${g.accent}`}>{firstName(me)}</span> 👋
                    </h1>
                    {line ? (
                        <p className={`mt-1.5 text-sm font-semibold flex items-center gap-1.5 ${line.tone}`}>
                            <LIcon size={15} /> {line.text}
                        </p>
                    ) : (
                        <p className={`mt-1.5 text-sm font-semibold ${g.sub}`}>Let's make today a great day for our students.</p>
                    )}
                </div>

                {/* Clock + sync */}
                <div className="flex md:flex-col items-center md:items-end gap-3 md:gap-1 shrink-0">
                    <p className="text-2xl font-black text-white tabular-nums drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">{timeText}</p>
                    <p className={`text-[11px] font-semibold ${g.sub}`}>{dateText}</p>
                    {onSync && (
                        <button type="button" onClick={onSync} title="Sync data"
                            className="md:mt-1 inline-flex items-center gap-1.5 text-[11px] font-bold text-white/70 hover:text-white bg-black/25 hover:bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg px-2.5 py-1 transition-colors">
                            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} /> Sync
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}