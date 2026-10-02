import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Moon, Sun, Image as ImageIcon, Upload, Trash2,
  Check, Palette, Type, Sliders, MessageSquare, CheckCheck,
  RefreshCw, Eye, ALargeSmall, Baseline
} from 'lucide-react'
import {
  useTheme,
  WALLPAPER_PRESETS,
  ACCENT_PRESETS,
  FONT_COLOR_PRESETS,
  FONT_SIZES,
  FONT_FAMILIES
} from '../context/ThemeContext'
import AppTitle from '../components/AppTitle'

// ── Section tab definitions ────────────────────────────────────────────────
const TABS = [
  { id: 'theme',    label: 'Theme Mode',      icon: Sun },
  { id: 'font',     label: 'Font Family',      icon: Baseline },
  { id: 'size',     label: 'Text & Color',     icon: ALargeSmall },
  { id: 'accent',   label: 'Accent Color',     icon: Palette },
  { id: 'wallpaper',label: 'Chat Background',  icon: ImageIcon },
]

export default function Settings() {
  const navigate   = useNavigate()
  const fileInputRef = useRef(null)
  const [activeTab,  setActiveTab]  = useState('theme')
  const [saveToast,  setSaveToast]  = useState(false)

  const {
    themeMode, setThemeMode,
    accentId, setAccentId, currentAccent,
    chatWallpaper, setChatWallpaper,
    customWallpaper, setCustomImage, clearCustomImage,
    wallpaperDim, setWallpaperDim,
    bubbleTextColor, setBubbleTextColor,
    fontSizeId, setFontSizeId, currentFontSize,
    fontFamilyId, setFontFamilyId, currentFontFamily,
    getActiveWallpaperUrl,
  } = useTheme()

  const isLight       = themeMode === 'light'
  const activeWallpaper = getActiveWallpaperUrl()

  // ── helpers ──────────────────────────────────────────────────────────────
  const triggerToast = () => {
    setSaveToast(true)
    setTimeout(() => setSaveToast(false), 2500)
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => { setCustomImage(ev.target.result); triggerToast() }
    reader.readAsDataURL(file)
  }

  const handleResetDefaults = () => {
    setThemeMode('dark')
    setAccentId('indigo')
    clearCustomImage()
    setChatWallpaper('none')
    setWallpaperDim(0.4)
    setBubbleTextColor('#ffffff')
    setFontSizeId('md')
    setFontFamilyId('inter')
    triggerToast()
  }

  // ── shared section card wrapper ──────────────────────────────────────────
  const Card = ({ children }) => (
    <div className={`p-5 sm:p-6 rounded-3xl border transition-all ${
      isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/60 border-slate-800 shadow-xl backdrop-blur-md'
    }`}>
      {children}
    </div>
  )

  // ── section title ─────────────────────────────────────────────────────────
  const SectionTitle = ({ icon: Icon, iconBg, label, sub }) => (
    <div className="flex items-center gap-2.5 mb-5">
      <div className={`p-2 rounded-xl ${iconBg}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <h3 className="text-sm font-bold font-outfit">{label}</h3>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION PANELS
  // ─────────────────────────────────────────────────────────────────────────

  const PanelTheme = () => (
    <Card>
      <SectionTitle icon={Sun} iconBg="bg-indigo-500/15 text-indigo-400" label="Interface Mode" sub="Switch between deep dark mode and clean light mode" />
      <div className="grid grid-cols-2 gap-4">
        {/* Dark */}
        <button
          onClick={() => setThemeMode('dark')}
          className={`p-4 rounded-2xl border flex flex-col items-center gap-3 transition-all cursor-pointer ${
            themeMode === 'dark'
              ? 'border-indigo-500 bg-indigo-600/10 ring-2 ring-indigo-500/30 shadow-md'
              : isLight ? 'border-slate-200 hover:border-slate-300 bg-slate-50' : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-indigo-400 shadow-md">
            <Moon className="w-7 h-7" />
          </div>
          <div className="text-center">
            <span className="text-sm font-bold block">Dark Mode</span>
            <span className="text-[11px] text-slate-400">Deep midnight contrast</span>
          </div>
          {themeMode === 'dark' && (
            <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center">
              <Check className="w-3 h-3" />
            </span>
          )}
        </button>

        {/* Light */}
        <button
          onClick={() => setThemeMode('light')}
          className={`p-4 rounded-2xl border flex flex-col items-center gap-3 transition-all cursor-pointer ${
            themeMode === 'light'
              ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30 shadow-md'
              : isLight ? 'border-slate-200 hover:border-slate-300 bg-slate-50' : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 shadow-md">
            <Sun className="w-7 h-7" />
          </div>
          <div className="text-center">
            <span className="text-sm font-bold block">Light Mode</span>
            <span className="text-[11px] text-slate-400">Bright and crisp layout</span>
          </div>
          {themeMode === 'light' && (
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center">
              <Check className="w-3 h-3" />
            </span>
          )}
        </button>
      </div>
    </Card>
  )

  const PanelFont = () => (
    <Card>
      <SectionTitle icon={Baseline} iconBg="bg-sky-500/15 text-sky-400" label="Chat Font Family" sub="Choose the typeface used across all chat messages and bubbles" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {FONT_FAMILIES.map((ff) => {
          const sel = fontFamilyId === ff.id
          return (
            <button
              key={ff.id}
              onClick={() => { setFontFamilyId(ff.id); triggerToast() }}
              className={`p-4 rounded-2xl border flex flex-col gap-2 text-left transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                sel
                  ? 'border-sky-500 bg-sky-500/10 ring-2 ring-sky-500/30 shadow-md'
                  : isLight ? 'border-slate-200 hover:border-slate-300 bg-slate-50' : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
              }`}
            >
              {/* Preview text in actual font */}
              <span
                className="text-xl font-bold leading-none"
                style={{ fontFamily: ff.stack }}
              >
                Aa
              </span>
              <div className="flex items-start justify-between w-full">
                <div>
                  <span
                    className="text-xs font-bold block leading-tight"
                    style={{ fontFamily: ff.stack }}
                  >
                    {ff.name}
                  </span>
                  <span
                    className="text-[10px] text-slate-400 leading-snug mt-0.5 block"
                    style={{ fontFamily: ff.stack }}
                  >
                    {ff.sample}
                  </span>
                </div>
                {sel && (
                  <span className="w-4 h-4 rounded-full bg-sky-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </Card>
  )

  const PanelTextColor = () => (
    <Card>
      <SectionTitle icon={ALargeSmall} iconBg="bg-pink-500/15 text-pink-400" label="Text & Font Styling" sub="Outgoing bubble font color and message text scale" />

      {/* Bubble Font Color */}
      <div className="mb-6">
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Outgoing Bubble Font Color
        </label>
        <div className="flex items-center gap-2.5 flex-wrap">
          {FONT_COLOR_PRESETS.map((fc) => {
            const sel = bubbleTextColor.toLowerCase() === fc.value.toLowerCase()
            return (
              <button
                key={fc.id}
                onClick={() => { setBubbleTextColor(fc.value); triggerToast() }}
                className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-semibold transition cursor-pointer ${
                  sel
                    ? 'border-indigo-500 ring-2 ring-indigo-500/40 bg-indigo-500/10'
                    : isLight ? 'border-slate-200 bg-slate-50 hover:border-slate-300' : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                }`}
              >
                <span className="w-3.5 h-3.5 rounded-full border border-slate-400/40 shadow-sm" style={{ backgroundColor: fc.value }} />
                <span>{fc.name}</span>
              </button>
            )
          })}
          {/* Custom color picker */}
          <div className="flex items-center gap-2 pl-1">
            <input
              type="color"
              value={bubbleTextColor}
              onChange={(e) => setBubbleTextColor(e.target.value)}
              className="w-8 h-8 rounded-lg border border-slate-600/60 bg-transparent cursor-pointer p-0.5"
              title="Pick custom font color"
            />
            <span className="text-xs font-mono text-slate-400">{bubbleTextColor}</span>
          </div>
        </div>
      </div>

      {/* Font Size */}
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Message Font Size
        </label>
        <div className="grid grid-cols-3 gap-3">
          {FONT_SIZES.map((fs) => {
            const sel = fontSizeId === fs.id
            return (
              <button
                key={fs.id}
                onClick={() => { setFontSizeId(fs.id); triggerToast() }}
                className={`py-3 px-3 rounded-2xl border flex flex-col items-center gap-1.5 font-semibold transition cursor-pointer ${
                  sel
                    ? 'border-indigo-500 bg-indigo-600/15 text-indigo-400 ring-2 ring-indigo-500/30'
                    : isLight ? 'border-slate-200 hover:border-slate-300 text-slate-600' : 'border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <span style={{ fontSize: fs.sizePx }}>Ag</span>
                <span className="text-[10px]">{fs.name}</span>
              </button>
            )
          })}
        </div>
      </div>
    </Card>
  )

  const PanelAccent = () => (
    <Card>
      <SectionTitle icon={Palette} iconBg="bg-emerald-500/15 text-emerald-400" label="Accent & Bubble Color" sub="Controls outgoing message bubble color, active states, and buttons" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {ACCENT_PRESETS.map((acc) => {
          const sel = accentId === acc.id
          return (
            <button
              key={acc.id}
              onClick={() => { setAccentId(acc.id); triggerToast() }}
              className={`p-3 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer text-left hover:scale-[1.02] active:scale-[0.98] ${
                sel
                  ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/30'
                  : isLight ? 'border-slate-200 hover:border-slate-300 bg-slate-50' : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${acc.gradient} shadow-md shrink-0 flex items-center justify-center text-white`}
              >
                {sel && <Check className="w-3.5 h-3.5" />}
              </div>
              <span className="text-xs font-semibold truncate">{acc.name}</span>
            </button>
          )
        })}
      </div>
    </Card>
  )

  const PanelWallpaper = () => (
    <Card>
      <div className="flex items-center justify-between mb-5">
        <SectionTitle icon={ImageIcon} iconBg="bg-violet-500/15 text-violet-400" label="Chat Background Wallpaper" sub="Choose a preset or upload your own image" />
        <div className="flex items-center gap-2 shrink-0">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 text-white text-xs font-semibold rounded-xl shadow-md transition cursor-pointer active:scale-95"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload</span>
          </button>
          {(customWallpaper || chatWallpaper !== 'none') && (
            <button
              onClick={clearCustomImage}
              className="p-1.5 hover:bg-rose-500/20 text-rose-400 rounded-xl transition cursor-pointer"
              title="Clear wallpaper"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Preset Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {WALLPAPER_PRESETS.map((item) => {
          const sel = !customWallpaper && chatWallpaper === item.id
          return (
            <div
              key={item.id}
              onClick={() => { clearCustomImage(); setChatWallpaper(item.id) }}
              className={`relative h-20 rounded-2xl overflow-hidden border cursor-pointer transition-all hover:scale-[1.03] flex items-end p-2 ${
                sel ? 'border-indigo-500 ring-2 ring-indigo-500/40 shadow-lg' : isLight ? 'border-slate-200 hover:border-slate-300' : 'border-slate-800 hover:border-slate-700'
              }`}
              style={{ background: item.type === 'color' || !item.value ? item.preview : `url(${item.value}) center/cover no-repeat` }}
            >
              <div className="absolute inset-0 bg-black/40 hover:bg-black/20 transition" />
              <span className="relative z-10 text-[11px] font-semibold text-white drop-shadow">{item.name}</span>
              {sel && (
                <span className="absolute top-2 right-2 w-4 h-4 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] shadow">
                  <Check className="w-3 h-3" />
                </span>
              )}
            </div>
          )
        })}

        {/* Custom upload tile */}
        {customWallpaper && (
          <div
            className="relative h-20 rounded-2xl overflow-hidden border border-emerald-500 ring-2 ring-emerald-500/40 cursor-pointer shadow-lg flex items-end p-2"
            style={{ background: `url(${customWallpaper}) center/cover no-repeat` }}
          >
            <div className="absolute inset-0 bg-black/40" />
            <span className="relative z-10 text-[11px] font-semibold text-white">Custom</span>
            <span className="absolute top-2 right-2 w-4 h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px]">
              <Check className="w-3 h-3" />
            </span>
          </div>
        )}
      </div>

      {/* Opacity slider */}
      {activeWallpaper && (
        <div className="pt-4 border-t border-slate-700/40 flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs">
            <span className={`font-semibold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>Wallpaper Opacity</span>
            <span className="font-mono text-indigo-400 font-bold">{Math.round(wallpaperDim * 100)}%</span>
          </div>
          <input
            type="range" min="0.05" max="1" step="0.05"
            value={wallpaperDim}
            onChange={(e) => setWallpaperDim(parseFloat(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer h-1.5 rounded-lg"
          />
        </div>
      )}
    </Card>
  )

  const PANELS = {
    theme:     <PanelTheme />,
    font:      <PanelFont />,
    size:      <PanelTextColor />,
    accent:    <PanelAccent />,
    wallpaper: <PanelWallpaper />,
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen w-screen overflow-y-auto transition-colors duration-200 ${isLight ? 'bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100'}`}>

      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <header className={`h-14 px-4 md:px-8 border-b sticky top-0 z-30 backdrop-blur-md flex items-center justify-between transition-colors ${
        isLight ? 'bg-white/90 border-slate-200 shadow-xs' : 'bg-slate-950/90 border-slate-800 shadow-md'
      }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className={`p-1.5 rounded-xl transition cursor-pointer flex items-center gap-2 text-sm font-medium ${
              isLight ? 'hover:bg-slate-200 text-slate-700' : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Back</span>
          </button>
          <div className={`h-4 w-px ${isLight ? 'bg-slate-300' : 'bg-slate-700'}`} />
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-bold font-outfit">Settings & Customization</span>
          </div>
        </div>

        {/* Project title (centred on wide screens) */}
        <AppTitle
          isLight={isLight}
          compact
          className="hidden xl:flex absolute left-1/2 -translate-x-1/2 w-[34rem] max-w-[45%]"
        />

        <div className="flex items-center gap-2">
          {saveToast && (
            <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5">
              <Check className="w-3 h-3" /> Saved!
            </div>
          )}
          <button
            onClick={handleResetDefaults}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
              isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </header>

      {/* Project title strip for narrower screens */}
      <div className="xl:hidden px-4 pt-3 flex justify-center">
        <AppTitle isLight={isLight} className="w-full max-w-2xl" />
      </div>

      {/* ── Main: 3-column (nav | panel | preview) ────────────────────────── */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex gap-6 items-start">

          {/* ── LEFT NAV TABS ──────────────────────────────────────────────── */}
          <nav className={`hidden lg:flex flex-col gap-1 w-48 shrink-0 sticky top-20 rounded-3xl border p-2 ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/60 border-slate-800'
          }`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest px-3 pt-2 pb-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
              Categories
            </p>
            {TABS.map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all cursor-pointer text-left ${
                    active
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      : isLight ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>

          {/* ── MOBILE TABS (horizontal scroll) ────────────────────────────── */}
          <div className="lg:hidden w-full mb-4">
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {TABS.map((tab) => {
                const Icon = tab.icon
                const active = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                      active
                        ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                        : isLight ? 'bg-white text-slate-600 border border-slate-200' : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── CENTER: ACTIVE PANEL ───────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Mobile tabs render above on small screens, desktop panel renders here */}
            <div className="hidden lg:block">
              {PANELS[activeTab]}
            </div>
            <div className="lg:hidden">
              {PANELS[activeTab]}
            </div>
          </div>

          {/* ── RIGHT: LIVE PREVIEW ───────────────────────────────────────── */}
          <div className="hidden lg:block w-72 xl:w-80 shrink-0 sticky top-20">
            <div className={`rounded-3xl border overflow-hidden shadow-2xl transition-all ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}>

              {/* Preview header */}
              <div className={`p-3 border-b flex items-center justify-between ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
              }`}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white text-[10px] font-bold shadow">SC</div>
                  <div>
                    <h4 className="text-xs font-bold leading-tight">Sarah Connor</h4>
                    <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-[10px] font-semibold">
                  <Eye className="w-3 h-3" /> Live
                </div>
              </div>

              {/* Message feed preview */}
              <div className="relative h-64 overflow-hidden flex flex-col justify-end p-3">
                {/* Wallpaper */}
                {activeWallpaper && (
                  <div
                    className="absolute inset-0 bg-cover bg-center pointer-events-none"
                    style={{ backgroundImage: `url(${activeWallpaper})`, opacity: wallpaperDim }}
                  />
                )}
                <div className={`absolute inset-0 -z-10 ${isLight ? 'bg-slate-100' : 'bg-slate-950'}`} />

                <div className="relative z-10 space-y-2.5">
                  {/* Incoming */}
                  <div className="flex justify-start">
                    <div className={`p-2.5 rounded-2xl max-w-[85%] shadow-sm rounded-bl-sm ${
                      isLight ? 'bg-white border border-slate-200 text-slate-800' : 'bg-slate-900 border border-slate-800 text-slate-100'
                    }`}>
                      <p className="text-xs leading-relaxed" style={{ fontFamily: currentFontFamily?.stack }}>
                        Hey! How's the new look? ✨
                      </p>
                      <span className="text-[9px] text-slate-400 block text-right mt-1">10:42</span>
                    </div>
                  </div>

                  {/* Outgoing */}
                  <div className="flex justify-end">
                    <div
                      className={`p-2.5 rounded-2xl max-w-[85%] shadow-lg rounded-br-sm bg-gradient-to-r ${currentAccent.gradient}`}
                      style={{ color: bubbleTextColor }}
                    >
                      <p className="text-xs leading-relaxed font-medium" style={{ fontFamily: currentFontFamily?.stack, fontSize: currentFontSize?.sizePx }}>
                        Looks amazing! 🚀 Colors, fonts & themes all live.
                      </p>
                      <div className="flex items-center justify-end gap-1 text-[9px] opacity-75 mt-1">
                        <span>10:43</span>
                        <CheckCheck className="w-3 h-3" />
                      </div>
                    </div>
                  </div>

                  {/* Second incoming */}
                  <div className="flex justify-start">
                    <div className={`p-2.5 rounded-2xl max-w-[85%] shadow-sm rounded-bl-sm ${
                      isLight ? 'bg-white border border-slate-200 text-slate-800' : 'bg-slate-900 border border-slate-800 text-slate-100'
                    }`}>
                      <p className="text-xs leading-relaxed" style={{ fontFamily: currentFontFamily?.stack }}>
                        Perfect! 🎨
                      </p>
                      <span className="text-[9px] text-slate-400 block text-right mt-1">10:43</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Input mockup */}
              <div className={`p-2.5 border-t flex items-center gap-2 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
              }`}>
                <div className={`flex-1 px-3 py-1.5 rounded-xl text-xs border ${
                  isLight ? 'bg-white border-slate-200 text-slate-400' : 'bg-slate-900 border-slate-800 text-slate-500'
                }`} style={{ fontFamily: currentFontFamily?.stack }}>
                  Type a message...
                </div>
                <div className={`w-7 h-7 rounded-xl bg-gradient-to-tr ${currentAccent.gradient} flex items-center justify-center text-white shadow`}>
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Apply button */}
            <button
              onClick={() => navigate('/')}
              className={`w-full mt-3 py-3 rounded-2xl bg-gradient-to-r ${currentAccent.gradient} text-white font-bold text-xs shadow-lg transition-all active:scale-[0.98] cursor-pointer hover:opacity-90`}
            >
              ✓ Apply & Return to Chat
            </button>
          </div>

        </div>
      </main>

    </div>
  )
}