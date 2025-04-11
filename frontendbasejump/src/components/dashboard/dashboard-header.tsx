import Link from "next/link";
import UserAccountButton from "@/components/basejump/user-account-button";
import BasejumpLogo from "@/components/getting-started/basejump-logo";
import NavigatingAccountSelector from "@/components/dashboard/navigation-account-selector";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";
import { Menu } from "lucide-react";


interface Props {
    accountId: string;
    navigation?: {
        name: string;
        href: string;
    }[]
}
export default function DashboardHeader({ accountId, navigation = [] }: Props) {

    return (
        <nav className="w-full p-4 flex justify-between items-center border-b">
            <div className="justify-start items-center gap-x-4 lg:gap-x-6 hidden md:flex">
                <div className="flex items-center gap-x-4">
                    <Link href="/"><BasejumpLogo logoOnly /></Link>
                    <span className="border-l rotate-12 h-6" />
                    <NavigatingAccountSelector accountId={accountId} />
                </div>
                {navigation.map((navItem) => (
                    <Link key={navItem.name} href={navItem.href} className="text-sm font-medium transition-colors hover:text-primary">
                        {navItem.name}
                    </Link>
                ))}
            </div>
            <Sheet>
                <SheetTrigger className="md:hidden"><Menu className="h-6 w-6" /></SheetTrigger>
                <SheetContent side="left">
                    <div className="absolute top-2 left-2">
                        <Link href="/"><BasejumpLogo logoOnly /></Link>
                    </div>

                    <div className="pt-12 -mx-4 text-center flex flex-col gap-y-4 items-center">
                        <NavigatingAccountSelector accountId={accountId} />

                        <div className="flex flex-col items-start gap-y-2 w-full">
                        {navigation.map((navItem) => (
                            <Link key={navItem.name} href={navItem.href} className="block w-full px-3 py-1 text-sm text-left font-medium transition-colors hover:text-primary">
                                {navItem.name}
                            </Link>
                        ))}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            <div className="flex items-center gap-x-4">
                <UserAccountButton />
            </div>
        </nav>
    )

}