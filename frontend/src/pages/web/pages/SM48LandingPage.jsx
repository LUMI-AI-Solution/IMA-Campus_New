import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './sm48-landing.css';

/**
 * SM48 public landing page (route "/").
 * Static marketing markup + one effect that wires the small interactions
 * (theme toggle, mobile menu, stream filter, scroll reveal, register dialog).
 * Everything is scoped under .sm48l so it cannot affect the app screens.
 */
export default function SM48LandingPage() {
  const rootRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const ac = new AbortController();
    const on = (target, type, fn, opts) => target.addEventListener(type, fn, { ...(opts || {}), signal: ac.signal });
    let io = null;
    const prevTitle = document.title;
    document.title = 'SM Forty Eight · A/L classes, live and online';
    // eslint-disable-next-line
    (function () {


      var $=function(s,r){return (r||root).querySelector(s)},$$=function(s,r){return [].slice.call((r||root).querySelectorAll(s))};
      function sget(k){try{return localStorage.getItem(k)}catch(e){return null}}function sset(k,v){try{localStorage.setItem(k,v)}catch(e){}}
      /* theme */
      function setTheme(t){root.classList.toggle('is-light',t==='light');document.documentElement.classList.toggle('dark',t!=='light');try{localStorage.setItem('themeMode',t)}catch(e){};$$('[data-set-theme]').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.setTheme===t)});}
      setTheme(sget('themeMode')==='light'?'light':'dark');
      $$('[data-set-theme]').forEach(function(b){b.addEventListener('click',function(){setTheme(b.dataset.setTheme)})});
      /* nav */
      var nav=$('#nav');on(window,'scroll',function(){nav.classList.toggle('scrolled',scrollY>20)},{passive:true});
      var burger=$('#burger'),mnav=$('#mnav');
      function menu(o){mnav.classList.toggle('open',o);burger.setAttribute('aria-expanded',o)}
      burger.addEventListener('click',function(){menu(!mnav.classList.contains('open'))});
      $$('#mnav a').forEach(function(a){a.addEventListener('click',function(){menu(false)})});
      on(document,'keydown',function(e){if(e.key==='Escape')menu(false)});
      /* classes */
      var C=[
       {s:'phy',sub:'Combined Maths',title:'2027 Theory',glyph:'∫ dx',tag:'Enrolling',bg:'#F26A21',ink:'#0B0F14',ring:'rgba(11,15,20,.18)',dot:'#17B8AE',t:'Mr. Nuwan Jayasinghe',ti:'NJ',tc:'#17B8AE',meta:['Live','Sat & Wed','Sinhala'],fee:'3,500'},
       {s:'phy',sub:'Physics',title:'2027 Paper class',glyph:'λ = v/f',tag:'Popular',bg:'#17B8AE',ink:'#0B0F14',ring:'rgba(11,15,20,.18)',dot:'#F26A21',t:'Ms. Dilini Fernando',ti:'DF',tc:'#F26A21',meta:['Online','Sunday','Sinhala'],fee:'3,000'},
       {s:'phy bio',sub:'Chemistry',title:'2026 Theory',glyph:'C=C',tag:'Revision',bg:'#0B0F14',ink:'#F2F4F5',ring:'#222A31',dot:'#F26A21',t:'Mr. Ruwan Silva',ti:'RS',tc:'#F2C14E',meta:['Hall A','Tue & Fri','English'],fee:'3,000'},
       {s:'bio',sub:'Biology',title:'2026 Revision',glyph:'DNA',tag:'Enrolling',bg:'#17B8AE',ink:'#0B0F14',ring:'rgba(11,15,20,.18)',dot:'#0B0F14',t:'Dr. Amali Rodrigo',ti:'AR',tc:'#F26A21',meta:['Hall B','Monday','Sinhala'],fee:'3,000'},
       {s:'tec phy',sub:'ICT',title:'2027 Theory',glyph:'</>',tag:'New',bg:'#0B0F14',ink:'#F2F4F5',ring:'#222A31',dot:'#17B8AE',t:'Ms. Sachini Wijeratne',ti:'SW',tc:'#17B8AE',meta:['Lab 1','Thursday','Sinhala'],fee:'2,500'},
       {s:'com',sub:'Accounting',title:'2027 Theory',glyph:'Rs.',tag:'Enrolling',bg:'#F26A21',ink:'#0B0F14',ring:'rgba(11,15,20,.18)',dot:'#0B0F14',t:'[Teacher name]',ti:'—',tc:'#9AA8B3',meta:['Online','Saturday','Sinhala'],fee:'2,800'}
      ];
      $('#classGrid').innerHTML=C.map(function(c,i){return '<article class="cc rv d'+(i%3)+'" data-s="'+c.s+'"><div class="cover" style="background:'+c.bg+';color:'+c.ink+'"><svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="96" fill="none" stroke="'+c.ring+'" stroke-width="2"/><circle cx="100" cy="100" r="62" fill="none" stroke="'+c.ring+'" stroke-width="2"/><circle cx="100" cy="100" r="30" fill="none" stroke="'+c.ring+'" stroke-width="2"/><circle cx="38" cy="140" r="11" fill="'+c.dot+'"/></svg><span class="tg" style="background:'+(c.ink==='#0B0F14'?'rgba(11,15,20,.12)':'rgba(255,255,255,.1)')+'">'+c.tag+'</span><span class="g" aria-hidden="true">'+c.glyph.replace('<','&lt;').replace('>','&gt;')+'</span></div><div class="cb"><div><span style="font-size:13px;color:var(--mu);font-weight:600">'+c.sub+'</span><h3>'+c.title+'</h3></div><div class="meta">'+c.meta.map(function(m){return '<span>'+m+'</span>'}).join('')+'</div><div class="teacher"><i style="background:'+c.tc+'">'+c.ti+'</i>'+c.t+'</div><div class="price"><b>Rs. '+c.fee+' <small>/ month</small></b><button class="btn sm or" data-register>Enrol</button></div></div></article>'}).join('');
      $('#streamTabs').addEventListener('click',function(e){var b=e.target.closest('[data-s]');if(!b)return;
        $$('#streamTabs .tab').forEach(function(t){t.setAttribute('aria-selected',t===b)});
        $$('#classGrid .cc').forEach(function(c){var show=b.dataset.s==='all'||c.dataset.s.split(' ').indexOf(b.dataset.s)>-1;c.hidden=!show;if(show){c.classList.remove('in');requestAnimationFrame(function(){c.classList.add('in')})}})});
      /* reveal + counters */
      io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);
        $$('[data-count]',e.target).forEach(count)}})},{threshold:.15,rootMargin:'0px 0px -40px 0px'});
      $$('.rv').forEach(function(el){io.observe(el)});
      function count(el){if(el.dataset.done)return;el.dataset.done=1;var to=+el.dataset.count,t0=performance.now();
        (function f(t){var p=Math.min(1,(t-t0)/1400),v=Math.round(to*(1-Math.pow(1-p,3)));el.textContent=v.toLocaleString('en-US');if(p<1)requestAnimationFrame(f)})(t0)}
      /* register */
      var reg=$('#reg');
      on(document,'click',function(e){
        if(e.target.closest('[data-register]')){e.preventDefault();menu(false);navigate('/register');return}
      if(e.target.closest('[data-login]')){e.preventDefault();menu(false);navigate('/login');return}
        if(e.target.closest('[data-close]'))reg.close()});
      reg.addEventListener('click',function(e){if(e.target===reg)reg.close()});
      $('#r-stream').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;$$('#r-stream button').forEach(function(x){x.setAttribute('aria-pressed',x===b)})});
      $$('#regForm input').forEach(function(i){i.addEventListener('input',function(){i.closest('.field').classList.remove('bad')})});
      $('#regForm').addEventListener('submit',function(e){e.preventDefault();var ok=true,n=$('#r-name'),p=$('#r-phone');
        if(n.value.trim().length<2){n.closest('.field').classList.add('bad');n.focus();ok=false}
        if(!/^0?7\d ?\d{3} ?\d{4}$/.test(p.value.trim())){p.closest('.field').classList.add('bad');if(ok)p.focus();ok=false}
        if(!ok)return;
        $('#regName').textContent=n.value.trim().split(' ')[0];$('#regPhone').textContent=p.value.trim();
        $('#regForm').style.display='none';$('#regDone').style.display='flex'});

    })();
    return () => { ac.abort(); if (io) io.disconnect(); document.title = prevTitle; };
  }, [navigate]);

  return (
    <div className="sm48l" ref={rootRef}>
      {/* NAV */}
      <header className="nav" id="nav">
      <div className="wrap"><div className="nav-in">
      <a className="nav-logo" href="#top" aria-label="SM Forty Eight home"><img src="/sm48-logo-light.png" alt="SM Forty Eight" /></a>
      <nav className="links" aria-label="Main"><a href="#classes">Classes</a><a href="#features">Features</a><a href="#how">How it works</a><a href="#app">App</a><a href="#faq">FAQ</a></nav>
      <div className="seg-group" role="group" aria-label="Theme">
      <button className="seg" data-set-theme="light" aria-label="Light mode"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg></button>
      <button className="seg" data-set-theme="dark" aria-label="Dark mode"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg></button>
      </div>
      <a className="login" href="/login" data-login="">Log in</a>
      <button className="btn or sm" data-register="">Register</button>
      <button className="burger" id="burger" aria-label="Open menu" aria-expanded="false" aria-controls="mnav"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg></button>
      </div></div>
      </header>
      <div className="mnav" id="mnav">
      <a href="#classes">Classes</a><a href="#features">Features</a><a href="#how">How it works</a><a href="#app">App</a><a href="#faq">FAQ</a>
      <div className="row"><div className="seg-group" role="group" aria-label="Theme"><button className="seg" data-set-theme="light" aria-label="Light mode"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg></button><button className="seg" data-set-theme="dark" aria-label="Dark mode"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg></button></div><a href="/login" data-login="" style={{marginLeft:'auto',padding:'10px 14px'}}>Log in</a><button className="btn or sm" data-register="">Register</button></div>
      </div>

      <main id="top">
      {/* HERO */}
      <section className="hero dots">
      <div className="wrap">
      <div className="hero-grid">
      <div>
      <span className="pill rv"><b>NEW</b>2027 A/L classes now enrolling</span>
      <h1 className="h1 rv d1">Your A/L,<br /><span className="o">live</span> &amp; <span className="u">anytime<svg viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true"><path d="M2 14 Q 50 2 100 10 T 198 6" fill="none" stroke="#17B8AE" strokeWidth="5" strokeLinecap="round"/></svg></span>.</h1>
      <p className="lead rv d2">Join live classes with experienced A/L teachers, rewatch every lesson, sit paper classes and track your progress in one app.</p>
      <div className="cta-row rv d3">
      <button className="btn or" data-register="">Register for free<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
      <a className="btn line" href="#classes">Browse classes</a>
      </div>
      <div className="proof rv d4"><span className="faces" aria-hidden="true"><i style={{background:'#17B8AE'}}>KP</i><i style={{background:'#F26A21'}}>SR</i><i style={{background:'#F2C14E'}}>HM</i><i style={{background:'#9AA8B3'}}>TD</i></span><span><b className="num" data-count="4000">4,000</b><b>+</b> students already learning</span></div>
      </div>

      <div className="collage" aria-hidden="true">
      <div className="ct float rv d1" style={{gridColumn:'span 4',gridRow:'span 3',padding:'12px'}}>
      <div className="thumb"><svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" style={{position:'absolute',inset:'0',width:'100%',height:'100%'}}><circle cx="200" cy="125" r="170" fill="none" stroke="#151C22" strokeWidth="2"/><circle cx="200" cy="125" r="105" fill="none" stroke="#151C22" strokeWidth="2"/><circle cx="130" cy="190" r="26" fill="#17B8AE"/><text x="200" y="62" textAnchor="middle" fill="#26313A" fontFamily="Inter, sans-serif" fontSize="24" fontWeight="700">∫ u dv = uv − ∫ v du</text></svg><span className="play"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5l12 7-12 7z"/></svg></span><span className="live" style={{position:'absolute',left:'12px',top:'12px'}}><i></i>LIVE</span></div>
      <div style={{padding:'10px 6px 4px',display:'flex',flexDirection:'column',gap:'8px'}}><span style={{fontSize:'12.5px',color:'var(--or-ink)',fontWeight:'600'}}>Combined Maths · 2027</span><b style={{fontSize:'17px',letterSpacing:'-.02em'}}>Integration by parts</b><div className="bar"><i style={{width:'64%',background:'#F26A21'}}></i></div></div>
      </div>
      <div className="ct float b rv d2" style={{gridColumn:'span 2',gridRow:'span 2',background:'#F26A21',color:'#0B0F14'}}><span style={{fontSize:'13px',fontWeight:'600'}}>Streak</span><b style={{fontSize:'58px',letterSpacing:'-.06em',lineHeight:'.85',marginTop:'auto'}}>9</b><span style={{fontSize:'13px',fontWeight:'600'}}>days in a row</span></div>
      <div className="ct float c rv d3" style={{gridColumn:'span 2',gridRow:'span 2',alignItems:'center',justifyContent:'center'}}><svg viewBox="0 0 120 120" style={{width:'96px'}}><circle cx="60" cy="60" r="46" fill="none" stroke="var(--tile2)" strokeWidth="12"/><circle cx="60" cy="60" r="46" fill="none" stroke="#17B8AE" strokeWidth="12" strokeLinecap="round" strokeDasharray="223 289" transform="rotate(-90 60 60)"/><text x="60" y="66" textAnchor="middle" fill="var(--tx)" fontFamily="Inter, sans-serif" fontSize="22" fontWeight="800">77%</text></svg><span style={{fontSize:'12.5px',color:'var(--mu)'}}>weekly goal</span></div>
      <div className="ct float b rv d3" style={{gridColumn:'span 3',background:'#17B8AE',color:'#0B0F14',flexDirection:'row',alignItems:'center',gap:'12px'}}><span style={{width:'42px',height:'42px',borderRadius:'12px',background:'#0B0F14',color:'#F2F4F5',display:'flex',alignItems:'center',justifyContent:'center',flex:'none'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h12v12H3zM15 10l6-3v10l-6-3"/></svg></span><span><b style={{display:'block',fontSize:'15px'}}>Physics paper class</b><span style={{fontSize:'12.5px',fontWeight:'500'}}>Today · 12:30 PM</span></span></div>
      <div className="ct float c rv d4" style={{gridColumn:'span 3',flexDirection:'row',alignItems:'center',gap:'12px'}}><span style={{width:'42px',height:'42px',borderRadius:'12px',background:'var(--te-tint)',color:'var(--te-ink)',display:'flex',alignItems:'center',justifyContent:'center',flex:'none'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10"/></svg></span><span><b style={{display:'block',fontSize:'15px'}}>Paper marked: 78/100</b><span style={{fontSize:'12.5px',color:'var(--mu)'}}>Rank #12 in class</span></span></div>
      </div>
      </div>

      <div className="stats">
      <div className="stat rv"><b><span data-count="4000">4,000</span>+</b><span>students learning with us</span></div>
      <div className="stat rv d1"><b>4</b><span>A/L streams covered</span></div>
      <div className="stat rv d2"><b>Live + rec</b><span>every lesson recorded for you</span></div>
      <div className="stat rv d3"><b>24/7</b><span>access on phone or laptop</span></div>
      </div>
      </div>
      </section>

      {/* CLASSES */}
      <section className="sec" id="classes">
      <div className="wrap">
      <div className="sec-head">
      <div><span className="eyebrow rv"><i></i>Classes</span><h2 className="h2 rv d1">Pick your stream.<br />We'll handle the rest.</h2><p className="sub rv d2">Theory, revision and paper classes for every A/L stream, taught live and recorded for later.</p></div>
      <div className="tabs rv d2" role="tablist" aria-label="Streams" id="streamTabs">
      <button className="tab" role="tab" aria-selected="true" data-s="all">All</button><button className="tab" role="tab" aria-selected="false" data-s="phy">Physical Sci.</button><button className="tab" role="tab" aria-selected="false" data-s="bio">Biology</button><button className="tab" role="tab" aria-selected="false" data-s="com">Commerce</button><button className="tab" role="tab" aria-selected="false" data-s="tec">Technology</button>
      </div>
      </div>
      <div className="classes" id="classGrid"></div>
      </div>
      </section>

      {/* FEATURES */}
      <section className="sec" id="features" style={{paddingTop:'0'}}>
      <div className="wrap">
      <div className="sec-head"><div><span className="eyebrow rv"><i></i>Features</span><h2 className="h2 rv d1">Everything a serious<br />A/L student needs.</h2></div><p className="sub rv d2">One login for classes, notes, papers and payments. Parents get updates too.</p></div>
      <div className="feat">
      <div className="ft ink f2 r2 rv">
      <span className="fic" style={{background:'#F26A21',color:'#0B0F14'}}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h12v12H3zM15 10l6-3v10l-6-3"/></svg></span>
      <h3>Live classes, with real interaction</h3>
      <p>Ask questions during class, answer polls and get help from tutors in real time. Miss a class? The recording is ready the same day.</p>
      <div className="chat" aria-hidden="true">
      <div className="msg in"><b style={{color:'#FF8E52',fontSize:'12px',display:'block',marginBottom:'2px'}}>Tharindu</b>Sir, why is ln x the u here?</div>
      <div className="msg out">Its derivative is simple. LIATE puts logs first.</div>
      <div className="msg in"><b style={{color:'#3FD3C8',fontSize:'12px',display:'block',marginBottom:'2px'}}>Sanduni</b>Got it, thank you sir!</div>
      </div>
      <svg className="deco" viewBox="0 0 200 200" aria-hidden="true" style={{right:'-60px',top:'-60px',width:'240px',height:'240px',opacity:'.6'}}><circle cx="100" cy="100" r="96" fill="none" stroke="#1C242B" strokeWidth="2"/><circle cx="100" cy="100" r="60" fill="none" stroke="#1C242B" strokeWidth="2"/><circle cx="56" cy="140" r="12" fill="#17B8AE"/></svg>
      </div>
      <div className="ft te rv d1">
      <span className="fic" style={{background:'#0B0F14',color:'#F2F4F5'}}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM10 8.5l5 3.5-5 3.5z"/></svg></span>
      <h3>Rewatch anytime</h3><p>Every lesson recorded and protected, ready on any device.</p>
      </div>
      <div className="ft rv d2">
      <span className="fic" style={{background:'var(--or-tint)',color:'var(--or-ink)'}}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 3h6v3H9zM6 5h12v16H6zM9 11h6M9 15h4"/></svg></span>
      <h3>Paper classes</h3><p>Timed papers with marks, model answers and your class rank.</p>
      </div>
      <div className="ft or f2 rv d1">
      <div style={{display:'flex',justifyContent:'space-between',gap:'16px',flexWrap:'wrap'}}><div style={{maxWidth:'340px',display:'flex',flexDirection:'column',gap:'10px'}}><span className="fic" style={{background:'#0B0F14',color:'#F2F4F5'}}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg></span><h3>See your progress, every week</h3><p>Study time, attendance and marks in one view, so you always know where to focus.</p></div></div>
      <div className="bars" aria-hidden="true"><i style={{height:'40%'}}></i><i style={{height:'62%',transitionDelay:'.05s'}}></i><i style={{height:'35%',transitionDelay:'.1s'}}></i><i className="k" style={{height:'100%',transitionDelay:'.15s'}}></i><i style={{height:'58%',transitionDelay:'.2s'}}></i><i style={{height:'88%',transitionDelay:'.25s'}}></i><i style={{height:'28%',transitionDelay:'.3s'}}></i></div>
      </div>
      <div className="ft f2 rv d2" style={{flexDirection:'row',flexWrap:'wrap',gap:'20px',alignItems:'center'}}>
      <div style={{flex:'1 1 220px',display:'flex',flexDirection:'column',gap:'12px'}}><span className="fic" style={{background:'var(--te-tint)',color:'var(--te-ink)'}}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18v12H3zM3 10h18M7 15h3"/></svg></span>
      <h3>Pay online, get receipts instantly</h3><p>Pay monthly fees by card or bank transfer from home. No queues at the front office.</p></div>
      <div aria-hidden="true" style={{flex:'1 1 200px',borderRadius:'20px',background:'var(--tile2)',padding:'16px',display:'flex',flexDirection:'column',gap:'10px',fontSize:'13px'}}><div style={{display:'flex',justifyContent:'space-between'}}><b>Receipt R-26841</b><span style={{color:'var(--te-ink)',fontWeight:'700'}}>Paid</span></div><div style={{display:'flex',justifyContent:'space-between',color:'var(--mu)'}}><span>Combined Maths · Nov</span><span>Rs. 3,500</span></div><div style={{display:'flex',justifyContent:'space-between',color:'var(--mu)'}}><span>Physics · Nov</span><span>Rs. 3,000</span></div><div style={{display:'flex',justifyContent:'space-between',borderTop:'1px dashed var(--line)',paddingTop:'10px',fontWeight:'700',fontSize:'15px'}}><span>Total</span><span>Rs. 6,500</span></div></div>
      </div>
      <div className="ft f2 rv d3" style={{background:'var(--tile)'}}>
      <span className="fic" style={{background:'var(--or-tint)',color:'var(--or-ink)'}}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5h16v11H8l-4 4z"/></svg></span>
      <h3>Parents stay in the loop</h3>
      <div className="sms" style={{background:'var(--tile2)'}}><b style={{color:'var(--or-ink)'}}>SMS · SM48</b>Kavindi attended Combined Maths today and scored 78/100 in the paper class.</div>
      </div>
      </div>
      </div>
      </section>

      {/* HOW */}
      <section className="sec" id="how" style={{paddingTop:'0'}}>
      <div className="wrap">
      <div className="sec-head"><div><span className="eyebrow rv"><i></i>How it works</span><h2 className="h2 rv d1">Start learning in<br />three steps.</h2></div></div>
      <div className="steps">
      <div className="step rv"><span className="n" style={{background:'var(--or)',color:'#0B0F14'}}>1</span><h3>Register in a minute</h3><p>Sign up with your mobile number, choose your stream and A/L year.</p></div>
      <div className="step rv d1"><span className="n" style={{background:'var(--te)',color:'#0B0F14'}}>2</span><h3>Pick classes &amp; pay</h3><p>Enrol in the classes you need and pay monthly, online or at the front office.</p></div>
      <div className="step rv d2"><span className="n" style={{background:'var(--tx)',color:'var(--bg)'}}>3</span><h3>Join live or rewatch</h3><p>Attend live, watch recordings, sit papers and track your progress.</p></div>
      </div>
      </div>
      </section>

      {/* APP */}
      <section className="sec" id="app" style={{paddingTop:'0'}}>
      <div className="wrap">
      <div className="app rv">
      <svg viewBox="0 0 600 600" aria-hidden="true" style={{position:'absolute',right:'-180px',bottom:'-260px',width:'700px',height:'700px'}}><circle cx="300" cy="300" r="290" fill="none" stroke="#151C22" strokeWidth="2"/><circle cx="300" cy="300" r="210" fill="none" stroke="#151C22" strokeWidth="2"/><circle cx="300" cy="300" r="130" fill="none" stroke="#151C22" strokeWidth="2"/><circle cx="180" cy="420" r="40" fill="#17B8AE"/><circle cx="440" cy="170" r="26" fill="#F26A21"/></svg>
      <div style={{position:'relative'}}>
      <span className="eyebrow" style={{color:'#A3ADB5'}}><i></i>On your phone</span>
      <h2 className="h2">Your classroom,<br />in your pocket.</h2>
      <p style={{fontSize:'17px',lineHeight:'1.6',maxWidth:'460px'}}>Install SM48 on your phone straight from the browser. No app store needed.</p>
      <ul className="checks">
      <li><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>Class reminders before every live session</li>
      <li><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>Notes and tutes in one place</li>
      <li><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>Dark mode for late-night study</li>
      </ul>
      <div className="store"><button className="btn or" data-register="">Get started</button><a className="btn" href="#how" style={{background:'#1A1F24',color:'#F2F4F5'}}>How it works</a></div>
      </div>
      <div className="phone" aria-hidden="true">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 6px'}}><img src="/sm48-logo-light.png" alt="" style={{height:'30px'}} /><span style={{width:'30px',height:'30px',borderRadius:'50%',background:'#17B8AE',color:'#0B0F14',fontSize:'11px',fontWeight:'700',display:'flex',alignItems:'center',justifyContent:'center'}}>KP</span></div>
      <div className="pt" style={{background:'#111518'}}><span style={{fontSize:'11px',color:'#98A3AC'}}>Continue</span><b style={{fontSize:'16px',letterSpacing:'-.02em'}}>Integration by parts</b><div className="bar" style={{background:'#1A1F24'}}><i style={{width:'64%',background:'#F26A21'}}></i></div></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
      <div className="pt" style={{background:'#F26A21',color:'#0B0F14'}}><span style={{fontSize:'11px',fontWeight:'600'}}>Streak</span><b style={{fontSize:'34px',letterSpacing:'-.05em',lineHeight:'1'}}>9</b></div>
      <div className="pt" style={{background:'#17B8AE',color:'#0B0F14'}}><span style={{fontSize:'11px',fontWeight:'600'}}>Next live</span><b style={{fontSize:'22px',letterSpacing:'-.03em',lineHeight:'1.1'}}>12:30</b></div>
      </div>
      <div className="pt" style={{background:'#111518',gap:'8px'}}><span style={{fontSize:'11px',color:'#98A3AC'}}>Due soon</span><span style={{fontSize:'12.5px',display:'flex',gap:'8px',alignItems:'center'}}><i style={{width:'7px',height:'7px',borderRadius:'50%',background:'#F26A21'}}></i>Assignment 04: SHM</span><span style={{fontSize:'12.5px',display:'flex',gap:'8px',alignItems:'center'}}><i style={{width:'7px',height:'7px',borderRadius:'50%',background:'#17B8AE'}}></i>MCQ quiz: Alkenes</span></div>
      </div>
      </div>
      </div>
      </section>

      {/* FAQ */}
      <section className="sec" id="faq" style={{paddingTop:'0'}}>
      <div className="wrap faq">
      <div><span className="eyebrow rv"><i></i>FAQ</span><h2 className="h2 rv d1">Questions?<br />We've got answers.</h2><p className="sub rv d2">Still unsure? Call the front office on <b style={{color:'var(--tx)'}}>[PHONE NUMBER]</b> or message us on WhatsApp.</p></div>
      <div className="rv d1">
      <details open><summary>Can I join if I'm outside Colombo?<span aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg></span></summary><p>Yes. Every class is streamed live and recorded, so you can learn from anywhere in Sri Lanka with an internet connection.</p></details>
      <details><summary>What if I miss a live class?<span aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg></span></summary><p>The recording appears in your app the same day. You can watch it as many times as you like during the month you've paid for.</p></details>
      <details><summary>How do I pay class fees?<span aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg></span></summary><p>Pay monthly online by card or bank transfer, or in cash at the front office. You'll get a receipt by SMS instantly.</p></details>
      <details><summary>Can parents see my progress?<span aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg></span></summary><p>Yes. Guardians receive SMS updates on attendance, paper marks and payments.</p></details>
      <details><summary>Can I share my account?<span aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg></span></summary><p>No. Each account works on one device at a time to protect our teachers' content.</p></details>
      </div>
      </div>
      </section>

      {/* CTA BAND */}
      <section>
      <div className="wrap">
      <div className="band rv">
      <svg className="spin" viewBox="0 0 520 520" aria-hidden="true"><circle cx="260" cy="260" r="250" fill="none" stroke="rgba(11,15,20,.14)" strokeWidth="2"/><circle cx="260" cy="260" r="180" fill="none" stroke="rgba(11,15,20,.14)" strokeWidth="2"/><circle cx="260" cy="260" r="110" fill="none" stroke="rgba(11,15,20,.14)" strokeWidth="2"/><circle cx="150" cy="400" r="34" fill="#17B8AE"/><circle cx="410" cy="150" r="20" fill="#0B0F14"/></svg>
      <div style={{position:'relative'}}><h2>Your A/L journey starts today.</h2><p>Register free, pick your classes and join the next live session.</p></div>
      <div style={{position:'relative',display:'flex',flexWrap:'wrap',gap:'10px'}}><button className="btn ink" data-register="">Register now</button><a className="btn" href="#classes" style={{background:'rgba(11,15,20,.12)',color:'#0B0F14'}}>View classes</a></div>
      </div>
      </div>
      </section>
      </main>

      <footer>
      <div className="wrap">
      <div className="fgrid">
      <div><img src="/sm48-logo-light.png" alt="SM Forty Eight" style={{height:'52px',display:'block'}} /><p style={{marginTop:'14px',maxWidth:'300px',fontSize:'14px',lineHeight:'1.6'}}>A/L classes for Physical Science, Biology, Commerce and Technology. Live, recorded and always with you.</p>
      <div className="soc"><a href="#" aria-label="Facebook"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a><a href="#" aria-label="YouTube"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22.5 6.4a2.8 2.8 0 0 0-2-2C18.9 4 12 4 12 4s-6.9 0-8.6.5a2.8 2.8 0 0 0-1.9 2A29 29 0 0 0 1 12a29 29 0 0 0 .5 5.6 2.8 2.8 0 0 0 2 1.9c1.6.5 8.5.5 8.5.5s6.9 0 8.6-.5a2.8 2.8 0 0 0 1.9-1.9A29 29 0 0 0 23 12a29 29 0 0 0-.5-5.6zM9.8 15.5V8.5l5.7 3.5z"/></svg></a><a href="#" aria-label="WhatsApp"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2-5.4A8.4 8.4 0 1 1 21 11.5z"/></svg></a></div>
      </div>
      <div><h4>Learn</h4><a href="#classes">Classes</a><a href="#features">Features</a><a href="#app">Mobile app</a><a href="#faq">FAQ</a></div>
      <div><h4>Institute</h4><a href="/about-us">About us</a><a href="#">Teachers</a><a href="/login" data-login="">Staff login</a><a href="#">Careers</a></div>
      <div><h4>Contact</h4><a href="#">[PHONE NUMBER]</a><a href="#">[EMAIL ADDRESS]</a><a href="#">[ADDRESS], Colombo</a></div>
      </div>
      <div className="fbot"><span>© 2026 SM Forty Eight. All rights reserved.</span><span><a href="#" style={{display:'inline',padding:'0'}}>Privacy</a> · <a href="#" style={{display:'inline',padding:'0'}}>Terms</a></span></div>
      </div>
      </footer>

      {/* REGISTER DIALOG */}
      <dialog id="reg" aria-labelledby="reg-t">
      <div className="modal">
      <div className="mtop">
      <button className="x" type="button" data-close="" aria-label="Close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
      <svg viewBox="0 0 200 200" aria-hidden="true" style={{position:'absolute',right:'-50px',bottom:'-90px',width:'220px',height:'220px'}}><circle cx="100" cy="100" r="96" fill="none" stroke="#1C242B" strokeWidth="2"/><circle cx="100" cy="100" r="60" fill="none" stroke="#1C242B" strokeWidth="2"/><circle cx="60" cy="130" r="14" fill="#17B8AE"/><circle cx="140" cy="60" r="9" fill="#F26A21"/></svg>
      <h2 id="reg-t">Join SM Forty Eight</h2><p>Free to register. Pay only for the classes you join.</p>
      </div>
      <form className="mbody" id="regForm" noValidate>
      <div className="field"><label htmlFor="r-name">Full name</label><input id="r-name" autoComplete="name" placeholder="e.g. Kavindi Perera" /><span className="err">Please enter your name</span></div>
      <div className="field"><label htmlFor="r-phone">Mobile number</label><input id="r-phone" inputMode="tel" autoComplete="tel" placeholder="07X XXX XXXX" /><span className="err">Enter a valid Sri Lankan mobile number</span></div>
      <div className="grid2">
      <div className="field"><label htmlFor="r-year">A/L year</label><select id="r-year"><option>2027</option><option>2026</option><option>2028</option></select></div>
      <div className="field"><label htmlFor="r-dist">District</label><select id="r-dist"><option>Colombo</option><option>Gampaha</option><option>Kalutara</option><option>Kandy</option><option>Galle</option><option>Kurunegala</option><option>Other</option></select></div>
      </div>
      <div className="field"><span className="fl">Stream</span><div className="segs" id="r-stream"><button type="button" aria-pressed="true">Physical Sci.</button><button type="button" aria-pressed="false">Biology</button><button type="button" aria-pressed="false">Commerce</button><button type="button" aria-pressed="false">Technology</button></div></div>
      <button className="btn or" type="submit" style={{width:'100%',minHeight:'50px',marginTop:'4px'}}>Create my account</button>
      <p style={{fontSize:'12.5px',color:'var(--mu)',textAlign:'center'}}>We'll send a 6-digit code to verify your number.</p>
      </form>
      <div className="done" id="regDone">
      <span className="ok"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg></span>
      <h3 style={{fontSize:'22px',fontWeight:'800',letterSpacing:'-.03em'}}>You're in, <span id="regName">friend</span>!</h3>
      <p style={{color:'var(--mu)',maxWidth:'340px'}}>A verification code is on its way to <b id="regPhone" style={{color:'var(--tx)',whiteSpace:'nowrap'}}></b>. Then pick your first class.</p>
      <button className="btn or" type="button" data-close="">Done</button>
      </div>
      </div>
      </dialog>
    </div>
  );
}
