import React, { useState, useContext, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import {
  MoreVertical, Globe, ChevronDown,
  ArrowLeft, QrCode, Sparkles,
  RefreshCw, Loader2, AlertCircle,
  MessageSquare, Shield, Zap, Lock
} from 'lucide-react'
import conversationGif from '../assets/Conversation.gif'
import DeveloperBadge from '../components/DeveloperBadge'

const COUNTRIES = [
  { name: 'India', flag: '🇮🇳', code: '+91' },
  { name: 'United States', flag: '🇺🇸', code: '+1' },
  { name: 'United Kingdom', flag: '🇬🇧', code: '+44' },
  { name: 'Brazil', flag: '🇧🇷', code: '+55' },
  { name: 'Canada', flag: '🇨🇦', code: '+1' },
  { name: 'Australia', flag: '🇦🇺', code: '+61' },
  { name: 'Germany', flag: '🇩🇪', code: '+49' },
  { name: 'France', flag: '🇫🇷', code: '+33' },
  { name: 'Japan', flag: '🇯🇵', code: '+81' },
  { name: 'South Korea', flag: '🇰🇷', code: '+82' },
  { name: 'UAE', flag: '🇦🇪', code: '+971' },
  { name: 'Mexico', flag: '🇲🇽', code: '+52' },
  { name: 'Spain', flag: '🇪🇸', code: '+34' },
  { name: 'Italy', flag: '🇮🇹', code: '+39' },
  { name: 'Colombia', flag: '🇨🇴', code: '+57' },
]

const FEATURE_PILLS = [
  { icon: Shield, label: 'End-to-End Encrypted' },
  { icon: Zap,    label: 'Real-Time Messaging' },
  { icon: Lock,   label: 'Private & Secure' },
]

export default function Login() {
  const { login } = useContext(AuthContext)
  const navigate  = useNavigate()

  const [step, setStep] = useState(1)
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0])
  const [countryCode, setCountryCode]   = useState('+91')
  const [phoneNumber, setPhoneNumber]   = useState('')
  const [otp, setOtp]                   = useState(['', '', '', '', '', ''])
  const [error, setError]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [countdown, setCountdown]       = useState(0)
  const [showMenu, setShowMenu]         = useState(false)
  const [showCountryPicker, setShowCountryPicker] = useState(false)
  const countdownRef = useRef(null)

  const getFullPhone = () => {
    const clean = phoneNumber.replace(/\D/g, '').replace(/^0+/, '')
    return `${countryCode}${clean}`
  }

  const startCountdown = () => {
    setCountdown(60)
    clearInterval(countdownRef.current)
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(countdownRef.current); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  useEffect(() => () => clearInterval(countdownRef.current), [])

  const handleCountrySelect = (c) => {
    setSelectedCountry(c)
    setCountryCode(c.code)
    setShowCountryPicker(false)
  }

  const handlePhoneSubmit = (e) => {
    e?.preventDefault()
    const clean = phoneNumber.replace(/\D/g, '')
    if (!clean || clean.length < 4) { setError('Please enter a valid phone number'); return }
    setError('')
    setOtp(['', '', '', '', '', ''])
    setStep(3)
    startCountdown()
  }

  const handleResend = () => {
    if (countdown > 0) return
    setError('')
    startCountdown()
  }

  const handleOtpSubmit = async (e) => {
    e?.preventDefault()
    const code = otp.join('')
    if (code.length < 6) { setError('Please enter the complete 6-digit code.'); return }
    setError('')
    setLoading(true)
    try {
      const ok = await login(getFullPhone())
      if (ok) { navigate('/'); return }
    } catch (err) {
      setError(typeof err === 'string' ? err : (err.response?.data?.detail || 'Authentication failed. Try again.'))
    } finally { setLoading(false) }
  }

  const handleAutoFill = () => {
    setOtp(['1','2','3','4','5','6'])
    setError('')
    setTimeout(() => document.getElementById('otp-5')?.focus(), 50)
  }

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return
    if (value.length > 1) value = value[value.length - 1]
    const next = [...otp]; next[index] = value; setOtp(next)
    if (value && index < 5) document.getElementById(`otp-${index + 1}`)?.focus()
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0)
      document.getElementById(`otp-${index - 1}`)?.focus()
    else if (e.key === 'Enter') handleOtpSubmit()
  }

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) { setOtp(pasted.split('')); document.getElementById('otp-5')?.focus() }
    e.preventDefault()
  }

  // ── SHARED CARD WRAPPER ────────────────────────────────────────────────────
  const Card = ({ children, className = '' }) => (
    <div className={`shrink-0 w-full max-w-sm bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden ${className}`}>
      {children}
    </div>
  )

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 w-full h-full flex flex-col items-center justify-center overflow-hidden bg-slate-950 selection:bg-indigo-500/30 p-4">

      {/* Responsive layout rules (keep title, card and credit badge from colliding) */}
      <style>{`
        /* Desktop: leave room for the title (top) and the credit badge (bottom-right) */
        @media (min-width: 1024px) {
          .login-right { margin-top: 5rem; margin-bottom: 14rem; max-height: calc(100% - 19rem) !important; }
          .login-left  { top: 6.5rem !important; bottom: 1.5rem !important; }
        }
        /* Short desktop screens (laptops): compact everything */
        @media (min-width: 1024px) and (max-height: 800px) {
          .login-title { top: 1.5rem !important; }
          .login-title h1 { font-size: 1.5rem !important; }
          .login-right { margin-top: 4.5rem; margin-bottom: 10rem; max-height: calc(100% - 14.5rem) !important; }
          .login-left  { gap: 1rem !important; top: 6rem !important; }
          .login-art   { width: 10rem !important; height: 10rem !important; }
          .login-art img { width: 8.5rem !important; height: 8.5rem !important; }
        }
        /* Very short desktop screens (e.g. zoomed laptops): give the card all the room */
        @media (min-width: 1024px) and (max-height: 650px) {
          .login-right { margin-top: 4rem; margin-bottom: 0; max-height: calc(100% - 4rem) !important; }
          .login-sub { display: none; }
          .login-art { width: 7rem !important; height: 7rem !important; }
          .login-art img { width: 6rem !important; height: 6rem !important; }
          .login-left { gap: 0.75rem !important; top: 5rem !important; }
        }
        /* Tablet / mobile: keep the card clear of the badge */
        @media (max-width: 1023px) {
          .login-right { margin-bottom: 8rem; max-height: calc(100% - 8rem) !important; }
        }
      `}</style>


      {/* ── Animated background orbs ──────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[100px] animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[120px] animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-[80px]" />
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(99,102,241,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.8) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* ── Top page title ────────────────────────────────────────────────── */}
      <div className="login-title hidden lg:flex absolute top-8 inset-x-0 z-10 px-8 justify-center pointer-events-none">
        <div className="relative inline-flex flex-col items-center pb-4">
          {/* soft glow behind the text */}
          <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-10 bg-indigo-500/25 blur-3xl rounded-full" />

          <h1 className="relative text-2xl xl:text-[32px] font-black tracking-tight leading-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-fuchsia-200 to-violet-400 drop-shadow-[0_2px_20px_rgba(129,140,248,0.45)]">
            Real-Time Chat and Collaboration Platform with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-indigo-300">WebRTC Integration</span>
          </h1>

          {/* gradient underline with centre dot */}
          <div className="relative mt-3 w-full h-[3px] rounded-full bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_14px_rgba(99,102,241,0.8)]">
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-violet-400 ring-4 ring-violet-500/25 shadow-[0_0_12px_rgba(167,139,250,0.9)]" />
          </div>
        </div>
      </div>

      {/* ── Left decorative panel (desktop) ───────────────────────────────── */}
      <div className="login-left hidden lg:flex absolute left-0 top-0 bottom-0 w-[42%] flex-col justify-center items-center px-12 gap-8">

        {/* Animated mockup */}
        <div className="login-art relative w-64 h-64 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-indigo-600/10 blur-2xl animate-pulse" />
          <img
            src={conversationGif || '/Conversation.gif'}
            onError={(e) => { e.currentTarget.src = '/Conversation.gif' }}
            alt="Chat illustration"
            className="relative w-56 h-56 object-contain drop-shadow-2xl select-none pointer-events-none"
          />
        </div>

        {/* Feature pills */}
        <div className="flex flex-col gap-2.5 w-full max-w-[260px]">
          {FEATURE_PILLS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/8 backdrop-blur-sm">
              <div className="w-7 h-7 rounded-xl bg-indigo-600/20 flex items-center justify-center text-indigo-400 shrink-0">
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold text-slate-300">{label}</span>
            </div>
          ))}
        </div>

        {/* Page title */}
        <div className="text-center max-w-xs">
          <p className="text-xs text-slate-500 leading-relaxed">
            Real-Time Chat and Collaboration Platform with WebRTC Integration
          </p>
        </div>
      </div>

      {/* ── Right: Auth card area ──────────────────────────────────────────── */}
      <div className="login-right relative z-10 flex flex-col items-center gap-6 w-full max-h-full overflow-y-auto py-4 lg:ml-auto lg:w-[58%] lg:pr-16 lg:pl-4">

        {/* Mobile brand */}
        <div className="lg:hidden flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-black text-white tracking-tight">Rivo</span>
            <span className="ml-2 text-xs text-indigo-400 font-semibold">Messenger</span>
          </div>
        </div>

        {/* ── STEP 1: WELCOME ───────────────────────────────────────────────── */}
        {step === 1 && (
          <Card>
            {/* Gradient top bar */}
            <div className="h-1 w-full bg-gradient-to-r from-indigo-600 via-violet-500 to-indigo-600" />

            <div className="p-6 sm:p-8 flex flex-col items-center gap-6">
              {/* Menu button */}
              <div className="w-full flex justify-end relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-8 w-44 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-50 py-1.5 overflow-hidden">
                    {['Help', 'Privacy Policy', 'Terms of Service'].map(item => (
                      <button key={item} onClick={() => setShowMenu(false)} className="w-full px-4 py-2.5 text-left text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition cursor-pointer">
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Illustration (mobile only) */}
              <div className="lg:hidden relative w-32 h-32 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-indigo-600/15 blur-xl" />
                <img
                  src={conversationGif || '/Conversation.gif'}
                  onError={(e) => { e.currentTarget.src = '/Conversation.gif' }}
                  alt="Welcome"
                  className="relative w-28 h-28 object-contain select-none pointer-events-none"
                />
              </div>

              {/* Heading */}
              <div className="text-center">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                  Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Rivo</span>
                </h2>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
                  Read our{' '}
                  <span className="text-indigo-400 hover:text-indigo-300 cursor-pointer transition">Privacy Policy</span>.
                  Tap <em>"Agree and continue"</em> to accept the{' '}
                  <span className="text-indigo-400 hover:text-indigo-300 cursor-pointer transition">Terms of Service</span>.
                </p>
              </div>

              {/* Language selector */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/70 border border-slate-700/60 rounded-2xl text-xs font-semibold text-slate-300 cursor-pointer hover:bg-slate-800 hover:border-slate-600 transition">
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                <span>English</span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </div>

              {/* Feature pills (mobile) */}
              <div className="lg:hidden w-full flex flex-col gap-2">
                {FEATURE_PILLS.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-800/60 border border-slate-700/40">
                    <div className="w-6 h-6 rounded-lg bg-indigo-600/20 flex items-center justify-center text-indigo-400 shrink-0">
                      <Icon className="w-3 h-3" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400">{label}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <button
                onClick={() => setStep(2)}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] text-sm cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Agree and continue</span>
                <span className="text-lg">→</span>
              </button>

              <p className="text-[11px] text-slate-600 text-center">
                Already have an account?{' '}
                <span onClick={() => setStep(2)} className="text-indigo-400 hover:text-indigo-300 cursor-pointer font-semibold transition">Sign in</span>
              </p>
            </div>
          </Card>
        )}

        {/* ── STEP 2: PHONE NUMBER ──────────────────────────────────────────── */}
        {step === 2 && (
          <Card>
            <div className="h-1 w-full bg-gradient-to-r from-indigo-600 via-violet-500 to-indigo-600" />
            <div className="p-6 sm:p-8 flex flex-col gap-6">
              {/* Header */}
              <div className="flex items-center gap-3">
                <button onClick={() => setStep(1)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-lg font-bold text-white">Enter your number</h2>
                  <p className="text-xs text-slate-400">We'll verify your phone to sign you in</p>
                </div>
                <div className="ml-auto relative">
                  <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 top-10 w-52 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-50 py-1.5 overflow-hidden">
                      <button
                        onClick={() => { setShowMenu(false); setStep(4) }}
                        className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition flex items-center gap-2 cursor-pointer"
                      >
                        <QrCode className="w-4 h-4 text-indigo-400" /> Link as companion device
                      </button>
                      <button onClick={() => setShowMenu(false)} className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition cursor-pointer">Help</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-rose-500/10 text-rose-400 text-xs rounded-2xl border border-rose-500/20 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              {/* Phone form */}
              <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-4 relative">
                {/* Country picker */}
                <div
                  onClick={() => setShowCountryPicker(!showCountryPicker)}
                  className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border border-slate-700/60 rounded-2xl cursor-pointer hover:border-indigo-500/60 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{selectedCountry.flag}</span>
                    <span className="text-sm text-slate-200 font-medium">{selectedCountry.name}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showCountryPicker ? 'rotate-180' : ''}`} />
                </div>

                {showCountryPicker && (
                  <div className="absolute top-[58px] left-0 w-full max-h-52 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-y-auto z-50">
                    {COUNTRIES.map((c, i) => (
                      <div
                        key={i}
                        onClick={() => handleCountrySelect(c)}
                        className="px-4 py-2.5 hover:bg-slate-700 flex items-center justify-between text-xs cursor-pointer transition"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{c.flag}</span>
                          <span className="text-slate-200 font-medium">{c.name}</span>
                        </div>
                        <span className="text-indigo-400 font-bold">{c.code}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Phone input row */}
                <div className="flex gap-3">
                  <div className="w-20 px-3 py-3 bg-slate-800/80 border border-slate-700/60 rounded-2xl flex items-center justify-center hover:border-indigo-500/60 transition">
                    <input
                      type="text"
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="w-full text-center text-sm font-bold text-indigo-300 bg-transparent focus:outline-none"
                    />
                  </div>
                  <div className="flex-1 px-4 py-3 bg-slate-800/80 border border-slate-700/60 rounded-2xl hover:border-indigo-500/60 focus-within:border-indigo-500 transition">
                    <input
                      type="tel"
                      required
                      autoFocus
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Phone number"
                      className="w-full text-sm font-medium text-white placeholder-slate-500 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.98] text-sm cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : 'Send OTP →'}
                </button>
              </form>
            </div>
          </Card>
        )}

        {/* ── STEP 3: OTP VERIFICATION ──────────────────────────────────────── */}
        {step === 3 && (
          <Card>
            <div className="h-1 w-full bg-gradient-to-r from-indigo-600 via-violet-500 to-indigo-600" />
            <div className="p-6 sm:p-8 flex flex-col gap-6">
              {/* Header */}
              <div className="flex items-center gap-3">
                <button onClick={() => setStep(2)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-lg font-bold text-white">Verify your number</h2>
                  <p className="text-xs text-slate-400">
                    Code sent to <span className="text-indigo-300 font-semibold">{countryCode} {phoneNumber}</span>
                    {' '}·{' '}
                    <span className="text-indigo-400 cursor-pointer hover:text-indigo-300 transition" onClick={() => setStep(2)}>Change</span>
                  </p>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-rose-500/10 text-rose-400 text-xs rounded-2xl border border-rose-500/20 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              {/* Test hint */}
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-xs rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-indigo-300">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Use any code or <strong className="text-white">123456</strong></span>
                </div>
                <button
                  onClick={handleAutoFill}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-[11px] transition cursor-pointer whitespace-nowrap"
                >
                  Auto-fill
                </button>
              </div>

              {/* OTP boxes */}
              <div className="flex justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    autoFocus={idx === 0}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className={`w-11 h-14 text-center text-xl font-black rounded-2xl border bg-slate-800/80 focus:outline-none transition-all selection:bg-transparent ${
                      digit
                        ? 'border-indigo-500 text-white bg-indigo-600/15 shadow-md shadow-indigo-600/20'
                        : 'border-slate-700/60 text-slate-300 focus:border-indigo-500/80'
                    }`}
                  />
                ))}
              </div>

              {/* Resend */}
              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-xs text-slate-500">
                    Resend in <span className="text-indigo-400 font-bold tabular-nums">{countdown}s</span>
                  </p>
                ) : (
                  <button onClick={handleResend} disabled={loading} className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer transition">
                    <RefreshCw className="w-3.5 h-3.5" /> Resend Code
                  </button>
                )}
              </div>

              {/* Verify button */}
              <button
                onClick={handleOtpSubmit}
                disabled={loading || otp.join('').length < 6}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.98] text-sm cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : 'Verify & Sign In →'}
              </button>
            </div>
          </Card>
        )}

        {/* ── STEP 4: QR CODE ───────────────────────────────────────────────── */}
        {step === 4 && (
          <Card>
            <div className="h-1 w-full bg-gradient-to-r from-indigo-600 via-violet-500 to-indigo-600" />
            <div className="p-6 sm:p-8 flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <button onClick={() => setStep(2)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-lg font-bold text-white">Link with QR Code</h2>
                  <p className="text-xs text-slate-400">Scan using Rivo on your primary phone</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-3xl bg-white shadow-2xl shadow-black/40">
                  <div className="w-44 h-44 bg-slate-950 rounded-2xl flex items-center justify-center">
                    <QrCode className="w-36 h-36 text-white" />
                  </div>
                </div>
                <p className="text-xs text-slate-400 text-center px-4 leading-relaxed">
                  Open Rivo on your primary device → Menu → Linked Devices → Scan this code
                </p>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-2xl transition text-sm cursor-pointer border border-slate-700"
              >
                ← Back to Phone Sign In
              </button>
            </div>
          </Card>
        )}

        {/* Sub-text under card */}
        {step === 1 && (
          <p className="login-sub text-xs text-slate-600 text-center max-w-xs">
            Real-Time Chat Platform with WebRTC Integration
          </p>
        )}
      </div>

      {/* ── Project Credits ────────────────────────────────────────────────── */}
      <DeveloperBadge />

    </div>
  )
}