import {createClient} from "@/lib/supabase/server";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {Home, Smartphone, Video, Settings} from "lucide-react";
import { redirect } from "next/navigation";

export default async function TeamAccountDashboard({children, params: {accountSlug}}: {children: React.ReactNode, params: {accountSlug: string}}) {
    const supabaseClient = createClient();

    const {data: teamAccount, error} = await supabaseClient.rpc('get_account_by_slug', {
        slug: accountSlug
    });

    if (!teamAccount) {
        redirect('/dashboard');
    }

    const navigation = [
        {
            name: 'Overview',
            href: `/dashboard/${accountSlug}`,
            icon: <Home size={20} />,
        },
        {
            name: 'Devices',
            href: `/dashboard/${accountSlug}/devices`,
            icon: <Smartphone size={20} />,
        },
        {
            name: 'Recordings',
            href: `/dashboard/${accountSlug}/recordings`,
            icon: <Video size={20} />,
        },
        {
            name: 'Settings',
            href: `/dashboard/${accountSlug}/settings`,
            icon: <Settings size={20} />,
        }
    ]
    
    // Right panel content - replace with your actual content
    const rightPanelContent = (
        <div className="flex flex-col gap-4">
            <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Team Details</h3>
                <p className="text-sm text-muted-foreground">
                    {teamAccount.name}
                </p>
            </div>
            <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Team Members</h3>
                <div className="text-sm text-muted-foreground">
                    Contact administrator to manage team members
                </div>
            </div>
        </div>
    );

    return (
        <DashboardLayout 
            navigation={navigation}
            accountId={teamAccount.account_id}
            userName={teamAccount.name}
            userEmail={teamAccount.email || "team@example.com"}
            rightPanelContent={rightPanelContent}
            rightPanelTitle="Team Account"
        >
            {children}
        </DashboardLayout>
    )
}