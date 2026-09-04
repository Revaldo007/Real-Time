import React, { createContext, useState, useEffect, useRef, useContext } from 'react'
import { AuthContext } from './AuthContext'
import { chatsAPI, messagesAPI } from '../services/api'

export const ChatContext = createContext(null)

export const ChatProvider = ({ children }) => {
  const { token, user } = useContext(AuthContext)
  
  const [chats, setChats] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [typingUsers, setTypingUsers] = useState({}) // { [chatId]: { [userId]: boolean } }
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  
  // WebRTC Call States
  const [callState, setCallState] = useState(null) // null, 'ringing_incoming', 'ringing_outgoing', 'connected'
  const [callType, setCallType] = useState('audio') // 'audio' or 'video'
  const [callChatId, setCallChatId] = useState(null)
  const [callUser, setCallUser] = useState(null) // User we are calling or being called by
  
  const socketRef = useRef(null)
  const activeChatRef = useRef(activeChat)
  const userRef = useRef(user)

  useEffect(() => {
    activeChatRef.current = activeChat
  }, [activeChat])

  useEffect(() => {
    userRef.current = user
  }, [user])

  const peerConnectionRef = useRef(null)
  const localStreamRef = useRef(null)
  const remoteStreamRef = useRef(null)
  const remoteSdpRef = useRef(null)        // stores incoming SDP offer safely
  const remoteAudioRef = useRef(null)      // <audio> element ref for voice calls
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)

  // Fetch user chats list
  const fetchChats = async () => {
    try {
      const res = await chatsAPI.list()
      setChats(res.data)
      
      // Update online status set from fetched chat members
      const onlineSet = new Set()
      res.data.forEach(chat => {
        chat.members.forEach(member => {
          if (member.user.is_online) {
            onlineSet.add(member.user_id)
          }
        })
      })
      setOnlineUsers(onlineSet)
    } catch (err) {
      console.error('Failed to fetch chats', err)
    }
  }

  // Fetch messages for active chat
  const fetchMessages = async (chatId) => {
    try {
      const res = await messagesAPI.getHistory(chatId)
      setMessages(res.data)
      
      // Mark received messages as read
      res.data.forEach(msg => {
        if (msg.sender_id !== userRef.current?.id) {
          const hasRead = msg.statuses?.some(s => s.user_id === userRef.current?.id && s.status === 'read')
          if (!hasRead) {
            messagesAPI.updateStatus(msg.id, 'read')
          }
        }
      })
    } catch (err) {
      console.error('Failed to fetch messages', err)
    }
  }

  useEffect(() => {
    if (token) {
      fetchChats()
    } else {
      setChats([])
      setActiveChat(null)
      setMessages([])
    }
  }, [token])

  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat.id)
    } else {
      setMessages([])
    }
  }, [activeChat])

  const iceCandidateQueueRef = useRef([])

  // Establish WebSocket connection
  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }
      return
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${wsProtocol}//${window.location.hostname}:8000/ws?token=${token}`
    const ws = new WebSocket(wsUrl)
    socketRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket connected')
    }

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data)
      
      switch (data.type) {
        case 'user_online':
          setOnlineUsers(prev => {
            const next = new Set(prev)
            next.add(data.user_id)
            return next
          })
          break;
          
        case 'user_offline':
          setOnlineUsers(prev => {
            const next = new Set(prev)
            next.delete(data.user_id)
            return next
          })
          break;
          
        case 'typing_start':
          setTypingUsers(prev => ({
            ...prev,
            [data.chat_id]: {
              ...(prev[data.chat_id] || {}),
              [data.user_id]: true
            }
          }))
          break;
          
        case 'typing_stop':
          setTypingUsers(prev => ({
            ...prev,
            [data.chat_id]: {
              ...(prev[data.chat_id] || {}),
              [data.user_id]: false
            }
          }))
          break;
          
        case 'message':
          if (activeChatRef.current && activeChatRef.current.id === data.chat_id) {
            setMessages(prev => {
              if (prev.some(m => m.id === data.message.id)) return prev
              return [...prev, data.message]
            })
            if (data.message.sender_id !== userRef.current?.id) {
              messagesAPI.updateStatus(data.message.id, 'read')
            }
          }
          fetchChats()
          break;
          
        case 'message_status':
          if (activeChatRef.current && activeChatRef.current.id === data.chat_id) {
            setMessages(prev => 
              prev.map(msg => {
                if (msg.id === data.message_id) {
                  const existingStatusIdx = msg.statuses ? msg.statuses.findIndex(s => s.user_id === data.user_id) : -1
                  const updatedStatuses = msg.statuses ? [...msg.statuses] : []
                  if (existingStatusIdx > -1) {
                    updatedStatuses[existingStatusIdx] = {
                      ...updatedStatuses[existingStatusIdx],
                      status: data.status,
                      timestamp: new Date().toISOString()
                    }
                  } else {
                    updatedStatuses.push({
                      id: Math.random(),
                      message_id: data.message_id,
                      user_id: data.user_id,
                      status: data.status,
                      timestamp: new Date().toISOString()
                    })
                  }
                  return { ...msg, statuses: updatedStatuses }
                }
                return msg
              })
            )
          }
          break;
          
        case 'message_edit':
          if (activeChatRef.current && activeChatRef.current.id === data.chat_id) {
            setMessages(prev => 
              prev.map(msg => msg.id === data.message_id ? { ...msg, message: data.message, edited_at: new Date().toISOString() } : msg)
            )
          }
          fetchChats()
          break;
          
        case 'message_delete':
          if (activeChatRef.current && activeChatRef.current.id === data.chat_id) {
            setMessages(prev => 
              prev.map(msg => msg.id === data.message_id ? { ...msg, is_deleted: true, message: "This message was deleted" } : msg)
            )
          }
          fetchChats()
          break;
          
        // WebRTC Signaling Handlers
        case 'call_offer':
          iceCandidateQueueRef.current = [] // reset queue
          handleIncomingCall(data)
          break;
          
        case 'call_answer':
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp))
            setCallState('connected')
            // Drain local queue if we had any
            for (const candidate of iceCandidateQueueRef.current) {
              await peerConnectionRef.current.addIceCandidate(candidate)
            }
            iceCandidateQueueRef.current = []
          }
          break;
          
        case 'ice_candidate':
          if (data.candidate) {
            const candidate = new RTCIceCandidate(data.candidate)
            if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
              try {
                await peerConnectionRef.current.addIceCandidate(candidate)
              } catch (e) {
                console.error("Error adding received ice candidate", e)
              }
            } else {
              // Queue candidate until remote description is set
              iceCandidateQueueRef.current.push(candidate)
            }
          }
          break;
          
        case 'call_hangup':
          cleanupCall()
          break;
          
        default:
          break;
      }
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected. Reconnecting in 3 seconds...')
      setTimeout(() => {
        if (token) {
          setChats(prev => [...prev])
        }
      }, 3000)
    }

    return () => {
      ws.close()
    }
  }, [token])

  const sendTypingStatus = (chatId, isTyping) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: isTyping ? 'typing_start' : 'typing_stop',
        chat_id: chatId
      }))
    }
  }

  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  }

  // stream param is required — caller must pass the acquired local stream
  // so tracks are added to the PC BEFORE the offer/answer exchange begins
  const setupPeerConnection = (chatId, stream) => {
    const pc = new RTCPeerConnection(configuration)
    peerConnectionRef.current = pc

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.send(JSON.stringify({
          type: 'ice_candidate',
          chat_id: chatId,
          candidate: event.candidate
        }))
      }
    }

    pc.ontrack = (event) => {
      console.log('Received remote track:', event.streams[0])
      if (event.streams && event.streams[0]) {
        remoteStreamRef.current = event.streams[0]
        setRemoteStream(event.streams[0])
        // For audio-only calls attach stream to the <audio> element immediately
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0]
        }
      }
    }

    // Add local tracks so the remote peer receives our media
    stream.getTracks().forEach(track => pc.addTrack(track, stream))

    return pc
  }

  const startCall = async (chatId, type = 'audio') => {
    setCallType(type)
    setCallChatId(chatId)
    setCallState('ringing_outgoing')
    iceCandidateQueueRef.current = []
    remoteSdpRef.current = null
    
    const targetChat = chats.find(c => c.id === chatId)
    const targetUserObj = targetChat?.members.find(m => m.user_id !== user?.id)?.user
    setCallUser(targetUserObj || { username: 'Rivo User' })

    try {
      const constraints = {
        audio: true,
        video: type === 'video'
      }
      // 1. Acquire media FIRST
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      localStreamRef.current = stream
      setLocalStream(stream)

      // 2. Create peer connection with the stream so tracks are present before offer
      const pc = setupPeerConnection(chatId, stream)

      // 3. Create & send offer
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      if (socketRef.current) {
        socketRef.current.send(JSON.stringify({
          type: 'call_offer',
          chat_id: chatId,
          sdp: offer,
          media_type: type,
          caller_name: user?.username,
          caller_image: user?.profile_image
        }))
      }
    } catch (err) {
      console.error('Error accessing user media for call', err)
      if (err.name === 'NotFoundError' || err.message?.includes('Requested device not found')) {
        alert('No camera or microphone found! Please connect a device to make calls.')
      } else if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
        alert('Camera/Microphone permission denied. Please allow access in your browser settings.')
      } else {
        alert('Could not start the call. Please check your camera and microphone.')
      }
      cleanupCall()
    }
  }

  const handleIncomingCall = async (data) => {
    iceCandidateQueueRef.current = []  // fresh queue for this incoming call
    remoteSdpRef.current = data.sdp    // safely store SDP in its own ref
    setCallChatId(data.chat_id)
    setCallType(data.media_type)
    setCallState('ringing_incoming')
    
    const targetChat = chats.find(c => c.id === data.chat_id)
    const caller = targetChat?.members.find(m => m.user_id === data.sender_id)?.user
    setCallUser(caller || { username: data.caller_name || 'Rivo User', profile_image: data.caller_image })
  }

  const acceptCall = async () => {
    if (!callChatId) return
    setCallState('connected')

    try {
      const constraints = {
        audio: true,
        video: callType === 'video'
      }

      // 1. Acquire local media FIRST
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      localStreamRef.current = stream
      setLocalStream(stream)

      // 2. Create peer connection WITH the stream — tracks are added inside
      const pc = setupPeerConnection(callChatId, stream)

      // 3. Apply the remote offer SDP (stored safely in remoteSdpRef)
      const remoteOffer = remoteSdpRef.current
      if (!remoteOffer) {
        console.error('No remote SDP found — cannot accept call')
        cleanupCall()
        return
      }
      await pc.setRemoteDescription(new RTCSessionDescription(remoteOffer))

      // 4. Drain ICE candidates that arrived before we were ready
      for (const candidate of iceCandidateQueueRef.current) {
        try { await pc.addIceCandidate(candidate) } catch (e) { /* ignore stale */ }
      }
      iceCandidateQueueRef.current = []

      // 5. Create & send answer
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      if (socketRef.current) {
        socketRef.current.send(JSON.stringify({
          type: 'call_answer',
          chat_id: callChatId,
          sdp: answer
        }))
      }
    } catch (err) {
      console.error('Error accepting call', err)
      cleanupCall()
    }
  }

  const hangupCall = () => {
    if (callChatId && socketRef.current) {
      socketRef.current.send(JSON.stringify({
        type: 'call_hangup',
        chat_id: callChatId
      }))
    }
    cleanupCall()
  }

  const cleanupCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    // Detach audio element
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null
    }
    remoteSdpRef.current = null
    setLocalStream(null)
    setRemoteStream(null)
    setCallState(null)
    setCallChatId(null)
    setCallUser(null)
    iceCandidateQueueRef.current = []
  }

  const value = {
    chats,
    activeChat,
    setActiveChat,
    messages,
    typingUsers,
    onlineUsers,
    sendTypingStatus,
    fetchChats,
    // WebRTC Calling exports
    callState,
    callType,
    callUser,
    localStream,
    remoteStream,
    remoteAudioRef,   // ref for the hidden <audio> element used by audio-only calls
    startCall,
    acceptCall,
    hangupCall
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}
