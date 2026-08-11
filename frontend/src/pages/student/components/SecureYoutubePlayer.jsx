import React, { useState, useRef, useEffect } from 'react';
import YouTube from 'react-youtube';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, ExternalLink } from 'lucide-react';

const SecureYoutubePlayer = ({ videoUrl, studentId }) => {
    const containerRef = useRef(null);
    const [player, setPlayer] = useState(null);
    const [playing, setPlaying] = useState(false);
    const [volume, setVolume] = useState(80);
    const [muted, setMuted] = useState(false);
    const [playedSeconds, setPlayedSeconds] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Watermark animation state
    const [watermarkPos, setWatermarkPos] = useState({ top: 50, left: 50 });

    useEffect(() => {
        const interval = setInterval(() => {
            setWatermarkPos({
                top: Math.floor(Math.random() * 80) + 10,
                left: Math.floor(Math.random() * 80) + 10,
            });
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // Progress Tracker
    useEffect(() => {
        let interval;
        if (playing && player) {
            interval = setInterval(async () => {
                try {
                    const time = await player.getCurrentTime();
                    setPlayedSeconds(time || 0);
                } catch (e) {}
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [playing, player]);

    const extractVideoId = (url) => {
        if (!url) return '';
        const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|live\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
        return match ? match[1] : url;
    };

    const handleReady = (event) => {
        setPlayer(event.target);
        setDuration(event.target.getDuration());
        setVolume(event.target.getVolume());
        setMuted(event.target.isMuted());
    };

    const handlePlayPause = () => {
        if (!player) return;
        if (playing) {
            player.pauseVideo();
        } else {
            player.playVideo();
        }
    };

    const handleStateChange = (event) => {
        if (event.data === 1) setPlaying(true);
        else if (event.data === 2 || event.data === 0) setPlaying(false);
    };

    const handleVolumeChange = (e) => {
        const val = parseInt(e.target.value);
        setVolume(val);
        if (player) {
            player.setVolume(val);
            if (val > 0 && muted) {
                player.unMute();
                setMuted(false);
            }
        }
    };

    const handleToggleMuted = () => {
        if (!player) return;
        if (muted) {
            player.unMute();
            setMuted(false);
            if (volume === 0) {
                setVolume(50);
                player.setVolume(50);
            }
        } else {
            player.mute();
            setMuted(true);
        }
    };
    
    const handleSeekChange = (e) => {
        const val = parseFloat(e.target.value);
        setPlayedSeconds(val);
        if (player) {
            player.seekTo(val, true);
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            if (containerRef.current.requestFullscreen) {
                containerRef.current.requestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const formatTime = (seconds) => {
        if (isNaN(seconds)) return '00:00';
        const date = new Date(seconds * 1000);
        const hh = date.getUTCHours();
        const mm = date.getUTCMinutes();
        const ss = date.getUTCSeconds().toString().padStart(2, '0');
        if (hh) return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
        return `${mm}:${ss}`;
    };

    const opts = {
        height: '100%',
        width: '100%',
        host: 'https://www.youtube.com',
        playerVars: {
            autoplay: 0,
            controls: 1,
            disablekb: 1,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            iv_load_policy: 3,
            origin: window.location.origin
        },
    };

    return (
        <div 
            ref={containerRef}
            className="relative bg-black rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-center bg-zinc-900 w-full h-full"
            onContextMenu={(e) => e.preventDefault()} 
        >
            {/* The YouTube Player */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
                {extractVideoId(videoUrl) ? (
                    <>
                        <YouTube 
                            videoId={extractVideoId(videoUrl)} 
                            opts={opts} 
                            onReady={handleReady}
                            onStateChange={handleStateChange}
                            className="w-full h-full"
                            iframeClassName="w-full h-full"
                        />
                        {/* Invisible blocking overlay over the YouTube Title and Logo area (top-left) to prevent redirection */}
                        <div 
                            className="absolute top-0 left-0 w-2/3 md:w-1/2 h-24 z-40 bg-transparent"
                            onClick={(e) => e.stopPropagation()}
                            onContextMenu={(e) => e.preventDefault()}
                        />
                        {/* Invisible blocking overlay for the bottom-right YouTube logo */}
                        <div 
                            className="absolute bottom-0 right-16 md:right-24 w-24 h-12 z-40 bg-transparent"
                            onClick={(e) => e.stopPropagation()}
                            onContextMenu={(e) => e.preventDefault()}
                            title="YouTube"
                        />
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                        Invalid YouTube URL
                    </div>
                )}
            </div>

            {/* Floating Watermark */}
            <div 
                className="absolute z-20 text-white/30 font-bold text-xl md:text-3xl pointer-events-none transition-all duration-1000 ease-in-out mix-blend-overlay select-none"
                style={{ 
                    top: `${watermarkPos.top}%`, 
                    left: `${watermarkPos.left}%`,
                    transform: 'translate(-50%, -50%)'
                }}
            >
                {studentId}
            </div>

            {/* Custom Controls Removed to allow native YouTube controls */}
        </div>
    );
};

export default SecureYoutubePlayer;
