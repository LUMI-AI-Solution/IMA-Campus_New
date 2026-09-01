import React, { useState, useEffect, useRef } from 'react';
import axios from '../../../api/axios';
import { Loader2, Video, MonitorPlay, FileText, FileSignature, CheckCircle, ArrowLeft, X, Lock, CalendarDays, FolderOpen, ChevronDown, Maximize, Minimize, Play, SkipForward, Pause, Info } from 'lucide-react';
import toast from 'react-hot-toast';

import YouTube from 'react-youtube';
import { FaYoutube, FaVimeo } from 'react-icons/fa';
import { SiZoom } from 'react-icons/si';
import SecureYoutubePlayer from './SecureYoutubePlayer';


export default function CourseView({ courseId, onBack }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [activeTab, setActiveTab] = useState('recordings');
    const [openFolders, setOpenFolders] = useState({});
    
    // Video Playing State
    const [playingVideo, setPlayingVideo] = useState(null);
    const [nextVideo, setNextVideo] = useState(null);

    // YouTube Secure Player States
    const [ytPlayer, setYtPlayer] = useState(null);
    const [ytPlaying, setYtPlaying] = useState(false);
    const [showYtWarning, setShowYtWarning] = useState(false);
    const [ytWarningAccepted, setYtWarningAccepted] = useState(false);
    const [watermarkPos, setWatermarkPos] = useState({ top: 50, left: 50 });
    const [playType, setPlayType] = useState('zoom'); // 'zoom' or 'yt'
    const user = JSON.parse(localStorage.getItem('user') || '{}') || {};
    const studentIdStr = user.id ? `IMA-STU-${user.id} ${user.firstName||''}` : 'IMA-STUDENT';

    useEffect(() => {
        const interval = setInterval(() => {
            setWatermarkPos({
                top: Math.floor(Math.random() * 80) + 10,
                left: Math.floor(Math.random() * 80) + 10,
            });
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const extractVideoId = (url) => {
        if (!url) return '';
        const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|live\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
        return match ? match[1] : url;
    };

    
    // Fullscreen State & Ref
    const [isFullscreen, setIsFullscreen] = useState(false);
    const modalRef = useRef(null);

    // API Base URL for images
    const getBaseUrl = () => {
        let url = axios.defaults.baseURL || 'https://imacampus.online/api';
        return url.endsWith('/') ? url.slice(0, -1) : url;
    };

    useEffect(() => {
        axios.get(`/student/module/${courseId}`).then(res => {
            setData(res.data);
            if (res.data?.lessonGroups) {
                const initialOpen = {};
                res.data.lessonGroups.forEach(f => initialOpen[f.id] = true);
                setOpenFolders(initialOpen);
            }
        }).catch(err => {
            console.error(err);
            toast.error("Failed to load course contents.");
        }).finally(() => setLoading(false));
    }, [courseId]);

    // Fullscreen Change Listener
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFolder = (folderId) => setOpenFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));

    const getEmbedUrl = (url) => {
        if (!url) return '';
        try {
            if (url.includes('<iframe')) {
                const srcMatch = url.match(/src=["'](.*?)["']/);
                if (srcMatch) return srcMatch[1];
            }
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
                const ytRegex = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/|shorts\/))([\w-]{11})/;
                const match = url.match(ytRegex);
                if (match && match[1]) {
                    return `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1&autoplay=1`;
                }
            }
            if (url.includes('vimeo.com')) {
                const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/;
                const match = url.match(vimeoRegex);
                if (match && match[1]) {
                    return `https://player.vimeo.com/video/${match[1]}?autoplay=1`;
                }
            }
            if (url.includes('drive.google.com') && url.includes('/view')) {
                return url.replace('/view', '/preview?rm=minimal');
            }
            return url; 
        } catch(e) { return url; }
    };

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            modalRef.current?.requestFullscreen().catch(err => console.log(err));
        } else {
            document.exitFullscreen();
        }
    };

    // 🔥 Find Next Video Logic 🔥
    const findNextVideo = (currentItem) => {
        if (!data) return null;
        const currentData = data[activeTab] || [];
        
        const folderId = currentItem.content_group_id ?? currentItem.contentGroupId ?? currentItem.folder_id;
        let sameFolderItems = currentData.filter(item => String(item.content_group_id ?? item.contentGroupId ?? item.folder_id) === String(folderId));
        sameFolderItems.sort((a, b) => (a.itemOrder || 1) - (b.itemOrder || 1));
        
        const currentIndex = sameFolderItems.findIndex(i => i.id === currentItem.id);
        if (currentIndex !== -1 && currentIndex < sameFolderItems.length - 1) {
            return sameFolderItems[currentIndex + 1];
        }
        return null;
    };

    
    const handlePlayVideo = (item, type = 'zoom') => {
        setPlayType(type);
        setYtWarningAccepted(false);
        let url = '';
        if (type === 'yt') url = item.youtubeLink;
        else if (type === 'vimeo') url = item.vimeoLink;
        else url = (item.link || item.url || '');
        
        if (type === 'yt') {
             setShowYtWarning(true);
             setPlayingVideo({ ...item, secure_link: url });
             setNextVideo(findNextVideo(item));
        } else if (type === 'zoom') {
             setPlayingVideo({ ...item, secure_link: getEmbedUrl(url) });
             setNextVideo(findNextVideo(item));
        } else {
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
                window.open(url, '_blank');
            } else {
                setPlayingVideo({ ...item, secure_link: getEmbedUrl(url) });
                setNextVideo(findNextVideo(item));
            }
        }
    };


    
    const handleCloseVideo = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(()=>{});
        }
        setPlayingVideo(null);
        setNextVideo(null);
        setYtPlayer(null);
        setYtPlaying(false);
        setShowYtWarning(false);
    };


    if (loading) return <div className="flex justify-center items-center py-40"><Loader2 className="animate-spin text-red-500" size={50} /></div>;

    const tabs = [
        { id: 'recordings', name: 'Recordings', icon: MonitorPlay, data: data?.recordings || [] },
        { id: 'live', name: 'Live Classes', icon: Video, data: data?.liveClasses || [] },
        { id: 'documents', name: 'Documents', icon: FileText, data: data?.documents || [] },
        { id: 'sPapers', name: 'Structured Papers', icon: FileSignature, data: data?.sPapers || [] },
        { id: 'papers', name: 'MCQ Exams', icon: CheckCircle, data: data?.papers || [] },
    ];

    const currentTabInfo = tabs.find(t => t.id === activeTab);
    const currentData = currentTabInfo?.data || [];
    const getTypeInt = (id) => ({ live: 1, recordings: 2, documents: 3, sPapers: 4, papers: 5 }[id] || 1);
    const getFolderId = (item) => {
        const f = item.content_group_id ?? item.contentGroupId ?? item.folder_id;
        return (f !== null && f !== undefined && f !== '' && f !== 'null' && f !== 'undefined') ? String(f) : '';
    };

    // 🔥 Updated UI Layout: Fully Mobile-Optimized with Responsive Thumbnails & Padding 🔥
    const renderRow = (item, index) => (
        <div key={item.id} className="bg-black/30 hover:bg-white/10 border border-white/5 hover:border-red-500/30 p-2.5 sm:p-3.5 md:p-4 rounded-xl sm:rounded-2xl transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-2.5 sm:gap-4 md:gap-6 group">
            <div className="flex items-start gap-2.5 sm:gap-4 md:gap-5 flex-1 w-full min-w-0">
                
                {/* Responsive Thumbnail */}
                <div className="w-24 sm:w-32 md:w-44 aspect-[16/10] shrink-0 rounded-lg sm:rounded-xl bg-black/60 border border-white/10 overflow-hidden relative flex items-center justify-center shadow-md">
                    {item.thumbnail ? (
                        <img src={`${getBaseUrl()}/storage/documents/${item.thumbnail}`} alt="thumb" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                        <img src="/logo.png" alt="default-thumb" className="w-12 sm:w-16 md:w-20 h-auto opacity-30 object-contain drop-shadow-lg" />
                    )}
                </div>

                {/* Title & Date Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
                    <h4 className="text-white font-bold text-xs sm:text-sm md:text-base break-words leading-tight sm:leading-snug line-clamp-3 md:line-clamp-none mb-1.5" title={item.title}>
                        {item.title}
                    </h4>
                    <p className="text-[10px] sm:text-xs text-white/70 font-medium flex items-center gap-1.5">
                        <CalendarDays size={14} className="text-red-400 shrink-0"/> 
                        <span>{item.date ? new Date(item.date).toDateString() : 'No Date'}</span>
                    </p>
                </div>
            </div>
            
            {/* Action Buttons */}
            <div className="w-full md:w-auto flex shrink-0 pt-2 sm:pt-2.5 md:pt-0 border-t border-white/5 md:border-0">
                {activeTab === 'live' && (
                    <a href={item.link} target="_blank" rel="noreferrer" className="w-full md:w-max bg-red-600 hover:bg-red-500 text-white font-bold px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md">
                        <Video size={15}/> Join Live
                    </a>
                )}
                {activeTab === 'recordings' && (
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        {item.youtubeLink && (
                            <button onClick={() => handlePlayVideo(item, 'yt')} title="Play via YouTube" className="flex-1 md:flex-none bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white font-bold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-red-500/30 transition-all shadow-md">
                                <FaYoutube size={16} /> YouTube
                            </button>
                        )}
                        {item.vimeoLink && (
                            <button onClick={() => handlePlayVideo(item, 'vimeo')} title="Play via Vimeo" className="flex-1 md:flex-none bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white font-bold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-blue-500/30 transition-all shadow-md">
                                <FaVimeo size={16} /> Vimeo
                            </button>
                        )}
                        {item.link && (
                            <button onClick={() => handlePlayVideo(item, 'zoom')} title="Play via Zoom" className="flex-1 md:flex-none bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white font-bold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-blue-500/30 transition-all shadow-md">
                                <SiZoom size={16} /> Zoom
                            </button>
                        )}
                        {!item.link && !item.youtubeLink && !item.vimeoLink && (
                            <span className="text-white/60 text-xs italic px-2">No Video Available</span>
                        )}
                    </div>
                )}
                {activeTab === 'documents' && (
                    <a href={`${getBaseUrl()}/storage/documents/${item.fileName}`} target="_blank" rel="noreferrer" download className="w-full md:w-max bg-white/10 hover:bg-white/20 text-white font-bold px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 border border-white/10">
                        <FileText size={15} className="text-yellow-400"/> Download
                    </a>
                )}
                {activeTab === 'sPapers' && (
                    <a href={`${getBaseUrl()}/storage/documents/${item.fileName}`} target="_blank" rel="noreferrer" download className="w-full md:w-max bg-white/10 hover:bg-white/20 text-white font-bold px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 border border-white/10">
                        <FileSignature size={15} className="text-yellow-400"/> Download
                    </a>
                )}
                {activeTab === 'papers' && (
                    <a href={`${getBaseUrl()}/storage/documents/${item.fileName}`} target="_blank" rel="noreferrer" download className="w-full md:w-max bg-white/10 hover:bg-white/20 text-white font-bold px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 border border-white/10">
                        <CheckCircle size={15} className="text-yellow-400"/> Download
                    </a>
                )}
            </div>
        </div>
    );

    const renderContentRows = () => {
        if (currentData.length === 0) return <div className="text-white/80 text-center py-20 font-medium">No content uploaded yet.</div>;
        
        const folders = (data?.lessonGroups || [])
            .filter(f => parseInt(f.type) === getTypeInt(activeTab))
            .sort((a, b) => (a.itemOrder || 1) - (b.itemOrder || 1));

        const normalizeFolderTitle = (title) => {
            if (!title) return '';
            return title
                .toLowerCase()
                .replace(/[\s_-]+/g, ' ')
                .replace(/\b(month|batch|මාසය|මාස|පාඩම|පාඩම්)\b/gi, '')
                .trim();
        };

        const isItemMatchFolder = (item, folder) => {
            const fId = getFolderId(item);
            if (fId) {
                if (String(folder.id) === fId) return true;
                if (folder.ids && folder.ids.includes(fId)) return true;
            }
            
            const itemGroupTitle = item.groupTitle || item.group?.title;
            if (itemGroupTitle && folder.title) {
                const rawItem = itemGroupTitle.trim().toLowerCase();
                const rawFolder = folder.title.trim().toLowerCase();
                if (rawItem === rawFolder) return true;

                const normItem = normalizeFolderTitle(itemGroupTitle);
                const normFolder = normalizeFolderTitle(folder.title);
                if (normItem && normFolder && normItem === normFolder) return true;
            }
            return false;
        };

        // Separate into root folders (no parent or parent not in folders)
        const allRootFoldersRaw = folders.filter(f => !f.parentId || !folders.some(p => String(p.id) === String(f.parentId)));

        // Merge root folders with the same title to prevent duplicate boxes
        const mergedRootFoldersMap = new Map();
        allRootFoldersRaw.forEach(f => {
            const titleKey = normalizeFolderTitle(f.title) || (f.title || '').trim().toLowerCase();
            if (!mergedRootFoldersMap.has(titleKey)) {
                mergedRootFoldersMap.set(titleKey, { ...f, ids: [String(f.id)] });
            } else {
                mergedRootFoldersMap.get(titleKey).ids.push(String(f.id));
            }
        });
        const rootFolders = Array.from(mergedRootFoldersMap.values());

        // Process each root folder with its subfolders and items
        const processedFolders = rootFolders.map(folder => {
            const subFoldersRaw = folders.filter(f => f.parentId && folder.ids.includes(String(f.parentId)));
            
            const mergedSubMap = new Map();
            subFoldersRaw.forEach(sf => {
                const subTitleKey = normalizeFolderTitle(sf.title) || (sf.title || '').trim().toLowerCase();
                if (!mergedSubMap.has(subTitleKey)) {
                    mergedSubMap.set(subTitleKey, { ...sf, ids: [String(sf.id)] });
                } else {
                    mergedSubMap.get(subTitleKey).ids.push(String(sf.id));
                }
            });
            const subFolders = Array.from(mergedSubMap.values());

            const subFolderData = subFolders.map(sf => {
                const sfItems = currentData
                    .filter(item => isItemMatchFolder(item, sf))
                    .sort((a, b) => (a.itemOrder || 1) - (b.itemOrder || 1));
                return { subFolder: sf, items: sfItems };
            });

            const directItems = currentData
                .filter(item => isItemMatchFolder(item, folder) && !subFolders.some(sf => isItemMatchFolder(item, sf)))
                .sort((a, b) => (a.itemOrder || 1) - (b.itemOrder || 1));

            const totalItemCount = directItems.length + subFolderData.reduce((acc, s) => acc + s.items.length, 0);

            return {
                folder,
                subFolders: subFolderData,
                directItems,
                totalItemCount
            };
        });

        // Visible folders (folders that contain content)
        const visibleFolders = processedFolders.filter(pf => pf.totalItemCount > 0);

        // Uncategorized items (items not matching any folder or subfolder)
        const uncategorizedItems = currentData
            .filter(item => !folders.some(folder => isItemMatchFolder(item, folder)))
            .sort((a, b) => (a.itemOrder || 1) - (b.itemOrder || 1));

        return (
            <div className="flex flex-col gap-4 sm:gap-6">
                {visibleFolders.map(({ folder, subFolders, directItems }) => {
                    const isFolderOpen = openFolders[folder.id] !== false;

                    return (
                        <div key={folder.id} className="bg-black/20 border border-white/10 rounded-xl sm:rounded-2xl overflow-hidden shadow-sm">
                            <div onClick={() => toggleFolder(folder.id)} className="flex justify-between items-center bg-black/20 p-3.5 sm:p-4 md:p-6 cursor-pointer hover:bg-white/10 transition-colors">
                                <h4 className="text-sm sm:text-base md:text-lg font-bold text-white flex items-center gap-2.5 sm:gap-3 min-w-0">
                                    <FolderOpen size={20} className="text-red-500 shrink-0"/> 
                                    <span className="truncate">{folder.title}</span>
                                </h4>
                                <ChevronDown className={`text-white/80 transition-transform shrink-0 ${isFolderOpen ? 'rotate-180' : ''}`} size={18} />
                            </div>
                            {isFolderOpen && (
                                <div className="p-2 sm:p-3.5 md:p-6 flex flex-col gap-3 sm:gap-4 border-t border-white/5">
                                    {/* NESTED SUB-FOLDERS */}
                                    {subFolders.length > 0 && (
                                        <div className="flex flex-col gap-2.5 sm:gap-3">
                                            {subFolders.map(({ subFolder, items: subItems }) => {
                                                const isSubOpen = openFolders[subFolder.id] !== false;

                                                return (
                                                    <div key={subFolder.id} className="bg-black/40 border border-white/10 rounded-lg sm:rounded-xl overflow-hidden">
                                                        <div onClick={() => toggleFolder(subFolder.id)} className="flex justify-between items-center p-2.5 sm:p-3 md:p-4 cursor-pointer hover:bg-white/5 transition-colors gap-2">
                                                            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                                                                <FolderOpen size={16} className="text-indigo-400 shrink-0"/>
                                                                <h5 className="text-xs sm:text-sm md:text-base font-semibold text-slate-200 truncate">{subFolder.title}</h5>
                                                                <span className="shrink-0 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 px-1.5 sm:px-2 py-0.5 rounded border border-indigo-500/30 whitespace-nowrap">
                                                                    Sub-folder
                                                                </span>
                                                            </div>
                                                            <ChevronDown className={`text-white/60 transition-transform shrink-0 ${isSubOpen ? 'rotate-180' : ''}`} size={15} />
                                                        </div>
                                                        {isSubOpen && (
                                                            <div className="p-1.5 sm:p-2.5 md:p-3.5 flex flex-col gap-2 border-t border-white/5 bg-black/30">
                                                                {subItems.length === 0 ? (
                                                                    <p className="text-xs text-white/60 text-center py-2 sm:py-3">Empty sub-folder</p>
                                                                ) : (
                                                                    subItems.map((item, index) => renderRow(item, index))
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* DIRECT MAIN FOLDER ITEMS */}
                                    {directItems.length > 0 && (
                                        <div className="flex flex-col gap-2 sm:gap-2.5">
                                            {subFolders.length > 0 && (
                                                <h5 className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider px-1 pt-1">
                                                    Main Folder Content
                                                </h5>
                                            )}
                                            {directItems.map((item, index) => renderRow(item, index))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* UNCATEGORIZED ITEMS */}
                {uncategorizedItems.length > 0 && (
                    <div className="flex flex-col gap-2.5 sm:gap-3">
                        {visibleFolders.length > 0 && (
                            <h4 className="text-[11px] sm:text-xs md:text-sm font-bold text-gray-400 uppercase tracking-wider px-1">
                                Additional Content
                            </h4>
                        )}
                        {uncategorizedItems.map((item, index) => renderRow(item, index))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="w-full h-full relative animate-fade-in custom-scrollbar">
            {playingVideo ? (
                /* 🔥 VIDEO PLAYER INLINE MODE (Redesigned & Fixed) 🔥 */
                <div className="flex flex-col items-center justify-start w-full h-full min-h-[calc(100vh-120px)] animate-fade-in max-w-[95%] mx-auto px-2 md:px-4">
                    
                    {/* Top Controls (Back Button Only) */}
                    <div className="w-full flex justify-between items-center mb-4 mt-2">
                        <button onClick={handleCloseVideo} className="text-white/80 hover:text-red-400 bg-black/20 hover:bg-white/10 px-5 py-2.5 rounded-xl font-bold flex items-center border border-white/10 transition-colors text-sm shadow-md">
                            <ArrowLeft size={18} className="mr-2" /> Back to Course
                        </button>
                    </div>

                    {/* 🔥 Mobile Guide for Zoom Cookies 🔥 */}
                    {playType === 'zoom' && (
                        <div className="md:hidden w-full mb-4 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3.5 flex flex-col gap-1.5 text-sm text-blue-100 shadow-lg">
                            <div className="flex items-center gap-2 font-bold text-blue-400 mb-1">
                                <Info size={18} /> Recording එක බලන නිවැරදි ආකාරය:
                            </div>
                            <ol className="list-decimal pl-5 space-y-1 text-xs sm:text-sm text-blue-200/90">
                                <li>කළු පාට Video box එක ඇතුළත පහළට Scroll කරන්න.</li>
                                <li>එහි ඇති <b>"Accept Cookies"</b> බොත්තම ඔබන්න.</li>
                                <li>ඉන්පසු <b>Play button</b> එක ඔබා Video එක නරඹන්න.</li>
                            </ol>
                        </div>
                    )}

                    {/* 🔥 Enlarged Player for Mobile (aspect-square) to fit cookie consent 🔥 */}
                    <div className="relative bg-black mx-auto w-full aspect-square md:aspect-video max-h-[85vh] md:max-h-[80vh] rounded-2xl md:rounded-[2rem] shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden">
                        
                        {/* 🔥 ZOOM MASK: Covers the top header of Zoom cloud player to hide download button 🔥 */}
                        {playType === 'zoom' && (
                            <div className="absolute top-0 left-0 w-full h-[70px] md:h-[64px] bg-[#000000] z-10"></div>
                        )}

                        {playType === 'yt' ? (
                            <SecureYoutubePlayer 
                                videoUrl={playingVideo.secure_link} 
                                studentId={studentIdStr}
                            />
                        ) : (
                            /* 🔥 FIXED IFRAME: Standard responsive iframe for Zoom recordings 🔥 */
                            <iframe 
                                src={playingVideo.secure_link || getEmbedUrl(playingVideo.link)} 
                                className="absolute inset-0 w-full h-full border-none pointer-events-auto bg-black"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                                allowFullScreen={true}
                                webkitallowfullscreen="true"
                                mozallowfullscreen="true"
                                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-forms"
                                title="Video Player"
                            ></iframe>
                        )}
                    </div>

                    {/* 🔥 UP NEXT UI 🔥 */}
                    {nextVideo && (
                        <div className="w-full mt-6 bg-black/20 border border-white/20 p-5 md:p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-md shadow-lg">
                            <div className="flex-1 min-w-0 text-center md:text-left">
                                <h3 className="text-white/80 text-xs font-bold uppercase tracking-widest mb-1.5 flex items-center justify-center md:justify-start gap-2"><SkipForward size={16} className="text-red-400"/> Up Next</h3>
                                <h2 className="text-white text-lg md:text-xl font-bold line-clamp-2 md:line-clamp-none">{nextVideo.title}</h2>
                            </div>
                            <button onClick={() => handlePlayVideo(nextVideo)} className="w-full md:w-auto bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shrink-0 shadow-lg shadow-red-600/20 hover:scale-[1.02]">
                                <Play size={18} fill="currentColor" /> Play Next
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                /* 🔥 COURSE CONTENT LIST 🔥 */
                <div className="animate-fade-in w-full h-full">
                    <button onClick={onBack} className="mb-6 text-white/70 hover:text-red-400 bg-black/20 hover:bg-white/10 px-4 py-2 rounded-xl font-bold flex items-center border border-white/10 w-max transition-colors text-sm">
                        <ArrowLeft size={16} className="mr-2" /> Back
                    </button>

                    <div className="glass-card p-6 rounded-[1.5rem] md:rounded-[2rem] mb-6 border border-white/10">
                        <h2 className="text-xl md:text-2xl font-extrabold text-white break-words">{data?.course?.name || 'Subject Content'}</h2>
                    </div>

                    <div className="flex overflow-x-auto gap-2 mb-6 pb-2 custom-scrollbar scroll-smooth no-scrollbar">
                        {tabs.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs md:text-sm whitespace-nowrap transition-all border ${activeTab === tab.id ? 'bg-red-600 border-red-500 text-white shadow-lg' : 'bg-black/20 border-white/10 text-white/80 hover:bg-white/10 hover:text-white'}`}>
                                <tab.icon size={16} className={activeTab === tab.id ? 'text-white' : 'text-white/80'}/> {tab.name} 
                            </button>
                        ))}
                    </div>

                    <div className="glass-card p-4 md:p-8 rounded-[1.5rem] md:rounded-[2rem] min-h-[400px] border border-white/10">
                        {String(data?.paidStatus) !== '1' ? (
                            <div className="text-center py-20 px-4">
                                <Lock size={40} className="text-red-500 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-white mb-2">Access Locked</h3>
                                <p className="text-white/90 text-xs md:text-sm">Please settle your payment to view content.</p>
                            </div>
                        ) : renderContentRows()}
                    </div>
                </div>
            )}
        </div>
    );
}