import React from 'react';
import { useCall } from '../../contexts/CallContext';
import { FaPhoneSlash, FaMicrophone, FaMicrophoneSlash, FaSpinner } from 'react-icons/fa';

export default function GlobalOutboundCallWidget() {
  const { outboundCall, endOutboundCall, toggleOutboundMute } = useCall();

  if (!outboundCall) return null;

  const { lead, status, duration, isMuted, isSaving } = outboundCall;

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] pointer-events-auto">
      <div className="bg-slate-900/95 backdrop-blur-md border border-emerald-500/60 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.4)] px-5 py-3 flex items-center gap-4 animate-fade-in-down">
        
        {/* Avatar */}
        <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/40 rounded-xl flex items-center justify-center text-emerald-400 font-bold text-base shrink-0 shadow-inner">
          {lead?.name?.charAt(0) || '#'}
        </div>

        {/* Lead Info */}
        <div className="flex flex-col min-w-[130px]">
          <h4 className="text-white font-black text-[15px] tracking-wider truncate max-w-[160px] uppercase font-['Syncopate'] drop-shadow-md">
            {lead?.name || 'Customer'}
          </h4>
          <span className="text-emerald-400 font-mono text-xs font-bold tracking-widest mt-0.5">
            {lead?.phone ? lead.phone.split('_')[0] : ''}
          </span>
        </div>

        {/* Call States */}
        {isSaving ? (
          <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold px-2">
            <FaSpinner className="animate-spin text-blue-400" size={14} /> Saving...
          </div>
        ) : (
          <>
            {(status === 'DIALING' || status === 'RINGING') && (
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs animate-pulse px-2">
                <FaSpinner className="animate-spin" size={14} />
                <span>{status === 'DIALING' ? 'Dialing...' : 'Ringing...'}</span>
              </div>
            )}

            {status === 'CONNECTED' && (
              <div className="flex items-center gap-3">
                <span className="text-emerald-400 font-mono text-base font-bold bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                  {formatTime(duration)}
                </span>

                <button 
                  onClick={toggleOutboundMute} 
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all shadow-md ${
                    isMuted ? 'bg-amber-500 hover:bg-amber-400' : 'bg-slate-800 hover:bg-slate-700 border border-slate-700'
                  }`}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <FaMicrophoneSlash size={14} /> : <FaMicrophone size={14} />}
                </button>
              </div>
            )}

            <button 
              onClick={endOutboundCall} 
              className="w-9 h-9 bg-red-600 hover:bg-red-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-600/30 transition-all hover:scale-105 shrink-0"
              title="End Call"
            >
              <FaPhoneSlash size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
