import React, { useId } from 'react';

// 🌄 Illustrated, gently animated sky scenes for the coordinator greeting card.
// morning = sunrise over misty hills, afternoon = bright sun + clouds + palm,
// evening = sunset over the sea with palms and birds, night = moon, stars and a sleepy village.
// Pure SVG + CSS keyframes (no images, no libraries). Animations stop for users who prefer reduced motion.

const KEYFRAMES = `
@keyframes gs-rise { from { transform: translateY(26px); } to { transform: translateY(0); } }
@keyframes gs-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes gs-drift { from { transform: translateX(-140px); } to { transform: translateX(900px); } }
@keyframes gs-fly { 0% { transform: translate(-60px, 0); } 50% { transform: translate(420px, -14px); } 100% { transform: translate(900px, 6px); } }
@keyframes gs-flap { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(0.45); } }
@keyframes gs-twinkle { 0%,100% { opacity: .25; } 50% { opacity: 1; } }
@keyframes gs-shoot { 0%,88% { opacity: 0; transform: translate(0,0); } 90% { opacity: 1; } 100% { opacity: 0; transform: translate(-220px, 90px); } }
@keyframes gs-shimmer { 0%,100% { opacity: .35; } 50% { opacity: .85; } }
@keyframes gs-sway { 0%,100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
@keyframes gs-mist { 0%,100% { transform: translateX(0); opacity: .55; } 50% { transform: translateX(30px); opacity: .8; } }
.gs-anim { transform-box: fill-box; }
@media (prefers-reduced-motion: reduce) { .gs-anim { animation: none !important; } }
`;

const Bird = ({ x, y, s = 1, delay = 0, dur = 26, color = '#1f1235' }) => (
    <g className="gs-anim" style={{ animation: `gs-fly ${dur}s linear ${delay}s infinite` }}>
        <g transform={`translate(${x} ${y}) scale(${s})`}>
            <path className="gs-anim" style={{ transformOrigin: 'center', animation: 'gs-flap .7s ease-in-out infinite' }}
                d="M0 0 Q6 -6 12 0 Q18 -6 24 0" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
        </g>
    </g>
);

const Cloud = ({ y, s = 1, delay = 0, dur = 70, fill = '#fff', opacity = 0.9 }) => (
    <g className="gs-anim" style={{ animation: `gs-drift ${dur}s linear ${delay}s infinite` }} opacity={opacity}>
        <g transform={`translate(0 ${y}) scale(${s})`} fill={fill}>
            <ellipse cx="40" cy="22" rx="40" ry="14" />
            <ellipse cx="28" cy="14" rx="18" ry="14" />
            <ellipse cx="54" cy="10" rx="22" ry="17" />
        </g>
    </g>
);

const Palm = ({ x, y, s = 1, color = '#1a0b2e', sway = true }) => (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={color}>
        <path d="M-3 0 Q2 -40 10 -82 L15 -81 Q8 -40 4 0 Z" />
        <g className="gs-anim" style={{ transformOrigin: '50% 80%', animation: sway ? 'gs-sway 5s ease-in-out infinite' : 'none' }}>
            <path d="M12 -82 Q-10 -96 -34 -84 Q-12 -88 12 -80 Z" />
            <path d="M12 -82 Q-6 -108 -24 -112 Q-4 -100 12 -80 Z" />
            <path d="M12 -82 Q30 -110 50 -106 Q28 -98 12 -80 Z" />
            <path d="M12 -82 Q38 -92 60 -76 Q36 -84 12 -80 Z" />
            <path d="M12 -82 Q14 -110 8 -122 Q20 -104 13 -80 Z" />
        </g>
    </g>
);

const Morning = ({ id }) => (
    <>
        <defs>
            <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#2b1d5c" />
                <stop offset=".45" stopColor="#8a4f8f" />
                <stop offset=".75" stopColor="#f08a7a" />
                <stop offset="1" stopColor="#ffd39a" />
            </linearGradient>
            <radialGradient id={`${id}sun`}>
                <stop offset="0" stopColor="#fff6d5" />
                <stop offset=".5" stopColor="#ffd27a" />
                <stop offset="1" stopColor="#ffb25a" stopOpacity="0" />
            </radialGradient>
        </defs>
        <rect width="800" height="220" fill={`url(#${id}sky)`} />
        <g className="gs-anim" style={{ animation: 'gs-rise 6s ease-out forwards' }}>
            <circle cx="420" cy="138" r="110" fill={`url(#${id}sun)`} opacity=".7" />
            <g className="gs-anim" style={{ transformOrigin: 'center', animation: 'gs-spin 60s linear infinite' }} opacity=".35">
                {Array.from({ length: 12 }).map((_, i) => (
                    <rect key={i} x="417" y="20" width="6" height="60" rx="3" fill="#fff1c1" transform={`rotate(${i * 30} 420 138)`} />
                ))}
            </g>
            <circle cx="420" cy="138" r="38" fill="#fff3c4" />
        </g>
        <Cloud y={55} s={0.8} dur={90} fill="#ffd6e0" opacity={0.55} />
        <Cloud y={85} s={0.6} dur={75} delay={-40} fill="#ffe3d0" opacity={0.6} />
        <path d="M0 170 Q120 120 250 150 T520 140 T800 150 V220 H0 Z" fill="#6b3f7a" opacity=".85" />
        <g className="gs-anim" style={{ animation: 'gs-mist 9s ease-in-out infinite' }} fill="#ffe6f0"><ellipse cx="220" cy="172" rx="180" ry="9" opacity=".35" /><ellipse cx="600" cy="168" rx="220" ry="8" opacity=".3" /></g>
        <path d="M0 190 Q160 150 330 182 T640 172 T800 180 V220 H0 Z" fill="#4a2a5e" />
        <path d="M0 205 Q200 185 420 204 T800 198 V220 H0 Z" fill="#2e1a44" />
        <Bird x={300} y={70} s={0.8} dur={30} color="#3b1f4f" />
        <Bird x={260} y={85} s={0.6} dur={30} delay={-1} color="#3b1f4f" />
        <Bird x={330} y={90} s={0.5} dur={30} delay={-2} color="#3b1f4f" />
    </>
);

const Afternoon = ({ id }) => (
    <>
        <defs>
            <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#0b5f9e" />
                <stop offset=".6" stopColor="#38a8e0" />
                <stop offset="1" stopColor="#a8e3f5" />
            </linearGradient>
            <radialGradient id={`${id}sun`}>
                <stop offset="0" stopColor="#fffbe6" />
                <stop offset=".4" stopColor="#ffe66b" />
                <stop offset="1" stopColor="#ffd23f" stopOpacity="0" />
            </radialGradient>
        </defs>
        <rect width="800" height="220" fill={`url(#${id}sky)`} />
        <circle cx="430" cy="80" r="90" fill={`url(#${id}sun)`} opacity=".8" />
        <g className="gs-anim" style={{ transformOrigin: 'center', animation: 'gs-spin 40s linear infinite' }} opacity=".45">
            {Array.from({ length: 16 }).map((_, i) => (
                <rect key={i} x="427" y="2" width="6" height="36" rx="3" fill="#fff7c2" transform={`rotate(${i * 22.5} 430 80)`} />
            ))}
        </g>
        <circle cx="430" cy="80" r="30" fill="#fff6c8" />
        <Cloud y={60} s={1} dur={60} />
        <Cloud y={100} s={0.7} dur={80} delay={-30} opacity={0.85} />
        <Cloud y={45} s={0.55} dur={95} delay={-60} opacity={0.75} />
        <path d="M0 180 Q150 150 320 172 T640 162 T800 168 V220 H0 Z" fill="#3fa36b" />
        <path d="M0 200 Q220 176 460 198 T800 192 V220 H0 Z" fill="#2b7d50" />
        <Palm x={525} y={204} s={0.95} color="#1f5e3b" />
        <Palm x={560} y={206} s={0.7} color="#225f3f" />
    </>
);

const Evening = ({ id }) => (
    <>
        <defs>
            <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#2a0f4f" />
                <stop offset=".4" stopColor="#8e2a6b" />
                <stop offset=".72" stopColor="#f2643c" />
                <stop offset=".8" stopColor="#ffb054" />
            </linearGradient>
            <linearGradient id={`${id}sea`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#7a2a5e" />
                <stop offset="1" stopColor="#2a0f3f" />
            </linearGradient>
        </defs>
        <rect width="800" height="220" fill={`url(#${id}sky)`} />
        <circle cx="420" cy="160" r="80" fill="#ff9a4a" opacity=".35" />
        <circle cx="420" cy="160" r="44" fill="#ffd27a" />
        <rect x="0" y="160" width="800" height="60" fill={`url(#${id}sea)`} />
        {[0, 1, 2, 3, 4].map(i => (
            <rect key={i} className="gs-anim" x={390 - i * 8} y={168 + i * 9} width={60 + i * 16} height="3" rx="1.5" fill="#ffc46b"
                style={{ animation: `gs-shimmer ${2 + i * 0.4}s ease-in-out ${i * 0.3}s infinite` }} />
        ))}
        <Cloud y={60} s={0.9} dur={110} fill="#ff9fb0" opacity={0.35} />
        <Cloud y={95} s={0.6} dur={90} delay={-50} fill="#ffb38a" opacity={0.35} />
        <path d="M485 220 Q525 196 585 200 Q635 204 665 220 Z" fill="#1a0b2e" />
        <Palm x={535} y={206} s={1.05} color="#1a0b2e" />
        <Palm x={575} y={204} s={0.75} color="#1a0b2e" />
        <Bird x={250} y={60} s={0.9} dur={34} color="#1a0b2e" />
        <Bird x={220} y={78} s={0.65} dur={34} delay={-1.2} color="#1a0b2e" />
        <Bird x={280} y={82} s={0.55} dur={34} delay={-2.4} color="#1a0b2e" />
    </>
);

const STARS = [[60, 50], [120, 80], [180, 45], [240, 70], [300, 50], [360, 95], [410, 60], [470, 42], [520, 80], [560, 48], [660, 120], [700, 55], [760, 80], [330, 125], [700, 135], [440, 115], [150, 130], [620, 145], [780, 120], [90, 105], [500, 140], [740, 40]];

const Night = ({ id }) => (
    <>
        <defs>
            <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#03061a" />
                <stop offset=".6" stopColor="#141a4a" />
                <stop offset="1" stopColor="#2b2a6b" />
            </linearGradient>
            <radialGradient id={`${id}moon`}>
                <stop offset="0" stopColor="#e0e7ff" stopOpacity=".55" />
                <stop offset="1" stopColor="#e0e7ff" stopOpacity="0" />
            </radialGradient>
            <mask id={`${id}crescent`}>
                <rect width="800" height="220" fill="#fff" />
                <circle cx="442" cy="82" r="26" fill="#000" />
            </mask>
        </defs>
        <rect width="800" height="220" fill={`url(#${id}sky)`} />
        {STARS.map(([x, y], i) => (
            <circle key={i} className="gs-anim" cx={x} cy={y} r={i % 4 === 0 ? 1.8 : 1.1} fill="#fff"
                style={{ animation: `gs-twinkle ${2 + (i % 5) * 0.7}s ease-in-out ${(i % 7) * 0.4}s infinite` }} />
        ))}
        <g className="gs-anim" style={{ animation: 'gs-shoot 9s ease-in 2s infinite' }}>
            <line x1="300" y1="60" x2="340" y2="44" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".9" />
        </g>
        <circle cx="430" cy="90" r="70" fill={`url(#${id}moon)`} />
        <circle cx="430" cy="90" r="26" fill="#eef2ff" mask={`url(#${id}crescent)`} />
        <path d="M0 175 Q140 140 300 165 T600 150 T800 162 V220 H0 Z" fill="#1b1f4f" />
        <path d="M0 196 Q200 170 440 192 T800 186 V220 H0 Z" fill="#0d1033" />
        {/* sleepy village with a few lit windows */}
        <g fill="#0d1033">
            <path d="M430 190 L430 172 L444 160 L458 172 L458 190 Z" />
            <path d="M462 190 L462 176 L474 166 L486 176 L486 190 Z" />
            <path d="M492 192 L492 170 L508 156 L524 170 L524 192 Z" />
        </g>
        {[[440, 176], [470, 180], [500, 176], [512, 176]].map(([x, y], i) => (
            <rect key={i} className="gs-anim" x={x} y={y} width="5" height="6" rx="1" fill="#ffd27a"
                style={{ animation: `gs-shimmer ${3 + i}s ease-in-out ${i * 0.8}s infinite` }} />
        ))}
    </>
);

const SKY_CSS = {
    morning: 'linear-gradient(180deg, #2b1d5c 0%, #8a4f8f 45%, #f08a7a 75%, #ffd39a 100%)',
    afternoon: 'linear-gradient(180deg, #0b5f9e 0%, #38a8e0 60%, #a8e3f5 100%)',
    evening: 'linear-gradient(180deg, #2a0f4f 0%, #8e2a6b 40%, #f2643c 72%, #7a2a5e 73%, #2a0f3f 100%)',
    night: 'linear-gradient(180deg, #03061a 0%, #141a4a 60%, #2b2a6b 100%)',
};
const FADE = 'linear-gradient(to right, transparent 0%, #000 22%)';

export default function GreetingScene({ theme }) {
    const id = useId().replace(/:/g, '');
    const SceneBody = { morning: Morning, afternoon: Afternoon, evening: Evening, night: Night }[theme] || Morning;
    return (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true" style={{ background: SKY_CSS[theme] || SKY_CSS.morning }}>
            <style>{KEYFRAMES}</style>
            {/* the scene sits on the right ~75% and fades into the plain sky on the left (keeps sun/moon in view on wide screens) */}
            <svg className="absolute right-0 top-0 h-full w-[75%]" viewBox="0 0 800 220" preserveAspectRatio="xMaxYMax slice"
                style={{ WebkitMaskImage: FADE, maskImage: FADE }}>
                <SceneBody id={id} />
            </svg>
            {/* left scrim keeps the greeting text readable on every scene */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />
            <div className="absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-black/35 to-transparent" />
        </div>
    );
}