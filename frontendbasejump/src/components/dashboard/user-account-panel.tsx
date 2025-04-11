'use client';

import { useRouter } from "next/navigation";
import AccountSelector from "@/components/basejump/account-selector";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { UserIcon } from "lucide-react";

interface UserAccountPanelProps {
    accountId: string;
    userName?: string;
    userEmail?: string;
    isCollapsed?: boolean;
}

export default function UserAccountPanel({ 
    accountId, 
    userName = "Account", 
    userEmail = "",
    isCollapsed = false
}: UserAccountPanelProps) {
    const router = useRouter();

    if (isCollapsed) {
        return (
            <div className="flex flex-col items-center space-y-2">
                <div className="w-12 h-12 shadow-custom border border-subtle dark:border-white/10 bg-card-bg dark:bg-background-secondary rounded-2xl overflow-hidden flex items-center justify-center">
                    <AccountSelector
                        accountId={accountId}
                        onAccountSelected={(account) => router.push(account?.personal_account ? `/dashboard` : `/dashboard/${account?.slug}`)}
                        className="w-10 h-10 rounded-full border-0 justify-center !p-0"
                    />
                </div>
                
                <div className="w-12 h-12 shadow-custom border border-subtle dark:border-white/10 bg-card-bg dark:bg-background-secondary rounded-2xl overflow-hidden flex items-center justify-center group relative">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button 
                                variant="ghost" 
                                className="w-10 h-10 rounded-full border-0 hover:!bg-[#f1eee7] dark:hover:!bg-[#141413] p-0"
                            >
                                <UserIcon className="h-[1.2rem] w-[1.2rem] text-foreground/80" />
                                <span className="sr-only">User menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 border-subtle dark:border-white/10 bg-card-bg dark:bg-background-secondary rounded-xl shadow-custom" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal border-b border-subtle dark:border-white/10">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none text-foreground">{userName}</p>
                                    {userEmail && (
                                        <p className="text-xs leading-none text-foreground/70">
                                            {userEmail}
                                        </p>
                                    )}
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuGroup className="p-1">
                                <DropdownMenuItem asChild className="rounded-md hover:!bg-[#f1eee7] dark:hover:!bg-[#141413] cursor-pointer">
                                    <Link href="/dashboard" className="flex w-full h-full text-foreground/90">My Account</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="rounded-md hover:!bg-[#f1eee7] dark:hover:!bg-[#141413] cursor-pointer">
                                    <Link href="/dashboard/settings" className="flex w-full h-full text-foreground/90">Settings</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="rounded-md hover:!bg-[#f1eee7] dark:hover:!bg-[#141413] cursor-pointer">
                                    <Link href="/dashboard/settings/teams" className="flex w-full h-full text-foreground/90">Teams</Link>
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator className="border-subtle dark:border-white/10" />
                            <div className="p-1">
                                <DropdownMenuItem asChild className="rounded-md hover:!bg-[#f1eee7] dark:hover:!bg-[#141413] cursor-pointer">
                                    <Link href="/api/auth/signout" className="flex w-full h-full text-foreground/90">Log out</Link>
                                </DropdownMenuItem>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    
                    {/* Tooltip for collapsed mode */}
                    <div className="absolute left-full ml-2 scale-0 group-hover:scale-100 transition-all duration-200 origin-left z-50">
                        <div className="bg-card-bg dark:bg-background-secondary p-2 rounded-xl shadow-custom border border-subtle dark:border-white/10">
                            <span className="whitespace-nowrap text-foreground">{userName}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-between w-full p-3 border-t border-subtle dark:border-white/10">
            {/* Account Selector */}
            <AccountSelector
                accountId={accountId}
                onAccountSelected={(account) => router.push(account?.personal_account ? `/dashboard` : `/dashboard/${account?.slug}`)}
            />

            {/* User Account Button */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button 
                        variant="ghost" 
                        className="h-9 w-9 rounded-full border border-subtle dark:border-white/10 hover:!bg-[#f1eee7] dark:hover:!bg-[#141413] p-0"
                    >
                        <UserIcon className="h-[1.2rem] w-[1.2rem] text-foreground/80" />
                        <span className="sr-only">User menu</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 border-subtle dark:border-white/10 bg-card-bg dark:bg-background-secondary rounded-xl shadow-custom" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal border-b border-subtle dark:border-white/10">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none text-foreground">{userName}</p>
                            {userEmail && (
                                <p className="text-xs leading-none text-foreground/70">
                                    {userEmail}
                                </p>
                            )}
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuGroup className="p-1">
                        <DropdownMenuItem asChild className="rounded-md hover:!bg-[#f1eee7] dark:hover:!bg-[#141413] cursor-pointer">
                            <Link href="/dashboard" className="flex w-full h-full text-foreground/90">My Account</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="rounded-md hover:!bg-[#f1eee7] dark:hover:!bg-[#141413] cursor-pointer">
                            <Link href="/dashboard/settings" className="flex w-full h-full text-foreground/90">Settings</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="rounded-md hover:!bg-[#f1eee7] dark:hover:!bg-[#141413] cursor-pointer">
                            <Link href="/dashboard/settings/teams" className="flex w-full h-full text-foreground/90">Teams</Link>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator className="border-subtle dark:border-white/10" />
                    <div className="p-1">
                        <DropdownMenuItem asChild className="rounded-md hover:!bg-[#f1eee7] dark:hover:!bg-[#141413] cursor-pointer">
                            <Link href="/api/auth/signout" className="flex w-full h-full text-foreground/90">Log out</Link>
                        </DropdownMenuItem>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
} 