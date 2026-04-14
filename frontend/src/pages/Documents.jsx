import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

export default function Documents() {
  const [documents, setDocuments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // Fetch documents on page load
  useEffect(() => {
    fetchDocuments()
  }, [])

  // Poll every 3 seconds, but only while at least one document is still processing.
  // Once all documents are ready (or errored), stop polling to avoid wasting requests.
  useEffect(() => {
    const hasPending = documents.some(
      (d) => d.status === 'uploading' || d.status === 'processing',
    )
    if (!hasPending) return

    const interval = setInterval(fetchDocuments, 3000)
    return () => clearInterval(interval)
  }, [documents])

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/documents')
      setDocuments(res.data)
    } catch (err) {
      console.error('Failed to fetch documents')
    }
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed')
      return
    }

    setUploading(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      fetchDocuments()
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/documents/${id}`)
      setDocuments(documents.filter((d) => d._id !== id))
    } catch (err) {
      setError('Failed to delete document')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Status badge styling
  const statusStyle = {
    uploading: 'bg-yellow-500/10 text-yellow-400',
    processing: 'bg-blue-500/10 text-blue-400',
    ready: 'bg-green-500/10 text-green-400',
    error: 'bg-red-500/10 text-red-400',
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">DocuMind</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">{user?.email}</span>
          <button
            onClick={() => navigate('/pricing')}
            className="text-sm text-gray-400 hover:text-white transition">
            Pricing
          </button>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-white transition">
            Logout
          </button>
        </div>
      </nav>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">My Documents</h2>
            <p className="text-gray-400 text-sm mt-1">
              Upload a PDF to start asking questions
            </p>
          </div>

          {/* Upload button */}
          <label
            className={`cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {uploading ? 'Uploading...' : '+ Upload PDF'}
            <input
              type="file"
              accept=".pdf"
              onChange={handleUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Document list */}
        {documents.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-4xl mb-4">📄</p>
            <p>No documents yet. Upload a PDF to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc._id}
                className="bg-gray-900 rounded-xl px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">📄</span>
                  <div>
                    <p className="font-medium">{doc.fileName}</p>
                    <p className="text-gray-400 text-sm">
                      {(doc.fileSize / 1024).toFixed(1)} KB ·{' '}
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Status badge */}
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${statusStyle[doc.status]}`}>
                    {doc.status}
                  </span>

                  {/* Chat button — only show when ready */}
                  {doc.status === 'ready' && (
                    <button
                      onClick={() => navigate(`/chat/${doc._id}`)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded-lg transition">
                      Chat
                    </button>
                  )}

                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(doc._id)}
                    className="text-gray-500 hover:text-red-400 transition text-sm">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
