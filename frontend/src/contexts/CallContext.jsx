import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../api/axios';

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

    // Socket Event Listeners for Global Outbound Calls
    useEffect(() => {
        if (!socket) return;

        const handleWaStatus = (data) => {
            console.log("[Global Outbound] Call Status Update:", data);
            if (!data || !data.status) return;
            const status = data.status.toUpperCase();
            
            if (status === 'RINGING') {
                setOutboundCall(prev => prev ? { ...prev, status: 'RINGING' } : null);
            } else if (status === 'REJECTED' || status === 'FAILED' || status === 'COMPLETED') {
                endOutboundCall();
            } else if (status === 'ACCEPTED' || status === 'IN_PROGRESS' || status === 'CONNECTED') {
                setOutboundCall(prev => prev ? { ...prev, status: 'CONNECTED' } : null);
                startOutboundTimer();
            }
        };

        const handleWaAnswer = async (data) => {
            console.log("[Global Outbound] Received SDP Answer from Meta:", data);
            if (outboundPcRef.current && outboundPcRef.current.signalingState !== 'closed') {
                try {
                    await outboundPcRef.current.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data.sdp }));
                } catch (e) { console.error("SDP Answer Error:", e); }
            }
        };

        const handleWaEnd = () => {
            console.log("[Global Outbound] Call ended by Meta");
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
            const dest = audioCtx.createMediaStreamDestination();
            
            const localSource = audioCtx.createMediaStreamSource(local);
            const remoteSource = audioCtx.createMediaStreamSource(remote);
            
            localSource.connect(dest);
            remoteSource.connect(dest);
            
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

    const startOutboundCall = async ({ lead, businessId, campaignType }) => {
        if (!lead || !lead.phone) return;
        if (outboundCall) {
            console.warn("[Global Outbound] Call already in progress. Ignoring duplicate click.");
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

            // 1. Get Mic Stream
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

            pc.ontrack = (e) => {
                console.log("[Global Outbound] Remote audio track received");
                if (!remoteAudioRef.current) {
                    const audio = new Audio();
                    audio.autoplay = true;
                    remoteAudioRef.current = audio;
                }
                remoteAudioRef.current.srcObject = e.streams[0];
                startOutboundRecording(stream, e.streams[0], lead.phone);
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
                        setOutboundCall(prev => prev ? { ...prev, callId: res.data.callId } : null);
                    }
                } catch (err) {
                    console.error("[Global Outbound] Error initiating call:", err);
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
                setTimeout(triggerOffer, 8000); // Increased timeout to 8s to ensure STUN gathering
            }

        } catch (err) {
            console.error("[Global Outbound] Setup error:", err);
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
            transports: ['polling', 'websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 2000
        });

        newSocket.on('connect_error', (err) => {
            console.warn('[Socket CallContext] Connection warning:', err.message);
        });

        setSocket(newSocket);

        return () => {
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
        setIsRinging(false);
        setIncomingCall(null);
        if (ringAudioRef.current) {
            ringAudioRef.current.pause();
            ringAudioRef.current.currentTime = 0;
        }
    };

    const answerCall = async (callId, offerSdp) => {
        stopRinging();
        
        try {
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
            
            // NOTE: Must get user media to accept properly, otherwise Meta API fails.
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            stream.getTracks().forEach(t => pc.addTrack(t, stream));

            pc.ontrack = (event) => {
                console.log('Remote track received from WhatsApp.');
                if (!remoteAudioRef.current) {
                    const audio = new Audio();
                    audio.autoplay = true;
                    remoteAudioRef.current = audio;
                }
                remoteAudioRef.current.srcObject = event.streams[0];
                
                // Start Recording
                startRecording(stream, event.streams[0], incomingCall?.from, callId);
            };

            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: offerSdp }));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            // Function to send answer
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
                    sendAnswer(pc.localDescription.sdp);
                }
            };

            if (pc.iceGatheringState === 'complete') {
                triggerAnswer();
            } else {
                pc.onicegatheringstatechange = () => {
                    if (pc.iceGatheringState === 'complete') {
                        triggerAnswer();
                    }
                };
                setTimeout(triggerAnswer, 5000); // Wait up to 5s for candidates
            }

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
            const dest = audioCtx.createMediaStreamDestination();
            
            const localSource = audioCtx.createMediaStreamSource(local);
            const remoteSource = audioCtx.createMediaStreamSource(remote);
            
            localSource.connect(dest);
            remoteSource.connect(dest);
            
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
