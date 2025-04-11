import {createClient} from "@/lib/supabase/server";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {Home, Smartphone, Video, Settings} from "lucide-react";

export default async function PersonalAccountDashboard({children}: {children: React.ReactNode}) {

    const supabaseClient = createClient();

    const {data: personalAccount, error} = await supabaseClient.rpc('get_personal_account');

    const navigation = [
        {
            name: 'Overview',
            href: '/dashboard',
            icon: <Home size={20} />,
        },
        {
            name: 'Devices',
            href: '/dashboard/devices',
            icon: <Smartphone size={20} />,
        },
        {
            name: 'Recordings',
            href: '/dashboard/recordings',
            icon: <Video size={20} />,
        },
        {
            name: 'Settings',
            href: '/dashboard/settings',
            icon: <Settings size={20} />,
        }
    ]

    // Right panel content - replace with your actual content
    const rightPanelContent = (
        <div className="flex flex-col gap-4">
            <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Account Status</h3>
                <p className="text-sm text-muted-foreground">Active</p>
            </div>
            <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Recent Activity</h3>
                <ul className="space-y-2 text-sm">
                    <li className="flex items-center justify-between">
                        <span>Login</span>
                        <span className="text-muted-foreground">1 hour ago</span>
                    </li>
                    <li className="flex items-center justify-between">
                        <span>Settings updated</span>
                        <span className="text-muted-foreground">3 days ago</span>
                    </li>
                </ul>
            </div>
        </div>
    );

    return (
        <DashboardLayout 
            navigation={navigation}
            accountId={personalAccount.account_id}
            userName={personalAccount.name}
            userEmail={personalAccount.email}
            rightPanelContent={rightPanelContent}
            rightPanelTitle="Account Details"
        >
            {children}
        </DashboardLayout>
    )

}