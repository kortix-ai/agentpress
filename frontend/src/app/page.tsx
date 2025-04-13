import Link from 'next/link';
import NavBar from './components/NavBar';

export default function Index() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <NavBar />

      {/* Hero Section with centered gradient and rounded bottom */}
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-blue-50 to-white" />
        <div id="intro" className="relative container mx-auto px-4 py-20 sm:py-32 flex flex-col items-center text-center">
          <div className="bg-gradient-to-b from-transparent via-blue-50/50 to-transparent px-8 py-16 rounded-3xl backdrop-blur-sm">
            <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6">
              Welcome to <span className="text-blue-600">Kortix Suna</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mb-10">
              The intelligent platform that transforms how you interact with data, automate workflows, and make decisions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard" className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all duration-300">
                Start Free Trial
              </Link>
              <Link href="#use-cases" className="px-8 py-3 bg-white text-blue-600 font-medium rounded-lg border border-blue-200 hover:bg-gray-50 transition-all duration-300">
                See Examples
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 w-full h-24 bg-gradient-to-b from-white/0 to-white"></div>
      </section>

      {/* Use Cases Section */}
      <section id="use-cases" className="relative bg-gradient-to-b from-white via-gray-50 to-white py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Use Cases & Examples</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Data Processing",
                description: "Process and analyze large datasets with intelligent automation that adapts to your specific needs."
              },
              {
                title: "Workflow Optimization",
                description: "Streamline complex workflows with AI-powered optimization that reduces manual steps by up to 80%."
              },
              {
                title: "Decision Support",
                description: "Get actionable insights and recommendations based on your data, helping you make better decisions faster."
              },
              {
                title: "Customer Analytics",
                description: "Understand customer behavior patterns and preferences to create personalized experiences."
              },
              {
                title: "Predictive Maintenance",
                description: "Anticipate equipment failures before they happen, reducing downtime and maintenance costs."
              },
              {
                title: "Supply Chain Optimization",
                description: "Improve efficiency and reduce costs by optimizing your entire supply chain with intelligent forecasting."
              }
            ].map((useCase, index) => (
              <div key={index} className="bg-white/80 backdrop-blur-sm p-6 rounded-xl border border-gray-100 hover:border-blue-100 transition-all duration-300">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{useCase.title}</h3>
                <p className="text-gray-600">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative bg-gradient-to-b from-white via-blue-50 to-white py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Pricing Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: "Starter",
                price: "$49",
                period: "per month",
                description: "Perfect for individuals and small teams just getting started.",
                features: [
                  "Up to 5 users",
                  "10GB storage",
                  "Basic analytics",
                  "Standard support"
                ],
                cta: "Start with Starter",
                featured: false
              },
              {
                name: "Professional",
                price: "$99",
                period: "per month",
                description: "Ideal for growing businesses with more advanced needs.",
                features: [
                  "Up to 20 users",
                  "50GB storage",
                  "Advanced analytics",
                  "Priority support",
                  "Workflow automation"
                ],
                cta: "Choose Professional",
                featured: true
              },
              {
                name: "Enterprise",
                price: "Custom",
                period: "pricing",
                description: "Tailored solutions for large organizations with complex requirements.",
                features: [
                  "Unlimited users",
                  "Unlimited storage",
                  "Custom integrations",
                  "Dedicated support",
                  "Advanced security",
                  "On-premise options"
                ],
                cta: "Contact Sales",
                featured: false
              }
            ].map((plan, index) => (
              <div key={index} className={`${
                plan.featured 
                  ? 'bg-gradient-to-b from-blue-600 to-blue-700 text-white border-2 border-blue-300' 
                  : 'bg-white/80 backdrop-blur-sm text-gray-900 border border-gray-100'
                } p-8 rounded-xl flex flex-col transition-all duration-300 ${
                  plan.featured ? 'translate-y-[-8px]' : 'hover:translate-y-[-4px]'
                }`}>
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className={`${plan.featured ? 'text-blue-100' : 'text-gray-500'}`}> {plan.period}</span>
                </div>
                <p className={`${plan.featured ? 'text-blue-100' : 'text-gray-600'} mb-6`}>{plan.description}</p>
                <ul className="mb-8 flex-grow">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center mb-3">
                      <svg className={`h-5 w-5 ${plan.featured ? 'text-blue-300' : 'text-blue-500'} mr-2`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button className={`w-full py-3 rounded-lg font-medium transition-all duration-300 ${
                  plan.featured 
                    ? 'bg-white text-blue-600 hover:bg-gray-100' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 sm:py-24">
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 rounded-2xl p-8 sm:p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Ready to transform your workflow?</h2>
          <p className="text-blue-100 max-w-2xl mx-auto mb-8">
            Join thousands of satisfied users who have revolutionized their processes with Kortix Suna.
          </p>
          <Link href="/dashboard" className="inline-block px-8 py-3 bg-white text-blue-600 font-medium rounded-lg hover:bg-gray-100 transition-all duration-300">
            Start Your Free Trial
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer id="footer" className="bg-gradient-to-b from-gray-900 to-gray-950 text-white pt-12 pb-6">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h3 className="text-xl font-bold mb-4">Kortix Suna</h3>
              <p className="text-gray-400">Intelligent solutions for modern businesses.</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><Link href="#" className="text-gray-400 hover:text-white transition-all">Features</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-all">Integrations</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-all">Documentation</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-all">API</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><Link href="#" className="text-gray-400 hover:text-white transition-all">About Us</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-all">Careers</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-all">Blog</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-all">Press</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact</h4>
              <ul className="space-y-2">
                <li><Link href="#" className="text-gray-400 hover:text-white transition-all">Support</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-all">Sales</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-all">Partnerships</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-500 mb-4 md:mb-0">
              © 2023 Kortix Suna. All rights reserved.
            </div>
            <div className="flex gap-6">
              <Link href="#" className="text-gray-500 hover:text-white transition-all">Terms</Link>
              <Link href="#" className="text-gray-500 hover:text-white transition-all">Privacy</Link>
              <Link href="#" className="text-gray-500 hover:text-white transition-all">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
