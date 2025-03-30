'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function MainNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email
      .split('@')[0]
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <nav className="border-b border-zinc-100 bg-white shadow-sm shrink-0">
      <div className="container mx-auto px-6 flex h-16 items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center group">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2.5 h-7 w-7 text-black transition-transform duration-200 group-hover:scale-110"
            >
              <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
            </svg>
            <span className="text-xl font-bold tracking-tight">AgentPress</span>
          </Link>
          {user && (
            <div className="hidden md:flex items-center space-x-6">
              <Link
                href="/projects"
                className={`relative py-1.5 text-sm font-medium transition-all duration-200 ${
                  pathname?.startsWith('/projects') 
                    ? 'text-black after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-black' 
                    : 'text-zinc-600 hover:text-black'
                }`}
              >
                Projects
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-5">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full overflow-hidden border border-zinc-200 hover:bg-zinc-50 transition-colors">
                  <Avatar>
                    <AvatarFallback className="bg-zinc-100 text-zinc-800">{getUserInitials()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5">
                <DropdownMenuItem className="cursor-default px-3 py-2 text-zinc-500 font-medium">
                  <span>{user.email}</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={logout} 
                  className="cursor-pointer px-3 py-2 hover:bg-zinc-100 hover:text-black transition-colors"
                >
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex space-x-3">
              <Link href="/auth/login">
                <Button variant="ghost" className="text-zinc-800 hover:text-black hover:bg-zinc-100 border border-transparent">
                  Log in
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-zinc-900 text-white hover:bg-black transition-colors">
                  Sign up
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
} 