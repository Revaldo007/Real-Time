import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { mediaAPI, BACKEND_URL } from '../services/api'
import { ArrowLeft, User, Info, Camera, Sparkles, Check, AlertCircle } from 'lucide-react'

export default function Profile() {
  const { user, updateProfile } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [about, setAbout] = useState('')
  const [avatar, setAvatar] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      setUsername(user.username || '')
      setAbout(user.about || '')
      setAvatar(user.profile_image || '')
    }
  }, [user])

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setLoading(true)
    setError('')
    try {
      const res = await mediaAPI.upload(file)
      setAvatar(res.data.file_url)
    } catch (err) {
      setError('Failed to upload image. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setSuccess(false)
    setError('')

    try {
      await updateProfile({
        username,
        about,
        profile_image: avatar
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-screen flex items-center justify-center bg-slate-950 text-slate-100 overflow-hidden">
      {/* Decorative gradient glow spheres */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-violet-600/20 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg mx-4 p-8 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/')}
            className="p-2 bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-xl transition text-slate-400 hover:text-slate-100 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold font-outfit bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Edit Profile
            </h1>
            <p className="text-xs text-slate-400">Update your public presence in Rivo</p>
          </div>
        </div>

        {success && (
          <div className="flex items-center gap-2 mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-xl">
            <Check className="w-4 h-4 shrink-0" />
            <span>Profile updated successfully!</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              <div className="w-28 h-28 rounded-full border-2 border-indigo-500/30 overflow-hidden bg-slate-950 flex items-center justify-center">
                {avatar ? (
                  <img
                    src={`${BACKEND_URL}${avatar}`}
                    alt="Profile Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-slate-650" />
                )}
              </div>
              
              <label className="absolute bottom-1 right-1 p-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-full cursor-pointer hover:opacity-90 active:scale-95 shadow-md shadow-indigo-500/25 transition">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>
            <span className="text-xs text-slate-500">Upload profile image (JPG, PNG)</span>
          </div>

          {/* Username Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                className="w-full pl-11 pr-4 py-3 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
              />
            </div>
          </div>

          {/* About Status Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              About Status
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <Info className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full pl-11 pr-4 py-3 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all text-sm shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? 'Saving Changes...' : 'Save Profile'}
            {!loading && <Sparkles className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  )
}
