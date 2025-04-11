import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Alert, AlertDescription } from "../ui/alert";
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
        <Card>
            <CardHeader>
                <CardTitle>Billing Status</CardTitle>
                <CardDescription>
                    A quick overview of your billing status
                </CardDescription>
            </CardHeader>
            <CardContent>
                {!Boolean(data?.billing_enabled) ? (
                    <Alert variant="destructive">
                        <AlertDescription>
                            Billing is not enabled for this account. Check out usebasejump.com for more info or remove this component if you don't plan on enabling billing.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <div>
                        <p>Status: {data.status}</p>
                    </div>
                )}

            </CardContent>
            {Boolean(data?.billing_enabled) && (
                <CardFooter>
                    <form className="w-full">
                        <input type="hidden" name="accountId" value={accountId} />
                        <input type="hidden" name="returnUrl" value={returnUrl} />
                        {data.status === 'not_setup' ? (
                            <SubmitButton pendingText="Loading..." formAction={setupNewSubscription}>Setup your Subscription</SubmitButton>
                        ) : (
                            <SubmitButton pendingText="Loading..." formAction={manageSubscription}>Manage Subscription</SubmitButton>
                        )}
                    </form>
                </CardFooter>
            )}
        </Card>
    )
}
