import { createContext, useContext, useState, useEffect } from 'react'

// AuthContext stores the current user's login state
// and makes it accessible to any component in the app
const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // On app load, check if there's a saved user in localStorage
    // This keeps the user logged in after a page refresh
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  const login = (userData, token) => {
    // Save user and token to localStorage for persistence
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('token', token)
    setUser(userData)
  }

  const logout = () => {
    // Clear everything on logout
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook for easy access to auth state
export const useAuth = () => useContext(AuthContext)
