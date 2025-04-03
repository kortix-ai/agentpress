'use client';

import Link from 'next/link';
import Image from 'next/image';
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
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function MainNav() {
  const pathname = usePathname();
  const { user, logout, isLoggingOut } = useAuth();
  const router = useRouter();

  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email
      .split('@')[0]
      .slice(0, 2)
      .toUpperCase();
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Successfully logged out');
      router.push('/auth/login');
      router.refresh();
    } catch {
      toast.error('Failed to log out. Please try again.');
    }
  };

  return (
    <nav className="border-b border-zinc-100 bg-white">
      <div className="max-w-6xl mx-auto px-6 flex h-16 items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center group">
            <Image
              src="/kortix-logo.svg"
              alt="Kortix Logo"
              width={160}
              height={29}
              priority
              className="transition-transform duration-200 group-hover:scale-105"
            />
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
            <>
              <Link href="/dashboard">
                <Button variant="outline" size="sm" className="text-sm font-normal border-zinc-200 text-zinc-800 hover:bg-zinc-50">
                  Dashboard
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full overflow-hidden hover:bg-zinc-50 transition-colors p-0">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-zinc-100 text-zinc-800 text-xs">{getUserInitials()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1">
                  <DropdownMenuItem className="cursor-default px-3 py-2 text-xs text-zinc-500">
                    <span className="truncate">{user.email}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleLogout} 
                    className="cursor-pointer px-3 py-2 text-sm hover:bg-zinc-50 hover:text-black transition-colors"
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? (
                      <>
                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        Logging out...
                      </>
                    ) : (
                      'Log out'
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex space-x-3">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm" className="text-zinc-700 hover:text-black hover:bg-zinc-50">
                  Log in
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button variant="ghost" size="sm" className="text-zinc-700 hover:text-black hover:bg-zinc-50 border border-zinc-200">
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