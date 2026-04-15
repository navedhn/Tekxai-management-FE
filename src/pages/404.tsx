import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components';

/* ─── Animated Canvas Background ─── */
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

    interface Particle {
      x: number; y: number;
      vx: number; vy: number;
      r: number; alpha: number;
      color: string;
    }

    const COLORS = ['#1f7bff', '#005CDA', '#60a5fa', '#93c5fd', '#ffffff'];
    const particles: Particle[] = Array.from({ length: 55 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      r: Math.random() * 3 + 1,
      alpha: Math.random() * 0.5 + 0.1,
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
          if (dist < 120) {
            ctx.save();
            ctx.globalAlpha = (1 - dist / 120) * 0.12;
            ctx.strokeStyle = '#1f7bff';
            ctx.lineWidth = 0.8;
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
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  );
};

/* ─── Compass / Lost Icon ─── */
const CompassIcon: React.FC = () => (
  <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <defs>
      <linearGradient id="compassGrad" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#1f7bff" />
      </linearGradient>
      <filter id="glow2">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
    {/* Globe circle */}
    <circle cx="40" cy="40" r="26" stroke="url(#compassGrad)" strokeWidth="2.5" fill="none" opacity="0.9" filter="url(#glow2)" />
    <circle cx="40" cy="40" r="26" fill="url(#compassGrad)" opacity="0.08" />
    {/* Horizontal line */}
    <line x1="14" y1="40" x2="66" y2="40" stroke="url(#compassGrad)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5" />
    {/* Vertical line */}
    <line x1="40" y1="14" x2="40" y2="66" stroke="url(#compassGrad)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5" />
    {/* North pointer - pointing up */}
    <polygon points="40,18 44,36 40,32 36,36" fill="url(#compassGrad)" opacity="0.95" filter="url(#glow2)" />
    {/* South pointer */}
    <polygon points="40,62 44,44 40,48 36,44" fill="rgba(255,255,255,0.3)" />
    {/* Center dot */}
    <circle cx="40" cy="40" r="4" fill="url(#compassGrad)" filter="url(#glow2)" />
    <circle cx="40" cy="40" r="2" fill="#001F4A" />
  </svg>
);

/* ─── Main 404 Component ─── */
const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const { isLoggedIn, role } = useAuth();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #001F4A 0%, #003080 35%, #005CDA 65%, #0a1628 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
      }}
      className='px-6'>
      <ParticleCanvas />

      {/* Ambient glow blobs */}
      <div style={{
        position: 'absolute', top: '-20%', right: '-10%',
        width: '60vw', height: '60vw', maxWidth: 700, maxHeight: 700,
        background: 'radial-gradient(circle, rgba(31,123,255,0.25) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
        animation: 'blobPulse404 9s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', bottom: '-15%', left: '-10%',
        width: '50vw', height: '50vw', maxWidth: 600, maxHeight: 600,
        background: 'radial-gradient(circle, rgba(0,92,218,0.3) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
        animation: 'blobPulse404 11s ease-in-out infinite reverse',
      }} />

      {/* ── Glass Card ── */}
      <div className='flex flex-col items-center'>

        {/* Top brand pill */}


        {/* Compass icon */}
        <div style={{
          margin: '0 auto 28px',
          width: 88, height: 88,
          position: 'relative',
          animation: 'iconIn404 0.8s 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        }}>
          <div style={{
            position: 'absolute', inset: -12,
            borderRadius: '50%',
            border: '1.5px dashed rgba(31,123,255,0.35)',
            animation: 'spinSlow404 18s linear infinite',
          }} />
          <div style={{
            position: 'absolute', inset: -4,
            borderRadius: '50%',
            background: 'rgba(31,123,255,0.08)',
            border: '1px solid rgba(31,123,255,0.2)',
          }} />
          <CompassIcon />
        </div>

        {/* 404 badge */}
        <div style={{
          fontSize: 72, fontWeight: 900, lineHeight: 1,
          background: 'linear-gradient(135deg, #93c5fd 0%, #ffffffff 50%,  #a2c6fcff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: 6,
          letterSpacing: '-4px',
          animation: 'fadeUp404 0.6s 0.3s both',
        }}>
          404
        </div>

        {/* Divider line */}
        <div style={{
          width: 48, height: 3,
          background: 'linear-gradient(90deg, #1f7bff, #60a5fa)',
          borderRadius: 99,
          margin: '0 auto 20px',
          animation: 'fadeUp404 0.6s 0.35s both',
        }} />

        {/* Heading */}
        <h1 style={{
          fontSize: 26, fontWeight: 800,
          color: '#ffffff',
          margin: '0 0 12px',
          letterSpacing: '-0.5px',
          animation: 'fadeUp404 0.6s 0.4s both',
        }}>
          Page Not Found
        </h1>

        {/* Description */}
        <p style={{
          fontSize: 15,
          color: 'rgba(180,210,255,0.75)',
          lineHeight: 1.65,
          margin: '0 0 36px',
          animation: 'fadeUp404 0.6s 0.45s both',
        }} className='text-center'>
          The page you're looking for doesn't exist or has been moved.
          <br />
          Let's get you back on the right track.
        </p>



        {/* Action buttons */}
        <div style={{
          display: 'flex', gap: 12, flexDirection: 'column',
          animation: 'fadeUp404 0.6s 0.55s both',
        }} className='w-full'>

          <Button
            id="btn-go-home-404"
            onClick={() => {
              if (isLoggedIn) {
                navigate(role === 'ADMIN' ? '/admin' : '/employee');
              } else {
                navigate('/login');
              }
            }}
            className='rounded-md'>Go to Dashboard</Button>

          <button
            id="btn-go-back-404"
            onClick={() => navigate(-1)}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            }}
            style={{
              width: '100%', padding: '12px 24px',
              background: 'transparent',
              border: '1.5px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
              color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.25s ease',
              letterSpacing: '0.01em',
            }}
          >
            Go Back
          </button>
        </div>

        {/* Footer brand */}

      </div>

      <style>{`
        @keyframes cardIn404 {
          from { opacity: 0; transform: translateY(40px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        @keyframes fadeUp404 {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes iconIn404 {
          from { opacity: 0; transform: scale(0.5) rotate(-20deg); }
          to   { opacity: 1; transform: scale(1)   rotate(0deg);   }
        }
        @keyframes spinSlow404 {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes blobPulse404 {
          0%,100% { transform: scale(1);    opacity: 1;   }
          50%      { transform: scale(1.15); opacity: 0.7; }
        }
        @keyframes dotPulse404 {
          0%,100% { box-shadow: 0 0 6px #f59e0b;  }
          50%      { box-shadow: 0 0 16px #f59e0b; }
        }
      `}</style>
    </div>
  );
};

export default NotFound;
