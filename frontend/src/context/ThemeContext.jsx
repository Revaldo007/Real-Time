import React, { createContext, useState, useEffect, useContext } from 'react'

export const WALLPAPER_PRESETS = [
  { 
    id: 'none', 
    name: 'Default Clean', 
    type: 'color',
    value: '', 
    preview: 'linear-gradient(135deg, #090d16, #0f172a)' 
  },
  { 
    id: 'cosmic', 
    name: 'Cosmic Nebula', 
    type: 'image',
    value: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1400&q=80', 
    preview: 'linear-gradient(135deg, #1e1b4b, #311042)' 
  },
  { 
    id: 'doodle', 
    name: 'Chat Doodles', 
    type: 'image',
    value: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1400&q=80', 
    preview: 'linear-gradient(135deg, #0f172a, #1e293b)' 
  },
  { 
    id: 'geometric', 
    name: 'Cyber Grid', 
    type: 'image',
    value: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1400&q=80', 
    preview: 'linear-gradient(135deg, #022c22, #064e3b)' 
  },
  { 
    id: 'sunset', 
    name: 'Sunset Aura', 
    type: 'image',
    value: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1400&q=80', 
    preview: 'linear-gradient(135deg, #4c0519, #831843)' 
  },
  { 
    id: 'nature', 
    name: 'Misty Pine', 
    type: 'image',
    value: 'https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=1400&q=80', 
    preview: 'linear-gradient(135deg, #064e3b, #0f172a)' 
  },
  { 
    id: 'matrix', 
    name: 'Neon Tech', 
    type: 'image',
    value: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1400&q=80', 
    preview: 'linear-gradient(135deg, #022c22, #000000)' 
  }
]

export const ACCENT_PRESETS = [
  { 
    id: 'indigo', 
    name: 'Electric Indigo', 
    primary: '#6366f1', 
    gradient: 'from-indigo-600 via-indigo-500 to-violet-600',
    bubbleBg: 'bg-indigo-600',
    border: 'border-indigo-500',
    text: 'text-indigo-400',
    glow: 'shadow-indigo-600/30'
  },
  { 
    id: 'emerald', 
    name: 'Cyber Mint', 
    primary: '#10b981', 
    gradient: 'from-emerald-600 via-teal-500 to-cyan-600',
    bubbleBg: 'bg-emerald-600',
    border: 'border-emerald-500',
    text: 'text-emerald-400',
    glow: 'shadow-emerald-600/30'
  },
  { 
    id: 'rose', 
    name: 'Sunset Rose', 
    primary: '#f43f5e', 
    gradient: 'from-rose-600 via-pink-500 to-rose-500',
    bubbleBg: 'bg-rose-600',
    border: 'border-rose-500',
    text: 'text-rose-400',
    glow: 'shadow-rose-600/30'
  },
  { 
    id: 'amber', 
    name: 'Solar Amber', 
    primary: '#f59e0b', 
    gradient: 'from-amber-600 via-orange-500 to-amber-500',
    bubbleBg: 'bg-amber-600',
    border: 'border-amber-500',
    text: 'text-amber-400',
    glow: 'shadow-amber-600/30'
  },
  { 
    id: 'sky', 
    name: 'Ocean Blue', 
    primary: '#0ea5e9', 
    gradient: 'from-sky-600 via-blue-500 to-indigo-600',
    bubbleBg: 'bg-sky-600',
    border: 'border-sky-500',
    text: 'text-sky-400',
    glow: 'shadow-sky-600/30'
  },
  { 
    id: 'purple', 
    name: 'Deep Amethyst', 
    primary: '#a855f7', 
    gradient: 'from-purple-600 via-violet-600 to-indigo-600',
    bubbleBg: 'bg-purple-600',
    border: 'border-purple-500',
    text: 'text-purple-400',
    glow: 'shadow-purple-600/30'
  }
]

export const FONT_COLOR_PRESETS = [
  { id: 'white', name: 'Crisp White', value: '#ffffff' },
  { id: 'slate', name: 'Soft Slate', value: '#f1f5f9' },
  { id: 'cream', name: 'Warm Cream', value: '#fef3c7' },
  { id: 'cyan', name: 'Ice Cyan', value: '#e0f2fe' },
  { id: 'rose', name: 'Soft Rose', value: '#ffe4e6' },
]

export const FONT_SIZES = [
  { id: 'sm', name: 'Small', class: 'text-xs', sizePx: '13px' },
  { id: 'md', name: 'Medium (Default)', class: 'text-sm', sizePx: '14px' },
  { id: 'lg', name: 'Large', class: 'text-base', sizePx: '16px' }
]

export const FONT_FAMILIES = [
  { id: 'inter',     name: 'Inter',          stack: "'Inter', sans-serif",          sample: 'Modern & Clean' },
  { id: 'poppins',   name: 'Poppins',        stack: "'Poppins', sans-serif",        sample: 'Friendly Rounded' },
  { id: 'roboto',    name: 'Roboto',         stack: "'Roboto', sans-serif",         sample: 'Google Classic' },
  { id: 'nunito',    name: 'Nunito',         stack: "'Nunito', sans-serif",         sample: 'Soft & Bubbly' },
  { id: 'dmsans',    name: 'DM Sans',        stack: "'DM Sans', sans-serif",        sample: 'Sleek & Minimal' },
  { id: 'mono',      name: 'JetBrains Mono', stack: "'JetBrains Mono', monospace",  sample: 'Dev / Code Style' },
]

export const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  // Theme Mode: 'dark' | 'light'
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('rivo_theme_mode') || 'dark'
  })

  // Accent Preset
  const [accentId, setAccentId] = useState(() => {
    return localStorage.getItem('rivo_accent_id') || 'indigo'
  })

  // Chat Wallpaper
  const [chatWallpaper, setChatWallpaper] = useState(() => {
    return localStorage.getItem('rivo_chat_wallpaper') || 'none'
  })

  // Custom Wallpaper Data URL or URL
  const [customWallpaper, setCustomWallpaper] = useState(() => {
    return localStorage.getItem('rivo_custom_wallpaper') || ''
  })

  // Wallpaper Opacity/Dimmer (0.1 to 1)
  const [wallpaperDim, setWallpaperDim] = useState(() => {
    const saved = localStorage.getItem('rivo_wallpaper_dim')
    return saved ? parseFloat(saved) : 0.4
  })

  // Outgoing Bubble Font Color
  const [bubbleTextColor, setBubbleTextColor] = useState(() => {
    return localStorage.getItem('rivo_bubble_text_color') || '#ffffff'
  })

  // Message Font Size
  const [fontSizeId, setFontSizeId] = useState(() => {
    return localStorage.getItem('rivo_font_size_id') || 'md'
  })

  // Chat Font Family
  const [fontFamilyId, setFontFamilyId] = useState(() => {
    return localStorage.getItem('rivo_font_family_id') || 'inter'
  })

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('rivo_theme_mode', themeMode)
    if (themeMode === 'light') {
      document.documentElement.classList.add('light')
      document.documentElement.classList.remove('dark')
    } else {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
    }
  }, [themeMode])

  useEffect(() => {
    localStorage.setItem('rivo_accent_id', accentId)
  }, [accentId])

  useEffect(() => {
    localStorage.setItem('rivo_chat_wallpaper', chatWallpaper)
  }, [chatWallpaper])

  useEffect(() => {
    localStorage.setItem('rivo_custom_wallpaper', customWallpaper)
  }, [customWallpaper])

  useEffect(() => {
    localStorage.setItem('rivo_wallpaper_dim', wallpaperDim.toString())
  }, [wallpaperDim])

  useEffect(() => {
    localStorage.setItem('rivo_bubble_text_color', bubbleTextColor)
  }, [bubbleTextColor])

  useEffect(() => {
    localStorage.setItem('rivo_font_size_id', fontSizeId)
  }, [fontSizeId])

  useEffect(() => {
    localStorage.setItem('rivo_font_family_id', fontFamilyId)
    const family = FONT_FAMILIES.find(f => f.id === fontFamilyId) || FONT_FAMILIES[0]
    // Inject into :root CSS var so Chat, messages, etc. all pick it up
    document.documentElement.style.setProperty('--chat-font-family', family.stack)
  }, [fontFamilyId])

  const currentAccent = ACCENT_PRESETS.find(a => a.id === accentId) || ACCENT_PRESETS[0]
  const currentFontSize = FONT_SIZES.find(f => f.id === fontSizeId) || FONT_SIZES[1]
  const currentFontFamily = FONT_FAMILIES.find(f => f.id === fontFamilyId) || FONT_FAMILIES[0]

  // Apply CSS vars once on mount to handle page refresh correctly
  useEffect(() => {
    const family = FONT_FAMILIES.find(f => f.id === fontFamilyId) || FONT_FAMILIES[0]
    document.documentElement.style.setProperty('--chat-font-family', family.stack)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Get active background image
  const getActiveWallpaperUrl = () => {
    if (customWallpaper) return customWallpaper
    if (chatWallpaper === 'none') return null
    const preset = WALLPAPER_PRESETS.find(w => w.id === chatWallpaper)
    return preset?.value || null
  }

  const setCustomImage = (base64OrUrl) => {
    setCustomWallpaper(base64OrUrl)
    setChatWallpaper('custom')
  }

  const clearCustomImage = () => {
    setCustomWallpaper('')
    setChatWallpaper('none')
  }

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        setThemeMode,
        accentId,
        setAccentId,
        currentAccent,
        chatWallpaper,
        setChatWallpaper,
        customWallpaper,
        setCustomImage,
        clearCustomImage,
        wallpaperDim,
        setWallpaperDim,
        bubbleTextColor,
        setBubbleTextColor,
        fontSizeId,
        setFontSizeId,
        currentFontSize,
        fontFamilyId,
        setFontFamilyId,
        currentFontFamily,
        getActiveWallpaperUrl,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
