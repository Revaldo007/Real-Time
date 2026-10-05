import React, { useState } from 'react'

/*
  Project credits badge, themed like the Real-Time Chat login screen.
  - Compact (about 285px x 205px) and tucked into the bottom-right corner, so it sits
    below the login card instead of touching it.
  - Self-contained "dvb-" CSS with explicit colours, so it stays dark and readable in any theme.
  - Both credits are always visible.
  Animations: slide-in + float, staggered text reveal, a spotlight that follows the cursor,
  a shine sweep across the card, pulsing rings on the icons, a wiggling </> icon, a tilting
  cap, a hopping pin, a shimmering course chip and a glowing developer name.
  All motion stops for users who prefer reduced motion.
*/
const css = `
  @keyframes dvb-in { 0% { opacity: 0; transform: translateX(40px); } 70% { opacity: 1; transform: translateX(-4px); } 100% { opacity: 1; transform: none; } }
  @keyframes dvb-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
  @keyframes dvb-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  @keyframes dvb-bar { to { background-position: 200% 0; } }
  @keyframes dvb-ring { 0% { transform: scale(1); opacity: .6; } 100% { transform: scale(1.7); opacity: 0; } }
  @keyframes dvb-shine { 0%, 60% { transform: translateX(-140%) skewX(-20deg); } 100% { transform: translateX(420%) skewX(-20deg); } }
  @keyframes dvb-code { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(1.18); } }
  @keyframes dvb-tilt { 0%, 100% { transform: rotate(-9deg); } 50% { transform: rotate(9deg) translateY(-1px); } }
  @keyframes dvb-hop { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-3px); } }
  @keyframes dvb-glowtxt { 0%, 100% { text-shadow: 0 0 0 rgba(167,139,250,0); } 50% { text-shadow: 0 0 14px rgba(167,139,250,.75); } }
  @keyframes dvb-chip { 0%, 55% { transform: translateX(-120%); } 100% { transform: translateX(260%); } }

  .dvb { position: fixed; right: 12px; bottom: 12px; z-index: 50; width: 300px; max-width: calc(100vw - 24px);
    font-family: inherit; animation: dvb-in .8s cubic-bezier(.2,.8,.2,1) .3s both, dvb-float 6s ease-in-out 1.2s infinite; }
  .dvb, .dvb * { box-sizing: border-box; }
  .dvb-card { position: relative; overflow: hidden; border-radius: 22px; border: 1px solid rgba(255,255,255,.14); background: #0b0e1f !important;
    box-shadow: 0 25px 60px -10px rgba(10,8,40,.9), 0 0 0 1px rgba(99,102,241,.15); }
  .dvb-card::before { content: ''; position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity .3s;
    background: radial-gradient(180px circle at var(--mx,50%) var(--my,50%), rgba(129,140,248,.22), transparent 70%); }
  .dvb-card:hover::before { opacity: 1; }
  .dvb-shine { position: absolute; top: 0; bottom: 0; left: 0; width: 30%; pointer-events: none; z-index: 2;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,.08), transparent); animation: dvb-shine 7s ease-in-out 2s infinite; }
  .dvb-top { height: 3px; background: linear-gradient(90deg,#4f35f5,#8b5cf6,#c084fc,#8b5cf6,#4f35f5); background-size: 200% 100%; animation: dvb-bar 5s linear infinite; }
  .dvb-body { position: relative; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
  .dvb-label { margin: 0; font-size: 9.5px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: #94a3c4 !important; }
  .dvb-pill { display: flex; gap: 10px; padding: 9px 11px; border-radius: 14px; border: 1px solid rgba(255,255,255,.1);
    background: #131833 !important; transition: transform .25s ease, border-color .25s ease; }
  .dvb-pill:hover { transform: translateY(-2px); border-color: rgba(129,140,248,.5); }
  .dvb-r { opacity: 0; animation: dvb-rise .6s cubic-bezier(.2,.8,.2,1) both; }
  .dvb-ico { position: relative; width: 34px; height: 34px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 50%;
    background: #272b66 !important; color: #c3c8ff !important; box-shadow: inset 0 0 0 1px rgba(129,140,248,.35); }
  .dvb-ico::after { content: ''; position: absolute; inset: 0; border-radius: 50%; border: 2px solid #818cf8; animation: dvb-ring 2.6s ease-out 1.6s infinite; }
  .dvb-code { display: inline-flex; animation: dvb-code 2.4s ease-in-out 1.6s infinite; }
  .dvb-cap { display: inline-flex; animation: dvb-tilt 3.2s ease-in-out 1.8s infinite; }
  .dvb-pin { display: inline-flex; animation: dvb-hop 2.8s ease-in-out 2.2s infinite; }
  .dvb-txt { min-width: 0; line-height: 1.3; }
  .dvb-name { margin: 1px 0 0; font-size: 16px; font-weight: 700; letter-spacing: -.01em; color: #c4b8ff !important; animation: dvb-glowtxt 3.6s ease-in-out 1.5s infinite; }
  .dvb-name2 { margin: 1px 0 0; font-size: 13px; font-weight: 700; color: #ffffff !important; }
  .dvb-chip { position: relative; overflow: hidden; display: inline-block; margin-top: 5px; padding: 2px 10px; border-radius: 999px; font-size: 10.5px; font-weight: 600;
    color: #ffffff !important; background: linear-gradient(90deg,#4f35f5,#8a1fff) !important; box-shadow: 0 5px 14px rgba(99,70,245,.4); }
  .dvb-chip::after { content: ''; position: absolute; top: 0; bottom: 0; left: 0; width: 40%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent); animation: dvb-chip 4.5s ease-in-out 2.4s infinite; }
  .dvb-min { position: absolute; top: 9px; right: 9px; z-index: 3; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; cursor: pointer;
    border-radius: 50%; border: 1px solid rgba(255,255,255,.15); background: #1b2147 !important; color: #c3c8ff !important; padding: 0; transition: transform .2s, background .2s; }
  .dvb-min:hover { background: #2f3680 !important; transform: scale(1.12); }
  .dvb-mini { display: flex; align-items: center; gap: 8px; padding: 9px 40px 9px 14px; font-size: 12px; font-weight: 600; color: #e0e4ff !important; }
  .dvb-sub { margin: 3px 0 0; font-size: 11px; color: #aab3d1 !important; }
  .dvb-loc { margin: 4px 0 0; display: flex; gap: 4px; align-items: flex-start; font-size: 11px; font-weight: 500; color: #a5b4fc !important; }

  /* Scale with screen height so the badge always stays below the login card */
  @media (max-height: 920px), (max-width: 1023px) { .dvb { zoom: .85; } }
  @media (max-height: 760px) { .dvb { zoom: .75; } }
  @media (max-height: 640px), (max-width: 480px) { .dvb { zoom: .65; } }
  @media (prefers-reduced-motion: reduce) {
    .dvb, .dvb-top, .dvb-shine, .dvb-ico::after, .dvb-code, .dvb-cap, .dvb-pin, .dvb-name, .dvb-chip::after { animation: none; }
    .dvb-r { animation: none; opacity: 1; } .dvb-shine, .dvb-ico::after { display: none; }
  }
`
const d = (s) => ({ animationDelay: `${s}s` })

function Icon({ children, size = 16 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>{children}</svg>
  )
}

export default function DeveloperBadge() {
  const [open, setOpen] = useState(true) // small button lets the viewer tuck the badge away if the screen is tiny
  // Spotlight follows the cursor inside the card
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }
  return (
    <aside aria-label="Project credits" className="dvb">
      <style>{css}</style>
      <div className="dvb-card" onMouseMove={onMove}>
        <span className="dvb-shine" aria-hidden="true" />
        <div className="dvb-top" aria-hidden="true" />
        <button type="button" className="dvb-min" onClick={() => setOpen(!open)} aria-label={open ? 'Minimize credits' : 'Show credits'} aria-expanded={open}>
          <Icon size={12}>{open ? <path d="m6 9 6 6 6-6" /> : <path d="m18 15-6-6-6 6" />}</Icon>
        </button>
        {!open && <div className="dvb-mini">Project Credits &middot; Asna Sherin.A</div>}
        {open && <div className="dvb-body">
          <div className="dvb-pill dvb-r" style={{ ...d(0.7), alignItems: 'center' }}>
            <span className="dvb-ico"><span className="dvb-code"><Icon><path d="m16 18 6-6-6-6" /><path d="m8 6-6 6 6 6" /></Icon></span></span>
            <div className="dvb-txt">
              <p className="dvb-label">Developed by</p>
              <p className="dvb-name">Asna Sherin.A</p>
              <span className="dvb-chip">II M.Sc Computer Science</span>
            </div>
          </div>

          <div className="dvb-pill dvb-r" style={{ ...d(0.9), alignItems: 'flex-start' }}>
            <span className="dvb-ico"><span className="dvb-cap"><Icon><path d="M22 10 12 5 2 10l10 5 10-5z" /><path d="M6 12v5c3 2 9 2 12 0v-5" /></Icon></span></span>
            <div className="dvb-txt">
              <p className="dvb-label">Under the guidance of</p>
              <p className="dvb-name2">Dr. R. Kavitha Jaba Malar</p>
              <p className="dvb-sub">Associate Professor &amp; Head<br />Postgraduate &amp; Research Dept. of Computer Science</p>
              <p className="dvb-loc"><span className="dvb-pin" style={{ marginTop: 1 }}><Icon size={12}><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></Icon></span>Muslim Arts College, Thiruvithancode</p>
            </div>
          </div>
        </div>}
      </div>
    </aside>
  )
}