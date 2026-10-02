import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../api/axios';
import toast from 'react-hot-toast';

const CallContext = createContext();

export const useCall = () => useContext(CallContext);

export const CallProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    
    // States
    const [incomingCall, setIncomingCall] = useState(null); // { callId, from, leadName, businessType, sdp }
    const [activeCall, setActiveCall] = useState(null);
    const [isRinging, setIsRinging] = useState(false);
    const [isOnHold, setIsOnHold] = useState(false);

    // Outbound Call State
    const [outboundCall, setOutboundCall] = useState(null);
    const outboundPcRef = useRef(null);
    const outboundStreamRef = useRef(null);
    const outboundTimerRef = useRef(null);
    const outboundRecorderRef = useRef(null);
    const outboundChunksRef = useRef([]);
    const outboundDurationRef = useRef(0);
    const outboundCallIdRef = useRef(null);
    const outboundLeadRef = useRef(null);
    const outboundRingingTimeoutRef = useRef(null);
    const incomingRingingTimeoutRef = useRef(null);

    // Helper to get or create properly configured audio element attached to DOM
    const getOrCreateRemoteAudio = () => {
        let audio = remoteAudioRef.current;
        if (!audio || !document.body.contains(audio)) {
            audio = document.getElementById('webrtc-remote-audio');
            if (!audio) {
                audio = document.createElement('audio');
                audio.id = 'webrtc-remote-audio';
                audio.autoplay = true;
                audio.playsInline = true;
                audio.style.position = 'fixed';
                audio.style.top = '-9999px';
                audio.style.left = '-9999px';
                audio.style.opacity = '0';
                audio.style.pointerEvents = 'none';
                document.body.appendChild(audio);
            }
            remoteAudioRef.current = audio;
        }
        audio.autoplay = true;
        audio.playsInline = true;
        audio.muted = false;
        audio.volume = 1.0;
        return audio;
    };

    // Prevent accidental page refresh or tab close during call
    useEffect(() => {
        if (activeCall || incomingCall || outboundCall) {
            const handleBeforeUnload = (e) => {
                e.preventDefault();
                e.returnValue = 'Call in progress. Reloading will disconnect your call.';
                return e.returnValue;
            };
            window.addEventListener('beforeunload', handleBeforeUnload);
            return () => {
                window.removeEventListener('beforeunload', handleBeforeUnload);
            };
        }
    }, [activeCall, incomingCall, outboundCall]);
    
    // Audio ref for ringtone
    const ringAudioRef = useRef(null);
    const holdAudioRef = useRef(null);
    const holdStreamRef = useRef(null);
    const remoteAudioRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const audioContextRef = useRef(null);
    const callStartTimeRef = useRef(null);
    const titleIntervalRef = useRef(null);
    const originalTitleRef = useRef('');
    const notificationRef = useRef(null);

    // Unlock audio context and request notification permission on first user interaction (avoids Safari gesture error)
    useEffect(() => {
        const unlockUserMediaAndNotifications = () => {
            if (typeof window !== 'undefined' && 'Notification' in window) {
                if (Notification.permission === 'default') {
                    Notification.requestPermission().catch(() => {});
                }
            }
            if (ringAudioRef.current) {
                try {
                    ringAudioRef.current.load();
                } catch(e) {}
            }
        };
        window.addEventListener('click', unlockUserMediaAndNotifications, { once: true });
        window.addEventListener('keydown', unlockUserMediaAndNotifications, { once: true });
        window.addEventListener('touchstart', unlockUserMediaAndNotifications, { once: true });
        return () => {
            window.removeEventListener('click', unlockUserMediaAndNotifications);
            window.removeEventListener('keydown', unlockUserMediaAndNotifications);
            window.removeEventListener('touchstart', unlockUserMediaAndNotifications);
        };
    }, []);

    // Socket Event Listeners for Global Outbound Calls
    useEffect(() => {
        if (!socket) return;

        const handleWaStatus = (data) => {
            console.log("[Global Outbound] Call Status Update:", data);
            if (!data || !data.status) return;
            if (data.callId && outboundCallIdRef.current && data.callId !== outboundCallIdRef.current) {
                return;
            }
            const status = String(data.status).toUpperCase();
            
            if (status === 'RINGING') {
                setOutboundCall(prev => prev ? { ...prev, status: 'RINGING' } : null);
            } else if (status === 'REJECTED' || status === 'FAILED') {
                if (outboundRingingTimeoutRef.current) {
                    clearTimeout(outboundRingingTimeoutRef.current);
                    outboundRingingTimeoutRef.current = null;
                }
                if (!data.callId || (outboundCallIdRef.current && data.callId === outboundCallIdRef.current)) {
                    toast.error("Call was rejected or failed by student.");
                    endOutboundCall();
                }
            } else if (status === 'TERMINATED') {
                if (outboundRingingTimeoutRef.current) {
                    clearTimeout(outboundRingingTimeoutRef.current);
                    outboundRingingTimeoutRef.current = null;
                }
                if (data.callId && outboundCallIdRef.current && data.callId === outboundCallIdRef.current) {
                    endOutboundCall();
                }
            } else if (status === 'ACCEPTED' || status === 'IN_PROGRESS' || status === 'CONNECTED') {
                if (outboundRingingTimeoutRef.current) {
                    clearTimeout(outboundRingingTimeoutRef.current);
                    outboundRingingTimeoutRef.current = null;
                }
                setOutboundCall(prev => prev ? { ...prev, status: 'CONNECTED' } : null);
                startOutboundTimer();
            }
        };

        const handleWaAnswer = async (data) => {
            console.log("[Global Outbound] Received SDP Answer from Meta:", data);
            if (data?.callId && outboundCallIdRef.current && data.callId !== outboundCallIdRef.current) {
                return;
            }
            if (outboundRingingTimeoutRef.current) {
                clearTimeout(outboundRingingTimeoutRef.current);
                outboundRingingTimeoutRef.current = null;
            }
            if (outboundPcRef.current && outboundPcRef.current.signalingState !== 'closed') {
                try {
                    await outboundPcRef.current.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data.sdp }));
                    console.log("[Global Outbound] setRemoteDescription success!");
                    setOutboundCall(prev => prev ? { ...prev, status: 'CONNECTED' } : null);
                    startOutboundTimer();
                } catch (e) { 
                    console.error("SDP Answer Error:", e); 
                }
            }
        };

        const handleWaEnd = (data) => {
            console.log("[Global Outbound] Call ended by Meta", data);
            if (outboundRingingTimeoutRef.current) {
                clearTimeout(outboundRingingTimeoutRef.current);
                outboundRingingTimeoutRef.current = null;
            }
            if (data?.callId && outboundCallIdRef.current && data.callId !== outboundCallIdRef.current) {
                return;
            }
            endOutboundCall();
        };

        socket.on('whatsapp_call_status', handleWaStatus);
        socket.on('whatsapp_outbound_answer', handleWaAnswer);
        socket.on('whatsapp_call_end', handleWaEnd);

        return () => {
            socket.off('whatsapp_call_status', handleWaStatus);
            socket.off('whatsapp_outbound_answer', handleWaAnswer);
            socket.off('whatsapp_call_end', handleWaEnd);
        };
    }, [socket]);

    const startOutboundTimer = () => {
        outboundDurationRef.current = 0;
        if (outboundTimerRef.current) clearInterval(outboundTimerRef.current);
        outboundTimerRef.current = setInterval(() => {
            outboundDurationRef.current += 1;
            setOutboundCall(prev => prev ? { ...prev, duration: outboundDurationRef.current } : null);
        }, 1000);
    };

    const toggleOutboundMute = () => {
        if (outboundStreamRef.current) {
            const track = outboundStreamRef.current.getAudioTracks()[0];
            if (track) {
                track.enabled = !track.enabled;
                setOutboundCall(prev => prev ? { ...prev, isMuted: !track.enabled } : null);
            }
        }
    };

    const startOutboundRecording = (local, remote, leadPhone) => {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            audioContextRef.current = audioCtx;
            if (audioCtx.state === 'suspended') {
                audioCtx.resume().catch(e => console.warn('[Global Outbound] audioCtx resume failed:', e));
            }
            const dest = audioCtx.createMediaStreamDestination();
            
            if (local && local.getAudioTracks && local.getAudioTracks().length > 0) {
                const localSource = audioCtx.createMediaStreamSource(local);
                localSource.connect(dest);
            }
            if (remote && remote.getAudioTracks && remote.getAudioTracks().length > 0) {
                const remoteSource = audioCtx.createMediaStreamSource(remote);
                remoteSource.connect(dest);
            }
            
            const recorder = new MediaRecorder(dest.stream, { mimeType: 'audio/webm' });
            outboundRecorderRef.current = recorder;
            outboundChunksRef.current = [];
            
            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) outboundChunksRef.current.push(e.data);
            };
            
            recorder.onstop = async () => {
                const durationSecs = outboundDurationRef.current;
                console.log(`[Global Outbound] Recording stopped. Duration: ${durationSecs}s. Uploading for AI...`);
                if (outboundChunksRef.current.length > 0) {
                    const blob = new Blob(outboundChunksRef.current, { type: 'audio/webm' });
                    const formData = new FormData();
                    formData.append('audio', blob, 'outbound_call.webm');
                    formData.append('leadPhone', leadPhone || '');
                    formData.append('duration', durationSecs);
                    formData.append('direction', 'OUTBOUND');
                    if (outboundCallIdRef.current) formData.append('callId', outboundCallIdRef.current);
                    
                    try {
                        await api.post('/admin/whatsapp-call/upload-recording', formData);
                        console.log('[Global Outbound] Upload and AI analysis complete.');
                    } catch(e) {
                        console.error(`[Global Outbound] Failed to upload recording:`, e);
                    }
                }
                setOutboundCall(null);
            };
            
            recorder.start(1000);
            console.log('[Global Outbound] Recording started');
        } catch(err) {
            console.error(`[Global Outbound] Recording error:`, err);
        }
    };

    const endOutboundCall = async () => {
        if (outboundRingingTimeoutRef.current) {
            clearTimeout(outboundRingingTimeoutRef.current);
            outboundRingingTimeoutRef.current = null;
        }

        setOutboundCall(prev => prev ? { ...prev, isSaving: true } : null);

        if (outboundPcRef.current) {
            outboundPcRef.current.close();
            outboundPcRef.current = null;
        }
        if (outboundStreamRef.current) {
            outboundStreamRef.current.getTracks().forEach(t => t.stop());
            outboundStreamRef.current = null;
        }
        if (outboundTimerRef.current) {
            clearInterval(outboundTimerRef.current);
        }

        setIsOnHold(false);
        if (holdAudioRef.current) {
            holdAudioRef.current.pause();
            holdAudioRef.current.currentTime = 0;
        }

        if (outboundCallIdRef.current) {
            try {
                await api.post('/admin/whatsapp-call/terminate', {
                    callId: outboundCallIdRef.current,
                    leadPhone: outboundLeadRef.current?.phone,
                    businessId: outboundLeadRef.current?.batch?.businessId || outboundLeadRef.current?.businessId,
                    campaignType: outboundLeadRef.current?.campaignType || 'FREE_SEMINAR',
                    duration: outboundDurationRef.current
                });
            } catch (e) {}
        }

        if (outboundRecorderRef.current && outboundRecorderRef.current.state !== 'inactive') {
            outboundRecorderRef.current.stop();
        } else {
            setOutboundCall(null);
        }
    };

    const startOutboundCall = async (args) => {
        let { lead, businessId, campaignType } = args || {};

        // Support flat parameters like { phone, name, leadId, businessId, batchId, batch, business }
        if (!lead && args?.phone) {
            lead = {
                id: args.leadId || args.existingLeadId || args.id || null,
                phone: args.phone,
                name: args.name || args.studentName || args.phone,
                businessId: args.businessId,
                batchId: args.batchId,
                batch: args.batch,
                business: args.business
            };
        }

        if (!lead || !lead.phone) {
            console.warn("[Global Outbound] Cannot start call: missing phone number", args);
            toast.error("Cannot initiate call: phone number is missing");
            return;
        }

        if (outboundCall) {
            console.warn("[Global Outbound] Call already in progress. Ignoring duplicate click.");
            toast.error("A call is already in progress.");
            return;
        }

        const resolvedBusinessId = businessId || lead.batch?.businessId || lead.businessId || lead.batch?.business?.id || null;
        const resolvedCampaignType = campaignType || lead.campaignType || 'FREE_SEMINAR';

        try {
            outboundLeadRef.current = lead;
            outboundCallIdRef.current = null;
            setOutboundCall({
                lead,
                businessId: resolvedBusinessId,
                campaignType: resolvedCampaignType,
                status: 'DIALING',
                duration: 0,
                isMuted: false,
                isSaving: false
            });

            // 1. Get Mic Stream with noise suppression and echo cancellation
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            outboundStreamRef.current = stream;

            // 2. PeerConnection
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            });
            outboundPcRef.current = pc;
            
            pc.oniceconnectionstatechange = () => {
                console.log(`[Global Outbound] ICE State: ${pc.iceConnectionState}`);
            };

            stream.getTracks().forEach(t => pc.addTrack(t, stream));

            // Set 40s Ringing Timeout: if student doesn't answer, auto cut and notify
            if (outboundRingingTimeoutRef.current) {
                clearTimeout(outboundRingingTimeoutRef.current);
            }
            outboundRingingTimeoutRef.current = setTimeout(() => {
                if (outboundPcRef.current) {
                    console.log("[Global Outbound] Ringing timed out after 40 seconds (unanswered).");
                    toast.error("Call was not answered (Ringing timed out).", { duration: 5000 });
                    endOutboundCall();
                }
            }, 40000);

            pc.ontrack = (e) => {
                console.log("[Global Outbound] Remote audio track received");
                if (outboundRingingTimeoutRef.current) {
                    clearTimeout(outboundRingingTimeoutRef.current);
                    outboundRingingTimeoutRef.current = null;
                }
                const audio = getOrCreateRemoteAudio();
                const remoteStream = (e.streams && e.streams[0]) ? e.streams[0] : new MediaStream([e.track]);
                audio.srcObject = remoteStream;
                audio.muted = false;
                audio.volume = 1.0;
                audio.play().catch(err => console.warn("[Global Outbound] Audio autoplay error:", err));
                
                setOutboundCall(prev => prev ? { ...prev, status: 'CONNECTED' } : null);
                startOutboundTimer();
                startOutboundRecording(stream, remoteStream, lead.phone);
            };

            // 3. Create Offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            // 4. Send Offer
            const sendOffer = async (sdp) => {
                try {
                    const token = localStorage.getItem('token');
                    const res = await api.post('/admin/whatsapp-call/initiate', {
                        to: lead.phone,
                        sdp: sdp,
                        businessId: resolvedBusinessId,
                        campaignType: resolvedCampaignType
                    }, { headers: { Authorization: `Bearer ${token}` } });

                    if (res.data?.success) {
                        outboundCallIdRef.current = res.data.callId;
                        setOutboundCall(prev => prev ? { ...prev, callId: res.data.callId, status: prev.status === 'CONNECTED' ? 'CONNECTED' : 'RINGING' } : null);
                    }
                } catch (err) {
                    console.error("[Global Outbound] Error initiating call:", err);
                    let errMsg = err.response?.data?.error || err.message || "Failed to initiate call via Meta.";
                    if (errMsg.includes("No approved call permission") || err.response?.data?.details?.error?.code === 138006) {
                        errMsg = "WhatsApp Call Permission required from student. Please click 'Req Perm' first.";
                    }
                    toast.error(errMsg, { duration: 6000 });
                    endOutboundCall();
                }
            };

            let sent = false;
            const triggerOffer = () => {
                if (!sent && pc.localDescription?.sdp) {
                    sent = true;
                    sendOffer(pc.localDescription.sdp);
                }
            };

            if (pc.iceGatheringState === 'complete') {
                triggerOffer();
            } else {
                pc.onicegatheringstatechange = () => {
                    if (pc.iceGatheringState === 'complete') {
                        triggerOffer();
                    }
                };
                setTimeout(triggerOffer, 1500); // Send offer quickly once STUN candidates start
            }

        } catch (err) {
            console.error("[Global Outbound] Setup error:", err);
            toast.error("Microphone access error: " + (err.message || "Please allow mic permission in your browser."));
            setOutboundCall(null);
        }
    };

    const toggleHold = async () => {
        let pc, localStream;
        if (activeCall && activeCall.peerConnection) {
            pc = activeCall.peerConnection;
            localStream = activeCall.localStream;
        } else if (outboundCall && outboundPcRef.current) {
            pc = outboundPcRef.current;
            localStream = outboundStreamRef.current;
        } else {
            return;
        }

        if (!pc || !localStream) return;

        if (isOnHold) {
            if (holdAudioRef.current) {
                holdAudioRef.current.pause();
                holdAudioRef.current.currentTime = 0;
            }
            const micTrack = outboundStreamRef.current?.getAudioTracks()[0];
            if (micTrack) {
                micTrack.enabled = !outboundCall?.isMuted; // Restore original mute state
                const sender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
                if (sender) await sender.replaceTrack(micTrack);
            }
            setIsOnHold(false);
        } else {
            if (!holdAudioRef.current) {
                holdAudioRef.current = new Audio('/assets/audio/hold-music.mp3');
                holdAudioRef.current.loop = true;
                
                try {
                    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    const source = audioCtx.createMediaElementSource(holdAudioRef.current);
                    const destination = audioCtx.createMediaStreamDestination();
                    source.connect(destination);
                    holdStreamRef.current = destination.stream;
                } catch(e) {
                    console.error("Audio Routing Error", e);
                }
            }
            try {
                await holdAudioRef.current.play();
            } catch(e) { console.error("Hold music block", e); }

            const stream = holdStreamRef.current || (holdAudioRef.current.captureStream ? holdAudioRef.current.captureStream() : (holdAudioRef.current.mozCaptureStream ? holdAudioRef.current.mozCaptureStream() : null));
            if (stream) {
                const holdTrack = stream.getAudioTracks()[0];
                if (holdTrack) {
                    const sender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
                    if (sender) await sender.replaceTrack(holdTrack);
                }
            }
            
            // Explicitly mute the microphone track
            const micTrack = outboundStreamRef.current?.getAudioTracks()[0];
            if (micTrack) {
                micTrack.enabled = false;
            }
            
            setIsOnHold(true);
        }
    };

    const endCall = async () => {
        if (activeCall) {
            try {
                const duration = Math.floor((new Date() - activeCall.startTime) / 1000);
                await api.post('/admin/whatsapp-call/terminate', {
                    callId: activeCall.callId,
                    businessType: activeCall.businessType,
                    receivingWaNumId: activeCall.receivingWaNumId,
                    leadPhone: activeCall.from,
                    isNewInquiry: activeCall.isNewInquiry,
                    businessId: activeCall.businessId,
                    duration
                });
            } catch (err) {
                console.error("Error terminating call on backend:", err);
            }

            if (activeCall.peerConnection) activeCall.peerConnection.close();
            if (activeCall.localStream) {
                activeCall.localStream.getTracks().forEach(track => track.stop());
            }
        }
        
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
        if (remoteAudioRef.current) {
            remoteAudioRef.current.pause();
            remoteAudioRef.current.srcObject = null;
        }
        
        setIsOnHold(false);
        if (holdAudioRef.current) {
            holdAudioRef.current.pause();
            holdAudioRef.current.currentTime = 0;
        }

        if (titleIntervalRef.current) {
            clearInterval(titleIntervalRef.current);
            titleIntervalRef.current = null;
            if (originalTitleRef.current) {
                document.title = originalTitleRef.current;
            }
        }
        if (notificationRef.current) {
            try { notificationRef.current.close(); } catch(e) {}
            notificationRef.current = null;
        }

        setActiveCall(null);
    };

    useEffect(() => {
        ringAudioRef.current = new Audio('/assets/audio/ringtone.mp3');
        ringAudioRef.current.loop = true;
        
        // Connect Socket globally for Call Context only if user is logged in with token
        const token = localStorage.getItem('token');
        if (!token) return;

        const host = window.location.hostname;
        const protocol = window.location.protocol;
        const defaultSocketUrl = import.meta.env.VITE_API_URL 
        ? import.meta.env.VITE_API_URL.replace('/api', '') 
        : (protocol === 'https:') 
            ? `https://${host}` 
            : (host === 'localhost' || host === '127.0.0.1') 
                ? 'http://localhost:5000' 
                : `http://${host}:5000`;

        const newSocket = io(defaultSocketUrl, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            autoConnect: true
        });

        const emitJoinPool = () => {
            try {
                const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                const roleUpper = storedUser?.role ? String(storedUser.role).toUpperCase() : '';
                const deptLower = storedUser?.department ? String(storedUser.department).trim().toLowerCase() : '';
                
                // Exclude Delivery, Finance, Social Media, Physical, Academic, etc.
                const isNonCoordination = ['delivery', 'finance', 'social media', 'physical', 'academic'].some(d => deptLower.includes(d));
                const isRestrictedRole = ['STUDENT', 'GUEST'].some(r => roleUpper.includes(r));
                
                const isClassCoordination = !isNonCoordination && !isRestrictedRole && (
                    deptLower.includes('class coordination') || 
                    roleUpper.includes('COORDINATOR') || 
                    (roleUpper.includes('MANAGER') && !['DELIVERY', 'FINANCE', 'PHYSICAL'].some(r => roleUpper.includes(r)))
                );

                if (isClassCoordination) {
                    const savedStatus = localStorage.getItem('agentStatus') || storedUser?.agentStatus || 'ACTIVE';
                    if (savedStatus !== 'OFFLINE') {
                        newSocket.emit('join_wa_agent_pool', { status: savedStatus });
                        console.log(`[Socket CallContext] Emitted join_wa_agent_pool for Class Coordination with status: ${savedStatus}`);
                    }
                } else {
                    console.log(`[Socket CallContext] User ${storedUser?.id} (${storedUser?.firstName}) is NOT in Class Coordination (Dept: ${storedUser?.department}). Skipping WA agent pool join.`);
                }
            } catch (e) {
                console.error('[Socket CallContext] Error emitting join_wa_agent_pool:', e);
            }
        };

        newSocket.on('connect', () => {
            console.log('[Socket CallContext] Connected successfully, id:', newSocket.id);
            emitJoinPool();
        });

        newSocket.on('reconnect', (attempt) => {
            console.log('[Socket CallContext] Reconnected after attempt:', attempt);
            emitJoinPool();
        });

        newSocket.on('connect_error', (err) => {
            console.warn('[Socket CallContext] Connection warning:', err.message);
        });

        // Watchdog & Wake-up Handlers for background tabs and network switches
        const handleWakeOrFocus = () => {
            if (!newSocket.connected) {
                console.log('[Socket CallContext] Tab active/visible, forcing socket reconnect...');
                newSocket.connect();
            } else {
                emitJoinPool();
            }
        };

        document.addEventListener('visibilitychange', handleWakeOrFocus);
        window.addEventListener('focus', handleWakeOrFocus);
        window.addEventListener('online', handleWakeOrFocus);

        const watchdog = setInterval(() => {
            if (!newSocket.connected) {
                console.warn('[Socket CallContext] Watchdog: socket disconnected, attempting connect...');
                newSocket.connect();
            }
        }, 15000);

        setSocket(newSocket);

        return () => {
            clearInterval(watchdog);
            document.removeEventListener('visibilitychange', handleWakeOrFocus);
            window.removeEventListener('focus', handleWakeOrFocus);
            window.removeEventListener('online', handleWakeOrFocus);
            if (ringAudioRef.current) {
                ringAudioRef.current.pause();
                ringAudioRef.current = null;
            }
            if (newSocket) newSocket.disconnect();
        };
    }, []);

    useEffect(() => {
        if (!socket) return;

        const handleIncomingCall = (data) => {
            console.log("Incoming WhatsApp Call:", data);
            
            // 1. Department Check: ONLY Class Coordination staff should ring!
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            const deptLower = (storedUser?.department || '').trim().toLowerCase();
            const roleUpper = (storedUser?.role || '').trim().toUpperCase();

            const isNonCoordinationDept = ['delivery', 'finance', 'social media', 'physical', 'academic'].some(d => deptLower.includes(d));
            const isRestrictedRole = ['STUDENT', 'GUEST'].some(r => roleUpper.includes(r));
            
            const isClassCoordination = !isNonCoordinationDept && !isRestrictedRole && (
                deptLower.includes('class coordination') || 
                roleUpper.includes('COORDINATOR') || 
                (roleUpper.includes('MANAGER') && !['DELIVERY', 'FINANCE', 'PHYSICAL'].some(r => roleUpper.includes(r)))
            );

            if (!isClassCoordination) {
                console.log(`[CallContext] Suppressing call for user ${storedUser?.id} (Dept: ${storedUser?.department}, Role: ${storedUser?.role}) - Not in Class Coordination`);
                return;
            }

            // 2. Business Type Check: If call is for a specific business (e.g. Art), Tech/Commerce staff must NOT ring!
            if (data?.businessType && data.businessType !== 'ALL') {
                const userBiz = (storedUser?.businessType || '').trim();
                const userBizList = userBiz.split(',').map(b => b.trim().toLowerCase()).filter(Boolean);
                const incomingBiz = data.businessType.trim().toLowerCase();

                // If coordinator has specific businesses assigned (and is not ALL), check if incoming call matches
                if (userBizList.length > 0 && !userBizList.includes('all')) {
                    const matches = userBizList.some(b => b === incomingBiz || incomingBiz.includes(b) || b.includes(incomingBiz));
                    if (!matches) {
                        console.log(`[CallContext] Suppressing call for '${data.businessType}' - User only handles [${userBiz}]`);
                        return;
                    }
                }
            }

            // Only ring if we don't already have an active call
            if (!activeCall) {
                setIncomingCall(data);
                setIsRinging(true);
                
                if (data.ringtoneUrl) {
                    try {
                        if (!ringAudioRef.current) ringAudioRef.current = new Audio();
                        
                        const baseApiUrl = (api.defaults && api.defaults.baseURL) 
                            ? api.defaults.baseURL.replace('/api', '') 
                            : (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000');
                            
                        const audioUrl = baseApiUrl + data.ringtoneUrl;
                        console.log("Playing ringtone from:", audioUrl);
                        
                        ringAudioRef.current.src = audioUrl;
                        ringAudioRef.current.loop = true;
                    } catch (err) {
                        console.error("Error setting ringtone URL:", err);
                    }
                }
                
                try {
                    const playPromise = ringAudioRef.current?.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(e => console.log("Audio play prevented by browser interaction policy:", e));
                    }
                } catch (err) {
                    console.error("Error calling play on ringtone:", err);
                }

                // Desktop Notification for background tabs
                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                    try {
                        const callerName = data.leadName || data.from || 'Customer';
                        const callerPhone = data.from || '';
                        const biz = data.businessType || 'IMA Campus';
                        
                        const notif = new Notification(`📞 Incoming WhatsApp Call: ${callerName}`, {
                            body: `From: ${callerPhone} (${biz})\nClick here to open and answer!`,
                            icon: '/favicon.ico',
                            tag: `wa-call-${data.callId || 'incoming'}`,
                            requireInteraction: true,
                            renotify: true
                        });

                        notif.onclick = () => {
                            window.focus();
                            notif.close();
                        };

                        notificationRef.current = notif;
                    } catch (notifErr) {
                        console.warn('[CallContext] Notification error:', notifErr);
                    }
                }

                // Tab Title Flashing for background tabs
                if (titleIntervalRef.current) clearInterval(titleIntervalRef.current);
                originalTitleRef.current = document.title;
                let flashToggle = false;
                titleIntervalRef.current = setInterval(() => {
                    const caller = data.leadName || data.from || 'WhatsApp Call';
                    document.title = flashToggle 
                        ? `🔔 INCOMING CALL: ${caller}` 
                        : `📞 RINGING... (${data.businessType || 'IMA'})`;
                    flashToggle = !flashToggle;
                }, 800);

                // Auto timeout incoming call ringing after 45s if unanswered
                if (incomingRingingTimeoutRef.current) clearTimeout(incomingRingingTimeoutRef.current);
                incomingRingingTimeoutRef.current = setTimeout(() => {
                    console.log("[Global Incoming] Incoming call ringing timed out after 45s.");
                    stopRinging();
                }, 45000);
            }
        };

        const handleCallAnsweredByOther = (data) => {
            if (incomingCall && incomingCall.callId === data.callId) {
                console.log("Call was answered by another agent.");
                stopRinging();
            }
        };

        const handleCallDisconnected = (data) => {
            if (incomingCall && incomingCall.callId === data.callId) {
                console.log("Call was disconnected by the caller.");
                stopRinging();
            } else if (activeCall && activeCall.callId === data.callId) {
                console.log("Active call was disconnected by the caller.");
                endCall();
            }
        };

        socket.on('incoming_wa_call', handleIncomingCall);
        socket.on('whatsapp_call_answered_by_other', handleCallAnsweredByOther);
        socket.on('whatsapp_call_disconnected', handleCallDisconnected);

        return () => {
            socket.off('incoming_wa_call', handleIncomingCall);
            socket.off('whatsapp_call_answered_by_other', handleCallAnsweredByOther);
            socket.off('whatsapp_call_disconnected', handleCallDisconnected);
        };
    }, [socket, activeCall, incomingCall]);

    const stopRinging = () => {
        if (incomingRingingTimeoutRef.current) {
            clearTimeout(incomingRingingTimeoutRef.current);
            incomingRingingTimeoutRef.current = null;
        }
        setIsRinging(false);
        setIncomingCall(null);
        if (ringAudioRef.current) {
            ringAudioRef.current.pause();
            ringAudioRef.current.currentTime = 0;
        }
        if (titleIntervalRef.current) {
            clearInterval(titleIntervalRef.current);
            titleIntervalRef.current = null;
            if (originalTitleRef.current) {
                document.title = originalTitleRef.current;
            }
        }
        if (notificationRef.current) {
            try {
                notificationRef.current.close();
            } catch (e) {}
            notificationRef.current = null;
        }
    };

    const answerCall = async (callId, offerSdp) => {
        stopRinging();
        
        try {
            // Prime audio element immediately upon user gesture to satisfy browser autoplay policy
            const primedAudio = getOrCreateRemoteAudio();
            primedAudio.muted = false;
            primedAudio.volume = 1.0;
            primedAudio.play().catch(() => {});

            // Setup WebRTC RTCPeerConnection to generate answer SDP
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            });
            
            pc.oniceconnectionstatechange = () => {
                console.log(`[Global Incoming] ICE State: ${pc.iceConnectionState}`);
            };
            
            // Acquire microphone stream with echo cancellation and noise suppression
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }, 
                video: false 
            });

            pc.ontrack = (event) => {
                console.log('[Global Inbound] Remote track received from WhatsApp.');
                const audio = getOrCreateRemoteAudio();
                const remoteStream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
                audio.srcObject = remoteStream;
                audio.muted = false;
                audio.volume = 1.0;
                audio.play().catch(err => console.warn('[Global Inbound] Audio play error:', err));
                
                // Start Recording with both local mic and remote audio
                startRecording(stream, remoteStream, incomingCall?.from, callId);
            };

            // CRITICAL WebRTC order:
            // 1. setRemoteDescription FIRST with offer SDP from Meta
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: offerSdp }));

            // 2. addTrack AFTER setRemoteDescription so the microphone track binds
            // to the remote offer's mid:audio m-line with direction 'sendrecv' (bidirectional).
            stream.getTracks().forEach(t => pc.addTrack(t, stream));

            // 3. createAnswer and setLocalDescription
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            // Function to send answer to Meta via backend
            const sendAnswer = async (sdp) => {
                await api.post('/admin/whatsapp-call/answer', {
                    callId: callId,
                    sdp: sdp,
                    businessType: incomingCall.businessType,
                    receivingWaNumId: incomingCall.receivingWaNumId
                });
            };

            let answerSent = false;
            const triggerAnswer = () => {
                if (!answerSent && pc.localDescription?.sdp) {
                    answerSent = true;
                    console.log('[Global Inbound] Dispatching SDP Answer with ICE candidates to Meta...');
                    sendAnswer(pc.localDescription.sdp);
                }
            };

            // Fast candidate gathering: trigger when gathering completes OR after 1.2s timeout
            pc.onicecandidate = (event) => {
                if (!event.candidate) {
                    triggerAnswer();
                }
            };

            pc.onicegatheringstatechange = () => {
                if (pc.iceGatheringState === 'complete') {
                    triggerAnswer();
                }
            };
            setTimeout(triggerAnswer, 1200);

            // Set as active call
            setActiveCall({
                callId: incomingCall.callId,
                from: incomingCall.from,
                leadName: incomingCall.leadName,
                businessType: incomingCall.businessType,
                receivingWaNumId: incomingCall.receivingWaNumId,
                isNewInquiry: incomingCall.isNewInquiry,
                businessId: incomingCall.businessId,
                startTime: new Date(),
                peerConnection: pc,
                localStream: stream
            });

        } catch (err) {
            console.error("Error answering call:", err);
            alert("Failed to connect call: " + (err.message || ""));
        }
    };

    const rejectCall = async (callId) => {
        stopRinging();
        try {
            await api.post('/admin/whatsapp-call/reject', { 
                callId, 
                businessType: incomingCall?.businessType, 
                receivingWaNumId: incomingCall?.receivingWaNumId,
                leadPhone: incomingCall?.from,
                isNewInquiry: incomingCall?.isNewInquiry,
                businessId: incomingCall?.businessId
            });
        } catch (err) {
            console.error("Error rejecting call:", err);
        }
    };



    const startRecording = (local, remote, leadPhone, callId) => {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            audioContextRef.current = audioCtx;
            if (audioCtx.state === 'suspended') {
                audioCtx.resume().catch(e => console.warn('[Global Inbound] audioCtx resume failed:', e));
            }
            const dest = audioCtx.createMediaStreamDestination();
            
            if (local && local.getAudioTracks && local.getAudioTracks().length > 0) {
                const localSource = audioCtx.createMediaStreamSource(local);
                localSource.connect(dest);
            }
            if (remote && remote.getAudioTracks && remote.getAudioTracks().length > 0) {
                const remoteSource = audioCtx.createMediaStreamSource(remote);
                remoteSource.connect(dest);
            }
            
            const recorder = new MediaRecorder(dest.stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = recorder;
            recordedChunksRef.current = [];
            
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) recordedChunksRef.current.push(e.data);
            };
            
            recorder.onstop = async () => {
                const durationSecs = callStartTimeRef.current ? Math.floor((Date.now() - callStartTimeRef.current) / 1000) : 0;
                console.log(`Recording stopped. Duration: ${durationSecs}s. Uploading for AI Analysis...`);
                const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
                const formData = new FormData();
                formData.append('audio', blob, 'call_recording.webm');
                formData.append('leadPhone', leadPhone || '');
                formData.append('duration', durationSecs);
                if (callId) formData.append('callId', callId);
                
                try {
                    const res = await api.post('/admin/whatsapp-call/upload-recording', formData);
                    if(res.data.success) {
                        console.log('AI Analysis complete.', res.data.record);
                        // Optional: trigger a custom event or store in global state to show toast
                    }
                } catch(e) {
                    console.error(`Failed to upload recording: ${e.response?.data?.error || e.message}`);
                }
            };
            
            recorder.start();
            callStartTimeRef.current = Date.now();
            console.log('Call recording started (Local + Remote mixed).');
        } catch(err) {
            console.error(`Recording error: ${err.message}`);
        }
    };

    const transferCall = (targetUserId) => {
        if (socket && activeCall) {
            socket.emit('transfer_wa_call', {
                targetUserId,
                callId: activeCall.callId,
                from: activeCall.from,
                leadName: activeCall.leadName
            });
            alert("Transfer request sent (Pinged).");
        }
    };

    return (
        <CallContext.Provider value={{
            socket,
            incomingCall,
            activeCall,
            isRinging,
            answerCall,
            rejectCall,
            endCall,
            transferCall,
            outboundCall,
            startOutboundCall,
            endOutboundCall,
            toggleOutboundMute,
            isOnHold,
            toggleHold
        }}>
            {children}
        </CallContext.Provider>
    );
};
