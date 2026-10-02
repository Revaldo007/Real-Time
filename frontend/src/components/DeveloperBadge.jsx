import React, { useEffect, useState } from 'react'

/*
  Bottom-right project credits badge for the Rivo login page.

  Animation (different from the other project's open/close badge):
  - Slides in from the right with a small bounce, then gently floats.
  - A light beam travels around the border.
  - The card is a fixed size and rotates between two "faces":
      face 1 = Developed by, face 2 = Under the guidance of.
    Each face shows for 5s, so one full loop takes 10s. A thin bar at the bottom
    shows the time until the next face.
  - Click the card to jump to the other face (the 10s loop carries on from there).
  - Set AUTO_ROTATE = false to switch only on click.
*/
const AUTO_ROTATE = true
const FACE_TIME = 5000 // ms per face (2 faces -> 10s loop)

const css = `
  @keyframes dev-in {
    0%   { opacity: 0; transform: translateX(48px) scale(.95); }
    65%  { opacity: 1; transform: translateX(-5px) scale(1.01); }
    100% { opacity: 1; transform: none; }
  }
  @keyframes dev-float {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-4px); }
  }
  @keyframes dev-spin { to { transform: rotate(360deg); } }
  @keyframes dev-progress { from { transform: scaleX(0); } to { transform: scaleX(1); } }

  .dev-badge { animation: dev-in .8s cubic-bezier(.2,.8,.2,1) .3s both, dev-float 5s ease-in-out 1.3s infinite; }
  .dev-beam {
    position: absolute; inset: -100%;
    background: conic-gradient(from 0deg, transparent 0 62%, #6366f1 78%, #8b5cf6 88%, #d946ef 96%, transparent 100%);
    animation: dev-spin 6s linear infinite;
  }
  .dev-bar { transform-origin: left; animation: dev-progress ${FACE_TIME}ms linear forwards; }

  @media (prefers-reduced-motion: reduce) {
    .dev-badge, .dev-beam, .dev-bar { animation: none; }
    .dev-beam { opacity: .6; }
  }
`

function Icon({ children, className = 'h-4 w-4' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

// How one face is shown / hidden (slides up and fades)
const faceClass = (active, above) =>
  `absolute inset-0 flex items-center gap-3 px-4 py-3 pr-10 transition-all duration-500 ease-out motion-reduce:transition-none ${
    active ? 'translate-y-0 opacity-100' : above ? '-translate-y-4 opacity-0' : 'translate-y-4 opacity-0'
  }`

export default function DeveloperBadge() {
  const [face, setFace] = useState(0) // 0 = developer, 1 = guide

  // Automatic rotation. A click changes the face and this timer restarts from there.
  useEffect(() => {
    if (!AUTO_ROTATE) return
    const t = setTimeout(() => setFace((f) => (f + 1) % 2), FACE_TIME)
    return () => clearTimeout(t)
  }, [face])

  return (
    <aside className="dev-badge fixed bottom-4 right-4 z-30 w-80 max-w-[calc(100vw-2rem)]">
      <style>{css}</style>

      <button
        type="button"
        onClick={() => setFace((f) => (f + 1) % 2)}
        aria-label={face === 0 ? 'Show guide details' : 'Show developer details'}
        className="relative block w-full cursor-pointer overflow-hidden rounded-2xl p-px text-left shadow-2xl shadow-indigo-950/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
      >
        {/* Light beam running around the border */}
        <span className="dev-beam" aria-hidden="true" />

        <span className="relative block overflow-hidden rounded-[15px] bg-slate-900/95 backdrop-blur-xl">
          <span className="relative block h-[9.25rem]">
            {/* Face 1: developer */}
            <span className={faceClass(face === 0, true)} aria-hidden={face !== 0}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-xl font-bold text-white shadow-lg shadow-indigo-500/25">
                A
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Developed by
                </span>
                <span className="mt-0.5 block truncate text-lg font-bold tracking-tight text-white">Asna Sherin.A</span>
                <span className="mt-1.5 inline-block rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-medium text-indigo-300">
                  II M.Sc Computer Science
                </span>
              </span>
            </span>

            {/* Face 2: guide */}
            <span className={faceClass(face === 1, false)} aria-hidden={face !== 1}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center self-start rounded-xl bg-indigo-500/10 text-indigo-400">
                <Icon className="h-5 w-5">
                  <path d="M22 10 12 5 2 10l10 5 10-5z" />
                  <path d="M6 12v5c3 2 9 2 12 0v-5" />
                </Icon>
              </span>
              <span className="min-w-0 leading-snug">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Under the guidance of
                </span>
                <span className="mt-0.5 block text-sm font-bold text-white">Dr. R. Kavitha Jaba Malar</span>
                <span className="mt-1 block text-xs text-slate-400">
                  Associate Professor &amp; Head
                  <br />
                  Postgraduate &amp; Research Dept. of Computer Science
                </span>
                <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-violet-300">
                  <Icon className="h-3 w-3 shrink-0">
                    <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </Icon>
                  Muslim Arts College, Thiruvithancode
                </span>
              </span>
            </span>

            {/* Face dots */}
            <span className="absolute right-3 top-3 flex flex-col gap-1" aria-hidden="true">
              {[0, 1].map((i) => (
                <span
                  key={i}
                  className={`w-1.5 rounded-full transition-all duration-300 ${
                    face === i ? 'h-4 bg-indigo-400' : 'h-1.5 bg-slate-700'
                  }`}
                />
              ))}
            </span>
          </span>

          {/* Time until the next face (restarts on every change) */}
          {AUTO_ROTATE && (
            <span className="block h-0.5 w-full bg-slate-800" aria-hidden="true">
              <span
                key={face}
                className="dev-bar block h-full w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500"
              />
            </span>
          )}
        </span>
      </button>
    </aside>
  )
}