import { texailogo } from '@/assets/icons';
import { Button } from '@/components';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/* ══════════════════════════════════════════════
   PARTICLE CANVAS
═══════════════════════════════════════════════ */
const ParticleCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const COLORS = ['#1f7bff', '#005CDA', '#60a5fa', '#93c5fd', 'rgba(255,255,255,0.6)'];
    const particles = Array.from({ length: 70 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      r: Math.random() * 2.5 + 0.5,
      alpha: Math.random() * 0.55 + 0.08,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.save();
            ctx.globalAlpha = (1 - dist / 130) * 0.1;
            ctx.strokeStyle = '#1f7bff';
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}
    />
  );
};

/* ══════════════════════════════════════════════
   COUNTDOWN TIMER
═══════════════════════════════════════════════ */
const LAUNCH_DATE = new Date('2025-08-01T00:00:00');

const useCountdown = () => {
  const getTimeLeft = useCallback(() => {
    const diff = LAUNCH_DATE.getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  }, []);

  const [time, setTime] = useState(getTimeLeft);
  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, [getTimeLeft]);
  return time;
};

const CountdownUnit: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
    <div style={{
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.12)',
      backdropFilter: 'blur(12px)',
      borderRadius: 16,
      padding: '18px 24px',
      minWidth: 80,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* shimmer */}
      <div style={{
        position: 'absolute', top: 0, left: '-100%',
        width: '60%', height: '100%',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
        animation: 'shimmer 3s infinite',
      }} />
      <span style={{
        fontSize: 42, fontWeight: 900, lineHeight: 1,
        background: 'linear-gradient(135deg, #ffffff 0%, #93c5fd 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        display: 'block', textAlign: 'center',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {String(value).padStart(2, '0')}
      </span>
    </div>
    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: 'rgba(147,197,253,0.7)', textTransform: 'uppercase' }}>
      {label}
    </span>
  </div>
);

/* ══════════════════════════════════════════════
   FEATURE BADGE
═══════════════════════════════════════════════ */
const FeatureBadge: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 8,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 999,
    padding: '8px 16px',
    backdropFilter: 'blur(8px)',
  }}>
    <span style={{ color: '#60a5fa', display: 'flex' }}>{icon}</span>
    <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(200,225,255,0.85)' }}>{label}</span>
  </div>
);

/* ══════════════════════════════════════════════
   MAIN HOME PAGE
═══════════════════════════════════════════════ */
const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isLoggedIn, role } = useAuth();
  const { days, hours, minutes, seconds } = useCountdown();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNotify = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) setSubmitted(true);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #000d1a 0%, #001F4A 30%, #003080 60%, #001232 100%)',
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      <ParticleCanvas />

      {/* ── Ambient glow blobs ── */}
      <div style={{
        position: 'fixed', top: '-25%', left: '-15%',
        width: '70vw', height: '70vw', maxWidth: 800, maxHeight: 800,
        background: 'radial-gradient(circle, rgba(31,123,255,0.18) 0%, transparent 68%)',
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
        animation: 'blobFloat 10s ease-in-out infinite',
      }} />
      <div style={{
        position: 'fixed', bottom: '-20%', right: '-10%',
        width: '55vw', height: '55vw', maxWidth: 650, maxHeight: 650,
        background: 'radial-gradient(circle, rgba(0,92,218,0.22) 0%, transparent 68%)',
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
        animation: 'blobFloat 13s ease-in-out infinite reverse',
      }} />
      <div style={{
        position: 'fixed', top: '40%', right: '20%',
        width: '30vw', height: '30vw', maxWidth: 400, maxHeight: 400,
        background: 'radial-gradient(circle, rgba(96,165,250,0.1) 0%, transparent 68%)',
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
        animation: 'blobFloat 8s ease-in-out infinite 2s',
      }} />

      {/* ════════════════════════════════════════
          NAVBAR
      ════════════════════════════════════════ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: navScrolled ? '12px 48px' : '20px 48px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: navScrolled ? 'rgba(0,15,35,0.85)' : 'transparent',
        backdropFilter: navScrolled ? 'blur(20px)' : 'none',
        borderBottom: navScrolled ? '1px solid rgba(255,255,255,0.07)' : 'none',
        transition: 'all 0.35s ease',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} className='bg-white p-2 rounded-md'>

          <img src={texailogo} alt="Logo" width={100} height={100} />
        </div>


        {/* Authentication CTA */}
        {isLoggedIn ? (
          <Button 
            variant='outline' 
            className='rounded-md text-white hover:text-black' 
            onClick={() => navigate(role === 'ADMIN' ? '/admin' : '/employee')}
          >
            Go to Dashboard
          </Button>
        ) : (
          <Button 
            variant='outline' 
            className='rounded-md text-white hover:text-black' 
            onClick={() => navigate('/login')}
          >
            Sign In
          </Button>
        )}

      </nav>

      {/* ════════════════════════════════════════
          HERO SECTION
      ════════════════════════════════════════ */}
      <main style={{
        position: 'relative', zIndex: 10,
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '120px 24px 80px',
        textAlign: 'center',
      }}>

        {/* Status pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(31,123,255,0.12)',
          border: '1px solid rgba(31,123,255,0.3)',
          borderRadius: 999, padding: '7px 18px',
          marginBottom: 40,
          animation: 'fadeSlideUp 0.8s 0.1s both',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#22c55e',
            boxShadow: '0 0 10px #22c55e',
            animation: 'greenPulse 2s ease-in-out infinite',
            display: 'inline-block',
          }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Currently in Development · Launching Soon
          </span>
        </div>

        {/* Main heading */}
        <h1 style={{
          fontSize: 'clamp(40px, 7vw, 88px)',
          fontWeight: 900,
          lineHeight: 1.05,
          letterSpacing: '-3px',
          marginBottom: 24,
          maxWidth: 900,
          animation: 'fadeSlideUp 0.8s 0.2s both',
        }}>
          <span style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #93c5fd 40%, #1f7bff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            The Future of
          </span>
          <br />
          <span style={{
            background: 'linear-gradient(135deg, #60a5fa 0%, #ffffff 50%, #93c5fd 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Team Intelligence
          </span>
        </h1>

        {/* Sub-heading */}
        <p style={{
          fontSize: 'clamp(15px, 2vw, 19px)',
          color: 'rgba(180,210,255,0.72)',
          lineHeight: 1.7, maxWidth: 600,
          marginBottom: 56,
          fontWeight: 400,
          animation: 'fadeSlideUp 0.8s 0.3s both',
        }}>
          TEKXAI is a next-generation workspace platform that combines AI-powered
          task management, smart timesheets, and team analytics — all in one place.
        </p>

        {/* Feature badges */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 12,
          justifyContent: 'center', marginBottom: 64,
          animation: 'fadeSlideUp 0.8s 0.35s both',
        }}>
          <FeatureBadge label="AI-Powered Tasks" icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          } />
          <FeatureBadge label="Smart Timesheets" icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          } />
          <FeatureBadge label="Team Analytics" icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="18" y1="20" x2="18" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><line x1="12" y1="20" x2="12" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><line x1="6" y1="20" x2="6" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          } />
          <FeatureBadge label="Role-based Access" icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          } />
          <FeatureBadge label="Real-time Updates" icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          } />
        </div>

        {/* ── Countdown ── */}
        <div style={{ marginBottom: 64, animation: 'fadeSlideUp 0.8s 0.4s both' }}>
          <p style={{
            fontSize: 12, fontWeight: 700, letterSpacing: '0.18em',
            color: 'rgba(147,197,253,0.6)', textTransform: 'uppercase',
            marginBottom: 20,
          }}>
            Launching in
          </p>
          <div style={{ display: 'flex', gap: 'clamp(12px, 2vw, 24px)', flexWrap: 'wrap', justifyContent: 'center' }}>
            <CountdownUnit value={days} label="Days" />
            <div style={{ display: 'flex', alignItems: 'center', paddingBottom: 28 }}>
              <span style={{ fontSize: 36, fontWeight: 900, color: 'rgba(147,197,253,0.4)', lineHeight: 1 }}>:</span>
            </div>
            <CountdownUnit value={hours} label="Hours" />
            <div style={{ display: 'flex', alignItems: 'center', paddingBottom: 28 }}>
              <span style={{ fontSize: 36, fontWeight: 900, color: 'rgba(147,197,253,0.4)', lineHeight: 1 }}>:</span>
            </div>
            <CountdownUnit value={minutes} label="Minutes" />
            <div style={{ display: 'flex', alignItems: 'center', paddingBottom: 28 }}>
              <span style={{ fontSize: 36, fontWeight: 900, color: 'rgba(147,197,253,0.4)', lineHeight: 1 }}>:</span>
            </div>
            <CountdownUnit value={seconds} label="Seconds" />
          </div>
        </div>

        {/* ── Email notify form ── */}
        <div style={{ width: '100%', maxWidth: 480, animation: 'fadeSlideUp 0.8s 0.5s both' }}>
          {!submitted ? (
            <>
              <p style={{
                fontSize: 13, fontWeight: 600, color: 'rgba(147,197,253,0.65)',
                marginBottom: 14, letterSpacing: '0.03em',
              }}>
                Get notified when we launch
              </p>
              <form onSubmit={handleNotify} style={{ display: 'flex', gap: 10 }}>
                <input
                  id="input-notify-email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={{
                    flex: 1, padding: '14px 18px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 12,
                    color: '#ffffff', fontSize: 14,
                    outline: 'none', fontFamily: "'Inter', sans-serif",
                    backdropFilter: 'blur(10px)',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(31,123,255,0.6)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
                />
                <Button variant='outline' id="btn-notify-submit" className='rounded-md text-white hover:text-black' >Notify Me</Button>

              </form>
            </>
          ) : (
            <div style={{
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.25)',
              borderRadius: 14, padding: '18px 24px',
              display: 'flex', alignItems: 'center', gap: 12,
              animation: 'fadeSlideUp 0.5s both',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 4L12 14.01l-3-3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#4ade80', margin: 0 }}>You're on the list!</p>
                <p style={{ fontSize: 13, color: 'rgba(134,239,172,0.7)', margin: '2px 0 0' }}>We'll notify you at <strong>{email}</strong> when we launch.</p>
              </div>
            </div>
          )}
        </div>

        {/* ── CTA buttons ── */}


        {/* ── Divider & Social proof ── */}
        <div style={{
          marginTop: 72,
          paddingTop: 32,
          borderTop: '1px solid rgba(255,255,255,0.07)',
          width: '100%', maxWidth: 560,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          animation: 'fadeSlideUp 0.8s 0.7s both',
        }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(147,197,253,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
            Trusted by teams at
          </p>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
            {['Startups', 'Agencies', 'Enterprises', 'Freelancers'].map(name => (
              <span key={name} style={{
                fontSize: 14, fontWeight: 800, letterSpacing: '0.05em',
                color: 'rgba(180,210,255,0.3)',
                textTransform: 'uppercase',
              }}>
                {name}
              </span>
            ))}
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer style={{
        position: 'relative', zIndex: 10,
        padding: '20px 48px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: 'linear-gradient(135deg, #1f7bff, #005CDA)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(31,123,255,0.4)',
          }}>
            <span style={{ color: '#fff', fontSize: 10, fontWeight: 900 }}>TX</span>
          </div>
          <span style={{ color: 'rgba(180,210,255,0.4)', fontSize: 13, fontWeight: 600 }}>TEKXAI</span>
          <span style={{ color: 'rgba(180,210,255,0.2)', fontSize: 13 }}>· © 2026 All rights reserved</span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {['Privacy', 'Terms', 'Contact'].map(link => (
            <span key={link} style={{
              fontSize: 13, color: 'rgba(180,210,255,0.35)',
              cursor: 'pointer', fontWeight: 500,
              transition: 'color 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(180,210,255,0.75)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(180,210,255,0.35)')}
            >
              {link}
            </span>
          ))}
        </div>
      </footer>

      {/* ── Keyframe animations ── */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes blobFloat {
          0%,100% { transform: translate(0, 0)    scale(1);    }
          33%      { transform: translate(2%, 3%)  scale(1.04); }
          66%      { transform: translate(-2%, 1%) scale(0.97); }
        }
        @keyframes greenPulse {
          0%,100% { box-shadow: 0 0 6px #22c55e;  }
          50%      { box-shadow: 0 0 18px #22c55e; }
        }
        @keyframes shimmer {
          0%   { left: -100%; }
          100% { left: 200%;  }
        }
        input::placeholder { color: rgba(147, 197, 253, 0.35); }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
};

export default HomePage;
