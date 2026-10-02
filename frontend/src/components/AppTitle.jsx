import React from 'react'

export const APP_TITLE = 'Real-Time Chat and Collaboration Platform with WebRTC Integration'

/**
 * Gradient project title with a glowing divider line and centre dot.
 * Props:
 *  - isLight : use darker gradient on light theme
 *  - compact : smaller text (for use inside slim headers)
 *  - className : extra wrapper classes (width / positioning)
 */
export default function AppTitle({ isLight = false, compact = false, className = '' }) {
  return (
    <div className={`flex flex-col items-center select-none min-w-0 ${className}`}>
      <h2
        title={APP_TITLE}
        className={`font-outfit font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r max-w-full truncate leading-tight ${
          compact ? 'text-sm' : 'text-sm sm:text-base md:text-lg'
        } ${
          isLight
            ? 'from-indigo-600 via-violet-600 to-indigo-500'
            : 'from-indigo-300 via-violet-200 to-indigo-300'
        }`}
      >
        {APP_TITLE}
      </h2>

      <div
        className={`relative w-full h-px mt-1.5 bg-gradient-to-r from-transparent to-transparent ${
          isLight ? 'via-indigo-500/60' : 'via-indigo-500/80'
        }`}
      >
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_10px_2px_rgba(139,92,246,0.65)]" />
      </div>
    </div>
  )
}