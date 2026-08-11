import React, { useState } from 'react';
import { Share2, Image, MessageCircle, Calendar, Video } from 'lucide-react';

export default function SocialMediaStaffDashboard({ loggedInUser }) {
  const [activeTab, setActiveTab] = useState('tasks');

  return (
    <div className="h-full flex flex-col animate-fade-in-up">
      {/* Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
        
        {activeTab === 'tasks' && (
           <div className="bg-[#1e293b] p-8 rounded-2xl border border-white/5 shadow-md flex flex-col items-center justify-center min-h-[400px] text-center">
             <Calendar size={48} className="text-slate-600 mb-4" />
             <h2 className="text-xl font-bold text-white mb-2">No Pending Tasks</h2>
             <p className="text-slate-400 max-w-md">Your manager has not assigned any tasks for today. Check back later.</p>
           </div>
        )}

        {activeTab === 'content' && (
           <div className="bg-[#1e293b] p-8 rounded-2xl border border-white/5 shadow-md flex flex-col items-center justify-center min-h-[400px] text-center">
             <Image size={48} className="text-slate-600 mb-4" />
             <h2 className="text-xl font-bold text-white mb-2">Content Library</h2>
             <p className="text-slate-400 max-w-md">Access images, videos, and copywriting assets here.</p>
           </div>
        )}

        {activeTab === 'messages' && (
           <div className="bg-[#1e293b] p-8 rounded-2xl border border-white/5 shadow-md flex flex-col items-center justify-center min-h-[400px] text-center">
             <MessageCircle size={48} className="text-slate-600 mb-4" />
             <h2 className="text-xl font-bold text-white mb-2">Comments & Engagements</h2>
             <p className="text-slate-400 max-w-md">Respond to Facebook/Instagram comments and messages directly.</p>
           </div>
        )}

      </div>
    </div>
  );
}
