import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Documents from './pages/Documents'
import Chat from './pages/Chat'

// ProtectedRoute — if user is not logged in, redirect to /login
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <div>Loading...</div>
  return user ? children : <Navigate to="/login" />
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/documents"
            element={
              <ProtectedRoute>
                <Documents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:documentId"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/documents" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
  