import SettingsNavigation from "@/components/dashboard/settings-navigation";
import DashboardTitle from "@/components/dashboard/dashboard-title";
import {Separator} from "@/components/ui/separator";

export default function TeamSettingsPage({children, params: {accountSlug}}: {children: React.ReactNode, params: {accountSlug: string}}) {
    const items = [
        { name: "Account", href: `/dashboard/${accountSlug}/settings` },
        { name: "Members", href: `/dashboard/${accountSlug}/settings/members` },
        { name: "Billing", href: `/dashboard/${accountSlug}/settings/billing` },
    ]
    return (
        <div className="hidden space-y-6 pb-16 md:block">
            <DashboardTitle title="Settings" description="Manage your team account settings." />
            <Separator />
            <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0 w-full max-w-6xl mx-auto">
                <aside className="-mx-4 lg:w-1/5">
                    <SettingsNavigation items={items} />
                </aside>
                <div className="grow">{children}</div>
            </div>
        </div>
    )
}