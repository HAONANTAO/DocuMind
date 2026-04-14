import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import api from '../api/axios'

// Renders markdown with prose styling — drop-in equivalent of ReactMarkdown
// (react-markdown is ESM-only and incompatible with Create React App)
const ReactMarkdown = ({ children, className }) => (
  <div
    className={className}
    dangerouslySetInnerHTML={{
      __html: DOMPurify.sanitize(marked.parse(children || '')),
    }}
  />
)

// Expandable source citation card
const SourceCard = ({ source, index }) => {
  const [expanded, setExpanded] = useState(false)
  const preview = source.content.slice(0, 120)
  const hasMore = source.content.length > 120

  return (
    <div className="bg-gray-800/60 border border-white/5 rounded-xl overflow-hidden max-w-xl">
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2 hover:bg-white/5 transition text-left">
        <div className="flex items-center gap-2 min-w-0">
          <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <span className="text-xs font-medium text-blue-400">Source {index + 1}</span>
          {source.metadata?.chunkIndex !== undefined && (
            <span className="text-[10px] text-gray-500 bg-gray-700 px-1.5 py-0.5 rounded">
              chunk {source.metadata.chunkIndex}
            </span>
          )}
        </div>
        {hasMore && (
          <svg
            className={`w-3.5 h-3.5 text-gray-500 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="px-3 pb-3">
        <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">
          {expanded ? source.content : preview}
          {!expanded && hasMore && (
            <button
              onClick={() => setExpanded(true)}
              className="text-blue-400 hover:text-blue-300 ml-1 font-medium">
              show more
            </button>
          )}
        </p>
        {expanded && hasMore && (
          <button
            onClick={() => setExpanded(false)}
            className="text-blue-400 hover:text-blue-300 text-xs font-medium mt-1">
            show less
          </button>
        )}
      </div>
    </div>
  )
}

// Status badge for each document in the sidebar
const StatusBadge = ({ status }) => {
  const styles = {
    ready:      'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    processing: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    uploading:  'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    error:      'bg-red-500/15 text-red-400 border-red-500/20',
  }
  const labels = {
    ready:      'Ready',
    processing: 'Processing',
    uploading:  'Uploading',
    error:      'Error',
  }
  const cls = styles[status] || styles.error
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${cls}`}>
      {labels[status] || status}
    </span>
  )
}

export default function Chat() {
  const { documentId } = useParams()
  const navigate = useNavigate()

  // ── Chat state ──────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [docName, setDocName] = useState('')
  const messagesEndRef = useRef(null)

  // ── Sidebar state ───────────────────────────────────────────────────────────
  const [documents, setDocuments] = useState([])

  // Auto-scroll to newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // On documentId change: load documents list, active doc name, and chat history
  useEffect(() => {
    fetchDocuments()
    fetchHistory()
  }, [documentId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/documents')
      setDocuments(res.data)
      const active = res.data.find((d) => d._id === documentId)
      if (active) setDocName(active.fileName)
    } catch (err) {
      console.error('Failed to fetch documents')
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

  // ── Streaming submit ────────────────────────────────────────────────────────
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
        `${process.env.REACT_APP_API_URL}/chat`,
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
              const last = prev[prev.length - 1]
              // Guard: if the array was reset (e.g. user navigated away), do nothing
              if (!last) return prev
              const updated = [...prev]
              updated[updated.length - 1] = {
                ...last,
                content: (last.content || '') + data.token,
              }
              return updated
            })
          }

          if (data.done && data.sources) {
            // Attach sources when the stream is complete
            setMessages((prev) => {
              const last = prev[prev.length - 1]
              if (!last) return prev
              const updated = [...prev]
              updated[updated.length - 1] = {
                ...last,
                sources: data.sources,
              }
              return updated
            })
          }

          if (data.error) {
            // Server sent an error mid-stream — replace the placeholder with an error message
            setMessages((prev) => {
              const updated = [...prev]
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: `Sorry, something went wrong: ${data.error}`,
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

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-gray-950 text-white flex overflow-hidden">

      {/* ── Left Sidebar ───────────────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 border-r border-gray-800 flex flex-col bg-gray-950">
        {/* Back button */}
        <div className="px-4 pt-4 pb-2">
          <button
            onClick={() => navigate('/documents')}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back
          </button>
        </div>

        {/* Title */}
        <div className="px-4 py-3 border-b border-gray-800">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            My Documents
          </h2>
        </div>

        {/* Document list — scrollable */}
        <div className="flex-1 overflow-y-auto py-2">
          {documents.length === 0 ? (
            <p className="text-gray-600 text-xs text-center mt-6 px-4">No documents yet</p>
          ) : (
            documents.map((doc) => {
              const isActive = doc._id === documentId
              return (
                <button
                  key={doc._id}
                  onClick={() => doc.status === 'ready' && navigate(`/chat/${doc._id}`)}
                  disabled={doc.status !== 'ready'}
                  className={`w-full text-left px-4 py-3 flex flex-col gap-1.5 transition-colors
                    ${isActive ? 'bg-gray-700' : 'hover:bg-gray-900'}
                    ${doc.status !== 'ready' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                  {/* Filename */}
                  <span className="text-sm text-white leading-snug line-clamp-2 break-all">
                    {doc.fileName}
                  </span>
                  {/* Status badge */}
                  <StatusBadge status={doc.status} />
                </button>
              )
            })
          )}
        </div>

        {/* Upload New button */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={() => navigate('/documents')}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-2.5 rounded-xl transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Upload New
          </button>
        </div>
      </aside>

      {/* ── Main chat area ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Navbar */}
        <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-4 shrink-0">
          <div>
            <h1 className="font-semibold truncate">{docName || 'Loading...'}</h1>
            <p className="text-gray-400 text-xs">Ask anything about this document</p>
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
                      <div className="space-y-1.5 ml-1">
                        <p className="text-[11px] text-gray-500 px-1">
                          {msg.sources.length} source{msg.sources.length > 1 ? 's' : ''} used
                        </p>
                        {msg.sources.map((source, i) => (
                          <SourceCard key={i} source={source} index={i} />
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
        <div className="border-t border-gray-800 px-4 py-4 shrink-0">
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
    </div>
  )
}
