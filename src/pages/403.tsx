import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getRoleHomePath } from '@/constants/roles';
import { Button } from '@/components';

const Forbidden: React.FC = () => {
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
      className="px-6"
    >
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          right: '-10%',
          width: '60vw',
          height: '60vw',
          maxWidth: 700,
          maxHeight: 700,
          background: 'radial-gradient(circle, rgba(31,123,255,0.25) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />

      <div className="flex flex-col items-center text-center max-w-md relative z-10">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-xl backdrop-blur-sm">
          <ShieldX size={44} strokeWidth={1.75} />
        </div>

        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            lineHeight: 1,
            background: 'linear-gradient(135deg, #93c5fd 0%, #ffffff 50%, #a2c6fc 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: 6,
            letterSpacing: '-4px',
          }}
        >
          403
        </div>

        <div
          style={{
            width: 48,
            height: 3,
            background: 'linear-gradient(90deg, #1f7bff, #60a5fa)',
            borderRadius: 99,
            margin: '0 auto 20px',
          }}
        />

        <h1 className="mb-3 text-2xl font-extrabold text-white tracking-tight">Access Denied</h1>

        <p className="mb-8 text-sm leading-relaxed text-blue-100/80">
          You don&apos;t have permission to view this page.
          <br />
          Contact your administrator if you believe this is a mistake.
        </p>

        <div className="flex w-full flex-col gap-3">
          <Button
            id="btn-go-dashboard-403"
            onClick={() => {
              if (isLoggedIn) {
                navigate(getRoleHomePath(role));
              } else {
                navigate('/login');
              }
            }}
            className="rounded-md w-full"
          >
            {isLoggedIn ? 'Go to Dashboard' : 'Go to Login'}
          </Button>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full rounded-lg border border-white/15 bg-transparent px-6 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default Forbidden;
