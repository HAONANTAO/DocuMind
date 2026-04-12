import axios from 'axios'

// Create an axios instance with the base URL of our backend
const api = axios.create({
  baseURL: 'https://documind-backend-r60i.onrender.com/api',
})

// Automatically attach the JWT token to every request
// This way we don't have to manually add the token every time
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
