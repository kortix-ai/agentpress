import { DevicesTable } from "@/components/dashboard/DevicesTable";
import { getDevices } from "@/lib/actions/devices";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Devices",
};

export default async function DevicesPage({
  params: { accountSlug },
}: {
  params: { accountSlug: string };
}) {
  const supabase = createClient();
  const { data: account, error: accountError } = await supabase.rpc(
    "get_account_by_slug",
    {
      slug: accountSlug,
    }
  );

  if (accountError || !account) {
    console.error("Error fetching account or account not found:", accountError);
    redirect("/dashboard");
  }

  const devices = await getDevices(account.account_id);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Devices</h3>
        <p className="text-sm text-muted-foreground">
          Manage your connected devices
        </p>
      </div>
      <DevicesTable devices={devices} />
    </div>
  );
} 