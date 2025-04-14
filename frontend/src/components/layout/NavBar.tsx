'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Github, Menu, X } from 'lucide-react';

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Only show UI after mount to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);
  
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    document.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      document.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-background/90 backdrop-blur-md border-b border-border shadow-custom' : 'bg-transparent'
    }`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <div className="relative w-7 h-7 mr-2.5">
                <Image 
                  src="/kortix-symbol.svg" 
                  alt="Suna Logo" 
                  width={28} 
                  height={28} 
                  className={`${theme === 'dark' ? 'invert' : ''}`}
                />
              </div>
              <span className="font-semibold text-lg">Suna</span>
            </Link>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-foreground"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            {/* GitHub Star Button */}
            <Link 
              href="https://github.com/yourusername/suna" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center px-3 py-1.5 rounded-lg bg-muted/80 hover:bg-muted transition-colors"
            >
              <Github size={18} className="mr-1.5" />
              <span className="font-medium text-sm">80.7K</span>
            </Link>
            
            <Link href="/pricing" className="px-4 py-1.5 text-sm font-medium rounded-md hover:bg-muted/50 transition-colors">
              Pricing
            </Link>
            
            <Link href="/docs" className="px-4 py-1.5 text-sm font-medium rounded-md hover:bg-muted/50 transition-colors">
              Docs
            </Link>
            
            {/* Divider */}
            <div className="h-6 w-px bg-border mx-1"></div>
            
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-md text-foreground hover:bg-muted/80 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </button>
            )}
            
            <Link href="/login" className="px-4 py-1.5 text-sm font-medium rounded-md text-foreground hover:text-primary transition-colors">
              Sign in
            </Link>
            
            <Link href="/signup" className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              Get Started
            </Link>
          </div>
        </div>
        
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border mt-3 space-y-3">
            <Link 
              href="/pricing" 
              className="block px-3 py-2 rounded-md hover:bg-muted/50 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            <Link 
              href="/docs" 
              className="block px-3 py-2 rounded-md hover:bg-muted/50 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Docs
            </Link>
            <Link 
              href="https://github.com/yourusername/suna" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block px-3 py-2 rounded-md hover:bg-muted/50 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="flex items-center">
                <Github size={18} className="mr-2" />
                <span>GitHub</span>
              </span>
            </Link>
            <div className="border-t border-border pt-3 mt-3 flex flex-col space-y-3">
              <Link 
                href="/login" 
                className="block px-3 py-2 rounded-md hover:bg-muted/50 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign in
              </Link>
              <Link 
                href="/signup" 
                className="block px-3 py-2 rounded-md bg-primary text-primary-foreground text-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
} 