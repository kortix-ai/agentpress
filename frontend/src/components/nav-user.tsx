"use client"

import {
  IconCreditCard,
  IconDotsVertical,
  IconLogout,
  IconUserCircle,
} from "@tabler/icons-react"

import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { toast } from 'sonner'

export function NavUser({
  user,
}: {
  user?: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { isMobile } = useSidebar()
  const { logout, isLoggingOut } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await logout()
      toast.success('Successfully logged out')
      router.push('/auth/login')
      router.refresh()
    } catch {
      toast.error('Failed to log out. Please try again.')
    }
  }

  if (!user) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton 
              size="lg"
              className="hover:bg-zinc-50 rounded-md transition-all duration-200 w-full py-1 group cursor-pointer active:bg-zinc-100"
            >
              <Avatar className="h-7 w-7 rounded-full mr-2">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-full text-xs bg-zinc-100 text-zinc-800">
                  {user.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium text-sm">{user.name}</span>
                <span className="truncate text-xs text-zinc-500">
                  {user.email}
                </span>
              </div>
              <div className="ml-auto p-0.5 rounded-full transition-all duration-200 group-hover:bg-zinc-100">
                <IconDotsVertical className="size-3.5 text-zinc-400 transition-all duration-200 group-hover:text-zinc-600" />
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56 rounded-md border-zinc-200 py-1.5"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-2 py-1.5 text-left">
                <Avatar className="h-8 w-8 rounded-full">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-full text-xs bg-zinc-100 text-zinc-800">
                    {user.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-medium text-sm">{user.name}</span>
                  <span className="truncate text-xs text-zinc-500">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuGroup>
              <DropdownMenuItem className="py-1.5 px-2 text-sm">
                <IconUserCircle className="mr-2 size-4 text-zinc-500" />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem className="py-1.5 px-2 text-sm">
                <IconCreditCard className="mr-2 size-4 text-zinc-500" />
                Billing
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem 
              onClick={handleLogout}
              className="py-1.5 px-2 text-sm text-red-500 focus:text-red-600 focus:bg-red-50"
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <>
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Logging out...
                </>
              ) : (
                <>
                  <IconLogout className="mr-2 size-4" />
                  Log out
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
