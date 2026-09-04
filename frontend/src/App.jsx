import React, { useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, AuthContext } from './context/AuthContext'
import { ChatProvider } from './context/ChatContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import Chat from './pages/Chat'

// Route protector for routes requiring authorization
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useContext(AuthContext)

  if (loading) {
    return (
      <div className="min-h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        <span className="text-sm font-semibold tracking-wide">Loading Rivo...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <ChatProvider>{children}</ChatProvider>
}

// Router configuration
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Protected Main Chat & Profile views */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          
          {/* Public Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
