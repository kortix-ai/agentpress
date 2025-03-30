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
    <nav className="border-b bg-white">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link href="/" className="text-xl font-bold">
            AgentPress
          </Link>
          {user && (
            <div className="hidden md:flex items-center space-x-4">
              <Link
                href="/projects"
                className={`text-sm font-medium ${
                  pathname?.startsWith('/projects') ? 'text-indigo-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Projects
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar>
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="cursor-default">
                  <span className="font-medium">{user.email}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex space-x-2">
              <Link href="/auth/login">
                <Button variant="outline">Log in</Button>
              </Link>
              <Link href="/auth/signup">
                <Button>Sign up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
} 