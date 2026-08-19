import React, { useState, useEffect, useRef } from 'react';
import { useCall } from '../../contexts/CallContext';
import { FaPhoneAlt, FaPhoneSlash, FaMicrophone, FaMicrophoneSlash, FaPause, FaPlay, FaLock, FaGripHorizontal } from 'react-icons/fa';

export default function WhatsAppCallScreen() {
    const { 
        incomingCall, activeCall, outboundCall, isRinging, 
        answerCall, rejectCall, endCall, endOutboundCall, 
        toggleOutboundMute, isOnHold, toggleHold 
    } = useCall();

    const [duration, setDuration] = useState(0);
    const [localInboundMute, setLocalInboundMute] = useState(false);

    // Draggable state setup
    const [position, setPosition] = useState({ x: window.innerWidth - 320, y: window.innerHeight - 420 });
    const isDragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    // Handle initial positioning to prevent overflow
    useEffect(() => {
        const handleResize = () => {
            setPosition(prev => ({
                x: Math.min(prev.x, window.innerWidth - 320),
                y: Math.min(prev.y, window.innerHeight - 420)
            }));
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handlePointerDown = (e) => {
        isDragging.current = true;
        dragOffset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
        e.target.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e) => {
        if (!isDragging.current) return;
        setPosition({
            x: Math.min(Math.max(0, e.clientX - dragOffset.current.x), window.innerWidth - 300),
            y: Math.min(Math.max(0, e.clientY - dragOffset.current.y), window.innerHeight - 100)
        });
    };

    const handlePointerUp = (e) => {
        isDragging.current = false;
        e.target.releasePointerCapture(e.pointerId);
    };

    // Calculate duration for active inbound call
    useEffect(() => {
        let interval;
        if (activeCall && activeCall.startTime) {
            interval = setInterval(() => {
                setDuration(Math.floor((new Date() - activeCall.startTime) / 1000));
            }, 1000);
        } else {
            setDuration(0);
        }
        return () => clearInterval(interval);
    }, [activeCall]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // Determine current call state to render
    const hasCall = isRinging || activeCall || outboundCall;
    if (!hasCall) return null;

    // Common variables
    let leadName = 'Unknown';
    let subtext = '';
    let showAnswerReject = false;
    let showControls = false;
    let isConnected = false;
    let isMuted = false;
    let handleEnd = () => {};
    let handleMute = () => {};

    if (isRinging && incomingCall) {
        leadName = incomingCall.leadName || incomingCall.from;
        subtext = 'WhatsApp audio...';
        showAnswerReject = true;
    } else if (activeCall) {
        leadName = activeCall.leadName || activeCall.from;
        subtext = isOnHold ? 'On Hold' : formatTime(duration);
        isConnected = true;
        showControls = true;
        handleEnd = endCall;
    } else if (outboundCall) {
        leadName = outboundCall.lead?.name || outboundCall.lead?.phone || 'Unknown';
        if (outboundCall.status === 'CONNECTED') {
            subtext = isOnHold ? 'On Hold' : formatTime(outboundCall.duration);
            isConnected = true;
            showControls = true;
        } else {
            subtext = outboundCall.status === 'DIALING' ? 'Calling...' : outboundCall.status === 'RINGING' ? 'Ringing...' : outboundCall.status;
            showControls = true;
        }
        isMuted = outboundCall.isMuted;
        handleEnd = endOutboundCall;
        handleMute = toggleOutboundMute;
    }

    // Inbound mute toggle logic
    const handleInboundMute = () => {
        if (activeCall && activeCall.localStream) {
            const track = activeCall.localStream.getAudioTracks()[0];
            if (track) {
                track.enabled = !track.enabled;
                setLocalInboundMute(!track.enabled);
            }
        }
    };

    const finalMuteHandler = outboundCall ? handleMute : handleInboundMute;
    const finalIsMuted = outboundCall ? isMuted : localInboundMute;

    return (
        <div 
            className="fixed z-[100000] flex flex-col bg-[#111B21] text-white rounded-2xl shadow-2xl overflow-hidden select-none border border-[#2A3942]"
            style={{ 
                width: '300px',
                height: '400px',
                left: position.x, 
                top: position.y
            }}
        >
            {/* Draggable Handle */}
            <div 
                className="w-full h-10 bg-[#202C33] flex justify-center items-center cursor-grab active:cursor-grabbing border-b border-[#2A3942] relative group"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                title="Drag to move"
            >
                <div className="w-12 h-1.5 bg-[#8696A0] rounded-full group-hover:bg-white transition-colors pointer-events-none"></div>
            </div>
            
            <div className="flex-1 flex flex-col items-center pt-6">
                <div className="flex items-center gap-2 text-[#8696A0] mb-4 text-xs font-medium">
                    <FaLock className="text-[10px]" />
                    <span>End-to-end encrypted</span>
                </div>

                <div className="flex flex-col items-center">
                    <div className="w-20 h-20 bg-[#202C33] rounded-full flex items-center justify-center text-3xl font-medium mb-4 shadow-xl relative">
                        {leadName.charAt(0).toUpperCase()}
                        {/* Ripple animation if ringing/calling */}
                        {(!isConnected && !isOnHold) && (
                            <div className="absolute inset-0 rounded-full bg-[#00A884] animate-ping opacity-20"></div>
                        )}
                    </div>
                    <h2 className="text-xl font-medium mb-1 tracking-wide text-center px-4 truncate w-full">{leadName}</h2>
                    <p className="text-[#8696A0] text-sm font-light tracking-wide">{subtext}</p>
                </div>
            </div>

            <div className="w-full px-6 pb-6">
                {showAnswerReject ? (
                    <div className="flex justify-between items-center px-2">
                        <button 
                            onClick={() => rejectCall(incomingCall.callId)}
                            className="w-12 h-12 bg-[#F15C6D] rounded-full flex items-center justify-center text-xl hover:scale-105 active:scale-95 transition-transform shadow-[0_4px_12px_rgba(241,92,109,0.4)]"
                        >
                            <FaPhoneSlash className="transform -scale-x-100 mb-0.5" />
                        </button>
                        <button 
                            onClick={() => answerCall(incomingCall.callId, incomingCall.sdp)}
                            className="w-12 h-12 bg-[#00A884] rounded-full flex items-center justify-center text-xl hover:scale-105 active:scale-95 transition-transform animate-pulse shadow-[0_4px_12px_rgba(0,168,132,0.4)]"
                        >
                            <FaPhoneAlt />
                        </button>
                    </div>
                ) : showControls ? (
                    <div className="flex justify-between items-center bg-[#202C33] rounded-[2rem] py-2 px-4 shadow-inner">
                        <button 
                            onClick={finalMuteHandler}
                            className={`flex flex-col items-center gap-1 transition-colors ${finalIsMuted ? 'text-[#00A884]' : 'text-[#8696A0] hover:text-white'}`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${finalIsMuted ? 'bg-[#00A884]/20' : ''}`}>
                                {finalIsMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
                            </div>
                        </button>
                        
                        {isConnected && (
                            <button 
                                onClick={toggleHold}
                                className={`flex flex-col items-center gap-1 transition-colors ${isOnHold ? 'text-[#00A884]' : 'text-[#8696A0] hover:text-white'}`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isOnHold ? 'bg-[#00A884]/20' : ''}`}>
                                    {isOnHold ? <FaPlay /> : <FaPause />}
                                </div>
                            </button>
                        )}

                        <button 
                            onClick={handleEnd}
                            className="w-10 h-10 bg-[#F15C6D] text-white rounded-full flex items-center justify-center text-lg hover:scale-105 active:scale-95 transition-transform"
                        >
                            <FaPhoneSlash className="transform -scale-x-100 mb-0.5" />
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
