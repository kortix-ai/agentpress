'use client'

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Check, Command, Sparkles, Send } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import NavBar from '@/components/layout/NavBar';

export default function Home() {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsTyping(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      console.log('Input submitted:', inputValue);
      // In a real app, you would process the input here
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <NavBar />
      
      <div className="w-full mx-auto flex-grow">
        {/* Hero Section - Centered, Clean, Impactful */}
        <section className="relative py-24 md:py-32 overflow-hidden">
          {/* Subtle grid background */}
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-50/5 to-transparent"></div>
            <div className="absolute inset-0 opacity-[0.02]" style={{ 
              backgroundImage: `linear-gradient(to right, var(--border-color) 1px, transparent 1px),
                               linear-gradient(to bottom, var(--border-color) 1px, transparent 1px)`,
              backgroundSize: '40px 40px'
            }}></div>
            <div className="absolute inset-0 opacity-[0.01]" style={{ 
              backgroundImage: `linear-gradient(to right, var(--border-color) 1px, transparent 1px),
                               linear-gradient(to bottom, var(--border-color) 1px, transparent 1px)`,
              backgroundSize: '200px 200px'
            }}></div>
          </div>
          
          <div className="container mx-auto px-4 max-w-5xl">
            {/* Centered hero content */}
            <div className="text-center">
              <div className="inline-flex items-center px-3 py-1.5 bg-foreground/5 border border-foreground/10 rounded-full text-xs font-medium mb-8">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" /> THE NEXT GENERATION AI AGENT
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
                Meet your AI Employee<br />
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                A personal AI that bridges minds and actions — it doesn't just think, it delivers results.
              </p>
              
              {/* Demo input with focused styling */}
              <div className="max-w-2xl mx-auto mb-12 relative">
                <form onSubmit={handleSubmit} className="relative z-10">
                  <div className="rounded-xl border-2 border-input bg-background/70 backdrop-blur-sm overflow-hidden group transition-all duration-300 hover:border-foreground/20 focus-within:border-foreground/20 shadow-lg">
                    <div className="flex items-center">
                      <Command className="h-5 w-5 text-muted-foreground ml-4" />
                      <Input
                        type="text"
                        placeholder="Ask Suna to do anything..."
                        className="bg-transparent border-0 py-6 px-3 text-base placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                        value={inputValue}
                        onChange={handleInputChange}
                      />
                      <button 
                        type="submit" 
                        className={`mr-4 p-2 rounded-md transition-all ${inputValue.trim() ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                        disabled={!inputValue.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </form>
                {/* Decorative glow effect */}
                <div className="absolute bottom-0 inset-x-0 h-16 bg-primary/10 blur-xl rounded-full -z-10"></div>
              </div>
              
              {/* CTA Buttons
              <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
                <Link href="/signup" className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-md font-medium transition-colors">
                  Get Started Free
                </Link>
                <Link href="/docs" className="text-foreground hover:text-primary px-6 py-3 rounded-md font-medium transition-colors flex items-center">
                  Learn more <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div> */}
            </div>
          </div>
        </section>
        
        {/* Trusted By / Social Proof Section */}
        <section className="py-12 border-y border-input">
          <div className="container mx-auto px-4">
            <p className="text-center text-sm text-muted-foreground uppercase tracking-wider mb-8">Trusted by innovative teams</p>
            <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8">
              {['Notion', 'Figma', 'Linear', 'Vercel', 'Stripe', 'Loom'].map((company, i) => (
                <div key={i} className="grayscale opacity-70 hover:opacity-100 hover:grayscale-0 transition-all">
                  <div className="h-8 flex items-center">
                    <span className="text-lg font-medium">{company}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* Key Features Section */}
        <section className="py-24 md:py-32">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="text-center mb-20">
              <div className="inline-block px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full mb-4">FEATURES</div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Empower Your Workflow with AI</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                From research and content creation to data analysis, Suna handles it all with remarkable precision.
              </p>
            </div>
            
            {/* Feature Cards with simpler, cleaner design */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: "Research & Analysis",
                  description: "Turn complex data into clear insights and actionable recommendations.",
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )
                },
                {
                  title: "Content Creation",
                  description: "Generate high-quality, context-aware content tailored to your needs.",
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )
                },
                {
                  title: "Task Automation",
                  description: "Let Suna handle repetitive tasks while you focus on what matters.",
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14.7519 11.1679L11.5547 9.03647M11.5547 9.03647L12.6953 5.50397M11.5547 9.03647L9.24723 13.1219M7.1884 15.9681L11.5547 14.5753M11.5547 14.5753L15.9149 15.9898M11.5547 14.5753L10.4141 18.1078M19.2256 7.33163L15.9089 2.75L8.28113 2.75L4.96447 7.33163L8.28113 11.9133L15.9089 11.9133L19.2256 7.33163ZM15.9089 21.25L8.28113 21.25L4.96447 16.6684L8.28113 12.0867L15.9089 12.0867L19.2256 16.6684L15.9089 21.25Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )
                }
              ].map((feature, i) => (
                <div key={i} className="group bg-background border border-input rounded-xl p-8 hover:shadow-md transition-all duration-300">
                  <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-6">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-4 group-hover:text-primary transition-colors">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
            
            {/* Demo Feature - AI Agent Chat */}
            <div className="mt-24 bg-muted/30 rounded-xl border border-input overflow-hidden p-6 md:p-8">
              <div className="max-w-4xl mx-auto">
                <div className="rounded-lg bg-chat p-4 md:p-6 mb-6 bg-primary/5">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="h-8 w-8 bg-primary/20 rounded-full flex items-center justify-center text-primary shrink-0">S</div>
                    <div>
                      <div className="bg-background rounded-lg p-4 shadow-sm">
                        <p className="text-sm text-muted-foreground mb-2">I need help planning a trip to Japan in April.</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground shrink-0">AI</div>
                    <div>
                      <div className="bg-background rounded-lg p-4 shadow-sm">
                        <p className="font-medium mb-2">I'll help plan your Japan trip in April</p>
                        <p className="text-sm text-muted-foreground">I'll create a detailed itinerary considering weather, cherry blossom season, popular attractions, and local events. Would you like to focus on specific regions or activities?</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
                
        {/* How It Works - Simplified Step Process */}
        <section className="py-24 bg-muted/20 border-y border-input">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="text-center mb-20">
              <div className="inline-block px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full mb-4">HOW IT WORKS</div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Simple. Seamless. Smart.</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                From initial request to completed task, Suna streamlines your workflow with intelligent automation.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16 relative">
              {/* Line connecting steps */}
              <div className="hidden md:block absolute top-20 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-[2px] bg-muted"></div>
              
              {[
                {
                  step: "01",
                  title: "Request",
                  description: "Make a natural language request describing what you need done."
                },
                {
                  step: "02",
                  title: "Process",
                  description: "Suna understands context, gathers information, and plans execution."
                },
                {
                  step: "03",
                  title: "Deliver",
                  description: "Receive completed tasks with full documentation of process and results."
                }
              ].map((step, i) => (
                <div key={i} className="relative">
                  <div className="flex flex-col items-center">
                    <div className="bg-primary text-primary-foreground h-12 w-12 rounded-full flex items-center justify-center text-base font-medium mb-6 z-10 shadow-sm">
                      {step.step}
                    </div>
                    <h3 className="text-xl font-semibold mb-4">{step.title}</h3>
                    <p className="text-muted-foreground text-center">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* Pricing Section - More Minimal and Clean */}
        <section className="py-24 md:py-32">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="text-center mb-20">
              <div className="inline-block px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full mb-4">PRICING</div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Pricing that scales with you</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Choose the plan that works best for your needs.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Free Plan */}
              <div className="bg-background border border-input rounded-xl p-8 flex flex-col hover:shadow-md transition-all duration-300">
                <div className="mb-8">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">Free</h3>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold">$0</span>
                    <span className="text-muted-foreground ml-2">/month</span>
                  </div>
                </div>
                
                <ul className="space-y-4 mb-8 flex-grow">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-3 shrink-0" />
                    <span>5 agent requests per day</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-3 shrink-0" />
                    <span>Access to basic AI capabilities</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-3 shrink-0" />
                    <span>Community support</span>
                  </li>
                </ul>
                
                <Link href="/signup" className="w-full bg-background border border-input text-foreground hover:bg-muted px-6 py-3 rounded-md font-medium transition-colors text-center">
                  Get Started
                </Link>
              </div>
              
              {/* Personal Plan */}
              <div className="bg-background border border-input rounded-xl p-8 flex flex-col hover:shadow-md transition-all duration-300">
                <div className="mb-8">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">Personal</h3>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold">$12</span>
                    <span className="text-muted-foreground ml-2">/month</span>
                  </div>
                </div>
                
                <ul className="space-y-4 mb-8 flex-grow">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-3 shrink-0" />
                    <span>Unlimited agent requests</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-3 shrink-0" />
                    <span>Access to all core AI capabilities</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-3 shrink-0" />
                    <span>Basic integrations with popular tools</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-3 shrink-0" />
                    <span>Email support within 24 hours</span>
                  </li>
                </ul>
                
                <Link href="/signup" className="w-full bg-background border border-primary text-primary hover:bg-primary hover:text-primary-foreground px-6 py-3 rounded-md font-medium transition-colors text-center">
                  Get Started
                </Link>
              </div>
              
              {/* Business Plan */}
              <div className="bg-background border-2 border-primary rounded-xl p-8 flex flex-col relative overflow-hidden shadow-md">
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-medium rounded-bl-md">Popular</div>
                <div className="mb-8">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">Business</h3>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold">$24</span>
                    <span className="text-muted-foreground ml-2">/month</span>
                  </div>
                </div>
                
                <ul className="space-y-4 mb-8 flex-grow">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-3 shrink-0" />
                    <span>Unlimited agent operation hours</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-3 shrink-0" />
                    <span>Advanced AI capabilities and customization</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-3 shrink-0" />
                    <span>Full integration suite with API access</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-3 shrink-0" />
                    <span>Priority support with 4-hour response time</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-3 shrink-0" />
                    <span>Multi-user access with team management</span>
                  </li>
                </ul>
                
                <Link href="/signup" className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors text-center">
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </section>
        
        {/* FAQ Section */}
        <section className="py-24 border-t border-input">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-16">
              <div className="inline-block px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full mb-4">FAQ</div>
              <h2 className="text-3xl md:text-5xl font-bold">Frequently Asked Questions</h2>
            </div>
            
            <div className="space-y-8">
              {[
                {
                  question: "What is Suna?",
                  answer: "Suna is an AI agent designed to help streamline your workflow by handling various tasks from research and content creation to data analysis and more."
                },
                {
                  question: "How does it work?",
                  answer: "Simply describe what you need in natural language. Suna understands your request, gathers relevant information, and delivers completed tasks with full documentation."
                },
                {
                  question: "Is my data secure?",
                  answer: "Yes. We prioritize data security and privacy. All data is encrypted and we never share your information with third parties without your explicit permission."
                },
                {
                  question: "Can Suna integrate with other tools?",
                  answer: "Yes. Suna integrates with popular productivity tools, communication platforms, and data sources to provide a seamless workflow experience."
                }
              ].map((faq, i) => (
                <div key={i} className="border-b border-input pb-8">
                  <h3 className="text-xl font-semibold mb-4">{faq.question}</h3>
                  <p className="text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* Final CTA Section */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Automate.<br />Simplify. Thrive.</h2>
            <Link href="/signup" className="inline-flex items-center bg-background text-foreground hover:bg-background/90 px-6 py-3 rounded-md font-medium transition-colors">
              Get Started Free
            </Link>
          </div>
        </section>
      </div>
      
      {/* Footer */}
      <footer className="border-t border-input py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><Link href="/features" className="text-sm text-muted-foreground hover:text-foreground">Features</Link></li>
                <li><Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</Link></li>
                <li><Link href="/roadmap" className="text-sm text-muted-foreground hover:text-foreground">Roadmap</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground">Documentation</Link></li>
                <li><Link href="/guides" className="text-sm text-muted-foreground hover:text-foreground">Guides</Link></li>
                <li><Link href="/api" className="text-sm text-muted-foreground hover:text-foreground">API</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><Link href="/about" className="text-sm text-muted-foreground hover:text-foreground">About</Link></li>
                <li><Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground">Blog</Link></li>
                <li><Link href="/careers" className="text-sm text-muted-foreground hover:text-foreground">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">Privacy</Link></li>
                <li><Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">Terms</Link></li>
              </ul>
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                  <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.73l7.46 3.73L12 12.2 4.54 8.46 12 4.73zM4 9.54l7 3.5v5.92l-7-3.5V9.54zm16 0v5.92l-7 3.5v-5.92l7-3.5z" />
                </svg>
                <span className="font-semibold">Suna</span>
              </div>
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Suna AI.<br />All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

