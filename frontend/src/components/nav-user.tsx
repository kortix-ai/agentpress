"use client"

import {
  IconCreditCard,
  IconDotsVertical,
  IconLogout,
  IconUserCircle,
  IconSettings,
  IconBell,
  IconCircleFilled,
  IconMicrophone,
  IconShieldLock,
  IconDatabaseCog,
  IconBuildingStore,
  IconApps,
  IconCreditCard as IconSubscription,
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
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Define the settings navigation items
const settingsNavItems = [
  { id: 'general', icon: <IconCircleFilled className="size-4" />, label: 'General' },
  { id: 'notifications', icon: <IconBell className="size-4" />, label: 'Notifications' },
  { id: 'personalization', icon: <IconUserCircle className="size-4" />, label: 'Personalization' },
  { id: 'speech', icon: <IconMicrophone className="size-4" />, label: 'Speech' },
  { id: 'data', icon: <IconDatabaseCog className="size-4" />, label: 'Data controls' },
  { id: 'builder', icon: <IconBuildingStore className="size-4" />, label: 'Builder profile' },
  { id: 'apps', icon: <IconApps className="size-4" />, label: 'Connected apps' },
  { id: 'security', icon: <IconShieldLock className="size-4" />, label: 'Security' },
  { id: 'subscription', icon: <IconSubscription className="size-4" />, label: 'Subscription' },
];

export function NavUser({
  user,
}: {
  user?: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { isMobile, setIsHovering } = useSidebar()
  const { logout, isLoggingOut } = useAuth()
  const router = useRouter()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [activeSettingsTab, setActiveSettingsTab] = useState('general')
  const [themeValue, setThemeValue] = useState("system")
  const [languageValue, setLanguageValue] = useState("auto")
  const [showCodeToggle, setShowCodeToggle] = useState(false)
  const [showSuggestionsToggle, setShowSuggestionsToggle] = useState(true)

  // Only control hover state without changing the pinned state
  const handleDropdownOpenChange = (open: boolean) => {
    setDropdownOpen(open);
    // When dropdown opens/closes, control the hover state only
    setIsHovering(open);
  };

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
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu open={dropdownOpen} onOpenChange={handleDropdownOpenChange}>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton 
                size="lg"
                className="hover:bg-zinc-50 rounded-md transition-all duration-200 w-full py-1 group cursor-pointer active:bg-zinc-100"
                onClick={(e) => {
                  // Only stop propagation to prevent other click handlers
                  e.stopPropagation();
                }}
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
                <DropdownMenuItem 
                  className="py-1.5 px-2 text-sm"
                  onClick={() => setSettingsOpen(true)}
                >
                  <IconSettings className="mr-2 size-4 text-zinc-500" />
                  Settings
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

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent className="p-0 sm:max-w-[800px] bg-background border-border overflow-hidden">
            <div className="flex flex-col md:flex-row h-[600px]">
              {/* Settings Sidebar */}
              <div className="w-full md:w-64 bg-muted/50 p-0">
                <div className="flex items-center p-4">
                  <DialogTitle className="text-lg font-medium">Settings</DialogTitle>
                </div>
                <div className="px-3 py-2">
                  {settingsNavItems.map((item) => (
                    <Button
                      key={item.id}
                      variant="ghost"
                      className={cn(
                        "flex w-full justify-start px-3 py-2 h-auto",
                        activeSettingsTab === item.id 
                          ? "bg-accent text-accent-foreground" 
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      )}
                      onClick={() => setActiveSettingsTab(item.id)}
                    >
                      {item.icon}
                      <span className="ml-3">{item.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Settings Content */}
              <div className="flex-1 p-6 overflow-y-auto border-l border-border">
                {/* General Tab Content */}
                {activeSettingsTab === 'general' && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Theme</div>
                        <Select
                          value={themeValue}
                          onValueChange={setThemeValue}
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue placeholder="Select theme" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                            <SelectItem value="system">System</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Separator className="bg-border" />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Always show code when using data analyst</div>
                        <Switch 
                          checked={showCodeToggle}
                          onCheckedChange={setShowCodeToggle}
                        />
                      </div>
                      <Separator className="bg-border" />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Show follow up suggestions in chats</div>
                        <Switch 
                          checked={showSuggestionsToggle}
                          onCheckedChange={setShowSuggestionsToggle}
                        />
                      </div>
                      <Separator className="bg-border" />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Language</div>
                        <Select
                          value={languageValue}
                          onValueChange={setLanguageValue}
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Auto-detect</SelectItem>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Spanish</SelectItem>
                            <SelectItem value="fr">French</SelectItem>
                            <SelectItem value="de">German</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Separator className="bg-border" />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Archived chats</div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="rounded-full"
                        >
                          Manage
                        </Button>
                      </div>
                      <Separator className="bg-border" />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Archive all chats</div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="rounded-full"
                        >
                          Archive all
                        </Button>
                      </div>
                      <Separator className="bg-border" />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Delete all chats</div>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          className="rounded-full"
                        >
                          Delete all
                        </Button>
                      </div>
                      <Separator className="bg-border" />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Log out on this device</div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="rounded-full"
                          onClick={handleLogout}
                        >
                          Log out
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Other tabs can be implemented similarly */}
                {activeSettingsTab !== 'general' && (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground text-sm">
                      {settingsNavItems.find(item => item.id === activeSettingsTab)?.label} settings will be displayed here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </>
  )
}
