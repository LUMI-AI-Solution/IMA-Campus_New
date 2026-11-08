// /live/z/:key — the link coordinators share for one Zoom meeting (same link for every batch
// that uses that Zoom link). /live/:id — older per-class link.
// Not logged in → login first, then back here. Paid → Join Now. Not paid → the reason.
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, Play, Lock, CalendarDays, Clock, Video, AlertTriangle, User, GraduationCap } from 'lucide-react';
import api, { withAuthToken } from '../../api/axios';

export const AFTER_LOGIN_KEY = 'ima-after-login';

const hasToken = () => !!(localStorage.getItem('token') || localStorage.getItem('userToken') || localStorage.getItem('admin_token'));

function getInitials(name) {
    if (!name) return 'L';
    const clean = String(name).replace(/^(mr|mrs|ms|dr|prof)\.?\s+/i, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'L';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function LecturerAvatar({ image, name }) {
    const candidates = useMemo(() => {
        if (!image) return [];
        const s = String(image).trim();
        if (!s || s === 'null' || s === 'undefined' || s === 'default.png') return [];
        if (s.startsWith('http://') || s.startsWith('https://')) return [s];
        const clean = s.replace(/^\/+/, '');
        if (clean.startsWith('storage/') || clean.startsWith('api/storage/')) return [`/${clean}`];
        return [
            `/storage/icons/${clean}`,
            `/storage/documents/${clean}`,
            `/storage/images/${clean}`,
            `/storage/users/${clean}`,
            `/api/storage/icons/${clean}`,
            `/api/storage/documents/${clean}`,
        ];
    }, [image]);

    const [candIdx, setCandIdx] = useState(0);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setCandIdx(0);
        setFailed(false);
    }, [image]);

    const currentUrl = !failed && candidates.length > 0 ? candidates[candIdx] : null;

    if (currentUrl) {
        return (
            <img
                src={currentUrl}
                alt={name || 'Lecturer'}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-white shadow-md shrink-0 bg-slate-100"
                onError={() => {
                    if (candIdx < candidates.length - 1) {
                        setCandIdx((prev) => prev + 1);
                    } else {
                        setFailed(true);
                    }
                }}
            />
        );
    }

    return (
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-600 text-white font-bold text-sm sm:text-base flex items-center justify-center border-2 border-white shadow-md shrink-0 tracking-wider">
            {getInitials(name)}
        </div>
    );
}

function ThumbnailBanner({ thumbnail, title }) {
    const candidateUrls = useMemo(() => {
        if (!thumbnail) return [];
        const s = String(thumbnail).trim();
        if (!s || s === 'null' || s === 'undefined') return [];
        if (s.startsWith('http://') || s.startsWith('https://')) return [s];
        const clean = s.replace(/^\/+/, '');
        if (clean.startsWith('storage/') || clean.startsWith('api/storage/')) return [`/${clean}`];
        return [
            `/storage/documents/${clean}`,
            `/storage/images/${clean}`,
            `/api/storage/documents/${clean}`,
            `/api/storage/images/${clean}`,
        ];
    }, [thumbnail]);

    const [candIdx, setCandIdx] = useState(0);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setCandIdx(0);
        setFailed(false);
    }, [thumbnail]);

    const currentUrl = !failed && candidateUrls.length > 0 ? candidateUrls[candIdx] : null;

    if (currentUrl) {
        return (
            <div className="relative w-full aspect-video bg-slate-900 overflow-hidden">
                <img
                    src={currentUrl}
                    alt={title}
                    className="w-full h-full object-cover"
                    onError={() => {
                        if (candIdx < candidateUrls.length - 1) {
                            setCandIdx((prev) => prev + 1);
                        } else {
                            setFailed(true);
                        }
                    }}
                />
            </div>
        );
    }

    return (
        <div className="relative w-full aspect-video bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
            <div className="relative z-10 w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-2 shadow-inner">
                <Video size={24} className="text-red-400" />
            </div>
            <p className="relative z-10 text-white/90 font-bold text-xs sm:text-sm max-w-xs line-clamp-2 px-2">
                {title}
            </p>
        </div>
    );
}

export default function LiveJoin() {
    const { id, key } = useParams();
    const here = key ? `/live/z/${key}` : `/live/${id}`;
    const apiPath = key ? `/v2/live/z/${key}` : `/v2/live/${id}`;
    const navigate = useNavigate();
    const [state, setState] = useState({ loading: true });

    useEffect(() => {
        const goLogin = () => {
            try { sessionStorage.setItem(AFTER_LOGIN_KEY, here); } catch (e) {}
            navigate('/login', { replace: true });
        };
        if (!hasToken()) return goLogin();
        try { sessionStorage.setItem(AFTER_LOGIN_KEY, here); } catch (e) {}
        api.get(apiPath)
            .then((r) => {
                try { sessionStorage.removeItem(AFTER_LOGIN_KEY); } catch (e) {}
                setState({ loading: false, live: r.data });
            })
            .catch((err) => {
                const status = err.response?.status;
                if (status === 401) return goLogin();
                setState({ loading: false, error: err.response?.data?.message || 'Could not load this live class. Please try again.' });
            });
    }, [here, apiPath, navigate]);

    const shell = (children) => (
        <div className="min-h-screen bg-slate-100 sm:bg-slate-100 flex flex-col justify-center items-center p-3 sm:p-6 font-sans text-slate-800">
            <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 shadow-[0_12px_40px_rgba(15,23,42,0.08)] overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                    <img
                        src="/logo.png"
                        alt="IMA Campus"
                        className="h-8 object-contain"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200/70 text-red-600 text-[10px] font-black uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        Live Class
                    </div>
                </div>
                {children}
            </div>
            <div className="mt-4 text-center">
                <p className="text-[11px] text-slate-400 font-medium">IMA Campus Digital Platform</p>
            </div>
        </div>
    );

    if (state.loading) {
        return shell(
            <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-red-500 mb-4" size={38} />
                <p className="text-slate-600 font-bold text-sm">Loading live class details...</p>
                <p className="text-slate-400 text-xs mt-1">Please wait a moment</p>
            </div>
        );
    }

    if (state.error) {
        return shell(
            <div className="p-6 sm:p-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-500 flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle size={24} />
                </div>
                <h2 className="text-base font-bold text-slate-900 mb-2">Class Not Available</h2>
                <p className="text-slate-600 text-xs sm:text-sm font-medium mb-6 leading-relaxed">{state.error}</p>
                <Link
                    to="/student/dashboard"
                    className="inline-flex items-center justify-center w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-all"
                >
                    Go to my dashboard
                </Link>
            </div>
        );
    }

    const live = state.live;
    const when = live.date ? new Date(live.date).toDateString() : null;

    return shell(
        <>
            {/* 1. Thumbnail Image */}
            <ThumbnailBanner thumbnail={live.thumbnail} title={live.title} />

            <div className="p-5 sm:p-6 flex flex-col gap-4 text-left">
                {/* 2. Lecturer Profile Picture & Lecturer Name */}
                {(live.lecturerName || live.lecturerImage) && (
                    <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                        <LecturerAvatar image={live.lecturerImage} name={live.lecturerName} />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                <GraduationCap size={13} className="text-indigo-500 shrink-0" />
                                <span>Lecturer / දේශක</span>
                            </div>
                            <h3 className="text-sm sm:text-base font-black text-slate-900 truncate mt-0.5">
                                {live.lecturerName || 'Lecturer'}
                            </h3>
                        </div>
                    </div>
                )}

                {/* 3. Class Title & Subtitles */}
                <div>
                    <h1 className="text-base sm:text-lg font-black text-slate-900 leading-snug break-words">
                        {live.title}
                    </h1>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {live.courseName && (
                            <span className="inline-block bg-blue-50 text-blue-700 border border-blue-200/60 text-[11px] font-bold px-2.5 py-0.5 rounded-lg truncate max-w-full">
                                {live.courseName}
                            </span>
                        )}
                        {live.batchName && (
                            <span className="inline-block bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-bold px-2.5 py-0.5 rounded-lg truncate max-w-full">
                                {live.batchName}
                            </span>
                        )}
                    </div>
                </div>

                {/* 4. Schedule (Date & Time) */}
                {(when || live.startTime) && (
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
                        {when && (
                            <span className="inline-flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold">
                                <CalendarDays size={13} className="text-blue-500" />
                                {when}
                            </span>
                        )}
                        {live.startTime && (
                            <span className="inline-flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold">
                                <Clock size={13} className="text-amber-500" />
                                {live.startTime}
                                {live.endTime ? ` – ${live.endTime}` : ''}
                            </span>
                        )}
                    </div>
                )}

                {/* 5. Access Gate / Action Buttons */}
                <div className="pt-2">
                    {!live.access?.allowed ? (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-start gap-2.5 text-left bg-rose-50 border border-rose-200/80 rounded-2xl p-3.5">
                                <Lock size={18} className="text-rose-500 shrink-0 mt-0.5" />
                                <p className="text-rose-900 text-xs sm:text-sm leading-relaxed font-medium">
                                    {live.access?.message || 'You do not have access to this class. ප්‍රශ්නයක් ඇත්නම් ඔබගේ coordinator අමතන්න.'}
                                </p>
                            </div>
                            <Link
                                to="/student/dashboard"
                                state={{ activeTab: 'courses' }}
                                className="w-full h-12 rounded-xl font-black uppercase tracking-wider text-xs bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white flex items-center justify-center gap-2 transition-all shadow-md shadow-slate-900/10"
                            >
                                Pay / Enroll
                            </Link>
                        </div>
                    ) : live.hasLink ? (
                        <a
                            href={withAuthToken(`${api.defaults.baseURL}${live.joinPath}`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full h-13 py-3.5 rounded-2xl font-black flex items-center justify-center gap-2.5 uppercase tracking-wider text-sm bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 active:scale-[0.99] text-white shadow-lg shadow-red-500/30 border border-red-500/20 transition-all"
                        >
                            <Play size={16} className="fill-white" /> Join Now
                        </a>
                    ) : (
                        <div className="w-full h-12 rounded-xl font-bold flex items-center justify-center gap-2 uppercase tracking-wider text-xs bg-slate-100 text-slate-500 border border-slate-200">
                            <Lock size={14} /> Link Pending — refresh near class time
                        </div>
                    )}
                </div>

                {/* 6. Footer Link */}
                <div className="text-center pt-1">
                    <Link
                        to="/student/dashboard"
                        className="text-xs font-semibold text-slate-400 hover:text-slate-700 underline transition-colors"
                    >
                        Go to my dashboard
                    </Link>
                </div>
            </div>
        </>
    );
}
