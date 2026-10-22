import { useEffect, useRef, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import '../styles/landing.css'

const C = {
  bg: '#07070F', panel: '#0B0B14', card: '#0D0D18', border: '#1E1E30',
  accent: '#6E56CF', violet: '#A78BFA', text: '#EDEDEE', muted: '#9494AD',
  soft: '#B4B4CC', code: '#C9C9E0', footer: '#8A8AA3', marquee: '#6B6B88', success: '#34D399',
}

/* Where the main buttons go. Signed-out → register; signed-in → dashboard. */
function useCtaTarget() {
  const { isLoaded, isSignedIn } = useAuth()
  const signedIn = isLoaded && !!isSignedIn
  return { signedIn, to: signedIn ? '/dashboard' : '/register' }
}

/* ───────────── NAV ───────────── */
function Nav() {
  const { signedIn } = useCtaTarget()
  const outline = { padding: '9px 16px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.text }
  const solid = { padding: '9px 16px', background: C.accent, border: `1px solid ${C.accent}`, borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#fff' }
  return (
    <nav className="lp-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, padding: '20px 48px', maxWidth: 1200, margin: '0 auto', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, fontSize: 15 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff' }}>C</div>
        collab-Editor
      </div>
      <div className="lp-nav-links" style={{ display: 'flex', gap: 28, fontSize: 14, color: C.muted }}>
        <a className="lp-nl" href="#features">Features</a>
        <a className="lp-nl" href="#stack">Stack</a>
        <a className="lp-nl" href="#cta">Get started</a>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {signedIn ? (
          <Link className="lp-btn" to="/dashboard" style={solid}>Open dashboard</Link>
        ) : (
          <>
            <Link className="lp-btn" to="/login" style={outline}>Sign in</Link>
            <Link className="lp-btn" to="/register" style={solid}>Get started</Link>
          </>
        )}
      </div>
    </nav>
  )
}

/* ───────────── HERO ───────────── */
function Hero() {
  const { signedIn, to } = useCtaTarget()
  return (
    <header style={{ textAlign: 'left', padding: '80px 24px 56px', maxWidth: 980, margin: '0 auto' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', border: `1px solid ${C.border}`, borderRadius: 20, fontSize: 12, color: C.soft, background: C.card }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.success }} />
        Live editing, conflict-free
      </div>
      <h1 style={{ margin: '24px 0 18px', fontSize: 'clamp(40px, 7vw, 76px)', lineHeight: 1.04, letterSpacing: -2, fontWeight: 700 }}>
        Write together.<br /><span style={{ color: C.violet }}>Never collide.</span>
      </h1>
      <p style={{ margin: '0 0 32px', maxWidth: 600, fontSize: 18, lineHeight: 1.6, color: C.muted }}>
        A real-time document editor where every keystroke from every collaborator merges cleanly — built on Operational Transformation, WebSockets, and a stack designed to scale.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-start', flexWrap: 'wrap' }}>
        <Link className="lp-btn" to={to} style={{ padding: '14px 26px', background: C.accent, border: `1px solid ${C.accent}`, borderRadius: 10, fontWeight: 600, fontSize: 15, color: '#fff' }}>
          {signedIn ? 'Open dashboard' : 'Start writing free'}
        </Link>
        <a className="lp-btn" href="#features" style={{ padding: '14px 26px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 15, background: C.card, color: C.text }}>
          See how it works
        </a>
      </div>
    </header>
  )
}

/* ───────────── EDITOR MOCKUP (typing demo) ───────────── */
const LINE1 = 'A collaborative editor lets many people write the same document at once.'
const LINE2 = 'Every edit is transformed, so nobody’s work is ever lost.'

function EditorMockup() {
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [t, setT] = useState(0)
  useEffect(() => {
    if (reduce) return
    const id = setInterval(() => setT(v => v + 1), 80)
    return () => clearInterval(id)
  }, [reduce])

  const text1 = reduce ? LINE1 : LINE1.slice(0, t % (LINE1.length + 40))
  const text2 = reduce ? LINE2 : LINE2.slice(0, (t + 30) % (LINE2.length + 40))

  const avatar = (bg: string, label: string, overlap = false): ReactNode => (
    <span style={{ width: 26, height: 26, borderRadius: '50%', background: bg, color: C.bg, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: overlap ? -14 : 0 }}>{label}</span>
  )
  const tag = (bg: string, name: string) => (
    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 600, background: bg, color: '#fff', padding: '2px 6px', borderRadius: 3, marginLeft: 4 }}>{name}</span>
  )
  const docP = { fontFamily: 'Lora, Georgia, serif', fontSize: 16, lineHeight: 1.85 } as const

  return (
    <section aria-label="Product preview" style={{ maxWidth: 980, margin: '0 auto', padding: '0 24px', boxSizing: 'border-box' }}>
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, background: C.panel, overflow: 'hidden', boxShadow: '0 30px 80px rgba(110,86,207,.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#F87171' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FBBF24' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: C.success }} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, marginLeft: 8 }}>System Design Notes</div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: C.success, padding: '3px 9px', borderRadius: 20, background: '#052e16' }}>Saved</span>
            {avatar('#60A5FA', 'RK')}
            {avatar('#F472B6', 'PS', true)}
          </div>
        </div>
        <div style={{ background: C.bg, padding: '36px 24px' }}>
          <div className="lp-doc" style={{ background: '#FAFAF9', maxWidth: 640, margin: '0 auto', padding: '44px 52px 56px', minHeight: 230, color: '#1C1C1E', boxShadow: '0 2px 20px rgba(0,0,0,.5)' }}>
            <div style={{ fontSize: 10, letterSpacing: '.8px', color: '#6B7280', fontWeight: 600 }}>WORKSPACE DOCUMENT</div>
            <div style={{ fontFamily: 'Lora, Georgia, serif', fontStyle: 'italic', fontSize: 26, margin: '6px 0 4px' }}>System Design Notes</div>
            <div style={{ width: 34, height: 2, background: C.accent, marginBottom: 22 }} />
            <p style={{ ...docP, margin: '0 0 8px', minHeight: 60 }}>
              {text1}<span className="lp-caret" aria-hidden="true" style={{ background: '#2563EB' }} />{tag('#2563EB', 'Rohan')}
            </p>
            <p style={{ ...docP, margin: 0, minHeight: 30 }}>
              {text2}<span className="lp-caret" aria-hidden="true" style={{ background: '#DB2777' }} />{tag('#BE185D', 'Priya')}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ───────────── FEATURES (tabs) ───────────── */
const mono = (children: ReactNode) => <div>{children}</div>
const dim = { color: C.muted } as const

const TABS: { label: string; title: string; body: string; panel: ReactNode }[] = [
  {
    label: 'Live collaboration',
    title: 'See every cursor, every keystroke.',
    body: 'Named cursors and presence avatars show who is editing and where. Share a link and anyone you invite can join the same document. Sign-in runs through Clerk with email verification and Google.',
    panel: mono(<>
      <div><span style={{ color: '#60A5FA' }}>●</span> Rohan <span style={dim}>— editing paragraph 1</span></div>
      <div><span style={{ color: '#F472B6' }}>●</span> Priya <span style={dim}>— editing paragraph 2</span></div>
      <div><span style={{ color: C.violet }}>●</span> You <span style={dim}>— viewing</span></div>
    </>),
  },
  {
    label: 'Conflict-free',
    title: 'Transformation, not last-write-wins.',
    body: 'Every edit is an operation tagged with a revision. When two people type at the same spot, the server transforms one against the other so both intents survive and every client converges on the same text.',
    panel: mono(<>
      <div style={dim}>// both based on rev 14</div>
      <div>opA = insert("!", 5)</div>
      <div>opB = insert(" World", 5)</div>
      <div style={{ color: C.success }}>transform(opA, opB) → insert("!", 11)</div>
    </>),
  },
  {
    label: 'Built to scale',
    title: 'Scaled out, phase by phase.',
    body: 'A Redis cache for hot documents, Kafka to decouple writes, and Kubernetes to autoscale WebSocket pods. Each layer is benchmarked against the last with k6.',
    panel: mono(<>
      <div>Phase 2 <span style={{ color: C.violet }}>Redis cache</span></div>
      <div>Phase 3 <span style={{ color: C.violet }}>Kafka + replicas</span></div>
      <div>Phase 4 <span style={{ color: C.violet }}>Kubernetes + HPA</span></div>
    </>),
  },
]

function Features() {
  const [tab, setTab] = useState(0)
  const active = TABS[tab]
  const card = { border: `1px solid ${C.border}`, borderRadius: 14, background: C.card } as const
  return (
    <section id="features" style={{ maxWidth: 1100, margin: '0 auto', padding: '110px 24px 40px', boxSizing: 'border-box' }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ fontSize: 12, letterSpacing: 1, color: C.violet, fontWeight: 600 }}>FEATURES</div>
        <h2 style={{ margin: '10px 0 0', fontSize: 40, letterSpacing: -1 }}>Click through what’s under the hood</h2>
      </div>
      <div role="tablist" style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
        {TABS.map((t, i) => (
          <button key={t.label} role="tab" aria-selected={tab === i} onClick={() => setTab(i)}
            style={{ padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif', border: `1px solid ${tab === i ? C.accent : C.border}`, background: tab === i ? C.accent : C.card, color: tab === i ? '#fff' : C.soft }}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="lp-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 20 }}>
        <div className="lp-card" role="tabpanel" style={{ ...card, padding: 36 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 26, letterSpacing: -0.5 }}>{active.title}</h3>
          <p style={{ margin: 0, color: C.muted, lineHeight: 1.7, textAlign: 'justify', hyphens: 'auto' }}>{active.body}</p>
        </div>
        <div className="lp-card" style={{ ...card, padding: 28, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, lineHeight: 2, color: C.code }}>
          {active.panel}
        </div>
      </div>
    </section>
  )
}

/* ───────────── STACK MARQUEE ───────────── */
const STACK = ['React', 'Node.js', 'Socket.IO', 'PostgreSQL', 'Redis', 'Kafka', 'Docker', 'Kubernetes', 'Clerk', 'k6']

function Marquee() {
  return (
    <section id="stack" aria-label="Technology stack" style={{ padding: '80px 0', overflow: 'hidden' }}>
      <div style={{ textAlign: 'center', fontSize: 12, letterSpacing: 1, color: C.muted, marginBottom: 24 }}>BUILT WITH</div>
      <div className="lp-marquee">
        {[...STACK, ...STACK].map((s, i) => (
          <span key={i} aria-hidden={i >= STACK.length} style={{ fontSize: 22, fontWeight: 600, color: C.marquee, whiteSpace: 'nowrap' }}>{s}</span>
        ))}
      </div>
    </section>
  )
}

/* ───────────── FINAL CTA + FOOTER ───────────── */
function FinalCta() {
  const { signedIn } = useCtaTarget()
  return (
    <section id="cta" style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 80px', boxSizing: 'border-box' }}>
      <div style={{ border: '1px solid #2A2450', borderRadius: 18, background: C.card, textAlign: 'center', padding: '64px 24px' }}>
        <h2 style={{ margin: '0 0 14px', fontSize: 44, letterSpacing: -1.2 }}>Start a document in seconds.</h2>
        <p style={{ margin: '0 auto 28px', maxWidth: 460, color: C.muted, lineHeight: 1.6 }}>Sign in with email or Google and invite a collaborator with one link.</p>
        <Link className="lp-btn" to={signedIn ? '/dashboard' : '/login'} style={{ display: 'inline-block', padding: '14px 28px', background: C.accent, border: `1px solid ${C.accent}`, borderRadius: 10, fontWeight: 600, color: '#fff' }}>
          {signedIn ? 'Open dashboard' : 'Continue to sign in'}
        </Link>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 40, fontSize: 13, color: C.footer }}>
        <span>collab-Editor</span>
        <span>React · Node.js · Socket.IO · PostgreSQL</span>
      </div>
    </section>
  )
}

/* ───────────── PAGE ROOT (owns the cursor glow) ───────────── */
export default function LandingPage() {
  const orbRef = useRef<HTMLDivElement>(null)

  const onMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const orb = orbRef.current
    if (orb) {
      orb.style.left = `${e.clientX - r.left}px`
      orb.style.top = `${e.clientY - r.top}px`
    }
  }

  return (
    <div onMouseMove={onMouseMove} style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div ref={orbRef} aria-hidden="true" style={{ position: 'absolute', left: 680, top: 320, width: 560, height: 560, margin: '-280px 0 0 -280px', borderRadius: '50%', pointerEvents: 'none', background: 'radial-gradient(circle, rgba(110,86,207,.24), transparent 70%)', transition: 'left .35s ease-out, top .35s ease-out' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Nav />
        <Hero />
        <EditorMockup />
        <Features />
        <Marquee />
        <FinalCta />
      </div>
    </div>
  )
}
