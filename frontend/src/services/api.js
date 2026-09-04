import axios from 'axios'

const API = axios.create({
  baseURL: 'http://localhost:8000',
})

// Interceptor to inject token on every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, (error) => {
  return Promise.reject(error)
})

export const authAPI = {
  register: (phoneNumber, username = null) => API.post('/auth/register', { phone_number: phoneNumber, username }),
  login: (phoneNumber) => API.post('/auth/login/json', { phone_number: phoneNumber }),
  getMe: () => API.get('/auth/me'),
  forgotPassword: (email) => API.post('/auth/forgot-password', { email }),
  resetPassword: (email, newPassword) => API.post('/auth/reset-password', { email, new_password: newPassword }),
}

export const usersAPI = {
  search: (query) => API.get(`/users/search?q=${encodeURIComponent(query)}`),
  updateProfile: (data) => API.put('/users/profile', data),
}

export const chatsAPI = {
  list: () => API.get('/chats'),
  createDirect: (contactId) => API.post('/chats/create', { type: 'one_to_one', contact_id: contactId }),
  createGroup: (name, description, userIds) => API.post('/groups/create', { name, description, user_ids: userIds }),
  updateGroupDetails: (chatId, name, description, groupImage) => API.put(`/groups/${chatId}/details`, { name, description, group_image: groupImage }),
  addGroupMember: (chatId, userId) => API.post(`/groups/${chatId}/members/add`, { user_id: userId }),
  removeGroupMember: (chatId, userId) => API.post(`/groups/${chatId}/members/remove/${userId}`),
}

export const messagesAPI = {
  getHistory: (chatId) => API.get(`/messages/${chatId}`),
  send: (chatId, message, type = 'text', replyTo = null) => API.post('/messages/send', { chat_id: chatId, message, message_type: type, reply_to: replyTo }),
  edit: (messageId, message) => API.put(`/messages/${messageId}`, { message }),
  delete: (messageId) => API.delete(`/messages/${messageId}`),
  updateStatus: (messageId, status) => API.post(`/messages/${messageId}/status`, { status }),
}

export const mediaAPI = {
  upload: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return API.post('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
}

export default API
