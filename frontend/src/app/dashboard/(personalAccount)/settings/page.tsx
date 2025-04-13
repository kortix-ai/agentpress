import EditPersonalAccountName from "@/components/basejump/edit-personal-account-name";
import {createClient} from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PersonalAccountSettingsPage() {
    const supabaseClient = createClient();
    const {data: personalAccount} = await supabaseClient.rpc('get_personal_account');

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-card-title">Profile</h3>
                <p className="text-sm text-foreground/70">
                    Manage your personal account details.
                </p>
            </div>
            
            <Card className="border-subtle dark:border-white/10 bg-white dark:bg-background-secondary shadow-none">
                <CardHeader>
                    <CardTitle className="text-base text-card-title">Account Name</CardTitle>
                    <CardDescription>
                        Update your personal account name.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <EditPersonalAccountName account={personalAccount} />
                </CardContent>
            </Card>
        </div>
    )
}