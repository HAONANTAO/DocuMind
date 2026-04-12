import { useNavigate } from 'react-router-dom'

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for trying out DocuMind',
    features: [
      'Up to 3 documents',
      '50 questions per month',
      'PDF upload support',
      'Source citations',
      'Chat history',
    ],
    cta: 'Get Started',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$19',
    period: 'per month',
    description: 'For professionals and power users',
    features: [
      'Unlimited documents',
      'Unlimited questions',
      'PDF upload support',
      'Source citations',
      'Chat history',
      'Priority support',
      'Early access to new features',
    ],
    cta: 'Coming Soon',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'contact us',
    description: 'For teams and organizations',
    features: [
      'Everything in Pro',
      'Private deployment',
      'Custom integrations',
      'SLA guarantee',
      'Dedicated support',
      'Team management',
    ],
    cta: 'Contact Sales',
    highlight: false,
  },
]

export default function Pricing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1
          className="text-xl font-bold cursor-pointer"
          onClick={() => navigate('/documents')}>
          DocuMind
        </h1>
        <button
          onClick={() => navigate('/documents')}
          className="text-gray-400 hover:text-white text-sm transition">
          ← Back to Documents
        </button>
      </nav>

      {/* Header */}
      <div className="text-center py-16 px-4">
        <h2 className="text-4xl font-bold mb-4">Simple, transparent pricing</h2>
        <p className="text-gray-400 text-lg">
          Start for free. Upgrade when you need more.
        </p>
      </div>

      {/* Pricing cards */}
      <div className="max-w-5xl mx-auto px-6 pb-20 grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-2xl p-6 flex flex-col ${
              plan.highlight
                ? 'bg-blue-600 ring-2 ring-blue-400'
                : 'bg-gray-900'
            }`}>
            {plan.highlight && (
              <span className="text-xs font-semibold bg-white text-blue-600 rounded-full px-3 py-1 self-start mb-4">
                Most Popular
              </span>
            )}

            <h3 className="text-xl font-bold">{plan.name}</h3>
            <p
              className={`text-sm mt-1 ${plan.highlight ? 'text-blue-100' : 'text-gray-400'}`}>
              {plan.description}
            </p>

            <div className="mt-4 mb-6">
              <span className="text-4xl font-bold">{plan.price}</span>
              <span
                className={`text-sm ml-2 ${plan.highlight ? 'text-blue-100' : 'text-gray-400'}`}>
                {plan.period}
              </span>
            </div>

            <ul className="space-y-3 flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <span>✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => {
                if (plan.name === 'Free') navigate('/documents')
              }}
              className={`mt-8 w-full py-3 rounded-xl font-semibold transition ${
                plan.highlight
                  ? 'bg-white text-blue-600 hover:bg-blue-50'
                  : plan.name === 'Free'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-800 hover:bg-gray-700 text-white'
              }`}>
              {plan.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
