import React, { useState, useEffect, useRef, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChatContext } from '../context/ChatContext'
import { AuthContext } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import AppTitle from '../components/AppTitle'
import { authAPI, usersAPI, chatsAPI, messagesAPI, mediaAPI, BACKEND_URL } from '../services/api'
import { 
  MessageSquare, MessageSquarePlus, Search, Send, Image, Video, File, Mic, Phone, Video as VideoIcon, 
  Settings, LogOut, Check, CheckCheck, Smile, CornerUpLeft, Edit3, Trash2, X, Plus, 
  Users, UserPlus, ShieldAlert, MicOff, Volume2, User, Play, Pause, Paperclip,
  ArrowLeft, MoreVertical
} from 'lucide-react'

// ── Light-mode safety net ───────────────────────────────────────────────────
// Many panels (contacts, new-contact, group modal, profile modal...) use dark-only
// colour classes (text-slate-100, bg-slate-900 ...). In light mode that gives
// near-white text on a white surface. These rules remap them. They skip the call
// overlay (.keep-dark) and anything inside a gradient (coloured bubbles/headers).
const lc = (...names) =>
  ':is(' + names.map(n => `[class^="${n}"],[class*=" ${n}"]`).join(',') + ')'
const LIGHT_SCOPE = '.chat-shell.chat-light'
const LIGHT_SKIP = ':not(.keep-dark):not(.keep-dark *):not([class*="bg-gradient"] *)'
const lightRule = (names, decl) => `${LIGHT_SCOPE} ${lc(...names)}${LIGHT_SKIP}{${decl}}`
const LIGHT_MODE_CSS = [
  // text
  lightRule(['text-slate-100'], 'color:#0f172a'),
  lightRule(['text-slate-200'], 'color:#1e293b'),
  lightRule(['text-slate-300'], 'color:#334155'),
  lightRule(['text-indigo-200', 'text-indigo-300'], 'color:#4338ca'),
  lightRule(['text-violet-200', 'text-violet-300'], 'color:#6d28d9'),
  lightRule(['text-emerald-300'], 'color:#047857'),
  lightRule(['text-emerald-400'], 'color:#059669'),
  lightRule(['text-rose-200', 'text-rose-300'], 'color:#be123c'),
  // surfaces
  lightRule(['bg-slate-900'], 'background-color:#ffffff'),
  lightRule(['bg-slate-950'], 'background-color:#f1f5f9'),
  lightRule(['bg-slate-800'], 'background-color:#e2e8f0'),
  // borders
  lightRule(['border-slate-800'], 'border-color:#e2e8f0'),
  lightRule(['border-slate-700'], 'border-color:#cbd5e1'),
  // hover tooltips on the nav rail stay dark-on-light-text
  `${LIGHT_SCOPE} [class*="bg-slate-800"][class*="group-hover:opacity-100"]{background-color:#1e293b;color:#e2e8f0;border-color:#334155}`,
].join('\n')

export default function Chat() {
  const { user, logout } = useContext(AuthContext)
  const {
    chats, activeChat, setActiveChat, messages, typingUsers, onlineUsers, 
    sendTypingStatus, fetchChats, callState, callType, callUser, localStream, 
    remoteStream, remoteAudioRef, startCall, acceptCall, hangupCall
  } = useContext(ChatContext)

  const {
    themeMode,
    currentAccent,
    getActiveWallpaperUrl,
    wallpaperDim,
    bubbleTextColor,
    currentFontSize
  } = useTheme()
  const isLight = themeMode === 'light'
  const activeWallpaper = getActiveWallpaperUrl()

  const navigate = useNavigate()
  
  // Mobile view state: 'sidebar' | 'chat'
  const [mobileView, setMobileView] = useState('sidebar')

  // Avatar tap popup: holds the chat object whose avatar was tapped, or null
  const [avatarMenuChat, setAvatarMenuChat] = useState(null)

  // Left Sidebar States
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearch, setShowSearch] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  // Select Contact & New Contact States
  const [showSelectContact, setShowSelectContact] = useState(false)
  const [showSelectContactSearch, setShowSelectContactSearch] = useState(false)
  const [selectContactQuery, setSelectContactQuery] = useState('')
  const [showNewContact, setShowNewContact] = useState(false)
  const [contactsList, setContactsList] = useState([])
  
  // Navigation Bar & Filtering States
  const [sidebarTab, setSidebarTab] = useState('chats') // 'chats' | 'contacts'
  const [contactsSearch, setContactsSearch] = useState('')

  // Load registered contacts, and keep names fresh so Contacts matches Chats
  // (reload on mount, when the Contacts tab opens, when chats change, and on window focus)
  useEffect(() => {
    const loadAllContacts = async () => {
      try {
        const res = await usersAPI.search('')
        setContactsList(res.data)
      } catch (err) {
        console.error('Failed to load contacts:', err)
      }
    }
    loadAllContacts()
    window.addEventListener('focus', loadAllContacts)
    return () => window.removeEventListener('focus', loadAllContacts)
  }, [sidebarTab, chats])
  
  // New Contact Form State
  const [newName, setNewName] = useState('')
  const [newCountryCode, setNewCountryCode] = useState('+91')
  const [newPhone, setNewPhone] = useState('')
  const [saveToOption, setSaveToOption] = useState('Phone / Device')
  const [newContactLoading, setNewContactLoading] = useState(false)
  const [newContactError, setNewContactError] = useState('')

  const handleOpenSelectContact = async () => {
    setShowSelectContact(true)
    setShowSelectContactSearch(false)
    setSelectContactQuery('')
    try {
      const res = await usersAPI.search('')
      setContactsList(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSaveNewContact = async (e) => {
    e.preventDefault()
    if (!newPhone.trim()) {
      setNewContactError('Phone number is required')
      return
    }
    setNewContactError('')
    setNewContactLoading(true)

    const cleanDigits = newPhone.replace(/\D/g, '').replace(/^0+/, '')
    const fullPhone = `${newCountryCode}${cleanDigits}`
    const fullName = newName.trim() || `User_${fullPhone.slice(-4)}`

    // Check if trying to add self (compare normalized phone digits)
    const currentUserDigits = (user?.phone_number || '').replace(/\D/g, '').replace(/^0+/, '')
    if (currentUserDigits && (currentUserDigits === cleanDigits || currentUserDigits.endsWith(cleanDigits) || cleanDigits.endsWith(currentUserDigits))) {
      setNewContactError('You cannot add your own phone number as a contact.')
      setNewContactLoading(false)
      return
    }

    try {
      // 1. Search for user by phone number
      let targetUser
      const searchRes = await usersAPI.search(fullPhone)
      if (searchRes.data && searchRes.data.length > 0) {
        targetUser = searchRes.data.find(u => u.phone_number === fullPhone) || searchRes.data[0]
      }

      // 2. If user doesn't exist, register them automatically
      if (!targetUser) {
        try {
          const regRes = await authAPI.register(fullPhone, fullName)
          targetUser = regRes.data
        } catch (regErr) {
          if (regErr.response?.data?.detail === 'Phone number already registered') {
            setNewContactError('You cannot add your own phone number as a contact.')
            setNewContactLoading(false)
            return
          }
        }
      }

      if (targetUser) {
        if (targetUser.id === user?.id) {
          setNewContactError('You cannot add your own phone number as a contact.')
          return
        }
        await startDirectChat(targetUser.id)
        setShowNewContact(false)
        setShowSelectContact(false)
        setNewName('')
        setNewPhone('')
      } else {
        setNewContactError('Failed to create or find contact.')
      }
    } catch (err) {
      setNewContactError(err.response?.data?.detail || 'Error creating contact')
    } finally {
      setNewContactLoading(false)
    }
  }

  // Message Input States
  const [text, setText] = useState('')
  const [replyMessage, setReplyMessage] = useState(null)
  const [editMessageId, setEditMessageId] = useState(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const isTypingRef = useRef(false)
  const typingTimeoutRef = useRef(null)

  // Group Creation States
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupDesc, setGroupDesc] = useState('')
  const [selectedGroupUsers, setSelectedGroupUsers] = useState([])

  // Add-member (inside the group profile modal) states
  const [showAddMembers, setShowAddMembers] = useState(false)
  const [addMemberSelection, setAddMemberSelection] = useState([])
  const [addingMembers, setAddingMembers] = useState(false)

  // Voice Note Recorder States
  const [isRecording, setIsRecording] = useState(false)
  const [isUploadingVoice, setIsUploadingVoice] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const mediaRecorderRef = useRef(null)
  const recordingIntervalRef = useRef(null)
  const audioChunksRef = useRef([])
  const isDiscardingVoiceRef = useRef(false)

  // File Upload Ref
  const fileInputRef = useRef(null)

  // Scroll Container Ref
  const messagesEndRef = useRef(null)
  
  // Video Stream refs for WebRTC
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)

  // Handle auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Adapt container when mobile virtual keyboard opens/closes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return

    const handleVisualResize = () => {
      const height = window.visualViewport.height
      document.documentElement.style.setProperty('--visual-viewport-height', `${height}px`)
      if (activeChat) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
    }

    window.visualViewport.addEventListener('resize', handleVisualResize)
    window.visualViewport.addEventListener('scroll', handleVisualResize)
    handleVisualResize()

    return () => {
      window.visualViewport.removeEventListener('resize', handleVisualResize)
      window.visualViewport.removeEventListener('scroll', handleVisualResize)
    }
  }, [activeChat])

  // Attach WebRTC streams
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  // Search contacts
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchQuery.trim().length > 0) {
        try {
          const res = await usersAPI.search(searchQuery)
          setSearchResults(res.data)
          setShowSearch(true)
        } catch (err) {
          console.error(err)
        }
      } else {
        setSearchResults([])
        setShowSearch(false)
      }
    }, 300);

    return () => clearTimeout(delayDebounce)
  }, [searchQuery])

  // Handle typing notifications
  const handleTextChange = (e) => {
    setText(e.target.value)
    if (!activeChat) return

    if (!isTypingRef.current) {
      isTypingRef.current = true
      sendTypingStatus(activeChat.id, true)
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false
      sendTypingStatus(activeChat.id, false)
    }, 2500)
  }

  // Start Direct Chat
  const startDirectChat = async (contactId) => {
    try {
      const res = await chatsAPI.createDirect(contactId)
      setActiveChat(res.data)
      setSearchQuery('')
      setShowSearch(false)
      setMobileView('chat')
      fetchChats()
    } catch (err) {
      console.error(err)
    }
  }

  // Delete / Leave a chat
  const handleDeleteChat = async (chat) => {
    if (!chat || !chat.id) return
    const info = getChatNameAndImage(chat)
    const label = chat.type === 'one_to_one' 
      ? `Remove ${info.name} and delete this chat?` 
      : `Leave and remove group "${info.name}"?`
    if (!window.confirm(label)) return
    try {
      await chatsAPI.delete(chat.id)
      if (activeChat && activeChat.id === chat.id) {
        setActiveChat(null)
        setMobileView('sidebar')
      }
      setAvatarMenuChat(null)
      fetchChats()
    } catch (err) {
      console.error('Failed to remove chat', err)
      alert(err?.response?.data?.detail || 'Failed to remove chat')
    } finally {
      setAvatarMenuChat(null)
    }
  }

  // Create Group Chat
  const handleCreateGroupSubmit = async (e) => {
    e.preventDefault()
    if (!groupName.trim()) return

    try {
      const res = await chatsAPI.createGroup(groupName, groupDesc, selectedGroupUsers)
      setActiveChat(res.data)
      setShowCreateGroup(false)
      setGroupName('')
      setGroupDesc('')
      setSelectedGroupUsers([])
      fetchChats()
    } catch (err) {
      console.error(err)
    }
  }

  // Add members to an existing group
  const handleAddMembers = async () => {
    if (!avatarMenuChat?.id || addMemberSelection.length === 0) return
    setAddingMembers(true)
    try {
      if (typeof chatsAPI.addMembers !== 'function') {
        throw new Error('chatsAPI.addMembers is missing in services/api.js')
      }
      const res = await chatsAPI.addMembers(avatarMenuChat.id, addMemberSelection)
      if (res?.data?.members) {
        setAvatarMenuChat(res.data)
        if (activeChat?.id === res.data.id) setActiveChat(res.data)
      }
      setShowAddMembers(false)
      setAddMemberSelection([])
      fetchChats()
    } catch (err) {
      console.error(err)
      alert(err?.response?.data?.detail || err.message || 'Failed to add members')
    } finally {
      setAddingMembers(false)
    }
  }

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!text.trim() && !replyMessage) return

    try {
      if (editMessageId) {
        // Edit existing message
        await messagesAPI.edit(editMessageId, text)
        setEditMessageId(null)
      } else {
        // Send new message
        await messagesAPI.send(activeChat.id, text, 'text', replyMessage?.id)
      }
      setText('')
      setReplyMessage(null)
      isTypingRef.current = false
      sendTypingStatus(activeChat.id, false)
    } catch (err) {
      console.error(err)
    }
  }

  // File Upload triggers
  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file || !activeChat) return

    try {
      const uploadRes = await mediaAPI.upload(file)
      const { file_url, file_type } = uploadRes.data
      await messagesAPI.send(activeChat.id, file_url, file_type, replyMessage?.id)
      setReplyMessage(null)
    } catch (err) {
      console.error('File upload failed', err)
    }
  }

  // Voice note recording logic
  const startVoiceRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Microphone access is unavailable. Note: Mobile and desktop browsers block microphone access over non-secure HTTP (e.g. http://192.168.x.x). Please test on localhost or via HTTPS.")
      return
    }

    try {
      // Check best supported audio format for browser (Chrome, Firefox, Safari iOS/macOS)
      let selectedMimeType = ''
      let selectedExt = 'webm'
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          selectedMimeType = 'audio/webm;codecs=opus'
          selectedExt = 'webm'
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          selectedMimeType = 'audio/webm'
          selectedExt = 'webm'
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          selectedMimeType = 'audio/mp4'
          selectedExt = 'mp4'
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          selectedMimeType = 'audio/ogg'
          selectedExt = 'ogg'
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = selectedMimeType 
        ? new MediaRecorder(stream, { mimeType: selectedMimeType })
        : new MediaRecorder(stream)

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      isDiscardingVoiceRef.current = false

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        // Stop hardware microphone tracks
        stream.getTracks().forEach(track => track.stop())

        if (isDiscardingVoiceRef.current) {
          isDiscardingVoiceRef.current = false
          audioChunksRef.current = []
          return
        }

        if (!audioChunksRef.current.length) return

        const mime = selectedMimeType || 'audio/webm'
        const audioBlob = new Blob(audioChunksRef.current, { type: mime })
        const audioFile = new File([audioBlob], `voice_note_${Date.now()}.${selectedExt}`, { type: mime })
        
        try {
          setIsUploadingVoice(true)
          const uploadRes = await mediaAPI.upload(audioFile)
          await messagesAPI.send(activeChat.id, uploadRes.data.file_url, 'voice')
        } catch (err) {
          console.error('Voice note upload failed', err)
          alert('Failed to send voice note. ' + (err?.response?.data?.detail || 'Please try again.'))
        } finally {
          setIsUploadingVoice(false)
          setRecordingSeconds(0)
          audioChunksRef.current = []
        }
      }

      mediaRecorder.start(250)
      setIsRecording(true)
      setRecordingSeconds(0)
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current)
      recordingIntervalRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1)
      }, 1000)

    } catch (err) {
      console.error('Microphone error', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        alert("Microphone permission was denied. Please allow microphone access in your browser site settings.")
      } else {
        alert("Could not access microphone: " + (err.message || 'Check browser permissions'))
      }
    }
  }

  const cancelVoiceRecording = () => {
    isDiscardingVoiceRef.current = true
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current)
    setIsRecording(false)
    setRecordingSeconds(0)
  }

  const sendVoiceRecording = () => {
    isDiscardingVoiceRef.current = false
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current)
    setIsRecording(false)
  }

  // Message Actions
  const handleEditMessage = (msg) => {
    setText(msg.message)
    setEditMessageId(msg.id)
  }

  const handleDeleteMessage = async (msgId) => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      try {
        await messagesAPI.delete(msgId)
      } catch (err) {
        console.error(err)
      }
    }
  }

  const handleCopyMessage = (txt) => {
    navigator.clipboard.writeText(txt)
  }

  // Helpers
  const formatTime = (isoString) => {
    if (!isoString) return ''
    // Server timestamps without a timezone (e.g. "2026-10-02T05:43:00") are UTC.
    // Mark them as UTC so the browser converts them to this device's local time.
    let value = String(isoString)
    if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(value)) value = value.replace(' ', 'T') + 'Z'
    const d = new Date(value)
    if (isNaN(d.getTime())) return ''
    // Fixed format ("11:13 AM") in the device's own timezone, same on every browser/locale
    return d
      .toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      .toUpperCase()
  }

  const getChatNameAndImage = (chat) => {
    if (!chat) return { name: '', image: null, isOnline: false, about: '', phone: '' }
    if (chat.isUnsavedContact && chat.targetContact) {
      return {
        name: chat.targetContact.username || 'Contact',
        image: chat.targetContact.profile_image,
        isOnline: onlineUsers.has(chat.targetContact.id),
        about: chat.targetContact.about,
        phone: chat.targetContact.phone_number
      }
    }
    if (chat.type === 'one_to_one') {
      const otherMember = chat.members?.find(m => m.user_id !== user?.id)
      return {
        name: otherMember?.user?.username || 'Direct Chat',
        image: otherMember?.user?.profile_image,
        isOnline: otherMember ? onlineUsers.has(otherMember.user_id) : false,
        about: otherMember?.user?.about,
        phone: otherMember?.user?.phone_number
      }
    } else {
      return {
        name: chat.group_details?.name || 'Group Chat',
        image: chat.group_details?.group_image,
        isOnline: false,
        about: chat.group_details?.description,
        phone: null
      }
    }
  }

  const formatVoiceTime = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0')
    const s = (sec % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  // Reset the add-member picker whenever the profile modal switches chat / closes
  useEffect(() => {
    setShowAddMembers(false)
    setAddMemberSelection([])
  }, [avatarMenuChat?.id])

  // ── Keep panel headers clear of the project title bar ───────────────────
  // Measures how far the sidebar / chat panel reach up underneath the title
  // bar (e.g. when the global CSS pins them to the top of the window on small
  // screens) and pushes their content down by exactly that amount.
  const titleBarRef = useRef(null)
  const [titleOverlap, setTitleOverlap] = useState(0)
  useEffect(() => {
    const measure = () => {
      const bar = titleBarRef.current
      if (!bar) return
      const barBottom = bar.getBoundingClientRect().bottom
      let overlap = 0
      document
        .querySelectorAll('.chat-shell .chat-sidebar, .chat-shell .chat-panel')
        .forEach((el) => {
          if (getComputedStyle(el).display === 'none') return
          overlap = Math.max(overlap, barBottom - el.getBoundingClientRect().top)
        })
      overlap = Math.max(0, Math.round(overlap))
      setTitleOverlap((prev) => (prev === overlap ? prev : overlap))
    }
    measure()
    const raf = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
    }
  }, [mobileView, sidebarTab, activeChat?.id, showSelectContact])

  const emojis = ['😊', '😂', '👍', '❤️', '🔥', '👏', '😮', '😢', '🎉', '💡', '💬', '🚀']

  return (
    <div style={{ height: 'var(--visual-viewport-height, 100dvh)', '--title-overlap': `${titleOverlap}px` }} className={`chat-shell ${isLight ? 'chat-light' : ''} flex flex-col w-screen overflow-hidden relative transition-colors duration-200 ${
      isLight ? 'bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100'
    }`}>
      
      {/* Keep mobile panels inside the area below the title bar
          (overrides any fixed / full-viewport positioning from the global CSS) */}
      <style>{`
        /* ── Custom scrollbars (chat feed, sidebar lists, panels, modals) ── */
        .chat-shell *::-webkit-scrollbar { width: 8px; height: 8px; }
        .chat-shell *::-webkit-scrollbar-track { background: transparent; margin: 8px 0; }
        .chat-shell *::-webkit-scrollbar-corner { background: transparent; }
        .chat-shell *::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(99,102,241,0.55), rgba(139,92,246,0.55));
          border-radius: 999px;
          border: 2px solid transparent;
          background-clip: padding-box;
          transition: background 0.2s;
        }
        .chat-shell *::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #818cf8, #a78bfa);
          background-clip: padding-box;
        }
        .chat-shell *::-webkit-scrollbar-thumb:active {
          background: linear-gradient(180deg, #6366f1, #8b5cf6);
          background-clip: padding-box;
        }
        /* Firefox (Chromium ignores ::-webkit-scrollbar if these are set, so scope them) */
        @supports not selector(::-webkit-scrollbar) {
          .chat-shell * { scrollbar-width: thin; scrollbar-color: rgba(129,140,248,0.6) transparent; }
        }
        .chat-shell .chat-sidebar,
        .chat-shell .chat-panel { padding-top: var(--title-overlap, 0px) !important; }
        /* Profile / group modal: keep every row at its natural height so the name
           is never squashed by the "Group • N members" line; the card scrolls instead */
        .chat-shell .profile-modal > * { flex-shrink: 0; }
        /* Short windows: compact the left nav rail so Settings / Profile / Logout
           stay reachable (scrolls if it still doesn't fit) */
        @media (max-height: 640px) {
          .chat-shell .chat-nav-rail {
            justify-content: flex-start !important;
            gap: 14px;
            padding-top: 8px; padding-bottom: 8px;
            overflow-y: auto;
            scrollbar-width: none;
          }
          .chat-shell .chat-nav-rail::-webkit-scrollbar { display: none; }
          .chat-shell .chat-nav-rail > div { gap: 10px !important; flex-shrink: 0; }
        }
        ${LIGHT_MODE_CSS}
        @media (max-width: 767px) {
          .chat-shell .chat-sidebar,
          .chat-shell .chat-panel {
            position: relative !important;
            top: auto !important; right: auto !important;
            bottom: auto !important; left: auto !important;
            inset: auto !important;
            height: 100% !important;
            max-height: 100% !important;
            width: 100% !important;
            flex: 1 1 0% !important;
            min-width: 0 !important;
            min-height: 0 !important;
            transform: none !important;
          }
          .chat-shell .chat-sidebar.mobile-hidden,
          .chat-shell .chat-panel.mobile-hidden { display: none !important; }
        }
      `}</style>

      {/* PROJECT TITLE - TOP HEADER */}
      <header ref={titleBarRef} className={`shrink-0 h-12 px-4 border-b flex items-center justify-center z-30 transition-colors ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800/80'
      }`}>
        <AppTitle isLight={isLight} compact className="w-full max-w-3xl" />
      </header>

      {/* MAIN ROW: nav rail + sidebar + chat workspace */}
      <div
        className="flex flex-1 min-h-0 w-full relative overflow-hidden"
        style={{ transform: 'translateZ(0)', contain: 'layout paint' }}
      >

      {/* 0. WEBSITE LEFT-SIDE NAVBAR (NAV RAIL) */}
      <nav className={`chat-nav-rail hidden md:flex flex-col items-center justify-between py-4 w-[72px] border-r z-20 shrink-0 select-none shadow-2xl transition-colors ${
        isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-950/95 border-slate-800/80'
      }`}>
        {/* Brand / Logo */}
        <div className="flex flex-col items-center gap-6 w-full">
          <button 
            onClick={() => { setSidebarTab('chats'); setShowNewContact(false); setShowSelectContact(false); }}
            className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${currentAccent.gradient} flex items-center justify-center text-white shadow-lg ${currentAccent.glow} hover:scale-105 active:scale-95 transition-all cursor-pointer group relative`}
            title="Real-Time chat Messenger"
          >
            <MessageSquare className="w-5 h-5 fill-white/20" />
            <span className="absolute left-full ml-3 px-2.5 py-1 bg-slate-800 text-slate-200 text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl border border-slate-700 z-50">
              Real-Time chat Messenger
            </span>
          </button>

          {/* Navigation Links */}
          <div className="flex flex-col items-center gap-2.5 w-full px-2">
            {/* 1. Chats Tab */}
            <div className="relative group w-full flex justify-center">
              {sidebarTab === 'chats' && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full shadow-sm shadow-indigo-500" />
              )}
              <button
                onClick={() => { setSidebarTab('chats'); setShowNewContact(false); setShowSelectContact(false); }}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative ${
                  sidebarTab === 'chats'
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-inner'
                    : isLight ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/60'
                }`}
                title="Chats"
              >
                <MessageSquare className="w-5 h-5" />
                {chats.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-[10px] text-white font-bold rounded-full flex items-center justify-center border-2 border-slate-950">
                    {chats.length > 9 ? '9+' : chats.length}
                  </span>
                )}
              </button>
              <span className="absolute left-full ml-3 px-2.5 py-1 bg-slate-800 text-slate-200 text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl border border-slate-700 z-50">
                Chats
              </span>
            </div>

            {/* 2. Add Users (Highlighted & Distinctive!) */}
            <div className="relative group w-full flex justify-center">
              <button
                onClick={() => {
                  setShowNewContact(true)
                  setShowSelectContact(false)
                }}
                className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer bg-gradient-to-tr from-emerald-500/15 to-indigo-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 hover:border-emerald-400/60 hover:scale-105 active:scale-95 shadow-md shadow-emerald-500/10"
                title="Add User"
              >
                <UserPlus className="w-5 h-5" />
              </button>
              <span className="absolute left-full ml-3 px-2.5 py-1 bg-emerald-950 text-emerald-300 text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl border border-emerald-800/80 z-50 flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5" /> Add User
              </span>
            </div>

            {/* 3. Contacts / Users Directory */}
            <div className="relative group w-full flex justify-center">
              {sidebarTab === 'contacts' && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full shadow-sm shadow-indigo-500" />
              )}
              <button
                onClick={() => {
                  setSidebarTab('contacts')
                  setShowNewContact(false)
                  setShowSelectContact(false)
                }}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                  sidebarTab === 'contacts'
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-inner'
                    : isLight ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/60'
                }`}
                title="Contacts"
              >
                <Users className="w-5 h-5" />
              </button>
              <span className="absolute left-full ml-3 px-2.5 py-1 bg-slate-800 text-slate-200 text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl border border-slate-700 z-50">
                Contacts Directory
              </span>
            </div>

            {/* 4. New Group */}
            <div className="relative group w-full flex justify-center">
              {showCreateGroup && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-violet-500 rounded-r-full shadow-sm shadow-violet-500" />
              )}
              <button
                onClick={() => {
                  setShowNewContact(false)
                  setShowSelectContact(false)
                  setShowCreateGroup(true)
                }}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative border ${
                  showCreateGroup
                    ? 'bg-violet-600/25 text-violet-300 border-violet-500/40 shadow-inner'
                    : 'bg-gradient-to-tr from-violet-500/15 to-indigo-500/15 border-violet-500/40 text-violet-300 hover:border-violet-400/70 hover:from-violet-500/25 hover:to-indigo-500/25'
                }`}
                title="New Group"
              >
                <Users className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-violet-500 text-white rounded-full flex items-center justify-center border-2 border-slate-950">
                  <Plus className="w-2.5 h-2.5" strokeWidth={3} />
                </span>
              </button>
              <span className="absolute left-full ml-3 px-2.5 py-1 bg-violet-950 text-violet-200 text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl border border-violet-500/30 z-50 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> New Group
              </span>
            </div>

          </div>
        </div>

        {/* Bottom Actions: Settings, Profile Avatar, Logout */}
        <div className="flex flex-col items-center gap-3 w-full">
          {/* Settings (Navigates to /settings!) */}
          <div className="relative group">
            <button
              onClick={() => navigate('/settings')}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition cursor-pointer ${
                isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/60'
              }`}
              title="Settings & Appearance"
            >
              <Settings className="w-5 h-5" />
            </button>
            <span className="absolute left-full ml-3 px-2.5 py-1 bg-slate-800 text-slate-200 text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl border border-slate-700 z-50">
              Settings & Customization
            </span>
          </div>

          {/* Profile Avatar (Navigates to /profile!) */}
          <div className="relative group">
            <button
              onClick={() => navigate('/profile')}
              className="w-10 h-10 rounded-full border-2 border-slate-700 hover:border-indigo-500 bg-slate-900 overflow-hidden flex items-center justify-center transition cursor-pointer relative shadow-md"
              title="Edit Profile"
            >
              {user?.profile_image ? (
                <img src={`${BACKEND_URL}${user.profile_image}`} alt={user?.username} className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-slate-450" />
              )}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-950 rounded-full" />
            </button>
            <span className="absolute left-full ml-3 px-2.5 py-1 bg-slate-800 text-slate-200 text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl border border-slate-700 z-50">
              {user?.username || 'Edit Profile'}
            </span>
          </div>

          {/* Logout */}
          <div className="relative group">
            <button
              onClick={logout}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <span className="absolute left-full ml-3 px-2.5 py-1 bg-rose-950 text-rose-300 text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl border border-rose-800/80 z-50">
              Log Out
            </span>
          </div>
        </div>
      </nav>

      {/* 1. SECONDARY SIDEBAR */}
      <div style={{ height: '100%', maxHeight: '100%' }} className={`chat-sidebar h-full border-r flex flex-col shrink-0 relative transition-colors ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 backdrop-blur-md border-slate-800'
      } ${mobileView === 'chat' ? 'mobile-hidden' : ''}`}>
        
        {/* TAB 1: CHATS VIEW */}
        {sidebarTab === 'chats' && (
          <>
            {/* Sidebar Header */}
            <div className={`h-16 px-4 border-b flex items-center justify-between relative transition-colors ${
              isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-900/50 border-slate-800'
            }`}>
              <div>
                <h1 className={`text-base font-bold font-outfit tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Chats</h1>
                <span className="text-[11px] text-slate-400">{chats.length} active conversations</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                {/* New Group button */}
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="flex items-center justify-center w-8 h-8 bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 text-violet-300 hover:text-violet-200 rounded-xl transition cursor-pointer"
                  title="New Group"
                >
                  <Users className="w-4 h-4" />
                </button>
                {/* Prominent Add User button */}
                <button
                  onClick={() => setShowNewContact(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm shadow-emerald-500/10 active:scale-95"
                  title="Add User"
                >
                  <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Add User</span>
                </button>
              </div>
            </div>

            {/* Contacts Search Bar */}
            <div className={`p-3 border-b ${isLight ? 'border-slate-200' : 'border-slate-850'}`}>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search chats or users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-8 py-2 border rounded-xl text-xs transition-colors ${
                    isLight ? 'bg-slate-100 border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500' : 'bg-slate-950/40 border-slate-800 focus:outline-none focus:border-indigo-500 text-slate-100'
                  }`}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-200 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Search Results Overlay */}
            {showSearch && (
              <div className="flex-1 overflow-y-auto bg-slate-900/90 divide-y divide-slate-850">
                {searchResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">No users found</div>
                ) : (
                  searchResults.map(contact => (
                    <div
                      key={contact.id}
                      onClick={() => startDirectChat(contact.id)}
                      className="flex items-center gap-3 p-3 hover:bg-indigo-600/10 cursor-pointer transition"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-950 overflow-hidden flex items-center justify-center shrink-0">
                        {contact.profile_image ? (
                          <img src={`${BACKEND_URL}${contact.profile_image}`} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-slate-500" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-medium text-slate-100 truncate">{contact.username}</span>
                        <span className="text-xs text-slate-400 truncate">{contact.about || contact.phone_number}</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); startDirectChat(contact.id); }}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium cursor-pointer"
                      >
                        Chat
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Chats List Preview */}
            {!showSearch && (
              <div className="flex-1 overflow-y-auto divide-y divide-slate-850/50">
                {chats.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-3 mt-8">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <span>No active chats yet.</span>
                    <button
                      onClick={() => setShowNewContact(true)}
                      className="mt-1 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-medium transition cursor-pointer shadow-md shadow-indigo-600/20"
                    >
                      + Add New User
                    </button>
                  </div>
                ) : (
                  chats.map(chat => {
                      const info = getChatNameAndImage(chat)
                      const isActive = activeChat && activeChat.id === chat.id
                      const isTyping = typingUsers[chat.id] && Object.values(typingUsers[chat.id]).some(t => t === true)
                      
                      return (
                        <div
                          key={chat.id}
                          onClick={() => { setActiveChat(chat); setMobileView('chat') }}
                          className={`flex items-center gap-3 p-4 hover:bg-slate-850/30 cursor-pointer transition relative ${isActive ? 'bg-indigo-600/10 hover:bg-indigo-600/15 border-l-2 border-indigo-500' : ''}`}
                        >
                          {/* Avatar with Presence dot */}
                          <div
                            className="relative shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              setAvatarMenuChat(chat)
                            }}
                          >
                            <div className="w-11 h-11 rounded-full bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-indigo-500/60 hover:ring-offset-1 hover:ring-offset-slate-900 transition-all">
                              {info.image ? (
                                <img src={`${BACKEND_URL}${info.image}`} alt={info.name} className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-5 h-5 text-slate-550" />
                              )}
                            </div>
                            {info.isOnline && (
                              <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-semibold truncate pr-2">{info.name}</span>
                              {chat.last_message && (
                                <span className="text-[10px] text-slate-500 shrink-0">
                                  {formatTime(chat.last_message.created_at)}
                                </span>
                              )}
                            </div>
                            
                            {isTyping ? (
                              <span className="text-xs text-indigo-400 font-medium animate-pulse">Typing...</span>
                            ) : chat.last_message ? (
                              <p className="text-xs text-slate-400 truncate max-w-[200px]">
                                {chat.last_message.message_type !== 'text' ? `[${chat.last_message.message_type}]` : chat.last_message.message}
                              </p>
                            ) : (
                              <span className="text-xs text-slate-500">No messages yet</span>
                            )}
                          </div>
                        </div>
                      )
                    })
                )}
              </div>
            )}
          </>
        )}

        {/* TAB 2: CONTACTS & DIRECTORY VIEW */}
        {sidebarTab === 'contacts' && (
          <>
            {/* Contacts Header */}
            <div className={`h-16 px-4 border-b flex items-center justify-between relative ${isLight ? 'bg-slate-50 border-slate-200' : 'border-slate-800 bg-slate-900/50'}`}>
              <div>
                <h1 className={`text-base font-bold font-outfit tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Contacts</h1>
                <span className="text-[11px] text-slate-400">{contactsList.length} users registered</span>
              </div>
              <button
                onClick={() => setShowNewContact(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-emerald-500 via-emerald-600 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-md shadow-emerald-600/20 active:scale-95"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add User</span>
              </button>
            </div>

            {/* Contacts Search Bar */}
            <div className="p-3 border-b border-slate-850">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search contacts by name or phone..."
                  value={contactsSearch}
                  onChange={(e) => setContactsSearch(e.target.value)}
                  className="w-full pl-10 pr-8 py-2 bg-slate-950/40 border border-slate-800 focus:outline-none focus:border-indigo-500 rounded-xl text-xs text-slate-100"
                />
                {contactsSearch && (
                  <button onClick={() => setContactsSearch('')} className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-200 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Action: Add New Contact Card */}
            <div
              onClick={() => setShowNewContact(true)}
              className={`m-3 p-3 bg-gradient-to-r border rounded-2xl flex items-center gap-3 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] group shadow-md ${isLight ? 'from-indigo-50 via-white to-violet-50 border-indigo-200 hover:border-indigo-400' : 'from-indigo-950/40 via-slate-900 to-violet-950/40 border-indigo-500/20 hover:border-indigo-400/50'}`}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform shrink-0">
                <UserPlus className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`text-xs font-semibold flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-slate-100 group-hover:text-white'}`}>
                  Add New Contact
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 font-medium ${isLight ? 'text-emerald-700' : 'text-emerald-300'}`}>Quick</span>
                </h4>
                <p className={`text-[11px] truncate ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Enter phone number to chat instantly</p>
              </div>
            </div>

            {/* Contacts Directory List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-850/50">
              {contactsList
                .filter(c => {
                  if (!contactsSearch.trim()) return true
                  const q = contactsSearch.toLowerCase()
                  return (
                    (c.username && c.username.toLowerCase().includes(q)) ||
                    (c.phone_number && c.phone_number.includes(q)) ||
                    (c.about && c.about.toLowerCase().includes(q))
                  )
                })
                .map(contact => {
                  const isOnline = onlineUsers.has(contact.id)
                  const isSelf = contact.id === user?.id

                  return (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-3.5 hover:bg-slate-850/30 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-full bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
                            {contact.profile_image ? (
                              <img src={`${BACKEND_URL}${contact.profile_image}`} alt={contact.username} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-5 h-5 text-slate-500" />
                            )}
                          </div>
                          {isOnline && (
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-slate-100 truncate">{contact.username}</span>
                            {isSelf && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">You</span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 truncate block">
                            {contact.phone_number || contact.about || 'Available'}
                          </span>
                        </div>
                      </div>

                      {!isSelf && (
                        <button
                          onClick={() => {
                            startDirectChat(contact.id)
                            setSidebarTab('chats')
                          }}
                          className={`px-3 py-1.5 bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 hover:border-indigo-400 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer shrink-0 ${isLight ? 'text-indigo-700 hover:text-indigo-900' : 'text-indigo-300 hover:text-white'}`}
                        >
                          Message
                        </button>
                      )}
                    </div>
                  )
                })}
            </div>
          </>
        )}

        {/* Mobile Bottom Navigation Bar (< 768px) */}
        <div className="md:hidden mt-auto border-t border-slate-800 bg-slate-950/95 px-1 py-2 flex items-center justify-around z-20 shrink-0">
          <button
            onClick={() => { setSidebarTab('chats'); setShowNewContact(false); }}
            className={`flex-1 min-w-0 flex flex-col items-center gap-1 p-1 rounded-xl text-[10px] ${sidebarTab === 'chats' ? 'text-indigo-400 font-semibold' : 'text-slate-400'}`}
          >
            <MessageSquare className="w-5 h-5" />
            <span>Chats</span>
          </button>
          <button
            onClick={() => setShowNewContact(true)}
            className="flex-1 min-w-0 flex flex-col items-center gap-1 p-1 rounded-xl text-[10px] text-emerald-400 font-semibold"
          >
            <UserPlus className="w-5 h-5" />
            <span>Add User</span>
          </button>
          <button
            onClick={() => { setSidebarTab('contacts'); setShowNewContact(false); }}
            className={`flex-1 min-w-0 flex flex-col items-center gap-1 p-1 rounded-xl text-[10px] ${sidebarTab === 'contacts' ? 'text-indigo-400 font-semibold' : 'text-slate-400'}`}
          >
            <Users className="w-5 h-5" />
            <span>Contacts</span>
          </button>
          <button
            onClick={() => { setShowNewContact(false); setShowSelectContact(false); setShowCreateGroup(true) }}
            className="flex-1 min-w-0 flex flex-col items-center gap-1 p-1 rounded-xl text-[10px] text-violet-300 font-semibold"
          >
            <span className="relative">
              <Users className="w-5 h-5" />
              <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-violet-500 text-white rounded-full flex items-center justify-center">
                <Plus className="w-2.5 h-2.5" strokeWidth={3} />
              </span>
            </span>
            <span>Group</span>
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="flex-1 min-w-0 flex flex-col items-center gap-1 p-1 rounded-xl text-[10px] text-slate-400"
          >
            <User className="w-5 h-5" />
            <span>Profile</span>
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="flex-1 min-w-0 flex flex-col items-center gap-1 p-1 rounded-xl text-[10px] text-slate-400"
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </button>
          <button
            onClick={logout}
            className="flex-1 min-w-0 flex flex-col items-center gap-1 p-1 rounded-xl text-[10px] text-rose-400"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>

        {/* Rivo New Chat Floating Action Button (FAB) */}
        <button
          onClick={handleOpenSelectContact}
          className="absolute bottom-20 md:bottom-6 right-6 z-20 w-13 h-13 sm:w-14 sm:h-14 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 hover:from-indigo-500 hover:to-violet-400 active:scale-95 text-white rounded-2xl sm:rounded-3xl shadow-xl shadow-indigo-600/35 border border-indigo-400/30 flex items-center justify-center transition-all duration-200 cursor-pointer group hover:shadow-indigo-500/50 hover:-translate-y-0.5"
          title="New Chat"
        >
          <MessageSquarePlus className="w-6 h-6 text-white group-hover:scale-110 transition-transform duration-200 drop-shadow" />
        </button>

        {/* SELECT CONTACT PANEL (WhatsApp Style) */}
        {showSelectContact && !showNewContact && (() => {
          // Extract only added friends/contacts from 1-on-1 chats
          const addedContactsMap = new Map()
          chats
            .filter(c => c.type === 'one_to_one')
            .forEach(c => {
              const other = c.members?.find(m => m.user_id !== user?.id)
              if (other?.user) {
                addedContactsMap.set(other.user.id, other.user)
              }
            })
          const addedContacts = Array.from(addedContactsMap.values())

          // If searching, filter global users; otherwise, show added contacts only
          const displayedContacts = selectContactQuery.trim()
            ? contactsList.filter(c =>
                (c.username && c.username.toLowerCase().includes(selectContactQuery.toLowerCase())) ||
                (c.phone_number && c.phone_number.includes(selectContactQuery)) ||
                (c.about && c.about.toLowerCase().includes(selectContactQuery.toLowerCase()))
              )
            : addedContacts

          return (
            <div className="absolute inset-0 z-30 bg-slate-900 flex flex-col animate-in slide-in-from-left duration-200">
              {/* Header */}
              {showSelectContactSearch ? (
                <div className="h-16 px-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 text-white flex items-center gap-3 shadow-md">
                  <button 
                    onClick={() => {
                      setShowSelectContactSearch(false)
                      setSelectContactQuery('')
                    }} 
                    className="p-1 rounded-full hover:bg-black/10 transition cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="flex-1">
                    <input
                      type="text"
                      autoFocus
                      value={selectContactQuery}
                      onChange={(e) => setSelectContactQuery(e.target.value)}
                      placeholder="Search contacts..."
                      className="w-full bg-transparent text-sm text-white placeholder-indigo-200 focus:outline-none"
                    />
                  </div>
                  {selectContactQuery && (
                    <button 
                      onClick={() => setSelectContactQuery('')} 
                      className="p-1 rounded-full hover:bg-black/10 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="h-16 px-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 text-white flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setShowSelectContact(false)} className="p-1 rounded-full hover:bg-black/10 transition cursor-pointer">
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <h2 className="text-base font-semibold leading-tight font-outfit">Select contact</h2>
                      <span className="text-xs opacity-90 text-indigo-100">{displayedContacts.length} contacts</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShowSelectContactSearch(true)} 
                      className="p-1 rounded-full hover:bg-black/10 transition cursor-pointer"
                      title="Search Contacts"
                    >
                      <Search className="w-5 h-5" />
                    </button>
                    <button className="p-1 rounded-full hover:bg-black/10 transition">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
                {/* Quick Actions (only show when not searching) */}
                {!showSelectContactSearch && (
                  <div className="p-2 space-y-1">
                    {/* New Group Option */}
                    <div
                      onClick={() => { setShowCreateGroup(true); setShowSelectContact(false) }}
                      className="flex items-center gap-4 p-3 hover:bg-slate-800/60 rounded-xl cursor-pointer transition"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                        <Users className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-medium text-slate-100">New group</span>
                    </div>

                    {/* New Contact Option */}
                    <div 
                      onClick={() => setShowNewContact(true)}
                      className="flex items-center gap-4 p-3 hover:bg-slate-800/60 rounded-xl cursor-pointer transition"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                        <UserPlus className="w-5 h-5" />
                      </div>
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-100">New contact</span>
                        <span className="w-6 h-6 border border-slate-700 rounded-md flex items-center justify-center text-[10px] text-slate-400">QR</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Contacts Section Header */}
                <div className="px-4 py-2.5 text-xs font-semibold text-indigo-400 bg-slate-950/60 uppercase tracking-wider">
                  Contacts on Real-Time chat
                </div>

                {/* Contacts Items */}
                {displayedContacts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    {selectContactQuery.trim() ? 'No matching contacts found' : 'No added contacts yet. Tap "New contact" above to add someone!'}
                  </div>
                ) : (
                  displayedContacts.map(contact => (
                    <div
                      key={contact.id}
                      onClick={() => {
                        startDirectChat(contact.id)
                        setShowSelectContact(false)
                      }}
                      className="flex items-center gap-3 p-3.5 hover:bg-indigo-600/10 cursor-pointer transition"
                    >
                      <div 
                        className="w-10 h-10 rounded-full bg-slate-950 overflow-hidden flex items-center justify-center border border-slate-800 shrink-0 cursor-pointer hover:ring-2 hover:ring-rose-500/60 hover:ring-offset-1 hover:ring-offset-slate-900 transition-all"
                        onClick={(e) => {
                          e.stopPropagation()
                          const existingChat = chats.find(c => c.type === 'one_to_one' && c.members?.some(m => m.user_id === contact.id))
                          if (existingChat) {
                            setAvatarMenuChat(existingChat)
                          } else {
                            setAvatarMenuChat({
                              id: null,
                              type: 'one_to_one',
                              isUnsavedContact: true,
                              targetContact: contact,
                              members: [{ user_id: contact.id, user: contact }]
                            })
                          }
                        }}
                        title="View Profile / Remove"
                      >
                        {contact.profile_image ? (
                          <img src={`${BACKEND_URL}${contact.profile_image}`} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-slate-100 truncate">{contact.username}</span>
                        <span className="text-xs text-slate-400 truncate">{contact.phone_number || contact.about}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })()}

        {/* NEW CONTACT PANEL */}
        {showNewContact && (
          <div className="absolute inset-0 z-40 bg-slate-900 flex flex-col animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="h-16 px-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 text-white flex items-center gap-4 shadow-md">
              <button onClick={() => setShowNewContact(false)} className="p-1 rounded-full hover:bg-black/10 transition cursor-pointer">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-base font-semibold font-outfit">New contact</h2>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveNewContact} className="flex-1 p-6 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-6">
                {newContactError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                    {newContactError}
                  </div>
                )}

                {/* Name */}
                <div className="relative flex items-center gap-4">
                  <User className="w-5 h-5 text-slate-400 shrink-0 mt-3" />
                  <div className="flex-1 border-b border-slate-700 focus-within:border-indigo-500 pb-1">
                    <label className="block text-[10px] text-slate-400 uppercase">Name</label>
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full text-sm bg-transparent text-slate-100 focus:outline-none placeholder-slate-600"
                    />
                  </div>
                </div>

                {/* Country & Phone */}
                <div className="relative flex items-center gap-4">
                  <Phone className="w-5 h-5 text-slate-400 shrink-0 mt-3" />
                  <div className="flex gap-3 flex-1">
                    <div className="w-20 border-b border-slate-700 focus-within:border-indigo-500 pb-1">
                      <label className="block text-[10px] text-slate-400 uppercase">Country</label>
                      <input
                        type="text"
                        value={newCountryCode}
                        onChange={(e) => setNewCountryCode(e.target.value)}
                        className="w-full text-sm font-semibold bg-transparent text-indigo-400 focus:outline-none"
                      />
                    </div>
                    <div className="flex-1 border-b border-slate-700 focus-within:border-indigo-500 pb-1">
                      <label className="block text-[10px] text-slate-400 uppercase">Phone</label>
                      <input
                        type="tel"
                        required
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="1234 567 89"
                        className="w-full text-sm bg-transparent text-slate-100 focus:outline-none placeholder-slate-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Save to Field */}
                <div className="relative flex items-center gap-4">
                  <div className="w-5 shrink-0" />
                  <div className="flex-1 border-b border-slate-700 focus-within:border-indigo-500 pb-1">
                    <label className="block text-[10px] text-slate-400 uppercase">Save to</label>
                    <select
                      value={saveToOption}
                      onChange={(e) => setSaveToOption(e.target.value)}
                      className="w-full text-sm bg-transparent text-slate-100 focus:outline-none py-0.5 cursor-pointer"
                    >
                      <option value="Phone / Device" className="bg-slate-900 text-slate-100">Phone / Device</option>
                      <option value="Google Account" className="bg-slate-900 text-slate-100">Google Account</option>
                      <option value="SIM Card" className="bg-slate-900 text-slate-100">SIM Card</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={newContactLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.98] text-sm disabled:opacity-50 cursor-pointer"
                >
                  {newContactLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* 2. CHAT MAIN WORKSPACE */}
      <div style={{ height: '100%', maxHeight: '100%' }} className={`chat-panel h-full flex-col relative transition-colors ${
        isLight ? 'bg-slate-100/60' : 'bg-slate-950/20'
      } ${mobileView === 'sidebar' ? 'mobile-hidden' : ''}`}>
        {activeChat ? (
          <>
            {/* Active Chat Header */}
            <div className={`h-16 px-3 border-b flex items-center justify-between backdrop-blur-md relative z-10 transition-colors ${
              isLight ? 'bg-white/90 border-slate-200 text-slate-900 shadow-xs' : 'bg-slate-900/30 border-slate-800 text-slate-100'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                {/* Mobile Back Button */}
                <button
                  onClick={() => setMobileView('sidebar')}
                  className={`chat-back-btn p-2 rounded-xl transition cursor-pointer shrink-0 ${
                    isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                  }`}
                  title="Back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <div 
                  onClick={() => setAvatarMenuChat(activeChat)}
                  className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-slate-950 overflow-hidden flex items-center justify-center border border-slate-800 shrink-0 cursor-pointer hover:ring-2 hover:ring-rose-500/60 hover:ring-offset-1 hover:ring-offset-slate-900 transition-all"
                  title="View Profile / Remove"
                >
                  {getChatNameAndImage(activeChat).image ? (
                    <img src={`${BACKEND_URL}${getChatNameAndImage(activeChat).image}`} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-slate-550" />
                  )}
                </div>
                <div 
                  onClick={() => setAvatarMenuChat(activeChat)}
                  className="min-w-0 cursor-pointer hover:opacity-85 transition"
                  title="View Profile / Remove"
                >
                  <h2 className="text-sm font-semibold truncate">{getChatNameAndImage(activeChat).name}</h2>
                  
                  {/* Status subtitle */}
                  {activeChat.type === 'one_to_one' ? (
                    <span className="text-[10px] text-slate-400">
                      {onlineUsers.has(activeChat.members.find(m => m.user_id !== user?.id)?.user_id) ? (
                        <span className="text-emerald-400 font-medium">Online</span>
                      ) : (
                        `Offline`
                      )}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Group ({activeChat.members.length})</span>
                  )}
                </div>
              </div>

              {/* Action Buttons — always visible */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => startCall(activeChat.id, 'audio')}
                  title="Voice Call"
                  className={`p-2 rounded-xl transition cursor-pointer ${
                    isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                  }`}
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  onClick={() => startCall(activeChat.id, 'video')}
                  title="Video Call"
                  className={`p-2 rounded-xl transition cursor-pointer ${
                    isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                  }`}
                >
                  <VideoIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteChat(activeChat)}
                  title={activeChat.type === 'one_to_one' ? 'Remove Contact & Delete Chat' : 'Leave Group'}
                  className="p-2 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Message History Feed */}
            <div className="relative flex-1 min-h-0 flex flex-col">
              {/* Background wallpaper layer - lives OUTSIDE the scroller so it always
                  fills the whole message area and never scrolls away with the messages */}
              {activeWallpaper && (
                <div
                  className="absolute inset-0 bg-cover bg-center transition-opacity duration-300 pointer-events-none z-0"
                  style={{
                    backgroundImage: `url(${activeWallpaper})`,
                    opacity: wallpaperDim,
                  }}
                />
              )}

            <div className="chat-messages-feed flex-1 overflow-y-auto p-3 md:p-6 space-y-4 relative z-10" style={{minHeight: 0}}>

              {messages.map((msg, index) => {
                const isMe = msg.sender_id === user?.id
                const hasAttachment = msg.attachments && msg.attachments.length > 0
                
                // Get status checks
                const isRead = msg.statuses.some(s => s.status === 'read')
                const isDelivered = msg.statuses.some(s => s.status === 'delivered')

                return (
                  <div
                    key={msg.id || index}
                    className={`flex w-full group relative z-10 ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    
                    {/* Inner column: flex-col so username sits above bubble */}
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[75%]`}>
                    {/* Optional Sender Username (for groups) */}
                    {activeChat.type === 'group' && !isMe && (
                      <span className="text-[10px] text-indigo-400 font-semibold mb-1 ml-2">
                        {msg.sender?.username}
                      </span>
                    )}

                    {/* Message Bubble container - flex-row-reverse so outgoing bubbles hug the right edge */}
                    <div className={`flex items-end gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      
                      <div 
                        className={`p-3 rounded-2xl shadow-md transition relative hover:shadow-lg ${
                          isMe 
                            ? `bg-gradient-to-r ${currentAccent.gradient} rounded-br-xs` 
                            : (isLight ? 'bg-white border border-slate-200 text-slate-900 rounded-bl-xs' : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-xs')
                        }`}
                        style={isMe ? { color: bubbleTextColor } : {}}
                      >
                        
                        {/* Reply Context Header */}
                        {msg.reply_to && (
                          <div className="mb-2 p-2 bg-black/20 rounded-lg text-[11px] border-l-2 border-slate-400 flex flex-col opacity-80">
                            <span className="font-semibold">Reply context</span>
                            <span className="truncate max-w-[200px]">Original message ID: {msg.reply_to}</span>
                          </div>
                        )}

                        {/* Media rendering depending on message_type */}
                        {msg.message_type === 'image' && (
                          <div className="mb-2 rounded-lg overflow-hidden border border-black/10 max-w-[250px] bg-slate-950">
                            <img src={`${BACKEND_URL}${msg.message}`} alt="attachment" className="w-full h-auto" />
                          </div>
                        )}

                        {msg.message_type === 'video' && (
                          <div className="mb-2 rounded-lg overflow-hidden border border-black/10 max-w-[280px] bg-slate-950">
                            <video src={`${BACKEND_URL}${msg.message}`} controls className="w-full" />
                          </div>
                        )}

                        {msg.message_type === 'voice' && (
                          <div className="my-1 py-1 px-1 bg-slate-900/60 rounded-xl flex items-center gap-2 border border-slate-700/40">
                            <audio src={`${BACKEND_URL}${msg.message}`} controls className="w-48 sm:w-60 h-8 accent-indigo-500" />
                          </div>
                        )}

                        {msg.message_type === 'document' && (
                          <a
                            href={`${BACKEND_URL}${msg.message}`}
                            download
                            className="mb-2 p-2 bg-black/10 hover:bg-black/20 rounded-lg flex items-center gap-2 text-xs text-indigo-200 border border-slate-700/50"
                          >
                            <File className="w-4 h-4 shrink-0" />
                            <span className="truncate max-w-[150px]">Download Document</span>
                          </a>
                        )}

                        {/* Message Text (if text or emoji, or as description for files) */}
                        {msg.message_type === 'text' || msg.message_type === 'emoji' ? (
                          <p 
                            className={`${currentFontSize.class} whitespace-pre-wrap leading-relaxed break-words font-medium`}
                            style={isMe ? { color: bubbleTextColor } : {}}
                          >
                            {msg.message}
                          </p>
                        ) : null}

                        {/* Footer (Edited badge, Checkmarks, Timestamp) */}
                        <div className="flex justify-end items-center gap-1.5 mt-1.5 text-[9px] opacity-80">
                          {msg.edited_at && <span className="font-semibold italic text-[8px]">(edited)</span>}
                          <span>{formatTime(msg.created_at)}</span>
                          
                          {/* Receipt Checkmarks */}
                          {isMe && (
                            <span>
                              {isRead ? (
                                <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                              ) : isDelivered ? (
                                <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bubble Hover Action Toolbar (desktop only to prevent mobile layout shift) */}
                      <div className="hidden md:flex opacity-0 group-hover:opacity-100 items-center gap-1 transition-opacity self-center shrink-0">
                        <button
                          onClick={() => setReplyMessage(msg)}
                          title="Reply"
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 cursor-pointer"
                        >
                          <CornerUpLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleCopyMessage(msg.message)}
                          title="Copy"
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 cursor-pointer"
                        >
                          <File className="w-3.5 h-3.5" />
                        </button>
                        {isMe && !msg.is_deleted && (
                          <>
                            <button
                              onClick={() => handleEditMessage(msg)}
                              title="Edit"
                              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              title="Delete"
                              className="p-1.5 hover:bg-slate-800 rounded-lg text-rose-500 hover:text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
            </div>

            {/* Reply Preview Bar */}
            {replyMessage && (
              <div className="px-6 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
                <div className="flex flex-col border-l-2 border-indigo-500 pl-3">
                  <span className="font-semibold text-indigo-400">Replying to message</span>
                  <span className="truncate max-w-[400px]">{replyMessage.message}</span>
                </div>
                <button onClick={() => setReplyMessage(null)} className="p-1 hover:bg-slate-800 rounded-full">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Input Action Controls Footer */}
            <div className={`px-2 sm:px-4 py-2 sm:py-3 border-t flex flex-col gap-2 shrink-0 transition-colors ${
              isLight ? 'bg-white/95 border-slate-200' : 'bg-slate-900/50 border-slate-800'
            }`}>
              
              {/* Emoji Picker Row */}
              {showEmojiPicker && (
                <div className={`flex flex-wrap gap-2 p-2 border rounded-xl max-w-sm self-start shadow-xl z-20 ${
                  isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-850'
                }`}>
                  {emojis.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setText(prev => prev + emoji)
                        setShowEmojiPicker(false)
                      }}
                      className={`text-lg p-1.5 rounded-lg transition cursor-pointer ${
                        isLight ? 'hover:bg-slate-100' : 'hover:bg-slate-800'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Main Input Controls Layout */}
              <form onSubmit={handleSendMessage} className="chat-input-form flex items-center gap-1.5 sm:gap-2.5 w-full">
                {/* Paperclip File Upload */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach File"
                  className={`shrink-0 p-2 sm:p-2.5 rounded-xl transition cursor-pointer ${
                    isLight ? 'hover:bg-slate-100 text-slate-600 hover:text-slate-900' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                  }`}
                >
                  <Paperclip className="w-4.5 h-4.5" />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </button>

                {/* Emoji button */}
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  title="Emoji Picker"
                  className={`shrink-0 p-2 sm:p-2.5 rounded-xl transition cursor-pointer ${
                    isLight ? 'hover:bg-slate-100 text-slate-600 hover:text-slate-900' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                  }`}
                >
                  <Smile className="w-4.5 h-4.5" />
                </button>

                {/* TextInput or Voice Recording Bar */}
                {isRecording ? (
                  <div className="flex-1 min-w-0 flex items-center justify-between bg-rose-500/10 border border-rose-500/25 px-3 py-1.5 rounded-xl animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                      <span className="text-xs text-rose-400 font-bold font-mono tracking-wider shrink-0">
                        {formatVoiceTime(recordingSeconds)}
                      </span>
                      <span className="text-xs text-slate-400 italic hidden sm:inline truncate">
                        Recording...
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Cancel / Discard button */}
                      <button
                        type="button"
                        onClick={cancelVoiceRecording}
                        className="px-2 py-1 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-lg transition cursor-pointer flex items-center gap-1 text-xs"
                        title="Cancel and discard voice note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Cancel</span>
                      </button>

                      {/* Send Voice Note button */}
                      <button
                        type="button"
                        onClick={sendVoiceRecording}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition active:scale-95 cursor-pointer flex items-center gap-1 text-xs font-semibold shadow-md shadow-emerald-950/40"
                        title="Send voice note"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send</span>
                      </button>
                    </div>
                  </div>
                ) : isUploadingVoice ? (
                  <div className="flex-1 min-w-0 flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-2 rounded-xl animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                    <span className="text-xs text-indigo-300 font-medium truncate">Sending voice note...</span>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={text}
                      onChange={handleTextChange}
                      onFocus={() => {
                        setTimeout(() => {
                          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
                        }, 250)
                      }}
                      placeholder={editMessageId ? "Edit message..." : "Type a message..."}
                      className={`min-w-0 flex-1 border focus:outline-none focus:border-indigo-500 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-base sm:text-sm transition-colors ${
                        isLight ? 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400' : 'bg-slate-950/50 border-slate-800 text-slate-100 placeholder-slate-500'
                      }`}
                    />

                    {/* Mic Trigger */}
                    <button
                      type="button"
                      onClick={startVoiceRecording}
                      title="Record Voice Note"
                      className={`shrink-0 p-2 sm:p-2.5 border rounded-xl transition cursor-pointer shadow-sm flex items-center justify-center ${
                        isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200' : 'bg-slate-850/80 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 border-slate-750/70 hover:border-indigo-500/40'
                      }`}
                    >
                      <Mic className="w-4.5 h-4.5" />
                    </button>

                    {/* Send Button with custom accent */}
                    <button
                      type="submit"
                      title="Send Message"
                      className={`shrink-0 p-2 sm:p-2.5 bg-gradient-to-r ${currentAccent.gradient} text-white rounded-xl transition cursor-pointer shadow-lg ${currentAccent.glow} flex items-center justify-center hover:opacity-95 active:scale-95`}
                    >
                      <Send className="w-4.5 h-4.5" />
                    </button>
                  </>
                )}
              </form>
            </div>
          </>
        ) : (
          /* Welcome Graphic */
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center bg-slate-950/10">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-500/5 mb-6">
              <MessageSquare className="w-10 h-10 text-indigo-400/60" />
            </div>
            <h2 className="text-xl font-bold font-outfit text-slate-300">Real-Time chat Messenger</h2>
            <p className="text-xs text-slate-500 max-w-sm mt-2 leading-relaxed">
              Send instant encrypted messages, documents, media, and voice notes. Initiate secure peer-to-peer audio and video calls.
            </p>
          </div>
        )}
      </div>

      </div>

      {/* 3. GROUP CREATION DIALOG MODAL */}
      {showCreateGroup && (
        <div className="absolute inset-x-0 bottom-0 top-12 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold font-outfit">Create New Group</h2>
              <button onClick={() => setShowCreateGroup(false)} className="p-1 hover:bg-slate-800 rounded-full cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroupSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:outline-none focus:border-indigo-500 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  placeholder="Group topic or description"
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:outline-none focus:border-indigo-500 rounded-xl resize-none"
                />
              </div>

              {/* Member Selection list */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Select Members
                </label>
                <div className="max-h-36 overflow-y-auto border border-slate-800 rounded-xl divide-y divide-slate-850/50 bg-slate-950/30 p-2 space-y-1">
                  {chats.filter(c => c.type === 'one_to_one').map(c => {
                    const contactUserObj = c.members.find(m => m.user_id !== user?.id)?.user
                    if (!contactUserObj) return null
                    
                    const isSelected = selectedGroupUsers.includes(contactUserObj.id)
                    
                    return (
                      <div
                        key={contactUserObj.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedGroupUsers(prev => prev.filter(id => id !== contactUserObj.id))
                          } else {
                            setSelectedGroupUsers(prev => [...prev, contactUserObj.id])
                          }
                        }}
                        className={`flex items-center justify-between p-2 hover:bg-slate-800/40 rounded-lg cursor-pointer transition ${isSelected ? 'bg-indigo-500/10' : ''}`}
                      >
                        <span className="text-xs font-medium">{contactUserObj.username}</span>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer"
                        />
                      </div>
                    )
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold rounded-xl hover:opacity-90 active:scale-95 transition shadow-lg shadow-indigo-500/10 cursor-pointer"
              >
                Create Group
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. WebRTC VIDEO/AUDIO CALL OVERLAY */}
      {callState && (
        <div className="keep-dark absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md p-6 select-none animate-fade-in text-slate-100">
          
          {/* Hidden audio element for remote audio in voice calls */}
          <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
          
          {/* Ringing Incoming Call screen */}
          {callState === 'ringing_incoming' && (
            <div className="flex flex-col items-center gap-6 max-w-sm text-center">
              <div className="w-24 h-24 rounded-full border border-indigo-500/20 bg-slate-900 overflow-hidden flex items-center justify-center shadow-2xl animate-bounce">
                {callUser?.profile_image ? (
                  <img src={`${BACKEND_URL}${callUser.profile_image}`} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-slate-500" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold font-outfit">{callUser?.username}</h3>
                <p className="text-sm text-slate-400 mt-1 flex items-center gap-1.5 justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" /> Incoming Real-Time chat {callType === 'video' ? 'Video' : 'Audio'} Call...
                </p>
              </div>

              <div className="flex gap-6 mt-8">
                <button
                  onClick={hangupCall}
                  className="px-6 py-3 bg-rose-600 text-white rounded-full hover:bg-rose-500 active:scale-95 transition shadow-lg shadow-rose-500/25 flex items-center gap-2 cursor-pointer font-semibold"
                >
                  <Phone className="w-4 h-4 rotate-[135deg]" /> Decline
                </button>
                <button
                  onClick={acceptCall}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-full hover:bg-emerald-500 active:scale-95 transition shadow-lg shadow-emerald-500/25 flex items-center gap-2 cursor-pointer font-semibold"
                >
                  <Phone className="w-4 h-4" /> Accept
                </button>
              </div>
            </div>
          )}

          {/* Ringing Outgoing Call screen */}
          {callState === 'ringing_outgoing' && (
            <div className="flex flex-col items-center gap-6 max-w-sm text-center">
              <div className="w-24 h-24 rounded-full border border-indigo-500/20 bg-slate-900 overflow-hidden flex items-center justify-center shadow-2xl animate-pulse">
                {callUser?.profile_image ? (
                  <img src={`${BACKEND_URL}${callUser.profile_image}`} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-slate-500" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold font-outfit">{callUser?.username}</h3>
                <p className="text-sm text-slate-400 mt-1">Calling...</p>
              </div>

              <button
                onClick={hangupCall}
                className="mt-12 px-6 py-3 bg-rose-600 text-white rounded-full hover:bg-rose-500 active:scale-95 transition shadow-lg shadow-rose-500/25 flex items-center gap-2 cursor-pointer font-semibold"
              >
                <Phone className="w-4 h-4 rotate-[135deg]" /> Hang Up
              </button>
            </div>
          )}

          {/* Connected WebRTC Call Session stream displays */}
          {callState === 'connected' && (
            <div className="relative w-full h-full flex flex-col items-center justify-between">
              
              {/* Media streams container */}
              <div className="flex-1 w-full relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800/80 shadow-2xl flex items-center justify-center">
                
                {callType === 'video' ? (
                  <>
                    {/* Large Remote Video Stream */}
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover bg-slate-950"
                    />
                    
                    {/* Small Local Picture-in-Picture Video Stream */}
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="absolute top-4 right-4 w-36 h-48 object-cover rounded-2xl border-2 border-indigo-500/40 bg-slate-950 shadow-lg"
                    />
                  </>
                ) : (
                  /* Audio Call visual interface */
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-24 h-24 rounded-full border border-indigo-500/20 bg-slate-950 overflow-hidden flex items-center justify-center shadow-lg">
                      {callUser?.profile_image ? (
                        <img src={`${BACKEND_URL}${callUser.profile_image}`} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-10 h-10 text-slate-500" />
                      )}
                    </div>
                    <span className="text-xl font-bold font-outfit">{callUser?.username}</span>
                    <span className="text-xs text-indigo-400 font-semibold tracking-widest animate-pulse uppercase">Connected Audio Call</span>
                  </div>
                )}
              </div>

              {/* Call Controls panel */}
              <div className="h-24 w-full flex items-center justify-center gap-6 mt-4 z-20">
                <button
                  onClick={hangupCall}
                  className="p-4 bg-rose-600 text-white rounded-full hover:bg-rose-500 active:scale-95 transition shadow-lg shadow-rose-500/25 cursor-pointer"
                >
                  <Phone className="w-6 h-6 rotate-[135deg]" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PROFILE QUICK-VIEW & REMOVE MODAL */}
      {avatarMenuChat && (() => {
        const info = getChatNameAndImage(avatarMenuChat)
        const isOneToOne = avatarMenuChat.type === 'one_to_one'

        return (
          <div 
            className="fixed inset-x-0 bottom-0 top-12 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
            onClick={() => setAvatarMenuChat(null)}
          >
            <div 
              className="profile-modal relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl overflow-y-auto max-h-full shadow-2xl p-5 sm:p-6 flex flex-col items-center animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button 
                onClick={() => setAvatarMenuChat(null)}
                className={`absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 rounded-full transition cursor-pointer z-10 ${isLight ? 'text-slate-600 hover:text-slate-900 bg-slate-200/80 hover:bg-slate-300' : 'text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-750'}`}
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Large Profile Avatar */}
              <div className="relative group my-2">
                <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-slate-950 border-4 border-slate-800 shadow-2xl overflow-hidden flex items-center justify-center">
                  {info.image ? (
                    <img 
                      src={`${BACKEND_URL}${info.image}`} 
                      alt={info.name} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <User className="w-12 h-12 sm:w-14 sm:h-14 text-slate-500" />
                  )}
                </div>
                {info.isOnline && (
                  <span 
                    className="absolute bottom-1 right-2 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full shadow-md" 
                    title="Online"
                  />
                )}
              </div>

              {/* Name */}
              <h3 className={`text-xl font-bold mt-2 font-outfit text-center truncate leading-snug w-full ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {info.name}
              </h3>
              
              {/* Status */}
              <div className="flex items-center gap-1.5 mt-1">
                {isOneToOne ? (
                  info.isOnline ? (
                    <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Online
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Offline</span>
                  )
                ) : (
                  <span className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Group • {avatarMenuChat.members?.length || 0} members
                  </span>
                )}
              </div>

              {info.phone && (
                <p className="text-xs text-slate-400 mt-1 font-mono">{info.phone}</p>
              )}

              {info.about && (
                <p className="text-xs text-slate-300 text-center italic mt-2 px-3 py-1.5 bg-slate-950/50 rounded-xl border border-slate-800/60 max-w-full truncate">
                  "{info.about}"
                </p>
              )}

              {/* Group members + Add member (groups only) */}
              {!isOneToOne && avatarMenuChat.id && (() => {
                const groupMembers = avatarMenuChat.members || []
                const memberIds = new Set(groupMembers.map(m => m.user_id))

                // Candidates = your 1-on-1 contacts who are not already in this group
                const candidateMap = new Map()
                chats
                  .filter(c => c.type === 'one_to_one')
                  .forEach(c => {
                    const other = c.members?.find(m => m.user_id !== user?.id)?.user
                    if (other && !memberIds.has(other.id)) candidateMap.set(other.id, other)
                  })
                const candidates = Array.from(candidateMap.values())

                return (
                  <div className="w-full mt-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Members ({groupMembers.length})
                      </span>
                      <button
                        onClick={() => { setShowAddMembers(v => !v); setAddMemberSelection([]) }}
                        className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        {showAddMembers ? 'Cancel' : 'Add member'}
                      </button>
                    </div>

                    {/* Current members */}
                    <div className="max-h-28 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/40 divide-y divide-slate-800/60">
                      {groupMembers.map(m => (
                        <div key={m.user_id} className="flex items-center gap-2.5 px-3 py-2">
                          <div className="w-7 h-7 rounded-full bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                            {m.user?.profile_image ? (
                              <img src={`${BACKEND_URL}${m.user.profile_image}`} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-3.5 h-3.5 text-slate-500" />
                            )}
                          </div>
                          <span className="text-xs font-medium text-slate-200 truncate flex-1">
                            {m.user?.username || 'Unknown'}
                          </span>
                          {m.user_id === user?.id && (
                            <span className="text-[10px] text-indigo-300 bg-indigo-500/15 border border-indigo-500/25 px-1.5 py-0.5 rounded-md">You</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add-member picker */}
                    {showAddMembers && (
                      <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2">
                        {candidates.length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-3 px-2">
                            No more contacts to add. Add a contact first, then come back here.
                          </p>
                        ) : (
                          <>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                              {candidates.map(c => {
                                const selected = addMemberSelection.includes(c.id)
                                return (
                                  <div
                                    key={c.id}
                                    onClick={() => setAddMemberSelection(prev =>
                                      prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]
                                    )}
                                    className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer transition ${selected ? 'bg-emerald-500/15' : 'hover:bg-slate-800/50'}`}
                                  >
                                    <div className="w-7 h-7 rounded-full bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                                      {c.profile_image ? (
                                        <img src={`${BACKEND_URL}${c.profile_image}`} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <User className="w-3.5 h-3.5 text-slate-500" />
                                      )}
                                    </div>
                                    <span className="text-xs font-medium text-slate-200 truncate flex-1">{c.username}</span>
                                    <input type="checkbox" checked={selected} readOnly className="w-3.5 h-3.5 accent-emerald-500 cursor-pointer" />
                                  </div>
                                )
                              })}
                            </div>
                            <button
                              onClick={handleAddMembers}
                              disabled={addMemberSelection.length === 0 || addingMembers}
                              className="w-full mt-2 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold rounded-lg hover:opacity-90 active:scale-95 transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                            >
                              {addingMembers ? 'Adding...' : `Add ${addMemberSelection.length || ''} selected`.replace('  ', ' ')}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Action Buttons Row */}
              <div className="grid grid-cols-3 gap-2 w-full mt-5">
                <button
                  onClick={() => {
                    if (avatarMenuChat.id) {
                      setActiveChat(avatarMenuChat)
                      setMobileView('chat')
                    } else if (avatarMenuChat.targetContact) {
                      startDirectChat(avatarMenuChat.targetContact.id)
                    }
                    setAvatarMenuChat(null)
                  }}
                  className="py-2.5 px-3 bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/20 text-indigo-300 rounded-2xl flex flex-col items-center gap-1.5 text-xs font-medium transition active:scale-95 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  <span>Message</span>
                </button>

                <button
                  onClick={() => {
                    const chatId = avatarMenuChat.id
                    setAvatarMenuChat(null)
                    if (chatId) startCall(chatId, 'audio')
                  }}
                  disabled={!avatarMenuChat.id}
                  className="py-2.5 px-3 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/20 text-emerald-300 rounded-2xl flex flex-col items-center gap-1.5 text-xs font-medium transition active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span>Audio</span>
                </button>

                <button
                  onClick={() => {
                    const chatId = avatarMenuChat.id
                    setAvatarMenuChat(null)
                    if (chatId) startCall(chatId, 'video')
                  }}
                  disabled={!avatarMenuChat.id}
                  className="py-2.5 px-3 bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/20 text-violet-300 rounded-2xl flex flex-col items-center gap-1.5 text-xs font-medium transition active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <VideoIcon className="w-4 h-4 text-violet-400" />
                  <span>Video</span>
                </button>
              </div>

              {/* Danger Zone: Remove / Delete button */}
              {avatarMenuChat.id && (
                <div className="w-full mt-4 pt-4 border-t border-slate-800/80">
                  <button
                    onClick={() => handleDeleteChat(avatarMenuChat)}
                    className="w-full py-3 px-4 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-200 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition active:scale-95 cursor-pointer group shadow-lg shadow-rose-950/20"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
                    <span>
                      {isOneToOne ? `Remove ${info.name}` : 'Leave & Remove Group'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}