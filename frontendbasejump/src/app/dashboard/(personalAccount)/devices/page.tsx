import { DevicesTable } from "@/components/dashboard/DevicesTable";
import { getDevices } from "@/lib/actions/devices";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Devices",
};

export default async function DevicesPage() {
  const supabase = createClient();
  const { data: personalAccount, error: accountError } = await supabase.rpc(
    "get_personal_account"
  );

  if (accountError || !personalAccount) {
    console.error(
      "Error fetching personal account or account not found:",
      accountError
    );
    redirect("/login");
  }

  const devices = await getDevices(personalAccount.account_id);

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