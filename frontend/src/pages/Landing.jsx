import { Link } from 'react-router-dom'

// ─── Inline SVG icons ─────────────────────────────────────────────────────────

const UploadIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
)

const ChatBubbleIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
  </svg>
)

const SparkleIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
  </svg>
)

const DocumentIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
)

const ShieldIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
)

const BoltIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
  </svg>
)

const GitHubIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
)

// ─── Data ──────────────────────────────────────────────────────────────────────

const STEPS = [
  {
    icon: <UploadIcon />,
    number: '01',
    title: 'Upload',
    description: 'Upload any PDF document — reports, contracts, research papers, manuals.',
  },
  {
    icon: <ChatBubbleIcon />,
    number: '02',
    title: 'Ask',
    description: 'Type your question in plain English. No special syntax or training needed.',
  },
  {
    icon: <SparkleIcon />,
    number: '03',
    title: 'Get Answers',
    description: 'AI answers instantly with source citations from the exact pages it read.',
  },
]

const FEATURES = [
  {
    icon: <SparkleIcon />,
    title: 'RAG-Powered Accuracy',
    description: 'Answers are grounded exclusively in your document. The model is constrained to only what your PDF contains — no hallucinations.',
    accent: 'text-blue-400',
    border: 'hover:border-blue-500/30',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    icon: <DocumentIcon />,
    title: 'Source Citations',
    description: 'Every response shows the exact chunk it came from. Verify any answer in seconds — no more wondering if the AI made it up.',
    accent: 'text-violet-400',
    border: 'hover:border-violet-500/30',
    bg: 'bg-violet-500/10 border-violet-500/20',
  },
  {
    icon: <BoltIcon />,
    title: 'Streaming Responses',
    description: 'Answers stream word-by-word via Server-Sent Events. You start reading immediately — no waiting for the full response.',
    accent: 'text-amber-400',
    border: 'hover:border-amber-500/30',
    bg: 'bg-amber-500/10 border-amber-500/20',
  },
  {
    icon: <ShieldIcon />,
    title: 'Secure & Private',
    description: 'Your vectors are namespaced per user in Pinecone. No other user can ever query your documents.',
    accent: 'text-emerald-400',
    border: 'hover:border-emerald-500/30',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
]

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-950 text-white antialiased">

      {/* ── Navbar ───────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-gray-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight">DocuMind</span>
          <Link
            to="/login"
            className="text-sm font-semibold bg-white text-gray-950 px-4 py-1.5 rounded-lg hover:bg-gray-100 transition">
            Sign In
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full bg-blue-600/10 blur-3xl" />
        </div>

        <div className="relative max-w-3xl mx-auto flex flex-col items-center gap-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Powered by RAG AI
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
            Ask Your Documents
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-violet-400 bg-clip-text text-transparent">
              Anything
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl leading-relaxed">
            Upload a PDF. Ask questions in plain English. Get accurate answers
            with source citations — in seconds.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
            <Link
              to="/login"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3 rounded-xl transition shadow-lg shadow-blue-600/20 text-base">
              Get Started Free
            </Link>
            <Link
              to="/pricing"
              className="w-full sm:w-auto bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold px-8 py-3 rounded-xl transition text-base">
              View Pricing
            </Link>
          </div>

          <p className="text-xs text-gray-600">No credit card required</p>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              How it works
            </h2>
            <p className="text-gray-400 text-lg">Three steps to get answers from any document.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-px bg-white/5 rounded-2xl overflow-hidden">
            {STEPS.map((step) => (
              <div key={step.number} className="bg-gray-950 p-8 flex flex-col gap-5">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    {step.icon}
                  </div>
                  <span className="text-5xl font-bold text-white/5 leading-none select-none">
                    {step.number}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Built for accuracy and trust
            </h2>
            <p className="text-gray-400 text-lg">
              Every design decision optimises for answers you can actually rely on.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className={`bg-gray-900 border border-white/5 ${f.border} rounded-2xl p-7 flex flex-col gap-4 transition-colors duration-300`}>
                <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${f.bg} ${f.accent}`}>
                  {f.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <p className="text-gray-500 text-sm">DocuMind &copy; 2026</p>
          <a
            href="https://github.com/HAONANTAO/DocuMind"
            target="_blank"
            rel="noreferrer"
            className="text-gray-500 hover:text-gray-300 transition"
            aria-label="GitHub repository">
            <GitHubIcon />
          </a>
        </div>
      </footer>

    </div>
  )
}
