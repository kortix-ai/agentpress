'use client';

import { useState, useEffect } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import dynamic from 'next/dynamic';
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp } from "lucide-react";

// Import Spline dynamically with no SSR to avoid async issues in client component
const Spline = dynamic(() => import('@splinetool/react-spline'), { 
  ssr: false,
  loading: () => <div className="h-8 w-28 bg-zinc-100 animate-pulse rounded" />
})

interface HeroSectionProps {
  onSubmit: (message: string) => void;
}

export default function HeroSection({ onSubmit }: HeroSectionProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Check if user is logged in (this could be replaced with your auth logic)
  useEffect(() => {
    // Example: Check for authentication token/session
    const hasToken = localStorage.getItem('auth_token');
    setIsLoggedIn(!!hasToken);
  }, []);

  // Handle form submission
  const handleSubmit = (message: string) => {
    onSubmit(message);
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-black">
      {/* Left sidebar - navigation links, now full height */}
      <aside className="hidden md:block w-64 border-r border-zinc-200">
        <div className="px-8 py-3">
          {/* Kortix Logo at top of sidebar */}
          <div className="mb-24 flex items-center">
            {/* Logo with Spline */}
            <Link href="/" className="flex items-center group">
              <motion.div 
                className="flex items-center"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <div className="h-12 w-14 flex items-center justify-center">
                  <Spline
                    key="header-spline"
                    scene="https://prod.spline.design/UBkdpJsne-eB6mDZ/scene.splinecode"
                    style={{ transform: 'scale(0.4)', transformOrigin: 'left center' }}
                  />
                </div>
                <div className="text-md -ml-[24px] suna-text text-zinc-400">SUNA</div>
              </motion.div>
            </Link>
            
            {/* Panel icon right next to the logo */}
            <div className="ml-16">
              <button className="flex items-center justify-center focus:outline-none">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="5" y="5" width="14" height="14" rx="3" stroke="#9CA3AF" strokeWidth="1.5" fill="none"/>
                  <rect x="7" y="8" width="2" height="8" rx="1" fill="#9CA3AF"/>
                </svg>
              </button>
            </div>
          </div>
          
          <nav className="font-medium">
            <div className="pb-4">
              <button 
                className="w-full text-left px-3 py-1 rounded-sm hover:bg-zinc-100 transition-colors text-zinc-700 text-sm"
                onClick={() => document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Home
              </button>
            </div>
            <div className="py-4">
              <button 
                className="w-full text-left px-3 py-1 rounded-sm hover:bg-zinc-100 transition-colors text-zinc-700 text-sm"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Features
              </button>
            </div>
            <div className="py-4">
              <button 
                className="w-full text-left px-3 py-1 rounded-sm hover:bg-zinc-100 transition-colors text-zinc-700 text-sm"
                onClick={() => document.getElementById('applications')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Applications
              </button>
            </div>
            <div className="py-4">
              <button 
                className="w-full text-left px-3 py-1 rounded-sm hover:bg-zinc-100 transition-colors text-zinc-700 text-sm"
                onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Contact
              </button>
            </div>
            <div className="pt-4">
              <button 
                className="w-full text-left px-3 py-1 rounded-sm hover:bg-zinc-100 transition-colors text-zinc-700 text-sm"
                onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
              >
                About
              </button>
            </div>
          </nav>
        </div>
      </aside>
      
      {/* Main content column */}
      <div className="flex flex-col flex-1">
        {/* Header - now starts after the sidebar */}
        <header className="flex items-center justify-between px-8 py-3 border-b border-zinc-200">
          <div className="flex items-center">
            
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Search icon */}
            <button className="mr-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.5 15.5L19 19" stroke="black" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="11" cy="11" r="6" stroke="black" strokeWidth="1.5" fill="none"/>
              </svg>
            </button>
            
            {isLoggedIn ? (
              <button 
                className="px-4 py-2 rounded-sm bg-zinc-100 hover:bg-zinc-200 transition-colors text-sm font-semibold text-zinc-700"
                onClick={() => {
                  localStorage.removeItem('auth_token');
                  setIsLoggedIn(false);
                }}
              >
                Log out
              </button>
            ) : (
              <div className="flex space-x-3">
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm" className="text-zinc-700 hover:text-black hover:bg-zinc-50">
                    Log in
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button size="sm" className="bg-zinc-900 text-white hover:bg-black transition-colors">
                    Sign up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </header>
        
        {/* Main content area with divided layout */}
        <div className="flex flex-1">
          <ResizablePanelGroup direction="horizontal" className="w-full">
            {/* Left content (big card) */}
            <ResizablePanel defaultSize={70} minSize={50}>
              <div className="p-4 pt-2 lg:p-6 lg:pt-2 flex flex-col h-full">
                <div className="mt-2">
                  <a href="#" className="block">
                    <div>
                      <div className="rounded-lg overflow-hidden relative border border-zinc-200">
                        <div 
                          className="w-full relative pb-8"
                        >
                            <div className="h-full w-full flex items-center justify-center overflow-hidden pointer-events-none">
                              <div className="w-full max-w-xl mx-24">
                                <form onSubmit={(e) => {
                                  e.preventDefault();
                                  if (e.currentTarget.message.value.trim()) {
                                    handleSubmit(e.currentTarget.message.value);
                                    e.currentTarget.message.value = '';
                                  }
                                }} className="relative">
                                  <Textarea
                                    name="message"
                                    placeholder="Ask me anything..."
                                    className="min-h-[50px] max-h-[200px] pr-12 resize-none"
                                    autoFocus={true}
                                    rows={1}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        const form = e.currentTarget.form;
                                        if (form && e.currentTarget.value.trim()) {
                                          form.requestSubmit();
                                        }
                                      }
                                    }}
                                  />
                                  
                                  <Button 
                                    type="submit"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-2 bottom-2 h-8 w-8 rounded-full"
                                    aria-label="Send message"
                                  >
                                    <ArrowUp className="h-4 w-4" />
                                  </Button>
                                </form>
                              </div>
                            </div>
                         
                          {/* Content overlay */}
                          <div className="w-full h-full relative flex items-center justify-center p-8">
                            <div className="text-center text-white z-10">
                              
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Post title - now outside the card */}
                      <div className="mt-4">
                        <h2 className="text-4xl md:text-5xl font-medium mb-2 tracking-tight">Introducing - Suna</h2>
                        <div className="flex items-center text-sm font-normal">
                          <span className="mr-2">General Purpose AI Agent</span>
                          <span className="text-gray-500">Created by the team at Kortix</span>
                        </div>
                      </div>
                    </div>
                  </a>

                  
                </div>
              </div>
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            {/* Right sidebar with cards */}
            <ResizablePanel defaultSize={30} minSize={25}>
              <div className="p-4 pt-2 lg:p-6 lg:pt-2">
                <div className="mt-2 space-y-6">
                  {/* Audio models card */}
                  <a href="#" className="block">
                    <div>
                      <div className="rounded-lg overflow-hidden hover:shadow-sm transition-shadow border border-zinc-200">
                        <div className="aspect-[4/3] bg-blend-overlay relative">
                          {/* Icon */}
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white rounded-lg flex items-center justify-center border border-zinc-200">
                            <Spline
                              scene="https://prod.spline.design/UBkdpJsne-eB6mDZ/scene.splinecode"
                              style={{ transform: 'scale(0.4)', transformOrigin: 'center center' }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Title outside the card */}
                      <div className="mt-3">
                        <h3 className="text-xl font-medium mb-1">Introducing next-generation audio models in the API</h3>
                        <div className="flex items-center text-sm font-normal">
                          <span className="mr-2">Release</span>
                          <span className="text-gray-500">6 min read</span>
                        </div>
                      </div>
                    </div>
                  </a>

                  {/* Tools for building agents card */}
                  <a href="#" className="block">
                    <div>
                      <div className="rounded-lg overflow-hidden hover:shadow-sm transition-shadow border border-zinc-200">
                        <div className="aspect-[4/3] relative">
                          {/* Icon */}
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white rounded-xl flex items-center justify-center border-2 border-zinc-300 overflow-visible shadow-lg">
                            
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Title outside the card */}
                      <div className="mt-3">
                        <h3 className="text-xl font-medium mb-1">New tools for building agents</h3>
                        <div className="flex items-center text-sm font-normal">
                          <span className="mr-2">Product</span>
                          <span className="text-gray-500">8 min read</span>
                        </div>
                    </div>
                  </a>
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>

      {/* CSS for the dots */}
      <style jsx>{`
        .dots-container {
          position: absolute;
          inset: 0;
          overflow: hidden;
          mix-blend-mode: screen;
        }
        
        .color-dot {
          position: absolute;
          border-radius: 50%;
          filter: blur(40px);
          opacity: 0.85;
          animation: float 10s infinite ease-in-out;
          box-shadow: 0 0 60px 10px rgba(255, 255, 255, 0.2);
        }
        
        .red-dot {
          width: 600px;
          height: 600px;
          background-color: rgba(255, 0, 0, 0.85);
          top: -20%;
          left: 0%;
          animation-delay: 0s;
          filter: blur(35px);
        }
        
        .orange-dot {
          width: 500px;
          height: 500px;
          background-color: rgba(255, 165, 0, 0.85);
          top: -15%;
          left: 40%;
          animation-delay: 1s;
          filter: blur(35px);
        }
        
        .yellow-dot {
          width: 550px;
          height: 550px;
          background-color: rgba(255, 255, 0, 0.85);
          top: -15%;
          left: 80%;
          animation-delay: 2s;
          filter: blur(35px);
        }
        
        .green-dot {
          width: 650px;
          height: 650px;
          background-color: rgba(0, 255, 0, 0.85);
          top: 25%;
          left: 100%;
          animation-delay: 3s;
          filter: blur(35px);
        }
        
        .teal-dot {
          width: 574px;
          height: 574px;
          background-color: rgba(0, 128, 128, 0.85);
          top: 65%;
          left: 90%;
          animation-delay: 4s;
          filter: blur(35px);
        }
        
        .blue-dot {
          width: 624px;
          height: 624px;
          background-color: rgba(30, 144, 255, 0.85);
          top: 100%;
          left: 70%;
          animation-delay: 5s;
          filter: blur(35px);
        }
        
        .indigo-dot {
          width: 524px;
          height: 524px;
          background-color: rgba(75, 0, 130, 0.85);
          top: 100%;
          left: 30%;
          animation-delay: 6s;
          filter: blur(35px);
        }
        
        .purple-dot {
          width: 550px;
          height: 550px;
          background-color: rgba(128, 0, 128, 0.85);
          top: 90%;
          left: -10%;
          animation-delay: 7s;
          filter: blur(35px);
        }
        
        .pink-dot {
          width: 600px;
          height: 600px;
          background-color: rgba(255, 105, 180, 0.85);
          top: 50%;
          left: -20%;
          animation-delay: 8s;
          filter: blur(35px);
        }
        
        .cyan-dot {
          width: 474px;
          height: 474px;
          background-color: rgba(0, 255, 255, 0.85);
          top: 10%;
          left: -15%;
          animation-delay: 9s;
          filter: blur(35px);
        }
        
        .white-dot {
          width: 450px;
          height: 450px;
          background-color: rgba(255, 255, 255, 0.6);
          top: 40%;
          left: 50%;
          animation-delay: 10s;
          filter: blur(35px);
        }
        
        .lime-dot {
          width: 520px;
          height: 520px;
          background-color: rgba(50, 205, 50, 0.85);
          top: 20%;
          left: 20%;
          animation-delay: 3.5s;
          filter: blur(35px);
        }
        
        .magenta-dot {
          width: 580px;
          height: 580px;
          background-color: rgba(255, 0, 255, 0.85);
          top: 70%;
          left: 20%;
          animation-delay: 7.5s;
          filter: blur(35px);
        }
        
        .violet-dot {
          width: 540px;
          height: 540px;
          background-color: rgba(138, 43, 226, 0.85);
          top: 80%;
          left: 50%;
          animation-delay: 5.5s;
          filter: blur(35px);
        }
        
        .aqua-dot {
          width: 490px;
          height: 490px;
          background-color: rgba(0, 255, 255, 0.85);
          top: 30%;
          left: 80%;
          animation-delay: 4.5s;
          filter: blur(35px);
        }
        
        .peach-dot {
          width: 560px;
          height: 560px;
          background-color: rgba(255, 218, 185, 0.85);
          top: 10%;
          left: 50%;
          animation-delay: 6.5s;
          filter: blur(35px);
        }
        
        @keyframes float {
          0% {
            transform: translateY(0) translateX(0) scale(1);
          }
          33% {
            transform: translateY(15px) translateX(10px) scale(1.05);
          }
          66% {
            transform: translateY(-10px) translateX(5px) scale(0.95);
          }
          100% {
            transform: translateY(0) translateX(0) scale(1);
          }
        }
        
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}
