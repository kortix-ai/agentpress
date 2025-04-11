'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown, Monitor, Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

export default function Footer() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // useEffect only runs on the client, so we can safely access the window object
  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering theme controls until mounted
  if (!mounted) {
    return (
      <footer className="py-4 px-8 border-t border-zinc-200 bg-white">
        <div className="container mx-auto">
          <div className="flex flex-wrap items-center justify-between">
            {/* Left navigation */}
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-black flex items-center">
                <Image 
                  src="/images/kortix-small-logo.svg"
                  alt="Kortix" 
                  width={18} 
                  height={18} 
                  className="mr-1"
                />
              </Link>
              
              <Link href="/docs" className="text-zinc-600 hover:text-black text-sm">
                Docs
              </Link>
              
              <Link href="/guides" className="text-zinc-600 hover:text-black text-sm">
                Guides
              </Link>
              
              <Link href="/help" className="text-zinc-600 hover:text-black text-sm">
                Help
              </Link>
              
              <Link href="/contact" className="text-zinc-600 hover:text-black text-sm">
                Contact
              </Link>
              
              <div className="relative">
                <button className="flex items-center text-zinc-600 hover:text-black text-sm">
                  Legal <ChevronDown className="ml-1 w-3 h-3" />
                </button>
              </div>
            </div>
            
            {/* Center - Status indicator */}
            <div className="flex items-center">
              <span className="flex items-center text-blue-500 text-sm">
                <span className="h-2 w-2 bg-blue-500 rounded-full mr-2"></span>
                All systems normal
              </span>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="py-4 px-8 border-t border-zinc-200 bg-white dark:bg-zinc-900 dark:border-zinc-800">
      <div className="container mx-auto">
        <div className="flex flex-wrap items-center justify-between">
          {/* Left navigation */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-black dark:text-white flex items-center">
              <Image 
                src="/images/kortix-small-logo.svg" 
                alt="Kortix" 
                width={18} 
                height={18} 
                className="mr-1"
              />
            </Link>
            
            <Link href="/docs" className="text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white text-sm">
              Docs
            </Link>
            
            <Link href="/guides" className="text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white text-sm">
              Guides
            </Link>
            
            <Link href="/help" className="text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white text-sm">
              Help
            </Link>
            
            <Link href="/contact" className="text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white text-sm">
              Contact
            </Link>
            
            <div className="relative">
              <button className="flex items-center text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white text-sm">
                Legal <ChevronDown className="ml-1 w-3 h-3" />
              </button>
            </div>
          </div>
          
          {/* Right side - Status and Theme controls */}
          <div className="flex items-center space-x-6">
            {/* Status indicator */}
            <span className="flex items-center text-blue-500 text-sm">
              <span className="h-2 w-2 bg-blue-500 rounded-full mr-2"></span>
              All systems normal
            </span>
            
            {/* Theme controls */}
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-full overflow-hidden">
              <div className="flex">
                <button 
                  className={`px-3 py-2 text-sm transition-colors ${theme === 'system' ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}`}
                  onClick={() => setTheme('system')}
                  aria-label="System theme"
                >
                  <Monitor size={16} />
                </button>
                <button 
                  className={`px-3 py-2 text-sm transition-colors ${theme === 'light' ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}`}
                  onClick={() => setTheme('light')}
                  aria-label="Light theme"
                >
                  <Sun size={16} />
                </button>
                <button 
                  className={`px-3 py-2 text-sm transition-colors ${theme === 'dark' ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}`}
                  onClick={() => setTheme('dark')}
                  aria-label="Dark theme"
                >
                  <Moon size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Copyright */}
        <div className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          © 2025, Kortix Inc.
        </div>
      </div>
    </footer>
  );
} 