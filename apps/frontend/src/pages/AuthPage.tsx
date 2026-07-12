import React, { useEffect, useRef } from 'react';
import { Users, Zap, History } from 'lucide-react';
import { SignIn, SignUp } from '@clerk/clerk-react';

const appearanceSettings = {
  variables: {
    colorPrimary: '#6E56CF',
    colorBackground: '#0B0B14',
    colorInputBackground: '#0F0F1A',
    colorInputText: '#EDEDEE',
    colorText: '#EDEDEE',
    colorTextSecondary: '#8888AA',
    borderRadius: '8px',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  elements: {
    rootBox: { width: '100%', maxWidth: '100%' },
    card: { border: 'none', boxShadow: 'none', background: 'transparent', width: '100%', maxWidth: '100%', padding: '0px' },
    headerTitle: { display: 'none' },
    headerSubtitle: { display: 'none' },
    formButtonPrimary: { backgroundColor: '#6E56CF', '&:hover': { backgroundColor: '#7C65D8' } },
    footerActionLink: { color: '#6E56CF', '&:hover': { color: '#7C65D8' } },
    identityPreviewEditButtonIcon: { color: '#6E56CF' }
  }
};

/**
 * Shared layout for authentication views.
 * Renders the dot-grid canvas and features list on the left, and form on the right.
 */
function AuthLayout({ children, tagline }: { children: React.ReactNode; tagline: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    // Mouse coordinates (initially offscreen)
    let mouse = { x: -1000, y: -1000 };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const handleResize = () => {
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', handleResize);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const dotSpacing = 28;
      const dotRadius = 1;

      for (let x = 14; x < width; x += dotSpacing) {
        for (let y = 14; y < height; y += dotSpacing) {
          const dx = x - mouse.x;
          const dy = y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let currentRadius = dotRadius;
          let opacity = 0.04;

          if (dist < 120) {
            const factor = (120 - dist) / 120;
            currentRadius = dotRadius + factor * 1.5;
            opacity = 0.04 + factor * 0.22;
          }

          ctx.beginPath();
          ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(110, 86, 207, ${opacity})`;
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-bg-root">
      {/* LEFT PANEL — Dot Grid Canvas and Features */}
      <div className="relative flex-1 hidden md:flex flex-col justify-between p-12 overflow-hidden border-r border-border-def">
        {/* HTML5 Interactive Dot Grid Canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

        {/* Top Header section */}
        <div className="relative z-10 flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center text-white font-bold text-sm">
            C
          </div>
          <span className="text-[#EDEDEE] font-semibold text-sm tracking-[-0.3px]">
            collab-Editor
          </span>
        </div>

        {/* Middle Feature Copy Section */}
        <div className="relative z-10 my-auto max-w-md">
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-2 leading-tight">
            Write together.<br />Think together.
          </h1>
          <p className="text-xs font-normal text-text-sec mb-10 leading-relaxed">
            Real-time collaboration, built for scale
          </p>

          <div className="flex flex-col gap-3">
            {/* Feature Item 1 */}
            <div className="group bg-bg-card border border-border-def hover:border-accent-subtle hover:bg-bg-elevated rounded-[10px] p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01]">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#0d091a] text-[#886cfb] transition-transform duration-200 group-hover:scale-110 shrink-0">
                  <Users size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-text-pri group-hover:text-white transition-colors duration-200">
                    Live collaboration
                  </h3>
                  <p className="text-xs font-normal text-text-sec group-hover:text-[#66667A] transition-colors duration-200 mt-1">
                    See edits and cursors from every collaborator in real time.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature Item 2 */}
            <div className="group bg-bg-card border border-border-def hover:border-accent-subtle hover:bg-bg-elevated rounded-[10px] p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01]">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#05150e] text-[#10B981] transition-transform duration-200 group-hover:scale-110 shrink-0">
                  <Zap size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-text-pri group-hover:text-white transition-colors duration-200">
                    Conflict-free editing
                  </h3>
                  <p className="text-xs font-normal text-text-sec group-hover:text-[#66667A] transition-colors duration-200 mt-1">
                    Operational Transformation merges every edit automatically.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature Item 3 */}
            <div className="group bg-bg-card border border-border-def hover:border-accent-subtle hover:bg-bg-elevated rounded-[10px] p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01]">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#1a1208] text-[#FBBF24] transition-transform duration-200 group-hover:scale-110 shrink-0">
                  <History size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-text-pri group-hover:text-white transition-colors duration-200">
                    Full revision history
                  </h3>
                  <p className="text-xs font-normal text-text-sec group-hover:text-[#66667A] transition-colors duration-200 mt-1">
                    Every op logged — replay or restore any point in time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — Clerk form */}
      <div className="w-full md:w-[42%] md:min-w-[380px] md:max-w-[480px] bg-bg-panel flex flex-col justify-center items-center px-6 md:px-10 border-l border-border-def relative z-10 shrink-0">
        <div className="w-full max-w-[400px]">
          {/* Logo & Tagline Header */}
          <div className="flex flex-col items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center text-white font-bold text-sm">
                C
              </div>
              <span className="text-[#EDEDEE] font-semibold text-sm tracking-[-0.3px]">
                collab-Editor
              </span>
            </div>
            <p className="text-[11px] text-text-muted mt-2.5">
              {tagline}
            </p>
          </div>

          {/* Clerk Component Rendered Here */}
          {children}
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  return (
    <AuthLayout tagline="Sign in to your workspace">
      <SignIn
        routing="path"
        path="/login"
        signUpUrl="/register"
        afterSignInUrl="/dashboard"
        appearance={appearanceSettings}
      />
    </AuthLayout>
  );
}

export function RegisterPage() {
  return (
    <AuthLayout tagline="Register your account">
      <SignUp
        routing="path"
        path="/register"
        signInUrl="/login"
        afterSignUpUrl="/dashboard"
        appearance={appearanceSettings}
      />
    </AuthLayout>
  );
}
