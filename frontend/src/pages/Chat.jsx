import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { marked } from 'marked'
import api from '../api/axios'

// Renders markdown with prose styling — drop-in equivalent of ReactMarkdown
// (react-markdown is ESM-only and incompatible with Create React App)
const ReactMarkdown = ({ children, className }) => (
  <div
    className={className}
    dangerouslySetInnerHTML={{ __html: marked.parse(children || '') }}
  />
)

export default function Chat() {
  const { documentId } = useParams()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [docName, setDocName] = useState('')
  const messagesEndRef = useRef(null)

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load document name and chat history on page load
  // Load document name and chat history on page load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const init = async () => {
      await fetchDocumentName()
      await fetchHistory()
    }
    init()
  }, [documentId]) // eslint-disable-line react-hooks/exhaustive-deps
  const fetchDocumentName = async () => {
    try {
      const res = await api.get('/documents')
      const doc = res.data.find((d) => d._id === documentId)
      if (doc) setDocName(doc.fileName)
    } catch (err) {
      console.error('Failed to fetch document')
    }
  }

  const fetchHistory = async () => {
    try {
      const res = await api.get(`/chat/${documentId}/history`)
      setMessages(res.data.messages || [])
    } catch (err) {
      console.error('Failed to fetch history')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!question.trim() || loading) return

    const userMessage = { role: 'user', content: question }
    setMessages((prev) => [...prev, userMessage])
    setQuestion('')
    setLoading(true)

    // Add an empty assistant message that we'll fill in as tokens stream in
    const assistantMessage = { role: 'assistant', content: '', sources: [] }
    setMessages((prev) => [...prev, assistantMessage])

    try {
      const token = localStorage.getItem('token')

      // Use fetch instead of axios for SSE streaming
      const response = await fetch(
        'http://localhost:3001/api/chat',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ documentId, question: userMessage.content }),
        },
      )

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      // Read the stream token by token
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk
          .split('\n')
          .filter((line) => line.startsWith('data: '))

        for (const line of lines) {
          const data = JSON.parse(line.replace('data: ', ''))

          if (data.token) {
            // Append each token to the last message (typewriter effect)
            setMessages((prev) => {
              const updated = [...prev]
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: updated[updated.length - 1].content + data.token,
              }
              return updated
            })
          }

          if (data.done && data.sources) {
            // Attach sources when the stream is complete
            setMessages((prev) => {
              const updated = [...prev]
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                sources: data.sources,
              }
              return updated
            })
          }
        }
      }
    } catch (err) {
      console.error('Chat error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/documents')}
          className="text-gray-400 hover:text-white transition">
          ← Back
        </button>
        <div>
          <h1 className="font-semibold">{docName || 'Loading...'}</h1>
          <p className="text-gray-400 text-xs">
            Ask anything about this document
          </p>
        </div>
      </nav>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-3xl mx-auto w-full">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-20">
            <p className="text-4xl mb-4">💬</p>
            <p>Ask your first question about this document</p>
          </div>
        )}

        <div className="space-y-6">
          {messages.map((msg, index) => (
            <div key={index}>
              {msg.role === 'user' ? (
                // User message — right aligned
                <div className="flex justify-end">
                  <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-xl">
                    {msg.content}
                  </div>
                </div>
              ) : (
                // Assistant message — left aligned
                <div className="flex flex-col gap-2">
                  <div className="bg-gray-900 rounded-2xl rounded-tl-sm px-4 py-3 max-w-xl">
                    {msg.content ? (
                      <ReactMarkdown className="prose prose-invert prose-sm max-w-none">
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <span className="text-gray-500 animate-pulse">Thinking...</span>
                    )}
                  </div>

                  {/* Source citations */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="space-y-1 ml-1">
                      {msg.sources.slice(0, 2).map((source, i) => (
                        <div
                          key={i}
                          className="text-xs text-gray-500 bg-gray-900/50 rounded-lg px-3 py-2 max-w-xl">
                          <span className="text-gray-400 font-medium">
                            📎 Source {i + 1}:{' '}
                          </span>
                          {source.content.slice(0, 150)}...
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 px-4 py-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-3">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about this document..."
            className="flex-1 bg-gray-900 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-xl transition disabled:opacity-50">
            {loading ? '...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  )
}
