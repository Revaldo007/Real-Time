import React, { useState, useContext, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { 
  MoreVertical, Globe, ChevronDown, Smartphone, 
  ShieldCheck, ArrowLeft, QrCode, Sparkles, 
  RefreshCw, Loader2, AlertCircle 
} from 'lucide-react'

const COUNTRIES = [
  { name: 'India', code: '+91' },
  { name: 'United States / Global', code: '+1' },
  { name: 'United Kingdom', code: '+44' },
  { name: 'Colombia', code: '+57' },
  { name: 'Brazil', code: '+55' },
  { name: 'Mexico', code: '+52' },
  { name: 'Germany', code: '+49' },
  { name: 'France', code: '+33' },
  { name: 'Canada', code: '+1' },
  { name: 'Australia', code: '+61' },
  { name: 'Spain', code: '+34' },
  { name: 'Italy', code: '+39' },
  { name: 'Japan', code: '+81' },
  { name: 'South Korea', code: '+82' },
  { name: 'United Arab Emirates', code: '+971' },
]

export default function Login() {
  const { login } = useContext(AuthContext)
  const navigate = useNavigate()

  // Steps:
  // 1 = Welcome
  // 2 = Phone number (WhatsApp-style)
  // 3 = SMS OTP verification (Accepts 123456 or any 6-digit code)
  // 4 = QR code companion device
  const [step, setStep] = useState(1)

  // Phone Form State
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]) // India by default
  const [countryCode, setCountryCode] = useState('+91')
  const [phoneNumber, setPhoneNumber] = useState('')

  // OTP Form State
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Resend countdown
  const [countdown, setCountdown] = useState(0)
  const countdownRef = useRef(null)

  // Dropdown states
  const [showMenu, setShowMenu] = useState(false)
  const [showCountryPicker, setShowCountryPicker] = useState(false)

  // ── Helper: Full formatted phone number ─────────────────────────────────────
  const getFullPhone = () => {
    const cleanDigits = phoneNumber.replace(/\D/g, '').replace(/^0+/, '')
    return `${countryCode}${cleanDigits}`
  }

  // ── Countdown timer helpers ────────────────────────────────────────────────
  const startCountdown = () => {
    setCountdown(60)
    clearInterval(countdownRef.current)
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  useEffect(() => () => clearInterval(countdownRef.current), [])

  const handleCountrySelect = (country) => {
    setSelectedCountry(country)
    setCountryCode(country.code)
    setShowCountryPicker(false)
  }

  // ── STEP 2: Phone Submit ───────────────────────────────────────────────────
  const handlePhoneSubmit = (e) => {
    e?.preventDefault()
    const cleanDigits = phoneNumber.replace(/\D/g, '')
    if (!cleanDigits || cleanDigits.length < 4) {
      setError('Please enter a valid phone number')
      return
    }
    setError('')
    setOtp(['', '', '', '', '', ''])
    setStep(3)
    startCountdown()
  }

  // ── STEP 3: Resend SMS ─────────────────────────────────────────────────────
  const handleResend = () => {
    if (countdown > 0) return
    setError('')
    startCountdown()
  }

  // ── STEP 3: Verify OTP ─────────────────────────────────────────────────────
  const handleOtpSubmit = async (e) => {
    e?.preventDefault()
    const code = otp.join('')
    if (code.length < 6) {
      setError('Please enter the complete 6-digit code.')
      return
    }
    setError('')
    setLoading(true)

    const fullPhone = getFullPhone()

    try {
      const ok = await login(fullPhone)
      if (ok) {
        navigate('/')
        return
      }
    } catch (err) {
      setError(typeof err === 'string' ? err : (err.response?.data?.detail || 'Authentication failed. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  // Auto-fill convenience method
  const handleAutoFill = () => {
    const defaultCode = ['1', '2', '3', '4', '5', '6']
    setOtp(defaultCode)
    setError('')
    setTimeout(() => {
      document.getElementById('otp-5')?.focus()
    }, 50)
  }

  // ── OTP input helpers ──────────────────────────────────────────────────────
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return
    if (value.length > 1) value = value[value.length - 1]
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus()
    } else if (e.key === 'Enter') {
      handleOtpSubmit()
    }
  }

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(''))
      document.getElementById('otp-5')?.focus()
    }
    e.preventDefault()
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen w-screen flex items-center justify-center bg-[#eef7ef] overflow-hidden font-sans text-slate-800 selection:bg-emerald-200">
      {/* Decorative background shapes */}
      <div className="absolute top-12 left-1/4 w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-b-[26px] border-b-emerald-200/60 rotate-45 pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[35px] border-b-emerald-200/50 -rotate-12 pointer-events-none" />
      <div className="absolute top-1/3 right-12 w-0 h-0 border-l-[18px] border-l-transparent border-r-[18px] border-r-transparent border-b-[32px] border-b-emerald-200/40 rotate-[130deg] pointer-events-none" />

      {/* Main Container Card */}
      <div className="relative z-10 w-full max-w-[400px] min-h-[640px] mx-4 bg-white rounded-3xl shadow-xl border border-slate-100 flex flex-col justify-between overflow-visible transition-all duration-300">

        {/* ── STEP 1: WELCOME ─────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="flex-1 flex flex-col justify-between p-6 text-center animate-fadeIn">
            <div className="relative">
              <div className="flex justify-end items-center h-8">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 rounded-full text-slate-500 hover:bg-slate-100 transition"
                  aria-label="Menu"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
              {showMenu && (
                <div className="absolute right-0 top-10 w-44 bg-white rounded-xl shadow-lg border border-slate-200 z-50 py-1 text-sm text-left">
                  <button onClick={() => setShowMenu(false)} className="w-full px-4 py-2 hover:bg-slate-50">Help</button>
                  <button onClick={() => setShowMenu(false)} className="w-full px-4 py-2 hover:bg-slate-50">Privacy Policy</button>
                  <button onClick={() => setShowMenu(false)} className="w-full px-4 py-2 hover:bg-slate-50">Terms of Service</button>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center my-auto px-2">
              <div className="relative w-52 h-52 mb-8 flex items-center justify-center">
                <div className="absolute inset-0 bg-emerald-50 rounded-full animate-pulse" />
                <div className="relative z-10 w-44 h-44 rounded-full border-2 border-dashed border-emerald-400 flex items-center justify-center bg-white shadow-sm p-4">
                  <div className="grid grid-cols-3 gap-3 text-emerald-500 opacity-80">
                    <Smartphone className="w-6 h-6" />
                    <ShieldCheck className="w-6 h-6" />
                    <Globe className="w-6 h-6" />
                    <Sparkles className="w-6 h-6 col-span-3 mx-auto" />
                  </div>
                </div>
              </div>

              <h1 className="text-2xl font-bold text-slate-800 mb-4">Welcome to Rivo</h1>
              <p className="text-xs text-slate-500 leading-relaxed px-4">
                Read our <span className="text-emerald-600 hover:underline cursor-pointer">Privacy Policy</span>. Tap "Agree and continue" to accept the <span className="text-emerald-600 hover:underline cursor-pointer">Terms of Service</span>.
              </p>

              <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-medium text-emerald-700 cursor-pointer hover:bg-slate-100 transition">
                <Globe className="w-3.5 h-3.5" />
                <span>English</span>
              </div>
            </div>

            <div className="pt-4 pb-2">
              <button
                onClick={() => setStep(2)}
                className="w-full py-3.5 bg-[#00a884] hover:bg-[#008f70] text-white font-medium rounded-full shadow-md transition-all active:scale-[0.98] text-sm cursor-pointer"
              >
                Agree and continue
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: ENTER PHONE NUMBER (WhatsApp Style) ──────────────────── */}
        {step === 2 && (
          <div className="flex-1 flex flex-col justify-between p-6 animate-fadeIn relative">
            <div>
              <div className="flex justify-between items-center mb-6">
                <button onClick={() => setStep(1)} className="p-1 rounded-full text-slate-600 hover:bg-slate-100 transition" aria-label="Back">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-base font-semibold text-emerald-700">Enter your phone number</h2>
                <div className="relative">
                  <button onClick={() => setShowMenu(!showMenu)} className="p-1 rounded-full text-slate-600 hover:bg-slate-100 transition" aria-label="Menu">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 top-8 w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50">
                      <button
                        onClick={() => { setShowMenu(false); setStep(4) }}
                        className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition flex items-center gap-2"
                      >
                        <QrCode className="w-4 h-4 text-emerald-600" />
                        <span>Link as companion device</span>
                      </button>
                      <button onClick={() => setShowMenu(false)} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition">
                        Help
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-500 text-center mb-6 px-2 leading-relaxed">
                Rivo will verify your phone number to access your account.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100 text-center flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Phone Input Form */}
              <form onSubmit={handlePhoneSubmit} className="space-y-4 max-w-xs mx-auto relative">
                {/* Country Picker Button */}
                <div 
                  onClick={() => setShowCountryPicker(!showCountryPicker)}
                  className="border-b-2 border-emerald-500 py-1.5 flex items-center justify-between cursor-pointer hover:bg-emerald-50/50 px-1 rounded-t-md transition"
                >
                  <span className="text-sm font-medium text-slate-700">{selectedCountry.name}</span>
                  <ChevronDown className={`w-4 h-4 text-emerald-600 transition-transform ${showCountryPicker ? 'rotate-180' : ''}`} />
                </div>

                {/* Country Picker Dropdown */}
                {showCountryPicker && (
                  <div className="absolute top-10 left-0 w-full max-h-56 bg-white rounded-xl shadow-xl border border-slate-200 overflow-y-auto z-50 animate-in fade-in zoom-in-95 divide-y divide-slate-100">
                    {COUNTRIES.map((c, i) => (
                      <div
                        key={i}
                        onClick={() => handleCountrySelect(c)}
                        className="px-4 py-2.5 hover:bg-emerald-50 flex items-center justify-between text-xs cursor-pointer transition"
                      >
                        <span className="font-medium text-slate-700">{c.name}</span>
                        <span className="text-emerald-700 font-semibold">{c.code}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  {/* Country Code Input */}
                  <div className="w-20 border-b-2 border-emerald-500 py-2 flex items-center justify-center bg-transparent">
                    <input
                      type="text"
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="w-full text-center text-sm font-semibold text-slate-700 bg-transparent focus:outline-none"
                    />
                  </div>
                  {/* Phone Number Input */}
                  <div className="flex-1 border-b-2 border-emerald-500 py-2">
                    <input
                      type="tel"
                      required
                      autoFocus
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Phone number"
                      className="w-full text-sm font-medium text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="pt-4 pb-2">
              <button
                onClick={handlePhoneSubmit}
                disabled={loading}
                className="w-full py-3.5 bg-[#00a884] hover:bg-[#008f70] text-white font-medium rounded-full shadow-md transition-all active:scale-[0.98] text-sm cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : 'Next'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: VERIFY OTP CODE (WHATSAPP-STYLE SMS VERIFICATION) ───────── */}
        {step === 3 && (
          <div className="flex-1 flex flex-col justify-between p-6 animate-fadeIn">
            <div>
              <div className="flex justify-between items-center mb-6">
                <button onClick={() => setStep(2)} className="p-1 rounded-full text-slate-600 hover:bg-slate-100 transition" aria-label="Back">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-base font-semibold text-emerald-700">Verifying your number</h2>
                <div className="w-5" />
              </div>

              <p className="text-xs text-slate-500 text-center mb-3 px-2 leading-relaxed">
                Waiting to automatically detect an SMS sent to <span className="font-semibold text-slate-700">{countryCode} {phoneNumber}</span>.{' '}
                <span className="text-emerald-600 hover:underline cursor-pointer font-medium" onClick={() => setStep(2)}>
                  Wrong number?
                </span>
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100 text-center flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Testing / Quick Access Banner */}
              <div className="mb-4 p-2.5 bg-emerald-50/80 border border-emerald-200/70 text-emerald-900 text-xs rounded-xl flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-slate-600">Type any code or use <strong className="text-emerald-700">123456</strong></span>
                </div>
                <button
                  type="button"
                  onClick={handleAutoFill}
                  className="px-2.5 py-1 bg-[#00a884] hover:bg-[#008f70] text-white font-medium rounded-lg text-[11px] transition cursor-pointer shadow-xs"
                >
                  Auto-fill
                </button>
              </div>

              {/* 6 Digit OTP Inputs */}
              <div className="flex justify-center gap-2 my-5" onPaste={handleOtpPaste}>
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
                    className="w-10 h-12 text-center text-xl font-bold border-b-2 border-slate-300 focus:border-emerald-500 bg-slate-50 rounded-t-md focus:outline-none transition selection:bg-transparent"
                  />
                ))}
              </div>

              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-xs text-slate-400">Resend SMS in <span className="text-slate-600 font-semibold">{countdown}s</span></p>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={loading}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Resend SMS
                  </button>
                )}
              </div>
            </div>

            <div className="pt-4 pb-2">
              <button
                onClick={handleOtpSubmit}
                disabled={loading || otp.join('').length < 6}
                className="w-full py-3.5 bg-[#00a884] hover:bg-[#008f70] text-white font-medium rounded-full shadow-md transition-all active:scale-[0.98] text-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : 'Verify & Continue'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: COMPANION DEVICE QR CODE ─────────────────────────────── */}
        {step === 4 && (
          <div className="flex-1 flex flex-col justify-between p-6 animate-fadeIn">
            <div>
              <div className="flex justify-between items-center mb-6">
                <button onClick={() => setStep(2)} className="p-1 rounded-full text-slate-600 hover:bg-slate-100 transition" aria-label="Back">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-base font-semibold text-emerald-700">Link with QR code</h2>
                <div className="w-5" />
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="p-4 bg-white border-2 border-emerald-500 rounded-2xl shadow-md my-4">
                  <div className="w-48 h-48 bg-slate-900 rounded-lg flex items-center justify-center text-white relative overflow-hidden">
                    <QrCode className="w-40 h-40 text-white opacity-90" />
                    <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none" />
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-slate-700 mb-1">Scan to link device</h3>
                <p className="text-xs text-slate-500 px-4">
                  Open Rivo on your primary phone, tap Menu &gt; Linked Devices, and scan this code.
                </p>
              </div>
            </div>

            <div className="pt-4 pb-2">
              <button
                onClick={() => setStep(2)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-full transition-all text-sm cursor-pointer"
              >
                Back to Phone Input
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
