import React, { useState, useEffect } from 'react';
import { Send, MessageSquare, Trash2, X, UploadCloud, Users, Sparkles, Smartphone, CheckCircle, Megaphone } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

export default function AnnouncementsManager({ loggedInUser }) {
    const userRole = loggedInUser?.role ? loggedInUser.role.toUpperCase() : 'STAFF';
    const isSystemAdmin = userRole === 'SYSTEM_ADMIN' || userRole === 'SYSTEM ADMIN' || userRole === 'DIRECTOR';

    const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'events'
    const [loading, setLoading] = useState(false);
    
    // Post States
    const [postsList, setPostsList] = useState([]);
    const [businesses, setBusinesses] = useState([]);
    const [postBatches, setPostBatches] = useState([]);
    const [postBizId, setPostBizId] = useState('all');
    
    // Event Animation States (System Admin Only)
    const [activeAppEvent, setActiveAppEvent] = useState('none'); 
    const [maintenanceMode, setMaintenanceMode] = useState(false);

    // App Events Types
    const appEvents = [
        { id: 'none', name: 'No Animation', icon: '🚫', desc: 'Default app experience' },
        { id: 'vesak', name: 'Vesak Lanterns', icon: '🏮', desc: 'Vesak lanterns floating animation' },
        { id: 'poya', name: 'Bo Leaves (Poya)', icon: '🍃', desc: 'Falling Bo leaves animation' },
        { id: 'christmas', name: 'Christmas Snow', icon: '❄️', desc: 'Snowfall animation across the app' },
        { id: 'new_year', name: 'New Year Fireworks', icon: '🎆', desc: 'Fireworks effect on dashboard' }
    ];

    useEffect(() => {
        fetchPosts();
        if (isSystemAdmin) {
            api.get('/admin/businesses').then(res => setBusinesses(res.data?.businesses || res.data || [])).catch(console.error);
            
            // 🔥 මේක දාන්න - Currently Active Animation එක ගන්නවා 🔥
            api.get('/admin/settings/app-event').then(res => setActiveAppEvent(res.data.activeEvent)).catch(console.error);
            // 🔥 System Maintenance Mode එක ගන්නවා 🔥
            api.get('/admin/settings/maintenance-mode').then(res => setMaintenanceMode(res.data.active)).catch(console.error);
        } else {
            api.get('/admin/businesses').then(res => { 
                const list = res.data?.businesses || res.data?.data || res.data || []; 
                if (list.length === 1) { 
                    setPostBizId(String(list[0].id)); 
                } else { 
                    setBusinesses(list); 
                } 
            });
        }
    }, [isSystemAdmin, loggedInUser]);

    useEffect(() => {
        if (postBizId === 'all' || !postBizId) { setPostBatches([]); return; }
        api.get(`/admin/batches/${postBizId}`).then(res => {
            const fetched = res.data.batches || res.data || [];
            setPostBatches(Array.isArray(fetched) ? fetched : []);
        }).catch(console.error);
    }, [postBizId]);

    const fetchPosts = async () => {
        try {
            const res = await api.get('/admin/manager/posts');
            setPostsList(res.data || []);
        } catch (e) { toast.error("Failed to load posts"); }
    };

    const handlePostSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.target);
        try {
            await api.post('/admin/manager/post/create', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
            toast.success("Post Published & Push Notification Sent!");
            fetchPosts(); 
            e.target.reset();
        } catch (err) {
            toast.error("Failed to publish post.");
        } finally { setLoading(false); }
    };

    const handleDeletePost = async (id) => {
        if(!window.confirm("Delete this announcement?")) return;
        try { 
            await api.delete('/admin/manager/post/delete', { data: { post_id: id } }); 
            fetchPosts(); 
            toast.success("Deleted Successfully!"); 
        } 
        catch(e) { toast.error("Failed to delete"); }
    };

    const saveAppEvent = async (eventId) => {
        setActiveAppEvent(eventId);
        try {
            // 🔥 මේක දාන්න - Animation එක DB එකට සේව් කරනවා 🔥
            await api.put('/admin/settings/app-event', { eventId });
            toast.success(`App Animation updated to: ${appEvents.find(e => e.id === eventId).name}`);
        } catch (error) {
            toast.error("Failed to update app event");
        }
    };

    const toggleMaintenanceMode = async (newVal) => {
        setMaintenanceMode(newVal);
        try {
            await api.put('/admin/settings/maintenance-mode', { 
                active: newVal, 
                messageEn: "System is under update. Some features may not work properly. If you face any issues, please mention in the WhatsApp group.",
                messageSi: "පද්ධතිය යාවත්කාලීන වෙමින් පවතී. සමහර පහසුකම් නිසියාකාරව ක්‍රියා නොකිරීමට ඉඩ ඇත. යම් ගැටලුවක් ඇත්නම් කරුණාකර WhatsApp Group එකට දැනුම් දෙන්න." 
            });
            toast.success(`System Maintenance Mode ${newVal ? 'ACTIVATED' : 'DEACTIVATED'}!`);
        } catch (error) {
            toast.error("Failed to update maintenance mode");
            setMaintenanceMode(!newVal);
        }
    };

    const getBaseUrl = () => {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            let url = api.defaults.baseURL || 'http://localhost:5000/api';
            return url.replace('/api', '');
        }
        return 'https://imacampus.online';
    };

    const getPostImageUrl = (imageName) => (!imageName || imageName === 'default.png') ? null : `${getBaseUrl()}/storage/posts/${imageName}`;

    return (
        <div className="w-full animate-fade-in pb-4 flex flex-col font-sans h-full">
            {/* HEADER */}
            <div className="mb-8 bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl flex flex-col md:flex-row justify-between md:items-center gap-5 shadow-lg shrink-0">
                <div>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-4 tracking-tight drop-shadow-md">
                        <Megaphone className="text-purple-400" size={32}/> Announcements & Events
                    </h2>
                    <p className="text-gray-400 text-sm mt-2 font-medium">Manage push notifications, posts and mobile app experience.</p>
                </div>
                <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/10 shadow-inner w-max">
                    <button onClick={() => setActiveTab('posts')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all outline-none ${activeTab === 'posts' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>Announcements</button>
                    {isSystemAdmin && (
                        <button onClick={() => setActiveTab('events')} className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all outline-none ${activeTab === 'events' ? 'bg-brand-accent text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                            <Sparkles size={16}/> System Settings
                        </button>
                    )}
                </div>
            </div>

            {/* TAB: ANNOUNCEMENTS */}
            {activeTab === 'posts' && (
                <div className="flex flex-col lg:flex-row gap-6 flex-1 h-full min-h-0">
                    
                    {/* CREATE POST FORM */}
                    <div className="w-full lg:w-[400px] xl:w-[450px] bg-white/5 border border-white/10 rounded-[2rem] p-6 shadow-lg backdrop-blur-xl shrink-0 h-max">
                        <h3 className="text-lg font-extrabold text-white flex items-center gap-3 mb-6"><Send className="text-purple-400" size={20}/> Create New Post</h3>
                        <form onSubmit={handlePostSubmit} className="space-y-5">
                            <div>
                                <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Post Title *</label>
                                <input type="text" name="title" required className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500 transition-all shadow-inner" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Description *</label>
                                <textarea name="description" required rows="4" className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500 transition-all resize-none shadow-inner"></textarea>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Image (Optional)</label>
                                <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-white/20 rounded-xl bg-black/20 cursor-pointer hover:bg-white/5 transition-colors">
                                    <UploadCloud size={24} className="text-gray-400 mb-2"/>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Click to Upload</span>
                                    <input type="file" name="image" accept="image/*" className="hidden" />
                                </label>
                            </div>
                            
                            <div className="bg-purple-500/10 p-4 rounded-xl border border-purple-500/20 space-y-4 shadow-sm">
                                <h4 className="text-xs font-bold text-purple-300 uppercase tracking-widest flex items-center gap-2"><Users size={14}/> Target Audience</h4>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 mb-1.5 block">Select Business</label>
                                    <select name="businessId" value={postBizId} onChange={(e) => setPostBizId(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white outline-none focus:border-purple-500 cursor-pointer">
                                        {isSystemAdmin ? (
                                            <>
                                                <option value="all">All Businesses (Global)</option>
                                                {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                            </>
                                        ) : (
                                            businesses.length > 1 ? (
                                                <>
                                                    <option value="all">All My Businesses</option>
                                                    {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                                </>
                                            ) : (
                                                businesses.length === 1 ? (
                                                    <option value={businesses[0].id}>{businesses[0].name}</option>
                                                ) : (
                                                    <option value="all">My Business Only</option>
                                                )
                                            )
                                        )}
                                    </select>
                                </div>
                                {postBizId !== 'all' && (
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 mb-1.5 block">Select Batch</label>
                                        <select name="batchId" className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white outline-none focus:border-purple-500 cursor-pointer">
                                            <option value="all">All Batches</option>
                                            {postBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <button type="submit" disabled={loading} className="w-full bg-purple-600/90 hover:bg-purple-600 text-white font-extrabold py-3.5 rounded-xl shadow-lg transition-transform hover:scale-[1.02] flex justify-center items-center gap-2 outline-none uppercase text-xs tracking-wide">
                                {loading ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"/> : <><Send size={16}/> Publish & Notify</>}
                            </button>
                        </form>
                    </div>

                    {/* RECENT POSTS LIST */}
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-[2rem] p-6 shadow-lg backdrop-blur-xl overflow-hidden flex flex-col h-full min-h-[500px]">
                        <h3 className="text-lg font-extrabold text-white flex items-center gap-3 mb-6 shrink-0"><MessageSquare className="text-blue-400" size={20}/> Recent Announcements</h3>
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                            {postsList.length === 0 ? <p className="text-gray-500 text-center py-10 font-bold">No announcements found.</p> : 
                            postsList.map(post => (
                                <div key={post.id} className="bg-black/20 border border-white/5 p-5 rounded-2xl flex flex-col sm:flex-row gap-5 items-start hover:border-white/20 transition-all group">
                                    {post.image && post.image !== 'default.png' && (
                                        <img src={getPostImageUrl(post.image)} alt="Post" className="w-full sm:w-32 h-24 object-cover rounded-xl border border-white/10 bg-white/80 p-0.5" />
                                    )}
                                    <div className="flex-1 min-w-0 w-full">
                                        <div className="flex justify-between items-start gap-4">
                                            <h4 className="text-base font-extrabold text-white mb-1 truncate">{post.title}</h4>
                                            <button onClick={() => handleDeletePost(post.id)} className="text-red-400/50 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 p-2 rounded-lg transition-colors outline-none shrink-0"><Trash2 size={16}/></button>
                                        </div>
                                        <p className="text-gray-400 text-xs line-clamp-2 mb-3">{post.caption}</p>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="text-[10px] font-bold bg-white/5 border border-white/10 text-gray-400 px-2.5 py-1 rounded-md">{new Date(post.created_at).toLocaleDateString()}</span>
                                            {post.business_id && <span className="text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2.5 py-1 rounded-md">Targeted: {post.Business?.name || 'Business'}</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: SYSTEM SETTINGS (SYSTEM ADMIN ONLY) */}
            {activeTab === 'events' && isSystemAdmin && (
                <div className="flex flex-col gap-6 flex-1 h-full min-h-0 overflow-y-auto custom-scrollbar pb-10">
                    
                    {/* 🔥 SYSTEM MAINTENANCE TOGGLE 🔥 */}
                    <div className="bg-white/5 border border-amber-500/30 rounded-[2rem] p-6 md:p-8 shadow-lg backdrop-blur-xl">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-5">
                                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/30 shadow-lg">
                                    <Megaphone size={24} className="text-amber-400"/>
                                </div>
                                <div>
                                    <h2 className="text-xl md:text-2xl font-black text-white drop-shadow-md">Global System Maintenance Mode</h2>
                                    <p className="text-gray-400 text-sm mt-1 font-medium">Turn this on to display a global warning banner to all staff across the CRM system.</p>
                                </div>
                            </div>
                            
                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                <input type="checkbox" className="sr-only peer" checked={maintenanceMode} onChange={(e) => toggleMaintenanceMode(e.target.checked)} />
                                <div className="w-16 h-8 bg-black/50 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500 border border-white/20"></div>
                                <span className={`ml-4 text-sm font-bold uppercase tracking-wider ${maintenanceMode ? 'text-amber-400' : 'text-gray-500'}`}>{maintenanceMode ? 'ACTIVE' : 'OFF'}</span>
                            </label>
                        </div>
                        {maintenanceMode && (
                            <div className="mt-6 bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-start gap-4">
                                <span className="text-amber-500 text-2xl mt-1">⚠️</span>
                                <div>
                                    <p className="text-amber-200 font-bold mb-1">Banner is currently LIVE across the system!</p>
                                    <p className="text-amber-200/70 text-xs">All coordinators, managers, and callers will see the update warning.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* APP EVENTS */}
                    <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 md:p-8 shadow-lg backdrop-blur-xl">
                        <div className="max-w-4xl mx-auto">
                            <div className="text-center mb-10">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-accent/20 mb-4 border border-brand-accent/30 shadow-lg">
                                    <Smartphone size={32} className="text-brand-accent"/>
                                </div>
                                <h2 className="text-2xl md:text-3xl font-black text-white drop-shadow-md">Mobile App Animations</h2>
                                <p className="text-gray-400 mt-2 font-medium">Select an event to trigger special animations inside the student mobile app.</p>
                            </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {appEvents.map(event => (
                                <div 
                                    key={event.id}
                                    onClick={() => saveAppEvent(event.id)}
                                    className={`relative cursor-pointer p-6 rounded-2xl border-2 transition-all flex items-center gap-5 ${activeAppEvent === event.id ? 'bg-brand-accent/10 border-brand-accent shadow-[0_0_20px_rgba(225,29,72,0.2)]' : 'bg-black/30 border-white/5 hover:border-white/20 hover:bg-black/50'}`}
                                >
                                    {activeAppEvent === event.id && (
                                        <div className="absolute top-4 right-4 text-brand-accent animate-bounce"><CheckCircle size={20}/></div>
                                    )}
                                    <div className="text-4xl drop-shadow-lg">{event.icon}</div>
                                    <div>
                                        <h3 className={`text-lg font-black ${activeAppEvent === event.id ? 'text-white' : 'text-slate-300'}`}>{event.name}</h3>
                                        <p className="text-xs text-gray-500 font-medium mt-1">{event.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="mt-10 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 flex items-start gap-4">
                            <div className="text-blue-400 mt-1"><Sparkles size={20}/></div>
                            <p className="text-sm text-blue-200/80 font-medium leading-relaxed">
                                <strong className="text-blue-300">How it works:</strong> Selecting an event above will immediately activate the corresponding animation for all students using the mobile app. To remove the animation when the event is over, simply select <strong>"No Animation"</strong>.
                            </p>
                        </div>
                    </div>
                    </div>
                </div>
            )}
        </div>
    );
}