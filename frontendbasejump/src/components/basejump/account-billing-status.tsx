import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "../ui/submit-button";
import { manageSubscription, setupNewSubscription } from "@/lib/actions/billing";

type Props = {
    accountId: string;
    returnUrl: string;
}

export default async function AccountBillingStatus({ accountId, returnUrl }: Props) {
    const supabaseClient = createClient();

    const { data, error } = await supabaseClient.functions.invoke('billing-functions', {
        body: {
            action: "get_billing_status",
            args: {
                account_id: accountId
            }
        }
    });

    return (
        <Card className="border-subtle dark:border-white/10 bg-white dark:bg-background-secondary shadow-none rounded-xl">
            <CardHeader className="pb-3">
                <CardTitle className="text-base text-card-title">Subscription Status</CardTitle>
                <CardDescription className="text-foreground/70">
                    Manage your subscription and payment details
                </CardDescription>
            </CardHeader>
            <CardContent>
                {!Boolean(data?.billing_enabled) ? (
                    <Alert variant="destructive" className="border-red-300 dark:border-red-800 rounded-xl">
                        <AlertTitle>Billing Not Enabled</AlertTitle>
                        <AlertDescription>
                            Billing is not enabled for this account. Check out usebasejump.com for more info or remove this component if you don't plan on enabling billing.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <div className="p-4 border border-subtle dark:border-white/10 rounded-lg bg-card-bg dark:bg-background-secondary">
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-foreground/90">Status</span>
                                <span className="text-sm font-medium text-card-title">{data.status === 'active' ? 'Active' : 'Inactive'}</span>
                            </div>
                            {data.plan_name && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-foreground/90">Plan</span>
                                    <span className="text-sm font-medium text-card-title">{data.plan_name}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
            {Boolean(data?.billing_enabled) && (
                <CardFooter>
                    <form className="w-full">
                        <input type="hidden" name="accountId" value={accountId} />
                        <input type="hidden" name="returnUrl" value={returnUrl} />
                        {data.status === 'not_setup' ? (
                            <SubmitButton 
                                pendingText="Loading..." 
                                formAction={setupNewSubscription}
                                className="w-full rounded-lg bg-primary hover:bg-primary/90 text-white h-10"
                            >
                                Set Up Subscription
                            </SubmitButton>
                        ) : (
                            <SubmitButton 
                                pendingText="Loading..." 
                                formAction={manageSubscription}
                                className="w-full rounded-lg bg-primary hover:bg-primary/90 text-white h-10"
                            >
                                Manage Subscription
                            </SubmitButton>
                        )}
                    </form>
                </CardFooter>
            )}
        </Card>
    )
}
