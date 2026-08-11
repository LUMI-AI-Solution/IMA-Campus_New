import re
import sys

with open('/root/IMA-Campus/frontend/src/pages/student/components/CourseView.jsx', 'r') as f:
    content = f.read()

# 1. Add Imports
imports_to_add = """
import YouTube from 'react-youtube';
import { FaYoutube } from 'react-icons/fa';
import { SiZoom } from 'react-icons/si';
"""
content = re.sub(r"(import toast from 'react-hot-toast';)", r"\1\n" + imports_to_add, content)

# 2. Add YT States inside CourseView
yt_states = """
    // YouTube Secure Player States
    const [ytPlayer, setYtPlayer] = useState(null);
    const [ytPlaying, setYtPlaying] = useState(false);
    const [showYtWarning, setShowYtWarning] = useState(false);
    const [ytWarningAccepted, setYtWarningAccepted] = useState(false);
    const [watermarkPos, setWatermarkPos] = useState({ top: 50, left: 50 });
    const [playType, setPlayType] = useState('zoom'); // 'zoom' or 'yt'
    const user = JSON.parse(localStorage.getItem('user') || '{}');
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
        const match = url.match(/(?:youtu\\.be\\/|youtube\\.com\\/(?:embed\\/|v\\/|live\\/|watch\\?v=|watch\\?.+&v=))([^&?]+)/);
        return match ? match[1] : url;
    };
"""
content = re.sub(r"(const \[nextVideo, setNextVideo\] = useState\(null\);)", r"\1\n" + yt_states, content)

# 3. Modify handlePlayVideo to accept type
handle_play = """
    const handlePlayVideo = (item, type = 'zoom') => {
        setPlayType(type);
        setYtWarningAccepted(false);
        const url = type === 'yt' ? item.youtubeLink : (item.link || item.url || '');
        
        if (type === 'yt') {
             setShowYtWarning(true);
             setPlayingVideo({ ...item, secure_link: url });
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
"""
content = re.sub(r"const handlePlayVideo = \(item\) => \{[\s\S]*?\n    \};\n", handle_play + "\n", content)

# 4. Modify handleCloseVideo
handle_close = """
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
"""
content = re.sub(r"const handleCloseVideo = \(\) => \{[\s\S]*?\n    \};\n", handle_close + "\n", content)

# 5. Modify rendering of buttons in renderRow
buttons_replace = """
                {activeTab === 'live' && <a href={item.link} target="_blank" rel="noreferrer" className="w-full md:w-max bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs md:text-sm flex items-center justify-center gap-2 transition-all"><Video size={16}/> Join Live</a>}
                {activeTab === 'recordings' && (
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        {item.youtubeLink && (
                            <button onClick={() => handlePlayVideo(item, 'yt')} title="Play via YouTube" className="bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white font-bold px-4 py-2.5 rounded-xl text-xs md:text-sm flex items-center justify-center gap-2 border border-red-500/30 transition-all shadow-md">
                                <FaYoutube size={18} /> YouTube
                            </button>
                        )}
                        {item.link && (
                            <button onClick={() => handlePlayVideo(item, 'zoom')} title="Play via Zoom" className="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white font-bold px-4 py-2.5 rounded-xl text-xs md:text-sm flex items-center justify-center gap-2 border border-blue-500/30 transition-all shadow-md">
                                <SiZoom size={18} /> Zoom
                            </button>
                        )}
                        {!item.link && !item.youtubeLink && (
                            <span className="text-white/40 text-xs italic px-2">No Video Available</span>
                        )}
                    </div>
                )}
"""
content = re.sub(r"\{activeTab === 'live' && <a href=\{item\.link\}[^\n]+\n\s*\{activeTab === 'recordings' && <button onClick=\{[^\n]+", buttons_replace, content)

# 6. Add YT Player Controls & Warning UI
video_player_ui = """
                        {/* 🔥 FIXED IFRAME OR CUSTOM YT PLAYER 🔥 */}
                        {playType === 'yt' && showYtWarning ? (
                            <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center flex-col p-6 text-center backdrop-blur-sm">
                                <div className="bg-red-950/40 border border-red-500/30 p-8 rounded-3xl max-w-lg shadow-2xl">
                                    <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Lock size={32} className="text-red-500" />
                                    </div>
                                    <h2 className="text-xl md:text-2xl font-bold text-white mb-4">Strict Warning / දැඩි අවවාදයයි</h2>
                                    <p className="text-slate-300 text-sm md:text-base mb-6 leading-relaxed">
                                        Misuse of this video recording is strictly prohibited. Legal action will be taken for intellectual property misuse.<br/><br/>
                                        මෙම වීඩියෝව අවභාවිතා කිරීම සපුරා තහනම්. බුද්ධිමය දේපල අවභාවිතා කිරීම සම්බන්ධයෙන් නීතිමය පියවර ගනු ලැබේ.
                                    </p>
                                    <button onClick={() => { setShowYtWarning(false); setYtWarningAccepted(true); }} className="bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-3.5 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all w-full md:w-auto">
                                        I Understand & Agree
                                    </button>
                                </div>
                            </div>
                        ) : playType === 'yt' && ytWarningAccepted ? (
                            <div className="relative w-full h-full bg-black flex flex-col group">
                                <div className="absolute inset-0 z-10 pointer-events-none select-none">
                                    <div className="absolute text-white/30 font-bold text-2xl md:text-4xl whitespace-nowrap drop-shadow-lg" style={{ top: `${watermarkPos.top}%`, left: `${watermarkPos.left}%`, transform: 'translate(-50%, -50%)', transition: 'all 5s linear' }}>
                                        {studentIdStr}
                                    </div>
                                </div>
                                <div className="absolute inset-0 z-20 pointer-events-none" />
                                <div className="w-full flex-1 overflow-hidden pointer-events-none">
                                    <YouTube 
                                        videoId={extractVideoId(playingVideo.secure_link)}
                                        opts={{
                                            height: '100%',
                                            width: '100%',
                                            playerVars: { autoplay: 1, controls: 0, disablekb: 1, modestbranding: 1, rel: 0, showinfo: 0, iv_load_policy: 3 }
                                        }}
                                        onReady={(e) => setYtPlayer(e.target)}
                                        onStateChange={(e) => setYtPlaying(e.data === 1)}
                                        className="w-full h-full"
                                        iframeClassName="w-full h-full pointer-events-none"
                                    />
                                </div>
                                <div className="h-16 bg-black border-t border-white/10 flex items-center justify-center gap-6 z-30 px-4">
                                    <button onClick={() => ytPlayer?.seekTo((ytPlayer?.getCurrentTime() || 0) - 10, true)} className="text-white hover:text-red-400 p-2"><SkipForward size={20} className="rotate-180" /></button>
                                    <button onClick={() => ytPlayer && (ytPlaying ? ytPlayer.pauseVideo() : ytPlayer.playVideo())} className="text-white hover:text-red-400 p-3 bg-white/5 rounded-full">
                                        {ytPlaying ? <Pause size={24} fill="currentColor"/> : <Play size={24} fill="currentColor" className="ml-1" />}
                                    </button>
                                    <button onClick={() => ytPlayer?.seekTo((ytPlayer?.getCurrentTime() || 0) + 10, true)} className="text-white hover:text-red-400 p-2"><SkipForward size={20} /></button>
                                    <div className="w-px h-6 bg-white/10 mx-2"></div>
                                    <button onClick={toggleFullScreen} className="text-white hover:text-red-400 p-2"><Maximize size={20} /></button>
                                </div>
                            </div>
                        ) : (
                            <iframe 
                                src={playingVideo.secure_link || getEmbedUrl(playingVideo.link)} 
                                className="w-full h-full border-none pointer-events-auto bg-white" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                                allowFullScreen={true}
                                webkitallowfullscreen="true"
                                mozallowfullscreen="true"
                                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-forms"
                                title="Video Player"
                            ></iframe>
                        )}
"""
content = re.sub(r"<\!\-\- 🔥 FIXED IFRAME[^\n]+\n\s*<iframe[\s\S]*?</iframe>", video_player_ui, content)

# Missing Pause import from lucide-react? Let's add it.
content = re.sub(r"import \{([^}]+)\} from 'lucide-react';", lambda m: "import {" + m.group(1) + ", Pause} from 'lucide-react';" if "Pause" not in m.group(1) else m.group(0), content)


with open('/root/IMA-Campus/frontend/src/pages/student/components/CourseView.jsx', 'w') as f:
    f.write(content)

print("Done replacing CourseView")
