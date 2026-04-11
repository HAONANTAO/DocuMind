import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

export default function Login() {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login'
      const res = await api.post(endpoint, { email, password })
      login(res.data.user, res.data.token)
      navigate('/documents')
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white">DocuMind</h1>
          <p className="text-gray-400 mt-2">Ask your documents anything</p>
        </div>

        {/* Form */}
        <div className="bg-gray-900 rounded-2xl p-8 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-6">
            {isRegister ? 'Create an account' : 'Welcome back'}
          </h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg py-3 transition disabled:opacity-50">
              {loading
                ? 'Please wait...'
                : isRegister
                  ? 'Create account'
                  : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-6">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-blue-400 hover:text-blue-300 ml-1">
              {isRegister ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
