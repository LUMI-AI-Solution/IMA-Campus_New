import React, { useState, useEffect, useRef } from 'react';
import axios from '../../api/axios';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { MessageCircle, CheckCircle, Search, Paperclip, Send, User, ChevronRight, CheckCircle2, ShieldAlert } from 'lucide-react';

const WebInquiries = ({ loggedInUser }) => {
    const [inquiries, setInquiries] = useState([]);
    const [selectedInquiry, setSelectedInquiry] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputMsg, setInputMsg] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [businesses, setBusinesses] = useState([]);
    const [selectedBusiness, setSelectedBusiness] = useState('');
    
    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Fetch accessible businesses for the staff
    useEffect(() => {
        axios.get('/business/my-businesses')
            .then(res => {
                const businessList = Array.isArray(res.data) ? res.data : (res.data.businesses || []);
                if (businessList.length > 0) {
                    setBusinesses(businessList);
                    setSelectedBusiness(businessList[0].id);
                }
            })
            .catch(err => console.error(err));
    }, []);

    // Initialize Socket
    useEffect(() => {
        const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
        if (!token) return;

        socketRef.current = io(axios.defaults.baseURL.replace('/api', ''), {
            auth: { token }
        });

        socketRef.current.on('new_web_inquiry_message', (msg) => {
            setMessages(prev => {
                if (prev.find(m => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
            // Update the inquiries list lastMessage
            setInquiries(prev => prev.map(inq => {
                if (inq.id === msg.inquiryId) {
                    return { ...inq, lastMessage: msg.message || '[Attachment]', lastMessageAt: msg.createdAt, unreadCount: msg.direction === 'inbound' ? inq.unreadCount + 1 : inq.unreadCount };
                }
                return inq;
            }));
            
            // Mark read if it's the active chat and msg is inbound
            if (selectedInquiry && msg.inquiryId === selectedInquiry.id && msg.direction === 'inbound') {
                axios.post('/web-inquiry/mark-read', { inquiryId: selectedInquiry.id }).catch(e=>{});
                setInquiries(prev => prev.map(inq => {
                    if (inq.id === msg.inquiryId) return { ...inq, unreadCount: 0 };
                    return inq;
                }));
            }
        });

        socketRef.current.on('web_inquiry_notification', (data) => {
            // New inquiry or message notification
            fetchInquiries(); // refresh list
        });

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [selectedInquiry]);

    // Join Staff Room for the selected business
    useEffect(() => {
        if (selectedBusiness && socketRef.current) {
            socketRef.current.emit('join_web_inquiry_staff', { businessId: parseInt(selectedBusiness) });
            fetchInquiries();
        }
    }, [selectedBusiness]);

    // Join specific chat room when selected
    useEffect(() => {
        if (selectedInquiry && socketRef.current) {
            socketRef.current.emit('join_web_inquiry_room', { inquiryId: selectedInquiry.id });
            fetchMessages(selectedInquiry.id);
            // Mark read
            if (selectedInquiry.unreadCount > 0) {
                axios.post('/web-inquiry/mark-read', { inquiryId: selectedInquiry.id })
                    .then(() => {
                        setInquiries(prev => prev.map(inq => inq.id === selectedInquiry.id ? { ...inq, unreadCount: 0 } : inq));
                    }).catch(e=>{});
            }
        }
    }, [selectedInquiry]);

    const fetchInquiries = async () => {
        if (!selectedBusiness) return;
        try {
            const res = await axios.get(`/web-inquiry?businessId=${selectedBusiness}`);
            if (res.data.success) {
                setInquiries(res.data.inquiries);
            }
        } catch (error) {
            console.error("Failed to fetch inquiries");
        }
    };

    const fetchMessages = async (inquiryId) => {
        try {
            const res = await axios.get(`/web-inquiry/${inquiryId}/messages`);
            if (res.data.success) {
                setMessages(res.data.messages);
            }
        } catch (error) {
            console.error("Failed to fetch messages");
        }
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if ((!inputMsg.trim() && !isUploading) || !selectedInquiry || !socketRef.current) return;
        
        const payload = {
            inquiryId: selectedInquiry.id,
            businessId: selectedInquiry.businessId,
            message: inputMsg.trim()
        };
        
        socketRef.current.emit('send_web_inquiry_message', payload);
        setInputMsg('');
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        
        setIsUploading(true);
        const toastId = toast.loading('Uploading file...');
        try {
            const res = await axios.post('/web-inquiry/upload', formData);
            if (res.data.success && socketRef.current && selectedInquiry) {
                socketRef.current.emit('send_web_inquiry_message', {
                    inquiryId: selectedInquiry.id,
                    businessId: selectedInquiry.businessId,
                    message: '',
                    mediaUrl: res.data.fileUrl,
                    mediaType: file.type.startsWith('image/') ? 'image' : 'document'
                });
                toast.success('File sent', { id: toastId });
            }
        } catch (err) {
            toast.error('Upload failed', { id: toastId });
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    const resolveInquiry = async () => {
        if (!selectedInquiry) return;
        try {
            const res = await axios.post('/web-inquiry/resolve', { inquiryId: selectedInquiry.id });
            if (res.data.success) {
                toast.success("Inquiry marked as resolved");
                setInquiries(prev => prev.map(inq => inq.id === selectedInquiry.id ? { ...inq, status: 'RESOLVED' } : inq));
                setSelectedInquiry({ ...selectedInquiry, status: 'RESOLVED' });
            }
        } catch (error) {
            toast.error("Failed to resolve inquiry");
        }
    };

    const backendBaseUrl = axios.defaults.baseURL.replace('/api', '');

    return (
        <div className="h-full flex flex-col md:flex-row bg-[#0a0f1c] text-gray-200 w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            {/* LEFT PANEL - Chat List */}
            <div className={`w-full md:w-1/3 lg:w-[350px] flex flex-col border-r border-white/10 bg-[#121927] ${selectedInquiry ? 'hidden md:flex' : 'flex'}`}>
                {/* Header */}
                <div className="p-4 border-b border-white/10 shrink-0 bg-white/5">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <MessageCircle size={20} className="text-blue-400" /> Web Inquiries
                    </h2>
                    
                    <select 
                        value={selectedBusiness} 
                        onChange={(e) => { setSelectedBusiness(e.target.value); setSelectedInquiry(null); }}
                        className="mt-3 w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        {businesses.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {inquiries.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 text-sm">No inquiries found.</div>
                    ) : (
                        inquiries.map(inq => (
                            <div 
                                key={inq.id}
                                onClick={() => setSelectedInquiry(inq)}
                                className={`p-4 border-b border-white/5 cursor-pointer transition-colors ${selectedInquiry?.id === inq.id ? 'bg-blue-500/20 border-l-4 border-l-blue-500' : 'hover:bg-white/5 border-l-4 border-l-transparent'}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-semibold text-gray-100 truncate flex-1">{inq.name}</h4>
                                    <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                                        {inq.lastMessageAt ? new Date(inq.lastMessageAt).toLocaleDateString() : ''}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <p className="text-gray-400 truncate flex-1">{inq.lastMessage || 'New Inquiry'}</p>
                                    {inq.unreadCount > 0 && (
                                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2">
                                            {inq.unreadCount}
                                        </span>
                                    )}
                                </div>
                                <div className="mt-2 text-[10px] text-gray-500 flex items-center gap-2 uppercase tracking-wide">
                                    <span className={`px-1.5 py-0.5 rounded ${inq.status === 'OPEN' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                        {inq.status}
                                    </span>
                                    {inq.course && <span className="truncate max-w-[120px]">{inq.course.code}</span>}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* MIDDLE PANEL - Chat View */}
            <div className={`flex-1 flex flex-col bg-[#0B1120] relative ${!selectedInquiry ? 'hidden md:flex' : 'flex'}`}>
                {selectedInquiry ? (
                    <>
                        {/* Header */}
                        <div className="h-16 px-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/5 backdrop-blur-md">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setSelectedInquiry(null)} className="md:hidden text-gray-400 hover:text-white">
                                    <ChevronRight size={24} className="rotate-180" />
                                </button>
                                <div>
                                    <h3 className="font-bold text-gray-100 text-lg">{selectedInquiry.name}</h3>
                                    <p className="text-xs text-gray-400 flex items-center gap-2">
                                        {selectedInquiry.phone} {selectedInquiry.optionalPhone && `/ ${selectedInquiry.optionalPhone}`}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {selectedInquiry.status === 'OPEN' ? (
                                    <button 
                                        onClick={resolveInquiry}
                                        className="text-xs bg-green-500/20 hover:bg-green-500/30 text-green-400 px-3 py-1.5 rounded flex items-center gap-1 transition-colors border border-green-500/30"
                                    >
                                        <CheckCircle2 size={14} /> Resolve
                                    </button>
                                ) : (
                                    <span className="text-xs bg-gray-500/20 text-gray-400 px-3 py-1.5 rounded flex items-center gap-1 border border-gray-500/30">
                                        <ShieldAlert size={14}/> Resolved
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ backgroundImage: 'url("/chat-bg.png")', backgroundSize: 'contain', backgroundBlendMode: 'overlay', backgroundColor: 'rgba(11,17,32,0.95)' }}>
                            {messages.map((msg, idx) => {
                                const isStaff = msg.direction === 'outbound';
                                
                                return (
                                    <div key={idx} className={`flex ${isStaff ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[75%] rounded-2xl px-5 py-3 shadow-md relative ${
                                            isStaff ? 'bg-blue-600/90 text-white rounded-br-sm' : 'bg-white/10 border border-white/10 text-gray-200 rounded-bl-sm'
                                        }`}>
                                            {isStaff && msg.senderName && (
                                                <p className="text-[10px] text-blue-200 font-bold mb-1">{msg.senderName}</p>
                                            )}
                                            
                                            {/* Media Rendering */}
                                            {msg.mediaUrl && (
                                                <div className="mb-3">
                                                    {msg.mediaType === 'image' ? (
                                                        <img src={`${backendBaseUrl}/storage/images/chat_uploads/${msg.mediaUrl}`} alt="attachment" className="rounded-xl max-h-60 object-contain bg-black/50 w-full cursor-pointer hover:opacity-90 border border-white/10" onClick={()=>window.open(`${backendBaseUrl}/storage/images/chat_uploads/${msg.mediaUrl}`, '_blank')}/>
                                                    ) : (
                                                        <a href={`${backendBaseUrl}/storage/images/chat_uploads/${msg.mediaUrl}`} target="_blank" rel="noreferrer" className={`flex items-center gap-2 p-3 rounded-xl text-sm font-bold underline border ${isStaff ? 'bg-blue-800/50 border-blue-500' : 'bg-black/30 border-white/20'}`}>
                                                            <Paperclip size={16} /> View Document
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                            
                                            {/* Text Message */}
                                            {msg.message && (
                                                <p className="text-[15px] leading-relaxed break-words">{msg.message}</p>
                                            )}
                                            
                                            <div className={`flex items-center justify-end gap-1 mt-2 ${isStaff ? 'text-blue-200' : 'text-gray-400'}`}>
                                                <span className="text-[10px] font-medium">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        {selectedInquiry.status === 'OPEN' && (
                            <form onSubmit={sendMessage} className="p-4 border-t border-white/10 bg-white/5 flex items-end gap-3 shrink-0">
                                <div className="relative flex-1 bg-black/30 border border-white/10 rounded-2xl flex items-center pr-2 transition-all focus-within:border-blue-500/50 focus-within:bg-black/50">
                                    <input 
                                        type="file" 
                                        id="staff-chat-upload" 
                                        className="hidden" 
                                        onChange={handleFileUpload} 
                                        accept="image/*,application/pdf"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => document.getElementById('staff-chat-upload').click()}
                                        className="text-gray-400 hover:text-blue-400 p-3 rounded-full transition-colors shrink-0"
                                    >
                                        <Paperclip size={20} />
                                    </button>
                                    <input
                                        type="text"
                                        value={inputMsg}
                                        onChange={e => setInputMsg(e.target.value)}
                                        placeholder="Type a message to the student..."
                                        className="w-full bg-transparent text-gray-200 pl-2 pr-4 py-3.5 text-sm focus:outline-none"
                                    />
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={!inputMsg.trim() || isUploading}
                                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-2xl p-3.5 shrink-0 transition-colors shadow-lg shadow-blue-500/20"
                                >
                                    <Send size={20} />
                                </button>
                            </form>
                        )}
                        
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                        <MessageCircle size={64} className="mb-4 opacity-20" />
                        <p>Select an inquiry from the list to start messaging.</p>
                    </div>
                )}
            </div>

            {/* RIGHT PANEL - Info (Hidden on small screens) */}
            {selectedInquiry && (
                <div className="hidden lg:flex w-[300px] flex-col border-l border-white/10 bg-[#121927]">
                    <div className="p-6 border-b border-white/10 flex flex-col items-center justify-center bg-white/5">
                        {selectedInquiry.student?.image ? (
                            <img src={`${backendBaseUrl}/storage/profiles/${selectedInquiry.student.image}`} alt="profile" className="w-24 h-24 rounded-full object-cover border-4 border-white/10 mb-4" />
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-black/30 border-4 border-white/10 mb-4 flex items-center justify-center text-gray-400">
                                <User size={40} />
                            </div>
                        )}
                        <h3 className="font-bold text-lg text-white text-center leading-tight">{selectedInquiry.name}</h3>
                        <p className="text-sm text-gray-400 mt-1">Student</p>
                    </div>
                    
                    <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Contact Info</h4>
                            <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                                <p className="text-sm text-gray-300 font-mono mb-1">{selectedInquiry.phone}</p>
                                {selectedInquiry.optionalPhone && <p className="text-sm text-gray-300 font-mono">{selectedInquiry.optionalPhone}</p>}
                            </div>
                        </div>

                        {selectedInquiry.course && (
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Inquiry Course</h4>
                                <div className="bg-black/30 rounded-xl p-3 border border-white/5 border-l-4 border-l-blue-500">
                                    <p className="text-sm font-semibold text-white">{selectedInquiry.course.name}</p>
                                    <p className="text-xs text-blue-400 font-bold mt-1 uppercase tracking-widest">{selectedInquiry.course.code}</p>
                                </div>
                            </div>
                        )}

                        <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Inquiry Details</h4>
                            <div className="bg-black/30 rounded-xl p-3 border border-white/5 space-y-2 text-sm text-gray-400">
                                <div className="flex justify-between">
                                    <span>Status:</span>
                                    <span className={`font-bold ${selectedInquiry.status === 'OPEN' ? 'text-green-400' : 'text-gray-400'}`}>{selectedInquiry.status}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Created:</span>
                                    <span>{new Date(selectedInquiry.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Assigned To:</span>
                                    <span>{selectedInquiry.assignedUser ? `${selectedInquiry.assignedUser.firstName}` : 'Unassigned'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WebInquiries;
