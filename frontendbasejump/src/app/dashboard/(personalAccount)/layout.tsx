import {createClient} from "@/lib/supabase/server";
import DashboardHeader from "@/components/dashboard/dashboard-header";

export default async function PersonalAccountDashboard({children}: {children: React.ReactNode}) {

    const supabaseClient = createClient();

    const {data: personalAccount, error} = await supabaseClient.rpc('get_personal_account');

    const navigation = [
        {
            name: 'Overview',
            href: '/dashboard',
        },
        {
            name: 'Devices',
            href: '/dashboard/devices',
        },
        {
            name: 'Recordings',
            href: '/dashboard/recordings',
        },
        {
            name: 'Settings',
            href: '/dashboard/settings'
        }
    ]

    return (
        <>
            <DashboardHeader accountId={personalAccount.account_id} navigation={navigation} />
            <div className="w-full p-8">{children}</div>
        </>
    )

}