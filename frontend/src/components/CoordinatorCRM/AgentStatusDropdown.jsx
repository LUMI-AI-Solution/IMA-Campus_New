import React, { useState, useEffect, useRef } from 'react';
import { useCall } from '../../contexts/CallContext';
import toast from 'react-hot-toast';
import { Activity, Coffee, UserX, PhoneOff, ChevronDown } from 'lucide-react';
import api from '../../api/axios';

export default function AgentStatusDropdown() {
    const getInitialStatus = () => localStorage.getItem('agentStatus') || 'OFFLINE';
    const [status, setStatus] = useState(getInitialStatus);
    const statusRef = useRef(getInitialStatus());
    const { socket } = useCall();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!socket) return;

        const handleConnect = () => {
            console.log('Agent Status Socket Connected');
            if (statusRef.current !== 'OFFLINE') {
                socket.emit('join_wa_agent_pool', { status: statusRef.current });
            }
        };

        socket.on('connect', handleConnect);
        
        // If socket is already connected when this effect runs, handleConnect manually
        if (socket.connected) {
            handleConnect();
        }

        return () => {
            socket.off('connect', handleConnect);
        };
    }, [socket]);

    const handleStatusChange = (newStatus) => {
        setStatus(newStatus);
        statusRef.current = newStatus;
        localStorage.setItem('agentStatus', newStatus);
        setIsOpen(false);
        if (socket) {
            if (newStatus === 'OFFLINE') {
                socket.emit('leave_wa_agent_pool');
            } else {
                socket.emit('join_wa_agent_pool', { status: newStatus });
            }
            toast.success(`Status updated to ${newStatus}`);
        }
    };

    const getStatusConfig = (currentStatus) => {
        switch (currentStatus) {
            case 'ACTIVE': return { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', icon: <Activity size={14} />, label: 'ACTIVE' };
            case 'LUNCH': return { color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/50', icon: <Coffee size={14} />, label: 'LUNCH' };
            case 'AWAY': return { color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/50', icon: <UserX size={14} />, label: 'AWAY' };
            default: return { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/50', icon: <PhoneOff size={14} />, label: 'OFFLINE' };
        }
    };

    const currentConfig = getStatusConfig(status);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all shadow-md border whitespace-nowrap ${currentConfig.bg} ${currentConfig.color} ${currentConfig.border}`}
            >
                {currentConfig.icon}
                STATUS: {currentConfig.label}
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 right-0 bg-[#0f172a] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 w-32 flex flex-col">
                    <button onClick={() => handleStatusChange('ACTIVE')} className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-emerald-400 hover:bg-white/5 transition-colors text-left"><Activity size={14} /> ACTIVE</button>
                    <button onClick={() => handleStatusChange('LUNCH')} className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-amber-400 hover:bg-white/5 transition-colors text-left"><Coffee size={14} /> LUNCH</button>
                    <button onClick={() => handleStatusChange('AWAY')} className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-orange-400 hover:bg-white/5 transition-colors text-left"><UserX size={14} /> AWAY</button>
                    <button onClick={() => handleStatusChange('OFFLINE')} className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-400 hover:bg-white/5 transition-colors text-left border-t border-white/5"><PhoneOff size={14} /> OFFLINE</button>
                </div>
            )}
        </div>
    );
}
