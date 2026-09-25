import React, { createContext, useState, useEffect } from 'react'
import { authAPI, usersAPI } from '../services/api'

export const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  const checkAuth = async () => {
    if (!token) {
      setLoading(false)
      return
    }
    try {
      const res = await authAPI.getMe()
      setUser(res.data)
    } catch (err) {
      console.error('Session expired or invalid', err)
      logout()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()
  }, [token])

  const login = async (phoneNumber, preIssuedToken = null) => {
    setLoading(true)
    try {
      let accessToken

      if (preIssuedToken) {
        // Email OTP flow: token already obtained from /auth/verify-otp
        accessToken = preIssuedToken
      } else {
        // Legacy phone flow
        let res
        try {
          res = await authAPI.login(phoneNumber)
        } catch (err) {
          // If user not found on login, try registering automatically (WhatsApp-like onboarding)
          if (err.response?.status === 401 || err.response?.status === 404) {
            try {
              const cleanDigits = phoneNumber.replace(/\D/g, '')
              await authAPI.register(phoneNumber, `User_${cleanDigits.slice(-4) || 'user'}`)
            } catch (regErr) {
              console.warn('Auto-register notice:', regErr)
            }
            res = await authAPI.login(phoneNumber)
          } else {
            throw err
          }
        }
        accessToken = res.data.access_token
      }

      localStorage.setItem('token', accessToken)
      setToken(accessToken)
      
      // Fetch user profile immediately so user state is populated before navigate('/')
      const meRes = await authAPI.getMe()
      setUser(meRes.data)
      return true
    } catch (err) {
      throw err.response?.data?.detail || err || 'Login failed'
    } finally {
      setLoading(false)
    }
  }

  const register = async (phoneNumber, username = null) => {
    setLoading(true)
    try {
      await authAPI.register(phoneNumber, username)
      return await login(phoneNumber)
    } catch (err) {
      throw err.response?.data?.detail || 'Registration failed'
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  const updateProfile = async (data) => {
    try {
      const res = await usersAPI.updateProfile(data)
      setUser(res.data)
      return res.data
    } catch (err) {
      throw err.response?.data?.detail || 'Failed to update profile'
    }
  }

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    checkAuth
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
