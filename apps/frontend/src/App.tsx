import { useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import LandingPage from './pages/LandingPage';
import { LoginPage, RegisterPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { EditorPage } from './pages/EditorPage';

/**
 * RootLayout containing the cursor-tracking orbs that float in the background of all pages.
 */
function RootLayout({ children }: { children: React.ReactNode }) {
  // The landing page draws its own glow, so hide the global orbs on "/" only.
  const showOrbs = useLocation().pathname !== '/';
  const orb1Ref = useRef<HTMLDivElement>(null);
  const orb2Ref = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: 200, y: 200 });
  const pos1 = useRef({ x: 200, y: 200 });
  const pos2 = useRef({ x: 200, y: 200 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMove);

    let raf: number;
    const animate = () => {
      // orb1 follows at 6% speed (smooth lag)
      pos1.current.x += (mouse.current.x - pos1.current.x) * 0.06;
      pos1.current.y += (mouse.current.y - pos1.current.y) * 0.06;
      // orb2 follows at 4% speed (even slower, offset slightly)
      pos2.current.x += (mouse.current.x - pos2.current.x) * 0.04;
      pos2.current.y += (mouse.current.y - pos2.current.y) * 0.04;

      if (orb1Ref.current) {
        orb1Ref.current.style.left = pos1.current.x + 'px';
        orb1Ref.current.style.top = pos1.current.y + 'px';
      }
      if (orb2Ref.current) {
        orb2Ref.current.style.left = (pos2.current.x + 40) + 'px';
        orb2Ref.current.style.top = (pos2.current.y - 30) + 'px';
      }
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('mousemove', handleMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-bg-root overflow-hidden">
      {/* Orb 1 — large purple */}
      {showOrbs && <div
        ref={orb1Ref}
        className="pointer-events-none absolute z-0 rounded-full"
        style={{
          width: '280px',
          height: '280px',
          marginLeft: '-140px',
          marginTop: '-140px',
          background: 'radial-gradient(circle, rgba(110,86,207,0.18) 0%, transparent 70%)',
          transition: 'none',
        }}
      />}
      {/* Orb 2 — smaller blue */}
      {showOrbs && <div
        ref={orb2Ref}
        className="pointer-events-none absolute z-0 rounded-full"
        style={{
          width: '200px',
          height: '200px',
          marginLeft: '-100px',
          marginTop: '-100px',
          background: 'radial-gradient(circle, rgba(96,165,250,0.10) 0%, transparent 70%)',
          transition: 'none',
        }}
      />}
      {/* Main app content rendered above the background orbs */}
      <div className="relative z-10 w-full min-h-screen">
        {children}
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <RootLayout>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <>
                <SignedIn><DashboardPage /></SignedIn>
                <SignedOut><RedirectToSignIn /></SignedOut>
              </>
            }
          />
          <Route
            path="/docs/:id"
            element={
              <>
                <SignedIn><EditorPage /></SignedIn>
                <SignedOut><RedirectToSignIn /></SignedOut>
              </>
            }
          />
          {/* Fallbacks */}
          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </RootLayout>
    </BrowserRouter>
  );
}

export default App;
