import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { Loader2, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function Login({ setLoggedInUser }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleUsernameChange = (e) => {
    // Only allow numbers and the + sign (no spaces, no letters)
    let val = e.target.value.replace(/[^0-9+]/g, '');
    // Allow any length for international numbers
    setUsername(val);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { phone: username, password });
      
      if (res.data.token && res.data.user) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        
        setLoggedInUser(res.data.user);
        toast.success(`Welcome back, ${res.data.user.firstName}!`);
        
        // Role-based Redirect
        const role = res.data.user.role?.toUpperCase(); // එන role එක Capital කරගන්නවා
        
        if(role === 'USER' || role === 'STUDENT') {
            navigate('/student/dashboard');
        } else if (role === 'MANAGER' || role === 'ASS MANAGER') {
            navigate('/manager/dashboard'); 
        } else if (role === 'COORDINATOR') {
            navigate('/coordinator/dashboard');
        } else if (role === 'FINANCE') {
            navigate('/admin/finance'); 
        } else {
            navigate('/admin/dashboard'); // වෙන මුකුත් නැත්නම් Admin එකට
        }
      }
    } catch (error) {
      toast.error('ඔබගේ මුරපදය හෝ දුරකථන අංකය වැරදියි.');
      setLoading(false);
    }
  };

  return (
    <div className="sm48-login sm48-canvas min-h-screen w-full flex items-stretch p-3 sm:p-4 gap-3 font-sans">

      {/* Brand panel (hidden on small screens) */}
      <section className="sm48-keep-dark hidden lg:flex relative flex-1 overflow-hidden rounded-[28px] bg-[#0B0F14] border border-[#1C2329] p-12 flex-col justify-between">
        <svg viewBox="0 0 600 600" aria-hidden="true" className="absolute -right-40 -bottom-48 w-[640px] h-[640px] pointer-events-none">
          <circle cx="300" cy="300" r="290" fill="none" stroke="#161D23" strokeWidth="2" />
          <circle cx="300" cy="300" r="210" fill="none" stroke="#161D23" strokeWidth="2" />
          <circle cx="300" cy="300" r="130" fill="none" stroke="#161D23" strokeWidth="2" />
          <circle cx="190" cy="410" r="44" fill="#17B8AE" />
          <circle cx="430" cy="180" r="28" fill="#F26A21" />
        </svg>
        <img src="/sm48-logo-light.png" alt="SM Forty Eight" className="relative h-14 w-auto self-start object-contain" />
        <div className="relative max-w-lg">
          <p className="text-[13px] font-semibold tracking-[.14em] uppercase text-[#98A3AC] mb-4">Learning platform</p>
          <h1 className="text-[52px] leading-[1.02] font-extrabold tracking-tight text-[#F2F4F5]">
            Learn, teach and<br />run your campus<span className="text-[#F26A21]">.</span>
          </h1>
          <p className="mt-5 text-[16px] leading-relaxed text-[#A3ADB5] max-w-md">Live classes, recordings, papers, payments and CRM in one place.</p>
        </div>
        <div className="relative flex gap-3">
          <span className="px-4 py-2 rounded-full bg-[#F26A21] text-[#0B0F14] text-[13px] font-bold">Students</span>
          <span className="px-4 py-2 rounded-full bg-[#17B8AE] text-[#0B0F14] text-[13px] font-bold">Teachers</span>
          <span className="px-4 py-2 rounded-full bg-[#1A1F24] text-[#F2F4F5] text-[13px] font-bold">Staff</span>
        </div>
      </section>

      {/* Form panel */}
      <section className="flex-1 lg:flex-none lg:w-[520px] flex items-center justify-center rounded-[28px] bg-[var(--sm-tile,#111518)] p-6 sm:p-12">
        <div className="w-full max-w-[380px]">
          <img src="/sm48-mark-light.png" alt="SM Forty Eight" className="sm48-login-mark h-14 w-14 mb-8 object-contain rounded-2xl bg-[#0B0F14] p-1.5" />
          <h2 className="text-[30px] font-extrabold tracking-tight text-[var(--sm-text,#F2F4F5)]">Welcome back</h2>
          <p className="text-[var(--sm-muted,#98A3AC)] text-[15px] mt-2">Log in with your mobile number and password.</p>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <div>
              <label htmlFor="login-phone" className="text-[13px] font-semibold text-[var(--sm-muted,#98A3AC)] mb-2 block">Mobile number</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--sm-muted,#98A3AC)]"><User size={18} /></span>
                <input id="login-phone" type="tel" inputMode="tel" autoComplete="username" required value={username} onChange={handleUsernameChange}
                  className="w-full !h-12 !pl-12 pr-4 text-[15px]"
                  placeholder="07X XXX XXXX"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="text-[13px] font-semibold text-[var(--sm-muted,#98A3AC)] mb-2 block">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--sm-muted,#98A3AC)]"><Lock size={18} /></span>
                <input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full !h-12 !pl-12 !pr-12 text-[15px]"
                  placeholder="Your password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 w-12 flex items-center justify-center text-[var(--sm-muted,#98A3AC)] hover:text-[var(--sm-text,#F2F4F5)]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="sm48-btn-primary w-full h-12 rounded-full bg-[#F26A21] hover:bg-[#FF7D38] text-[#0B0F14] font-bold text-[15px] flex items-center justify-center gap-2 disabled:opacity-70 transition-colors"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <>Log in <ArrowRight size={18} /></>}
            </button>
          </form>

          <p className="mt-8 pt-6 border-t border-[var(--sm-line,#262D33)] text-[14px] text-[var(--sm-muted,#98A3AC)]">
            New student? <Link to="/register" className="text-[var(--sm-te-ink,#3FD3C8)] font-semibold hover:underline ml-1">Create an account</Link>
          </p>
        </div>
      </section>
    </div>
  );
}