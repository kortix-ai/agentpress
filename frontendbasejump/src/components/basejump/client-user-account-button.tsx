'use client';

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

interface ClientUserAccountButtonProps {
    userName?: string;
    userEmail?: string;
}

export default function ClientUserAccountButton({ 
    userName = "Account", 
    userEmail = "" 
}: ClientUserAccountButtonProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button 
                    variant="ghost" 
                    className="h-9 w-9 rounded-full border border-subtle dark:border-white/10 hover:bg-hover-bg dark:hover:bg-hover-bg-dark p-0"
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
                    <DropdownMenuItem asChild className="rounded-md hover:bg-hover-bg dark:hover:bg-hover-bg-dark cursor-pointer">
                        <Link href="/dashboard" className="flex w-full h-full text-foreground/90">My Account</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-md hover:bg-hover-bg dark:hover:bg-hover-bg-dark cursor-pointer">
                        <Link href="/dashboard/settings" className="flex w-full h-full text-foreground/90">Settings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-md hover:bg-hover-bg dark:hover:bg-hover-bg-dark cursor-pointer">
                        <Link href="/dashboard/settings/teams" className="flex w-full h-full text-foreground/90">Teams</Link>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="border-subtle dark:border-white/10" />
                <div className="p-1">
                    <DropdownMenuItem asChild className="rounded-md hover:bg-hover-bg dark:hover:bg-hover-bg-dark text-foreground/90 cursor-pointer">
                        <Link href="/api/auth/signout" className="flex w-full h-full">Log out</Link>
                    </DropdownMenuItem>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
} 