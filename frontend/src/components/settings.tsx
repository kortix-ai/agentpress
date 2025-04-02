import * as React from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

interface SettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLogout?: () => void
}

export function Settings({ open, onOpenChange, onLogout }: SettingsProps) {
  const [activeSettingsTab, setActiveSettingsTab] = React.useState('general')
  const { theme, setTheme } = useTheme()
  const [languageValue, setLanguageValue] = React.useState("auto")
  const [showCodeToggle, setShowCodeToggle] = React.useState(false)
  const [showSuggestionsToggle, setShowSuggestionsToggle] = React.useState(true)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[800px] p-0">
        <div className="flex flex-col md:flex-row h-[calc(100vh-2rem)]">
          {/* Settings Sidebar */}
          <div className="w-full md:w-64 bg-muted/50 p-0">
            <div className="flex items-center p-4">
              <SheetTitle className="text-lg font-medium">Settings</SheetTitle>
            </div>
            <div className="px-3 py-2">
              <Button
                variant="ghost"
                className={cn(
                  "flex w-full justify-start px-3 py-2 h-auto",
                  activeSettingsTab === 'general' 
                    ? "bg-accent text-accent-foreground" 
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
                onClick={() => setActiveSettingsTab('general')}
              >
                <span className="ml-3">General</span>
              </Button>
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
                      value={theme}
                      onValueChange={setTheme}
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

                {onLogout && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Log out on this device</div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="rounded-full"
                        onClick={onLogout}
                      >
                        Log out
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Other tabs can be implemented similarly */}
            {activeSettingsTab !== 'general' && (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground text-sm">
                  Settings for this section will be displayed here.
                </p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
} 